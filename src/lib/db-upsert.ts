import { collection, doc } from '@/supabase/compat-db-shim';
import type { CompatDb } from '@/supabase/compat-db-shim';

/**
 * Cria ou retorna referência de documento
 */
export function getDocRef(db: CompatDb, collectionName: string, existingId?: string) {
  if (existingId) return doc(db, collectionName, existingId);
  return doc(collection(db, collectionName));
}

/**
 * Valida pré-condições para upsert
 */
export function validateUpsert(userId: string | undefined, db: CompatDb | null): void {
  if (!userId) throw new Error('Usuário não autenticado');
  if (!db) throw new Error('Banco de dados não inicializado');
}

/**
 * Constrói dados comuns de auditoria
 */
export function buildAuditData(userId: string, extra: Record<string, unknown>, isNew: boolean): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    ...extra,
    updatedAt: now,
    updatedByUid: userId,
    ...(isNew ? { createdAt: now, createdByUid: userId } : {}),
  };
}
