"use client";

import {
    Database,
    Link2,
    Network,
    AlertTriangle,
    Trash2,
    Pencil,
    Eye,
    GripVertical,
    Zap,
    ShieldCheck,
    Box,
    Hash,
    ArrowRight,
    GitFork
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { normalizeSeqForDisplay } from "@/lib/migration/sequence-utils";
import { ActivityGroupBadges } from "@/components/shared/activity-group-badges";
import type { MasterObject } from "@/types/master-object";
import type { ActivityGroup } from "@/types/activity-group";

export type { MasterObject } from "@/types/master-object";

const CARD_TOOLBAR_BTN =
    "fiori-card-toolbar-btn !rounded-[0.375rem] !size-7 min-h-0 min-w-0";

interface MigrationObjectCardProps {
    obj: MasterObject;
    isAdmin: boolean;
    isExecutionSort: boolean;
    isVisualReorderMode: boolean;
    isVisualDragging?: boolean;
    isVisualDragTarget?: boolean;
    isNormalDragging?: boolean;
    isNormalDragTarget?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    usageCount: number;
    precedenceChain: { chain: MasterObject[]; isCircular: boolean };
    otherParallelObjects: MasterObject[];
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onEdit: (obj: MasterObject) => void;
    onView: (obj: MasterObject) => void;
    onDelete: (id: string, name: string) => void;
    onOpenPrecedence: (obj: MasterObject) => void;
    onDependencies: (obj: MasterObject) => void;
    onSelectNext: (obj: MasterObject) => void;
    onSelectParallel: (obj: MasterObject) => void;
    allGroups?: ActivityGroup[];
    isMockLocked?: boolean;
    /** Mais de um documento em `masterObjects` com o mesmo nome (IDs diferentes). */
    catalogDuplicateName?: boolean;
    /** Sobrescreve `obj.chargeOrder` na exibição (ex.: posição na grade em modo Execução). */
    displayChargeOrder?: string | number;
}

export function MigrationObjectCard({
    obj,
    isAdmin,
    isExecutionSort,
    isVisualReorderMode,
    isVisualDragging,
    isVisualDragTarget,
    isNormalDragging,
    isNormalDragTarget,
    isSelected,
    onSelect,
    usageCount,
    precedenceChain,
    otherParallelObjects,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onEdit,
    onView,
    onDelete,
    onOpenPrecedence,
    onDependencies,
    onSelectNext,
    onSelectParallel,
    allGroups = [],
    isMockLocked = false,
    catalogDuplicateName = false,
    displayChargeOrder,
}: MigrationObjectCardProps) {
    const chargeOrderLabel = normalizeSeqForDisplay(displayChargeOrder ?? obj.chargeOrder);
    const isInUse = usageCount > 0;
    const isInactive = obj.status === "INATIVO";
    /** Excluir do catálogo só aparece para admin com objeto inativo; continua bloqueado se houver uso em mocks/projetos. */
    const showDeleteButton = isAdmin && isInactive;
    const canDelete = showDeleteButton && !isInUse;
    const { chain, isCircular } = precedenceChain;

    return (
        <div
            draggable={isAdmin && (isExecutionSort || isVisualReorderMode)}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            id={`obj-card-${obj.id}`}
            tabIndex={0}
            onClick={() => onSelect?.(obj.id)}
            className={cn(
                "fiori-migration-object-card group relative border border-slate-200 hover:border-slate-400 transition-all duration-300 hover:scale-[1.03] hover:z-10 overflow-hidden bg-white p-2.5 flex flex-col gap-2 select-none",
                isSelected ? "card-static-border z-10" : "",
                (isAdmin && (isExecutionSort || isVisualReorderMode)) ? "cursor-move" : "cursor-pointer",
                (isVisualDragging || isNormalDragging) && "fiori-migration-object-card--dragging opacity-30 border-slate-200 grayscale scale-95 cursor-grabbing",
                isVisualDragTarget && "fiori-migration-object-card--drag-target border-amber-400 border-dashed bg-amber-50/20 shadow-inner scale-[0.98] ring-2 ring-amber-400/30",
                isNormalDragTarget && "fiori-migration-object-card--drag-target border-emerald-400 border-dashed bg-emerald-50/10 shadow-inner scale-[0.98] ring-2 ring-emerald-500/20",
            )}
        >
            {isVisualReorderMode && (
                <div className="absolute top-1.5 right-1.5 z-10 opacity-40 group-hover:opacity-80 transition-opacity">
                    <GripVertical className="w-3.5 h-3.5 text-amber-500" />
                </div>
            )}

            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="fiori-migration-object-card-icon">
                        <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 min-w-0">
                            <span className="fiori-migration-object-card-name truncate">{obj.name}</span>
                            {catalogDuplicateName && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex shrink-0 cursor-help" tabIndex={0}>
                                            <AlertTriangle className="w-3 h-3 text-amber-500" aria-hidden />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" variant="fiori">
                                        Existe outro objeto mestre com o mesmo nome (outro ID no Firestore). Compare seq./uso nos mocks e mantenha apenas um registro.
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {obj.dependencyIds && obj.dependencyIds.length > 0 && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <span className="flex items-center gap-1 text-slate-500 font-bold text-[10px] shrink-0 ml-0.5 cursor-help hover:text-slate-900 transition-colors">
                                            <Link2 className="w-2.5 h-2.5" /> ({chain.length})
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent variant="fiori-panel" side="top" className="w-64 z-[200]">
                                        <div className="fiori-tooltip-panel-body">
                                            <div className="fiori-tooltip-panel-section-title">
                                                <span className="flex items-center gap-1.5">
                                                    <Link2 className="w-3 h-3" /> Precedências ativas
                                                </span>
                                                <span className="fiori-tooltip-panel-badge">{chain.length}</span>
                                            </div>
                                            {isCircular && (
                                                <div className="mx-3 mb-1 flex items-center gap-1.5 rounded-[0.25rem] border border-[#bb0000]/20 bg-[#ffebeb] px-2 py-1.5">
                                                    <AlertTriangle className="h-3 w-3 shrink-0 text-[#bb0000]" aria-hidden />
                                                    <span className="text-[0.625rem] font-medium text-[#bb0000]">
                                                        Cadeia circular detectada
                                                    </span>
                                                </div>
                                            )}
                                            <div className="fiori-tooltip-panel-dep-list max-h-[135px] overflow-y-auto custom-scrollbar">
                                                {chain
                                                    .filter((o) => obj.dependencyIds?.includes(o.id))
                                                    .map((o) => (
                                                        <div key={o.id} className="fiori-tooltip-panel-dep-item">
                                                            <div className="fiori-tooltip-panel-dep-dot" />
                                                            <span className="truncate">{o.name}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {obj.externalDependencies && obj.externalDependencies.length > 0 && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <span className="flex items-center gap-1 text-amber-500 font-bold text-[10px] shrink-0 ml-1.5 cursor-help hover:text-amber-600 transition-colors">
                                            <Network className="w-2.5 h-2.5" /> ({obj.externalDependencies.length})
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent variant="fiori-panel" side="top" className="w-64 z-[200]">
                                        <div className="fiori-tooltip-panel-body">
                                            <div className="fiori-tooltip-panel-section-title">
                                                <span className="flex items-center gap-1.5">
                                                    <Network className="w-3 h-3 text-[#e76500]" /> Dependências externas
                                                </span>
                                                <span className="fiori-tooltip-panel-badge">{obj.externalDependencies.length}</span>
                                            </div>
                                            <div className="fiori-tooltip-panel-dep-list max-h-[135px] overflow-y-auto custom-scrollbar">
                                                {obj.externalDependencies.map((dep, idx) => (
                                                    <div key={idx} className="fiori-tooltip-panel-dep-item">
                                                        <div className="fiori-tooltip-panel-dep-dot" />
                                                        <span className="truncate">{dep}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {otherParallelObjects && otherParallelObjects.length > 0 && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <span className="flex items-center gap-1 text-slate-500 font-bold text-[10px] shrink-0 ml-1.5 cursor-help hover:text-slate-600 transition-colors">
                                            <GitFork className="w-2.5 h-2.5" /> ({otherParallelObjects.length})
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent variant="fiori-panel" side="top" className="w-64 z-[200]">
                                        <div className="fiori-tooltip-panel-body">
                                            <div className="fiori-tooltip-panel-section-title">
                                                <span className="flex items-center gap-1.5">
                                                    <GitFork className="w-3 h-3" /> Execução paralela
                                                </span>
                                                <span className="fiori-tooltip-panel-badge">{otherParallelObjects.length}</span>
                                            </div>
                                            <div className="fiori-tooltip-panel-dep-list max-h-[135px] overflow-y-auto custom-scrollbar">
                                                {otherParallelObjects.map((o) => (
                                                    <div key={o.id} className="fiori-tooltip-panel-dep-item">
                                                        <div className="fiori-tooltip-panel-dep-dot" />
                                                        <span className="truncate">{o.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>

                        <ActivityGroupBadges groupIds={obj.activityGroupIds} allGroups={allGroups} maxVisible={2} />
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <div className={cn(
                                "w-5 h-5 flex items-center justify-center rounded-none shadow-xs shrink-0 cursor-help",
                                (!obj.status || obj.status === 'ATIVO') ? "bg-emerald-50" :
                                    obj.status === 'LEGACY' ? "bg-amber-50" :
                                        "bg-rose-50"
                            )}>
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    (!obj.status || obj.status === 'ATIVO') ? "bg-emerald-500" :
                                        obj.status === 'LEGACY' ? "bg-amber-500" :
                                            "bg-rose-500"
                                )} />
                            </div>
                        </TooltipTrigger>
            <TooltipContent side="top" variant="fiori">
                            STATUS: {obj.status || 'ATIVO'}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {obj.status !== 'INATIVO' && (
                <div className="fiori-migration-object-card-metrics">
                    <div className={cn("fiori-migration-object-card-metric", !obj.chargeGroup && "opacity-40")}>
                        <Box className="fiori-migration-object-card-metric-icon" aria-hidden />
                        <span className="fiori-migration-object-card-metric-label">Grupo</span>
                        <span className="fiori-migration-object-card-metric-value">
                            {obj.chargeGroup || "—"}
                        </span>
                    </div>

                    <div className="fiori-migration-object-card-metric-divider" role="separator" aria-hidden />

                    <div className={cn(
                        "fiori-migration-object-card-metric",
                        chargeOrderLabel === "—" && "opacity-40",
                    )}>
                        <Hash className="fiori-migration-object-card-metric-icon" aria-hidden />
                        <span className="fiori-migration-object-card-metric-label">Seq. Carga</span>
                        <span className="fiori-migration-object-card-metric-value">
                            {chargeOrderLabel}
                        </span>
                    </div>

                    <div className="fiori-migration-object-card-metric-divider" role="separator" aria-hidden />

                    <div className="fiori-migration-object-card-metric">
                        {obj.isParallel ? (
                            <Zap className="fiori-migration-object-card-metric-icon animate-pulse" aria-hidden />
                        ) : (
                            <Box className="fiori-migration-object-card-metric-icon" aria-hidden />
                        )}
                        <span className="fiori-migration-object-card-metric-label">Tipo Carga</span>
                        <span className="fiori-migration-object-card-metric-value">
                            {obj.isParallel ? "PARALELO" : "SEQUENCIAL"}
                        </span>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-1 mt-auto">
                <div className="fiori-card-footer flex items-center justify-between gap-2">
                    <div className="fiori-card-toolbar">
                        {isAdmin && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            onSelect?.(obj.id);
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isMockLocked) {
                                                onView(obj);
                                            } else {
                                                onEdit(obj);
                                            }
                                        }}
                                        className={CARD_TOOLBAR_BTN}
                                    >
                                        {isMockLocked ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" variant="fiori">
                                    {isMockLocked ? "Visualizar objeto" : "Editar objeto"}
                                </TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        onSelect?.(obj.id);
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenPrecedence(obj);
                                    }}
                                    className={cn(
                                        CARD_TOOLBAR_BTN,
                                        obj.dependencyIds && obj.dependencyIds.length > 0 && "fiori-card-toolbar-btn-active"
                                    )}
                                >
                                    <Network className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" variant="fiori">
                                Visualizar precedências em grafo
                            </TooltipContent>
                        </Tooltip>

                        {isAdmin && (
                            <>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                onSelect?.(obj.id);
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDependencies(obj);
                                            }}
                                            disabled={isMockLocked}
                                            className={cn(
                                                CARD_TOOLBAR_BTN,
                                                obj.dependencyIds && obj.dependencyIds.length > 0 && "fiori-card-toolbar-btn-active"
                                            )}
                                        >
                                            <Link2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" variant="fiori">
                                        {isMockLocked ? "Mock bloqueado" : "Selecionar dependências"}
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                onSelect?.(obj.id);
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectNext(obj);
                                            }}
                                            disabled={isMockLocked}
                                            className={CARD_TOOLBAR_BTN}
                                        >
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" variant="fiori">
                                        {isMockLocked ? "Mock bloqueado" : "Selecionar próximo objeto"}
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                onSelect?.(obj.id);
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectParallel(obj);
                                            }}
                                            disabled={isMockLocked}
                                            className={cn(
                                                CARD_TOOLBAR_BTN,
                                                obj.isParallel && "fiori-card-toolbar-btn-active"
                                            )}
                                        >
                                            <GitFork className="w-3.5 h-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" variant="fiori">
                                        {isMockLocked ? "Mock bloqueado" : "Configurar paralelismo"}
                                    </TooltipContent>
                                </Tooltip>
                            </>
                        )}
                    </div>

                    {showDeleteButton && (
                        <div className="fiori-card-toolbar">
                            {isInUse && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="fiori-card-footer-meta">
                                            <ShieldCheck className="w-3.5 h-3.5 opacity-50" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" variant="fiori">
                                        Protegido (em uso)
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={!canDelete}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                onSelect?.(obj.id);
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(obj.id, obj.name);
                                            }}
                                            className={cn(CARD_TOOLBAR_BTN, "fiori-card-toolbar-btn-danger")}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" variant="fiori" className="max-w-[260px]">
                                    {canDelete
                                        ? "Excluir permanentemente"
                                        : `Este objeto está vinculado a ${usageCount} mock(s) ou projeto(s). Remova-o das execuções antes de excluir.`}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
