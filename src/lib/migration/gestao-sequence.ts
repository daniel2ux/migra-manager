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

export function buildGestaoDisplayOrderIndex(
  rows: readonly Pick<MasterObject, "id" | "name">[],
): Map<string, number> {
  const index = new Map<string, number>();
  rows.forEach((row, i) => {
    index.set(row.id, i);
    index.set(`name:${row.name}`, i);
  });
  return index;
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

export type GestaoSortMode = "EXECUTION" | "ALPHABETICAL" | "UPDATED";

export type GestaoReorderPreview = {
  visibleOrder?: readonly string[];
} | null;

/** Lista mestres utilizados neste projeto (e opcionalmente mock); sem filtros de busca/status. */
export function filterMastersByProjectMockUsage(
  objects: MasterObject[] | null | undefined,
  selectedProjectId: string | null,
  selectedMockId: string | null,
  usageMap: Record<string, Set<string>>,
): MasterObject[] {
  if (!objects?.length) return [];
  return objects.filter((obj) => {
    if (!selectedProjectId) return true;
    const usage = usageMap[obj.id];
    if (!usage?.size) return false;
    if (selectedMockId) return usage.has(`${selectedProjectId}:${selectedMockId}`);
    return [...usage].some((e) => e.startsWith(`${selectedProjectId}:`));
  });
}

/** Sobrepõe campos vindos dos migrationObjects quando o escopo vem só do projeto. */
export function mergeMockSequencesOntoScopedMasters(
  mastersInScope: MasterObject[],
  migrations: MigrationObject[] | null | undefined,
  applyMerge: boolean,
  opts?: { overlayChargeSequence?: boolean },
): MasterObject[] {
  if (!applyMerge || !migrations?.length) return mastersInScope;
  const overlayChargeSequence = opts?.overlayChargeSequence ?? true;
  const byMasterId = new Map<string, MigrationObject>();
  for (const m of migrations) {
    if (m.masterObjectId) byMasterId.set(m.masterObjectId, m);
  }
  return mastersInScope.map((mast) => {
    const mig = byMasterId.get(mast.id);
    if (!mig) return { ...mast };
    return {
      ...mast,
      ...(overlayChargeSequence
        ? {
            chargeGroup: mig.chargeGroup ?? mast.chargeGroup,
            chargeOrder: mig.chargeOrder ?? mast.chargeOrder,
            parallelOrder: mig.parallelOrder ?? mast.parallelOrder,
            isParallel: mig.isParallel ?? mast.isParallel,
          }
        : {}),
      dependencyIds: mig.dependencyIds ?? mast.dependencyIds,
      _migrationDocId: mig.id,
    };
  });
}

/** Mesma base de linhas usada na gestão de objetos (mock + catálogo). */
export function buildGestaoSequenceContextRows(params: {
  allMasters: MasterObject[];
  migrationsInSelectedMock: MigrationObject[] | null | undefined;
  isAdmin: boolean;
  mockScopedSequences: boolean;
  catalogScopeFiltered: MasterObject[];
  projectUsageFiltered: MasterObject[];
}): MasterObject[] {
  const {
    allMasters,
    migrationsInSelectedMock,
    isAdmin,
    mockScopedSequences,
    catalogScopeFiltered,
    projectUsageFiltered,
  } = params;

  if (isAdmin) {
    if (!mockScopedSequences) return allMasters;
    return mergeMockSequencesOntoScopedMasters(
      allMasters,
      migrationsInSelectedMock ?? undefined,
      Boolean(migrationsInSelectedMock?.length),
      { overlayChargeSequence: false },
    );
  }

  if (mockScopedSequences) {
    if (migrationsInSelectedMock === null) return [];
    const fromMock = buildGestaoRowsFromMockMigrations(migrationsInSelectedMock, allMasters);
    return fromMock.length > 0 ? fromMock : projectUsageFiltered;
  }

  return mergeMockSequencesOntoScopedMasters(
    catalogScopeFiltered,
    migrationsInSelectedMock ?? undefined,
    false,
  );
}

export function sortMastersGestao(
  rows: MasterObject[],
  sortMode: GestaoSortMode,
): MasterObject[] {
  return [...rows].sort((a, b) => {
    if (sortMode === "EXECUTION") {
      return compareGestaoExecutionOrder(a, b);
    }
    const aInactive = a.status === "INATIVO";
    const bInactive = b.status === "INATIVO";
    if (aInactive && !bInactive) return 1;
    if (!aInactive && bInactive) return -1;
    if (sortMode === "ALPHABETICAL") {
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
    if (sortMode === "UPDATED") {
      const dateA =
        a.updatedAt instanceof Date
          ? a.updatedAt
          : (a.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date(0);
      const dateB =
        b.updatedAt instanceof Date
          ? b.updatedAt
          : (b.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    }
    return 0;
  });
}

function applyVisibleOrderToList(
  rows: MasterObject[],
  visibleOrder: readonly string[],
): MasterObject[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const seen = new Set<string>();
  const ordered: MasterObject[] = [];
  for (const id of visibleOrder) {
    const row = byId.get(id);
    if (row) {
      ordered.push(row);
      seen.add(id);
    }
  }
  for (const row of rows) {
    if (!seen.has(row.id)) ordered.push(row);
  }
  return ordered;
}

/** Lista exibida na gestão após ordenação (modo execução por padrão). */
export function buildGestaoDisplayList(
  rows: MasterObject[],
  sortMode: GestaoSortMode,
  reorderPreview?: GestaoReorderPreview,
): MasterObject[] {
  let sorted = sortMastersGestao(rows, sortMode);
  if (reorderPreview?.visibleOrder?.length && sortMode === "EXECUTION") {
    sorted = applyVisibleOrderToList(sorted, reorderPreview.visibleOrder);
  }
  return sorted;
}

export function buildUsageMapFromMigrations(
  migrations: readonly MigrationObject[],
): Record<string, Set<string>> {
  const map: Record<string, Set<string>> = {};
  for (const mo of migrations) {
    if (!mo.masterObjectId) continue;
    const path = (mo as MigrationObject & { __path?: string }).__path?.split("/") ?? [];
    const projectId =
      mo.projectId || (path[0] === "projects" && path[2] === "mocks" ? path[1] : "");
    const mockId =
      mo.mockId || (path[0] === "projects" && path[2] === "mocks" ? path[3] : "");
    if (!projectId || !mockId) continue;
    const key = `${projectId}:${mockId}`;
    if (!map[mo.masterObjectId]) map[mo.masterObjectId] = new Set();
    map[mo.masterObjectId].add(key);
  }
  return map;
}

export type BuildGestaoPageDisplayParams = {
  masters: MasterObject[] | null | undefined;
  migrationsInSelectedMock: MigrationObject[] | null | undefined;
  isAdmin: boolean;
  selectedProjectId: string;
  selectedMockId: string;
  usageMap: Record<string, Set<string>>;
  sortMode?: GestaoSortMode;
  showInactive?: boolean;
};

function resolveGestaoPageScope(selectedProjectId: string, selectedMockId: string) {
  const projectId = selectedProjectId === "all" ? null : selectedProjectId;
  const mockId = selectedMockId === "all" ? null : selectedMockId;
  const mockScopedSequences = Boolean(projectId && mockId);
  return { projectId, mockId, mockScopedSequences };
}

/** Lista na mesma ordem da gestão de objetos (sem busca/filtros de status da UI). */
export function buildGestaoPageDisplayList(params: BuildGestaoPageDisplayParams): MasterObject[] {
  const {
    masters,
    migrationsInSelectedMock,
    isAdmin,
    selectedProjectId,
    selectedMockId,
    usageMap,
    sortMode = "EXECUTION",
    showInactive = false,
  } = params;

  if (!masters?.length) return [];

  const { projectId, mockId, mockScopedSequences } = resolveGestaoPageScope(
    selectedProjectId,
    selectedMockId,
  );

  const catalogScopeFiltered = isAdmin
    ? masters
    : filterMastersByProjectMockUsage(masters, projectId, mockId, usageMap);

  const projectUsageFiltered = filterMastersByProjectMockUsage(
    masters,
    projectId,
    mockId,
    usageMap,
  );

  const sequenceContextRows = buildGestaoSequenceContextRows({
    allMasters: masters,
    migrationsInSelectedMock,
    isAdmin,
    mockScopedSequences,
    catalogScopeFiltered,
    projectUsageFiltered,
  });

  const displayRows = sequenceContextRows.filter((obj) => {
    if (!showInactive && obj.status === "INATIVO") return false;
    return true;
  });

  return buildGestaoDisplayList(displayRows, sortMode, null);
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
