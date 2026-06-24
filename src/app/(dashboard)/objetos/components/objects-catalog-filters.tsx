"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Activity,
  Box,
  ChevronDown,
  Filter,
  GitBranch,
  Layers,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FioriFieldSelect } from "@/components/ui/fiori-field-select";
import { MASTER_OBJECT_TYPE_OPTIONS } from "@/lib/migration/master-object-type";
import type { ActivityGroup } from "@/types/activity-group";
import type { ChargeGroup } from "@/types/charge-group";

const TOOLBAR_BTN_ICON =
  "fiori-toolbar-btn !rounded-[0.375rem] !size-8 min-h-0 min-w-0";

export type CatalogLoadTypeFilter = "ALL" | "PARALLEL" | "SEQUENTIAL";

export interface CatalogFilterValues {
  typeFilter: string;
  loadTypeFilter: CatalogLoadTypeFilter;
  chargeGroupFilter: string;
  activityGroupFilter: string;
}

function countActiveCatalogFilters(values: CatalogFilterValues): number {
  return (
    (values.typeFilter !== "ALL" ? 1 : 0) +
    (values.loadTypeFilter !== "ALL" ? 1 : 0) +
    (values.chargeGroupFilter !== "ALL" ? 1 : 0) +
    (values.activityGroupFilter !== "ALL" ? 1 : 0)
  );
}

const LOAD_TYPE_CHIPS: { value: CatalogLoadTypeFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "SEQUENTIAL", label: "Sequencial" },
  { value: "PARALLEL", label: "Paralelo" },
];

function FilterSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="fiori-filter-popover-section">
      <div className="fiori-filter-popover-section-title">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

