import { isSupabaseEnvComplete, supabaseAnonKey, supabaseUrl } from '@/supabase/env';

/** @deprecated Use supabase env vars */
export const firebaseConfig = {
  apiKey: supabaseAnonKey,
  authDomain: supabaseUrl,
  projectId: isSupabaseEnvComplete ? 'supabase' : 'migra-dev-placeholder',
  storageBucket: 'supabase',
  messagingSenderId: '',
  appId: '',
};

export const isFirebaseEnvComplete = isSupabaseEnvComplete;
