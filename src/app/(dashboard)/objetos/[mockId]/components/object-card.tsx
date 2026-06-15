"use client";

import {
    Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Pencil, Loader2, Info, CheckCircle2, Zap, MessageSquare,
    MessageCircle, Terminal, GitBranch,
    AlertCircle, ScrollText, PlayCircle, StopCircle, Eye, RotateCcw,
    History, Ban, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isMigrationObjectInactive } from "@/lib/mock-utils";
import { MigrationObject, MigrationComment, MasterObject } from "@/app/(dashboard)/objetos/[mockId]/types";
import {
    formatNumber, formatPercentage, formatDateTime,
} from "@/lib/migration/format-utils";

const CARD_TOOLBAR_BTN =
    "fiori-card-toolbar-btn !rounded-[0.375rem] !size-7 min-h-0 min-w-0";

function getObjectLoadStatusMeta(
    isInProgress: boolean,
    successPct: number,
    hasErrors: boolean,
) {
    if (isInProgress) {
        return { label: "Em andamento", labelClass: "text-orange-700" };
    }
    if (successPct === 100) {
        return { label: "Concluído", labelClass: "text-[#107e3e]" };
    }
    if (hasErrors) {
        return { label: "Com erros", labelClass: "text-[#bb0000]" };
    }
    return { label: "Pendente", labelClass: "text-[#6a6d70]" };
}

interface ObjectCardProps {
    obj: MigrationObject;
    idx: number;
    isSelected: boolean;
    isAdmin: boolean;
    isAdminOrMaster: boolean;
    isMockLocked?: boolean;
    isMockInProgress?: boolean;
    isMockCompleted?: boolean;
    masterObjects: MasterObject[];
    objComments: MigrationComment[];
    onSelect: (id: string, idx: number, event?: React.MouseEvent | React.KeyboardEvent) => void;
    onContextMenu: (e: React.MouseEvent, obj: MigrationObject) => void;
    onOpenDialog: (obj: MigrationObject) => void;
    onOpenCommentDialog: (obj: MigrationObject) => void;
    onOpenQuickDialog: (obj: MigrationObject) => void;
    onToggleCargaStatus: (obj: MigrationObject) => void;
    onToggleActive: (obj: MigrationObject, activate: boolean) => void;
    onRemoveFromMock: (obj: MigrationObject) => void;
    onImportLogs: (id: string) => void;
    onViewLogs: (obj: MigrationObject) => void;
    onResetObject: (obj: MigrationObject) => void;
    renderDuration: (ms: number, allowZero?: boolean, hasDates?: boolean) => React.ReactNode;
}

