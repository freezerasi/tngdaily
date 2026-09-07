import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";
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
  ContributionView,
  DashboardStats,
  DataResult,
  Paginated,
} from "@/lib/data/types";
import type { ArticleRow, ContributionRow } from "@/types/database";
import type {
  ArticleStatus,
  ContributionStatus,
  Pillar,
} from "@/types/domain";

/**
 * Admin reads. Always go through the request-scoped client so RLS applies and
 * an editor can never see more than their role allows. Never cached: the CMS
 * must show current state.
 */

export interface AdminArticleQuery {
  status?: ArticleStatus | "all";
  pillar?: Pillar | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listArticlesForAdmin(
  query: AdminArticleQuery = {},
): Promise<DataResult<Paginated<ArticleSummary>>> {
  const pageSize = query.pageSize ?? 20;
  const page = Math.max(1, query.page ?? 1);
  const offset = (page - 1) * pageSize;

  const empty: Paginated<ArticleSummary> = {
    items: [],
    total: 0,
    page,
    pageSize,
    hasMore: false,
  };

  if (!isSupabaseConfigured()) return { data: empty, source: "unconfigured" };

  const supabase = await getServerSupabase();
  if (!supabase) return { data: empty, source: "unconfigured" };

  let builder = supabase
    .from("articles")
    .select(ARTICLE_SUMMARY_COLUMNS, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (query.status && query.status !== "all") {
    builder = builder.eq("status", query.status);
  }
  if (query.pillar && query.pillar !== "all") {
    builder = builder.eq("pillar", query.pillar);
  }
  if (query.search) {
    const escaped = query.search.replace(/[%,()]/g, " ").trim();
    if (escaped) builder = builder.ilike("title", `%${escaped}%`);
  }

  const { data, error, count } = await builder;
  if (error) return { data: empty, source: "supabase", error: error.message };

  const rows = (data ?? []) as unknown as ArticleRow[];
  const items = rows.map(mapArticleSummary);
  const total = count ?? items.length;

  return {
    data: {
      items,
      total,
      page,
      pageSize,
      hasMore: offset + items.length < total,
    },
    source: "supabase",
  };
}

export async function getArticleForAdmin(
  id: string,
): Promise<DataResult<ArticleDetail | null>> {
  if (!isSupabaseConfigured()) return { data: null, source: "unconfigured" };

  const supabase = await getServerSupabase();
  if (!supabase) return { data: null, source: "unconfigured" };

  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) return { data: null, source: "supabase", error: error.message };
  if (!data) return { data: null, source: "supabase" };

  const row = data as unknown as ArticleRow;
  const { sources, images } = await loadArticleRelations(supabase, row.id);
  return { data: mapArticleDetail(row, sources, images), source: "supabase" };
}

export async function listContributions(
  status: ContributionStatus | "all" = "pending",
): Promise<DataResult<ContributionView[]>> {
  if (!isSupabaseConfigured()) return { data: [], source: "unconfigured" };

  const supabase = await getServerSupabase();
  if (!supabase) return { data: [], source: "unconfigured" };

  let builder = supabase
    .from("contributions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") builder = builder.eq("status", status);

  const { data, error } = await builder;
  if (error) return { data: [], source: "supabase", error: error.message };

  const rows = (data ?? []) as ContributionRow[];
  return {
    data: rows.map((row) => ({
      id: row.id,
      contributorName: row.contributor_name,
      contributorContact: row.contributor_contact,
      title: row.title,
      content: row.content,
      pillar: row.pillar,
      location: row.location,
      mediaUrls: row.media_urls ?? [],
      consentPublish: row.consent_publish,
      consentEdit: row.consent_edit,
      status: row.status,
      moderationNote: row.moderation_note,
      reviewedAt: row.reviewed_at,
      publishedArticleId: row.published_article_id,
      createdAt: row.created_at,
    })),
    source: "supabase",
  };
}

export async function getDashboardStats(): Promise<DataResult<DashboardStats>> {
  const empty: DashboardStats = {
    publishedCount: 0,
    draftCount: 0,
    scheduledCount: 0,
    pendingContributions: 0,
    totalViews: 0,
    totalReactions: 0,
    aiRequests7d: 0,
    aiSuccessRate7d: 0,
  };

  if (!isSupabaseConfigured()) return { data: empty, source: "unconfigured" };

  const supabase = await getServerSupabase();
  if (!supabase) return { data: empty, source: "unconfigured" };

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [published, drafts, scheduled, pending, counters, aiLog] =
    await Promise.all([
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .in("status", ["draft", "needs_review"]),
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "scheduled"),
      supabase
        .from("contributions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("articles")
        .select("view_count, like_count, save_count, share_count")
        .eq("status", "published")
        .limit(1000),
      supabase
        .from("ai_usage_log")
        .select("success")
        .gte("created_at", sevenDaysAgo)
        .limit(2000),
    ]);

  const counterRows = (counters.data ?? []) as Array<{
    view_count: number;
    like_count: number;
    save_count: number;
    share_count: number;
  }>;

  const totalViews = counterRows.reduce((sum, row) => sum + row.view_count, 0);
  const totalReactions = counterRows.reduce(
    (sum, row) => sum + row.like_count + row.save_count + row.share_count,
    0,
  );

  const aiRows = (aiLog.data ?? []) as Array<{ success: boolean }>;
  const aiSuccess = aiRows.filter((row) => row.success).length;

  return {
    data: {
      publishedCount: published.count ?? 0,
      draftCount: drafts.count ?? 0,
      scheduledCount: scheduled.count ?? 0,
      pendingContributions: pending.count ?? 0,
      totalViews,
      totalReactions,
      aiRequests7d: aiRows.length,
      aiSuccessRate7d:
        aiRows.length === 0 ? 0 : Math.round((aiSuccess / aiRows.length) * 100),
    },
    source: "supabase",
  };
}

/** True when the slug is taken by a different article. */
export async function slugTaken(
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  const supabase = await getServerSupabase();
  if (!supabase) return false;

  let builder = supabase.from("articles").select("id").eq("slug", slug).limit(1);
  if (exceptId) builder = builder.neq("id", exceptId);

  const { data } = await builder;
  return (data ?? []).length > 0;
}
