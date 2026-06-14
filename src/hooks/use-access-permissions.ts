"use client";

import { useMemo } from "react";
import { collection, query, orderBy } from "@/supabase/compat-db-shim";
import { useDb, useCollection, useMemoDb } from "@/supabase";
import { SUPERADMIN_UID } from "@/lib/constants";
import {
  type PermissionKey,
  hasPermission,
  normalizePermissions,
  roleToSystemProfileName,
  ALL_PERMISSION_KEYS,
} from "@/lib/auth/permissions";

export interface AccessProfileRecord {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  isSystem?: boolean;
}

export function useAccessPermissions(userProfile: {
  role?: string;
  isMaster?: boolean;
  accessProfileId?: string | null;
} | null | undefined, userId?: string | null) {
  const db = useDb();

  const profilesQuery = useMemoDb(() => {
    if (!db) return null;
    return query(collection(db, "accessProfiles"), orderBy("name"));
  }, [db]);

  const { data: accessProfiles, isLoading: profilesLoading } =
    useCollection<AccessProfileRecord>(profilesQuery);

  const isMaster =
    userProfile?.isMaster === true ||
    userProfile?.role?.toLowerCase() === "master" ||
    userId === SUPERADMIN_UID;

  const isAdmin =
    isMaster || userProfile?.role?.toLowerCase() === "admin" || userId === SUPERADMIN_UID;

  const permissions = useMemo(() => {
    if (userId === SUPERADMIN_UID) {
      return new Set(ALL_PERMISSION_KEYS);
    }

    const customId = userProfile?.accessProfileId;
    let profileRecord: AccessProfileRecord | undefined;

    if (customId && accessProfiles?.length) {
      profileRecord = accessProfiles.find((p) => p.id === customId);
    }

    if (!profileRecord && accessProfiles?.length) {
      const systemName = roleToSystemProfileName(userProfile?.role, userProfile?.isMaster);
      profileRecord = accessProfiles.find(
        (p) => p.name.trim().toUpperCase() === systemName,
      );
    }

    const profileName =
      profileRecord?.name ??
      roleToSystemProfileName(userProfile?.role, userProfile?.isMaster);

    return normalizePermissions(profileRecord?.permissions, profileName);
  }, [accessProfiles, userProfile, userId]);

  const can = useMemo(
    () => (key: PermissionKey) => hasPermission(permissions, key),
    [permissions],
  );

  return {
    permissions,
    can,
    isMaster,
    isAdmin,
    isAdminOrMaster: isAdmin,
    accessProfiles: accessProfiles ?? [],
    profilesLoading,
  };
}
