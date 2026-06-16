"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Activity, Filter, Table2, BarChart2, MoreHorizontal, Search, X } from "lucide-react";
import type { ActivityGroup } from "@/types/activity-group";

const TOOLBAR_BTN = "fiori-toolbar-btn fiori-toolbar-btn--labeled !rounded-[0.375rem] !h-8 min-h-0 !w-auto !px-2.5";
const TOOLBAR_BTN_ICON = "fiori-toolbar-btn !rounded-[0.375rem] !size-8 min-h-0 min-w-0";

interface DashboardFiltersProps {
    isPerformanceVisible: boolean;
    setIsPerformanceVisible: (v: boolean) => void;
    objectSearchTerm: string;
    setObjectSearchTerm: (v: string) => void;
    performanceStatusFilter: "all" | "success" | "error" | "inProgress";
    setPerformanceStatusFilter: (v: "all" | "success" | "error" | "inProgress") => void;
    inProgressOnly: boolean;
    setInProgressOnly: (v: boolean) => void;
    chargePercentOp: ">=" | "<=" | "=" | ">" | "<";
    setChargePercentOp: (v: ">=" | "<=" | "=" | ">" | "<") => void;
    chargePercentValue: string;
    setChargePercentValue: (v: string) => void;
    dashboardGroupFilter: string;
    setDashboardGroupFilter: (v: string) => void;
    activityGroups: ActivityGroup[];
    objectCount: number;
    onOpenReport: () => void;
    onOpenStatReport: () => void;
}

interface FilterValues {
    objectSearchTerm: string;
    performanceStatusFilter: "all" | "success" | "error" | "inProgress";
    inProgressOnly: boolean;
    chargePercentOp: ">=" | "<=" | "=" | ">" | "<";
    chargePercentValue: string;
    dashboardGroupFilter: string;
}

interface FilterPanelProps {
    values: FilterValues;
    onApply: (values: FilterValues) => void;
    onClearAll: () => void;
    onClose: () => void;
    activeFiltersCount: number;
    activityGroups: ActivityGroup[];
    open: boolean;
}

