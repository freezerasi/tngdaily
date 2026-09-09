import assert from "node:assert/strict";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");
const projectRoot = process.cwd();

// The production app compiles TypeScript and @/ aliases through Next.js. The
// Node test runner only needs this small CommonJS hook to execute the server
// gateway against a local mock provider.
const originalResolveFilename = Module._resolveFilename;
const originalTsExtension = Module._extensions[".ts"];

function resolveProjectAlias(request) {
  const base = path.join(projectRoot, "src", request.slice(2));
  for (const extension of [".ts", ".tsx", ".js", ".jsx"]) {
    if (existsSync(`${base}${extension}`)) return `${base}${extension}`;
  }
  return base;
}

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === "server-only") {
    return path.join(projectRoot, "tests", "fixtures", "server-only.cjs");
  }
  return originalResolveFilename.call(
    this,
    request.startsWith("@/") ? resolveProjectAlias(request) : request,
    parent,
    isMain,
    options,
  );
};

Module._extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
};

// Keep the test completely local: no configured Supabase client and no live
// provider key can be used by the imported gateway.
process.env.NODE_ENV = "test";
process.env.AI_LOCAL_DEV_FALLBACK_KEY = "test-key";
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
Reflect.deleteProperty(process.env, "SUPABASE_SERVICE_ROLE_KEY");

const { runGateway } = require("../src/lib/ai/gateway.ts");

test("structured GLM requests disable thinking and reject reasoning-only output", async (t) => {
  let receivedBody = null;
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    receivedBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: "",
              reasoning_content: "I will think through the requested article first.",
            },
          },
        ],
      }),
    );
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const result = await runGateway(
    {
      task: "rewrite",
      systemPrompt: "Return JSON only.",
      userPrompt: "Create one article.",
      responseFormatJson: true,
    },
    {
      candidates: [
        {
          keyId: null,
          providerId: null,
          providerName: "mock",
          baseUrl: `http://127.0.0.1:${address.port}/v1`,
          model: "z-ai/glm-5.3-free",
          priority: 1,
          isLocalFallback: true,
          secretId: null,
        },
      ],
    },
  );

  assert.equal(result.ok, false);
  assert.deepEqual(receivedBody?.thinking, { type: "disabled" });
});

test.after(() => {
  Module._resolveFilename = originalResolveFilename;
  if (originalTsExtension) Module._extensions[".ts"] = originalTsExtension;
  else delete Module._extensions[".ts"];
});
