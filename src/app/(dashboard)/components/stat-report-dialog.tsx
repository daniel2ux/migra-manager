"use client";

import { RefObject, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronDown, BarChart2, FileText, Mail, Printer, Loader2, Check, Search, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FioriDialogContextFields } from "@/components/ui/fiori-dialog-context-fields";
import { dashboardDialogContentProps, dashboardDialogRootProps } from "@/lib/dashboard/scroll-preservation";
import type { AggregatedObject, Mock } from "@/types/migration";

interface StatReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialSelection?: string[];
    filteredAggregatedPerformance: AggregatedObject[];
    statTableRef: RefObject<HTMLDivElement | null>;
    migradorName: string | null;
    effectiveMockId: string | undefined;
    mocksByIdMap: Map<string, Mock>;
    projectName?: string;
    empresa?: string | null;
    excelExportProgress: { current: number; total: number } | null;
    statExcelMode: "single" | "per-object";
    setStatExcelMode: (mode: "single" | "per-object") => void;
    isFetchingErrors: boolean;
    onExportExcel: (rows: AggregatedObject[]) => void;
    onEmail: (rows: AggregatedObject[]) => void;
    formatStatDate: (ts: unknown) => string;
    formatStatTime: (ts: unknown) => string;
    getStatEmpresa: (obj: AggregatedObject) => string;
    formatStatDuration: (ms: number | undefined) => string;
}

interface StatObjectRowProps {
    name: string;
    isChecked: boolean;
    onToggle: (name: string) => void;
}

const StatObjectRow = memo(function StatObjectRow({ name, isChecked, onToggle }: StatObjectRowProps) {
    return (
        <div
            role="checkbox"
            aria-checked={isChecked}
            tabIndex={0}
            className={cn("fiori-stat-object-row", isChecked && "fiori-stat-object-row--selected")}
            onClick={() => onToggle(name)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggle(name);
                }
            }}
        >
            <div className={cn("fiori-object-row-checkbox", isChecked && "fiori-object-row-checkbox-checked")}>
                {isChecked && <Check className="w-2 h-2" strokeWidth={3} />}
            </div>
            <span className="fiori-stat-object-name" title={name}>{name}</span>
        </div>
    );
});

interface StatReportTableProps {
    rows: AggregatedObject[];
    migradorName: string | null;
    formatStatDate: (ts: unknown) => string;
    formatStatTime: (ts: unknown) => string;
    getStatEmpresa: (obj: AggregatedObject) => string;
    formatStatDuration: (ms: number | undefined) => string;
    tableRef: RefObject<HTMLDivElement | null>;
}

