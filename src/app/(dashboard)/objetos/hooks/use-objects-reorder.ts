"use client";

import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { doc, serverTimestamp, writeBatch, type CompatDb } from '@/supabase/compat-db-shim';
import {
  parseSequence,
  formatSequence,
  isValidSequence,
  compareSequences,
  compareChargeSequenceGridOrder,
  compareGestaoExecutionOrder,
} from '@/lib/migration/sequence-utils';
import { DB_BATCH_SIZE } from '@/lib/constants';
import type { MasterObject } from '../components/object-card';
import type { ProgressState } from '../components/progress-dialog';

/** Catálogo global (`masterObjects`) vs sequência da mock (`migrationObjects`). */
export type CatalogSequenceStore =
  | { kind: 'master' }
  | { kind: 'migration'; projectId: string; mockId: string };

function sequenceDoc(
  db: CompatDb | null | undefined,
  store: CatalogSequenceStore,
  obj: MasterObject,
): ReturnType<typeof doc> | null {
  if (!db) return null;
  if (store.kind === 'migration') {
    const migId = obj._migrationDocId;
    if (migId) {
      return doc(db, 'projects', store.projectId, 'mocks', store.mockId, 'migrationObjects', migId);
    }
    // Objeto fora da mock: persiste no catálogo mestre
    return doc(db, 'masterObjects', obj.id);
  }
  return doc(db, 'masterObjects', obj.id);
}

interface UseObjectsReorderDeps {
  db: CompatDb | null;
  /** Mestres no escopo (filtrados por projeto/mock) com `_migrationDocId` quando há mock para sequência. */
  reorderUniverseObjects: MasterObject[] | null | undefined;
  toast: (opts: any) => void;
  sortedFilteredObjects: MasterObject[];
  sortMode: 'EXECUTION' | 'ALPHABETICAL' | 'UPDATED';
  isAdmin: boolean;
  sequenceStore: CatalogSequenceStore;
  refetchObjects?: () => void;
}

export type PerformReorderOptions = {
  /** Lista exibida na grade — reordena por posição visual (01.00 = 1º card). */
  orderedList?: MasterObject[];
  onMoved?: (objectId: string) => void;
};

type ReorderInsert =
  | { mode: 'before'; anchorId: string }
  | { mode: 'after'; anchorId: string }
  | { mode: 'atOrder'; targetOrder: string };

/** Reinsere o objeto movido na ordem de execução e devolve a lista renumerada 01.00… sem buracos. */
function buildContiguousSequenceOrder(
  universe: MasterObject[],
  moving: MasterObject,
  insert: ReorderInsert,
): MasterObject[] {
  const sorted = [...universe].sort((a, b) => compareChargeSequenceGridOrder(a, b));
  const withoutMoving = sorted.filter((o) => o.id !== moving.id);

  let insertIdx = withoutMoving.length;
  if (insert.mode === 'before') {
    const idx = withoutMoving.findIndex((o) => o.id === insert.anchorId);
    if (idx !== -1) insertIdx = idx;
  } else if (insert.mode === 'after') {
    const idx = withoutMoving.findIndex((o) => o.id === insert.anchorId);
    insertIdx = idx === -1 ? withoutMoving.length : idx + 1;
  } else {
    const idx = withoutMoving.findIndex((o) =>
      compareSequences(o.chargeOrder, insert.targetOrder) >= 0,
    );
    if (idx !== -1) insertIdx = idx;
  }

  const reordered = [...withoutMoving];
  reordered.splice(insertIdx, 0, moving);
  return reordered;
}

