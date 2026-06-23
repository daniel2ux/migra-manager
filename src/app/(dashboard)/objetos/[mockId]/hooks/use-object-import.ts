import { useState, useRef, useEffect } from "react";
import { useDb, useUser } from "@/supabase";
import { collection, doc, serverTimestamp, getDocs, query, collectionGroup, where } from "@/supabase/compat-db-shim";
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/supabase/mutations";
import { parseBrazilianDateTime } from "@/lib/migration/format-utils";
import {
  isJsonMigrationObjectsFile,
  migrationImportRowsFromJson,
  parseMigrationObjectsExportJson,
  type MigrationObjectImportRow,
} from "@/lib/migration/migration-objects-export";
import type { MigrationObject } from "@/types/migration";
import type { MasterObject } from "@/types/master-object";
import type { UserProfile } from "@/types/migration";

export type ImportLog = { msg: string; type: 'info' | 'success' | 'warning' | 'error' };

interface UseObjectImportProps {
    projectId: string | null;
    mockId: string;
    objects: MigrationObject[] | undefined;
    masterObjects: MasterObject[] | undefined;
    userProfile: UserProfile | undefined;
}

async function processImportRow(
  parsed: MigrationObjectImportRow,
  ctx: {
    db: NonNullable<ReturnType<typeof useDb>>;
    projectId: string;
    mockId: string;
    user: NonNullable<ReturnType<typeof useUser>['user']>;
    userProfile: UserProfile | undefined;
    masterObjects: MasterObject[];
    currentObjects: MigrationObject[];
    _log: (msg: string, type?: ImportLog['type']) => void;
  },
): Promise<{ created: number; updated: number; skipped: number; commentsAdded: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let commentsAdded = 0;

  if (!parsed.objectName) {
    return { created, updated, skipped: 1, commentsAdded };
  }

  const master = ctx.masterObjects.find(mo => mo.name?.toUpperCase() === parsed.objectName);
  if (!master) {
    ctx._log(`[SALTADO] ${parsed.objectName}: NÃO ENCONTRADO NO CATÁLOGO.`, 'warning');
    return { created, updated, skipped: 1, commentsAdded };
  }

  let targetObjectId = ctx.currentObjects.find(o => o.name?.toUpperCase() === parsed.objectName)?.id;

  if (parsed.hasMetrics) {
    const currentObj = ctx.currentObjects.find(o => o.name?.toUpperCase() === parsed.objectName);
    const chargeStartTime = parseBrazilianDateTime(parsed.startRaw) || parsed.startRaw || undefined;
    const chargeEndTime = parseBrazilianDateTime(parsed.endRaw) || parsed.endRaw || undefined;
    let durationMs = 0;
    if (chargeStartTime && chargeEndTime) {
      const s = new Date(chargeStartTime).getTime();
      const e = new Date(chargeEndTime).getTime();
      if (!isNaN(s) && !isNaN(e) && e >= s) durationMs = Math.max(60000, e - s);
    }

    const objData: Record<string, unknown> = {
      targetRecordsCount: parsed.targetCount || (currentObj?.targetRecordsCount ?? 0),
      processedRecordsCount: parsed.processedCount,
      errorRecordsCount: parsed.errorCount,
      successfulRecordsCount: parsed.successCount,
      migratedRecordsCount: parsed.processedCount,
      currentChargeDurationMs: durationMs > 0 ? durationMs : (currentObj?.currentChargeDurationMs || 0),
      hasTechLogs: parsed.errorCount > 0,
      updatedAt: serverTimestamp(),
    };

    if (chargeStartTime) objData.chargeStartTime = chargeStartTime;
    if (chargeEndTime) objData.chargeEndTime = chargeEndTime;

    if (targetObjectId) {
      const shouldClearTechLogs = parsed.targetCount > 0 && parsed.errorCount === 0 && parsed.successCount >= parsed.targetCount;
      if (shouldClearTechLogs) {
        const commentsColRef = collection(ctx.db, "projects", ctx.projectId, "mocks", ctx.mockId, "migrationObjects", targetObjectId, "comments");
        const commentsSnap = await getDocs(commentsColRef);
        if (!commentsSnap.empty) {
          await Promise.all(commentsSnap.docs.map((d) => deleteDocumentNonBlocking(d.ref)));
          ctx._log(`[LIMPEZA] ${parsed.objectName}: logs técnicos removidos (100% sem erros).`, 'info');
        }
        objData.hasTechLogs = false;
      }
      setDocumentNonBlocking(doc(ctx.db, 'projects', ctx.projectId, 'mocks', ctx.mockId, 'migrationObjects', targetObjectId), objData, { merge: true });
      updated++;
    } else {
      const newId = Math.random().toString(36).substr(2, 9);
      targetObjectId = newId;
      const shouldClearTechLogs = parsed.targetCount > 0 && parsed.errorCount === 0 && parsed.successCount >= parsed.targetCount;
      if (shouldClearTechLogs) {
        objData.hasTechLogs = false;
      }
      setDocumentNonBlocking(doc(ctx.db, 'projects', ctx.projectId, 'mocks', ctx.mockId, 'migrationObjects', newId), {
        id: newId, mockId: ctx.mockId, projectId: ctx.projectId, masterObjectId: master.id, name: master.name,
        description: master.description || '', chargeGroup: master.chargeGroup || '',
        chargeOrder: master.chargeOrder || '', ...objData,
        previousMigratedRecordsCount: 0, previousChargeDurationMs: 0,
        dependencyIds: master.dependencyIds || [], ownerId: ctx.user.uid,
      }, { merge: true });
      created++;
    }
  }

  if (parsed.comment && targetObjectId) {
    const commentsColRef = collection(ctx.db, "projects", ctx.projectId, "mocks", ctx.mockId, "migrationObjects", targetObjectId, "comments");
    addDocumentNonBlocking(commentsColRef, {
      text: parsed.comment, authorId: ctx.user.uid,
      authorName: ctx.userProfile?.name || "Importação", authorRole: ctx.userProfile?.role || "membro",
      status: parsed.logStatus, projectId: ctx.projectId, mockId: ctx.mockId, objectId: targetObjectId, createdAt: serverTimestamp(),
    });
    setDocumentNonBlocking(doc(ctx.db, 'projects', ctx.projectId, 'mocks', ctx.mockId, 'migrationObjects', targetObjectId), { hasTechLogs: true, updatedAt: serverTimestamp() }, { merge: true });
    commentsAdded++;
  }

  return { created, updated, skipped, commentsAdded };
}

