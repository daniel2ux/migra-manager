import type { MasterObject } from "@/types/master-object";

/** Mesma regra da gestão de objetos: nome único no catálogo após normalização. */
export function normalizeMasterCatalogName(name: string): string {
  return name.trim().toUpperCase();
}

/** Primeiro mestre com o mesmo nome normalizado, excluindo um ID (edição). */
export function findMasterCatalogNameConflict(
  objects: MasterObject[] | null | undefined,
  name: string,
  excludeId?: string,
): MasterObject | undefined {
  const key = normalizeMasterCatalogName(name);
  if (!key) return undefined;
  return objects?.find(
    (o) => normalizeMasterCatalogName(o.name) === key && o.id !== excludeId,
  );
}
