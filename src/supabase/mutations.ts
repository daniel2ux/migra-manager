'use client';

import type { CollectionReference, DocumentReference } from '@/supabase/query-builder';
import { setDoc, updateDoc, deleteDoc, addDoc } from '@/supabase/query-builder';
import { errorEmitter } from '@/supabase/error-emitter';
import { SupabasePermissionError } from '@/supabase/errors';

function handleWriteError(
  error: unknown,
  path: string,
  operation: SupabasePermissionError['request']['method'],
  data?: unknown,
) {
  const code = (error as { code?: string })?.code;
  if (code === '42501' || (error instanceof Error && error.message.includes('policy'))) {
    errorEmitter.emit(
      'permission-error',
      new SupabasePermissionError({ path, operation, requestResourceData: data }),
    );
  }
}

function withWriteErrorHandling<T>(
  promise: Promise<T>,
  path: string,
  operation: SupabasePermissionError['request']['method'],
  data?: unknown,
): Promise<T> {
  return promise.catch((error) => {
    handleWriteError(error, path, operation, data);
    throw error;
  });
}

export function setDocumentNonBlocking(
  docRef: DocumentReference,
  data: Record<string, unknown>,
  options: { merge?: boolean },
) {
  return withWriteErrorHandling(
    setDoc(docRef, data, options),
    docRef.path,
    'write',
    data,
  );
}

export function addDocumentNonBlocking(colRef: CollectionReference, data: Record<string, unknown>) {
  return withWriteErrorHandling(addDoc(colRef, data), colRef.path, 'create', data);
}

export function updateDocumentNonBlocking(docRef: DocumentReference, data: Record<string, unknown>) {
  return withWriteErrorHandling(updateDoc(docRef, data), docRef.path, 'update', data);
}

export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  return withWriteErrorHandling(deleteDoc(docRef), docRef.path, 'delete');
}
