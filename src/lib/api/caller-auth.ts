import { getSupabaseAdmin } from '@/supabase/admin';
import {
  verifyCallerRole,
  verifyCallerPermission,
  type VerifyResult,
  type PermissionKey,
} from '@/lib/admin-auth';

export type { VerifyResult, PermissionKey };

export function extractCallerToken(
  body: Record<string, unknown> | null | undefined,
  req?: Request,
): string {
  const fromBody = typeof body?.callerToken === 'string' ? body.callerToken.trim() : '';
  if (fromBody) return fromBody;

  const header = req?.headers.get('authorization') ?? '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

export async function verifyAuthenticatedCaller(token: string): Promise<VerifyResult> {
  try {
    const normalizedToken = token.replace(/^Bearer\s+/i, '').trim();
    if (!normalizedToken) {
      return { error: 'TOKEN AUSENTE.' };
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(normalizedToken);
    if (error || !data.user) {
      return { error: 'SESSÃO INVÁLIDA OU EXPIRADA.' };
    }

    const uid = data.user.id;

    if (process.env.SUPERADMIN_UID && uid === process.env.SUPERADMIN_UID) {
      return { decoded: { uid, email: data.user.email } };
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('is_disabled')
      .eq('id', uid)
      .maybeSingle();

    if (profileError) {
      return { error: `FALHA AO LER PERFIL: ${profileError.message}` };
    }

    if (profile?.is_disabled) {
      return { error: 'CONTA DESABILITADA.' };
    }

    return { decoded: { uid, email: data.user.email } };
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err);
    return { error: `FALHA NA VERIFICAÇÃO DO TOKEN: ${details}` };
  }
}

export async function requireAuthenticatedCaller(
  body: Record<string, unknown> | null | undefined,
  req?: Request,
): Promise<VerifyResult & { token: string }> {
  const token = extractCallerToken(body, req);
  const verification = await verifyAuthenticatedCaller(token);
  return { ...verification, token };
}

export async function requireAdminOrMasterCaller(
  body: Record<string, unknown> | null | undefined,
  req?: Request,
): Promise<VerifyResult & { token: string }> {
  const token = extractCallerToken(body, req);
  const verification = await verifyCallerRole(token, ['admin', 'master']);
  return { ...verification, token };
}

export async function requirePermissionCaller(
  body: Record<string, unknown> | null | undefined,
  permission: PermissionKey,
  req?: Request,
): Promise<VerifyResult & { token: string }> {
  const token = extractCallerToken(body, req);
  const verification = await verifyCallerPermission(token, permission);
  return { ...verification, token };
}
