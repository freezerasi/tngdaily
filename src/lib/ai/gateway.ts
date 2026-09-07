import "server-only";

import type { z } from "zod";

import { env, isProduction } from "@/lib/env";
import { getAdminSupabase } from "@/lib/supabase/server";
import { getSecretStore, SecretStoreError } from "@/lib/ai/secrets";
import {
  backoffDelayMs,
  classifyHttpFailure,
  classifyNetworkFailure,
  sleep,
  type ClassifiedFailure,
} from "@/lib/ai/fallback";
import { extractJson } from "@/lib/ai/json";
import type { AiApiKeyRow, AiProviderRow } from "@/types/database";
import type { AiTaskType } from "@/types/domain";

/**
 * AI Gateway.
 *
 * Single entry point for every provider call in the product. Owns:
 *   - candidate resolution from ai_providers/ai_api_keys by priority
 *   - one retry ladder per key for transient failures, then fallback
 *   - key status updates so a dead key stops being tried
 *   - usage logging with metadata only, never prompts or responses
 *   - strict JSON parsing plus exactly one repair attempt
 *
 * Never logs an API key, an Authorization header, or a provider body.
 */

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_CANDIDATES = 4;
const MAX_RETRIES_PER_KEY = 2;

export interface GatewayCandidate {
  keyId: string | null;
  providerId: string | null;
  providerName: string;
  baseUrl: string;
  model: string;
  priority: number;
  /** Set for the local development fallback, which has no database row. */
  isLocalFallback: boolean;
  secretId: string | null;
}

export interface GatewayRequest {
  task: AiTaskType;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  /** Overrides the provider default. */
  model?: string;
  responseFormatJson?: boolean;
}

export interface GatewayUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export interface GatewaySuccess {
  ok: true;
  content: string;
  providerName: string;
  model: string;
  latencyMs: number;
  attempts: number;
  usage: GatewayUsage;
}

export interface GatewayFailure {
  ok: false;
  /** Safe to show an admin. Contains no secret and no provider body. */
  error: string;
  code: string;
  attempts: number;
  triedProviders: string[];
}

export type GatewayResult = GatewaySuccess | GatewayFailure;

export const ALL_PROVIDERS_FAILED =
  "Semua provider AI sedang gagal. Periksa konfigurasi atau coba lagi beberapa saat.";

// ---------------------------------------------------------------------------
// Candidate resolution
// ---------------------------------------------------------------------------

/**
 * Active keys ordered by priority, capped at MAX_CANDIDATES so a long chain
 * cannot balloon latency without benefit.
 */
export async function resolveCandidates(): Promise<GatewayCandidate[]> {
  const admin = getAdminSupabase();
  const candidates: GatewayCandidate[] = [];

  if (admin) {
    const { data: keyRows } = await admin
      .from("ai_api_keys")
      .select("*")
      .in("status", ["active", "rate_limited"])
      .order("priority", { ascending: true })
      .limit(MAX_CANDIDATES * 2);

    const keys = (keyRows as AiApiKeyRow[] | null) ?? [];

    if (keys.length > 0) {
      const providerIds = Array.from(new Set(keys.map((key) => key.provider_id)));
      const { data: providerRows } = await admin
        .from("ai_providers")
        .select("*")
        .in("id", providerIds)
        .eq("is_active", true);

      const providers = new Map(
        ((providerRows as AiProviderRow[] | null) ?? []).map((row) => [
          row.id,
          row,
        ]),
      );

      // Active keys first; rate-limited ones are kept as last resort rather
      // than dropped, because the window may already have reset.
      const ordered = [...keys].sort((a, b) => {
        const rank = (status: string) => (status === "active" ? 0 : 1);
        return rank(a.status) - rank(b.status) || a.priority - b.priority;
      });

      for (const key of ordered) {
        const provider = providers.get(key.provider_id);
        if (!provider) continue;
        candidates.push({
          keyId: key.id,
          providerId: provider.id,
          providerName: provider.name,
          baseUrl: provider.base_url,
          model: provider.default_model,
          priority: key.priority,
          isLocalFallback: false,
          secretId: key.vault_secret_id,
        });
        if (candidates.length >= MAX_CANDIDATES) break;
      }
    }
  }

  // Development convenience only: never used in production, and only when the
  // database has no configured provider at all.
  if (
    candidates.length === 0 &&
    !isProduction &&
    env.AI_LOCAL_DEV_FALLBACK_KEY &&
    env.AI_LOCAL_DEV_FALLBACK_BASE_URL &&
    env.AI_LOCAL_DEV_FALLBACK_MODEL
  ) {
    candidates.push({
      keyId: null,
      providerId: null,
      providerName: "Local dev fallback",
      baseUrl: env.AI_LOCAL_DEV_FALLBACK_BASE_URL,
      model: env.AI_LOCAL_DEV_FALLBACK_MODEL,
      priority: 999,
      isLocalFallback: true,
      secretId: null,
    });
  }

  return candidates;
}

