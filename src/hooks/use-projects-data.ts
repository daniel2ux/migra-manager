"use client";

import { useMemo } from "react";
import { collection, query, where, doc } from "@/supabase/compat-db-shim";
import { useDb, useUser, useCollection, useMemoDb, useDoc } from "@/supabase";
import type { WithId } from "@/supabase";
import { dedupeDirectoryUsers } from "@/lib/user-directory";
import { useAccessPermissions } from "@/hooks/use-access-permissions";
import type { PermissionKey } from "@/lib/auth/permissions";

interface Project {
  id: string;
  name: string;
  description: string;
  company: string;
  createdAt?: any;
  updatedAt?: any;
  isLocked: boolean;
  ownerId: string;
  memberUids?: string[];
  memberProfiles?: { uid: string; name: string; position?: string; role?: string }[];
  lockedByMaster?: boolean;
  lockedByUid?: string;
  lockedByName?: string;
  executionStatus?: "ATIVO" | "EM_EXECUCAO" | "ENCERRADO";
}

type ProjectMemberData = {
  uid?: string;
  email: string;
  name: string;
  role: string;
  projectIds?: string[];
  position?: string;
};

/** Resultado de `useCollection` para `users` no contexto de projetos. */
type ProjectMemberRow = WithId<ProjectMemberData>;

interface UseProjectsDataReturn {
  userProfile: any;
  isProfileLoading: boolean;
  isMaster: boolean;
  isAdmin: boolean;
  can: (key: PermissionKey) => boolean;
  userProjectIds: string[];
  projects: WithId<Project>[] | null;
  isProjectsLoading: boolean;
  allUsers: ProjectMemberRow[] | null;
  projectMembers: (ProjectMemberRow & { uid: string })[];
}

export function useProjectsData(__searchTerm: string): UseProjectsDataReturn {
  const db = useDb();
  const { user } = useUser();

  const userDocRef = useMemoDb(
    () => (user && db ? doc(db, "users", user.uid) : null),
    [db, user],
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userDocRef);

  const { can, isMaster, isAdmin } = useAccessPermissions(userProfile, user?.uid ?? null);

  const userProjectIds = useMemo(
    () => userProfile?.projectIds || [],
    [userProfile],
  );

  /** Admin/master: coleção inteira (como dashboard e project picker). Demais: só memberships. */
  const projectsQuery = useMemoDb(() => {
    if (!db || !user || isProfileLoading || !userProfile) return null;
    const projectsRef = collection(db, "projects");
    if (isAdmin) return projectsRef;
    return query(projectsRef, where("memberUids", "array-contains", user.uid));
  }, [db, user, isAdmin, isProfileLoading, userProfile]);

  const { data: projects, isLoading: isProjectsLoading } =
    useCollection<Project>(projectsQuery);

  const usersQuery = useMemoDb(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);
  const { data: allUsers } = useCollection<ProjectMemberData>(usersQuery);

  const projectMembers = useMemo(
    () => dedupeDirectoryUsers((allUsers as ProjectMemberRow[] | null) ?? null, user?.uid),
    [allUsers, user?.uid],
  );

  return {
    userProfile,
    isProfileLoading,
    isMaster,
    isAdmin,
    can,
    userProjectIds,
    projects: projects as WithId<Project>[] | null,
    isProjectsLoading,
    allUsers: allUsers as ProjectMemberRow[] | null,
    projectMembers,
  };
}
