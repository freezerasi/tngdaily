import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, MessageCircle } from "lucide-react";

import { ArticleReactionDock } from "@/components/public/article-reaction-dock";
import { ArticleShareButtons } from "@/components/public/article-share-buttons";
import { RelatedLandscapeCard } from "@/components/public/related-landscape-card";
import { BannerPanel, Wall } from "@/components/shared/banner-panel";
import { Hem, ReadCost } from "@/components/shared/banner-parts";
import { MediaDisclosure, MediaStatusBadge } from "@/components/shared/media-provenance";
import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";
import {
  getArticleBySlug,
  getRelatedArticles,
  getSessionReactions,
} from "@/lib/data/articles";
import { formatDateLong, formatFeedTime } from "@/lib/dates";
import { articleJsonLdGraph, articleMetadata, articleUrl } from "@/lib/seo";
import { readSessionId } from "@/lib/security/session";
import { PILLAR_INK, onPanelText } from "@/lib/pillar-ink";
import { cn } from "@/lib/utils";
import { PILLAR_META } from "@/types/domain";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getArticleBySlug(slug);
  if (!data) {
    return { title: "Artikel tidak ditemukan", robots: { index: false, follow: false } };
  }
  return articleMetadata(data);
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const { data: article } = await getArticleBySlug(slug);
  if (!article) notFound();

  const sessionId = await readSessionId();
  const [related, reactions] = await Promise.all([
    getRelatedArticles(article, 6),
    getSessionReactions(article.id, sessionId),
  ]);

  const ink = PILLAR_INK[article.pillar];
  const text = onPanelText(article.pillar);
  const url = articleUrl(article.slug);

  // Null for mock content: no structured data is emitted for a fixture.
  const articleGraph = articleJsonLdGraph(article);

  return (
    <Wall className="pb-24 lg:pb-8">
      {articleGraph ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleGraph) }}
        />
      ) : null}

      {/* Masthead banner in the pillar's own material. */}
      <article>
        <header className="px-2 pt-3">
          <BannerPanel
            ink={ink.panel}
            lift="lg"
            grommets
            grommetInset="0.5rem"
            className="overflow-hidden"
          >
            <Hem edge="top" className={text.rule}>
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 pt-4">
                <Link href={`/${article.pillar}`} className="rounded-[1px]">
                  <TapePatch tone={ink.patch} tilt="left">
                    {PILLAR_META[article.pillar].label}
                  </TapePatch>
                </Link>
                {article.isSample ? (
                  <TapePatch tone="tape" tilt="right" size="sm">
                    Artikel contoh
                  </TapePatch>
                ) : null}
                <span className="ml-auto">
                  <ReadCost
                    minutes={article.readingMinutes}
                    tone={ink.onPanel === "ink" ? "ink" : "bone"}
                  />
                </span>
              </div>
            </Hem>

            <div className="px-4 py-5 sm:px-6 sm:py-7">
              <h1
                className={cn(
                  "tng-display text-[2.3rem] leading-[0.92] sm:text-[3.15rem]",
                  text.heading,
                )}
              >
                {article.title}
              </h1>

              {article.dek ? (
                <p
                  className={cn(
                    "tng-measure mt-3 text-base leading-relaxed sm:text-lg",
                    text.body,
                  )}
                >
                  {article.dek}
                </p>
              ) : null}

              <dl
                className={cn(
                  "mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t-2 pt-3 text-[0.8125rem]",
                  text.rule,
                  text.muted,
                )}
              >
                <div className="flex items-baseline gap-1.5">
                  <dt className="tng-label text-[0.5625rem]">Penulis</dt>
                  <dd className="font-semibold">
                    {article.authorName?.trim() || "Redaksi TNG Daily"}
                  </dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <dt className="tng-label text-[0.5625rem]">Terbit</dt>
                  <dd>
                    <time dateTime={article.publishedAt ?? undefined}>
                      {formatDateLong(article.publishedAt)}
                    </time>
                  </dd>
                </div>
                {article.updatedAt !== article.publishedAt ? (
                  <div className="flex items-baseline gap-1.5">
                    <dt className="tng-label text-[0.5625rem]">Diperbarui</dt>
                    <dd>
                      <time dateTime={article.updatedAt}>
                        {formatFeedTime(article.updatedAt)}
                      </time>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </BannerPanel>
        </header>

        {/* Cover image with provenance. The disclosure sits directly under the
            frame, visible to every reader and to assistive tech. */}
        {article.coverImageUrl ? (
          <figure className="px-2 pt-3">
            <div className="relative aspect-[16/9] w-full border-2 border-keyline shadow-[var(--shadow-hard)]">
              <Image
                src={article.coverImageUrl}
                alt={article.coverImageAlt ?? "Gambar tanpa deskripsi."}
                fill
                priority
                sizes="(min-width: 1024px) 960px, 100vw"
                className="object-cover"
              />
              <MediaStatusBadge
                provenance={article.coverProvenance}
                className="absolute left-2 top-2 z-10"
              />
            </div>
            <MediaDisclosure
              provenance={article.coverProvenance}
              caption={article.coverImageCredit}
              className="px-1"
            />
          </figure>
        ) : null}

        {/* Body. Sanitised on the server before it ever reaches this render.
            `tng-rail-hang` keeps the running text clear of the registration
            rail, and the column hangs off that rail rather than centring, so
            the wall reserve sits on one side the way it does on every panel. */}
        <div className="tng-rail-hang pt-6">
          <div
            className="tng-prose tng-measure"
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
          />
        </div>

        {article.tags.length > 0 ? (
          <div className="tng-rail-hang pt-7">
            <div className="tng-measure">
              <h2 className="tng-label text-muted">Tag</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <li key={tag}>
                    <Link
                      href={`/${article.pillar}/tag/${encodeURIComponent(tag)}`}
                      className="inline-flex h-8 items-center rounded-[2px] border-2 border-line bg-surface px-2.5 text-[0.75rem] font-semibold lowercase text-muted hover:border-keyline hover:text-foreground"
                    >
                      #{tag}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {/* Attribution panel: sources stay visible, per the editorial standard. */}
        {article.sources.length > 0 ? (
          <div className="px-2 pt-7">
            <BannerPanel ink="deep" lift="sm" className="p-4">
              <TapePatch tone="tape" tilt="left">
                Sumber
              </TapePatch>
              <ul className="mt-3 grid gap-2.5">
                {article.sources.map((source) => (
                  <li key={source.id} className="border-l-2 border-line pl-3">
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noopener nofollow"
                      className="inline-flex items-center gap-1.5 font-display text-sm font-extrabold text-lime hover:underline hover:decoration-2 hover:underline-offset-4"
                    >
                      {source.sourceName}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-3.5"
                        strokeWidth={3}
                      />
                    </a>
                    {source.attributionText ? (
                      <p className="mt-1 text-[0.8125rem] leading-snug text-muted">
                        {source.attributionText}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </BannerPanel>
          </div>
        ) : null}

        {/* Share buttons */}
        <div className="px-2">
          <ArticleShareButtons
            title={article.title}
            url={url}
          />
        </div>
      </article>

      {/* Channel + contribution CTAs, out of the reading column. */}
      <section className="grid gap-2 px-2 pt-4 sm:grid-cols-2">
        <BannerPanel ink="deep" lift="sm" className="border-lime p-4">
          <TapePatch tone="lime" tilt="left">
            Ikuti
          </TapePatch>
          <h2 className="tng-display-tight mt-3 text-lg">
            Dapat kabar Tangerang lewat WhatsApp Channel
          </h2>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
            Satu kiriman per hari, tanpa spam. Kalau channel belum aktif, tombol
            ini akan mengarah ke halaman tentang.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/tentang-kami#kanal">
              <MessageCircle aria-hidden="true" />
              Lihat kanal
            </Link>
          </Button>
        </BannerPanel>

        <BannerPanel ink="deep" lift="sm" className="border-orange p-4">
          <TapePatch tone="orange" tilt="right">
            Kirim cerita
          </TapePatch>
          <h2 className="tng-display-tight mt-3 text-lg">
            Kamu punya versi lain dari cerita ini?
          </h2>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
            Kirim ke kami. Semua kiriman lewat moderasi editor sebelum tayang,
            dan kamu bisa pakai nama pena.
          </p>
          <Button asChild variant="secondary" size="sm" className="mt-3">
            <Link href="/kirim-berita">Tulis kiriman</Link>
          </Button>
        </BannerPanel>
      </section>

      {/* Related Articles — Landscape Cards with Thumbnails (up to 6) */}
      {related.length > 0 ? (
        <section className="px-2 pt-4">
          <div className="tng-section-head mb-3">
            <h2 className="tng-display text-xl sm:text-2xl">Lanjut baca</h2>
            <span aria-hidden="true" className="h-[2px] flex-1 bg-line" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 items-stretch">
            {related.map((item) => (
              <RelatedLandscapeCard key={item.id} article={item} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Thumb-zone dock. Appears once the reader starts scrolling. */}
      <ArticleReactionDock
        articleId={article.id}
        articleTitle={article.title}
        articleUrl={url}
        counts={{
          like: article.counts.like,
          save: article.counts.save,
          share: article.counts.share,
        }}
        active={reactions}
      />
    </Wall>
  );
}
