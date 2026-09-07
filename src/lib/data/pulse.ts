import "server-only";

/**
 * City pulse: the only genuinely live data on the homepage.
 *
 * Weather comes from Open-Meteo, which needs no API key and permits
 * non-commercial and commercial use with attribution. Everything else in the
 * pulse strip is derived from our own database, so nothing in the strip is
 * invented. A failed fetch drops the weather segment rather than substituting a
 * plausible number: this is a news site, and a fabricated temperature is a
 * fabricated fact.
 */

/** Kota Tangerang city centre. One request covers Tangerang Raya closely enough. */
const LATITUDE = -6.1783;
const LONGITUDE = 106.6319;

const ENDPOINT =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
  `&current=temperature_2m,weather_code,relative_humidity_2m` +
  `&timezone=Asia%2FJakarta`;

export interface CityWeather {
  temperatureC: number;
  humidity: number | null;
  condition: string;
  /** True when the WMO code reports precipitation, so the UI can mark it. */
  isWet: boolean;
  observedAt: string;
}

/**
 * WMO 4677 weather codes to Indonesian. Grouped rather than enumerated: the
 * distinction between "light drizzle" and "moderate drizzle" is not information
 * a reader acts on.
 */
function describeWeatherCode(code: number): { label: string; isWet: boolean } {
  if (code === 0) return { label: "Cerah", isWet: false };
  if (code === 1) return { label: "Cerah berawan", isWet: false };
  if (code === 2) return { label: "Berawan sebagian", isWet: false };
  if (code === 3) return { label: "Berawan tebal", isWet: false };
  if (code === 45 || code === 48) return { label: "Berkabut", isWet: false };
  if (code >= 51 && code <= 57) return { label: "Gerimis", isWet: true };
  if (code >= 61 && code <= 65) return { label: "Hujan", isWet: true };
  if (code === 66 || code === 67) return { label: "Hujan dingin", isWet: true };
  if (code >= 71 && code <= 77) return { label: "Presipitasi beku", isWet: true };
  if (code >= 80 && code <= 82) return { label: "Hujan lokal", isWet: true };
  if (code === 85 || code === 86) return { label: "Presipitasi beku", isWet: true };
  if (code === 95) return { label: "Hujan badai", isWet: true };
  if (code === 96 || code === 99) return { label: "Badai disertai es", isWet: true };
  return { label: "Kondisi tidak diketahui", isWet: false };
}

interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
    relative_humidity_2m?: number;
  };
}

/**
 * Returns current Tangerang weather, or null when the upstream is unavailable.
 * Revalidated every 15 minutes, matching Open-Meteo's own update interval.
 */
export async function getCityWeather(): Promise<CityWeather | null> {
  try {
    const response = await fetch(ENDPOINT, {
      next: { revalidate: 900, tags: ["city-pulse"] },
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as OpenMeteoResponse;
    const current = payload.current;

    if (
      !current ||
      typeof current.temperature_2m !== "number" ||
      typeof current.weather_code !== "number"
    ) {
      return null;
    }

    const { label, isWet } = describeWeatherCode(current.weather_code);

    return {
      temperatureC: Math.round(current.temperature_2m),
      humidity:
        typeof current.relative_humidity_2m === "number"
          ? Math.round(current.relative_humidity_2m)
          : null,
      condition: label,
      isWet,
      observedAt: current.time ?? new Date().toISOString(),
    };
  } catch {
    // Network failure, DNS failure, or malformed JSON. The strip renders without
    // the weather segment.
    return null;
  }
}

/**
 * Newsroom counters for the pulse strip. Facts we actually own: how many
 * articles are live and when the newest one went out.
 */
export interface NewsroomPulse {
  publishedCount: number;
  latestPublishedAt: string | null;
}

export async function getNewsroomPulse(): Promise<NewsroomPulse> {
  const { getPublishedArticles } = await import("@/lib/data/articles");
  const result = await getPublishedArticles({ limit: 1 });
  const newest = result.data.items[0];

  return {
    publishedCount: result.data.total,
    latestPublishedAt: newest?.publishedAt ?? null,
  };
}
