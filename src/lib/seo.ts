import type { Metadata } from "next";

import { siteUrl } from "@/lib/env";
import { isEvidentiary, isIndexable } from "@/lib/content-environment";
import type { ArticleDetail, ArticleSummary } from "@/lib/data/types";
import { PILLAR_META, type Pillar } from "@/types/domain";
import { truncate } from "@/lib/utils";

export const SITE_NAME = "TNG Daily";
export const SITE_TAGLINE = "Media anak muda Tangerang Raya";
export const SITE_DESCRIPTION =
  "Kuliner, isu kota, loker, dan cerita warga Tangerang Raya. Ditulis untuk yang tinggal di sini, bukan untuk mesin pencari.";

export function absoluteUrl(path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${clean}`;
}

export function articleUrl(slug: string): string {
  return absoluteUrl(`/artikel/${slug}`);
}

export function defaultMetadata(): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${SITE_NAME} — ${SITE_TAGLINE}`,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    referrer: "strict-origin-when-cross-origin",
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "id_ID",
      url: siteUrl,
      title: `${SITE_NAME} — ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    },
  };
}

export function pillarMetadata(pillar: Pillar): Metadata {
  const meta = PILLAR_META[pillar];
  const title = `${meta.wordmark}: ${meta.tagline}`;
  return {
    title,
    description: meta.description,
    alternates: { canonical: `/${pillar}` },
    openGraph: {
      type: "website",
      title,
      description: meta.description,
      url: absoluteUrl(`/${pillar}`),
      images: [{ url: absoluteUrl(`/${pillar}/opengraph-image`) }],
    },
    twitter: { card: "summary_large_image", title, description: meta.description },
  };
}

export function articleMetadata(article: ArticleDetail): Metadata {
  const title = article.seoTitle ?? article.title;
  const description =
    article.metaDescription ?? article.dek ?? article.excerpt ?? SITE_DESCRIPTION;
  const canonical = `/artikel/${article.slug}`;

  /*
   * Mock content never enters a machine-readable surface. It gets no canonical,
   * no Open Graph card, and an explicit noindex, so a shared staging link cannot
   * present a development fixture as published reporting.
   */
  if (!isIndexable(article)) {
    return {
      title,
      description: truncate(description, 200),
      robots: { index: false, follow: false, nocache: true },
      alternates: {},
    };
  }

  /*
   * The OG image is only the article's own cover when that cover is real. A
   * placeholder or an illustration would be shared as though it documented the
   * story, with no room for a disclosure, so those fall back to the generated
   * branded card instead.
   */
  const coverIsEvidentiary =
    article.coverImageUrl !== null &&
    article.coverProvenance !== null &&
    isEvidentiary(article.coverProvenance);

  const ogImage = coverIsEvidentiary
    ? (article.coverImageUrl as string)
    : absoluteUrl(`${canonical}/opengraph-image`);

  return {
    title,
    description: truncate(description, 200),
    alternates: { canonical },
    keywords: article.tags.length > 0 ? article.tags : undefined,
    authors: article.authorName ? [{ name: article.authorName }] : undefined,
    openGraph: {
      type: "article",
      title,
      description: truncate(description, 200),
      url: absoluteUrl(canonical),
      siteName: SITE_NAME,
      locale: "id_ID",
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt,
      authors: article.authorName ? [article.authorName] : undefined,
      section: PILLAR_META[article.pillar].label,
      tags: article.tags,
      images: [
        {
          url: ogImage,
          alt: coverIsEvidentiary
            ? (article.coverImageAlt ?? title)
            : `Kartu berbagi TNG Daily untuk ${article.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: truncate(description, 200),
      images: [ogImage],
    },
  };
}

/**
 * NewsArticle JSON-LD.
 *
 * Returns null for mock content: a structured-data graph is a machine-readable
 * assertion that this article exists as reporting, and a development fixture
 * must never make that assertion. The caller renders nothing when null.
 *
 * `image` is only emitted when the cover actually documents something. Google
 * treats a NewsArticle image as depicting the story, and there is no field in
 * which to disclose that a frame is an illustration.
 */
export function newsArticleJsonLd(
  article: ArticleDetail,
): Record<string, unknown> | null {
  if (!isIndexable(article)) return null;

  const url = articleUrl(article.slug);
  const coverIsEvidentiary =
    article.coverImageUrl !== null &&
    article.coverProvenance !== null &&
    isEvidentiary(article.coverProvenance);

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: truncate(article.title, 110),
    description: article.metaDescription ?? article.dek ?? article.excerpt ?? undefined,
    image: coverIsEvidentiary ? [article.coverImageUrl as string] : undefined,
    datePublished: article.publishedAt ?? article.createdAt,
    dateModified: article.updatedAt,
    articleSection: PILLAR_META[article.pillar].label,
    keywords: article.tags.length > 0 ? article.tags.join(", ") : undefined,
    inLanguage: "id-ID",
    author: {
      "@type": article.authorName ? "Person" : "Organization",
      name: article.authorName ?? SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/icon.svg"),
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    isAccessibleForFree: true,
  };
}

export function breadcrumbJsonLd(
  article: ArticleSummary,
): Record<string, unknown> | null {
  if (!isIndexable(article)) return null;

  const meta = PILLAR_META[article.pillar];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: meta.label,
        item: absoluteUrl(`/${article.pillar}`),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: articleUrl(article.slug),
      },
    ],
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: SITE_NAME,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    areaServed: [
      { "@type": "City", name: "Kota Tangerang" },
      { "@type": "City", name: "Tangerang Selatan" },
      { "@type": "AdministrativeArea", name: "Kabupaten Tangerang" },
    ],
    logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") },
  };
}
