import api from '../lib/axios'

export type ReportPeriod = 'last_7d' | 'last_30d' | 'last_90d' | 'custom'

export interface ReportFilter {
  period: ReportPeriod
  date_from?: string
  date_to?: string
  route_id?: string
  aircraft_id?: string
}

export interface RevenueReportRow {
  month: string          // e.g. "2025-01"
  month_label: string    // e.g. "Jan 2025"
  gross_revenue: number
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

export interface FlightsSummaryRow {
  route_label: string
  flights_completed: number
  flights_cancelled: number
  otp_percent: number
  avg_load_factor: number
  total_flight_hours: number
}

export interface FlightsSummary {
  total_flights_completed: number
  total_flights_cancelled: number
  otp_percent: number
  avg_load_factor: number
  total_flight_hours: number
  rows: FlightsSummaryRow[]
}

export interface FleetUtilRow {
  aircraft_id: string
  registration: string
  aircraft_type: string
  flights: number
  flight_hours: number
  utilization_percent: number
}

export interface CrewUtilRow {
  crew_id: string
  crew_name: string
  role: string
  duty_hours: number
  flights: number
  rest_compliance_percent: number
}

function buildParams(filter: ReportFilter): Record<string, string> {
  const p: Record<string, string> = { period: filter.period }
  if (filter.date_from) p.date_from = filter.date_from
  if (filter.date_to) p.date_to = filter.date_to
  if (filter.route_id) p.route_id = filter.route_id
  if (filter.aircraft_id) p.aircraft_id = filter.aircraft_id
  return p
}

export const operatorReportsService = {
  getRevenueReport: (filter: ReportFilter) =>
    api
      .get<RevenueReportSummary>('/operator/reports/revenue', { params: buildParams(filter) })
      .then(r => r.data),

  getFlightsSummary: (filter: ReportFilter) =>
    api
      .get<FlightsSummary>('/operator/reports/flights-summary', { params: buildParams(filter) })
      .then(r => r.data),

  getFleetUtilization: (filter: ReportFilter) =>
    api
      .get<FleetUtilRow[]>('/operator/reports/fleet-utilization', { params: buildParams(filter) })
      .then(r => r.data),

  getCrewUtilization: (filter: ReportFilter) =>
    api
      .get<CrewUtilRow[]>('/operator/reports/crew-utilization', { params: buildParams(filter) })
      .then(r => r.data),
}
