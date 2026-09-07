import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Wordmark. Two panels butted together: the charcoal "TNG" plate and the lime
 * "DAILY" plate, so the mark reads as hardware rather than a logotype.
 */
export function WordMark({
  className,
  size = "md",
  asLink = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
}) {
  const scale = {
    sm: "text-[0.9375rem]",
    md: "text-lg",
    lg: "text-2xl sm:text-3xl",
  }[size];

  const content = (
    <span
      className={cn(
        "inline-flex items-stretch border-2 border-keyline shadow-[var(--shadow-hard-sm)]",
        className,
      )}
    >
      <span
        className={cn(
          "bg-wall-deep px-1.5 py-0.5 font-display font-extrabold uppercase leading-none tracking-[0.02em] text-foreground",
          scale,
        )}
      >
        TNG
      </span>
      <span
        className={cn(
          "border-l-2 border-keyline bg-lime px-1.5 py-0.5 font-display font-extrabold uppercase leading-none tracking-[0.02em] text-ink",
          scale,
        )}
      >
        Daily
      </span>
    </span>
  );

  if (!asLink) return content;

  return (
    <Link
      href="/"
      aria-label="TNG Daily, ke halaman utama"
      className="inline-flex rounded-[1px]"
    >
      {content}
    </Link>
  );
}
