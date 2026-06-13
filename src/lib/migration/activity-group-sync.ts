import {
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  type CompatDb,
} from '@/supabase/compat-db-shim';
import type { ActivityGroup } from '@/types/activity-group';
import type { MasterObject } from '@/types/master-object';

export function sameStringSet(a: string[] = [], b: string[] = []): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((id) => setA.has(id));
}

/** União de `objectIds` do grupo + objetos com `activityGroupIds` referenciando o grupo. */
export function resolveActivityGroupMemberIds(
  group: Pick<ActivityGroup, 'id' | 'objectIds'>,
  allObjects: Pick<MasterObject, 'id' | 'activityGroupIds'>[],
): string[] {
  const ids = new Set(group.objectIds ?? []);
  for (const obj of allObjects) {
    if ((obj.activityGroupIds ?? []).includes(group.id)) ids.add(obj.id);
  }
  return [...ids];
}

/** Mantém `activityGroupIds` no objeto e `objectIds` nos grupos em sincronia. */
export async function syncObjectActivityGroupMembership(
  db: CompatDb,
  objectId: string,
  prevGroupIds: string[],
  nextGroupIds: string[],
): Promise<void> {
  const prev = prevGroupIds ?? [];
  const next = nextGroupIds ?? [];
  if (sameStringSet(prev, next)) return;

  const added = next.filter((id) => !prev.includes(id));
  const removed = prev.filter((id) => !next.includes(id));
  const touchedGroupIds = [...new Set([...added, ...removed])];

  const batch = writeBatch(db);
  batch.update(doc(db, 'masterObjects', objectId), {
    activityGroupIds: next,
    updatedAt: serverTimestamp(),
  });

  if (touchedGroupIds.length > 0) {
    const groupSnaps = await Promise.all(
      touchedGroupIds.map((groupId) => getDoc(doc(db, 'activityGroups', groupId))),
    );

    for (let i = 0; i < touchedGroupIds.length; i++) {
      const groupId = touchedGroupIds[i];
      const snap = groupSnaps[i];
      if (!snap.exists()) continue;

      const data = snap.data();
      const current = [...((data?.objectIds as string[] | undefined) ?? [])];
      let objectIds = current;

      if (added.includes(groupId) && !objectIds.includes(objectId)) {
        objectIds = [...objectIds, objectId];
      }
      if (removed.includes(groupId)) {
        objectIds = objectIds.filter((id) => id !== objectId);
      }

      if (!sameStringSet(objectIds, current)) {
        batch.update(doc(db, 'activityGroups', groupId), {
          objectIds,
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  await batch.commit();
}

/** Persiste `objectIds` reconciliados a partir dos objetos mestre (corrige divergências). */
export async function reconcileActivityGroupsObjectIds(
  db: CompatDb,
  groups: ActivityGroup[],
  allObjects: Pick<MasterObject, 'id' | 'activityGroupIds'>[],
): Promise<ActivityGroup[]> {
  const batch = writeBatch(db);
  let hasWrites = false;

  const reconciled = groups.map((group) => {
    const merged = resolveActivityGroupMemberIds(group, allObjects);
    const stored = group.objectIds ?? [];
    if (sameStringSet(merged, stored)) return group;

    hasWrites = true;
    batch.update(doc(db, 'activityGroups', group.id), {
      objectIds: merged,
      updatedAt: serverTimestamp(),
    });
    return { ...group, objectIds: merged };
  });

  if (hasWrites) await batch.commit();
  return reconciled;
}
