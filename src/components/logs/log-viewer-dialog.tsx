"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { useFirestore } from "@/supabase/provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { dashboardDialogContentProps, dashboardDialogRootProps } from "@/lib/dashboard/scroll-preservation";
import {
  AlertCircle,
  Loader2,
  XCircle,
  Search,
  AlertTriangle,
  X,
  FileSpreadsheet,
  ChevronLeft,
  ListOrdered,
} from "lucide-react";
import { FioriDialogContextFields } from "@/components/ui/fiori-dialog-context-fields";
import { buildErrorExportFileName } from "@/lib/export/log-export-meta";
import { buildMultiSheetErrorWorkbook, formatImportedAtField, type ErrorItemRow } from "@/lib/export/error-excel-sheets";
import type { ErrorEmailRow } from "@/components/email/email-compose-dialog";

const FETCH_LIMIT = 500;
const DISPLAY_LIMIT = 300;

interface MigrationLog {
  id: string;
  seq: number;
  object: string;
  oldKey: string;
  status: string;
  errorId: string;
  errorNumber: string;
  message: string;
  filename: string;
  importedAt: unknown;
}

interface ErrorSummaryEntry {
  errorNumber: string;
  errorId: string;
  count: number;
  sample: string;
}

interface LogViewerDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  objectName: string;
  mockId: string;
  mockName?: string;
  projectName?: string;
  migrador?: string;
  dataMigr?: string;
  hrExecMig?: string;
  empresa?: string;
}

