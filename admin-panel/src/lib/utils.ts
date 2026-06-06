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

// ── Number separator helpers ──────────────────────────────────────────────────

/**
 * Format a plain number using custom decimal/thousands separators.
 * Uses en-US as the base locale (guaranteed: ',' = thousands, '.' = decimal),
 * then substitutes the platform-configured separators.
 */
function applyCustomSeparators(s: string, decSep: string, thoSep: string): string {
  return s.replace(/,/g, "\x01").replace(/\./g, decSep).replace(/\x01/g, thoSep);
}

function getNumberSeparators(): { dec: string; tho: string } {
  const s = usePlatformStore.getState();
  return { dec: s.decimal_separator || ".", tho: s.thousands_separator || "," };
}

function getCurrencyPosition(): string {
  return usePlatformStore.getState().currency_symbol_position || "before";
}

function buildCurrencyString(sym: string, formatted: string, position: string): string {
  return position === "before" ? `${sym}${formatted}` : `${formatted} ${sym}`;
}

// ── Core money formatters (accept explicit currency) ─────────────────────────

/**
 * Format a minor-unit amount (paise / cents / fils) using the platform's
 * decimal/thousands separators and currency symbol position.
 */
export function formatCurrency(amountMinor: number, currency: string): string {
  const { dec, tho } = getNumberSeparators();
  const position = getCurrencyPosition();
  const sym = symbolFor(currency);
  const base = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
  return buildCurrencyString(sym, applyCustomSeparators(base, dec, tho), position);
}

/**
 * Compact formatter — abbreviates large INR values using Indian units (L / Cr).
 * All other currencies fall through to formatCurrency.
 * Respects platform currency_symbol_position, decimal_separator, thousands_separator.
 */
export function formatMoneyWith(amountMinor: number, currency: string): string {
  const value = amountMinor / 100;
  const { dec, tho } = getNumberSeparators();
  const position = getCurrencyPosition();

  if (currency === "INR") {
    const sym = "₹";
    if (value >= 10_000_000) {
      const num = applyCustomSeparators((value / 10_000_000).toFixed(2), dec, tho);
      return buildCurrencyString(sym, `${num} Cr`, position);
    }
    if (value >= 100_000) {
      const num = applyCustomSeparators((value / 100_000).toFixed(2), dec, tho);
      return buildCurrencyString(sym, `${num} L`, position);
    }
    const base = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
    return buildCurrencyString(sym, applyCustomSeparators(base, dec, tho), position);
  }
  return formatCurrency(amountMinor, currency);
}

// ── React hooks (subscribe component, re-render on settings change) ───────────

/**
 * Returns a `fmtMinor(amountMinor)` function bound to the platform currency and
 * localization settings. Re-renders when any money-formatting setting changes.
 */
