"use client";

import { useMemo, useEffect } from "react";
import {
  collection,
  collectionGroup,
  query,
  where,
  doc,
} from "@/supabase/compat-db-shim";
import { useDb, useUser, useCollection, useMemoDb, useDoc } from "@/supabase";
import { useActiveProjectId } from "@/hooks/use-active-project-id";
import { useSessionStorageState } from "@/hooks/use-session-storage-state";
import { SESSION_KEYS, idsForDbIn, SUPERADMIN_UID } from "@/lib/constants";
import { filterActiveMocks } from "@/lib/mock-utils";

interface UseReportFiltersReturn {
  selectedProjectId: string;
  selectedMockId: string;
  setSelectedProjectId: (id: string) => void;
  setSelectedMockId: (id: string) => void;
}

export function useReportFilters(): UseReportFiltersReturn {
  const { projectId, updateActiveProject } = useActiveProjectId();
  const [selectedMockId, setSelectedMockId] = useSessionStorageState<string>(
    SESSION_KEYS.REPORT_MOCK,
    "all",
  );

  const selectedProjectId = projectId ?? "all";

  const setSelectedProjectId = (id: string) => {
    updateActiveProject(id === "all" ? null : id);
    setSelectedMockId("all");
  };

  return {
    selectedProjectId,
    selectedMockId,
    setSelectedProjectId,
    setSelectedMockId,
  };
}

interface UseUserProfileReturn {
  userProfile: any;
  isLoading: boolean;
  isAdmin: boolean;
}

export function useUserProfile(): UseUserProfileReturn {
  const db = useDb();
  const { user } = useUser();

  const userDocRef = useMemoDb(
    () => (user && db ? doc(db, "users", user.uid) : null),
    [db, user],
  );

  const { data: userProfile, isLoading } = useDoc<any>(userDocRef);

  const isAdmin = !isLoading && (
    userProfile?.role === "admin" ||
    user?.uid === SUPERADMIN_UID
  );

  return { userProfile, isLoading, isAdmin };
}

interface UseProjectsReturn {
  projects: any[] | null;
  isLoading: boolean;
  accessibleProjectIds: string[];
}

export function useProjects(isAdmin: boolean, isLoadingProfile: boolean): UseProjectsReturn {
  const db = useDb();
  const { user } = useUser();

  const projectsQuery = useMemoDb(() => {
    if (!db || !user || isLoadingProfile) return null;
    return isAdmin
      ? collection(db, "projects")
      : query(
        collection(db, "projects"),
        where("memberUids", "array-contains", user.uid),
      );
  }, [db, user, isAdmin, isLoadingProfile]);

  const { data: projects, isLoading } = useCollection<any>(projectsQuery);

  const accessibleProjectIds = useMemo(
    () => projects?.map((p) => p.id) || [],
    [projects],
  );

  return { projects, isLoading, accessibleProjectIds };
}

interface UseRunningMockReturn {
  projectMocks: any[] | null;
}

export function useRunningMock(
  selectedProjectId: string,
  selectedMockId: string,
): UseRunningMockReturn {
  const db = useDb();
  const [, setStoredMockId] = useSessionStorageState<string>(SESSION_KEYS.REPORT_MOCK, "all");

  const projectMocksQuery = useMemoDb(() => {
    if (!db || selectedProjectId === "all") return null;
    return collection(db, "projects", selectedProjectId, "mocks");
  }, [db, selectedProjectId]);

  const { data: projectMocksRaw } = useCollection<any>(projectMocksQuery);

  const projectMocks = useMemo(() => filterActiveMocks(projectMocksRaw), [projectMocksRaw]);

  useEffect(() => {
    if (
      selectedMockId === "all" &&
      projectMocks &&
      projectMocks.length > 0
    ) {
      const running = projectMocks.find((m) => m.isRunning);
      if (running) {
        setStoredMockId(running.id);
      }
    }
  }, [selectedMockId, projectMocks, setStoredMockId]);

  return { projectMocks };
}

interface UseMockDataReturn {
  mockData: any | null;
}

export function useMockData(
  selectedProjectId: string,
  selectedMockId: string,
): UseMockDataReturn {
  const db = useDb();

  const mockDocRef = useMemoDb(() => {
    if (!db || selectedProjectId === "all" || selectedMockId === "all")
      return null;
    return doc(db, "projects", selectedProjectId, "mocks", selectedMockId);
  }, [db, selectedProjectId, selectedMockId]);

  const { data: mockData } = useDoc<any>(mockDocRef);

  return { mockData };
}

interface UseMasterCatalogReturn {
  masterCatalog: any[] | null;
}

export function useMasterCatalog(): UseMasterCatalogReturn {
  const db = useDb();

  const masterCatalogQuery = useMemoDb(() => {
    if (!db) return null;
    return collection(db, "masterObjects");
  }, [db]);

  const { data: masterCatalog } = useCollection<any>(masterCatalogQuery);

  return { masterCatalog };
}

interface UseMigrationObjectsReturn {
  objects: any[] | null;
  isLoading: boolean;
}

export function useMigrationObjects(
  selectedProjectId: string,
  selectedMockId: string,
  isAdmin: boolean,
  accessibleProjectIds: string[],
  isProfileLoading: boolean,
  isProjectsLoading: boolean,
): UseMigrationObjectsReturn {
  const db = useDb();

  const objectsQuery = useMemoDb(() => {
    if (!db || isProfileLoading || isProjectsLoading) return null;

    if (selectedProjectId !== "all" && selectedMockId !== "all") {
      return collection(
        db,
        "projects",
        selectedProjectId,
        "mocks",
        selectedMockId,
        "migrationObjects",
      );
    }

    const constraints: any[] = [];
    if (selectedProjectId !== "all") {
      constraints.push(where("projectId", "==", selectedProjectId));
    } else if (!isAdmin) {
      const projectIds = idsForDbIn(accessibleProjectIds);
      if (!projectIds) return null;
      constraints.push(where("projectId", "in", projectIds));
    }
    if (selectedMockId !== "all") {
      constraints.push(where("mockId", "==", selectedMockId));
    }
    return query(collectionGroup(db, "migrationObjects"), ...constraints);
  }, [
    db,
    isAdmin,
    accessibleProjectIds,
    isProfileLoading,
    isProjectsLoading,
    selectedProjectId,
    selectedMockId,
  ]);

  const { data: objects, isLoading } = useCollection<any>(objectsQuery);

  return { objects, isLoading };
}