export function useObjectImport({ projectId, mockId, objects, masterObjects, userProfile }: UseObjectImportProps) {
    const db = useDb();
    const { user } = useUser();

    const [isImporting, setIsImporting] = useState(false);
    const [importLogOpen, setImportLogOpen] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importFinished, setImportFinished] = useState(false);
    const [importCounts, setImportCounts] = useState({ created: 0, updated: 0, skipped: 0 });
    const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const importFileInputRef = useRef<HTMLInputElement>(null);
    const navImportFileRef = useRef<HTMLInputElement>(null);
    const terminalEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [importLogs]);

    const resetImportState = () => { setImportFinished(false); setImportProgress(0); setImportLogs([]); };

    const _log = (msg: string, type: ImportLog['type'] = 'info') => setImportLogs(prev => [...prev, { msg, type }]);

    const handleImportFile = async (file: File) => {
        if (!projectId || !mockId || !user || !masterObjects || !db) return;

        setImportLogOpen(true); setImportFinished(false); setImportProgress(0);
        setImportLogs([{ msg: `> ANALISANDO ARQUIVO: ${file.name}`, type: 'info' }]);

        let rawText: string;
        try { rawText = await file.text(); } catch { _log(`[FATAL] FALHA AO LER O ARQUIVO.`, 'error'); return; }

        if (!isJsonMigrationObjectsFile(file)) {
            _log(`[ERRO] FORMATO NÃO SUPORTADO. USE ARQUIVO .JSON EXPORTADO PELA PLATAFORMA.`, 'error');
            return;
        }

        let importRows: MigrationObjectImportRow[];
        try {
            const payload = parseMigrationObjectsExportJson(rawText);
            if (payload.projectId !== projectId) {
                _log(`> AVISO: JSON DE OUTRO PROJETO; IMPORTANDO NO PROJETO ATUAL.`, 'warning');
            }
            importRows = migrationImportRowsFromJson(payload);
            _log(`> JSON: ${importRows.length} OBJETO(S) DETECTADO(S).`, 'info');
        } catch (err) {
            _log(`[ERRO] ${err instanceof Error ? err.message : 'JSON INVÁLIDO.'}`, 'error');
            return;
        }

        if (importRows.length === 0) { _log(`[ERRO] NENHUM DADO ENCONTRADO.`, 'error'); return; }

        setIsImporting(true);
        let created = 0, updated = 0, skipped = 0, commentsAdded = 0;

        try {
            _log(`> LIMPANDO LOGS ANTERIORES DO MOCK...`, 'warning');
            const q = query(collectionGroup(db, "comments"), where("mockId", "==", mockId));
            const snap = await getDocs(q);
            if (!snap.empty) await Promise.all(snap.docs.map(d => deleteDocumentNonBlocking(d.ref)));

            const currentObjects = objects || [];
            for (let i = 0; i < importRows.length; i++) {
                const result = await processImportRow(importRows[i]!, {
                    db, projectId, mockId, user, userProfile, masterObjects, currentObjects, _log,
                });
                created += result.created;
                updated += result.updated;
                skipped += result.skipped;
                commentsAdded += result.commentsAdded;

                setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
            }

            setImportCounts({ created, updated, skipped });
            _log(`> IMPORTAÇÃO CONCLUÍDA: ${created} criados, ${updated} atualizados.`, 'info');
            if (commentsAdded > 0) _log(`> LOGS TÉCNICOS: ${commentsAdded} comentários importados.`, 'success');
            setImportFinished(true);
        } catch {
            _log(`[FATAL] ERRO NO PROCESSAMENTO.`, 'error');
        } finally {
            setIsImporting(false);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleImportFile(e.dataTransfer.files[0]); };

    return {
        isImporting, importLogOpen, setImportLogOpen, importProgress, importFinished, importCounts, importLogs, isDragging,
        importFileInputRef, navImportFileRef, terminalEndRef,
        handleImportFile, handleDragOver, handleDragLeave, handleDrop, resetImportState,
    };
}
