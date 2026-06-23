import type { MigrationObject } from "@/types/migration";
import type { MasterObject } from "@/types/master-object";
import { isMigrationObjectActive } from "@/lib/mock-utils";

type MasterLookupMaps = {
  byId: Map<string, MasterObject>;
  byName: Map<string, MasterObject>;
  scopedByName: Map<string, MasterObject>;
};

/** Resolve o cadastro mestre vinculado a um registro de migração (id, escopo ou nome). */
export function resolveMasterObject(
  obj: Pick<MigrationObject, "name" | "masterObjectId">,
  maps: MasterLookupMaps,
): MasterObject | undefined {
  const masterId = String(obj.masterObjectId || "");
  return (
    (masterId ? maps.byId.get(masterId) : undefined) ??
    maps.scopedByName.get(obj.name) ??
    maps.byName.get(obj.name)
  );
}

/** Objeto operacional no dashboard: existe no catálogo e está ATIVO (status ausente = ATIVO). */
export function isActiveCatalogMaster(master: MasterObject | undefined): boolean {
  if (!master) return false;
  const status = String(master.status || "ATIVO").trim().toUpperCase();
  return status === "ATIVO";
}

function normalizeObjectName(name: string | null | undefined): string {
  return (name || "").trim().toUpperCase();
}

type MockRowIdentity = Pick<MigrationObject, "masterObjectId" | "name"> & {
  isActive?: boolean;
  is_active?: boolean;
};

/** Indica se o mestre já possui linha ativa na mock (por id ou nome). */
function isMasterLinkedToActiveMockRow(
  master: Pick<MasterObject, "id" | "name">,
  mockObject: MockRowIdentity,
): boolean {
  if (!isMigrationObjectActive(mockObject)) return false;
  if (mockObject.masterObjectId && mockObject.masterObjectId === master.id) return true;
  const masterName = normalizeObjectName(master.name);
  const rowName = normalizeObjectName(mockObject.name);
  return !!masterName && masterName === rowName;
}

/** Mestres do catálogo ainda não presentes (ativos) na mock atual. */
export function filterMastersAvailableForMock(
  masters: MasterObject[],
  mockObjects: MigrationObject[],
): MasterObject[] {
  const activeRows = mockObjects.filter(isMigrationObjectActive);
  return masters.filter(
    (master) =>
      isActiveCatalogMaster(master) &&
      !activeRows.some((row) => isMasterLinkedToActiveMockRow(master, row)),
  );
}

/** Linha inativa na mock que corresponde ao mestre (reativação em vez de duplicar). */
export function findInactiveMockRowForMaster(
  master: Pick<MasterObject, "id" | "name">,
  mockObjects: MigrationObject[],
): MigrationObject | undefined {
  const masterName = normalizeObjectName(master.name);
  return mockObjects.find((row) => {
    if (isMigrationObjectActive(row)) return false;
    if (row.masterObjectId && row.masterObjectId === master.id) return true;
    return normalizeObjectName(row.name) === masterName;
  });
}

/** Mestres bloqueados apenas por linhas inativas na mock (não aparecem na grade ativa). */
export function countMastersBlockedByInactiveMockRows(
  masters: MasterObject[],
  mockObjects: MigrationObject[],
): number {
  const inactiveRows = mockObjects.filter((row) => !isMigrationObjectActive(row));
  if (!inactiveRows.length) return 0;

  return masters.filter((master) => {
    if (!isActiveCatalogMaster(master)) return false;
    const masterName = normalizeObjectName(master.name);
    return inactiveRows.some((row) => {
      if (row.masterObjectId && row.masterObjectId === master.id) return true;
      return normalizeObjectName(row.name) === masterName;
    });
  }).length;
}

/**
 * Verifica se objeto está em andamento
 */
export function isObjectInProgress(obj: Pick<MigrationObject, 'status' | 'chargeStartTime' | 'chargeEndTime'>): boolean {
  return obj.status === 'CARGA_EM_ANDAMENTO' || !!(obj.chargeStartTime && !obj.chargeEndTime);
}

/**
 * Verifica se objeto está carregado/concluído
 */
export function isObjectLoaded(obj: Pick<MigrationObject, 'chargeStartTime' | 'chargeEndTime' | 'currentChargeDurationMs' | 'status'>): boolean {
  return !!(obj.chargeStartTime && obj.chargeEndTime) ||
    (Number(obj.currentChargeDurationMs) > 0) ||
    obj.status === "CARGA_CONCLUIDA";
}
