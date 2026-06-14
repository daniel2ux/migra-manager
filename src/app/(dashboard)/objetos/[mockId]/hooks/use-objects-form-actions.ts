import { useState, useMemo, useEffect, useCallback } from 'react';
import { doc, serverTimestamp, collection, setDoc, type CompatDb } from '@/supabase/compat-db-shim';
import type { User } from '@/supabase/auth-shim';
import {
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/supabase/mutations';
import {
  formatDurationInput,
  parseDurationString,
} from '@/lib/migration/format-utils';
import { parseSequence, formatSequence, compareSequences } from '@/lib/migration/sequence-utils';
import { isActiveCatalogMaster } from '@/lib/dashboard/object-filters';
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

function sanitizeDependencyIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === 'string' && isUuid(id));
}

function buildMigrationObjectFromMaster(
  master: MasterObject,
  objectId: string,
  projectId: string,
  mockId: string,
  ownerId: string,
): MigrationObject {
  return {
    id: objectId,
    mockId,
    projectId,
    masterObjectId: master.id,
    name: master.name,
    description: master.description ?? '',
    chargeGroup: master.chargeGroup || '',
    chargeOrder: master.chargeOrder != null ? String(master.chargeOrder) : '',
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
    dependencyIds: sanitizeDependencyIds(master.dependencyIds),
    ownerId,
    isParallel: false,
    status: 'PENDENTE',
  };
}

interface UseObjectsFormActionsDeps {
  db: CompatDb | null;
  user: User | null;
  projectId: string | null;
  mockId: string | null;
  isAdmin: boolean;
  isAdminOrMaster?: boolean;
  isEffectiveLocked: boolean;
  objects: MigrationObject[] | null | undefined;
  masterObjects: MasterObject[] | null | undefined;
  isMasterObjectsLoading?: boolean;
  userProfile: UserProfile | null | undefined;
  toast: ToastFn;
  refetchObjects?: () => void;
  addPendingObjects?: (items: MigrationObject[]) => void;
}

/**
 * Gerencia os dialogs de criação/edição completa, edição rápida e comentário
 * de objetos de migração — incluindo formData, validação e escrita no CompatDb.
 */
