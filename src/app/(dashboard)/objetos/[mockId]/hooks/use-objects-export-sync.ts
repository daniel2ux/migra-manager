"use client";

import { useState } from 'react';
import { collection, doc, serverTimestamp, query, orderBy, getDocs } from '@/supabase/compat-db-shim';
import { setDocumentNonBlocking } from '@/supabase/mutations';
import type { Mock } from '@/types/migration';
import { filterActiveMocks } from '@/lib/mock-utils';
import type { MigrationObject } from '../types';
import {
  buildMigrationObjectsExportPayload,
  downloadJsonFile,
  suggestMigrationObjectsExportFilename,
} from '@/lib/migration/migration-objects-export';

interface UseObjectsExportSyncDeps {
  db: any;
  projectId: string | null;
  projectName: string;
  mockId: string | null;
  isAdmin: boolean;
  isEffectiveLocked: boolean;
  objects: MigrationObject[] | null | undefined;
  sortedObjects: any[];
  mockData: Mock | null | undefined;
  toast: (opts: any) => void;
}

/**
 * Exportação JSON dos objetos e sincronização de referências
 * com o mock anterior (previousChargeDurationMs / previousMigratedRecordsCount).
 */
export function useObjectsExportSync({
  db, projectId, projectName, mockId, isAdmin, isEffectiveLocked,
  objects, sortedObjects, mockData, toast,
}: UseObjectsExportSyncDeps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleExportJson = () => {
    if (!objects || objects.length === 0) {
      toast({ variant: 'destructive', description: 'Nenhum objeto para exportar.' });
      return;
    }
    if (!projectId || !mockId || !mockData) {
      toast({ variant: 'destructive', description: 'Projeto ou mock não identificados.' });
      return;
    }

    const payload = buildMigrationObjectsExportPayload(sortedObjects, projectId, {
      id: mockId,
      name: mockData.name,
    });
    const filename = suggestMigrationObjectsExportFilename(
      projectName || 'projeto',
      mockData.name,
    );
    downloadJsonFile(payload, filename);
  };

  const handleSyncPreviousReferences = async () => {
    if (!isAdmin || isEffectiveLocked || !projectId || !mockId || !db) return;

    try {
      setIsSyncing(true);
      toast({ description: 'INICIANDO SINCRONIZAÇÃO DE REFERÊNCIAS...' });

      const mocksSnap = await getDocs(query(collection(db, 'projects', projectId, 'mocks'), orderBy('startDate', 'asc')));
      const allMocks = filterActiveMocks(mocksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Mock)));
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

  return { isSyncing, handleExportJson, handleSyncPreviousReferences };
}
