import { useState, useCallback } from "react";
import { useDb, useUser } from "@/supabase";
import { useToast } from "@/hooks/use-toast";
import { doc, serverTimestamp, setDoc, type CompatDb } from "@/supabase/compat-db-shim";
import type { User } from "@/supabase/auth-shim";
import { setDocumentNonBlocking } from "@/supabase/mutations";
import { slugify } from "@/lib/formatters";
import { buildClonedMigrationObjectRecord, buildClonedMockRecord, extractMockPrefix, isMockActive, isMockCargaInProgress, remapDependencyIds, sanitizeUuidList } from "@/lib/mock-utils";
import { DB_BATCH_SIZE } from "@/lib/constants";
import type { Mock, MigrationObject, UserProfile } from "@/types/migration";

type ToastFn = ReturnType<typeof useToast>['toast'];

function useMockLocking(
  db: CompatDb | null, 
  user: User | null, 
  isAdmin: boolean, 
  projectId: string | null, 
  isMaster: boolean, 
  userProfile: UserProfile | null, 
  toast: ToastFn
) {
  return {
    handleToggleLock: useCallback(async (mock: Mock) => {
      if (!isAdmin || !projectId || !db || !user) return;
      if (mock.isLocked && mock.lockedByMaster && mock.lockedByUid !== user.uid) {
        toast({ variant: "destructive", description: `Objeto bloqueado por ${mock.lockedByName}. Contate-o para liberação.` });
        return;
      }
      const mockRef = doc(db, 'projects', projectId, 'mocks', mock.id);
      const unlocking = mock.isLocked;
      await setDocumentNonBlocking(mockRef, unlocking ? {
        isLocked: false, lockedByMaster: false, lockedByUid: "", lockedByName: ""
      } : {
        isLocked: true, lockedByMaster: isMaster, lockedByUid: user.uid,
        lockedByName: userProfile?.name || user.email || "Usuário"
      }, { merge: true });
    }, [isAdmin, projectId, db, user, isMaster, userProfile, toast]),

    handleForceAcquire: useCallback(async (targetMock: Mock | null) => {
      if (!isAdmin || !projectId || !targetMock || !db || !user) return;
      try {
        await setDocumentNonBlocking(doc(db, 'projects', projectId, 'mocks', targetMock.id), {
          isLocked: true, lockedByMaster: isMaster, lockedByUid: user.uid,
          lockedByName: userProfile?.name || user.email || "Usuário"
        }, { merge: true });
      } catch {
        toast({ variant: "destructive", description: "FALHA AO FORÇAR LIBERAÇÃO." });
      }
    }, [isAdmin, projectId, db, user, isMaster, userProfile, toast]),

    handleToggleActive: useCallback(async (mock: Mock, activate: boolean) => {
      if (!isAdmin || !projectId || !db) return;
      if (!activate && isMockCargaInProgress(mock)) {
        toast({ variant: "destructive", description: "Não é possível inativar uma mock em execução." });
        return;
      }
      await setDocumentNonBlocking(doc(db, 'projects', projectId, 'mocks', mock.id), {
        isActive: activate,
        ...(!activate ? { isRunning: false, status: 'PENDENTE' } : {}),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast({
        description: activate
          ? `Mock ${mock.name} reativada.`
          : `Mock ${mock.name} inativada.`,
      });
    }, [isAdmin, projectId, db, toast]),
  };
}

function useMockLifecycle(
  db: CompatDb | null, 
  isAdmin: boolean, 
  projectId: string | null, 
  toast: ToastFn
) {
  const [isTogglingLoad, setIsTogglingLoad] = useState<string | null>(null);
  const [isCargaConfirmOpen, setIsCargaConfirmOpen] = useState(false);
  const [loadStatusToConfirm, setLoadStatusToConfirm] = useState<Mock | null>(null);
  const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false);
  const [mockToRestart, setMockToRestart] = useState<Mock | null>(null);

  return {
    isTogglingLoad, setIsTogglingLoad,
    isCargaConfirmOpen, setIsCargaConfirmOpen,
    loadStatusToConfirm, setLoadStatusToConfirm,
    isRestartConfirmOpen, setIsRestartConfirmOpen,
    mockToRestart, setMockToRestart,

    handleToggleLoadStatus: useCallback(async (mock: Mock, activeMocks: Mock[]) => {
      if (!db || !isAdmin || !projectId) return;
      const currentStatus = mock.status || (mock.isRunning ? 'CARGA_EM_ANDAMENTO' : 'PENDENTE');
      if (currentStatus === 'CARGA_EM_ANDAMENTO') { setLoadStatusToConfirm(mock); setIsCargaConfirmOpen(true); return; }
      if (currentStatus === 'CARGA_CONCLUIDA') { setMockToRestart(mock); setIsRestartConfirmOpen(true); return; }
      setIsTogglingLoad(mock.id);
      try {
        await setDocumentNonBlocking(doc(db, 'projects', projectId, 'mocks', mock.id), {
          status: 'CARGA_EM_ANDAMENTO', isRunning: true, updatedAt: serverTimestamp()
        }, { merge: true });
        activeMocks?.filter(m => (m.status === 'CARGA_EM_ANDAMENTO' || m.isRunning) && m.id !== mock.id)
          .forEach(rm => setDocumentNonBlocking(doc(db, 'projects', projectId, 'mocks', rm.id), {
            isRunning: false, status: 'PENDENTE'
          }, { merge: true }));
      } finally { setIsTogglingLoad(null); }
    }, [db, isAdmin, projectId]),

    confirmFinalizeCarga: useCallback(async () => {
      if (!isAdmin || !projectId || !loadStatusToConfirm || !db) return;
      await setDocumentNonBlocking(doc(db, 'projects', projectId, 'mocks', loadStatusToConfirm.id), {
        status: 'CARGA_CONCLUIDA', isRunning: false, updatedAt: serverTimestamp()
      }, { merge: true });
      setIsCargaConfirmOpen(false); setLoadStatusToConfirm(null);
    }, [isAdmin, projectId, loadStatusToConfirm, db]),

    handleConfirmRestart: useCallback(async () => {
      if (!isAdmin || !projectId || !mockToRestart || !db) return;
      setIsTogglingLoad(mockToRestart.id);
      try {
        await setDocumentNonBlocking(doc(db, 'projects', projectId, 'mocks', mockToRestart.id), {
          status: 'CARGA_EM_ANDAMENTO', isRunning: true, updatedAt: serverTimestamp()
        }, { merge: true });
        setIsRestartConfirmOpen(false); setMockToRestart(null);
      } finally { setIsTogglingLoad(null); }
    }, [isAdmin, projectId, mockToRestart, db]),

    handleStatusChange: useCallback(async (mock: Mock, newStatus: string, activeMocks: Mock[]) => {
      if (!db || !isAdmin || !projectId) return;
      const currentStatus = mock.status || (mock.isRunning ? 'CARGA_EM_ANDAMENTO' : 'PENDENTE');
      const targetStatus = newStatus.trim().toUpperCase();
      if (currentStatus === targetStatus) return;

      if (isMockCargaInProgress(mock) && targetStatus !== 'CARGA_CONCLUIDA') {
        toast({ variant: "destructive", description: "Finalize a carga antes de alterar para outro status." });
        return;
      }

      if (currentStatus === 'CARGA_EM_ANDAMENTO' && targetStatus === 'CARGA_CONCLUIDA') {
        setLoadStatusToConfirm(mock);
        setIsCargaConfirmOpen(true);
        return;
      }

      if (currentStatus === 'CARGA_CONCLUIDA' && targetStatus === 'CARGA_EM_ANDAMENTO') {
        setMockToRestart(mock);
        setIsRestartConfirmOpen(true);
        return;
      }

      if (targetStatus === 'CARGA_EM_ANDAMENTO') {
        setIsTogglingLoad(mock.id);
        try {
          await setDocumentNonBlocking(doc(db, 'projects', projectId, 'mocks', mock.id), {
            status: 'CARGA_EM_ANDAMENTO', isRunning: true, updatedAt: serverTimestamp()
          }, { merge: true });
          activeMocks?.filter(m => (m.status === 'CARGA_EM_ANDAMENTO' || m.isRunning) && m.id !== mock.id)
            .forEach(rm => setDocumentNonBlocking(doc(db, 'projects', projectId, 'mocks', rm.id), {
              isRunning: false, status: 'PENDENTE', updatedAt: serverTimestamp()
            }, { merge: true }));
        } finally { setIsTogglingLoad(null); }
        return;
      }

      setIsTogglingLoad(mock.id);
      try {
        await setDocumentNonBlocking(doc(db, 'projects', projectId, 'mocks', mock.id), {
          status: targetStatus,
          isRunning: false,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } finally { setIsTogglingLoad(null); }
    }, [db, isAdmin, projectId, toast]),
  };
}

function useMockBulkOps(
  db: CompatDb | null, 
  isAdmin: boolean, 
  projectId: string | null, 
  toast: ToastFn
) {
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkRestartConfirmOpen, setIsBulkRestartConfirmOpen] = useState(false);
  const [isBulkReseting, setIsBulkReseting] = useState(false);

  const _deleteObjects = useCallback(async (mockId: string) => {
    if (!projectId || !db) return;
    const { writeBatch, getDocs, collection } = await import("@/supabase/compat-db-shim");
    let batch = writeBatch(db); let opCount = 0;
    const snap = await getDocs(collection(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects'));
    for (const d of snap.docs) { batch.delete(d.ref); opCount++; if (opCount >= DB_BATCH_SIZE) { await batch.commit(); batch = writeBatch(db); opCount = 0; } }
    if (opCount > 0) await batch.commit();
  }, [db, projectId]);

  return {
    isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen,
    isBulkRestartConfirmOpen, setIsBulkRestartConfirmOpen,
    isBulkReseting, setIsBulkReseting,

    handleBulkDelete: useCallback(async (selectedMockId: string | null, mocks: Mock[]) => {
      if (!isAdmin || !projectId || !selectedMockId || selectedMockId === 'all' || !db) return;
      const mock = mocks?.find(m => m.id === selectedMockId);
      if (mock && (mock.status === 'CARGA_EM_ANDAMENTO' || mock.isRunning)) {
        toast({ variant: "destructive", description: "NÃO É POSSÍVEL EXCLUIR UM MOCK EM EXECUÇÃO." }); return;
      }
      try { await _deleteObjects(selectedMockId!); const { writeBatch, doc } = await import("@/supabase/compat-db-shim"); const b = writeBatch(db); b.delete(doc(db, 'projects', projectId, 'mocks', selectedMockId)); await b.commit(); setIsBulkDeleteConfirmOpen(false); }
      catch { toast({ variant: "destructive", description: "FALHA AO EXCLUIR." }); }
    }, [isAdmin, projectId, db, toast, _deleteObjects]),

    handleBulkReset: useCallback(async (selectedMockId: string | null, mocks: Mock[]) => {
      if (!isAdmin || !projectId || !selectedMockId || selectedMockId === 'all' || !db) return;
      const mock = mocks?.find(m => m.id === selectedMockId);
      if (mock && (mock.status === 'CARGA_EM_ANDAMENTO' || mock.isRunning)) {
        toast({ variant: "destructive", description: "NÃO É POSSÍVEL REINICIAR UM MOCK EM EXECUÇÃO." }); return;
      }
      setIsBulkReseting(true);
      try {
        if (mock) {
          await _deleteObjects(mock.id);
          await setDocumentNonBlocking(doc(db, 'projects', projectId, 'mocks', mock.id), {
            status: 'PENDENTE', isRunning: false, data_inicio_carga: null, data_fim_carga: null, isLocked: false, updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch { toast({ variant: "destructive", description: "FALHA AO REINICIAR." }); }
      finally { setIsBulkReseting(false); setIsBulkRestartConfirmOpen(false); }
    }, [isAdmin, projectId, db, toast, _deleteObjects]),
  };
}

function useMockCloneFeature(
  db: CompatDb | null, 
  user: User | null, 
  isAdmin: boolean, 
  projectId: string | null, 
  toast: ToastFn
) {
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [cloneSourceMock, setCloneSourceMock] = useState<Mock | null>(null);

  const _cloneObjects = useCallback(async (sourceMockId: string, targetMockId: string, ownerId?: string | null) => {
    if (!projectId || !db) return;
    const { collection, writeBatch, getDocs, doc, serverTimestamp } = await import("@/supabase/compat-db-shim");
    const snap = await getDocs(collection(db, 'projects', projectId, 'mocks', sourceMockId, 'migrationObjects'));
    if (snap.empty) return;

    const sourceRows = snap.docs.map((row) => ({
      oldId: row.id,
      data: row.data() as MigrationObject & Record<string, unknown>,
    }));
    const idMap = new Map(sourceRows.map((row) => [row.oldId, crypto.randomUUID()]));

    let batch = writeBatch(db);
    let count = 0;
    for (const row of sourceRows) {
      const newObjId = idMap.get(row.oldId)!;
      const remappedDeps = remapDependencyIds(
        sanitizeUuidList(row.data.dependencyIds),
        idMap,
      );
      batch.set(
        doc(db, 'projects', projectId, 'mocks', targetMockId, 'migrationObjects', newObjId),
        {
          ...buildClonedMigrationObjectRecord(row.data, {
            id: newObjId,
            mockId: targetMockId,
            projectId,
            ownerId,
            dependencyIds: remappedDeps,
          }),
          updatedAt: serverTimestamp(),
        },
      );
      count++;
      if (count >= DB_BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
  }, [db, projectId]);

  return {
    isCloneDialogOpen, setIsCloneDialogOpen,
    cloneSourceMock, setCloneSourceMock,

    handleConfirmClone: useCallback(async (sourceMock: Mock | null, cloneData: { sequence: string; explanatoryText: string }) => {
      if (!sourceMock || !isMockActive(sourceMock) || !isAdmin || !projectId || !user || !db) return false;
      try {
        const { collection, getDocs } = await import("@/supabase/compat-db-shim");
        const baseName = extractMockPrefix(sourceMock.name);
        const sequence = String(cloneData.sequence ?? "").trim().toUpperCase();
        if (!sequence) {
          toast({ variant: "destructive", description: "Informe a parte numérica da nova mock." });
          return false;
        }

        const finalId = crypto.randomUUID();
        const finalName = `${baseName.toUpperCase()}-${sequence}`;
        const mocksSnap = await getDocs(collection(db, 'projects', projectId, 'mocks'));
        const nameTaken = mocksSnap.docs.some((row) => {
          const rowName = String((row.data() as Record<string, unknown>).name ?? "").toUpperCase();
          return rowName === finalName;
        });
        if (nameTaken) {
          toast({
            variant: "destructive",
            description: `Já existe uma mock com o identificador ${finalName}. Escolha outra sequência.`,
          });
          return false;
        }

        await setDoc(
          doc(db, 'projects', projectId, 'mocks', finalId),
          {
            ...buildClonedMockRecord(sourceMock, {
              id: finalId,
              projectId,
              name: finalName,
              slug: slugify(finalName),
              explanatoryText: String(cloneData.explanatoryText ?? sourceMock.explanatoryText ?? "").toUpperCase(),
            }),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        await _cloneObjects(sourceMock.id, finalId, user.uid);
        toast({ description: `Mock ${finalName} clonada com sucesso.` });
        setIsCloneDialogOpen(false);
        setCloneSourceMock(null);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao clonar mock.";
        console.error("[handleConfirmClone]", error);
        toast({ variant: "destructive", description: message });
        throw error;
      }
    }, [isAdmin, projectId, user, db, toast, _cloneObjects]),
  };
}

// ── Hook principal composto ───────────────────────────────────────────

export function useMocksActions(
  projectId: string | null,
  isAdmin: boolean,
  userProfile: UserProfile | null,
  isMaster: boolean
) {
  const db = useDb();
  const { user } = useUser();
  const { toast } = useToast();

  const locking = useMockLocking(db, user, isAdmin, projectId, isMaster, userProfile, toast);
  const lifecycle = useMockLifecycle(db, isAdmin, projectId, toast);
  const bulkOps = useMockBulkOps(db, isAdmin, projectId, toast);
  const cloneFeature = useMockCloneFeature(db, user, isAdmin, projectId, toast);

  const [isForceLockOpen, setIsForceLockOpen] = useState(false);
  const [forceLockTarget, setForceLockTarget] = useState<Mock | null>(null);
  const [forceLockBlockerName, setForceLockBlockerName] = useState<string | null>(null);
  const [isQuickAdding, setIsQuickAdding] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  return {
    isCloneDialogOpen: cloneFeature.isCloneDialogOpen, setIsCloneDialogOpen: cloneFeature.setIsCloneDialogOpen,
    cloneSourceMock: cloneFeature.cloneSourceMock, setCloneSourceMock: cloneFeature.setCloneSourceMock,
    isCargaConfirmOpen: lifecycle.isCargaConfirmOpen, setIsCargaConfirmOpen: lifecycle.setIsCargaConfirmOpen,
    loadStatusToConfirm: lifecycle.loadStatusToConfirm, setLoadStatusToConfirm: lifecycle.setLoadStatusToConfirm,
    isRestartConfirmOpen: lifecycle.isRestartConfirmOpen, setIsRestartConfirmOpen: lifecycle.setIsRestartConfirmOpen,
    mockToRestart: lifecycle.mockToRestart, setMockToRestart: lifecycle.setMockToRestart,
    isBulkDeleteConfirmOpen: bulkOps.isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen: bulkOps.setIsBulkDeleteConfirmOpen,
    isBulkRestartConfirmOpen: bulkOps.isBulkRestartConfirmOpen, setIsBulkRestartConfirmOpen: bulkOps.setIsBulkRestartConfirmOpen,
    isBulkReseting: bulkOps.isBulkReseting, setIsBulkReseting: bulkOps.setIsBulkReseting,
    isForceLockOpen, setIsForceLockOpen,
    forceLockTarget, setForceLockTarget,
    forceLockBlockerName, setForceLockBlockerName,
    isQuickAdding, setIsQuickAdding,
    isTogglingLoad: lifecycle.isTogglingLoad, setIsTogglingLoad: lifecycle.setIsTogglingLoad,
    isResetting, setIsResetting,
    handleToggleLock: locking.handleToggleLock,
    handleToggleActive: locking.handleToggleActive,
    handleToggleLoadStatus: lifecycle.handleToggleLoadStatus,
    handleStatusChange: lifecycle.handleStatusChange,
    confirmFinalizeCarga: lifecycle.confirmFinalizeCarga,
    handleConfirmRestart: lifecycle.handleConfirmRestart,
    handleForceAcquire: locking.handleForceAcquire,
    handleBulkDelete: bulkOps.handleBulkDelete,
    handleBulkReset: bulkOps.handleBulkReset,
    handleConfirmClone: cloneFeature.handleConfirmClone,
    handleSaveMock: useCallback(async (
      editingMock: Mock | null,
      formData: any, // Form data depends on react-hook-form/zod, keeping any for now or could use a specific DTO
      selectedMasterIds: string[],
      masterObjects: any[],
      onSuccess: () => void
    ) => {
      if (!db || !projectId || !user) {
        toast({ variant: "destructive", description: "Sessão ou projeto indisponível. Tente novamente." });
        return;
      }

      const trimmedPrefix = String(formData.name ?? "").trim();
      const trimmedSequence = String(formData.sequence ?? "").trim();
      if (!trimmedPrefix) {
        toast({ variant: "destructive", description: "Informe o prefixo da mock." });
        return;
      }

      const isNew = !editingMock;
      const mockId = editingMock?.id ?? crypto.randomUUID();
      const finalName = trimmedSequence
        ? `${trimmedPrefix.toUpperCase()}-${trimmedSequence}`
        : trimmedPrefix.toUpperCase();
      const { sequence: _s, ...dataToSave } = formData;

      try {
        await setDoc(doc(db, 'projects', projectId, 'mocks', mockId), {
          ...dataToSave,
          id: mockId,
          projectId,
          name: finalName,
          slug: slugify(finalName),
          explanatoryText: String(formData.explanatoryText ?? "").toUpperCase(),
          updatedAt: serverTimestamp(),
          ...(isNew
            ? { status: 'PENDENTE', isRunning: false, isLocked: false, isActive: true, loadHistory: [] }
            : {}),
        }, { merge: true });

        if (isNew && selectedMasterIds.length > 0) {
          for (const masterId of selectedMasterIds) {
            const master = masterObjects?.find((m: any) => m.id === masterId);
            if (!master) continue;
            const objectId = crypto.randomUUID();
            await setDoc(doc(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects', objectId), {
              id: objectId,
              mockId,
              projectId,
              masterObjectId: masterId,
              name: master.name || '',
              description: master.description || '',
              chargeGroup: master.chargeGroup || '',
              chargeOrder: master.chargeOrder || '',
              isParallel: master.isParallel || false,
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
              dependencyIds: master.dependencyIds || [],
              ownerId: user.uid,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
        }

        toast({
          description: isNew ? `Mock ${finalName} criada com sucesso.` : `Mock ${finalName} atualizada.`,
        });
        onSuccess();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao salvar a mock.";
        toast({ variant: "destructive", description: message });
      }
    }, [db, projectId, user, toast]),
  };
}
