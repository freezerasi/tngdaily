"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getApiAuth } from "@/lib/auth";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";
import { slugTaken } from "@/lib/data/admin";
import {
  articleSourceSchema,
  articleUpsertSchema,
  fieldErrors,
  moderationSchema,
  uuidSchema,
} from "@/lib/validation";
import {
  buildExcerpt,
  parseTagInput,
  readingMinutes,
  slugify,
  uniqueSlug,
} from "@/lib/content";
import { toIsoOrNull } from "@/lib/dates";
import type { ArticleStatus } from "@/types/domain";

/**
 * CMS Server Actions.
 *
 * Every action re-checks the caller's role: middleware protects navigation, not
 * data. Publishing is always an explicit action with its own payload, so an
 * autosave can never flip an article live.
 */

export interface ActionResult {
  ok: boolean;
  message?: string;
  fields?: Record<string, string>;
  articleId?: string;
  slug?: string;
  savedAt?: string;
}

function fail(message: string, fields?: Record<string, string>): ActionResult {
  return fields ? { ok: false, message, fields } : { ok: false, message };
}

function revalidateArticle(slug: string | null): void {
  // updateTag gives read-your-own-writes inside a Server Action; the cached
  // sitemap query is tagged "articles".
  updateTag("articles");
  revalidatePath("/");
  revalidatePath("/vibes");
  revalidatePath("/suara");
  revalidatePath("/hustle");
  revalidatePath("/story");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/artikel/${slug}`);
}

/**
 * Creates or updates an article. Status transitions are validated here rather
 * than trusted from the form: a draft save cannot publish, and a publish
 * requires a timestamp.
 */
export async function saveArticleAction(
  raw: unknown,
): Promise<ActionResult> {
  let auth;
  try {
    auth = await getApiAuth("editor");
  } catch (caught) {
    return fail(
      caught instanceof Error
        ? `Sesi tidak bisa diverifikasi: ${caught.message}`
        : "Sesi tidak bisa diverifikasi. Login ulang lalu coba lagi.",
    );
  }
  if (!auth) return fail("Kamu tidak punya akses untuk menyimpan artikel.");

  const parsed = articleUpsertSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Data artikel belum valid.", fieldErrors(parsed.error));
  }

  const supabase = await getServerSupabase();
  if (!supabase) return fail("Database belum dikonfigurasi.");

  const values = parsed.data;
  const now = new Date().toISOString();

  // Slug: keep the editor's value when free, otherwise suffix it. Never change
  // a published slug silently.
  let slug = slugify(values.slug || values.title);
  if (!slug) return fail("Slug tidak bisa dibuat dari judul ini.");

  let taken: boolean;
  try {
    taken = await slugTaken(slug, values.id);
  } catch (caught) {
    return fail(
      caught instanceof Error
        ? `Slug tidak bisa diperiksa: ${caught.message}`
        : "Slug tidak bisa diperiksa. Coba lagi sebentar.",
    );
  }

  if (taken) {
    if (values.id) {
      return fail("Slug sudah dipakai artikel lain.", {
        slug: "Slug sudah dipakai artikel lain.",
      });
    }
    try {
      slug = await uniqueSlug(slug, (candidate) => slugTaken(candidate));
    } catch (caught) {
      return fail(
        caught instanceof Error
          ? `Slug tidak bisa dibuat: ${caught.message}`
          : "Slug tidak bisa dibuat. Coba lagi sebentar.",
      );
    }
  }

  const status: ArticleStatus = values.status;
  const scheduledAt = toIsoOrNull(values.scheduledAt || null);
  const publishedAt = toIsoOrNull(values.publishedAt || null);

  if (status === "scheduled") {
    if (!scheduledAt) {
      return fail("Artikel terjadwal butuh tanggal tayang.", {
        scheduledAt: "Tentukan tanggal dan jam tayang.",
      });
    }
    if (new Date(scheduledAt) <= new Date()) {
      return fail("Jadwal tayang harus di masa depan.", {
        scheduledAt: "Pilih waktu yang belum lewat.",
      });
    }
  }

  const markdown = values.contentMarkdown ?? "";

  const payload = {
    title: values.title,
    slug,
    pillar: values.pillar,
    status,
    dek: values.dek || null,
    excerpt: values.excerpt || (markdown ? buildExcerpt(markdown) : null),
    content_markdown: markdown,
    cover_image_url: values.coverImageUrl || null,
    cover_image_alt:
      values.coverImageAlt ||
      (values.coverImageUrl ? `Ilustrasi untuk ${values.title}` : null),
    cover_image_credit: values.coverImageCredit || null,
    tags: parseTagInput(values.tagsInput ?? ""),
    author_name: values.authorName || null,
    author_id: auth.profile.id,
    scheduled_at: status === "scheduled" ? scheduledAt : null,
    published_at:
      status === "published" ? (publishedAt ?? now) : publishedAt,
    seo_title: values.seoTitle || null,
    meta_description: values.metaDescription || null,
    primary_keyword: values.primaryKeyword || null,
    secondary_keywords: parseTagInput(values.secondaryKeywordsInput ?? ""),
    reading_minutes: markdown ? readingMinutes(markdown) : null,
  };

  if (values.id) {
    let updateError: { code?: string; message: string } | null = null;
    try {
      const { error } = await supabase
        .from("articles")
        .update(payload)
        .eq("id", values.id);
      updateError = error;
    } catch (caught) {
      // postgrest throws on network-level failures; surface a readable
      // message instead of letting the action crash with a generic error.
      updateError = {
        message:
          caught instanceof Error ? caught.message : "Koneksi database gagal.",
      };
    }

    if (updateError) {
      return fail(
        updateError.code === "23505"
          ? "Slug sudah dipakai artikel lain."
          : updateError.code
            ? `Artikel gagal disimpan (kode ${updateError.code}). Coba lagi.`
            : `Artikel gagal disimpan: ${updateError.message}`,
      );
    }

    revalidateArticle(slug);
    revalidatePath(`/admin/konten/${values.id}/edit`);
    return {
      ok: true,
      message: "Artikel disimpan.",
      articleId: values.id,
      slug,
      savedAt: new Date().toISOString(),
    };
  }

  let insertData: { id: string } | null = null;
  let insertError: { message: string } | null = null;
  try {
    const { data, error } = await supabase
      .from("articles")
      .insert(payload)
      .select("id")
      .maybeSingle();
    insertData = (data as { id: string } | null) ?? null;
    insertError = error;
  } catch (caught) {
    insertError = {
      message:
        caught instanceof Error ? caught.message : "Koneksi database gagal.",
    };
  }

  if (insertError || !insertData) {
    return fail(
      insertError
        ? `Artikel gagal dibuat: ${insertError.message}`
        : "Artikel gagal dibuat.",
    );
  }

  revalidateArticle(slug);
  revalidatePath("/admin/konten");

  return {
    ok: true,
    message: "Artikel dibuat sebagai draft.",
    articleId: insertData.id,
    slug,
    savedAt: new Date().toISOString(),
  };
}

/**
 * Explicit publish or schedule. Separate from the save action so publishing is
 * always a deliberate, confirmable act.
 */
export async function publishArticleAction(input: {
  articleId: string;
  mode: "publish" | "schedule" | "unpublish" | "archive";
  scheduledAt?: string;
}): Promise<ActionResult> {
  let auth;
  try {
    auth = await getApiAuth("editor");
  } catch (caught) {
    return fail(
      caught instanceof Error
        ? `Sesi tidak bisa diverifikasi: ${caught.message}`
        : "Sesi tidak bisa diverifikasi. Login ulang lalu coba lagi.",
    );
  }
  if (!auth) return fail("Kamu tidak punya akses untuk menerbitkan artikel.");

  const id = uuidSchema.safeParse(input.articleId);
  if (!id.success) return fail("ID artikel tidak valid.");

  const supabase = await getServerSupabase();
  if (!supabase) return fail("Database belum dikonfigurasi.");

  type PublishRow = {
    slug: string;
    title: string;
    content_markdown: string;
    published_at: string | null;
  };
  let existing: PublishRow | null = null;
  try {
    const { data } = await supabase
      .from("articles")
      .select("slug, title, content_markdown, published_at")
      .eq("id", id.data)
      .maybeSingle();
    existing = (data as PublishRow | null) ?? null;
  } catch (caught) {
    return fail(
      caught instanceof Error
        ? `Artikel tidak bisa dibaca: ${caught.message}`
        : "Artikel tidak bisa dibaca dari database.",
    );
  }

  if (!existing) return fail("Artikel tidak ditemukan.");

  const row: PublishRow = existing;

  const now = new Date().toISOString();
  let update: Record<string, unknown>;

  switch (input.mode) {
    case "publish": {
      if (!row.content_markdown.trim()) {
        return fail("Artikel masih kosong, belum bisa ditayangkan.");
      }
      update = {
        status: "published",
        published_at: row.published_at ?? now,
        scheduled_at: null,
      };
      break;
    }
    case "schedule": {
      const scheduledAt = toIsoOrNull(input.scheduledAt ?? null);
      if (!scheduledAt) return fail("Tanggal jadwal tidak valid.");
      if (new Date(scheduledAt) <= new Date()) {
        return fail("Jadwal tayang harus di masa depan.");
      }
      if (!row.content_markdown.trim()) {
        return fail("Artikel masih kosong, belum bisa dijadwalkan.");
      }
      update = { status: "scheduled", scheduled_at: scheduledAt };
      break;
    }
    case "unpublish":
      update = { status: "draft", scheduled_at: null };
      break;
    case "archive":
      update = { status: "archived", scheduled_at: null };
      break;
  }

  let publishError: { message: string } | null = null;
  try {
    const { error } = await supabase
      .from("articles")
      .update(update)
      .eq("id", id.data);
    publishError = error;
  } catch (caught) {
    publishError = {
      message:
        caught instanceof Error ? caught.message : "Koneksi database gagal.",
    };
  }
  if (publishError) {
    return fail(`Status artikel gagal diubah: ${publishError.message}`);
  }

  revalidateArticle(row.slug);
  revalidatePath("/admin/konten");
  revalidatePath(`/admin/konten/${id.data}/edit`);

  const messages: Record<typeof input.mode, string> = {
    publish: "Artikel tayang.",
    schedule: "Artikel dijadwalkan.",
    unpublish: "Artikel dikembalikan ke draft.",
    archive: "Artikel diarsipkan.",
  };

  return { ok: true, message: messages[input.mode], slug: row.slug };
}

export async function deleteArticleAction(articleId: string): Promise<ActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa menghapus artikel.");

  const id = uuidSchema.safeParse(articleId);
  if (!id.success) return fail("ID artikel tidak valid.");

  const supabase = await getServerSupabase();
  if (!supabase) return fail("Database belum dikonfigurasi.");

  const { data: existing } = await supabase
    .from("articles")
    .select("slug")
    .eq("id", id.data)
    .maybeSingle();

  const { error } = await supabase.from("articles").delete().eq("id", id.data);
  if (error) return fail("Artikel gagal dihapus.");

  revalidateArticle((existing as { slug: string } | null)?.slug ?? null);
  revalidatePath("/admin/konten");
  redirect("/admin/konten");
}

export async function addArticleSourceAction(input: {
  articleId: string;
  sourceName: string;
  sourceUrl: string;
  attributionText?: string;
}): Promise<ActionResult> {
  const auth = await getApiAuth("editor");
  if (!auth) return fail("Kamu tidak punya akses untuk mengubah sumber.");

  const id = uuidSchema.safeParse(input.articleId);
  if (!id.success) return fail("ID artikel tidak valid.");

  const parsed = articleSourceSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Data sumber belum valid.", fieldErrors(parsed.error));
  }

  const supabase = await getServerSupabase();
  if (!supabase) return fail("Database belum dikonfigurasi.");

  const { error } = await supabase.from("article_sources").insert({
    article_id: id.data,
    source_name: parsed.data.sourceName,
    source_url: parsed.data.sourceUrl,
    attribution_text: parsed.data.attributionText || null,
    source_type: parsed.data.sourceType,
  });

  if (error) return fail("Sumber gagal disimpan.");

  revalidatePath(`/admin/konten/${id.data}/edit`);
  return { ok: true, message: "Sumber ditambahkan." };
}

export async function removeArticleSourceAction(
  sourceId: string,
): Promise<ActionResult> {
  const auth = await getApiAuth("editor");
  if (!auth) return fail("Kamu tidak punya akses untuk mengubah sumber.");

  const id = uuidSchema.safeParse(sourceId);
  if (!id.success) return fail("ID sumber tidak valid.");

  const supabase = await getServerSupabase();
  if (!supabase) return fail("Database belum dikonfigurasi.");

  const { error } = await supabase.from("article_sources").delete().eq("id", id.data);
  if (error) return fail("Sumber gagal dihapus.");

  return { ok: true, message: "Sumber dihapus." };
}

/**
 * Contribution moderation. Approving records the reviewer and timestamp but
 * never auto-publishes: an approved contribution still becomes a draft article
 * that an editor writes.
 */
export async function moderateContributionAction(
  raw: unknown,
): Promise<ActionResult> {
  const auth = await getApiAuth("editor");
  if (!auth) return fail("Kamu tidak punya akses moderasi.");

  const parsed = moderationSchema.safeParse(raw);
  if (!parsed.success) return fail("Permintaan moderasi tidak valid.");

  const supabase = await getServerSupabase();
  if (!supabase) return fail("Database belum dikonfigurasi.");

  const { action, contributionId, note } = parsed.data;

  const status =
    action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";

  const { error } = await supabase
    .from("contributions")
    .update({
      status,
      moderation_note: note || null,
      reviewed_by: action === "reset" ? null : auth.profile.id,
      reviewed_at: action === "reset" ? null : new Date().toISOString(),
    })
    .eq("id", contributionId);

  if (error) return fail("Status kontribusi gagal diubah.");

  revalidatePath("/admin/kontribusi");
  revalidatePath("/admin");

  const messages = {
    approve: "Kontribusi disetujui. Buat draft artikel untuk menayangkannya.",
    reject: "Kontribusi ditolak.",
    reset: "Kontribusi dikembalikan ke antrean.",
  } as const;

  return { ok: true, message: messages[action] };
}

/**
 * Creates a draft article from an approved contribution, carrying attribution.
 * Returns the new article id so the UI can navigate straight into the editor.
 */
export async function draftFromContributionAction(
  contributionId: string,
): Promise<ActionResult> {
  const auth = await getApiAuth("editor");
  if (!auth) return fail("Kamu tidak punya akses untuk membuat draft.");

  const id = uuidSchema.safeParse(contributionId);
  if (!id.success) return fail("ID kontribusi tidak valid.");

  const supabase = await getServerSupabase();
  if (!supabase) return fail("Database belum dikonfigurasi.");

  const { data } = await supabase
    .from("contributions")
    .select("*")
    .eq("id", id.data)
    .maybeSingle();

  if (!data) return fail("Kontribusi tidak ditemukan.");

  const contribution = data as {
    title: string;
    content: string;
    pillar: "vibes" | "suara" | "hustle" | "story";
    contributor_name: string;
    location: string | null;
    media_urls: string[] | null;
  };

  const slug = await uniqueSlug(contribution.title, (candidate) =>
    slugTaken(candidate),
  );

  const markdown = [
    contribution.content.trim(),
    "",
    `[BUTUH VERIFIKASI: konfirmasi detail kiriman dari ${contribution.contributor_name}${
      contribution.location ? ` di ${contribution.location}` : ""
    } sebelum tayang]`,
  ].join("\n");

  const { data: created, error } = await supabase
    .from("articles")
    .insert({
      title: contribution.title,
      slug,
      pillar: contribution.pillar,
      status: "needs_review",
      content_markdown: markdown,
      excerpt: buildExcerpt(contribution.content),
      author_name: `Kiriman ${contribution.contributor_name}`,
      author_id: auth.profile.id,
      reading_minutes: readingMinutes(markdown),
      tags: ["kiriman-pembaca"],
    })
    .select("id")
    .maybeSingle();

  if (error || !created) return fail("Draft gagal dibuat dari kontribusi.");

  const articleId = (created as { id: string }).id;

  // Link the contribution to its draft so moderation history stays traceable.
  const admin = getAdminSupabase();
  if (admin) {
    await admin
      .from("contributions")
      .update({ published_article_id: articleId })
      .eq("id", id.data);
  }

  revalidatePath("/admin/kontribusi");
  revalidatePath("/admin/konten");

  return {
    ok: true,
    message: "Draft dibuat dari kontribusi.",
    articleId,
    slug,
  };
}
