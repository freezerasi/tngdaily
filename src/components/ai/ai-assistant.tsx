"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  FileText,
  Gauge,
  Lightbulb,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { BannerPanel } from "@/components/shared/banner-panel";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { TapePatch } from "@/components/shared/tape-patch";
import { StageRail, type StageState } from "@/components/ai/stage-rail";
import type { OutlineOutput } from "@/lib/ai/schemas";
import {
  assistantDraftAction,
  assistantOutlineAction,
  assistantQualityAction,
  assistantSeoAction,
  assistantTitlesAction,
  type AssistantSeoResult,
  type AssistantTitleOption,
} from "@/app/(admin)/admin/(dashboard)/assistant-actions";
import { PILLARS, PILLAR_META, type ArticleSchemaType } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * In-page AI assistant: topic or pasted material in, seven titles, a tight
 * outline, a full draft, and the SEO package. Every result can be applied
 * straight into the article form fields; nothing is copy-pasted by hand.
 */

type StageKey = "input" | "titles" | "outline" | "draft" | "seo";

export interface AssistantApplyPayload {
  title?: string;
  markdown?: string;
  dek?: string;
  slug?: string;
  seoTitle?: string;
  metaDescription?: string;
  excerpt?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  tags?: string[];
  schemaType?: ArticleSchemaType;
}

