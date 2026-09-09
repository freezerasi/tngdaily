import "server-only";

import type { z } from "zod";

import { composePrompt } from "@/lib/ai/prompts";
import { runStructuredGateway, type StructuredResult } from "@/lib/ai/gateway";
import {
  draftOutputSchema,
  headlineOutputSchema,
  ideationOutputSchema,
  imageQueryOutputSchema,
  outlineOutputSchema,
  qualityGateOutputSchema,
  rewriteOutputSchema,
  seoOutputSchema,
  socialOutputSchema,
  type DraftOutput,
  type HeadlineOutput,
  type IdeationOutput,
  type ImageQueryOutput,
  type OutlineOutput,
  type QualityGateOutput,
  type RewriteOutput,
  type SeoOutput,
  type SocialOutput,
} from "@/lib/ai/schemas";
import type { AiTaskType } from "@/types/domain";

/**
 * Task layer.
 *
 * Each function loads its template from the database, renders the variables,
 * runs the gateway, and validates the output. Callers never touch prompt text
 * or provider details.
 */

export interface TaskMeta {
  templateKey: string;
  templateId: string | null;
  promptVersion: number;
  usedFallbackTemplate: boolean;
}

export type TaskResult<T> =
  | { ok: true; data: T; meta: TaskMeta; providerName: string; model: string; latencyMs: number }
  | { ok: false; error: string; code: string; meta: TaskMeta | null };

async function runTask<T>(
  task: Parameters<typeof composePrompt>[0],
  aiTask: AiTaskType,
  variables: Record<string, string | number | undefined>,
  schema: z.ZodType<T>,
  options: {
    temperature?: number;
    maxTokens?: number;
    extraSystemPrompt?: string;
  } = {},
): Promise<TaskResult<T>> {
  let composed: Awaited<ReturnType<typeof composePrompt>>;
  try {
    composed = await composePrompt(task, variables);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Prompt template tidak bisa dimuat.",
      code: "template_missing",
      meta: null,
    };
  }

  const meta: TaskMeta = {
    templateKey: composed.templateKey,
    templateId: composed.templateId,
    promptVersion: composed.version,
    usedFallbackTemplate: composed.isFallback,
  };

  const result: StructuredResult<T> = await runStructuredGateway(
    {
      task: aiTask,
      systemPrompt: options.extraSystemPrompt
        ? `${composed.systemPrompt}\n\n---\n\n${options.extraSystemPrompt}`
        : composed.systemPrompt,
      userPrompt: composed.userPrompt,
      ...(options.temperature !== undefined
        ? { temperature: options.temperature }
        : {}),
      ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
    },
    schema,
  );

  if (!result.ok) {
    return { ok: false, error: result.error, code: result.code, meta };
  }

  return {
    ok: true,
    data: result.data,
    meta,
    providerName: result.providerName,
    model: result.model,
    latencyMs: result.latencyMs,
  };
}

export function generateIdeas(input: {
  pillar: string;
  area: string;
  contentGoal: string;
  topicBrief: string;
  knownContext?: string;
  constraints?: string;
  ideaCount: number;
}): Promise<TaskResult<IdeationOutput>> {
  return runTask(
    "ideation",
    "ideation",
    {
      PILLAR: input.pillar,
      AREA_CAKUPAN: input.area,
      CONTENT_GOAL: input.contentGoal,
      TOPIC_BRIEF: input.topicBrief,
      KNOWN_CONTEXT: input.knownContext,
      CONSTRAINTS: input.constraints,
      IDEA_COUNT: input.ideaCount,
    },
    ideationOutputSchema,
    { temperature: 0.9, maxTokens: 3500 },
  );
}

