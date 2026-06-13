"use client"

import * as React from "react"
import { useToast, TOAST_DURATION_MS } from "@/hooks/use-toast"
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

function ToastDurationLabel({ durationMs }: { durationMs: number }) {
  const totalSeconds = Math.max(1, Math.ceil(durationMs / 1000))
  const [remaining, setRemaining] = React.useState(totalSeconds)

  React.useEffect(() => {
    setRemaining(totalSeconds)
    const interval = window.setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [totalSeconds, durationMs])

  if (remaining <= 0) return null

  return (
    <span className="fiori-toast-duration" aria-hidden>
      {remaining}s
    </span>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="right" duration={TOAST_DURATION_MS}>
      {toasts.map(({ id, title, description, action, duration, ...props }) => {
        const hasTitle = Boolean(title)
        const hasDescription = Boolean(description)
        const toastDuration = duration ?? TOAST_DURATION_MS

        return (
          <Toast
            key={id}
            duration={toastDuration}
            durationLabel={<ToastDurationLabel durationMs={toastDuration} />}
            style={{ "--fiori-toast-duration": `${toastDuration}ms` } as React.CSSProperties}
            {...props}
          >
            {hasTitle && <ToastTitle>{title}</ToastTitle>}
            {hasDescription && (
              hasTitle ? (
                <ToastDescription>{description}</ToastDescription>
              ) : (
                <p className="fiori-toast-message">{description}</p>
              )
            )}
            {action}
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
