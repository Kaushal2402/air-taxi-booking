import api from '../lib/axios'

export interface DashboardKPIs {
  pending_requests: number
  todays_flights: number
  in_air_now: number
  available_aircraft: number
  on_duty_crew: number
  load_factor_pct: number
  period_revenue_minor: number
  on_time_pct: number
}

export interface UpcomingFlight {
  id: string
  booking_ref: string | null
  route_label: string
  etd: string
  eta: string
  aircraft_mark: string | null
  pilot_name: string | null
  pax_count: number
  status: string
}

export interface ActionQueueItem {
  id: string
  type: string
  label: string
  sub_label: string | null
  ttl_expires_at: string | null
  priority: string
  link_path: string
}

export interface ComplianceAlert {
  severity: string
  message: string
  entity_type: string | null
  entity_id: string | null
}

export interface TrendPoint {
  label: string
  value: number
}

export interface TrendSeries {
  metric: string
  window: string
  points: TrendPoint[]
}

export interface DashboardFullResponse {
  kpis: DashboardKPIs
  upcoming_flights: UpcomingFlight[]
  action_queue: ActionQueueItem[]
  compliance_alerts: ComplianceAlert[]
}

export const operatorDashboardService = {
  getKPIs: (window = '30d'): Promise<DashboardKPIs> =>
    api.get<DashboardKPIs>('/operator/dashboard/kpis', { params: { window } }).then(r => r.data),

  getUpcomingFlights: (): Promise<{ flights: UpcomingFlight[] }> =>
    api.get<{ flights: UpcomingFlight[] }>('/operator/dashboard/upcoming-flights').then(r => r.data),

  getActionQueue: (): Promise<{ items: ActionQueueItem[]; total: number }> =>
    api.get<{ items: ActionQueueItem[]; total: number }>('/operator/dashboard/action-queue').then(r => r.data),

  getTrends: (metric: string, window = '30d'): Promise<TrendSeries> =>
    api.get<TrendSeries>('/operator/dashboard/trends', { params: { metric, window } }).then(r => r.data),

  getComplianceAlerts: (): Promise<ComplianceAlert[]> =>
    api.get<ComplianceAlert[]>('/operator/dashboard/compliance-alerts').then(r => r.data),

  getDashboard: (window = '30d'): Promise<DashboardFullResponse> =>
    api.get<DashboardFullResponse>('/operator/dashboard', { params: { window } }).then(r => r.data),
}
