import type { Metadata } from "next";

import { isEvidentiary, isIndexable } from "@/lib/content-environment";
import type { ArticleDetail, ArticleSummary } from "@/lib/data/types";
import { siteUrl } from "@/lib/env";
import { truncate } from "@/lib/utils";
import { PILLARS, PILLAR_META, type Pillar } from "@/types/domain";

export const SITE_NAME = "TNG Daily";
export const SITE_TAGLINE = "Media anak muda Tangerang Raya";
export const SITE_DESCRIPTION =
  "Kuliner, isu kota, loker, dan cerita warga Tangerang Raya. Ditulis untuk yang tinggal di sini, bukan untuk mesin pencari.";

const SITE_LOCALE = "id_ID";
const SITE_LANGUAGE = "id-ID";

export function absoluteUrl(path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${clean}`;
}

const ORGANIZATION_ID = absoluteUrl("/#organization");
const WEBSITE_ID = absoluteUrl("/#website");

const LOCAL_AREAS = [
  { "@type": "City", name: "Kota Tangerang" },
  { "@type": "City", name: "Tangerang Selatan" },
  { "@type": "AdministrativeArea", name: "Kabupaten Tangerang" },
] as const;

export function articleUrl(slug: string): string {
  return absoluteUrl(`/artikel/${slug}`);
}

export function defaultMetadata(): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${SITE_NAME} - ${SITE_TAGLINE}`,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    creator: SITE_NAME,
    publisher: SITE_NAME,
    referrer: "strict-origin-when-cross-origin",
    category: "news",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      url: siteUrl,
      title: `${SITE_NAME} - ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} - ${SITE_TAGLINE}`,
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
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
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
    keywords: [
      article.primaryKeyword,
      ...article.secondaryKeywords,
      ...article.tags,
    ].filter(Boolean) as string[],
    authors: article.authorName ? [{ name: article.authorName }] : undefined,
    openGraph: {
      type: "article",
      title,
      description: truncate(description, 200),
      url: absoluteUrl(canonical),
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
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
 * must never make that assertion.
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
    "@id": `${url}#article`,
    headline: truncate(article.title, 110),
    description: article.metaDescription ?? article.dek ?? article.excerpt ?? undefined,
    image: coverIsEvidentiary ? [article.coverImageUrl as string] : undefined,
    datePublished: article.publishedAt ?? article.createdAt,
    dateModified: article.updatedAt,
    wordCount: estimateWordCount(article.contentMarkdown),
    articleSection: PILLAR_META[article.pillar].label,
    keywords: article.tags.length > 0 ? article.tags.join(", ") : undefined,
    inLanguage: SITE_LANGUAGE,
    isPartOf: { "@id": WEBSITE_ID },
    about: article.tags.slice(0, 8).map((tag) => ({ "@type": "Thing", name: tag })),
    contentLocation: LOCAL_AREAS,
    author: {
      "@type": article.authorName ? "Person" : "Organization",
      name: article.authorName ?? SITE_NAME,
    },
    publisher: publisherJsonLd(),
    mainEntityOfPage: { "@type": "WebPage", "@id": `${url}#webpage` },
    url,
    isAccessibleForFree: true,
  };
}

export function breadcrumbJsonLd(
  article: ArticleSummary,
): Record<string, unknown> | null {
  if (!isIndexable(article)) return null;

  const meta = PILLAR_META[article.pillar];
  return pageBreadcrumbJsonLd([
    { name: SITE_NAME, path: "/" },
    { name: meta.label, path: `/${article.pillar}` },
    { name: article.title, path: `/artikel/${article.slug}` },
  ]);
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    areaServed: LOCAL_AREAS,
    logo: logoJsonLd(),
  };
}

export function newsMediaOrganizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: "TNG Daily",
    url: siteUrl,
    email: "redaksi@tngdaily.com",
    telephone: "+62-821-1481-2842",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Jl. Flamboyan Raya No. 4",
      addressLocality: "Karawaci",
      addressRegion: "Tangerang",
      addressCountry: "ID",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "editorial",
      email: "redaksi@tngdaily.com",
      telephone: "+62-821-1481-2842",
      areaServed: "ID",
      availableLanguage: ["Indonesian"],
    },
    ethicsPolicy: absoluteUrl("/kode-etik"),
    correctionsPolicy: absoluteUrl("/pedoman-redaksi"),
    privacyPolicy: absoluteUrl("/kebijakan-privasi"),
    publishingPrinciples: absoluteUrl("/pedoman-redaksi"),
  };
}