async function resolveApiKey(candidate: GatewayCandidate): Promise<string> {
  if (candidate.isLocalFallback) {
    const key = env.AI_LOCAL_DEV_FALLBACK_KEY;
    if (!key) {
      throw new SecretStoreError(
        "not_configured",
        "AI_LOCAL_DEV_FALLBACK_KEY tidak tersedia.",
      );
    }
    return key;
  }

  if (!candidate.secretId) {
    throw new SecretStoreError(
      "not_found",
      "Key ini tidak punya referensi secret yang valid.",
    );
  }

  return getSecretStore().getSecret(candidate.secretId);
}

// ---------------------------------------------------------------------------
// Bookkeeping
// ---------------------------------------------------------------------------

async function logUsage(input: {
  keyId: string | null;
  providerName: string;
  task: AiTaskType;
  model: string;
  latencyMs: number;
  success: boolean;
  statusCode: number | null;
  errorCode: string | null;
  attempt: number;
  usage: GatewayUsage;
}): Promise<void> {
  const admin = getAdminSupabase();
  if (!admin) return;

  // Metadata only. Prompts and responses are deliberately absent.
  await admin.from("ai_usage_log").insert({
    api_key_id: input.keyId,
    provider_name: input.providerName,
    task_type: input.task,
    model: input.model,
    tokens_used: input.usage.totalTokens,
    prompt_tokens: input.usage.promptTokens,
    completion_tokens: input.usage.completionTokens,
    latency_ms: input.latencyMs,
    success: input.success,
    status_code: input.statusCode,
    error_code: input.errorCode,
    attempt: input.attempt,
  });
}

async function markKey(
  keyId: string | null,
  patch: {
    status?: "active" | "rate_limited" | "error";
    lastError?: string | null;
    touchLastUsed?: boolean;
  },
): Promise<void> {
  if (!keyId) return;
  const admin = getAdminSupabase();
  if (!admin) return;

  const update: Record<string, unknown> = {};
  if (patch.status) update.status = patch.status;
  if (patch.lastError !== undefined) update.last_error = patch.lastError;
  if (patch.touchLastUsed) update.last_used_at = new Date().toISOString();
  if (Object.keys(update).length === 0) return;

  await admin.from("ai_api_keys").update(update).eq("id", keyId);
}

// ---------------------------------------------------------------------------
// Single request
// ---------------------------------------------------------------------------

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function normaliseBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  if (/\/v\d+$/.test(trimmed)) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

