import Link from "next/link";

import { ScribbleRule } from "@/components/branding/scribble";
import { cn } from "@/lib/utils";
import { TOPIC_META, type Topic } from "@/lib/taxonomy";
import { PILLARS, PILLAR_META, type Pillar } from "@/types/domain";

/**
 * FilterTabs: the primary rubrik switcher.
 *
 * Only rubriks appear here, plus SEMUA and TRENDING which are views of all
 * rubriks rather than peers of them. Topics are deliberately absent: putting
 * KULINER next to VIBES would tell a reader they are the same kind of thing.
 *
 * Topics appear one level down, as `TopicFilterRail` on a rubrik page, where the
 * context makes the relationship obvious.
 *
 * Server-rendered links, so a filtered view is shareable and the feed stays a
 * Server Component. This bar and the Radar carousel are the only two elements
 * on the site permitted to scroll horizontally.
 */
export function FilterTabs({
  active,
  showTrending = true,
}: {
  active: Pillar | "semua" | "trending";
  showTrending?: boolean;
}) {
  return (
    <nav
      aria-label="Filter rubrik"
      className="border-y border-line/60 bg-wall-deep/80 py-2.5"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 sm:px-4">
        <div className="tng-scroll-x flex items-center gap-2">
          <Tab href="/" label="SEMUA" isActive={active === "semua"} />

          {PILLARS.map((pillar) => (
            <Tab
              key={pillar}
              href={`/${pillar}`}
              label={PILLAR_META[pillar].label}
              isActive={active === pillar}
            />
          ))}

          {showTrending ? (
            <Tab
              href="/populer"
              label="TRENDING"
              isActive={active === "trending"}
            />
          ) : null}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <span className="font-display text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted">
            CERITA LOKAL, SUDUT PANDANG BARU.
          </span>
          {/* Hand-drawn rule instead of a 2px div: the brand's own mark. */}
          <ScribbleRule className="h-2 w-12 text-line" />
        </div>
      </div>
    </nav>
  );
}

function Tab({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        // 44px on touch, tightened on pointer devices where it is not needed.
        "inline-flex h-11 shrink-0 items-center px-3.5 sm:h-9",
        "font-display text-[0.6875rem] font-extrabold uppercase tracking-[0.1em]",
        "transition-all duration-150 ease-out",
        isActive
          ? "border-2 border-keyline bg-lime text-ink shadow-[2px_2px_0px_0px_#000000]"
          : "border border-line bg-surface text-foreground/80 hover:border-foreground/40 hover:bg-surface-strong hover:text-foreground",
      )}
    >
      {isActive ? <span aria-hidden="true" className="mr-1.5 size-1.5 bg-ink" /> : null}
      {label}
    </Link>
  );
}

/**
 * TopicFilterRail: secondary filter, one level below the rubrik.
 *
 * Only rendered on a rubrik page, where "Topik" plus a rubrik heading above it
 * makes the hierarchy legible. Never in the masthead, never in the main filter.
 */
export function TopicFilterRail({
  pillar,
  topics,
  activeTopic,
}: {
  pillar: Pillar;
  topics: readonly Topic[];
  activeTopic?: Topic;
}) {
  if (topics.length === 0) return null;

  return (
    <nav
      aria-label={`Topik dalam ${PILLAR_META[pillar].label}`}
      className="tng-scroll-x flex items-center gap-2 py-1"
    >
      <span className="tng-label shrink-0 pr-1 text-muted">Topik</span>

      {topics.map((topic) => {
        const isActive = activeTopic === topic;
        return (
          <Link
            key={topic}
            href={isActive ? `/${pillar}` : `/${pillar}?topik=${topic}`}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-1.5 border-2 px-2.5 sm:h-8",
              "font-body text-[0.75rem] font-semibold transition-colors duration-150",
              isActive
                ? "border-keyline bg-bone text-ink"
                : "border-line bg-surface text-muted hover:border-keyline hover:text-foreground",
            )}
          >
            {TOPIC_META[topic].label}
            {isActive ? (
              <span aria-hidden="true" className="text-[0.875rem] leading-none">
                &times;
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
