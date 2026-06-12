'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseEnvComplete, supabaseAnonKey, supabaseUrl } from './env';

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  if (!isSupabaseEnvComplete) {
    browserClient = createBrowserClient(
      'http://localhost:54321',
      'dev-placeholder-key',
    );
    return browserClient;
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
