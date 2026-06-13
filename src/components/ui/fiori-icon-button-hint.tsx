"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type FioriIconButtonHintProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  hint: string;
  side?: "top" | "bottom" | "left" | "right";
  contentClassName?: string;
};

function wrapDisabledTrigger(node: React.ReactElement, disabled?: boolean) {
  if (!disabled) return node;
  return <span className="inline-flex">{node}</span>;
}

export const FioriIconButtonHint = React.forwardRef<HTMLButtonElement, FioriIconButtonHintProps>(
  function FioriIconButtonHint(
    {
      hint,
      side = "top",
      className,
      children,
      disabled,
      contentClassName,
      type = "button",
      ...props
    },
    ref,
  ) {
    const trigger = (
      <button
        ref={ref}
        type={type}
        className={cn(className)}
        aria-label={hint}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {disabled ? <span className="inline-flex">{trigger}</span> : trigger}
        </TooltipTrigger>
        <TooltipContent side={side} variant="fiori" className={contentClassName}>
          {hint}
        </TooltipContent>
      </Tooltip>
    );
  },
);

/** Tooltip Fiori em botão-ícone usado como `PopoverTrigger` (calendário, etc.). */
export function FioriPopoverIconButtonHint({
  hint,
  side = "top",
  className,
  children,
  disabled,
  contentClassName,
  type = "button",
  ...props
}: FioriIconButtonHintProps) {
  const button = (
    <button
      type={type}
      className={cn(className)}
      aria-label={hint}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <PopoverTrigger asChild>
          {wrapDisabledTrigger(button, disabled)}
        </PopoverTrigger>
      </TooltipTrigger>
      <TooltipContent side={side} variant="fiori" className={contentClassName}>
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}
