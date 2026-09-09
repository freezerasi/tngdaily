import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { requireServer } = require("./helpers/require-server.mjs");
const {
  backoffDelayMs,
  classifyHttpFailure,
  classifyNetworkFailure,
  sleep,
} = requireServer("src/lib/ai/fallback.ts");

// The gateway's retry/fallback brain: a wrong classification either burns a
// dead key with pointless retries or drops a live one. These cases pin the
// contract in src/lib/ai/fallback.ts.

test("401/403 mark the key as error and never retry", () => {
  for (const status of [401, 403]) {
    const failure = classifyHttpFailure(status);
    assert.equal(failure.kind, "config");
    assert.equal(failure.keyStatus, "error");
    assert.equal(failure.retryable, false);
  }
  assert.equal(classifyHttpFailure(401).code, "unauthorized");
  assert.equal(classifyHttpFailure(403).code, "forbidden");
});

test("404 marks the key as error without retry (bad base URL)", () => {
  const failure = classifyHttpFailure(404);
  assert.equal(failure.code, "endpoint_not_found");
  assert.equal(failure.keyStatus, "error");
  assert.equal(failure.retryable, false);
});

test("400/422 skip the candidate but keep the key usable", () => {
  for (const status of [400, 422]) {
    const failure = classifyHttpFailure(status);
    assert.equal(failure.code, "bad_request");
    assert.equal(failure.keyStatus, null);
    assert.equal(failure.retryable, false);
  }
});

test("429 marks rate limited and stays retryable", () => {
  const failure = classifyHttpFailure(429);
  assert.equal(failure.kind, "transient");
  assert.equal(failure.code, "rate_limited");
  assert.equal(failure.keyStatus, "rate_limited");
  assert.equal(failure.retryable, true);
});

test("408/409/5xx are transient and retryable without touching key status", () => {
  for (const status of [408, 409, 500, 502, 503]) {
    const failure = classifyHttpFailure(status);
    assert.equal(failure.kind, "transient");
    assert.equal(failure.keyStatus, null);
    assert.equal(failure.retryable, true);
  }
  assert.equal(classifyHttpFailure(500).code, "provider_error");
  assert.equal(classifyHttpFailure(408).code, "request_timeout");
});

test("unknown status codes are non-retryable and clearly coded", () => {
  const failure = classifyHttpFailure(418);
  assert.equal(failure.code, "http_418");
  assert.equal(failure.retryable, false);
  assert.equal(failure.keyStatus, null);
});

test("aborts classify as timeout, other throws as network_error", () => {
  const timeout = classifyNetworkFailure(
    Object.assign(new Error("aborted"), { name: "AbortError" }),
  );
  assert.equal(timeout.code, "timeout");
  assert.equal(timeout.retryable, true);

  const network = classifyNetworkFailure(new Error("socket hang up"));
  assert.equal(network.code, "network_error");
  assert.equal(network.retryable, true);

  const unknown = classifyNetworkFailure("string throw");
  assert.equal(unknown.code, "network_error");
});

test("backoff grows exponentially, caps at 4s, keeps jitter under 250ms", () => {
  const samples = (attempt, n = 40) =>
    Array.from({ length: n }, () => backoffDelayMs(attempt));

  for (const delay of samples(0)) {
    assert.ok(delay >= 400 && delay < 650, `attempt 0 out of range: ${delay}`);
  }
  for (const delay of samples(1)) {
    assert.ok(delay >= 800 && delay < 1050, `attempt 1 out of range: ${delay}`);
  }
  for (const delay of samples(9)) {
    assert.ok(
      delay >= 4000 && delay < 4250,
      `high attempt must cap at 4000+ jitter: ${delay}`,
    );
  }
});

test("sleep resolves after roughly the requested delay", async () => {
  const started = Date.now();
  await sleep(25);
  assert.ok(Date.now() - started >= 20);
});