function FilterActivityGroupSelect({
  value,
  onValueChange,
  groups,
}: {
  value: string;
  onValueChange: (value: string) => void;
  groups: ActivityGroup[];
}) {
  const selectedLabel = useMemo(() => {
    if (value === "ALL") return "Todos os grupos";
    if (value === "NONE") return "Sem grupo";
    return groups.find((g) => g.id === value)?.name ?? "Selecione";
  }, [value, groups]);

  const selectedColor =
    value !== "ALL" && value !== "NONE"
      ? groups.find((g) => g.id === value)?.color
      : undefined;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="fiori-select-trigger shadow-none">
          <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">
            {selectedColor ? (
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: selectedColor }}
              />
            ) : null}
            <span className="truncate">{selectedLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-100" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="fiori-dropdown-menu fiori-dropdown-menu--table-rows fiori-filter-field-dropdown min-w-[var(--radix-dropdown-menu-trigger-width)]"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {[
          { id: "ALL", name: "Todos os grupos", color: null },
          { id: "NONE", name: "Sem grupo", color: null },
          ...groups.map((g) => ({ id: g.id, name: g.name, color: g.color })),
        ].map((option) => {
          const isSelected = value === option.id;
          return (
            <DropdownMenuItem
              key={option.id}
              className={cn(
                "fiori-dropdown-menu-item",
                isSelected && "fiori-dropdown-menu-item--selected",
              )}
              onSelect={() => onValueChange(option.id)}
            >
              {option.color ? (
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: option.color }}
                />
              ) : (
                <span className="h-2 w-2 shrink-0 rounded-sm bg-[#d9d9d9]" />
              )}
              <span className="fiori-type-picker-row-label">{option.name}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CatalogFilterPanelProps {
  values: CatalogFilterValues;
  onApply: (values: CatalogFilterValues) => void;
  onClearAll: () => void;
  onClose: () => void;
  activeFiltersCount: number;
  activityGroups: ActivityGroup[];
  chargeGroups: ChargeGroup[];
  open: boolean;
}

function CatalogFilterPanel({
  values,
  onApply,
  onClearAll,
  onClose,
  activeFiltersCount,
  activityGroups,
  chargeGroups,
  open,
}: CatalogFilterPanelProps) {
  const [draft, setDraft] = useState<CatalogFilterValues>(values);

  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  const updateDraft = <K extends keyof CatalogFilterValues>(
    key: K,
    value: CatalogFilterValues[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const typeOptions = useMemo(
    () => [
      { value: "ALL", label: "Todos os tipos" },
      ...MASTER_OBJECT_TYPE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    ],
    [],
  );

  const chargeGroupOptions = useMemo(
    () => [
      { value: "ALL", label: "Todos os grupos" },
      { value: "NONE", label: "Sem grupo" },
      ...chargeGroups.map((group) => ({
        value: group.id,
        label: group.name,
      })),
    ],
    [chargeGroups],
  );

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

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
        Filtros do catálogo
        {activeFiltersCount > 0 && (
          <button
            type="button"
            className="fiori-filter-popover-clear ml-auto"
            onClick={onClearAll}
          >
            Limpar tudo
          </button>
        )}
      </div>

      <FilterSection title="Tipo" icon={Box}>
        <FioriFieldSelect
          value={draft.typeFilter}
          onValueChange={(value) => updateDraft("typeFilter", value)}
          options={typeOptions}
          placeholder="Todos os tipos"
          contentClassName="fiori-filter-field-dropdown max-h-56"
        />
      </FilterSection>

      <FilterSection title="Tipo de carga" icon={GitBranch}>
        <div className="fiori-filter-chip-grid fiori-filter-chip-grid--3">
          {LOAD_TYPE_CHIPS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={cn(
                "fiori-chip",
                draft.loadTypeFilter === value && "fiori-chip-selected",
              )}
              onClick={() => updateDraft("loadTypeFilter", value)}
            >
              {label}
            </button>
          ))}
        </div>
      </FilterSection>

      {chargeGroups.length > 0 && (
        <FilterSection title="Grupo de objeto" icon={Layers}>
          <FioriFieldSelect
            value={draft.chargeGroupFilter}
            onValueChange={(value) => updateDraft("chargeGroupFilter", value)}
            options={chargeGroupOptions}
            placeholder="Todos os grupos"
            contentClassName="fiori-filter-field-dropdown max-h-56"
          />
        </FilterSection>
      )}

      {activityGroups.length > 0 && (
        <FilterSection title="Grupo de atividade" icon={Activity}>
          <FilterActivityGroupSelect
            value={draft.activityGroupFilter}
            onValueChange={(value) => updateDraft("activityGroupFilter", value)}
            groups={activityGroups}
          />
        </FilterSection>
      )}

      <button type="submit" className="fiori-filter-popover-submit">
        Aplicar filtros
      </button>
    </form>
  );
}

interface ObjectsCatalogFiltersProps {
  values: CatalogFilterValues;
  onChange: (values: CatalogFilterValues) => void;
  onClearAll: () => void;
  activityGroups: ActivityGroup[];
  chargeGroups: ChargeGroup[];
  trigger?: ReactNode;
}

export function ObjectsCatalogFilters({
  values,
  onChange,
  onClearAll,
  activityGroups,
  chargeGroups,
  trigger,
}: ObjectsCatalogFiltersProps) {
  const [open, setOpen] = useState(false);
  const activeFiltersCount = countActiveCatalogFilters(values);

  const handleClearAll = () => {
    onClearAll();
    setOpen(false);
  };

  const defaultTriggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        TOOLBAR_BTN_ICON,
        activeFiltersCount > 0 && "fiori-toolbar-btn-active",
      )}
      aria-label="Filtros do catálogo"
    >
      <Filter className="w-4 h-4" />
      {activeFiltersCount > 0 && !open && (
        <span className="fiori-toolbar-dot" />
      )}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>{trigger ?? defaultTriggerButton}</PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" variant="fiori">
          Filtros do catálogo
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        variant="fiori"
        className="fiori-filter-popover fiori-filter-popover--catalog z-[100]"
        align="end"
        sideOffset={6}
      >
        <CatalogFilterPanel
          values={values}
          onApply={onChange}
          onClearAll={handleClearAll}
          onClose={() => setOpen(false)}
          activeFiltersCount={activeFiltersCount}
          activityGroups={activityGroups}
          chargeGroups={chargeGroups}
          open={open}
        />
      </PopoverContent>
    </Popover>
  );
}
