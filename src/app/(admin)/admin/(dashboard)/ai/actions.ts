"use server";

import { revalidatePath } from "next/cache";

import { getApiAuth } from "@/lib/auth";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";
import { getSecretStore, SecretStoreError } from "@/lib/ai/secrets";
import {
  detectCandidateModels,
  testCandidate,
  type GatewayCandidate,
} from "@/lib/ai/gateway";
import { env, isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import {
  aiApiKeySchema,
  aiDefaultProviderSchema,
  aiKeyReorderSchema,
  aiKeyStatusSchema,
  aiModelStatusSchema,
  aiProviderSchema,
  aiProviderDefaultModelSchema,
  aiTaskModelSettingsSchema,
  fieldErrors,
  uuidSchema,
} from "@/lib/validation";

/**
 * AI configuration actions. Owner only.
 *
 * A submitted API key is written to the SecretStore and then discarded: only the
 * vault reference and a masked preview are persisted, and neither the key nor
 * the reference is ever returned to the browser.
 */

export interface AiActionResult {
  ok: boolean;
  message?: string;
  fields?: Record<string, string>;
  providerId?: string;
}

function fail(message: string, fields?: Record<string, string>): AiActionResult {
  return fields ? { ok: false, message, fields } : { ok: false, message };
}

function refresh(): void {
  revalidatePath("/admin/ai");
}

function logKeySaveReadiness(scope: string): void {
  console.warn(`[${scope}] API key save requested`, {
    hasSupabaseConfig: isSupabaseConfigured(),
    hasServiceRoleKey: isSupabaseAdminConfigured(),
    secretStoreDriver: env.SECRET_STORE_DRIVER ?? "(unset)",
    nodeEnv: env.NODE_ENV,
  });
}

export async function createProviderAction(
  raw: unknown,
): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa mengatur provider AI.");

  const parsed = aiProviderSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Data provider belum valid.", fieldErrors(parsed.error));
  }

  const supabase = await getServerSupabase();
  if (!supabase) return fail("Database belum dikonfigurasi.");

  const { data: created, error } = await supabase
    .from("ai_providers")
    .insert({
      name: parsed.data.name,
      base_url: parsed.data.baseUrl.replace(/\/+$/, ""),
      default_model: parsed.data.defaultModel || null,
      is_active: parsed.data.isActive,
      notes: parsed.data.notes || null,
      created_by: auth.profile.id,
    })
    .select("id")
    .maybeSingle();

  const providerId = (created as { id: string } | null)?.id ?? null;

  if (error || !providerId) {
    return fail(
      error?.code === "23505"
        ? "Sudah ada provider dengan nama itu."
        : "Provider gagal disimpan.",
    );
  }

  if (parsed.data.apiKey) {
    logKeySaveReadiness("ai:createProvider");

    const admin = getAdminSupabase();
    if (!admin) {
      console.error("[ai:createProvider] Admin Supabase client unavailable");
      await supabase.from("ai_providers").delete().eq("id", providerId);
      return fail(
        "SUPABASE_SERVICE_ROLE_KEY belum diset, jadi key tidak bisa disimpan dengan aman.",
      );
    }

    let stored: { secretId: string; preview: string };
    try {
      const store = getSecretStore();
      console.warn("[ai:createProvider] Saving API key to secret store", {
        driver: store.driver,
      });
      stored = await store.saveSecret({
        name: providerSecretName(parsed.data.name),
        value: parsed.data.apiKey,
        description: "TNG Daily AI provider key",
      });
    } catch (secretError) {
      console.error("[ai:createProvider] Secret store save failed", secretError);
      await supabase.from("ai_providers").delete().eq("id", providerId);
      return fail(
        secretError instanceof SecretStoreError
          ? secretError.message
          : `Secret store error: ${secretError instanceof Error ? secretError.message : String(secretError)}`,
      );
    }

    const { error: keyError } = await admin.from("ai_api_keys").insert({
      provider_id: providerId,
      vault_secret_id: stored.secretId,
      key_label: parsed.data.keyLabel || null,
      key_preview: stored.preview,
      priority: 10,
      status: "active",
    });

    if (keyError) {
      console.error("[ai:createProvider] ai_api_keys insert failed", {
        code: keyError.code,
        message: keyError.message,
        details: keyError.details,
        hint: keyError.hint,
      });
      await Promise.all([
        getSecretStore().deleteSecret(stored.secretId).catch(() => undefined),
        supabase.from("ai_providers").delete().eq("id", providerId),
      ]);
      return fail(
        `Key gagal disimpan: ${keyError.message ?? "unknown error"}`,
      );
    }
  }

  refresh();
  return {
    ok: true,
    providerId,
    message: parsed.data.apiKey
      ? "Provider dan API key ditambahkan."
      : "Provider ditambahkan.",
  };
}

