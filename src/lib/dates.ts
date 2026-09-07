import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? date : null;
}

/** "12 Mar 2026" */
export function formatDateShort(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return format(date, "d MMM yyyy", { locale: localeId });
}

/** "12 Maret 2026, 14:30" */
export function formatDateLong(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return format(date, "d MMMM yyyy, HH:mm", { locale: localeId });
}

/** "3 jam lalu" */
export function formatRelative(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return `${formatDistanceToNowStrict(date, { locale: localeId })} lalu`;
}

/**
 * Relative for anything under a week, absolute after that. Feed metadata reads
 * better this way than a raw relative string on an old article.
 */
export function formatFeedTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  const ageMs = Date.now() - date.getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return ageMs < weekMs ? formatRelative(date) : formatDateShort(date);
}

/** Value for a datetime-local input, in the machine's local time. */
export function toDateTimeLocalValue(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toIsoOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? date.toISOString() : null;
}
