import { z } from "zod";

import {
  ARTICLE_STATUSES,
  CONTRIBUTION_STATUSES,
  IMAGE_SOURCES,
  PILLARS,
  REACTION_TYPES,
} from "@/types/domain";

/**
 * Input validation for every route handler and form.
 *
 * Shared between client (React Hook Form resolver) and server, so the browser
 * and the API can never disagree about what is acceptable.
 */

export const pillarSchema = z.enum(PILLARS);
export const articleStatusSchema = z.enum(ARTICLE_STATUSES);
export const reactionTypeSchema = z.enum(REACTION_TYPES);
export const contributionStatusSchema = z.enum(CONTRIBUTION_STATUSES);
export const imageSourceSchema = z.enum(IMAGE_SOURCES);

export const uuidSchema = z.string().uuid("ID tidak valid.");

export const reactionRequestSchema = z.object({
  articleId: uuidSchema,
  type: reactionTypeSchema,
  active: z.boolean(),
});
export type ReactionRequest = z.infer<typeof reactionRequestSchema>;

export const contributionFormSchema = z.object({
  contributorName: z
    .string()
    .trim()
    .min(2, "Minimal 2 karakter.")
    .max(80, "Maksimal 80 karakter."),
  contributorContact: z
    .string()
    .trim()
    .max(120, "Maksimal 120 karakter.")
    .optional()
    .or(z.literal("")),
  title: z
    .string()
    .trim()
    .min(5, "Judul minimal 5 karakter.")
    .max(160, "Judul maksimal 160 karakter."),
  pillar: pillarSchema,
  content: z
    .string()
    .trim()
    .min(60, "Ceritanya masih terlalu pendek. Minimal 60 karakter.")
    .max(8000, "Maksimal 8000 karakter."),
  location: z
    .string()
    .trim()
    .max(120, "Maksimal 120 karakter.")
    .optional()
    .or(z.literal("")),
  mediaUrls: z.array(z.string().url()).max(4).default([]),
  consentPublish: z.literal(true, {
    message: "Kami butuh izin kamu untuk mempertimbangkan publikasi.",
  }),
  consentEdit: z.boolean().default(false),
});
export type ContributionFormValues = z.input<typeof contributionFormSchema>;
export type ContributionPayload = z.output<typeof contributionFormSchema>;

export const articleUpsertSchema = z.object({
  id: uuidSchema.optional(),
  title: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter.")
    .max(200, "Judul maksimal 200 karakter."),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug hanya boleh huruf kecil, angka, dan tanda hubung.",
    )
    .max(90, "Slug maksimal 90 karakter."),
  pillar: pillarSchema,
  status: articleStatusSchema,
  dek: z.string().trim().max(320).optional().or(z.literal("")),
  excerpt: z.string().trim().max(400).optional().or(z.literal("")),
  contentMarkdown: z.string().max(120_000, "Konten terlalu panjang."),
  coverImageUrl: z
    .string()
    .trim()
    .url("URL cover tidak valid.")
    .optional()
    .or(z.literal("")),
  coverImageAlt: z.string().trim().max(240).optional().or(z.literal("")),
  coverImageCredit: z.string().trim().max(240).optional().or(z.literal("")),
  tagsInput: z.string().trim().max(240).optional().or(z.literal("")),
  authorName: z.string().trim().max(120).optional().or(z.literal("")),
  scheduledAt: z.string().trim().optional().or(z.literal("")),
  publishedAt: z.string().trim().optional().or(z.literal("")),
  seoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  metaDescription: z.string().trim().max(320).optional().or(z.literal("")),
  primaryKeyword: z.string().trim().max(120).optional().or(z.literal("")),
  secondaryKeywordsInput: z.string().trim().max(320).optional().or(z.literal("")),
});
export type ArticleUpsertValues = z.input<typeof articleUpsertSchema>;
export type ArticleUpsertPayload = z.output<typeof articleUpsertSchema>;

export const articleSourceSchema = z.object({
  sourceName: z.string().trim().min(2).max(120),
  sourceUrl: z.string().trim().url(),
  attributionText: z.string().trim().max(400).optional().or(z.literal("")),
  sourceType: z
    .enum(["reference", "rewrite", "data", "interview", "press_release"])
    .default("reference"),
});

export const moderationSchema = z.object({
  contributionId: uuidSchema,
  action: z.enum(["approve", "reject", "reset"]),
  note: z.string().trim().max(600).optional().or(z.literal("")),
});

export const imageSearchSchema = z.object({
  provider: z.enum(["unsplash", "pexels", "pixabay"]),
  query: z.string().trim().min(2, "Kata kunci minimal 2 karakter.").max(120),
  page: z.coerce.number().int().min(1).max(20).default(1),
  perPage: z.coerce.number().int().min(6).max(30).default(18),
  orientation: z.enum(["landscape", "portrait", "squarish", "any"]).default("any"),
});
export type ImageSearchQuery = z.infer<typeof imageSearchSchema>;