function providerSecretName(providerName: string): string {
  return `tng-ai-${providerName}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

export async function detectProviderModelsAction(
  providerId: string,
): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa mendeteksi model AI.");

  const id = uuidSchema.safeParse(providerId);
  if (!id.success) return fail("ID provider tidak valid.");

  const admin = getAdminSupabase();
  if (!admin) return fail("Database belum dikonfigurasi.");

  const { data: providerData } = await admin
    .from("ai_providers")
    .select("id, name, base_url, default_model")
    .eq("id", id.data)
    .maybeSingle();

  const provider = providerData as
    | {
        id: string;
        name: string;
        base_url: string;
        default_model: string | null;
      }
    | null;

  if (!provider) return fail("Provider tidak ditemukan.");

  const { data: keyRows } = await admin
    .from("ai_api_keys")
    .select("id, provider_id, vault_secret_id, priority, status")
    .eq("provider_id", provider.id)
    .in("status", ["active", "rate_limited"])
    .order("priority", { ascending: true })
    .limit(4);

  const key = (
    (keyRows as Array<{
      id: string;
      provider_id: string;
      vault_secret_id: string;
      priority: number;
      status: string;
    }> | null) ?? []
  ).sort((a, b) => {
    const rank = (status: string) => (status === "active" ? 0 : 1);
    return rank(a.status) - rank(b.status) || a.priority - b.priority;
  })[0];

  if (!key) return fail("Tambahkan API key aktif sebelum mendeteksi model.");

  const result = await detectCandidateModels({
    keyId: key.id,
    providerId: provider.id,
    providerName: provider.name,
    baseUrl: provider.base_url,
    model: provider.default_model ?? "",
    priority: key.priority,
    isLocalFallback: false,
    secretId: key.vault_secret_id,
  });

  if (!result.ok) return fail(`${provider.name}: ${result.message}`);

  const now = new Date().toISOString();
  const rows = result.models.map((model) => ({
    provider_id: provider.id,
    model_key: model,
    display_name: model,
    source: "detected",
    last_seen_at: now,
  }));

  const { error } = await admin
    .from("ai_models")
    .upsert(rows, { onConflict: "provider_id,model_key" });

  if (error) return fail("Daftar model gagal disimpan.");

  if (
    result.models[0] &&
    (!provider.default_model || !result.models.includes(provider.default_model))
  ) {
    await admin
      .from("ai_providers")
      .update({ default_model: result.models[0] })
      .eq("id", provider.id);
  }

  refresh();
  return {
    ok: true,
    message: `${provider.name}: ${result.models.length} model terdeteksi dalam ${result.latencyMs} ms.`,
  };
}

export async function toggleProviderAction(
  providerId: string,
  isActive: boolean,
): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa mengatur provider AI.");

  const id = uuidSchema.safeParse(providerId);
  if (!id.success) return fail("ID provider tidak valid.");

  const supabase = await getServerSupabase();
  if (!supabase) return fail("Database belum dikonfigurasi.");

  const { error } = await supabase
    .from("ai_providers")
    .update({ is_active: isActive })
    .eq("id", id.data);

  if (error) return fail("Status provider gagal diubah.");

  refresh();
  return {
    ok: true,
    message: isActive ? "Provider diaktifkan." : "Provider dinonaktifkan.",
  };
}

export async function setDefaultProviderAction(
  raw: unknown,
): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa memilih provider default.");

  const parsed = aiDefaultProviderSchema.safeParse(raw);
  if (!parsed.success) return fail("Provider default tidak valid.");

  const admin = getAdminSupabase();
  if (!admin) return fail("Database belum dikonfigurasi.");

  const { data: provider } = await admin
    .from("ai_providers")
    .select("id, name")
    .eq("id", parsed.data.providerId)
    .maybeSingle();

  if (!provider) return fail("Provider tidak ditemukan.");

  const { data: keyRows, error: keyError } = await admin
    .from("ai_api_keys")
    .select("id, provider_id, priority, status")
    .order("priority", { ascending: true });

  if (keyError) return fail("Key provider gagal dibaca.");

  const keys =
    (keyRows as Array<{
      id: string;
      provider_id: string;
      priority: number;
      status: string;
    }> | null) ?? [];

  const usableTargetKeys = keys.filter(
    (key) =>
      key.provider_id === parsed.data.providerId &&
      (key.status === "active" || key.status === "rate_limited"),
  );

  if (usableTargetKeys.length === 0) {
    return fail("Provider default butuh minimal satu API key aktif.");
  }

  const statusRank = (status: string) => {
    if (status === "active") return 0;
    if (status === "rate_limited") return 1;
    if (status === "error") return 2;
    return 3;
  };
  const sorted = [...keys].sort((a, b) => {
    const providerRankA = a.provider_id === parsed.data.providerId ? 0 : 1;
    const providerRankB = b.provider_id === parsed.data.providerId ? 0 : 1;
    return (
      providerRankA - providerRankB ||
      statusRank(a.status) - statusRank(b.status) ||
      a.priority - b.priority
    );
  });

  let priority = 10;
  for (const key of sorted) {
    const { error } = await admin
      .from("ai_api_keys")
      .update({ priority })
      .eq("id", key.id);
    if (error) return fail("Provider default gagal disimpan.");
    priority += 10;
  }

  await admin
    .from("ai_providers")
    .update({ is_active: true })
    .eq("id", parsed.data.providerId);

  refresh();
  return {
    ok: true,
    message: `${(provider as { name: string }).name} menjadi provider default.`,
  };
}

export async function deleteProviderAction(
  providerId: string,
): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa menghapus provider AI.");

  const id = uuidSchema.safeParse(providerId);
  if (!id.success) return fail("ID provider tidak valid.");

  const admin = getAdminSupabase();
  const supabase = await getServerSupabase();
  if (!supabase || !admin) return fail("Database belum dikonfigurasi.");

  // Remove the stored secrets before the rows cascade away, otherwise the vault
  // keeps orphaned entries nobody can reach.
  const { data: keys } = await admin
    .from("ai_api_keys")
    .select("vault_secret_id")
    .eq("provider_id", id.data);

  const store = safeStore();
  if (store) {
    for (const row of (keys as Array<{ vault_secret_id: string }> | null) ?? []) {
      await store.deleteSecret(row.vault_secret_id).catch(() => undefined);
    }
  }

  const { error } = await supabase.from("ai_providers").delete().eq("id", id.data);
  if (error) return fail("Provider gagal dihapus.");

  refresh();
  return { ok: true, message: "Provider dan key-nya dihapus." };
}

function safeStore() {
  try {
    return getSecretStore();
  } catch {
    return null;
  }
}

export async function addApiKeyAction(raw: unknown): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) {
    return fail("Hanya owner yang bisa menambah API key.");
  }

  const parsed = aiApiKeySchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Data key belum valid.", fieldErrors(parsed.error));
  }
  logKeySaveReadiness("ai:addApiKey");

  const admin = getAdminSupabase();
  if (!admin) {
    console.error("[ai:addApiKey] Admin Supabase client unavailable");
    return fail(
      "SUPABASE_SERVICE_ROLE_KEY belum diset, jadi key tidak bisa disimpan dengan aman.",
    );
  }

  const { data: provider, error: providerError } = await admin
    .from("ai_providers")
    .select("id, name")
    .eq("id", parsed.data.providerId)
    .maybeSingle();

  if (providerError) {
    console.error("[ai:addApiKey] Provider lookup failed", {
      code: providerError.code,
      message: providerError.message,
      details: providerError.details,
      hint: providerError.hint,
    });
    return fail(`Provider gagal dibaca: ${providerError.message}`);
  }

  if (!provider) {
    return fail("Provider tidak ditemukan.");
  }

  let stored: { secretId: string; preview: string };
  try {
    const store = getSecretStore();
    console.warn("[ai:addApiKey] Saving API key to secret store", {
      driver: store.driver,
    });
    stored = await store.saveSecret({
      name: providerSecretName((provider as { name: string }).name),
      value: parsed.data.apiKey,
      description: "TNG Daily AI provider key",
    });
  } catch (error) {
    console.error("[ai:addApiKey] Secret store save failed", error);
    return fail(
      error instanceof SecretStoreError
        ? error.message
        : `Secret store error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const { error } = await admin.from("ai_api_keys").insert({
    provider_id: parsed.data.providerId,
    vault_secret_id: stored.secretId,
    key_label: parsed.data.keyLabel || null,
    key_preview: stored.preview,
    priority: parsed.data.priority,
    status: "active",
  });

  if (error) {
    console.error("[ai:addApiKey] ai_api_keys insert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    // Roll back the stored secret so a failed insert does not orphan it.
    await getSecretStore().deleteSecret(stored.secretId).catch(() => undefined);
    return fail(
      `Key gagal disimpan: ${error.message ?? "unknown error"}`,
    );
  }

  refresh();
  return {
    ok: true,
    message: `Key tersimpan sebagai ${stored.preview}. Nilai aslinya tidak bisa dilihat lagi.`,
  };
}

export async function reorderKeysAction(
  raw: unknown,
): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa mengubah prioritas key.");

  const parsed = aiKeyReorderSchema.safeParse(raw);
  if (!parsed.success) return fail("Urutan key tidak valid.");

  const admin = getAdminSupabase();
  if (!admin) return fail("Database belum dikonfigurasi.");

  // Priorities are spaced by 10 so a later single insert can slot between two
  // existing keys without renumbering the whole chain.
  let priority = 10;
  for (const keyId of parsed.data.order) {
    const { error } = await admin
      .from("ai_api_keys")
      .update({ priority })
      .eq("id", keyId);
    if (error) return fail("Prioritas gagal disimpan.");
    priority += 10;
  }

  refresh();
  return { ok: true, message: "Urutan fallback diperbarui." };
}

