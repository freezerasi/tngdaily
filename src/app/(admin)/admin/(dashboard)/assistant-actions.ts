"use server";

import {
  generateDraft,
  generateHeadlines,
  generateOutline,
  generateSeoMetadata,
  runQualityGate,
} from "@/lib/ai/tasks";
import { recordJob } from "@/lib/data/ai";
import { getApiAuth, type AuthContext } from "@/lib/auth";
import type { HeadlineOutput, OutlineOutput } from "@/lib/ai/schemas";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

/**
 * Server actions powering the article-page AI assistant.
 *
 * Every action checks an editor session and a per-user rate limit before the
 * gateway is touched, and every result is journaled through recordJob so
 * usage stays attributable. The actions return plain JSON-serialisable values
 * only: the client wizard never needs a second round trip to render results.
 */

type EditorGate =
  | { ok: true; auth: AuthContext }
  | { ok: false; error: string };

async function requireEditor(): Promise<EditorGate> {
  try {
    const auth = await getApiAuth("editor");
    if (!auth) return { ok: false, error: "Tidak diizinkan." };
    return { ok: true, auth };
  } catch (caught) {
    return {
      ok: false,
      error:
        caught instanceof Error
          ? `Sesi tidak bisa diverifikasi: ${caught.message}`
          : "Sesi tidak bisa diverifikasi. Login ulang lalu coba lagi.",
    };
  }
}

function checkRate(userId: string): { ok: true } | { ok: false; error: string } {
  const limit = rateLimit(
    `assistant:${userId}`,
    RATE_LIMITS.aiGenerate.limit,
    RATE_LIMITS.aiGenerate.windowMs,
  );
  if (!limit.ok) {
    return {
      ok: false,
      error: `Terlalu banyak permintaan AI. Tunggu ${limit.retryAfterSeconds} detik.`,
    };
  }
  return { ok: true };
}

export interface AssistantTitleOption {
  id: string;
  title: string;
  angleNote: string;
  charCount: number;
}

export interface AssistantTitlesResult {
  ok: boolean;
  error?: string;
  titles?: AssistantTitleOption[];
  recommendedId?: string;
}

