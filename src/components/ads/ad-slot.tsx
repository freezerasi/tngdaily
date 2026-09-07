import { cn } from "@/lib/utils";

/**
 * AdSlot: reserved advertising space, disabled.
 *
 * No ad network script is loaded here and none should be added without a
 * decision to enable ads. What this component provides now is the *architecture*:
 * a labelled, reserved, semantically separated region, so that turning ads on
 * later is a configuration change rather than a layout rewrite.
 *
 * Reserved height is fixed per format, which is the entire point: an ad that
 * arrives after paint and pushes content down is the single largest CLS source on
 * most news sites. The space exists whether or not anything fills it.
 *
 * Placement rules, enforced by the caller rather than here:
 *   - never inside the hero, the filter bar, or the Radar;
 *   - never adjacent to KIRIM CERITA or KIRIM TIP, so a reader cannot mistake a
 *     paid unit for a participation prompt;
 *   - never on admin routes, legal pages, submission forms, or mock articles;
 *   - never styled as an ArticleCard.
 */

export type AdFormat = "leaderboard" | "inline-rectangle" | "sidebar-tower";

const FORMATS: Record<
  AdFormat,
  { label: string; reservedClass: string; note: string }
> = {
  leaderboard: {
    label: "728 × 90",
    // Taller on mobile because a leaderboard reflows to a mobile banner.
    reservedClass: "min-h-[6.25rem] sm:min-h-[7.5rem]",
    note: "Antara blok editorial",
  },
  "inline-rectangle": {
    label: "300 × 250",
    reservedClass: "min-h-[17.5rem]",
    note: "Di dalam alur feed",
  },
  "sidebar-tower": {
    label: "300 × 600",
    reservedClass: "min-h-[38rem]",
    note: "Kolom samping desktop",
  },
};

export function adsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
}

export function AdSlot({
  format,
  slotId,
  className,
}: {
  format: AdFormat;
  /** Stable identifier, so a slot can be reported on later. */
  slotId: string;
  className?: string;
}) {
  const spec = FORMATS[format];

  /*
   * Ads are off. The region is still rendered so the reserved space is real and
   * the layout is identical whether or not ads are later enabled: this is what
   * keeps CLS at zero on the day they are switched on.
   *
   * In development the region is visible with its dimensions, so placement can
   * be reviewed. In production, with ads disabled, it collapses to nothing:
   * showing a reader an empty labelled box is worse than showing nothing.
   */
  if (!adsEnabled()) {
    if (process.env.NODE_ENV === "production") return null;

    return (
      <aside
        aria-label="Placeholder slot iklan, tidak aktif"
        data-ad-slot={slotId}
        className={cn(
          "flex flex-col items-center justify-center gap-1 border-2 border-dashed border-line/70 bg-wall-deep/60",
          spec.reservedClass,
          className,
        )}
      >
        <span className="font-display text-[0.625rem] font-extrabold uppercase tracking-[0.16em] text-muted">
          Slot iklan &middot; nonaktif
        </span>
        <span className="font-mono text-[0.625rem] text-muted/70">
          {spec.label} &middot; {slotId}
        </span>
        <span className="text-[0.625rem] text-muted/70">{spec.note}</span>
      </aside>
    );
  }

  /*
   * Ads enabled. Still no network script: wiring a provider is a separate,
   * explicit decision. The label and the reserved box are mandatory regardless
   * of provider, so they live here rather than in whatever gets added later.
   */
  return (
    <aside
      aria-label="Advertisement"
      data-ad-slot={slotId}
      className={cn(
        "flex flex-col border-2 border-line bg-wall-deep",
        spec.reservedClass,
        className,
      )}
    >
      <span className="border-b border-line px-2 py-1 font-display text-[0.5625rem] font-extrabold uppercase tracking-[0.16em] text-muted">
        Iklan
      </span>
      <div className="flex flex-1 items-center justify-center">
        <span className="sr-only">Ruang iklan</span>
      </div>
    </aside>
  );
}
