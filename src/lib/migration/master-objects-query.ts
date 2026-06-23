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

/** Restringe o catálogo ao `projectId` informado. */
export function filterMasterCatalogForProject(
  rows: MasterObject[] | null | undefined,
  projectId: string | null | undefined,
): MasterObject[] {
  if (!rows?.length) return [];
  if (!projectId || projectId === "all") return rows;
  return rows.filter((row) => String(row.projectId ?? "").trim() === projectId);
}

/** Query de coleção raiz filtrada por `projectId`. */
export function collectionQueryForProject(
  db: CompatDb,
  collectionName: string,
  projectId: string | null | undefined,
  ...extraConstraints: Parameters<typeof query>[1][]
) {
  if (!projectId || projectId === "all") return null;
  return query(
    collection(db, collectionName),
    where("projectId", "==", projectId),
    ...extraConstraints,
  );
}

