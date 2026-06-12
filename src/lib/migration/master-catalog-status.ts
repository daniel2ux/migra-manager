import type { MasterObject } from "@/types/master-object";

export type MasterCatalogStatus = "ATIVO" | "INATIVO" | "LEGACY";

export function normalizeMasterCatalogStatus(
  status: MasterObject["status"] | string | undefined | null,
): string {
  return String(status || "ATIVO").trim().toUpperCase();
}

export function isAllowedMasterCatalogStatus(
  status: MasterObject["status"] | string | undefined | null,
): boolean {
  const normalized = normalizeMasterCatalogStatus(status);
  return normalized === "ATIVO" || normalized === "INATIVO";
}

/** Status fora de ATIVO/INATIVO (ex.: LEGACY) — candidato a remoção do catálogo. */
export function shouldRemoveFromMasterCatalog(
  status: MasterObject["status"] | string | undefined | null,
): boolean {
  return !isAllowedMasterCatalogStatus(status);
}
