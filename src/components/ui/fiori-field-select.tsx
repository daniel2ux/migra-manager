"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface FioriFieldSelectOption {
  value: string;
  label: string;
}

/** Mesmo layout do SelectTrigger Fiori em select.tsx */
const FIORI_SELECT_TRIGGER_LAYOUT =
  "relative z-0 flex h-9 w-full min-w-0 items-center justify-between gap-2 disabled:cursor-not-allowed [&>span:not(.fiori-select-status-dot)]:min-w-0 [&>span:not(.fiori-select-status-dot)]:flex-1 [&>span:not(.fiori-select-status-dot)]:truncate [&>span:not(.fiori-select-status-dot)]:text-left [&>svg]:shrink-0";

interface FioriFieldSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly FioriFieldSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
  /** Conteúdo antes do rótulo (ex.: dot de status). */
  triggerPrefix?: React.ReactNode;
  itemClassName?: (option: FioriFieldSelectOption) => string | undefined;
}

/** Select de formulário Fiori via DropdownMenu — evita flash do Radix Select dentro de dialogs. */
export function FioriFieldSelect({
  value,
  onValueChange,
  options,
  disabled = false,
  placeholder = "Selecione",
  triggerClassName,
  contentClassName,
  triggerPrefix,
  itemClassName,
}: FioriFieldSelectProps) {
  const selected = options.find((option) => option.value === value);
  const label = selected?.label ?? placeholder;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            FIORI_SELECT_TRIGGER_LAYOUT,
            "fiori-select-trigger shadow-none",
            disabled && "readable-disabled",
            triggerClassName,
          )}
        >
          {triggerPrefix}
          <span className="pointer-events-none">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-100" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className={cn(
          "fiori-dropdown-menu fiori-dropdown-menu--table-rows min-w-[var(--radix-dropdown-menu-trigger-width)]",
          contentClassName,
        )}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <DropdownMenuItem
              key={option.value}
              className={cn(
                "fiori-dropdown-menu-item",
                itemClassName?.(option),
                isSelected && "fiori-dropdown-menu-item--selected",
              )}
              onSelect={() => onValueChange(option.value)}
            >
              <span className="fiori-type-picker-row-label">{option.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
