import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-[6px] border border-input bg-card/60 px-3 py-2",
        "text-[14px] leading-tight text-foreground placeholder:text-muted-foreground",
        "transition-[border-color,box-shadow,background-color] outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-foreground/[0.06]",
        "focus-visible:bg-card",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/40 disabled:opacity-60",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/15",
        "dark:bg-input/30 dark:disabled:bg-input/80",
        className
      )}
      {...props}
    />
  )
}

export { Input }
