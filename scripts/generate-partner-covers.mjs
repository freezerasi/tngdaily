/**
 * Generates placeholder cover art for the Partner Stories rail.
 *
 * Run with: npm run partners:covers
 *
 * These are deliberately *graphics*, not simulated photographs. A partner
 * placeholder that looks like a photo invites exactly the failure this codebase
 * has already had to clean up once: a synthetic frame read as documentation of a
 * real place or business. An abstract plate in the site's own material cannot be
 * misread that way, and it still gives the rail real visual weight.
 *
 * Each plate is drawn from the Design 3.0 tokens: bone ground, black keyline,
 * acid lime accent, diagonal hatch, and hand-drawn stroke geometry matching the
 * scribble system.
 *
 * Output is 1200x1600 WebP, a 3:4 portrait, because the cards crop to 3:4. The
 * composition is authored at that ratio rather than cropped from a landscape
 * canvas, so nothing important lands outside the frame.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public", "images", "partners");

const W = 1200;
const H = 1600;

const TOKENS = {
  bone: "#ECE7D9",
  tape: "#D8CDAE",
  ink: "#0D0F0C",
  lime: "#CCFF00",
};

/** Shared frame: bone ground, keyline, corner registration ticks. */
function frame(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="hatch" width="20" height="20" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="20" stroke="${TOKENS.ink}" stroke-opacity="0.15" stroke-width="6"/>
    </pattern>
    <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="15" cy="15" r="3" fill="${TOKENS.ink}" fill-opacity="0.16"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="${TOKENS.bone}"/>
  ${inner}

  <rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="none" stroke="${TOKENS.ink}" stroke-width="12"/>
  <g stroke="${TOKENS.ink}" stroke-width="8" stroke-linecap="round" opacity="0.5">
    <path d="M46 46 h64 M46 46 v64"/>
    <path d="M${W - 46} 46 h-64 M${W - 46} 46 v64"/>
    <path d="M46 ${H - 46} h64 M46 ${H - 46} v-64"/>
    <path d="M${W - 46} ${H - 46} h-64 M${W - 46} ${H - 46} v-64"/>
  </g>
</svg>`;
}

/**
 * UMKM: a rising stack, drawn tall. Portrait suits this subject: growth reads
 * naturally on a vertical axis.
 */
const UMKM = frame(`
  <rect x="0" y="1180" width="${W}" height="420" fill="url(#hatch)"/>
  <g stroke="${TOKENS.ink}" stroke-width="11" stroke-linejoin="round">
    <rect x="170" y="980" width="180" height="300" fill="${TOKENS.tape}"/>
    <rect x="380" y="820" width="180" height="460" fill="${TOKENS.tape}"/>
    <rect x="590" y="600" width="180" height="680" fill="${TOKENS.lime}"/>
    <rect x="800" y="430" width="180" height="850" fill="${TOKENS.lime}"/>
  </g>
  <path d="M200 1060 C400 940 520 860 690 660 C790 545 850 500 940 400"
        fill="none" stroke="${TOKENS.ink}" stroke-width="16"
        stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M876 430 c34 -22 58 -34 76 -38" fill="none" stroke="${TOKENS.ink}"
        stroke-width="15" stroke-linecap="round"/>
  <path d="M952 392 c-14 30 -22 58 -24 90" fill="none" stroke="${TOKENS.ink}"
        stroke-width="13" stroke-linecap="round"/>
  <rect x="180" y="240" width="260" height="260" fill="none"
        stroke="${TOKENS.ink}" stroke-width="11" stroke-dasharray="30 24"/>
  <rect x="520" y="300" width="140" height="140" fill="${TOKENS.tape}"
        stroke="${TOKENS.ink}" stroke-width="10"/>
`);

/**
 * Event: a column of ticket stubs, two torn away. Portrait reads as a strip of
 * tickets still joined at the perforation.
 */
const EVENT = (() => {
  const cells = [];
  const cols = 3;
  const rows = 4;
  const w = 300;
  const h = 250;
  const gapX = 20;
  const gapY = 20;
  const x0 = (W - (cols * w + (cols - 1) * gapX)) / 2;
  // Grid is inset from the top hatch band and stops clear of the bottom rule, so
  // no stub is clipped by the frame.
  const y0 = 260;
  const filled = new Set([1, 5, 8]);
  const torn = new Set([3, 10]);

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const i = r * cols + c;
      const x = x0 + c * (w + gapX);
      const y = y0 + r * (h + gapY);

      if (torn.has(i)) {
        cells.push(
          `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${TOKENS.ink}" stroke-width="10" stroke-dasharray="26 22"/>`,
        );
        continue;
      }

      const fill = filled.has(i) ? TOKENS.lime : TOKENS.tape;
      cells.push(
        `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${TOKENS.ink}" stroke-width="10"/>` +
          `<line x1="${x + 88}" y1="${y + 16}" x2="${x + 88}" y2="${y + h - 16}" stroke="${TOKENS.ink}" stroke-width="7" stroke-dasharray="14 14"/></g>`,
      );
    }
  }

  return frame(`
    <rect x="0" y="0" width="${W}" height="180" fill="url(#dots)"/>
    ${cells.join("\n    ")}
    <path d="M140 1450 C420 1424 720 1440 1060 1418"
          fill="none" stroke="${TOKENS.ink}" stroke-width="14" stroke-linecap="round"/>
  `);
})();

