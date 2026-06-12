/**
 * Store-aware date/time formatters.
 * Reads the user's saved timezone, dateFormat and timeFormat from the auth store
 * so every page automatically uses the correct settings.
 */
import { useOperatorAuthStore } from '../stores/authStore'

// ── prefs helpers ─────────────────────────────────────────────
function getPrefs() {
  const user = useOperatorAuthStore.getState().user
  return {
    tz:         user?.timezone   ?? 'Asia/Kolkata',
    dateFmt:    user?.dateFormat ?? 'DD/MM/YYYY',
    timeFmt:    user?.timeFormat ?? '24h',
    lang:       user?.language   ?? 'en',
  }
}

/** Map our language code to a BCP-47 locale for Intl */
function toLocale(lang: string): string {
  const map: Record<string, string> = {
    en: 'en-GB', hi: 'hi-IN', ar: 'ar-SA',
    ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', fr: 'fr-FR',
  }
  return map[lang] ?? 'en-GB'
}

// ── core builders ─────────────────────────────────────────────

function buildDateString(d: Date, dateFmt: string, tz: string, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = { timeZone: tz }

  // Extract parts individually for full control over format
  const part = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...opts, ...o }).format(d)

  switch (dateFmt) {
    case 'DD/MM/YYYY':
      return `${part({ day: '2-digit' })}/${part({ month: '2-digit' })}/${part({ year: 'numeric' })}`
    case 'MM/DD/YYYY':
      return `${part({ month: '2-digit' })}/${part({ day: '2-digit' })}/${part({ year: 'numeric' })}`
    case 'YYYY-MM-DD':
      return `${part({ year: 'numeric' })}-${part({ month: '2-digit' })}-${part({ day: '2-digit' })}`
    case 'D MMM YYYY':
    default:
      return new Intl.DateTimeFormat(locale, { ...opts, day: 'numeric', month: 'short', year: 'numeric' }).format(d)
  }
}

function buildTimeString(d: Date, timeFmt: string, tz: string, locale: string): string {
  const hour12 = timeFmt === '12h'
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  }).format(d)
}

// ── public API ────────────────────────────────────────────────

/** Format a date-only string using user's date format + timezone */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const { tz, dateFmt, lang } = getPrefs()
    return buildDateString(new Date(iso), dateFmt, tz, toLocale(lang))
  } catch {
    return '—'
  }
}

/** Format a time-only string using user's time format + timezone */
export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const { tz, timeFmt, lang } = getPrefs()
    return buildTimeString(new Date(iso), timeFmt, tz, toLocale(lang))
  } catch {
    return '—'
  }
}

/** Format a full date+time string */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const { tz, dateFmt, timeFmt, lang } = getPrefs()
    const d      = new Date(iso)
    const locale = toLocale(lang)
    return `${buildDateString(d, dateFmt, tz, locale)} · ${buildTimeString(d, timeFmt, tz, locale)}`
  } catch {
    return '—'
  }
}

/**
 * Short date — always "28 May" style (day + month name), respects timezone.
 * Used for compact displays like schedule headers and TTL chips.
 */
export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const { tz, lang } = getPrefs()
    return new Intl.DateTimeFormat(toLocale(lang), {
      timeZone: tz, day: 'numeric', month: 'short',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

/**
 * Weekday + day — "Mon 28" for schedule column headers, respects timezone.
 */
export function fmtWeekDay(d: Date): string {
  try {
    const { tz, lang } = getPrefs()
    return new Intl.DateTimeFormat(toLocale(lang), {
      timeZone: tz, weekday: 'short', day: 'numeric',
    }).format(d)
  } catch {
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
  }
}

/**
 * Time-only for schedule grids — always HH:mm, respects timezone + time format.
 */
export function fmtTimeOnly(d: Date): string {
  try {
    const { tz, timeFmt, lang } = getPrefs()
    return buildTimeString(d, timeFmt, tz, toLocale(lang))
  } catch {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

/**
 * Currency amount in minor units (paise/cents → rupees/dollars).
 * Uses language locale for number formatting.
 */
export function fmtCurrency(minorUnits: number, currency = 'INR'): string {
  try {
    const { lang } = getPrefs()
    const major = minorUnits / 100
    return new Intl.NumberFormat(toLocale(lang), {
      style: 'currency', currency, maximumFractionDigits: 2,
    }).format(major)
  } catch {
    return `${currency} ${(minorUnits / 100).toFixed(2)}`
  }
}

/**
 * Plain number with locale-aware thousands separators.
 */
export function fmtNumber(n: number): string {
  try {
    const { lang } = getPrefs()
    return new Intl.NumberFormat(toLocale(lang)).format(n)
  } catch {
    return n.toLocaleString()
  }
}
