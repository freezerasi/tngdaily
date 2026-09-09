"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  Clock,
  Eye,
  Loader2,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BannerPanel } from "@/components/shared/banner-panel";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Textarea } from "@/components/ui/field";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { ImagePicker, type PickedImage } from "@/components/editor/image-picker";
import { AiAssistant } from "@/components/ai/ai-assistant";
import { ArticleStatusMark } from "@/components/admin/article-status-mark";
import { TapePatch } from "@/components/shared/tape-patch";
import { ArticlePreview } from "@/components/admin/article-preview";
import { SourcePanel } from "@/components/admin/source-panel";
import {
  assistantRegenerateSectionAction,
} from "@/app/(admin)/admin/(dashboard)/assistant-actions";
import {
  publishArticleAction,
  saveArticleAction,
  type ActionResult,
} from "@/app/(admin)/admin/(dashboard)/actions";
import { articleUpsertSchema, type ArticleUpsertValues } from "@/lib/validation";
import { slugify } from "@/lib/content";
import { toDateTimeLocalValue } from "@/lib/dates";
import type { ArticleDetail, ArticleSourceView } from "@/lib/data/types";
import {
  ARTICLE_SCHEMA_META,
  ARTICLE_SCHEMA_TYPES,
  PILLARS,
  PILLAR_META,
  type ArticleSchemaType,
} from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Article editor.
 *
 * Autosave is debounced and only ever writes the current status: publishing and
 * scheduling are separate, confirmed actions. Slug is auto-derived until the
 * editor touches it, and never rewritten once the article is published.
 */

const AUTOSAVE_DELAY_MS = 2500;

type SaveState =
  | { kind: "idle" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "error"; message: string };

