import { NextResponse, type NextRequest } from "next/server";

import { getApiAuth } from "@/lib/auth";
import { recordJob } from "@/lib/data/ai";
import {
  RATE_LIMITS,
  rateLimit,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import {
  generateDraft,
  generateHeadlines,
  generateIdeas,
  generateImageQueries,
  generateOutline,
  generateSeoMetadata,
  generateSocialPackage,
  runQualityGate,
  type TaskResult,
} from "@/lib/ai/tasks";
import { markdownToPlainText } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";
import {
  contentStudioDraftSchema,
  contentStudioFinishSchema,
  contentStudioHeadlineSchema,
  contentStudioIdeationSchema,
  contentStudioOutlineSchema,
  fieldErrors,
} from "@/lib/validation";
import type { AiTaskType } from "@/types/domain";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Content Studio generation endpoint.
 *
 * One route, one stage per request, so the wizard can be resumed and each stage
 * is recorded as its own `ai_generation_jobs` row with a revision number. The
 * gateway never runs in the browser and no provider detail leaves this file
 * except the provider name, which the UI shows so fallback is not silent.
 */

interface StageResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
  jobId?: string | null;
  provider?: string;
  model?: string;
  latencyMs?: number;
  promptTemplateKey?: string;
  promptVersion?: number;
  usedFallbackTemplate?: boolean;
}

export async function POST(request: NextRequest) {
  const auth = await getApiAuth("editor");
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Tidak diizinkan." }, { status: 403 });
  }

  const limit = rateLimit(
    `ai-generate:${auth.profile.id}`,
    RATE_LIMITS.aiGenerate.limit,
    RATE_LIMITS.aiGenerate.windowMs,
  );
  if (!limit.ok) {
    return tooManyRequests(limit, "Terlalu banyak permintaan AI. Tunggu sebentar.");
  }

  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || !("stage" in body)) {
    return NextResponse.json(
      { ok: false, error: "Stage tidak disebutkan." },
      { status: 400 },
    );
  }

  const stage = (body as { stage: unknown }).stage;
  const payload = body as Record<string, unknown>;

  switch (stage) {
    case "ideation":
      return handleIdeation(payload, auth.profile.id);
    case "headline":
      return handleHeadline(payload, auth.profile.id);
    case "outline":
      return handleOutline(payload, auth.profile.id);
    case "draft":
      return handleDraft(payload, auth.profile.id);
    case "finish":
      return handleFinish(payload, auth.profile.id, auth.profile.displayName ?? "Redaksi TNG Daily");
    default:
      return NextResponse.json(
        { ok: false, error: "Stage tidak dikenal." },
        { status: 400 },
      );
  }
}

/** Records the job and shapes the response, so every stage behaves alike. */
async function finalise<T>(
  result: TaskResult<T>,
  context: {
    sessionKey: string;
    taskType: AiTaskType;
    input: unknown;
    createdBy: string;
  },
): Promise<NextResponse<StageResponse>> {
  if (!result.ok) {
    await recordJob({
      sessionKey: context.sessionKey,
      taskType: context.taskType,
      status: "failed",
      jobInput: context.input,
      errorMessage: result.error,
      promptTemplateKey: result.meta?.templateKey ?? null,
      promptVersion: result.meta?.promptVersion ?? null,
      createdBy: context.createdBy,
    });

    const status = result.code === "no_provider" ? 503 : 502;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  const jobId = await recordJob({
    sessionKey: context.sessionKey,
    taskType: context.taskType,
    status: "completed",
    jobInput: context.input,
    output: result.data,
    promptTemplateId: result.meta.templateId,
    promptTemplateKey: result.meta.templateKey,
    promptVersion: result.meta.promptVersion,
    providerName: result.providerName,
    model: result.model,
    latencyMs: result.latencyMs,
    createdBy: context.createdBy,
  });

  return NextResponse.json({
    ok: true,
    data: result.data,
    jobId,
    provider: result.providerName,
    model: result.model,
    latencyMs: result.latencyMs,
    promptTemplateKey: result.meta.templateKey,
    promptVersion: result.meta.promptVersion,
    usedFallbackTemplate: result.meta.usedFallbackTemplate,
  });
}

async function handleIdeation(payload: unknown, userId: string) {
  const parsed = contentStudioIdeationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Input ideasi belum lengkap.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const result = await generateIdeas({
    pillar: input.pillar,
    area: input.area,
    contentGoal: input.contentGoal,
    topicBrief: input.topicBrief,
    ...(input.knownContext ? { knownContext: input.knownContext } : {}),
    ...(input.constraints ? { constraints: input.constraints } : {}),
    ideaCount: input.ideaCount,
  });

  return finalise(result, {
    sessionKey: input.sessionKey,
    taskType: "ideation",
    input,
    createdBy: userId,
  });
}

async function handleHeadline(payload: unknown, userId: string) {
  const parsed = contentStudioHeadlineSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Input judul belum lengkap." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const result = await generateHeadlines({
    pillar: input.pillar,
    angle: input.angle,
    ...(input.verifiedFacts ? { verifiedFacts: input.verifiedFacts } : {}),
    ...(input.targetReader ? { targetReader: input.targetReader } : {}),
    ...(input.goal ? { goal: input.goal } : {}),
    ...(input.avoidTerms ? { avoidTerms: input.avoidTerms } : {}),
  });

  return finalise(result, {
    sessionKey: input.sessionKey,
    taskType: "headline",
    input,
    createdBy: userId,
  });
}

