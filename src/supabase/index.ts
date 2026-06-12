'use client';

export * from './provider';
export * from './hooks/use-collection';
export * from './hooks/use-doc';
export * from './mutations';
export * from './errors';
export * from './error-emitter';
export * from './env';
export * from './query-builder';
export * from './auth-compat';
export * from './storage-compat';
export { createSupabaseBrowserClient } from './client';

export function initializeFirebase() {
  const client = createSupabaseBrowserClient();
  return {
    firebaseApp: client,
    auth: client.auth,
    firestore: client,
    storage: client,
  };
}
