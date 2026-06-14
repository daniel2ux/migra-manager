import { useState, useEffect } from 'react';
import { doc, serverTimestamp, writeBatch, type CompatDb } from '@/supabase/compat-db-shim';
import type { User } from '@/supabase/auth-shim';
import { DB_BATCH_SIZE } from '@/lib/constants';
import type { MasterObject } from '@/types/master-object';
import { useToast } from '@/hooks/use-toast';
import {
  isJsonCatalogFile,
  parseMasterCatalogExportJson,
  planMasterCatalogJsonImport,
  type CatalogImportLog,
} from '@/lib/migration/master-catalog-import';

type ToastFn = ReturnType<typeof useToast>['toast'];
type ImportLog = CatalogImportLog;

interface UseObjectsImportDeps {
  db: CompatDb | null;
  user: User | null;
  objects: MasterObject[] | null | undefined;
  toast: ToastFn;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  terminalEndRef: React.RefObject<HTMLDivElement | null>;
  projectId: string | null;
  canRegisterObjects: boolean;
}

/**
 * Importação do catálogo mestre via arquivo JSON exportado pela plataforma.
 */
export function useObjectsImport({
  db,
  user,
  objects,
  toast,
  fileInputRef,
  terminalEndRef,
  projectId,
  canRegisterObjects,
}: UseObjectsImportDeps) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importFinished, setImportFinished] = useState(false);
  const [importCounts, setImportCounts] = useState({ created: 0, skipped: 0 });
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [importLogs, terminalEndRef]);

  const handleFileImport = async (fileOrEvent: File | React.ChangeEvent<HTMLInputElement>) => {
    const file = fileOrEvent instanceof File ? fileOrEvent : fileOrEvent.target.files?.[0];
    if (!file || !user || !db) return;

    if (!canRegisterObjects || !projectId) {
      toast({
        variant: 'destructive',
        description: 'CADASTRE A EMPRESA NO PROJETO ANTES DE IMPORTAR OBJETOS.',
      });
      return;
    }

    if (!isJsonCatalogFile(file)) {
      toast({
        variant: 'destructive',
        description: 'FORMATO NÃO SUPORTADO. USE ARQUIVO .JSON EXPORTADO PELA PLATAFORMA.',
      });
      return;
    }

    setIsImporting(true);
    setIsImportOpen(true);
    setImportProgress(0);
    setImportFinished(false);
    setImportLogs([{ msg: `> INICIANDO IMPORTAÇÃO JSON: ${file.name}`, type: 'info' }]);

    try {
      const text = await file.text();
      const payload = parseMasterCatalogExportJson(text);
      const plan = planMasterCatalogJsonImport(payload, objects, projectId, user.uid);

      setImportLogs((prev) => [...prev, ...plan.logs]);

      if (!plan.records.length) {
        setImportCounts({ created: 0, skipped: plan.skipped });
        setImportLogs((prev) => [
          ...prev,
          { msg: '> NENHUM OBJETO NOVO PARA IMPORTAR.', type: 'warning' },
        ]);
        setImportFinished(true);
        return;
      }

      let currentBatch = writeBatch(db);
      let batchCount = 0;
      const total = plan.records.length;

      for (let i = 0; i < total; i++) {
        const { id, data } = plan.records[i]!;
        currentBatch.set(
          doc(db, 'masterObjects', id),
          { ...data, updatedAt: serverTimestamp() },
          { merge: true },
        );
        batchCount++;

        if (batchCount >= DB_BATCH_SIZE) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          batchCount = 0;
        }

        setImportProgress(Math.round(((i + 1) / total) * 100));
      }

      if (batchCount > 0) await currentBatch.commit();

      setImportCounts({ created: plan.created, skipped: plan.skipped });
      setImportLogs((prev) => [...prev, { msg: '> PROCESSO FINALIZADO COM SUCESSO.', type: 'info' }]);
      setImportFinished(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ERRO DESCONHECIDO';
      setImportLogs((prev) => [
        ...prev,
        { msg: `[FATAL] ${message.toUpperCase()}`, type: 'error' },
      ]);
      toast({ variant: 'destructive', description: 'ERRO AO PROCESSAR ARQUIVO JSON.' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileImport(file);
  };

  return {
    isImportOpen,
    setIsImportOpen,
    isDragging,
    isImporting,
    importProgress,
    setImportProgress,
    importFinished,
    setImportFinished,
    importCounts,
    importLogs,
    setImportLogs,
    handleFileImport,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
