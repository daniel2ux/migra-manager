import { useState, useRef, useCallback } from 'react';
import { doc, setDoc, serverTimestamp, writeBatch, type CompatDb } from '@/supabase/compat-db-shim';
import type { User } from '@/supabase/auth-shim';
import { deleteDocumentNonBlocking } from '@/supabase/mutations';
import { isValidSequence, resolveDisplayChargeOrder, resolveParallelPersistFlag, isObjectParallelLoad } from '@/lib/migration/sequence-utils';
import { useToast } from '@/hooks/use-toast';
import type { PerformReorderOptions } from './use-objects-reorder';
import type { MasterObject } from '@/types/master-object';
import { findMasterCatalogNameConflict, normalizeMasterCatalogName } from '@/lib/migration/master-catalog';
import {
  computeMasterCatalogGroupReflowUpdates,
  computeNextChargeOrderAfterLastCard,
  type MasterCatalogChargeReflowRow,
} from '@/lib/migration/master-catalog-charge-reflow';
import {
  buildParallelGroupPlan,
  expandParallelPeerIds,
  parallelOrderForGroupIndex,
} from '@/lib/migration/parallel-group-utils';
import {
  sameStringSet,
  syncObjectActivityGroupMembership,
} from '@/lib/migration/activity-group-sync';
import {
  findChargeGroupIdForObject,
  syncObjectChargeGroupMembership,
} from '@/lib/migration/charge-group-sync';
import type { ChargeGroup } from '@/types/charge-group';

type ToastFn = ReturnType<typeof useToast>['toast'];

interface ObjectFormData {
  name: string; description: string; chargeGroup: string; chargeOrder: string;
  parallelOrder: string; dependencyIds: string[]; externalDependencies: string[];
  type: string; status: string; isParallel: boolean; activityGroupIds: string[];
  parallelPeerIds: string[];
}

/** Validação antes de salvar o objeto mestre (mensagem para exibir no formulário). */
function getEditFormValidationError(
  formData: ObjectFormData,
  chargeOrderResolved: string
): string | null {
  if (!formData.name?.trim()) {
    return 'O nome do objeto é obrigatório.';
  }
  const co = chargeOrderResolved.trim();
  if (co && !isValidSequence(co)) {
    return 'Sequência de carga inválida. Use o formato XX.XX (ex.: 01.00).';
  }
  const po = formData.parallelOrder?.trim() ?? '';
  if (po && !isValidSequence(po)) {
    return 'Ordem de paralelismo inválida. Use o formato XX.XX.';
  }
  return null;
}

interface UseObjectsCRUDDeps {
  db: CompatDb | null; 
  user: User | null; 
  objects: MasterObject[] | null | undefined;
  /** Linhas de sequência no escopo atual (mock/catálogo) para sugerir próxima posição. */
  sequenceContextRows?: MasterObject[] | null | undefined;
  isAdmin: boolean;
  /** Governança (admin) ou Master — obrigatório para alterar status/grupos no card. */
  isAdminOrMaster: boolean;
  isMockLocked: boolean; 
  acquireLock: (path: string, force?: boolean) => Promise<{ acquired: boolean; lockedByName?: string }>;
  releaseLock: (path: string) => void; 
  toast: ToastFn;
  quickFormData: ObjectFormData; 
  setQuickFormData: React.Dispatch<React.SetStateAction<ObjectFormData>>;
  editFormData: ObjectFormData; 
  setEditFormData: React.Dispatch<React.SetStateAction<ObjectFormData>>;
  usageMap: Record<string, Set<string>>; 
  extractChargeOrderDisplay: (order: string | number | undefined) => string;
  performReorder: (
    obj: MasterObject,
    targetOrder: string,
    targetId?: string,
    opts?: PerformReorderOptions,
  ) => Promise<boolean>;
  editingObject: MasterObject | null;
  setEditingObject: (obj: MasterObject | null) => void;
  refetchObjects?: () => void;
  refetchChargeGroups?: () => void | Promise<void>;
  chargeGroups?: ChargeGroup[];
  displayChargeOrderById?: ReadonlyMap<string, string>;
  reorderDisplayList?: MasterObject[];
  projectId?: string | null;
  canRegisterObjects?: boolean;
}

