import { useMemo } from "react";
import { 
    collection, 
    collectionGroup, 
    query, 
    where, 
    doc, 
    limit,
    type QueryConstraint 
} from "@/supabase/compat-db-shim";
import { 
    useDb, 
    useUser, 
    useCollection, 
    useMemoDb, 
    useDoc 
} from "@/supabase";
import type { 
    Project, 
    UserProfile, 
    Comment, 
    Mock, 
    MigrationObject 
} from "@/types/migration";
import type { MasterObject } from "@/types/master-object";
import type { ActivityGroup } from "@/types/activity-group";
import { idsForDbIn } from "@/lib/constants";
import { filterActiveMocks } from "@/lib/mock-utils";
import { masterObjectsQueryForProject, collectionQueryForProject } from "@/lib/migration/master-objects-query";

export function useDashboardQueries(selectedProjectId: string, selectedMockId: string) {
    const db = useDb();
    const { user, isUserLoading } = useUser();
    const authReady = !!user && !isUserLoading;

    // 1. User Profile
    const userDocRef = useMemoDb(
        () => (user && db ? doc(db, "users", user.uid) : null),
        [db, user],
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const isAdmin =
        userProfile?.isMaster ||
        userProfile?.role?.toLowerCase() === "admin" ||
        userProfile?.role?.toLowerCase() === "master";

    // 2. All Users (for email suggestions)
    const allUsersQuery = useMemoDb(() => (db && isAdmin ? collection(db, "users") : null), [db, isAdmin]);
    const { data: allUsers } = useCollection<UserProfile>(allUsersQuery);

    // 3. Projects
    const projectsQuery = useMemoDb(() => {
        if (!db || !user || isProfileLoading || !userProfile) return null;
        const projectsRef = collection(db, "projects");
        if (isAdmin) return projectsRef;
        return query(
            projectsRef,
            where("memberUids", "array-contains", user.uid),
        );
    }, [db, user, isAdmin, isProfileLoading, userProfile]);

    const { data: projects, isLoading: isProjectsLoading } = useCollection<Project>(projectsQuery);

    const accessibleProjectIds = useMemo(() => {
        if (!projects) return [];
        return projects.map((p) => p.id);
    }, [projects]);

    // 4. Mocks
    const mocksQuery = useMemoDb(() => {
        if (!db || !user || isProfileLoading || !userProfile || isProjectsLoading)
            return null;

        if (selectedProjectId !== "all") {
            return collection(db, "projects", selectedProjectId, "mocks");
        }

        const mocksRef = collectionGroup(db, "mocks");
        if (!isAdmin) {
            const projectIds = idsForDbIn(accessibleProjectIds);
            if (!projectIds) return null;
            return query(mocksRef, where("projectId", "in", projectIds), limit(500));
        }
        return query(mocksRef, limit(500));
    }, [db, user, isProfileLoading, userProfile, isAdmin, accessibleProjectIds, isProjectsLoading, selectedProjectId]);

    const { data: allMocksRaw, isLoading: isMocksLoading } = useCollection<Mock>(mocksQuery);

    const allMocks = useMemo(() => filterActiveMocks(allMocksRaw), [allMocksRaw]);

    const activeMockIds = useMemo(
        () => new Set(allMocks.map((m) => m.id)),
        [allMocks],
    );

    // 5. Migration Objects
    const objectsQuery = useMemoDb(() => {
        if (!db || !user || isProfileLoading || !userProfile || isProjectsLoading)
            return null;

        const objectsRef = collectionGroup(db, "migrationObjects");

        if (selectedProjectId !== "all") {
            const constraints: QueryConstraint[] = [where("projectId", "==", selectedProjectId)];
            if (selectedMockId !== "all") {
                const parseDateMs = (value: unknown): number | null => {
                    if (!value) return null;
                    if (typeof value === "object" && value !== null) {
                        const anyValue = value as any;
                        const seconds = anyValue.seconds ?? anyValue._seconds;
                        if (typeof seconds === "number" && Number.isFinite(seconds)) {
                            return seconds * 1000;
                        }
                    }
                    const raw = String(value).trim();
                    // Formato BR comum: dd/MM/yyyy (com ou sem hora)
                    const brMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/);
                    if (brMatch) {
                        const day = Number(brMatch[1]);
                        const month = Number(brMatch[2]);
                        const year = Number(brMatch[3]);
                        const hour = Number(brMatch[4] || 0);
                        const minute = Number(brMatch[5] || 0);
                        const second = Number(brMatch[6] || 0);
                        const ms = new Date(year, month - 1, day, hour, minute, second).getTime();
                        if (Number.isFinite(ms)) return ms;
                    }
                    const ms = new Date(raw).getTime();
                    return Number.isFinite(ms) ? ms : null;
                };

                const currentMock = allMocks?.find((m) => m.id === selectedMockId);
                const sameProjectMocks = allMocks?.filter((m) => m.projectId === selectedProjectId && m.id !== selectedMockId) || [];

                let previousMockId: string | null = null;
                if (currentMock && sameProjectMocks.length > 0) {
                    const currentStartMs = parseDateMs(currentMock.startDate);
                    if (currentStartMs !== null) {
                        const olderByDate = sameProjectMocks
                            .map((m) => ({ id: m.id, startMs: parseDateMs(m.startDate) }))
                            .filter((m): m is { id: string; startMs: number } => m.startMs !== null && m.startMs < currentStartMs)
                            .sort((a, b) => b.startMs - a.startMs);
                        if (olderByDate.length > 0) previousMockId = olderByDate[0].id;
                    }
                }

                const mockIds = idsForDbIn(
                    previousMockId ? [selectedMockId, previousMockId] : [selectedMockId],
                );
                if (mockIds) constraints.push(where("mockId", "in", mockIds));
            } else {
                constraints.push(limit(500));
            }
            return query(objectsRef, ...constraints);
        }

        if (!isAdmin) {
            const projectIds = idsForDbIn(accessibleProjectIds, 10);
            if (!projectIds) return null;
            return query(objectsRef, where("projectId", "in", projectIds), limit(500));
        }
        return query(objectsRef, limit(500));
    }, [db, user, isProfileLoading, userProfile, isAdmin, accessibleProjectIds, isProjectsLoading, selectedProjectId, selectedMockId, allMocks]);

    const { data: objectsRaw, isLoading: isObjectsLoading } = useCollection<MigrationObject>(objectsQuery);

    const objects = useMemo(() => {
        if (!objectsRaw) return undefined;
        return objectsRaw.filter((obj) => obj.mockId && activeMockIds.has(obj.mockId));
    }, [objectsRaw, activeMockIds]);

    // 6. Comments
    const allCommentsQuery = useMemoDb(() => {
        if (!db || !authReady || isProfileLoading || !userProfile) return null;
        const constraints: QueryConstraint[] = [];
        if (selectedProjectId !== "all") {
            constraints.push(where("projectId", "==", selectedProjectId));
        } else if (isAdmin) {
            // All
        } else {
            const projectIds = idsForDbIn(accessibleProjectIds);
            if (projectIds) constraints.push(where("projectId", "in", projectIds));
            else return null;
        }
        return query(collectionGroup(db, "comments"), ...constraints, limit(500));
    }, [db, authReady, isAdmin, accessibleProjectIds, isProfileLoading, userProfile, selectedProjectId, selectedMockId]);

    const { data: allCommentsRaw } = useCollection<Comment>(allCommentsQuery);

    const allComments = useMemo(() => {
        if (!allCommentsRaw) return undefined;
        if (selectedMockId === "all" || !objects?.length) return allCommentsRaw;
        const objectIds = new Set(objects.map((obj) => obj.id));
        return allCommentsRaw.filter(
            (comment) => comment.objectId && objectIds.has(comment.objectId),
        );
    }, [allCommentsRaw, objects, selectedMockId]);

    // 7. Master Objects & Activity Groups (escopo do projeto selecionado)
    const masterObjectsQuery = useMemoDb(() => {
        if (!db || !authReady) return null;
        if (selectedProjectId !== "all") {
            return masterObjectsQueryForProject(db, selectedProjectId);
        }
        if (!isAdmin) {
            const projectIds = idsForDbIn(accessibleProjectIds);
            if (!projectIds) return null;
            return query(collection(db, "masterObjects"), where("projectId", "in", projectIds));
        }
        return collection(db, "masterObjects");
    }, [db, authReady, selectedProjectId, isAdmin, accessibleProjectIds]);

    const { data: masterObjects } = useCollection<MasterObject>(masterObjectsQuery);

    const activityGroupsQuery = useMemoDb(() => {
        if (!db || !authReady) return null;
        if (selectedProjectId !== "all") {
            return collectionQueryForProject(db, "activityGroups", selectedProjectId);
        }
        if (!isAdmin) {
            const projectIds = idsForDbIn(accessibleProjectIds);
            if (!projectIds) return null;
            return query(collection(db, "activityGroups"), where("projectId", "in", projectIds));
        }
        return collection(db, "activityGroups");
    }, [db, authReady, selectedProjectId, isAdmin, accessibleProjectIds]);
    const { data: activityGroups } = useCollection<ActivityGroup>(activityGroupsQuery);

    return {
        db,
        user,
        userProfile,
        isAdmin,
        allUsers,
        projects,
        allMocks,
        objects,
        allComments,
        masterObjects,
        activityGroups: activityGroups || [],
        accessibleProjectIds,
        isLoading: isProfileLoading || isProjectsLoading || isMocksLoading || isObjectsLoading,
        isProfileLoading // Needed for some logic
    };
}
