import { cn } from "@/lib/utils";
import { badgeLabel, needsVisibleBadge } from "@/lib/content-environment";
import type { MediaProvenance } from "@/types/domain";

/**
 * Provenance UI.
 *
 * Two surfaces, one source of truth:
 *   - `MediaStatusBadge` sits on the frame itself in feeds and grids, where
 *     there is no room for a sentence but the reader still needs to know the
 *     image is not evidence.
 *   - `MediaDisclosure` sits under the frame on an article page and states the
 *     limitation in full.
 *
 * Neither is hidden behind hover or a tooltip. A disclosure a reader has to
 * discover is not a disclosure.
 */

export function MediaStatusBadge({
  provenance,
  className,
}: {
  provenance: MediaProvenance | null;
  className?: string;
}) {
  if (!provenance || !needsVisibleBadge(provenance)) return null;

  const label = badgeLabel(provenance);
  if (!label) return null;

  return (
    <span
      className={cn(
        // Bone plate with a black keyline: legible over any photograph, and
        // deliberately not styled like a pillar badge so it cannot be mistaken
        // for a category.
        "inline-flex items-center gap-1 border-2 border-keyline bg-bone px-1.5 py-0.5",
        "font-display text-[0.5625rem] font-extrabold uppercase tracking-[0.12em] text-ink",
        className,
      )}
    >
      {/* Diagonal hatch: the mark that means "not a document". */}
      <span
        aria-hidden="true"
        className="size-2 shrink-0 border border-ink/70"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--color-ink) 0 1px, transparent 1px 3px)",
        }}
      />
      {label}
    </span>
  );
}

/**
 * Full disclosure line for article pages. Renders the credit always, and the
 * limitation sentence when the frame is not evidentiary.
 */
export function MediaDisclosure({
  provenance,
  caption,
  className,
}: {
  provenance: MediaProvenance | null;
  caption?: string | null;
  className?: string;
}) {
  if (!provenance) return null;

  const isNonEvidentiary = needsVisibleBadge(provenance);

  return (
    <figcaption
      className={cn(
        "mt-2 grid gap-1 border-l-2 pl-2.5",
        isNonEvidentiary ? "border-orange" : "border-line",
        className,
      )}
    >
      {caption ? (
        <span className="text-[0.8125rem] leading-snug text-foreground/90">
          {caption}
        </span>
      ) : null}

      <span className="text-[0.75rem] leading-snug text-muted">
        {provenance.credit}
      </span>

      {provenance.disclosure ? (
        <span
          className={cn(
            "text-[0.75rem] leading-snug",
            isNonEvidentiary ? "font-semibold text-orange" : "text-muted",
          )}
        >
          {provenance.disclosure}
        </span>
      ) : null}
    </figcaption>
  );
}
