"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={5000} swipeDirection="right">
      {toasts.map(({ id, title, description, action, ...props }) => {
        const hasTitle = Boolean(title)
        const hasDescription = Boolean(description)

        return (
          <Toast key={id} {...props}>
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
