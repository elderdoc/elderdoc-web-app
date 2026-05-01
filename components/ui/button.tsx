import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-1.5",
    "font-sans text-[13px] font-medium leading-none whitespace-nowrap",
    "border border-transparent select-none outline-none",
    "transition-[transform,background-color,border-color,color,box-shadow] duration-200",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.985]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-3.5",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-foreground text-background rounded-full",
          "hover:bg-foreground/90 hover:translate-y-[-1px]",
          "shadow-[0_1px_0_rgba(15,20,16,0.04),0_2px_4px_-2px_rgba(15,20,16,0.18)]",
          "hover:shadow-[0_1px_0_rgba(15,20,16,0.04),0_8px_16px_-4px_rgba(15,20,16,0.22)]",
        ].join(" "),
        primary: [
          "bg-primary text-primary-foreground rounded-full",
          "hover:bg-[var(--forest-deep)] hover:translate-y-[-1px]",
          "shadow-[0_1px_0_rgba(15,20,16,0.04),0_2px_4px_-2px_rgba(15,77,52,0.32)]",
          "hover:shadow-[0_1px_0_rgba(15,20,16,0.04),0_10px_20px_-6px_rgba(15,77,52,0.36)]",
        ].join(" "),
        outline: [
          "rounded-full border-foreground/15 bg-transparent text-foreground",
          "hover:border-foreground/40 hover:bg-foreground/[0.025]",
          "aria-expanded:bg-foreground/[0.04] aria-expanded:border-foreground/40",
        ].join(" "),
        secondary: [
          "rounded-full bg-secondary text-secondary-foreground border-foreground/[0.06]",
          "hover:bg-[var(--cream-deep)]",
        ].join(" "),
        ghost: [
          "rounded-full text-foreground",
          "hover:bg-foreground/[0.04]",
          "aria-expanded:bg-foreground/[0.06]",
        ].join(" "),
        destructive: [
          "rounded-full bg-destructive/10 text-destructive border-destructive/15",
          "hover:bg-destructive/15 hover:border-destructive/30",
        ].join(" "),
        link: [
          "text-foreground underline underline-offset-4 decoration-1 decoration-foreground/30 rounded-none",
          "hover:decoration-foreground hover:text-foreground",
        ].join(" "),
        editorial: [
          "rounded-none border-0 border-b border-foreground/40 bg-transparent text-foreground px-0",
          "hover:border-foreground hover:tracking-tight",
        ].join(" "),
      },
      size: {
        default: "h-9 px-4",
        xs: "h-7 px-2.5 text-[12px]",
        sm: "h-8 px-3 text-[12.5px]",
        lg: "h-11 px-6 text-[14px]",
        xl: "h-12 px-7 text-[14px]",
        icon: "size-9",
        "icon-xs": "size-7",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
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
