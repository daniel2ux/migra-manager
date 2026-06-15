"use client";

import { collection, orderBy, query } from "@/supabase/compat-db-shim";
import { useDb, useCollection, useMemoDb } from "@/supabase";
import type { AccessProfileRecord } from "@/hooks/use-access-permissions";
import { ROLE_LABELS, type UserRole } from "@/types/usuarios";
import { roleToSystemProfileName } from "@/lib/auth/permissions";

export const ACCESS_PROFILE_DEFAULT = "__default__";

export function useAccessProfileOptions() {
  const db = useDb();

  const profilesQuery = useMemoDb(() => {
    if (!db) return null;
    return query(collection(db, "accessProfiles"), orderBy("name"));
  }, [db]);

  const { data, isLoading } = useCollection<AccessProfileRecord>(profilesQuery);

  return {
    profiles: data ?? [],
    isLoading,
  };
}

export function defaultAccessProfileLabel(role?: string | null, isMaster?: boolean): string {
  const systemName = roleToSystemProfileName(role, isMaster);
  const roleLabel = role && role in ROLE_LABELS ? ROLE_LABELS[role as UserRole] : systemName;
  return `Padrão (${roleLabel} → ${systemName})`;
}

/** Rótulo compacto para cards de usuário na listagem. */
export function accessProfileCardLabel(
  profiles: AccessProfileRecord[],
  accessProfileId: string | null | undefined,
  role?: string | null,
  isMaster?: boolean,
): { label: string; isCustom: boolean } {
  if (accessProfileId) {
    const found = profiles.find((p) => p.id === accessProfileId);
    return { label: found?.name ?? "Personalizado", isCustom: true };
  }
  const systemName = roleToSystemProfileName(role, isMaster);
  return { label: `Padrão · ${systemName}`, isCustom: false };
}
