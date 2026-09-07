import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { isDemoContentEnabled, isSupabaseConfigured } from "@/lib/env";
import {
  allowsMockContent,
  filterIndexable,
  filterPublishable,
} from "@/lib/content-environment";
import { getPublicSupabase, getServerSupabase } from "@/lib/supabase/server";
import {
  DEMO_ARTICLE_SUMMARIES,
  findDemoArticle,
} from "@/lib/data/demo";
import {
  ARTICLE_DETAIL_COLUMNS,
  ARTICLE_SUMMARY_COLUMNS,
  loadArticleRelations,
  mapArticleDetail,
  mapArticleSummary,
} from "@/lib/data/mappers";
import type {
  ArticleDetail,
  ArticleSummary,
  DataResult,
  Paginated,
} from "@/lib/data/types";
import { articleStatusLabel as labelForStatus } from "@/lib/labels";
import type { ArticleRow } from "@/types/database";
import type { ArticleStatus, Pillar } from "@/types/domain";

/**
 * Public article reads.
 *
 * Every function returns a `DataResult` carrying the data plus its origin, so a
 * page can distinguish "no articles yet" from "database not configured".
 */

export const FEED_PAGE_SIZE = 8;

interface PublishedQuery {
  pillar?: Pillar;
  tag?: string;
  limit?: number;
  offset?: number;
  excludeSlug?: string;
  search?: string;
}

function demoFiltered(query: PublishedQuery): ArticleSummary[] {
  // Fail closed: the demo module is entirely mock, so in production this returns
  // nothing even if a caller reaches it.
  let items = filterPublishable(DEMO_ARTICLE_SUMMARIES);
  if (query.pillar) items = items.filter((a) => a.pillar === query.pillar);
  if (query.tag) items = items.filter((a) => a.tags.includes(query.tag as string));
  if (query.excludeSlug) items = items.filter((a) => a.slug !== query.excludeSlug);
  if (query.search) {
    const needle = query.search.toLowerCase();
    items = items.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        (a.dek ?? "").toLowerCase().includes(needle),
    );
  }
  return items;
}

/** Published articles, newest first. */
export async function getPublishedArticles(
  query: PublishedQuery = {},
): Promise<DataResult<Paginated<ArticleSummary>>> {
  const limit = query.limit ?? FEED_PAGE_SIZE;
  const offset = query.offset ?? 0;

  if (!isSupabaseConfigured()) {
    if (!isDemoContentEnabled()) {
      return {
        data: { items: [], total: 0, page: 1, pageSize: limit, hasMore: false },
        source: "unconfigured",
      };
    }
    const all = demoFiltered(query);
    const items = all.slice(offset, offset + limit);
    return {
      data: {
        items,
        total: all.length,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        hasMore: offset + items.length < all.length,
      },
      source: "demo",
    };
  }

  const supabase = getPublicSupabase();
  if (!supabase) {
    return {
      data: { items: [], total: 0, page: 1, pageSize: limit, hasMore: false },
      source: "unconfigured",
    };
  }

  let builder = supabase
    .from("articles")
    .select(ARTICLE_SUMMARY_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    // Belt and braces: RLS already excludes mock rows from the anon role.
    .eq("is_mock", false)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.pillar) builder = builder.eq("pillar", query.pillar);
  if (query.tag) builder = builder.contains("tags", [query.tag]);
  if (query.excludeSlug) builder = builder.neq("slug", query.excludeSlug);
  if (query.search) {
    const escaped = query.search.replace(/[%,()]/g, " ").trim();
    if (escaped) builder = builder.ilike("title", `%${escaped}%`);
  }

  const { data, error, count } = await builder;

  if (error) {
    return {
      data: { items: [], total: 0, page: 1, pageSize: limit, hasMore: false },
      source: "supabase",
      error: error.message,
    };
  }

  const rows = (data ?? []) as unknown as ArticleRow[];
  const items = rows.map(mapArticleSummary);
  const total = count ?? items.length;

  return {
    data: {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: offset + items.length < total,
    },
    source: "supabase",
  };
}

