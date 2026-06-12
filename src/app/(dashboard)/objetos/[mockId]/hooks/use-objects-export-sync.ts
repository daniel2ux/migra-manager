"use client";

import { useState } from 'react';
import { collection, doc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Mock } from '@/types/migration';
import type { MigrationObject } from '../types';

interface UseObjectsExportSyncDeps {
  db: any;
  projectId: string | null;
  mockId: string | null;
  isAdmin: boolean;
  isEffectiveLocked: boolean;
  objects: MigrationObject[] | null | undefined;
  sortedObjects: any[];
  mockData: Mock | null | undefined;
  toast: (opts: any) => void;
}

/**
 * Gerencia exportação CSV dos objetos e sincronização de referências
 * com o mock anterior (previousChargeDurationMs / previousMigratedRecordsCount).
 */
export function useObjectsExportSync({
  db, projectId, mockId, isAdmin, isEffectiveLocked,
  objects, sortedObjects, mockData, toast,
}: UseObjectsExportSyncDeps) {
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Exportação CSV ───────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!objects || objects.length === 0) {
      toast({ variant: 'destructive', description: 'Nenhum objeto para exportar.' });
      return;
    }

    const header = ['OBJETO', 'DATA_INICIO', 'DATA_FIM', 'TARGET', 'PROCESSADO', 'ERRO', 'STATUS'];
    const rows = sortedObjects.map(obj => {
      const fmt = (dt: string) => dt
        ? new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      const processed = Number(obj.processedRecordsCount) || 0;
      const error = Number(obj.errorRecordsCount) || 0;
      return [
        obj.name.toUpperCase(),
        fmt(obj.chargeStartTime),
        fmt(obj.chargeEndTime),
        obj.targetRecordsCount || 0,
        processed,
        error,
        obj.status || (obj.chargeStartTime && !obj.chargeEndTime ? 'CARGA_EM_ANDAMENTO' : 'PENDENTE'),
      ].join(';');
    });

    const csvContent = [header.join(';'), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `MIGRA_EXPORT_${mockData?.name?.toUpperCase() || 'MOCK'}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Sincronização de referências com mock anterior ───────────────────────────
  const handleSyncPreviousReferences = async () => {
    if (!isAdmin || isEffectiveLocked || !projectId || !mockId || !db) return;

    try {
      setIsSyncing(true);
      toast({ description: 'INICIANDO SINCRONIZAÇÃO DE REFERÊNCIAS...' });

      const mocksSnap = await getDocs(query(collection(db, 'projects', projectId, 'mocks'), orderBy('startDate', 'asc')));
      const allMocks = mocksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Mock));
      const currentMockIndex = allMocks.findIndex(m => m.id === mockId);

      if (currentMockIndex <= 0) {
        toast({ variant: 'destructive', description: 'NÃO FOI POSSÍVEL LOCALIZAR UM MOCK ANTERIOR PARA REFERÊNCIA.' });
        return;
      }

      const previousMock = allMocks[currentMockIndex - 1];
      const prevObjectsSnap = await getDocs(collection(db, 'projects', projectId, 'mocks', previousMock.id, 'migrationObjects'));
      const prevObjects = prevObjectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MigrationObject));
      const prevMap = new Map(prevObjects.map(obj => [obj.masterObjectId, obj]));

      let updatedCount = 0;
      await Promise.all((objects ?? []).map(async obj => {
        const prevData = prevMap.get(obj.masterObjectId);
        if (prevData) {
          const objectRef = doc(db!, 'projects', projectId!, 'mocks', mockId!, 'migrationObjects', obj.id);
          await setDocumentNonBlocking(objectRef, {
            previousChargeDurationMs: prevData.currentChargeDurationMs || 0,
            previousMigratedRecordsCount: prevData.migratedRecordsCount || 0,
            updatedAt: serverTimestamp(),
          }, { merge: true });
          updatedCount++;
        }
      }));

      toast({ description: `SINCRONIZAÇÃO CONCLUÍDA: ${updatedCount} OBJETOS ATUALIZADOS COM BASE NO MOCK '${previousMock.name}'.` });
    } catch (error) {
      console.error('Erro ao sincronizar referências:', error);
      toast({ variant: 'destructive', description: 'FALHA AO SINCRONIZAR REFERÊNCIAS ANTERIORES.' });
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, handleExportCSV, handleSyncPreviousReferences };
}
