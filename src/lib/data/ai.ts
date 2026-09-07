import "server-only";

import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";
import type {
  AiApiKeyView,
  AiModelView,
  AiProviderView,
  AiTaskModelSettingView,
  AiUsageLogView,
  AiUsageStats,
  DataResult,
  GenerationJobView,
  RewriteJobView,
} from "@/lib/data/types";
import type {
  AiApiKeyRow,
  AiGenerationJobRow,
  AiModelRow,
  AiProviderRow,
  AiTaskModelRow,
  AiUsageLogRow,
  RewriteJobRow,
} from "@/types/database";
import type { AiJobStatus, AiTaskType } from "@/types/domain";

/**
 * AI configuration reads.
 *
 * `ai_api_keys` has no policy for the `authenticated` role, so key metadata is
 * read with the service role here after the caller's admin role has already been
 * verified by the page or route. The vault reference never leaves this module.
 */

function mapKey(row: AiApiKeyRow): AiApiKeyView {
  return {
    id: row.id,
    providerId: row.provider_id,
    keyLabel: row.key_label,
    keyPreview: row.key_preview,
    priority: row.priority,
    status: row.status,
    lastUsedAt: row.last_used_at,
    lastError: row.last_error,
  };
}

function mapModel(
  row: AiModelRow,
  providerName: string,
): AiModelView {
  return {
    id: row.id,
    providerId: row.provider_id,
    providerName,
    modelKey: row.model_key,
    displayName: row.display_name,
    isEnabled: row.is_enabled,
    source: row.source,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
  };
}

export async function listProvidersWithKeys(): Promise<
  DataResult<AiProviderView[]>
> {
  if (!isSupabaseConfigured()) return { data: [], source: "unconfigured" };

  const scoped = await getServerSupabase();
  if (!scoped) return { data: [], source: "unconfigured" };

  const { data: providerRows, error } = await scoped
    .from("ai_providers")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return { data: [], source: "supabase", error: error.message };

  const providers = (providerRows as AiProviderRow[] | null) ?? [];
  if (providers.length === 0) return { data: [], source: "supabase" };

  const admin = getAdminSupabase();
  const keys: AiApiKeyRow[] = admin
    ? (((
        await admin
          .from("ai_api_keys")
          .select(
            "id, provider_id, key_label, key_preview, priority, status, last_used_at, last_error, created_at, updated_at, vault_secret_id",
          )
          .order("priority", { ascending: true })
      ).data as AiApiKeyRow[] | null) ?? [])
    : [];
  const models: AiModelRow[] = admin
    ? (((
        await admin
          .from("ai_models")
          .select("*")
          .in(
            "provider_id",
            providers.map((provider) => provider.id),
          )
          .order("model_key", { ascending: true })
      ).data as AiModelRow[] | null) ?? [])
    : [];

  return {
    data: providers.map((provider) => {
      const providerModels = models
        .filter((model) => model.provider_id === provider.id)
        .map((model) => mapModel(model, provider.name));

      return {
        id: provider.id,
        name: provider.name,
        baseUrl: provider.base_url,
        defaultModel: provider.default_model,
        isActive: provider.is_active,
        notes: provider.notes,
        createdAt: provider.created_at,
        keys: keys
          .filter((key) => key.provider_id === provider.id)
          .map(mapKey),
        models: providerModels,
      };
    }),
    source: "supabase",
  };
}

export async function listTaskModelSettings(): Promise<
  DataResult<AiTaskModelSettingView[]>
> {
  if (!isSupabaseConfigured()) return { data: [], source: "unconfigured" };

  const admin = getAdminSupabase();
  if (!admin) return { data: [], source: "supabase" };

  const { data: routeRows, error } = await admin
    .from("ai_task_models")
    .select("*")
    .eq("is_enabled", true)
    .order("task_type", { ascending: true })
    .order("priority", { ascending: true });

  if (error) return { data: [], source: "supabase", error: error.message };

  const routes = (routeRows as AiTaskModelRow[] | null) ?? [];
  if (routes.length === 0) return { data: [], source: "supabase" };

  const modelIds = Array.from(new Set(routes.map((route) => route.model_id)));
  const { data: modelRows, error: modelError } = await admin
    .from("ai_models")
    .select("*")
    .in("id", modelIds);

  if (modelError) {
    return { data: [], source: "supabase", error: modelError.message };
  }

  const models = (modelRows as AiModelRow[] | null) ?? [];
  const providerIds = Array.from(new Set(models.map((model) => model.provider_id)));
  const { data: providerRows, error: providerError } = await admin
    .from("ai_providers")
    .select("id, name")
    .in("id", providerIds);

  if (providerError) {
    return { data: [], source: "supabase", error: providerError.message };
  }

  const modelById = new Map(models.map((model) => [model.id, model]));
  const providerNameById = new Map(
    ((providerRows as Array<{ id: string; name: string }> | null) ?? []).map(
      (provider) => [provider.id, provider.name],
    ),
  );
  const grouped = new Map<AiTaskType, AiTaskModelSettingView["models"]>();

  for (const route of routes) {
    const model = modelById.get(route.model_id);
    if (!model) continue;
    const providerName = providerNameById.get(model.provider_id) ?? "Provider";
    const bucket = grouped.get(route.task_type) ?? [];
    bucket.push({
      id: route.id,
      taskType: route.task_type,
      modelId: model.id,
      modelKey: model.model_key,
      providerId: model.provider_id,
      providerName,
      priority: route.priority,
      isEnabled: route.is_enabled,
    });
    grouped.set(route.task_type, bucket);
  }

  return {
    data: Array.from(grouped.entries()).map(([taskType, settingModels]) => ({
      taskType,
      models: settingModels.sort((a, b) => a.priority - b.priority),
    })),
    source: "supabase",
  };
}

