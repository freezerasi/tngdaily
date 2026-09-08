import { NextResponse, type NextRequest } from "next/server";

import { getApiAuth } from "@/lib/auth";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";
import { generateRewriteSynthesis } from "@/lib/ai/tasks";
import { toPromptPayload, type ExtractedSource } from "@/lib/ai/extract";
import { phraseSimilarity } from "@/lib/content";
import { recordJob } from "@/lib/data/ai";
import {
  RATE_LIMITS,
  rateLimit,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import { rewriteSynthesisSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Rewrite synthesis.
 *
 * Reads the previously extracted sources from the job row, asks the model to
 * synthesise, then runs a server-side n-gram similarity check against every
 * source. The similarity number is a warning for the editor, not a legal
 * verdict, and the result is only ever stored as a draft.
 */

const SIMILARITY_WARNING_THRESHOLD = 0.25;

export async function POST(request: NextRequest) {
  const auth = await getApiAuth("editor");
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Tidak diizinkan." }, { status: 403 });
  }

  const limit = rateLimit(
    `ai-rewrite:${auth.profile.id}`,
    RATE_LIMITS.aiGenerate.limit,
    RATE_LIMITS.aiGenerate.windowMs,
  );
  if (!limit.ok) {
    return tooManyRequests(limit, "Terlalu banyak permintaan AI. Tunggu sebentar.");
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = rewriteSynthesisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Input sintesis belum lengkap." },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const scoped = await getServerSupabase();
  const admin = getAdminSupabase();
  if (!scoped || !admin) {
    return NextResponse.json(
      { ok: false, error: "Database belum dikonfigurasi." },
      { status: 503 },
    );
  }

  let jobRow: { id: string; extracted_content: unknown } | null = null;
  try {
    const { data, error: jobError } = await scoped
      .from("rewrite_jobs")
      .select("id, extracted_content")
      .eq("id", input.rewriteJobId)
      .maybeSingle();
    if (jobError) {
      console.error("rewrite synthesize: job read failed:", jobError.message);
    }
    jobRow = (data as { id: string; extracted_content: unknown } | null) ?? null;
  } catch (caught) {
    console.error("rewrite synthesize: job read threw:", caught);
  }

  if (!jobRow) {
    return NextResponse.json(
      { ok: false, error: "Job rewrite tidak ditemukan." },
      { status: 404 },
    );
  }

  const extracted = ((jobRow as { extracted_content: unknown }).extracted_content ??
    []) as ExtractedSource[];
  const usable = extracted.filter((source) => source.ok && source.text.length > 0);

  if (usable.length === 0) {
    try {
      await admin
        .from("rewrite_jobs")
        .update({
          status: "failed",
          error_message: "Tidak ada sumber yang berhasil diekstrak.",
        })
        .eq("id", input.rewriteJobId);
    } catch (caught) {
      console.error("rewrite synthesize: fail-status update threw:", caught);
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Tidak ada sumber yang bisa dipakai. Ganti URL, atau tulis dari liputan sendiri.",
      },
      { status: 422 },
    );
  }

  const result = await generateRewriteSynthesis({
    pillar: input.pillar,
    editorBrief: input.editorBrief,
    ...(input.area ? { area: input.area } : {}),
    targetWordCount: input.targetWordCount,
    extractedSourcesJson: toPromptPayload(usable),
  });

  if (!result.ok) {
    // Logging failures must not mask the AI result the editor needs to see.
    await Promise.allSettled([
      admin
        .from("rewrite_jobs")
        .update({ status: "failed", error_message: result.error })
        .eq("id", input.rewriteJobId),
      recordJob({
        sessionKey: `rewrite-${input.rewriteJobId}`,
        taskType: "rewrite",
        status: "failed",
        jobInput: { rewriteJobId: input.rewriteJobId, pillar: input.pillar },
        errorMessage: result.error,
        promptTemplateKey: result.meta?.templateKey ?? null,
        promptVersion: result.meta?.promptVersion ?? null,
        createdBy: auth.profile.id,
      }),
    ]);

    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  const synthesis = result.data;

  // Similarity check per source, on the synthesised draft only.
  const perSource = usable.map((source) => {
    const similarity = phraseSimilarity(synthesis.article_markdown, source.text);
    return {
      sourceName: source.siteName,
      sourceUrl: source.finalUrl,
      score: Number(similarity.score.toFixed(4)),
      matchedPhrases: similarity.matchedPhrases,
      comparedPhrases: similarity.comparedPhrases,
    };
  });

  const worst = perSource.reduce(
    (max, entry) => (entry.score > max ? entry.score : max),
    0,
  );

  const status =
    synthesis.decision === "proceed"
      ? worst >= SIMILARITY_WARNING_THRESHOLD
        ? "needs_review"
        : "completed"
      : "needs_review";

  // Logging is best-effort: the synthesis result has already been produced and
  // must reach the editor even when the database write fails.
  await Promise.allSettled([
    admin
      .from("rewrite_jobs")
      .update({
        synthesis,
        decision: synthesis.decision,
        similarity_score: worst,
        similarity_report: {
          threshold: SIMILARITY_WARNING_THRESHOLD,
          gramSize: 8,
          perSource,
          note:
            "Skor ini indikasi kemiripan frasa panjang, bukan penilaian hukum. Tetap perlu penilaian editor.",
        },
        status,
        error_message: null,
      })
      .eq("id", input.rewriteJobId),
    recordJob({
      sessionKey: `rewrite-${input.rewriteJobId}`,
      taskType: "rewrite",
      status: "completed",
      jobInput: { rewriteJobId: input.rewriteJobId, pillar: input.pillar },
      output: synthesis,
      promptTemplateId: result.meta.templateId,
      promptTemplateKey: result.meta.templateKey,
      promptVersion: result.meta.promptVersion,
      providerName: result.providerName,
      model: result.model,
      latencyMs: result.latencyMs,
      createdBy: auth.profile.id,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    data: synthesis,
    similarity: {
      worst,
      threshold: SIMILARITY_WARNING_THRESHOLD,
      exceeded: worst >= SIMILARITY_WARNING_THRESHOLD,
      perSource,
    },
    provider: result.providerName,
    model: result.model,
    latencyMs: result.latencyMs,
    promptTemplateKey: result.meta.templateKey,
    promptVersion: result.meta.promptVersion,
    usedFallbackTemplate: result.meta.usedFallbackTemplate,
  });
}
