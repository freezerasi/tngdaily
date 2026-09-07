import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Words per minute used for the read-cost slot on every banner. */
const READING_WPM = 220;

export function estimateReadingMinutes(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\][()]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / READING_WPM));
}

export function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}\u2026`;
}

/** Non-cryptographic id for client-side keys only. */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Formats a byte count for upload UI.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCompactNumber(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    const scaled = value / 1000;
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, "")}rb`;
  }
  const scaled = value / 1_000_000;
  return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, "")}jt`;
}
