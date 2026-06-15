'use client';

export * from './provider';
export { useCollection } from './hooks/use-collection';
export { useDoc } from './hooks/use-doc';
export type { WithId } from './hooks/types';
export * from './mutations';
export * from './errors';
export * from './error-emitter';
export * from './env';
export * from './query-builder';
export * from './auth-compat';
export * from './storage-compat';
export * from './config';
export { SupabaseClientProvider } from './client-provider';
export { createSupabaseBrowserClient } from './client';