export function useObjectsFormActions({
  db, user, projectId, mockId, isAdmin, isAdminOrMaster, isEffectiveLocked,
  objects, masterObjects, isMasterObjectsLoading, userProfile, toast,
  refetchObjects, addPendingObjects,
}: UseObjectsFormActionsDeps) {
  const canManageObjects = isAdminOrMaster ?? isAdmin;
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

  const mockObjectKeys = useMemo(() => {
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const obj of objects ?? []) {
      if (obj.masterObjectId) ids.add(obj.masterObjectId);
      const name = (obj.name || '').trim().toUpperCase();
      if (name) names.add(name);
    }
    return { ids, names };
  }, [objects]);

  const availableMasterObjects = useMemo(() => {
    if (!masterObjects?.length) return [];
    return masterObjects.filter(
      (mo) =>
        isActiveCatalogMaster(mo) &&
        !mockObjectKeys.ids.has(mo.id) &&
        !mockObjectKeys.names.has((mo.name || '').trim().toUpperCase()),
    );
  }, [masterObjects, mockObjectKeys]);

  const filteredMasterObjects = useMemo(() => {
    const term = searchMasterTerm.trim().toLowerCase();
    return availableMasterObjects
      .filter((mo) =>
        !term ||
        mo.name.toLowerCase().includes(term) ||
        (mo.chargeGroup && mo.chargeGroup.toLowerCase().includes(term)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableMasterObjects, searchMasterTerm]);

  const masterPickerEmptyHint = useMemo(() => {
    if (isMasterObjectsLoading || masterObjects == null) {
      return 'Carregando catálogo de objetos…';
    }
    if (masterObjects.length === 0) {
      return 'Nenhum objeto no catálogo mestre. Cadastre objetos em Gestão de objetos.';
    }
    const activeCount = masterObjects.filter(isActiveCatalogMaster).length;
    if (activeCount === 0) {
      return 'Nenhum objeto ATIVO no catálogo. Ative objetos em Gestão de objetos.';
    }
    if (availableMasterObjects.length === 0) {
      return 'Todos os objetos ativos do catálogo já estão nesta mock.';
    }
    if (searchMasterTerm.trim()) {
      return 'Nenhum objeto corresponde à pesquisa.';
    }
    return 'Nenhum objeto disponível para cadastro.';
  }, [isMasterObjectsLoading, masterObjects, availableMasterObjects.length, searchMasterTerm]);

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
      if (!canManageObjects || isEffectiveLocked) return;
      setEditingObject(null);
      setPrevDurationInput('00H 00M');
      setSelectedMasterIds([]);
      setSearchMasterTerm('');
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

  const handleToggleMasterSelection = useCallback((id: string) => {
    setSelectedMasterIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

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

  const handleSave = async () => {
    if (!canManageObjects || isEffectiveLocked || !user || !db) return;
    if (!isUuid(projectId) || !isUuid(mockId)) {
      toast({
        variant: 'destructive',
        description: 'Mock ou projeto ainda não carregou. Aguarde e tente novamente.',
      });
      return;
    }

    if (editingObject) {
      if (!formData.name) return;
      const newGroup = (formData.chargeGroup || '').toUpperCase();
      const docRef = doc(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects', editingObject.id);
      try {
        await setDoc(docRef, {
          ...formData,
          chargeGroup: newGroup,
          migratedRecordsCount: formData.processedRecordsCount,
          projectId,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        setOpen(false);
        refetchObjects?.();
      } catch (err) {
        console.error('Save error:', err);
        toast({ variant: 'destructive', description: 'Erro ao salvar objeto.' });
      }
      return;
    }

    if (selectedMasterIds.length === 0) {
      toast({ variant: 'destructive', description: 'Selecione pelo menos um objeto.' });
      return;
    }

    const mastersToAdd = selectedMasterIds
      .map((masterId) => masterObjects?.find((m) => m.id === masterId))
      .filter((master): master is MasterObject => !!master && isActiveCatalogMaster(master));

    if (mastersToAdd.length === 0) {
      toast({ variant: 'destructive', description: 'Nenhum objeto válido para adicionar.' });
      return;
    }

    try {
      const creations = mastersToAdd.map((master) => ({
        objectId: crypto.randomUUID(),
        master,
      }));

      const pendingItems = creations.map(({ objectId, master }) =>
        buildMigrationObjectFromMaster(master, objectId, projectId, mockId, user.uid),
      );
      addPendingObjects?.(pendingItems);

      await Promise.all(
        creations.map(async ({ objectId, master }) => {
          const objectRef = doc(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects', objectId);
          const row = buildMigrationObjectFromMaster(master, objectId, projectId, mockId, user.uid);
          await setDoc(objectRef, {
            ...row,
            loadHistory: [],
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }),
      );
      toast({ description: `${mastersToAdd.length} objeto(s) adicionado(s).` });
      setSelectedMasterIds([]);
      setSearchMasterTerm('');
      setOpen(false);
      refetchObjects?.();
    } catch (err) {
      console.error('Add objects error:', err);
      toast({
        variant: 'destructive',
        description: err instanceof Error ? err.message : 'Erro ao adicionar objetos à mock.',
      });
    }
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

  const handleSaveQuick = (data: QuickFormData) => {
    if (!isAdmin || isEffectiveLocked || !quickEditObject || !projectId || !mockId || !db) {
      if (!projectId || !mockId) toast({ variant: 'destructive', description: 'Erro: Projeto ou Mock não identificados.' });
      return;
    }
    const objectRef = doc(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects', quickEditObject.id);
    const targetRecordsCount = Math.max(0, data.targetRecordsCount);
    const errorRecordsCount = Math.max(0, data.errorRecordsCount);
    const processedRecordsCount = Math.max(0, targetRecordsCount - errorRecordsCount);

    let durationMs = 0;
    if (data.chargeStartTime && data.chargeEndTime) {
      const start = new Date(data.chargeStartTime).getTime();
      const end = new Date(data.chargeEndTime).getTime();
      if (!isNaN(start) && !isNaN(end) && end >= start) durationMs = Math.max(1, end - start);
    }

    setDocumentNonBlocking(objectRef, {
      ...data,
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
    isMasterCatalogLoading: !!isMasterObjectsLoading || masterObjects == null,
    masterPickerEmptyHint,
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