/** Reordena pela posição exibida na grade (01.00 = 1º card, 02.00 = 2º, …). */
function buildContiguousSequenceOrderByListPosition(
  list: MasterObject[],
  moving: MasterObject,
  targetOrder: string,
): MasterObject[] {
  const position = parseSequence(targetOrder).major;
  if (position <= 0) return [...list];

  const current = [...list];
  const fromIdx = current.findIndex((o) => o.id === moving.id);
  if (fromIdx === -1) {
    const insertIdx = Math.max(0, Math.min(position - 1, current.length));
    const next = [...current];
    next.splice(insertIdx, 0, moving);
    return next;
  }

  const [item] = current.splice(fromIdx, 1);
  const insertIdx = Math.max(0, Math.min(position - 1, current.length));
  current.splice(insertIdx, 0, item);
  return current;
}

/** Aplica a nova ordem da grade visível e mantém demais objetos do universo ao final. */
function mergeListPositionIntoUniverse(
  universe: MasterObject[],
  orderedList: MasterObject[],
  moving: MasterObject,
  targetOrder: string,
): MasterObject[] {
  const reorderedVisible = buildContiguousSequenceOrderByListPosition(orderedList, moving, targetOrder);
  const visibleIds = new Set(reorderedVisible.map((o) => o.id));
  const hidden = universe
    .filter((o) => !visibleIds.has(o.id))
    .sort((a, b) => compareGestaoExecutionOrder(a, b));
  return [...reorderedVisible, ...hidden];
}

/** Insere o objeto movido imediatamente após o card âncora na lista exibida. */
function insertAfterAnchorInList(
  list: MasterObject[],
  moving: MasterObject,
  anchorId: string,
): MasterObject[] {
  const withoutMoving = list.filter((o) => o.id !== moving.id);
  const anchorIdx = withoutMoving.findIndex((o) => o.id === anchorId);
  const insertIdx = anchorIdx === -1 ? withoutMoving.length : anchorIdx + 1;
  const reordered = [...withoutMoving];
  reordered.splice(insertIdx, 0, moving);
  return reordered;
}

/** Reposiciona na grade visível e preserva objetos fora da lista ao final do universo. */
function buildReorderAfterAnchorInList(
  universe: MasterObject[],
  orderedList: MasterObject[],
  moving: MasterObject,
  anchorId: string,
): MasterObject[] {
  const reorderedVisible = insertAfterAnchorInList(orderedList, moving, anchorId);
  const visibleIds = new Set(reorderedVisible.map((o) => o.id));
  const hidden = universe
    .filter((o) => !visibleIds.has(o.id))
    .sort((a, b) => compareGestaoExecutionOrder(a, b));
  return [...reorderedVisible, ...hidden];
}

async function commitContiguousSequenceRenumber(
  db: CompatDb,
  sequenceStore: CatalogSequenceStore,
  reordered: MasterObject[],
  toast: (opts: { variant?: string; description: string }) => void,
  errorMessage: string,
  opts?: { forceRenumber?: boolean },
): Promise<boolean> {
  const batch = writeBatch(db);
  let updateCount = 0;
  const forceRenumber = opts?.forceRenumber ?? false;

  reordered.forEach((obj, idx) => {
    const newSeq = formatSequence(idx + 1, 0);
    if (!forceRenumber && String(obj.chargeOrder) === newSeq) return;
    const ref = sequenceDoc(db, sequenceStore, obj);
    if (!ref) {
      console.error('[performReorder] documento não resolvido', obj.id, obj.name);
      return;
    }
    batch.update(ref as any, { chargeOrder: newSeq, updatedAt: serverTimestamp() });
    updateCount++;
  });

  if (updateCount === 0) return true;
  try {
    await batch.commit();
    return true;
  } catch (err) {
    console.error('[performReorder] falha ao gravar sequência', err);
    const detail = err instanceof Error ? err.message : errorMessage;
    toast({ variant: 'destructive', description: detail || errorMessage });
    return false;
  }
}

// ── Sub-hook: Visual drag & drop ──────────────────────────────────────────

