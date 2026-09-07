import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Tape patch. A correction stuck onto vinyl, carrying pillar or status text.
 * Every patch keeps a text label so status never depends on colour alone.
 */
const patchVariants = cva("tng-patch", {
  variants: {
    tone: {
      lime: "bg-lime text-ink",
      orange: "bg-orange text-ink",
      bone: "bg-bone text-ink",
      tape: "bg-tape text-ink",
      wall: "bg-surface-strong text-foreground",
      danger: "bg-danger text-ink",
      ok: "bg-ok text-ink",
      outline: "bg-transparent text-foreground border-line shadow-none",
    },
    tilt: {
      none: "",
      left: "-rotate-[1.2deg]",
      right: "rotate-[1.2deg]",
    },
    size: {
      sm: "px-1.5 py-0.5 text-[0.625rem]",
      md: "",
    },
  },
  defaultVariants: { tone: "bone", tilt: "none", size: "md" },
});

export interface TapePatchProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof patchVariants> {
  asChild?: boolean;
}

export function TapePatch({
  className,
  tone,
  tilt,
  size,
  ...props
}: TapePatchProps) {
  return (
    <span className={cn(patchVariants({ tone, tilt, size }), className)} {...props} />
  );
}

/**
 * Stencil mark: sprayed through a cut plate. Reserved for the published state,
 * so "TAYANG" reads differently from every patch on the wall.
 */
export function StencilMark({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "tng-stencil text-[0.6875rem] text-lime",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
