'use client';

import type { CollectionReference, DocumentReference } from '@/supabase/query-builder';
import { setDoc, updateDoc, deleteDoc, addDoc } from '@/supabase/query-builder';
import { errorEmitter } from '@/supabase/error-emitter';
import { FirestorePermissionError } from '@/supabase/errors';

function handleWriteError(
  error: unknown,
  path: string,
  operation: FirestorePermissionError['request']['method'],
  data?: unknown,
) {
  const code = (error as { code?: string })?.code;
  if (code === '42501' || (error instanceof Error && error.message.includes('policy'))) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({ path, operation, requestResourceData: data }),
    );
  }
}

export function setDocumentNonBlocking(
  docRef: DocumentReference,
  data: Record<string, unknown>,
  options: { merge?: boolean },
) {
  return setDoc(docRef, data, options).catch((e) => handleWriteError(e, docRef.path, 'write', data));
}

export function addDocumentNonBlocking(colRef: CollectionReference, data: Record<string, unknown>) {
  return addDoc(colRef, data).catch((e) => handleWriteError(e, colRef.path, 'create', data));
}

export function updateDocumentNonBlocking(docRef: DocumentReference, data: Record<string, unknown>) {
  return updateDoc(docRef, data).catch((e) => handleWriteError(e, docRef.path, 'update', data));
}

export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  return deleteDoc(docRef).catch((e) => handleWriteError(e, docRef.path, 'delete'));
}
