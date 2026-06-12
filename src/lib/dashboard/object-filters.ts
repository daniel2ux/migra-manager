import type { Mock, MigrationObject } from "@/types/migration";
import type { MasterObject } from "@/types/master-object";
import { compareSequences, parseSequence } from "@/lib/migration/sequence-utils";

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

/**
 * Filtra mocks por projeto e permissões
 */
export function filterMocks(
  allMocks: Mock[] | null | undefined,
  selectedProjectId: string,
  isAdmin: boolean,
  accessibleProjectIds: string[],
): Mock[] {
  if (!allMocks) return [];

  if (selectedProjectId === "all") {
    return isAdmin ? allMocks : allMocks.filter(m => accessibleProjectIds.includes(m.projectId));
  }

  return allMocks.filter(m => m.projectId === selectedProjectId);
}

/**
 * Filtra objetos de migração com todos os critérios
 */
export function filterObjects(
  objects: MigrationObject[] | null | undefined,
  selectedProjectId: string,
  selectedMockId: string,
  isAdmin: boolean,
  accessibleProjectIds: string[],
  selectedObjectNames: string[],
): MigrationObject[] {
  if (!objects) return [];

  return objects.filter(obj => {
    const projectMatch = selectedProjectId === "all" || obj.projectId === selectedProjectId;
    const mockMatch = selectedMockId === "all" || obj.mockId === selectedMockId;
    const permissionMatch = isAdmin || accessibleProjectIds.includes(obj.projectId);
    const objectMatch = selectedObjectNames.length === 0 || selectedObjectNames.includes(obj.name);
    return projectMatch && mockMatch && permissionMatch && objectMatch;
  });
}

/**
 * Ordena objetos: em andamento primeiro, depois por chargeOrder
 */
export function sortMigrationObjects(a: MigrationObject, b: MigrationObject): number {
  const aInProgress = isObjectInProgress(a);
  const bInProgress = isObjectInProgress(b);

  if (aInProgress && !bInProgress) return -1;
  if (!aInProgress && bInProgress) return 1;

  const seqA = parseSequence(a.chargeOrder);
  const seqB = parseSequence(b.chargeOrder);
  const hasOrderA = seqA.major > 0;
  const hasOrderB = seqB.major > 0;

  if (hasOrderA && !hasOrderB) return -1;
  if (!hasOrderA && hasOrderB) return 1;

  const cmp = compareSequences(a.chargeOrder, b.chargeOrder);
  if (cmp !== 0) return cmp;

  return String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" });
}

/**
 * Extrai nomes únicos de objetos disponíveis
 */
export function getAvailableObjectNames(
  objects: MigrationObject[] | null | undefined,
  selectedProjectId: string,
  selectedMockId: string,
  isAdmin: boolean,
  accessibleProjectIds: string[],
): string[] {
  if (!objects) return [];

  const names = new Set<string>();
  objects.forEach(obj => {
    const projectMatch = selectedProjectId === "all" || obj.projectId === selectedProjectId;
    const mockMatch = selectedMockId === "all" || obj.mockId === selectedMockId;
    const permissionMatch = isAdmin || accessibleProjectIds.includes(obj.projectId);

    if (projectMatch && mockMatch && permissionMatch && obj.name) {
      names.add(obj.name);
    }
  });

  return Array.from(names).sort();
}

/**
 * Calcula estatísticas resumidas de mocks
 */
export function calculateMockStats(mockList: Mock[]) {
  const total = mockList.length;
  const loaded = mockList.filter(m => m.isLoaded).length;
  const inProgress = mockList.filter(m => m.isRunning).length;
  const pending = total - (loaded + inProgress);
  return { total, loaded, inProgress, pending };
}

/**
 * Calcula estatísticas resumidas de objetos
 */
export function calculateObjectStats(objList: MigrationObject[]) {
  const total = objList.length;
  const loaded = objList.filter(isObjectLoaded).length;
  const inProgress = objList.filter(isObjectInProgress).length;
  const pending = total - (loaded + inProgress);

  const totalRecords = objList.reduce((sum, obj) => sum + (Number(obj.targetRecordsCount) || 0), 0);
  const totalDurationMs = objList.reduce((sum, obj) => sum + (Number(obj.currentChargeDurationMs) || 0), 0);

  return { total, loaded, inProgress, pending, totalRecords, totalDurationMs };
}
