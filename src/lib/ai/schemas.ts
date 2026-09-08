import { z } from "zod";

/**
 * Zod contracts for every AI task output.
 *
 * Nothing from a provider is trusted: the response is parsed strictly, and a
 * failure is a job failure with a readable message rather than a partially
 * populated editor.
 */

export const ideaSchema = z.object({
  idea_id: z.string().min(1),
  pillar: z.enum(["vibes", "suara", "hustle", "story"]),
  working_title: z.string().min(3),
  one_line_hook: z.string().min(3),
  angle: z.string().min(3),
  why_now: z.string().min(3),
  target_reader: z.string().min(2),
  format: z.string().min(2),
  research_needs: z.array(z.string()).default([]),
  potential_sources: z.array(z.string()).default([]),
  visual_direction: z.string().default(""),
  social_teaser: z.string().default(""),
  editorial_risk: z.enum(["low", "medium", "high"]).default("medium"),
});
export type AiIdea = z.infer<typeof ideaSchema>;

export const ideationOutputSchema = z.object({
  content_ideas: z.array(ideaSchema).min(1).max(12),
});
export type IdeationOutput = z.infer<typeof ideationOutputSchema>;

export const headlineOptionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(5).max(220),
  style: z
    .enum(["direct", "curiosity", "storytelling", "utility", "opinion"])
    .catch("direct"),
  character_count: z.number().int().nonnegative().optional(),
  why_it_works: z.string().default(""),
  risk_note: z.string().nullable().default(null),
});

export const headlineOutputSchema = z.object({
  headline_options: z.array(headlineOptionSchema).min(1).max(10),
  recommended_id: z.string().optional(),
  editor_note: z.string().default(""),
});
export type HeadlineOutput = z.infer<typeof headlineOutputSchema>;

export const outlineSectionSchema = z.object({
  order: z.number().int().nonnegative(),
  heading: z.string().min(2),
  purpose: z.string().default(""),
  key_points: z.array(z.string()).default([]),
  evidence_or_sources_needed: z.array(z.string()).default([]),
  visual_suggestion: z.string().default(""),
});

export const outlineOutputSchema = z.object({
  article_plan: z.object({
    title: z.string().min(3),
    pillar: z.string().default(""),
    estimated_word_count: z.number().int().nonnegative().default(0),
    reader_promise: z.string().default(""),
    opening_hook: z.string().default(""),
    nut_graf: z.string().default(""),
    sections: z.array(outlineSectionSchema).min(1),
    closing_direction: z.string().default(""),
    fact_check_list: z.array(z.string()).default([]),
    risk_flags: z.array(z.string()).default([]),
  }),
});
export type OutlineOutput = z.infer<typeof outlineOutputSchema>;

export const citationSchema = z.object({
  source_name: z.string().min(1),
  source_url: z.string().default(""),
  claim_supported: z.string().default(""),
});

export const draftOutputSchema = z.object({
  title: z.string().min(3),
  dek: z.string().default(""),
  article_markdown: z.string().min(50),
  suggested_pull_quote: z.string().default(""),
  image_search_queries: z.array(z.string()).default([]),
  citations_used: z.array(citationSchema).default([]),
  verification_needed: z.array(z.string()).default([]),
  editor_notes: z.array(z.string()).default([]),
});
export type DraftOutput = z.infer<typeof draftOutputSchema>;

export const rewriteOutputSchema = z.object({
  decision: z.enum([
    "proceed",
    "needs_more_original_reporting",
    "insufficient_source_material",
  ]),
  decision_reason: z.string().default(""),
  proposed_angle: z.string().default(""),
  title: z.string().default(""),
  dek: z.string().default(""),
  article_markdown: z.string().default(""),
  source_attribution_map: z
    .array(
      z.object({
        source_name: z.string().min(1),
        source_url: z.string().default(""),
        facts_used: z.array(z.string()).default([]),
        attribution_phrase_used: z.string().default(""),
      }),
    )
    .default([]),
  unique_value_added: z.array(z.string()).default([]),
  verification_needed: z.array(z.string()).default([]),
  similarity_sensitive_passages: z.array(z.string()).default([]),
  editor_notes: z.array(z.string()).default([]),
});
export type RewriteOutput = z.infer<typeof rewriteOutputSchema>;