async function handleOutline(payload: unknown, userId: string) {
  const parsed = contentStudioOutlineSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Input outline belum lengkap." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const result = await generateOutline({
    title: input.title,
    pillar: input.pillar,
    angle: input.angle,
    ...(input.editorBrief ? { editorBrief: input.editorBrief } : {}),
    ...(input.verifiedFacts ? { verifiedFacts: input.verifiedFacts } : {}),
    ...(input.sources ? { sources: input.sources } : {}),
    targetWordCount: input.targetWordCount,
  });

  return finalise(result, {
    sessionKey: input.sessionKey,
    taskType: "outline",
    input,
    createdBy: userId,
  });
}

async function handleDraft(payload: unknown, userId: string) {
  const parsed = contentStudioDraftSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Input draft belum lengkap." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const result = await generateDraft({
    title: input.title,
    pillar: input.pillar,
    approvedOutline: input.approvedOutline,
    ...(input.verifiedFacts ? { verifiedFacts: input.verifiedFacts } : {}),
    ...(input.sources ? { sources: input.sources } : {}),
    ...(input.editorNotes ? { editorNotes: input.editorNotes } : {}),
    targetWordCount: input.targetWordCount,
  });

  return finalise(result, {
    sessionKey: input.sessionKey,
    taskType: "draft",
    input,
    createdBy: userId,
  });
}

/**
 * Final stage: SEO metadata, image queries, quality gate, and the social pack.
 * Run sequentially because the quality gate audits the SEO output.
 */
async function handleFinish(
  payload: unknown,
  userId: string,
  authorName: string,
) {
  const parsed = contentStudioFinishSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Input tahap akhir belum lengkap." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const nowIso = new Date().toISOString();
  const plainText = markdownToPlainText(input.articleMarkdown).slice(0, 12_000);

  const seo = await generateSeoMetadata({
    title: input.title,
    pillar: input.pillar,
    articleContent: plainText,
    ...(input.coverImageUrl ? { coverImageUrl: input.coverImageUrl } : {}),
    publishedAtIso: nowIso,
    modifiedAtIso: nowIso,
    authorName: input.authorName || authorName,
    articleUrl: absoluteUrl("/artikel/(slug-belum-final)"),
  });

  if (!seo.ok) {
    await recordJob({
      sessionKey: input.sessionKey,
      taskType: "seo",
      status: "failed",
      jobInput: input,
      errorMessage: seo.error,
      createdBy: userId,
    });
    return NextResponse.json({ ok: false, error: seo.error }, { status: 502 });
  }

  await recordJob({
    sessionKey: input.sessionKey,
    taskType: "seo",
    status: "completed",
    jobInput: { title: input.title, pillar: input.pillar },
    output: seo.data,
    promptTemplateId: seo.meta.templateId,
    promptTemplateKey: seo.meta.templateKey,
    promptVersion: seo.meta.promptVersion,
    providerName: seo.providerName,
    model: seo.model,
    latencyMs: seo.latencyMs,
    createdBy: userId,
  });

  const [imageQueries, quality, social] = await Promise.all([
    generateImageQueries({
      title: input.title,
      pillar: input.pillar,
      articleSummary: plainText.slice(0, 2000),
      ...(input.coverImageUrl
        ? { availableVisuals: `Cover sudah dipilih: ${input.coverImageUrl}` }
        : {}),
    }),
    runQualityGate({
      articleContent: input.articleMarkdown.slice(0, 40_000),
      seoMetadataJson: JSON.stringify(seo.data, null, 2),
      sourcesJson: "[]",
      ...(input.knownRisks ? { knownRisks: input.knownRisks } : {}),
    }),
    generateSocialPackage({
      title: input.title,
      pillar: input.pillar,
      articleContent: plainText.slice(0, 6000),
      distributionGoal: "Mengajak pembaca membaca artikel penuh di tngdaily.com",
      articleUrl: absoluteUrl(`/artikel/${seo.data.slug}`),
    }),
  ]);

  for (const [taskType, result] of [
    ["image", imageQueries],
    ["quality", quality],
    ["social", social],
  ] as const) {
    await recordJob({
      sessionKey: input.sessionKey,
      taskType,
      status: result.ok ? "completed" : "failed",
      jobInput: { title: input.title, pillar: input.pillar },
      output: result.ok ? result.data : null,
      promptTemplateId: result.ok ? result.meta.templateId : null,
      promptTemplateKey: result.meta?.templateKey ?? null,
      promptVersion: result.meta?.promptVersion ?? null,
      providerName: result.ok ? result.providerName : null,
      model: result.ok ? result.model : null,
      latencyMs: result.ok ? result.latencyMs : null,
      errorMessage: result.ok ? null : result.error,
      createdBy: userId,
    });
  }

  return NextResponse.json({
    ok: true,
    data: {
      seo: seo.data,
      imageQueries: imageQueries.ok ? imageQueries.data : null,
      imageQueriesError: imageQueries.ok ? null : imageQueries.error,
      quality: quality.ok ? quality.data : null,
      qualityError: quality.ok ? null : quality.error,
      social: social.ok ? social.data : null,
      socialError: social.ok ? null : social.error,
    },
    provider: seo.providerName,
    model: seo.model,
    promptTemplateKey: seo.meta.templateKey,
    promptVersion: seo.meta.promptVersion,
    usedFallbackTemplate: seo.meta.usedFallbackTemplate,
  });
}
