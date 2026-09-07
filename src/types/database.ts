import type {
  AiJobStatus,
  AiKeyStatus,
  AiTaskType,
  ArticleStatus,
  ContributionStatus,
  DirectoryType,
  ImageSource,
  Pillar,
  ReactionType,
  RewriteJobStatus,
} from "@/types/domain";

/** Row shapes as returned by Supabase. Keep aligned with the SQL migrations. */

export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  dek: string | null;
  content_markdown: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  cover_image_credit: string | null;
  /**
   * Cover provenance. Added in migration 0007. Nullable so a row written before
   * the migration still maps, and so the UI can surface an incomplete credit
   * rather than inventing one.
   */
  cover_media_source_type: string | null;
  cover_media_credit: string | null;
  cover_media_disclosure: string | null;
  cover_depicts_actual_location: boolean | null;
  cover_depicts_actual_event: boolean | null;
  pillar: Pillar;
  tags: string[] | null;
  status: ArticleStatus;
  author_id: string | null;
  author_name: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  seo_title: string | null;
  meta_description: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[] | null;
  reading_minutes: number | null;
  generated_by_ai: boolean;
  ai_provider_used: string | null;
  source_rewrite_job_id: string | null;
  is_sample: boolean;
  view_count: number;
  like_count: number;
  save_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleSourceRow {
  id: string;
  article_id: string;
  source_name: string;
  source_url: string;
  attribution_text: string | null;
  source_type: string;
  created_at: string;
}

export interface ArticleImageRow {
  id: string;
  article_id: string | null;
  cloudinary_public_id: string | null;
  url: string;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  source: ImageSource;
  original_source_url: string | null;
  photographer_name: string | null;
  photographer_url: string | null;
  attribution_text: string | null;
  is_cover: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ReactionRow {
  id: string;
  article_id: string;
  session_id: string;
  type: ReactionType;
  created_at: string;
}

export interface ContributionRow {
  id: string;
  contributor_name: string;
  contributor_contact: string | null;
  title: string;
  content: string;
  pillar: Pillar;
  location: string | null;
  media_urls: string[] | null;
  consent_publish: boolean;
  consent_edit: boolean;
  status: ContributionStatus;
  moderation_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_article_id: string | null;
  submitter_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectoryListingRow {
  id: string;
  type: DirectoryType;
  title: string;
  description: string | null;
  company_name: string | null;
  contact_info: string | null;
  location: string | null;
  price_range: string | null;
  external_url: string | null;
  is_paid: boolean;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiProviderRow {
  id: string;
  name: string;
  base_url: string;
  default_model: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiModelRow {
  id: string;
  provider_id: string;
  model_key: string;
  display_name: string | null;
  is_enabled: boolean;
  source: "detected" | "manual";
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiTaskModelRow {
  id: string;
  task_type: AiTaskType;
  model_id: string;
  priority: number;
  is_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiApiKeyRow {
  id: string;
  provider_id: string;
  vault_secret_id: string;
  key_label: string | null;
  key_preview: string;
  priority: number;
  status: AiKeyStatus;
  last_used_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiUsageLogRow {
  id: string;
  api_key_id: string | null;
  provider_name: string | null;
  task_type: AiTaskType;
  model: string | null;
  tokens_used: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  latency_ms: number | null;
  success: boolean;
  status_code: number | null;
  error_code: string | null;
  attempt: number;
  created_at: string;
}

export interface AiPromptTemplateRow {
  id: string;
  template_key: string;
  task_type: AiTaskType;
  name: string;
  system_prompt: string;
  user_prompt_template: string | null;
  output_schema: unknown;
  version: number;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiGenerationJobRow {
  id: string;
  article_id: string | null;
  session_key: string | null;
  task_type: AiTaskType;
  status: AiJobStatus;
  input: unknown;
  output: unknown;
  prompt_template_id: string | null;
  prompt_version: number | null;
  prompt_template_key: string | null;
  provider_name: string | null;
  model: string | null;
  latency_ms: number | null;
  revision: number;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RewriteJobRow {
  id: string;
  source_urls: string[];
  extracted_content: unknown;
  synthesis: unknown;
  generated_article_id: string | null;
  similarity_score: number | null;
  similarity_report: unknown;
  decision: string | null;
  status: RewriteJobStatus;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
