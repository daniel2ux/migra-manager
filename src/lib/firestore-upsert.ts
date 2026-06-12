import { collection, doc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

/**
 * Cria ou retorna referência de documento
 */
export function getDocRef(db: Firestore, collectionName: string, existingId?: string) {
  if (existingId) return doc(db, collectionName, existingId);
  return doc(collection(db, collectionName));
}

/**
 * Valida pré-condições para upsert
 */
export function validateUpsert(userId: string | undefined, db: Firestore | null): void {
  if (!userId) throw new Error('Usuário não autenticado');
  if (!db) throw new Error('Firestore não inicializado');
}

/**
 * Constrói dados comuns de auditoria
 */
export function buildAuditData(userId: string, extra: Record<string, any>, isNew: boolean): Record<string, any> {
  const now = new Date().toISOString();
  return {
    ...extra,
    updatedAt: now,
    updatedByUid: userId,
    ...(isNew ? { createdAt: now, createdByUid: userId } : {}),
  };
}
