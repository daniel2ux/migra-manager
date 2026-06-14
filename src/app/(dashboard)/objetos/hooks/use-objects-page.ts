"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useMemoDb, useCollection, useDb, useUser, useDoc } from '@/supabase';
import { collection, doc, collectionGroup, query, where, getDocs, orderBy, serverTimestamp, updateDoc, type CompatDb } from '@/supabase/compat-db-shim';
import type { User } from '@/supabase/auth-shim';
import type { MigrationObject, UserProfile } from '@/types/migration';
import { useToast } from '@/hooks/use-toast';
import { useObjectForm } from '@/hooks/use-object-form';
import { useEditLock } from '@/hooks/use-edit-lock';
import {
  parseSequence,
  formatSequence,
  isValidSequence,
  compareGestaoExecutionOrder,
  buildListPositionChargeOrderMap,
} from '@/lib/migration/sequence-utils';
import { buildPrecedenceMap } from '@/lib/migration/dependency-utils';
import type { MasterObject } from '@/types/master-object';
import type { ActivityGroup } from '@/types/activity-group';
import type { ChargeGroup } from '@/types/charge-group';
import {
  buildConfiguredChargeGroupByObjectId,
  getConfiguredChargeGroupForObject,
} from '@/lib/migration/charge-group-sync';
import { useActiveProjectId } from '@/hooks/use-active-project-id';
import { SUPERADMIN_UID, idsForDbIn } from '@/lib/constants';
import { normalizeMasterCatalogName } from '@/lib/migration/master-catalog';
import {
  buildMasterCatalogExportPayload,
  downloadJsonFile,
  suggestMasterCatalogExportFilename,
} from '@/lib/migration/master-catalog-export';
import { projectAllowsMasterObjectRegistration } from '@/lib/migration/company-sync';
import { masterObjectsQueryForProject } from '@/lib/migration/master-objects-query';
import { getProjectCompanyName } from '@/lib/migration/project-company';
import { computeSuggestedNextChargeOrder } from '@/lib/migration/master-catalog-charge-reflow';
import { buildGestaoRowsFromMockMigrations } from '@/lib/migration/gestao-sequence';
import { useObjectsMockSync } from './use-objects-mock-sync';
import { useObjectsImport } from './use-objects-import';
import {
  useObjectsReorder,
  type CatalogSequenceStore,
} from './use-objects-reorder';
import { useObjectsCRUD } from './use-objects-crud';

interface Project {
  id: string;
  name: string;
  company?: string;
  empresa?: string;
  companyId?: string | null;
}

function _defaultExtractChargeOrderDisplay(chargeOrder: string | number | undefined): string {
  if (chargeOrder === undefined || chargeOrder === null) return '';
  const { major, minor } = parseSequence(chargeOrder);
  return major > 0 ? formatSequence(major, minor) : '';
}

// ── Sub-hook: User profile & auth ─────────────────────────────────────────

function useObjectsAuth(db: CompatDb | null) {
  const { user } = useUser();
  const currentUserRef = useMemoDb(() => user ? doc(db!, 'users', user.uid) : null, [db, user]);
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(currentUserRef);
  const role = (currentUserProfile?.role || '').toLowerCase();
  const isAdminOrMaster = !isProfileLoading && (
    role === 'admin' ||
    role === 'master' ||
    currentUserProfile?.isMaster === true ||
    user?.uid === SUPERADMIN_UID
  );
  const isAdmin = isAdminOrMaster;
  return { user, currentUserProfile, isProfileLoading, isAdmin, isAdminOrMaster };
}

// ── Sub-hook: queries Supabase ────────────────────────────────────────────

