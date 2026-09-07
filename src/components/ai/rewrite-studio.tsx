"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Ban,
  Check,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { AiChainNotice } from "@/components/ai/ai-chain-notice";
import { BannerPanel } from "@/components/shared/banner-panel";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { TapePatch } from "@/components/shared/tape-patch";
import { StageRail, type StageState } from "@/components/ai/stage-rail";
import type { RewriteOutput } from "@/lib/ai/schemas";
import { PILLARS, PILLAR_META, type Pillar } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Rewrite Studio.
 *
 * Multi-URL extraction, then synthesis with an attribution map, then a
 * server-side similarity warning. The decision from the model is honoured: a
 * non-proceed decision does not produce a publishable article, it produces a
 * list of reporting that is still missing.
 */

interface ExtractedPreview {
  url: string;
  finalUrl: string;
  ok: boolean;
  siteName: string | null;
  title: string | null;
  byline: string | null;
  publishedTime: string | null;
  excerpt: string | null;
  wordCount: number;
  preview: string;
  error: string | null;
}

interface SimilarityEntry {
  sourceName: string | null;
  sourceUrl: string;
  score: number;
  matchedPhrases: string[];
  comparedPhrases: number;
}

interface SimilarityReport {
  worst: number;
  threshold: number;
  exceeded: boolean;
  perSource: SimilarityEntry[];
}