export async function setKeyStatusAction(
  raw: unknown,
): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa mengubah status key.");

  const parsed = aiKeyStatusSchema.safeParse(raw);
  if (!parsed.success) return fail("Permintaan tidak valid.");

  const admin = getAdminSupabase();
  if (!admin) return fail("Database belum dikonfigurasi.");

  const { error } = await admin
    .from("ai_api_keys")
    .update({
      status: parsed.data.status,
      last_error: parsed.data.status === "active" ? null : undefined,
    })
    .eq("id", parsed.data.keyId);

  if (error) return fail("Status key gagal diubah.");

  refresh();
  return {
    ok: true,
    message:
      parsed.data.status === "active"
        ? "Key diaktifkan kembali."
        : "Key dinonaktifkan.",
  };
}

export async function setModelStatusAction(raw: unknown): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa mengubah model AI.");

  const parsed = aiModelStatusSchema.safeParse(raw);
  if (!parsed.success) return fail("Permintaan model tidak valid.");

  const admin = getAdminSupabase();
  if (!admin) return fail("Database belum dikonfigurasi.");

  const { data: modelRow } = await admin
    .from("ai_models")
    .select("id, provider_id, model_key")
    .eq("id", parsed.data.modelId)
    .maybeSingle();

  const model = modelRow as
    | { id: string; provider_id: string; model_key: string }
    | null;

  if (!model) return fail("Model tidak ditemukan.");

  const { error } = await admin
    .from("ai_models")
    .update({ is_enabled: parsed.data.isEnabled })
    .eq("id", parsed.data.modelId);

  if (error) return fail("Status model gagal disimpan.");

  if (!parsed.data.isEnabled) {
    await admin
      .from("ai_task_models")
      .update({ is_enabled: false })
      .eq("model_id", parsed.data.modelId);

    const { data: providerRow } = await admin
      .from("ai_providers")
      .select("default_model")
      .eq("id", model.provider_id)
      .maybeSingle();

    const provider = providerRow as { default_model: string | null } | null;

    if (provider?.default_model === model.model_key) {
      const { data: nextModel } = await admin
        .from("ai_models")
        .select("model_key")
        .eq("provider_id", model.provider_id)
        .eq("is_enabled", true)
        .neq("id", model.id)
        .order("model_key", { ascending: true })
        .limit(1)
        .maybeSingle();

      await admin
        .from("ai_providers")
        .update({
          default_model:
            (nextModel as { model_key: string } | null)?.model_key ?? null,
        })
        .eq("id", model.provider_id);
    }
  }

  refresh();
  return {
    ok: true,
    message: parsed.data.isEnabled ? "Model diaktifkan." : "Model dinonaktifkan.",
  };
}

