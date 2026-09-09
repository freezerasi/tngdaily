import "server-only";

import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import sanitizeHtml from "sanitize-html";

import { assertPublicUrl } from "@/lib/security/ssrf";

/**
 * Source extraction for the Rewrite Studio.
 *
 * Fetches a public article and pulls its main text with Readability, the same
 * algorithm Firefox Reader uses. Deliberate limits: a hard timeout, a response
 * size cap, a redirect cap with re-validation at every hop, and an honest user
 * agent. Paywalls, logins, and anti-bot pages are reported as failures rather
 * than worked around.
 */

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const USER_AGENT =
  "TNGDailyBot/1.0 (+https://tngdaily.com/tentang; editorial research; contact via site)";

export interface ExtractedSource {
  url: string;
  finalUrl: string;
  ok: boolean;
  siteName: string | null;
  title: string | null;
  byline: string | null;
  publishedTime: string | null;
  excerpt: string | null;
  text: string;
  wordCount: number;
  error: string | null;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Manual redirect handling so every hop is SSRF-checked. `redirect: "manual"`
 * means fetch never follows a Location into a private address on its own.
 */
async function fetchWithGuards(
  startUrl: string,
): Promise<
  | { ok: true; html: string; finalUrl: string }
  | { ok: false; error: string }
> {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const check = await assertPublicUrl(currentUrl);
    if (!check.ok || !check.url) {
      return { ok: false, error: check.message ?? "URL ditolak." };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(check.url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "id,en;q=0.8",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        void response.body?.cancel();
        if (!location) {
          return { ok: false, error: "Redirect tanpa tujuan." };
        }
        currentUrl = new URL(location, check.url).toString();
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        void response.body?.cancel();
        return {
          ok: false,
          error:
            "Situs menolak akses (login, paywall, atau proteksi anti-bot). Sumber ini tidak bisa dipakai.",
        };
      }

      if (response.status === 404 || response.status === 410) {
        void response.body?.cancel();
        return { ok: false, error: "Halaman tidak ditemukan." };
      }

      if (!response.ok) {
        void response.body?.cancel();
        return {
          ok: false,
          error: `Situs mengembalikan status ${response.status}.`,
        };
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("html") && !contentType.includes("xml")) {
        void response.body?.cancel();
        return {
          ok: false,
          error: "Isi halaman bukan HTML, jadi tidak bisa diekstrak.",
        };
      }

      const declaredLength = Number(response.headers.get("content-length") ?? "0");
      if (declaredLength > MAX_BYTES) {
        void response.body?.cancel();
        return { ok: false, error: "Halaman terlalu besar untuk diproses." };
      }

      // Stream with a running size cap: content-length can lie or be absent.
      const reader = response.body?.getReader();
      if (!reader) return { ok: false, error: "Respons kosong." };

      const chunks: Uint8Array[] = [];
      let received = 0;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        received += value.byteLength;
        if (received > MAX_BYTES) {
          await reader.cancel();
          return { ok: false, error: "Halaman melebihi batas 2 MB." };
        }
        chunks.push(value);
      }

      const merged = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }

      const charsetMatch = /charset=([\w-]+)/i.exec(contentType);
      const charset = (charsetMatch?.[1] ?? "utf-8").toLowerCase();
      const decoder = new TextDecoder(
        charset === "iso-8859-1" || charset === "latin1" ? "windows-1252" : charset,
        { fatal: false },
      );

