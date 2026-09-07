import type {
  AiJobStatus,
  AiKeyStatus,
  AiTaskType,
  ArticleStatus,
  ContributionStatus,
  DirectoryType,
  RewriteJobStatus,
  UserRole,
} from "@/types/domain";

/**
 * Display labels.
 *
 * Deliberately free of server-only imports: Client Components need these, and
 * pulling them from a data module would drag the Supabase server client into the
 * browser bundle.
 */

export function articleStatusLabel(status: ArticleStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "needs_review":
      return "Perlu review";
    case "scheduled":
      return "Terjadwal";
    case "published":
      return "Tayang";
    case "archived":
      return "Arsip";
  }
}

export function contributionStatusLabel(status: ContributionStatus): string {
  switch (status) {
    case "pending":
      return "Menunggu";
    case "approved":
      return "Disetujui";
    case "rejected":
      return "Ditolak";
  }
}

export function aiKeyStatusLabel(status: AiKeyStatus): string {
  switch (status) {
    case "active":
      return "Aktif";
    case "rate_limited":
      return "Rate limited";
    case "error":
      return "Error";
    case "disabled":
      return "Nonaktif";
  }
}

export function aiJobStatusLabel(status: AiJobStatus): string {
  switch (status) {
    case "pending":
      return "Menunggu";
    case "processing":
      return "Diproses";
    case "completed":
      return "Selesai";
    case "failed":
      return "Gagal";
  }
}

export function rewriteStatusLabel(status: RewriteJobStatus): string {
  switch (status) {
    case "pending":
      return "Menunggu";
    case "processing":
      return "Diproses";
    case "needs_review":
      return "Perlu review";
    case "completed":
      return "Selesai";
    case "failed":
      return "Gagal";
  }
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "reader":
      return "Pembaca";
    case "analyst":
      return "Analyst";
    case "contributor":
      return "Kontributor";
    case "writer":
      return "Writer";
    case "media_manager":
      return "Media Manager";
    case "editor":
      return "Editor";
    case "commercial_manager":
      return "Commercial Manager";
    case "managing_editor":
      return "Managing Editor";
    case "owner":
      return "Owner";
  }
}

export function directoryTypeLabel(type: DirectoryType): string {
  switch (type) {
    case "loker":
      return "Loker";
    case "umkm":
      return "UMKM";
    case "kos":
      return "Kos";
    case "event":
      return "Event";
  }
}

export function taskTypeLabel(taskType: AiTaskType): string {
  switch (taskType) {
    case "brand":
      return "Brand guardrails";
    case "ideation":
      return "Ideasi";
    case "headline":
      return "Judul";
    case "outline":
      return "Outline";
    case "draft":
      return "Draft artikel";
    case "rewrite":
      return "Rewrite dan sintesis";
    case "seo":
      return "SEO metadata";
    case "image":
      return "Query gambar";
    case "quality":
      return "Quality gate";
    case "social":
      return "Distribusi sosial";
    case "copilot":
      return "Editor copilot";
    case "connection_test":
      return "Tes koneksi";
  }
}
