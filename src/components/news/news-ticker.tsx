import Link from "next/link";

import { ScribbleArrow, ScribbleStar } from "@/components/branding/scribble";
import type { ArticleSummary } from "@/lib/data/types";

/**
 * NewsTicker: the "YANG LAGI RAME" strip under the masthead.
 *
 * Fed only by real published articles. An authored headline in a ticker on a
 * news site reads as a real story, so there is no sample copy here: when there
 * is nothing to show, the caller renders the honest empty line instead.
 *
 * Motion is CSS-only, paused on hover and on keyboard focus within, and disabled
 * entirely under `prefers-reduced-motion`. Two copies of the track give a
 * seamless loop; the duplicate is hidden from assistive tech and removed from the
 * tab order so a screen reader and a keyboard both see each item once.
 */
export function NewsTicker({ articles }: { articles: ArticleSummary[] }) {
  if (articles.length === 0) {
    return (
      <div className="border-b border-line bg-black">
        <div className="mx-auto flex h-12 max-w-7xl items-center px-3 sm:px-4">
          <span className="font-display text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
            Headline akan muncul saat redaksi mempublikasikan update.
          </span>
        </div>
      </div>
    );
  }

  const items = articles.slice(0, 8);

  return (
    <div className="group relative border-b border-line bg-black">
      <div className="mx-auto flex h-12 max-w-7xl items-stretch sm:h-13">
        <span className="z-10 flex shrink-0 items-center gap-2 border-r border-line bg-lime px-3.5 font-display text-[0.6875rem] font-extrabold uppercase tracking-[0.12em] text-ink sm:px-5 sm:text-[0.75rem]">
          YANG LAGI RAME
          <ScribbleArrow className="h-2.5" />
        </span>

        {/* Pauses on hover and whenever focus lands inside, so a keyboard user
            can read and activate a link without chasing it. */}
        <div className="relative flex flex-1 items-center overflow-hidden pl-2">
          <div className="flex w-max items-center motion-safe:animate-[tng-marquee_40s_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
            <TickerRun items={items} />
            <TickerRun items={items} duplicate />
          </div>
        </div>

        <div className="relative z-10 hidden shrink-0 items-center sm:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-8 w-8 bg-gradient-to-r from-transparent to-black"
          />
          <Link
            href="/cari"
            className="group/more flex h-full items-center gap-2 bg-black pl-3 pr-4 font-display text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-foreground/75 transition-colors duration-200 hover:text-lime sm:pr-5 sm:text-[0.75rem]"
          >
            <span className="relative">
              LEBIH BANYAK CERITA
              <span className="absolute -bottom-0.5 left-0 h-[1.5px] w-0 bg-lime transition-all duration-200 group-hover/more:w-full" />
            </span>
            <ScribbleArrow className="h-2.5 text-foreground/60 transition-all duration-200 group-hover/more:translate-x-1 group-hover/more:text-lime" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function TickerRun({
  items,
  duplicate = false,
}: {
  items: ArticleSummary[];
  duplicate?: boolean;
}) {
  return (
    <ul
      className="flex shrink-0 items-center"
      {...(duplicate ? { "aria-hidden": "true" } : {})}
    >
      {items.map((article) => (
        <li
          key={`${duplicate ? "dup-" : ""}${article.id}`}
          className="flex items-center"
        >
          <Link
            href={`/artikel/${article.slug}`}
            tabIndex={duplicate ? -1 : undefined}
            className="flex items-center py-1 pl-4 pr-2 text-foreground/85 transition-colors hover:text-lime"
          >
            <span className="whitespace-nowrap font-display text-[0.75rem] font-bold uppercase tracking-[0.05em] sm:text-[0.8125rem]">
              {article.title}
            </span>
          </Link>
          {/* Hand-drawn star separator, not a typeset dingbat. */}
          <ScribbleStar className="mx-2 size-3 shrink-0 text-lime" />
        </li>
      ))}
    </ul>
  );
}
