"use client";

import { RefObject } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileUp, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportLog } from "../hooks/use-object-import";

const CSV_HEADERS = [
    "OBJETO",
    "DATA_INICIO",
    "DATA_FIM",
    "TARGET",
    "PROCESSADO",
    "ERRO",
    "COMENTARIO",
    "STATUS",
] as const;

const DROPZONE_HEADERS = [
    "OBJETO",
    "INICIO",
    "FIM",
    "TARGET",
    "PROCESSADO",
    "ERRO",
    "COMENTARIO",
] as const;

interface CsvImportDialogProps {
    open: boolean;
    isImporting: boolean;
    importFinished: boolean;
    importProgress: number;
    importCounts: { created: number; updated: number; skipped: number };
    importLogs: ImportLog[];
    isDragging: boolean;
    importFileInputRef: RefObject<HTMLInputElement>;
    terminalEndRef: RefObject<HTMLDivElement>;
    onOpenChange: (open: boolean) => void;
    onReset: () => void;
    onImportFile: (file: File) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
}

function getTitle(isImporting: boolean, importFinished: boolean) {
    if (importFinished) return "Importação concluída";
    if (isImporting) return "Andamento da importação";
    return "Importar migration data";
}

function getSubtitle(isImporting: boolean, importFinished: boolean) {
    if (importFinished) return "Resumo do processo";
    if (isImporting) return "Processando dados…";
    return "Métricas de carga e logs técnicos";
}

export function CsvImportDialog({
    open,
    isImporting,
    importFinished,
    importProgress,
    importCounts,
    importLogs,
    isDragging,
    importFileInputRef,
    terminalEndRef,
    onOpenChange,
    onReset,
    onImportFile,
    onDragOver,
    onDragLeave,
    onDrop,
}: CsvImportDialogProps) {
    const formatDateTimeBR = (date: Date) =>
        new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).format(date);

    const handleOpenChange = (o: boolean) => {
        if (!isImporting) {
            onOpenChange(o);
            if (!o) onReset();
        }
    };

    const logLineClass = (type: ImportLog["type"]) =>
        type === "success"
            ? "fiori-import-log-line--ok"
            : type === "warning"
              ? "fiori-import-log-line--warn"
              : type === "error"
                ? "fiori-import-log-line--error"
                : "fiori-import-log-line--info";

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                overlayClassName="fiori-dialog-overlay"
                className="fiori-dialog flex h-[min(610px,92vh)] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]"
            >
                <DialogHeader className="fiori-dialog-header shrink-0 space-y-1">
                    <DialogDescription className="sr-only">
                        Importação de arquivo CSV ou TXT com métricas de carga.
                    </DialogDescription>
                    <div className="flex items-center gap-3">
                        <div className="fiori-dialog-icon">
                            <FileUp className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="fiori-dialog-title truncate">
                                {getTitle(isImporting, importFinished)}
                            </DialogTitle>
                            <p className="fiori-dialog-subtitle truncate">
                                {getSubtitle(isImporting, importFinished)}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="fiori-csv-body">
                    {!isImporting && !importFinished ? (
                        <>
                            <div className="fiori-csv-layout">
                                <p className="fiori-csv-layout-title">Layout de importação (CSV/TXT)</p>
                                <div className="fiori-csv-chip-row">
                                    {CSV_HEADERS.map((h) => (
                                        <span key={h} className="fiori-csv-field-chip">
                                            {h}
                                        </span>
                                    ))}
                                </div>
                                <p className="fiori-csv-example">
                                    Exemplo:
                                    <code>
                                        ADRPSTCODE;01/03/2026 08:00:00;01/03/2026 09:30:00;1000;980;20;Falha de
                                        validação;aberta
                                    </code>
                                </p>
                                <p className="fiori-field-hint mt-2">
                                    Separador: ; , ou TAB · Datas: dd/mm/aaaa hh:mm:ss
                                </p>
                            </div>

                            <div
                                className={cn(
                                    "fiori-csv-dropzone",
                                    isDragging && "fiori-csv-dropzone-active"
                                )}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                onDrop={onDrop}
                                onClick={() => importFileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={importFileInputRef}
                                    className="hidden"
                                    accept=".csv,.txt"
                                    onChange={(e) =>
                                        e.target.files?.[0] && onImportFile(e.target.files[0])
                                    }
                                />
                                <div className="fiori-csv-dropzone-icon">
                                    <Upload className="h-6 w-6" />
                                </div>
                                <p className="fiori-csv-dropzone-title">
                                    Arraste seu arquivo .csv ou .txt
                                </p>
                                <div className="fiori-csv-chip-row justify-center">
                                    {DROPZONE_HEADERS.map((h) => (
                                        <span key={h} className="fiori-csv-field-chip">
                                            {h}
                                        </span>
                                    ))}
                                </div>
                                <p className="fiori-field-hint">
                                    Delimitado por vírgula (,) ou ponto-e-vírgula (;)
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {(isImporting || importFinished) && (
                                <div className="fiori-import-progress !border-0 !bg-transparent !p-0">
                                    <div className="fiori-import-progress-head">
                                        <span className="fiori-import-progress-label">
                                            {importFinished ? "Processamento concluído" : "Progressão do processamento"}
                                        </span>
                                        <span className="fiori-import-progress-pct">{importProgress}%</span>
                                    </div>
                                    <Progress value={importProgress} className="h-1 bg-[#e5e5e5]" />
                                </div>
                            )}

                            {importFinished && (
                                <div className="fiori-csv-stats">
                                    <div className="fiori-csv-stat fiori-csv-stat--success">
                                        <span className="fiori-csv-stat-label">Criados</span>
                                        <span className="fiori-csv-stat-value">{importCounts.created}</span>
                                    </div>
                                    <div className="fiori-csv-stat fiori-csv-stat--brand">
                                        <span className="fiori-csv-stat-label">Atualizados</span>
                                        <span className="fiori-csv-stat-value">{importCounts.updated}</span>
                                    </div>
                                    <div className="fiori-csv-stat fiori-csv-stat--warning">
                                        <span className="fiori-csv-stat-label">Ignorados</span>
                                        <span className="fiori-csv-stat-value">{importCounts.skipped}</span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="fiori-csv-console-title">
                                    <span className="flex items-center gap-1.5">
                                        <Terminal className="h-3.5 w-3.5" />
                                        Console de saída
                                    </span>
                                    {isImporting && <span className="fiori-import-progress-dot" />}
                                </div>
                                <div className="fiori-csv-console">
                                    <ScrollArea className="h-full">
                                        <div className="fiori-import-log !min-h-0">
                                            {importLogs.map((log, idx) => (
                                                <div key={idx} className={logLineClass(log.type)}>
                                                    <span className="fiori-import-log-ts">
                                                        [{formatDateTimeBR(new Date())}]
                                                    </span>
                                                    {log.msg}
                                                </div>
                                            ))}
                                            <div ref={terminalEndRef} />
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="fiori-dialog-footer shrink-0">
                    {importFinished ? (
                        <button
                            type="button"
                            className="fiori-btn-emphasized w-full"
                            onClick={() => {
                                onOpenChange(false);
                                onReset();
                            }}
                        >
                            Concluir e fechar
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="fiori-btn-ghost w-full"
                            onClick={() => onOpenChange(false)}
                            disabled={isImporting}
                        >
                            {isImporting ? "Processando…" : "Cancelar"}
                        </button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
