import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountMinor: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

/**
 * Returns the IANA timezone string for the logged-in user's system,
 * e.g. "Asia/Kolkata", "America/New_York".
 * The value is derived from the browser and cached for the session lifetime.
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Parse an ISO-8601 string from the API as a UTC Date object.
 *
 * MySQL DATETIME columns have no timezone slot.  Even after the backend
 * attaches UTC tzinfo, an older row or a serialisation edge-case may produce
 * a string like "2026-05-26T10:30:00" with no 'Z' or '+HH:MM' suffix.
 * JavaScript's `new Date()` interprets such strings as *local* time, which
 * would double-apply the timezone offset when we later format with
 * Intl.DateTimeFormat.  Appending 'Z' forces UTC interpretation.
 */
function parseUtc(iso: string): Date {
  // If the string already carries timezone info, leave it alone.
  if (iso.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(iso)) {
    return new Date(iso)
  }
  return new Date(iso + "Z")
}

/**
 * Format an ISO timestamp as a date-only string in the user's system timezone.
 * e.g. "26 May 2026"
 */
export function formatDate(iso: string, timezone = getUserTimezone()): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(parseUtc(iso));
}

/**
 * Format an ISO timestamp as a date + time string in the user's system timezone.
 * e.g. "26 May 2026, 03:45 PM"
 */
export function formatDateTime(iso: string, timezone = getUserTimezone()): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(parseUtc(iso));
}

/**
 * Format the current moment as a datetime string in the user's system timezone.
 */
export function formatNow(timezone = getUserTimezone()): string {
  return formatDateTime(new Date().toISOString(), timezone)
}
