"use client";

import { useState, useRef } from 'react';
import { doc, serverTimestamp, updateDoc, writeBatch, type CompatDb } from '@/supabase/compat-db-shim';
import {
  parseSequence,
  formatSequence,
  isValidSequence,
  compareSequences,
  compareChargeSequenceGridOrder,
  compareGestaoExecutionOrder,
} from '@/lib/migration/sequence-utils';
import type { MasterObject } from '@/types/master-object';

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
  /** Atualização otimista imediata da grade (antes da persistência). */
  onReorderPreview?: (payload: ReorderPreviewPayload) => void;
  onReorderRollback?: () => void;
  /** Seleciona e rola até o card reposicionado. */
  onReorderMoved?: (objectId: string) => void;
}

export type ReorderPreviewPayload = {
  chargeOrders: Map<string, string>;
  /** Ordem dos ids na lista filtrada exibida — evita re-sort completo na UI. */
  visibleOrder?: string[];
  /** Ids persistidos no banco — usados para saber quando limpar o preview. */
  changedIds?: string[];
};

function notifyReorderMoved(
  objectId: string,
  opts: PerformReorderOptions | undefined,
  onReorderMoved: ((objectId: string) => void) | undefined,
) {
  opts?.onMoved?.(objectId);
  onReorderMoved?.(objectId);
}

export type PerformReorderOptions = {
  /** Lista exibida na grade — reordena por posição visual (01.00 = 1º card). */
  orderedList?: MasterObject[];
  onMoved?: (objectId: string) => void;
};

function buildCommittedChargeOrderMap(reordered: MasterObject[]): Map<string, string> {
  const map = new Map<string, string>();
  reordered.forEach((obj, idx) => {
    map.set(obj.id, formatSequence(idx + 1, 0));
  });
  return map;
}

function buildChangedChargeOrderMap(reordered: MasterObject[]): Map<string, string> {
  const map = new Map<string, string>();
  reordered.forEach((obj, idx) => {
    const newSeq = formatSequence(idx + 1, 0);
    if (String(obj.chargeOrder) !== newSeq) {
      map.set(obj.id, newSeq);
    }
  });
  return map;
}

function buildReorderPreviewPayload(
  reordered: MasterObject[],
  visibleOrder?: string[],
): ReorderPreviewPayload {
  return {
    chargeOrders: buildCommittedChargeOrderMap(reordered),
    visibleOrder,
    changedIds: [...buildChangedChargeOrderMap(reordered).keys()],
  };
}

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
): Promise<boolean> {
  const updates: Array<{
    ref: NonNullable<ReturnType<typeof sequenceDoc>>;
    chargeOrder: string;
  }> = [];

  reordered.forEach((obj, idx) => {
    const newSeq = formatSequence(idx + 1, 0);
    if (String(obj.chargeOrder) === newSeq) return;
    const ref = sequenceDoc(db, sequenceStore, obj);
    if (!ref) {
      console.error('[performReorder] documento não resolvido', obj.id, obj.name);
      return;
    }
    updates.push({ ref, chargeOrder: newSeq });
  });

  if (updates.length === 0) return true;

  try {
    await Promise.all(
      updates.map(({ ref, chargeOrder }) =>
        updateDoc(ref, { chargeOrder, updatedAt: serverTimestamp() }),
      ),
    );
    return true;
  } catch (err) {
    console.error('[performReorder] falha ao gravar sequência', err);
    const detail = err instanceof Error ? err.message : errorMessage;
    toast({ variant: 'destructive', description: detail || errorMessage });
    return false;
  }
}

// ── Sub-hook: Select Next ─────────────────────────────────────────────────

function useSelectNext() {
  const [isSelectNextOpen, setIsSelectNextOpen] = useState(false);
  const [selectNextTargetObject, setSelectNextTargetObject] = useState<MasterObject | null>(null);
  const [selectNextSearchTerm, setSelectNextSearchTerm] = useState('');
  const selectNextTriggerRef = useRef<HTMLElement | null>(null);

  const handleOpenSelectNext = (obj: MasterObject) => {
    selectNextTriggerRef.current = document.activeElement as HTMLElement;
    setSelectNextTargetObject(obj);
    setSelectNextSearchTerm('');
    setIsSelectNextOpen(true);
  };

  return { isSelectNextOpen, setIsSelectNextOpen, selectNextTargetObject, setSelectNextTargetObject, selectNextSearchTerm, setSelectNextSearchTerm, selectNextTriggerRef, handleOpenSelectNext };
}

// ── Sub-hook: Parallel select ─────────────────────────────────────────────

function useParallelSelect(objects: MasterObject[] | null | undefined) {
  const [isParallelSelectOpen, setIsParallelSelectOpen] = useState(false);
  const [parallelSelectTarget, setParallelSelectTarget] = useState<MasterObject | null>(null);
  const [parallelSelectSearch, setParallelSelectSearch] = useState('');
  const [parallelSelectedIds, setParallelSelectedIds] = useState<string[]>([]);
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

  return { isParallelSelectOpen, setIsParallelSelectOpen, parallelSelectTarget, setParallelSelectTarget, parallelSelectSearch, setParallelSelectSearch, parallelSelectedIds, setParallelSelectedIds, parallelTriggerRef, handleOpenParallelSelect };
}

