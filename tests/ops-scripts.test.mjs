import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const nodeBin = process.execPath;

function runNode(args, env = {}) {
  return spawnSync(nodeBin, args, {
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

test("production seed dry-run extracts only system prompt templates", () => {
  const result = runNode(["scripts/seed-production.mjs"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /11 prompt template/);
  assert.match(result.stdout, /tanpa kontribusi\/listing\/artikel demo/);
  assert.doesNotMatch(result.stdout, /demo-seed/i);
});

test("deploy readiness fails clearly when required production env is missing", () => {
  const result = runNode(["scripts/deploy-readiness.mjs", "--production"], {
    NODE_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    NEXT_PUBLIC_SITE_URL: "",
    DEMO_CONTENT: "false",
  });

  const output = `${result.stdout}\n${result.stderr}`;

  assert.notEqual(result.status, 0);
  assert.match(output, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(output, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(output, /Deploy check gagal/);
});

test("package.json exposes deploy and production seed scripts", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  assert.equal(packageJson.scripts.test, "node --test tests/*.test.mjs");
  assert.equal(
    packageJson.scripts["deploy:check"],
    "node scripts/deploy-readiness.mjs --production",
  );
  assert.equal(
    packageJson.scripts["seed:production"],
    "node scripts/seed-production.mjs --apply",
  );
  assert.equal(
    packageJson.scripts["seed:production:check"],
    "node scripts/seed-production.mjs --check",
  );
});
