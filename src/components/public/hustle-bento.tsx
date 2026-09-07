import { ExternalLink, MapPin } from "lucide-react";

import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import type { DirectoryListingView } from "@/lib/data/types";
import type { DirectoryType } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Hustle bento. Modular banner tiles at different spans, the way real notices
 * get pinned to a wall: the big ones get more wall reserve.
 *
 * On mobile the grid collapses to one column and the unit count drops, never
 * the type size. That is the cutting-bench rule.
 */

const TYPE_LABEL: Record<DirectoryType, string> = {
  loker: "Loker",
  umkm: "UMKM",
  kos: "Kos",
  event: "Event",
};

const TYPE_TONE: Record<DirectoryType, "lime" | "orange" | "bone" | "tape"> = {
  loker: "lime",
  umkm: "orange",
  kos: "bone",
  event: "tape",
};

export function HustleBento({
  listings,
}: {
  listings: DirectoryListingView[];
}) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing, index) => {
        // First tile takes two columns from sm up: the noticeboard's headline.
        const wide = index === 0;
        return (
          <li
            key={listing.id}
            className={cn(wide && "sm:col-span-2 lg:col-span-2")}
          >
            <BentoTile listing={listing} emphasis={wide} />
          </li>
        );
      })}
    </ul>
  );
}

function BentoTile({
  listing,
  emphasis,
}: {
  listing: DirectoryListingView;
  emphasis: boolean;
}) {
  const isSample = listing.title.toLowerCase().includes("sample");

  return (
    <BannerPanel
      ink="wall"
      lift="sm"
      className={cn(
        "flex h-full flex-col gap-2 p-4",
        emphasis && "sm:p-5",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <TapePatch tone={TYPE_TONE[listing.type]} tilt="left" size="sm">
          {TYPE_LABEL[listing.type]}
        </TapePatch>
        {isSample ? (
          <TapePatch tone="outline" size="sm">
            Contoh data
          </TapePatch>
        ) : null}
        {listing.isPaid ? (
          <TapePatch tone="outline" size="sm">
            Listing berbayar
          </TapePatch>
        ) : null}
      </div>

      <h3
        className={cn(
          "tng-display-tight text-foreground",
          emphasis ? "text-xl sm:text-2xl" : "text-lg",
        )}
      >
        {listing.title}
      </h3>

      {listing.companyName ? (
        <p className="text-[0.8125rem] font-semibold text-foreground/80">
          {listing.companyName}
        </p>
      ) : null}

      {listing.description ? (
        <p className="text-[0.8125rem] leading-relaxed text-muted">
          {listing.description}
        </p>
      ) : null}

      <div className="mt-auto grid gap-1.5 border-t-2 border-line pt-2.5">
        {listing.priceRange ? (
          <p className="font-display text-sm font-extrabold text-lime">
            {listing.priceRange}
          </p>
        ) : null}
        {listing.location ? (
          <p className="flex items-center gap-1.5 text-[0.75rem] text-muted">
            <MapPin aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
            {listing.location}
          </p>
        ) : null}
        {listing.contactInfo ? (
          <p className="text-[0.75rem] text-muted">{listing.contactInfo}</p>
        ) : null}
        {listing.externalUrl ? (
          <a
            href={listing.externalUrl}
            target="_blank"
            rel="noopener nofollow"
            className="tng-label inline-flex w-fit items-center gap-1.5 text-lime hover:underline hover:decoration-2 hover:underline-offset-4"
          >
            Buka tautan
            <ExternalLink aria-hidden="true" className="size-3" strokeWidth={3} />
          </a>
        ) : null}
      </div>
    </BannerPanel>
  );
}
