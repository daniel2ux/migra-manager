"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    /** `fiori`: hint compacto escuro (padrão SAP). `fiori-panel`: painel claro para conteúdo rico. */
    variant?: "fiori" | "fiori-panel" | "legacy";
};

const TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    TooltipContentProps
>(({ className, sideOffset = 4, variant = "fiori", children, ...props }, ref) => (
    <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                /* z-[80]: acima do page header (z-[60]) e da topbar (z-[70]) */
                "z-[80] overflow-hidden max-w-[320px] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                variant === "fiori-panel"
                    ? "fiori-tooltip-panel p-0 text-xs font-normal tracking-normal"
                    : variant === "legacy"
                      ? "rounded-none bg-white border border-black px-2.5 py-1.5 text-[10px] font-black tracking-widest text-slate-900 shadow-xl"
                      : "fiori-tooltip rounded-[0.25rem] bg-[#32363a] px-2.5 py-1.5 text-xs font-normal tracking-normal text-white shadow-[0_0_0.125rem_0_rgba(85,107,130,0.16),0_0_0.0625rem_0.125rem_0_rgba(85,107,130,0.16)] border-0",
                className,
            )}
            {...props}
        >
            {children}
            <TooltipPrimitive.Arrow
                className={cn(
                    variant === "fiori-panel"
                        ? "fill-[#f7f9fa] stroke-none"
                        : variant === "legacy"
                          ? "fill-white stroke-black"
                          : "fill-[#32363a] stroke-none",
                )}
                strokeWidth={variant === "legacy" ? 1 : 0}
            />
        </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
