import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Grommets } from "@/components/shared/banner-parts";

/**
 * BannerPanel: the single repeating unit of the entire product.
 *
 * Rank is expressed by how much charcoal wall is reserved around the panel, a
 * donation from the quarterly-interior challenger, not only by size.
 */
const bannerVariants = cva("tng-banner", {
  variants: {
    ink: {
      lime: "bg-lime text-ink",
      orange: "bg-orange text-ink",
      bone: "bg-bone text-ink",
      wall: "bg-surface text-foreground",
      deep: "bg-wall-deep text-foreground",
    },
    lift: {
      none: "shadow-none",
      sm: "shadow-[var(--shadow-hard-sm)]",
      md: "shadow-[var(--shadow-hard)]",
      lg: "shadow-[var(--shadow-hard-lg)]",
    },
    tilt: {
      none: "",
      left: "-rotate-[0.35deg]",
      right: "rotate-[0.35deg]",
    },
  },
  defaultVariants: { ink: "wall", lift: "md", tilt: "none" },
});

export interface BannerPanelProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof bannerVariants> {
  /** Reserve of wall around the panel. Wider reserve reads as higher rank. */
  reserve?: "none" | "sm" | "md" | "lg";
  grommets?: boolean;
  grommetInset?: string;
  as?: "div" | "article" | "section" | "li" | "aside";
}

const reserveClass: Record<
  NonNullable<BannerPanelProps["reserve"]>,
  string
> = {
  none: "",
  sm: "m-1",
  md: "m-2",
  lg: "m-3 sm:m-4",
};

export function BannerPanel({
  className,
  ink,
  lift,
  tilt,
  reserve = "none",
  grommets = false,
  grommetInset,
  as = "div",
  children,
  ...props
}: BannerPanelProps) {
  const Component = as;
  return (
    <Component
      className={cn(
        bannerVariants({ ink, lift, tilt }),
        reserveClass[reserve],
        className,
      )}
      {...props}
    >
      {grommets ? <Grommets {...(grommetInset ? { inset: grommetInset } : {})} /> : null}
      {children}
    </Component>
  );
}

/**
 * Wall: the charcoal ground content hangs on. Holds the single off-centre
 * registration rail that nothing in the layout leaves, and constrains the
 * editorial column so long-form pages do not run to the full 1440.
 */
export function Wall({
  className,
  rail = true,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { rail?: boolean }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-5xl",
        rail && "tng-rail",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
