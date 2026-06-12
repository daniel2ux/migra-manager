import { isSupabaseEnvComplete, supabaseAnonKey, supabaseUrl } from '@/supabase/env';

/** @deprecated Prefer isSupabaseEnvComplete from @/supabase/env */
export const isFirebaseEnvComplete = isSupabaseEnvComplete;

/** @deprecated Legacy alias for login diagnostics */
export const firebaseConfig = {
  apiKey: supabaseAnonKey,
  authDomain: supabaseUrl,
  projectId: isSupabaseEnvComplete ? 'supabase' : 'migra-dev-placeholder',
  storageBucket: 'supabase',
  messagingSenderId: '',
  appId: '',
};
