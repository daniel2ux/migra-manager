"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

type PopoverContentProps = React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
  variant?: "default" | "fiori"
}

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = "center", sideOffset = 4, variant = "default", ...props }, ref) => {
  const instantOpen = variant === "fiori" || className?.includes("fiori-datetime-popover")

  return (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        /* Acima do Dialog (conteúdo z-[210]) para popovers dentro de modais — antes z-[140] ficava atrás do overlay */
        "z-[220] outline-hidden",
        !instantOpen &&
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        variant === "fiori"
          ? "w-auto rounded-[0.375rem] border border-[#e5e5e5] bg-white p-0 text-[#32363a] shadow-[0_0_0.125rem_0_rgba(85,107,130,0.12),0_0_0.0625rem_0.125rem_rgba(85,107,130,0.16)]"
          : "w-72 rounded-none border bg-popover p-4 text-popover-foreground shadow-md",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
  )
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent }
