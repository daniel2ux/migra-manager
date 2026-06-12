export * from '@/supabase/auth-compat';

export type Auth = import('@supabase/supabase-js').SupabaseClient['auth'];
export type User = import('@/supabase/auth-compat').CompatUser;