function useObjectsQueries(
  db: CompatDb | null,
  user: User | null,
  isAdmin: boolean,
  isProfileLoading: boolean,
  hasUserProfile: boolean,
  /** Projeto atual na URL/contexto (`null`/`all` → não restringir por igualdade aqui). */
  scopedProjectId: string | null,
) {
  const scoped =
    scopedProjectId && scopedProjectId !== 'all'
      ? scopedProjectId
      : null;

  const objectsQuery = useMemoDb(() => {
    if (!db || !user || isProfileLoading) return null;
    if (scoped) return masterObjectsQueryForProject(db, scoped);
    return collection(db, 'masterObjects');
  }, [db, user, isProfileLoading, scoped]);
  const { data: objects, isLoading, refetch: refetchObjects } = useCollection<MasterObject>(objectsQuery);

  const projectsQuery = useMemoDb(() => {
    if (!db || !user || isProfileLoading || !hasUserProfile) return null;
    const ref = collection(db, 'projects');
    if (isAdmin) return ref;
    return query(ref, where('memberUids', 'array-contains', user.uid));
  }, [db, user, isAdmin, isProfileLoading, hasUserProfile]);
  const { data: allProjects } = useCollection<Project>(projectsQuery);

  /** Até 30 IDs para uso em `where('projectId', 'in', …)` só quando não há projeto escopo. */
  const accessibleProjectIds = useMemo(
    () => (allProjects?.map((p) => p.id) ?? []).slice(0, 30),
    [allProjects],
  );

  const migrationObjectsQuery = useMemoDb(() => {
    if (!db || !user || isProfileLoading || !hasUserProfile) return null;
    const ref = collectionGroup(db, 'migrationObjects');
    if (isAdmin) return ref;
    // Projeto específico: igualdade (não depende do subset `in`; evita lista vazia se o projeto atual não está entre os primeiros 30 memberships).
    if (scoped) {
      return query(ref, where('projectId', '==', scoped));
    }
    const projectIds = idsForDbIn(accessibleProjectIds);
    if (!projectIds) return null;
    return query(ref, where('projectId', 'in', projectIds));
  }, [db, user, isAdmin, isProfileLoading, hasUserProfile, scoped, accessibleProjectIds]);
  const { data: allMigrationObjects, isLoading: isMigrationObjectsLoading } =
    useCollection<MigrationObject>(migrationObjectsQuery);

  return { objects, isLoading, refetchObjects, allProjects, allMigrationObjects, isMigrationObjectsLoading };
}

