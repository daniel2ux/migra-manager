// src/components/dashboard/dashboard-card.tsx
"use client";

import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Box,
    MessageCircle,
    MessageSquare,
    Zap,
    Loader2,
    RefreshCcw,
    StopCircle,
    PlayCircle,
    Link2,
    Network,
    GitFork,
    ScrollText,
    BarChart2,
    Filter,
    FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConsolidatedTooltip } from "@/components/dashboard/consolidated-tooltip";
import {
    normalizeSeqForDisplay,
} from "@/lib/migration/sequence-utils";
import type { AggregatedObject } from "@/types/migration";
import { getDashboardCardDomId } from "@/lib/dashboard/card-key";
import {
    beginDashboardDialogScroll,
    endDashboardDialogScroll,
} from "@/lib/dashboard/scroll-preservation";

type CardPopoverPanel = "precedence" | "external" | "parallel" | "consolidated";

const SCROLL_LOCK_PANELS: CardPopoverPanel[] = ["precedence", "external", "parallel"];

function isPopoverPortalTarget(target: EventTarget | null) {
    return target instanceof Element && target.closest("[data-radix-popper-content-wrapper]") !== null;
}

function isPopoverTriggerTarget(target: EventTarget | null) {
    return target instanceof Element && target.closest("[data-dashboard-card-popover-trigger]") !== null;
}

function runCardAction(action: () => void) {
  return {
    onPointerDown: (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
    },
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation();
      action();
    },
  };
}

interface DashboardCardProps {
    obj: AggregatedObject;
    cardKey?: string;
    isSelected?: boolean;
    onSelect?: (obj: AggregatedObject) => void;
    commentsMapByObjectName?: Record<string, any[]>;
    mocksByIdMap?: Map<string, any>;
    isAdmin: boolean;
    isTogglingLoad: string | null;
    isMockLocked?: boolean;
    handleOpenCommentDialog?: (obj: AggregatedObject) => void;
    handleOpenLogViewer?: (obj: AggregatedObject) => void;
    handleOpenQuickDialog?: (obj: AggregatedObject) => void;
    handleToggleObjectLoad: (obj: AggregatedObject) => void;
    handleOpenStatReport?: (obj: AggregatedObject) => void;
    handleFilterByObject?: (obj: AggregatedObject) => void;
    handleOpenReport?: (obj: AggregatedObject) => void;
    handleOpenPrecedence?: (obj: AggregatedObject) => void;
    allObjects?: any[];
    objectsByName?: Map<string, any>;
    parallelByGroup?: Map<number, any[]>;
    selectedMockId?: string;
    /** Sequência exibida pela posição na grade (01.00, 02.00, …). */
    displayChargeOrder?: string | number;
}

