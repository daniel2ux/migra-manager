import { useState, useRef, useEffect } from "react";
import { useFirestore, useUser } from "@/supabase";
import { collection, doc, serverTimestamp, getDocs, query, collectionGroup, where } from "firebase/firestore";
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/supabase/mutations";
import { parseBrazilianDateTime } from "@/lib/migration/format-utils";
import { parseCsvHeader, parseCsvLine } from "@/lib/import/csv-parser";
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

export function useObjectImport({ projectId, mockId, objects, masterObjects, userProfile }: UseObjectImportProps) {
    const db = useFirestore();
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

    // Safety guard for Radix UI body styles
    useEffect(() => {
        if (!isImporting && !importLogOpen) {
            const timer = setTimeout(() => { document.body.style.pointerEvents = 'auto'; document.body.style.overflow = 'auto'; }, 100);
            return () => clearTimeout(timer);
        }
    }, [isImporting, importLogOpen]);

    // Auto-scroll terminal
    useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [importLogs]);

    const resetImportState = () => { setImportFinished(false); setImportProgress(0); setImportLogs([]); };

    const _log = (msg: string, type: ImportLog['type'] = 'info') => setImportLogs(prev => [...prev, { msg, type }]);

    // ── Main import handler ───────────────────────────────────────────
    const handleImportFile = async (file: File) => {
        if (!projectId || !mockId || !user || !masterObjects) return;

        setImportLogOpen(true); setImportFinished(false); setImportProgress(0);
        setImportLogs([{ msg: `> ANALISANDO ARQUIVO: ${file.name}`, type: 'info' }]);

        let rawText: string;
        try { rawText = await file.text(); } catch { _log(`[FATAL] FALHA AO LER O ARQUIVO.`, 'error'); return; }

        const allLines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        if (allLines.length === 0) { _log(`[ERRO] O ARQUIVO ESTÁ VAZIO.`, 'error'); return; }

        const { colMap, isHeader } = parseCsvHeader(allLines[0]);
        if (isHeader) _log(`> CABEÇALHO DETECTADO. MAPEAMENTO OK.`, 'info');

        const dataLines = isHeader ? allLines.slice(1) : allLines;
        if (dataLines.length === 0) { _log(`[ERRO] NENHUM DADO ENCONTRADO.`, 'error'); return; }

        setIsImporting(true);
        let created = 0, updated = 0, skipped = 0, commentsAdded = 0;

        try {
            // Limpeza global de logs técnicos do Mock
            _log(`> LIMPANDO LOGS ANTERIORES DO MOCK...`, 'warning');
            const q = query(collectionGroup(db!, "comments"), where("mockId", "==", mockId));
            const snap = await getDocs(q);
            if (!snap.empty) await Promise.all(snap.docs.map(d => deleteDocumentNonBlocking(d.ref)));

            const currentObjects = objects || [];
            for (let i = 0; i < dataLines.length; i++) {
                const parsed = parseCsvLine(dataLines[i], colMap);
                if (!parsed.objectName) { skipped++; continue; }

                const master = masterObjects.find(mo => mo.name?.toUpperCase() === parsed.objectName);
                if (!master) { _log(`[SALTADO] ${parsed.objectName}: NÃO ENCONTRADO NO CATÁLOGO.`, 'warning'); skipped++; continue; }

                let targetObjectId = currentObjects.find(o => o.name?.toUpperCase() === parsed.objectName)?.id;

                if (parsed.hasMetrics) {
                    const currentObj = currentObjects.find(o => o.name?.toUpperCase() === parsed.objectName);
                    const chargeStartTime = parseBrazilianDateTime(parsed.startRaw);
                    const chargeEndTime = parseBrazilianDateTime(parsed.endRaw);
                    let durationMs = 0;
                    if (chargeStartTime && chargeEndTime) {
                        const s = new Date(chargeStartTime).getTime(), e = new Date(chargeEndTime).getTime();
                        if (!isNaN(s) && !isNaN(e) && e >= s) durationMs = Math.max(60000, e - s);
                    }

                    const objData: any = {
                        targetRecordsCount: parsed.targetCount || (currentObjects.find(o => o.name?.toUpperCase() === parsed.objectName)?.targetRecordsCount ?? 0),
                        processedRecordsCount: parsed.processedCount, errorRecordsCount: parsed.errorCount,
                        successfulRecordsCount: parsed.successCount, migratedRecordsCount: parsed.processedCount,
                        currentChargeDurationMs: durationMs > 0 ? durationMs : (currentObj?.currentChargeDurationMs || 0),
                        hasTechLogs: parsed.errorCount > 0,
                        updatedAt: serverTimestamp(),
                    };

                    // Em reimportação, não sobrescreve datas válidas existentes por vazio.
                    if (chargeStartTime) objData.chargeStartTime = chargeStartTime;
                    if (chargeEndTime) objData.chargeEndTime = chargeEndTime;
                    if (!chargeStartTime && parsed.startRaw) {
                        _log(`[AVISO] ${parsed.objectName}: DATA_INICIO inválida ('${parsed.startRaw}') - mantida data anterior.`, 'warning');
                    }
                    if (!chargeEndTime && parsed.endRaw) {
                        _log(`[AVISO] ${parsed.objectName}: DATA_FIM inválida ('${parsed.endRaw}') - mantida data anterior.`, 'warning');
                    }

                    if (targetObjectId) {
                        const shouldClearTechLogs = parsed.targetCount > 0 && parsed.errorCount === 0 && parsed.successCount >= parsed.targetCount;
                        if (shouldClearTechLogs) {
                            const commentsColRef = collection(db!, "projects", projectId, "mocks", mockId, "migrationObjects", targetObjectId, "comments");
                            const commentsSnap = await getDocs(commentsColRef);
                            if (!commentsSnap.empty) {
                                await Promise.all(commentsSnap.docs.map((d) => deleteDocumentNonBlocking(d.ref)));
                                _log(`[LIMPEZA] ${parsed.objectName}: logs técnicos removidos (100% sem erros).`, 'info');
                            }
                            objData.hasTechLogs = false;
                        }
                        setDocumentNonBlocking(doc(db!, 'projects', projectId, 'mocks', mockId, 'migrationObjects', targetObjectId), objData, { merge: true });
                        updated++;
                    } else {
                        const newId = Math.random().toString(36).substr(2, 9);
                        targetObjectId = newId;
                        const shouldClearTechLogs = parsed.targetCount > 0 && parsed.errorCount === 0 && parsed.successCount >= parsed.targetCount;
                        if (shouldClearTechLogs) {
                            objData.hasTechLogs = false;
                        }
                        setDocumentNonBlocking(doc(db!, 'projects', projectId, 'mocks', mockId, 'migrationObjects', newId), {
                            id: newId, mockId, projectId, masterObjectId: master.id, name: master.name,
                            description: master.description || '', chargeGroup: master.chargeGroup || '',
                            chargeOrder: master.chargeOrder || '', ...objData,
                            previousMigratedRecordsCount: 0, previousChargeDurationMs: 0,
                            dependencyIds: master.dependencyIds || [], ownerId: user.uid,
                        }, { merge: true });
                        created++;
                    }
                }

                if (parsed.comment && targetObjectId) {
                    const commentsColRef = collection(db!, "projects", projectId, "mocks", mockId, "migrationObjects", targetObjectId, "comments");
                    addDocumentNonBlocking(commentsColRef, {
                        text: parsed.comment, authorId: user.uid,
                        authorName: userProfile?.name || "Importação", authorRole: userProfile?.role || "user",
                        status: parsed.logStatus, projectId, mockId, objectId: targetObjectId, createdAt: serverTimestamp(),
                    });
                    setDocumentNonBlocking(doc(db!, 'projects', projectId, 'mocks', mockId, 'migrationObjects', targetObjectId), { hasTechLogs: true, updatedAt: serverTimestamp() }, { merge: true });
                    commentsAdded++;
                }

                setImportProgress(Math.round(((i + 1) / dataLines.length) * 100));
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

    // ── Drag handlers ─────────────────────────────────────────────────
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleImportFile(e.dataTransfer.files[0]); };

    return {
        isImporting, importLogOpen, setImportLogOpen, importProgress, importFinished, importCounts, importLogs, isDragging,
        importFileInputRef, navImportFileRef, terminalEndRef,
        handleImportFile, handleDragOver, handleDragLeave, handleDrop, resetImportState,
    };
}
