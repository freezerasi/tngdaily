import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

// Black-box regression tests for scripts/deploy-readiness.mjs. The script only
// checks env presence (never validity), so dummy values are sufficient and no
// credential is needed. Follows the spawn pattern in tests/ops-scripts.test.mjs.

const nodeBin = process.execPath;

function runReadiness(env = {}) {
  return spawnSync(nodeBin, ["scripts/deploy-readiness.mjs", "--production"], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      ...env,
    },
    encoding: "utf8",
  });
}

const REQUIRED = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "dummy-anon",
  SUPABASE_SERVICE_ROLE_KEY: "dummy-service",
  NEXT_PUBLIC_SITE_URL: "https://example.com",
  SECRET_STORE_DRIVER: "supabase-vault",
  SUPABASE_DB_URL: "postgresql://dummy/dummy",
};

test("passes with zero warnings when every recommended credential is present", () => {
  const result = runReadiness({
    ...REQUIRED,
    CLOUDINARY_CLOUD_NAME: "dummy-cloud",
    CLOUDINARY_API_KEY: "dummy-key",
    CLOUDINARY_API_SECRET: "dummy-secret",
    UNSPLASH_ACCESS_KEY: "dummy-stock",
  });

  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, 0, output);
  assert.match(output, /0 peringatan/);
});

test("accepts the NEXT_PUBLIC_ cloud-name variant (env.ts fallback contract)", () => {
  // Regression: .env files in the wild carry NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  // for delivery URLs. The check must mirror src/lib/env.ts instead of
  // warning that Cloudinary is unconfigured.
  const result = runReadiness({
    ...REQUIRED,
    CLOUDINARY_CLOUD_NAME: "",
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "dummy-cloud",
    CLOUDINARY_API_KEY: "dummy-key",
    CLOUDINARY_API_SECRET: "dummy-secret",
    PEXELS_API_KEY: "dummy-stock",
  });

  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, 0, output);
  assert.match(output, /PASS recommended\s+Cloudinary credentials/);
});

test("warns (not fails) when Cloudinary is genuinely absent", () => {
  const result = runReadiness({
    ...REQUIRED,
    CLOUDINARY_CLOUD_NAME: "",
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "",
    CLOUDINARY_API_KEY: "",
    CLOUDINARY_API_SECRET: "",
    UNSPLASH_ACCESS_KEY: "dummy-stock",
  });

  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, 0, output);
  assert.match(output, /WARN recommended\s+Cloudinary credentials/);
});

test("fails clearly when the site URL is still localhost in production", () => {
  const result = runReadiness({
    ...REQUIRED,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  });

  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0);
  assert.match(output, /production site URL/);
});