export const DashboardCard = memo(({
    obj,
    cardKey,
    isSelected = false,
    onSelect,
    commentsMapByObjectName,
    selectedMockId = "all",
    isAdmin,
    isTogglingLoad,
    isMockLocked = false,
    handleOpenCommentDialog,
    handleOpenLogViewer,
    handleOpenQuickDialog,
    handleToggleObjectLoad,
    handleOpenStatReport,
    handleFilterByObject,
    handleOpenReport,
    handleOpenPrecedence,
    allObjects = [],
    objectsByName,
    parallelByGroup,
    mocksByIdMap,
    displayChargeOrder,
}: DashboardCardProps) => {

    const masterId = String((obj as any).masterObjectId || "").trim();
    const masterObj =
        (masterId ? allObjects.find((o: any) => o.id === masterId) : undefined) ??
        (objectsByName?.get(obj.name)) ??
        (allObjects.find((o: any) => o.name === obj.name)) ??
        obj;

    const displayChargeGroup = String(obj.chargeGroup ?? "").trim();

    const parallelOrderSource = obj.parallelOrder ?? masterObj.parallelOrder;
    const myParallelMajor = parallelOrderSource
        ? parseInt(String(parallelOrderSource).split(".")[0], 10)
        : 0;

    const parallelCandidates = myParallelMajor > 0
        ? parallelByGroup
            ? (parallelByGroup.get(myParallelMajor) ?? [])
            : allObjects.filter((o: any) =>
                o.parallelOrder &&
                parseInt(o.parallelOrder.split('.')[0], 10) === myParallelMajor
            )
        : [];

    const seenParallelKeys = new Set<string>();
    const parallelObjects = parallelCandidates.filter((o: any) => {
        // Exclui o proprio objeto mesmo quando vier com outro id na agregacao.
        if (o.id === masterObj.id || o.name === masterObj.name) return false;

        // Deduplica por nome: o mesmo objeto pode aparecer mais de uma vez em
        // masterObjects com IDs distintos (agregacao/historico), e id::name nao colide.
        const nameNorm = String(o.name || "").trim().toUpperCase();
        const dedupeKey = nameNorm || `__id__:${String(o.id || "")}`;
        if (seenParallelKeys.has(dedupeKey)) return false;
        seenParallelKeys.add(dedupeKey);
        return true;
    });

    const target = Number(obj.targetRecordsCount) || 0;
    const processed = Number(obj.processedRecordsCount) || 0;
    const error = Number(obj.errorRecordsCount) || 0;
    const success = Math.max(0, processed - error);
    const objHasErrors = error > 0;

    // Carga Consolidada: Sucesso / Target (Sucesso já é Lido - Erro)
    const processedPct = target > 0 ? (processed / target) * 100 : 0;
    const successPct = target > 0 ? (success / target) * 100 : 0;

    const objComments = commentsMapByObjectName?.[obj.name] || [];
    const hasComments = objComments.length > 0;

    const objectIsRunning = !!(obj.isInProgress || (obj.chargeStartTime && !obj.chargeEndTime));
    const objectIsConcluida = obj.isLoaded;
    const controlsLocked = isMockLocked && !objectIsRunning;
    const isFromSelectedMock = selectedMockId === "all" || obj.mockId === selectedMockId;
    const canShowTechLogs = isFromSelectedMock && error > 0 && obj.hasTechLogs;
    const domId = cardKey ? getDashboardCardDomId(cardKey) : undefined;

    const cardRef = useRef<HTMLDivElement>(null);
    const [openPanel, setOpenPanel] = useState<CardPopoverPanel | null>(null);
    const wasSelectedRef = useRef(isSelected);
    const suppressOutsideCloseRef = useRef(false);

    const closePanel = useCallback(() => {
        setOpenPanel((prev) => {
            if (prev !== null) {
                endDashboardDialogScroll(true);
            }
            return null;
        });
    }, []);

    const openPanelState = useCallback((panel: CardPopoverPanel) => {
        setOpenPanel((prev) => (prev === panel ? null : panel));
    }, []);

    const isInsideCard = useCallback((target: EventTarget | null) => {
        if (!(target instanceof Node)) return false;
        if (cardRef.current?.contains(target)) return true;
        if (domId) {
            const el = document.getElementById(domId);
            return el?.contains(target) ?? false;
        }
        return false;
    }, [domId]);

    useEffect(() => {
        if (wasSelectedRef.current && !isSelected) {
            closePanel();
        }
        wasSelectedRef.current = isSelected;
    }, [isSelected, closePanel]);

    useEffect(() => {
        if (!openPanel) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (suppressOutsideCloseRef.current) return;
            const target = event.target;
            if (isPopoverTriggerTarget(target)) return;
            if (isInsideCard(target)) return;
            if (isPopoverPortalTarget(target)) return;
            closePanel();
        };

        document.addEventListener("pointerdown", handlePointerDown, true);
        return () => document.removeEventListener("pointerdown", handlePointerDown, true);
    }, [openPanel, closePanel, isInsideCard]);

    const handlePopoverTriggerClick = (event: React.MouseEvent, panel: CardPopoverPanel) => {
        event.stopPropagation();
        suppressOutsideCloseRef.current = true;
        onSelect?.(obj);
        if (openPanel === null && SCROLL_LOCK_PANELS.includes(panel)) {
            beginDashboardDialogScroll();
        }
        openPanelState(panel);
        requestAnimationFrame(() => {
            suppressOutsideCloseRef.current = false;
        });
    };

    const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (isPopoverTriggerTarget(event.target)) return;
        onSelect?.(obj);
        closePanel();
    };

    const popoverContentHandlers = {
        onOpenAutoFocus: (event: Event) => event.preventDefault(),
        onCloseAutoFocus: (event: Event) => event.preventDefault(),
        onInteractOutside: (event: Event) => {
            if (isPopoverTriggerTarget(event.target)) {
                event.preventDefault();
            }
        },
    };

    const indicatorPanelOpen =
        openPanel === "precedence" ||
        openPanel === "external" ||
        openPanel === "parallel";

    const indicatorPanelVariantClass =
        openPanel === "precedence"
            ? "fiori-tooltip-panel--brand"
            : openPanel === "external"
                ? "fiori-tooltip-panel--warning"
                : openPanel === "parallel"
                    ? "fiori-tooltip-panel--positive"
                    : "";

    const hasIndicatorPopover =
        (masterObj.dependencyIds && masterObj.dependencyIds.length > 0) ||
        (masterObj.externalDependencies && masterObj.externalDependencies.length > 0) ||
        parallelObjects.length > 0;

    useLayoutEffect(() => {
        if (!indicatorPanelOpen) return;
        document.body.classList.add("dashboard-plaque-focus");
        return () => document.body.classList.remove("dashboard-plaque-focus");
    }, [indicatorPanelOpen]);

    return (
        <div
            className={cn(
                "dashboard-card-shell",
                indicatorPanelOpen && "fiori-card-plaque-active fiori-card-plaque-slot",
            )}
            data-plaque-variant={
                openPanel === "precedence"
                    ? "brand"
                    : openPanel === "external"
                        ? "warning"
                        : openPanel === "parallel"
                            ? "positive"
                            : undefined
            }
        >
            {indicatorPanelOpen &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="dashboard-plaque-backdrop"
                        onClick={closePanel}
                        aria-hidden
                    />,
                    document.body,
                )}
        <TooltipProvider>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <Card
                        ref={cardRef}
                        id={domId}
                        tabIndex={0}
                        onClick={handleCardClick}
                        className={cn(
                            "fiori-dashboard-object-card group relative transition-all duration-300 hover:scale-[1.03] hover:z-10 overflow-hidden cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-SkyBlue-500 focus-visible:ring-offset-2",
                            isSelected && "card-static-border z-10",
                        )}
                    >
                        {hasIndicatorPopover && (
                            <Popover
                                modal={false}
                                open={indicatorPanelOpen}
                                onOpenChange={(open) => {
                                    if (!open) closePanel();
                                }}
                            >
                                <PopoverAnchor asChild>
                                    <div
                                        className="pointer-events-none absolute inset-x-0 -top-[3px] h-0 w-full"
                                        aria-hidden
                                    />
                                </PopoverAnchor>
                                <PopoverContent
                                    side="top"
                                    align="center"
                                    sideOffset={7}
                                    avoidCollisions
                                    collisionPadding={12}
                                    {...popoverContentHandlers}
                                    className={cn(
                                        "fiori-tooltip-panel fiori-tooltip-panel--emerge-top fiori-card-plaque p-0 w-64 border-none",
                                        indicatorPanelVariantClass,
                                    )}
                                >
                                    {openPanel === "precedence" && masterObj.dependencyIds && (
                                        <div className="fiori-tooltip-panel-body">
                                            <div className="fiori-tooltip-panel-section-title">
                                                <span className="flex items-center gap-1.5">
                                                    <Link2 className="w-3 h-3" /> Precedência técnica
                                                </span>
                                                <span className="fiori-tooltip-panel-badge">{masterObj.dependencyIds.length}</span>
                                            </div>
                                            <div className="fiori-tooltip-panel-dep-list">
                                                {masterObj.dependencyIds.map((depId: string) => {
                                                    const dep = allObjects.find((o: any) => o.id === depId);
                                                    return (
                                                        <div key={depId} className="fiori-tooltip-panel-dep-item">
                                                            <div className="fiori-tooltip-panel-dep-dot" />
                                                            <span className="truncate">{dep?.name || "Objeto externo"}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {openPanel === "external" && masterObj.externalDependencies && (
                                        <div className="fiori-tooltip-panel-body">
                                            <div className="fiori-tooltip-panel-section-title">
                                                <span className="flex items-center gap-1.5">
                                                    <Network className="w-3 h-3" /> Dependências externas
                                                </span>
                                                <span className="fiori-tooltip-panel-badge">{masterObj.externalDependencies.length}</span>
                                            </div>
                                            <div className="fiori-tooltip-panel-dep-list">
                                                {masterObj.externalDependencies.map((dep: string, idx: number) => (
                                                    <div key={idx} className="fiori-tooltip-panel-dep-item">
                                                        <div className="fiori-tooltip-panel-dep-dot" />
                                                        <span className="truncate">{dep}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {openPanel === "parallel" && (
                                        <div className="fiori-tooltip-panel-body">
                                            <div className="fiori-tooltip-panel-section-title">
                                                <span className="flex items-center gap-1.5">
                                                    <GitFork className="w-3 h-3" /> Execução paralela
                                                </span>
                                                <span className="fiori-tooltip-panel-badge">{parallelObjects.length}</span>
                                            </div>
                                            <div className="fiori-tooltip-panel-dep-list">
                                                {parallelObjects.map((o: any) => (
                                                    <div key={o.name || o.id} className="fiori-tooltip-panel-dep-item">
                                                        <div className="fiori-tooltip-panel-dep-dot" />
                                                        <span className="truncate">{o.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </PopoverContent>
                            </Popover>
                        )}
                                <CardHeader className="flex-row items-center w-full p-2 pb-1 space-y-0">
                                    <div className="fiori-dashboard-object-card-header">
                                        <div className="fiori-dashboard-object-card-header-main">
                                            <span className="shrink-0 inline-flex items-center text-SkyBlue-500">
                                                <Box className="w-3.5 h-3.5" />
                                            </span>
                                            <h3 className="fiori-dashboard-object-card-title truncate">
                                                {obj.name}
                                            </h3>
                                            <div className="fiori-dashboard-object-card-header-badges">
                                                {objectIsRunning && (
                                                    <Badge className="h-4 px-1 bg-SkyBlue-500 text-white border-none rounded-none text-[8px] font-black uppercase tracking-tighter animate-pulse shadow-xs flex items-center gap-1 shrink-0">
                                                        <Loader2 className="w-2 h-2 animate-spin" />
                                                        EM CURSO
                                                    </Badge>
                                                )}
                                                {masterObj.dependencyIds && masterObj.dependencyIds.length > 0 && (
                                                    <button
                                                        type="button"
                                                        data-dashboard-card-popover-trigger=""
                                                        className="inline-flex items-center gap-0.5 text-SkyBlue-500 font-bold text-[10px] leading-none shrink-0 cursor-pointer hover:text-SkyBlue-600 transition-colors"
                                                        onClick={(event) => handlePopoverTriggerClick(event, "precedence")}
                                                        aria-label={`Precedência técnica: ${masterObj.dependencyIds.length} dependência${masterObj.dependencyIds.length > 1 ? "s" : ""}`}
                                                        aria-expanded={openPanel === "precedence"}
                                                    >
                                                        <Link2 className="w-2.5 h-2.5" />({masterObj.dependencyIds.length})
                                                    </button>
                                                )}
                                                {masterObj.externalDependencies && masterObj.externalDependencies.length > 0 && (
                                                    <button
                                                        type="button"
                                                        data-dashboard-card-popover-trigger=""
                                                        className="inline-flex items-center gap-0.5 text-amber-500 font-bold text-[10px] leading-none shrink-0 cursor-pointer hover:text-amber-600 transition-colors"
                                                        onClick={(event) => handlePopoverTriggerClick(event, "external")}
                                                        aria-label={`Dependências externas: ${masterObj.externalDependencies.length} item${masterObj.externalDependencies.length > 1 ? "s" : ""}`}
                                                        aria-expanded={openPanel === "external"}
                                                    >
                                                        <Network className="w-2.5 h-2.5" />({masterObj.externalDependencies.length})
                                                    </button>
                                                )}
                                                {parallelObjects.length > 0 && (
                                                    <button
                                                        type="button"
                                                        data-dashboard-card-popover-trigger=""
                                                        className="inline-flex items-center gap-0.5 text-[#107e3e] font-bold text-[10px] leading-none shrink-0 cursor-pointer hover:text-[#0a6642] transition-colors"
                                                        onClick={(event) => handlePopoverTriggerClick(event, "parallel")}
                                                        aria-label={`Execução paralela: ${parallelObjects.length} objeto${parallelObjects.length > 1 ? "s" : ""}`}
                                                        aria-expanded={openPanel === "parallel"}
                                                    >
                                                        <GitFork className="w-2.5 h-2.5" />({parallelObjects.length})
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div
                                            className="fiori-dashboard-object-card-charge-meta"
                                            aria-label={`Grupo ${displayChargeGroup || "—"}, sequência ${normalizeSeqForDisplay(displayChargeOrder)}`}
                                        >
                                            <span className="text-[10px] text-slate-500 uppercase tracking-tighter font-bold tabular-nums leading-none">
                                                {displayChargeGroup || "—"}/{normalizeSeqForDisplay(displayChargeOrder)}
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="px-2 py-1">
                                    <ConsolidatedTooltip
                                            obj={obj}
                                            successPct={successPct}
                                            processedPct={processedPct}
                                            success={success}
                                            error={error}
                                            target={target}
                                            processed={processed}
                                            objHasErrors={objHasErrors}
                                            isMockFinalized={((obj.mockId ? mocksByIdMap?.get(obj.mockId) : undefined)?.status === "CARGA_CONCLUIDA") || ((obj.mockId ? mocksByIdMap?.get(obj.mockId) : undefined)?.status === "FINALIZADA")}
                                            panelOpen={openPanel === "consolidated"}
                                            onPanelOpenChange={(open) => setOpenPanel(open ? "consolidated" : null)}
                                            onTriggerClick={(event) => handlePopoverTriggerClick(event, "consolidated")}
                                            popoverContentHandlers={popoverContentHandlers}
                                        />
                                </CardContent>

                                <div className="bg-white/50 p-1 flex justify-between items-center border-t border-slate-100">
                                    <div className="flex items-center gap-1">
                                        <>
                                            {hasComments ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    {...runCardAction(() => handleOpenCommentDialog?.(obj))}
                                                    className="h-6 w-6 hover:bg-SkyBlue-50 hover:text-SkyBlue-600 transition-all active:scale-95 flex items-center justify-center shrink-0 text-SkyBlue-600"
                                                    aria-label="Ver logs e comentários"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5 fill-SkyBlue-50" />
                                                </Button>
                                            ) : (
                                                <Tooltip delayDuration={0}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-xs"
                                                            {...runCardAction(() => handleOpenCommentDialog?.(obj))}
                                                            className="h-6 w-6 hover:bg-SkyBlue-50 hover:text-SkyBlue-600 transition-all active:scale-95 flex items-center justify-center shrink-0 text-slate-400"
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" variant="fiori" className="z-210">
                                                        Adicionar novo log/comentário
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}

                                            {canShowTechLogs && (
                                                <Tooltip delayDuration={0}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-xs"
                                                            {...runCardAction(() => handleOpenLogViewer?.(obj))}
                                                            className="h-6 w-6 hover:bg-SkyBlue-50 hover:text-SkyBlue-600 transition-all active:scale-95 flex items-center justify-center shrink-0 text-slate-400"
                                                        >
                                                            <ScrollText className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" variant="fiori" className="z-210">
                                                        Exibir logs
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}

                                            {handleOpenStatReport && (
                                                <Tooltip delayDuration={0}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-xs"
                                                            {...runCardAction(() => handleOpenStatReport(obj))}
                                                            className="h-6 w-6 hover:bg-SkyBlue-50 hover:text-SkyBlue-600 transition-all active:scale-95 flex items-center justify-center shrink-0 text-slate-400"
                                                        >
                                                            <BarChart2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" variant="fiori" className="z-210">
                                                        Estatística de carga
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}

                                            {handleOpenPrecedence && (
                                                <Tooltip delayDuration={0}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-xs"
                                                            {...runCardAction(() => handleOpenPrecedence(obj))}
                                                            className="h-6 w-6 hover:bg-SkyBlue-50 hover:text-SkyBlue-600 transition-all active:scale-95 flex items-center justify-center shrink-0 text-slate-400"
                                                        >
                                                            <Network className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" variant="fiori" className="z-210">
                                                        Explorador de precedência
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </>

                                        {isAdmin && (
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        disabled={controlsLocked}
                                                        {...runCardAction(() => handleOpenQuickDialog?.(obj))}
                                                        className={cn(
                                                            "h-6 w-6 transition-all active:scale-95 flex items-center justify-center shrink-0",
                                                            controlsLocked
                                                                ? "text-slate-300 cursor-not-allowed"
                                                                : "hover:bg-SkyBlue-50 hover:text-SkyBlue-600 text-slate-400"
                                                        )}
                                                    >
                                                        <Zap className="w-3.5 h-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" variant="fiori" className="z-210">
                                                    {controlsLocked ? "Mock/projeto bloqueado" : "Edição rápida de ciclo"}
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                        {isAdmin && (
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        disabled={controlsLocked || isTogglingLoad === obj.id}
                                                        className={cn(
                                                            "h-6 w-6 hover:bg-SkyBlue-50 transition-all active:scale-95 flex items-center justify-center shrink-0",
                                                            controlsLocked
                                                                ? "text-slate-300 cursor-not-allowed"
                                                                : objectIsConcluida
                                                                    ? "text-amber-500 hover:text-amber-600"
                                                                    : objectIsRunning
                                                                        ? "text-orange-600 hover:text-emerald-600"
                                                                        : "text-slate-400 hover:text-SkyBlue-600"
                                                        )}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!controlsLocked) handleToggleObjectLoad?.(obj);
                                                        }}
                                                    >
                                                        {isTogglingLoad === obj.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : objectIsConcluida ? (
                                                            <RefreshCcw className="w-3.5 h-3.5" />
                                                        ) : objectIsRunning ? (
                                                            <StopCircle className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <PlayCircle className="w-3.5 h-3.5" />
                                                        )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" variant="fiori" className="z-210">
                                                    {controlsLocked
                                                        ? "Mock/projeto bloqueado"
                                                        : objectIsConcluida
                                                            ? "Reiniciar carga"
                                                            : objectIsRunning
                                                                ? "Finalizar carga"
                                                                : "Iniciar carga"}
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                    </div>
                                </div>
                    </Card>
                </ContextMenuTrigger>

                <ContextMenuContent variant="fiori" className="fiori-dropdown-menu min-w-[13.75rem]">
                    <ContextMenuLabel className="fiori-dropdown-menu-label">
                        {obj.name}
                    </ContextMenuLabel>
                    <ContextMenuSeparator />
                    <>
                        {handleFilterByObject && (
                            <ContextMenuItem
                                className="fiori-dropdown-menu-item cursor-pointer"
                                {...runCardAction(() => handleFilterByObject(obj))}
                            >
                                <Filter className="h-3.5 w-3.5" />
                                Filtro
                            </ContextMenuItem>
                        )}
                        {handleOpenReport && (
                            <ContextMenuItem
                                className="fiori-dropdown-menu-item cursor-pointer"
                                {...runCardAction(() => handleOpenReport(obj))}
                            >
                                <FileText className="h-3.5 w-3.5" />
                                Relatórios
                            </ContextMenuItem>
                        )}
                        {handleOpenStatReport && (
                            <ContextMenuItem
                                className="fiori-dropdown-menu-item cursor-pointer"
                                {...runCardAction(() => handleOpenStatReport(obj))}
                            >
                                <BarChart2 className="h-3.5 w-3.5" />
                                Estatística
                            </ContextMenuItem>
                        )}
                        {handleOpenPrecedence && (
                            <ContextMenuItem
                                className="fiori-dropdown-menu-item cursor-pointer"
                                {...runCardAction(() => handleOpenPrecedence(obj))}
                            >
                                <Network className="h-3.5 w-3.5" />
                                Precedências
                            </ContextMenuItem>
                        )}
                        <ContextMenuSeparator />
                        <ContextMenuItem
                            className="fiori-dropdown-menu-item cursor-pointer"
                            {...runCardAction(() => handleOpenCommentDialog?.(obj))}
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Log / comentário
                        </ContextMenuItem>
                        {canShowTechLogs && (
                            <ContextMenuItem
                                className="fiori-dropdown-menu-item cursor-pointer"
                                {...runCardAction(() => handleOpenLogViewer?.(obj))}
                            >
                                <ScrollText className="h-3.5 w-3.5" />
                                Exibir logs
                            </ContextMenuItem>
                        )}
                    </>
                    {isAdmin && (
                        <>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                                className="fiori-dropdown-menu-item cursor-pointer"
                                {...runCardAction(() => handleOpenQuickDialog?.(obj))}
                            >
                                <Zap className="h-3.5 w-3.5" />
                                Edição rápida
                            </ContextMenuItem>
                            <ContextMenuItem
                                className={cn(
                                    "fiori-dropdown-menu-item cursor-pointer",
                                    (objectIsConcluida || objectIsRunning) && "fiori-dropdown-menu-item--warning",
                                )}
                                {...runCardAction(() => handleToggleObjectLoad(obj))}
                                disabled={isTogglingLoad === obj.id}
                            >
                                {isTogglingLoad === obj.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : objectIsConcluida ? (
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                ) : objectIsRunning ? (
                                    <StopCircle className="h-3.5 w-3.5" />
                                ) : (
                                    <PlayCircle className="h-3.5 w-3.5" />
                                )}
                                {objectIsConcluida ? "Reiniciar carga" : objectIsRunning ? "Finalizar carga" : "Iniciar carga"}
                            </ContextMenuItem>
                        </>
                    )}
                </ContextMenuContent>
            </ContextMenu>
        </TooltipProvider>
        </div>
    );
});

DashboardCard.displayName = "DashboardCard";
