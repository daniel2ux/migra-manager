"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn("fiori-toast-viewport", className)}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva("fiori-toast", {
  variants: {
    variant: {
      default: "fiori-toast--success",
      destructive: "fiori-toast--error",
      warning: "fiori-toast--warning",
      info: "fiori-toast--info",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function ToastStatusIcon({ variant }: { variant?: VariantProps<typeof toastVariants>["variant"] }) {
  const iconClass = "fiori-toast-glyph"

  if (variant === "destructive") {
    return <AlertCircle className={cn(iconClass, "fiori-toast-glyph--error")} strokeWidth={2} aria-hidden />
  }

  if (variant === "warning") {
    return <AlertTriangle className={cn(iconClass, "fiori-toast-glyph--warning")} strokeWidth={2} aria-hidden />
  }

  if (variant === "info") {
    return <Info className={cn(iconClass, "fiori-toast-glyph--info")} strokeWidth={2} aria-hidden />
  }

  return <CheckCircle2 className={cn(iconClass, "fiori-toast-glyph--success")} strokeWidth={2} aria-hidden />
}

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn("fiori-toast-close", className)}
    toast-close=""
    aria-label="Fechar"
    {...props}
  >
    <X className="h-3.5 w-3.5" strokeWidth={1.75} />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
  VariantProps<typeof toastVariants> & {
    durationLabel?: React.ReactNode
  }
>(({ className, variant, children, durationLabel, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), "group pointer-events-auto data-[swipe=end]:animate-out", className)}
      {...props}
    >
      <div className="fiori-toast-inner">
        <ToastStatusIcon variant={variant} />
        <div className="fiori-toast-body">{children}</div>
        {durationLabel}
        <ToastClose />
      </div>
      <span className="fiori-toast-progress" aria-hidden />
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn("fiori-toast-action", className)}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("fiori-toast-title", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("fiori-toast-description", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
