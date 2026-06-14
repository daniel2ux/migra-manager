"use client";

import { useMemo } from "react";
import { doc, collection } from "@/supabase/compat-db-shim";
import { useDb, useUser, useCollection, useMemoDb, useDoc } from "@/supabase";
import type { UserProfile } from "@/types/usuarios";
import { dedupeDirectoryUsers, type UserDirectoryDoc } from "@/lib/user-directory";
import { SUPERADMIN_UID } from "@/lib/constants";

export function useUsersData(searchTerm: string) {
  const db = useDb();
  const { user } = useUser();
  const userId = user?.uid ?? null;

  const profileDocRef = useMemoDb(
    () => (db && userId ? doc(db, "users", userId) : null),
    [db, userId],
  );
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);

  const profileReady = !isProfileLoading && !!currentUserProfile;
  const usersQuery = useMemoDb(() => {
    if (!db || !userId || !profileReady) return null;
    return collection(db, "users");
  }, [db, userId, profileReady]);
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

  const isMaster =
    currentUserProfile?.isMaster === true ||
    currentUserProfile?.role?.toLowerCase() === "master" ||
    userId === SUPERADMIN_UID;
  const isAdmin =
    isMaster ||
    currentUserProfile?.role?.toLowerCase() === "admin" ||
    userId === SUPERADMIN_UID;

  return { currentUserProfile, isProfileLoading, allUsers, isUsersLoading, filteredUsers, isMaster, isAdmin, refreshUsers };
}

export function useUserPermissions(selectedUser: UserProfile | null, currentUserId: string | undefined, isMaster: boolean, isAdmin: boolean) {
  const isTargetMaster = selectedUser?.role === 'master' || selectedUser?.isMaster;
  const isEditingSelf = selectedUser?.uid === currentUserId;
  return {
    isTargetMaster: !!isTargetMaster,
    isEditingSelf,
    canEditSelectedUser: isEditingSelf || (isTargetMaster ? isMaster : isAdmin),
  };
}