export function generateHeadlines(input: {
  pillar: string;
  angle: string;
  verifiedFacts?: string;
  targetReader?: string;
  goal?: string;
  avoidTerms?: string;
}): Promise<TaskResult<HeadlineOutput>> {
  return runTask(
    "headline",
    "headline",
    {
      PILLAR: input.pillar,
      ANGLE: input.angle,
      VERIFIED_FACTS: input.verifiedFacts,
      TARGET_READER: input.targetReader,
      GOAL: input.goal,
      AVOID_TERMS: input.avoidTerms,
    },
    headlineOutputSchema,
    {
      temperature: 0.7,
      maxTokens: 4000,
      extraSystemPrompt:
        "Langsung buat dan hasilkan variasi judul dalam format JSON yang diminta. Hindari penalaran internal yang bertele-tele agar respon ringkas dan tepat waktu.",
    },
  );
}

export function generateOutline(input: {
  title: string;
  pillar: string;
  angle: string;
  editorBrief?: string;
  verifiedFacts?: string;
  sources?: string;
  targetWordCount: number;
}): Promise<TaskResult<OutlineOutput>> {
  return runTask(
    "outline",
    "outline",
    {
      TITLE: input.title,
      PILLAR: input.pillar,
      ANGLE: input.angle,
      EDITOR_BRIEF: input.editorBrief,
      VERIFIED_FACTS: input.verifiedFacts,
      SOURCES: input.sources,
      TARGET_WORD_COUNT: input.targetWordCount,
    },
    outlineOutputSchema,
    { temperature: 0.7, maxTokens: 3500 },
  );
}

export function generateDraft(input: {
  title: string;
  pillar: string;
  approvedOutline: string;
  verifiedFacts?: string;
  sources?: string;
  editorNotes?: string;
  targetWordCount: number;
}): Promise<TaskResult<DraftOutput>> {
  return runTask(
    "draft",
    "draft",
    {
      TITLE: input.title,
      PILLAR: input.pillar,
      APPROVED_OUTLINE: input.approvedOutline,
      VERIFIED_FACTS: input.verifiedFacts,
      SOURCES: input.sources,
      EDITOR_NOTES: input.editorNotes,
      TARGET_WORD_COUNT: input.targetWordCount,
    },
    draftOutputSchema,
    { temperature: 0.75, maxTokens: 8000 },
  );
}

export function generateRewriteSynthesis(input: {
  pillar: string;
  editorBrief: string;
  area?: string;
  targetWordCount: number;
  extractedSourcesJson: string;
}): Promise<TaskResult<RewriteOutput>> {
  return runTask(
    "rewrite",
    "rewrite",
    {
      PILLAR: input.pillar,
      EDITOR_BRIEF: input.editorBrief,
      AREA_CAKUPAN: input.area,
      TARGET_WORD_COUNT: input.targetWordCount,
      EXTRACTED_SOURCES_JSON: input.extractedSourcesJson,
    },
    rewriteOutputSchema,
    // 700 words is roughly 2000 tokens; the attribution map adds a few
    // hundred more. A smaller completion budget is easier for slow or
    // free-tier models to finish within the request timeout than the old
    // 8000, which some providers struggle to allocate in one shot.
    { 
      temperature: 0.7, 
      maxTokens: 4000,
      extraSystemPrompt: "Pastikan output berupa artikel berkualitas siap posting dengan gaya khas anak muda dan gaya penulisan situs TNG Daily. Kembalikan HANYA JSON valid tanpa teks pengantar, penutup, atau bungkus markdown (seperti ```json). Dilarang menyertakan proses pemikiran (reasoning) di luar format JSON."
    },
  );
}

