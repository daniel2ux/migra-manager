import type { WithId } from "@/firebase";
import type { UserProfile } from "@/types/usuarios";

/** Linha da coleção `users` (pode incluir `projectIds` em telas de projeto). */
export type UserDirectoryDoc = WithId<UserProfile & { projectIds?: string[] }>;

type RowWithProjects = { id: string; uid?: string; email?: string; projectIds?: string[] };

/**
 * Garante `uid` alinhado ao ID do documento quando o campo `uid` estiver ausente no Firestore.
 */
export function withCanonicalUid<T extends RowWithProjects>(u: T): T & { uid: string } {
  const uid = (u.uid && String(u.uid).trim()) || u.id;
  return { ...u, uid } as T & { uid: string };
}

function mergeProjectIds<T extends RowWithProjects>(
  primary: T & { uid: string },
  others: (T & { uid: string })[],
): T & { uid: string } {
  const set = new Set<string>([...(primary.projectIds || [])]);
  for (const o of others) {
    for (const p of o.projectIds || []) set.add(p);
  }
  if (set.size === 0) return primary;
  return { ...primary, projectIds: [...set] } as T & { uid: string };
}

/**
 * Remove duplicatas na coleção `users`: mesmo uid após normalização e mesmo e-mail com dois documentos.
 * Prioriza o documento do login atual; une `projectIds` ao colapsar duplicatas (evita perder “Alocado”).
 */
export function dedupeDirectoryUsers<T extends RowWithProjects>(
  users: (T & { id: string })[] | null,
  authUid?: string | null,
): (T & { uid: string })[] {
  if (!users?.length) return [];

  const normalized = users.map((u) => withCanonicalUid(u));

  const byUid = new Map<string, (T & { uid: string })[]>();
  for (const u of normalized) {
    if (!u.uid) continue;
    const arr = byUid.get(u.uid) ?? [];
    arr.push(u);
    byUid.set(u.uid, arr);
  }

  let list: (T & { uid: string })[] = [];
  for (const group of byUid.values()) {
    if (group.length === 1) {
      list.push(group[0]);
      continue;
    }
    const prefer = (x: T & { uid: string }) => x.id === x.uid;
    const chosen = group.find(prefer) ?? group[0];
    const rest = group.filter((x) => x !== chosen);
    list.push(mergeProjectIds(chosen, rest));
  }

  const byEmail = new Map<string, (T & { uid: string })[]>();
  for (const u of list) {
    const emailKey = u.email?.trim().toLowerCase() || `__uid__:${u.uid}`;
    const g = byEmail.get(emailKey) ?? [];
    g.push(u);
    byEmail.set(emailKey, g);
  }

  list = [];
  for (const group of byEmail.values()) {
    if (group.length === 1) {
      list.push(group[0]);
      continue;
    }
    const self =
      authUid != null && authUid !== ""
        ? group.find((x) => x.uid === authUid || x.id === authUid)
        : undefined;
    const chosen = self ?? group.find((x) => x.id === x.uid) ?? group[0];
    const rest = group.filter((x) => x !== chosen);
    list.push(mergeProjectIds(chosen, rest));
  }

  return list;
}
