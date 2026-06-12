import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL são obrigatórios no servidor.');
  }

  adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return adminClient;
}

function mapTable(name: string) {
  if (name === 'users') return 'profiles';
  if (name === 'migrationLogs') return 'migration_logs';
  if (name === 'audit_logs') return 'audit_logs';
  if (name === 'appConfig') return 'app_config';
  if (name === 'masterObjects') return 'master_objects';
  if (name === 'error_logs') return 'audit_logs';
  return name;
}

export const adminAuth = {
  async verifyIdToken(token: string) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) throw error ?? new Error('Token inválido');
    return { uid: data.user.id, email: data.user.email };
  },
  async createUser(opts: { email: string; password: string; displayName?: string }) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email: opts.email,
      password: opts.password,
      email_confirm: true,
      user_metadata: { name: opts.displayName },
    });
    if (error) throw Object.assign(error, { code: error.message.includes('already') ? 'auth/email-already-exists' : error.code });
    return { uid: data.user!.id, email: data.user!.email };
  },
  async updateUser(uid: string, opts: { password?: string; disabled?: boolean }) {
    const admin = getSupabaseAdmin();
    if (opts.password) {
      const { error } = await admin.auth.admin.updateUserById(uid, { password: opts.password });
      if (error) throw error;
    }
    if (opts.disabled !== undefined) {
      const { error } = await admin.from('profiles').update({ is_disabled: opts.disabled }).eq('id', uid);
      if (error) throw error;
    }
  },
  async getUserByEmail(email: string) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) throw Object.assign(new Error('User not found'), { code: 'auth/user-not-found' });
    return { uid: user.id, email: user.email };
  },
  async revokeRefreshTokens(uid: string) {
    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.signOut(uid, 'global');
    if (error) throw error;
  },
  async deleteUser(uid: string) {
    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) throw error;
  },
};

export const adminDb = {
  collection(name: string) {
    const table = mapTable(name);
    return {
      doc(id: string) {
        return {
          async get() {
            const admin = getSupabaseAdmin();
            if (table === 'app_config') {
              const { data, error } = await admin.from(table).select('*').eq('key', id).maybeSingle();
              if (error) throw error;
              return { exists: Boolean(data), data: () => data?.value ?? data, id };
            }
            const { data, error } = await admin.from(table).select('*').eq('id', id).maybeSingle();
            if (error) throw error;
            return { exists: Boolean(data), data: () => data, id };
          },
          async set(payload: Record<string, unknown>) {
            const admin = getSupabaseAdmin();
            if (table === 'app_config') {
              const { error } = await admin.from(table).upsert({ key: id, value: payload });
              if (error) throw error;
              return;
            }
            const { error } = await admin.from(table).upsert({ id, ...payload });
            if (error) throw error;
          },
          async update(payload: Record<string, unknown>) {
            const admin = getSupabaseAdmin();
            const { error } = await admin.from(table).update(payload).eq('id', id);
            if (error) throw error;
          },
          async delete() {
            const admin = getSupabaseAdmin();
            const { error } = await admin.from(table).delete().eq('id', id);
            if (error) throw error;
          },
        };
      },
      async add(payload: Record<string, unknown>) {
        const admin = getSupabaseAdmin();
        const { data, error } = await admin.from(table).insert(payload).select('id').single();
        if (error) throw error;
        return { id: (data as { id: string }).id };
      },
    };
  },
  batch() {
    const ops: Array<() => Promise<void>> = [];
    return {
      delete(ref: { id?: string; collection?: string }) {
        ops.push(async () => {
          const admin = getSupabaseAdmin();
          const table = mapTable(ref.collection ?? 'master_objects');
          if (ref.id) await admin.from(table).delete().eq('id', ref.id);
        });
        return this;
      },
      async commit() {
        for (const op of ops) await op();
      },
    };
  },
};
