import type { CSSProperties } from "react";

/**
 * Wordmark plates for OG images.
 *
 * The mark is two butted plates with a black seam between them, so the seam is
 * its own element rather than a border on one plate: structurally that is what
 * it is, and it keeps the two plates independent.
 */
const KEYLINE = "#000000";

export function OgWordMark({ scale = 1 }: { scale?: number }) {
  const fontSize = Math.round(30 * scale);
  const pad = `${Math.round(4 * scale)}px ${Math.round(12 * scale)}px`;
  const border = Math.max(3, Math.round(4 * scale));

  const plate: CSSProperties = {
    fontSize,
    fontWeight: 800,
    padding: pad,
    letterSpacing: "-0.01em",
  };

  return (
    <div style={{ display: "flex", border: `${border}px solid ${KEYLINE}` }}>
      <span style={{ ...plate, background: "#050606", color: "#F4F4EF" }}>
        TNG
      </span>
      {/* The seam between the two plates. */}
      <span
        style={{ width: border, background: KEYLINE, alignSelf: "stretch" }}
      />
      <span style={{ ...plate, background: "#CCFF00", color: "#0d0f0c" }}>
        DAILY
      </span>
    </div>
  );
}
