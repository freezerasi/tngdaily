import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { taskTypeLabel } from "@/lib/labels";
import { formatFeedTime } from "@/lib/dates";
import type { PromptTemplateView } from "@/lib/data/types";
import { truncate } from "@/lib/utils";

/**
 * Prompt template inventory.
 *
 * Templates live in `ai_prompt_templates` and are editable from the database
 * without a deploy. A template shown as "fallback file" means the seed has not
 * been applied yet, which is surfaced rather than hidden.
 */
export function PromptTemplateList({
  templates,
}: {
  templates: PromptTemplateView[];
}) {
  const fallbackCount = templates.filter((template) => template.isFallback).length;

  return (
    <section className="grid gap-3">
      <div>
        <h2 className="tng-display text-xl">Prompt template</h2>
        <p className="tng-measure mt-1 text-[0.8125rem] leading-relaxed text-muted">
          Setiap task memuat template dari database, digabung dengan brand
          guardrails. Tidak ada teks prompt yang ditulis di dalam komponen UI.
        </p>
      </div>

      {fallbackCount > 0 ? (
        <BannerPanel ink="deep" lift="sm" className="border-orange p-3">
          <div className="flex flex-wrap items-center gap-2">
            <TapePatch tone="orange" size="sm">
              Seed belum lengkap
            </TapePatch>
            <span className="font-display text-sm font-extrabold text-foreground">
              {fallbackCount} dari {templates.length} template masih memakai file
              fallback
            </span>
          </div>
          <p className="tng-measure mt-2 text-[0.8125rem] leading-relaxed text-muted">
            Jalankan supabase/seed.sql supaya seluruh template tersimpan di
            database dan bisa diedit tanpa deploy ulang. Sampai itu dilakukan,
            sistem tetap jalan memakai salinan file di repo.
          </p>
        </BannerPanel>
      ) : null}

      <ul className="grid gap-2">
        {templates.map((template) => (
          <li key={template.templateKey}>
            <BannerPanel ink="wall" lift="sm" className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <TapePatch tone="bone" size="sm">
                  {taskTypeLabel(template.taskType)}
                </TapePatch>
                <span className="font-mono text-[0.75rem] text-muted">
                  {template.templateKey}
                </span>
                {template.isFallback ? (
                  <TapePatch tone="orange" size="sm">
                    File fallback
                  </TapePatch>
                ) : (
                  <TapePatch tone="lime" size="sm">
                    v{template.version}
                  </TapePatch>
                )}
                {!template.isFallback ? (
                  <span className="tng-label ml-auto text-muted">
                    diperbarui {formatFeedTime(template.updatedAt)}
                  </span>
                ) : null}
              </div>

              <h3 className="tng-display-tight mt-2 text-base">{template.name}</h3>
              <p className="tng-measure mt-1.5 text-[0.8125rem] leading-snug text-muted">
                {truncate(template.systemPrompt.replace(/\s+/g, " "), 220)}
              </p>
            </BannerPanel>
          </li>
        ))}
      </ul>
    </section>
  );
}
