import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type CompatDb,
} from "@/supabase/compat-db-shim";

export interface CompanyRecord {
  id: string;
  name: string;
}

function normalizeCompanyName(name: string): string {
  return name.trim().toUpperCase();
}

/** Garante registro em `companies` e retorna o ID (nome único normalizado). */
export async function upsertCompanyByName(
  db: CompatDb,
  rawName: string,
): Promise<string | null> {
  const name = rawName.trim();
  if (!name) return null;

  const normalized = normalizeCompanyName(name);
  const companiesRef = collection(db, "companies");
  const existing = await getDocs(
    query(companiesRef, where("name", "==", normalized)),
  );

  if (!existing.empty) {
    return existing.docs[0]!.id;
  }

  const companyId = doc(companiesRef).id;
  await setDoc(
    doc(db, "companies", companyId),
    {
      id: companyId,
      name: normalized,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
  return companyId;
}

/** Projeto apto para cadastro de objetos mestre. */
export function projectAllowsMasterObjectRegistration(
  project?: { companyId?: string | null; company?: string | null; empresa?: string | null } | null,
): boolean {
  if (!project) return false;
  if (project.companyId) return true;
  const legacy = project.company?.trim() || project.empresa?.trim();
  return Boolean(legacy);
}
