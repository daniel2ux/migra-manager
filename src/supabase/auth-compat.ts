'use client';

import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

export interface CompatUser {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  _raw: SupabaseUser;
}

export function toCompatUser(user: SupabaseUser, client: SupabaseClient): CompatUser {
  return {
    uid: user.id,
    id: user.id,
    email: user.email ?? null,
    displayName: (user.user_metadata?.name as string) ?? user.email ?? null,
    photoURL: (user.user_metadata?.photoURL as string) ?? null,
    getIdToken: async () => {
      const { data } = await client.auth.getSession();
      return data.session?.access_token ?? '';
    },
    _raw: user,
  };
}

export type Auth = SupabaseClient['auth'];

export async function signInWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string,
) {
  const { data, error } = await auth.signInWithPassword({ email, password });
  if (error) throw Object.assign(error, { code: mapAuthError(error.message) });
  const client = auth as unknown as SupabaseClient;
  return { user: toCompatUser(data.user!, client) };
}

export async function signOut(auth: Auth) {
  const { error } = await auth.signOut();
  if (error) throw error;
}

export async function setPersistence(_auth: Auth, _mode: unknown) {
  // Supabase handles session persistence via cookies/localStorage
}

export const browserSessionPersistence = 'session';

export function getAuth(client: SupabaseClient): Auth {
  return client.auth;
}

export async function createUserWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string,
) {
  const client = auth as unknown as SupabaseClient;
  const { data, error } = await auth.signUp({ email, password });
  if (error) throw Object.assign(error, { code: mapAuthError(error.message) });
  if (!data.user) throw new Error('Falha ao criar usuário');
  return { user: toCompatUser(data.user, client) };
}

function mapAuthError(msg: string): string {
  if (msg.includes('Invalid login')) return 'auth/invalid-credential';
  if (msg.includes('Email not confirmed')) return 'auth/email-not-verified';
  return 'auth/unknown';
}
