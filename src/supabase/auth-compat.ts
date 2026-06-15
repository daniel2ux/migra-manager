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

function resolveAuthClient(clientOrAuth: SupabaseClient | Auth): Auth {
  return 'auth' in clientOrAuth ? clientOrAuth.auth : clientOrAuth;
}

export function toCompatUser(user: SupabaseUser, clientOrAuth: SupabaseClient | Auth): CompatUser {
  const authClient = resolveAuthClient(clientOrAuth);
  return {
    uid: user.id,
    id: user.id,
    email: user.email ?? null,
    displayName: (user.user_metadata?.name as string) ?? user.email ?? null,
    photoURL: (user.user_metadata?.photoURL as string) ?? null,
    getIdToken: async (forceRefresh?: boolean) => {
      if (forceRefresh) {
        const { data, error } = await authClient.refreshSession();
        if (error) throw error;
        return data.session?.access_token ?? '';
      }
      const { data } = await authClient.getSession();
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
  return { user: toCompatUser(data.user!, auth) };
}

export async function signOut(auth: Auth) {
  const { error } = await auth.signOut();
  if (error) throw error;
}

export async function setPersistence(_auth: Auth, _mode: unknown) {
  // Sessão por aba via sessionStorage em createSupabaseBrowserClient (client.ts).
}

export const browserSessionPersistence = 'session';

function mapAuthError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'auth/invalid-credential';
  }
  if (lower.includes('email not confirmed')) return 'auth/email-not-verified';
  if (lower.includes('user is banned') || lower.includes('disabled')) return 'auth/user-disabled';
  if (lower.includes('too many')) return 'auth/too-many-requests';
  if (lower.includes('weak password') || lower.includes('pwned')) return 'auth/weak-password';
  return 'auth/unknown';
}
