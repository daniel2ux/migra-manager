"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Project, Mock } from "@/types/migration";
import { Settings2, Check, ChevronDown } from "lucide-react";

interface PagePickerOption {
    id: string;
    label: string;
}

function PagePicker({
    value,
    onChange,
    disabled,
    placeholder,
    options,
    triggerClassName,
    menuLabel,
}: {
    value: string;
    onChange: (id: string) => void;
    disabled?: boolean;
    placeholder: string;
    options: PagePickerOption[];
    triggerClassName?: string;
    menuLabel?: string;
}) {
    const selectedLabel = options.find((o) => o.id === value)?.label ?? placeholder;
    const menuItemClass = "fiori-dropdown-menu-item text-sm font-normal";
    const menuLabelClass =
        "text-xs font-semibold text-[var(--fiori-label,#6a6d70)] normal-case tracking-normal";

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <button
                    type="button"
                    className={cn(
                        "fiori-page-select-trigger relative z-0 flex w-full min-w-0 items-center gap-1.5 shadow-none disabled:cursor-not-allowed [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left [&>svg]:shrink-0",
                        triggerClassName,
                    )}
                >
                    <span>{selectedLabel}</span>
                    <ChevronDown className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={4}
                className="fiori-dropdown-menu min-w-[13.75rem]"
                onCloseAutoFocus={(event) => event.preventDefault()}
            >
                {menuLabel && (
                    <DropdownMenuLabel className={menuLabelClass}>{menuLabel}</DropdownMenuLabel>
                )}
                {options.map((opt) => (
                    <DropdownMenuItem
                        key={opt.id}
                        onSelect={() => {
                            if (opt.id !== value) onChange(opt.id);
                        }}
                        className={cn(
                            menuItemClass,
                            value === opt.id && "fiori-dropdown-menu-item--selected",
                        )}
                    >
                        <span className="flex-1">{opt.label}</span>
                        {value === opt.id && <Check className="w-3.5 h-3.5" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

interface DashboardSelectorsProps {
    projects: Project[] | undefined;
    allMocks: Mock[] | undefined;
    selectedProjectId: string;
    selectedMockId: string;
    onProjectChange: (id: string) => void;
    onMockChange: (id: string) => void;
    /** Quando verdadeiro, o projeto exibido é só leitura (troca em Projetos / contexto global). */
    projectSelectorReadOnly?: boolean;
    showIndicators: boolean;
    setShowIndicators: (val: boolean) => void;
    isComparisonVisible: boolean;
    setIsComparisonVisible: (val: boolean) => void;
}

export function DashboardSelectors({
    projects,
    allMocks,
    selectedProjectId,
    selectedMockId,
    onProjectChange,
    onMockChange,
    projectSelectorReadOnly = false,
    showIndicators,
    setShowIndicators,
    isComparisonVisible,
    setIsComparisonVisible,
}: DashboardSelectorsProps) {
    const mocksInProject = allMocks?.filter(m => selectedProjectId === "all" || m.projectId === selectedProjectId) || [];
    const menuItemClass = "fiori-dropdown-menu-item text-sm font-normal";
    const menuLabelClass =
        "text-xs font-semibold text-[var(--fiori-label,#6a6d70)] normal-case tracking-normal";

    const fioriToggle = (label: string, value: boolean, onChange: (next: boolean) => void, id: string) => (
        <div className="fiori-lock-row">
            <div>
                <Label htmlFor={id} className="fiori-field-label">
                    {label}
                </Label>
            </div>
            <Switch
                id={id}
                checked={value}
                onCheckedChange={onChange}
                className="fiori-switch"
            />
        </div>
    );

    return (
        <div className="flex max-w-full flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div className="lg:hidden">
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="fiori-toolbar-btn !size-8 min-h-0 min-w-0 !rounded-[0.375rem]"
                        >
                            <Settings2 className="w-3.5 h-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="fiori-dropdown-menu min-w-[16rem]">
                        <DropdownMenuLabel className={menuLabelClass}>Projeto</DropdownMenuLabel>
                        <DropdownMenuItem
                            onSelect={() => onProjectChange("all")}
                            disabled={projectSelectorReadOnly}
                            className={menuItemClass}
                        >
                            <span className="flex-1">Todos os projetos</span>
                            {selectedProjectId === "all" && <Check className="w-3.5 h-3.5" />}
                        </DropdownMenuItem>
                        {projects?.map((p) => (
                            <DropdownMenuItem
                                key={p.id}
                                onSelect={() => onProjectChange(p.id)}
                                disabled={projectSelectorReadOnly}
                                className={menuItemClass}
                            >
                                <span className="flex-1">{p.name}</span>
                                {selectedProjectId === p.id && <Check className="w-3.5 h-3.5" />}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className={menuLabelClass}>Mock</DropdownMenuLabel>
                        {mocksInProject.map((m) => (
                            <DropdownMenuItem
                                key={m.id}
                                onSelect={() => onMockChange(m.id)}
                                disabled={selectedProjectId === "all"}
                                className={menuItemClass}
                            >
                                <span className="flex-1">{m.name}</span>
                                {selectedMockId === m.id && <Check className="w-3.5 h-3.5" />}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={() => setShowIndicators(!showIndicators)}
                            className={menuItemClass}
                        >
                            <span className="flex-1">Resultados</span>
                            {showIndicators && <Check className="w-3.5 h-3.5" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() => setIsComparisonVisible(!isComparisonVisible)}
                            className={menuItemClass}
                        >
                            <span className="flex-1">Comparativa</span>
                            {isComparisonVisible && <Check className="w-3.5 h-3.5" />}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="hidden lg:flex items-center gap-2">
                {!projectSelectorReadOnly && (
                    <PagePicker
                        value={selectedProjectId}
                        onChange={onProjectChange}
                        placeholder="Projeto"
                        options={[
                            { id: "all", label: "Todos os projetos" },
                            ...(projects?.map((p) => ({ id: p.id, label: p.name })) ?? []),
                        ]}
                    />
                )}

                <PagePicker
                    value={selectedMockId}
                    onChange={onMockChange}
                    disabled={selectedProjectId === "all"}
                    placeholder="Selecionar mock"
                    menuLabel="Mock"
                    options={mocksInProject.map((m) => ({ id: m.id, label: m.name }))}
                />
            </div>

            <div className="hidden lg:flex w-full lg:w-auto items-center justify-end gap-2 lg:gap-3 px-1">
                <div className="fiori-page-header-divider" />
                {fioriToggle("Resultados", showIndicators, setShowIndicators, "show-indicators")}
                {fioriToggle("Comparativa", isComparisonVisible, setIsComparisonVisible, "show-comparison")}
            </div>
        </div>
    );
}
