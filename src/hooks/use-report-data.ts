"use client";

import { useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  collectionGroup,
  query,
  where,
  doc,
} from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase";

import { idsForFirestoreIn, SUPERADMIN_UID } from "@/lib/constants";

interface UseReportFiltersReturn {
  selectedProjectId: string;
  selectedMockId: string;
}

export function useReportFilters(): UseReportFiltersReturn {
  const searchParams = useSearchParams();

  return {
    selectedProjectId: searchParams.get("projectId") || "all",
    selectedMockId: searchParams.get("mockId") || "all",
  };
}

interface UseUserProfileReturn {
  userProfile: any;
  isLoading: boolean;
  isAdmin: boolean;
}

export function useUserProfile(): UseUserProfileReturn {
  const db = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(
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
  const db = useFirestore();
  const { user } = useUser();

  const projectsQuery = useMemoFirebase(() => {
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
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectMocksQuery = useMemoFirebase(() => {
    if (!db || selectedProjectId === "all") return null;
    return collection(db, "projects", selectedProjectId, "mocks");
  }, [db, selectedProjectId]);

  const { data: projectMocks } = useCollection<any>(projectMocksQuery);

  useEffect(() => {
    if (
      selectedMockId === "all" &&
      projectMocks &&
      projectMocks.length > 0
    ) {
      const running = projectMocks.find((m) => m.isRunning);
      if (running) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("mockId", running.id);
        router.replace(`/relatorios?${params.toString()}`);
      }
    }
  }, [selectedMockId, projectMocks, searchParams, router]);

  return { projectMocks };
}

interface UseMockDataReturn {
  mockData: any | null;
}

export function useMockData(
  selectedProjectId: string,
  selectedMockId: string,
): UseMockDataReturn {
  const db = useFirestore();

  const mockDocRef = useMemoFirebase(() => {
    if (!db || selectedProjectId === "all" || selectedMockId === "all")
      return null;
    return doc(db, "projects", selectedProjectId, "mocks", selectedMockId);
  }, [db, selectedProjectId, selectedMockId]);

  const { data: mockData } = useDoc<any>(mockDocRef);

  return { mockData };
}

interface UseCatalogueReturn {
  catalogue: any[] | null;
}

export function useCatalogue(): UseCatalogueReturn {
  const db = useFirestore();

  const catalogueQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "catalogo");
  }, [db]);

  const { data: catalogue } = useCollection<any>(catalogueQuery);

  return { catalogue };
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
  const db = useFirestore();

  const objectsQuery = useMemoFirebase(() => {
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
      const projectIds = idsForFirestoreIn(accessibleProjectIds);
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