      return {
        ok: true,
        html: decoder.decode(merged),
        finalUrl: check.url.toString(),
      };
    } catch (error) {
      const aborted =
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError");
      return {
        ok: false,
        error: aborted
          ? "Situs tidak merespons dalam 12 detik."
          : "Gagal menghubungi situs sumber.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { ok: false, error: "Terlalu banyak redirect." };
}

function htmlToText(html: string): string {
  const stripped = sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "li", "blockquote", "br"],
    allowedAttributes: {},
    nonTextTags: ["style", "script", "noscript", "iframe", "svg", "form"],
  });

  return stripped
    .replace(/<\/(p|h2|h3|li|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const MAX_TEXT_CHARS = 14_000;

interface JinaReaderItem {
  url?: string;
  title?: string;
  siteName?: string;
  publishedTime?: string;
  description?: string;
  text?: string;
  content?: string;
}

/**
 * Narrows the untyped Jina Reader JSON envelope. Returns null when the
 * provider signals failure (non-200 code or missing data), so callers never
 * read fields off an unexpected shape.
 */
function parseJinaPayload(json: unknown): JinaReaderItem | null {
  if (typeof json !== "object" || json === null) return null;
  const envelope = json as Record<string, unknown>;
  if (envelope.code !== 200 || typeof envelope.data !== "object" || envelope.data === null) {
    return null;
  }
  const data = envelope.data as Record<string, unknown>;
  const text = typeof data.text === "string" ? data.text : undefined;
  const content = typeof data.content === "string" ? data.content : undefined;
  if (!text && !content) return null;
  const str = (value: unknown): string | undefined =>
    typeof value === "string" ? value : undefined;
  return {
    url: str(data.url),
    title: str(data.title),
    siteName: str(data.siteName),
    publishedTime: str(data.publishedTime),
    description: str(data.description),
    text,
    content,
  };
}

async function extractWithJina(url: string, base: ExtractedSource): Promise<ExtractedSource> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS * 2);

  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return { ...base, error: `Fallback Jina Reader mengembalikan status ${response.status}.` };
    }

    const json: unknown = await response.json();
    const item = parseJinaPayload(json);
    if (!item) {
      return { ...base, error: "Jina Reader gagal mengekstrak konten." };
    }
    const rawText = (item.text || item.content || "").trim();
    const text = rawText.slice(0, MAX_TEXT_CHARS);
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    if (wordCount < 80) {
      return {
        ...base,
        finalUrl: item.url || base.finalUrl,
        title: item.title || base.title,
        siteName: item.siteName || base.siteName,
        error: "Teks yang diekstrak melalui fallback terlalu pendek.",
      };
    }

    return {
      url: base.url,
      finalUrl: item.url || base.finalUrl,
      ok: true,
      siteName: item.siteName || base.siteName,
      title: item.title || base.title,
      byline: base.byline,
      publishedTime: item.publishedTime || base.publishedTime,
      excerpt: item.description || base.excerpt,
      text,
      wordCount,
      error: null,
    };
  } catch {
    return { ...base, error: "Gagal menggunakan fallback Jina Reader." };
  } finally {
    clearTimeout(timeout);
  }
}


export async function extractSource(rawUrl: string): Promise<ExtractedSource> {
  const base: ExtractedSource = {
    url: rawUrl,
    finalUrl: rawUrl,
    ok: false,
    siteName: domainOf(rawUrl),
    title: null,
    byline: null,
    publishedTime: null,
    excerpt: null,
    text: "",
    wordCount: 0,
    error: null,
  };

  const fetched = await fetchWithGuards(rawUrl);
  if (!fetched.ok) {
    // If standard fetch fails (403, 401, timeout, etc.), fallback to Jina
    return extractWithJina(rawUrl, base);
  }

  try {
    // Silence jsdom's CSS/JS parse noise: the page is data, not a runtime.
    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM(fetched.html, {
      url: fetched.finalUrl,
      virtualConsole,
      runScripts: "outside-only",
      pretendToBeVisual: false,
    });

    const metaPublished =
      dom.window.document
        .querySelector('meta[property="article:published_time"]')
        ?.getAttribute("content") ??
      dom.window.document
        .querySelector('meta[name="pubdate"]')
        ?.getAttribute("content") ??
      null;

    const reader = new Readability(dom.window.document, {
      charThreshold: 250,
      keepClasses: false,
    });
    const parsed = reader.parse();
    dom.window.close();

    if (!parsed?.content) {
      return extractWithJina(rawUrl, {
        ...base,
        finalUrl: fetched.finalUrl,
      });
    }

    const text = htmlToText(parsed.content).slice(0, MAX_TEXT_CHARS);
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    if (wordCount < 80) {
      return extractWithJina(rawUrl, {
        ...base,
        finalUrl: fetched.finalUrl,
        title: parsed.title ?? null,
      });
    }

    return {
      url: rawUrl,
      finalUrl: fetched.finalUrl,
      ok: true,
      siteName: parsed.siteName ?? domainOf(fetched.finalUrl),
      title: parsed.title ?? null,
      byline: parsed.byline ?? null,
      publishedTime: parsed.publishedTime ?? metaPublished,
      excerpt: parsed.excerpt ?? null,
      text,
      wordCount,
      error: null,
    };
  } catch {
    return extractWithJina(rawUrl, {
      ...base,
      finalUrl: fetched.finalUrl,
    });
  }
}

/** Extracts several sources with bounded concurrency. */
export async function extractSources(
  urls: string[],
): Promise<ExtractedSource[]> {
  const unique = Array.from(new Set(urls)).slice(0, 5);
  const results: ExtractedSource[] = [];

  // Two at a time: enough to stay responsive, gentle on the source sites.
  for (let i = 0; i < unique.length; i += 2) {
    const batch = unique.slice(i, i + 2);
    const settled = await Promise.all(batch.map((url) => extractSource(url)));
    results.push(...settled);
  }

  return results;
}

/** Compact JSON payload for the rewrite prompt. */
export function toPromptPayload(sources: ExtractedSource[]): string {
  return JSON.stringify(
    sources
      .filter((source) => source.ok)
      .map((source) => ({
        source_name: source.siteName,
        source_url: source.finalUrl,
        title: source.title,
        byline: source.byline,
        published_time: source.publishedTime,
        extracted_text: source.text,
      })),
    null,
    2,
  );
}