export function AiAssistant({
  onApply,
  onApplySeo,
  currentTitle,
  currentPillar,
  currentMarkdown,
  currentAuthorName,
  currentTags,
  onRegenerateSection,
}: {
  onApply: (payload: AssistantApplyPayload) => void;
  onApplySeo: (payload: AssistantApplyPayload) => void;
  currentTitle: string;
  currentPillar: string;
  currentMarkdown: string;
  currentAuthorName: string;
  currentTags: string;
  onRegenerateSection: (
    sectionHeading: string,
    instruction: string,
  ) => Promise<{ ok: boolean; error?: string; markdown?: string }>;
}) {
  const [stage, setStage] = React.useState<StageKey>("input");
  const [topic, setTopic] = React.useState("");
  const [pillar, setPillar] = React.useState(currentPillar || "vibes");
  const [wordCount, setWordCount] = React.useState(700);

  const [titles, setTitles] = React.useState<AssistantTitleOption[]>([]);
  const [recommendedId, setRecommendedId] = React.useState<string | undefined>();
  const [selectedTitle, setSelectedTitle] = React.useState<string | null>(null);
  const [selectedAngle, setSelectedAngle] = React.useState("");

  const [outline, setOutline] = React.useState<OutlineOutput | null>(null);
  const [revisionNotes, setRevisionNotes] = React.useState("");

  const [draft, setDraft] = React.useState<{
    markdown: string;
    dek?: string;
    verificationNeeded?: string[];
  } | null>(null);

  const [seo, setSeo] = React.useState<AssistantSeoResult["seo"] | null>(null);
  const [schemaChoice, setSchemaChoice] = React.useState<ArticleSchemaType>(
    "NewsArticle",
  );

  const [quality, setQuality] = React.useState<{
    readiness?: string;
    score?: number;
    summary?: string;
  } | null>(null);

  const [busy, setBusy] = React.useState<StageKey | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(true);

  const titlesDone = titles.length > 0;
  const outlineDone = outline !== null;
  const draftDone = draft !== null;
  const seoDone = seo !== null;

  const visibleState = (key: StageKey): StageState => {
    if (busy === key) return "processing";
    switch (key) {
      case "input":
        return "completed";
      case "titles":
        return titlesDone ? "completed" : "pending";
      case "outline":
        return outlineDone ? "completed" : "pending";
      case "draft":
        return draftDone ? "completed" : "pending";
      case "seo":
        return seoDone ? "completed" : "pending";
    }
  };

  const runTitles = async () => {
    setBusy("titles");
    setError(null);
    try {
      const result = await assistantTitlesAction({
        topicOrDraft: topic,
        pillar,
      });
      if (!result.ok || !result.titles?.length) {
        setError(result.error ?? "Tidak ada judul yang dihasilkan.");
        return;
      }
      setTitles(result.titles);
      setRecommendedId(result.recommendedId);
      setStage("titles");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Permintaan judul gagal.",
      );
    } finally {
      setBusy(null);
    }
  };

  const runOutline = async (title: string, angleNote: string) => {
    setBusy("outline");
    setError(null);
    try {
      const result = await assistantOutlineAction({
        title,
        pillar,
        angleNote,
        topicOrDraft: topic,
        targetWordCount: wordCount,
      });
      if (!result.ok || !result.outline) {
        setError(result.error ?? "Outline gagal dibuat.");
        return;
      }
      setOutline(result.outline);
      setStage("outline");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Permintaan outline gagal.",
      );
    } finally {
      setBusy(null);
    }
  };

  const reviseOutline = async () => {
    if (!selectedTitle || !outline) return;
    setBusy("outline");
    setError(null);
    try {
      const result = await assistantOutlineAction({
        title: selectedTitle,
        pillar,
        angleNote: selectedAngle,
        topicOrDraft: topic,
        revisionNotes: revisionNotes || "Buat versi outline yang berbeda.",
        targetWordCount: wordCount,
      });
      if (!result.ok || !result.outline) {
        setError(result.error ?? "Revisi outline gagal.");
        return;
      }
      setOutline(result.outline);
      setRevisionNotes("");
      toast.success("Outline diperbarui.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Revisi outline gagal.",
      );
    } finally {
      setBusy(null);
    }
  };

  const runDraft = async () => {
    if (!selectedTitle || !outline) return;
    setBusy("draft");
    setError(null);
    try {
      const result = await assistantDraftAction({
        title: selectedTitle,
        pillar,
        outline,
        topicOrDraft: topic,
        targetWordCount: wordCount,
      });
      if (!result.ok || !result.markdown) {
        setError(result.error ?? "Draft gagal dibuat.");
        return;
      }
      setDraft({
        markdown: result.markdown,
        dek: result.dek,
        verificationNeeded: result.verificationNeeded,
      });
      setStage("draft");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Permintaan draft gagal.",
      );
    } finally {
      setBusy(null);
    }
  };

  const runSeo = async () => {
    const markdown = draft?.markdown ?? currentMarkdown;
    const title = selectedTitle ?? currentTitle;
    if (markdown.trim().length < 50) {
      setError("Isi artikel masih kosong. Buat draft dulu.");
      return;
    }
    setBusy("seo");
    setError(null);
    try {
      const result = await assistantSeoAction({
        title,
        pillar,
        contentMarkdown: markdown,
        authorName: currentAuthorName,
        existingTags: currentTags,
      });
      if (!result.ok || !result.seo) {
        setError(result.error ?? "Saran SEO gagal dibuat.");
        return;
      }
      setSeo(result.seo);
      const recommended = result.seo.recommendedSchema as ArticleSchemaType;
      setSchemaChoice(recommended);
      setStage("seo");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Permintaan SEO gagal.",
      );
    } finally {
      setBusy(null);
    }
  };

  const runQuality = async () => {
    const markdown = draft?.markdown ?? currentMarkdown;
    if (markdown.trim().length < 50) return;
    setBusy("seo");
    try {
      const result = await assistantQualityAction({
        contentMarkdown: markdown,
        title: selectedTitle ?? currentTitle,
      });
      if (result.ok) {
        setQuality({
          readiness: result.readiness,
          score: result.score,
          summary: result.summary,
        });
      }
    } catch {
      setQuality(null);
    } finally {
      setBusy(null);
    }
  };

  const applyDraft = () => {
    if (!draft || !selectedTitle) return;
    onApply({
      title: selectedTitle,
      markdown: draft.markdown,
      dek: draft.dek ?? "",
      schemaType: schemaChoice,
    });
    toast.success("Judul, dek, dan isi artikel diterapkan ke editor.");
  };

  const applySeo = () => {
    if (!seo) return;
    onApplySeo({
      slug: seo.slug,
      seoTitle: seo.seoTitle,
      metaDescription: seo.metaDescription,
      excerpt: seo.excerpt,
      primaryKeyword: seo.primaryKeyword,
      secondaryKeywords: seo.secondaryKeywords,
      tags: seo.tags,
      schemaType: schemaChoice,
    });
    toast.success("Paket SEO diterapkan ke form.");
  };

  const regenerateSection = async (heading: string) => {
    const markdown = draft?.markdown ?? currentMarkdown;
    if (!markdown) return;
    setBusy("draft");
    setError(null);
    try {
      const result = await onRegenerateSection(
        heading,
        "buat versi baru yang lebih tajam dan hidup",
      );
      if (!result.ok || !result.markdown) {
        setError(result.error ?? "Regenerasi bagian gagal.");
        return;
      }
      if (draft) {
        setDraft({ ...draft, markdown: result.markdown });
      } else {
        onApply({ markdown: result.markdown });
      }
      toast.success(`Bagian "${heading}" diperbarui.`);
    } finally {
      setBusy(null);
    }
  };

  if (!open) {
    return (
      <BannerPanel ink="lime" lift="sm" className="p-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-[0.06em]">
            <Sparkles aria-hidden="true" className="size-4" />
            Asisten AI
          </span>
          <span className="tng-label text-muted">Buka</span>
        </button>
      </BannerPanel>
    );
  }

  return (
    <BannerPanel ink="lime" lift="sm" className="grid gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TapePatch tone="lime" tilt="left" size="sm">
            Asisten
          </TapePatch>
          <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.06em]">
            Tulis dengan AI
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="tng-label text-muted hover:text-foreground"
        >
          Sembunyikan
        </button>
      </div>

      <StageRail
        stages={[
          { key: "input", label: "Bahan", state: visibleState("input") },
          { key: "titles", label: "Judul", state: visibleState("titles") },
          { key: "outline", label: "Outline", state: visibleState("outline") },
          { key: "draft", label: "Isi", state: visibleState("draft") },
          { key: "seo", label: "SEO", state: visibleState("seo") },
        ]}
        current={stage}
        onSelect={(key) => {
          const order: StageKey[] = ["input", "titles", "outline", "draft", "seo"];
          const target = order.indexOf(key as StageKey);
          const unlocked =
            target <= order.indexOf(stage) ||
            (key === "titles" && titlesDone) ||
            (key === "outline" && outlineDone) ||
            (key === "draft" && draftDone) ||
            (key === "seo" && seoDone);
          if (unlocked) setStage(key as StageKey);
        }}
      />

      {error ? (
        <p className="border-l-2 border-danger bg-danger/10 px-2.5 py-2 text-[0.8125rem] font-semibold text-danger">
          {error}
        </p>
      ) : null}

      {stage === "input" ? (
        <div className="grid gap-3">
          <Field
            label="Topik atau bahan mentah"
            htmlFor="assistant-topic"
            hint="Tulis topik bebas, atau tempel tulisan/artikel mentah sebagai bahan."
          >
            <Textarea
              id="assistant-topic"
              rows={4}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Contoh: rencana tarif parkir baru di pusat kota Tangerang, atau tempel artikel mentah di sini..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Field label="Pilar" htmlFor="assistant-pillar">
              <select
                id="assistant-pillar"
                value={pillar}
                onChange={(event) => setPillar(event.target.value)}
                className="border-2 border-line bg-wall px-2 py-2 text-[0.8125rem] text-white outline-none focus:border-lime"
              >
                {PILLARS.map((option) => (
                  <option key={option} value={option} className="bg-wall text-white">
                    {PILLAR_META[option].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target kata" htmlFor="assistant-words">
              <Input
                id="assistant-words"
                type="number"
                min={300}
                max={1500}
                step={100}
                value={wordCount}
                onChange={(event) =>
                  setWordCount(Number(event.target.value) || 700)
                }
              />
            </Field>
          </div>

          <Button
            variant="primary"
            size="md"
            disabled={topic.trim().length < 5 || busy !== null}
            onClick={() => void runTitles()}
          >
            {busy === "titles" ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Lightbulb aria-hidden="true" />
            )}
            Buat 7 pilihan judul
          </Button>
        </div>
      ) : null}

      {stage === "titles" ? (
        <div className="grid gap-2">
          {titles.map((option) => {
            const isSelected = selectedTitle === option.title;
            const isRecommended = option.id === recommendedId;
            const tooLong = option.charCount > 60;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSelectedTitle(option.title);
                  setSelectedAngle(option.angleNote);
                }}
                className={cn(
                  "grid gap-1 rounded-[2px] border-2 p-2.5 text-left transition-colors",
                  isSelected
                    ? "border-keyline bg-bone text-ink shadow-[var(--shadow-hard-sm)]"
                    : "border-line bg-surface hover:border-keyline",
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-display text-[0.9375rem] font-extrabold leading-snug">
                    {option.title}
                  </span>
                  {isRecommended ? (
                    <span className="tng-label shrink-0 bg-lime px-1.5 py-0.5 text-ink">
                      Rekomendasi
                    </span>
                  ) : null}
                </span>
                <span className="text-[0.75rem] leading-snug text-muted">
                  {option.angleNote}
                </span>
                <span className="tng-label flex gap-2 text-muted">
                  <span className={tooLong ? "text-orange" : "text-ok"}>
                    {option.charCount}/60 karakter
                  </span>
                  {tooLong ? "agak panjang" : "pas"}
                </span>
              </button>
            );
          })}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void runTitles()}
            >
              <RefreshCw aria-hidden="true" />
              Judul lain
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedTitle || busy !== null}
              onClick={() => {
                if (selectedTitle) void runOutline(selectedTitle, selectedAngle);
              }}
            >
              Lanjut ke outline
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {stage === "outline" && outline ? (
        <div className="grid gap-3">
          <div className="grid gap-2">
            {outline.article_plan.opening_hook ? (
              <OutlineCard title="Hook pembuka">
                {outline.article_plan.opening_hook}
              </OutlineCard>
            ) : null}
            {[...outline.article_plan.sections]
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <OutlineCard
                  key={`${section.order}-${section.heading}`}
                  title={`0${section.order}. ${section.heading}`}
                  action={
                    <button
                      type="button"
                      onClick={() => void regenerateSectionFromOutline(section.heading)}
                      className="tng-label text-muted hover:text-foreground"
                    >
                      Tandai untuk regen
                    </button>
                  }
                >
                  {section.purpose ? (
                    <p className="text-[0.75rem] text-muted">{section.purpose}</p>
                  ) : null}
                  {section.key_points.length > 0 ? (
                    <ul className="mt-1 grid list-disc gap-0.5 pl-4 text-[0.8125rem]">
                      {section.key_points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  ) : null}
                </OutlineCard>
              ))}
            {outline.article_plan.closing_direction ? (
              <OutlineCard title="Arah penutup">
                {outline.article_plan.closing_direction}
              </OutlineCard>
            ) : null}
          </div>

          <Field
            label="Catatan revisi (opsional)"
            htmlFor="assistant-revision"
            hint="Contoh: bagian kedua lebih tajam, tambah konteks harga untuk pembaca."
          >
            <Textarea
              id="assistant-revision"
              rows={2}
              value={revisionNotes}
              onChange={(event) => setRevisionNotes(event.target.value)}
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void reviseOutline()}
            >
              <RefreshCw aria-hidden="true" />
              Revisi / versi lain
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={busy !== null}
              onClick={() => void runDraft()}
            >
              {busy === "draft" ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <FileText aria-hidden="true" />
              )}
              Tulis artikel penuh
            </Button>
          </div>
        </div>
      ) : null}

      {stage === "draft" && draft ? (
        <div className="grid gap-3">
          <div className="rounded-[2px] border-2 border-line bg-wall p-2.5">
            <p className="text-[0.8125rem] font-semibold">
              Draft siap: {draft.markdown.split(/\s+/).filter(Boolean).length} kata
            </p>
            {draft.verificationNeeded && draft.verificationNeeded.length > 0 ? (
              <ul className="mt-1 grid list-disc pl-4 text-[0.75rem] text-orange">
                {draft.verificationNeeded.slice(0, 5).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={busy !== null}
              onClick={applyDraft}
            >
              <Check aria-hidden="true" />
              Terapkan ke editor
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void runDraft()}
            >
              <RefreshCw aria-hidden="true" />
              Regenerate semua
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void runSeo()}
            >
              <Search aria-hidden="true" />
              Buat paket SEO
            </Button>
          </div>

          <SectionRegenList
            markdown={draft.markdown}
            busy={busy === "draft"}
            onRegenerate={(heading) => void regenerateSection(heading)}
          />
        </div>
      ) : null}

      {stage === "seo" && seo ? (
        <div className="grid gap-3">
          <div className="grid gap-2 rounded-[2px] border-2 border-line bg-wall p-2.5">
            <SeoRow label="Judul SEO">{seo.seoTitle}</SeoRow>
            <SeoRow label="Meta description">{seo.metaDescription}</SeoRow>
            <SeoRow label="Slug">/artikel/{seo.slug}</SeoRow>
            <SeoRow label="Keyword utama">{seo.primaryKeyword}</SeoRow>
            <SeoRow label="Keyword pendukung">
              {seo.secondaryKeywords.join(", ")}
            </SeoRow>
            <SeoRow label="Tag">{seo.tags.join(", ")}</SeoRow>
            <SeoRow label="Ringkasan pembuka">{seo.openingSummary}</SeoRow>
            {seo.internalLinks.length > 0 ? (
              <div className="grid gap-1 text-[0.8125rem]">
                <span className="tng-label text-muted">Internal link</span>
                {seo.internalLinks.map((link) => (
                  <p key={link.anchorText}>
                    &ldquo;{link.anchorText}&rdquo; → {link.target}
                    <span className="text-muted"> ({link.reason})</span>
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <Field
            label="Schema artikel"
            htmlFor="assistant-schema"
            hint={`Rekomendasi AI: ${seo.recommendedSchema} (${seo.schemaReason}). Kategori/pilar tetap pilihan manual Anda.`}
          >
            <select
              id="assistant-schema"
              value={schemaChoice}
              onChange={(event) =>
                setSchemaChoice(event.target.value as ArticleSchemaType)
              }
              className="border-2 border-line bg-wall px-2 py-2 text-[0.8125rem] text-white outline-none focus:border-lime"
            >
              {(
                [
                  "NewsArticle",
                  "Article",
                  "ReportageNewsArticle",
                  "OpinionNewsArticle",
                  "AnalysisNewsArticle",
                  "ReviewArticle",
                  "HowTo",
                  "FAQPage",
                ] as ArticleSchemaType[]
              ).map((type) => (
                <option key={type} value={type} className="bg-wall text-white">
                  {type}
                  {type === seo.recommendedSchema ? " (rekomendasi)" : ""}
                </option>
              ))}
            </select>
          </Field>

          {quality ? (
            <div className="flex items-center gap-2 rounded-[2px] border-2 border-line bg-wall p-2.5 text-[0.8125rem]">
              <Gauge aria-hidden="true" className="size-4" />
              <span>
                Kesiapan: <strong>{quality.readiness}</strong>
                {typeof quality.score === "number"
                  ? ` (skor ${quality.score})`
                  : ""}
              </span>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={applySeo}
              disabled={busy !== null}
            >
              <Wand2 aria-hidden="true" />
              Apply SEO ke form
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void runSeo()}
            >
              <RefreshCw aria-hidden="true" />
              Regenerate SEO
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void runQuality()}
            >
              <Gauge aria-hidden="true" />
              Cek kesiapan
            </Button>
          </div>
        </div>
      ) : null}

      {busy !== null ? (
        <p className="flex items-center gap-2 text-[0.8125rem] text-muted">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          {busy === "titles"
            ? "Menyusun 7 sudut pandang judul..."
            : busy === "outline"
              ? "Menyusun outline..."
              : busy === "draft"
                ? "Menulis artikel penuh..."
                : "Menyiapkan paket SEO..."}
        </p>
      ) : null}
    </BannerPanel>
  );

  function regenerateSectionFromOutline(heading: string) {
    // Marking from the outline only matters after the draft exists; before
    // that the outline itself drives the draft. Keep it a no-op placeholder
    // that scrolls intent into the revision box.
    setRevisionNotes((notes) =>
      notes.includes(heading)
        ? notes
        : `${notes ? notes + " " : ""}Perhatikan bagian "${heading}".`,
    );
    toast.info(`Bagian "${heading}" ditandai. Tulis catatan revisi lalu revisi outline.`);
  }
}

function OutlineCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[2px] border-2 border-line bg-surface p-2.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-[0.875rem] font-extrabold leading-snug">
          {title}
        </h3>
        {action}
      </div>
      <div className="mt-1 text-[0.8125rem] leading-relaxed">{children}</div>
    </div>
  );
}

function SeoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5">
      <span className="tng-label text-muted">{label}</span>
      <p className="text-[0.8125rem] leading-relaxed">{children}</p>
    </div>
  );
}

/** Lists every H2 section of the draft for per-section regeneration. */
function SectionRegenList({
  markdown,
  busy,
  onRegenerate,
}: {
  markdown: string;
  busy: boolean;
  onRegenerate: (heading: string) => void;
}) {
  const headings = Array.from(markdown.matchAll(/^## (.+)$/gm))
    .map((match) => match[1])
    .filter((heading): heading is string => Boolean(heading));
  if (headings.length === 0) return null;

  return (
    <details className="rounded-[2px] border-2 border-line bg-wall p-2.5">
      <summary className="tng-label cursor-pointer text-muted">
        Regenerate per bagian ({headings.length} bagian)
      </summary>
      <ul className="mt-2 grid gap-1.5">
        {headings.map((heading) => (
          <li key={heading} className="flex items-center justify-between gap-2">
            <span className="text-[0.8125rem]">{heading}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRegenerate(heading)}
              className="tng-label inline-flex items-center gap-1 text-muted hover:text-foreground disabled:opacity-45"
            >
              <RefreshCw aria-hidden="true" className="size-3" />
              Regen
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
