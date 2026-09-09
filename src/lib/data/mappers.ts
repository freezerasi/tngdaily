import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildExcerpt, readingMinutes, renderMarkdown } from "@/lib/content";
import { normaliseProvenance } from "@/lib/content-environment";
import type {
  ArticleDetail,
  ArticleImageView,
  ArticleSourceView,
  ArticleSummary,
} from "@/lib/data/types";
import type {
  ArticleImageRow,
  ArticleRow,
  ArticleSourceRow,
} from "@/types/database";
import {
  isArticleSchemaType,
  isArticleStatus,
  isMediaSourceType,
  isPillar,
  type MediaProvenance,
} from "@/types/domain";

/**
 * Row to view-model mapping. Kept in one place so the Supabase adapter and the
 * demo adapter cannot diverge in shape.
 */

export const ARTICLE_SUMMARY_COLUMNS = [
  "id",
  "title",
  "slug",
  "dek",
  "excerpt",
  "cover_image_url",
  "cover_image_alt",
  "pillar",
  "tags",
  "status",
  "author_name",
  "published_at",
  "scheduled_at",
  "created_at",
  "updated_at",
  "reading_minutes",
  "is_sample",
  "generated_by_ai",
  "view_count",
  "like_count",
  "save_count",
  "share_count",
].join(", ");

export const ARTICLE_DETAIL_COLUMNS = `${ARTICLE_SUMMARY_COLUMNS}, content_markdown, cover_image_credit, cover_media_source_type, cover_media_credit, cover_media_disclosure, cover_depicts_actual_location, cover_depicts_actual_event, seo_title, meta_description, primary_keyword, secondary_keywords, schema_type, ai_provider_used, source_rewrite_job_id`;

type SummaryRow = Pick<
  ArticleRow,
  | "id"
  | "title"
  | "slug"
  | "dek"
  | "excerpt"
  | "cover_image_url"
  | "cover_image_alt"
  | "pillar"
  | "tags"
  | "status"
  | "author_name"
  | "published_at"
  | "scheduled_at"
  | "created_at"
  | "updated_at"
  | "reading_minutes"
  | "is_sample"
  | "generated_by_ai"
  | "view_count"
  | "like_count"
  | "save_count"
  | "share_count"
> &
  Partial<
    Pick<
      ArticleRow,
      | "cover_media_source_type"
      | "cover_media_credit"
      | "cover_media_disclosure"
      | "cover_depicts_actual_location"
      | "cover_depicts_actual_event"
    >
  >;

/**
 * Builds cover provenance from the row.
 *
 * A published row with no recorded source type is treated as a licensed photo
 * with an incomplete credit, not as an illustration: guessing "AI" for real
 * newsroom photography would be its own false claim. The missing credit is
 * visible in the UI, which is the correct prompt to go and fill it in.
 */
function mapCoverProvenance(row: SummaryRow): MediaProvenance | null {
  if (!row.cover_image_url) return null;

  return normaliseProvenance({
    sourceType: isMediaSourceType(row.cover_media_source_type)
      ? row.cover_media_source_type
      : "licensed_photo",
    ...(row.cover_media_credit ? { credit: row.cover_media_credit } : {}),
    ...(row.cover_media_disclosure
      ? { disclosure: row.cover_media_disclosure }
      : {}),
    depictsActualLocation: row.cover_depicts_actual_location ?? false,
    depictsActualEvent: row.cover_depicts_actual_event ?? false,
  });
}

export function mapArticleSummary(row: SummaryRow): ArticleSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    dek: row.dek,
    excerpt: row.excerpt,
    coverImageUrl: row.cover_image_url,
    coverImageAlt: row.cover_image_alt,
    coverProvenance: mapCoverProvenance(row),
    // Rows from the database are real content. Only the bundled demo module
    // produces mock items.
    isMock: false,
    pillar: isPillar(row.pillar) ? row.pillar : "vibes",
    tags: row.tags ?? [],
    status: isArticleStatus(row.status) ? row.status : "draft",
    authorName: row.author_name,
    publishedAt: row.published_at,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readingMinutes: row.reading_minutes ?? 1,
    isSample: row.is_sample,
    generatedByAi: row.generated_by_ai,
    counts: {
      view: row.view_count,
      like: row.like_count,
      save: row.save_count,
      share: row.share_count,
    },
  };
}

export function mapArticleSource(row: ArticleSourceRow): ArticleSourceView {
  return {
    id: row.id,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    attributionText: row.attribution_text,
    sourceType: row.source_type,
  };
}

export function mapArticleImage(row: ArticleImageRow): ArticleImageView {
  return {
    id: row.id,
    url: row.url,
    altText: row.alt_text,
    caption: row.caption,
    source: row.source,
    photographerName: row.photographer_name,
    photographerUrl: row.photographer_url,
    attributionText: row.attribution_text,
    originalSourceUrl: row.original_source_url,
    cloudinaryPublicId: row.cloudinary_public_id,
    isCover: row.is_cover,
  };
}

export function mapArticleDetail(
  row: ArticleRow,
  sources: ArticleSourceRow[],
  images: ArticleImageRow[],
): ArticleDetail {
  const markdown = row.content_markdown ?? "";
  return {
    ...mapArticleSummary(row),
    excerpt: row.excerpt ?? buildExcerpt(markdown),
    readingMinutes: row.reading_minutes ?? readingMinutes(markdown),
    contentMarkdown: markdown,
    contentHtml: renderMarkdown(markdown),
    coverImageCredit: row.cover_image_credit,
    seoTitle: row.seo_title,
    metaDescription: row.meta_description,
    primaryKeyword: row.primary_keyword,
    secondaryKeywords: row.secondary_keywords ?? [],
    schemaType: isArticleSchemaType(row.schema_type)
      ? row.schema_type
      : "NewsArticle",
    aiProviderUsed: row.ai_provider_used,
    sourceRewriteJobId: row.source_rewrite_job_id,
    sources: sources.map(mapArticleSource),
    images: images.map(mapArticleImage),
  };
}

/** Loads sources and images for one article in parallel. */
export async function loadArticleRelations(
  supabase: SupabaseClient,
  articleId: string,
): Promise<{ sources: ArticleSourceRow[]; images: ArticleImageRow[] }> {
  const [sourcesResult, imagesResult] = await Promise.all([
    supabase
      .from("article_sources")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: true }),
    supabase
      .from("article_images")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: true }),
  ]);

  return {
    sources: (sourcesResult.data as ArticleSourceRow[] | null) ?? [],
    images: (imagesResult.data as ArticleImageRow[] | null) ?? [],
  };
}
