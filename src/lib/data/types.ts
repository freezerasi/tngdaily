import type {
  AiJobStatus,
  AiKeyStatus,
  AiTaskType,
  ArticleStatus,
  ContributionStatus,
  DirectoryType,
  ImageSource,
  MediaProvenance,
  Pillar,
  RewriteJobStatus,
  UserRole,
} from "@/types/domain";

/**
 * View models used by the UI. Deliberately separate from the raw row types so
 * the data layer can serve either Supabase or bundled demo content without the
 * components knowing which.
 */

export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  dek: string | null;
  excerpt: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  /**
   * Provenance of the cover frame. Null when there is no cover. Components must
   * consult this before rendering a credit or implying a location.
   */
  coverProvenance: MediaProvenance | null;
  pillar: Pillar;
  tags: string[];
  status: ArticleStatus;
  authorName: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  updatedAt: string;
  createdAt: string;
  readingMinutes: number;
  isSample: boolean;
  /**
   * True for development fixtures. `lib/content-environment` is the only module
   * allowed to decide what that means for rendering and indexing.
   */
  isMock: boolean;
  generatedByAi: boolean;
  counts: {
    view: number;
    like: number;
    save: number;
    share: number;
  };
}

export interface ArticleSourceView {
  id: string;
  sourceName: string;
  sourceUrl: string;
  attributionText: string | null;
  sourceType: string;
}

export interface ArticleImageView {
  id: string;
  url: string;
  altText: string | null;
  caption: string | null;
  source: ImageSource;
  photographerName: string | null;
  photographerUrl: string | null;
  attributionText: string | null;
  originalSourceUrl: string | null;
  cloudinaryPublicId: string | null;
  isCover: boolean;
}

export interface ArticleDetail extends ArticleSummary {
  contentMarkdown: string;
  contentHtml: string;
  /**
   * Legacy caption field kept for the CMS text input. The reader-facing credit
   * comes from `coverProvenance.credit`, which cannot claim reporting that did
   * not happen.
   */
  coverImageCredit: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  aiProviderUsed: string | null;
  sourceRewriteJobId: string | null;
  sources: ArticleSourceView[];
  images: ArticleImageView[];
}

export interface ContributionView {
  id: string;
  contributorName: string;
  contributorContact: string | null;
  title: string;
  content: string;
  pillar: Pillar;
  location: string | null;
  mediaUrls: string[];
  consentPublish: boolean;
  consentEdit: boolean;
  status: ContributionStatus;
  moderationNote: string | null;
  reviewedAt: string | null;
  publishedArticleId: string | null;
  createdAt: string;
}

export interface DirectoryListingView {
  id: string;
  type: DirectoryType;
  title: string;
  description: string | null;
  companyName: string | null;
  contactInfo: string | null;
  location: string | null;
  priceRange: string | null;
  externalUrl: string | null;
  isPaid: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface ProfileView {
  id: string;
  username: string | null;
  displayName: string | null;
  role: UserRole;
}

export interface AiProviderView {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  keys: AiApiKeyView[];
}

/** Never carries the secret or its vault reference to the browser. */
export interface AiApiKeyView {
  id: string;
  providerId: string;
  keyLabel: string | null;
  keyPreview: string;
  priority: number;
  status: AiKeyStatus;
  lastUsedAt: string | null;
  lastError: string | null;
}

export interface AiUsageLogView {
  id: string;
  providerName: string | null;
  taskType: AiTaskType;
  model: string | null;
  tokensUsed: number | null;
  latencyMs: number | null;
  success: boolean;
  statusCode: number | null;
  errorCode: string | null;
  attempt: number;
  createdAt: string;
}

export interface AiUsageStats {
  totalRequests: number;
  successRate: number;
  averageLatencyMs: number;
  totalTokens: number;
  perProvider: Array<{
    providerName: string;
    requests: number;
    successRate: number;
    averageLatencyMs: number;
  }>;
}

export interface PromptTemplateView {
  id: string;
  templateKey: string;
  taskType: AiTaskType;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string | null;
  version: number;
  isActive: boolean;
  updatedAt: string;
  /** True when the template came from the bundled file fallback, not the DB. */
  isFallback: boolean;
}

export interface GenerationJobView {
  id: string;
  sessionKey: string | null;
  articleId: string | null;
  taskType: AiTaskType;
  status: AiJobStatus;
  input: unknown;
  output: unknown;
  promptTemplateKey: string | null;
  promptVersion: number | null;
  providerName: string | null;
  model: string | null;
  latencyMs: number | null;
  revision: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RewriteJobView {
  id: string;
  sourceUrls: string[];
  extractedContent: unknown;
  synthesis: unknown;
  generatedArticleId: string | null;
  similarityScore: number | null;
  similarityReport: unknown;
  decision: string | null;
  status: RewriteJobStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  publishedCount: number;
  draftCount: number;
  scheduledCount: number;
  pendingContributions: number;
  totalViews: number;
  totalReactions: number;
  aiRequests7d: number;
  aiSuccessRate7d: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Signals to the UI where the data came from, so an admin screen can show an
 * honest setup state instead of pretending an empty list is real.
 */
export type DataSource = "supabase" | "demo" | "unconfigured";

export interface DataResult<T> {
  data: T;
  source: DataSource;
  /** Present when Supabase is configured but the query failed. */
  error?: string;
}
