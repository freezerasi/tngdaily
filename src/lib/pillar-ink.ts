import type { Pillar } from "@/types/domain";

/**
 * Pillar to banner ink. Four pillars, four panel materials, so a reader can
 * identify the section from across the room without reading the label.
 *
 * The accent inks (lime, orange) never carry running body text: they are panel
 * grounds for display type and marks only, which keeps contrast honest.
 */
export interface PillarInk {
  /** BannerPanel `ink` value. */
  panel: "lime" | "orange" | "bone" | "wall";
  /** TapePatch `tone` for the pillar patch itself. */
  patch: "lime" | "orange" | "bone" | "wall";
  /** Tailwind class for text drawn on the wall in this pillar's accent. */
  accentText: string;
  /** Tailwind class for a rule or bar in this pillar's accent. */
  accentBar: string;
  /** Tailwind class for a border in this pillar's accent. */
  accentBorder: string;
  /** Text colour to use on top of the pillar's panel. */
  onPanel: "ink" | "foreground";
}

export const PILLAR_INK: Record<Pillar, PillarInk> = {
  vibes: {
    panel: "lime",
    patch: "wall",
    accentText: "text-lime",
    accentBar: "bg-lime",
    accentBorder: "border-lime",
    onPanel: "ink",
  },
  suara: {
    panel: "orange",
    patch: "wall",
    accentText: "text-orange",
    accentBar: "bg-orange",
    accentBorder: "border-orange",
    onPanel: "ink",
  },
  hustle: {
    panel: "bone",
    patch: "orange",
    accentText: "text-bone",
    accentBar: "bg-bone",
    accentBorder: "border-bone",
    onPanel: "ink",
  },
  story: {
    panel: "wall",
    patch: "lime",
    accentText: "text-foreground",
    accentBar: "bg-foreground",
    accentBorder: "border-foreground",
    onPanel: "foreground",
  },
};

/** Text colour classes for copy sitting on a pillar panel. */
export function onPanelText(pillar: Pillar): {
  heading: string;
  body: string;
  muted: string;
  rule: string;
} {
  const onInk = PILLAR_INK[pillar].onPanel === "ink";
  return {
    heading: onInk ? "text-ink" : "text-foreground",
    body: onInk ? "text-ink/85" : "text-foreground/90",
    muted: onInk ? "text-ink/65" : "text-muted",
    rule: onInk ? "border-ink/30" : "border-line",
  };
}
