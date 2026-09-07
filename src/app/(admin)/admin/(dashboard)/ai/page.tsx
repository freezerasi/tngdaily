import type { Metadata } from "next";

import { AiProviderManager } from "@/components/ai/ai-provider-manager";
import { AiUsagePanel } from "@/components/ai/ai-usage-panel";
import { PromptTemplateList } from "@/components/ai/prompt-template-list";
import { BannerPanel } from "@/components/shared/banner-panel";
import { TapePatch } from "@/components/shared/tape-patch";
import { SetupNotice } from "@/components/shared/empty-state";
import { requireRole } from "@/lib/auth";
import {
  getUsageStats,
  listProvidersWithKeys,
  listTaskModelSettings,
  listUsageLog,
} from "@/lib/data/ai";
import { listPromptTemplates } from "@/lib/ai/prompts";
import { secretStoreStatus } from "@/lib/ai/secrets";
import { isSupabaseAdminConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Konfigurasi AI",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AiConfigPage() {
  await requireRole("owner", { returnTo: "/admin/ai" });

  const [providers, taskModelSettings, usageLog, usageStats, templates] =
    await Promise.all([
      listProvidersWithKeys(),
      listTaskModelSettings(),
      listUsageLog(30),
      getUsageStats(7),
      listPromptTemplates(),
    ]);

  const store = secretStoreStatus();
  const adminReady = isSupabaseAdminConfigured();

  return (
    <div className="grid gap-3">
      <header>
        <TapePatch tone="lime" tilt="left">
          Konfigurasi AI
        </TapePatch>
        <h1 className="tng-display mt-2 text-[2rem] leading-[0.92] sm:text-[2.5rem]">
          Provider, key, dan prompt
        </h1>
        <p className="tng-measure mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
          Semua permintaan AI berjalan di server. API key tidak pernah dikirim ke
          browser, dan setelah disimpan hanya bisa dilihat sebagai preview
          ter-mask.
        </p>
      </header>

      {!adminReady ? (
        <SetupNotice
          title="Service role belum tersedia"
          description="Penyimpanan API key membutuhkan service role Supabase di sisi server. Tanpa itu, provider bisa dibuat tapi key tidak bisa disimpan dengan aman."
          envKeys={["SUPABASE_SERVICE_ROLE_KEY"]}
        />
      ) : null}

      <BannerPanel
        ink="deep"
        lift="sm"
        className={store.ready ? "border-line p-3" : "border-orange p-3"}
      >
        <div className="flex flex-wrap items-center gap-2">
          <TapePatch tone={store.ready ? "lime" : "orange"} size="sm">
            Secret store
          </TapePatch>
          <span className="font-display text-sm font-extrabold text-foreground">
            {store.driver === "supabase-vault"
              ? "Supabase Vault"
              : store.driver === "development"
                ? "Development (terenkripsi lokal)"
                : "Belum siap"}
          </span>
        </div>
        <p className="tng-measure mt-2 text-[0.8125rem] leading-relaxed text-muted">
          {store.message}
        </p>
      </BannerPanel>

      <AiProviderManager
        providers={providers.data}
        taskModelSettings={taskModelSettings.data}
        source={providers.source}
        canWrite={adminReady && store.ready}
      />

      <AiUsagePanel stats={usageStats.data} log={usageLog.data} />

      <PromptTemplateList templates={templates} />
    </div>
  );
}
