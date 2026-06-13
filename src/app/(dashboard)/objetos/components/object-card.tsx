"use client";

import { useState, useRef, useEffect } from "react";
import {
    Database,
    Link2,
    Network,
    AlertTriangle,
    Trash2,
    Pencil,
    Eye,
    GripVertical,
    ShieldCheck,
    ArrowRight,
    GitFork,
    CheckCircle2,
    StopCircle,
    Layers,
    ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { isValidSequence, normalizeSeqForDisplay, isObjectParallelLoad } from "@/lib/migration/sequence-utils";
import { ActivityGroupBadges } from "@/components/shared/activity-group-badges";
import type { MasterObject } from "@/types/master-object";
import type { ActivityGroup } from "@/types/activity-group";
import type { ChargeGroup } from "@/types/charge-group";

export type { MasterObject } from "@/types/master-object";

const CARD_TOOLBAR_BTN =
    "fiori-card-toolbar-btn !rounded-[0.375rem] !size-7 min-h-0 min-w-0";

const MASTER_STATUS_OPTIONS = [
    { value: "ATIVO", label: "Ativo", dotClass: "fiori-select-status-dot--success" },
    { value: "INATIVO", label: "Inativo", dotClass: "fiori-select-status-dot--neutral" },
] as const;

function stopCardEvent(e: React.SyntheticEvent) {
    e.stopPropagation();
}

function masterObjectStatusMeta(status?: string) {
    const normalized = (status || "ATIVO").trim().toUpperCase();
    if (normalized === "ATIVO") {
        return {
            label: "Ativo",
            labelClass: "text-[#107e3e]",
            icon: <CheckCircle2 className="w-3 h-3" aria-hidden />,
        };
    }
    if (normalized === "LEGACY") {
        return {
            label: "Legado",
            labelClass: "text-amber-700",
            icon: <AlertTriangle className="w-3 h-3" aria-hidden />,
        };
    }
    if (normalized === "INATIVO") {
        return {
            label: "Inativo",
            labelClass: "text-[#6a6d70]",
            icon: <StopCircle className="w-3 h-3" aria-hidden />,
        };
    }
    return {
        label: normalized,
        labelClass: "text-[#6a6d70]",
        icon: <StopCircle className="w-3 h-3" aria-hidden />,
    };
}

interface MigrationObjectCardProps {
    obj: MasterObject;
    isAdmin: boolean;
  /** Somente perfis Governança (admin) e Master podem alterar status/grupos no card. */
  isAdminOrMaster?: boolean;
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
    /** Grupo de carga cadastrado em `charge_groups` (vazio se não configurado). */
    displayChargeGroup?: string;
    /** Admin: altera sequência de carga inline no card. */
    onChargeOrderChange?: (obj: MasterObject, newOrder: string) => void;
    /** Admin: altera status inline no card. */
    onStatusChange?: (obj: MasterObject, status: string) => void;
    /** Admin: altera grupos de atividade inline no card. */
    onActivityGroupsChange?: (obj: MasterObject, groupIds: string[]) => void;
    /** Grupos de carga cadastrados em `charge_groups`. */
    allChargeGroups?: ChargeGroup[];
    selectedChargeGroupId?: string | null;
    /** Somente Governança (admin) ou Master — altera grupo de carga inline no card. */
    onChargeGroupChange?: (obj: MasterObject, groupId: string | null) => void;
}

function CardChargeOrderMetric({
    displayValue,
    editable,
    dimmed,
    onCommit,
}: {
    displayValue: string;
    editable: boolean;
    dimmed?: boolean;
    onCommit: (newOrder: string) => void;
}) {
    const [editOpen, setEditOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!editOpen) return;
        const frame = requestAnimationFrame(() => {
            const el = inputRef.current;
            el?.focus();
            el?.select();
        });
        return () => cancelAnimationFrame(frame);
    }, [editOpen]);

    const formatDraft = (raw: string) => {
        const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
        return digits.length > 2 ? `${digits.slice(0, 2)}.${digits.slice(2)}` : digits;
    };

    const cancelEdit = () => {
        setEditOpen(false);
        setDraft("");
    };

    const commitEdit = () => {
        const fmt = draft.trim();
        setEditOpen(false);
        setDraft("");
        if (!fmt || !isValidSequence(fmt) || fmt === displayValue) return;
        onCommit(fmt);
    };

    const startEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (!editable || editOpen) return;
        setDraft(displayValue === "—" ? "" : displayValue);
        setEditOpen(true);
    };

    const metricClassName = cn(
        "fiori-migration-object-card-metric",
        dimmed && "opacity-40",
        editable && "fiori-migration-object-card-metric--editable",
    );

    if (!editable) {
        return (
            <div className={metricClassName}>
                <span className="fiori-migration-object-card-metric-label">Seq. Carga</span>
                <span className="fiori-migration-object-card-metric-value">{displayValue}</span>
            </div>
        );
    }

    return (
        <div className={cn(metricClassName, editOpen && "fiori-migration-object-card-metric--editing")}>
            <span className="fiori-migration-object-card-metric-label">Seq. Carga</span>
            <Popover
                open={editOpen}
                onOpenChange={(open) => {
                    if (!open) cancelEdit();
                }}
            >
                <PopoverAnchor asChild>
                    <span
                        className="fiori-migration-object-card-metric-value fiori-migration-object-card-metric-value--hover-zoom"
                        onClick={startEdit}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                startEdit(e);
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="Editar sequência de carga"
                        aria-expanded={editOpen}
                    >
                        {displayValue}
                    </span>
                </PopoverAnchor>
                <PopoverContent
                    variant="fiori"
                    side="top"
                    align="center"
                    sideOffset={6}
                    className="fiori-charge-order-edit-tooltip"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => {
                        e.preventDefault();
                        cancelEdit();
                    }}
                    onInteractOutside={(e) => {
                        e.preventDefault();
                        commitEdit();
                    }}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="01.00"
                        value={draft}
                        aria-label="Sequência de carga"
                        className={cn(
                            "fiori-charge-order-preview-popover-input",
                            draft && !isValidSequence(draft) && "fiori-charge-order-preview-popover-input--invalid",
                        )}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setDraft(formatDraft(e.target.value))}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") {
                                e.preventDefault();
                                commitEdit();
                            }
                            if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEdit();
                            }
                        }}
                    />
                    <span className="fiori-charge-order-preview-popover-hint">
                        Enter confirma · Esc cancela
                    </span>
                </PopoverContent>
            </Popover>
        </div>
    );
}

