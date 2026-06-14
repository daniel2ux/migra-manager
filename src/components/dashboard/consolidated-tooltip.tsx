"use client";

import React from "react";
import {
    CheckCircle,
    PlayCircle,
    Flag,
    Target,
    Layers,
    CheckCircle2,
    XCircle,
    Timer,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatPercentage, formatNumber, renderDuration, formatDateTime } from "@/lib/formatters";
import type { AggregatedObject } from "@/types/migration";

interface ConsolidatedTooltipProps {
    obj: AggregatedObject;
    successPct: number;
    processedPct: number;
    success: number;
    error: number;
    target: number;
    processed: number;
    objHasErrors: boolean;
    isMockFinalized?: boolean;
    panelOpen?: boolean;
    onPanelOpenChange?: (open: boolean) => void;
    onTriggerClick?: (event: React.MouseEvent) => void;
    popoverContentHandlers?: {
        onOpenAutoFocus: (event: Event) => void;
        onCloseAutoFocus: (event: Event) => void;
        onInteractOutside?: (event: Event) => void;
    };
}

type ConsolidatedTooltipDetailProps = Pick<
    ConsolidatedTooltipProps,
    "obj" | "successPct" | "processedPct" | "success" | "error" | "target" | "processed" | "objHasErrors"
>;

function pctToneClass(successPct: number, objHasErrors: boolean) {
    if (successPct <= 0 && !objHasErrors) return "text-[var(--fiori-text,#32363a)]";
    if (successPct >= 100 && !objHasErrors) return "text-emerald-700";
    if (objHasErrors) return "text-red-500";
    if (successPct >= 50) return "text-amber-600";
    return "text-red-500";
}

function pctBadgeClass(successPct: number, objHasErrors: boolean) {
    if (successPct <= 0 && !objHasErrors) return "consolidated-tooltip-panel-header-pct--neutral";
    if (successPct >= 100 && !objHasErrors) return "consolidated-tooltip-panel-header-pct--success";
    if (successPct >= 50) return "consolidated-tooltip-panel-header-pct--warning";
    return "consolidated-tooltip-panel-header-pct--critical";
}

function ConsolidatedTooltipDetail({
    obj,
    successPct,
    processedPct,
    success,
    error,
    target,
    processed,
    objHasErrors,
}: ConsolidatedTooltipDetailProps) {
    const isInProgress = !!obj.isInProgress;

    return (
        <>
            <div className="consolidated-tooltip-panel-header">
                <div className="consolidated-tooltip-panel-header-title">
                    <h4 className="consolidated-tooltip-panel-header-name">{obj.name}</h4>
                    <span className={cn("consolidated-tooltip-panel-header-pct", pctBadgeClass(successPct, objHasErrors))}>
                        {formatPercentage(successPct, "success", objHasErrors)}%
                    </span>
                </div>
                <p className="consolidated-tooltip-panel-header-sub">Resumo de ciclo</p>
            </div>

            <div className="consolidated-tooltip-panel-body">
                <div className="consolidated-tooltip-panel-times">
                    <div>
                        <div className="consolidated-tooltip-panel-time-label">
                            <PlayCircle className="w-3 h-3" />
                            Início
                        </div>
                        <p className="consolidated-tooltip-panel-time-value">
                            {obj.chargeStartTime ? formatDateTime(obj.chargeStartTime).split(" ").pop() : "—"}
                        </p>
                    </div>
                    <div>
                        <div className="consolidated-tooltip-panel-time-label consolidated-tooltip-panel-time-label--end">
                            Término
                            <Flag className="w-3 h-3" />
                        </div>
                        <p className={cn(
                            "consolidated-tooltip-panel-time-value consolidated-tooltip-panel-time-value--end",
                            isInProgress && "consolidated-tooltip-panel-time-value--active"
                        )}>
                            {obj.chargeEndTime
                                ? formatDateTime(obj.chargeEndTime).split(" ").pop()
                                : isInProgress
                                    ? "Em curso"
                                    : "—"}
                        </p>
                    </div>
                </div>

                <div className="consolidated-tooltip-panel-metrics">
                    <div className="consolidated-tooltip-panel-metric-row">
                        <div className="consolidated-tooltip-panel-metric-label">
                            <Target className="w-3.5 h-3.5 icon-sky" />
                            Target
                        </div>
                        <span className="consolidated-tooltip-panel-metric-value">
                            {formatNumber(target, false)}
                        </span>
                    </div>

                    <div className="consolidated-tooltip-panel-metric-row">
                        <div className="consolidated-tooltip-panel-metric-label">
                            <Layers className="w-3.5 h-3.5" />
                            Processado
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="consolidated-tooltip-panel-metric-value">
                                {formatNumber(processed, false)}
                            </span>
                            <span className="consolidated-tooltip-panel-metric-sub">
                                ({formatPercentage(processedPct)}%)
                            </span>
                        </div>
                    </div>

                    <div className="consolidated-tooltip-panel-metric-row">
                        <div className="consolidated-tooltip-panel-metric-label">
                            <CheckCircle2 className="w-3.5 h-3.5 icon-success" />
                            Sucesso
                        </div>
                        <span className="consolidated-tooltip-panel-metric-value consolidated-tooltip-panel-metric-value--success">
                            {formatNumber(success, false)}
                        </span>
                    </div>

                    {error > 0 && (
                        <div className="consolidated-tooltip-panel-metric-row">
                            <div className="consolidated-tooltip-panel-metric-label">
                                <XCircle className="w-3.5 h-3.5 icon-error" />
                                Erros
                            </div>
                            <span className="consolidated-tooltip-panel-metric-value consolidated-tooltip-panel-metric-value--error">
                                {formatNumber(error, false)}
                            </span>
                        </div>
                    )}
                </div>

                <div className="consolidated-tooltip-panel-footer">
                    <div className="consolidated-tooltip-panel-footer-label">
                        <Timer className="w-3.5 h-3.5" />
                        Duração
                    </div>
                    <div className="consolidated-tooltip-panel-footer-value">
                        {renderDuration(obj.currentChargeDurationMs)}
                    </div>
                </div>
            </div>
        </>
    );
}

