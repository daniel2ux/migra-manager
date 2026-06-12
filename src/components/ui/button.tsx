import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-medium border-0 ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-[#374151]",
  {
    variants: {
      variant: {
        default:
          "bg-[#2563eb] text-white [&_svg]:text-white hover:bg-[#1d4ed8] active:bg-[#1e3a8a] disabled:bg-[#e5e7eb] disabled:text-[#9ca3af] disabled:opacity-60 [&_svg]:disabled:text-[#9ca3af]",
        destructive:
          "bg-[#dc2626] text-white [&_svg]:text-white hover:bg-[#b91c1c] active:bg-[#991b1b] disabled:bg-[#e5e7eb] disabled:text-[#9ca3af] disabled:opacity-60 [&_svg]:disabled:text-[#9ca3af]",
        outline:
          "bg-transparent text-[#2563eb] hover:bg-[#2563eb]/10 active:bg-[#2563eb]/20 disabled:text-[#9ca3af] disabled:opacity-60 [&_svg]:disabled:text-[#9ca3af]",
        secondary:
          "bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] active:bg-[#d1d5db] disabled:bg-[#e5e7eb] disabled:text-[#9ca3af] disabled:opacity-60 [&_svg]:disabled:text-[#9ca3af]",
        ghost:
          "bg-transparent text-[#374151] hover:bg-[#f3f4f6] active:bg-[#e5e7eb] disabled:bg-transparent disabled:text-[#9ca3af] disabled:opacity-60 [&_svg]:disabled:text-[#9ca3af]",
        link: "text-[#2563eb] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        xs: "h-8 px-3 text-[10px]",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
        "icon-xs": "h-8 w-8",
        "icon-xxs": "h-7 w-7",
      },
      selected: {
        true: "bg-[#dbeafe] text-[#1e40af]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      selected: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, selected, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, selected, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
