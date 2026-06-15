"use client";

import { useState } from 'react';
import { doc, serverTimestamp } from '@/supabase/compat-db-shim';
import { updateDoc } from '@/supabase/query-builder';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/supabase/mutations';
import type { MigrationObject } from '../types';
import { isMigrationObjectActive, isMigrationObjectInactive } from '@/lib/mock-utils';

interface UseObjectsResetActionsDeps {
  db: any;
  projectId: string | null;
  mockId: string | null;
  isAdmin: boolean;
  isEffectiveLocked: boolean;
  isMockLocked: boolean;
  objects: MigrationObject[] | null | undefined;
  selectedObjectIds: string[];
  setSelectedObjectIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  toast: (opts: any) => void;
  onObjectActiveChange?: (objectId: string, isActive: boolean) => void;
}

const RESET_PAYLOAD = {
  status: 'PENDENTE',
  chargeStartTime: '',
  chargeEndTime: '',
  initialChargeStartTime: null,
  initialChargeEndTime: null,
  processedRecordsCount: 0,
  successfulRecordsCount: 0,
  errorRecordsCount: 0,
  currentChargeDurationMs: 0,
};

/**
 * Gerencia as operações de reset (global, bulk, individual),
 * exclusão em massa e toggle de status de carga por objeto.
 */
