import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

import nextEnv from "@next/env";
import pg from "pg";

const EXPECTED_TEMPLATE_KEYS = [
  "tng-brand-editorial-v1",
  "tng-ideation-v1",
  "tng-headline-v1",
  "tng-outline-v1",
  "tng-article-draft-v1",
  "tng-rewrite-synthesis-v1",
  "tng-seo-metadata-v1",
  "tng-image-query-v1",
  "tng-quality-gate-v1",
  "tng-social-distribution-v1",
  "tng-editor-copilot-v1",
];

const { Client } = pg;
const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");
const shouldCheck = args.has("--check");
const dryRun = !shouldApply && !shouldCheck;

function extractProductionSeed(seedSql) {
  const start = seedSql.indexOf("insert into public.ai_prompt_templates");
  const end = seedSql.indexOf("-- 2. DEMO CONTRIBUTIONS");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      "Tidak bisa menemukan batas prompt production di supabase/seed.sql.",
    );
  }

  const sql = seedSql.slice(start, end).trim();

  const forbiddenPatterns = [
    /insert\s+into\s+public\.contributions/i,
    /insert\s+into\s+public\.directory_listings/i,
    /insert\s+into\s+public\.articles/i,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(sql)) {
      throw new Error(
        "Ekstraksi production seed mengandung data demo. Proses dihentikan.",
      );
    }
  }

  const missingKeys = EXPECTED_TEMPLATE_KEYS.filter(
    (key) => !sql.includes(`'${key}'`),
  );

  if (missingKeys.length > 0) {
    throw new Error(
      `Production seed tidak lengkap. Template hilang: ${missingKeys.join(", ")}`,
    );
  }

  return `${sql}\n`;
}

function getClientConfig() {
  const connectionString =
    process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "";

  if (connectionString.trim()) {
    return {
      connectionString,
      ssl: { rejectUnauthorized: false },
    };
  }

  if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGPASSWORD) {
    throw new Error(
      "Isi SUPABASE_DB_URL atau PGHOST/PGUSER/PGPASSWORD untuk menjalankan seed production.",
    );
  }

  return {
    host: process.env.PGHOST,
    port: Number.parseInt(process.env.PGPORT ?? "6543", 10),
    database: process.env.PGDATABASE ?? "postgres",
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false },
  };
}

async function verifyTemplates(client) {
  const { rows } = await client.query(
    `
      select template_key, is_active
      from public.ai_prompt_templates
      where template_key = any($1::text[])
      order by template_key;
    `,
    [EXPECTED_TEMPLATE_KEYS],
  );

  const activeKeys = new Set(
    rows
      .filter((row) => row.is_active === true)
      .map((row) => row.template_key),
  );

  const missingKeys = EXPECTED_TEMPLATE_KEYS.filter((key) => !activeKeys.has(key));

  if (missingKeys.length > 0) {
    throw new Error(
      `Template production belum aktif/lengkap: ${missingKeys.join(", ")}`,
    );
  }

  return rows.length;
}

async function main() {
  const seedPath = resolve("supabase", "seed.sql");
  const seedSql = await readFile(seedPath, "utf8");
  const productionSeedSql = extractProductionSeed(seedSql);

  if (dryRun) {
    console.log(
      `Production seed siap: ${EXPECTED_TEMPLATE_KEYS.length} prompt template, tanpa kontribusi/listing/artikel demo.`,
    );
    console.log("Jalankan `npm run seed:production` untuk apply ke database.");
    return;
  }

  const client = new Client(getClientConfig());
  await client.connect();

  try {
    if (shouldApply) {
      await client.query("begin");
      await client.query("set local lock_timeout = '5s'");
      await client.query("set local statement_timeout = '30s'");
      await client.query(productionSeedSql);
      const count = await verifyTemplates(client);
      await client.query("commit");
      console.log(`Production seed selesai. ${count} prompt template aktif.`);
      return;
    }

    const count = await verifyTemplates(client);
    console.log(`Production seed terverifikasi. ${count} prompt template aktif.`);
  } catch (error) {
    if (shouldApply) {
      await client.query("rollback").catch(() => {});
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
