import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import process from "node:process";

import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const args = new Set(process.argv.slice(2));
const production = args.has("--production");

function hasValue(name) {
  return Boolean((process.env[name] ?? "").trim());
}

function parseUrl(name) {
  const value = process.env[name];
  if (!value) return null;

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function check(condition, level, item, detail) {
  return {
    ok: Boolean(condition),
    level,
    item,
    detail,
  };
}

async function main() {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const scripts = packageJson.scripts ?? {};
  const siteUrl = parseUrl("NEXT_PUBLIC_SITE_URL");

  const checks = [
    check(Boolean(scripts.build), "required", "package script: build", "Required by Next.js deployment."),
    check(Boolean(scripts.start), "required", "package script: start", "Required by Node runtime deployment."),
    check(existsSync(".git"), "required", "Git repository", "Vercel Git deployment needs this project inside a Git repo."),
    check(hasValue("NEXT_PUBLIC_SUPABASE_URL"), "required", "NEXT_PUBLIC_SUPABASE_URL", "Required for Supabase client."),
    check(hasValue("NEXT_PUBLIC_SUPABASE_ANON_KEY"), "required", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "Required for Supabase client."),
    check(hasValue("SUPABASE_SERVICE_ROLE_KEY"), "required", "SUPABASE_SERVICE_ROLE_KEY", "Required by server routes/actions that bypass RLS intentionally."),
    check(Boolean(siteUrl), "required", "NEXT_PUBLIC_SITE_URL", "Required for canonical URL, sitemap, Open Graph, and JSON-LD."),
    check(
      !production ||
        (Boolean(siteUrl) &&
          !["localhost", "127.0.0.1"].includes(siteUrl.hostname)),
      "required",
      "production site URL",
      "Production must not use localhost as NEXT_PUBLIC_SITE_URL.",
    ),
    check(
      !production || process.env.DEMO_CONTENT !== "true",
      "required",
      "DEMO_CONTENT disabled",
      "Production should not explicitly enable bundled demo content.",
    ),
    check(
      process.env.SECRET_STORE_DRIVER === "supabase-vault",
      "recommended",
      "SECRET_STORE_DRIVER=supabase-vault",
      "Production code selects Vault automatically, but explicit env prevents operator confusion.",
    ),
    check(
      hasValue("CLOUDINARY_CLOUD_NAME") &&
        hasValue("CLOUDINARY_API_KEY") &&
        hasValue("CLOUDINARY_API_SECRET"),
      "recommended",
      "Cloudinary credentials",
      "Required for editor image upload and stock photo ingest.",
    ),
    check(
      hasValue("UNSPLASH_ACCESS_KEY") ||
        hasValue("PEXELS_API_KEY") ||
        hasValue("PIXABAY_API_KEY"),
      "recommended",
      "stock photo provider key",
      "Required for /api/images/search.",
    ),
    check(
      hasValue("SUPABASE_DB_URL") ||
        (hasValue("PGHOST") && hasValue("PGUSER") && hasValue("PGPASSWORD")),
      "recommended",
      "direct Postgres env for production seed",
      "Required by npm run seed:production and seed:production:check.",
    ),
  ];

  const rows = checks.map((entry) => {
    const status = entry.ok ? "PASS" : entry.level === "required" ? "FAIL" : "WARN";
    return `${status.padEnd(4)} ${entry.level.padEnd(11)} ${entry.item} - ${entry.detail}`;
  });

  console.log(rows.join("\n"));

  const failedRequired = checks.filter(
    (entry) => entry.level === "required" && !entry.ok,
  );

  if (failedRequired.length > 0) {
    console.error(
      `\nDeploy check gagal: ${failedRequired.length} item wajib belum siap.`,
    );
    process.exit(1);
  }

  const warnings = checks.filter(
    (entry) => entry.level === "recommended" && !entry.ok,
  ).length;

  console.log(`\nDeploy check lulus dengan ${warnings} peringatan.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