/**
 * Brand: two overlapping rings stacked vertically, the collaboration mark.
 *
 * The rings are exact circles and the filled lens is computed from their real
 * intersection, so the shared area lands precisely inside both. Hand-drawn
 * character comes from unequal stroke weights and the overshoot flicks past each
 * ring's start point, not from approximating the geometry by eye: an
 * eyeballed lens visibly misses the overlap, which reads as a mistake rather
 * than as a gesture.
 *
 * Geometry: r = 340, centres 320px apart on the vertical axis, so the chord sits
 * at y = 860 with a half-width of sqrt(340^2 - 160^2) = 300.
 */
const BRAND = (() => {
  const cx = 600;
  const r = 340;
  const cyTop = 700;
  const cyBottom = 1020;
  const chordY = (cyTop + cyBottom) / 2;
  const half = Math.sqrt(r * r - ((cyBottom - cyTop) / 2) ** 2);
  const left = cx - half;
  const right = cx + half;

  // Lower arc of the top circle, then upper arc of the bottom circle.
  const lens =
    `M ${left} ${chordY} ` +
    `A ${r} ${r} 0 0 0 ${right} ${chordY} ` +
    `A ${r} ${r} 0 0 0 ${left} ${chordY} Z`;

  return frame(`
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#dots)"/>

    <g fill="none" stroke="${TOKENS.ink}" stroke-linecap="round">
      <circle cx="${cx}" cy="${cyTop}" r="${r}" stroke-width="18"/>
      <circle cx="${cx}" cy="${cyBottom}" r="${r}" stroke-width="15"/>
    </g>

    <path d="${lens}" fill="${TOKENS.lime}" fill-opacity="0.92"
          stroke="${TOKENS.ink}" stroke-width="13" stroke-linejoin="round"/>

    <!-- Overshoot flicks: where the pen carried past the start of each ring. -->
    <g fill="none" stroke="${TOKENS.ink}" stroke-linecap="round" opacity="0.75">
      <path d="M ${cx + 40} ${cyTop - r - 4} c 60 6 104 20 138 38" stroke-width="13"/>
      <path d="M ${cx - 30} ${cyBottom + r + 2} c -58 -4 -100 -16 -132 -34" stroke-width="11"/>
    </g>

    <g stroke="${TOKENS.ink}" stroke-width="14" stroke-linecap="round">
      <path d="M240 250 h270"/>
      <path d="M690 1470 h290"/>
    </g>
    <rect x="880" y="200" width="170" height="170" fill="${TOKENS.tape}"
          stroke="${TOKENS.ink}" stroke-width="11"/>
  `);
})();

const PLATES = [
  { slug: "umkm-laundry-naik-kelas", svg: UMKM },
  { slug: "pasar-kreatif-akhir-pekan", svg: EVENT },
  { slug: "kolaborasi-brand-lokal", svg: BRAND },
];

await mkdir(OUT_DIR, { recursive: true });

for (const plate of PLATES) {
  const target = path.join(OUT_DIR, `${plate.slug}.webp`);
  await sharp(Buffer.from(plate.svg))
    .resize(W, H, { fit: "cover" })
    .webp({ quality: 88, effort: 6 })
    .toFile(target);
  process.stdout.write(`wrote ${path.relative(process.cwd(), target)}\n`);
}

// Keep the SVG source alongside, so a designer edits the source rather than
// reverse-engineering the raster.
for (const plate of PLATES) {
  await writeFile(path.join(OUT_DIR, `${plate.slug}.svg`), plate.svg, "utf8");
}

process.stdout.write(`\n${PLATES.length} partner placeholder plates generated (3:4).\n`);
