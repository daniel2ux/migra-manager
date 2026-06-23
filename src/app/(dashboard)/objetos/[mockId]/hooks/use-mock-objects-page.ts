'use client';

import { useDeferredValue, useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelection } from '@/context/selection-context';
import { useActiveProjectId } from '@/hooks/use-active-project-id';
import {
  useCollection,
  useDoc,
  useDb,
  useMemoDb,
  useUser,
} from '@/supabase';
import {
  collection,
  collectionGroup,
  doc,
  query,
  where,
} from '@/supabase/compat-db-shim';
import { useToast } from '@/hooks/use-toast';
import { buildLogExportMeta } from '@/lib/export/log-export-meta';
import {
  resolveMasterObject,
} from '@/lib/dashboard/object-filters';
import {
  masterObjectsQueryForProject,
} from '@/lib/migration/master-objects-query';
import { getProjectCompanyName } from '@/lib/migration/project-company';
import { SUPERADMIN_UID } from '@/lib/constants';
import { isEffectiveLocked as isMockEffectiveLocked, isMockInactive, isMigrationObjectActive } from '@/lib/mock-utils';
import {
  buildGestaoDisplayOrderIndex,
  buildGestaoPageDisplayList,
  buildUsageMapFromMigrations,
  sortByGestaoDisplayOrder,
} from '@/lib/migration/gestao-sequence';
import type { Mock, UserProfile } from '@/types/migration';
import type { MasterObject, MigrationComment, MigrationObject } from '../types';