export async function setProviderDefaultModelAction(
  raw: unknown,
): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa memilih model utama.");

  const parsed = aiProviderDefaultModelSchema.safeParse(raw);
  if (!parsed.success) return fail("Model utama tidak valid.");

  const admin = getAdminSupabase();
  if (!admin) return fail("Database belum dikonfigurasi.");

  const { data: modelRow } = await admin
    .from("ai_models")
    .select("id, provider_id, model_key")
    .eq("id", parsed.data.modelId)
    .eq("provider_id", parsed.data.providerId)
    .maybeSingle();

  const model = modelRow as
    | { id: string; provider_id: string; model_key: string }
    | null;

  if (!model) return fail("Model tidak ditemukan di provider ini.");

  const [{ error: modelError }, { error: providerError }] = await Promise.all([
    admin
      .from("ai_models")
      .update({ is_enabled: true })
      .eq("id", model.id),
    admin
      .from("ai_providers")
      .update({ default_model: model.model_key, is_active: true })
      .eq("id", model.provider_id),
  ]);

  if (modelError || providerError) return fail("Model utama gagal disimpan.");

  refresh();
  return { ok: true, message: `${model.model_key} menjadi model utama.` };
}

export async function saveTaskModelSettingsAction(
  raw: unknown,
): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa mengatur model task.");

  const parsed = aiTaskModelSettingsSchema.safeParse(raw);
  if (!parsed.success) return fail("Pengaturan model belum valid.");

  const admin = getAdminSupabase();
  if (!admin) return fail("Database belum dikonfigurasi.");

  const modelIds = Array.from(new Set(parsed.data.modelIds));
  if (modelIds.length > 0) {
    const { data: models, error: modelError } = await admin
      .from("ai_models")
      .select("id")
      .in("id", modelIds)
      .eq("is_enabled", true);

    if (modelError) return fail("Model gagal diperiksa.");
    if (((models as Array<{ id: string }> | null) ?? []).length !== modelIds.length) {
      return fail("Ada model yang tidak aktif atau tidak ditemukan.");
    }
  }

  const { error: deleteError } = await admin
    .from("ai_task_models")
    .delete()
    .eq("task_type", parsed.data.taskType);

  if (deleteError) return fail("Pengaturan lama gagal diganti.");

  if (modelIds.length > 0) {
    const { error: insertError } = await admin.from("ai_task_models").insert(
      modelIds.map((modelId, index) => ({
        task_type: parsed.data.taskType,
        model_id: modelId,
        priority: (index + 1) * 10,
        is_enabled: true,
        created_by: auth.profile.id,
      })),
    );

    if (insertError) return fail("Pengaturan model gagal disimpan.");
  }

  refresh();
  return { ok: true, message: "Pengaturan model task disimpan." };
}

