import { useState, useEffect } from 'react';
import { doc, serverTimestamp, writeBatch, type CompatDb } from '@/supabase/compat-db-shim';
import type { User } from '@/supabase/auth-shim';
import { DB_BATCH_SIZE } from '@/lib/constants';
import type { MasterObject } from '@/types/master-object';
import { useToast } from '@/hooks/use-toast';
import { normalizeMasterCatalogName } from '@/lib/migration/master-catalog';

type ToastFn = ReturnType<typeof useToast>['toast'];
type ImportLog = { msg: string; type: 'info' | 'success' | 'warning' | 'error' };

interface UseObjectsImportDeps {
  db: CompatDb | null;
  user: User | null;
  objects: MasterObject[] | null | undefined;
  toast: ToastFn;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  terminalEndRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Gerencia o fluxo completo de importação de objetos via arquivo CSV/TXT,
 * incluindo drag-and-drop, progresso, logs e escrita em batch no CompatDb.
 */
export function useObjectsImport({
  db, user, objects, toast, fileInputRef, terminalEndRef,
}: UseObjectsImportDeps) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importFinished, setImportFinished] = useState(false);
  const [importCounts, setImportCounts] = useState({ created: 0, skipped: 0 });
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);

  // Restaura pointer-events após fechar o dialog de importação
  useEffect(() => {
    if (!isImporting && !isImportOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isImporting, isImportOpen]);

  // Auto-scroll do terminal de logs para o fim
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [importLogs, terminalEndRef]);

  const handleFileImport = async (fileOrEvent: File | React.ChangeEvent<HTMLInputElement>) => {
    const file = fileOrEvent instanceof File ? fileOrEvent : fileOrEvent.target.files?.[0];
    if (!file || !user || !db) return;

    setIsImporting(true);
    setIsImportOpen(true);
    setImportProgress(0);
    setImportFinished(false);
    setImportLogs([{ msg: `> INICIANDO IMPORTAÇÃO: ${file.name}`, type: 'info' }]);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      const total = lines.length;
      let created = 0, skipped = 0;
      setImportLogs(prev => [...prev, { msg: `> ${total} REGISTROS DETECTADOS. PROCESSANDO...`, type: 'info' }]);

      let currentBatch = writeBatch(db);
      let batchCount = 0;

      for (let i = 0; i < total; i++) {
        const parts = lines[i].split(/[,;\t]/);
        const name = parts[0]?.trim().toUpperCase();
        const description = parts.slice(1).join(' ').trim().toUpperCase();

        if (name) {
          const exists = objects?.some(obj => normalizeMasterCatalogName(obj.name) === name);
          if (!exists) {
            const objectId = Math.random().toString(36).substr(2, 9);
            currentBatch.set(doc(db, 'masterObjects', objectId), {
              id: objectId, name, description: description || name,
              chargeGroup: 'G', chargeOrder: 0, ownerId: user.uid, updatedAt: serverTimestamp(),
            }, { merge: true });
            batchCount++;
            if (batchCount >= DB_BATCH_SIZE) {
              await currentBatch.commit();
              currentBatch = writeBatch(db);
              batchCount = 0;
            }
            setImportLogs(prev => [...prev, { msg: `[NOVO] ${name}: OBJETO ADICIONADO AO CATÁLOGO.`, type: 'success' }]);
            created++;
          } else {
            setImportLogs(prev => [...prev, { msg: `[SALTADO] ${name}: OBJETO JÁ EXISTE NO CATÁLOGO.`, type: 'warning' }]);
            skipped++;
          }
        } else {
          setImportLogs(prev => [...prev, { msg: `[ERRO] LINHA ${i + 1}: NOME DO OBJETO VAZIO OU INVÁLIDO.`, type: 'error' }]);
          skipped++;
        }
        setImportProgress(Math.round(((i + 1) / total) * 100));
      }

      if (batchCount > 0) await currentBatch.commit();
      setImportCounts({ created, skipped });
      setImportLogs(prev => [...prev, { msg: `> PROCESSO FINALIZADO COM SUCESSO.`, type: 'info' }]);
      setImportFinished(true);
    } catch {
      setImportLogs(prev => [...prev, { msg: `[FATAL] ERRO CRÍTICO NO PROCESSAMENTO DO ARQUIVO.`, type: 'error' }]);
      toast({ variant: 'destructive', description: 'ERRO AO PROCESSAR ARQUIVO.' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileImport(file);
  };

  return {
    isImportOpen, setIsImportOpen,
    isDragging,
    isImporting,
    importProgress, setImportProgress,
    importFinished, setImportFinished,
    importCounts,
    importLogs, setImportLogs,
    handleFileImport, handleDragOver, handleDragLeave, handleDrop,
  };
}