export async function assistantTitlesAction(input: {
  topicOrDraft: string;
  pillar: string;
}): Promise<AssistantTitlesResult> {
  const gate = await requireEditor();
  if (!gate.ok) return { ok: false, error: gate.error };
  const auth = gate.auth;

  const limit = checkRate(auth.profile.id);
  if (!limit.ok) return { ok: false, error: limit.error };

  const raw = input.topicOrDraft.trim();
  if (raw.length < 5) {
    return { ok: false, error: "Tulis topik atau tempel bahan minimal 5 karakter." };
  }

  // A long paste is raw material, a short one is a topic brief: both feed the
  // same headline task, but the angle note differs so the model knows whether
  // it is pitching from a topic or from existing text.
  const isDraft = raw.length > 280;
  const result = await generateHeadlines({
    pillar: input.pillar,
    angle: isDraft
      ? "Bahan mentah ditempel. Cari angle menarik dari isinya, jangan meringkas."
      : raw,
    verifiedFacts: isDraft ? raw.slice(0, 4000) : undefined,
    targetReader: "Anak muda 18-27 tahun di Tangerang Raya",
    goal: "Judul yang layak klik, potensial Google Discover, tidak generik",
    avoidTerms: "Wajib Tahu, Ternyata, Bikin Heboh, Viral",
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const data = result.data as HeadlineOutput;
  const titles: AssistantTitleOption[] = (data.headline_options ?? [])
    .map((option) => ({
      id: option.id,
      title: option.title,
      angleNote: option.why_it_works || option.risk_note || "",
      charCount: option.title.length,
    }))
    .slice(0, 7);

  void recordJob({
    sessionKey: `assistant-titles-${auth.profile.id}`,
    taskType: "headline",
    status: "completed",
    jobInput: { pillar: input.pillar, inputLength: raw.length },
    createdBy: auth.profile.id,
  }).catch(() => undefined);

  return { ok: true, titles, recommendedId: data.recommended_id };
}

export interface AssistantOutlineResult {
  ok: boolean;
  error?: string;
  outline?: OutlineOutput;
}

export async function assistantOutlineAction(input: {
  title: string;
  pillar: string;
  angleNote: string;
  topicOrDraft: string;
  revisionNotes?: string;
  targetWordCount: number;
}): Promise<AssistantOutlineResult> {
  const gate = await requireEditor();
  if (!gate.ok) return { ok: false, error: gate.error };
  const auth = gate.auth;

  const limit = checkRate(auth.profile.id);
  if (!limit.ok) return { ok: false, error: limit.error };

  const result = await generateOutline({
    title: input.title,
    pillar: input.pillar,
    angle: input.angleNote || input.title,
    editorBrief: input.revisionNotes,
    verifiedFacts:
      input.topicOrDraft.length > 280 ? input.topicOrDraft.slice(0, 4000) : undefined,
    targetWordCount: input.targetWordCount,
  });

  if (!result.ok) return { ok: false, error: result.error };

  void recordJob({
    sessionKey: `assistant-outline-${auth.profile.id}`,
    taskType: "outline",
    status: "completed",
    jobInput: { title: input.title, pillar: input.pillar },
    createdBy: auth.profile.id,
  }).catch(() => undefined);

  return { ok: true, outline: result.data };
}

export interface AssistantDraftResult {
  ok: boolean;
  error?: string;
  markdown?: string;
  dek?: string;
  suggestedPullQuote?: string;
  verificationNeeded?: string[];
}

export async function assistantDraftAction(input: {
  title: string;
  pillar: string;
  outline: OutlineOutput;
  topicOrDraft: string;
  targetWordCount: number;
}): Promise<AssistantDraftResult> {
  const gate = await requireEditor();
  if (!gate.ok) return { ok: false, error: gate.error };
  const auth = gate.auth;

  const limit = checkRate(auth.profile.id);
  if (!limit.ok) return { ok: false, error: limit.error };

  const result = await generateDraft({
    title: input.title,
    pillar: input.pillar,
    approvedOutline: JSON.stringify(input.outline),
    verifiedFacts:
      input.topicOrDraft.length > 280 ? input.topicOrDraft.slice(0, 4000) : undefined,
    targetWordCount: input.targetWordCount,
  });

  if (!result.ok) return { ok: false, error: result.error };

  void recordJob({
    sessionKey: `assistant-draft-${auth.profile.id}`,
    taskType: "draft",
    status: "completed",
    jobInput: { title: input.title, pillar: input.pillar },
    createdBy: auth.profile.id,
  }).catch(() => undefined);

  return {
    ok: true,
    markdown: result.data.article_markdown,
    dek: result.data.dek,
    suggestedPullQuote: result.data.suggested_pull_quote,
    verificationNeeded: result.data.verification_needed,
  };
}

/** Regenerates one section of an existing article, keeping style consistent. */
export async function assistantRegenerateSectionAction(input: {
  title: string;
  pillar: string;
  fullArticleMarkdown: string;
  sectionHeading: string;
  instruction?: string;
}): Promise<AssistantDraftResult> {
  const gate = await requireEditor();
  if (!gate.ok) return { ok: false, error: gate.error };
  const auth = gate.auth;

  const limit = checkRate(auth.profile.id);
  if (!limit.ok) return { ok: false, error: limit.error };

  const sectionStart = input.fullArticleMarkdown.indexOf(
    `## ${input.sectionHeading}`,
  );
  if (sectionStart === -1) {
    return {
      ok: false,
      error: `Bagian "${input.sectionHeading}" tidak ditemukan di artikel.`,
    };
  }

  // The regenerated section keeps the voice of the surrounding article: the
  // draft prompt gets the section plus before/after context.
  const before = input.fullArticleMarkdown.slice(
    Math.max(0, sectionStart - 1500),
    sectionStart,
  );
  const nextHeading = input.fullArticleMarkdown.indexOf(
    "\n## ",
    sectionStart + 3,
  );
  const sectionEnd =
    nextHeading === -1 ? input.fullArticleMarkdown.length : nextHeading;
  const section = input.fullArticleMarkdown.slice(sectionStart, sectionEnd);
  const after = input.fullArticleMarkdown.slice(
    sectionEnd,
    Math.min(input.fullArticleMarkdown.length, sectionEnd + 1500),
  );

  const outline = {
    article_plan: {
      title: input.title,
      pillar: input.pillar,
      estimated_word_count: 0,
      reader_promise: "",
      opening_hook: "",
      nut_graf: "",
      sections: [
        {
          order: 1,
          heading: input.sectionHeading,
          purpose: `Tulis ulang bagian ini dengan instruksi editor: ${input.instruction || "versi baru yang lebih tajam"}. Pertahankan nada dan gaya bagian lain.`,
          key_points: [],
          evidence_or_sources_needed: [],
          visual_suggestion: "",
        },
      ],
      closing_direction: "",
      fact_check_list: [],
      risk_flags: [],
    },
  };

  const result = await generateDraft({
    title: input.title,
    pillar: input.pillar,
    approvedOutline: JSON.stringify(outline),
    verifiedFacts: `KONTEKS SEBELUM BAGIAN:\n${before}\n\nARTIKEL SETELAH BAGIAN:\n${after}`,
    editorNotes: `Hanya tulis ulang bagian "${input.sectionHeading}". Jangan tambahkan pembuka atau penutup artikel.`,
    targetWordCount: Math.max(150, section.split(/\s+/).length + 80),
  });

  if (!result.ok) return { ok: false, error: result.error };

  void recordJob({
    sessionKey: `assistant-regen-${auth.profile.id}`,
    taskType: "draft",
    status: "completed",
    jobInput: { title: input.title, section: input.sectionHeading },
    createdBy: auth.profile.id,
  }).catch(() => undefined);

  return {
    ok: true,
    markdown: result.data.article_markdown,
    dek: result.data.dek,
    verificationNeeded: result.data.verification_needed,
  };
}

export interface AssistantSeoResult {
  ok: boolean;
  error?: string;
  seo?: {
    seoTitle: string;
    metaDescription: string;
    excerpt: string;
    slug: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    tags: string[];
    openingSummary: string;
    internalLinks: { anchorText: string; target: string; reason: string }[];
    recommendedSchema: string;
    schemaReason: string;
  };
}

const SCHEMA_GUIDE: Record<string, string> = {
  NewsArticle: "berita atau liputan ber waktu",
  Article: "artikel evergreen, panduan, konten rasa",
  ReportageNewsArticle: "laporan lapangan dengan pengamatan langsung",
  OpinionNewsArticle: "opini atau kolom",
  AnalysisNewsArticle: "bedah isu dengan latar dan implikasi",
  ReviewArticle: "ulasan tempat, produk, atau layanan",
  HowTo: "panduan langkah demi langkah",
  FAQPage: "format tanya-jawab",
};

export async function assistantSeoAction(input: {
  title: string;
  pillar: string;
  contentMarkdown: string;
  authorName: string;
  existingTags?: string;
}): Promise<AssistantSeoResult> {
  const gate = await requireEditor();
  if (!gate.ok) return { ok: false, error: gate.error };
  const auth = gate.auth;

  const limit = checkRate(auth.profile.id);
  if (!limit.ok) return { ok: false, error: limit.error };

  if (input.contentMarkdown.trim().length < 50) {
    return { ok: false, error: "Isi artikel masih kosong. Buat draft dulu." };
  }

  const result = await generateSeoMetadata({
    title: input.title,
    pillar: input.pillar,
    articleContent: input.contentMarkdown.slice(0, 6000),
    publishedAtIso: new Date().toISOString(),
    modifiedAtIso: new Date().toISOString(),
    authorName: input.authorName,
    articleUrl: "https://tngdaily.com/artikel/placeholder",
    existingTags: input.existingTags,
  });

  if (!result.ok) return { ok: false, error: result.error };

  const seo = result.data;
  const plain = seo.geo_answer_targets?.[0]?.answer_summary ?? "";

  void recordJob({
    sessionKey: `assistant-seo-${auth.profile.id}`,
    taskType: "seo",
    status: "completed",
    jobInput: { title: input.title },
    createdBy: auth.profile.id,
  }).catch(() => undefined);

  return {
    ok: true,
    seo: {
      seoTitle: seo.seo_title,
      metaDescription: seo.meta_description,
      excerpt: seo.excerpt || seo.meta_description.slice(0, 220),
      slug: seo.slug,
      primaryKeyword: seo.primary_keyword,
      secondaryKeywords: seo.secondary_keywords,
      tags: seo.tags.slice(0, 8),
      openingSummary: plain || seo.excerpt || seo.meta_description,
      internalLinks: (seo.internal_link_suggestions ?? []).map((link) => ({
        anchorText: link.anchor_text,
        target: link.target_topic_or_slug,
        reason: link.reason,
      })),
      // Schema recommendation is heuristic on structure, not another model
      // call: FAQ headings, "cara" list patterns, and review vocabulary are
      // strong signals a human editor can double check.
      recommendedSchema: recommendSchema(input.contentMarkdown),
      schemaReason: SCHEMA_GUIDE[recommendSchema(input.contentMarkdown)] ?? "",
    },
  };
}

function recommendSchema(markdown: string): string {
  const text = markdown.toLowerCase();
  const faqSignals = (text.match(/^(## |\*\*)?apakah |^pertanyaan:|tanya jawab/gm) || []).length;
  if (faqSignals >= 2) return "FAQPage";
  const howToSignals = (text.match(/^## .*cara |^cara /gm) || []).length;
  const stepSignals = (text.match(/^\d+\.|^### langkah/gm) || []).length;
  if (howToSignals >= 1 || stepSignals >= 3) return "HowTo";
  const reviewSignals =
    (text.match(/ulasan|review|rating|rekomendasi|worth it|worth-it/g) || []).length;
  if (reviewSignals >= 3) return "ReviewArticle";
  const opinionSignals =
    (text.match(/menurutku|menurut saya|sebaiknya|sayangnya|kelas/g) || []).length;
  if (opinionSignals >= 2) return "OpinionNewsArticle";
  const analysisSignals =
    (text.match(/implikasi|artinya|dampaknya| dampak |kesimpulan/g) || []).length;
  if (analysisSignals >= 3) return "AnalysisNewsArticle";
  if (markdown.length > 2500) return "Article";
  return "NewsArticle";
}

export interface AssistantQualityResult {
  ok: boolean;
  error?: string;
  readiness?: string;
  score?: number;
  summary?: string;
}

export async function assistantQualityAction(input: {
  contentMarkdown: string;
  title: string;
}): Promise<AssistantQualityResult> {
  const gate = await requireEditor();
  if (!gate.ok) return { ok: false, error: gate.error };
  const auth = gate.auth;

  const limit = checkRate(auth.profile.id);
  if (!limit.ok) return { ok: false, error: limit.error };

  const result = await runQualityGate({
    articleContent: input.contentMarkdown,
    seoMetadataJson: JSON.stringify({ title: input.title }),
    sourcesJson: "[]",
  });

  if (!result.ok) return { ok: false, error: result.error };

  void recordJob({
    sessionKey: `assistant-quality-${auth.profile.id}`,
    taskType: "quality",
    status: "completed",
    jobInput: { title: input.title },
    createdBy: auth.profile.id,
  }).catch(() => undefined);

  return {
    ok: true,
    readiness: result.data.publish_readiness,
    score: result.data.overall_score,
    summary: result.data.summary,
  };
}