export function useObjectsResetActions({
  db, projectId, mockId, isAdmin, isEffectiveLocked, isMockLocked,
  objects, selectedObjectIds, setSelectedObjectIds, toast, onObjectActiveChange,
}: UseObjectsResetActionsDeps) {
  const [isGlobalResetOpen, setIsGlobalResetOpen] = useState(false);
  const [isResetProgressOpen, setIsResetProgressOpen] = useState(false);
  const [resetProgress, setResetProgress] = useState(0);
  const [resetCount, setResetCount] = useState({ current: 0, total: 0 });
  const [objectToReset, setObjectToReset] = useState<MigrationObject | null>(null);
  const [isIndividualResetOpen, setIsIndividualResetOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkResetOpen, setIsBulkResetOpen] = useState(false);
  const [objectToRemove, setObjectToRemove] = useState<MigrationObject | null>(null);
  const [isRemoveFromMockOpen, setIsRemoveFromMockOpen] = useState(false);

  const objectRef = (id: string) =>
    doc(db!, 'projects', projectId!, 'mocks', mockId!, 'migrationObjects', id);

  // ── Toggle status de carga de um objeto ─────────────────────────────────────
  const handleToggleObjectCargaStatus = (obj: MigrationObject) => {
    if (!isAdmin || isMockLocked || !projectId || !mockId) return;
    if (!isMigrationObjectActive(obj)) {
      toast({ variant: 'destructive', description: 'Objeto inativo nesta mock. Reative para iniciar a carga.' });
      return;
    }
    const currentStatus = obj.status || (obj.chargeStartTime && !obj.chargeEndTime ? 'CARGA_EM_ANDAMENTO' : 'PENDENTE');
    const newStatus = currentStatus === 'CARGA_EM_ANDAMENTO' ? 'CARGA_CONCLUIDA' : 'CARGA_EM_ANDAMENTO';
    setDocumentNonBlocking(objectRef(obj.id), { status: newStatus, updatedAt: serverTimestamp() }, { merge: true });
  };

  const handleToggleObjectActive = async (obj: MigrationObject, activate: boolean) => {
    if (!isAdmin || isMockLocked || !projectId || !mockId) return;
    const isInProgress =
      obj.status === 'CARGA_EM_ANDAMENTO' || !!(obj.chargeStartTime && !obj.chargeEndTime);
    if (!activate && isInProgress) {
      toast({ variant: 'destructive', description: 'Não é possível inativar um objeto em execução.' });
      return;
    }
    onObjectActiveChange?.(obj.id, activate);
    try {
      await updateDoc(objectRef(obj.id), {
        isActive: activate,
        updatedAt: serverTimestamp(),
      });
      toast({
        description: activate
          ? `Objeto ${obj.name} reativado nesta mock.`
          : `Objeto ${obj.name} inativado nesta mock.`,
      });
    } catch (error) {
      onObjectActiveChange?.(obj.id, !activate);
      console.error('Falha ao alterar status do objeto na mock:', error);
      toast({
        variant: 'destructive',
        description:
          'Não foi possível salvar o status do objeto. Verifique se a migration is_active foi aplicada no banco.',
      });
    }
  };

  // ── Remoção individual da mock (objeto inativo) ─────────────────────────────
  const handleRequestRemoveFromMock = (obj: MigrationObject) => {
    if (!isAdmin || isEffectiveLocked || !projectId || !mockId) return;
    if (!isMigrationObjectInactive(obj)) {
      toast({
        variant: 'destructive',
        description: 'Inative o objeto nesta mock antes de removê-lo.',
      });
      return;
    }
    const isInProgress =
      obj.status === 'CARGA_EM_ANDAMENTO' || !!(obj.chargeStartTime && !obj.chargeEndTime);
    if (isInProgress) {
      toast({ variant: 'destructive', description: 'Não é possível remover um objeto em execução.' });
      return;
    }
    setObjectToRemove(obj);
    setIsRemoveFromMockOpen(true);
  };

  const handleConfirmRemoveFromMock = async () => {
    if (!isAdmin || isEffectiveLocked || !projectId || !mockId || !objectToRemove) return;
    const { id, name } = objectToRemove;
    setIsRemoveFromMockOpen(false);
    try {
      await deleteDocumentNonBlocking(objectRef(id));
      setSelectedObjectIds((prev) => prev.filter((selectedId) => selectedId !== id));
      toast({ description: `Objeto ${name} removido desta mock.` });
    } catch {
      toast({ variant: 'destructive', description: 'Falha ao remover o objeto da mock.' });
    } finally {
      setObjectToRemove(null);
    }
  };

  // ── Exclusão em massa ────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (!isAdmin || isEffectiveLocked || selectedObjectIds.length === 0) return;
    const count = selectedObjectIds.length;
    try {
      selectedObjectIds.forEach(id => deleteDocumentNonBlocking(objectRef(id)));
      toast({ description: `${count} objeto(s) removido(s) com sucesso.` });
      setSelectedObjectIds([]);
    } catch {
      toast({ variant: 'destructive', description: 'Falha ao remover objetos selecionados.' });
    }
    setIsBulkDeleteOpen(false);
  };

  // ── Reset em massa ───────────────────────────────────────────────────────────
  const handleBulkReset = async () => {
    if (!isAdmin || isEffectiveLocked || selectedObjectIds.length === 0) return;
    const count = selectedObjectIds.length;
    setIsBulkResetOpen(false);
    setIsResetProgressOpen(true);
    setResetProgress(0);
    setResetCount({ current: 0, total: count });

    try {
      for (let i = 0; i < count; i++) {
        await setDocumentNonBlocking(objectRef(selectedObjectIds[i]), {
          ...RESET_PAYLOAD,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        const newCount = i + 1;
        setResetCount(prev => ({ ...prev, current: newCount }));
        setResetProgress(Math.round((newCount / count) * 100));
        await new Promise(r => setTimeout(r, 20));
      }
      setSelectedObjectIds([]);
    } catch {
      toast({ variant: 'destructive', description: 'Falha ao reiniciar objetos selecionados.' });
    } finally {
      setTimeout(() => setIsResetProgressOpen(false), 800);
    }
  };

  // ── Reset global (todos os objetos do mock) ──────────────────────────────────
  const handleGlobalReset = async () => {
    if (!isAdmin || isMockLocked || !projectId || !mockId || !objects || objects.length === 0) return;
    setIsGlobalResetOpen(false);
    setIsResetProgressOpen(true);
    setResetProgress(0);
    const total = objects.length;
    setResetCount({ current: 0, total });

    try {
      for (let i = 0; i < total; i++) {
        await setDocumentNonBlocking(objectRef(objects[i].id), {
          ...RESET_PAYLOAD,
          loadHistory: [],
          updatedAt: serverTimestamp(),
        }, { merge: true });
        const newCount = i + 1;
        setResetCount(prev => ({ ...prev, current: newCount }));
        setResetProgress(Math.round((newCount / total) * 100));
        await new Promise(r => setTimeout(r, 30));
      }
      toast({ title: 'SUCESSO', description: 'RESET TOTAL CONCLUÍDO COM SUCESSO' });
    } catch (error) {
      console.error('Erro no reset global:', error);
      toast({ title: 'ERRO', description: 'Falha ao realizar o reset global.', variant: 'destructive' });
    } finally {
      setTimeout(() => setIsResetProgressOpen(false), 1500);
    }
  };

  // ── Reset individual de um objeto ────────────────────────────────────────────
  const handleIndividualReset = async () => {
    if (!isAdmin || isEffectiveLocked || !projectId || !mockId || !objectToReset) return;
    setIsIndividualResetOpen(false);
    await setDocumentNonBlocking(objectRef(objectToReset.id), {
      ...RESET_PAYLOAD,
      loadHistory: [],
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setObjectToReset(null);
  };

  return {
    isGlobalResetOpen, setIsGlobalResetOpen,
    isResetProgressOpen, setIsResetProgressOpen,
    resetProgress, resetCount,
    objectToReset, setObjectToReset,
    isIndividualResetOpen, setIsIndividualResetOpen,
    isBulkDeleteOpen, setIsBulkDeleteOpen,
    isBulkResetOpen, setIsBulkResetOpen,
    objectToRemove, setObjectToRemove,
    isRemoveFromMockOpen, setIsRemoveFromMockOpen,
    handleToggleObjectCargaStatus,
    handleToggleObjectActive,
    handleRequestRemoveFromMock,
    handleConfirmRemoveFromMock,
    handleBulkDelete,
    handleBulkReset,
    handleGlobalReset,
    handleIndividualReset,
  };
}
