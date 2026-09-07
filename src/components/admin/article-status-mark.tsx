import { TapePatch, StencilMark } from "@/components/shared/tape-patch";
import { formatFeedTime } from "@/lib/dates";
import type { ArticleStatus } from "@/types/domain";

/**
 * Status as a mark, not a hue.
 *
 * Draft is a tape patch, scheduled is a patch carrying its date, published is a
 * sprayed stencil, archived is a struck-through patch. Every state reads
 * correctly in greyscale and to a screen reader.
 */
export function ArticleStatusMark({
  status,
  scheduledAt,
}: {
  status: ArticleStatus;
  scheduledAt?: string | null;
}) {
  switch (status) {
    case "published":
      return (
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span aria-hidden="true" className="size-2 bg-lime" />
          <StencilMark>Tayang</StencilMark>
        </span>
      );

    case "scheduled":
      return (
        <TapePatch tone="orange" tilt="left" size="sm" className="shrink-0">
          Terjadwal
          {scheduledAt ? (
            <span className="font-body font-semibold normal-case tracking-normal">
              {formatFeedTime(scheduledAt)}
            </span>
          ) : null}
        </TapePatch>
      );

    case "needs_review":
      return (
        <TapePatch tone="tape" tilt="right" size="sm" className="shrink-0">
          Perlu review
        </TapePatch>
      );

    case "archived":
      return (
        <TapePatch
          tone="outline"
          size="sm"
          className="shrink-0 line-through decoration-2"
        >
          Arsip
        </TapePatch>
      );

    case "draft":
      return (
        <TapePatch tone="bone" tilt="left" size="sm" className="shrink-0">
          Draft
        </TapePatch>
      );
  }
}