export const ConsolidatedTooltip = ({
    obj,
    successPct,
    processedPct,
    success,
    error,
    target,
    processed,
    objHasErrors,
    isMockFinalized = false,
    panelOpen,
    onPanelOpenChange,
    onTriggerClick,
    popoverContentHandlers,
}: ConsolidatedTooltipProps) => {
    const detailProps: ConsolidatedTooltipDetailProps = {
        obj,
        successPct,
        processedPct,
        success,
        error,
        target,
        processed,
        objHasErrors,
    };
    const toneClass = pctToneClass(successPct, objHasErrors);

    return (
        <div className="flex flex-col flex-1 items-center justify-center py-1.5 px-2 transition-all gap-1.5">
            <div className="inline-flex items-center gap-1">
                {obj.isLoaded ? (
                    <>
                        <span className={cn("text-[14px] font-black font-mono leading-none tracking-tight", toneClass)}>
                            {formatPercentage(successPct, "success", objHasErrors)}%
                        </span>
                        <Popover open={panelOpen} onOpenChange={onPanelOpenChange}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    data-dashboard-card-popover-trigger=""
                                    className="inline-flex shrink-0 cursor-pointer rounded-sm outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-SkyBlue-500"
                                    onClick={onTriggerClick}
                                    aria-label={`Resumo de ciclo: ${formatPercentage(successPct, "success", objHasErrors)}% de sucesso`}
                                >
                                    <CheckCircle className="shrink-0 text-emerald-500" style={{ width: 12, height: 12 }} />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                side="right"
                                align="start"
                                {...popoverContentHandlers}
                                className="fiori-tooltip-panel consolidated-tooltip-panel p-0 w-64 border-none shadow-none"
                            >
                                <ConsolidatedTooltipDetail {...detailProps} />
                            </PopoverContent>
                        </Popover>
                    </>
                ) : (
                    <Popover open={panelOpen} onOpenChange={onPanelOpenChange}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                data-dashboard-card-popover-trigger=""
                                className={cn(
                                    "text-[14px] font-black font-mono inline-flex items-center gap-1 leading-none tracking-tight cursor-pointer rounded-sm outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-SkyBlue-500",
                                    toneClass
                                )}
                                onClick={onTriggerClick}
                                aria-label={`Resumo de ciclo: ${formatPercentage(successPct, "success", objHasErrors)}% de sucesso`}
                            >
                                {formatPercentage(successPct, "success", objHasErrors)}%
                            </button>
                        </PopoverTrigger>
                        <PopoverContent
                            side="right"
                            align="start"
                            {...popoverContentHandlers}
                            className="fiori-tooltip-panel consolidated-tooltip-panel p-0 w-64 border-none shadow-none"
                        >
                            <ConsolidatedTooltipDetail {...detailProps} />
                        </PopoverContent>
                    </Popover>
                )}
            </div>

            <div className="flex items-center gap-2 leading-none">
                <div className="text-[10px] text-slate-500 font-mono font-bold tabular-nums">
                    {renderDuration(obj.currentChargeDurationMs)}
                </div>
                <div className="h-2 w-px bg-slate-200/40 shrink-0" />
                <span
                    className={cn(
                        "text-[10px] font-mono font-bold text-slate-400 tabular-nums flex items-center",
                        successPct >= 100 && !objHasErrors && "text-emerald-600"
                    )}
                >
                    {formatNumber(success, false)}{" "}
                    <span className="text-[8px] opacity-40 font-normal mx-0.5">/</span>{" "}
                    {!isMockFinalized && !obj.isLoaded && (
                        <span className="text-[10px] font-black text-slate-400/80 mr-1">(P)</span>
                    )}
                    {formatNumber(target, false)}
                </span>
            </div>
        </div>
    );
};
