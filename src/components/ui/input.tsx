import * as React from "react"

import { cn } from "@/lib/utils"

/** Padrão alinhado ao diálogo de projeto: borda visível, fundo branco, sem sombra/anel no foco, borda SkyBlue ao focar. */
const inputDefaultClassName =
  "relative z-0 flex h-9 w-full rounded-none border border-slate-300 bg-white px-3 py-2 text-xs font-normal ring-offset-background placeholder:text-muted-foreground transition-colors focus:border-SkyBlue-500 focus-visible:border-SkyBlue-500 focus:bg-white focus-visible:outline-hidden focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none focus:shadow-none focus-visible:shadow-none focus:scale-100 focus-visible:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 md:text-xs"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, step, ...props }, ref) => {
    // Para tipos de tempo, forçamos o step="1" como padrão para habilitar segundos
    const isTimeInput = type === "datetime-local" || type === "time";
    const defaultStep = isTimeInput ? "1" : undefined;

    return (
      <input
        type={type}
        step={step ?? defaultStep}
        className={cn(inputDefaultClassName, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