export function useFormatMoney(): (amountMinor: number) => string {
  const base_currency = usePlatformStore((s) => s.base_currency);
  usePlatformStore((s) => s.currency_symbol_position); // subscribe for reactivity
  usePlatformStore((s) => s.decimal_separator);
  usePlatformStore((s) => s.thousands_separator);
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

/**
 * Map the platform date_format setting to a [locale, Intl.DateTimeFormatOptions] pair.
 * - DD/MM/YYYY → en-GB  → "28/05/2026"
 * - MM/DD/YYYY → en-US  → "05/28/2026"
 * - YYYY-MM-DD → en-CA  → "2026-05-28"
 * - D MMM YYYY → en-GB  → "28 May 2026"
 */
function resolveDateLocale(fmt: string): [string, Intl.DateTimeFormatOptions] {
  switch (fmt) {
    case "MM/DD/YYYY":
      return ["en-US", { month: "2-digit", day: "2-digit", year: "numeric" }];
    case "YYYY-MM-DD":
      return ["en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }];
    case "D MMM YYYY":
      return ["en-GB", { day: "numeric", month: "short", year: "numeric" }];
    default: // DD/MM/YYYY
      return ["en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }];
  }
}

function getDateFormat(): string {
  return usePlatformStore.getState().date_format || "DD/MM/YYYY";
}

function getHour12(): boolean {
  return (usePlatformStore.getState().time_format || "24h") === "12h";
}

/** Full date respecting the platform date_format setting. */
export function formatDate(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  const [locale, opts] = resolveDateLocale(getDateFormat());
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: timezone }).format(d);
}

/** Full date + time respecting date_format and time_format settings. */
export function formatDateTime(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  const [locale, dateOpts] = resolveDateLocale(getDateFormat());
  return new Intl.DateTimeFormat(locale, {
    ...dateOpts,
    hour: "2-digit", minute: "2-digit",
    hour12: getHour12(),
    timeZone: timezone,
  }).format(d);
}

/** Full date + time + seconds respecting date_format and time_format settings. */
export function formatDateTimeS(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  const [locale, dateOpts] = resolveDateLocale(getDateFormat());
  return new Intl.DateTimeFormat(locale, {
    ...dateOpts,
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: getHour12(),
    timeZone: timezone,
  }).format(d);
}

/** Time-only respecting time_format (12h/24h). */
export function formatTime(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: getHour12(),
    timeZone: timezone,
  }).format(d);
}

/** Time HH:MM respecting time_format (12h/24h). */
export function formatTimeHM(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit", minute: "2-digit",
    hour12: getHour12(),
    timeZone: timezone,
  }).format(d);
}

/** "15 Jun" partial date — no year, always short-month style for labels/chips. */
export function formatDateShort(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short",
    timeZone: timezone,
  }).format(d);
}

/** "Jun 2024" — month+year label, always short-month style for charts/headers. */
export function formatMonthYear(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    month: "short", year: "numeric",
    timeZone: timezone,
  }).format(d);
}

/** "15 Jun · 14:30" compact label respecting time_format. */
export function formatDateTimeCompact(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  const datePart = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: timezone }).format(d);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit", minute: "2-digit",
    hour12: getHour12(),
    timeZone: timezone,
  }).format(d);
  return `${datePart} · ${timePart}`;
}

/** "Friday, 15 June 2024" — verbose long form for headings. */
export function formatDateLong(iso: string, timezone = getUserTimezone()): string {
  const d = parseUtc(iso);
  if (!isValidDate(d)) return "—";
  return new Intl.DateTimeFormat("en-GB", {
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

// ── Reactive hooks (re-render on timezone, date_format, or time_format change) ─

export function useFormatDate(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone) || 'UTC';
  usePlatformStore((s) => s.date_format); // subscribe — formatDate reads getState() internally
  return (iso: string) => formatDate(iso, tz);
}

export function useFormatDateTime(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone) || 'UTC';
  usePlatformStore((s) => s.date_format);
  usePlatformStore((s) => s.time_format);
  return (iso: string) => formatDateTime(iso, tz);
}

export function useFormatDateTimeS(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone) || 'UTC';
  usePlatformStore((s) => s.date_format);
  usePlatformStore((s) => s.time_format);
  return (iso: string) => formatDateTimeS(iso, tz);
}

export function useFormatTime(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone) || 'UTC';
  usePlatformStore((s) => s.time_format);
  return (iso: string) => formatTime(iso, tz);
}

export function useFormatTimeHM(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone) || 'UTC';
  usePlatformStore((s) => s.time_format);
  return (iso: string) => formatTimeHM(iso, tz);
}

export function useFormatDateShort(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone) || 'UTC';
  return (iso: string) => formatDateShort(iso, tz);
}

export function useFormatMonthYear(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone) || 'UTC';
  return (iso: string) => formatMonthYear(iso, tz);
}

export function useFormatDateTimeCompact(): (iso: string) => string {
  const tz = usePlatformStore((s) => s.timezone) || 'UTC';
  usePlatformStore((s) => s.date_format);
  usePlatformStore((s) => s.time_format);
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
