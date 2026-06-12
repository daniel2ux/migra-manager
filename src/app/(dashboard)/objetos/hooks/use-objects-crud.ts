import { useState, useRef, useCallback } from 'react';
import { doc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/supabase/mutations';
import { aiDescriptionGenerator } from '@/ai/flows/ai-description-generator';
import { isValidSequence } from '@/lib/migration/sequence-utils';
import { generateShortId } from '@/lib/id-utils';
import { useToast } from '@/hooks/use-toast';
import type { MasterObject } from '../components/object-card';
import { findMasterCatalogNameConflict, normalizeMasterCatalogName } from '@/lib/migration/master-catalog';
import {
  computeMasterCatalogGroupReflowUpdates,
  type MasterCatalogChargeReflowRow,
} from '@/lib/migration/master-catalog-charge-reflow';

type ToastFn = ReturnType<typeof useToast>['toast'];

interface ObjectFormData {
  name: string; description: string; chargeGroup: string; chargeOrder: string;
  parallelOrder: string; dependencyIds: string[]; externalDependencies: string[];
  type: string; status: string; isParallel: boolean; activityGroupIds: string[];
}

/** Validação antes de salvar o objeto mestre (mensagem para exibir no formulário). */
export function getEditFormValidationError(
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
  db: Firestore | null; 
  user: User | null; 
  objects: MasterObject[] | null | undefined; 
  isAdmin: boolean;
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
  performReorder: (obj: MasterObject, targetOrder: string) => Promise<void>;
  editingObject: MasterObject | null; 
  setEditingObject: (obj: MasterObject | null) => void;
}

// ── Sub-hook: Validation ──────────────────────────────────────────────────

function useFormValidation(formData: ObjectFormData, toast: ToastFn) {
  const validateQuick = (): boolean => {
    if (!formData.name) { toast({ variant: 'destructive', description: 'O NOME DO OBJETO É OBRIGATÓRIO.' }); return false; }
    if (formData.chargeOrder && !isValidSequence(formData.chargeOrder)) {
      toast({ variant: 'destructive', description: 'SEQUÊNCIA INVÁLIDA. USE O FORMATO XX.XX (EX: 01.00).' });
      return false;
    }
    if (formData.parallelOrder && !isValidSequence(formData.parallelOrder)) {
      toast({ variant: 'destructive', description: 'ORDEM PARALELA INVÁLIDA. USE O FORMATO XX.XX (EX: 01.00).' });
      return false;
    }
    return true;
  };
  return { validateQuick };
}

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
    isParallel: editFormData.isParallel,
    activityGroupIds: editFormData.activityGroupIds ?? [],
  };
}

// ── Sub-hook: Quick create ────────────────────────────────────────────────