function MessageCell({ message }: { message: string }) {
  if (!message || message === "–") return <span className="fiori-mono-muted">–</span>;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-block max-w-full cursor-default whitespace-normal break-all py-0.5 leading-relaxed">
            {message}
          </div>
        </TooltipTrigger>
        <TooltipContent
          variant="fiori"
          side="top"
          align="start"
          className="max-w-[480px] whitespace-normal break-all"
        >
          {message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LogViewerDialog({
  open,
  onClose,
  projectId,
  objectName,
  mockId,
  mockName,
  projectName,
  migrador = "—",
  dataMigr = "—",
  hrExecMig = "—",
  empresa = "—",
}: LogViewerDialogProps) {
  const mockLabel = mockName?.trim() || mockId || "—";
  const firestore = useFirestore();
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hitLimit, setHitLimit] = useState(false);
  const [detailSearch, setDetailSearch] = useState("");
  const [selectedErrorKey, setSelectedErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setLogs([]);
    setHitLimit(false);
    setDetailSearch("");
    setSelectedErrorKey(null);

    if (!firestore || !projectId || !mockId || !objectName) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(firestore, "migrationLogs"),
      where("projectId", "==", projectId),
      where("mock", "==", mockId),
      where("object", "==", objectName),
      orderBy("seq", "asc"),
      limit(FETCH_LIMIT),
    );

    getDocs(q)
      .then((snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MigrationLog, "id">),
        }));
        const sorted = docs.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
        setLogs(sorted);
        setHitLimit(snap.size >= FETCH_LIMIT);
      })
      .catch((err) => {
        console.error("MIGRA: Erro ao buscar logs no Firestore:", err);
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, [open, firestore, projectId, mockId, objectName]);

  const summaryMap = new Map<string, ErrorSummaryEntry>();
  for (const log of logs) {
    const key = log.errorNumber || log.errorId || "–";
    const existing = summaryMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      summaryMap.set(key, {
        errorNumber: log.errorNumber || "–",
        errorId: log.errorId || "–",
        count: 1,
        sample: log.message || "–",
      });
    }
  }
  const summary = Array.from(summaryMap.values()).sort((a, b) => b.count - a.count);
  const filenames = [...new Set(logs.map((l) => l.filename).filter(Boolean))];

  async function handleExportExcel() {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Migra";
    wb.created = new Date();

    const summaryRows: ErrorEmailRow[] = summary.map((s) => ({
      migrador,
      dataMigr,
      hrExecMig,
      empresa,
      objeto: objectName,
      errorId: s.errorId,
      errorNumber: s.errorNumber,
      count: s.count,
      message: s.sample,
    }));

    const itemRows: ErrorItemRow[] = logs.map((log) => ({
      migrador,
      dataMigr,
      hrExecMig,
      empresa,
      objeto: objectName,
      seq: log.seq ?? "—",
      infoKey: log.oldKey || "—",
      status: log.status || "—",
      errorId: log.errorId || "—",
      errorNumber: log.errorNumber || "—",
      message: log.message || "—",
      filename: log.filename || "—",
      importedAt: formatImportedAtField(log.importedAt),
    }));

    buildMultiSheetErrorWorkbook(wb, summaryRows, itemRows);

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildErrorExportFileName(objectName, mockName, mockId);
    a.click();
    URL.revokeObjectURL(url);
  }

  const searchTerm = detailSearch.trim().toLowerCase();
  const logsForSelected = selectedErrorKey
    ? logs.filter((l) => (l.errorNumber || l.errorId || "–") === selectedErrorKey)
    : [];
  const filteredLogs = searchTerm
    ? logsForSelected.filter(
        (l) =>
          (l.oldKey || "").toLowerCase().includes(searchTerm) ||
          (l.errorId || "").toLowerCase().includes(searchTerm) ||
          (l.errorNumber || "").toLowerCase().includes(searchTerm) ||
          (l.message || "").toLowerCase().includes(searchTerm),
      )
    : logsForSelected;

  const displayedLogs = filteredLogs.slice(0, DISPLAY_LIMIT);
  const truncated = filteredLogs.length > DISPLAY_LIMIT;

  const subtitleParts = [
    objectName,
    !loading && logs.length > 0
      ? `${logs.length} ${logs.length === 1 ? "erro" : "erros"}${hitLimit ? " (amostra)" : ""}`
      : null,
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }} {...dashboardDialogRootProps}>
      <DialogContent
        open={open}
        className="fiori-dialog fiori-dialog-fullscreen !flex p-0 flex-col gap-0 shadow-lg [&>button]:hidden"
        {...dashboardDialogContentProps}
      >
        <DialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
          <div className="fiori-dialog-header-row">
            <div className="fiori-dialog-header-main">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="fiori-dialog-back-btn"
                aria-label="Fechar relatório"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="fiori-dialog-icon fiori-dialog-icon--critical shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="fiori-dialog-title-row">
                  <DialogTitle className="fiori-dialog-title shrink-0">
                    Relatório de erros
                  </DialogTitle>
                  <FioriDialogContextFields
                    empresa={empresa}
                    projectName={projectName}
                    mockName={mockLabel}
                  />
                </div>
                <DialogDescription className="fiori-dialog-subtitle truncate">
                  {subtitleParts.join(" · ")}
                </DialogDescription>
              </div>
            </div>
            <div className="fiori-dialog-header-actions">
              {!loading && filenames.length > 0 && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="fiori-object-status fiori-object-status--neutral">
                        {filenames.length} arquivo{filenames.length !== 1 ? "s" : ""}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent variant="fiori" side="bottom" align="end" className="max-w-[400px]">
                      <p className="mb-1 text-[0.6875rem] font-semibold text-[var(--fiori-label)]">Arquivos importados</p>
                      {filenames.map((f) => (
                        <p key={f} className="fiori-mono text-[0.75rem]">{f}</p>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <div className="fiori-stat-export-group">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={logs.length === 0 || loading}
                  className="fiori-stat-export-btn"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden />
                  Excel
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="fiori-dialog-back-btn"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="fiori-log-viewer-body">
          {loading ? (
            <div className="fiori-log-viewer-loading">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--fiori-brand)]" />
              <span>Carregando logs…</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="fiori-log-viewer-empty">
              <XCircle className="w-6 h-6 text-[var(--fiori-label)]" />
              <span>Nenhum log importado para este objeto</span>
            </div>
          ) : (
            <>
              <div className="fiori-log-viewer-summary">
                {hitLimit && (
                  <div className="fiori-log-viewer-summary-warning fiori-message-warning shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <p>
                      Exibindo os primeiros {FETCH_LIMIT} registros. Use a pesquisa abaixo para localizar registros específicos.
                    </p>
                  </div>
                )}

                <div className="fiori-log-viewer-summary-head">
                  <h3 className="fiori-log-viewer-summary-title">
                    <ListOrdered className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Erros por tipo
                  </h3>
                  <span className="fiori-log-viewer-summary-count">
                    {summary.length} tipo{summary.length !== 1 ? "s" : ""}
                  </span>
                  {!selectedErrorKey && (
                    <span className="fiori-log-viewer-summary-hint">
                      Selecione um tipo para ver os detalhes
                    </span>
                  )}
                </div>

                <div className="fiori-log-viewer-summary-scroll custom-scrollbar">
                  <table className="fiori-report-table fiori-log-viewer-summary-table">
                    <thead>
                      <tr>
                        {[
                          { label: "Erro ID", className: "fiori-col-id" },
                          { label: "Cód. erro", className: "fiori-col-code" },
                          { label: "Ocorrências", className: "fiori-col-count" },
                          { label: "Mensagem (amostra)", className: "fiori-col-message" },
                        ].map(({ label, className }) => (
                          <th key={label} className={className}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((s, i) => {
                        const key = s.errorNumber || s.errorId || "–";
                        const isSelected = selectedErrorKey === key;
                        return (
                          <tr
                            key={i}
                            onClick={() => setSelectedErrorKey(isSelected ? null : key)}
                            aria-selected={isSelected}
                            className={cn(
                              "fiori-report-table-row--clickable",
                              isSelected && "fiori-report-table-row--selected",
                            )}
                          >
                            <td className="fiori-mono fiori-mono-muted fiori-col-id whitespace-nowrap">{s.errorId}</td>
                            <td className="fiori-mono fiori-error-code fiori-col-code whitespace-nowrap">{s.errorNumber}</td>
                            <td className="fiori-mono fiori-num-center fiori-col-count whitespace-nowrap">{s.count}</td>
                            <td className="fiori-mono fiori-col-message whitespace-normal break-all">
                              <MessageCell message={s.sample} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="fiori-log-viewer-detail">
                <div className="fiori-log-viewer-toolbar">
                  {selectedErrorKey && (
                    <button
                      type="button"
                      onClick={() => setSelectedErrorKey(null)}
                      className="fiori-chip fiori-chip-selected shrink-0"
                    >
                      {selectedErrorKey}
                      <X className="w-3 h-3" aria-hidden />
                    </button>
                  )}
                  <div className="fiori-log-viewer-search fiori-search-shell">
                    <Search className="fiori-search-icon" aria-hidden />
                    <input
                      type="search"
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      placeholder={
                        selectedErrorKey
                          ? "Refinar dentro do tipo selecionado…"
                          : "Selecione um erro na tabela acima primeiro…"
                      }
                      disabled={!selectedErrorKey}
                      className="fiori-search-input shadow-none"
                      aria-label="Refinar registros do erro selecionado"
                    />
                    {selectedErrorKey && detailSearch && (
                      <button
                        type="button"
                        className="fiori-search-clear"
                        onClick={() => setDetailSearch("")}
                        aria-label="Limpar busca"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                  {selectedErrorKey && (
                    <span className="fiori-log-viewer-count">
                      {filteredLogs.length} registro{filteredLogs.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {truncated && (
                  <div className="fiori-log-viewer-truncate-warning fiori-message-warning shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <p>
                      Exibindo {DISPLAY_LIMIT} de {filteredLogs.length} registros. Use a pesquisa para filtrar resultados.
                    </p>
                  </div>
                )}

                <div className="fiori-log-viewer-table-wrap custom-scrollbar">
                  <table className="fiori-report-table fiori-log-viewer-detail-table">
                    <thead>
                      <tr>
                        {[
                          { label: "#", className: "fiori-num-center" },
                          { label: "Chave", className: "fiori-col-key" },
                          { label: "Erro ID", className: undefined },
                          { label: "Cód. erro", className: undefined },
                          { label: "Mensagem", className: "fiori-col-message" },
                        ].map(({ label, className }) => (
                          <th key={label} className={className}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayedLogs.length === 0 ? (
                        <tr className="fiori-report-table-row--empty">
                          <td colSpan={5} className="fiori-report-empty">
                            {selectedErrorKey
                              ? "Nenhum registro encontrado para os filtros atuais"
                              : "Selecione um tipo de erro na tabela acima para ver os detalhes"}
                          </td>
                        </tr>
                      ) : (
                        displayedLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="fiori-mono fiori-mono-muted fiori-num-center whitespace-nowrap">{log.seq}</td>
                            <td className="fiori-mono fiori-object-col fiori-col-key truncate" title={log.oldKey || undefined}>
                              {log.oldKey || "–"}
                            </td>
                            <td className="fiori-mono fiori-mono-muted whitespace-nowrap">{log.errorId || "–"}</td>
                            <td className="fiori-mono fiori-error-code whitespace-nowrap">{log.errorNumber || "–"}</td>
                            <td className="fiori-mono fiori-col-message whitespace-normal break-all">
                              <MessageCell message={log.message} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
