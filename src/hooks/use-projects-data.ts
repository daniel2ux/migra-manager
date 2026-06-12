"use client";

import { useState, useMemo } from "react";
import { collection, query, where, doc } from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import type { WithId } from "@/firebase";
import { dedupeDirectoryUsers } from "@/lib/user-directory";
import { SUPERADMIN_UID } from "@/lib/constants";

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
  userProjectIds: string[];
  projects: WithId<Project>[] | null;
  isProjectsLoading: boolean;
  allUsers: ProjectMemberRow[] | null;
  filteredUsers: ProjectMemberRow[];
  userSearchTerm: string;
  setUserSearchTerm: (term: string) => void;
}

export function useProjectsData(__searchTerm: string): UseProjectsDataReturn {
  const db = useFirestore();
  const { user } = useUser();
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const userDocRef = useMemoFirebase(
    () => (user && db ? doc(db, "users", user.uid) : null),
    [db, user],
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userDocRef);

  const isMaster =
    userProfile?.isMaster === true ||
    userProfile?.role?.toLowerCase() === "master" ||
    user?.uid === SUPERADMIN_UID;
  const isAdmin =
    isMaster ||
    userProfile?.role?.toLowerCase() === "admin" ||
    user?.uid === SUPERADMIN_UID;
  const userProjectIds = useMemo(
    () => userProfile?.projectIds || [],
    [userProfile],
  );

  /** Admin/master: coleção inteira (como dashboard e project picker). Demais: só memberships. */
  const projectsQuery = useMemoFirebase(() => {
    if (!db || !user || isProfileLoading || !userProfile) return null;
    const projectsRef = collection(db, "projects");
    if (isAdmin) return projectsRef;
    return query(projectsRef, where("memberUids", "array-contains", user.uid));
  }, [db, user, isAdmin, isProfileLoading, userProfile]);

  const { data: projects, isLoading: isProjectsLoading } =
    useCollection<Project>(projectsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);
  const { data: allUsers } = useCollection<ProjectMemberData>(usersQuery);

  const directoryUsers = useMemo(
    () => dedupeDirectoryUsers((allUsers as ProjectMemberRow[] | null) ?? null, user?.uid),
    [allUsers, user?.uid],
  );

  const filteredUsers = useMemo(() => {
    const q = userSearchTerm.toLowerCase();
    return directoryUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [directoryUsers, userSearchTerm]);

  return {
    userProfile,
    isProfileLoading,
    isMaster,
    isAdmin,
    userProjectIds,
    projects: projects as WithId<Project>[] | null,
    isProjectsLoading,
    allUsers: allUsers as ProjectMemberRow[] | null,
    filteredUsers,
    userSearchTerm,
    setUserSearchTerm,
  };
}
