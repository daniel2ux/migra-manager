import type { MigrationObject } from "@/types/migration";
import type { MasterObject } from "@/types/master-object";

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
