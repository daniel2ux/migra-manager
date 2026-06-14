"use client";

import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MASTER_CATALOG_JSON_ACCEPT } from "@/lib/migration/master-catalog-export";
import { CheckCircle2, FileUp, Terminal, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isUploading: boolean;
  progress: number;
  finished: boolean;
  counts: { created: number; skipped: number };
  logs: { msg: string; type: "info" | "success" | "warning" | "error" }[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isDragging?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  terminalEndRef?: React.RefObject<HTMLDivElement | null>;
  onFinishClose?: () => void;
}

function logLineClass(type: ImportDialogProps["logs"][number]["type"]) {
  switch (type) {
    case "success":
      return "fiori-import-log-line--ok";
    case "warning":
      return "fiori-import-log-line--warn";
    case "error":
      return "fiori-import-log-line--error";
    default:
      return "fiori-import-log-line--info";
  }
}

export function ImportDialog({
  open,
  onOpenChange,
  isUploading,
  progress,
  finished,
  counts,
  logs,
  onFileSelect,
  fileInputRef,
  isDragging = false,
  onDragOver,
  onDragLeave,
  onDrop,
  terminalEndRef,
  onFinishClose,
}: ImportDialogProps) {
  const title = finished
    ? "Importação concluída"
    : isUploading
      ? "Importando catálogo"
      : "Carregar catálogo mestre";

  const subtitle = finished
    ? "Resumo do processamento"
    : isUploading
      ? "Processando dados do arquivo"
      : "Arraste ou selecione o arquivo JSON";

  return (
    <Dialog
      preserveDashboardScroll
      open={open}
      onOpenChange={(o) => {
        if (!isUploading) onOpenChange(o);
      }}
    >
      <DialogContent
        open={open}
        variant="fiori"
        className={cn(
          "fiori-dialog fiori-dialog--form flex flex-col gap-0 overflow-hidden border-none bg-white p-0 shadow-lg !rounded-[var(--fiori-radius)]",
          "h-[min(480px,85vh)] w-[calc(100vw-1rem)] sm:max-w-[500px]",
        )}
      >
        <DialogHeader className="fiori-dialog-header fiori-dialog-header-rich shrink-0 space-y-0">
          <DialogDescription className="sr-only">
            Importação de objetos do catálogo mestre via arquivo JSON.
          </DialogDescription>
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-icon shrink-0">
              <FileUp className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="fiori-dialog-title">{title}</DialogTitle>
              <p className="fiori-dialog-subtitle truncate">{subtitle}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="fiori-import-body min-h-0 flex-1 overflow-hidden">
          {!isUploading && !finished ? (
            <div className="fiori-import-empty">
              <div
                className={cn(
                  "fiori-import-dropzone",
                  isDragging && "fiori-import-dropzone--drag",
                )}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Selecionar arquivo JSON do catálogo"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept={MASTER_CATALOG_JSON_ACCEPT}
                  onChange={onFileSelect}
                />
                <div className="fiori-import-dropzone-icon">
                  <Upload className="h-5 w-5" aria-hidden />
                </div>
                <p className="fiori-import-dropzone-title">
                  Clique ou arraste seu arquivo .json
                </p>
                <p className="fiori-import-dropzone-hint">
                  Use o JSON exportado pela plataforma (versão 1). Objetos com o mesmo nome serão ignorados.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="fiori-import-progress">
                <div className="fiori-import-progress-head">
                  <div className="fiori-import-progress-label">
                    {isUploading && <span className="fiori-import-progress-dot" />}
                    {finished ? "Processamento finalizado" : "Progresso do processamento"}
                  </div>
                  <span className="fiori-import-progress-pct">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5 bg-[#eef0f2]" />
              </div>

              {finished && (
                <div className="fiori-import-summary">
                  <div className="fiori-import-summary-card fiori-import-summary-card--success">
                    <span className="fiori-import-summary-label">Criados</span>
                    <span className="fiori-import-summary-value">{counts.created}</span>
                  </div>
                  <div className="fiori-import-summary-card fiori-import-summary-card--warning">
                    <span className="fiori-import-summary-label">Ignorados</span>
                    <span className="fiori-import-summary-value">{counts.skipped}</span>
                  </div>
                </div>
              )}

              <div className="fiori-import-log-head">
                <span className="inline-flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" aria-hidden />
                  Console de saída
                </span>
                {isUploading && <span className="fiori-import-progress-dot" />}
              </div>

              <div className="fiori-import-log min-h-0 flex-1">
                {logs.map((log, idx) => (
                  <div key={idx} className={logLineClass(log.type)}>
                    <span className="fiori-import-log-ts">
                      [{new Date().toLocaleTimeString([], {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}]
                    </span>
                    {log.msg}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="fiori-dialog-footer shrink-0 gap-2 sm:justify-end sm:space-x-0">
          {finished ? (
            <button
              type="button"
              className="fiori-btn-emphasized"
              onClick={onFinishClose}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Concluir
            </button>
          ) : (
            <button
              type="button"
              className="fiori-btn-ghost"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              {isUploading ? "Processando…" : "Cancelar"}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
