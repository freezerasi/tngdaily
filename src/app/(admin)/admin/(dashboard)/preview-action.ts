"use server";

import { getApiAuth } from "@/lib/auth";
import { renderMarkdown } from "@/lib/content";

/**
 * Renders Markdown for the editor preview using the same sanitising pipeline as
 * the public article page, so the preview cannot show markup the real page would
 * strip. Editor-only, and capped so a huge paste cannot be used as a CPU sink.
 */
export async function renderPreviewAction(
  markdown: string,
): Promise<{ html: string }> {
  const auth = await getApiAuth("editor");
  if (!auth) return { html: "" };

  const input = typeof markdown === "string" ? markdown.slice(0, 120_000) : "";
  return { html: renderMarkdown(input) };
}
