import { ImageResponse } from "next/og";

import { OgWordMark } from "@/components/shared/og-word-mark";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TNG Daily, media anak muda Tangerang Raya";

/**
 * Default OG image. Drawn as the banner wall, so a shared link looks like the
 * site rather than a generic card. No remote fonts: the edge renderer uses its
 * built-in stack, which keeps generation fast and offline-safe.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B0D0E",
          padding: 56,
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <div style={{ display: "flex", boxShadow: "10px 10px 0 #000" }}>
            <OgWordMark scale={1.85} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#ff6b3d",
              color: "#0d0f0c",
              border: "4px solid #000",
              padding: "6px 14px",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "0.1em",
            }}
          >
            TANGERANG RAYA
          </div>
          <div
            style={{
              color: "#F4F4EF",
              fontSize: 82,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              maxWidth: 980,
            }}
          >
            Media untuk yang tinggal di sini
          </div>
          <div style={{ color: "#A4A8A2", fontSize: 30, maxWidth: 900 }}>
            Kuliner, isu kota, loker, dan cerita warga. Vibes, Suara, Hustle,
            Story.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {["#CCFF00", "#ff6b3d", "#ece7d9", "#505451"].map((color) => (
            <div
              key={color}
              style={{
                width: 120,
                height: 14,
                background: color,
                border: "3px solid #000",
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
