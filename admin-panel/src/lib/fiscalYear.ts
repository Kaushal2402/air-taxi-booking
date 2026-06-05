const MONTH_INDEX: Record<string, number> = {
  January: 0, February: 1, March: 2, April: 3,
  May: 4, June: 5, July: 6, August: 7,
  September: 8, October: 9, November: 10, December: 11,
}

export interface FiscalYearRange {
  start: string   // ISO date "YYYY-MM-DD"
  end: string
  label: string   // e.g. "FY 2025–26"
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Returns the fiscal year that contains `reference` (defaults to today).
 * `fiscalYearStart` is a month name, e.g. "April".
 */
export function fiscalYearRange(
  fiscalYearStart: string,
  reference: Date = new Date(),
): FiscalYearRange {
  const startMonth = MONTH_INDEX[fiscalYearStart] ?? 3   // default April = index 3
  const refYear  = reference.getFullYear()
  const refMonth = reference.getMonth()

  const fyYear  = refMonth >= startMonth ? refYear : refYear - 1
  const fyStart = new Date(fyYear, startMonth, 1)
  // Last day of the month before the next FY start
  const fyEnd   = new Date(fyYear + 1, startMonth, 0)

  return {
    start: toIsoDate(fyStart),
    end:   toIsoDate(fyEnd),
    label: `FY ${fyYear}–${String(fyYear + 1).slice(2)}`,
  }
}

/**
 * Returns the fiscal year immediately before the one containing `reference`.
 */
export function lastFiscalYearRange(
  fiscalYearStart: string,
  reference: Date = new Date(),
): FiscalYearRange {
  const current = fiscalYearRange(fiscalYearStart, reference)
  // One day before current FY start puts us inside the previous FY
  const prevRef = new Date(current.start)
  prevRef.setDate(prevRef.getDate() - 1)
  return fiscalYearRange(fiscalYearStart, prevRef)
}