export function generateSeoMetadata(input: {
  title: string;
  pillar: string;
  articleContent: string;
  coverImageUrl?: string;
  publishedAtIso: string;
  modifiedAtIso: string;
  authorName: string;
  articleUrl: string;
  existingTags?: string;
}): Promise<TaskResult<SeoOutput>> {
  const taxonomyGuard = [
    "KONTROL TAKSONOMI WAJIB",
    "Pilar/kategori artikel hanya boleh salah satu dari: vibes, suara, hustle, story.",
    `Pilar artikel ini adalah ${input.pillar}. Jangan membuat kategori, rubrik, atau pilar baru.`,
    `Tag existing yang boleh diprioritaskan: ${input.existingTags || "(belum ada tag tersimpan)"}.`,
    "Boleh membuat tag baru jika benar-benar relevan, tetapi total tags maksimal 5, lowercase, tanpa hashtag, dan 1-3 kata per tag.",
    "Wajib isi excerpt 120-180 karakter sebagai ringkasan manusiawi untuk feed/editor. Excerpt harus berbeda dari meta_description bila memungkinkan.",
  ].join("\n");

  return runTask(
    "seo",
    "seo",
    {
      TITLE: input.title,
      PILLAR: input.pillar,
      ARTICLE_CONTENT: input.articleContent,
      COVER_IMAGE_URL: input.coverImageUrl,
      PUBLISHED_AT_ISO: input.publishedAtIso,
      MODIFIED_AT_ISO: input.modifiedAtIso,
      AUTHOR_NAME: input.authorName,
      ARTICLE_URL: input.articleUrl,
      EXISTING_TAGS: input.existingTags,
    },
    seoOutputSchema,
    { temperature: 0.5, maxTokens: 2500, extraSystemPrompt: taxonomyGuard },
  );
}

export function generateImageQueries(input: {
  title: string;
  pillar: string;
  articleSummary: string;
  availableVisuals?: string;
}): Promise<TaskResult<ImageQueryOutput>> {
  return runTask(
    "image",
    "image",
    {
      TITLE: input.title,
      PILLAR: input.pillar,
      ARTICLE_SUMMARY: input.articleSummary,
      AVAILABLE_VISUALS: input.availableVisuals,
    },
    imageQueryOutputSchema,
    { temperature: 0.6, maxTokens: 1500 },
  );
}

export function runQualityGate(input: {
  articleContent: string;
  seoMetadataJson: string;
  sourcesJson: string;
  knownRisks?: string;
}): Promise<TaskResult<QualityGateOutput>> {
  return runTask(
    "quality",
    "quality",
    {
      ARTICLE_CONTENT: input.articleContent,
      SEO_METADATA_JSON: input.seoMetadataJson,
      SOURCES_JSON: input.sourcesJson,
      KNOWN_RISKS: input.knownRisks,
    },
    qualityGateOutputSchema,
    { temperature: 0.3, maxTokens: 4000 },
  );
}

export function generateSocialPackage(input: {
  title: string;
  pillar: string;
  articleContent: string;
  distributionGoal: string;
  articleUrl: string;
}): Promise<TaskResult<SocialOutput>> {
  return runTask(
    "social",
    "social",
    {
      TITLE: input.title,
      PILLAR: input.pillar,
      ARTICLE_CONTENT: input.articleContent,
      DISTRIBUTION_GOAL: input.distributionGoal,
      ARTICLE_URL: input.articleUrl,
    },
    socialOutputSchema,
    { temperature: 0.8, maxTokens: 3000 },
  );
}

/** Serialises an outline object into the plain text the draft prompt expects. */
export function outlineToText(outline: OutlineOutput): string {
  const plan = outline.article_plan;
  const lines: string[] = [
    `JUDUL: ${plan.title}`,
    `JANJI PEMBACA: ${plan.reader_promise}`,
    `HOOK: ${plan.opening_hook}`,
    `NUT GRAF: ${plan.nut_graf}`,
    "",
    "BAGIAN:",
  ];

  for (const section of [...plan.sections].sort((a, b) => a.order - b.order)) {
    lines.push(`${section.order}. ${section.heading}`);
    if (section.purpose) lines.push(`   Fungsi: ${section.purpose}`);
    for (const point of section.key_points) lines.push(`   - ${point}`);
    for (const evidence of section.evidence_or_sources_needed) {
      lines.push(`   Bukti dibutuhkan: ${evidence}`);
    }
  }

  lines.push("", `PENUTUP: ${plan.closing_direction}`);
  if (plan.fact_check_list.length > 0) {
    lines.push("", "CEK FAKTA:");
    for (const item of plan.fact_check_list) lines.push(`- ${item}`);
  }
  if (plan.risk_flags.length > 0) {
    lines.push("", "RISIKO:");
    for (const item of plan.risk_flags) lines.push(`- ${item}`);
  }

  return lines.join("\n");
}
