import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { env, isProduction } from "@/lib/env";
import { getAdminSupabase } from "@/lib/supabase/server";

/**
 * SecretStore: the only path through which an AI provider key is written or read.
 *
 * Production uses Supabase Vault through SECURITY DEFINER wrappers, so the
 * plaintext never lands in a regular table, a backup, or a database dump in
 * readable form.
 *
 * Development may use an AES-256-GCM encrypted local file, because a fresh
 * Supabase project does not always have the vault extension enabled. That
 * adapter refuses to run in production. There is no plaintext fallback anywhere.
 */

export interface SecretStore {
  saveSecret(input: {
    name: string;
    value: string;
    description?: string;
  }): Promise<{ secretId: string; preview: string }>;
  getSecret(secretId: string): Promise<string>;
  deleteSecret(secretId: string): Promise<void>;
  readonly driver: "supabase-vault" | "development";
}

export class SecretStoreError extends Error {
  readonly code:
    | "not_configured"
    | "vault_unavailable"
    | "not_found"
    | "write_failed";

  constructor(
    code: SecretStoreError["code"],
    message: string,
  ) {
    super(message);
    this.name = "SecretStoreError";
    this.code = code;
  }
}

/**
 * Masked preview shown in the UI. Keeps the provider prefix and the last four
 * characters, which is enough for an admin to tell two keys apart.
 */
export function maskKey(value: string): string {
  const trimmed = value.trim();
  const tail = trimmed.slice(-4);
  const head = trimmed.slice(0, Math.min(3, Math.max(0, trimmed.length - 8)));
  return `${head}...${tail}`;
}

// ---------------------------------------------------------------------------
// Supabase Vault adapter
// ---------------------------------------------------------------------------

class SupabaseVaultSecretStore implements SecretStore {
  readonly driver = "supabase-vault" as const;

  async saveSecret(input: {
    name: string;
    value: string;
    description?: string;
  }): Promise<{ secretId: string; preview: string }> {
    const admin = getAdminSupabase();
    if (!admin) {
      throw new SecretStoreError(
        "not_configured",
        "SUPABASE_SERVICE_ROLE_KEY belum diset, jadi Vault tidak bisa dipakai.",
      );
    }

    const { data, error } = await admin.rpc("tng_vault_create_secret", {
      p_secret: input.value,
      p_name: `${input.name}-${randomUUID().slice(0, 8)}`,
      p_description: input.description ?? "TNG Daily AI provider key",
    });

    if (error || typeof data !== "string") {
      console.error("[vault] tng_vault_create_secret RPC failed:", {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        dataType: typeof data,
        data,
      });
      throw new SecretStoreError(
        "vault_unavailable",
        error?.message
          ? `Vault error: ${error.message}`
          : "Supabase Vault menolak menyimpan secret. Pastikan extension supabase_vault aktif.",
      );
    }

    return { secretId: data, preview: maskKey(input.value) };
  }

