import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-2",
    "font-sans text-[14px] font-medium leading-none whitespace-nowrap",
    "border border-transparent select-none outline-none",
    "transition-all duration-200",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground rounded-full",
          "hover:bg-[var(--forest-deep)]",
          "shadow-[0_1px_2px_rgba(15,77,52,0.2)]",
          "hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.42)]",
        ].join(" "),
        primary: [
          "bg-primary text-primary-foreground rounded-full",
          "hover:bg-[var(--forest-deep)]",
          "shadow-[0_1px_2px_rgba(15,77,52,0.2)]",
          "hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.42)]",
        ].join(" "),
        dark: [
          "bg-foreground text-background rounded-full",
          "hover:bg-foreground/90",
          "shadow-[0_1px_2px_rgba(15,20,16,0.12)]",
          "hover:shadow-[0_8px_18px_-6px_rgba(15,20,16,0.3)]",
        ].join(" "),
        outline: [
          "rounded-full border-border bg-card text-foreground",
          "hover:border-foreground/40 hover:bg-muted",
          "aria-expanded:bg-muted",
        ].join(" "),
        secondary: [
          "rounded-full bg-secondary text-secondary-foreground",
          "hover:bg-[var(--cream-deep)]",
        ].join(" "),
        ghost: [
          "rounded-full text-foreground",
          "hover:bg-muted",
          "aria-expanded:bg-muted",
        ].join(" "),
        destructive: [
          "rounded-full bg-destructive/10 text-destructive border-destructive/15",
          "hover:bg-destructive/15 hover:border-destructive/30",
        ].join(" "),
        link: [
          "text-primary underline underline-offset-4 decoration-1 decoration-primary/40 rounded-none",
          "hover:decoration-primary",
        ].join(" "),
        editorial: [
          "rounded-none border-0 border-b border-foreground/40 bg-transparent text-foreground px-0",
          "hover:border-foreground",
        ].join(" "),
      },
      size: {
        default: "h-10 px-5",
        xs: "h-7 px-3 text-[12px]",
        sm: "h-8 px-3.5 text-[13px]",
        lg: "h-12 px-6 text-[15px]",
        xl: "h-14 px-7 text-[15px]",
        icon: "size-10",
        "icon-xs": "size-7",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
