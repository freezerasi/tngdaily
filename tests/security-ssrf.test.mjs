import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { requireServer } = require("./helpers/require-server.mjs");
const ssrf = requireServer("src/lib/security/ssrf.ts");

// The SSRF guard from BUILD_STATUS §19 cases, pinned as unit tests. Private
// ranges must stay blocked (fail closed) and structural rejections must not
// need a DNS round trip. Hostname-allowed cases are intentionally absent: they
// depend on live DNS, while every rejection below is deterministic offline.

test("isBlockedAddress rejects loopback, private, link-local, and CGNAT IPv4", () => {
  const blocked = [
    "127.0.0.1",
    "127.0.53.53",
    "10.0.0.1",
    "10.255.255.255",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.0.1",
    "192.168.255.255",
    "169.254.169.254", // cloud metadata (IMDS)
    "169.254.10.20",
    "100.64.0.1", // CGNAT
    "100.127.255.255",
    "0.0.0.0",
    "224.0.0.1", // multicast
    "192.0.2.1", // documentation
    "203.0.113.9", // documentation
    "198.51.100.7", // documentation
  ];
  for (const address of blocked) {
    assert.equal(ssrf.isBlockedAddress(address), true, address);
  }
});

test("isBlockedAddress allows ordinary public IPv4", () => {
  const allowed = [
    "8.8.8.8",
    "1.1.1.1",
    "93.184.215.14",
    "172.15.255.255", // just below 172.16/12
    "172.32.0.1", // just above 172.16/12
    "100.128.0.1", // just above CGNAT
    "192.167.255.255",
  ];
  for (const address of allowed) {
    assert.equal(ssrf.isBlockedAddress(address), false, address);
  }
});

test("isBlockedAddress rejects special IPv6 including mapped IPv4", () => {
  const blocked = [
    "::1",
    "::",
    "fe80::1", // link-local
    "fd00::1", // ULA
    "fc00::dead",
    "ff02::1", // multicast
    "2001:db8::1", // documentation
    "::ffff:127.0.0.1", // mapped loopback
    "::ffff:10.0.0.1", // mapped private
    "64:ff9b::808:808", // NAT64
    "not-an-ip",
  ];
  for (const address of blocked) {
    assert.equal(ssrf.isBlockedAddress(address), true, address);
  }
});

test("isBlockedAddress allows public IPv6 including mapped public IPv4", () => {
  const allowed = ["2606:4700:4700::1111", "2a00:1450:4000::1", "::ffff:8.8.8.8"];
  for (const address of allowed) {
    assert.equal(ssrf.isBlockedAddress(address), false, address);
  }
});

test("assertPublicUrl rejects bad schemes, credentials, and ports without DNS", async () => {
  const cases = [
    ["file:///etc/passwd", "bad_scheme"],
    ["gopher://example.com/", "bad_scheme"],
    ["ftp://8.8.8.8/file", "bad_scheme"],
    ["http://user:pass@8.8.8.8/", "has_credentials"],
    ["https://user@8.8.8.8/", "has_credentials"],
    ["http://8.8.8.8:8080/", "bad_port"],
    ["https://93.184.215.14:8443/", "bad_port"],
    ["not a url", "invalid_url"],
  ];
  for (const [raw, reason] of cases) {
    const result = await ssrf.assertPublicUrl(raw);
    assert.equal(result.ok, false, raw);
    assert.equal(result.reason, reason, raw);
  }
  // Default ports are explicit-allowed, not rejected.
  assert.equal((await ssrf.assertPublicUrl("http://8.8.8.8:80/")).ok, true);
  assert.equal((await ssrf.assertPublicUrl("https://8.8.8.8:443/")).ok, true);
});

test("assertPublicUrl blocks infrastructure hostnames before DNS", async () => {
  const cases = [
    "http://localhost/artikel",
    "http://metadata.google.internal/",
    "http://metadata/",
    "http://instance-data/",
    "http://app.corp/",
    "http://intranet.local/",
    "http://router.home/",
  ];
  for (const raw of cases) {
    const result = await ssrf.assertPublicUrl(raw);
    assert.equal(result.ok, false, raw);
    assert.equal(result.reason, "blocked_host", raw);
  }
});

test("assertPublicUrl blocks private literal IPs including IPv6 loopback", async () => {
  const cases = [
    "http://127.0.0.1/",
    "http://10.0.0.5/admin",
    "http://172.16.9.9/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://100.64.0.2/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://[::ffff:127.0.0.1]/",
  ];
  for (const raw of cases) {
    const result = await ssrf.assertPublicUrl(raw);
    assert.equal(result.ok, false, raw);
    assert.equal(result.reason, "private_address", raw);
  }
});

test("assertPublicUrl allows public literal IPs without DNS", async () => {
  for (const raw of ["http://8.8.8.8/", "https://93.184.215.14/artikel"]) {
    const result = await ssrf.assertPublicUrl(raw);
    assert.equal(result.ok, true, raw);
    assert.ok(result.url instanceof URL);
    assert.deepEqual(result.addresses, [result.url.hostname]);
  }
});

test("assertPublicUrl fails closed when DNS cannot resolve", async () => {
  const result = await ssrf.assertPublicUrl(
    "https://host-yang-pasti-tidak-ada-987654321.example-test-site.com/artikel",
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "dns_failed");
});