const StatReportTable = memo(function StatReportTable({
    rows,
    migradorName,
    formatStatDate,
    formatStatTime,
    getStatEmpresa,
    formatStatDuration,
    tableRef,
}: StatReportTableProps) {
    return (
        <div ref={tableRef}>
            <table className="fiori-report-table">
                <thead>
                    <tr>
                        {['Migrador', 'Data migr.', 'Hora exec.', 'Empresa', 'Objeto', 'Em curso', 'OK', 'Erro', 'Processados', '% OK', '% erro', 'Modificado', 'Hora mod.', 'Tempo trab.'].map(h => (
                            <th key={h} className={cn(['OK', 'Erro', 'Processados', '% OK', '% erro'].includes(h) && 'fiori-num')}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={14} className="fiori-report-empty">
                                Selecione ao menos um objeto na lista à esquerda
                            </td>
                        </tr>
                    ) : rows.map((obj: AggregatedObject) => {
                        const total = obj.processedRecordsCount || 0;
                        const erro = obj.errorRecordsCount || 0;
                        const ok = total - erro;
                        const pctOk = total > 0 ? ((ok / total) * 100).toFixed(2) : '—';
                        const pctErro = total > 0 ? ((erro / total) * 100).toFixed(2) : '—';
                        return (
                            <tr key={obj.name}>
                                <td className="whitespace-nowrap">{migradorName || '—'}</td>
                                <td className="fiori-mono fiori-mono-muted whitespace-nowrap">{formatStatDate(obj.chargeStartTime || undefined)}</td>
                                <td className="fiori-mono fiori-mono-muted whitespace-nowrap">{formatStatTime(obj.chargeStartTime || undefined)}</td>
                                <td className="whitespace-nowrap">{getStatEmpresa(obj)}</td>
                                <td className="fiori-object-col">{obj.name}</td>
                                <td className="whitespace-nowrap">
                                    {obj.isInProgress ? (
                                        <span className="fiori-object-status fiori-object-status--running">
                                            <span className="fiori-object-status-dot" aria-hidden />
                                            Sim
                                        </span>
                                    ) : (
                                        <span className="fiori-object-status fiori-object-status--neutral">Não</span>
                                    )}
                                </td>
                                <td className="fiori-mono fiori-num fiori-pct--complete">{ok.toLocaleString('pt-BR')}</td>
                                <td className={cn("fiori-mono fiori-num", erro > 0 ? "fiori-pct--error" : "fiori-mono-muted")}>{erro.toLocaleString('pt-BR')}</td>
                                <td className="fiori-mono fiori-num">{total.toLocaleString('pt-BR')}</td>
                                <td className={cn("fiori-mono fiori-num whitespace-nowrap", pctOk !== '—' ? "fiori-pct--complete" : "fiori-mono-muted")}>{pctOk !== '—' ? `${pctOk}%` : '—'}</td>
                                <td className={cn("fiori-mono fiori-num whitespace-nowrap", pctErro !== '—' && Number(pctErro) > 0 ? "fiori-pct--error" : "fiori-mono-muted")}>{pctErro !== '—' ? `${pctErro}%` : '—'}</td>
                                <td className="fiori-mono fiori-mono-muted whitespace-nowrap">{formatStatDate(obj.chargeEndTime || undefined)}</td>
                                <td className="fiori-mono fiori-mono-muted whitespace-nowrap">{formatStatTime(obj.chargeEndTime || undefined)}</td>
                                <td className="fiori-mono fiori-mono-muted whitespace-nowrap">{formatStatDuration(obj.currentChargeDurationMs)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
});

export function StatReportDialog({
    open,
    onOpenChange,
    initialSelection,
    filteredAggregatedPerformance,
    statTableRef,
    migradorName,
    effectiveMockId,
    mocksByIdMap,
    projectName,
    empresa,
    excelExportProgress,
    statExcelMode,
    setStatExcelMode,
    isFetchingErrors,
    onExportExcel,
    onEmail,
    formatStatDate,
    formatStatTime,
    getStatEmpresa,
    formatStatDuration,
}: StatReportDialogProps) {
    const [statSelected, setStatSelected] = useState<Set<string>>(() => new Set());
    const [statObjSearch, setStatObjSearch] = useState("");
    const statObjSearchRef = useRef<HTMLInputElement>(null);
    const statObjSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!open) {
            setStatSelected(new Set());
            setStatObjSearch("");
            if (statObjSearchRef.current) statObjSearchRef.current.value = "";
            return;
        }
        setStatSelected(initialSelection?.length ? new Set(initialSelection) : new Set());
        setStatObjSearch("");
        if (statObjSearchRef.current) statObjSearchRef.current.value = "";
    }, [open, initialSelection]);

    const visibleObjects = useMemo(
        () => filteredAggregatedPerformance
            .filter(
                (o: AggregatedObject) => !statObjSearch || o.name.toUpperCase().includes(statObjSearch),
            )
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })),
        [filteredAggregatedPerformance, statObjSearch]
    );

    const statReportRows = useMemo(
        () => filteredAggregatedPerformance.filter((o) => statSelected.has(o.name)),
        [filteredAggregatedPerformance, statSelected]
    );

    const deferredReportRows = useDeferredValue(statReportRows);

    const totalObjects = filteredAggregatedPerformance.length;
    const isAllSelected = statSelected.size === totalObjects && totalObjects > 0;
    const isPartialSelected = statSelected.size > 0 && statSelected.size < totalObjects;

    const toggleObject = useCallback((name: string) => {
        setStatSelected((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    }, []);

    const handleClose = useCallback((nextOpen: boolean) => {
        onOpenChange(nextOpen);
    }, [onOpenChange]);

    const mockName =
        mocksByIdMap.get(effectiveMockId || "")?.name || effectiveMockId || undefined;

    return (
        <Dialog open={open} onOpenChange={handleClose} {...dashboardDialogRootProps}>
            <DialogContent open={open} className="fiori-dialog fiori-dialog-fullscreen !flex p-0 flex-col gap-0 shadow-lg [&>button]:hidden" {...dashboardDialogContentProps}>
                <DialogHeader className="fiori-dialog-header shrink-0 space-y-0 text-left">
                    <div className="fiori-dialog-header-row">
                        <div className="fiori-dialog-header-main">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleClose(false)}
                                className="fiori-dialog-back-btn"
                                aria-label="Fechar estatística"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <div className="fiori-dialog-icon shrink-0">
                                <BarChart2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="fiori-dialog-title-row">
                                    <DialogTitle className="fiori-dialog-title shrink-0">
                                        Estatística de carga
                                    </DialogTitle>
                                    <FioriDialogContextFields
                                        empresa={empresa ?? undefined}
                                        projectName={projectName}
                                        mockName={mockName}
                                    />
                                </div>
                                <DialogDescription className="fiori-dialog-subtitle truncate">
                                    {statSelected.size} objeto{statSelected.size === 1 ? "" : "s"}
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="fiori-dialog-header-actions">
                            {migradorName && (
                                <div className="fiori-stat-migrador-tag">
                                    <span className="fiori-stat-migrador-label">Migrador</span>
                                    <span className="fiori-stat-migrador-value">{migradorName}</span>
                                </div>
                            )}
                            <div className="fiori-stat-export-group">
                                <button
                                    type="button"
                                    onClick={() => onExportExcel(statReportRows)}
                                    disabled={statReportRows.length === 0 || excelExportProgress !== null}
                                    className="fiori-stat-export-btn"
                                >
                                    {excelExportProgress ? (
                                        <>
                                            <span className="inline-block w-3 h-3 border-2 border-[var(--fiori-label)] border-t-[var(--fiori-brand)] rounded-full animate-spin shrink-0" />
                                            {excelExportProgress.current}/{excelExportProgress.total}
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="w-3.5 h-3.5" />
                                            Excel
                                        </>
                                    )}
                                </button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={statReportRows.length === 0}
                                            className="fiori-stat-export-menu-btn"
                                            aria-label="Opções de exportação Excel"
                                        >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="fiori-dropdown-menu min-w-[220px]">
                                        <DropdownMenuItem
                                            onClick={() => setStatExcelMode("single")}
                                            className={cn(
                                                "fiori-dropdown-menu-item",
                                                statExcelMode === "single" && "fiori-dropdown-menu-item--selected"
                                            )}
                                        >
                                            <FileText className="w-3.5 h-3.5 shrink-0" />
                                            <div className="min-w-0">
                                                <p>Único arquivo</p>
                                                <p className="fiori-dropdown-menu-item-desc">Todos os objetos em um único .xlsx</p>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setStatExcelMode("per-object")}
                                            className={cn(
                                                "fiori-dropdown-menu-item",
                                                statExcelMode === "per-object" && "fiori-dropdown-menu-item--selected"
                                            )}
                                        >
                                            <FileText className="w-3.5 h-3.5 shrink-0" />
                                            <div className="min-w-0">
                                                <p>Por objeto</p>
                                                <p className="fiori-dropdown-menu-item-desc">Um arquivo .xlsx por objeto, em .zip</p>
                                            </div>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEmail(statReportRows)}
                                disabled={statReportRows.length === 0 || isFetchingErrors}
                                className="fiori-btn-transparent fiori-stat-action-btn"
                            >
                                {isFetchingErrors ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                                E-mail
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.print()}
                                disabled={statReportRows.length === 0}
                                className="fiori-btn-transparent fiori-stat-action-btn"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Imprimir
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleClose(false)}
                                className="fiori-dialog-back-btn"
                                aria-label="Fechar"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>
                <div className="fiori-stat-body">
                    <div className="fiori-stat-sidebar">
                        <div className="fiori-stat-sidebar-search">
                            <div className="fiori-search-shell">
                                <Search className="fiori-search-icon" />
                                <input
                                    ref={statObjSearchRef}
                                    type="search"
                                    placeholder="Pesquisar..."
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        e.target.value = val;
                                        if (statObjSearchTimerRef.current) clearTimeout(statObjSearchTimerRef.current);
                                        statObjSearchTimerRef.current = setTimeout(() => {
                                            setStatObjSearch(val);
                                            if (val) {
                                                setStatSelected((prev) => new Set(
                                                    [...prev].filter(name => name.toUpperCase().includes(val))
                                                ));
                                            }
                                        }, 200);
                                    }}
                                    className="fiori-search-input uppercase"
                                />
                            </div>
                        </div>
                        <div className="fiori-stat-select-all-wrap">
                            <div
                                role="checkbox"
                                aria-checked={isAllSelected ? true : isPartialSelected ? "mixed" : false}
                                tabIndex={0}
                                className={cn(
                                    "fiori-stat-select-all",
                                    isAllSelected && "fiori-stat-select-all--all",
                                    isPartialSelected && "fiori-stat-select-all--partial"
                                )}
                                onClick={() => {
                                    if (isAllSelected) setStatSelected(new Set());
                                    else setStatSelected(new Set(filteredAggregatedPerformance.map((o: AggregatedObject) => o.name)));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        if (isAllSelected) setStatSelected(new Set());
                                        else setStatSelected(new Set(filteredAggregatedPerformance.map((o: AggregatedObject) => o.name)));
                                    }
                                }}
                            >
                                <div className={cn(
                                    "fiori-object-row-checkbox",
                                    isAllSelected && "fiori-object-row-checkbox-checked",
                                    isPartialSelected && "fiori-object-row-checkbox-indeterminate"
                                )}>
                                    {isAllSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                                    {isPartialSelected && <Minus className="w-2.5 h-2.5" strokeWidth={3} />}
                                </div>
                                <span className="fiori-stat-select-all-text">
                                    <span className="fiori-stat-select-all-label">Todos</span>
                                    <span className="fiori-stat-select-all-count">{totalObjects}</span>
                                </span>
                            </div>
                            {statSelected.size > 0 && (
                                <button
                                    type="button"
                                    className="fiori-stat-clear-btn"
                                    onClick={() => setStatSelected(new Set())}
                                    aria-label="Limpar seleção"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>
                        <div className="fiori-stat-object-list custom-scrollbar">
                            {visibleObjects.length === 0 ? (
                                <p className="fiori-stat-object-empty">Nenhum objeto encontrado</p>
                            ) : visibleObjects.map((obj: AggregatedObject) => (
                                <StatObjectRow
                                    key={obj.name}
                                    name={obj.name}
                                    isChecked={statSelected.has(obj.name)}
                                    onToggle={toggleObject}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="fiori-report-scroll">
                        <StatReportTable
                            rows={deferredReportRows}
                            migradorName={migradorName}
                            formatStatDate={formatStatDate}
                            formatStatTime={formatStatTime}
                            getStatEmpresa={getStatEmpresa}
                            formatStatDuration={formatStatDuration}
                            tableRef={statTableRef}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
