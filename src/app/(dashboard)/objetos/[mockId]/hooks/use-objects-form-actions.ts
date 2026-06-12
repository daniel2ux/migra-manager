import { useState, useMemo, useEffect } from 'react';
import { doc, serverTimestamp, collection, type Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import {
  formatDurationInput,
  parseDurationString,
} from '@/lib/migration/format-utils';
import { parseSequence, formatSequence, compareSequences } from '@/lib/migration/sequence-utils';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types/migration';
import type { MasterObject, MigrationObject } from '../types';

type ToastFn = ReturnType<typeof useToast>['toast'];

interface FormData {
  masterObjectId: string;
  name: string;
  description: string;
  chargeGroup: string;
  chargeOrder: string | number;
  chargeStartTime: string;
  chargeEndTime: string;
  targetRecordsCount: number;
  processedRecordsCount: number;
  migratedRecordsCount: number;
  successfulRecordsCount: number;
  errorRecordsCount: number;
  currentChargeDurationMs: number;
  previousMigratedRecordsCount: number;
  previousChargeDurationMs: number;
  dependencyIds: string[];
  isParallel: boolean;
}

interface QuickFormData {
  targetRecordsCount: number;
  processedRecordsCount: number;
  errorRecordsCount: number;
  chargeStartTime: string;
  chargeEndTime: string;
}

const EMPTY_FORM: FormData = {
  masterObjectId: '',
  name: '',
  description: '',
  chargeGroup: '',
  chargeOrder: '',
  chargeStartTime: '',
  chargeEndTime: '',
  targetRecordsCount: 0,
  processedRecordsCount: 0,
  migratedRecordsCount: 0,
  successfulRecordsCount: 0,
  errorRecordsCount: 0,
  currentChargeDurationMs: 0,
  previousMigratedRecordsCount: 0,
  previousChargeDurationMs: 0,
  dependencyIds: [],
  isParallel: false,
};

interface UseObjectsFormActionsDeps {
  db: Firestore | null;
  user: User | null;
  projectId: string | null;
  mockId: string | null;
  isAdmin: boolean;
  isEffectiveLocked: boolean;
  objects: MigrationObject[] | null | undefined;
  masterObjects: MasterObject[] | null | undefined;
  userProfile: UserProfile | null | undefined;
  toast: ToastFn;
}

/**
 * Gerencia os dialogs de criação/edição completa, edição rápida e comentário
 * de objetos de migração — incluindo formData, validação e escrita no Firestore.
 */
export function useObjectsFormActions({
  db, user, projectId, mockId, isAdmin, isEffectiveLocked,
  objects, masterObjects, userProfile, toast,
}: UseObjectsFormActionsDeps) {
  const [open, setOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<MigrationObject | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [prevDurationInput, setPrevDurationInput] = useState('');
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>([]);
  const [searchMasterTerm, setSearchMasterTerm] = useState('');

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickEditObject, setQuickEditObject] = useState<MigrationObject | null>(null);
  const [quickFormData, setQuickFormData] = useState<QuickFormData>({
    targetRecordsCount: 0,
    processedRecordsCount: 0,
    errorRecordsCount: 0,
    chargeStartTime: '',
    chargeEndTime: '',
  });

  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentTargetObject, setTargetObject] = useState<MigrationObject | null>(null);
  const _quickCommentStatus = 'aberta' as const;

  // Auto-calc duration from dates
  useEffect(() => {
    if (formData.chargeStartTime && formData.chargeEndTime) {
      const start = new Date(formData.chargeStartTime).getTime();
      const end = new Date(formData.chargeEndTime).getTime();
      const ms = !isNaN(start) && !isNaN(end) && end >= start
        ? Math.max(60000, end - start)
        : 0;
      setFormData(prev => ({ ...prev, currentChargeDurationMs: ms }));
    }
  }, [formData.chargeStartTime, formData.chargeEndTime]);

  // Carregado = Target − Erro (≥ 0); sucesso espelha o carregado (mesma regra da edição rápida ao persistir).
  useEffect(() => {
    const processed = Math.max(0, formData.targetRecordsCount - formData.errorRecordsCount);
    setFormData((prev) => {
      if (prev.processedRecordsCount === processed && prev.successfulRecordsCount === processed) return prev;
      return { ...prev, processedRecordsCount: processed, successfulRecordsCount: processed };
    });
  }, [formData.targetRecordsCount, formData.errorRecordsCount]);

  const filteredMasterObjects = useMemo(() => {
    if (!masterObjects || !objects) return [];
    const existingMasterIds = new Set(objects.map(o => o.masterObjectId));
    return masterObjects
      .filter(mo =>
        !existingMasterIds.has(mo.id) &&
        (mo.name.toLowerCase().includes(searchMasterTerm.toLowerCase()) ||
          (mo.chargeGroup && mo.chargeGroup.toLowerCase().includes(searchMasterTerm.toLowerCase())))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [masterObjects, objects, searchMasterTerm]);

  // ── Dialog de criação/edição completa ──────────────────────────────────────

  const handleOpenDialog = (obj?: MigrationObject) => {
    if (obj) {
      setEditingObject(obj);
      setPrevDurationInput(formatDurationInput(obj.previousChargeDurationMs || 0, true));
      setFormData({
        masterObjectId: obj.masterObjectId || '',
        name: obj.name || '',
        description: obj.description || '',
        chargeGroup: (obj as any).displayGroup || obj.chargeGroup || '',
        chargeOrder: (obj as any).displayOrder ?? obj.chargeOrder ?? '',
        chargeStartTime: obj.chargeStartTime || '',
        chargeEndTime: obj.chargeEndTime || '',
        targetRecordsCount: obj.targetRecordsCount || 0,
        processedRecordsCount: obj.processedRecordsCount || 0,
        migratedRecordsCount: obj.migratedRecordsCount || 0,
        successfulRecordsCount: obj.successfulRecordsCount || 0,
        errorRecordsCount: obj.errorRecordsCount || 0,
        currentChargeDurationMs: obj.currentChargeDurationMs || 0,
        previousMigratedRecordsCount: obj.previousMigratedRecordsCount || 0,
        previousChargeDurationMs: obj.previousChargeDurationMs || 0,
        dependencyIds: obj.dependencyIds || [],
        isParallel: (obj as any).displayIsParallel ?? obj.isParallel ?? false,
      });
    } else {
      if (!isAdmin || isEffectiveLocked) return;
      setEditingObject(null);
      setPrevDurationInput('00H 00M');
      setSelectedMasterIds([]);
      setFormData(EMPTY_FORM);
    }
    setOpen(true);
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredMasterObjects.map(mo => mo.id);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedMasterIds.includes(id));
    if (areAllSelected) {
      setSelectedMasterIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedMasterIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleToggleMasterSelection = (id: string) => {
    setSelectedMasterIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const _handleToggleDependency = (id: string) => {
    setFormData(prev => {
      const current = prev.dependencyIds;
      return current.includes(id)
        ? { ...prev, dependencyIds: current.filter(i => i !== id) }
        : { ...prev, dependencyIds: [...current, id] };
    });
  };

  const handleDurationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.substring(0, 4);
    let formatted = '';
    if (val.length > 0) {
      const h = val.substring(0, 2).padStart(2, '0');
      const m = val.substring(2).padStart(2, '0');
      formatted = val.length <= 2 ? `${h}H` : `${h}H ${m}M`;
    }
    setPrevDurationInput(formatted);
    if (formatted.length === 7) {
      setFormData(prev => ({ ...prev, previousChargeDurationMs: parseDurationString(formatted) }));
    }
  };

  const _performReorder = (movingObject: MigrationObject, targetOrder: string, targetId?: string, targetGroupOverride?: string) => {
    if (!objects || !db || !projectId || !mockId) return;
    const targetGroup = (targetGroupOverride || (targetId ? objects.find(o => o.id === targetId)?.chargeGroup : formData.chargeGroup || 'G'))?.toUpperCase() || 'G';

    if (formData.isParallel) {
      const ref = doc(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects', movingObject.id);
      setDocumentNonBlocking(ref, { chargeOrder: targetOrder, chargeGroup: targetGroup, isParallel: true, updatedAt: serverTimestamp() }, { merge: true });
      return;
    }

    const fullGroup = objects
      .filter(o => (o.chargeGroup || '').toUpperCase() === targetGroup || o.id === movingObject.id)
      .sort((a, b) => {
        const oa = a.id === movingObject.id ? targetOrder : (a.chargeOrder || '');
        const ob = b.id === movingObject.id ? targetOrder : (b.chargeOrder || '');
        const cmp = compareSequences(oa, ob);
        if (cmp !== 0) return cmp;
        if (a.id === movingObject.id) return -1;
        if (b.id === movingObject.id) return 1;
        return a.name.localeCompare(b.name);
      });

    const listWithoutMoving = fullGroup.filter(o => o.id !== movingObject.id);
    let targetIdx = targetId
      ? listWithoutMoving.findIndex(o => o.id === targetId)
      : listWithoutMoving.findIndex(o => compareSequences(o.chargeOrder, targetOrder) >= 0);
    if (targetIdx === -1) targetIdx = listWithoutMoving.length;

    const finalSequence = [...listWithoutMoving];
    finalSequence.splice(targetIdx, 0, movingObject as any);

    let currentMajor = 0;
    let lastEffectiveMajor = -1;
    let updateCount = 0;

    finalSequence.forEach(obj => {
      const isMoving = obj.id === movingObject.id;
      const effectiveMajor = parseSequence(isMoving ? targetOrder : (obj.chargeOrder || '')).major;
      if (currentMajor === 0 || effectiveMajor !== lastEffectiveMajor) currentMajor++;
      lastEffectiveMajor = effectiveMajor;

      const newSeq = formatSequence(currentMajor, 0);
      if (String(obj.chargeOrder) !== newSeq || (isMoving && (obj.chargeGroup || '').toUpperCase() !== targetGroup)) {
        const ref = doc(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects', obj.id);
        setDocumentNonBlocking(ref as any, { chargeOrder: newSeq, chargeGroup: targetGroup, updatedAt: serverTimestamp() }, { merge: true });
        updateCount++;
      }
    });

    if (updateCount > 0) {
      toast({ description: `${updateCount} objeto(s) reorganizado(s) no grupo ${targetGroup}.` });
    }
  };

  const handleSave = () => {
    if (!isAdmin || isEffectiveLocked || !projectId || !mockId || !user || !db) return;

    if (editingObject) {
      if (!formData.name) return;
      const newGroup = (formData.chargeGroup || '').toUpperCase();
      const docRef = doc(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects', editingObject.id);
      setDocumentNonBlocking(docRef, {
        ...formData,
        chargeGroup: newGroup,
        migratedRecordsCount: formData.processedRecordsCount,
        projectId,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      if (selectedMasterIds.length === 0) {
        toast({ variant: 'destructive', description: 'Selecione pelo menos um objeto.' });
        return;
      }
      selectedMasterIds.forEach(masterId => {
        const master = masterObjects?.find(m => m.id === masterId);
        if (!master) return;
        const objectId = Math.random().toString(36).substr(2, 9);
        const objectRef = doc(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects', objectId);
        setDocumentNonBlocking(objectRef, {
          id: objectId, mockId, projectId,
          masterObjectId: masterId,
          name: master.name,
          description: master.description,
          chargeGroup: master.chargeGroup || '',
          chargeOrder: master.chargeOrder || '',
          isParallel: false,
          chargeStartTime: '', chargeEndTime: '',
          targetRecordsCount: 0, processedRecordsCount: 0,
          migratedRecordsCount: 0, successfulRecordsCount: 0,
          errorRecordsCount: 0, currentChargeDurationMs: 0,
          previousMigratedRecordsCount: 0, previousChargeDurationMs: 0,
          dependencyIds: master.dependencyIds || [],
          ownerId: user.uid,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
      toast({ description: `${selectedMasterIds.length} objeto(s) adicionado(s).` });
    }
    setOpen(false);
  };

  // ── Dialog de edição rápida ────────────────────────────────────────────────

  const handleOpenQuickDialog = (obj: MigrationObject) => {
    if (!isAdmin || isEffectiveLocked) return;
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const currentDateTime = localNow.toISOString().slice(0, 16);

    setQuickEditObject(obj);
    const target = Math.max(0, obj.targetRecordsCount || 0);
    const errQty = Math.max(0, obj.errorRecordsCount || 0);
    setQuickFormData({
      targetRecordsCount: target,
      errorRecordsCount: errQty,
      processedRecordsCount: Math.max(0, target - errQty),
      chargeStartTime: obj.chargeStartTime || currentDateTime,
      chargeEndTime: obj.chargeEndTime || (obj.chargeStartTime ? obj.chargeStartTime : currentDateTime),
    });
    setQuickOpen(true);
  };

  const handleSaveQuick = () => {
    if (!isAdmin || isEffectiveLocked || !quickEditObject || !projectId || !mockId || !db) {
      if (!projectId || !mockId) toast({ variant: 'destructive', description: 'Erro: Projeto ou Mock não identificados.' });
      return;
    }
    const objectRef = doc(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects', quickEditObject.id);
    const targetRecordsCount = Math.max(0, quickFormData.targetRecordsCount);
    const errorRecordsCount = Math.max(0, quickFormData.errorRecordsCount);
    const processedRecordsCount = Math.max(0, targetRecordsCount - errorRecordsCount);

    let durationMs = 0;
    if (quickFormData.chargeStartTime && quickFormData.chargeEndTime) {
      const start = new Date(quickFormData.chargeStartTime).getTime();
      const end = new Date(quickFormData.chargeEndTime).getTime();
      if (!isNaN(start) && !isNaN(end) && end >= start) durationMs = Math.max(1, end - start);
    }

    setDocumentNonBlocking(objectRef, {
      ...quickFormData,
      targetRecordsCount,
      errorRecordsCount,
      processedRecordsCount,
      successfulRecordsCount: processedRecordsCount,
      migratedRecordsCount: processedRecordsCount,
      currentChargeDurationMs: durationMs,
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch(err => {
      console.error('Save error:', err);
      toast({ variant: 'destructive', description: 'Erro ao salvar informações.' });
    });

    setQuickOpen(false);
  };

  // ── Dialog de comentário ───────────────────────────────────────────────────

  const handleOpenCommentDialog = (obj: MigrationObject) => {
    setTargetObject(obj);
    setCommentDialogOpen(true);
  };

  /** Rascunho fica no `CommentDialog` (estado local) para não re-renderizar a página a cada tecla. */
  const handleSaveQuickComment = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed || !commentTargetObject || !projectId || !mockId || !user || !db) return false;
    const commentsColRef = collection(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects', commentTargetObject.id, 'comments');
    addDocumentNonBlocking(commentsColRef, {
      text: trimmed,
      authorId: user.uid,
      authorName: userProfile?.name || 'Especialista',
      authorRole: userProfile?.role || 'user',
      status: _quickCommentStatus,
      projectId,
      mockId,
      objectId: commentTargetObject.id,
      createdAt: serverTimestamp(),
    });
    return true;
  };

  const handleDeleteQuickComment = (comment: { id: string; __path?: string; authorId?: string; userId?: string }) => {
    if (!commentTargetObject || !projectId || !mockId || !user || !db) return;
    const authorId = comment.authorId;
    if (!isAdmin && authorId !== user.uid) {
      toast({
        variant: 'destructive',
        title: 'Sem permissão',
        description: 'Só é possível remover comentários próprios.',
      });
      return;
    }
    const path = comment.__path?.trim();
    if (path) {
      const segments = path.split('/').filter(Boolean);
      if (segments.length >= 2) {
        void deleteDocumentNonBlocking(doc(db, ...(segments as [string, ...string[]])));
        return;
      }
      /** `__path` inválido — tenta pelo caminho canônico abaixo. */
    }
    void deleteDocumentNonBlocking(
      doc(
        db,
        'projects',
        projectId,
        'mocks',
        mockId,
        'migrationObjects',
        commentTargetObject.id,
        'comments',
        comment.id
      )
    );
  };

  return {
    // Form dialog
    open, setOpen,
    editingObject, setEditingObject,
    formData, setFormData,
    prevDurationInput, setPrevDurationInput,
    selectedMasterIds, setSelectedMasterIds,
    searchMasterTerm, setSearchMasterTerm,
    filteredMasterObjects,
    handleOpenDialog, handleSave,
    handleSelectAll, handleToggleMasterSelection,
    _handleToggleDependency, handleDurationInputChange,
    _performReorder,
    // Quick edit dialog
    quickOpen, setQuickOpen,
    quickEditObject, setQuickEditObject,
    quickFormData, setQuickFormData,
    handleOpenQuickDialog, handleSaveQuick,
    // Comment dialog
    commentDialogOpen, setCommentDialogOpen,
    commentTargetObject,
    handleOpenCommentDialog, handleSaveQuickComment, handleDeleteQuickComment,
  };
}

