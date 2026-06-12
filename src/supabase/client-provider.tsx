'use client';

import type { ReactNode } from 'react';
import { SupabaseProvider } from '@/supabase/provider';
import { isSupabaseEnvComplete } from '@/supabase/env';

export function SupabaseClientProvider({ children }: { children: ReactNode }) {
  return (
    <SupabaseProvider>
      {!isSupabaseEnvComplete && (
        <div
          role="status"
          className="print:hidden border-b border-amber-400 bg-amber-50 px-4 py-2 text-center text-[11px] font-semibold text-amber-950"
        >
          Supabase sem variáveis em <code className="rounded bg-amber-100/80 px-1">.env.local</code>
          {' — '}
          copie <code className="rounded bg-amber-100/80 px-1">.env.example</code>, preencha com o projeto Supabase e reinicie{' '}
          <code className="rounded bg-amber-100/80 px-1">npm run dev</code>.
        </div>
      )}
      {children}
    </SupabaseProvider>
  );
}

/** @deprecated Use SupabaseClientProvider */
export const FirebaseClientProvider = SupabaseClientProvider;