export const imageIngestSchema = z.object({
  provider: z.enum(["unsplash", "pexels", "pixabay"]),
  remoteUrl: z.string().trim().url(),
  altText: z.string().trim().min(3).max(240),
  photographerName: z.string().trim().max(160).optional().or(z.literal("")),
  photographerUrl: z.string().trim().url().optional().or(z.literal("")),
  originalSourceUrl: z.string().trim().url().optional().or(z.literal("")),
  articleId: uuidSchema.optional(),
  isCover: z.boolean().default(false),
});

export const aiProviderSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
  baseUrl: z
    .string()
    .trim()
    .url("Base URL harus URL lengkap.")
    .refine(
      (value) =>
        value.startsWith("https://") ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(value),
      "Base URL harus https, kecuali localhost untuk development.",
    ),
  defaultModel: z.string().trim().min(1, "Nama model wajib diisi.").max(120),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});
export type AiProviderValues = z.input<typeof aiProviderSchema>;

export const aiApiKeySchema = z.object({
  providerId: uuidSchema,
  apiKey: z
    .string()
    .trim()
    .min(12, "API key terlihat terlalu pendek.")
    .max(400, "API key terlalu panjang."),
  keyLabel: z.string().trim().max(80).optional().or(z.literal("")),
  priority: z.coerce.number().int().min(1).max(999).default(100),
});

export const aiKeyReorderSchema = z.object({
  order: z.array(uuidSchema).min(1).max(50),
});

export const aiKeyStatusSchema = z.object({
  keyId: uuidSchema,
  status: z.enum(["active", "disabled"]),
});

export const rewriteExtractSchema = z.object({
  urls: z
    .array(z.string().trim().url("URL tidak valid."))
    .min(1, "Minimal satu URL.")
    .max(5, "Maksimal lima URL."),
});

export const contentStudioIdeationSchema = z.object({
  sessionKey: z.string().trim().min(6).max(64),
  pillar: pillarSchema,
  area: z.string().trim().min(2).max(120),
  contentGoal: z.string().trim().min(3).max(240),
  topicBrief: z.string().trim().min(3).max(2000),
  knownContext: z.string().trim().max(4000).optional().or(z.literal("")),
  constraints: z.string().trim().max(1000).optional().or(z.literal("")),
  ideaCount: z.coerce.number().int().min(3).max(10).default(6),
});

export const contentStudioHeadlineSchema = z.object({
  sessionKey: z.string().trim().min(6).max(64),
  pillar: pillarSchema,
  angle: z.string().trim().min(5).max(1000),
  verifiedFacts: z.string().trim().max(6000).optional().or(z.literal("")),
  targetReader: z.string().trim().max(240).optional().or(z.literal("")),
  goal: z.string().trim().max(240).optional().or(z.literal("")),
  avoidTerms: z.string().trim().max(240).optional().or(z.literal("")),
});

export const contentStudioOutlineSchema = z.object({
  sessionKey: z.string().trim().min(6).max(64),
  pillar: pillarSchema,
  title: z.string().trim().min(5).max(200),
  angle: z.string().trim().min(5).max(1000),
  editorBrief: z.string().trim().max(2000).optional().or(z.literal("")),
  verifiedFacts: z.string().trim().max(6000).optional().or(z.literal("")),
  sources: z.string().trim().max(2000).optional().or(z.literal("")),
  targetWordCount: z.coerce.number().int().min(300).max(2500).default(900),
});

export const contentStudioDraftSchema = z.object({
  sessionKey: z.string().trim().min(6).max(64),
  pillar: pillarSchema,
  title: z.string().trim().min(5).max(200),
  approvedOutline: z.string().trim().min(20).max(12000),
  verifiedFacts: z.string().trim().max(8000).optional().or(z.literal("")),
  sources: z.string().trim().max(2000).optional().or(z.literal("")),
  editorNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  targetWordCount: z.coerce.number().int().min(300).max(2500).default(900),
});

export const contentStudioFinishSchema = z.object({
  sessionKey: z.string().trim().min(6).max(64),
  pillar: pillarSchema,
  title: z.string().trim().min(5).max(200),
  articleMarkdown: z.string().trim().min(50).max(120_000),
  coverImageUrl: z.string().trim().url().optional().or(z.literal("")),
  authorName: z.string().trim().max(120).optional().or(z.literal("")),
  knownRisks: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const rewriteSynthesisSchema = z.object({
  rewriteJobId: uuidSchema,
  pillar: pillarSchema,
  editorBrief: z.string().trim().min(5).max(2000),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  targetWordCount: z.coerce.number().int().min(300).max(2000).default(700),
});

/** Turns a ZodError into the flat map React Hook Form and route handlers use. */
export function fieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    result[key] ??= issue.message;
  }
  return result;
}