function useQuickCreate(
  db: Firestore | null, 
  user: User | null, 
  isAdmin: boolean, 
  objects: MasterObject[] | null | undefined,
  quickFormData: ObjectFormData, 
  setQuickFormData: React.Dispatch<React.SetStateAction<ObjectFormData>>, 
  toast: ToastFn
) {
  const { validateQuick } = useFormValidation(quickFormData, toast);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  const handleSave = async (e?: React.FormEvent, stayOpen = false) => {
    if (!isAdmin || !validateQuick() || !db || !user) return;
    if (findMasterCatalogNameConflict(objects, quickFormData.name, undefined)) {
      toast({
        variant: 'destructive',
        description: `JÁ EXISTE UM OBJETO MESTRE COM O NOME "${normalizeMasterCatalogName(quickFormData.name)}". ESCOLHA OUTRO NOME.`,
      });
      return;
    }
    if (e) e.preventDefault();
    const objectId = generateShortId();
    const groupUpper = (quickFormData.chargeGroup || 'G').toUpperCase();

    if (quickFormData.status === 'INATIVO') {
      const newMaster = {
        id: objectId,
        name: quickFormData.name.trim().toUpperCase(),
        description: quickFormData.description.toUpperCase(),
        chargeGroup: groupUpper,
        chargeOrder: quickFormData.chargeOrder || '',
        parallelOrder: quickFormData.parallelOrder || '',
        dependencyIds: quickFormData.dependencyIds,
        externalDependencies: quickFormData.externalDependencies,
        type: quickFormData.type as MasterObject['type'],
        status: 'INATIVO' as const,
        isParallel: quickFormData.isParallel,
        activityGroupIds: quickFormData.activityGroupIds ?? [],
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
        toast({
          description:
            'OBJETO INATIVO ADICIONADO AO CATÁLOGO. SEQUÊNCIA DE CARGA DO GRUPO REORGANIZADA (INATIVOS AO FINAL).',
        });
      } catch {
        toast({ variant: 'destructive', description: 'ERRO AO SALVAR OBJETO OU REORDENAR SEQUÊNCIA.' });
        return;
      }
    } else {
      setDocumentNonBlocking(
        doc(db, 'masterObjects', objectId),
        {
          id: objectId,
          name: quickFormData.name.trim().toUpperCase(),
          description: quickFormData.description.toUpperCase(),
          chargeGroup: groupUpper,
          chargeOrder: quickFormData.chargeOrder || '',
          parallelOrder: quickFormData.parallelOrder || '',
          dependencyIds: quickFormData.dependencyIds,
          externalDependencies: quickFormData.externalDependencies,
          type: quickFormData.type,
          status: quickFormData.status,
          isParallel: quickFormData.isParallel,
          ownerId: user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast({ description: 'OBJETO ADICIONADO AO CATÁLOGO.' });
    }
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
    });
    if (!stayOpen) setIsQuickCreateOpen(false);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleAiGenerate = async (e?: React.MouseEvent) => {
    if (!isAdmin) return;
    e?.preventDefault?.();
    if (!quickFormData.name) { toast({ variant: 'destructive', description: 'DIGITE UM NOME PARA A IA GERAR A DESCRIÇÃO.' }); return; }
    try {
      const result = await aiDescriptionGenerator({ type: 'object', keywords: quickFormData.name });
      setQuickFormData({ ...quickFormData, description: result.description.toUpperCase() });
    } catch { toast({ variant: 'destructive', description: 'ERRO AO GERAR DESCRIÇÃO COM IA.' }); }
  };

  return { isQuickCreateOpen, setIsQuickCreateOpen, nameInputRef, handleSave, handleAiGenerate };
}

// ── Sub-hook: Edit dialog ─────────────────────────────────────────────────

function useEditDialog(
  db: Firestore | null, 
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
  performReorder: (obj: MasterObject, targetOrder: string) => Promise<void>, 
  extractChargeOrderDisplay: (order: string | number | undefined) => string, 
  toast: ToastFn
) {
  const [open, setOpen] = useState(false);
  const [isForceLockOpen, setIsForceLockOpen] = useState(false);
  const [forceLockTarget, setForceLockTarget] = useState<MasterObject | null>(null);
  const [forceLockBlockerName, setForceLockBlockerName] = useState<string | null>(null);
  const chargeOrderEditRef = useRef<HTMLInputElement>(null);
  const chargeOrderEditTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const extDepEditRef = useRef<HTMLTextAreaElement>(null);
  const extDepEditTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [editSaveError, setEditSaveError] = useState<string | null>(null);

  const buildFormData = (obj: MasterObject): ObjectFormData => ({
    name: obj.name, description: obj.description ?? '', chargeGroup: obj.chargeGroup || '',
    chargeOrder: extractChargeOrderDisplay(obj.chargeOrder),
    parallelOrder: (obj.parallelOrder && isValidSequence(obj.parallelOrder)) ? String(obj.parallelOrder) : '',
    dependencyIds: obj.dependencyIds || [], externalDependencies: obj.externalDependencies || [],
    type: obj.type || 'SCRIPT', status: obj.status || 'ATIVO', isParallel: !!obj.isParallel, activityGroupIds: obj.activityGroupIds || [],
  });

  const handleOpen = async (obj: MasterObject, viewOnly = false) => {
    if (!isAdmin) return;
    setEditSaveError(null);
    if (viewOnly) { setEditingObject(obj); setEditFormData(buildFormData(obj)); setOpen(true); return; }
    if (isMockLocked) return;
    const { acquired, lockedByName: blocker } = await acquireLock(`masterObjects/${obj.id}`);
    if (!acquired) { setForceLockTarget(obj); setForceLockBlockerName(blocker || 'Outro usuário'); setIsForceLockOpen(true); return; }
    setEditingObject(obj); setEditFormData(buildFormData(obj)); setOpen(true);
  };

  const clearEditSaveError = useCallback(() => setEditSaveError(null), []);

  const handleSave = async () => {
    if (!isAdmin || isMockLocked || !user || !editingObject || !db) return;
    setEditSaveError(null);
    const chargeOrderVal = (chargeOrderEditRef.current?.value ?? editFormData.chargeOrder ?? '').trim();
    const validationErr = getEditFormValidationError(editFormData, chargeOrderVal);
    if (validationErr) {
      setEditSaveError(validationErr);
      return;
    }
    if (findMasterCatalogNameConflict(objects, editFormData.name, editingObject.id)) {
      setEditSaveError(
        `Já existe outro objeto mestre com o nome "${normalizeMasterCatalogName(editFormData.name)}". Escolha outro nome.`,
      );
      return;
    }
    const oldOrder = editingObject.chargeOrder || '';
    const newOrder = chargeOrderEditRef.current?.value || editFormData.chargeOrder || '';
    const newGroup = (editFormData.chargeGroup || 'G').toUpperCase();
    const oldGroup = (editingObject.chargeGroup || 'G').toUpperCase();
    const orderChanged = String(oldOrder) !== newOrder && newOrder !== '';
    const extDepList = extDepEditRef.current
      ? extDepEditRef.current.value.toUpperCase().split('\n').filter((s) => s.trim() !== '')
      : editFormData.externalDependencies || [];

    if (editFormData.status === 'INATIVO') {
      const patched = buildPatchedMasterForReflow(
        editingObject,
        editFormData,
        newGroup,
        chargeOrderVal,
        String(oldOrder),
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
            chargeOrder: selfRow?.data.chargeOrder ?? (chargeOrderVal || String(oldOrder)),
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
        toast({
          description:
            'OBJETO ATUALIZADO. SEQUÊNCIA DE CARGA DO(S) GRUPO(S) REORGANIZADA — OBJETOS INATIVOS AO FINAL.',
        });
      } catch {
        toast({ variant: 'destructive', description: 'ERRO AO SALVAR OU REORDENAR SEQUÊNCIA DE CARGA.' });
        return;
      }
      setEditSaveError(null);
      releaseLock(`masterObjects/${editingObject.id}`);
      setOpen(false);
      return;
    }

    if (orderChanged) {
      void performReorder(
        { ...editingObject, chargeGroup: newGroup, chargeOrder: String(oldOrder), isParallel: editFormData.isParallel },
        newOrder,
      );
    }
    setDocumentNonBlocking(
      doc(db, 'masterObjects', editingObject.id),
      {
        name: editFormData.name.trim().toUpperCase(),
        description: editFormData.description.toUpperCase(),
        chargeGroup: newGroup,
        ...(orderChanged ? {} : { chargeOrder: newOrder || String(oldOrder) }),
        parallelOrder: editFormData.parallelOrder || '',
        dependencyIds: editFormData.dependencyIds,
        externalDependencies: extDepList,
        type: editFormData.type,
        status: editFormData.status,
        isParallel: editFormData.isParallel,
        activityGroupIds: editFormData.activityGroupIds,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    if (!orderChanged) toast({ description: 'OBJETO ATUALIZADO COM SUCESSO.' });
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
    chargeOrderEditRef,
    chargeOrderEditTimerRef,
    extDepEditRef,
    extDepEditTimerRef,
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
  const quick = useQuickCreate(db, user, isAdmin, deps.objects, deps.quickFormData, deps.setQuickFormData, toast);
  const edit = useEditDialog(db, user, isAdmin, deps.isMockLocked, deps.objects, deps.editFormData, deps.setEditFormData, deps.editingObject, deps.setEditingObject, deps.acquireLock, deps.releaseLock, deps.performReorder, deps.extractChargeOrderDisplay, toast);

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
    isGenerating: false,
    nameInputRef: quick.nameInputRef, chargeOrderEditRef: edit.chargeOrderEditRef, chargeOrderEditTimerRef: edit.chargeOrderEditTimerRef,
    extDepEditRef: edit.extDepEditRef, extDepEditTimerRef: edit.extDepEditTimerRef,
    editSaveError: edit.editSaveError, clearEditSaveError: edit.clearEditSaveError,
    handleSaveQuick: quick.handleSave, handleSaveEdit: edit.handleSave, handleDelete,
    handleAiGenerateQuick: quick.handleAiGenerate, handleOpenEditDialog: edit.handleOpen, handleForceAcquire: edit.handleForceAcquire,
  };
}