function DashboardFilterPanel({
    values,
    onApply,
    onClearAll,
    onClose,
    activeFiltersCount,
    activityGroups,
    open,
}: FilterPanelProps) {
    const [draft, setDraft] = useState<FilterValues>(values);

    useEffect(() => {
        if (open) setDraft(values);
    }, [open, values]);

    const updateDraft = <K extends keyof FilterValues>(key: K, value: FilterValues[K]) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const handleApply = () => {
        onApply({
            ...draft,
            objectSearchTerm: values.objectSearchTerm,
        });
        onClose();
    };

    const handleClearAll = () => {
        onClearAll();
    };

    const statusOptions = [
        { value: "all" as const, label: "Todos", chipClass: "" },
        { value: "success" as const, label: "Sucesso", chipClass: "fiori-chip--success" },
        { value: "error" as const, label: "Com erro", chipClass: "fiori-chip--critical" },
        { value: "inProgress" as const, label: "Em curso", chipClass: "fiori-chip--warning" },
    ];

    return (
        <form
            className="fiori-filter-popover-form"
            onSubmit={(e) => {
                e.preventDefault();
                handleApply();
            }}
        >
            <div className="fiori-filter-popover-title">
                <Filter className="w-3.5 h-3.5" />
                Filtros de performance
                {activeFiltersCount > 0 && (
                    <button
                        type="button"
                        className="fiori-filter-popover-clear ml-auto"
                        onClick={handleClearAll}
                    >
                        Limpar tudo
                    </button>
                )}
            </div>

            <div className="fiori-filter-popover-section">
                <div className="fiori-filter-popover-section-title">
                    <BarChart2 className="w-3.5 h-3.5" />
                    Status da carga
                </div>
                <div className="fiori-filter-chip-grid">
                    {statusOptions.map(({ value, label, chipClass }) => (
                        <button
                            key={value}
                            type="button"
                            className={cn(
                                "fiori-chip",
                                chipClass,
                                draft.performanceStatusFilter === value && "fiori-chip-selected"
                            )}
                            onClick={() => updateDraft("performanceStatusFilter", value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="fiori-filter-popover-section">
                <div className="fiori-filter-popover-row">
                    <span className="fiori-filter-popover-row-label">Somente em andamento</span>
                    <Switch
                        checked={draft.inProgressOnly}
                        onCheckedChange={(checked) => updateDraft("inProgressOnly", checked)}
                        className="fiori-switch"
                    />
                </div>
            </div>

            <div className="fiori-filter-popover-section">
                <div className="fiori-filter-popover-section-title">Percentual de carga</div>
                <div className="fiori-percent-row">
                    <Select
                        value={draft.chargePercentOp}
                        onValueChange={(v) => updateDraft("chargePercentOp", v as FilterValues["chargePercentOp"])}
                    >
                        <SelectTrigger className="fiori-select-trigger shadow-none">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="fiori-select-content">
                            <SelectItem value=">=" className="fiori-select-item">≥</SelectItem>
                            <SelectItem value="<=" className="fiori-select-item">≤</SelectItem>
                            <SelectItem value="=" className="fiori-select-item">=</SelectItem>
                            <SelectItem value=">" className="fiori-select-item">&gt;</SelectItem>
                            <SelectItem value="<" className="fiori-select-item">&lt;</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        type="number"
                        placeholder="0 – 100"
                        value={draft.chargePercentValue}
                        onChange={(e) => updateDraft("chargePercentValue", e.target.value)}
                        className="fiori-input shadow-none"
                    />
                </div>
                {draft.chargePercentValue && (
                    <button
                        type="button"
                        className="fiori-filter-popover-clear mt-2"
                        onClick={() => {
                            updateDraft("chargePercentValue", "");
                            updateDraft("chargePercentOp", ">=");
                        }}
                    >
                        Limpar percentual
                    </button>
                )}
            </div>

            {activityGroups.length > 0 && (
                <div className="fiori-filter-popover-section">
                    <div className="fiori-filter-popover-section-title">Grupo de atividade</div>
                    <Select
                        value={draft.dashboardGroupFilter}
                        onValueChange={(value) => updateDraft("dashboardGroupFilter", value)}
                    >
                        <SelectTrigger className="fiori-select-trigger shadow-none">
                            <SelectValue placeholder="Todos os grupos" />
                        </SelectTrigger>
                        <SelectContent className="fiori-select-content">
                            <SelectItem value="all" className="fiori-select-item">Todos os grupos</SelectItem>
                            {activityGroups.map((g) => (
                                <SelectItem key={g.id} value={g.id} className="fiori-select-item">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: g.color }} />
                                        {g.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <button type="submit" className="fiori-filter-popover-submit">
                Pesquisar
            </button>
        </form>
    );
}

export function DashboardFilters({
    isPerformanceVisible,
    setIsPerformanceVisible,
    objectSearchTerm,
    setObjectSearchTerm,
    performanceStatusFilter,
    setPerformanceStatusFilter,
    inProgressOnly,
    setInProgressOnly,
    chargePercentOp,
    setChargePercentOp,
    chargePercentValue,
    setChargePercentValue,
    dashboardGroupFilter,
    setDashboardGroupFilter,
    activityGroups,
    objectCount,
    onOpenReport,
    onOpenStatReport
}: DashboardFiltersProps) {
    const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isSearchOpen) return;
        const frame = requestAnimationFrame(() => {
            searchInputRef.current?.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(frame);
    }, [isSearchOpen]);

    const appliedFilters: FilterValues = {
        objectSearchTerm,
        performanceStatusFilter,
        inProgressOnly,
        chargePercentOp,
        chargePercentValue,
        dashboardGroupFilter,
    };

    const activeFiltersCount = (objectSearchTerm !== "" ? 1 : 0) +
        (performanceStatusFilter !== "all" ? 1 : 0) +
        (inProgressOnly ? 1 : 0) +
        (chargePercentValue !== "" ? 1 : 0) +
        (dashboardGroupFilter !== "all" ? 1 : 0);

    const advancedFiltersCount = activeFiltersCount - (objectSearchTerm !== "" ? 1 : 0);

    const handleApplyFilters = (values: FilterValues) => {
        setObjectSearchTerm(values.objectSearchTerm);
        setPerformanceStatusFilter(values.performanceStatusFilter);
        setInProgressOnly(values.inProgressOnly);
        setChargePercentOp(values.chargePercentOp);
        setChargePercentValue(values.chargePercentValue);
        setDashboardGroupFilter(values.dashboardGroupFilter);
    };

    const handleClearAll = () => {
        setObjectSearchTerm("");
        setPerformanceStatusFilter("all");
        setInProgressOnly(false);
        setChargePercentValue("");
        setChargePercentOp(">=");
        setDashboardGroupFilter("all");
        setFilterPopoverOpen(false);
        setIsSearchOpen(false);
    };

    const filterPanelProps: FilterPanelProps = {
        values: appliedFilters,
        onApply: handleApplyFilters,
        onClearAll: handleClearAll,
        onClose: () => setFilterPopoverOpen(false),
        activeFiltersCount,
        activityGroups,
        open: filterPopoverOpen,
    };

    const filterPopover = (trigger: ReactNode) => (
        <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
            {trigger}
            <PopoverContent className="fiori-filter-popover z-[100]" align="end">
                <DashboardFilterPanel {...filterPanelProps} />
            </PopoverContent>
        </Popover>
    );

    return (
        <>
            <div className="h-12 shrink-0" />
            <div
                className="fiori-subtoolbar fiori-subtoolbar--below-page-header fixed left-0 right-0 z-[55] px-4 md:px-8"
            >
                <div className="flex items-center justify-between h-12">
                    <button
                        type="button"
                        onClick={() => setIsPerformanceVisible(!isPerformanceVisible)}
                        className={cn(
                            "fiori-subtoolbar-toggle",
                            isPerformanceVisible && "fiori-subtoolbar-toggle--active"
                        )}
                    >
                        <Activity className="w-4 h-4 shrink-0" />
                        Performance por objeto
                        <span
                            className="fiori-subtoolbar-count-badge"
                            aria-label={`${objectCount} objeto${objectCount === 1 ? "" : "s"}`}
                        >
                            {objectCount > 99 ? "99+" : objectCount}
                        </span>
                    </button>

                    <div className="hidden lg:flex items-center gap-1 ml-auto">
                            <div className="fiori-toolbar">
                                <div className={cn("fiori-toolbar-search", isSearchOpen && "fiori-toolbar-search--open")}>
                                    <div className="fiori-search-shell">
                                        <Search className="fiori-search-icon" aria-hidden />
                                        <input
                                            ref={searchInputRef}
                                            type="search"
                                            placeholder="Pesquisar objetos..."
                                            value={objectSearchTerm}
                                            onChange={(e) => setObjectSearchTerm(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") setIsSearchOpen(false);
                                            }}
                                            className="fiori-search-input"
                                            aria-label="Pesquisar objetos"
                                        />
                                        {objectSearchTerm && (
                                            <button
                                                type="button"
                                                className="fiori-search-clear"
                                                onClick={() => setObjectSearchTerm("")}
                                                aria-label="Limpar busca"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                                    className={cn(
                                        TOOLBAR_BTN_ICON,
                                        (isSearchOpen || objectSearchTerm) && "fiori-toolbar-btn-active",
                                    )}
                                    aria-label={isSearchOpen ? "Fechar busca" : "Pesquisar objetos"}
                                >
                                    <Search className="w-4 h-4" />
                                </Button>

                                {filterPopover(
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                TOOLBAR_BTN_ICON,
                                                advancedFiltersCount > 0 && "fiori-toolbar-btn-active",
                                            )}
                                            aria-label="Filtros avançados"
                                        >
                                            <Filter className="w-4 h-4" />
                                            {advancedFiltersCount > 0 && !filterPopoverOpen && (
                                                <span className="fiori-toolbar-dot" />
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                )}

                                <Button
                                    variant="ghost"
                                    onClick={onOpenReport}
                                    className={TOOLBAR_BTN}
                                >
                                    <Table2 className="w-4 h-4 shrink-0" />
                                    <span>Relatório</span>
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={onOpenStatReport}
                                    className={TOOLBAR_BTN}
                                >
                                    <BarChart2 className="w-4 h-4 shrink-0" />
                                    <span>Estatística</span>
                                </Button>
                            </div>
                        </div>

                        <div className="lg:hidden ml-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className={TOOLBAR_BTN_ICON}>
                                        <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 rounded-sm border-[#e5e5e5] font-[family-name:var(--font-72)]">
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0 focus:bg-transparent">
                                        {filterPopover(
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "flex w-full items-center gap-2 px-2 py-2 text-sm font-normal text-[#32363a]",
                                                        activeFiltersCount > 0 && "text-[#0070f2]"
                                                    )}
                                                >
                                                    <Filter className="w-4 h-4" />
                                                    Filtros
                                                    {activeFiltersCount > 0 && (
                                                        <span className="ml-auto text-xs font-semibold text-[#0070f2]">
                                                            {activeFiltersCount}
                                                        </span>
                                                    )}
                                                </button>
                                            </PopoverTrigger>
                                        )}
                                    </DropdownMenuItem>
                                    {activeFiltersCount > 0 && (
                                        <DropdownMenuItem
                                            onClick={handleClearAll}
                                            className="text-sm font-normal text-[#bb0000] focus:text-[#bb0000]"
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Limpar filtros
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={onOpenReport} className="text-sm font-normal text-[#32363a]">
                                        <Table2 className="w-4 h-4 mr-2" />
                                        Relatório
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onOpenStatReport} className="text-sm font-normal text-[#32363a]">
                                        <BarChart2 className="w-4 h-4 mr-2" />
                                        Estatística
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                </div>
            </div>
        </>
    );
}
