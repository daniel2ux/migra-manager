import {
  doc,
  writeBatch,
  serverTimestamp,
  type CompatDb,
} from '@/supabase/compat-db-shim';
import type { ChargeGroup } from '@/types/charge-group';
import type { MasterObject } from '@/types/master-object';
import { sameStringSet } from '@/lib/migration/activity-group-sync';

export function normalizeChargeGroupName(name: string): string {
  return (name || '').trim().toUpperCase();
}

/** União de `objectIds` do grupo + objetos com `chargeGroup` igual ao nome do grupo. */
export function resolveChargeGroupMemberIds(
  group: Pick<ChargeGroup, 'name' | 'objectIds'>,
  allObjects: Pick<MasterObject, 'id' | 'chargeGroup'>[],
): string[] {
  const groupName = normalizeChargeGroupName(group.name);
  const ids = new Set(group.objectIds ?? []);
  for (const obj of allObjects) {
    if (normalizeChargeGroupName(obj.chargeGroup ?? '') === groupName) {
      ids.add(obj.id);
    }
  }
  return [...ids];
}

/** Persiste `objectIds` reconciliados a partir dos objetos mestre (corrige divergências). */
export async function reconcileChargeGroupsObjectIds(
  db: CompatDb,
  groups: ChargeGroup[],
  allObjects: Pick<MasterObject, 'id' | 'chargeGroup'>[],
): Promise<ChargeGroup[]> {
  const batch = writeBatch(db);
  let hasWrites = false;

  const reconciled = groups.map((group) => {
    const merged = resolveChargeGroupMemberIds(group, allObjects);
    const stored = group.objectIds ?? [];
    if (sameStringSet(merged, stored)) return group;

    hasWrites = true;
    batch.update(doc(db, 'chargeGroups', group.id), {
      objectIds: merged,
      updatedAt: serverTimestamp(),
    });
    return { ...group, objectIds: merged };
  });

  if (hasWrites) await batch.commit();
  return reconciled;
}

/** Mapa objeto → nome do grupo apenas para vínculos cadastrados em `charge_groups`. */
export function buildConfiguredChargeGroupByObjectId(
  groups: Pick<ChargeGroup, 'name' | 'objectIds'>[],
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const group of groups) {
    const name = normalizeChargeGroupName(group.name);
    if (!name) continue;
    for (const id of group.objectIds ?? []) {
      map.set(id, name);
    }
  }
  return map;
}

export function getConfiguredChargeGroupForObject(
  objectId: string,
  configuredByObjectId: ReadonlyMap<string, string>,
): string {
  return configuredByObjectId.get(objectId) ?? '';
}

export function findChargeGroupIdForObject(
  objectId: string,
  groups: Pick<ChargeGroup, 'id' | 'objectIds'>[],
): string | null {
  for (const group of groups) {
    if ((group.objectIds ?? []).includes(objectId)) return group.id;
  }
  return null;
}

/** Atribui o objeto a um grupo de carga (exclusivo) ou remove de todos quando `nextGroupId` é null. */
export async function syncObjectChargeGroupMembership(
  db: CompatDb,
  objectId: string,
  nextGroupId: string | null,
  allGroups: Pick<ChargeGroup, 'id' | 'name' | 'objectIds'>[],
): Promise<void> {
  const batch = writeBatch(db);

  for (const group of allGroups) {
    const current = [...(group.objectIds ?? [])];
    const shouldHave = group.id === nextGroupId;
    const has = current.includes(objectId);

    if (shouldHave && !has) {
      batch.update(doc(db, 'chargeGroups', group.id), {
        objectIds: [...current, objectId],
        updatedAt: serverTimestamp(),
      });
    } else if (!shouldHave && has) {
      batch.update(doc(db, 'chargeGroups', group.id), {
        objectIds: current.filter((id) => id !== objectId),
        updatedAt: serverTimestamp(),
      });
    }
  }

  const nextName = nextGroupId
    ? normalizeChargeGroupName(allGroups.find((g) => g.id === nextGroupId)?.name ?? '')
    : '';

  batch.update(doc(db, 'masterObjects', objectId), {
    chargeGroup: nextName,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}
