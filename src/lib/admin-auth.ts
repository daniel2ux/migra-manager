import { getSupabaseAdmin } from '@/supabase/admin';
import {
  verifyCallerPermission as verifyCallerPermissionImpl,
  type PermissionKey,
} from '@/lib/auth/caller-permissions';

export type { PermissionKey };

type UserRole = 'master' | 'admin' | 'especialista' | 'membro';

export interface VerifyResult {
  decoded?: { uid: string; email?: string | null };
  error?: string;
}

export async function verifyCallerRole(
  token: string,
  allowedRoles: UserRole[],
): Promise<VerifyResult> {
  try {
    const normalizedToken = token.replace(/^Bearer\s+/i, '').trim();
    if (!normalizedToken) {
      return { error: 'TOKEN AUSENTE.' };
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(normalizedToken);
    if (error || !data.user) {
      return { error: `FALHA NA VERIFICAÇÃO DO TOKEN: ${error?.message ?? 'inválido'}` };
    }

    const uid = data.user.id;

    if (process.env.SUPERADMIN_UID && uid === process.env.SUPERADMIN_UID) {
      return { decoded: { uid, email: data.user.email } };
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role, is_master')
      .eq('id', uid)
      .maybeSingle();

    if (profileError) {
      return { error: `FALHA AO LER PERFIL: ${profileError.message}` };
    }

    const role = profile?.role as UserRole | undefined;
    const isMasterFlag = profile?.is_master === true;

    if ((role && allowedRoles.includes(role)) || (isMasterFlag && allowedRoles.includes('master'))) {
      return { decoded: { uid, email: data.user.email } };
    }

    return {
      error: `ACESSO NEGADO: perfil necessário — ${allowedRoles.join(' ou ')}.`,
    };
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err);
    return { error: `FALHA NA VERIFICAÇÃO DO TOKEN: ${details}` };
  }
}

export async function verifyCallerPermission(
  token: string,
  permission: PermissionKey,
): Promise<VerifyResult> {
  return verifyCallerPermissionImpl(token, permission);
}
