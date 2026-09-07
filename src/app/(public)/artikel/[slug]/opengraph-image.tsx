import { ImageResponse } from "next/og";

import { getArticleBySlug } from "@/lib/data/articles";
import { OgWordMark } from "@/components/shared/og-word-mark";
import { PILLAR_META } from "@/types/domain";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Artikel TNG Daily";

const PILLAR_COLOR: Record<string, { panel: string; ink: string }> = {
  vibes: { panel: "#c9ff3b", ink: "#0d0f0c" },
  suara: { panel: "#ff6b3d", ink: "#0d0f0c" },
  hustle: { panel: "#ece7d9", ink: "#0d0f0c" },
  story: { panel: "#1a1c1a", ink: "#f3f2ec" },
};

/** Per-article OG image: the article's own banner, in its pillar's material. */
export default async function ArticleOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: article } = await getArticleBySlug(slug);

  const pillar = article?.pillar ?? "vibes";
  const colors = PILLAR_COLOR[pillar] ?? PILLAR_COLOR.vibes;
  const panel = colors?.panel ?? "#c9ff3b";
  const ink = colors?.ink ?? "#0d0f0c";
  const title = article?.title ?? "TNG Daily";
  const dek = article?.dek ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#101110",
          padding: 28,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: panel,
            border: "5px solid #000",
            boxShadow: "14px 14px 0 #000",
            padding: 44,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                background: "#101110",
                color: "#f3f2ec",
                border: "4px solid #000",
                padding: "6px 14px",
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "0.1em",
              }}
            >
              {PILLAR_META[pillar].label.toUpperCase()}
            </div>
            {article ? (
              <div
                style={{
                  color: ink,
                  opacity: 0.7,
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                {article.readingMinutes} MENIT BACA
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                color: ink,
                fontSize: title.length > 70 ? 62 : 78,
                fontWeight: 800,
                lineHeight: 0.95,
                letterSpacing: "-0.03em",
              }}
            >
              {title}
            </div>
            {dek ? (
              <div
                style={{
                  color: ink,
                  opacity: 0.78,
                  fontSize: 28,
                  lineHeight: 1.35,
                  maxWidth: 1000,
                }}
              >
                {dek.slice(0, 140)}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `4px solid ${ink}`,
              paddingTop: 18,
            }}
          >
            <OgWordMark />
            <div style={{ color: ink, opacity: 0.7, fontSize: 24, fontWeight: 700 }}>
              tngdaily.com
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
