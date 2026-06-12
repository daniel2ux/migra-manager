import type { MigrationObject } from "@/types/migration";
import type { MasterObject } from "@/types/master-object";
import {
  compareGestaoExecutionOrder,
  resolveChargeSequenceDisplay,
  normalizeChargeSequenceFields,
  type ChargeSequenceSortFields,
  type ResolvedChargeSequence,
} from "@/lib/migration/sequence-utils";
import {
  resolveMasterObject,
  isActiveCatalogMaster,
} from "@/lib/dashboard/object-filters";

type ChargeSequenceFields = Pick<
  ChargeSequenceSortFields,
  "chargeGroup" | "chargeOrder" | "parallelOrder"
>;

function resolveGestaoRowSequenceFields(
  mig: MigrationObject,
  master: MasterObject | undefined | null,
): ChargeSequenceFields {
  return {
    chargeGroup: String(mig.chargeGroup ?? master?.chargeGroup ?? "").trim(),
    chargeOrder: mig.chargeOrder ?? master?.chargeOrder ?? "",
    parallelOrder: mig.parallelOrder ?? master?.parallelOrder ?? "",
  };
}

function buildGestaoDisplayOrderIndex(
  rows: readonly Pick<MasterObject, "id" | "name">[],
): Map<string, number> {
  const index = new Map<string, number>();
  rows.forEach((row, i) => {
    index.set(row.id, i);
    index.set(`name:${row.name}`, i);
  });
  return index;
}

/** Índice de exibição alinhado à gestão de objetos (mock selecionada). */
export function buildGestaoMasterOrderIndex(
  migrationsInMock: MigrationObject[] | null | undefined,
  masters: MasterObject[] | null | undefined,
): Map<string, number> {
  return buildGestaoDisplayOrderIndex(buildGestaoRowsFromMockMigrations(migrationsInMock, masters));
}

/** Índice de exibição do catálogo mestre (modo execução). */
export function buildCatalogMasterOrderIndex(
  masters: MasterObject[] | null | undefined,
): Map<string, number> {
  if (!masters?.length) return new Map();
  const sorted = [...masters]
    .filter(isActiveCatalogMaster)
    .sort(compareGestaoExecutionOrder);
  return buildGestaoDisplayOrderIndex(sorted);
}

function compareByGestaoDisplayOrder(
  a: Pick<ChargeSequenceSortFields, "name" | "chargeGroup" | "chargeOrder" | "parallelOrder"> & {
    masterObjectId?: string | null;
  },
  b: Pick<ChargeSequenceSortFields, "name" | "chargeGroup" | "chargeOrder" | "parallelOrder"> & {
    masterObjectId?: string | null;
  },
  orderIndex: Map<string, number>,
): number {
  if (!orderIndex.size) return 0;

  const resolveIndex = (obj: typeof a): number => {
    const masterId = String(obj.masterObjectId || "").trim();
    if (masterId && orderIndex.has(masterId)) return orderIndex.get(masterId)!;
    const byName = orderIndex.get(`name:${obj.name}`);
    if (byName !== undefined) return byName;
    return Number.MAX_SAFE_INTEGER;
  };

  const idxA = resolveIndex(a);
  const idxB = resolveIndex(b);
  if (idxA !== idxB) return idxA - idxB;
  return 0;
}

export function sortByGestaoDisplayOrder<
  T extends Pick<ChargeSequenceSortFields, "name" | "chargeGroup" | "chargeOrder" | "parallelOrder"> & {
    masterObjectId?: string | null;
  },
>(items: readonly T[], orderIndex: Map<string, number>): T[] {
  return [...items].sort((a, b) => {
    const orderCmp = compareByGestaoDisplayOrder(a, b, orderIndex);
    if (orderCmp !== 0) return orderCmp;
    return compareGestaoExecutionOrder(a, b);
  });
}

