import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { usePlatformStore } from "../store/platformStore";
import { fiscalYearRange, lastFiscalYearRange } from "./fiscalYear";
export type { FiscalYearRange } from "./fiscalYear";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency symbol lookup ────────────────────────────────────────────────────

function symbolFor(currency: string): string {
  try {
    const parts = new Intl.NumberFormat(undefined, { style: "currency", currency })
      .formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

/** Pure function — returns the display symbol for any ISO 4217 currency code. */
export function currencySymbolFor(code: string): string {
  return symbolFor(code);
}

// ── Core money formatters (accept explicit currency) ─────────────────────────

/**
 * Format a minor-unit amount (paise / cents / fils) as a locale currency string.
 * Pass `currency` explicitly, or call `formatMoney()` to read from the platform store.
 */
export function formatCurrency(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

/**
 * Compact formatter — abbreviates large INR values using Indian units (L / Cr).
 * All other currencies fall through to standard Intl formatting.
 */
export function formatMoneyWith(amountMinor: number, currency: string): string {
  const value = amountMinor / 100;
  if (currency === "INR") {
    const sym = "₹";
    if (value >= 10_000_000) return `${sym}${(value / 10_000_000).toFixed(2)} Cr`;
    if (value >= 100_000) return `${sym}${(value / 100_000).toFixed(2)} L`;
    return `${sym}${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }
  return formatCurrency(amountMinor, currency);
}

// ── React hooks (subscribe component, re-render on currency change) ───────────

/**
 * Returns a `fmtMinor(amountMinor)` function bound to the platform currency.
 * Using this hook inside a component subscribes it to currency changes —
 * the component re-renders automatically when base_currency updates.
 *
 * Drop-in replacement for local `const fmtMinor = (v) => '₹' + ...` patterns.
 */
export function useFormatMoney(): (amountMinor: number) => string {
  const base_currency = usePlatformStore((s) => s.base_currency);
  return (amountMinor: number) => formatMoneyWith(amountMinor, base_currency);
}

/**
 * Returns the currency symbol (e.g. "₹", "د.إ", "$") for the platform currency.
 * Subscribes the component to currency changes.
 */
export function useCurrencySymbol(): string {
  const base_currency = usePlatformStore((s) => s.base_currency);
  return symbolFor(base_currency);
}

// ── Non-hook wrappers (for use outside React, e.g. CSV export helpers) ───────

/**
 * Read base_currency from store state at call time (no subscription).
 * Safe to call in module-level helpers, CSV builders, etc.
 * Components should prefer `useFormatMoney()` so they re-render on change.
 */
export function formatMoney(amountMinor: number): string {
  const currency = usePlatformStore.getState().base_currency;
  return formatMoneyWith(amountMinor, currency);
}

export function currencySymbol(): string {
  const currency = usePlatformStore.getState().base_currency;
  return symbolFor(currency);
}

// ── Timezone helpers ──────────────────────────────────────────────────────────

/**
 * Returns the platform's configured IANA timezone.
 * Falls back to UTC (not the browser timezone) so timestamps are consistent
 * before settings load and if the API call fails.
 */
export function getUserTimezone(): string {
  return usePlatformStore.getState().timezone || 'UTC';
}

// ── Date / time formatting ────────────────────────────────────────────────────

function parseUtc(iso: string): Date {
  if (!iso) return new Date(NaN);
  if (iso.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(iso)) return new Date(iso);
  // Plain date "YYYY-MM-DD" — append full time+offset so it's valid ISO 8601
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(iso + "T00:00:00Z");
  return new Date(iso + "Z");
}

function isValidDate(d: Date): boolean {
  return !isNaN(d.getTime());
}

/** "15 Jun 2024" */
export function formatDate(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit", month: "short", year: "numeric",
    timeZone: timezone,
  }).format(d);
}

/** "15 Jun 2024, 14:30" */
export function formatDateTime(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: timezone,
  }).format(d);
}

/** "15 Jun 2024, 14:30:05" */
export function formatDateTimeS(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: timezone,
  }).format(d);
}

/** "14:30:05" */
export function formatTime(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: timezone,
  }).format(d);
}

/** "14:30" */
export function formatTimeHM(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit", minute: "2-digit",
    timeZone: timezone,
  }).format(d);
}

/** "15 Jun" (no year) */
export function formatDateShort(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit", month: "short",
    timeZone: timezone,
  }).format(d);
}

/** "Jun 2024" */
export function formatMonthYear(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", year: "numeric",
    timeZone: timezone,
  }).format(d);
}

/** "15 Jun · 14:30" (compact, no year, 24h) */
export function formatDateTimeCompact(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  const datePart = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", timeZone: timezone }).format(d);
  const timePart = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(d);
  return `${datePart} · ${timePart}`;
}

/** "Friday, 15 June 2024" */
export function formatDateLong(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: timezone,
  }).format(d);
}

/** True when two ISO strings fall on the same calendar day in the given timezone */
export function isSameDayInTz(isoA: string, isoB: string, timezone = getUserTimezone()): boolean {
  const dA = parseUtc(isoA);
  const dB = parseUtc(isoB);
  if (!isValidDate(dA) || !isValidDate(dB)) return false;
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone,
  }).format(d);
  return fmt(dA) === fmt(dB);
}

export function formatNow(timezone = getUserTimezone()): string {
  return formatDateTime(new Date().toISOString(), timezone);
}

// ── Timezone-aware React hooks (re-render on timezone change) ─────────────────

export function useFormatDate(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone);
  return (iso: string) => formatDate(iso, tz);
}

export function useFormatDateTime(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone);
  return (iso: string) => formatDateTime(iso, tz);
}

export function useFormatDateTimeS(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone);
  return (iso: string) => formatDateTimeS(iso, tz);
}

export function useFormatTime(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone);
  return (iso: string) => formatTime(iso, tz);
}

export function useFormatTimeHM(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone);
  return (iso: string) => formatTimeHM(iso, tz);
}

export function useFormatDateShort(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone);
  return (iso: string) => formatDateShort(iso, tz);
}

export function useFormatMonthYear(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone);
  return (iso: string) => formatMonthYear(iso, tz);
}

export function useFormatDateTimeCompact(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone);
  return (iso: string) => formatDateTimeCompact(iso, tz);
}

// ── Fiscal year helpers ───────────────────────────────────────────────────────

/**
 * Returns { thisFY, lastFY } computed from the platform's fiscal_year_start.
 * Components using this hook re-render if fiscal_year_start changes in settings.
 */
export function useFiscalYearRanges() {
  const fyStart = usePlatformStore((s) => s.fiscal_year_start);
  return {
    thisFY: fiscalYearRange(fyStart),
    lastFY: lastFiscalYearRange(fyStart),
  };
}

/**
 * Non-hook version — reads from store state at call time.
 * Safe to call outside React (CSV builders, API param helpers, etc.).
 */
export function getFiscalYearRanges() {
  const fyStart = usePlatformStore.getState().fiscal_year_start;
  return {
    thisFY: fiscalYearRange(fyStart),
    lastFY: lastFiscalYearRange(fyStart),
  };
}
