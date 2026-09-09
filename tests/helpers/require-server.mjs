// Shared loader for tests that execute server-side TypeScript sources under
// plain Node. Extracted from the inline pattern in
// tests/ai-gateway-response.test.mjs so every test file uses one mechanism:
// - `server-only` resolves to the no-op fixture in tests/fixtures,
// - `@/` aliases resolve into ./src,
// - `.ts` is transpiled on the fly with the project's typescript.
//
// The production app compiles the same sources through Next.js; this hook only
// affects the test runner process that installs it.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const projectRoot = process.cwd();
// Same Loading pattern as tests/ai-gateway-response.test.mjs: keep every
// require() call in the .mjs form the lint rule already accepts.
const testRequire = createRequire(import.meta.url);
const Module = testRequire("node:module");
const ts = testRequire("typescript");

let installed = false;

function installOnce() {
  if (installed) return;
  installed = true;

  const originalResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function resolveFilename(
    request,
    parent,
    isMain,
    options,
  ) {
    if (request === "server-only") {
      return path.join(projectRoot, "tests", "fixtures", "server-only.cjs");
    }
    if (request.startsWith("@/")) {
      const base = path.join(projectRoot, "src", request.slice(2));
      for (const extension of [".ts", ".tsx", ".js", ".jsx"]) {
        if (existsSync(`${base}${extension}`)) return `${base}${extension}`;
      }
      return base;
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
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
}

/**
 * Require a source file by repo-relative path, e.g.
 * `requireServer("src/lib/security/ssrf.ts")`.
 */
function requireServer(srcRelativePath) {
  installOnce();
  return testRequire(path.join(projectRoot, srcRelativePath));
}

export { requireServer };