export async function deleteApiKeyAction(
  keyId: string,
): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa menghapus API key.");

  const id = uuidSchema.safeParse(keyId);
  if (!id.success) return fail("ID key tidak valid.");

  const admin = getAdminSupabase();
  if (!admin) return fail("Database belum dikonfigurasi.");

  const { data } = await admin
    .from("ai_api_keys")
    .select("vault_secret_id")
    .eq("id", id.data)
    .maybeSingle();

  const secretId = (data as { vault_secret_id: string } | null)?.vault_secret_id;

  const { error } = await admin.from("ai_api_keys").delete().eq("id", id.data);
  if (error) return fail("Key gagal dihapus.");

  if (secretId) {
    const store = safeStore();
    await store?.deleteSecret(secretId).catch(() => undefined);
  }

  refresh();
  return { ok: true, message: "Key dihapus." };
}

/**
 * Connection test for one key. Deliberately does not use the fallback chain: an
 * owner testing a key needs to know about that key.
 */
export async function testApiKeyAction(keyId: string): Promise<AiActionResult> {
  const auth = await getApiAuth("owner");
  if (!auth) return fail("Hanya owner yang bisa menguji koneksi.");

  const id = uuidSchema.safeParse(keyId);
  if (!id.success) return fail("ID key tidak valid.");

  const admin = getAdminSupabase();
  if (!admin) return fail("Database belum dikonfigurasi.");

  const { data } = await admin
    .from("ai_api_keys")
    .select(
      "id, provider_id, vault_secret_id, priority, ai_providers(id, name, base_url, default_model)",
    )
    .eq("id", id.data)
    .maybeSingle();

  if (!data) return fail("Key tidak ditemukan.");

  const row = data as {
    id: string;
    provider_id: string;
    vault_secret_id: string;
    priority: number;
    ai_providers:
      | { id: string; name: string; base_url: string; default_model: string }
      | Array<{ id: string; name: string; base_url: string; default_model: string }>
      | null;
  };

  const provider = Array.isArray(row.ai_providers)
    ? row.ai_providers[0]
    : row.ai_providers;

  if (!provider) return fail("Provider untuk key ini tidak ditemukan.");
  if (!provider.default_model) {
    return fail("Pilih model utama provider sebelum test connection.");
  }

  const candidate: GatewayCandidate = {
    keyId: row.id,
    providerId: provider.id,
    providerName: provider.name,
    baseUrl: provider.base_url,
    model: provider.default_model,
    priority: row.priority,
    isLocalFallback: false,
    secretId: row.vault_secret_id,
  };

  const result = await testCandidate(candidate);
  refresh();

  return result.ok
    ? { ok: true, message: `${provider.name}: ${result.message}` }
    : fail(`${provider.name}: ${result.message}`);
}
