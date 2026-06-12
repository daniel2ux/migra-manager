"use client";

import React, { useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
    Timer, 
    History, 
    TrendingUp, 
    TrendingDown, 
    Minus,
    CheckCircle2,
    AlertCircle,
    Loader2,
    BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MigrationObject } from "@/types/migration";
import { formatNumber, formatPercentage } from "@/lib/migration/format-utils";

interface ObjectsPerformanceTableProps {
    objects: MigrationObject[];
    renderDuration: (ms: number, allowZero?: boolean, hasDates?: boolean) => React.ReactNode;
    className?: string;
}

export function ObjectsPerformanceTable({ objects, renderDuration, className }: ObjectsPerformanceTableProps) {
    const sortedObjects = useMemo(
        () => [...objects].sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }),
        ),
        [objects],
    );

    const calculatePerformanceChange = (current: number, previous: number) => {
        if (!current || !previous) return null;
        const diff = previous - current;
        const percentage = (diff / previous) * 100;
        return { 
            isBetter: diff > 0, 
            percentage: Math.abs(percentage).toFixed(1).replace(".", ","),
            diffMs: diff
        };
    };

    const totals = objects.reduce((acc, obj) => {
        const t = Number(obj.targetRecordsCount) || 0;
        const p = Number(obj.processedRecordsCount) || 0;
        const e = Number(obj.errorRecordsCount) || 0;
        const s = Math.max(0, p - e);
        return {
            target: acc.target + t,
            processed: acc.processed + p,
            success: acc.success + s,
            error: acc.error + e,
        };
    }, { target: 0, processed: 0, success: 0, error: 0 });

    return (
        <div className={cn("flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white", className)}>
            <div className="min-h-0 w-full flex-1 overflow-auto">
                <Table className="w-full table-fixed" wrapperClassName="w-full overflow-visible">
                    <TableHeader className="border-b-2 border-slate-300 bg-slate-50">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="sticky top-0 z-20 w-[30%] bg-slate-50 py-3 pl-6 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-[0_1px_0_0_#cbd5e1]">Objeto Técnico</TableHead>
                        <TableHead className="sticky top-0 z-20 w-[15%] bg-slate-50 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-[0_1px_0_0_#cbd5e1]">Status / Qualidade</TableHead>
                        <TableHead className="sticky top-0 z-20 w-[15%] bg-slate-50 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-[0_1px_0_0_#cbd5e1]">Performance Atual</TableHead>
                        <TableHead className="sticky top-0 z-20 w-[15%] bg-slate-50 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-[0_1px_0_0_#cbd5e1]">Ref. Anterior</TableHead>
                        <TableHead className="sticky top-0 z-20 w-[25%] bg-slate-50 py-3 pr-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-[0_1px_0_0_#cbd5e1]">Análise Comparativa</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedObjects.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-bold uppercase text-[10px]">
                                Nenhum objeto encontrado para os filtros aplicados
                            </TableCell>
                        </TableRow>
                    ) : (
                        sortedObjects.map((obj) => {
                            const perf = calculatePerformanceChange(obj.currentChargeDurationMs, obj.previousChargeDurationMs);
                            const successPct = obj.processedRecordsCount > 0 
                                ? ((obj.processedRecordsCount - obj.errorRecordsCount) / obj.targetRecordsCount) * 100 
                                : 0;
                            const isInProgress = obj.status === 'CARGA_EM_ANDAMENTO';

                            return (
                                <TableRow key={obj.id} className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <TableCell className="py-3 pl-6">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none">{obj.name}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                {obj.chargeGroup || "G"} · #{String(obj.chargeOrder ?? 0).padStart(2, "0")}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <div className="flex flex-col gap-1 items-center">
                                            <div className="flex items-center gap-1.5">
                                                {isInProgress ? (
                                                    <Badge className="bg-blue-100 text-blue-600 border-none rounded-none text-[8px] font-black uppercase h-4 px-1.5 animate-pulse">
                                                        <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
                                                        Lendo
                                                    </Badge>
                                                ) : successPct >= 100 ? (
                                                    <CheckCircle2
                                                        className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                                                        aria-label="OK"
                                                    />
                                                ) : obj.errorRecordsCount > 0 ? (
                                                    <AlertCircle
                                                        className="w-3.5 h-3.5 text-red-600 shrink-0"
                                                        aria-label="Erro"
                                                    />
                                                ) : (
                                                    <Badge className="bg-slate-100 text-slate-600 border-none rounded-none text-[8px] font-black uppercase h-4 px-1.5">
                                                        Pendente
                                                    </Badge>
                                                )}
                                                <span className="text-[10px] font-black font-mono text-slate-700">{formatPercentage(successPct)}%</span>
                                            </div>
                                            <Progress value={successPct} className="h-1 w-20 rounded-none bg-slate-100" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 text-center">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-[11px] font-black text-slate-900 flex items-center justify-center gap-1 leading-none">
                                                <Timer className="w-3 h-3 text-slate-400" />
                                                {renderDuration(obj.currentChargeDurationMs, false, !!obj.chargeEndTime)}
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                                {formatNumber(obj.migratedRecordsCount || 0)} rec.
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 text-center bg-slate-50/30">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1 leading-none">
                                                <History className="w-3 h-3 text-slate-300" />
                                                {renderDuration(obj.previousChargeDurationMs || 0, true)}
                                            </div>
                                            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">
                                                {formatNumber(obj.previousMigratedRecordsCount || 0)} rec.
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 text-right pr-6">
                                        {perf ? (
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="flex flex-col items-end">
                                                    <div className={cn(
                                                        "flex items-center gap-1 text-[11px] font-black leading-none",
                                                        perf.isBetter ? "text-emerald-600" : "text-red-600"
                                                    )}>
                                                        {perf.isBetter ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                        {perf.percentage}%
                                                    </div>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                        {perf.isBetter ? "Ganho" : "Atraso"} de {renderDuration(Math.abs(perf.diffMs), true)}
                                                    </span>
                                                </div>
                                                <div className={cn(
                                                    "w-1 h-8 rounded-none",
                                                    perf.isBetter ? "bg-emerald-500" : "bg-red-500"
                                                )} />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                                                <Minus className="w-3 h-3" />
                                                Sem Dados
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
            </div>
            <div className="fiori-mock-summary fiori-mock-summary--dock shrink-0">
                <div className="fiori-mock-summary-head">
                    <div className="fiori-mock-summary-icon">
                        <BarChart3 className="w-4 h-4" />
                    </div>
                    <div className="fiori-mock-summary-titles">
                        <span className="fiori-mock-summary-title">Resumo de performance</span>
                        <span className="fiori-mock-summary-subtitle">Visão consolidada</span>
                    </div>
                </div>
                <div className="fiori-mock-summary-metrics">
                    <div className="fiori-mock-summary-metric">
                        <span className="fiori-mock-summary-metric-label">Amostragem</span>
                        <span className="fiori-mock-summary-metric-value">
                            {sortedObjects.length} objeto{sortedObjects.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className="fiori-mock-summary-divider" />
                    <div className="fiori-mock-summary-metric">
                        <span className="fiori-mock-summary-metric-label">Target</span>
                        <span className="fiori-mock-summary-metric-value">{formatNumber(totals.target)}</span>
                    </div>
                    <div className="fiori-mock-summary-divider" />
                    <div className="fiori-mock-summary-metric">
                        <span className="fiori-mock-summary-metric-label fiori-mock-summary-metric-label--success">Sucesso</span>
                        <span className="fiori-mock-summary-metric-value fiori-mock-summary-metric-value--success">{formatNumber(totals.success)}</span>
                    </div>
                    <div className="fiori-mock-summary-divider" />
                    <div className="fiori-mock-summary-metric">
                        <span className="fiori-mock-summary-metric-label fiori-mock-summary-metric-label--error">Erros</span>
                        <span className="fiori-mock-summary-metric-value fiori-mock-summary-metric-value--error">{formatNumber(totals.error)}</span>
                    </div>
                    <div className="fiori-mock-summary-divider" />
                    <span className="fiori-mock-summary-sync">Sincronizado</span>
                </div>
            </div>
        </div>
    );
}
