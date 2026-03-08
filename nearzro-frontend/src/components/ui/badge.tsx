import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-silver-600 bg-gradient-to-r from-silver-700 to-silver-800 text-white shadow hover:opacity-90",
        secondary:
          "border-silver-600 bg-silver-800 text-silver-200 hover:bg-silver-700",
        destructive:
          "border-red-700 bg-gradient-to-r from-red-800 to-red-900 text-white shadow hover:opacity-90",
        success:
          "border-green-700 bg-gradient-to-r from-green-800 to-green-900 text-green-100 shadow hover:opacity-90",
        warning:
          "border-yellow-700 bg-gradient-to-r from-yellow-800 to-yellow-900 text-yellow-100 shadow hover:opacity-90",
        info:
          "border-blue-700 bg-gradient-to-r from-blue-800 to-blue-900 text-blue-100 shadow hover:opacity-90",
        outline: "border-silver-600 text-silver-300 hover:bg-silver-800/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
