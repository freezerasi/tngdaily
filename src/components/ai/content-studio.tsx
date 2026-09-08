"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Loader2,
  RefreshCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { BannerPanel } from "@/components/shared/banner-panel";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { TapePatch } from "@/components/shared/tape-patch";
import { AiChainNotice } from "@/components/ai/ai-chain-notice";
import { StageRail, type StageState } from "@/components/ai/stage-rail";
import { QualityReport } from "@/components/ai/quality-report";
import type {
  DraftOutput,
  HeadlineOutput,
  IdeationOutput,
  ImageQueryOutput,
  OutlineOutput,
  QualityGateOutput,
  SeoOutput,
  SocialOutput,
} from "@/lib/ai/schemas";
import { PILLARS, PILLAR_META, type Pillar } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Content Studio wizard.
 *
 * Five stages, each a separate server call recorded as its own job. Stage state
 * is kept locally and persisted server-side per stage, so a regenerate never
 * destroys the previous stage's output and the run can be resumed.
 */

type StageKey = "ideation" | "headline" | "outline" | "draft" | "finish";

interface StageMeta {
  provider?: string;
  model?: string;
  latencyMs?: number;
  promptTemplateKey?: string;
  promptVersion?: number;
  usedFallbackTemplate?: boolean;
}

interface FinishData {
  seo: SeoOutput;
  imageQueries: ImageQueryOutput | null;
  imageQueriesError: string | null;
  quality: QualityGateOutput | null;
  qualityError: string | null;
  social: SocialOutput | null;
  socialError: string | null;
}

const STAGES: Array<{ key: StageKey; label: string }> = [
  { key: "ideation", label: "Ideasi" },
  { key: "headline", label: "Judul" },
  { key: "outline", label: "Outline" },
  { key: "draft", label: "Draft" },
  { key: "finish", label: "SEO dan audit" },
];

