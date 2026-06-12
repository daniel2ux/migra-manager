import * as React from "react"

import { cn } from "@/lib/utils"

/** Mesmo padrão visual do Input (formulário de projeto). */
const textareaDefaultClassName =
  "relative z-0 flex min-h-[80px] w-full rounded-none border border-slate-300 bg-white px-3 py-2 text-xs font-normal ring-offset-background placeholder:text-muted-foreground transition-colors focus:border-SkyBlue-500 focus-visible:border-SkyBlue-500 focus:bg-white focus-visible:outline-hidden focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none focus:shadow-none focus-visible:shadow-none focus:scale-100 focus-visible:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 md:text-xs"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaDefaultClassName, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
