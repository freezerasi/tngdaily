import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button: vinyl banner hardware. Solid keyline, hard shadow, and a press that
 * pushes the shadow away rather than fading opacity.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-display font-extrabold uppercase tracking-[0.06em]",
    "border-2 border-keyline rounded-[3px]",
    "transition-[transform,box-shadow,background-color] duration-100",
    "disabled:pointer-events-none disabled:opacity-55",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-lime text-ink shadow-[var(--shadow-hard)] hover:bg-lime-deep active:translate-x-[2px] active:translate-y-[2px] active:shadow-[var(--shadow-hard-sm)]",
        secondary:
          "bg-orange text-ink shadow-[var(--shadow-hard)] hover:bg-orange-deep active:translate-x-[2px] active:translate-y-[2px] active:shadow-[var(--shadow-hard-sm)]",
        outline:
          "bg-surface text-foreground shadow-[var(--shadow-hard-sm)] hover:bg-surface-strong active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
        bone:
          "bg-bone text-ink shadow-[var(--shadow-hard)] hover:bg-tape active:translate-x-[2px] active:translate-y-[2px] active:shadow-[var(--shadow-hard-sm)]",
        danger:
          "bg-danger text-ink shadow-[var(--shadow-hard)] hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[var(--shadow-hard-sm)]",
        ghost:
          "border-transparent bg-transparent text-muted hover:border-line hover:bg-surface hover:text-foreground",
        link: "border-transparent bg-transparent text-lime underline decoration-2 underline-offset-4 hover:bg-lime hover:text-ink",
      },
      size: {
        sm: "h-9 px-3 text-[0.6875rem] [&_svg]:size-4",
        md: "h-11 px-4 text-xs [&_svg]:size-4",
        lg: "h-13 px-6 text-sm [&_svg]:size-5",
        icon: "size-11 px-0 [&_svg]:size-5",
        "icon-sm": "size-9 px-0 [&_svg]:size-4",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, type, ...props }, ref) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...(asChild ? {} : { type: type ?? "button" })}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