export function redaksiTeamJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        name: "Santika Reja",
        jobTitle: "Pemimpin Redaksi",
        worksFor: { "@type": "NewsMediaOrganization", name: "TNG Daily" },
        email: "redaksi@tngdaily.com",
      },
      {
        "@type": "Person",
        name: "Titis Yunita",
        jobTitle: "Redaktur Pelaksana",
        worksFor: { "@type": "NewsMediaOrganization", name: "TNG Daily" },
      },
      {
        "@type": "Person",
        name: "Maulidiani Nurani",
        jobTitle: "Redaktur Komunitas",
        worksFor: { "@type": "NewsMediaOrganization", name: "TNG Daily" },
      },
    ],
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    alternateName: SITE_TAGLINE,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function homePageJsonLd(
  articles: readonly ArticleSummary[] = [],
): Record<string, unknown> {
  return collectionPageJsonLd({
    path: "/",
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    items: articles,
    pageType: "WebPage",
  });
}

export function pillarPageJsonLd({
  pillar,
  articles = [],
  tag,
}: {
  pillar: Pillar;
  articles?: readonly ArticleSummary[];
  tag?: string;
}): Record<string, unknown> {
  const meta = PILLAR_META[pillar];
  const path = tag ? `/${pillar}/tag/${encodeURIComponent(tag)}` : `/${pillar}`;
  const title = tag
    ? `#${tag} di ${meta.label}`
    : `${meta.wordmark}: ${meta.tagline}`;
  const description = tag
    ? `Kumpulan artikel TNG Daily bertag #${tag} dalam rubrik ${meta.label}.`
    : meta.description;

  return jsonLdGraph([
    collectionPageJsonLd({
      path,
      title,
      description,
      items: articles,
      pageType: "CollectionPage",
    }),
    stripContext(
      pageBreadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: meta.label, path: `/${pillar}` },
        ...(tag ? [{ name: `#${tag}`, path }] : []),
      ]),
    ),
  ]);
}

export function staticPageJsonLd({
  path,
  title,
  description,
  breadcrumbName = title,
}: {
  path: string;
  title: string;
  description: string;
  breadcrumbName?: string;
}): Record<string, unknown> {
  return jsonLdGraph([
    {
      "@type": "WebPage",
      "@id": `${absoluteUrl(path)}#webpage`,
      url: absoluteUrl(path),
      name: title,
      description,
      inLanguage: SITE_LANGUAGE,
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORGANIZATION_ID },
    },
    stripContext(
      pageBreadcrumbJsonLd([
        { name: SITE_NAME, path: "/" },
        { name: breadcrumbName, path },
      ]),
    ),
  ]);
}

export function articleJsonLdGraph(
  article: ArticleDetail,
): Record<string, unknown> | null {
  const newsArticle = newsArticleJsonLd(article);
  const breadcrumb = breadcrumbJsonLd(article);
  if (!newsArticle || !breadcrumb) return null;

  const url = articleUrl(article.slug);
  return jsonLdGraph([
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: article.seoTitle ?? article.title,
      description:
        article.metaDescription ?? article.dek ?? article.excerpt ?? undefined,
      inLanguage: SITE_LANGUAGE,
      isPartOf: { "@id": WEBSITE_ID },
      breadcrumb: { "@id": `${url}#breadcrumb` },
      primaryImageOfPage: article.coverImageUrl
        ? { "@type": "ImageObject", url: article.coverImageUrl }
        : undefined,
      mainEntity: { "@id": `${url}#article` },
    },
    { ...stripContext(breadcrumb), "@id": `${url}#breadcrumb` },
    stripContext(newsArticle),
  ]);
}

export function pageBreadcrumbJsonLd(
  items: readonly { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function collectionPageJsonLd({
  path,
  title,
  description,
  items,
  pageType,
}: {
  path: string;
  title: string;
  description: string;
  items: readonly ArticleSummary[];
  pageType: "WebPage" | "CollectionPage";
}): Record<string, unknown> {
  const url = absoluteUrl(path);
  const listItems = items.filter(isIndexable).slice(0, 10).map((article, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: articleUrl(article.slug),
    name: article.title,
  }));

  return {
    "@context": "https://schema.org",
    "@type": pageType,
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: SITE_LANGUAGE,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
    about: PILLARS.map((pillar) => ({
      "@type": "Thing",
      name: PILLAR_META[pillar].label,
    })),
    mainEntity:
      listItems.length > 0
        ? {
            "@type": "ItemList",
            numberOfItems: listItems.length,
            itemListElement: listItems,
          }
        : undefined,
  };
}

function jsonLdGraph(graph: readonly Record<string, unknown>[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": graph.map(stripContext),
  };
}

function stripContext(entry: Record<string, unknown>): Record<string, unknown> {
  const { "@context": _context, ...rest } = entry;
  return rest;
}

function publisherJsonLd(): Record<string, unknown> {
  return {
    "@type": "NewsMediaOrganization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: siteUrl,
    logo: logoJsonLd(),
  };
}

function logoJsonLd(): Record<string, unknown> {
  return {
    "@type": "ImageObject",
    url: absoluteUrl("/icon.svg"),
    width: 512,
    height: 512,
  };
}

function estimateWordCount(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}
