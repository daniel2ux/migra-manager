"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { doc, updateDoc } from "@/supabase/compat-db-shim";
import { useDb, useUser, useMemoDb } from "@/supabase/provider";
import { useDoc } from "@/supabase/hooks/use-doc";
import { useFileAliases } from "@/hooks/use-file-aliases";
import type { AppConfig } from "@/types/migration";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  FileText,
  Search,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ObjectItem {
  id: string;
  name: string;
}

interface ObjectFiles {
  objectId?: string;
  objectName: string;
  files: string[];
  matchedPrefix: string;
}

type Step = 'select' | 'importing' | 'done';

interface LogImportDialogProps {
  open: boolean;
  onClose: () => void;
  mockId: string;
  projectId: string;
  allObjects: ObjectItem[];
  selectedObjectIds: string[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LogImportDialog({
  open,
  onClose,
  mockId,
  projectId,
  allObjects,
  selectedObjectIds,
}: LogImportDialogProps) {
  const db = useDb();
  const { user } = useUser();
  const { aliases } = useFileAliases();

  // Ler configuração de maxImportLines
  const settingsDocRef = useMemoDb(
    () => open && db ? doc(db, "appConfig", "settings") : null,
    [db, open]
  );
  const { data: settingsData } = useDoc<AppConfig>(settingsDocRef as any); // AppConfig defines maxImportLines
  const [lineLimit, setLineLimit] = useState<number | undefined>(undefined);
  const [step, setStep] = useState<Step>('select');
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [filesByObject, setFilesByObject] = useState<ObjectFiles[]>([]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [fileSearch, setFileSearch] = useState('');

  const [importProgress, setImportProgress] = useState(0);
  const [currentObject, setCurrentObject] = useState('');
  const [importLog, setImportLog] = useState<{ text: string; type: 'info' | 'ok' | 'warn' | 'error'; timestamp: string }[]>([]);

  const isPickerActiveRef = useRef(false);

  // Sincronizar lineLimit com configuração quando dialog abre
  useEffect(() => {
    if (open && settingsData) {
      const maxLines = settingsData.maxImportLines;
      setLineLimit(maxLines ? Number(maxLines) : undefined);
    }
  }, [open, settingsData]);

  const formatDateTimeBR = useCallback((date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date), []);

  const log = useCallback((text: string, type: 'info' | 'ok' | 'warn' | 'error' = 'info') =>
    setImportLog(prev => [...prev, { text, type, timestamp: formatDateTimeBR(new Date()) }]), [formatDateTimeBR]);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [importLog]);

  const selectedIdsSet = useMemo(() => new Set(selectedObjectIds), [selectedObjectIds]);
  const targetObjects = useMemo(
    () => (selectedObjectIds.length > 0 ? allObjects.filter(o => selectedIdsSet.has(o.id)) : allObjects),
    [allObjects, selectedIdsSet, selectedObjectIds.length]
  );
  const aliasesKey = useMemo(
    () =>
      aliases
        .map((a) => `${a.objectName}::${a.fileNamePatterns.join(",")}`)
        .sort()
        .join("|"),
    [aliases]
  );

  const resolve = useCallback(async (
    handle: FileSystemDirectoryHandle,
    objectsToResolve: ObjectItem[],
    aliasesToUse: typeof aliases
  ) => {
    try {
      const allFiles: string[] = [];
      for await (const entry of (handle as any).values()) {
        if (entry && entry.kind === 'file' && entry.name) {
          allFiles.push(entry.name);
        }
      }

      const filteredFiles = allFiles.filter(f => {
        const lower = f.toLowerCase();
        // Este fluxo deve importar apenas arquivos de erro.
        return lower.endsWith('.err') && !lower.includes('resumo');
      });

      const validObjects = objectsToResolve
        .filter((obj): obj is ObjectItem => {
          const isValid = Boolean(obj && obj.name && obj.id && typeof obj.name === 'string' && obj.name.trim().length > 0);
          return isValid;
        });

      const assignments = validObjects
        .map(obj => {
          if (!obj || typeof obj.name !== 'string') return null;
          const name = obj.name.trim();

          // Build list of patterns to search for
          const searchPatterns: string[] = [name];

          // Add aliases for this object
          const objectAliases = aliasesToUse.filter(a => a.objectName === name);
          for (const alias of objectAliases) {
            searchPatterns.push(...alias.fileNamePatterns);
          }

          // Search for files matching any pattern
          let candidates: string[] = [];
          let matchedPattern = name;

          // Try exact patterns from aliases or object name
          for (const pattern of searchPatterns) {
            const lower = pattern.toLowerCase();
            let matches: string[] = [];

            // Check if pattern contains wildcards
            if (pattern.includes('*')) {
              const regexPattern = pattern
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '.*');
              const regex = new RegExp(regexPattern, 'i');
              matches = filteredFiles.filter(f => regex.test(f));
            } else {
              // No wildcards: use startsWith for precise matching
              matches = filteredFiles.filter(f => f.toLowerCase().startsWith(lower));
              if (matches.length === 0) {
                matches = filteredFiles.filter(f => f.toLowerCase().includes(lower));
              }
            }

            if (matches.length > 0) {
              candidates = matches;
              matchedPattern = pattern;
              break;
            }
          }

          // No automatic shortening - require exact match or alias configuration
          // This prevents false positives like FACTS_02NB matching FACTS_02-FACTS2NA-...

          return { objectId: obj.id, objectName: name, candidates, matchedPrefix: matchedPattern };
        });

      const byObject: ObjectFiles[] = assignments.map(a => {
        if (!a) return { objectId: '', objectName: '', matchedPrefix: '', files: [] };
        return {
          objectId: a.objectId,
          objectName: a.objectName,
          matchedPrefix: a.matchedPrefix,
          files: a.candidates
        };
      }).filter(o => o.objectName && o.files.length > 0); // Exibe apenas objetos com arquivos de erro

      setFilesByObject(byObject);
      const init: Record<string, boolean> = {};
      byObject.forEach(o => o.files.forEach(f => { init[f] = true; }));
      setChecklist(init);
    } catch (err: unknown) {
      console.error("MIGRA: Erro ao listar arquivos locais", err);
    }
  }, []);

  const handleSelectFolder = useCallback(async () => {
    if (isPickerActiveRef.current) return;
    isPickerActiveRef.current = true;

    try {
      const showDirectoryPicker = (window as any).showDirectoryPicker;
      if (!showDirectoryPicker) throw new Error("Seu navegador não suporta a FileSystem API. Use Chrome ou Edge.");
      const handle = await showDirectoryPicker();
      setDirectoryHandle(handle);
      resolve(handle, targetObjects, aliases);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error("MIGRA: Erro ao abrir pasta", err);
      }
    } finally {
      isPickerActiveRef.current = false;
    }
  }, [aliases, resolve, targetObjects]);

