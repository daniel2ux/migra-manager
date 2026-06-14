"use client";

import { useMemo } from "react";
import { collection, collectionGroup, doc, query, where } from "@/supabase/compat-db-shim";
import { useDb, useUser, useCollection, useMemoDb, useDoc } from "@/supabase";
import type { Mock, Project } from "@/types/migration";
import { filterActiveMocks } from "@/lib/mock-utils";
import { useAccessPermissions } from "@/hooks/use-access-permissions";
import type { PermissionKey } from "@/lib/auth/permissions";

interface UseMocksDataReturn {
  userProfile: any;
  isProfileLoading: boolean;
  isMaster: boolean;
  isAdmin: boolean;
  can: (key: PermissionKey) => boolean;
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

  const { can, isMaster, isAdmin } = useAccessPermissions(userProfile, user?.uid ?? null);

  const userProjectIds = userProfile?.projectIds || [];
  const hasAccess =
    can("mocks.view") &&
    (isAdmin || (projectId && userProjectIds.includes(projectId)));

  const projectDocRef = useMemoDb(() => {
    if (!db || !projectId) return null;
    return doc(db, "projects", projectId);
  }, [db, projectId]);
  const { data: projectData } = useDoc<Project>(projectDocRef);

  const masterObjectsQuery = useMemoDb(
    () => (db && can("master_catalog.view") ? collection(db, "masterObjects") : null),
    [db, can],
  );
  const { data: masterObjects } = useCollection<any>(masterObjectsQuery);

  const mocksQuery = useMemoDb(() => {
    if (!db || !projectId || !user || isProfileLoading || !userProfile) return null;
    if (!hasAccess) return null;
    return collection(db, "projects", projectId, "mocks");
  }, [db, projectId, user, hasAccess, isProfileLoading, userProfile]);

  const { data: mocks, isLoading } = useCollection<Mock>(mocksQuery);

  const migrationObjectsQuery = useMemoDb(() => {
    if (!db || !projectId || !hasAccess || !can("objects.view")) return null;
    return query(collectionGroup(db, "migrationObjects"), where("projectId", "==", projectId));
  }, [db, projectId, hasAccess, can]);

  const { data: allMigrationObjects } = useCollection<any>(migrationObjectsQuery);

  const objectsByMock = useMemo(() => {
    if (!allMigrationObjects) return {};
    const allowedMockIds = new Set(filterActiveMocks(mocks).map((m) => m.id));
    const map: Record<string, any[]> = {};
    for (let i = 0; i < allMigrationObjects.length; i++) {
      const obj = allMigrationObjects[i];
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
    can,
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