export async function listUsageLog(
  limit = 40,
): Promise<DataResult<AiUsageLogView[]>> {
  if (!isSupabaseConfigured()) return { data: [], source: "unconfigured" };

  const scoped = await getServerSupabase();
  if (!scoped) return { data: [], source: "unconfigured" };

  const { data, error } = await scoped
    .from("ai_usage_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], source: "supabase", error: error.message };

  const rows = (data as AiUsageLogRow[] | null) ?? [];
  return {
    data: rows.map((row) => ({
      id: row.id,
      providerName: row.provider_name,
      taskType: row.task_type,
      model: row.model,
      tokensUsed: row.tokens_used,
      latencyMs: row.latency_ms,
      success: row.success,
      statusCode: row.status_code,
      errorCode: row.error_code,
      attempt: row.attempt,
      createdAt: row.created_at,
    })),
    source: "supabase",
  };
}

export async function getUsageStats(
  days = 7,
): Promise<DataResult<AiUsageStats>> {
  const empty: AiUsageStats = {
    totalRequests: 0,
    successRate: 0,
    averageLatencyMs: 0,
    totalTokens: 0,
    perProvider: [],
  };

  if (!isSupabaseConfigured()) return { data: empty, source: "unconfigured" };

  const scoped = await getServerSupabase();
  if (!scoped) return { data: empty, source: "unconfigured" };

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await scoped
    .from("ai_usage_log")
    .select("provider_name, success, latency_ms, tokens_used")
    .gte("created_at", since)
    .limit(5000);

  if (error) return { data: empty, source: "supabase", error: error.message };

  const rows = (data ?? []) as Array<{
    provider_name: string | null;
    success: boolean;
    latency_ms: number | null;
    tokens_used: number | null;
  }>;

  if (rows.length === 0) return { data: empty, source: "supabase" };

  const grouped = new Map<
    string,
    { requests: number; success: number; latency: number; latencyCount: number }
  >();

  let totalLatency = 0;
  let latencySamples = 0;
  let totalTokens = 0;
  let successCount = 0;

  for (const row of rows) {
    const provider = row.provider_name ?? "Tidak diketahui";
    const bucket =
      grouped.get(provider) ??
      { requests: 0, success: 0, latency: 0, latencyCount: 0 };

    bucket.requests += 1;
    if (row.success) {
      bucket.success += 1;
      successCount += 1;
    }
    if (typeof row.latency_ms === "number") {
      bucket.latency += row.latency_ms;
      bucket.latencyCount += 1;
      totalLatency += row.latency_ms;
      latencySamples += 1;
    }
    totalTokens += row.tokens_used ?? 0;
    grouped.set(provider, bucket);
  }

  return {
    data: {
      totalRequests: rows.length,
      successRate: Math.round((successCount / rows.length) * 100),
      averageLatencyMs:
        latencySamples === 0 ? 0 : Math.round(totalLatency / latencySamples),
      totalTokens,
      perProvider: Array.from(grouped.entries())
        .map(([providerName, bucket]) => ({
          providerName,
          requests: bucket.requests,
          successRate: Math.round((bucket.success / bucket.requests) * 100),
          averageLatencyMs:
            bucket.latencyCount === 0
              ? 0
              : Math.round(bucket.latency / bucket.latencyCount),
        }))
        .sort((a, b) => b.requests - a.requests),
    },
    source: "supabase",
  };
}

function mapJob(row: AiGenerationJobRow): GenerationJobView {
  return {
    id: row.id,
    sessionKey: row.session_key,
    articleId: row.article_id,
    taskType: row.task_type,
    status: row.status,
    input: row.input,
    output: row.output,
    promptTemplateKey: row.prompt_template_key,
    promptVersion: row.prompt_version,
    providerName: row.provider_name,
    model: row.model,
    latencyMs: row.latency_ms,
    revision: row.revision,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Latest revision per task for one Content Studio session. */
export async function getStudioSession(
  sessionKey: string,
): Promise<DataResult<GenerationJobView[]>> {
  if (!isSupabaseConfigured()) return { data: [], source: "unconfigured" };

  const scoped = await getServerSupabase();
  if (!scoped) return { data: [], source: "unconfigured" };

  const { data, error } = await scoped
    .from("ai_generation_jobs")
    .select("*")
    .eq("session_key", sessionKey)
    .order("created_at", { ascending: true })
    .limit(60);

  if (error) return { data: [], source: "supabase", error: error.message };

  return {
    data: ((data as AiGenerationJobRow[] | null) ?? []).map(mapJob),
    source: "supabase",
  };
}

export async function listRecentStudioSessions(
  limit = 10,
): Promise<DataResult<GenerationJobView[]>> {
  if (!isSupabaseConfigured()) return { data: [], source: "unconfigured" };

  const scoped = await getServerSupabase();
  if (!scoped) return { data: [], source: "unconfigured" };

  const { data, error } = await scoped
    .from("ai_generation_jobs")
    .select("*")
    .not("session_key", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit * 6);

  if (error) return { data: [], source: "supabase", error: error.message };

  const rows = ((data as AiGenerationJobRow[] | null) ?? []).map(mapJob);
  const seen = new Set<string>();
  const latest: GenerationJobView[] = [];

  for (const job of rows) {
    if (!job.sessionKey || seen.has(job.sessionKey)) continue;
    seen.add(job.sessionKey);
    latest.push(job);
    if (latest.length >= limit) break;
  }

  return { data: latest, source: "supabase" };
}

function mapRewriteJob(row: RewriteJobRow): RewriteJobView {
  return {
    id: row.id,
    sourceUrls: row.source_urls,
    extractedContent: row.extracted_content,
    synthesis: row.synthesis,
    generatedArticleId: row.generated_article_id,
    similarityScore: row.similarity_score,
    similarityReport: row.similarity_report,
    decision: row.decision,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRewriteJobs(
  limit = 12,
): Promise<DataResult<RewriteJobView[]>> {
  if (!isSupabaseConfigured()) return { data: [], source: "unconfigured" };

  const scoped = await getServerSupabase();
  if (!scoped) return { data: [], source: "unconfigured" };

  const { data, error } = await scoped
    .from("rewrite_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], source: "supabase", error: error.message };

  return {
    data: ((data as RewriteJobRow[] | null) ?? []).map(mapRewriteJob),
    source: "supabase",
  };
}

export async function getRewriteJob(
  id: string,
): Promise<DataResult<RewriteJobView | null>> {
  if (!isSupabaseConfigured()) return { data: null, source: "unconfigured" };

  const scoped = await getServerSupabase();
  if (!scoped) return { data: null, source: "unconfigured" };

  const { data, error } = await scoped
    .from("rewrite_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return { data: null, source: "supabase", error: error.message };
  if (!data) return { data: null, source: "supabase" };

  return { data: mapRewriteJob(data as RewriteJobRow), source: "supabase" };
}

/**
 * Records a job row. Uses the service role because the AI routes run after
 * their own role check and must log even when the user's token is mid-refresh.
 */
export async function recordJob(input: {
  sessionKey: string | null;
  articleId?: string | null;
  taskType: AiTaskType;
  status: AiJobStatus;
  jobInput: unknown;
  output?: unknown;
  promptTemplateId?: string | null;
  promptTemplateKey?: string | null;
  promptVersion?: number | null;
  providerName?: string | null;
  model?: string | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
  createdBy: string;
}): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = getAdminSupabase();
  if (!admin) return null;

  // Revision increments per session + task, giving simple version history.
  let revision = 1;
  if (input.sessionKey) {
    const { count } = await admin
      .from("ai_generation_jobs")
      .select("id", { count: "exact", head: true })
      .eq("session_key", input.sessionKey)
      .eq("task_type", input.taskType);
    revision = (count ?? 0) + 1;
  }

  const { data, error } = await admin
    .from("ai_generation_jobs")
    .insert({
      session_key: input.sessionKey,
      article_id: input.articleId ?? null,
      task_type: input.taskType,
      status: input.status,
      input: input.jobInput ?? {},
      output: input.output ?? null,
      prompt_template_id: input.promptTemplateId ?? null,
      prompt_template_key: input.promptTemplateKey ?? null,
      prompt_version: input.promptVersion ?? null,
      provider_name: input.providerName ?? null,
      model: input.model ?? null,
      latency_ms: input.latencyMs ?? null,
      revision,
      error_message: input.errorMessage ?? null,
      created_by: input.createdBy,
    })
    .select("id")
    .maybeSingle();

  if (error) return null;
  return (data as { id: string } | null)?.id ?? null;
}
