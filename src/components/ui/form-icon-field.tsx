"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const shellClass =
  "flex min-h-[48px] items-center gap-3 rounded-[10px] border border-[#dcdcdc] bg-white px-3.5 py-2.5 transition-colors focus-within:border-SkyBlue-500";

const innerInputClass =
  "h-auto min-h-0 flex-1 border-0 bg-transparent p-0 text-sm font-normal text-neutral-900 shadow-none focus:shadow-none focus-visible:shadow-none placeholder:text-neutral-400 focus:scale-100 focus:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm disabled:cursor-not-allowed disabled:opacity-50";

export type FormIconFieldProps = Omit<React.ComponentProps<typeof Input>, "className"> & {
  label: React.ReactNode;
  icon?: LucideIcon;
  endAdornment?: React.ReactNode;
  /** Classes no wrapper externo (`space-y-2`) */
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
};

export function FormIconField({
  label,
  icon: Icon,
  endAdornment,
  className,
  inputClassName,
  labelClassName,
  id,
  disabled,
  ...inputProps
}: FormIconFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={id}
        className={cn("block text-sm font-normal text-[#666666]", labelClassName)}
      >
        {label}
      </label>
      <div className={shellClass}>
        {Icon ? (
          <Icon
            strokeWidth={1.5}
            className="pointer-events-none size-[18px] shrink-0 text-[#555555]"
            aria-hidden
          />
        ) : null}
        <Input
          id={id}
          disabled={disabled}
          className={cn(innerInputClass, inputClassName)}
          {...inputProps}
        />
        {endAdornment}
      </div>
    </div>
  );
}