export const getArticleBySlug = cache(async function getArticleBySlug(
  slug: string,
): Promise<DataResult<ArticleDetail | null>> {
  if (!isSupabaseConfigured()) {
    if (!isDemoContentEnabled()) return { data: null, source: "unconfigured" };
    // A mock article has no public URL in production, so this 404s there.
    const demo = findDemoArticle(slug);
    if (demo && !allowsMockContent()) return { data: null, source: "demo" };
    return { data: demo, source: "demo" };
  }

  const supabase = getPublicSupabase();
  if (!supabase) return { data: null, source: "unconfigured" };

  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_DETAIL_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .eq("is_mock", false)
    .maybeSingle();

  if (error) {
    return { data: null, source: "supabase", error: error.message };
  }
  if (!data) return { data: null, source: "supabase" };

  const row = data as unknown as ArticleRow;
  const { sources, images } = await loadArticleRelations(supabase, row.id);
  return { data: mapArticleDetail(row, sources, images), source: "supabase" };
});

/** Related articles: same pillar first, then shared tags. */
export async function getRelatedArticles(
  article: ArticleSummary,
  limit = 4,
): Promise<ArticleSummary[]> {
  const samePillar = await getPublishedArticles({
    pillar: article.pillar,
    excludeSlug: article.slug,
    limit,
  });

  if (samePillar.data.items.length >= limit) return samePillar.data.items;

  const fill = await getPublishedArticles({
    excludeSlug: article.slug,
    limit: limit * 2,
  });

  const seen = new Set(samePillar.data.items.map((a) => a.id));
  const merged = [...samePillar.data.items];
  for (const candidate of fill.data.items) {
    if (merged.length >= limit) break;
    if (seen.has(candidate.id)) continue;
    merged.push(candidate);
    seen.add(candidate.id);
  }
  return merged;
}

/**
 * Slugs and timestamps for the sitemap.
 *
 * Uses the stricter `filterIndexable` gate: mock content is excluded in every
 * environment, not just production. A staging sitemap that gets crawled makes
 * the same false claim as a production one.
 */
export const getPublishedSlugs = unstable_cache(
  async (): Promise<Array<{ slug: string; updatedAt: string }>> => {
    if (!isSupabaseConfigured()) {
      if (!isDemoContentEnabled()) return [];
      return filterIndexable(DEMO_ARTICLE_SUMMARIES).map((a) => ({
        slug: a.slug,
        updatedAt: a.updatedAt,
      }));
    }

    const supabase = getPublicSupabase();
    if (!supabase) return [];

    const { data } = await supabase
      .from("articles")
      .select("slug, updated_at")
      .eq("status", "published")
      .not("published_at", "is", null)
      .eq("is_mock", false)
      .order("published_at", { ascending: false })
      .limit(5000);

    return ((data ?? []) as Array<{ slug: string; updated_at: string }>).map(
      (row) => ({ slug: row.slug, updatedAt: row.updated_at }),
    );
  },
  ["published-slugs"],
  { revalidate: 900, tags: ["articles"] },
);

/**
 * Records a view. Uses the atomic SQL function so concurrent readers cannot
 * clobber each other's increment.
 */
export async function recordArticleView(articleId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await getServerSupabase();
  if (!supabase) return;
  await supabase.rpc("tng_increment_article_view", { p_article_id: articleId });
}

/** Reaction counts plus which reactions this session already made. */
export async function getSessionReactions(
  articleId: string,
  sessionId: string | null,
): Promise<{ like: boolean; save: boolean; share: boolean }> {
  const empty = { like: false, save: false, share: false };
  if (!sessionId || !isSupabaseConfigured()) return empty;

  const supabase = getPublicSupabase();
  if (!supabase) return empty;

  const { data } = await supabase
    .from("reactions")
    .select("type")
    .eq("article_id", articleId)
    .eq("session_id", sessionId);

  const rows = (data ?? []) as Array<{ type: keyof typeof empty }>;
  return rows.reduce(
    (acc, row) => ({ ...acc, [row.type]: true }),
    empty,
  );
}

export function articleStatusLabel(status: ArticleStatus): string {
  // Re-exported from the label module so callers do not need two imports.
  return labelForStatus(status);
}
