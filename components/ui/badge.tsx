import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "group/badge inline-flex h-[24px] w-fit shrink-0 items-center justify-center gap-1",
    "px-2.5 rounded-full",
    "text-[12px] font-medium leading-none whitespace-nowrap",
    "border border-transparent",
    "transition-all",
    "focus-visible:ring-2 focus-visible:ring-ring/40",
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-foreground text-background",
        outline: "border-border text-foreground bg-card",
        soft: "bg-[var(--forest-soft)] text-[var(--forest-deep)]",
        warm: "bg-[var(--cream-deep)] text-foreground",
        destructive: "bg-destructive/10 text-destructive border-destructive/15",
        ghost: "text-muted-foreground hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
