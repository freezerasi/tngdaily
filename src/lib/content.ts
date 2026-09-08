import slugifyLib from "slugify";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

import { estimateReadingMinutes, truncate } from "@/lib/utils";

/**
 * Content pipeline: slugs, excerpts, and Markdown to safe HTML.
 *
 * Rendering happens on the server only. The sanitizer allowlist is
 * deliberately narrow: the CMS accepts Markdown, and AI output is untrusted
 * input like any other.
 */

export function slugify(input: string): string {
  const base = slugifyLib(input, {
    lower: true,
    strict: true,
    locale: "id",
    trim: true,
  });
  return base.slice(0, 90).replace(/-+$/, "");
}

/**
 * Adds a numeric suffix until the slug is free. `exists` performs the lookup.
 */
export async function uniqueSlug(
  input: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(input) || "artikel";
  let candidate = base;
  for (let n = 2; n < 60; n += 1) {
    if (!(await exists(candidate))) return candidate;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const ALLOWED_TAGS = [
  "p",
  "br",
  "hr",
  "strong",
  "em",
  "del",
  "s",
  "blockquote",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "pre",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "mark",
];

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const isInternal = href.startsWith("/") || href.startsWith("#");
      return {
        tagName,
        attribs: isInternal
          ? { ...attribs, href }
          : { ...attribs, href, rel: "noopener nofollow ugc", target: "_blank" },
      };
    },
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: "lazy", decoding: "async" },
    }),
    // Editors sometimes paste h1; the page owns the only h1.
    h1: () => ({ tagName: "h2", attribs: {} }),
  },
  disallowedTagsMode: "discard",
};

marked.setOptions({ gfm: true, breaks: false });

/**
 * `[BUTUH VERIFIKASI: ...]` is the flag the AI writer leaves behind. Turning it
 * into a `<mark>` makes it impossible for an editor to publish past it by
 * accident.
 */
function highlightVerificationFlags(markdown: string): string {
  return markdown.replace(
    /\[BUTUH VERIFIKASI:([^\]]*)\]/g,
    (_match, detail: string) =>
      `<mark>BUTUH VERIFIKASI:${detail.replace(/[<>]/g, "")}</mark>`,
  );
}

export function renderMarkdown(markdown: string): string {
  const withFlags = highlightVerificationFlags(markdown ?? "");
  const html = marked.parse(withFlags, { async: false });
  return sanitizeHtml(html, sanitizeOptions);
}

/** Plain text for excerpts, meta descriptions, and AI prompts. */
export function markdownToPlainText(markdown: string): string {
  const html = marked.parse(markdown ?? "", { async: false });
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  return text.replace(/\s+/g, " ").trim();
}

export function buildExcerpt(markdown: string, max = 180): string {
  return truncate(markdownToPlainText(markdown), max);
}

export function readingMinutes(markdown: string): number {
  return estimateReadingMinutes(markdown);
}

/** Splits `tags: a, b , c` input into a clean array. */
export function parseTagInput(value: string, max = 8): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 1 && tag.length <= 32),
    ),
  ).slice(0, max);
}

/**
 * Rough n-gram overlap between a draft and one source text, used as the
 * Rewrite Studio similarity warning. This is a signal for editors, not a legal
 * determination.
 */
export interface SimilarityResult {
  score: number;
  matchedPhrases: string[];
  comparedPhrases: number;
}

export function phraseSimilarity(
  draft: string,
  source: string,
  gramSize = 8,
): SimilarityResult {
  const normalize = (input: string) =>
    input
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean);

  const draftWords = normalize(draft);
  const sourceWords = normalize(source);

  if (draftWords.length < gramSize || sourceWords.length < gramSize) {
    return { score: 0, matchedPhrases: [], comparedPhrases: 0 };
  }

  const sourceGrams = new Set<string>();
  for (let i = 0; i <= sourceWords.length - gramSize; i += 1) {
    sourceGrams.add(sourceWords.slice(i, i + gramSize).join(" "));
  }

  const matched: string[] = [];
  let total = 0;
  let hits = 0;
  for (let i = 0; i <= draftWords.length - gramSize; i += 1) {
    const gram = draftWords.slice(i, i + gramSize).join(" ");
    total += 1;
    if (sourceGrams.has(gram)) {
      hits += 1;
      if (matched.length < 12 && !matched.some((m) => m.includes(gram))) {
        matched.push(gram);
      }
    }
  }

  return {
    score: total === 0 ? 0 : hits / total,
    matchedPhrases: matched,
    comparedPhrases: total,
  };
}
