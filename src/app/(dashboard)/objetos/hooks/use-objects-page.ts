"use client";

import { useState, useRef, useMemo, useEffect } from 'react';
import { useMemoFirebase, useCollection, useFirestore, useUser, useDoc } from '@/supabase';
import type { WithId } from '@/supabase/hooks/types';
import { collection, doc, collectionGroup, query, where, getDocs, orderBy, writeBatch, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { MigrationObject, UserProfile } from '@/types/migration';
import { useToast } from '@/hooks/use-toast';
import { useObjectForm } from '@/hooks/use-object-form';
import { setDocumentNonBlocking } from '@/supabase/mutations';
import { useEditLock } from '@/hooks/use-edit-lock';
import {
  parseSequence,
  formatSequence,
  isValidSequence,
  compareSequences,
  compareGestaoExecutionOrder,
} from '@/lib/migration/sequence-utils';
import { buildPrecedenceMap } from '@/lib/migration/dependency-utils';
import type { MasterObject } from '../components/object-card';
import type { ActivityGroup } from '@/types/activity-group';
import { useSearchParams } from 'next/navigation';
import { useActiveProjectId } from '@/hooks/use-active-project-id';
import { SUPERADMIN_UID, idsForFirestoreIn } from '@/lib/constants';
import { normalizeMasterCatalogName } from '@/lib/migration/master-catalog';
import {
  resolveMasterObject,
  isActiveCatalogMaster,
} from '@/lib/dashboard/object-filters';
import { buildGestaoRowsFromMockMigrations } from '@/lib/migration/gestao-sequence';
import { useObjectsMockSync } from './use-objects-mock-sync';
import { useObjectsImport } from './use-objects-import';
import {
  sequenceDoc,
  useObjectsReorder,
  type CatalogSequenceStore,
} from './use-objects-reorder';
import { useObjectsCRUD } from './use-objects-crud';

interface Project { id: string; name: string; company?: string; empresa?: string; }

interface UseObjectsPageDeps {
  extractChargeOrderDisplay?: (chargeOrder: string | number | undefined) => string;
}

function _defaultExtractChargeOrderDisplay(chargeOrder: string | number | undefined): string {
  if (chargeOrder === undefined || chargeOrder === null) return '';
  const { major, minor } = parseSequence(chargeOrder);
  return major > 0 ? formatSequence(major, minor) : '';
}

// ── Sub-hook: User profile & auth ─────────────────────────────────────────

function useObjectsAuth(db: Firestore | null) {
  const { user } = useUser();
  const currentUserRef = useMemoFirebase(() => user ? doc(db!, 'users', user.uid) : null, [db, user]);
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(currentUserRef);
  const isAdmin = !isProfileLoading && (
    (currentUserProfile?.role || '').toLowerCase() === 'admin' ||
    (currentUserProfile?.role || '').toLowerCase() === 'master' ||
    currentUserProfile?.isMaster === true || user?.uid === SUPERADMIN_UID
  );
  return { user, currentUserProfile, isProfileLoading, isAdmin };
}

// ── Sub-hook: Firebase queries ────────────────────────────────────────────

function useObjectsQueries(
  db: Firestore | null,
  user: User | null,
  isAdmin: boolean,
  isProfileLoading: boolean,
  hasUserProfile: boolean,
  /** Projeto atual na URL/contexto (`null`/`all` → não restringir por igualdade aqui). */
  scopedProjectId: string | null,
) {
  const objectsQuery = useMemoFirebase(() => {
    if (!db || !user || isProfileLoading) return null;
    return collection(db, 'masterObjects');
  }, [db, user, isProfileLoading]);
  const { data: objects, isLoading } = useCollection<MasterObject>(objectsQuery);

  const projectsQuery = useMemoFirebase(() => {
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

  const scoped =
    scopedProjectId && scopedProjectId !== 'all'
      ? scopedProjectId
      : null;

  const migrationObjectsQuery = useMemoFirebase(() => {
    if (!db || !user || isProfileLoading || !hasUserProfile) return null;
    const ref = collectionGroup(db, 'migrationObjects');
    if (isAdmin) return ref;
    // Projeto específico: igualdade (não depende do subset `in`; evita lista vazia se o projeto atual não está entre os primeiros 30 memberships).
    if (scoped) {
      return query(ref, where('projectId', '==', scoped));
    }
    const projectIds = idsForFirestoreIn(accessibleProjectIds);
    if (!projectIds) return null;
    return query(ref, where('projectId', 'in', projectIds));
  }, [db, user, isAdmin, isProfileLoading, hasUserProfile, scoped, accessibleProjectIds]);
  const { data: allMigrationObjects, isLoading: isMigrationObjectsLoading } =
    useCollection<MigrationObject>(migrationObjectsQuery);

  return { objects, isLoading, allProjects, allMigrationObjects, isMigrationObjectsLoading };
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

/** Sobrepõe `chargeOrder`/`chargeGroup`/`parallelOrder` vindos dos `migrationObjects` quando o escopo vem só do projeto. */
function mergeMockSequencesOntoScopedMasters(
  mastersInScope: MasterObject[],
  migrations: MigrationObject[] | null | undefined,
  applyMerge: boolean,
): MasterObject[] {
  if (!applyMerge || !migrations?.length) return mastersInScope;
  const byMasterId = new Map<string, MigrationObject>();
  for (const m of migrations) {
    if (m.masterObjectId) byMasterId.set(m.masterObjectId, m);
  }
  return mastersInScope.map((mast) => {
    const mig = byMasterId.get(mast.id);
    if (!mig) return { ...mast };
    return {
      ...mast,
      chargeGroup: mig.chargeGroup ?? mast.chargeGroup,
      chargeOrder: mig.chargeOrder ?? mast.chargeOrder,
      parallelOrder: mig.parallelOrder ?? mast.parallelOrder,
      isParallel: mig.isParallel ?? mast.isParallel,
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
): MasterObject[] {
  return rows.filter((obj) => {
    const matchesSearch =
      obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (obj.description ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      Boolean(obj.chargeGroup && obj.chargeGroup.toLowerCase().includes(searchTerm.toLowerCase()));
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

export function useObjectsPage({ extractChargeOrderDisplay: customExtract }: UseObjectsPageDeps = {}) {
  const extractChargeOrderDisplay = customExtract || _defaultExtractChargeOrderDisplay;
  const db = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { projectId: activeProjectId } = useActiveProjectId();
  const selectedProjectId = searchParams.get('projectId') || activeProjectId || null;

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const depSearch1Ref = useRef<HTMLInputElement>(null);
  const depSearch2Ref = useRef<HTMLInputElement>(null);
  const depSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const depTriggerRef = useRef<HTMLElement | null>(null);
  const mainSearchRef = useRef<HTMLInputElement>(null);
  const mainSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<'EXECUTION' | 'ALPHABETICAL' | 'UPDATED'>('EXECUTION');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVO' | 'INATIVO' | 'LEGACY'>('ALL');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [activityGroupFilter, setActivityGroupFilter] = useState<string>('ALL');

  // Dialog state
  const [isDependenciesOpen, setIsDependenciesOpen] = useState(false);
  const [dependencySearchTerm, setDependencySearchTerm] = useState('');
  const [dependencyFilterType, setDependencyFilterType] = useState('TODOS');
  const [dependencyTargetObject, setDependencyTargetObject] = useState<MasterObject | null>(null);
  const [isPrecedenceOpen, setIsPrecedenceOpen] = useState(false);
  const [precedenceObject, setPrecedenceObject] = useState<MasterObject | null>(null);
  const [precedenceMode, setPrecedenceMode] = useState<'card' | 'global'>('global');
  const [successorDialogObject, setSuccessorDialogObject] = useState<WithId<MasterObject> | null>(null);
  const [successorSearch, setSuccessorSearch] = useState('');

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

  const migrationsInMockQuery = useMemoFirebase(() => {
    if (!db || !selectedProjectId || !mockSync.selectedMockId) return null;
    return collection(db, 'projects', selectedProjectId, 'mocks', mockSync.selectedMockId, 'migrationObjects');
  }, [db, selectedProjectId, mockSync.selectedMockId]);

  const { data: migrationsInSelectedMock, isLoading: migrationsInMockLoading } = useCollection<MigrationObject>(migrationsInMockQuery);

  const mockScopedSequences = !!(selectedProjectId && mockSync.selectedMockId);

  const catalogScopeFiltered = useMemo(() => {
    const masters = queries.objects;
    if (!masters?.length) return [];
    // Catálogo mestre: admin vê todos os cadastros (não só os já usados no projeto)
    if (auth.isAdmin && !mockSync.selectedMockId) return masters;
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

  /** Com mock selecionada: mesma base do dashboard (docs em `migrationObjects` + resolveMasterObject + ATIVO). Sem mock: catálogo filtrado por uso no projeto. */
  const sequenceContextRows = useMemo(() => {
    if (mockScopedSequences) {
      if (migrationsInSelectedMock === null || !queries.objects) return [];
      const fromMock = buildGestaoRowsFromMockMigrations(
        migrationsInSelectedMock,
        queries.objects,
      );
      if (fromMock.length > 0) return fromMock;
      // Mock sem objetos migrados ainda: admin mantém catálogo; membro vê só o usado no projeto
      if (auth.isAdmin) return queries.objects;
      return projectUsageFiltered;
    }
    return mergeMockSequencesOntoScopedMasters(
      catalogScopeFiltered,
      migrationsInSelectedMock ?? undefined,
      false,
    );
  }, [
    mockScopedSequences,
    migrationsInSelectedMock,
    queries.objects,
    catalogScopeFiltered,
    projectUsageFiltered,
    auth.isAdmin,
  ]);

  const precedenceMap = useMemo(
    () => buildPrecedenceMap((queries.objects || []) as MasterObject[]),
    [queries.objects],
  );

  const sortedFilteredObjects = useMemo(() => {
    const filtered = filterMastersByDisplayFilters(
      sequenceContextRows,
      searchTerm,
      statusFilter,
      activityGroupFilter,
    );
    return sortMastersGestao(filtered, sortMode);
  }, [sequenceContextRows, searchTerm, sortMode, statusFilter, activityGroupFilter]);

  const duplicateMasterNameKeys = useMemo(
    () => computeDuplicateMasterNameKeys(queries.objects ?? undefined),
    [queries.objects],
  );

  const activeProject = useMemo(() => {
    if (!selectedProjectId || !queries.allProjects?.length) return null;
    return queries.allProjects.find((p) => p.id === selectedProjectId) ?? null;
  }, [selectedProjectId, queries.allProjects]);

  const sequenceStore = useMemo((): CatalogSequenceStore => {
    if (mockScopedSequences && selectedProjectId && mockSync.selectedMockId) {
      return { kind: 'migration', projectId: selectedProjectId, mockId: mockSync.selectedMockId };
    }
    return { kind: 'master' };
  }, [mockScopedSequences, selectedProjectId, mockSync.selectedMockId]);

  // Sub-hooks
  const importHook = useObjectsImport({
    db, user: auth.user, objects: queries.objects, toast, fileInputRef, terminalEndRef,
  });
  const reorder = useObjectsReorder({
    db,
    reorderUniverseObjects: sequenceContextRows,
    toast,
    sortedFilteredObjects,
    isAdmin: auth.isAdmin,
    sequenceStore,
  });
  const crud = useObjectsCRUD({
    db, user: auth.user, objects: queries.objects, isAdmin: auth.isAdmin,
    isMockLocked: mockSync.isMockLocked, acquireLock, releaseLock, toast,
    quickFormData, setQuickFormData, editFormData, setEditFormData,
    usageMap, extractChargeOrderDisplay, performReorder: reorder.performReorder,
    editingObject, setEditingObject,
  });

  // Derived flags
  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'ALL' || activityGroupFilter !== 'ALL';
  const anyDialogOpen = crud.isQuickCreateOpen || importHook.isImportOpen || reorder.isResetDialogOpen ||
    reorder.isMigrationDialogOpen || isDependenciesOpen || reorder.isSelectNextOpen ||
    reorder.isParallelSelectOpen || crud.isForceLockOpen || isPrecedenceOpen;

  // Effects
  useDialogEffects(anyDialogOpen, selectedCardId, isPrecedenceOpen, setIsPrecedenceOpen);

  useEffect(() => {
    if (!db) return;
    getDocs(query(collection(db, 'activityGroups'), orderBy('name')))
      .then(snap => setActivityGroups(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ActivityGroup, 'id'>) }))));
  }, [db]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleClearFilters = () => {
    if (mainSearchRef.current) mainSearchRef.current.value = '';
    if (mainSearchTimerRef.current) clearTimeout(mainSearchTimerRef.current);
    setSearchTerm(''); setStatusFilter('ALL'); setActivityGroupFilter('ALL');
  };

  const handleOpenDependencies = (obj: MasterObject) => {
    depTriggerRef.current = document.activeElement as HTMLElement;
    setDependencyTargetObject(obj); setIsDependenciesOpen(true);
  };

  const handleToggleDependency = (objectId: string) => {
    if (!dependencyTargetObject || !db) return;
    const current = dependencyTargetObject.dependencyIds || [];
    const isRemoving = current.includes(objectId);
    const updated = isRemoving ? current.filter(id => id !== objectId) : [...current, objectId];
    setDependencyTargetObject({ ...dependencyTargetObject, dependencyIds: updated });
    setDocumentNonBlocking(doc(db, 'masterObjects', dependencyTargetObject.id), { dependencyIds: updated }, { merge: true });
    toast({ description: isRemoving ? 'DEPENDÊNCIA REMOVIDA.' : 'DEPENDÊNCIA ADICIONADA.' });
  };

  const handleOpenPrecedence = (obj: MasterObject | null, mode: 'card' | 'global' = 'global') => {
    setPrecedenceObject(obj); setPrecedenceMode(mode); setIsPrecedenceOpen(true);
  };

  const handleSetSuccessor = async (currentObj: WithId<MasterObject>, nextObj: WithId<MasterObject>) => {
    const universe = sequenceContextRows;
    if (!universe.length || !db) return;
    if (nextObj.id === currentObj.id) { toast({ variant: 'destructive', description: 'UM OBJETO NÃO PODE SER SUCESSOR DE SI MESMO.' }); return; }
    try {
      const sorted = [...universe].sort((a, b) => compareSequences(a.chargeOrder, b.chargeOrder));
      const currentIdx = sorted.findIndex(o => o.id === currentObj.id);
      const nextIdx = sorted.findIndex(o => o.id === nextObj.id);
      if (nextIdx === currentIdx + 1) { toast({ description: `"${nextObj.name}" JÁ É O PRÓXIMO CARD APÓS "${currentObj.name}".` }); return; }
      const reordered = sorted.filter(o => o.id !== nextObj.id);
      const insertAfterIdx = reordered.findIndex(o => o.id === currentObj.id);
      reordered.splice(insertAfterIdx + 1, 0, nextObj);
      const batch = writeBatch(db);
      let updates = 0;
      const rowsToWrite = reordered.map((obj, i) => ({
        obj,
        newOrder: formatSequence(i + 1, 0),
        ref: sequenceDoc(db, sequenceStore, obj),
      }));
      if (rowsToWrite.some(({ ref }) => !ref)) {
        toast({ variant: 'destructive', description: 'Não há documento de sequência para um dos objetos (mock sem vínculo).' });
        return;
      }
      rowsToWrite.forEach(({ obj, newOrder, ref }) => {
        if (String(obj.chargeOrder) !== newOrder) {
          batch.update(ref!, { chargeOrder: newOrder, updatedAt: serverTimestamp() });
          updates++;
        }
      });
      if (updates > 0) {
        await batch.commit();
      }
    } catch { toast({ variant: 'destructive', description: 'Erro ao reposicionar card. Tente novamente.' }); }
    finally { setSuccessorDialogObject(null); setSuccessorSearch(''); }
  };

  const suggestNextOrder = (currentGroup: string, type: 'quick' | 'edit') => {
    const rows = sequenceContextRows;
    if (!rows.length) return;
    const groupObjects = rows.filter(obj => obj.chargeGroup && currentGroup && obj.chargeGroup.toUpperCase() === currentGroup.toUpperCase());
    const targetList = groupObjects.length > 0 ? groupObjects : rows;
    const maxMajor = targetList.reduce((max, obj) => Math.max(max, parseSequence(obj.chargeOrder).major), 0);
    const nextSeq = formatSequence(maxMajor + 1, 0);
    if (type === 'quick') setQuickFormData((prev) => ({ ...prev, chargeOrder: nextSeq }));
    else { if (crud.chargeOrderEditRef.current) crud.chargeOrderEditRef.current.value = nextSeq; setEditFormData((prev) => ({ ...prev, chargeOrder: nextSeq })); }
    toast({ description: `PRÓXIMA SEQUÊNCIA GERADA: ${nextSeq}${groupObjects.length > 0 ? ` (GRUPO: ${currentGroup})` : ' (GLOBAL)'}` });
  };

  const suggestNextParallelOrder = (currentGroup: string, type: 'quick' | 'edit') => {
    const rows = sequenceContextRows;
    if (!rows.length) return;
    const withParallel = rows.filter(o => o.parallelOrder && isValidSequence(o.parallelOrder));
    if (!withParallel.length) {
      const first = '01.00';
      if (type === 'quick') setQuickFormData((prev: any) => ({ ...prev, parallelOrder: first }));
      else setEditFormData((prev: any) => ({ ...prev, parallelOrder: first }));
      toast({ description: `PRÓXIMA ORDEM PARALELA SUGERIDA: ${first}` }); return;
    }
    const currentPO = type === 'quick' ? quickFormData.parallelOrder : editFormData.parallelOrder;
    const currentMajor = currentPO ? parseSequence(currentPO).major : null;
    const sameGroupObjs = currentMajor ? withParallel.filter(o => parseSequence(o.parallelOrder).major === currentMajor) : [];
    if (sameGroupObjs.length > 0) {
      const maxMinor = sameGroupObjs.reduce((max, o) => Math.max(max, parseSequence(o.parallelOrder).minor), 0);
      const nextSeq = formatSequence(currentMajor!, maxMinor + 1);
      if (type === 'quick') setQuickFormData((prev: any) => ({ ...prev, parallelOrder: nextSeq }));
      else setEditFormData((prev: any) => ({ ...prev, parallelOrder: nextSeq }));
      toast({ description: `PRÓXIMA ORDEM PARALELA SUGERIDA: ${nextSeq} (GRUPO ${String(currentMajor).padStart(2, '0')})` });
    } else {
      const maxMajor = withParallel.reduce((max, o) => Math.max(max, parseSequence(o.parallelOrder).major), 0);
      const nextSeq = formatSequence(maxMajor + 1, 0);
      if (type === 'quick') setQuickFormData((prev: any) => ({ ...prev, parallelOrder: nextSeq }));
      else setEditFormData((prev: any) => ({ ...prev, parallelOrder: nextSeq }));
      toast({ description: `PRÓXIMA ORDEM PARALELA SUGERIDA: ${nextSeq} (NOVO GRUPO)` });
    }
  };

  return {
    fileInputRef, terminalEndRef, depSearch1Ref, depSearch2Ref, depSearchTimerRef, depTriggerRef, mainSearchRef, mainSearchTimerRef,
    ...crud, ...reorder,
    objects: queries.objects,
    isLoading:
      queries.isLoading ||
      queries.isMigrationObjectsLoading ||
      auth.isProfileLoading ||
      (mockScopedSequences && migrationsInMockLoading),
    isAdmin: auth.isAdmin,
    isLockedByOther,
    lockedByName,
    usageMap, precedenceMap, sequenceContextRows, sortedFilteredObjects, duplicateMasterNameKeys, activeProject,
    searchTerm, setSearchTerm, sortMode, setSortMode, statusFilter, setStatusFilter,
    isSearchOpen, setIsSearchOpen, viewMode, setViewMode, selectedCardId, setSelectedCardId,
    activityGroups, activityGroupFilter, setActivityGroupFilter, hasActiveFilters,
    isDependenciesOpen, setIsDependenciesOpen, dependencySearchTerm, setDependencySearchTerm,
    dependencyFilterType, setDependencyFilterType, dependencyTargetObject, setDependencyTargetObject,
    isPrecedenceOpen, setIsPrecedenceOpen, precedenceObject, setPrecedenceObject, precedenceMode,
    successorDialogObject, setSuccessorDialogObject, successorSearch, setSuccessorSearch,
    editingObject, setEditingObject,
    quickFormData, setQuickFormData, editFormData, setEditFormData,
    ...mockSync, ...importHook,
    handleClearFilters, handleOpenDependencies, handleToggleDependency,
    handleOpenPrecedence, handleSetSuccessor, suggestNextOrder, suggestNextParallelOrder,
    anyDialogOpen, releaseLock,
  };
}
