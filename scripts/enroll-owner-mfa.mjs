#!/usr/bin/env node
/**
 * One-time TOTP enrollment for the owner account.
 *
 * Signs in as the owner, enrolls a TOTP factor, saves the QR code to a local
 * file, waits for the 6-digit code from the terminal, then challenges and
 * verifies so the factor becomes active (AAL2-capable).
 *
 * Usage:
 *   node scripts/enroll-owner-mfa.mjs
 *
 * Env (loaded from .env.local via @next/env):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   TNG_MFA_OWNER_EMAIL, TNG_MFA_OWNER_PASSWORD  (owner credentials)
 *
 * The password is only used in memory to sign in through the public API, the
 * same way the login form does. Nothing is printed to logs.
 */

import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import process from "node:process";

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OWNER_EMAIL = process.env.TNG_MFA_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.TNG_MFA_OWNER_PASSWORD;

const QR_PATH = "scripts/.mfa-enrollment-qr.svg";
const CODE_PATTERN = /^\d{6}$/;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return rl.question(question).finally(() => rl.close());
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    fail(
      "NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY harus ter-set di .env.local",
    );
  }
  if (!OWNER_EMAIL || !OWNER_PASSWORD) {
    fail(
      "TNG_MFA_OWNER_EMAIL dan TNG_MFA_OWNER_PASSWORD harus ter-set (credential owner).",
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  console.log("→ Sign in sebagai owner …");
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
  });
  if (signInError) fail(`Sign-in gagal: ${signInError.message}`);

  // Check current factors first: if a verified TOTP factor already exists we
  // do not enroll another one — a second factor widens the attack surface
  // without adding protection here.
  const { data: factorsData, error: listError } =
    await supabase.auth.mfa.listFactors();
  if (listError) fail(`listFactors gagal: ${listError.message}`);

  const verifiedTotp = factorsData.totp.filter(
    (factor) => factor.status === "verified",
  );
  if (verifiedTotp.length > 0) {
    console.log(
      `✓ Owner sudah punya ${verifiedTotp.length} faktor TOTP terverifikasi. Tidak ada yang perlu dilakukan.`,
    );
    return;
  }

  console.log("→ Mendaftarkan faktor TOTP baru …");
  const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "TNG Daily CMS",
  });
  if (enrollError) fail(`Enroll gagal: ${enrollError.message}`);
  if (!enrollData || enrollData.type !== "totp") {
    fail("Respon enroll tidak dikenali.");
  }

  await writeFile(QR_PATH, enrollData.totp.qr_code, "utf8");
  console.log(`✓ QR code tersimpan di ${QR_PATH}`);
  console.log(
    `  Secret manual (kalau QR tidak bisa discan): ${enrollData.totp.secret}`,
  );

  console.log("\nScan QR code itu dengan aplikasi authenticator, lalu:");
  const rawAnswer = await ask("Masukkan kode 6 digit dari aplikasi: ");
  const code = rawAnswer.trim();
  if (!CODE_PATTERN.test(code)) {
    fail("Kode harus 6 digit angka. Faktor tetap ter-enroll tapi belum aktif — ulangi script ini.");
  }

  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: enrollData.id });
  if (challengeError) fail(`Challenge gagal: ${challengeError.message}`);

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: enrollData.id,
    challengeId: challengeData.id,
    code,
  });
  if (verifyError) {
    fail(
      `Verify gagal: ${verifyError.message}\n` +
        "  Faktor masih unverified. Jalankan ulang script ini; factor lama yang unverified bisa dihapus dari dashboard Supabase (Authentication → Users → detail user → Factors).",
    );
  }

  console.log("✓ Faktor TOTP owner aktif. Login berikutnya akan meminta kode MFA.");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