// ── Hook principal composto ───────────────────────────────────────────────

export function useObjectsReorder({
  db,
  reorderUniverseObjects: objects,
  toast,
  sortedFilteredObjects,
  sortMode: _sortMode,
  isAdmin: _isAdmin,
  sequenceStore,
  refetchObjects,
  onReorderPreview,
  onReorderRollback,
  onReorderMoved,
}: UseObjectsReorderDeps) {
  const selectNext = useSelectNext();
  const parallel = useParallelSelect(objects);
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [dragOverObjectId, setDragOverObjectId] = useState<string | null>(null);

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

    const preview = buildReorderPreviewPayload(
      reordered,
      useListPosition
        ? buildContiguousSequenceOrderByListPosition(
            opts!.orderedList!,
            movingObject,
            targetOrder,
          ).map((row) => row.id)
        : undefined,
    );

    if (preview.changedIds?.length === 0) {
      notifyReorderMoved(movingObject.id, opts, onReorderMoved);
      return true;
    }

    onReorderPreview?.(preview);
    notifyReorderMoved(movingObject.id, opts, onReorderMoved);

    const ok = await commitContiguousSequenceRenumber(
      db,
      sequenceStore,
      reordered,
      toast,
      'ERRO AO REORDENAR OBJETOS NO BANCO.',
    );
    if (ok) {
      refetchObjects?.();
    } else {
      onReorderRollback?.();
    }
    return ok;
  };

  // ── Select Next confirm ────────────────────────────────────────────────
  const handleSelectNextConfirm = (selectedObj: MasterObject) => {
    if (!selectNext.selectNextTargetObject || !objects?.length || !db) return;
    const target = selectNext.selectNextTargetObject;

    if (selectedObj.id === target.id) {
      toast({ variant: 'destructive', description: 'UM OBJETO NÃO PODE SER POSICIONADO APÓS SI MESMO.' });
      return;
    }

    selectNext.setIsSelectNextOpen(false);
    selectNext.setSelectNextTargetObject(null);
    selectNext.setSelectNextSearchTerm('');

    queueMicrotask(() => {
      void (async () => {
        const orderedList =
          sortedFilteredObjects.length > 0
            ? sortedFilteredObjects
            : [...objects].sort((a, b) => compareGestaoExecutionOrder(a, b));

        const targetIdx = orderedList.findIndex((o) => o.id === target.id);
        const nextInList = targetIdx !== -1 ? orderedList[targetIdx + 1] : undefined;
        if (nextInList?.id === selectedObj.id) {
          toast({ description: `"${selectedObj.name}" JÁ É O PRÓXIMO CARD APÓS "${target.name}".` });
          return;
        }

        const reordered = buildReorderAfterAnchorInList(
          objects,
          orderedList as MasterObject[],
          selectedObj,
          target.id,
        );

        const preview = buildReorderPreviewPayload(reordered);

        if (preview.changedIds?.length === 0) {
          notifyReorderMoved(selectedObj.id, undefined, onReorderMoved);
          return;
        }

        onReorderPreview?.(preview);
        notifyReorderMoved(selectedObj.id, undefined, onReorderMoved);

        const ok = await commitContiguousSequenceRenumber(
          db,
          sequenceStore,
          reordered,
          toast,
          'ERRO AO REORDENAR OBJETOS.',
        );
        if (ok) {
          refetchObjects?.();
        } else {
          onReorderRollback?.();
        }
      })();
    });
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
      parallel.setIsParallelSelectOpen(false);
      parallel.setParallelSelectTarget(null);
      parallel.setParallelSelectSearch('');
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

    parallel.setIsParallelSelectOpen(false);
    parallel.setParallelSelectTarget(null);
    parallel.setParallelSelectSearch('');

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
  };

  return {
    draggedObjectId, setDraggedObjectId, dragOverObjectId, setDragOverObjectId,
    performReorder,
    isSelectNextOpen: selectNext.isSelectNextOpen, setIsSelectNextOpen: selectNext.setIsSelectNextOpen,
    selectNextTargetObject: selectNext.selectNextTargetObject, selectNextSearchTerm: selectNext.selectNextSearchTerm, setSelectNextSearchTerm: selectNext.setSelectNextSearchTerm,
    selectNextTriggerRef: selectNext.selectNextTriggerRef,
    handleOpenSelectNext: selectNext.handleOpenSelectNext, handleSelectNextConfirm,
    isParallelSelectOpen: parallel.isParallelSelectOpen, setIsParallelSelectOpen: parallel.setIsParallelSelectOpen,
    parallelSelectTarget: parallel.parallelSelectTarget, parallelSelectSearch: parallel.parallelSelectSearch, setParallelSelectSearch: parallel.setParallelSelectSearch,
    parallelSelectedIds: parallel.parallelSelectedIds, setParallelSelectedIds: parallel.setParallelSelectedIds,
    parallelTriggerRef: parallel.parallelTriggerRef,
    handleOpenParallelSelect: parallel.handleOpenParallelSelect, handleSaveParallelSelect,
  };
}
