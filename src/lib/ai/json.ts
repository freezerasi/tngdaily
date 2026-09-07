/**
 * Strict JSON extraction for AI output.
 *
 * Providers sometimes wrap JSON in a fence or add a sentence before it despite
 * instructions. This recovers the object without ever evaluating the string, and
 * reports failure so the gateway can issue exactly one repair request.
 */

export type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: string };

export function extractJson(raw: string): JsonParseResult {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "Respons provider kosong." };

  const direct = tryParse(text);
  if (direct.ok) return direct;

  // ```json ... ``` fence
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced?.[1]) {
    const parsed = tryParse(fenced[1].trim());
    if (parsed.ok) return parsed;
  }

  // First balanced object or array in the text.
  const sliced = sliceBalanced(text);
  if (sliced) {
    const parsed = tryParse(sliced);
    if (parsed.ok) return parsed;
  }

  return {
    ok: false,
    reason: "Output provider bukan JSON valid.",
  };
}

function tryParse(text: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "JSON.parse gagal." };
  }
}

/**
 * Finds the first balanced `{...}` or `[...]` run, respecting string literals so
 * a brace inside a quoted value does not end the slice early.
 */
function sliceBalanced(text: string): string | null {
  const openIndex = (() => {
    const brace = text.indexOf("{");
    const bracket = text.indexOf("[");
    if (brace === -1) return bracket;
    if (bracket === -1) return brace;
    return Math.min(brace, bracket);
  })();

  if (openIndex === -1) return null;

  const openChar = text[openIndex];
  const closeChar = openChar === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openIndex; i < text.length; i += 1) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === openChar) depth += 1;
    else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex, i + 1);
    }
  }

  return null;
}
