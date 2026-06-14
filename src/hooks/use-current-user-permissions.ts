"use client";

import { doc } from "@/supabase/compat-db-shim";
import { useDb, useUser, useDoc, useMemoDb } from "@/supabase";
import type { UserProfile } from "@/types/usuarios";
import { useAccessPermissions } from "@/hooks/use-access-permissions";

export function useCurrentUserPermissions() {
  const db = useDb();
  const { user, isUserLoading } = useUser();

  const userDocRef = useMemoDb(
    () => (user && db && !isUserLoading ? doc(db, "users", user.uid) : null),
    [db, user, isUserLoading],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const access = useAccessPermissions(userProfile, user?.uid ?? null);

  return {
    user,
    userProfile,
    isProfileLoading: isProfileLoading || access.profilesLoading,
    ...access,
  };
}
