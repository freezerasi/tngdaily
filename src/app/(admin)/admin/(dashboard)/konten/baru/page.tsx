import type { Metadata } from "next";

import { ArticleEditor } from "@/components/admin/article-editor";
import { TapePatch } from "@/components/shared/tape-patch";
import { SetupNotice } from "@/components/shared/empty-state";
import { displayNameOf, requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { isPillar, type Pillar } from "@/types/domain";

export const metadata: Metadata = {
  title: "Artikel baru",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * New article. Accepts prefill params so Content Studio and Rewrite Studio can
 * hand a generated draft straight into the editor without an intermediate save.
 */
export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireRole("editor", { returnTo: "/admin/konten/baru" });
  const params = await searchParams;

  const read = (key: string): string | undefined => {
    const raw = params[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value?.trim() || undefined;
  };

  const pillarParam = read("pillar");
  const pillar: Pillar = pillarParam && isPillar(pillarParam) ? pillarParam : "vibes";

  return (
    <div className="grid gap-3">
      <header>
        <TapePatch tone="lime" tilt="left">
          Artikel baru
        </TapePatch>
        <h1 className="tng-display mt-2 text-[2rem] leading-[0.92] sm:text-[2.5rem]">
          Tulis artikel
        </h1>
        <p className="mt-1 text-[0.8125rem] text-muted">
          Draft tersimpan otomatis setelah judul terisi. Publish selalu tindakan
          terpisah.
        </p>
      </header>

      {!isSupabaseConfigured() ? (
        <SetupNotice
          title="Database belum tersambung"
          description="Editor tetap bisa dibuka untuk melihat tata letaknya, tapi penyimpanan butuh Supabase."
          envKeys={["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]}
        />
      ) : null}

      <ArticleEditor
        article={null}
        authorName={displayNameOf(auth.profile)}
        canDelete={auth.profile.role === "owner"}
        initialDraft={{
          pillar,
          ...(read("title") ? { title: read("title") as string } : {}),
          ...(read("dek") ? { dek: read("dek") as string } : {}),
          ...(read("markdown")
            ? { contentMarkdown: read("markdown") as string }
            : {}),
          ...(read("seoTitle") ? { seoTitle: read("seoTitle") as string } : {}),
          ...(read("metaDescription")
            ? { metaDescription: read("metaDescription") as string }
            : {}),
          ...(read("tags") ? { tagsInput: read("tags") as string } : {}),
        }}
      />
    </div>
  );
}
