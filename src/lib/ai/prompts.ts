import "server-only";

import { getServerSupabase, getAdminSupabase } from "@/lib/supabase/server";
import {
  BRAND_TEMPLATE_KEY,
  findFallbackTemplate,
  FALLBACK_TEMPLATES,
  TASK_TEMPLATE_KEYS,
} from "@/lib/ai/prompt-defaults";
import type { PromptTemplateView } from "@/lib/data/types";
import type { AiPromptTemplateRow } from "@/types/database";

/**
 * Prompt template loading.
 *
 * The database is authoritative. When a template is missing (fresh project,
 * seed not yet applied), the bundled fallback is used and flagged so the UI can
 * say so out loud. No prompt text is ever written inside a component.
 */

export type PromptTaskKey = keyof typeof TASK_TEMPLATE_KEYS;

async function fetchTemplateRow(
  templateKey: string,
): Promise<AiPromptTemplateRow | null> {
  // Prefer the request-scoped client so RLS applies; fall back to the service
  // role for background jobs that have already authorised the caller.
  const scoped = await getServerSupabase();
  const client = scoped ?? getAdminSupabase();
  if (!client) return null;

  const { data } = await client
    .from("ai_prompt_templates")
    .select("*")
    .eq("template_key", templateKey)
    .eq("is_active", true)
    .maybeSingle();

  return (data as AiPromptTemplateRow | null) ?? null;
}

function toView(
  row: AiPromptTemplateRow | null,
  templateKey: string,
): PromptTemplateView | null {
  if (row) {
    return {
      id: row.id,
      templateKey: row.template_key,
      taskType: row.task_type,
      name: row.name,
      systemPrompt: row.system_prompt,
      userPromptTemplate: row.user_prompt_template,
      version: row.version,
      isActive: row.is_active,
      updatedAt: row.updated_at,
      isFallback: false,
    };
  }

  const fallback = findFallbackTemplate(templateKey);
  if (!fallback) return null;

  return {
    id: `fallback:${fallback.templateKey}`,
    templateKey: fallback.templateKey,
    taskType: fallback.taskType,
    name: fallback.name,
    systemPrompt: fallback.systemPrompt,
    userPromptTemplate: fallback.userPromptTemplate,
    version: 0,
    isActive: true,
    updatedAt: new Date(0).toISOString(),
    isFallback: true,
  };
}

export async function loadTemplate(
  templateKey: string,
): Promise<PromptTemplateView | null> {
  return toView(await fetchTemplateRow(templateKey), templateKey);
}

export interface ComposedPrompt {
  systemPrompt: string;
  userPrompt: string;
  templateKey: string;
  templateId: string | null;
  version: number;
  isFallback: boolean;
}

/**
 * Fills `{{VARIABLE}}` placeholders. Every placeholder must be supplied: a raw
 * placeholder reaching a provider is a prompt bug, so unknown keys are replaced
 * with an explicit marker the QA log can catch rather than silently left in.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined>,
): string {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null || value === "") {
      return "(tidak disediakan)";
    }
    return String(value);
  });
}

/**
 * Composes the brand guardrails plus the task template, per the prompt spec.
 * The copilot ships a complete system prompt and is not layered.
 */
export async function composePrompt(
  task: PromptTaskKey,
  variables: Record<string, string | number | undefined>,
): Promise<ComposedPrompt> {
  const templateKey = TASK_TEMPLATE_KEYS[task];
  const template = await loadTemplate(templateKey);

  if (!template) {
    throw new Error(
      `Prompt template ${templateKey} tidak ditemukan, dan tidak ada fallback. Jalankan supabase/seed.sql.`,
    );
  }

  let systemPrompt = template.systemPrompt;
  let isFallback = template.isFallback;

  if (task !== "copilot") {
    const brand = await loadTemplate(BRAND_TEMPLATE_KEY);
    if (brand) {
      systemPrompt = `${brand.systemPrompt}\n\n---\n\n${template.systemPrompt}`;
      isFallback = isFallback || brand.isFallback;
    }
  }

  const userPrompt = renderTemplate(
    template.userPromptTemplate ?? "{{MESSAGE}}",
    variables,
  );

  return {
    systemPrompt,
    userPrompt,
    templateKey: template.templateKey,
    templateId: template.isFallback ? null : template.id,
    version: template.version,
    isFallback,
  };
}

/** All templates for the admin AI settings screen. */
export async function listPromptTemplates(): Promise<PromptTemplateView[]> {
  const scoped = await getServerSupabase();
  const client = scoped ?? getAdminSupabase();

  const rows: AiPromptTemplateRow[] = client
    ? (((
        await client
          .from("ai_prompt_templates")
          .select("*")
          .order("task_type", { ascending: true })
      ).data as AiPromptTemplateRow[] | null) ?? [])
    : [];

  const byKey = new Map(rows.map((row) => [row.template_key, row]));

  return FALLBACK_TEMPLATES.map((fallback) => {
    const view = toView(byKey.get(fallback.templateKey) ?? null, fallback.templateKey);
    // toView always resolves because the key comes from the fallback list.
    return view as PromptTemplateView;
  });
}

/** Re-exported for server callers; Client Components import from @/lib/labels. */
export { taskTypeLabel } from "@/lib/labels";