/** Lista alinhada ao dashboard da mock (subcoleção + master ATIVO). */
export function buildGestaoRowsFromMockMigrations(
  migrationsInMock: MigrationObject[] | null | undefined,
  masters: MasterObject[] | null | undefined,
): MasterObject[] {
  if (!migrationsInMock?.length || !masters?.length) return [];
  const masterObjectsById = new Map(masters.map((m) => [m.id, m]));
  const masterObjectsByName = new Map(masters.map((m) => [m.name, m]));
  const scopedMasterByName = new Map<string, MasterObject>();
  for (const o of migrationsInMock) {
    const masterId = String(o.masterObjectId || "");
    if (!masterId) continue;
    const master = masterObjectsById.get(masterId);
    if (!master) continue;
    if (!scopedMasterByName.has(o.name)) scopedMasterByName.set(o.name, master);
  }
  const maps = {
    byId: masterObjectsById,
    byName: masterObjectsByName,
    scopedByName: scopedMasterByName,
  };
  const sorted = [...migrationsInMock].sort((a, b) => {
    const masterA = resolveMasterObject(a, maps);
    const masterB = resolveMasterObject(b, maps);
    const fieldsA = {
      ...resolveGestaoRowSequenceFields(a, masterA),
      name: a.name,
    };
    const fieldsB = {
      ...resolveGestaoRowSequenceFields(b, masterB),
      name: b.name,
    };
    return compareGestaoExecutionOrder(fieldsA, fieldsB);
  });
  const seenAgg = new Set<string>();
  const out: MasterObject[] = [];
  for (const mig of sorted) {
    const aggKey = String(mig.masterObjectId || mig.name || "");
    if (!aggKey) continue;
    if (seenAgg.has(aggKey)) continue;
    seenAgg.add(aggKey);
    const master = resolveMasterObject(mig, maps);
    if (!master || !isActiveCatalogMaster(master)) continue;
    out.push({
      ...master,
      chargeGroup: mig.chargeGroup ?? master.chargeGroup,
      chargeOrder: mig.chargeOrder ?? master.chargeOrder,
      parallelOrder: mig.parallelOrder ?? master.parallelOrder,
      isParallel: mig.isParallel ?? master.isParallel,
      dependencyIds: mig.dependencyIds ?? master.dependencyIds,
      _migrationDocId: mig.id,
    } as MasterObject);
  }
  return out;
}

/** Mapa id/nome → sequência exibida na gestão (mock selecionada). */
export function buildMockChargeSequenceLookup(
  migrationsInMock: readonly MigrationObject[],
  masters: readonly MasterObject[],
): Map<string, ChargeSequenceFields> {
  const map = new Map<string, ChargeSequenceFields>();
  for (const row of buildGestaoRowsFromMockMigrations([...migrationsInMock], [...masters])) {
    const fields: ChargeSequenceFields = {
      chargeGroup: String(row.chargeGroup ?? "").trim(),
      chargeOrder: row.chargeOrder ?? "",
      parallelOrder: row.parallelOrder ?? "",
    };
    map.set(row.id, fields);
    map.set(`name:${row.name}`, fields);
  }
  return map;
}

export function lookupMockChargeSequence(
  lookup: Map<string, ChargeSequenceFields> | null | undefined,
  masterObjectId?: string | null,
  objectName?: string | null,
): ChargeSequenceFields | undefined {
  if (!lookup?.size) return undefined;
  const masterId = String(masterObjectId || "").trim();
  if (masterId && lookup.has(masterId)) return lookup.get(masterId);
  const name = String(objectName || "").trim();
  if (name && lookup.has(`name:${name}`)) return lookup.get(`name:${name}`);
  return undefined;
}

/** Sequência no dashboard com mock filtrada — mesma regra da gestão de objetos. */
export function resolveDashboardChargeSequence(params: {
  master?: Pick<MasterObject, "chargeGroup" | "chargeOrder" | "parallelOrder"> | null;
  masterObjectId?: string | null;
  objectName?: string | null;
  mockScoped: boolean;
  mockLookup?: Map<string, ChargeSequenceFields> | null;
  fallbackMigration?: Pick<MigrationObject, "chargeGroup" | "chargeOrder" | "parallelOrder"> | null;
}): ResolvedChargeSequence {
  if (params.mockScoped && params.mockLookup) {
    const fromLookup = lookupMockChargeSequence(
      params.mockLookup,
      params.masterObjectId,
      params.objectName,
    );
    if (fromLookup) return normalizeChargeSequenceFields(fromLookup);
    return resolveChargeSequenceDisplay(params.fallbackMigration, params.master);
  }

  return resolveChargeSequenceDisplay(params.fallbackMigration, params.master);
}
