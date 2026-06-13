import api from '../lib/axios'

export type ReportPeriod = 'last_7d' | 'last_30d' | 'last_90d' | 'custom'

export interface ReportFilter {
  period: ReportPeriod
  date_from?: string
  date_to?: string
  route_id?: string
  aircraft_id?: string
}

// Raw backend envelope
interface ReportOut {
  report_type: string
  period_start?: string
  period_end?: string
  rows: Record<string, unknown>[]
  totals: Record<string, unknown>
}

// ── Revenue ─────────────────────────────────────────────────────────────────

export interface RevenueReportRow {
  month: string
  month_label: string
  gross_revenue: number   // dollars (converted from minor units ÷ 100)
  commission: number
  net_payout: number
  flight_count: number
}

export interface RevenueReportSummary {
  total_gross: number
  total_commission: number
  total_net: number
  total_flights: number
  rows: RevenueReportRow[]
}

// ── Flights Summary (daily grouping from backend) ────────────────────────────

export interface FlightsSummaryRow {
  date: string
  completed: number
  cancelled: number
  on_time: number
  delayed: number
  otp_pct: number
}

export interface FlightsSummary {
  total_flights_completed: number
  total_flights_cancelled: number
  otp_percent: number
  rows: FlightsSummaryRow[]
}

// ── Load Factor (per-route) ──────────────────────────────────────────────────

export interface LoadFactorRow {
  route_label: string
  seats_available: number
  seats_sold: number
  load_factor_pct: number
}

export interface LoadFactorSummary {
  seats_available: number
  seats_sold: number
  avg_load_factor_pct: number
  rows: LoadFactorRow[]
}

// ── Fleet Utilization ────────────────────────────────────────────────────────

export interface FleetUtilRow {
  aircraft_reg: string
  aircraft_type: string
  flights: number
  flight_hours: number
  utilization_percent: number
}

// ── Crew Utilization ─────────────────────────────────────────────────────────

export interface CrewUtilRow {
  crew_name: string
  role: string
  duty_hours: number
  flights: number
}

// ── Period to absolute date conversion ──────────────────────────────────────

function periodToDates(filter: ReportFilter): { period_start?: string; period_end?: string } {
  if (filter.period === 'custom') {
    return { period_start: filter.date_from, period_end: filter.date_to }
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const now = new Date()
  const end = toISO(now)
  const days = filter.period === 'last_7d' ? 7 : filter.period === 'last_30d' ? 30 : 90
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  return { period_start: toISO(start), period_end: end }
}

function buildParams(filter: ReportFilter): Record<string, string> {
  const { period_start, period_end } = periodToDates(filter)
  const p: Record<string, string> = {}
  if (period_start) p.period_start = period_start
  if (period_end) p.period_end = period_end
  if (filter.route_id) p.route_id = filter.route_id
  if (filter.aircraft_id) p.aircraft_id = filter.aircraft_id
  return p
}

// ── Month label ("2025-01" → "Jan 2025") ────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(month: string): string {
  const [year, mo] = month.split('-')
  return `${MONTH_NAMES[parseInt(mo, 10) - 1] ?? mo} ${year}`
}

// ── Response mappers ─────────────────────────────────────────────────────────

function mapRevenue(out: ReportOut): RevenueReportSummary {
  const t = out.totals
  const rows: RevenueReportRow[] = out.rows.map(r => ({
    month: String(r.month ?? ''),
    month_label: monthLabel(String(r.month ?? '')),
    gross_revenue: (Number(r.gross_minor) || 0) / 100,
    commission: (Number(r.commission_minor) || 0) / 100,
    net_payout: (Number(r.net_minor) || 0) / 100,
    flight_count: Number(r.flight_count) || 0,
  }))
  return {
    total_gross: (Number(t.gross_minor) || 0) / 100,
    total_commission: (Number(t.commission_minor) || 0) / 100,
    total_net: (Number(t.net_minor) || 0) / 100,
    total_flights: Number(t.flight_count) || 0,
    rows,
  }
}

function mapFlights(out: ReportOut): FlightsSummary {
  const t = out.totals
  const rows: FlightsSummaryRow[] = out.rows.map(r => ({
    date: String(r.date ?? ''),
    completed: Number(r.completed) || 0,
    cancelled: Number(r.cancelled) || 0,
    on_time: Number(r.on_time) || 0,
    delayed: Number(r.delayed) || 0,
    otp_pct: Number(r.otp_pct) || 0,
  }))
  return {
    total_flights_completed: Number(t.completed) || 0,
    total_flights_cancelled: Number(t.cancelled) || 0,
    otp_percent: Number(t.otp_pct) || 0,
    rows,
  }
}

function mapLoadFactor(out: ReportOut): LoadFactorSummary {
  const t = out.totals
  const rows: LoadFactorRow[] = out.rows.map(r => ({
    route_label: String(r.route_label ?? ''),
    seats_available: Number(r.seats_available) || 0,
    seats_sold: Number(r.seats_sold) || 0,
    load_factor_pct: Number(r.load_factor_pct) || 0,
  }))
  return {
    seats_available: Number(t.seats_available) || 0,
    seats_sold: Number(t.seats_sold) || 0,
    avg_load_factor_pct: Number(t.load_factor_pct) || 0,
    rows,
  }
}

function mapFleet(out: ReportOut): FleetUtilRow[] {
  return out.rows.map(r => ({
    aircraft_reg: String(r.aircraft_reg ?? ''),
    aircraft_type: String(r.aircraft_type ?? ''),
    flights: Number(r.flight_count) || 0,
    flight_hours: Number(r.flight_hours) || 0,
    utilization_percent: Number(r.utilization_pct) || 0,
  }))
}

function mapCrew(out: ReportOut): CrewUtilRow[] {
  return out.rows.map(r => ({
    crew_name: String(r.crew_name ?? ''),
    role: String(r.role ?? ''),
    duty_hours: Number(r.duty_hours) || 0,
    flights: Number(r.flight_count) || 0,
  }))
}

// ── Public service ───────────────────────────────────────────────────────────

export const operatorReportsService = {
  getRevenueReport: (filter: ReportFilter) =>
    api
      .get<ReportOut>('/operator/reports/revenue', { params: buildParams(filter) })
      .then(r => mapRevenue(r.data)),

  getFlightsSummary: (filter: ReportFilter) =>
    api
      .get<ReportOut>('/operator/reports/flights', { params: buildParams(filter) })
      .then(r => mapFlights(r.data)),

  getLoadFactorReport: (filter: ReportFilter) =>
    api
      .get<ReportOut>('/operator/reports/load-factor', { params: buildParams(filter) })
      .then(r => mapLoadFactor(r.data)),

  getFleetUtilization: (filter: ReportFilter) =>
    api
      .get<ReportOut>('/operator/reports/fleet-utilization', { params: buildParams(filter) })
      .then(r => mapFleet(r.data)),

  getCrewUtilization: (filter: ReportFilter) =>
    api
      .get<ReportOut>('/operator/reports/crew-utilization', { params: buildParams(filter) })
      .then(r => mapCrew(r.data)),
}
