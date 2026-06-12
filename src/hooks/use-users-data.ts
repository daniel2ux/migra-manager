"use client";

import { useMemo } from "react";
import { doc, collection } from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import type { UserProfile } from "@/types/usuarios";
import { dedupeDirectoryUsers, type UserDirectoryDoc } from "@/lib/user-directory";

export function useUsersData(searchTerm: string) {
  const db = useFirestore();
  const { user } = useUser();
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(user && db ? doc(db, "users", user.uid) : null);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user || isProfileLoading || !currentUserProfile) return null;
    return collection(db, "users");
  }, [db, user, isProfileLoading, currentUserProfile]);
  const { data: allUsers, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

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

  const isMaster = currentUserProfile?.role?.toLowerCase() === "master" || currentUserProfile?.isMaster === true;
  const isAdmin = isMaster || currentUserProfile?.role?.toLowerCase() === "admin";

  return { currentUserProfile, isProfileLoading, allUsers, isUsersLoading, filteredUsers, isMaster, isAdmin };
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
