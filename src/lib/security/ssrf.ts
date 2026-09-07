import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guard for the Rewrite Studio extractor.
 *
 * Blocks anything that could reach infrastructure rather than a public article:
 * non-HTTP schemes, credentials in the URL, non-standard ports, and any host
 * that resolves to a private, loopback, link-local, CGNAT, or reserved range in
 * IPv4 or IPv6. DNS is resolved here, and every redirect hop is re-checked by
 * the caller, so a public hostname cannot redirect into a private address.
 */

export type UrlRejection =
  | "invalid_url"
  | "bad_scheme"
  | "has_credentials"
  | "bad_port"
  | "blocked_host"
  | "dns_failed"
  | "private_address";

export interface UrlCheckResult {
  ok: boolean;
  reason?: UrlRejection;
  message?: string;
  url?: URL;
  addresses?: string[];
}

const ALLOWED_PORTS = new Set(["", "80", "443"]);

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  // Cloud instance metadata endpoints.
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "kubernetes.default.svc",
]);

const BLOCKED_TLD_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".corp",
  ".home",
  ".lan",
  ".test",
  ".example",
  ".invalid",
];

function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;

  const [a = 0, b = 0] = parts;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local, includes 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 and 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51) return true; // documentation
  if (a === 203 && b === 0) return true; // documentation
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast and reserved

  return false;
}

function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0] ?? "";

  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true;
  if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
  if (normalized.startsWith("ff")) return true; // multicast
  if (normalized.startsWith("2001:db8")) return true; // documentation
  if (normalized.startsWith("64:ff9b")) return true; // NAT64

  // IPv4-mapped and IPv4-compatible forms: check the embedded IPv4.
  const mapped = /(?:::ffff:)?(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
  if (mapped?.[1]) return isPrivateIPv4(mapped[1]);

  return false;
}

export function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIPv4(address);
  if (version === 6) return isPrivateIPv6(address);
  return true;
}

/**
 * Validates a URL and resolves its host. Call this for the initial URL and for
 * every redirect target.
 */
export async function assertPublicUrl(raw: string): Promise<UrlCheckResult> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return {
      ok: false,
      reason: "invalid_url",
      message: "URL tidak bisa dibaca.",
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      reason: "bad_scheme",
      message: "Hanya URL http atau https yang diterima.",
    };
  }

  if (url.username || url.password) {
    return {
      ok: false,
      reason: "has_credentials",
      message: "URL dengan username atau password tidak diterima.",
    };
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    return {
      ok: false,
      reason: "bad_port",
      message: "Hanya port 80 dan 443 yang diterima.",
    };
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return {
      ok: false,
      reason: "blocked_host",
      message: "Host ini tidak diizinkan.",
    };
  }

  if (BLOCKED_TLD_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return {
      ok: false,
      reason: "blocked_host",
      message: "Domain internal tidak diizinkan.",
    };
  }

  // A literal IP in the URL is checked directly, without a DNS round trip.
  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      return {
        ok: false,
        reason: "private_address",
        message: "Alamat IP privat atau khusus tidak diizinkan.",
      };
    }
    return { ok: true, url, addresses: [hostname] };
  }

  let addresses: string[];
  try {
    const resolved = await lookup(hostname, { all: true, verbatim: true });
    addresses = resolved.map((entry) => entry.address);
  } catch {
    return {
      ok: false,
      reason: "dns_failed",
      message: "Domain tidak bisa di-resolve.",
    };
  }

  if (addresses.length === 0) {
    return {
      ok: false,
      reason: "dns_failed",
      message: "Domain tidak punya alamat IP.",
    };
  }

  // Every resolved address must be public: one private answer is enough to
  // reject, since the client could otherwise pick it.
  const blocked = addresses.filter((address) => isBlockedAddress(address));
  if (blocked.length > 0) {
    return {
      ok: false,
      reason: "private_address",
      message: "Domain mengarah ke alamat internal.",
    };
  }

  return { ok: true, url, addresses };
}