function CardStatusControl({
    status,
    editable,
    onChange,
}: {
    status?: string;
    editable: boolean;
    onChange: (status: string) => void;
}) {
    const statusMeta = masterObjectStatusMeta(status);
    const normalized = (status || "ATIVO").trim().toUpperCase();

    if (!editable) {
        return (
            <div className={cn("fiori-project-card-status-label", statusMeta.labelClass)}>
                {statusMeta.icon}
                {statusMeta.label}
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "fiori-project-card-status-label fiori-card-meta-editable",
                        statusMeta.labelClass,
                    )}
                    onClick={stopCardEvent}
                    onMouseDown={stopCardEvent}
                    aria-label="Alterar status do objeto"
                >
                    {statusMeta.icon}
                    {statusMeta.label}
                    <ChevronDown className="w-2.5 h-2.5 opacity-60" aria-hidden />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={4}
                className="fiori-dropdown-menu w-40"
                onClick={stopCardEvent}
            >
                <DropdownMenuLabel className="fiori-dropdown-menu-label">Status</DropdownMenuLabel>
                {MASTER_STATUS_OPTIONS.map((option) => {
                    const isSelected = normalized === option.value;
                    return (
                        <DropdownMenuItem
                            key={option.value}
                            className={cn(
                                "fiori-dropdown-menu-item",
                                isSelected && "fiori-dropdown-menu-item--selected",
                            )}
                            onSelect={() => {
                                if (!isSelected) onChange(option.value);
                            }}
                        >
                            <span
                                className={cn("fiori-select-status-dot", option.dotClass)}
                                aria-hidden
                            />
                            {option.label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function CardActivityGroupsControl({
    groupIds,
    allGroups,
    editable,
    onChange,
}: {
    groupIds?: string[];
    allGroups: ActivityGroup[];
    editable: boolean;
    onChange: (groupIds: string[]) => void;
}) {
    const selectedIds = groupIds ?? [];
    const hasGroups = selectedIds.length > 0;

    if (!editable || allGroups.length === 0) {
        if (!hasGroups) return null;
        return <ActivityGroupBadges groupIds={groupIds} allGroups={allGroups} maxVisible={2} />;
    }

    const toggleGroup = (groupId: string) => {
        const next = selectedIds.includes(groupId)
            ? selectedIds.filter((id) => id !== groupId)
            : [...selectedIds, groupId];
        onChange(next);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="fiori-card-activity-groups-trigger"
                    onClick={stopCardEvent}
                    onMouseDown={stopCardEvent}
                    aria-label="Alterar grupos de atividade"
                >
                    {hasGroups ? (
                        <ActivityGroupBadges groupIds={groupIds} allGroups={allGroups} maxVisible={2} />
                    ) : (
                        <span className="fiori-activity-group-badge fiori-activity-group-badge--add">
                            <Layers className="w-2.5 h-2.5" aria-hidden />
                            <span className="fiori-activity-group-badge-label">Grupos</span>
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                variant="fiori"
                align="end"
                side="bottom"
                sideOffset={6}
                className="fiori-activity-groups-picker-popover"
                onClick={stopCardEvent}
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="fiori-activity-groups-picker-grid" role="listbox" aria-label="Grupos de atividade" aria-multiselectable>
                    {allGroups.map((g) => {
                        const isSelected = selectedIds.includes(g.id);
                        return (
                            <button
                                key={g.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                title={g.description?.trim() ? `${g.name} — ${g.description.trim()}` : g.name}
                                onClick={() => toggleGroup(g.id)}
                                className={cn(
                                    "fiori-activity-group-pick-badge",
                                    isSelected && "fiori-activity-group-pick-badge--selected",
                                )}
                                style={
                                    isSelected
                                        ? ({ "--ag-pick-color": g.color } as React.CSSProperties)
                                        : undefined
                                }
                            >
                                <span
                                    className="fiori-activity-group-badge-swatch"
                                    style={{ backgroundColor: g.color }}
                                    aria-hidden
                                />
                                <span className="fiori-activity-group-pick-badge-label">{g.name}</span>
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}

function CardChargeGroupControl({
    displayLabel,
    selectedGroupId,
    allChargeGroups,
    editable,
    onChange,
}: {
    displayLabel: string;
    selectedGroupId: string | null;
    allChargeGroups: ChargeGroup[];
    editable: boolean;
    onChange: (groupId: string | null) => void;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const sortedGroups = [...allChargeGroups].sort(
        (a, b) =>
            (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
            a.name.localeCompare(b.name, "pt-BR"),
    );

    const selectGroup = (groupId: string | null) => {
        onChange(groupId);
        setPickerOpen(false);
    };

    const metricClassName = cn(
        "fiori-migration-object-card-metric",
        !displayLabel && "opacity-40",
        editable && allChargeGroups.length > 0 && "fiori-migration-object-card-metric--editable",
    );

    const valueContent = (
        <span
            className={cn(
                "fiori-migration-object-card-metric-value",
                editable && allChargeGroups.length > 0 && "fiori-migration-object-card-metric-value--hover-zoom",
            )}
        >
            {displayLabel || "—"}
        </span>
    );

    if (!editable || allChargeGroups.length === 0) {
        return (
            <div className={metricClassName}>
                <span className="fiori-migration-object-card-metric-label">Grupo</span>
                {valueContent}
            </div>
        );
    }

    return (
        <div className={metricClassName}>
            <span className="fiori-migration-object-card-metric-label">Grupo</span>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="fiori-migration-object-card-metric-trigger"
                        onClick={stopCardEvent}
                        onMouseDown={stopCardEvent}
                        aria-label="Alterar grupo de carga"
                    >
                        {valueContent}
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    variant="fiori"
                    align="start"
                    side="bottom"
                    sideOffset={6}
                    className="fiori-charge-group-picker-popover"
                    onClick={stopCardEvent}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="fiori-charge-group-picker-list" role="listbox" aria-label="Grupos de carga">
                        <button
                            type="button"
                            role="option"
                            aria-selected={selectedGroupId === null}
                            onClick={() => selectGroup(null)}
                            className={cn(
                                "fiori-charge-group-pick-row",
                                selectedGroupId === null && "fiori-charge-group-pick-row--selected",
                            )}
                        >
                            <span className="fiori-charge-group-pick-row-id fiori-charge-group-pick-row-id--none">—</span>
                            <span className="fiori-charge-group-pick-row-desc">Sem grupo</span>
                        </button>
                        {sortedGroups.map((group) => {
                            const isSelected = selectedGroupId === group.id;
                            return (
                                <button
                                    key={group.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => selectGroup(isSelected ? null : group.id)}
                                    className={cn(
                                        "fiori-charge-group-pick-row",
                                        isSelected && "fiori-charge-group-pick-row--selected",
                                    )}
                                >
                                    <span className="fiori-charge-group-pick-row-id">{group.name}</span>
                                    <span
                                        className={cn(
                                            "fiori-charge-group-pick-row-desc",
                                            !group.description?.trim() && "fiori-charge-group-pick-row-desc--empty",
                                        )}
                                    >
                                        {group.description?.trim() || "Sem descrição"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export function MigrationObjectCard({
    obj,
    isAdmin,
    isAdminOrMaster,
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
    displayChargeGroup = "",
    onChargeOrderChange,
    onStatusChange,
    onActivityGroupsChange,
    allChargeGroups = [],
    selectedChargeGroupId = null,
    onChargeGroupChange,
}: MigrationObjectCardProps) {
    const chargeOrderLabel = normalizeSeqForDisplay(displayChargeOrder ?? obj.chargeOrder);
    const chargeGroupLabel = displayChargeGroup || "";
    const canEditChargeOrder =
        isAdmin &&
        !isMockLocked &&
        !isVisualReorderMode &&
        !!onChargeOrderChange &&
        obj.status !== "INATIVO";
    const canEditCardMeta =
        (isAdminOrMaster ?? isAdmin) && !isMockLocked && !isVisualReorderMode;
    const canEditChargeGroup =
        isAdminOrMaster === true &&
        !isMockLocked &&
        !isVisualReorderMode &&
        !!onChargeGroupChange;
    const isInUse = usageCount > 0;
    const isInactive = obj.status === "INATIVO";
    /** Excluir do catálogo só aparece para admin com objeto inativo; continua bloqueado se houver uso em mocks/projetos. */
    const showDeleteButton = isAdmin && isInactive;
    const canDelete = showDeleteButton && !isInUse;
    const { chain, isCircular } = precedenceChain;
    const isParallelLoad = isObjectParallelLoad(obj);

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
                    <div className="flex flex-col min-w-0 gap-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="fiori-migration-object-card-name truncate">{obj.name}</span>
                            {catalogDuplicateName && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex shrink-0 cursor-help" tabIndex={0}>
                                            <AlertTriangle className="w-3 h-3 text-amber-500" aria-hidden />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" variant="fiori">
                                        Existe outro objeto mestre com o mesmo nome (outro ID no banco de dados). Compare seq./uso nos mocks e mantenha apenas um registro.
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
                        {obj.description?.trim() ? (
                            <p
                                className="fiori-migration-object-card-desc"
                                title={obj.description.trim()}
                            >
                                {obj.description.trim()}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="fiori-migration-object-card-header-meta">
                    <CardActivityGroupsControl
                        groupIds={obj.activityGroupIds}
                        allGroups={allGroups}
                        editable={canEditCardMeta && !!onActivityGroupsChange}
                        onChange={(ids) => onActivityGroupsChange?.(obj, ids)}
                    />
                    <CardStatusControl
                        status={obj.status}
                        editable={canEditCardMeta && !!onStatusChange}
                        onChange={(nextStatus) => onStatusChange?.(obj, nextStatus)}
                    />
                </div>
            </div>

            {obj.status !== 'INATIVO' && (
                <div className="fiori-migration-object-card-metrics">
                    <CardChargeGroupControl
                        displayLabel={chargeGroupLabel}
                        selectedGroupId={selectedChargeGroupId}
                        allChargeGroups={allChargeGroups}
                        editable={canEditChargeGroup}
                        onChange={(groupId) => onChargeGroupChange?.(obj, groupId)}
                    />

                    <div className="fiori-migration-object-card-metric-divider" role="separator" aria-hidden />

                    <CardChargeOrderMetric
                        displayValue={chargeOrderLabel}
                        editable={canEditChargeOrder}
                        dimmed={chargeOrderLabel === "—"}
                        onCommit={(newOrder) => onChargeOrderChange?.(obj, newOrder)}
                    />

                    <div className="fiori-migration-object-card-metric-divider" role="separator" aria-hidden />

                    <div className="fiori-migration-object-card-metric">
                        <span className="fiori-migration-object-card-metric-label">Tipo Carga</span>
                        <span className="fiori-migration-object-card-metric-value fiori-migration-object-card-metric-value--tipo-carga">
                            {isParallelLoad ? "PARALELO" : "SEQUENCIAL"}
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
                                                isParallelLoad && "fiori-card-toolbar-btn-active"
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
