"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { FioriDialogLayerContext } from "@/components/ui/fiori-dialog-layer-context"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const selectTriggerDefaultClassName =
  "relative z-0 flex h-9 w-full items-center justify-between rounded-none border border-slate-300 bg-white px-3 py-2 text-xs font-normal ring-offset-background placeholder:text-muted-foreground transition-colors focus:border-SkyBlue-500 focus-visible:border-SkyBlue-500 data-[state=open]:border-SkyBlue-500 focus:bg-white focus:outline-hidden focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none focus:shadow-none focus-visible:shadow-none focus:scale-100 focus-visible:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 [&>span]:line-clamp-1"

const selectTriggerFioriClassName =
  "relative z-0 flex h-9 w-full min-w-0 items-center justify-between gap-2 disabled:cursor-not-allowed [&>span:not(.fiori-select-status-dot)]:min-w-0 [&>span:not(.fiori-select-status-dot)]:flex-1 [&>span:not(.fiori-select-status-dot)]:truncate [&>span:not(.fiori-select-status-dot)]:text-left [&>svg]:shrink-0"

function isFioriSelectTrigger(className?: string) {
  return (
    className?.includes("fiori-page-select-trigger") ||
    className?.includes("fiori-select-trigger")
  )
}

function isFioriSelectContent(className?: string) {
  return className?.includes("fiori-select-content")
}

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      isFioriSelectTrigger(className) ? selectTriggerFioriClassName : selectTriggerDefaultClassName,
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className={cn("h-4 w-4", isFioriSelectTrigger(className) ? "opacity-100" : "opacity-50")} />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position, sideOffset, onCloseAutoFocus, ...props }, ref) => {
  const fioriContent = isFioriSelectContent(className)
  const insideDialog = React.useContext(FioriDialogLayerContext)
  const resolvedPosition =
    position ?? (fioriContent ? (insideDialog ? "popper" : "item-aligned") : "popper")
  const resolvedSideOffset = sideOffset ?? (fioriContent && insideDialog ? 4 : undefined)

  return (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        /* z-[220]: acima do Dialog (z-[210]) para listas dentro de modais */
        "relative z-[220] max-h-96 min-w-32 overflow-hidden",
        !fioriContent &&
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        fioriContent
          ? "rounded-[0.25rem] border border-[#e5e5e5] bg-white p-0 text-[#32363a] shadow-none"
          : "rounded-none border bg-popover text-popover-foreground shadow-md",
        resolvedPosition === "popper" &&
        "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={resolvedPosition}
      sideOffset={resolvedSideOffset}
      onCloseAutoFocus={
        fioriContent
          ? (event) => {
              event.preventDefault()
              onCloseAutoFocus?.(event)
            }
          : onCloseAutoFocus
      }
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          !fioriContent && "p-1",
          fioriContent && "fiori-select-viewport bg-white p-0",
          resolvedPosition === "popper" && !fioriContent &&
          "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)",
          resolvedPosition === "popper" && fioriContent &&
          "w-full min-w-(--radix-select-trigger-width) max-h-60",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1 pl-8 pr-2 text-[11px] font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  const isFiori = className?.includes("fiori-dropdown-menu-item") || className?.includes("fiori-select-item")
  return (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      !isFiori &&
        "relative flex w-full cursor-default select-none items-center rounded-none py-1.5 pl-8 pr-2 text-xs font-normal outline-hidden focus:bg-slate-100 focus:text-slate-900 data-[state=checked]:bg-slate-100 data-[state=checked]:text-slate-900 data-disabled:pointer-events-none data-disabled:opacity-50 transition-colors",
      isFiori &&
        "relative flex w-full min-w-0 cursor-default select-none items-center gap-2 rounded-[0.125rem] outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50",
      className
    )}
    {...props}
  >
    {isFiori ? (
      <>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          <SelectPrimitive.ItemIndicator>
            <Check className="h-4 w-4" />
          </SelectPrimitive.ItemIndicator>
        </span>
        <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">
          {children}
        </SelectPrimitive.ItemText>
      </>
    ) : (
      <>
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <SelectPrimitive.ItemIndicator>
            <Check className="h-4 w-4" />
          </SelectPrimitive.ItemIndicator>
        </span>
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      </>
    )}
  </SelectPrimitive.Item>
)})
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
