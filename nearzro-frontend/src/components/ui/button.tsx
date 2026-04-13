import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-black via-neutral-900 to-black text-white hover:from-silver-300 hover:via-silver-400 hover:to-silver-300 hover:text-black border border-neutral-700/30 hover:border-silver-400 active:bg-black active:text-white",
        destructive:
          "bg-gradient-to-r from-red-700 to-red-800 text-white hover:from-red-600 hover:to-red-700 border border-red-600/30 active:bg-red-800 active:text-white",
        outline:
          "border-2 border-black bg-transparent text-black hover:bg-black hover:text-white hover:border-black active:bg-neutral-900 active:text-white",
        secondary:
          "bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 text-white hover:from-silver-300 hover:via-silver-400 hover:to-silver-300 hover:text-black border border-neutral-600/30 hover:border-silver-400 active:bg-neutral-900 active:text-white",
        ghost: "text-black hover:bg-gradient-to-r hover:from-silver-100 hover:to-silver-200 active:bg-silver-200",
        link: "text-black underline-offset-4 hover:underline active:text-neutral-700",
        silver: "bg-gradient-to-r from-silver-300 via-silver-400 to-silver-300 text-black hover:from-black hover:via-neutral-900 hover:to-black hover:text-white border border-silver-400 hover:border-black active:bg-black active:text-white",
        premium: "bg-gradient-to-r from-black via-neutral-800 to-black text-white hover:from-silver-200 hover:via-silver-300 hover:to-silver-200 hover:text-black border border-neutral-700/50 hover:border-silver-400 active:bg-black active:text-white",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
        iconSm: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    if (!asChild) {
      return (
        <button
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }))}
          disabled={disabled || loading}
          {...props}
        >
          {loading && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {!loading && leftIcon && (
            <span className="mr-2">{leftIcon}</span>
          )}
          {children}
          {!loading && rightIcon && (
            <span className="ml-2">{rightIcon}</span>
          )}
        </button>
      )
    }

    return (
      <Slot
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Slot>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