export function ContentStudio({ sessionKey }: { sessionKey: string }) {
  const router = useRouter();

  const [current, setCurrent] = React.useState<StageKey>("ideation");
  const [status, setStatus] = React.useState<Record<StageKey, StageState>>({
    ideation: "pending",
    headline: "pending",
    outline: "pending",
    draft: "pending",
    finish: "pending",
  });
  const [meta, setMeta] = React.useState<Partial<Record<StageKey, StageMeta>>>({});
  const [errors, setErrors] = React.useState<Partial<Record<StageKey, string>>>({});

  // Brief
  const [pillar, setPillar] = React.useState<Pillar>("vibes");
  const [area, setArea] = React.useState("Tangerang Raya");
  const [contentGoal, setContentGoal] = React.useState("");
  const [topicBrief, setTopicBrief] = React.useState("");
  const [knownContext, setKnownContext] = React.useState("");
  const [constraints, setConstraints] = React.useState("");
  const [ideaCount, setIdeaCount] = React.useState(6);
  const [targetWordCount, setTargetWordCount] = React.useState(900);
  const [verifiedFacts, setVerifiedFacts] = React.useState("");
  const [editorNotes, setEditorNotes] = React.useState("");

  // Stage outputs
  const [ideas, setIdeas] = React.useState<IdeationOutput | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = React.useState<string | null>(null);
  const [headlines, setHeadlines] = React.useState<HeadlineOutput | null>(null);
  const [chosenTitle, setChosenTitle] = React.useState("");
  const [outline, setOutline] = React.useState<OutlineOutput | null>(null);
  const [outlineText, setOutlineText] = React.useState("");
  const [draft, setDraft] = React.useState<DraftOutput | null>(null);
  const [draftMarkdown, setDraftMarkdown] = React.useState("");
  const [draftDek, setDraftDek] = React.useState("");
  const [finish, setFinish] = React.useState<FinishData | null>(null);

  const selectedIdea = ideas?.content_ideas.find(
    (idea) => idea.idea_id === selectedIdeaId,
  );

  const call = async <T,>(
    stage: StageKey,
    payload: Record<string, unknown>,
  ): Promise<{ data: T; meta: StageMeta } | null> => {
    setStatus((prev) => ({ ...prev, [stage]: "processing" }));
    setErrors((prev) => ({ ...prev, [stage]: undefined }));

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, sessionKey, ...payload }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        data?: T;
        error?: string;
        provider?: string;
        model?: string;
        latencyMs?: number;
        promptTemplateKey?: string;
        promptVersion?: number;
        usedFallbackTemplate?: boolean;
      };

      if (!response.ok || !body.ok || body.data === undefined) {
        throw new Error(body.error ?? "Permintaan AI gagal.");
      }

      const stageMeta: StageMeta = {
        ...(body.provider ? { provider: body.provider } : {}),
        ...(body.model ? { model: body.model } : {}),
        ...(body.latencyMs !== undefined ? { latencyMs: body.latencyMs } : {}),
        ...(body.promptTemplateKey
          ? { promptTemplateKey: body.promptTemplateKey }
          : {}),
        ...(body.promptVersion !== undefined
          ? { promptVersion: body.promptVersion }
          : {}),
        ...(body.usedFallbackTemplate !== undefined
          ? { usedFallbackTemplate: body.usedFallbackTemplate }
          : {}),
      };

      setStatus((prev) => ({ ...prev, [stage]: "completed" }));
      setMeta((prev) => ({ ...prev, [stage]: stageMeta }));
      return { data: body.data, meta: stageMeta };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Permintaan AI gagal.";
      setStatus((prev) => ({ ...prev, [stage]: "failed" }));
      setErrors((prev) => ({ ...prev, [stage]: message }));
      toast.error(message);
      return null;
    }
  };

  const runIdeation = async () => {
    const result = await call<IdeationOutput>("ideation", {
      pillar,
      area,
      contentGoal,
      topicBrief,
      knownContext,
      constraints,
      ideaCount,
    });
    if (result) {
      setIdeas(result.data);
      setSelectedIdeaId(null);
    }
  };

  const runHeadline = async () => {
    if (!selectedIdea) return;
    const result = await call<HeadlineOutput>("headline", {
      pillar,
      angle: `${selectedIdea.working_title}. ${selectedIdea.angle}`,
      verifiedFacts,
      targetReader: selectedIdea.target_reader,
      goal: contentGoal,
    });
    if (result) {
      setHeadlines(result.data);
      const recommended =
        result.data.headline_options.find(
          (option) => option.id === result.data.recommended_id,
        ) ?? result.data.headline_options[0];
      setChosenTitle(recommended?.title ?? "");
      setCurrent("headline");
    }
  };

  const runOutline = async () => {
    if (!selectedIdea || !chosenTitle.trim()) return;
    const result = await call<OutlineOutput>("outline", {
      pillar,
      title: chosenTitle.trim(),
      angle: selectedIdea.angle,
      editorBrief: topicBrief,
      verifiedFacts,
      targetWordCount,
    });
    if (result) {
      setOutline(result.data);
      setOutlineText(serialiseOutline(result.data));
      setCurrent("outline");
    }
  };

  const runDraft = async () => {
    if (!chosenTitle.trim() || outlineText.trim().length < 20) return;
    const result = await call<DraftOutput>("draft", {
      pillar,
      title: chosenTitle.trim(),
      approvedOutline: outlineText,
      verifiedFacts,
      editorNotes,
      targetWordCount,
    });
    if (result) {
      setDraft(result.data);
      setDraftMarkdown(result.data.article_markdown);
      setDraftDek(result.data.dek);
      setCurrent("draft");
    }
  };

  const runFinish = async () => {
    if (draftMarkdown.trim().length < 50) return;
    const result = await call<FinishData>("finish", {
      pillar,
      title: chosenTitle.trim(),
      articleMarkdown: draftMarkdown,
      knownRisks: (outline?.article_plan.risk_flags ?? []).join("; "),
    });
    if (result) {
      setFinish(result.data);
      setCurrent("finish");
    }
  };

  const openInEditor = () => {
    const params = new URLSearchParams({
      pillar,
      title: chosenTitle.trim(),
      markdown: draftMarkdown,
    });
    if (draftDek) params.set("dek", draftDek);
    if (finish?.seo.slug) params.set("slug", finish.seo.slug);
    if (finish?.seo.excerpt) params.set("excerpt", finish.seo.excerpt);
    if (finish?.seo.seo_title) params.set("seoTitle", finish.seo.seo_title);
    if (finish?.seo.meta_description) {
      params.set("metaDescription", finish.seo.meta_description);
    }
    if (finish?.seo.tags?.length) params.set("tags", finish.seo.tags.join(", "));
    if (finish?.seo.image_alt_text) {
      params.set("coverImageAlt", finish.seo.image_alt_text);
    }
    if (finish?.seo.primary_keyword) {
      params.set("primaryKeyword", finish.seo.primary_keyword);
    }
    if (finish?.seo.secondary_keywords?.length) {
      params.set(
        "secondaryKeywords",
        finish.seo.secondary_keywords.join(", "),
      );
    }

    router.push(`/admin/konten/baru?${params.toString()}`);
  };

  return (
    <div className="grid gap-3">
      <AiChainNotice />

      <StageRail
        stages={STAGES.map((stage) => ({
          key: stage.key,
          label: stage.label,
          state: status[stage.key],
        }))}
        current={current}
        onSelect={(key) => setCurrent(key as StageKey)}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Stage 1: ideation                                                */}
      {/* ---------------------------------------------------------------- */}
      {current === "ideation" ? (
        <StagePanel
          index="01"
          title="Ideasi"
          description="Isi brief, lalu minta AI menyusun ide yang punya kaitan nyata dengan Tangerang. Tidak ada fakta baru yang boleh dikarang dari tahap ini."
          meta={meta.ideation}
          error={errors.ideation}
        >
          <div className="grid gap-3">
            <fieldset className="grid gap-1.5">
              <legend className="tng-label mb-1 text-muted">Pilar</legend>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
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
                      name="studio-pillar"
                      value={option}
                      checked={pillar === option}
                      onChange={() => setPillar(option)}
                      className="size-3.5 accent-lime"
                    />
                    <span className="tng-label text-[0.625rem] text-foreground">
                      {PILLAR_META[option].label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Area cakupan" htmlFor="studio-area" required>
                <Input
                  id="studio-area"
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                  maxLength={120}
                />
              </Field>
              <Field label="Tujuan konten" htmlFor="studio-goal" required>
                <Input
                  id="studio-goal"
                  value={contentGoal}
                  onChange={(event) => setContentGoal(event.target.value)}
                  placeholder="Misal: bantu pembaca memilih tempat kerja murah"
                  maxLength={240}
                />
              </Field>
            </div>

            <Field
              label="Topik atau brief awal"
              htmlFor="studio-brief"
              required
              hint="Semakin konkret, semakin sedikit yang perlu diverifikasi nanti."
            >
              <Textarea
                id="studio-brief"
                rows={4}
                value={topicBrief}
                onChange={(event) => setTopicBrief(event.target.value)}
                maxLength={2000}
              />
            </Field>

            <Field
              label="Konteks atau tren yang sudah diketahui"
              htmlFor="studio-context"
              hint="Tempel fakta, angka, atau catatan lapangan yang sudah kamu punya."
            >
              <Textarea
                id="studio-context"
                rows={3}
                value={knownContext}
                onChange={(event) => setKnownContext(event.target.value)}
                maxLength={4000}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Batasan" htmlFor="studio-constraints">
                <Input
                  id="studio-constraints"
                  value={constraints}
                  onChange={(event) => setConstraints(event.target.value)}
                  maxLength={1000}
                />
              </Field>
              <Field label="Jumlah ide" htmlFor="studio-count">
                <Input
                  id="studio-count"
                  type="number"
                  min={3}
                  max={10}
                  value={ideaCount}
                  onChange={(event) =>
                    setIdeaCount(Number(event.target.value) || 6)
                  }
                />
              </Field>
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={
                status.ideation === "processing" ||
                topicBrief.trim().length < 3 ||
                contentGoal.trim().length < 3
              }
              onClick={() => void runIdeation()}
            >
              {status.ideation === "processing" ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Sparkles aria-hidden="true" />
              )}
              {ideas ? "Generate ulang ide" : "Generate ide"}
            </Button>

            {ideas ? (
              <ul className="grid gap-2">
                {ideas.content_ideas.map((idea) => {
                  const isSelected = selectedIdeaId === idea.idea_id;
                  return (
                    <li key={idea.idea_id}>
                      <button
                        type="button"
                        onClick={() => setSelectedIdeaId(idea.idea_id)}
                        aria-pressed={isSelected}
                        className={cn(
                          "w-full border-2 p-3 text-left transition-colors",
                          isSelected
                            ? "border-lime bg-surface-strong"
                            : "border-line bg-wall-deep hover:border-muted/60",
                        )}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <TapePatch tone="bone" size="sm">
                            {PILLAR_META[idea.pillar].label}
                          </TapePatch>
                          <TapePatch
                            tone={
                              idea.editorial_risk === "high"
                                ? "danger"
                                : idea.editorial_risk === "medium"
                                  ? "orange"
                                  : "outline"
                            }
                            size="sm"
                          >
                            Risiko {idea.editorial_risk}
                          </TapePatch>
                          <span className="tng-label ml-auto text-muted">
                            {idea.format}
                          </span>
                          {isSelected ? (
                            <Check
                              aria-hidden="true"
                              className="size-4 text-lime"
                              strokeWidth={3}
                            />
                          ) : null}
                        </span>
                        <span className="tng-display-tight mt-2 block text-base text-foreground">
                          {idea.working_title}
                        </span>
                        <span className="mt-1 block text-[0.8125rem] leading-snug text-muted">
                          {idea.one_line_hook}
                        </span>
                        <span className="mt-2 block text-[0.75rem] leading-snug text-muted">
                          Kenapa sekarang: {idea.why_now}
                        </span>
                        {idea.research_needs.length > 0 ? (
                          <span className="mt-2 block border-l-2 border-orange pl-2 text-[0.75rem] leading-snug text-muted">
                            Perlu riset: {idea.research_needs.join("; ")}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {selectedIdea ? (
              <Button
                variant="secondary"
                size="lg"
                disabled={status.headline === "processing"}
                onClick={() => void runHeadline()}
              >
                {status.headline === "processing" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
                Lanjut ke judul
              </Button>
            ) : null}
          </div>
        </StagePanel>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Stage 2: headline                                                */}
      {/* ---------------------------------------------------------------- */}
      {current === "headline" ? (
        <StagePanel
          index="02"
          title="Judul"
          description="Pilih satu judul, atau edit langsung. Judul harus setia pada isi artikel yang akan ditulis."
          meta={meta.headline}
          error={errors.headline}
        >
          <div className="grid gap-3">
            {headlines ? (
              <ul className="grid gap-2">
                {headlines.headline_options.map((option) => {
                  const isChosen = chosenTitle === option.title;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => setChosenTitle(option.title)}
                        aria-pressed={isChosen}
                        className={cn(
                          "w-full border-2 p-3 text-left transition-colors",
                          isChosen
                            ? "border-lime bg-surface-strong"
                            : "border-line bg-wall-deep hover:border-muted/60",
                        )}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <TapePatch tone="outline" size="sm">
                            {option.style}
                          </TapePatch>
                          {option.id === headlines.recommended_id ? (
                            <TapePatch tone="lime" size="sm">
                              Rekomendasi
                            </TapePatch>
                          ) : null}
                          <span className="tng-label ml-auto text-muted tabular-nums">
                            {option.character_count ?? option.title.length} karakter
                          </span>
                        </span>
                        <span className="tng-display-tight mt-2 block text-base text-foreground">
                          {option.title}
                        </span>
                        {option.why_it_works ? (
                          <span className="mt-1 block text-[0.75rem] leading-snug text-muted">
                            {option.why_it_works}
                          </span>
                        ) : null}
                        {option.risk_note ? (
                          <span className="mt-1.5 block border-l-2 border-orange pl-2 text-[0.75rem] leading-snug text-orange">
                            {option.risk_note}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <Field
              label="Judul final"
              htmlFor="studio-title"
              required
              hint="Boleh diedit bebas. Ini yang dipakai untuk outline dan draft."
            >
              <Input
                id="studio-title"
                value={chosenTitle}
                onChange={(event) => setChosenTitle(event.target.value)}
                maxLength={200}
                className="font-display font-extrabold"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Fakta terverifikasi"
                htmlFor="studio-facts"
                hint="Hanya fakta di sini yang boleh dipakai AI."
              >
                <Textarea
                  id="studio-facts"
                  rows={4}
                  value={verifiedFacts}
                  onChange={(event) => setVerifiedFacts(event.target.value)}
                  maxLength={6000}
                />
              </Field>
              <Field label="Target panjang (kata)" htmlFor="studio-length">
                <Input
                  id="studio-length"
                  type="number"
                  min={300}
                  max={2500}
                  step={50}
                  value={targetWordCount}
                  onChange={(event) =>
                    setTargetWordCount(Number(event.target.value) || 900)
                  }
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="md"
                disabled={status.headline === "processing"}
                onClick={() => void runHeadline()}
              >
                <RefreshCcw aria-hidden="true" />
                Generate ulang judul
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={
                  status.outline === "processing" || chosenTitle.trim().length < 5
                }
                onClick={() => void runOutline()}
              >
                {status.outline === "processing" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
                Lanjut ke outline
              </Button>
            </div>
          </div>
        </StagePanel>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Stage 3: outline                                                 */}
      {/* ---------------------------------------------------------------- */}
      {current === "outline" ? (
        <StagePanel
          index="03"
          title="Outline"
          description="Edit outline sebelum lanjut. Apa pun yang tidak ada di outline dan fakta terverifikasi tidak boleh muncul di draft."
          meta={meta.outline}
          error={errors.outline}
        >
          <div className="grid gap-3">
            {outline?.article_plan.risk_flags.length ? (
              <BannerPanel ink="deep" lift="sm" className="border-orange p-3">
                <div className="flex items-start gap-2">
                  <TriangleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-orange"
                    strokeWidth={2.6}
                  />
                  <div>
                    <h3 className="tng-label text-orange">Risiko editorial</h3>
                    <ul className="mt-1.5 grid gap-1 text-[0.8125rem] text-muted">
                      {outline.article_plan.risk_flags.map((flag) => (
                        <li key={flag}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </BannerPanel>
            ) : null}

            {outline?.article_plan.fact_check_list.length ? (
              <BannerPanel ink="deep" lift="sm" className="p-3">
                <h3 className="tng-label text-muted">Daftar cek fakta</h3>
                <ul className="mt-1.5 grid gap-1 text-[0.8125rem] text-muted">
                  {outline.article_plan.fact_check_list.map((item) => (
                    <li key={item} className="border-l-2 border-line pl-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </BannerPanel>
            ) : null}

            <Field
              label="Outline (bisa diedit)"
              htmlFor="studio-outline"
              required
              hint="Ini yang dikirim ke tahap draft, apa adanya."
            >
              <Textarea
                id="studio-outline"
                rows={16}
                value={outlineText}
                onChange={(event) => setOutlineText(event.target.value)}
                className="font-mono text-[0.8125rem]"
                maxLength={12_000}
              />
            </Field>

            <Field
              label="Instruksi tambahan untuk penulis"
              htmlFor="studio-notes"
            >
              <Textarea
                id="studio-notes"
                rows={3}
                value={editorNotes}
                onChange={(event) => setEditorNotes(event.target.value)}
                maxLength={2000}
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="md"
                disabled={status.outline === "processing"}
                onClick={() => void runOutline()}
              >
                <RefreshCcw aria-hidden="true" />
                Generate ulang outline
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={
                  status.draft === "processing" || outlineText.trim().length < 20
                }
                onClick={() => void runDraft()}
              >
                {status.draft === "processing" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
                Tulis draft
              </Button>
            </div>
          </div>
        </StagePanel>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Stage 4: draft                                                   */}
      {/* ---------------------------------------------------------------- */}
      {current === "draft" ? (
        <StagePanel
          index="04"
          title="Draft"
          description="Draft ini belum siap tayang. Perbaiki di sini, lalu jalankan audit sebelum masuk ke editor artikel."
          meta={meta.draft}
          error={errors.draft}
        >
          <div className="grid gap-3">
            {draft?.verification_needed.length ? (
              <BannerPanel ink="deep" lift="sm" className="border-danger p-3">
                <h3 className="tng-label text-danger">Perlu verifikasi</h3>
                <ul className="mt-1.5 grid gap-1 text-[0.8125rem] text-muted">
                  {draft.verification_needed.map((item) => (
                    <li key={item} className="border-l-2 border-danger pl-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </BannerPanel>
            ) : null}

            {draft?.editor_notes.length ? (
              <BannerPanel ink="deep" lift="sm" className="p-3">
                <h3 className="tng-label text-muted">Catatan penulis AI</h3>
                <ul className="mt-1.5 grid gap-1 text-[0.8125rem] text-muted">
                  {draft.editor_notes.map((note) => (
                    <li key={note} className="border-l-2 border-line pl-2">
                      {note}
                    </li>
                  ))}
                </ul>
              </BannerPanel>
            ) : null}

            <Field label="Dek" htmlFor="studio-dek">
              <Textarea
                id="studio-dek"
                rows={2}
                value={draftDek}
                onChange={(event) => setDraftDek(event.target.value)}
                maxLength={320}
              />
            </Field>

            <Field
              label="Draft artikel (Markdown)"
              htmlFor="studio-draft"
              required
            >
              <Textarea
                id="studio-draft"
                rows={20}
                value={draftMarkdown}
                onChange={(event) => setDraftMarkdown(event.target.value)}
                className="font-mono text-[0.8125rem]"
              />
            </Field>

            {draft?.image_search_queries.length ? (
              <BannerPanel ink="deep" lift="sm" className="p-3">
                <h3 className="tng-label text-muted">Usulan query gambar</h3>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {draft.image_search_queries.map((query) => (
                    <li key={query}>
                      <TapePatch tone="outline" size="sm">
                        {query}
                      </TapePatch>
                    </li>
                  ))}
                </ul>
              </BannerPanel>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="md"
                disabled={status.draft === "processing"}
                onClick={() => void runDraft()}
              >
                <RefreshCcw aria-hidden="true" />
                Generate ulang draft
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={
                  status.finish === "processing" || draftMarkdown.trim().length < 50
                }
                onClick={() => void runFinish()}
              >
                {status.finish === "processing" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
                Jalankan SEO dan audit
              </Button>
            </div>
          </div>
        </StagePanel>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Stage 5: SEO, quality gate, social                               */}
      {/* ---------------------------------------------------------------- */}
      {current === "finish" ? (
        <StagePanel
          index="05"
          title="SEO, quality gate, dan paket sosial"
          description="Hasil audit tidak menggantikan editor. Draft tetap masuk sebagai artikel yang belum tayang."
          meta={meta.finish}
          error={errors.finish}
        >
          <div className="grid gap-3">
            {finish?.quality ? (
              <QualityReport report={finish.quality} />
            ) : finish?.qualityError ? (
              <BannerPanel ink="deep" lift="sm" className="border-danger p-3">
                <h3 className="tng-label text-danger">Quality gate gagal</h3>
                <p className="mt-1.5 text-[0.8125rem] text-muted">
                  {finish.qualityError}
                </p>
              </BannerPanel>
            ) : null}

            {finish?.seo ? (
              <BannerPanel ink="wall" lift="sm" className="grid gap-2 p-3">
                <h3 className="tng-label text-muted">Metadata SEO</h3>
                <dl className="grid gap-1.5 text-[0.8125rem]">
                  <MetaRow label="SEO title" value={finish.seo.seo_title} />
                  <MetaRow
                    label="Meta description"
                    value={finish.seo.meta_description}
                  />
                  <MetaRow label="Excerpt" value={finish.seo.excerpt} />
                  <MetaRow label="Slug usulan" value={finish.seo.slug} />
                  <MetaRow
                    label="Keyword utama"
                    value={finish.seo.primary_keyword}
                  />
                  <MetaRow
                    label="Keyword sekunder"
                    value={finish.seo.secondary_keywords.join(", ")}
                  />
                  <MetaRow
                    label="Entitas GEO"
                    value={finish.seo.entity_keywords.join(", ")}
                  />
                  <MetaRow label="Tag" value={finish.seo.tags.join(", ")} />
                  <MetaRow label="Alt text" value={finish.seo.image_alt_text} />
                </dl>
                {finish.seo.internal_link_suggestions.length > 0 ? (
                  <SeoSuggestionList
                    title="Internal link"
                    items={finish.seo.internal_link_suggestions.map((item) => ({
                      key: `${item.anchor_text}-${item.target_topic_or_slug}`,
                      body: `${item.anchor_text} -> ${item.target_topic_or_slug}: ${item.reason}`,
                    }))}
                  />
                ) : null}
                {finish.seo.geo_answer_targets.length > 0 ? (
                  <SeoSuggestionList
                    title="Target jawaban GEO"
                    items={finish.seo.geo_answer_targets.map((item) => ({
                      key: item.question,
                      body: `${item.question} ${item.answer_summary}`,
                    }))}
                  />
                ) : null}
                {finish.seo.faq_candidates.length > 0 ? (
                  <SeoSuggestionList
                    title="FAQ kandidat"
                    items={finish.seo.faq_candidates.map((item) => ({
                      key: item.question,
                      body: `${item.question} ${item.short_answer}`,
                    }))}
                  />
                ) : null}
                {finish.seo.content_refresh_notes.length > 0 ? (
                  <SeoSuggestionList
                    title="Refresh konten"
                    items={finish.seo.content_refresh_notes.map((note) => ({
                      key: note,
                      body: note,
                    }))}
                  />
                ) : null}
                {finish.seo.seo_warnings.length > 0 ? (
                  <ul className="mt-1 grid gap-1">
                    {finish.seo.seo_warnings.map((warning) => (
                      <li
                        key={warning}
                        className="border-l-2 border-orange pl-2 text-[0.75rem] text-orange"
                      >
                        {warning}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </BannerPanel>
            ) : null}

            {finish?.imageQueries ? (
              <BannerPanel ink="deep" lift="sm" className="grid gap-2 p-3">
                <h3 className="tng-label text-muted">Arahan visual</h3>
                <p className="text-[0.8125rem] text-muted">
                  Tipe visual: {finish.imageQueries.recommended_visual_type}
                </p>
                {finish.imageQueries.cover_direction ? (
                  <p className="text-[0.8125rem] text-muted">
                    {finish.imageQueries.cover_direction}
                  </p>
                ) : null}
                <ul className="flex flex-wrap gap-1.5">
                  {finish.imageQueries.search_queries.map((query) => (
                    <li key={query}>
                      <TapePatch tone="outline" size="sm">
                        {query}
                      </TapePatch>
                    </li>
                  ))}
                </ul>
                {finish.imageQueries.ethics_notes.length > 0 ? (
                  <ul className="grid gap-1">
                    {finish.imageQueries.ethics_notes.map((note) => (
                      <li
                        key={note}
                        className="border-l-2 border-orange pl-2 text-[0.75rem] text-muted"
                      >
                        {note}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </BannerPanel>
            ) : null}

            {finish?.social ? (
              <BannerPanel ink="deep" lift="sm" className="grid gap-3 p-3">
                <h3 className="tng-label text-muted">Paket distribusi</h3>
                <SocialBlock
                  title="Instagram"
                  body={finish.social.instagram_caption}
                />
                <SocialBlock
                  title="TikTok hook"
                  body={finish.social.tiktok_script.hook_0_3_seconds}
                />
                <SocialBlock
                  title="WhatsApp Channel"
                  body={finish.social.whatsapp_channel_post}
                />
                {finish.social.accuracy_notes.length > 0 ? (
                  <ul className="grid gap-1">
                    {finish.social.accuracy_notes.map((note) => (
                      <li
                        key={note}
                        className="border-l-2 border-orange pl-2 text-[0.75rem] text-muted"
                      >
                        {note}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </BannerPanel>
            ) : null}

            <Button
              variant="primary"
              size="lg"
              disabled={draftMarkdown.trim().length < 50}
              onClick={openInEditor}
            >
              <ArrowRight aria-hidden="true" />
              Buka sebagai draft di editor artikel
            </Button>
            <p className="text-[0.75rem] text-muted">
              Artikel dibuat sebagai draft. Publish tetap tindakan manual di editor.
            </p>
          </div>
        </StagePanel>
      ) : null}
    </div>
  );
}

function StagePanel({
  index,
  title,
  description,
  meta,
  error,
  children,
}: {
  index: string;
  title: string;
  description: string;
  meta?: StageMeta;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <BannerPanel ink="wall" lift="md" className="grid gap-3 p-3 sm:p-4">
      <header className="grid gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm font-extrabold tabular-nums text-lime">
            {index}
          </span>
          <h2 className="tng-display text-xl">{title}</h2>
        </div>
        <p className="tng-measure text-[0.8125rem] leading-relaxed text-muted">
          {description}
        </p>
        {meta?.provider ? (
          <p className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-muted">
            <TapePatch tone="outline" size="sm">
              {meta.provider}
            </TapePatch>
            {meta.model ? <span>{meta.model}</span> : null}
            {meta.latencyMs ? <span>{meta.latencyMs} ms</span> : null}
            {meta.promptTemplateKey ? (
              <span className="font-mono">
                {meta.promptTemplateKey}
                {meta.promptVersion ? ` v${meta.promptVersion}` : ""}
              </span>
            ) : null}
            {meta.usedFallbackTemplate ? (
              <TapePatch tone="orange" size="sm">
                Template fallback
              </TapePatch>
            ) : null}
          </p>
        ) : null}
      </header>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 border-l-2 border-danger bg-danger/10 px-2.5 py-2 text-[0.8125rem] font-semibold text-danger"
        >
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={2.6}
          />
          {error}
        </p>
      ) : null}

      {children}
    </BannerPanel>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid gap-0.5 border-l-2 border-line pl-2">
      <dt className="tng-label text-[0.5625rem] text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function SeoSuggestionList({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; body: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-1 border-l-2 border-line pl-2.5">
      <h4 className="tng-label text-[0.5625rem] text-muted">{title}</h4>
      <ul className="grid gap-1 text-[0.75rem] leading-snug text-muted">
        {items.map((item) => (
          <li key={item.key}>{item.body}</li>
        ))}
      </ul>
    </div>
  );
}

function SocialBlock({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <div className="grid gap-1 border-l-2 border-line pl-2.5">
      <h4 className="tng-label text-muted">{title}</h4>
      <p className="whitespace-pre-line text-[0.8125rem] leading-relaxed text-foreground/90">
        {body}
      </p>
    </div>
  );
}

/** Mirrors the server-side serialiser so the editable text matches the prompt. */
function serialiseOutline(outline: OutlineOutput): string {
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
  return lines.join("\n");
}