  async getSecret(secretId: string): Promise<string> {
    const admin = getAdminSupabase();
    if (!admin) {
      throw new SecretStoreError(
        "not_configured",
        "SUPABASE_SERVICE_ROLE_KEY belum diset.",
      );
    }

    const { data, error } = await admin.rpc("tng_vault_read_secret", {
      p_secret_id: secretId,
    });

    if (error || typeof data !== "string" || data.length === 0) {
      console.error("[vault] tng_vault_read_secret RPC failed:", {
        secretId,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      throw new SecretStoreError(
        "not_found",
        error?.message
          ? `Vault read error: ${error.message}`
          : "Secret tidak ditemukan di Vault.",
      );
    }
    return data;
  }

  async deleteSecret(secretId: string): Promise<void> {
    const admin = getAdminSupabase();
    if (!admin) return;
    await admin.rpc("tng_vault_delete_secret", { p_secret_id: secretId });
  }
}

// ---------------------------------------------------------------------------
// Development adapter: AES-256-GCM in a gitignored local file
// ---------------------------------------------------------------------------

interface EncryptedRecord {
  iv: string;
  tag: string;
  data: string;
  name: string;
  createdAt: string;
}

const DEV_STORE_DIR = path.join(process.cwd(), ".secrets");
const DEV_STORE_FILE = path.join(DEV_STORE_DIR, "ai-keys.json");

class DevelopmentSecretStore implements SecretStore {
  readonly driver = "development" as const;

  private readonly key: Buffer;

  constructor(rawKey: string) {
    const decoded = Buffer.from(rawKey, "base64");
    if (decoded.length !== 32) {
      throw new SecretStoreError(
        "not_configured",
        "SECRET_STORE_DEV_KEY harus 32 byte dalam base64. Buat dengan: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
      );
    }
    this.key = decoded;
  }

  private async readAll(): Promise<Record<string, EncryptedRecord>> {
    try {
      const raw = await readFile(DEV_STORE_FILE, "utf8");
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, EncryptedRecord>)
        : {};
    } catch {
      return {};
    }
  }

  private async writeAll(records: Record<string, EncryptedRecord>): Promise<void> {
    await mkdir(DEV_STORE_DIR, { recursive: true });
    await writeFile(DEV_STORE_FILE, JSON.stringify(records, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
  }

  async saveSecret(input: {
    name: string;
    value: string;
  }): Promise<{ secretId: string; preview: string }> {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(input.value, "utf8"),
      cipher.final(),
    ]);

    const secretId = randomUUID();
    const records = await this.readAll();
    records[secretId] = {
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      data: encrypted.toString("base64"),
      name: input.name,
      createdAt: new Date().toISOString(),
    };
    await this.writeAll(records);

    return { secretId, preview: maskKey(input.value) };
  }

  async getSecret(secretId: string): Promise<string> {
    const records = await this.readAll();
    const record = records[secretId];
    if (!record) {
      throw new SecretStoreError(
        "not_found",
        "Secret tidak ada di local secret store. Masukkan ulang API key dari halaman Konfigurasi AI.",
      );
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(record.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(record.tag, "base64"));

    try {
      return Buffer.concat([
        decipher.update(Buffer.from(record.data, "base64")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new SecretStoreError(
        "not_found",
        "Secret gagal didekripsi. SECRET_STORE_DEV_KEY mungkin berubah.",
      );
    }
  }

  async deleteSecret(secretId: string): Promise<void> {
    const records = await this.readAll();
    if (!(secretId in records)) return;
    delete records[secretId];
    await this.writeAll(records);
  }
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

let cached: SecretStore | null = null;

/**
 * Resolves the configured store. Production always resolves to Vault, whatever
 * `SECRET_STORE_DRIVER` says, so a stray development value cannot downgrade a
 * deployed environment.
 */
export function getSecretStore(): SecretStore {
  if (cached) return cached;

  if (isProduction) {
    cached = new SupabaseVaultSecretStore();
    return cached;
  }

  const driver = env.SECRET_STORE_DRIVER ?? "development";

  if (driver === "supabase-vault") {
    cached = new SupabaseVaultSecretStore();
    return cached;
  }

  if (!env.SECRET_STORE_DEV_KEY) {
    throw new SecretStoreError(
      "not_configured",
      "SECRET_STORE_DEV_KEY belum diset. Isi di .env.local, atau set SECRET_STORE_DRIVER=supabase-vault kalau Vault sudah aktif.",
    );
  }

  cached = new DevelopmentSecretStore(env.SECRET_STORE_DEV_KEY);
  return cached;
}

/** Non-throwing probe for the settings screen. */
export function secretStoreStatus(): {
  driver: "supabase-vault" | "development" | "unavailable";
  ready: boolean;
  message: string;
} {
  try {
    const store = getSecretStore();
    if (store.driver === "supabase-vault") {
      return {
        driver: "supabase-vault",
        ready: true,
        message:
          "Supabase Vault aktif. API key dienkripsi Vault dan hanya dibaca lewat SECURITY DEFINER di server.",
      };
    }
    return {
      driver: "development",
      ready: true,
      message:
        "Mode development: API key dienkripsi AES-256-GCM di .secrets/ai-keys.json (gitignored). Mode ini menolak jalan di production.",
    };
  } catch (error) {
    return {
      driver: "unavailable",
      ready: false,
      message:
        error instanceof SecretStoreError
          ? error.message
          : "Secret store belum bisa dipakai.",
    };
  }
}
