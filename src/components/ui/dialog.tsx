"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

function isFioriFormDialog(className?: string, variant?: "default" | "fiori") {
  if (variant === "fiori") return true
  if (typeof className !== "string") return false
  return className.includes("fiori-dialog") && !className.includes("fiori-dialog-fullscreen")
}

const DIALOG_OVERLAY_MOTION =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"

const DIALOG_CONTENT_MOTION_FIORI =
  "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"

const DIALOG_CONTENT_MOTION_DEFAULT = cn(
  DIALOG_CONTENT_MOTION_FIORI,
  "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
)

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & { motion?: boolean }
>(({ className, motion = true, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      /* Acima do Sheet mobile (`z-[180]`/`z-[181]`), para diálogos abertos dentro do drawer */
      "fixed inset-0 z-[200] fiori-dialog-overlay",
      motion && DIALOG_OVERLAY_MOTION,
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  overlayClassName?: string
  /** Radix omite Overlay quando modal={false}; exige `open` para backdrop manual. */
  manualBackdrop?: boolean
  open?: boolean
  variant?: "default" | "fiori"
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, overlayClassName, manualBackdrop, open, variant = "default", children, ...props }, ref) => {
  const instantOpen = isFioriFormDialog(className, variant)

  return (
  <DialogPortal>
    {manualBackdrop && open ? (
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-[200] fiori-dialog-overlay fiori-dashboard-dialog-overlay",
          !instantOpen && "animate-in fade-in-0 duration-200",
          overlayClassName,
        )}
      />
    ) : (
      !manualBackdrop && (
        <DialogOverlay motion={!instantOpen} className={overlayClassName} />
      )
    )}
    <DialogPrimitive.Content
      ref={ref}
      aria-describedby={props["aria-describedby"] ?? undefined}
      className={cn(
        variant === "fiori"
          ? cn(
              "fixed left-[50%] top-[50%] z-[210] w-full translate-x-[-50%] translate-y-[-50%] outline-none",
              !instantOpen && DIALOG_CONTENT_MOTION_FIORI,
            )
          : cn(
              "fixed left-[50%] top-[50%] z-[210] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
              !instantOpen && DIALOG_CONTENT_MOTION_DEFAULT,
            ),
        className
      )}
      {...props}
    >
      {children}
      {variant === "default" && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
