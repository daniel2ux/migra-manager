"use client";

import { useMemo } from "react";
import { collection, collectionGroup, doc, query, where } from "@/supabase/compat-db-shim";
import { useDb, useUser, useCollection, useMemoDb, useDoc } from "@/supabase";
import type { Mock, Project } from "@/types/migration";
import { filterActiveMocks } from "@/lib/mock-utils";

interface UseMocksDataReturn {
  userProfile: any;
  isProfileLoading: boolean;
  isMaster: boolean;
  isAdmin: boolean;
  userProjectIds: string[];
  hasAccess: boolean;
  projectData: Project | null;
  masterObjects: any[] | null;
  mocks: Mock[] | null;
  isLoading: boolean;
  allMigrationObjects: any[] | null;
  objectsByMock: Record<string, any[]>;
}

export function useMocksData(projectId: string | null): UseMocksDataReturn {
  const db = useDb();
  const { user } = useUser();

  const userDocRef = useMemoDb(
    () => (user && db ? doc(db, "users", user.uid) : null),
    [db, user],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userDocRef);

  const isMaster =
    userProfile?.role?.toLowerCase() === "master" ||
    userProfile?.isMaster === true;
  const isAdmin = isMaster || userProfile?.role?.toLowerCase() === "admin";
  const userProjectIds = userProfile?.projectIds || [];
  const hasAccess = isAdmin || (projectId && userProjectIds.includes(projectId));

  const projectDocRef = useMemoDb(() => {
    if (!db || !projectId) return null;
    return doc(db, "projects", projectId);
  }, [db, projectId]);
  const { data: projectData } = useDoc<Project>(projectDocRef);

  const masterObjectsQuery = useMemoDb(
    () => (db ? collection(db, "masterObjects") : null),
    [db],
  );
  const { data: masterObjects } = useCollection<any>(masterObjectsQuery);

  const mocksQuery = useMemoDb(() => {
    if (!db || !projectId || !user || isProfileLoading || !userProfile) return null;
    if (!hasAccess) return null;
    return collection(db, "projects", projectId, "mocks");
  }, [db, projectId, user, hasAccess, isProfileLoading, userProfile]);

  const { data: mocks, isLoading } = useCollection<Mock>(mocksQuery);

  const migrationObjectsQuery = useMemoDb(() => {
    if (!db || !projectId || !hasAccess) return null;
    return query(collectionGroup(db, "migrationObjects"), where("projectId", "==", projectId));
  }, [db, projectId, hasAccess]);

  const { data: allMigrationObjects } = useCollection<any>(migrationObjectsQuery);

  const objectsByMock = useMemo(() => {
    if (!allMigrationObjects) return {};
    const allowedMockIds = new Set(filterActiveMocks(mocks).map((m) => m.id));
    const map: Record<string, any[]> = {};
    for (let i = 0; i < allMigrationObjects.length; i++) {
      const obj = allMigrationObjects[i];
      // Filtra estritamente objetos do projeto atual (campo ou path)
      const objectProjectId = obj.projectId || obj.__path?.split("/")[1];
      if (!objectProjectId || objectProjectId !== projectId) continue;

      const mockId = obj.mockId || obj.__path?.split("/")[3];
      if (!mockId || !allowedMockIds.has(mockId)) continue;
      if (mockId) {
        if (!map[mockId]) map[mockId] = [];
        map[mockId].push(obj);
      }
    }
    return map;
  }, [allMigrationObjects, projectId, mocks]);

  return {
    userProfile,
    isProfileLoading,
    isMaster,
    isAdmin,
    userProjectIds,
    hasAccess,
    projectData,
    masterObjects,
    mocks,
    isLoading,
    allMigrationObjects,
    objectsByMock,
  };
}