export function useMockObjectsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { selectedMockId, selectedProjectId: selectionProjectId } = useSelection();
  const { projectId: activeProjectId } = useActiveProjectId();
  const db = useDb();
  const { user } = useUser();

  const isMasked = params.mockId === 'gestao';
  const projectId = isMasked ? selectionProjectId : activeProjectId;
  const routeMockId = isMasked ? selectedMockId : (params.mockId as string);

  const projectDocRef = useMemoDb(
    () => (projectId && db ? doc(db, 'projects', projectId) : null),
    [db, projectId],
  );
  const { data: projectData } = useDoc<any>(projectDocRef);

  const userDocRef = useMemoDb(
    () => (user && db ? doc(db, 'users', user.uid) : null),
    [db, user],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  const isAdminOrMaster = useMemo(() => {
    if (!userProfile) return false;
    const role = (userProfile.role || '').toLowerCase();
    return (
      role === 'admin' ||
      role === 'master' ||
      userProfile.isMaster === true ||
      user?.uid === SUPERADMIN_UID
    );
  }, [userProfile, user?.uid]);
  const isAdmin = isAdminOrMaster;

  const masterObjectsQuery = useMemoDb(
    () => (db && projectId ? masterObjectsQueryForProject(db, projectId) : null),
    [db, projectId],
  );
  const { data: projectMasterObjects, isLoading: isProjectMasterLoading, refetch: refetchProjectMasterObjects } =
    useCollection<MasterObject>(masterObjectsQuery);
  const masterObjects = useMemo(
    () => (projectMasterObjects ?? []) as MasterObject[],
    [projectMasterObjects],
  );
  const isMasterObjectsLoading = isProjectMasterLoading;

  const refetchMasterObjects = useCallback(() => {
    refetchProjectMasterObjects();
  }, [refetchProjectMasterObjects]);

  const directMockRef = useMemoDb(() => {
    if (!db || !projectId || !routeMockId) return null;
    return doc(db, 'projects', projectId, 'mocks', routeMockId);
  }, [db, projectId, routeMockId]);
  const { data: mockFromId, isLoading: isIdLoading } = useDoc<Mock>(directMockRef);

  const slugQuery = useMemoDb(() => {
    if (!db || !projectId || !routeMockId || isMasked || mockFromId) return null;
    return query(collection(db, 'projects', projectId, 'mocks'), where('slug', '==', routeMockId));
  }, [db, projectId, routeMockId, isMasked, mockFromId]);
  const { data: mocksFromSlug, isLoading: isSlugLoading } = useCollection<Mock>(slugQuery);

  const mockData = mockFromId || (mocksFromSlug && mocksFromSlug.length > 0 ? mocksFromSlug[0] : null);
  const mockId = mockData?.id || (isIdLoading || isSlugLoading ? null : routeMockId);
  const isMockLoading = isIdLoading || isSlugLoading;
  const isMockLocked = !!mockData?.isLocked || mockData?.status === 'BLOQUEADO';
  const isProjectLocked = !!projectData?.isLocked;
  const isEffectiveLocked = mockData
    ? isMockEffectiveLocked(mockData, isProjectLocked)
    : isProjectLocked;

  const companyName = getProjectCompanyName(projectData);
  const headerEmpresa = companyName ?? projectData?.name;
  const headerProjectName = companyName ? projectData?.name : undefined;
  const headerMockName = mockData?.name;

  const objectsQuery = useMemoDb(() => {
    if (!db || !projectId || !mockId || !user) return null;
    return collection(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects');
  }, [db, projectId, mockId, user]);
  const { data: objects, isLoading, refetch: refetchObjects } = useCollection<MigrationObject>(objectsQuery);

  const [pendingObjects, setPendingObjects] = useState<MigrationObject[]>([]);
  /** Overrides otimistas até o realtime confirmar isActive do banco. */
  const [objectActiveOverrides, setObjectActiveOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!objects?.length) return;
    setObjectActiveOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const obj of objects) {
        if (!(obj.id in next)) continue;
        const dbActive = obj.isActive !== false && (obj as { is_active?: boolean }).is_active !== false;
        if (next[obj.id] === dbActive) {
          delete next[obj.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [objects]);

  const applyObjectActiveState = useCallback(
    (obj: MigrationObject): MigrationObject => {
      if (!(obj.id in objectActiveOverrides)) return obj;
      return { ...obj, isActive: objectActiveOverrides[obj.id] };
    },
    [objectActiveOverrides],
  );

  const setObjectActiveState = useCallback((objectId: string, isActive: boolean) => {
    setObjectActiveOverrides((prev) => ({ ...prev, [objectId]: isActive }));
  }, []);

  useEffect(() => {
    if (!objects?.length) return;
    setPendingObjects((prev) =>
      prev.filter(
        (pending) =>
          !objects.some(
            (stored) =>
              stored.id === pending.id ||
              (!!pending.masterObjectId &&
                pending.masterObjectId === stored.masterObjectId),
          ),
      ),
    );
  }, [objects]);

  const mergedObjects = useMemo(() => {
    const stored = objects ?? [];
    const storedIds = new Set(stored.map((o) => o.id));
    const storedMasterIds = new Set(
      stored.map((o) => o.masterObjectId).filter((id): id is string => !!id),
    );
    const extra = pendingObjects.filter(
      (pending) =>
        !storedIds.has(pending.id) &&
        (!pending.masterObjectId || !storedMasterIds.has(pending.masterObjectId)),
    );
    return [...stored, ...extra].map(applyObjectActiveState);
  }, [objects, pendingObjects, applyObjectActiveState]);

  const addPendingObjects = useCallback((items: MigrationObject[]) => {
    if (!items.length) return;
    setPendingObjects((prev) => {
      const seenIds = new Set(prev.map((o) => o.id));
      const seenMasterIds = new Set(
        prev.map((o) => o.masterObjectId).filter((id): id is string => !!id),
      );
      const next = items.filter(
        (item) =>
          !seenIds.has(item.id) &&
          (!item.masterObjectId || !seenMasterIds.has(item.masterObjectId)),
      );
      return next.length ? [...prev, ...next] : prev;
    });
  }, []);

  useEffect(() => {
    if (!mockData || isMockLoading) return;
    if (isMockInactive(mockData)) {
      toast({
        variant: 'destructive',
        description: 'Esta mock está inativa e não pode ser acessada.',
      });
      router.push('/mocks');
    }
  }, [mockData, isMockLoading, router, toast]);

  useEffect(() => {
    if (isMasked && !mockId && !isMockLoading && !isLoading) {
      router.push('/mocks');
    }
  }, [isMasked, mockId, isMockLoading, isLoading, router]);

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; obj: MigrationObject } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [showPerformanceTable, setShowPerformanceTable] = useState(false);
  const [logImportSingleId, setLogImportSingleId] = useState<string | null>(null);
  const [logViewerObject, setLogViewerObject] = useState<{
    name: string;
    errorCount: number;
    migrador: string;
    dataMigr: string;
    hrExecMig: string;
    empresa: string;
  } | null>(null);
  const [isLogImportOpen, setIsLogImportOpen] = useState(false);

  const openLogViewer = (obj: MigrationObject) => {
    const meta = buildLogExportMeta({
      migradorName: userProfile?.migradorName ?? userProfile?.name,
      chargeStartTime: obj.chargeStartTime ?? null,
      empresa: projectData?.empresa || projectData?.name,
    });
    setLogViewerObject({
      name: obj.name,
      errorCount: Number(obj.errorRecordsCount) || 0,
      ...meta,
    });
  };

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [ctxMenu]);

  const allCommentsQuery = useMemoDb(() => {
    if (!db || !projectId || !mockId) return null;
    return query(
      collectionGroup(db, 'comments'),
      where('projectId', '==', projectId),
      where('mockId', '==', mockId),
    );
  }, [db, projectId, mockId]);
  const { data: allCommentsInMock } = useCollection<MigrationComment>(allCommentsQuery);

  const commentsMap = useMemo(() => {
    const map: Record<string, MigrationComment[]> = {};
    if (!allCommentsInMock) return map;
    allCommentsInMock.forEach((c) => {
      const oid = c.objectId || c.__path?.split('/')[5];
      if (oid) {
        if (!map[oid]) map[oid] = [];
        map[oid].push(c);
      }
    });
    return map;
  }, [allCommentsInMock]);

  const masterObjectsById = useMemo(
    () => new Map(masterObjects?.map((m) => [m.id, m]) ?? []),
    [masterObjects],
  );
  const masterObjectsByName = useMemo(
    () => new Map(masterObjects?.map((m) => [m.name, m]) ?? []),
    [masterObjects],
  );
  const scopedMasterByName = useMemo(() => {
    const map = new Map<string, MasterObject>();
    mergedObjects.forEach((o) => {
      const masterId = String(o.masterObjectId || '');
      if (!masterId) return;
      const master = masterObjectsById.get(masterId);
      if (!master) return;
      if (!map.has(o.name)) map.set(o.name, master);
    });
    return map;
  }, [mergedObjects, masterObjectsById]);
  const masterLookupMaps = useMemo(
    () => ({
      byId: masterObjectsById,
      byName: masterObjectsByName,
      scopedByName: scopedMasterByName,
    }),
    [masterObjectsById, masterObjectsByName, scopedMasterByName],
  );

  const usageMap = useMemo(
    () => buildUsageMapFromMigrations(mergedObjects),
    [mergedObjects],
  );

  const gestaoDisplayOrderIndex = useMemo(() => {
    if (!projectId || !mockId || !masterObjects?.length) return new Map<string, number>();
    return buildGestaoDisplayOrderIndex(
      buildGestaoPageDisplayList({
        masters: masterObjects,
        migrationsInSelectedMock: objects ?? null,
        isAdmin: !!isAdmin,
        selectedProjectId: projectId,
        selectedMockId: mockId,
        usageMap,
      }),
    );
  }, [masterObjects, objects, isAdmin, projectId, mockId, usageMap]);

  const sortedObjects = useMemo(() => {
    if (!mergedObjects.length) return [];

    const enriched = mergedObjects.map((obj) => {
        const master = resolveMasterObject(obj, masterLookupMaps);
        return {
          ...obj,
          displayGroup: master?.chargeGroup || obj.chargeGroup || 'G',
          displayOrder: obj.chargeOrder ?? master?.chargeOrder ?? '',
          displayIsParallel: master?.isParallel ?? obj.isParallel ?? false,
          displayDependencies: master?.dependencyIds || obj.dependencyIds || [],
          displayMasterStatus: (master?.status || 'ATIVO').toString().trim().toUpperCase(),
        };
      });

    const filtered = enriched.filter((o) => {
        const matchesSearch =
          (o.name || '').toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
          (o.displayGroup && o.displayGroup.toLowerCase().includes(deferredSearchTerm.toLowerCase())) ||
          (o.description || '').toLowerCase().includes(deferredSearchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (performanceFilter === 'all') return true;
        const processed = Number(o.processedRecordsCount) || 0;
        const error = Number(o.errorRecordsCount) || 0;
        const success = Math.max(0, processed - error);
        const pct = processed > 0 ? (success / processed) * 100 : 0;
        if (performanceFilter === 'green') return pct === 100;
        if (performanceFilter === 'yellow') return pct >= 50 && pct < 100;
        if (performanceFilter === 'red') return pct < 50;
        return true;
      });

    const toSortFields = (o: (typeof enriched)[number]) => ({
      ...o,
      chargeGroup: o.displayGroup,
      chargeOrder: o.displayOrder,
    });

    const active = filtered.filter((o) => isMigrationObjectActive(o));
    const inactive = filtered.filter((o) => !isMigrationObjectActive(o));

    return [
      ...sortByGestaoDisplayOrder(active.map(toSortFields), gestaoDisplayOrderIndex),
      ...sortByGestaoDisplayOrder(inactive.map(toSortFields), gestaoDisplayOrderIndex),
    ];
  }, [
    mergedObjects,
    masterLookupMaps,
    deferredSearchTerm,
    performanceFilter,
    gestaoDisplayOrderIndex,
  ]);

  const totals = useMemo(() => {
    if (!sortedObjects) return { target: 0, processed: 0, success: 0, error: 0 };
    return sortedObjects.reduce(
      (acc, obj) => {
        if (!isMigrationObjectActive(obj)) return acc;
        const t = Number(obj.targetRecordsCount) || 0;
        const p = Number(obj.processedRecordsCount) || 0;
        const e = Number(obj.errorRecordsCount) || 0;
        const s = Math.max(0, p - e);
        return {
          target: acc.target + t,
          processed: acc.processed + p,
          success: acc.success + s,
          error: acc.error + e,
        };
      },
      { target: 0, processed: 0, success: 0, error: 0 },
    );
  }, [sortedObjects]);

  return {
    db,
    user,
    router,
    toast,
    isMasked,
    projectId,
    mockId,
    projectData,
    userProfile,
    isProfileLoading,
    isAdmin,
    isAdminOrMaster,
    masterObjects,
    isMasterObjectsLoading,
    refetchMasterObjects,
    mockData,
    objects,
    mergedObjects,
    addPendingObjects,
    refetchObjects,
    setObjectActiveState,
    isLoading,
    isMockLoading,
    isMockLocked,
    isEffectiveLocked,
    headerEmpresa,
    headerProjectName,
    headerMockName,
    ctxMenu,
    setCtxMenu,
    searchTerm,
    setSearchTerm,
    performanceFilter,
    setPerformanceFilter,
    showPerformanceTable,
    setShowPerformanceTable,
    logImportSingleId,
    setLogImportSingleId,
    logViewerObject,
    setLogViewerObject,
    isLogImportOpen,
    setIsLogImportOpen,
    openLogViewer,
    commentsMap,
    sortedObjects,
    totals,
  };
}