const STAGES = [
  { key: "sources", label: "Sumber" },
  { key: "brief", label: "Brief" },
  { key: "synthesis", label: "Sintesis" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

export function RewriteStudio() {
  const router = useRouter();

  const [urls, setUrls] = React.useState<string[]>([""]);
  const [extracting, setExtracting] = React.useState(false);
  const [extracted, setExtracted] = React.useState<ExtractedPreview[] | null>(null);
  const [jobId, setJobId] = React.useState<string | null>(null);

  const [pillar, setPillar] = React.useState<Pillar>("suara");
  const [editorBrief, setEditorBrief] = React.useState("");
  const [area, setArea] = React.useState("Tangerang Raya");
  const [targetWordCount, setTargetWordCount] = React.useState(700);

  const [synthesising, setSynthesising] = React.useState(false);
  const [synthesis, setSynthesis] = React.useState<RewriteOutput | null>(null);
  const [similarity, setSimilarity] = React.useState<SimilarityReport | null>(null);
  const [meta, setMeta] = React.useState<{
    provider?: string;
    model?: string;
    promptTemplateKey?: string;
    promptVersion?: number;
    usedFallbackTemplate?: boolean;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [current, setCurrent] = React.useState<StageKey>("sources");

  const successCount = extracted?.filter((source) => source.ok).length ?? 0;

  const stageStates: Record<StageKey, StageState> = {
    sources: extracting
      ? "processing"
      : extracted
        ? successCount > 0
          ? "completed"
          : "failed"
        : "pending",
    brief: successCount > 0 ? (editorBrief.trim().length >= 5 ? "completed" : "pending") : "pending",
    synthesis: synthesising
      ? "processing"
      : synthesis
        ? "completed"
        : error
          ? "failed"
          : "pending",
  };

  const extract = async () => {
    const cleaned = urls.map((url) => url.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      toast.error("Masukkan minimal satu URL.");
      return;
    }

    setExtracting(true);
    setError(null);
    try {
      const response = await fetch("/api/rewrite/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: cleaned }),
      });

      const body = (await response.json()) as {
        jobId?: string | null;
        sources?: ExtractedPreview[];
        error?: string;
      };

      if (!response.ok || !body.sources) {
        throw new Error(body.error ?? "Ekstraksi gagal.");
      }

      setExtracted(body.sources);
      setJobId(body.jobId ?? null);

      const ok = body.sources.filter((source) => source.ok).length;
      if (ok === 0) {
        toast.error("Tidak ada URL yang berhasil diekstrak.");
      } else {
        toast.success(`${ok} dari ${body.sources.length} sumber berhasil diekstrak.`);
        setCurrent("brief");
      }
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Ekstraksi gagal.");
    } finally {
      setExtracting(false);
    }
  };

  const synthesise = async () => {
    if (!jobId) {
      toast.error("Job ekstraksi belum tersimpan. Ekstrak ulang sumbernya.");
      return;
    }

    setSynthesising(true);
    setError(null);
    try {
      const response = await fetch("/api/rewrite/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewriteJobId: jobId,
          pillar,
          editorBrief,
          area,
          targetWordCount,
        }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        data?: RewriteOutput;
        similarity?: SimilarityReport;
        error?: string;
        provider?: string;
        model?: string;
        promptTemplateKey?: string;
        promptVersion?: number;
        usedFallbackTemplate?: boolean;
      };

      if (!response.ok || !body.ok || !body.data) {
        throw new Error(body.error ?? "Sintesis gagal.");
      }

      setSynthesis(body.data);
      setSimilarity(body.similarity ?? null);
      setMeta({
        ...(body.provider ? { provider: body.provider } : {}),
        ...(body.model ? { model: body.model } : {}),
        ...(body.promptTemplateKey
          ? { promptTemplateKey: body.promptTemplateKey }
          : {}),
        ...(body.promptVersion !== undefined
          ? { promptVersion: body.promptVersion }
          : {}),
        ...(body.usedFallbackTemplate !== undefined
          ? { usedFallbackTemplate: body.usedFallbackTemplate }
          : {}),
      });
      setCurrent("synthesis");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Sintesis gagal.";
      setError(message);
      toast.error(message);
    } finally {
      setSynthesising(false);
    }
  };

  const openInEditor = () => {
    if (!synthesis || synthesis.decision !== "proceed") return;

    const params = new URLSearchParams({
      pillar,
      title: synthesis.title,
      markdown: synthesis.article_markdown,
    });
    if (synthesis.dek) params.set("dek", synthesis.dek);
    router.push(`/admin/konten/baru?${params.toString()}`);
  };

  return (
    <div className="grid gap-3">
      <AiChainNotice />

      <StageRail
        stages={STAGES.map((stage) => ({
          key: stage.key,
          label: stage.label,
          state: stageStates[stage.key],
        }))}
        current={current}
        onSelect={(key) => setCurrent(key as StageKey)}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Stage 1: sources                                                 */}
      {/* ---------------------------------------------------------------- */}
      {current === "sources" ? (
        <BannerPanel ink="wall" lift="md" className="grid gap-3 p-3 sm:p-4">
          <header>
            <h2 className="tng-display text-xl">Sumber</h2>
            <p className="tng-measure mt-1 text-[0.8125rem] leading-relaxed text-muted">
              Maksimal lima URL publik. Sistem tidak menembus paywall, login, atau
              proteksi anti-bot, dan menolak alamat internal.
            </p>
          </header>

          <div className="grid gap-2">
            {urls.map((url, index) => (
              <div key={index} className="flex items-end gap-2">
                <Field
                  label={`URL ${index + 1}`}
                  htmlFor={`rewrite-url-${index}`}
                  className="flex-1"
                >
                  <Input
                    id={`rewrite-url-${index}`}
                    type="url"
                    value={url}
                    placeholder="https://"
                    onChange={(event) => {
                      const next = [...urls];
                      next[index] = event.target.value;
                      setUrls(next);
                    }}
                  />
                </Field>
                {urls.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus URL ${index + 1}`}
                    onClick={() => setUrls(urls.filter((_, i) => i !== index))}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {urls.length < 5 ? (
              <Button
                variant="outline"
                size="md"
                onClick={() => setUrls([...urls, ""])}
              >
                <Plus aria-hidden="true" />
                Tambah URL
              </Button>
            ) : null}
            <Button
              variant="primary"
              size="md"
              disabled={extracting}
              onClick={() => void extract()}
            >
              {extracting ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
              Ekstrak sumber
            </Button>
          </div>

          {extracted ? (
            <ul className="grid gap-2">
              {extracted.map((source) => (
                <li key={source.url}>
                  <div
                    className={cn(
                      "border-2 p-3",
                      source.ok
                        ? "border-line bg-wall-deep"
                        : "border-danger bg-danger/5",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {source.ok ? (
                        <TapePatch tone="lime" size="sm">
                          Berhasil
                        </TapePatch>
                      ) : (
                        <TapePatch tone="danger" size="sm">
                          Gagal
                        </TapePatch>
                      )}
                      <span className="font-display text-[0.8125rem] font-extrabold text-foreground">
                        {source.siteName ?? "Sumber"}
                      </span>
                      {source.ok ? (
                        <span className="tng-label ml-auto text-muted tabular-nums">
                          {source.wordCount} kata
                        </span>
                      ) : null}
                    </div>

                    {source.title ? (
                      <p className="mt-1.5 text-[0.875rem] font-semibold leading-snug text-foreground">
                        {source.title}
                      </p>
                    ) : null}

                    <a
                      href={source.finalUrl}
                      target="_blank"
                      rel="noopener nofollow"
                      className="mt-1 inline-flex items-center gap-1 break-all text-[0.75rem] text-lime hover:underline hover:decoration-2 hover:underline-offset-4"
                    >
                      {source.finalUrl}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-3 shrink-0"
                        strokeWidth={3}
                      />
                    </a>

                    {source.error ? (
                      <p className="mt-2 flex items-start gap-1.5 text-[0.8125rem] font-semibold leading-snug text-danger">
                        <TriangleAlert
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0"
                          strokeWidth={2.6}
                        />
                        {source.error}
                      </p>
                    ) : null}

                    {source.preview ? (
                      <p className="mt-2 border-l-2 border-line pl-2 text-[0.75rem] leading-snug text-muted">
                        {source.preview}
                        {source.preview.length >= 600 ? "..." : ""}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {successCount > 0 ? (
            <Button variant="secondary" size="md" onClick={() => setCurrent("brief")}>
              <ArrowRight aria-hidden="true" />
              Lanjut ke brief
            </Button>
          ) : null}
        </BannerPanel>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Stage 2: brief                                                   */}
      {/* ---------------------------------------------------------------- */}
      {current === "brief" ? (
        <BannerPanel ink="wall" lift="md" className="grid gap-3 p-3 sm:p-4">
          <header>
            <h2 className="tng-display text-xl">Brief editor</h2>
            <p className="tng-measure mt-1 text-[0.8125rem] leading-relaxed text-muted">
              Tentukan angle TNG Daily. AI hanya boleh memakai fakta dari sumber
              yang sudah diekstrak, dengan atribusi natural di dalam artikel.
            </p>
          </header>

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
                    name="rewrite-pillar"
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

          <Field
            label="Angle atau brief"
            htmlFor="rewrite-brief"
            required
            hint="Apa nilai tambah TNG Daily di artikel ini? Tanpa nilai tambah, AI akan menolak menulis."
          >
            <Textarea
              id="rewrite-brief"
              rows={4}
              value={editorBrief}
              onChange={(event) => setEditorBrief(event.target.value)}
              maxLength={2000}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Area relevansi" htmlFor="rewrite-area">
              <Input
                id="rewrite-area"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="Target panjang (kata)" htmlFor="rewrite-length">
              <Input
                id="rewrite-length"
                type="number"
                min={300}
                max={2000}
                step={50}
                value={targetWordCount}
                onChange={(event) =>
                  setTargetWordCount(Number(event.target.value) || 700)
                }
              />
            </Field>
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled={synthesising || editorBrief.trim().length < 5 || !jobId}
            onClick={() => void synthesise()}
          >
            {synthesising ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <ArrowRight aria-hidden="true" />
            )}
            Jalankan sintesis
          </Button>
        </BannerPanel>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Stage 3: synthesis                                               */}
      {/* ---------------------------------------------------------------- */}
      {current === "synthesis" ? (
        <div className="grid gap-3">
          {error ? (
            <BannerPanel ink="deep" lift="sm" className="border-danger p-3">
              <p className="flex items-start gap-2 text-[0.8125rem] font-semibold text-danger">
                <TriangleAlert
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={2.6}
                />
                {error}
              </p>
            </BannerPanel>
          ) : null}

          {synthesis ? (
            <>
              <DecisionPanel decision={synthesis.decision} reason={synthesis.decision_reason} />

              {meta?.provider ? (
                <p className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-muted">
                  <TapePatch tone="outline" size="sm">
                    {meta.provider}
                  </TapePatch>
                  {meta.model ? <span>{meta.model}</span> : null}
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

              {similarity ? <SimilarityPanel report={similarity} /> : null}

              {synthesis.decision === "proceed" ? (
                <>
                  <BannerPanel ink="wall" lift="sm" className="grid gap-2 p-3 sm:p-4">
                    <h2 className="tng-display text-xl">{synthesis.title}</h2>
                    {synthesis.dek ? (
                      <p className="tng-measure text-[0.875rem] leading-relaxed text-muted">
                        {synthesis.dek}
                      </p>
                    ) : null}
                    {synthesis.proposed_angle ? (
                      <p className="border-l-2 border-lime pl-2.5 text-[0.8125rem] leading-snug text-muted">
                        Angle: {synthesis.proposed_angle}
                      </p>
                    ) : null}
                    <pre className="mt-2 max-h-[26rem] overflow-y-auto whitespace-pre-wrap border-2 border-line bg-wall-deep p-3 font-mono text-[0.8125rem] leading-relaxed text-foreground">
                      {synthesis.article_markdown}
                    </pre>
                  </BannerPanel>

                  <AttributionPanel map={synthesis.source_attribution_map} />

                  {synthesis.unique_value_added.length > 0 ? (
                    <BannerPanel ink="deep" lift="sm" className="p-3">
                      <h3 className="tng-label text-muted">Nilai tambah</h3>
                      <ul className="mt-1.5 grid gap-1">
                        {synthesis.unique_value_added.map((item) => (
                          <li
                            key={item}
                            className="border-l-2 border-lime pl-2 text-[0.8125rem] leading-snug text-muted"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </BannerPanel>
                  ) : null}

                  {synthesis.verification_needed.length > 0 ? (
                    <BannerPanel ink="deep" lift="sm" className="border-danger p-3">
                      <h3 className="tng-label text-danger">Perlu verifikasi</h3>
                      <ul className="mt-1.5 grid gap-1">
                        {synthesis.verification_needed.map((item) => (
                          <li
                            key={item}
                            className="border-l-2 border-danger pl-2 text-[0.8125rem] leading-snug text-muted"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </BannerPanel>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="md"
                      disabled={synthesising}
                      onClick={() => void synthesise()}
                    >
                      <RefreshCcw aria-hidden="true" />
                      Generate ulang
                    </Button>
                    <Button variant="primary" size="md" onClick={openInEditor}>
                      <ArrowRight aria-hidden="true" />
                      Buka sebagai draft
                    </Button>
                  </div>
                </>
              ) : (
                <BannerPanel ink="deep" lift="sm" className="grid gap-2 p-3">
                  <h3 className="tng-label text-orange">
                    Liputan tambahan yang dibutuhkan
                  </h3>
                  {synthesis.editor_notes.length > 0 ? (
                    <ul className="grid gap-1">
                      {synthesis.editor_notes.map((note) => (
                        <li
                          key={note}
                          className="border-l-2 border-orange pl-2 text-[0.8125rem] leading-snug text-muted"
                        >
                          {note}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[0.8125rem] text-muted">
                      Model tidak memberikan catatan tambahan. Pertimbangkan mencari
                      sumber lain atau melakukan liputan sendiri.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="md"
                    className="mt-1 w-fit"
                    onClick={() => setCurrent("sources")}
                  >
                    <RefreshCcw aria-hidden="true" />
                    Ganti sumber
                  </Button>
                </BannerPanel>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DecisionPanel({
  decision,
  reason,
}: {
  decision: RewriteOutput["decision"];
  reason: string;
}) {
  const config = {
    proceed: {
      tone: "lime" as const,
      label: "Layak dilanjutkan",
      icon: Check,
      sentence:
        "Model menilai ada cukup bahan dan nilai tambah untuk menulis artikel baru. Editor tetap memeriksa fakta dan atribusi.",
    },
    needs_more_original_reporting: {
      tone: "orange" as const,
      label: "Butuh liputan sendiri",
      icon: Ban,
      sentence:
        "Bahan yang ada hanya cukup untuk merangkum sumber. Artikel tidak dibuat sampai ada liputan tambahan.",
    },
    insufficient_source_material: {
      tone: "danger" as const,
      label: "Bahan sumber tidak cukup",
      icon: Ban,
      sentence:
        "Ekstraksi tidak memberi cukup fakta untuk artikel yang bertanggung jawab. Ganti atau tambah sumber.",
    },
  }[decision];

  const Icon = config.icon;

  return (
    <BannerPanel
      ink="wall"
      lift="sm"
      className={cn(
        "grid gap-2 p-3",
        decision !== "proceed" && "border-orange",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <TapePatch tone={config.tone} tilt="left">
          <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.8} />
          {config.label}
        </TapePatch>
      </div>
      <p className="tng-measure text-[0.8125rem] font-semibold leading-relaxed text-foreground">
        {config.sentence}
      </p>
      {reason ? (
        <p className="tng-measure text-[0.8125rem] leading-relaxed text-muted">
          {reason}
        </p>
      ) : null}
    </BannerPanel>
  );
}

function SimilarityPanel({ report }: { report: SimilarityReport }) {
  const percent = Math.round(report.worst * 100);
  const thresholdPercent = Math.round(report.threshold * 100);

  return (
    <BannerPanel
      ink="deep"
      lift="sm"
      className={cn("grid gap-2 p-3", report.exceeded && "border-orange")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <TapePatch tone={report.exceeded ? "orange" : "lime"} size="sm">
          Kemiripan {percent}%
        </TapePatch>
        <span className="tng-label text-muted">
          ambang peringatan {thresholdPercent}%
        </span>
      </div>

      <p className="tng-measure text-[0.8125rem] leading-relaxed text-muted">
        Angka ini indikasi kemiripan frasa panjang (8 kata) antara draft dan teks
        sumber, dihitung di server. Ini bukan penilaian hukum dan tidak
        menggantikan penilaian editor.
      </p>

      <ul className="grid gap-2">
        {report.perSource.map((entry) => (
          <li key={entry.sourceUrl} className="grid gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[0.8125rem] font-semibold text-foreground">
                {entry.sourceName ?? entry.sourceUrl}
              </span>
              <span className="tng-label text-muted tabular-nums">
                {Math.round(entry.score * 100)}% dari {entry.comparedPhrases} frasa
              </span>
            </div>
            {entry.matchedPhrases.length > 0 ? (
              <ul className="grid gap-1">
                {entry.matchedPhrases.slice(0, 4).map((phrase) => (
                  <li
                    key={phrase}
                    className="border-l-2 border-orange pl-2 font-mono text-[0.6875rem] leading-snug text-muted"
                  >
                    {phrase}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      {report.exceeded ? (
        <p className="border-l-2 border-orange pl-2.5 text-[0.8125rem] font-semibold leading-snug text-orange">
          Kemiripan di atas ambang. Tulis ulang bagian yang ditandai, atau generate
          ulang sebelum artikel dibawa ke editor.
        </p>
      ) : null}
    </BannerPanel>
  );
}

function AttributionPanel({
  map,
}: {
  map: RewriteOutput["source_attribution_map"];
}) {
  if (map.length === 0) {
    return (
      <BannerPanel ink="deep" lift="sm" className="border-danger p-3">
        <h3 className="tng-label text-danger">Atribusi kosong</h3>
        <p className="mt-1.5 text-[0.8125rem] leading-snug text-muted">
          Model tidak mengembalikan peta atribusi. Jangan tayangkan artikel ini
          sebelum kamu memastikan setiap fakta punya sumber yang disebut di dalam
          teks.
        </p>
      </BannerPanel>
    );
  }

  return (
    <BannerPanel ink="deep" lift="sm" className="grid gap-2 p-3">
      <h3 className="tng-label text-muted">Peta atribusi</h3>
      <ul className="grid gap-2">
        {map.map((entry) => (
          <li
            key={`${entry.source_name}-${entry.source_url}`}
            className="border-l-2 border-line pl-2.5"
          >
            <p className="font-display text-[0.875rem] font-extrabold text-foreground">
              {entry.source_name}
            </p>
            {entry.source_url ? (
              <a
                href={entry.source_url}
                target="_blank"
                rel="noopener nofollow"
                className="break-all text-[0.75rem] text-lime hover:underline"
              >
                {entry.source_url}
              </a>
            ) : null}
            {entry.attribution_phrase_used ? (
              <p className="mt-1 text-[0.8125rem] italic text-muted">
                &ldquo;{entry.attribution_phrase_used}&rdquo;
              </p>
            ) : null}
            {entry.facts_used.length > 0 ? (
              <ul className="mt-1 grid gap-0.5">
                {entry.facts_used.map((fact) => (
                  <li key={fact} className="text-[0.75rem] leading-snug text-muted">
                    {fact}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </BannerPanel>
  );
}
