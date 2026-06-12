"use client";

import { useState } from 'react';
import { doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/supabase/mutations';
import type { AggregatedObject, Mock } from '@/types/migration';

interface UseDashboardMockActionsDeps {
  db: any;
  isAdmin: boolean | undefined;
  user: any;
  userProfile: any;
  allMocks: Mock[] | null | undefined;
  effectiveMockId: string | null | undefined;
  selectedProjectId: string;
  mocksByIdMap: Map<string, Mock>;
}

/**
 * Gerencia as ações de status de carga: toggle de objeto, reset individual,
 * toggle de mock (janela), restart e finalização de carga.
 */
export function useDashboardMockActions({
  db, isAdmin, user, userProfile, allMocks, effectiveMockId, selectedProjectId, mocksByIdMap,
}: UseDashboardMockActionsDeps) {
  const [isIndividualResetOpen, setIsIndividualResetOpen] = useState(false);
  const [objectToReset, setObjectToReset] = useState<AggregatedObject | null>(null);
  const [loadStatusToConfirm, setLoadStatusToConfirm] = useState<Mock | null>(null);
  const [isCargaConfirmOpen, setIsCargaConfirmOpen] = useState(false);
  const [isTogglingLoad, setIsTogglingLoad] = useState<string | null>(null);
  const [mockToRestart, setMockToRestart] = useState<Mock | null>(null);
  const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false);

  // ── Toggle status de carga de um objeto individual ───────────────────────
  const handleToggleObjectLoad = async (obj: AggregatedObject) => {
    if (!isAdmin || !db) return;
    const pId = obj.projectId || selectedProjectId;
    const mId = obj.mockId || effectiveMockId;
    if (!pId || !mId || mId === 'all') return;

    const objectRef = doc(db, 'projects', pId, 'mocks', mId, 'migrationObjects', obj.id);
    const currentStatus = obj.status || (obj.chargeStartTime && !obj.chargeEndTime ? 'CARGA_EM_ANDAMENTO' : 'PENDENTE');

    if (currentStatus === 'CARGA_EM_ANDAMENTO') {
      await setDocumentNonBlocking(objectRef, { status: 'CARGA_CONCLUIDA', updatedAt: serverTimestamp() }, { merge: true });
      return;
    }
    if (currentStatus === 'CARGA_CONCLUIDA') {
      setObjectToReset(obj);
      setIsIndividualResetOpen(true);
      return;
    }
    await setDocumentNonBlocking(objectRef, { status: 'CARGA_EM_ANDAMENTO', updatedAt: serverTimestamp() }, { merge: true });
  };

  // ── Reset individual de objeto ────────────────────────────────────────────
  const handleIndividualReset = async () => {
    if (!isAdmin || !db || !objectToReset) return;
    const obj = objectToReset;
    const mockId = obj.mockId ?? effectiveMockId ?? '';
    const pId = obj.projectId;
    if (!mockId || !pId) return;

    const objectRef = doc(db, 'projects', pId, 'mocks', mockId, 'migrationObjects', obj.id);
    setIsIndividualResetOpen(false);
    await setDocumentNonBlocking(objectRef, {
      status: 'CARGA_EM_ANDAMENTO',
      chargeStartTime: '',
      chargeEndTime: '',
      initialChargeStartTime: null,
      initialChargeEndTime: null,
      processedRecordsCount: 0,
      successfulRecordsCount: 0,
      errorRecordsCount: 0,
      currentChargeDurationMs: 0,
      loadHistory: [],
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setObjectToReset(null);
  };

  // ── Toggle de mock/janela ─────────────────────────────────────────────────
  const _handleToggleMockLoad = async (mockId: string, projectId: string) => {
    if (!isAdmin || !db) return;
    const mock = mocksByIdMap.get(mockId);
    if (!mock) return;

    if (mock.status === 'CARGA_CONCLUIDA') {
      setMockToRestart(mock);
      setIsRestartConfirmOpen(true);
      return;
    }

    const mockRef = doc(db, 'projects', projectId, 'mocks', mockId);
    const isRunning = mock.status === 'CARGA_EM_ANDAMENTO' || mock.isRunning;
    setIsTogglingLoad(mockId);
    try {
      if (isRunning) {
        setLoadStatusToConfirm(mock);
        setIsCargaConfirmOpen(true);
      } else {
        allMocks
          ?.filter((m: Mock) => (m.status === 'CARGA_EM_ANDAMENTO' || m.isRunning) && m.id !== mockId)
          .forEach((rm: Mock) => {
            const rmRef = doc(db!, 'projects', rm.projectId, 'mocks', rm.id);
            setDocumentNonBlocking(rmRef, { isRunning: false, status: 'PENDENTE' }, { merge: true });
          });
        await setDocumentNonBlocking(mockRef, {
          status: 'CARGA_EM_ANDAMENTO', isRunning: true, updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } finally {
      setIsTogglingLoad(null);
    }
  };

  // ── Finalizar carga (confirmar conclusão) ─────────────────────────────────
  const confirmFinalizeCarga = () => {
    if (!isAdmin || !db || !loadStatusToConfirm) return;
    const mockRef = doc(db, 'projects', loadStatusToConfirm.projectId, 'mocks', loadStatusToConfirm.id);
    const nowISO = new Date().toISOString();

    let durationMs = 0;
    if (loadStatusToConfirm.data_inicio_carga) {
      durationMs = Math.max(0, new Date(nowISO).getTime() - new Date(loadStatusToConfirm.data_inicio_carga).getTime());
    }

    const historyEntry = {
      id: Math.random().toString(36).substr(2, 9),
      data_inicio: loadStatusToConfirm.data_inicio_carga || '',
      data_fim: nowISO,
      status: 'CARGA_CONCLUIDA',
      duracaoMs: durationMs,
      finalizadoPor: user?.uid || 'anon',
      finalizadoNome: userProfile?.name || 'Sistema',
      timestamp: nowISO,
    };

    setDocumentNonBlocking(mockRef, {
      status: 'CARGA_CONCLUIDA',
      isRunning: false,
      data_fim_carga: nowISO,
      isLocked: true,
      loadHistory: [historyEntry, ...(loadStatusToConfirm.loadHistory || [])],
      updatedAt: serverTimestamp(),
    }, { merge: true });

    setIsCargaConfirmOpen(false);
    setLoadStatusToConfirm(null);
  };

  // ── Restart de mock ───────────────────────────────────────────────────────
  const handleConfirmRestart = async () => {
    if (!isAdmin || !db || !mockToRestart) return;
    const mockRef = doc(db, 'projects', mockToRestart.projectId, 'mocks', mockToRestart.id);
    setIsTogglingLoad(mockToRestart.id);
    try {
      await setDocumentNonBlocking(mockRef, {
        status: 'PENDENTE', isRunning: false,
        data_inicio_carga: null, data_fim_carga: null,
        isLocked: false, updatedAt: serverTimestamp(),
      }, { merge: true });
      setIsRestartConfirmOpen(false);
      setMockToRestart(null);
    } finally {
      setIsTogglingLoad(null);
    }
  };

  return {
    isIndividualResetOpen, setIsIndividualResetOpen,
    objectToReset, setObjectToReset,
    loadStatusToConfirm, setLoadStatusToConfirm,
    isCargaConfirmOpen, setIsCargaConfirmOpen,
    isTogglingLoad,
    mockToRestart, setMockToRestart,
    isRestartConfirmOpen, setIsRestartConfirmOpen,
    handleToggleObjectLoad,
    handleIndividualReset,
    _handleToggleMockLoad,
    confirmFinalizeCarga,
    handleConfirmRestart,
  };
}