export function ArticleEditor({
  article,
  authorName,
  canDelete,
  initialDraft,
}: {
  article: ArticleDetail | null;
  authorName: string;
  canDelete: boolean;
  initialDraft?: Partial<ArticleUpsertValues>;
}) {
  const router = useRouter();
  const [articleId, setArticleId] = React.useState<string | null>(
    article?.id ?? null,
  );
  const [saveState, setSaveState] = React.useState<SaveState>({ kind: "idle" });
  const [slugLocked, setSlugLocked] = React.useState(
    Boolean(article) || Boolean(initialDraft?.slug),
  );
  const [scheduleValue, setScheduleValue] = React.useState(
    toDateTimeLocalValue(article?.scheduledAt),
  );
  const [sources, setSources] = React.useState<ArticleSourceView[]>(
    article?.sources ?? [],
  );
  const [coverAttribution, setCoverAttribution] = React.useState<string | null>(
    article?.coverImageCredit ?? null,
  );
  const [schemaChoice, setSchemaChoice] = React.useState<ArticleSchemaType>(
    article?.schemaType ?? "NewsArticle",
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ArticleUpsertValues>({
    resolver: zodResolver(articleUpsertSchema),
    defaultValues: {
      ...(article?.id ? { id: article.id } : {}),
      title: article?.title ?? initialDraft?.title ?? "",
      slug: article?.slug ?? initialDraft?.slug ?? "",
      pillar: article?.pillar ?? initialDraft?.pillar ?? "vibes",
      status: article?.status ?? "draft",
      dek: article?.dek ?? initialDraft?.dek ?? "",
      excerpt: article?.excerpt ?? initialDraft?.excerpt ?? "",
      contentMarkdown:
        article?.contentMarkdown ?? initialDraft?.contentMarkdown ?? "",
      coverImageUrl: article?.coverImageUrl ?? "",
      coverImageAlt: article?.coverImageAlt ?? initialDraft?.coverImageAlt ?? "",
      coverImageCredit: article?.coverImageCredit ?? "",
      tagsInput: article?.tags.join(", ") ?? initialDraft?.tagsInput ?? "",
      authorName: article?.authorName ?? authorName,
      scheduledAt: toDateTimeLocalValue(article?.scheduledAt),
      publishedAt: toDateTimeLocalValue(article?.publishedAt),
      seoTitle: article?.seoTitle ?? initialDraft?.seoTitle ?? "",
      metaDescription:
        article?.metaDescription ?? initialDraft?.metaDescription ?? "",
      primaryKeyword: article?.primaryKeyword ?? initialDraft?.primaryKeyword ?? "",
      secondaryKeywordsInput:
        article?.secondaryKeywords.join(", ") ??
        initialDraft?.secondaryKeywordsInput ??
        "",
      schemaType: article?.schemaType ?? "NewsArticle",
    },
  });

  // useWatch subscribes per field, which the React Compiler can track safely.
  const title = useWatch({ control, name: "title" }) ?? "";
  const slug = useWatch({ control, name: "slug" }) ?? "";
  const status = useWatch({ control, name: "status" }) ?? "draft";
  const markdown = useWatch({ control, name: "contentMarkdown" }) ?? "";
  const coverImageUrl = useWatch({ control, name: "coverImageUrl" }) ?? "";
  const coverImageAlt = useWatch({ control, name: "coverImageAlt" }) ?? "";
  const metaDescription = useWatch({ control, name: "metaDescription" }) ?? "";
  const seoTitle = useWatch({ control, name: "seoTitle" }) ?? "";
  const dek = useWatch({ control, name: "dek" }) ?? "";
  const pillar = useWatch({ control, name: "pillar" }) ?? "vibes";
  const tagsInput = useWatch({ control, name: "tagsInput" }) ?? "";
  const watchedAuthorName = useWatch({ control, name: "authorName" }) ?? authorName;

  // Auto-slug until the editor edits it, and never for a published article.
  React.useEffect(() => {
    if (slugLocked) return;
    const derived = slugify(title ?? "");
    if (derived && derived !== slug) {
      setValue("slug", derived, { shouldDirty: false });
    }
  }, [title, slug, slugLocked, setValue]);

  const persist = React.useCallback(
    async (values: ArticleUpsertValues): Promise<ActionResult> => {
      setSaveState({ kind: "saving" });
      let result: ActionResult;
      try {
        result = await saveArticleAction({
          ...values,
          ...(articleId ? { id: articleId } : {}),
        });
      } catch (caught) {
        // A server action can throw (network drop, expired session mid-save,
        // dev-server rebuild). Without this guard the indicator sticks on
        // "Menyimpan" and publishing silently does nothing.
        result = {
          ok: false,
          message:
            caught instanceof Error && caught.message
              ? `Simpan gagal: ${caught.message}`
              : "Simpan gagal. Periksa koneksi lalu coba lagi.",
        };
      }

      if (!result.ok) {
        setSaveState({
          kind: "error",
          message: result.message ?? "Gagal menyimpan.",
        });
        return result;
      }

      if (result.articleId && result.articleId !== articleId) {
        setArticleId(result.articleId);
        // Move the URL to the edit route so a refresh keeps the draft.
        router.replace(`/admin/konten/${result.articleId}/edit`);
      }
      if (result.slug) {
        setValue("slug", result.slug, { shouldDirty: false });
      }
      setSaveState({ kind: "saved", at: result.savedAt ?? new Date().toISOString() });
      return result;
    },
    [articleId, router, setValue],
  );

  // Debounced autosave. Requires a title, so an empty new form never creates a
  // stray row while the editor is still thinking.
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelAutosave = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const scheduleAutosave = React.useCallback(() => {
    setSaveState({ kind: "dirty" });
    cancelAutosave();
    timer.current = setTimeout(() => {
      const values = getValues();
      if ((values.title ?? "").trim().length < 3) return;
      void persist(values);
    }, AUTOSAVE_DELAY_MS);
  }, [cancelAutosave, getValues, persist]);

  React.useEffect(() => cancelAutosave, [cancelAutosave]);

  /**
   * `handleSubmit` is invoked inside the event handler rather than during
   * render, so its callback never reads the autosave timer ref mid-render.
   */
  const runManualSave = async () => {
    cancelAutosave();
    await handleSubmit(async (values) => {
      const result = await persist(values);
      if (result.ok) toast.success(result.message ?? "Artikel disimpan.");
      else toast.error(result.message ?? "Gagal menyimpan.");
    })();
  };

  const runPublishAction = async (
    mode: "publish" | "schedule" | "unpublish" | "archive",
  ) => {
    cancelAutosave();

    // Save first so the published version matches what is on screen.
    const values = getValues();
    const saved = await persist(values);
    if (!saved.ok) {
      toast.error(saved.message ?? "Simpan dulu sebelum mengubah status.");
      return;
    }

    const targetId = saved.articleId ?? articleId;
    if (!targetId) {
      toast.error("Artikel belum tersimpan.");
      return;
    }

    let result: ActionResult;
    try {
      result = await publishArticleAction({
        articleId: targetId,
        mode,
        ...(mode === "schedule" ? { scheduledAt: scheduleValue } : {}),
      });
    } catch (caught) {
      result = {
        ok: false,
        message:
          caught instanceof Error && caught.message
            ? `Ubah status gagal: ${caught.message}`
            : "Ubah status gagal. Coba lagi sebentar.",
      };
    }

    if (result.ok) {
      toast.success(result.message ?? "Status diubah.");
      setValue(
        "status",
        mode === "publish"
          ? "published"
          : mode === "schedule"
            ? "scheduled"
            : mode === "archive"
              ? "archived"
              : "draft",
        { shouldDirty: false },
      );
      router.refresh();
    } else {
      toast.error(result.message ?? "Status gagal diubah.");
    }
  };

  const applyCover = (image: PickedImage) => {
    setValue("coverImageUrl", image.url, { shouldDirty: true });
    setValue("coverImageAlt", image.altText, { shouldDirty: true });
    setValue("coverImageCredit", image.attributionText ?? "", {
      shouldDirty: true,
    });
    setCoverAttribution(image.attributionText);
    scheduleAutosave();
  };

  /**
   * Assistant apply: pushes AI results straight into the matching form fields
   * without a copy-paste round trip. Every touched field is marked dirty so
   * autosave picks the change up.
   */
  const applyAssistant = (payload: {
    title?: string;
    markdown?: string;
    dek?: string;
    schemaType?: string;
  }) => {
    if (payload.title) setValue("title", payload.title, { shouldDirty: true });
    if (payload.markdown !== undefined) {
      setValue("contentMarkdown", payload.markdown, { shouldDirty: true });
    }
    if (payload.dek !== undefined) {
      setValue("dek", payload.dek, { shouldDirty: true });
    }
    if (payload.schemaType) {
      const schema = payload.schemaType as ArticleSchemaType;
      setSchemaChoice(schema);
      setValue("schemaType", schema, { shouldDirty: true });
    }
    scheduleAutosave();
  };

  const applyAssistantSeo = (payload: {
    slug?: string;
    seoTitle?: string;
    metaDescription?: string;
    excerpt?: string;
    primaryKeyword?: string;
    secondaryKeywords?: string[];
    tags?: string[];
    schemaType?: string;
  }) => {
    if (payload.slug) {
      setSlugLocked(true);
      setValue("slug", payload.slug, { shouldDirty: true });
    }
    if (payload.seoTitle) {
      setValue("seoTitle", payload.seoTitle, { shouldDirty: true });
    }
    if (payload.metaDescription) {
      setValue("metaDescription", payload.metaDescription, { shouldDirty: true });
    }
    if (payload.excerpt) {
      setValue("excerpt", payload.excerpt, { shouldDirty: true });
    }
    if (payload.primaryKeyword) {
      setValue("primaryKeyword", payload.primaryKeyword, { shouldDirty: true });
    }
    if (payload.secondaryKeywords) {
      setValue(
        "secondaryKeywordsInput",
        payload.secondaryKeywords.join(", "),
        { shouldDirty: true },
      );
    }
    if (payload.tags) {
      setValue("tagsInput", payload.tags.join(", "), { shouldDirty: true });
    }
    if (payload.schemaType) {
      const schema = payload.schemaType as ArticleSchemaType;
      setSchemaChoice(schema);
      setValue("schemaType", schema, { shouldDirty: true });
    }
    scheduleAutosave();
  };

  const regenerateSection = async (
    sectionHeading: string,
    instruction: string,
  ) => {
    try {
      return await assistantRegenerateSectionAction({
        title: title || "Tanpa judul",
        pillar,
        fullArticleMarkdown: markdown,
        sectionHeading,
        instruction,
      });
    } catch (caught) {
      return {
        ok: false as const,
        error:
          caught instanceof Error ? caught.message : "Regenerasi bagian gagal.",
      };
    }
  };

  const verificationFlags = (markdown.match(/\[BUTUH VERIFIKASI:/g) ?? []).length;

  return (
    <form
      onChange={scheduleAutosave}
      onSubmit={(event) => {
        event.preventDefault();
        void runManualSave();
      }}
      className="grid gap-3 lg:grid-cols-[1fr_20rem]"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Main column                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-3">
        <BannerPanel ink="wall" lift="sm" className="grid gap-4 p-3 sm:p-4">
          <Field
            label="Judul"
            htmlFor="title"
            required
            error={errors.title?.message}
          >
            <Input
              id="title"
              aria-invalid={Boolean(errors.title)}
              className="font-display text-lg font-extrabold"
              {...register("title")}
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="slug"
            required
            error={errors.slug?.message}
            hint={
              status === "published"
                ? "Artikel sudah tayang. Mengubah slug memutus tautan lama, lakukan hanya kalau perlu."
                : "Dibuat otomatis dari judul sampai kamu mengubahnya sendiri."
            }
          >
            <div className="flex items-center gap-2">
              <span className="tng-label shrink-0 text-muted">/artikel/</span>
              <Input
                id="slug"
                aria-invalid={Boolean(errors.slug)}
                onFocus={() => setSlugLocked(true)}
                {...register("slug")}
              />
            </div>
          </Field>

          <Field
            label="Dek atau ringkasan pembuka"
            htmlFor="dek"
            error={errors.dek?.message}
            hint="Satu sampai dua kalimat. Muncul di feed dan di bawah judul."
          >
            <Textarea id="dek" rows={2} {...register("dek")} />
          </Field>

          <Field
            label="Excerpt"
            htmlFor="excerpt"
            error={errors.excerpt?.message}
            hint="Ringkasan pendek untuk arsip, preview, dan fallback metadata. AI mengisi ini saat tahap SEO dijalankan."
          >
            <Textarea id="excerpt" rows={2} maxLength={400} {...register("excerpt")} />
          </Field>
        </BannerPanel>

        <AiAssistant
          currentTitle={title}
          currentPillar={pillar}
          currentMarkdown={markdown}
          currentAuthorName={watchedAuthorName}
          currentTags={tagsInput}
          onApply={applyAssistant}
          onApplySeo={applyAssistantSeo}
          onRegenerateSection={regenerateSection}
        />

        <BannerPanel ink="wall" lift="sm" className="p-3 sm:p-4">
          <RichTextEditor
            value={markdown}
            onChange={(next) => {
              setValue("contentMarkdown", next, { shouldDirty: true });
              scheduleAutosave();
            }}
          />
          {verificationFlags > 0 ? (
            <p className="mt-2 flex items-start gap-2 border-l-2 border-danger bg-danger/10 px-2.5 py-2 text-[0.8125rem] font-semibold text-danger">
              <TriangleAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
                strokeWidth={2.6}
              />
              {verificationFlags} bagian masih bertanda BUTUH VERIFIKASI. Selesaikan
              sebelum tayang.
            </p>
          ) : null}
        </BannerPanel>

        {articleId ? (
          <SourcePanel
            articleId={articleId}
            sources={sources}
            onChange={setSources}
          />
        ) : (
          <BannerPanel ink="deep" lift="sm" className="p-3">
            <h2 className="tng-label text-muted">Sumber dan atribusi</h2>
            <p className="mt-2 text-[0.8125rem] text-muted">
              Simpan draft dulu untuk mulai menambahkan sumber.
            </p>
          </BannerPanel>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Sidebar                                                            */}
      {/* ------------------------------------------------------------------ */}
      <aside className="grid content-start gap-3">
        <BannerPanel ink="deep" lift="sm" className="grid gap-3 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ArticleStatusMark
              status={status ?? "draft"}
              scheduledAt={article?.scheduledAt ?? null}
            />
            <SaveIndicator state={saveState} />
          </div>
          {saveState.kind === "error" && saveState.message ? (
            <p className="border-l-2 border-danger bg-danger/10 px-2.5 py-2 text-[0.8125rem] font-semibold text-danger">
              {saveState.message}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Button type="submit" variant="outline" size="md" block disabled={isSubmitting}>
              <Save aria-hidden="true" />
              Simpan draft
            </Button>

            {articleId ? (
              <ArticlePreview
                title={title}
                dek={dek}
                markdown={markdown}
                pillar={pillar}
                coverImageUrl={coverImageUrl}
                authorName={watchedAuthorName}
              />
            ) : null}

            {status !== "published" ? (
              <ConfirmAction
                trigger={
                  <Button variant="primary" size="md" block>
                    <Check aria-hidden="true" />
                    Publish sekarang
                  </Button>
                }
                title="Tayangkan artikel ini?"
                description={
                  verificationFlags > 0
                    ? `Artikel masih punya ${verificationFlags} tanda BUTUH VERIFIKASI. Menayangkan sekarang berarti bagian itu terbaca publik. Lanjut?`
                    : "Artikel akan langsung bisa dibaca publik dan masuk sitemap."
                }
                actionLabel="Ya, tayangkan"
                variant={verificationFlags > 0 ? "danger" : "primary"}
                onConfirm={() => void runPublishAction("publish")}
              />
            ) : (
              <ConfirmAction
                trigger={
                  <Button variant="outline" size="md" block>
                    <X aria-hidden="true" />
                    Kembalikan ke draft
                  </Button>
                }
                title="Turunkan artikel dari publik?"
                description="Artikel akan hilang dari feed dan sitemap. Tautan lama akan 404."
                actionLabel="Turunkan"
                variant="danger"
                onConfirm={() => void runPublishAction("unpublish")}
              />
            )}
          </div>

          <div className="grid gap-2 border-t-2 border-line pt-3">
            <Label htmlFor="schedule-at">Jadwalkan</Label>
            <Input
              id="schedule-at"
              type="datetime-local"
              value={scheduleValue}
              onChange={(event) => setScheduleValue(event.target.value)}
            />
            <ConfirmAction
              trigger={
                <Button
                  variant="secondary"
                  size="md"
                  block
                  disabled={!scheduleValue}
                >
                  <Clock aria-hidden="true" />
                  Jadwalkan tayang
                </Button>
              }
              title="Jadwalkan artikel ini?"
              description="Artikel tayang otomatis pada waktu tersebut lewat job penjadwalan. Sampai itu terjadi, artikel tidak terlihat publik."
              actionLabel="Jadwalkan"
              variant="secondary"
              onConfirm={() => void runPublishAction("schedule")}
            />
          </div>
        </BannerPanel>

        <BannerPanel ink="deep" lift="sm" className="grid gap-3 p-3">
          <h2 className="tng-label text-muted">Klasifikasi</h2>

          <fieldset className="grid gap-1.5">
            <legend className="sr-only">Pilar</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {PILLARS.map((option) => (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-[2px] border-2 px-2 py-2",
                    pillar === option
                      ? "border-keyline bg-surface-strong"
                      : "border-line bg-wall-deep hover:border-muted/60",
                  )}
                >
                  <input
                    type="radio"
                    value={option}
                    className="size-3.5 accent-lime"
                    {...register("pillar")}
                  />
                  <span className="tng-label text-[0.625rem] text-foreground">
                    {PILLAR_META[option].label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            label="Tag"
            htmlFor="tagsInput"
            error={errors.tagsInput?.message}
            hint="Pisahkan dengan koma. Maksimal 8."
          >
            <Input id="tagsInput" {...register("tagsInput")} />
          </Field>

          <Field
            label="Penulis"
            htmlFor="authorName"
            error={errors.authorName?.message}
          >
            <Input id="authorName" {...register("authorName")} />
          </Field>
        </BannerPanel>

        <BannerPanel ink="deep" lift="sm" className="grid gap-3 p-3">
          <h2 className="tng-label text-muted">Cover</h2>

          {coverImageUrl ? (
            <div className="grid gap-2">
              <div className="relative aspect-[16/10] w-full border-2 border-line">
                <CloudinaryImage
                  src={coverImageUrl}
                  alt={coverImageAlt || "Pratinjau cover"}
                  sizes="320px"
                  widths={[320, 640]}
                />
              </div>
              {coverAttribution ? (
                <TapePatch tone="outline" size="sm">
                  {coverAttribution}
                </TapePatch>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setValue("coverImageUrl", "", { shouldDirty: true });
                  setValue("coverImageCredit", "", { shouldDirty: true });
                  setCoverAttribution(null);
                  scheduleAutosave();
                }}
              >
                <Trash2 aria-hidden="true" />
                Hapus cover
              </Button>
            </div>
          ) : (
            <p className="text-[0.8125rem] text-muted">
              Belum ada cover. Tanpa cover, feed memakai panel warna pilar.
            </p>
          )}

          <ImagePicker
            onPick={applyCover}
            {...(articleId ? { articleId } : {})}
            triggerLabel={coverImageUrl ? "Ganti cover" : "Pilih cover"}
            {...(title ? { suggestedQuery: title } : {})}
          />

          <Field
            label="Alt text cover"
            htmlFor="coverImageAlt"
            error={errors.coverImageAlt?.message}
            hint="Wajib kalau ada cover. Kalau dikosongkan, otomatis memakai 'Ilustrasi untuk [judul]'."
          >
            <Input id="coverImageAlt" {...register("coverImageAlt")} />
          </Field>

          <Field
            label="Kredit atau caption"
            htmlFor="coverImageCredit"
            error={errors.coverImageCredit?.message}
          >
            <Input id="coverImageCredit" {...register("coverImageCredit")} />
          </Field>
        </BannerPanel>

        <BannerPanel ink="deep" lift="sm" className="grid gap-3 p-3">
          <h2 className="tng-label text-muted">SEO</h2>

          <Field
            label="SEO title"
            htmlFor="seoTitle"
            error={errors.seoTitle?.message}
            hint={`${seoTitle.length}/60 karakter ideal.`}
          >
            <Input id="seoTitle" maxLength={160} {...register("seoTitle")} />
          </Field>

          <Field
            label="Meta description"
            htmlFor="metaDescription"
            error={errors.metaDescription?.message}
            hint={`${metaDescription.length}/160 karakter ideal.`}
          >
            <Textarea
              id="metaDescription"
              rows={3}
              maxLength={320}
              {...register("metaDescription")}
            />
          </Field>

          <Field
            label="Keyword utama"
            htmlFor="primaryKeyword"
            error={errors.primaryKeyword?.message}
          >
            <Input id="primaryKeyword" {...register("primaryKeyword")} />
          </Field>

          <Field
            label="Keyword pendukung"
            htmlFor="secondaryKeywordsInput"
            error={errors.secondaryKeywordsInput?.message}
            hint="Pisahkan dengan koma."
          >
            <Input
              id="secondaryKeywordsInput"
              {...register("secondaryKeywordsInput")}
            />
          </Field>

          <Field
            label="Schema artikel (JSON-LD)"
            htmlFor="schemaType"
            hint={ARTICLE_SCHEMA_META[schemaChoice].description}
          >
            <select
              id="schemaType"
              value={schemaChoice}
              {...register("schemaType")}
              onChange={(event) => {
                const schema = event.target.value as ArticleSchemaType;
                setSchemaChoice(schema);
                // Re-set through setValue so the form value and the panel
                // state stay in sync.
                setValue("schemaType", schema, {
                  shouldDirty: true,
                });
                scheduleAutosave();
              }}
              className="border-2 border-line bg-wall px-2 py-2 text-[0.8125rem] text-white outline-none focus:border-lime"
            >
              {ARTICLE_SCHEMA_TYPES.map((type) => (
                <option key={type} value={type} className="bg-wall text-white">
                  {ARTICLE_SCHEMA_META[type].label}
                </option>
              ))}
            </select>
          </Field>
        </BannerPanel>

        {article?.generatedByAi ? (
          <BannerPanel ink="deep" lift="sm" className="p-3">
            <h2 className="tng-label text-muted">Jejak AI</h2>
            <p className="mt-2 text-[0.8125rem] leading-snug text-muted">
              Draft ini dibantu AI
              {article.aiProviderUsed ? ` lewat ${article.aiProviderUsed}` : ""}.
              Catatan ini internal dan tidak ditampilkan ke publik.
            </p>
          </BannerPanel>
        ) : null}

        {articleId && status === "published" ? (
          <BannerPanel ink="lime" lift="sm" className="grid gap-2 p-3">
            <h2 className="tng-label text-muted">Artikel sudah tayang</h2>
            <Button asChild variant="primary" size="md" block>
              <Link href={`/artikel/${slug}`} target="_blank" rel="noreferrer">
                <Eye aria-hidden="true" />
                Lihat artikel
              </Link>
            </Button>
            <Button asChild variant="outline" size="md" block>
              <Link href="/admin/konten/baru">
                <Plus aria-hidden="true" />
                Buat artikel baru
              </Link>
            </Button>
          </BannerPanel>
        ) : articleId ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/artikel/${slug}`} target="_blank" rel="noreferrer">
              <Eye aria-hidden="true" />
              Lihat versi publik
            </Link>
          </Button>
        ) : null}

        {articleId && canDelete ? (
          <ConfirmAction
            trigger={
              <Button variant="ghost" size="sm" className="text-danger">
                <Trash2 aria-hidden="true" />
                Hapus artikel
              </Button>
            }
            title="Hapus artikel ini?"
            description="Tindakan ini permanen. Reaksi, sumber, dan gambar yang terkait juga ikut terhapus."
            actionLabel="Hapus permanen"
            variant="danger"
            onConfirm={async () => {
              const { deleteArticleAction } = await import(
                "@/app/(admin)/admin/(dashboard)/actions"
              );
              const result = await deleteArticleAction(articleId);
              if (result && !result.ok) {
                toast.error(result.message ?? "Gagal menghapus.");
              }
            }}
          />
        ) : null}
      </aside>
    </form>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  switch (state.kind) {
    case "saving":
      return (
        <span className="tng-label flex items-center gap-1.5 text-muted">
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          Menyimpan
        </span>
      );
    case "saved":
      return (
        <span className="tng-label flex items-center gap-1.5 text-ok">
          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
          Tersimpan
        </span>
      );
    case "dirty":
      return (
        <span className="tng-label flex items-center gap-1.5 text-orange">
          <span aria-hidden="true" className="size-2 bg-orange" />
          Belum tersimpan
        </span>
      );
    case "error":
      return (
        <span className="tng-label flex items-center gap-1.5 text-danger">
          <TriangleAlert aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
          Gagal simpan
        </span>
      );
    case "idle":
      return <span className="tng-label text-muted">Siap</span>;
  }
}

function ConfirmAction({
  trigger,
  title,
  description,
  actionLabel,
  variant = "primary",
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  variant?: "primary" | "secondary" | "danger";
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            onClick={() => {
              void onConfirm();
            }}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