async function callOnce(
  candidate: GatewayCandidate,
  apiKey: string,
  request: GatewayRequest,
): Promise<
  | { ok: true; content: string; usage: GatewayUsage; latencyMs: number }
  | { ok: false; failure: ClassifiedFailure; latencyMs: number }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(normaliseBaseUrl(candidate.baseUrl), {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model ?? candidate.model,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4000,
        ...(request.responseFormatJson
          ? { response_format: { type: "json_object" } }
          : {}),
        stream: false,
      }),
    });

    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      // The body is intentionally discarded: provider error bodies can echo
      // request content, and nothing here is safe to log or surface.
      void response.body?.cancel();
      return { ok: false, failure: classifyHttpFailure(response.status), latencyMs };
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content ?? "";

    if (!content.trim()) {
      return {
        ok: false,
        latencyMs,
        failure: {
          kind: "transient",
          keyStatus: null,
          statusCode: response.status,
          code: "empty_response",
          message: "Provider mengembalikan respons kosong.",
          retryable: true,
        },
      };
    }

    return {
      ok: true,
      content,
      latencyMs,
      usage: {
        promptTokens: payload.usage?.prompt_tokens ?? null,
        completionTokens: payload.usage?.completion_tokens ?? null,
        totalTokens: payload.usage?.total_tokens ?? null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      failure: classifyNetworkFailure(error),
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs one AI request through the fallback chain. Returns a result rather than
 * throwing, so every caller must handle failure explicitly.
 */
export async function runGateway(
  request: GatewayRequest,
  options: { candidates?: GatewayCandidate[] } = {},
): Promise<GatewayResult> {
  const candidates = options.candidates ?? (await resolveCandidates());

  if (candidates.length === 0) {
    return {
      ok: false,
      error:
        "Belum ada provider AI aktif. Tambahkan provider dan API key di Konfigurasi AI.",
      code: "no_provider",
      attempts: 0,
      triedProviders: [],
    };
  }

  const tried: string[] = [];
  let totalAttempts = 0;
  let lastMessage = ALL_PROVIDERS_FAILED;
  let lastCode = "all_failed";

  for (const candidate of candidates) {
    tried.push(candidate.providerName);

    let apiKey: string;
    try {
      apiKey = await resolveApiKey(candidate);
    } catch (error) {
      lastMessage =
        error instanceof SecretStoreError
          ? error.message
          : "Gagal membaca API key dari secret store.";
      lastCode = "secret_unavailable";
      totalAttempts += 1;
      await markKey(candidate.keyId, {
        status: "error",
        lastError: lastMessage,
      });
      await logUsage({
        keyId: candidate.keyId,
        providerName: candidate.providerName,
        task: request.task,
        model: request.model ?? candidate.model,
        latencyMs: 0,
        success: false,
        statusCode: null,
        errorCode: lastCode,
        attempt: 1,
        usage: { promptTokens: null, completionTokens: null, totalTokens: null },
      });
      continue;
    }

    for (let attempt = 1; attempt <= MAX_RETRIES_PER_KEY + 1; attempt += 1) {
      totalAttempts += 1;
      const result = await callOnce(candidate, apiKey, request);

      if (result.ok) {
        await Promise.all([
          markKey(candidate.keyId, {
            status: "active",
            lastError: null,
            touchLastUsed: true,
          }),
          logUsage({
            keyId: candidate.keyId,
            providerName: candidate.providerName,
            task: request.task,
            model: request.model ?? candidate.model,
            latencyMs: result.latencyMs,
            success: true,
            statusCode: 200,
            errorCode: null,
            attempt,
            usage: result.usage,
          }),
        ]);

        return {
          ok: true,
          content: result.content,
          providerName: candidate.providerName,
          model: request.model ?? candidate.model,
          latencyMs: result.latencyMs,
          attempts: totalAttempts,
          usage: result.usage,
        };
      }

      const { failure } = result;
      lastMessage = failure.message;
      lastCode = failure.code;

      await logUsage({
        keyId: candidate.keyId,
        providerName: candidate.providerName,
        task: request.task,
        model: request.model ?? candidate.model,
        latencyMs: result.latencyMs,
        success: false,
        statusCode: failure.statusCode,
        errorCode: failure.code,
        attempt,
        usage: { promptTokens: null, completionTokens: null, totalTokens: null },
      });

      if (failure.keyStatus) {
        await markKey(candidate.keyId, {
          status: failure.keyStatus,
          lastError: failure.message,
        });
      }

      // Configuration failures never retry the same key.
      if (!failure.retryable) break;

      if (attempt <= MAX_RETRIES_PER_KEY) {
        await sleep(backoffDelayMs(attempt));
        continue;
      }
      break;
    }
  }

  return {
    ok: false,
    error: `${ALL_PROVIDERS_FAILED} Detail terakhir: ${lastMessage}`,
    code: lastCode,
    attempts: totalAttempts,
    triedProviders: Array.from(new Set(tried)),
  };
}

export interface StructuredSuccess<T> {
  ok: true;
  data: T;
  providerName: string;
  model: string;
  latencyMs: number;
  attempts: number;
  usage: GatewayUsage;
  repaired: boolean;
}

export type StructuredResult<T> = StructuredSuccess<T> | GatewayFailure;

/**
 * Gateway call plus strict schema validation. On invalid JSON, issues exactly
 * one repair request, as the prompt contract specifies, then gives up.
 */
export async function runStructuredGateway<T>(
  request: GatewayRequest,
  schema: z.ZodType<T>,
): Promise<StructuredResult<T>> {
  const candidates = await resolveCandidates();
  const first = await runGateway(
    { ...request, responseFormatJson: true },
    { candidates },
  );
  if (!first.ok) return first;

  const validated = validate(first.content, schema);
  if (validated.ok) {
    return {
      ok: true,
      data: validated.data,
      providerName: first.providerName,
      model: first.model,
      latencyMs: first.latencyMs,
      attempts: first.attempts,
      usage: first.usage,
      repaired: false,
    };
  }

  // One repair pass. The original output is echoed back to the model only; it
  // never reaches a log or the client.
  const repair = await runGateway(
    {
      ...request,
      responseFormatJson: true,
      temperature: 0,
      systemPrompt: request.systemPrompt,
      userPrompt: [
        "Kembalikan output sebelumnya sebagai JSON valid sesuai schema, tanpa mengubah substansi.",
        "Jangan menambahkan penjelasan, komentar, atau blok markdown.",
        "",
        "OUTPUT SEBELUMNYA:",
        first.content,
      ].join("\n"),
    },
    { candidates },
  );

  if (!repair.ok) {
    return {
      ok: false,
      error: `Output AI tidak sesuai format dan perbaikan gagal. ${validated.reason}`,
      code: "invalid_output",
      attempts: first.attempts + repair.attempts,
      triedProviders: repair.triedProviders,
    };
  }

  const revalidated = validate(repair.content, schema);
  if (!revalidated.ok) {
    return {
      ok: false,
      error: `Output AI tidak sesuai schema meski sudah diminta ulang. ${revalidated.reason}`,
      code: "invalid_output",
      attempts: first.attempts + repair.attempts,
      triedProviders: [first.providerName, repair.providerName],
    };
  }

  return {
    ok: true,
    data: revalidated.data,
    providerName: repair.providerName,
    model: repair.model,
    latencyMs: first.latencyMs + repair.latencyMs,
    attempts: first.attempts + repair.attempts,
    usage: repair.usage,
    repaired: true,
  };
}

function validate<T>(
  raw: string,
  schema: z.ZodType<T>,
): { ok: true; data: T } | { ok: false; reason: string } {
  const extracted = extractJson(raw);
  if (!extracted.ok) return { ok: false, reason: extracted.reason };

  const parsed = schema.safeParse(extracted.value);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join(".") ?? "root";
    return {
      ok: false,
      reason: `Field "${path}": ${first?.message ?? "tidak sesuai schema"}.`,
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Connection test for one specific key. Deliberately bypasses the fallback
 * chain: the admin needs to know whether this key works, not whether some key
 * works.
 */
export async function testCandidate(candidate: GatewayCandidate): Promise<{
  ok: boolean;
  message: string;
  latencyMs: number;
  model: string;
}> {
  let apiKey: string;
  try {
    apiKey = await resolveApiKey(candidate);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof SecretStoreError
          ? error.message
          : "Gagal membaca API key dari secret store.",
      latencyMs: 0,
      model: candidate.model,
    };
  }

  const result = await callOnce(candidate, apiKey, {
    task: "connection_test",
    systemPrompt:
      "Kamu adalah penguji koneksi. Jawab tepat satu kata: OK. Tanpa tanda baca.",
    userPrompt: "Balas OK.",
    temperature: 0,
    maxTokens: 8,
  });

  await logUsage({
    keyId: candidate.keyId,
    providerName: candidate.providerName,
    task: "connection_test",
    model: candidate.model,
    latencyMs: result.latencyMs,
    success: result.ok,
    statusCode: result.ok ? 200 : result.failure.statusCode,
    errorCode: result.ok ? null : result.failure.code,
    attempt: 1,
    usage: result.ok
      ? result.usage
      : { promptTokens: null, completionTokens: null, totalTokens: null },
  });

  if (result.ok) {
    await markKey(candidate.keyId, {
      status: "active",
      lastError: null,
      touchLastUsed: true,
    });
    return {
      ok: true,
      message: `Koneksi berhasil dalam ${result.latencyMs} ms.`,
      latencyMs: result.latencyMs,
      model: candidate.model,
    };
  }

  if (result.failure.keyStatus) {
    await markKey(candidate.keyId, {
      status: result.failure.keyStatus,
      lastError: result.failure.message,
    });
  }

  return {
    ok: false,
    message: result.failure.message,
    latencyMs: result.latencyMs,
    model: candidate.model,
  };
}
