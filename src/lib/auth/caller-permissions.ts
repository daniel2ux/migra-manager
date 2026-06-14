import {
  ALL_PERMISSION_KEYS,
  buildDefaultPermissions,
  hasPermission,
  normalizePermissions,
  roleToSystemProfileName,
  type PermissionKey,
} from "@/lib/auth/permissions";
import { getSupabaseAdmin } from "@/supabase/admin";

export type { PermissionKey };

export async function loadCallerPermissions(uid: string): Promise<Set<PermissionKey>> {
  if (process.env.SUPERADMIN_UID && uid === process.env.SUPERADMIN_UID) {
    return new Set(ALL_PERMISSION_KEYS);
  }

  const admin = getSupabaseAdmin();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role, is_master, access_profile_id")
    .eq("id", uid)
    .maybeSingle();

  if (error || !profile) {
    return new Set(buildDefaultPermissions("MEMBRO"));
  }

  const systemName = roleToSystemProfileName(profile.role, profile.is_master);

  let accessProfile: { name: string; permissions: string[] } | null = null;

  if (profile.access_profile_id) {
    const { data } = await admin
      .from("access_profiles")
      .select("name, permissions")
      .eq("id", profile.access_profile_id)
      .maybeSingle();
    accessProfile = data;
  }

  if (!accessProfile) {
    const { data } = await admin
      .from("access_profiles")
      .select("name, permissions")
      .ilike("name", systemName)
      .maybeSingle();
    accessProfile = data;
  }

  return normalizePermissions(
    accessProfile?.permissions,
    accessProfile?.name ?? systemName,
  );
}

export async function verifyCallerPermission(
  token: string,
  permission: PermissionKey,
): Promise<{ decoded?: { uid: string; email?: string | null }; error?: string }> {
  try {
    const normalizedToken = token.replace(/^Bearer\s+/i, "").trim();
    if (!normalizedToken) {
      return { error: "TOKEN AUSENTE." };
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(normalizedToken);
    if (error || !data.user) {
      return { error: `FALHA NA VERIFICAÇÃO DO TOKEN: ${error?.message ?? "inválido"}` };
    }

    const uid = data.user.id;
    const permissions = await loadCallerPermissions(uid);

    if (!hasPermission(permissions, permission)) {
      return { error: `ACESSO NEGADO: permissão necessária — ${permission}.` };
    }

    return { decoded: { uid, email: data.user.email } };
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err);
    return { error: `FALHA NA VERIFICAÇÃO DO TOKEN: ${details}` };
  }
}
