import { collection, query, where, type CompatDb } from "@/supabase/compat-db-shim";
import type { MasterObject } from "@/types/master-object";

/** Catálogo mestre restrito a um projeto (null se contexto inválido). */
export function masterObjectsQueryForProject(
  db: CompatDb,
  projectId: string | null | undefined,
) {
  if (!projectId || projectId === "all") return null;
  return query(
    collection(db, "masterObjects"),
    where("projectId", "==", projectId),
  );
}

/** Objetos mestre legados ainda sem `project_id` (pré-migração por empresa/projeto). */
export function masterObjectsLegacyUnscopedQuery(db: CompatDb) {
  return query(collection(db, "masterObjects"), where("projectId", "==", null));
}

/** Une catálogo do projeto com legados sem duplicar por id. */
export function mergeMasterCatalogRows(
  projectRows: MasterObject[] | null | undefined,
  legacyRows: MasterObject[] | null | undefined,
): MasterObject[] {
  const primary = projectRows ?? [];
  const extra = legacyRows ?? [];
  if (!extra.length) return primary;
  const seen = new Set(primary.map((row) => row.id));
  const merged = [...primary];
  for (const row of extra) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      merged.push(row);
    }
  }
  return merged;
}

/** Restringe o catálogo ao `projectId` informado (ignora legados sem projeto). */
export function filterMasterCatalogForProject(
  rows: MasterObject[] | null | undefined,
  projectId: string | null | undefined,
): MasterObject[] {
  if (!rows?.length) return [];
  if (!projectId || projectId === "all") return rows;
  return rows.filter((row) => String(row.projectId ?? "").trim() === projectId);
}
