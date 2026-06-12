"use client";

import { useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Table2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    formatNumber,
    formatPercentage,
    renderDuration,
} from "@/lib/formatters";
import { normalizeSeqForDisplay } from "@/lib/migration/sequence-utils";
import { FioriDialogContextFields } from "@/components/ui/fiori-dialog-context-fields";
import { dashboardDialogContentProps, dashboardDialogRootProps } from "@/lib/dashboard/scroll-preservation";
import type { AggregatedObject, Mock } from "@/types/migration";

interface ReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filteredAggregatedPerformance: AggregatedObject[];
    effectiveMockId: string | undefined;
    mocksByIdMap: Map<string, Mock>;
    projectName?: string;
    empresa?: string | null;
}

export function ReportDialog({
    open,
    onOpenChange,
    filteredAggregatedPerformance,
    effectiveMockId,
    mocksByIdMap,
    projectName,
    empresa,
}: ReportDialogProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const mockName =
        mocksByIdMap.get(effectiveMockId || "")?.name || effectiveMockId || undefined;

    const handleClose = () => {
        onOpenChange(false);
        if (inputRef.current) inputRef.current.value = '';
        if (timerRef.current) clearTimeout(timerRef.current);
        setSearchTerm('');
    };

    const filtered = filteredAggregatedPerformance.filter(
        (o) => !searchTerm || o.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(true); }} {...dashboardDialogRootProps}>
            <DialogContent
                open={open}
                className="fiori-dialog fiori-dialog-fullscreen p-0 flex flex-col gap-0 shadow-lg [&>button]:hidden"
                {...dashboardDialogContentProps}
            >
                <DialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
                    <div className="fiori-dialog-header-row">
                        <div className="fiori-dialog-header-main">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleClose}
                                className="fiori-dialog-back-btn"
                                aria-label="Fechar relatório"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <div className="fiori-dialog-icon shrink-0">
                                <Table2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="fiori-dialog-title-row">
                                    <DialogTitle className="fiori-dialog-title shrink-0">
                                        Relatório de resultados de carga
                                    </DialogTitle>
                                    <FioriDialogContextFields
                                        empresa={empresa ?? undefined}
                                        projectName={projectName}
                                        mockName={mockName}
                                    />
                                </div>
                                <DialogDescription className="fiori-dialog-subtitle truncate">
                                    {filtered.length} objeto{filtered.length === 1 ? "" : "s"}
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="fiori-dialog-header-search fiori-search-shell">
                            <Search className="fiori-search-icon" />
                            <input
                                ref={inputRef}
                                type="search"
                                placeholder="Buscar objeto..."
                                defaultValue=""
                                onChange={(e) => {
                                    const val = e.target.value.toUpperCase();
                                    e.target.value = val;
                                    if (timerRef.current) clearTimeout(timerRef.current);
                                    timerRef.current = setTimeout(() => setSearchTerm(val), 200);
                                }}
                                className="fiori-search-input uppercase"
                            />
                        </div>
                    </div>
                </DialogHeader>

                <div className="fiori-report-scroll">
                    <table className="fiori-report-table">
                        <thead>
                            <tr>
                                {['#', 'Objeto', 'Grupo', 'Seq.', '% carga', 'Alvo', 'Processados', 'Erros', 'Carregados', 'Duração', 'Status'].map((col) => (
                                    <th key={col}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((obj, idx) => {
                                const target = Number(obj.targetRecordsCount) || 0;
                                const processed = Number(obj.processedRecordsCount) || 0;
                                const error = Number(obj.errorRecordsCount) || 0;
                                const loaded = Math.max(0, Number(obj.successfulRecordsCount) || processed - error);
                                const pct = target > 0 ? (loaded / target) * 100 : 0;
                                const hasErrors = error > 0;
                                const isRunning = obj.isInProgress;
                                const isConcluida = obj.isLoaded;
                                const durationMs = Number(obj.currentChargeDurationMs) || 0;
                                const rowKey = `${obj.projectId ?? "p"}:${obj.mockId ?? "m"}:${obj.id}`;

                                return (
                                    <tr key={rowKey}>
                                        <td className="fiori-mono fiori-mono-muted">{idx + 1}</td>
                                        <td className="font-medium whitespace-nowrap">{obj.name}</td>
                                        <td className="fiori-mono">{obj.chargeGroup || '—'}</td>
                                        <td className="fiori-mono">{normalizeSeqForDisplay(obj.chargeOrder)}</td>
                                        <td className={cn(
                                            "fiori-mono whitespace-nowrap",
                                            pct >= 100 && !hasErrors
                                                ? "fiori-pct--complete"
                                                : hasErrors
                                                    ? "fiori-pct--error"
                                                    : pct > 0
                                                        ? "fiori-pct--partial"
                                                        : "fiori-pct--empty"
                                        )}>
                                            {formatPercentage(pct, "success", hasErrors)}
                                        </td>
                                        <td className="fiori-mono whitespace-nowrap">
                                            {!isConcluida && (
                                                <span className="mr-1 text-xs text-[var(--fiori-label)]">(P)</span>
                                            )}
                                            {formatNumber(target, false)}
                                        </td>
                                        <td className="fiori-mono">{formatNumber(processed, false)}</td>
                                        <td className={cn("fiori-mono", error > 0 ? "fiori-pct--error" : "fiori-mono-muted")}>
                                            {error > 0 ? formatNumber(error, false) : '—'}
                                        </td>
                                        <td className="fiori-mono">{formatNumber(loaded, false)}</td>
                                        <td className="fiori-mono whitespace-nowrap">
                                            {durationMs > 0 ? renderDuration(durationMs) : '—'}
                                        </td>
                                        <td>
                                            {isRunning ? (
                                                <span className="fiori-object-status fiori-object-status--running">
                                                    <span className="fiori-object-status-dot" aria-hidden />
                                                    Em andamento
                                                </span>
                                            ) : (
                                                <span className={cn(
                                                    "fiori-object-status",
                                                    isConcluida
                                                        ? "fiori-object-status--success"
                                                        : error > 0
                                                            ? "fiori-object-status--error"
                                                            : "fiori-object-status--neutral"
                                                )}>
                                                    {isConcluida ? 'Concluído' : error > 0 ? 'Com erros' : '—'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
