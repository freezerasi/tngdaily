import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * TNG Daily scribble system.
 *
 * These are the brand's hand marks: an art director's marker on a proof sheet,
 * not an icon set. Every path is drawn by hand here rather than pulled from a
 * library, because the imperfection *is* the identity. An icon library's job on
 * this site is utility only (search, menu); the moment a mark carries brand
 * meaning it belongs in this file.
 *
 * Shared rules, enforced by construction:
 *   - round caps and joins, so every terminal reads as a felt-tip stop;
 *   - stroke widths vary between and within marks, the way pressure varies;
 *   - geometry is deliberately off-axis and never mirror-symmetrical;
 *   - `vector-effect: non-scaling-stroke` is avoided, so a mark scaled up keeps
 *     its drawn weight relationship rather than turning wiry;
 *   - every mark is `aria-hidden` and `focusable="false"`: these are texture,
 *     never the only carrier of meaning. Any mark next to an action has a real
 *     text label beside it.
 */

type ScribbleProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Stroke scale multiplier. 1 is the drawn weight. */
  weight?: number;
};

const baseProps = {
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
};

/* -------------------------------------------------------------------------- */
/* Arrow: the CTA mark. Slight upward drift, overshooting head.               */
/* -------------------------------------------------------------------------- */

export function ScribbleArrow({
  className,
  weight = 1,
  ...props
}: ScribbleProps) {
  return (
    <svg
      viewBox="0 0 40 20"
      className={cn("h-[0.9em] w-auto shrink-0", className)}
      {...baseProps}
      {...props}
    >
      {/* Shaft: not straight. Rises slightly then settles, like a fast stroke. */}
      <path
        d="M2.5 11.4C8 10.2 15.5 9.3 24 9.1c4.2-.1 8-.1 11.6.2"
        strokeWidth={2.4 * weight}
      />
      {/* Head: two separate strokes, unequal length, drawn after the shaft. */}
      <path d="M30.4 4.6c2.2 2 4 3.4 5.6 4.6" strokeWidth={2.2 * weight} />
      <path d="M36.2 9.4c-1.9 1.2-3.8 2.7-5.9 4.9" strokeWidth={2 * weight} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Underline: a marker pass under a word. Two strokes, second one lighter.    */
/* -------------------------------------------------------------------------- */

export function ScribbleUnderline({
  className,
  weight = 1,
  ...props
}: ScribbleProps) {
  return (
    <svg
      viewBox="0 0 120 12"
      preserveAspectRatio="none"
      className={cn("h-2.5 w-full", className)}
      {...baseProps}
      {...props}
    >
      {/* First pass: confident, thicker, lifts at the end. */}
      <path
        d="M3 7.2C22 4.8 47 3.9 74 4.3c15 .2 30 .9 43 2"
        strokeWidth={3 * weight}
      />
      {/* Second pass: a quick return stroke that does not track the first. */}
      <path
        d="M9 10.1c26-1.6 55-2 84-1.2"
        strokeWidth={1.6 * weight}
        opacity={0.6}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Circle: a ring around something worth noticing. Open, overshooting.        */
/* -------------------------------------------------------------------------- */

export function ScribbleCircle({
  className,
  weight = 1,
  ...props
}: ScribbleProps) {
  return (
    <svg
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
      className={cn("size-full", className)}
      {...baseProps}
      {...props}
    >
      {/*
       * One continuous loop that overshoots its start and crosses back, the way
       * a real ring around a word does. The overshoot is the tell: a closed
       * ellipse reads as a shape, this reads as a gesture.
       */}
      <path
        d="M64 8C41 3.6 16 7.4 8.6 19.2 1.4 30.6 10 45 27.6 51.2c19.6 6.8 52 4.6 62.4-7 8.6-9.6 1.4-25.4-19.4-33.2-6-2.2-13-3.6-20.6-3.8"
        strokeWidth={2.3 * weight}
      />
      {/* The return flick past the start point. */}
      <path
        d="M50 6.4c-7 .2-13.6 1.4-19 3.4"
        strokeWidth={1.9 * weight}
        opacity={0.7}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Megaphone: the community call. Drawn, not a glyph.                         */
/* -------------------------------------------------------------------------- */

export function ScribbleMegaphone({
  className,
  weight = 1,
  ...props
}: ScribbleProps) {
  return (
    <svg
      viewBox="0 0 56 44"
      className={cn("size-full", className)}
      {...baseProps}
      {...props}
    >
      {/* Cone: four strokes that do not quite meet at the corners. */}
      <path
        d="M6.5 17.2 33.4 6.8c1.4-.6 2.4.2 2.3 1.7l-1.2 25.9c-.1 1.6-1.3 2.2-2.6 1.3L6.8 22.6c-1.2-.9-1.4-4.5-.3-5.4Z"
        strokeWidth={2.4 * weight}
      />
      {/* Handle, hanging slightly off-square. */}
      <path
        d="M14.2 25.4 12 37.8c-.2 1.4.6 2.3 2 2.1l3.6-.6c1.3-.2 1.8-1 1.6-2.3l-1.6-8.6"
        strokeWidth={2.1 * weight}
      />
      {/* Sound: three arcs of unequal length and weight. */}
      <path d="M41.8 13.4c3.2 1.8 4.6 4.2 4.4 7.4" strokeWidth={2 * weight} />
      <path d="M45.6 8.2c5.4 3.4 7.6 8 6.8 13.8" strokeWidth={1.7 * weight} />
      <path d="M40.6 27.6c2.4-.6 3.8-1.8 4.4-3.6" strokeWidth={1.6 * weight} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Star: the ticker separator and small emphasis mark. Four unequal spokes.   */
/* -------------------------------------------------------------------------- */

export function ScribbleStar({
  className,
  weight = 1,
  ...props
}: ScribbleProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-[0.85em] shrink-0", className)}
      {...baseProps}
      {...props}
    >
      {/* Three crossing strokes, none centred, drawn at speed. */}
      <path d="M12.2 2.6 11.4 21" strokeWidth={2.3 * weight} />
      <path d="M3.4 11.2 20.8 12.6" strokeWidth={2.1 * weight} />
      <path d="M5.6 5.2 18.2 18.4" strokeWidth={1.8 * weight} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Bracket: an editor marking a span. Handed left or right.                    */
/* -------------------------------------------------------------------------- */

export function ScribbleBracket({
  className,
  weight = 1,
  side = "left",
  ...props
}: ScribbleProps & { side?: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 16 60"
      preserveAspectRatio="none"
      className={cn("h-full w-2.5 shrink-0", className)}
      style={side === "right" ? { transform: "scaleX(-1)" } : undefined}
      {...baseProps}
      {...props}
    >
      {/* Spine bows outward slightly; the arms are different lengths. */}
      <path
        d="M12.6 2.4C6.8 3.6 3.4 5.8 3.2 9.2 3 15 3.4 24 3.6 30c.2 6.6-.2 15.4-.6 20.4-.2 3.4 3 5.8 9.2 7"
        strokeWidth={2.4 * weight}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Quote: oversized opening mark for the SUARA quote card.                    */
/* -------------------------------------------------------------------------- */

export function ScribbleQuote({
  className,
  weight = 1,
  ...props
}: ScribbleProps) {
  return (
    <svg
      viewBox="0 0 34 24"
      className={cn("size-full", className)}
      {...baseProps}
      {...props}
    >
      {/*
       * A hand-drawn double quote is two tapered marks, not two rings. Each mark
       * is a thick primary stroke with a thinner companion beside it, which is
       * how a chisel-tip marker actually lays down a quote: one heavy pass, one
       * light one. Drawn as strokes rather than typeset, so the shape is ours.
       */}
      <path d="M8.5 4.2C6.3 8 5.4 12.4 6.2 17" strokeWidth={4.6 * weight} />
      <path
        d="M12.6 5.4c-1.4 3.4-1.9 6.8-1.4 10.2"
        strokeWidth={2.2 * weight}
        opacity={0.85}
      />
      <path d="M22.4 4C20.2 7.8 19.3 12.2 20.1 16.8" strokeWidth={4.2 * weight} />
      <path
        d="M26.4 5.2c-1.3 3.3-1.8 6.6-1.3 9.9"
        strokeWidth={2 * weight}
        opacity={0.8}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Burst: a small radiating mark for "new" or "live". Five uneven rays.        */
/* -------------------------------------------------------------------------- */

export function ScribbleBurst({
  className,
  weight = 1,
  ...props
}: ScribbleProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={cn("size-[1em] shrink-0", className)}
      {...baseProps}
      {...props}
    >
      <path d="M14.2 1.8v5.4" strokeWidth={2.2 * weight} />
      <path d="M24.6 6.2l-3.8 3.6" strokeWidth={1.9 * weight} />
      <path d="M26.4 17.4l-5.2-1.2" strokeWidth={2 * weight} />
      <path d="M4.2 8.4l4 3" strokeWidth={1.8 * weight} />
      <path d="M2.2 18.6l5-1.6" strokeWidth={2.1 * weight} />
      <path d="M13.6 26.2l.4-5" strokeWidth={1.7 * weight} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Rule: a hand-drawn horizontal divider, for section heads.                  */
/* -------------------------------------------------------------------------- */

export function ScribbleRule({
  className,
  weight = 1,
  ...props
}: ScribbleProps) {
  return (
    <svg
      viewBox="0 0 200 8"
      preserveAspectRatio="none"
      className={cn("h-2 w-full", className)}
      {...baseProps}
      {...props}
    >
      <path
        d="M2 4.6C38 2.6 78 2 118 2.8c28 .6 56 1.6 80 2.6"
        strokeWidth={2.6 * weight}
      />
    </svg>
  );
}