function resolveFormChargeOrder(
  obj: MasterObject,
  displayChargeOrderById: ReadonlyMap<string, string> | undefined,
  extractChargeOrderDisplay: (order: string | number | undefined) => string,
): string {
  const resolved = resolveDisplayChargeOrder(obj.id, obj.chargeOrder, displayChargeOrderById);
  return extractChargeOrderDisplay(resolved ?? obj.chargeOrder);
}

function buildObjectFormFromMaster(
  obj: MasterObject,
  displayChargeOrderById: ReadonlyMap<string, string> | undefined,
  extractChargeOrderDisplay: (order: string | number | undefined) => string,
  overrides?: Partial<ObjectFormData>,
): ObjectFormData {
  return {
    name: obj.name,
    description: obj.description ?? '',
    chargeGroup: obj.chargeGroup || '',
    chargeOrder: resolveFormChargeOrder(obj, displayChargeOrderById, extractChargeOrderDisplay),
    parallelOrder: obj.parallelOrder && isValidSequence(obj.parallelOrder) ? String(obj.parallelOrder) : '',
    dependencyIds: obj.dependencyIds || [],
    externalDependencies: obj.externalDependencies || [],
    type: obj.type || 'SCRIPT',
    status: obj.status || 'ATIVO',
    isParallel: isObjectParallelLoad(obj),
    activityGroupIds: obj.activityGroupIds || [],
    parallelPeerIds: [],
    ...overrides,
  };
}

function sameStringArray(a: string[] = [], b: string[] = []): boolean {
  return sameStringSet(a, b);
}

