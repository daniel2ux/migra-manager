'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type DependencyList,
  type ReactNode,
} from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/supabase/client';
import { setQueryClient, type SupabaseDb } from '@/supabase/query-builder';
import { toCompatUser, type CompatUser } from '@/supabase/auth-compat';
import { SupabaseErrorListener } from '@/components/SupabaseErrorListener';

export interface SupabaseContextState {
  areServicesAvailable: boolean;
  client: SupabaseClient | null;
  db: SupabaseDb | null;
  auth: SupabaseClient['auth'] | null;
  storage: SupabaseClient | null;
  user: CompatUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult {
  user: CompatUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

const SupabaseContext = createContext<SupabaseContextState | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const instance = createSupabaseBrowserClient();
    setQueryClient(instance);
    return instance;
  }, []);
  const [user, setUser] = useState<CompatUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  useEffect(() => {
    setQueryClient(client);

    const sync = (sessionUser: import('@supabase/supabase-js').User | null) => {
      if (!sessionUser) {
        setUser(null);
        setIsUserLoading(false);
        return;
      }
      setUser(toCompatUser(sessionUser, client));
      setIsUserLoading(false);
      setUserError(null);
    };

    void client.auth.getSession().then(({ data }) => {
      sync(data.session?.user ?? null);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      sync(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, [client]);

  const value = useMemo(
    (): SupabaseContextState => ({
      areServicesAvailable: true,
      client,
      db: client,
      auth: client.auth,
      storage: client,
      user,
      isUserLoading,
      userError,
    }),
    [client, user, isUserLoading, userError],
  );

  return (
    <SupabaseContext.Provider value={value}>
      <SupabaseErrorListener />
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase(): SupabaseContextState {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error('useSupabase must be used within SupabaseProvider');
  return ctx;
}

/** Retorna o GoTrueClient real — não usar spread (perde métodos do prototype). */
export function useAuth() {
  const { auth } = useSupabase();
  return auth;
}

export function useDb(): SupabaseDb | null {
  return useSupabase().db;
}

export function useStorage(): SupabaseClient | null {
  return useSupabase().storage;
}

export function useUser(): UserHookResult {
  const { user, isUserLoading, userError } = useSupabase();
  return { user, isUserLoading, userError };
}

type MemoDbRef<T> = T & { __memo?: boolean };

export function useMemoDb<T>(factory: () => T, deps: DependencyList): T | MemoDbRef<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(factory, deps);
  if (typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoDbRef<T>).__memo = true;
  return memoized;
}