export const seoOutputSchema = z.object({
  seo_title: z.string().min(3),
  meta_description: z.string().min(10),
  excerpt: z.string().max(220).default(""),
  slug: z.string().min(3),
  primary_keyword: z.string().default(""),
  secondary_keywords: z.array(z.string()).max(8).default([]),
  tags: z.array(z.string()).max(5).default([]),
  og_title: z.string().default(""),
  og_description: z.string().default(""),
  image_alt_text: z.string().default(""),
  internal_link_suggestions: z
    .array(
      z.object({
        anchor_text: z.string().default(""),
        target_topic_or_slug: z.string().default(""),
        reason: z.string().default(""),
      }),
    )
    .default([]),
  entity_keywords: z.array(z.string()).max(12).default([]),
  geo_answer_targets: z
    .array(
      z.object({
        question: z.string().default(""),
        answer_summary: z.string().default(""),
        evidence_needed: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  faq_candidates: z
    .array(
      z.object({
        question: z.string().default(""),
        short_answer: z.string().default(""),
      }),
    )
    .max(4)
    .default([]),
  content_refresh_notes: z.array(z.string()).default([]),
  // Passed through unchanged; the site renders its own JSON-LD from stored
  // metadata, so a model-authored graph is reference material only.
  newsarticle_jsonld: z.unknown().optional(),
  seo_warnings: z.array(z.string()).default([]),
});
export type SeoOutput = z.infer<typeof seoOutputSchema>;

export const imageQueryOutputSchema = z.object({
  recommended_visual_type: z
    .enum(["photo", "illustration", "map", "data_visual", "no_image"])
    .catch("photo"),
  search_queries: z.array(z.string()).default([]),
  cover_direction: z.string().default(""),
  in_article_visuals: z
    .array(
      z.object({
        placement: z.string().default(""),
        query: z.string().default(""),
        caption_guidance: z.string().default(""),
      }),
    )
    .default([]),
  ethics_notes: z.array(z.string()).default([]),
});
export type ImageQueryOutput = z.infer<typeof imageQueryOutputSchema>;

export const qualityGateOutputSchema = z.object({
  publish_readiness: z.enum([
    "ready",
    "ready_with_minor_edits",
    "needs_editor_review",
    "do_not_publish",
  ]),
  overall_score: z.number().min(0).max(100).default(0),
  summary: z.string().default(""),
  critical_issues: z
    .array(
      z.object({
        type: z
          .enum(["fact", "attribution", "legal", "ethics", "plagiarism_risk"])
          .catch("fact"),
        location: z.string().default(""),
        issue: z.string().default(""),
        fix: z.string().default(""),
      }),
    )
    .default([]),
  style_issues: z
    .array(
      z.object({
        location: z.string().default(""),
        issue: z.string().default(""),
        suggested_revision: z.string().default(""),
      }),
    )
    .default([]),
  missing_verification: z.array(z.string()).default([]),
  attribution_check: z
    .array(
      z.object({
        source: z.string().default(""),
        status: z.enum(["present", "missing", "unclear"]).catch("unclear"),
        note: z.string().default(""),
      }),
    )
    .default([]),
  seo_check: z.array(z.string()).default([]),
  final_editor_action: z.string().default(""),
});
export type QualityGateOutput = z.infer<typeof qualityGateOutputSchema>;

export const socialOutputSchema = z.object({
  instagram_caption: z.string().default(""),
  instagram_carousel_slides: z.array(z.string()).default([]),
  tiktok_script: z
    .object({
      hook_0_3_seconds: z.string().default(""),
      voiceover: z.string().default(""),
      visual_beats: z.array(z.string()).default([]),
      cta: z.string().default(""),
    })
    .default({
      hook_0_3_seconds: "",
      voiceover: "",
      visual_beats: [],
      cta: "",
    }),
  whatsapp_channel_post: z.string().default(""),
  social_headline_options: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
  accuracy_notes: z.array(z.string()).default([]),
});
export type SocialOutput = z.infer<typeof socialOutputSchema>;

/** Maps a task to its output schema. */
export const TASK_OUTPUT_SCHEMAS = {
  ideation: ideationOutputSchema,
  headline: headlineOutputSchema,
  outline: outlineOutputSchema,
  draft: draftOutputSchema,
  rewrite: rewriteOutputSchema,
  seo: seoOutputSchema,
  image: imageQueryOutputSchema,
  quality: qualityGateOutputSchema,
  social: socialOutputSchema,
} as const;

export type SchemaTaskKey = keyof typeof TASK_OUTPUT_SCHEMAS;
