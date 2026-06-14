import { collection, query, where, type CompatDb } from "@/supabase/compat-db-shim";

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
