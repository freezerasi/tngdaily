import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ScribbleArrow,
  ScribbleBracket,
  ScribbleRule,
} from "@/components/branding/scribble";
import { PartnerCard } from "@/components/editorial/partner-card";
import { MediaDisclosure } from "@/components/shared/media-provenance";
import { Wall } from "@/components/shared/banner-panel";
import { renderMarkdown } from "@/lib/content";
import { formatDateLong } from "@/lib/dates";
import { getPartnerStories, getPartnerStory } from "@/lib/data/partners";
import { SITE_NAME } from "@/lib/seo";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Advertorial detail page.
 *
 * Commercial content is `noindex` here on purpose. These are development
 * samples: indexing a placeholder advertorial would put a fake sponsorship in
 * search results. When real partner content arrives, indexing becomes a per-deal
 * decision, and the `rel="sponsored"` requirement on outbound links stays.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await getPartnerStory(slug);

  if (!story) {
    return { title: "Partner story tidak ditemukan", robots: { index: false } };
  }

  return {
    title: `${story.title} | Partner Story`,
    description: story.dek,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PartnerStoryPage({ params }: PageProps) {
  const { slug } = await params;
  const story = await getPartnerStory(slug);
  if (!story) notFound();

  const all = await getPartnerStories();
  const others = all.filter((item) => item.slug !== story.slug).slice(0, 2);
  const html = renderMarkdown(story.bodyMarkdown);

  return (
    <Wall className="pb-16" rail={false}>
      {/*
       * Disclosure band, before the headline and unmissable. A reader must know
       * this is paid before they start reading, not after.
       */}
      <div className="border-b-2 border-keyline bg-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 sm:px-4">
          <span className="inline-flex items-center border-2 border-lime bg-lime px-2 py-0.5 font-display text-[0.625rem] font-extrabold uppercase tracking-[0.16em] text-ink">
            ADVERTORIAL &middot; PARTNER
          </span>
          <p className="text-[0.75rem] leading-snug text-bone/75">
            Konten kerja sama berbayar. Ditulis bersama partner, bukan hasil
            liputan independen redaksi {SITE_NAME}.
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-5xl px-3 sm:px-4">
        <header className="pt-6">
          <span className="flex flex-wrap items-center gap-2">
            <ScribbleBracket className="h-5 w-2 text-tape" side="left" />
            <span className="inline-flex items-center border border-tape/70 px-1.5 py-0.5 font-display text-[0.5625rem] font-extrabold uppercase tracking-[0.14em] text-tape">
              {story.category}
            </span>
            <span className="font-display text-[0.625rem] font-extrabold uppercase tracking-[0.12em] text-muted">
              {story.partnerName} &times; TNG Daily
            </span>
          </span>

          <h1 className="tng-display mt-3 text-[2rem] leading-[0.94] sm:text-[2.75rem]">
            {story.title}
          </h1>

          <ScribbleRule className="mt-2 h-2 w-28 text-tape" />

          <p className="tng-measure mt-3 text-[0.9375rem] leading-relaxed text-muted sm:text-base">
            {story.dek}
          </p>

          <p className="mt-4 border-t border-line pt-2.5 text-[0.75rem] text-muted">
            Dipublikasikan{" "}
            <time dateTime={story.publishedAt}>
              {formatDateLong(story.publishedAt)}
            </time>
          </p>
        </header>

        {story.coverImageUrl ? (
          <figure className="mt-5">
            <div className="relative aspect-[16/9] w-full border-2 border-keyline bg-bone shadow-[var(--shadow-hard)]">
              <Image
                src={story.coverImageUrl}
                alt={story.coverImageAlt ?? story.title}
                fill
                priority
                sizes="(min-width: 1024px) 960px, 100vw"
                className="object-cover"
              />
            </div>
            <MediaDisclosure provenance={story.coverProvenance} />
          </figure>
        ) : null}

        {/* Body runs through the same sanitiser as editorial Markdown. */}
        <div
          className="tng-prose tng-measure mt-6"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Closing disclosure. Repeated at the end, where a reader arrives after
            the argument has been made. */}
        <aside className="mt-8 border-2 border-dashed border-tape bg-bone p-3.5 text-ink sm:p-4">
          <h2 className="font-display text-[0.6875rem] font-extrabold uppercase tracking-[0.14em]">
            Tentang konten ini
          </h2>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink/75">
            Artikel ini adalah advertorial: disusun bersama{" "}
            {story.partnerName} dan dibayar sebagai kerja sama. Klaim di dalamnya
            berasal dari partner dan tidak diverifikasi secara independen oleh
            redaksi. Liputan editorial TNG Daily tidak dapat dibeli, dan partner
            tidak memiliki akses ke rubrik Vibes, Suara, Hustle, atau Story.
          </p>
          <Link
            href="/tentang"
            className="group mt-3 inline-flex items-center gap-1.5 font-display text-[0.625rem] font-extrabold uppercase tracking-[0.1em] text-ink"
          >
            Cara kami kerja
            <ScribbleArrow className="h-2.5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </aside>
      </article>

      {others.length > 0 ? (
        <section
          aria-labelledby="other-partner-heading"
          className="mx-auto mt-8 max-w-5xl px-3 sm:px-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <ScribbleBracket className="h-5 w-2 text-tape" side="left" />
            <h2
              id="other-partner-heading"
              className="tng-display text-[1.125rem] leading-none sm:text-[1.25rem]"
            >
              PARTNER STORY LAINNYA
            </h2>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {others.map((item, index) => (
              <li key={item.id} className="flex">
                <PartnerCard story={item} index={index} className="w-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Wall>
  );
}