async function persistMasterInactiveReflow(
  db: CompatDb,
  target: MasterObject,
  form: ObjectFormData,
  objects: MasterObject[] | null | undefined,
  displayChargeOrderById: ReadonlyMap<string, string> | undefined,
  extractChargeOrderDisplay: (order: string | number | undefined) => string,
  refetchObjects?: () => void,
): Promise<void> {
  const chargeOrderVal = resolveFormChargeOrder(target, displayChargeOrderById, extractChargeOrderDisplay).trim();
  const newGroup = (target.chargeGroup || 'G').toUpperCase();
  const oldGroup = newGroup;
  const oldOrderDisplayed = chargeOrderVal;
  const extDepList = form.externalDependencies || [];
  const patched = buildPatchedMasterForReflow(
    target,
    form,
    newGroup,
    chargeOrderVal,
    oldOrderDisplayed,
    extDepList,
  );
  const listWithPatch = (objects ?? []).map((o) => (o.id === target.id ? patched : o));
  const oldRows =
    oldGroup !== newGroup
      ? computeMasterCatalogGroupReflowUpdates(objects ?? [], oldGroup, { excludeId: target.id })
      : [];
  const newRows = computeMasterCatalogGroupReflowUpdates(listWithPatch, newGroup, { patched });
  const rowMap = mergeReflowRows(oldRows, newRows);

  const batch = writeBatch(db);
  for (const row of rowMap.values()) {
    if (row.id === target.id) continue;
    batch.update(doc(db, 'masterObjects', row.id), {
      chargeOrder: row.data.chargeOrder,
      chargeGroup: row.data.chargeGroup,
      updatedAt: serverTimestamp(),
    });
  }
  const selfRow = rowMap.get(target.id);
  batch.set(
    doc(db, 'masterObjects', target.id),
    {
      name: patched.name,
      description: patched.description,
      chargeGroup: newGroup,
      chargeOrder: selfRow?.data.chargeOrder ?? (chargeOrderVal || oldOrderDisplayed),
      parallelOrder: patched.parallelOrder,
      dependencyIds: patched.dependencyIds,
      externalDependencies: patched.externalDependencies,
      type: patched.type,
      status: patched.status,
      isParallel: patched.isParallel,
      activityGroupIds: patched.activityGroupIds,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
  refetchObjects?.();
}

// ── Sub-hook: Quick create helpers ────────────────────────────────────────

function mergeReflowRows(
  oldRows: MasterCatalogChargeReflowRow[],
  newRows: MasterCatalogChargeReflowRow[],
): Map<string, MasterCatalogChargeReflowRow> {
  const map = new Map<string, MasterCatalogChargeReflowRow>();
  for (const r of oldRows) map.set(r.id, r);
  for (const r of newRows) map.set(r.id, r);
  return map;
}

function buildPatchedMasterForReflow(
  editingObject: MasterObject,
  editFormData: ObjectFormData,
  newGroup: string,
  chargeOrderVal: string,
  oldOrder: string,
  externalDependencies: string[],
): MasterObject {
  return {
    ...editingObject,
    name: editFormData.name.trim().toUpperCase(),
    description: editFormData.description.toUpperCase(),
    chargeGroup: newGroup,
    chargeOrder: chargeOrderVal || String(oldOrder || ''),
    parallelOrder: editFormData.parallelOrder || '',
    dependencyIds: editFormData.dependencyIds,
    externalDependencies,
    type: editFormData.type as MasterObject['type'],
    status: editFormData.status as MasterObject['status'],
    isParallel: resolveParallelPersistFlag(editFormData.isParallel, editFormData.parallelOrder),
    activityGroupIds: editFormData.activityGroupIds ?? [],
  };
}

async function commitQuickCreateParallelGroup(
  db: CompatDb,
  plan: NonNullable<ReturnType<typeof buildParallelGroupPlan>>,
) {
  const batch = writeBatch(db);
  plan.memberIds.forEach((id, idx) => {
    batch.update(doc(db, 'masterObjects', id), {
      parallelOrder: parallelOrderForGroupIndex(plan.parallelMajor, idx),
      isParallel: true,
      updatedAt: serverTimestamp(),
    });
  });
  plan.removedFromGroupIds.forEach((id) => {
    batch.update(doc(db, 'masterObjects', id), {
      parallelOrder: '',
      isParallel: false,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

// ── Sub-hook: Quick create ────────────────────────────────────────────────

function useQuickCreate(
  db: CompatDb | null, 
  user: User | null, 
  isAdmin: boolean, 
  objects: MasterObject[] | null | undefined,
  sequenceContextRows: MasterObject[] | null | undefined,
  quickFormData: ObjectFormData, 
  setQuickFormData: React.Dispatch<React.SetStateAction<ObjectFormData>>, 
  toast: ToastFn,
  refetchObjects?: () => void,
  projectId: string | null = null,
  canRegisterObjects = false,
) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  const handleSave = async (e?: React.FormEvent, stayOpen = false, patch?: Partial<ObjectFormData>) => {
    const form = { ...quickFormData, ...patch };
    if (!isAdmin || !db || !user) return;
    if (!canRegisterObjects || !projectId) {
      toast({
        variant: 'destructive',
        description: 'CADASTRE A EMPRESA NO PROJETO ANTES DE CRIAR OBJETOS NO CATÁLOGO.',
      });
      return;
    }
    if (!form.name) {
      toast({ variant: 'destructive', description: 'O NOME DO OBJETO É OBRIGATÓRIO.' });
      return;
    }
    if (findMasterCatalogNameConflict(objects, form.name, undefined)) {
      toast({
        variant: 'destructive',
        description: `JÁ EXISTE UM OBJETO MESTRE COM O NOME "${normalizeMasterCatalogName(form.name)}". ESCOLHA OUTRO NOME.`,
      });
      return;
    }
    if (e) e.preventDefault();
    const objectId = crypto.randomUUID();
    const groupUpper = (form.chargeGroup || 'G').toUpperCase();
    const sequenceRows =
      sequenceContextRows && sequenceContextRows.length > 0
        ? sequenceContextRows
        : (objects ?? []);
    const autoChargeOrder = computeNextChargeOrderAfterLastCard(sequenceRows);
    const catalogRows = objects ?? [];
    const parallelPeerIds = expandParallelPeerIds(
      catalogRows,
      (form.parallelPeerIds ?? []).filter((id) => id !== objectId),
      objectId,
    );
    const parallelPlan = parallelPeerIds.length > 0 && form.status !== 'INATIVO'
      ? buildParallelGroupPlan(catalogRows, objectId, parallelPeerIds)
      : null;
    const hasParallelPeers = Boolean(parallelPlan);
    const autoParallelOrder = parallelPlan
      ? parallelOrderForGroupIndex(parallelPlan.parallelMajor, 0)
      : '';
    const autoIsParallel = hasParallelPeers;

    if (form.status === 'INATIVO') {
      const newMaster = {
        id: objectId,
        name: form.name.trim().toUpperCase(),
        description: form.description.toUpperCase(),
        chargeGroup: groupUpper,
        chargeOrder: autoChargeOrder,
        parallelOrder: '',
        dependencyIds: form.dependencyIds,
        externalDependencies: form.externalDependencies,
        type: form.type as MasterObject['type'],
        status: 'INATIVO' as const,
        isParallel: false,
        activityGroupIds: form.activityGroupIds ?? [],
      } satisfies MasterObject;
      const listWithNew = [...(objects ?? []), newMaster];
      const rows = computeMasterCatalogGroupReflowUpdates(listWithNew, groupUpper, { patched: newMaster });
      const selfRow = rows.find((r) => r.id === objectId);
      try {
        const batch = writeBatch(db);
        batch.set(
          doc(db, 'masterObjects', objectId),
          {
            id: objectId,
            name: newMaster.name,
            description: newMaster.description,
            chargeGroup: selfRow?.data.chargeGroup ?? groupUpper,
            chargeOrder: selfRow?.data.chargeOrder ?? newMaster.chargeOrder,
            parallelOrder: newMaster.parallelOrder,
            dependencyIds: newMaster.dependencyIds,
            externalDependencies: newMaster.externalDependencies,
            type: newMaster.type,
            status: newMaster.status,
            isParallel: newMaster.isParallel,
            activityGroupIds: newMaster.activityGroupIds,
            ownerId: user.uid,
            projectId,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        for (const r of rows) {
          if (r.id === objectId) continue;
          batch.update(doc(db, 'masterObjects', r.id), {
            chargeOrder: r.data.chargeOrder,
            chargeGroup: r.data.chargeGroup,
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } catch (err) {
        console.error('[useQuickCreate] save INATIVO', err);
        toast({ variant: 'destructive', description: 'ERRO AO SALVAR OBJETO OU REORDENAR SEQUÊNCIA.' });
        return;
      }
    } else {
      try {
        await setDoc(
          doc(db, 'masterObjects', objectId),
          {
            id: objectId,
            name: form.name.trim().toUpperCase(),
            description: form.description.toUpperCase(),
            chargeGroup: groupUpper,
            chargeOrder: autoChargeOrder,
            parallelOrder: autoParallelOrder,
            dependencyIds: form.dependencyIds,
            externalDependencies: form.externalDependencies,
            type: form.type,
            status: form.status,
            isParallel: autoIsParallel,
            activityGroupIds: form.activityGroupIds ?? [],
            ownerId: user.uid,
            projectId,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        if (hasParallelPeers && parallelPlan) {
          await commitQuickCreateParallelGroup(db, parallelPlan);
        }
      } catch (err) {
        console.error('[useQuickCreate] save ATIVO', err);
        const msg = err instanceof Error ? err.message : 'ERRO DESCONHECIDO';
        toast({ variant: 'destructive', description: `ERRO AO SALVAR OBJETO NO CATÁLOGO: ${msg}` });
        return;
      }
    }

    const quickActivityGroupIds = form.activityGroupIds ?? [];
    if (quickActivityGroupIds.length > 0) {
      try {
        await syncObjectActivityGroupMembership(db, objectId, [], quickActivityGroupIds);
      } catch (syncErr) {
        console.error('[useQuickCreate] sync activity groups', syncErr);
        toast({
          variant: 'destructive',
          description: 'OBJETO SALVO, MAS FALHA AO SINCRONIZAR GRUPOS DE ATIVIDADE.',
        });
      }
    }

    refetchObjects?.();
    setQuickFormData({
      name: '',
      description: '',
      chargeGroup: '',
      chargeOrder: '',
      parallelOrder: '',
      dependencyIds: [],
      externalDependencies: [],
      type: 'SCRIPT',
      status: 'ATIVO',
      isParallel: false,
      activityGroupIds: [],
      parallelPeerIds: [],
    });
    if (!stayOpen) setIsQuickCreateOpen(false);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  return { isQuickCreateOpen, setIsQuickCreateOpen, nameInputRef, handleSave };
}

// ── Sub-hook: Edit dialog ─────────────────────────────────────────────────

function useEditDialog(
  db: CompatDb | null, 
  user: User | null, 
  isAdmin: boolean, 
  isMockLocked: boolean, 
  objects: MasterObject[] | null | undefined,
  editFormData: ObjectFormData, 
  setEditFormData: React.Dispatch<React.SetStateAction<ObjectFormData>>, 
  editingObject: MasterObject | null, 
  setEditingObject: (obj: MasterObject | null) => void, 
  acquireLock: (path: string, force?: boolean) => Promise<{ acquired: boolean; lockedByName?: string }>, 
  releaseLock: (path: string) => void, 
  performReorder: (
    obj: MasterObject,
    targetOrder: string,
    targetId?: string,
    opts?: PerformReorderOptions,
  ) => Promise<boolean>,
  extractChargeOrderDisplay: (order: string | number | undefined) => string,
  toast: ToastFn,
  refetchObjects?: () => void,
  displayChargeOrderById?: ReadonlyMap<string, string>,
  reorderDisplayList?: MasterObject[],
) {
  const [open, setOpenState] = useState(false);
  const editOpenSeqRef = useRef(0);
  const [isForceLockOpen, setIsForceLockOpen] = useState(false);
  const [forceLockTarget, setForceLockTarget] = useState<MasterObject | null>(null);
  const [forceLockBlockerName, setForceLockBlockerName] = useState<string | null>(null);
  const [editSaveError, setEditSaveError] = useState<string | null>(null);

  const setOpen = useCallback((value: boolean) => {
    if (!value) editOpenSeqRef.current += 1;
    setOpenState(value);
  }, []);

  const buildFormData = (obj: MasterObject): ObjectFormData => ({
    name: obj.name, description: obj.description ?? '', chargeGroup: obj.chargeGroup || '',
    chargeOrder: resolveFormChargeOrder(obj, displayChargeOrderById, extractChargeOrderDisplay),
    parallelOrder: (obj.parallelOrder && isValidSequence(obj.parallelOrder)) ? String(obj.parallelOrder) : '',
    dependencyIds: obj.dependencyIds || [], externalDependencies: obj.externalDependencies || [],
    type: obj.type || 'SCRIPT', status: obj.status || 'ATIVO', isParallel: isObjectParallelLoad(obj), activityGroupIds: obj.activityGroupIds || [],
    parallelPeerIds: [],
  });

  const handleOpen = async (obj: MasterObject, viewOnly = false) => {
    if (!isAdmin) return;
    setEditSaveError(null);
    if (isMockLocked && !viewOnly) return;

    setEditingObject(obj);
    setEditFormData(buildFormData(obj));

    if (viewOnly) {
      setOpen(true);
      return;
    }

    const seq = ++editOpenSeqRef.current;
    setOpen(true);

    const resourceId = `masterObjects/${obj.id}`;
    const { acquired, lockedByName: blocker } = await acquireLock(resourceId);

    if (seq !== editOpenSeqRef.current) {
      if (acquired) releaseLock(resourceId);
      return;
    }

    if (!acquired) {
      setOpen(false);
      setEditingObject(null);
      setForceLockTarget(obj);
      setForceLockBlockerName(blocker || 'Outro usuário');
      setIsForceLockOpen(true);
    }
  };

  const clearEditSaveError = useCallback(() => setEditSaveError(null), []);

  const handleSave = async (patch?: Partial<ObjectFormData>) => {
    if (!isAdmin || isMockLocked || !user || !editingObject || !db) return;
    setEditSaveError(null);
    const catalogOrder = resolveFormChargeOrder(
      editingObject,
      displayChargeOrderById,
      extractChargeOrderDisplay,
    );
    const form = {
      ...editFormData,
      ...patch,
      name: editingObject.name,
      chargeGroup: editingObject.chargeGroup || '',
      chargeOrder: catalogOrder,
    };
    const chargeOrderVal = catalogOrder.trim();
    const validationErr = getEditFormValidationError(form, chargeOrderVal);
    if (validationErr) {
      setEditSaveError(validationErr);
      return;
    }
    if (findMasterCatalogNameConflict(objects, form.name, editingObject.id)) {
      setEditSaveError(
        `Já existe outro objeto mestre com o nome "${normalizeMasterCatalogName(form.name)}". Escolha outro nome.`,
      );
      return;
    }
    const oldOrderDisplayed = resolveFormChargeOrder(editingObject, displayChargeOrderById, extractChargeOrderDisplay);
    const newOrder = chargeOrderVal;
    const newGroup = (form.chargeGroup || 'G').toUpperCase();
    const oldGroup = (editingObject.chargeGroup || 'G').toUpperCase();
    const orderChanged = oldOrderDisplayed !== newOrder && newOrder !== '';
    const extDepList = form.externalDependencies || [];

    if (form.status === 'INATIVO') {
      const patched = buildPatchedMasterForReflow(
        editingObject,
        form,
        newGroup,
        chargeOrderVal,
        oldOrderDisplayed,
        extDepList,
      );
      const listWithPatch = (objects ?? []).map((o) => (o.id === editingObject.id ? patched : o));
      const oldRows =
        oldGroup !== newGroup
          ? computeMasterCatalogGroupReflowUpdates(objects ?? [], oldGroup, { excludeId: editingObject.id })
          : [];
      const newRows = computeMasterCatalogGroupReflowUpdates(listWithPatch, newGroup, { patched });
      const rowMap = mergeReflowRows(oldRows, newRows);

      try {
        const batch = writeBatch(db);
        for (const row of rowMap.values()) {
          if (row.id === editingObject.id) continue;
          batch.update(doc(db, 'masterObjects', row.id), {
            chargeOrder: row.data.chargeOrder,
            chargeGroup: row.data.chargeGroup,
            updatedAt: serverTimestamp(),
          });
        }
        const selfRow = rowMap.get(editingObject.id);
        batch.set(
          doc(db, 'masterObjects', editingObject.id),
          {
            name: patched.name,
            description: patched.description,
            chargeGroup: newGroup,
            chargeOrder: selfRow?.data.chargeOrder ?? (chargeOrderVal || oldOrderDisplayed),
            parallelOrder: patched.parallelOrder,
            dependencyIds: patched.dependencyIds,
            externalDependencies: patched.externalDependencies,
            type: patched.type,
            status: patched.status,
            isParallel: patched.isParallel,
            activityGroupIds: patched.activityGroupIds,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        await batch.commit();
        try {
          await syncObjectActivityGroupMembership(
            db,
            editingObject.id,
            editingObject.activityGroupIds ?? [],
            form.activityGroupIds ?? [],
          );
        } catch (syncErr) {
          console.error('[useEditDialog] sync activity groups INATIVO', syncErr);
        }
        refetchObjects?.();
        toast({
          description:
            'OBJETO ATUALIZADO. SEQUÊNCIA DE CARGA DO(S) GRUPO(S) REORGANIZADA — OBJETOS INATIVOS AO FINAL.',
        });
      } catch (err) {
        console.error('[useEditDialog] save INATIVO', err);
        const msg = err instanceof Error ? err.message : 'ERRO DESCONHECIDO';
        setEditSaveError(`Erro ao salvar: ${msg}`);
        toast({ variant: 'destructive', description: 'ERRO AO SALVAR OU REORDENAR SEQUÊNCIA DE CARGA.' });
        return;
      }
      setEditSaveError(null);
      releaseLock(`masterObjects/${editingObject.id}`);
      setOpen(false);
      return;
    }

    const savePayload = {
      name: form.name.trim().toUpperCase(),
      description: form.description.toUpperCase(),
      chargeGroup: newGroup,
      ...(orderChanged ? {} : { chargeOrder: newOrder || oldOrderDisplayed }),
      parallelOrder: form.parallelOrder || '',
      dependencyIds: form.dependencyIds,
      externalDependencies: extDepList,
      type: form.type,
      status: form.status,
      isParallel: resolveParallelPersistFlag(form.isParallel, form.parallelOrder),
      activityGroupIds: form.activityGroupIds,
      updatedAt: serverTimestamp(),
    };

    try {
      if (orderChanged) {
        await performReorder(
          { ...editingObject, chargeGroup: newGroup, chargeOrder: oldOrderDisplayed, isParallel: resolveParallelPersistFlag(form.isParallel, form.parallelOrder) },
          newOrder,
          undefined,
          {
            orderedList: displayChargeOrderById ? reorderDisplayList : undefined,
          },
        );
      }
      await setDoc(doc(db, 'masterObjects', editingObject.id), savePayload, { merge: true });
      try {
        await syncObjectActivityGroupMembership(
          db,
          editingObject.id,
          editingObject.activityGroupIds ?? [],
          form.activityGroupIds ?? [],
        );
      } catch (syncErr) {
        console.error('[useEditDialog] sync activity groups', syncErr);
      }
      refetchObjects?.();
      toast({ description: 'OBJETO ATUALIZADO COM SUCESSO.' });
    } catch (err) {
      console.error('[useEditDialog] save', err);
      const msg = err instanceof Error ? err.message : 'ERRO DESCONHECIDO';
      setEditSaveError(`Erro ao salvar: ${msg}`);
      toast({ variant: 'destructive', description: `ERRO AO SALVAR OBJETO: ${msg}` });
      return;
    }
    setEditSaveError(null);
    releaseLock(`masterObjects/${editingObject.id}`);
    setOpen(false);
  };

  const handleForceAcquire = async () => {
    if (!forceLockTarget || !isAdmin) return;
    setIsForceLockOpen(false);
    const { acquired, lockedByName: blocker } = await acquireLock(`masterObjects/${forceLockTarget.id}`, true);
    if (acquired) handleOpen(forceLockTarget);
    else toast({ variant: 'destructive', description: `FALHA AO FORÇAR LIBERAÇÃO: ${blocker || 'Desconhecido'}` });
    setForceLockTarget(null); setForceLockBlockerName(null);
  };

  return {
    open,
    setOpen,
    isForceLockOpen,
    setIsForceLockOpen,
    forceLockTarget,
    forceLockBlockerName,
    handleOpen,
    handleSave,
    handleForceAcquire,
    editSaveError,
    clearEditSaveError,
  };
}

// ── Hook principal composto ───────────────────────────────────────────────

export function useObjectsCRUD(deps: UseObjectsCRUDDeps) {
  const { db, user, isAdmin, usageMap, toast } = deps;
  const quick = useQuickCreate(
    db,
    user,
    isAdmin,
    deps.objects,
    deps.sequenceContextRows,
    deps.quickFormData,
    deps.setQuickFormData,
    toast,
    deps.refetchObjects,
    deps.projectId ?? null,
    deps.canRegisterObjects ?? false,
  );
  const edit = useEditDialog(db, user, isAdmin, deps.isMockLocked, deps.objects, deps.editFormData, deps.setEditFormData, deps.editingObject, deps.setEditingObject, deps.acquireLock, deps.releaseLock, deps.performReorder, deps.extractChargeOrderDisplay, toast, deps.refetchObjects, deps.displayChargeOrderById, deps.reorderDisplayList);

  const handlePatchMaster = async (
    target: MasterObject,
    patch: {
      status?: string;
      activityGroupIds?: string[];
      chargeGroupId?: string | null;
      type?: string;
    },
  ) => {
    if (!db || deps.isMockLocked) return;

    if (patch.chargeGroupId !== undefined) {
      if (!deps.isAdminOrMaster) return;
      const groups = deps.chargeGroups ?? [];
      const currentGroupId = findChargeGroupIdForObject(target.id, groups);
      const nextGroupId = patch.chargeGroupId;
      if (currentGroupId === nextGroupId) return;
      try {
        await syncObjectChargeGroupMembership(db, target.id, nextGroupId, groups);
        await deps.refetchChargeGroups?.();
        deps.refetchObjects?.();
        toast({ description: 'GRUPO DE CARGA ATUALIZADO.' });
      } catch (err) {
        console.error('[useObjectsCRUD] patch chargeGroupId', err);
        const msg = err instanceof Error ? err.message : 'ERRO DESCONHECIDO';
        toast({ variant: 'destructive', description: `ERRO AO ATUALIZAR GRUPO: ${msg}` });
      }
      return;
    }

    if (patch.type !== undefined) {
      if (!isAdmin || !deps.isAdminOrMaster) return;
      const nextType = (patch.type || 'SCRIPT') as MasterObject['type'];
      const currentType = (target.type || 'SCRIPT') as MasterObject['type'];
      if (nextType === currentType) return;
      try {
        await setDoc(
          doc(db, 'masterObjects', target.id),
          { type: nextType, updatedAt: serverTimestamp() },
          { merge: true },
        );
        deps.refetchObjects?.();
      } catch (err) {
        console.error('[useObjectsCRUD] patch type', err);
        const msg = err instanceof Error ? err.message : 'ERRO DESCONHECIDO';
        toast({ variant: 'destructive', description: `ERRO AO ATUALIZAR TIPO: ${msg}` });
      }
      return;
    }

    if (!isAdmin || !deps.isAdminOrMaster) return;

    if (patch.activityGroupIds !== undefined) {
      const current = target.activityGroupIds ?? [];
      if (sameStringArray(patch.activityGroupIds, current)) return;
      try {
        await syncObjectActivityGroupMembership(
          db,
          target.id,
          current,
          patch.activityGroupIds,
        );
        deps.refetchObjects?.();
        toast({ description: 'GRUPOS DE ATIVIDADE ATUALIZADOS.' });
      } catch (err) {
        console.error('[useObjectsCRUD] patch activityGroupIds', err);
        const msg = err instanceof Error ? err.message : 'ERRO DESCONHECIDO';
        toast({ variant: 'destructive', description: `ERRO AO ATUALIZAR GRUPOS: ${msg}` });
      }
      return;
    }

    if (patch.status === undefined) return;
    const currentStatus = (target.status || 'ATIVO').trim().toUpperCase();
    const nextStatus = patch.status.trim().toUpperCase();
    if (nextStatus === currentStatus) return;

    const form = buildObjectFormFromMaster(
      target,
      deps.displayChargeOrderById,
      deps.extractChargeOrderDisplay,
      { status: nextStatus },
    );

    try {
      if (nextStatus === 'INATIVO') {
        await persistMasterInactiveReflow(
          db,
          target,
          form,
          deps.objects,
          deps.displayChargeOrderById,
          deps.extractChargeOrderDisplay,
          deps.refetchObjects,
        );
        toast({
          description:
            'OBJETO INATIVADO. SEQUÊNCIA DE CARGA DO(S) GRUPO(S) REORGANIZADA — OBJETOS INATIVOS AO FINAL.',
        });
        return;
      }

      await setDoc(
        doc(db, 'masterObjects', target.id),
        { status: nextStatus, updatedAt: serverTimestamp() },
        { merge: true },
      );
      deps.refetchObjects?.();
      toast({ description: 'STATUS ATUALIZADO.' });
    } catch (err) {
      console.error('[useObjectsCRUD] patch status', err);
      const msg = err instanceof Error ? err.message : 'ERRO DESCONHECIDO';
      toast({ variant: 'destructive', description: `ERRO AO ATUALIZAR STATUS: ${msg}` });
    }
  };

  const handleDelete = (id: string) => {
    if (!isAdmin || !db) return;
    const target = deps.objects?.find((o) => o.id === id);
    if (target?.status !== "INATIVO") {
      toast({
        variant: "destructive",
        title: "EXCLUSÃO BLOQUEADA",
        description: "SÓ É POSSÍVEL EXCLUIR OBJETOS COM STATUS INATIVO. INATIVE O OBJETO NO EDITOR E TENTE NOVAMENTE.",
      });
      return;
    }
    if (usageMap[id]?.size > 0) {
      toast({ variant: 'destructive', title: 'OBJETO EM USO', description: 'NÃO É POSSÍVEL EXCLUIR ESTE OBJETO POIS ELE ESTÁ VINCULADO A UM OU MAIS PROJETOS.' });
      return;
    }
    deleteDocumentNonBlocking(doc(db, 'masterObjects', id));
    toast({ description: 'OBJETO REMOVIDO DO CATÁLOGO.' });
  };

  return {
    open: edit.open, setOpen: edit.setOpen,
    isQuickCreateOpen: quick.isQuickCreateOpen, setIsQuickCreateOpen: quick.setIsQuickCreateOpen,
    isForceLockOpen: edit.isForceLockOpen, setIsForceLockOpen: edit.setIsForceLockOpen,
    forceLockTarget: edit.forceLockTarget, forceLockBlockerName: edit.forceLockBlockerName,
    nameInputRef: quick.nameInputRef,
    editSaveError: edit.editSaveError, clearEditSaveError: edit.clearEditSaveError,
    handleSaveQuick: quick.handleSave, handleSaveEdit: edit.handleSave, handleDelete,
    handlePatchMaster,
    handleOpenEditDialog: edit.handleOpen, handleForceAcquire: edit.handleForceAcquire,
  };
}