export function ObjectCard({
    obj, idx, isSelected, isAdmin, isAdminOrMaster,
    isMockLocked, isMockInProgress, isMockCompleted,
    masterObjects, objComments,
    onSelect, onContextMenu, onOpenDialog, onOpenCommentDialog, onOpenQuickDialog,
    onToggleCargaStatus, onToggleActive, onRemoveFromMock, onImportLogs, onViewLogs, onResetObject, renderDuration,
}: ObjectCardProps) {
    const target = Number(obj.targetRecordsCount) || 0;
    const processed = Number(obj.processedRecordsCount) || 0;
    const error = Number(obj.errorRecordsCount) || 0;
    const success = Math.max(0, processed - error);
    const processedPct = target > 0 ? (processed / target) * 100 : 0;
    const successPct = target > 0 ? (success / target) * 100 : 0;
    const errorPct = target > 0 ? (error / target) * 100 : 0;
    const hasErrors = error > 0;
    const isInProgress = obj.status === 'CARGA_EM_ANDAMENTO' || !!(obj.chargeStartTime && !obj.chargeEndTime);
    const hasDates = !!(obj.chargeStartTime && obj.chargeEndTime);
    const hasComments = objComments.length > 0;
    const depCount = (obj.displayDependencies ?? []).length;
    const isInactive = isMigrationObjectInactive(obj);

    const calculatePerformanceChange = (current: number, previous: number) => {
        if (!current || !previous) return null;
        const diff = previous - current;
        const percentage = (diff / previous) * 100;
        return { isBetter: diff > 0, percentage: Math.abs(percentage).toFixed(1).replace(".", ",") };
    };
    const perfChange = calculatePerformanceChange(obj.currentChargeDurationMs, obj.previousChargeDurationMs);
    const loadStatusMeta = isInactive
        ? { label: "Inativo", labelClass: "text-[#6a6d70]" }
        : getObjectLoadStatusMeta(isInProgress, successPct, hasErrors);

    return (
        <div
            onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, obj); }}
            className={cn(
                "fiori-migration-object-card border border-slate-200 flex flex-col gap-0 transition-all duration-300 group cursor-default relative overflow-hidden select-none",
                isInactive && "fiori-migration-object-card--inactive",
                isSelected ? "bg-SkyBlue-50/60 border-SkyBlue-400" : isInProgress ? "bg-orange-50/20 hover:border-slate-400" : "bg-white hover:border-slate-400",
                "shadow-xs hover:shadow-xl"
            )}
        >
            {/* Header */}
            <div className="flex items-start gap-1.5 p-2.5 pb-2">
                {/* Checkbox */}
                <div className="shrink-0 flex items-center" onClick={(e) => { e.stopPropagation(); onSelect(obj.id, idx, e); }}>
                    <Checkbox
                        checked={isSelected}
                        className="fiori-card-select-checkbox data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900 rounded-sm h-3 w-3 border-slate-300 [&_svg]:h-2 [&_svg]:w-2"
                    />
                </div>

                {/* Name + badges */}
                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="fiori-migration-object-card-name">
                            {obj.name}
                        </span>

                        {/* Dependencies */}
                        {depCount > 0 && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Badge variant="outline" className="bg-slate-100 border-slate-200 text-[9px] font-black uppercase text-slate-500 h-4 px-1.5 rounded-none cursor-help">
                                        <GitBranch className="w-2.5 h-2.5 mr-1 text-slate-400" />{depCount}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent variant="fiori-panel" side="top" className="w-64 z-200">
                                    <div className="fiori-tooltip-panel-body">
                                        <div className="fiori-tooltip-panel-section-title">
                                            <span className="flex items-center gap-1.5">
                                                <GitBranch className="w-3 h-3" /> Precedência técnica
                                            </span>
                                            <span className="fiori-tooltip-panel-badge">{depCount}</span>
                                        </div>
                                        <div className="fiori-tooltip-panel-dep-list">
                                            {obj.displayDependencies?.map((depId: string) => {
                                                const depObj = masterObjects?.find(m => m.id === depId);
                                                return (
                                                    <div key={depId} className="fiori-tooltip-panel-dep-item">
                                                        <div className="fiori-tooltip-panel-dep-dot" />
                                                        <span className="truncate">{depObj?.name || 'Objeto externo'}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        )}

                        {/* Info tooltip */}
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <div className="p-0.5 rounded-none hover:bg-slate-100 cursor-help transition-colors shrink-0">
                                    <Info className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent variant="fiori-panel" side="right" className="fiori-object-tooltip">
                                <div className="fiori-object-tooltip-header">
                                    <h4 className="fiori-object-tooltip-name">{obj.name}</h4>
                                    <span className="fiori-object-tooltip-meta">
                                        Sequência {obj.displayGroup} · {obj.displayOrder}
                                    </span>
                                </div>
                                <div className="fiori-object-tooltip-body">
                                    {obj.description && (
                                        <p className="fiori-object-tooltip-desc">{obj.description}</p>
                                    )}
                                    <div className="fiori-object-tooltip-times">
                                        <div>
                                            <span className="fiori-object-tooltip-label">Início</span>
                                            <span className="fiori-object-tooltip-value fiori-object-tooltip-value--mono">
                                                {formatDateTime(obj.chargeStartTime) || "—"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="fiori-object-tooltip-label">Término</span>
                                            <span className={cn(
                                                "fiori-object-tooltip-value fiori-object-tooltip-value--mono",
                                                isInProgress && "fiori-object-tooltip-value--active"
                                            )}>
                                                {isInProgress
                                                    ? "Em andamento…"
                                                    : formatDateTime(obj.chargeEndTime) || "—"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="fiori-object-tooltip-metrics">
                                        <div className="fiori-object-tooltip-row">
                                            <span className="fiori-object-tooltip-label">Target</span>
                                            <span className="fiori-object-tooltip-value fiori-object-tooltip-value--mono">
                                                {formatNumber(obj.targetRecordsCount)}
                                            </span>
                                        </div>
                                        <div className="fiori-object-tooltip-row">
                                            <span className="fiori-object-tooltip-label">Sucesso</span>
                                            <span className="fiori-object-tooltip-value fiori-object-tooltip-value--mono fiori-object-tooltip-value--success">
                                                {formatNumber(success)}
                                            </span>
                                        </div>
                                        <div className="fiori-object-tooltip-row">
                                            <span className="fiori-object-tooltip-label">Erros</span>
                                            <span className="fiori-object-tooltip-value fiori-object-tooltip-value--mono fiori-object-tooltip-value--error">
                                                {formatNumber(error)}
                                            </span>
                                        </div>
                                        <div className="fiori-object-tooltip-row fiori-object-tooltip-row--separated">
                                            <span className="fiori-object-tooltip-label">Duração</span>
                                            <span className="fiori-object-tooltip-value fiori-object-tooltip-value--mono">
                                                {renderDuration(obj.currentChargeDurationMs, false, hasDates)}
                                            </span>
                                        </div>
                                    </div>
                                    {!isInProgress && perfChange && (
                                        <div className={cn(
                                            "fiori-object-tooltip-delta",
                                            perfChange.isBetter
                                                ? "fiori-object-tooltip-delta--better"
                                                : "fiori-object-tooltip-delta--worse"
                                        )}>
                                            <History aria-hidden />
                                            <span>
                                                {perfChange.percentage}% {perfChange.isBetter ? "mais rápido" : "mais lento"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                </div>

                <span
                    className={cn(
                        "fiori-migration-object-card-status-label shrink-0",
                        loadStatusMeta.labelClass,
                    )}
                >
                    {loadStatusMeta.label}
                </span>
            </div>

            {/* Quality indicator bar */}
            <div className="px-2.5 pb-1.5">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[6.5px] font-bold uppercase tracking-widest text-slate-400">Qualidade da Carga</span>
                    <div className="flex items-center gap-1">
                        {hasErrors && (
                            <div className="flex items-center gap-0.5 bg-red-50 px-1 border border-red-100 rounded-none">
                                <AlertCircle className="w-2 h-2 text-red-500" />
                                <span className="text-[8px] font-black text-red-600">{formatNumber(error)}</span>
                            </div>
                        )}
                        {processedPct >= 100 && !hasErrors && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        <span className={cn(
                            "text-[12px] font-black font-mono tracking-tighter leading-none",
                            processedPct === 0
                                ? "text-slate-400"
                                : processedPct >= 100 && !hasErrors
                                  ? "text-emerald-600"
                                  : processedPct >= 50
                                    ? "text-amber-600"
                                    : "text-red-600",
                        )}>
                            {formatPercentage(processedPct, "success", hasErrors)}%
                        </span>
                    </div>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-none overflow-hidden flex border border-slate-200/60 shadow-inner">
                    <div className="h-full bg-emerald-500 transition-all duration-700 ease-out" style={{ width: `${successPct}%` }} />
                    <div className="h-full bg-red-500 transition-all duration-700 ease-out" style={{ width: `${errorPct}%` }} />
                </div>
            </div>

            {/* Metrics - compact row */}
            <div className="flex items-center gap-0 border-t border-slate-200 px-2.5 py-1.5">
                {/* Performance */}
                <div className="flex-1 flex items-center justify-between">
                    <div className="flex flex-col leading-none">
                        <span className="text-[6.5px] font-black uppercase tracking-widest text-slate-400">Performance</span>
                        {isInProgress ? (
                            <div className="flex items-center gap-1 mt-0.5">
                                <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-500" />
                                <span className="text-[9px] font-black text-amber-600">EM ANDAMENTO</span>
                            </div>
                        ) : (
                            <span className="fiori-migration-object-card-stat-value text-[11px] font-black text-slate-800 tabular-nums mt-0.5">
                                {renderDuration(obj.currentChargeDurationMs, false, hasDates)}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col items-end leading-none">
                        <span className="text-[6.5px] font-black uppercase tracking-widest text-slate-400">Registros</span>
                        <span className="fiori-migration-object-card-stat-value text-[10px] font-black text-slate-700 tabular-nums mt-0.5">{formatNumber(target)}</span>
                    </div>
                </div>
            </div>

            {/* Actions footer */}
            <div className="fiori-card-footer flex items-center justify-between px-1.5 py-1 gap-1">
                <div className="fiori-card-toolbar">
                    {isInactive ? (
                        <>
                            {!isInProgress && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className={CARD_TOOLBAR_BTN} onClick={() => onOpenDialog(obj)}>
                                            <Eye className="w-3.5 h-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent variant="fiori" side="top">Visualizar detalhamento</TooltipContent>
                                </Tooltip>
                            )}
                            {isAdmin && !isMockLocked && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(CARD_TOOLBAR_BTN, "fiori-card-toolbar-btn-danger")}
                                            onClick={(e) => { e.stopPropagation(); onRemoveFromMock(obj); }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent variant="fiori" side="top">Remover da mock</TooltipContent>
                                </Tooltip>
                            )}
                            {isAdmin && !isMockLocked && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={CARD_TOOLBAR_BTN}
                                            onClick={(e) => { e.stopPropagation(); onToggleActive(obj, true); }}
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent variant="fiori" side="top">Reativar objeto</TooltipContent>
                                </Tooltip>
                            )}
                        </>
                    ) : (
                        <>
                    {/* Toggle carga */}
                    {isAdmin && !isMockLocked && isMockInProgress && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        CARD_TOOLBAR_BTN,
                                        isInProgress && "fiori-card-toolbar-btn-active text-orange-600",
                                        !isInProgress && obj.status === "CARGA_CONCLUIDA" && "text-emerald-600",
                                    )}
                                    onClick={(e) => { e.stopPropagation(); onToggleCargaStatus(obj); }}
                                >
                                    {isInProgress ? <StopCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent variant="fiori" side="top">{isInProgress ? "Finalizar execução" : "Iniciar carga"}</TooltipContent>
                        </Tooltip>
                    )}
                    {/* Reset */}
                    {isAdmin && !isMockLocked && !isMockCompleted && !isInProgress && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(CARD_TOOLBAR_BTN, "fiori-card-toolbar-btn-danger")}
                                    onClick={(e) => { e.stopPropagation(); onResetObject(obj); }}
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent variant="fiori" side="top">Reiniciar objeto</TooltipContent>
                        </Tooltip>
                    )}
                    {/* Edit / View */}
                    {!isInProgress && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className={CARD_TOOLBAR_BTN} onClick={() => onOpenDialog(obj)}>
                                    {(isAdmin && !isMockLocked && !isMockCompleted) ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent variant="fiori" side="top">{(isAdmin && !isMockLocked && !isMockCompleted) ? "Detalhamento" : "Visualizar"}</TooltipContent>
                        </Tooltip>
                    )}
                    {/* Comment */}
                    {!isInProgress && (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(CARD_TOOLBAR_BTN, hasComments ? "text-slate-600" : "text-emerald-500")}
                                    onClick={() => onOpenCommentDialog(obj)}
                                >
                                    {hasComments ? <MessageCircle className="w-3.5 h-3.5 fill-slate-100" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent variant="fiori" side="top">{hasComments ? `${objComments.length} comentário(s)` : "Registrar comentário"}</TooltipContent>
                        </Tooltip>
                    )}
                    {/* Quick edit */}
                    {isAdminOrMaster && !isMockLocked && !isMockCompleted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className={cn(CARD_TOOLBAR_BTN, "text-amber-500")} onClick={() => onOpenQuickDialog(obj)}>
                                    <Zap className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent variant="fiori" side="top">Edição rápida</TooltipContent>
                        </Tooltip>
                    )}
                    {/* Import logs */}
                    {isAdminOrMaster && !isMockLocked && !isMockCompleted && successPct < 100 && !isInProgress && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className={CARD_TOOLBAR_BTN} onClick={() => onImportLogs(obj.id)}>
                                    <Terminal className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent variant="fiori" side="top">Importar logs</TooltipContent>
                        </Tooltip>
                    )}
                    {/* View logs */}
                    {error > 0 && obj.hasTechLogs && !isInProgress && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className={cn(CARD_TOOLBAR_BTN, "fiori-card-toolbar-btn-danger text-red-500")} onClick={() => onViewLogs(obj)}>
                                    <ScrollText className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent variant="fiori" side="top">Relatório de erros</TooltipContent>
                        </Tooltip>
                    )}
                    {isAdmin && !isMockLocked && !isInProgress && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={CARD_TOOLBAR_BTN}
                                    onClick={(e) => { e.stopPropagation(); onToggleActive(obj, false); }}
                                >
                                    <Ban className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent variant="fiori" side="top">Inativar objeto</TooltipContent>
                        </Tooltip>
                    )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
