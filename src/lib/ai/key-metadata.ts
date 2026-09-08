import "server-only";

import { getAdminSupabase } from "@/lib/supabase/server";
import type { AiKeyStatus } from "@/types/domain";

interface RpcErrorShape {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export interface AiKeyMutationError {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

export type AiKeyMutationResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: AiKeyMutationError };

function notConfigured(): AiKeyMutationResult<never> {
  return {
    ok: false,
    error: {
      message:
        "SUPABASE_SERVICE_ROLE_KEY belum diset, jadi metadata key tidak bisa disimpan dengan aman.",
    },
  };
}

function rpcFailure(
  error: RpcErrorShape | null,
  fallback: string,
): AiKeyMutationResult<never> {
  return {
    ok: false,
    error: {
      code: error?.code,
      message: error?.message ?? fallback,
      details: error?.details,
      hint: error?.hint,
    },
  };
}

export async function createAiApiKeyMetadata(input: {
  providerId: string;
  secretId: string;
  keyLabel?: string | null;
  keyPreview: string;
  priority: number;
  status?: AiKeyStatus;
}): Promise<AiKeyMutationResult<{ id: string }>> {
  const admin = getAdminSupabase();
  if (!admin) return notConfigured();

  const { data, error } = await admin.rpc("tng_ai_api_key_create", {
    p_provider_id: input.providerId,
    p_vault_secret_id: input.secretId,
    p_key_label: input.keyLabel ?? null,
    p_key_preview: input.keyPreview,
    p_priority: input.priority,
    p_status: input.status ?? "active",
  });

  if (error || typeof data !== "string") {
    return rpcFailure(error, "Metadata key gagal disimpan.");
  }

  return { ok: true, data: { id: data } };
}

export async function updateAiApiKeyState(input: {
  keyId: string;
  status?: AiKeyStatus | null;
  lastError?: string | null;
  clearLastError?: boolean;
  touchLastUsed?: boolean;
}): Promise<AiKeyMutationResult> {
  const admin = getAdminSupabase();
  if (!admin) return notConfigured();

  const { error } = await admin.rpc("tng_ai_api_key_update_state", {
    p_key_id: input.keyId,
    p_status: input.status ?? null,
    p_last_error: input.lastError ?? null,
    p_clear_last_error: input.clearLastError ?? false,
    p_touch_last_used: input.touchLastUsed ?? false,
  });

  if (error) return rpcFailure(error, "Metadata key gagal diperbarui.");

  return { ok: true, data: undefined };
}

export async function setAiApiKeyPriority(input: {
  keyId: string;
  priority: number;
}): Promise<AiKeyMutationResult> {
  const admin = getAdminSupabase();
  if (!admin) return notConfigured();

  const { error } = await admin.rpc("tng_ai_api_key_set_priority", {
    p_key_id: input.keyId,
    p_priority: input.priority,
  });

  if (error) return rpcFailure(error, "Prioritas key gagal disimpan.");

  return { ok: true, data: undefined };
}

export async function deleteAiApiKeyMetadata(
  keyId: string,
): Promise<AiKeyMutationResult> {
  const admin = getAdminSupabase();
  if (!admin) return notConfigured();

  const { error } = await admin.rpc("tng_ai_api_key_delete", {
    p_key_id: keyId,
  });

  if (error) return rpcFailure(error, "Metadata key gagal dihapus.");

  return { ok: true, data: undefined };
}
