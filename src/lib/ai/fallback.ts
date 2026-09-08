/**
 * Error classification for the provider fallback chain.
 *
 * The distinction that matters: a configuration error means retrying the same
 * key is pointless and the key should be marked, while a transient error means
 * retrying the same key with backoff is the right move before moving on.
 */

export type FailureKind = "config" | "transient" | "unknown";

export interface ClassifiedFailure {
  kind: FailureKind;
  /** Persisted on the key row so the admin sees why it stopped being used. */
  keyStatus: "error" | "rate_limited" | null;
  statusCode: number | null;
  code: string;
  /** Safe for the admin UI. Never contains a provider response body. */
  message: string;
  retryable: boolean;
}

export function classifyHttpFailure(
  status: number,
): ClassifiedFailure {
  if (status === 401 || status === 403) {
    return {
      kind: "config",
      keyStatus: "error",
      statusCode: status,
      code: status === 401 ? "unauthorized" : "forbidden",
      message:
        "Provider menolak API key ini (tidak sah atau tidak punya akses). Key ditandai error dan dilewati.",
      retryable: false,
    };
  }

  if (status === 404) {
    return {
      kind: "config",
      keyStatus: "error",
      statusCode: status,
      code: "endpoint_not_found",
      message:
        "Endpoint tidak ditemukan. Periksa base URL provider, biasanya harus berakhir di /v1.",
      retryable: false,
    };
  }

  if (status === 400 || status === 422) {
    return {
      kind: "config",
      keyStatus: null,
      statusCode: status,
      code: "bad_request",
      message:
        "Provider menolak permintaan (model tidak dikenal atau parameter tidak didukung). Kandidat ini dilewati tanpa menonaktifkan key.",
      retryable: false,
    };
  }

  if (status === 429) {
    return {
      kind: "transient",
      keyStatus: "rate_limited",
      statusCode: status,
      code: "rate_limited",
      message: "Kuota provider sedang penuh. Key ditandai rate limited.",
      retryable: true,
    };
  }

  if (status === 408 || status === 409 || status >= 500) {
    return {
      kind: "transient",
      keyStatus: null,
      statusCode: status,
      code: status >= 500 ? "provider_error" : "request_timeout",
      message:
        status >= 500
          ? "Provider mengembalikan error server. Dicoba ulang lalu dialihkan."
          : "Permintaan timeout di sisi provider.",
      retryable: true,
    };
  }

  return {
    kind: "unknown",
    keyStatus: null,
    statusCode: status,
    code: `http_${status}`,
    message: `Provider mengembalikan status ${status}.`,
    retryable: false,
  };
}

export function classifyNetworkFailure(error: unknown): ClassifiedFailure {
  const isAbort =
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError");

  if (isAbort) {
    return {
      kind: "transient",
      keyStatus: null,
      statusCode: null,
      code: "timeout",
      message: "Permintaan ke provider melewati batas waktu.",
      retryable: true,
    };
  }

  return {
    kind: "transient",
    keyStatus: null,
    statusCode: null,
    code: "network_error",
    message: "Tidak bisa menghubungi provider. Periksa base URL dan jaringan.",
    retryable: true,
  };
}

/** Exponential backoff with jitter, so parallel jobs do not resynchronise. */
export function backoffDelayMs(attempt: number): number {
  const base = Math.min(4000, 400 * 2 ** attempt);
  return base + Math.floor(Math.random() * 250);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
