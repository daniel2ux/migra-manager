"use client";

import { useMemo } from "react";
import { doc, collection } from "@/supabase/compat-db-shim";
import { useDb, useUser, useCollection, useMemoDb, useDoc } from "@/supabase";
import type { UserProfile } from "@/types/usuarios";
import { dedupeDirectoryUsers, type UserDirectoryDoc } from "@/lib/user-directory";
import { useAccessPermissions } from "@/hooks/use-access-permissions";

export function useUsersData(searchTerm: string) {
  const db = useDb();
  const { user } = useUser();
  const userId = user?.uid ?? null;

  const profileDocRef = useMemoDb(
    () => (db && userId ? doc(db, "users", userId) : null),
    [db, userId],
  );
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);

  const { can, isMaster, isAdmin } = useAccessPermissions(currentUserProfile, userId);

  const profileReady = !isProfileLoading && !!currentUserProfile;
  const usersQuery = useMemoDb(() => {
    if (!db || !userId || !profileReady || !can("users.view")) return null;
    return collection(db, "users");
  }, [db, userId, profileReady, can]);
  const { data: allUsers, isLoading: isUsersLoading, refetch: refreshUsers } = useCollection<UserProfile>(usersQuery);

  const directoryUsers = useMemo(
    () => dedupeDirectoryUsers(allUsers as UserDirectoryDoc[] | null, user?.uid),
    [allUsers, user?.uid],
  );

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toUpperCase();
    return directoryUsers.filter((u) =>
      (u.name + " " + u.email + " " + (u.company || "")).toUpperCase().includes(term),
    );
  }, [directoryUsers, searchTerm]);

  return {
    currentUserProfile,
    isProfileLoading,
    allUsers,
    isUsersLoading,
    filteredUsers,
    isMaster,
    isAdmin,
    can,
    refreshUsers,
  };
}

export function useUserPermissions(
  selectedUser: UserProfile | null,
  currentUserId: string | undefined,
  can: (key: import("@/lib/auth/permissions").PermissionKey) => boolean,
) {
  const isTargetMaster = selectedUser?.role === 'master' || selectedUser?.isMaster;
  const isEditingSelf = selectedUser?.uid === currentUserId;
  return {
    isTargetMaster: !!isTargetMaster,
    isEditingSelf,
    canEditSelectedUser:
      isEditingSelf ||
      (isTargetMaster ? can("users.change_role") : can("users.edit")),
    canDeleteUser: can("users.delete"),
    canChangeRole: can("users.change_role"),
    canResetPassword: can("users.reset_password"),
    canBlockUser: can("users.block"),
  };
}