/** Nomes normalizados que aparecem em mais de um documento em `masterObjects` (catálogo). */
function computeDuplicateMasterNameKeys(objects: MasterObject[] | null | undefined): Set<string> {
  if (!objects?.length) return new Set();
  const counts = new Map<string, number>();
  for (const o of objects) {
    const k = normalizeMasterCatalogName(o.name);
    if (!k) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
}

/** Lista mestres utilizados neste projeto (e opcionalmente mock); sem filtros de busca/status. */
function filterMastersByProjectMockUsage(
  objects: MasterObject[] | null | undefined,
  selectedProjectId: string | null,
  selectedMockId: string | null,
  usageMap: Record<string, Set<string>>,
): MasterObject[] {
  if (!objects?.length) return [];
  return objects.filter((obj) => {
    if (!selectedProjectId) return true;
    const usage = usageMap[obj.id];
    if (!usage?.size) return false;
    if (selectedMockId) return usage.has(`${selectedProjectId}:${selectedMockId}`);
    return [...usage].some((e) => e.startsWith(`${selectedProjectId}:`));
  });
}

/** Sobrepõe campos vindos dos `migrationObjects` quando o escopo vem só do projeto. */
function mergeMockSequencesOntoScopedMasters(
  mastersInScope: MasterObject[],
  migrations: MigrationObject[] | null | undefined,
  applyMerge: boolean,
  opts?: { overlayChargeSequence?: boolean },
): MasterObject[] {
  if (!applyMerge || !migrations?.length) return mastersInScope;
  const overlayChargeSequence = opts?.overlayChargeSequence ?? true;
  const byMasterId = new Map<string, MigrationObject>();
  for (const m of migrations) {
    if (m.masterObjectId) byMasterId.set(m.masterObjectId, m);
  }
  return mastersInScope.map((mast) => {
    const mig = byMasterId.get(mast.id);
    if (!mig) return { ...mast };
    return {
      ...mast,
      ...(overlayChargeSequence
        ? {
            chargeGroup: mig.chargeGroup ?? mast.chargeGroup,
            chargeOrder: mig.chargeOrder ?? mast.chargeOrder,
            parallelOrder: mig.parallelOrder ?? mast.parallelOrder,
            isParallel: mig.isParallel ?? mast.isParallel,
          }
        : {}),
      dependencyIds: mig.dependencyIds ?? mast.dependencyIds,
      _migrationDocId: mig.id,
    };
  });
}

function filterMastersByDisplayFilters(
  rows: MasterObject[],
  searchTerm: string,
  statusFilter: string,
  activityGroupFilter: string,
  configuredChargeGroupById: ReadonlyMap<string, string>,
): MasterObject[] {
  return rows.filter((obj) => {
    const configuredGroup = getConfiguredChargeGroupForObject(obj.id, configuredChargeGroupById);
    const matchesSearch =
      obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (obj.description ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      Boolean(configuredGroup && configuredGroup.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL' && obj.status !== statusFilter) return false;
    if (activityGroupFilter !== 'ALL' && !(obj.activityGroupIds ?? []).includes(activityGroupFilter))
      return false;
    return true;
  });
}

function sortMastersGestao(rows: MasterObject[], sortMode: string): MasterObject[] {
  return [...rows].sort((a, b) => {
    if (sortMode === 'EXECUTION') {
      return compareGestaoExecutionOrder(a, b);
    }
    const aInactive = a.status === 'INATIVO';
    const bInactive = b.status === 'INATIVO';
    if (aInactive && !bInactive) return 1;
    if (!aInactive && bInactive) return -1;
    if (sortMode === 'ALPHABETICAL') return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (sortMode === 'UPDATED') {
      const dateA =
        a.updatedAt instanceof Date ? a.updatedAt : (a.updatedAt as any)?.toDate?.() || new Date(0);
      const dateB =
        b.updatedAt instanceof Date ? b.updatedAt : (b.updatedAt as any)?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    }
    return 0;
  });
}

// ── Sub-hook: Dialog effects ──────────────────────────────────────────────

function useDialogEffects(anyDialogOpen: boolean, selectedCardId: string | null, isPrecedenceOpen: boolean, setIsPrecedenceOpen: (v: boolean) => void) {
  const prevRef = useRef(false);
  useEffect(() => {
    if (!anyDialogOpen && prevRef.current && selectedCardId) {
      setTimeout(() => { const el = document.getElementById(`obj-card-${selectedCardId}`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.focus({ preventScroll: true }); }, 100);
    }
    prevRef.current = anyDialogOpen;
  }, [anyDialogOpen, selectedCardId]);

  useEffect(() => {
    if (!isPrecedenceOpen) return;
    history.pushState({ explorador: true }, '');
    const h = () => setIsPrecedenceOpen(false);
    window.addEventListener('popstate', h);
    return () => window.removeEventListener('popstate', h);
  }, [isPrecedenceOpen, setIsPrecedenceOpen]);
}

// ── Hook principal composto ───────────────────────────────────────────────

export function useObjectsPage() {
  const extractChargeOrderDisplay = _defaultExtractChargeOrderDisplay;
  const db = useDb();
  const { toast } = useToast();
  const { projectId: activeProjectId } = useActiveProjectId();
  const selectedProjectId = activeProjectId;

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const depSearch1Ref = useRef<HTMLInputElement>(null);
  const depSearch2Ref = useRef<HTMLInputElement>(null);
  const depSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const depTriggerRef = useRef<HTMLElement | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode] = useState<'EXECUTION' | 'ALPHABETICAL' | 'UPDATED'>('EXECUTION');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVO' | 'INATIVO' | 'LEGACY'>('ALL');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [chargeGroups, setChargeGroups] = useState<ChargeGroup[]>([]);
  const [activityGroupFilter, setActivityGroupFilter] = useState<string>('ALL');

  // Dialog state
  const [isDependenciesOpen, setIsDependenciesOpen] = useState(false);
  const [dependencySearchTerm, setDependencySearchTerm] = useState('');
  const [dependencySelectedIds, setDependencySelectedIds] = useState<string[]>([]);
  const [dependencyTargetObject, setDependencyTargetObject] = useState<MasterObject | null>(null);
  const [isPrecedenceOpen, setIsPrecedenceOpen] = useState(false);
  const [precedenceObject, setPrecedenceObject] = useState<MasterObject | null>(null);
  const [precedenceMode, setPrecedenceMode] = useState<'card' | 'global'>('global');

  // Forms
  const { formData: quickFormData, setFormData: setQuickFormData } = useObjectForm();
  const { formData: editFormData, setFormData: setEditFormData } = useObjectForm();
  const [editingObject, setEditingObject] = useState<MasterObject | null>(null);

  // Auth & queries
  const auth = useObjectsAuth(db);
  const queries = useObjectsQueries(
    db,
    auth.user,
    auth.isAdmin,
    auth.isProfileLoading,
    !!auth.currentUserProfile,
    selectedProjectId,
  );

  // Edit lock
  const { isLockedByOther, lockedByName, acquireLock, releaseLock } = useEditLock(
    editingObject ? `masterObjects/${editingObject.id}` : null,
    auth.user?.uid ?? null, auth.currentUserProfile?.name ?? auth.user?.email ?? null, auth.user?.email ?? null,
  );

  // Derived memos
  const usageMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    const list = queries.allMigrationObjects;
    if (!list?.length) return map;
    for (const mo of list) {
      if (!mo.masterObjectId) continue;
      const parts = mo.__path?.split('/') ?? [];
      const projectId =
        mo.projectId || (parts[0] === 'projects' && parts[2] === 'mocks' ? parts[1] : '');
      const mockId =
        mo.mockId || (parts[0] === 'projects' && parts[2] === 'mocks' ? parts[3] : '');
      if (!projectId || !mockId) continue;
      const key = `${projectId}:${mockId}`;
      if (!map[mo.masterObjectId]) map[mo.masterObjectId] = new Set();
      map[mo.masterObjectId].add(key);
    }
    return map;
  }, [queries.allMigrationObjects]);

  const mockSync = useObjectsMockSync(db, selectedProjectId);

  const migrationsInMockQuery = useMemoDb(() => {
    if (!db || !selectedProjectId || !mockSync.selectedMockId) return null;
    return collection(db, 'projects', selectedProjectId, 'mocks', mockSync.selectedMockId, 'migrationObjects');
  }, [db, selectedProjectId, mockSync.selectedMockId]);

  const { data: migrationsInSelectedMock, isLoading: migrationsInMockLoading } = useCollection<MigrationObject>(migrationsInMockQuery);

  const mockScopedSequences = !!(selectedProjectId && mockSync.selectedMockId);

  const catalogScopeFiltered = useMemo(() => {
    const masters = queries.objects;
    if (!masters?.length) return [];
    // Catálogo mestre: admin sempre vê todos os cadastros nesta página
    if (auth.isAdmin) return masters;
    return filterMastersByProjectMockUsage(
      masters,
      selectedProjectId,
      mockSync.selectedMockId,
      usageMap,
    );
  }, [queries.objects, selectedProjectId, mockSync.selectedMockId, usageMap, auth.isAdmin]);

  const projectUsageFiltered = useMemo(
    () =>
      filterMastersByProjectMockUsage(
        queries.objects,
        selectedProjectId,
        mockSync.selectedMockId,
        usageMap,
      ),
    [queries.objects, selectedProjectId, mockSync.selectedMockId, usageMap],
  );

  /** Com mock selecionada: mescla sequência da mock quando existir; admin sempre enxerga o catálogo completo. */
  const sequenceContextRows = useMemo(() => {
    const allMasters = queries.objects ?? [];

    if (auth.isAdmin) {
      if (!mockScopedSequences) return allMasters;
      return mergeMockSequencesOntoScopedMasters(
        allMasters,
        migrationsInSelectedMock ?? undefined,
        Boolean(migrationsInSelectedMock?.length),
        { overlayChargeSequence: false },
      );
    }

    if (mockScopedSequences) {
      if (migrationsInSelectedMock === null || !queries.objects) return [];
      const fromMock = buildGestaoRowsFromMockMigrations(
        migrationsInSelectedMock,
        queries.objects,
      );
      if (fromMock.length > 0) return fromMock;
      return projectUsageFiltered;
    }

    return mergeMockSequencesOntoScopedMasters(
      catalogScopeFiltered,
      migrationsInSelectedMock ?? undefined,
      false,
    );
  }, [
    auth.isAdmin,
    mockScopedSequences,
    migrationsInSelectedMock,
    queries.objects,
    catalogScopeFiltered,
    projectUsageFiltered,
  ]);

  const precedenceMap = useMemo(
    () => buildPrecedenceMap((queries.objects || []) as MasterObject[]),
    [queries.objects],
  );

  const configuredChargeGroupById = useMemo(
    () => buildConfiguredChargeGroupByObjectId(chargeGroups),
    [chargeGroups],
  );

  const sortedFilteredObjects = useMemo(() => {
    const filtered = filterMastersByDisplayFilters(
      sequenceContextRows,
      searchTerm,
      statusFilter,
      activityGroupFilter,
      configuredChargeGroupById,
    );
    return sortMastersGestao(filtered, sortMode);
  }, [sequenceContextRows, searchTerm, sortMode, statusFilter, activityGroupFilter, configuredChargeGroupById]);

  const duplicateMasterNameKeys = useMemo(
    () => computeDuplicateMasterNameKeys(queries.objects ?? undefined),
    [queries.objects],
  );

  const activeProject = useMemo(() => {
    if (!selectedProjectId || !queries.allProjects?.length) return null;
    return queries.allProjects.find((p) => p.id === selectedProjectId) ?? null;
  }, [selectedProjectId, queries.allProjects]);

  const canRegisterObjects = useMemo(
    () => projectAllowsMasterObjectRegistration(activeProject),
    [activeProject],
  );

  const objectCatalogBlockedReason = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'all') {
      return 'SELECIONE UM PROJETO PARA GERENCIAR O CATÁLOGO.';
    }
    if (!canRegisterObjects) {
      return 'CADASTRE A EMPRESA NO PROJETO PARA CRIAR OU IMPORTAR OBJETOS NO CATÁLOGO.';
    }
    return null;
  }, [selectedProjectId, canRegisterObjects]);

  const handleExportJson = useCallback(() => {
    const catalogObjects = queries.objects ?? [];
    if (!catalogObjects.length) {
      toast({ variant: 'destructive', description: 'NENHUM OBJETO PARA EXPORTAR.' });
      return;
    }
    if (!activeProject) {
      toast({ variant: 'destructive', description: 'SELECIONE UM PROJETO PARA EXPORTAR O CATÁLOGO.' });
      return;
    }
    const company = getProjectCompanyName(activeProject) ?? undefined;
    const payload = buildMasterCatalogExportPayload(catalogObjects, {
      id: activeProject.id,
      name: activeProject.name,
      company,
    });
    downloadJsonFile(
      payload,
      suggestMasterCatalogExportFilename(activeProject.name),
    );
  }, [activeProject, queries.objects, toast]);

  const sequenceStore = useMemo((): CatalogSequenceStore => {
    // Admin na gestão do catálogo mestre: sequência persiste em master_objects
    if (auth.isAdmin) return { kind: 'master' };
    if (mockScopedSequences && selectedProjectId && mockSync.selectedMockId) {
      return { kind: 'migration', projectId: selectedProjectId, mockId: mockSync.selectedMockId };
    }
    return { kind: 'master' };
  }, [auth.isAdmin, mockScopedSequences, selectedProjectId, mockSync.selectedMockId]);

  // Sub-hooks
  const importHook = useObjectsImport({
    db,
    user: auth.user,
    objects: queries.objects,
    toast,
    fileInputRef,
    terminalEndRef,
    projectId: selectedProjectId && selectedProjectId !== 'all' ? selectedProjectId : null,
    canRegisterObjects,
  });
  const reorder = useObjectsReorder({
    db,
    reorderUniverseObjects: sequenceContextRows,
    toast,
    sortedFilteredObjects,
    sortMode,
    isAdmin: auth.isAdmin,
    sequenceStore,
    refetchObjects: queries.refetchObjects,
  });

  const displayChargeOrderById = useMemo(() => {
    if (sortMode !== 'EXECUTION') return undefined;
    return buildListPositionChargeOrderMap(sortedFilteredObjects);
  }, [sortMode, sortedFilteredObjects]);

  const refetchChargeGroups = useCallback(async () => {
    if (!db) return;
    const snap = await getDocs(query(collection(db, 'chargeGroups'), orderBy('name')));
    setChargeGroups(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChargeGroup, 'id'>) })));
  }, [db]);

  const crud = useObjectsCRUD({
    db, user: auth.user, objects: queries.objects, sequenceContextRows, isAdmin: auth.isAdmin,
    isAdminOrMaster: auth.isAdminOrMaster,
    isMockLocked: mockSync.isMockLocked, acquireLock, releaseLock, toast,
    quickFormData, setQuickFormData, editFormData, setEditFormData,
    usageMap, extractChargeOrderDisplay, performReorder: reorder.performReorder,
    editingObject, setEditingObject,
    refetchObjects: queries.refetchObjects,
    refetchChargeGroups,
    chargeGroups,
    displayChargeOrderById,
    reorderDisplayList: sortedFilteredObjects,
    projectId: selectedProjectId && selectedProjectId !== 'all' ? selectedProjectId : null,
    canRegisterObjects,
  });

  // Derived flags
  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'ALL' || activityGroupFilter !== 'ALL';
  const anyDialogOpen = crud.isQuickCreateOpen || importHook.isImportOpen || isDependenciesOpen ||
    reorder.isSelectNextOpen || reorder.isParallelSelectOpen || crud.isForceLockOpen || isPrecedenceOpen;

  // Effects
  useDialogEffects(anyDialogOpen, selectedCardId, isPrecedenceOpen, setIsPrecedenceOpen);

  useEffect(() => {
    if (!db) return;
    getDocs(query(collection(db, 'activityGroups'), orderBy('name')))
      .then(snap => setActivityGroups(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ActivityGroup, 'id'>) }))));
    void refetchChargeGroups();
  }, [db, refetchChargeGroups]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleClearFilters = () => {
    setSearchTerm(''); setStatusFilter('ALL'); setActivityGroupFilter('ALL');
  };

  const handleOpenDependencies = (obj: MasterObject) => {
    depTriggerRef.current = document.activeElement as HTMLElement;
    const fresh = (queries.objects ?? []).find((o) => o.id === obj.id) ?? obj;
    setDependencyTargetObject({
      ...fresh,
      dependencyIds: [...(fresh.dependencyIds ?? [])],
    });
    setDependencySelectedIds([...(fresh.dependencyIds ?? [])]);
    setDependencySearchTerm('');
    setIsDependenciesOpen(true);
  };

  const handleSaveDependencySelect = async () => {
    if (!dependencyTargetObject || !db) return;
    const targetId = dependencyTargetObject.id;
    try {
      await updateDoc(doc(db, 'masterObjects', targetId), {
        dependencyIds: dependencySelectedIds,
        updatedAt: serverTimestamp(),
      });
      setDependencyTargetObject((prev) =>
        prev?.id === targetId ? { ...prev, dependencyIds: dependencySelectedIds } : prev,
      );
      queries.refetchObjects?.();
      setIsDependenciesOpen(false);
    } catch (err) {
      console.error('[handleSaveDependencySelect]', err);
      const msg = err instanceof Error ? err.message : 'ERRO DESCONHECIDO';
      toast({ variant: 'destructive', description: `ERRO AO SALVAR DEPENDÊNCIAS: ${msg}` });
    }
  };

  const handleOpenPrecedence = (obj: MasterObject | null, mode: 'card' | 'global' = 'global') => {
    setPrecedenceObject(obj); setPrecedenceMode(mode); setIsPrecedenceOpen(true);
  };

  const suggestNextOrder = (currentGroup: string): string => {
    const rows =
      sequenceContextRows.length > 0
        ? sequenceContextRows
        : (queries.objects ?? []);
    const { nextSeq } = computeSuggestedNextChargeOrder(rows, currentGroup);
    setEditFormData((prev) => ({ ...prev, chargeOrder: nextSeq }));
    return nextSeq;
  };

  const suggestNextParallelOrder = (_currentGroup: string): string => {
    const rows = sequenceContextRows.length > 0 ? sequenceContextRows : (queries.objects ?? []);
    const withParallel = rows.filter(o => o.parallelOrder && isValidSequence(o.parallelOrder));
    if (!withParallel.length) {
      const first = '01.00';
      setEditFormData((prev) => ({ ...prev, parallelOrder: first }));
      return first;
    }
    const currentPO = editFormData.parallelOrder;
    const currentMajor = currentPO ? parseSequence(currentPO).major : null;
    const sameGroupObjs = currentMajor ? withParallel.filter(o => parseSequence(o.parallelOrder).major === currentMajor) : [];
    if (sameGroupObjs.length > 0) {
      const maxMinor = sameGroupObjs.reduce((max, o) => Math.max(max, parseSequence(o.parallelOrder).minor), 0);
      const nextSeq = formatSequence(currentMajor!, maxMinor + 1);
      setEditFormData((prev) => ({ ...prev, parallelOrder: nextSeq }));
      return nextSeq;
    }
    const maxMajor = withParallel.reduce((max, o) => Math.max(max, parseSequence(o.parallelOrder).major), 0);
    const nextSeq = formatSequence(maxMajor + 1, 0);
    setEditFormData((prev) => ({ ...prev, parallelOrder: nextSeq }));
    return nextSeq;
  };

  return {
    fileInputRef, terminalEndRef, depSearch1Ref, depSearch2Ref, depSearchTimerRef, depTriggerRef,
    ...crud, ...reorder,
    objects: queries.objects,
    isLoading:
      queries.isLoading ||
      queries.isMigrationObjectsLoading ||
      auth.isProfileLoading ||
      (mockScopedSequences && migrationsInMockLoading),
    isAdmin: auth.isAdmin,
    isAdminOrMaster: auth.isAdminOrMaster,
    isLockedByOther,
    lockedByName,
    usageMap, precedenceMap, sequenceContextRows, sortedFilteredObjects, duplicateMasterNameKeys, activeProject,
    canRegisterObjects, objectCatalogBlockedReason,
    displayChargeOrderById,
    searchTerm, setSearchTerm, sortMode, statusFilter, setStatusFilter,
    isSearchOpen, setIsSearchOpen, viewMode, setViewMode, selectedCardId, setSelectedCardId,
    activityGroups, activityGroupFilter, setActivityGroupFilter, chargeGroups, configuredChargeGroupById, hasActiveFilters,
    isDependenciesOpen, setIsDependenciesOpen, dependencySearchTerm, setDependencySearchTerm,
    dependencySelectedIds, setDependencySelectedIds, dependencyTargetObject,
    isPrecedenceOpen, setIsPrecedenceOpen, precedenceObject, setPrecedenceObject, precedenceMode,
    editingObject,
    quickFormData, setQuickFormData, editFormData, setEditFormData,
    ...mockSync, ...importHook,
    handleExportJson,
    handleClearFilters, handleOpenDependencies, handleSaveDependencySelect,
    handleOpenPrecedence, suggestNextOrder, suggestNextParallelOrder,
    releaseLock,
  };
}