  const selectedFiles = filesByObject
    .filter(o => {
      const hasId = Boolean(o && o.objectId);
      const hasName = Boolean(o && o.objectName);
      if (!hasId || !hasName) {
        log(`  pulando objeto inválido: ${JSON.stringify(o)}`, 'warn');
      }
      return hasId && hasName;
    })
    .flatMap(o => {
      return o.files.filter(f => checklist[f]).map(f => ({
        objectId: o.objectId!,
        objectName: o.objectName,
        filename: f
      }));
    });

  const runImport = async () => {
    if (selectedFiles.length === 0 || !directoryHandle || !db) {
      return;
    }

    setStep('importing');
    setImportLog([]);
    setImportProgress(0);

    log(`$ iniciando importação de ${selectedFiles.length} arquivos`, 'info');

    let totalImported = 0;
    try {
      // Token de sessão do usuário autenticado (exigido pela API)
      if (!user) {
        log(`  erro: usuário não autenticado`, 'error');
        return;
      }

      let token: string;
      try {
        token = await user.getIdToken();
      } catch (tokenErr: unknown) {
        log(`  erro ao obter token: ${tokenErr instanceof Error ? tokenErr.message : 'desconhecido'}`, 'error');
        return;
      }

      const clearedObjects = new Set<string>();

      for (let i = 0; i < selectedFiles.length; i++) {
        const item = selectedFiles[i];

        if (!item) {
          log(`  erro: item ${i} null/undefined`, 'error');
          continue;
        }

        const objectNameRaw = item.objectName;

        if (objectNameRaw === undefined || objectNameRaw === null || typeof objectNameRaw !== 'string' || objectNameRaw.trim().length === 0) {
          log(`  erro: objectName inválido no item ${i}`, 'error');
          continue;
        }

        const { objectId, objectName, filename } = item;

        if (!objectId) { log(`  erro: objectId ausente no item ${i}`, 'error'); continue; }
        if (!filename) { log(`  erro: filename ausente no item ${i}`, 'error'); continue; }

        const trimmedObjectName = objectName.trim();

        setCurrentObject(trimmedObjectName);
        const skipDelete = clearedObjects.has(trimmedObjectName);
        clearedObjects.add(trimmedObjectName);

        log(``, 'info');
        log(`> [${i + 1}/${selectedFiles.length}] objeto: ${trimmedObjectName}`, 'info');

        try {
          const fileHandle = await directoryHandle.getFileHandle(filename);
          const file = await fileHandle.getFile();
          const buffer = await file.arrayBuffer();
          const fileContent = new TextDecoder('latin1').decode(buffer);

          const res = await fetch('/api/log-service/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              objectName, mockId, projectId, filename, callerToken: token, skipDelete, fileContent,
              lineLimit: lineLimit
            }),
          });

          if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let bufferStr = '';

          while (true) {
            const { done, value } = await reader.read();
            if (value) bufferStr += decoder.decode(value, { stream: !done });
            const lines = bufferStr.split('\n');
            bufferStr = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.trim()) continue;
              const evt = JSON.parse(line);
              if (evt.type === 'done') {
                log(`  lido: ${evt.linesRead} linhas`, 'ok');
                log(`  gravado: ${evt.recordsWritten} registros`, 'ok');
                if (evt.lineLimitApplied) {
                  log(`  limite: ${evt.lineLimitApplied} linhas ${evt.limitReached ? '(atingido)' : '(não atingido)'}`, 'info');
                }
                totalImported += evt.recordsWritten;

                if (evt.recordsWritten > 0) {
                  const objRef = doc(db, 'projects', projectId, 'mocks', mockId, 'migrationObjects', objectId);
                  await updateDoc(objRef, { hasTechLogs: true });
                }
              } else if (evt.type === 'error') {
                log(`  erro: ${evt.message}`, 'error');
              }
            }
            if (done) break;
          }
        } catch (err: any) {
          log(`  erro ao processar ${filename}: ${err.message}`, 'error');
        }
        setImportProgress(((i + 1) / selectedFiles.length) * 100);
      }
      log(``, 'info');
      log(`$ importação concluída! total: ${totalImported} registros.`, 'ok');
      // Auto-close after showing completion message
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      log(`$ erro fatal: ${err.message}`, 'error');
    }
  };

  // Reset de controles transitórios ao fechar
  useEffect(() => {
    if (!open) {
      isPickerActiveRef.current = false;
      setFileSearch('');
      setStep('select');
    }
  }, [open]);

  // Re-run resolve when aliases load (after directory is already selected)
  useEffect(() => {
    if (open && directoryHandle && aliases.length > 0) {
      resolve(directoryHandle, targetObjects, aliases);
    }
  }, [open, directoryHandle, aliasesKey, resolve, targetObjects, aliases]);

  return (
    <Dialog preserveDashboardScroll open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        open={open}
        overlayClassName="fiori-dialog-overlay"
        className={cn(
          "fiori-dialog flex flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]",
          step === "importing"
            ? "h-[min(520px,85vh)] w-[calc(100vw-1rem)] sm:max-w-2xl"
            : "h-[min(600px,92vh)] w-[calc(100vw-1rem)] sm:max-w-4xl"
        )}
      >
        <DialogHeader className="fiori-dialog-header shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            Importação de arquivos de erro de migração (.err).
          </DialogDescription>
          <DialogTitle className="fiori-dialog-title">Importar erros de migração</DialogTitle>
        </DialogHeader>

        <div className="fiori-import-body">
          {step === "select" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {directoryHandle ? (
                <>
                  <div className="fiori-import-toolbar">
                    <div className="fiori-import-toolbar-search">
                      <Search className="fiori-import-toolbar-search-icon" />
                      <Input
                        placeholder="Filtrar arquivos .err..."
                        className="fiori-input pl-8 shadow-none"
                        value={fileSearch}
                        onChange={(e) => setFileSearch(e.target.value)}
                      />
                    </div>
                    <div className="fiori-import-toolbar-actions">
                      <div className="fiori-import-limit">
                        <label className="fiori-field-label">Limite linhas</label>
                        <Input
                          type="number"
                          value={lineLimit ?? ""}
                          onChange={(e) =>
                            setLineLimit(e.target.value ? parseInt(e.target.value) : undefined)
                          }
                          placeholder="—"
                          className="fiori-input shadow-none"
                          min="1"
                        />
                      </div>
                      <span className="fiori-import-count">
                        {selectedFiles.length} selecionado{selectedFiles.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <ScrollArea className="fiori-import-list">
                    {filesByObject.map((obj) => {
                      const visibleFiles = obj.files.filter((f) =>
                        f.toLowerCase().includes(fileSearch.toLowerCase())
                      );

                      return (
                        <div key={obj.objectName} className="fiori-import-group">
                          <div className="fiori-import-group-title">
                            <span>{obj.objectName}</span>
                            <span>
                              {obj.files.filter((f) => checklist[f]).length}/{obj.files.length}
                            </span>
                          </div>

                          {visibleFiles.length === 0 ? (
                            <div className="fiori-import-empty-group">
                              Nenhum arquivo encontrado para {obj.objectName}
                            </div>
                          ) : (
                            visibleFiles.map((f) => (
                              <div
                                key={f}
                                className={cn(
                                  "fiori-import-file-row",
                                  checklist[f] && "fiori-import-file-row-selected"
                                )}
                                onClick={() =>
                                  setChecklist((prev) => ({ ...prev, [f]: !prev[f] }))
                                }
                              >
                                <div
                                  className={cn(
                                    "fiori-object-row-checkbox",
                                    checklist[f] && "fiori-object-row-checkbox-checked"
                                  )}
                                >
                                  {checklist[f] && <CheckCircle2 className="h-2.5 w-2.5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="fiori-import-file-name">{f}</p>
                                  <p className="fiori-import-file-meta">Arquivo de erro</p>
                                </div>
                                {checklist[f] && (
                                  <span className="fiori-chip fiori-chip-selected">Selecionado</span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </ScrollArea>

                  <DialogFooter className="fiori-dialog-footer shrink-0 justify-between sm:justify-between">
                    <button
                      type="button"
                      onClick={handleSelectFolder}
                      className="fiori-btn-ghost"
                    >
                      Mudar pasta
                    </button>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={onClose} className="fiori-btn-ghost">
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={selectedFiles.length === 0 || !directoryHandle}
                        onClick={runImport}
                        className="fiori-btn-emphasized"
                      >
                        Importar{selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ""}
                      </button>
                    </div>
                  </DialogFooter>
                </>
              ) : (
                <div className="fiori-import-empty">
                  <div className="fiori-import-empty-card space-y-4">
                    <FolderOpen className="mx-auto h-8 w-8 text-[var(--fiori-brand)]" />
                    <div className="space-y-2">
                      <p className="fiori-field-label justify-center">
                        Selecione a pasta com arquivos de erro (.err)
                      </p>
                      <p className="fiori-field-hint">
                        O navegador exige ação do usuário para abrir o seletor de pasta.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={onClose} className="fiori-btn-ghost">
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectFolder}
                        className="fiori-btn-emphasized"
                      >
                        Selecionar pasta
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "importing" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="fiori-import-progress">
                <div className="fiori-import-progress-head">
                  <div className="fiori-import-progress-label">
                    <span className="fiori-import-progress-dot" />
                    Carga em andamento
                  </div>
                  <span className="fiori-import-progress-pct">{Math.round(importProgress)}%</span>
                </div>
                <Progress value={importProgress} className="h-1 bg-[#e5e5e5]" />
                <div className="fiori-import-progress-object">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="truncate">{currentObject || "—"}</span>
                </div>
              </div>

              <div className="fiori-import-log">
                {importLog.map((l, i) => (
                  <div
                    key={i}
                    className={cn(
                      l.type === "ok"
                        ? "fiori-import-log-line--ok"
                        : l.type === "warn"
                          ? "fiori-import-log-line--warn"
                          : l.type === "error"
                            ? "fiori-import-log-line--error"
                            : "fiori-import-log-line--info"
                    )}
                  >
                    <span className="fiori-import-log-ts">[{l.timestamp}]</span>
                    {l.text}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="fiori-import-done">
              <div className="fiori-import-done-icon">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="fiori-import-done-title">Importação concluída</h3>
              <p className="fiori-import-done-text">
                Todos os arquivos de log foram processados e os registros foram atualizados com sucesso.
              </p>
              <button type="button" onClick={onClose} className="fiori-btn-emphasized">
                Finalizar
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