function useVisualDrag(sortedFilteredObjects: MasterObject[]) {
  const [isVisualReorderMode, setIsVisualReorderMode] = useState(false);
  const [visualOrder, setVisualOrder] = useState<MasterObject[]>([]);
  const [visualDragId, setVisualDragId] = useState<string | null>(null);
  const [visualDragOverId, setVisualDragOverId] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisualReorderMode && sortedFilteredObjects.length > 0) {
      setVisualOrder(sortedFilteredObjects as MasterObject[]);
    }
  }, [sortedFilteredObjects, isVisualReorderMode]);

  const handleVisualDragStart = (id: string) => setVisualDragId(id);
  const handleVisualDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setVisualDragOverId(id); };
  const handleVisualDrop = (targetId: string) => {
    if (!visualDragId || visualDragId === targetId) { setVisualDragId(null); setVisualDragOverId(null); return; }
    setVisualOrder(prev => {
      const from = prev.findIndex(o => o.id === visualDragId);
      const to = prev.findIndex(o => o.id === targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setVisualDragId(null); setVisualDragOverId(null);
  };

  return { isVisualReorderMode, setIsVisualReorderMode, visualOrder, setVisualOrder, visualDragId, visualDragOverId, handleVisualDragStart, handleVisualDragOver, handleVisualDrop };
}

// ── Sub-hook: Batch progress runner ───────────────────────────────────────

function useBatchRunner(db: any, toast: (opts: any) => void) {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState>({ open: false, title: '', current: 0, total: 0, done: false, error: null });

  const runWithProgress = async (title: string, items: { ref: any; data: Record<string, any> }[]) => {
    const total = items.length;
    setIsResetDialogOpen(false);
    await new Promise(r => setTimeout(r, 80));
    setProgressState({ open: true, title, current: 0, total, done: false, error: null });
    await new Promise(r => setTimeout(r, 50));
    try {
      for (let i = 0; i < items.length; i += DB_BATCH_SIZE) {
        const chunk = items.slice(i, i + DB_BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(({ ref, data }) => batch.set(ref, data, { merge: true }));
        await batch.commit();
        flushSync(() => setProgressState(s => ({ ...s, current: Math.min(i + DB_BATCH_SIZE, total) })));
      }
      flushSync(() => setProgressState(s => ({ ...s, current: total, done: true })));
      toast({ description: `${title} — CONCLUÍDO.` });
      await new Promise(r => setTimeout(r, 500));
      setProgressState(s => ({ ...s, open: false }));
    } catch {
      setProgressState(s => ({ ...s, error: 'Falha ao processar alguns objetos. Verifique permissões.' }));
    }
  };

  return { isResetDialogOpen, setIsResetDialogOpen, progressState, setProgressState, runWithProgress };
}

// ── Sub-hook: Select Next ─────────────────────────────────────────────────

function useSelectNext() {
  const [isSelectNextOpen, setIsSelectNextOpen] = useState(false);
  const [selectNextTargetObject, setSelectNextTargetObject] = useState<MasterObject | null>(null);
  const [selectNextSearchTerm, setSelectNextSearchTerm] = useState('');
  const selectNextSearchRef = useRef<HTMLInputElement>(null);
  const selectNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectNextTriggerRef = useRef<HTMLElement | null>(null);

  const handleOpenSelectNext = (obj: MasterObject) => {
    selectNextTriggerRef.current = document.activeElement as HTMLElement;
    setSelectNextTargetObject(obj);
    setSelectNextSearchTerm('');
    setIsSelectNextOpen(true);
  };

  return { isSelectNextOpen, setIsSelectNextOpen, selectNextTargetObject, setSelectNextTargetObject, selectNextSearchTerm, setSelectNextSearchTerm, selectNextSearchRef, selectNextTimerRef, selectNextTriggerRef, handleOpenSelectNext };
}

// ── Sub-hook: Parallel select ─────────────────────────────────────────────

function useParallelSelect(objects: MasterObject[] | null | undefined) {
  const [isParallelSelectOpen, setIsParallelSelectOpen] = useState(false);
  const [parallelSelectTarget, setParallelSelectTarget] = useState<MasterObject | null>(null);
  const [parallelSelectSearch, setParallelSelectSearch] = useState('');
  const [parallelSelectedIds, setParallelSelectedIds] = useState<string[]>([]);
  const parallelSearchRef = useRef<HTMLInputElement>(null);
  const parallelSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parallelTriggerRef = useRef<HTMLElement | null>(null);

  const handleOpenParallelSelect = (obj: MasterObject) => {
    if (!objects) return;
    parallelTriggerRef.current = document.activeElement as HTMLElement;
    const myMajor = obj.parallelOrder ? parseSequence(obj.parallelOrder).major : 0;
    const currentMembers = myMajor > 0
      ? objects.filter(o => o.id !== obj.id && o.parallelOrder && parseSequence(o.parallelOrder).major === myMajor).map(o => o.id)
      : [];
    setParallelSelectTarget(obj);
    setParallelSelectedIds(currentMembers);
    setParallelSelectSearch('');
    setIsParallelSelectOpen(true);
  };

  return { isParallelSelectOpen, setIsParallelSelectOpen, parallelSelectTarget, setParallelSelectTarget, parallelSelectSearch, setParallelSelectSearch, parallelSelectedIds, setParallelSelectedIds, parallelSearchRef, parallelSearchTimerRef, parallelTriggerRef, handleOpenParallelSelect };
}

// ── Hook principal composto ───────────────────────────────────────────────

export function useObjectsReorder({
  db,
  reorderUniverseObjects: objects,
  toast,
  sortedFilteredObjects,
  sortMode: _sortMode,
  isAdmin,
  sequenceStore,
  refetchObjects,
}: UseObjectsReorderDeps) {
  const visual = useVisualDrag(sortedFilteredObjects);
  const batchRunner = useBatchRunner(db, toast);
  const selectNext = useSelectNext();
  const parallel = useParallelSelect(objects);
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [dragOverObjectId, setDragOverObjectId] = useState<string | null>(null);
  const [isMigrationDialogOpen, setIsMigrationDialogOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // ── Apply visual order ─────────────────────────────────────────────────
  const handleApplyVisualOrder = async () => {
    if (!db) return;
    try {
      const updated = visual.visualOrder.map((obj, i) => ({ ...obj, chargeOrder: formatSequence(i + 1, 0) }));
      const batch = writeBatch(db);
      let count = 0;
      for (let i = 0; i < updated.length; i++) {
        if (String(visual.visualOrder[i].chargeOrder) !== updated[i].chargeOrder) {
          const ref = sequenceDoc(db, sequenceStore, updated[i]);
          if (!ref && sequenceStore.kind === 'migration') {
            toast({ variant: 'destructive', description: 'OBJETO SEM VÍNCULO À MOCK PARA SALVAR SEQUÊNCIA.' });
            continue;
          }
          if (!ref) continue;
          batch.update(ref as any, { chargeOrder: updated[i].chargeOrder, updatedAt: serverTimestamp() });
          count++;
        }
      }
      if (count > 0) { await batch.commit(); visual.setVisualOrder(updated); toast({ description: `${count} OBJETO(S) REORDENADO(S) COM SUCESSO.` }); }
      else { toast({ description: 'NENHUMA ALTERAÇÃO NA ORDEM FOI DETECTADA.' }); }
    } catch {
      toast({ variant: 'destructive', description: 'ERRO AO SALVAR NOVA ORDEM. VERIFIQUE SUAS PERMISSÕES.' });
    } finally {
      visual.setIsVisualReorderMode(false);
    }
  };

  // ── Reset operations ───────────────────────────────────────────────────
  const handleResetApplyCurrentOrder = async () => {
    if (!objects?.length || !db || !isAdmin) return;
    const items = sortedFilteredObjects
      .map((obj, i) => {
        const newOrder = formatSequence(i + 1, 0);
        if (String(obj.chargeOrder) === newOrder) return null;
        const ref = sequenceDoc(db, sequenceStore, obj);
        if (!ref) return null;
        return { ref, data: { chargeOrder: newOrder, updatedAt: serverTimestamp() } };
      })
      .filter(Boolean) as { ref: any; data: any }[];
    await batchRunner.runWithProgress('Atualizando sequência com posição atual', items);
  };

  const handleResetFullClear = async () => {
    if (!objects?.length || !db || !isAdmin) return;
    const items = objects
      .map((obj) => {
        const ref = sequenceDoc(db, sequenceStore, obj);
        if (!ref) return null;
        return { ref, data: { chargeOrder: '', parallelOrder: '', chargeGroup: '', updatedAt: serverTimestamp() } };
      })
      .filter(Boolean) as { ref: any; data: any }[];
    await batchRunner.runWithProgress(
      sequenceStore.kind === 'migration' ? 'Reiniciando sequência desta mock' : 'Reiniciando sequência completa',
      items,
    );
  };

  // ── Perform reorder ────────────────────────────────────────────────────
  const performReorder = async (
    movingObject: MasterObject,
    targetOrder: string,
    targetId?: string,
    opts?: PerformReorderOptions,
  ): Promise<boolean> => {
    if (!objects?.length || !db) return false;
    if (!isValidSequence(targetOrder)) {
      toast({ variant: 'destructive', description: 'SEQUÊNCIA INVÁLIDA. USE O FORMATO XX.XX.' });
      return false;
    }

    const useListPosition = Boolean(opts?.orderedList?.length && !targetId);
    const reordered = useListPosition
      ? mergeListPositionIntoUniverse(objects, opts!.orderedList!, movingObject, targetOrder)
      : buildContiguousSequenceOrder(
          objects,
          movingObject,
          targetId
            ? { mode: 'before', anchorId: targetId }
            : { mode: 'atOrder', targetOrder },
        );

    const ok = await commitContiguousSequenceRenumber(
      db,
      sequenceStore,
      reordered,
      toast,
      'ERRO AO REORDENAR OBJETOS NO BANCO.',
      { forceRenumber: useListPosition },
    );
    if (ok) {
      refetchObjects?.();
      opts?.onMoved?.(movingObject.id);
    }
    return ok;
  };

  // ── Select Next confirm ────────────────────────────────────────────────
  const handleSelectNextConfirm = async (selectedObj: MasterObject) => {
    if (!selectNext.selectNextTargetObject || !objects?.length || !db) return;
    const target = selectNext.selectNextTargetObject;

    if (selectedObj.id === target.id) {
      toast({ variant: 'destructive', description: 'UM OBJETO NÃO PODE SER POSICIONADO APÓS SI MESMO.' });
      return;
    }

    const orderedList =
      sortedFilteredObjects.length > 0
        ? sortedFilteredObjects
        : [...objects].sort((a, b) => compareGestaoExecutionOrder(a, b));

    const targetIdx = orderedList.findIndex((o) => o.id === target.id);
    const nextInList = targetIdx !== -1 ? orderedList[targetIdx + 1] : undefined;
    if (nextInList?.id === selectedObj.id) {
      selectNext.setIsSelectNextOpen(false);
      selectNext.setSelectNextTargetObject(null);
      toast({ description: `"${selectedObj.name}" JÁ É O PRÓXIMO CARD APÓS "${target.name}".` });
      return;
    }

    const reordered = buildReorderAfterAnchorInList(
      objects,
      orderedList as MasterObject[],
      selectedObj,
      target.id,
    );

    selectNext.setIsSelectNextOpen(false);
    selectNext.setSelectNextTargetObject(null);

    const ok = await commitContiguousSequenceRenumber(
      db,
      sequenceStore,
      reordered,
      toast,
      'ERRO AO REORDENAR OBJETOS.',
      { forceRenumber: true },
    );
    if (ok) {
      refetchObjects?.();
    }
  };

  // ── Parallel save ──────────────────────────────────────────────────────
  const handleSaveParallelSelect = async () => {
    if (!parallel.parallelSelectTarget || !objects?.length || !db) return;
    const target = parallel.parallelSelectTarget;

    if (parallel.parallelSelectedIds.length === 0) {
      const ref = sequenceDoc(db, sequenceStore, target);
      if (!ref) {
        toast({ variant: 'destructive', description: 'ERRO AO REMOVER PARALELISMO DO OBJETO.' });
        return;
      }
      try {
        await writeBatch(db)
          .update(ref as any, { parallelOrder: '', isParallel: false, updatedAt: serverTimestamp() })
          .commit();
        refetchObjects?.();
        toast({ description: 'PARALELISMO REMOVIDO.' });
      } catch (err) {
        console.error('[handleSaveParallelSelect] remove', err);
        toast({ variant: 'destructive', description: 'ERRO AO REMOVER PARALELISMO.' });
      }
      parallel.setIsParallelSelectOpen(false);
      parallel.setParallelSelectTarget(null);
      return;
    }

    const existingMajor = target.parallelOrder ? parseSequence(target.parallelOrder).major : 0;
    const parallelMajor = existingMajor > 0 ? existingMajor : (() => {
      const withParallel = objects.filter((o) => o.parallelOrder && isValidSequence(o.parallelOrder));
      const maxMajor = withParallel.reduce((max, o) => Math.max(max, parseSequence(o.parallelOrder).major), 0);
      return maxMajor + 1;
    })();
    const prevMemberIds = objects
      .filter((o) => o.id !== target.id && o.parallelOrder && parseSequence(o.parallelOrder).major === parallelMajor)
      .map((o) => o.id);
    const newGroupIds = [target.id, ...parallel.parallelSelectedIds];
    const newGroupObjects = newGroupIds
      .map((id) => objects.find((o) => o.id === id))
      .filter(Boolean) as MasterObject[];
    const removedIds = prevMemberIds.filter((id) => !parallel.parallelSelectedIds.includes(id));

    const batch = writeBatch(db);
    let updateCount = 0;

    newGroupObjects.forEach((obj, idx) => {
      const ref = sequenceDoc(db, sequenceStore, obj);
      if (!ref) {
        console.error('[handleSaveParallelSelect] ref ausente', obj.id, obj.name);
        return;
      }
      batch.update(ref as any, {
        parallelOrder: formatSequence(parallelMajor, idx),
        isParallel: true,
        updatedAt: serverTimestamp(),
      });
      updateCount++;
    });
    removedIds.forEach((id) => {
      const row = objects.find((o) => o.id === id);
      if (!row) return;
      const ref = sequenceDoc(db, sequenceStore, row);
      if (!ref) return;
      batch.update(ref as any, { parallelOrder: '', isParallel: false, updatedAt: serverTimestamp() });
      updateCount++;
    });

    if (updateCount === 0) {
      toast({ variant: 'destructive', description: 'NENHUM OBJETO FOI ATUALIZADO. VERIFIQUE PERMISSÕES.' });
      return;
    }

    try {
      await batch.commit();
      refetchObjects?.();
      toast({
        description: `PARALELISMO CONFIGURADO: ${newGroupObjects.length} OBJETO(S) NO GRUPO ${String(parallelMajor).padStart(2, '0')}`,
      });
    } catch (err) {
      console.error('[handleSaveParallelSelect] commit', err);
      toast({ variant: 'destructive', description: 'ERRO AO CONFIGURAR PARALELISMO.' });
    }
    parallel.setIsParallelSelectOpen(false);
    parallel.setParallelSelectTarget(null);
  };

  // ── Migrate legacy sequences ───────────────────────────────────────────
  const handleMigrateSequences = async () => {
    if (!objects?.length || !db || !isAdmin) return;
    if (sequenceStore.kind === 'migration') {
      toast({ description: 'Migração de formato XX.XX aplica-se ao catálogo mestre inteiro — selecione o modo sem mock ou use outra tela.' });
      setIsMigrationDialogOpen(false);
      return;
    }
    setIsMigrating(true);
    try {
      const sorted = [...objects].sort((a, b) => { const na = typeof a.chargeOrder === 'number' ? a.chargeOrder : parseSequence(a.chargeOrder).major; const nb = typeof b.chargeOrder === 'number' ? b.chargeOrder : parseSequence(b.chargeOrder).major; return na - nb; });
      const majorMap = new Map<number, number>();
      let nextMajor = 1;
      const batch = writeBatch(db);
      let count = 0;
      sorted.forEach(obj => {
        const rawVal = obj.chargeOrder;
        if (typeof rawVal === 'string' && isValidSequence(rawVal)) return;
        const oldMajor = typeof rawVal === 'number' ? rawVal : parseSequence(rawVal).major;
        if (oldMajor === 0) return;
        if (!majorMap.has(oldMajor)) majorMap.set(oldMajor, nextMajor++);
        batch.update(doc(db, 'masterObjects', obj.id), { chargeOrder: formatSequence(majorMap.get(oldMajor)!, 0), updatedAt: serverTimestamp() });
        count++;
      });
      if (count > 0) { await batch.commit(); toast({ description: `MIGRAÇÃO CONCLUÍDA. ${count} OBJETO(S) CONVERTIDO(S) PARA O FORMATO XX.XX.` }); }
    } catch {
      toast({ variant: 'destructive', description: 'FALHA NA MIGRAÇÃO. VERIFIQUE SEU PERFIL ADMINISTRATIVO.' });
    } finally {
      setIsMigrating(false);
      setIsMigrationDialogOpen(false);
    }
  };

  return {
    isVisualReorderMode: visual.isVisualReorderMode, setIsVisualReorderMode: visual.setIsVisualReorderMode,
    visualOrder: visual.visualOrder, setVisualOrder: visual.setVisualOrder,
    visualDragId: visual.visualDragId, visualDragOverId: visual.visualDragOverId,
    draggedObjectId, setDraggedObjectId, dragOverObjectId, setDragOverObjectId,
    handleVisualDragStart: visual.handleVisualDragStart, handleVisualDragOver: visual.handleVisualDragOver, handleVisualDrop: visual.handleVisualDrop, handleApplyVisualOrder,
    isResetDialogOpen: batchRunner.isResetDialogOpen, setIsResetDialogOpen: batchRunner.setIsResetDialogOpen,
    progressState: batchRunner.progressState, setProgressState: batchRunner.setProgressState,
    handleResetApplyCurrentOrder, handleResetFullClear,
    performReorder,
    isSelectNextOpen: selectNext.isSelectNextOpen, setIsSelectNextOpen: selectNext.setIsSelectNextOpen,
    selectNextTargetObject: selectNext.selectNextTargetObject, selectNextSearchTerm: selectNext.selectNextSearchTerm, setSelectNextSearchTerm: selectNext.setSelectNextSearchTerm,
    selectNextSearchRef: selectNext.selectNextSearchRef, selectNextTimerRef: selectNext.selectNextTimerRef, selectNextTriggerRef: selectNext.selectNextTriggerRef,
    handleOpenSelectNext: selectNext.handleOpenSelectNext, handleSelectNextConfirm,
    isParallelSelectOpen: parallel.isParallelSelectOpen, setIsParallelSelectOpen: parallel.setIsParallelSelectOpen,
    parallelSelectTarget: parallel.parallelSelectTarget, parallelSelectSearch: parallel.parallelSelectSearch, setParallelSelectSearch: parallel.setParallelSelectSearch,
    parallelSelectedIds: parallel.parallelSelectedIds, setParallelSelectedIds: parallel.setParallelSelectedIds,
    parallelSearchRef: parallel.parallelSearchRef, parallelSearchTimerRef: parallel.parallelSearchTimerRef, parallelTriggerRef: parallel.parallelTriggerRef,
    handleOpenParallelSelect: parallel.handleOpenParallelSelect, handleSaveParallelSelect,
    isMigrationDialogOpen, setIsMigrationDialogOpen,
    isMigrating,
    handleMigrateSequences,
  };
}
