import api from '../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoadRuleModifier {
  name: string
  window_start: string | null
  window_end: string | null
  type: 'pct' | 'flat'
  value: number
}

export interface RoadRule {
  id: string
  rule_code: string
  zone_id: string
  zone_name: string | null
  vehicle_class_id: string
  vehicle_class_name: string | null
  base_fare: number
  per_km: number
  per_min: number
  min_fare: number
  free_km: number
  free_min: number
  waiting_per_min: number
  cancel_fee: number
  surge_cap: number
  modifiers: RoadRuleModifier[]
  status: 'live' | 'draft' | 'past'
  version: number
  effective_from: string
  effective_to: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface AirRule {
  id: string
  rule_code: string
  route_name: string
  aircraft_type: string
  category: 'shuttle' | 'on-demand' | 'charter' | 'vip'
  per_seat_base: number | null
  min_pax: number | null
  hourly_rate: number | null
  baggage_per_kg: number
  excess_baggage_cap: number
  positioning_charge: number | null
  night_halt_charge: number | null
  fuel_surcharge_pct: number
  tax_gst_pct: number
  status: 'live' | 'draft' | 'past'
  version: number
  effective_from: string
  effective_to: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface TaxRule {
  id: string
  name: string
  hsn_code: string
  rate: number
  jurisdiction: string
  inclusive: boolean
  in_use: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface SimulateBreakdownItem {
  component: string
  rule_ref: string
  inputs: string
  amount: number
}

export interface SimulateRuleResult {
  rule_id: string
  rule_code: string
  version: number
  status: string
  fare_total: number
  breakdown: SimulateBreakdownItem[]
}

export interface SimulateRequest {
  zone_id: string
  vehicle_class_id: string
  distance_km: number
  duration_min: number
  waiting_min: number
  toll: number
  time_of_day: string
  day_type: string
  demand_supply_ratio: number
  promo_discount: number
  rule_ids?: string[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}

// ── Service ───────────────────────────────────────────────────────────────────

export const pricingService = {
  // Road rules
  listRoadRules: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<RoadRule>>('/pricing/road-rules', { params }).then(r => r.data),

  getRoadRule: (id: string) =>
    api.get<RoadRule>(`/pricing/road-rules/${id}`).then(r => r.data),

  createRoadRule: (body: Partial<RoadRule>) =>
    api.post<RoadRule>('/pricing/road-rules', body).then(r => r.data),

  updateRoadRule: (id: string, body: Partial<RoadRule>) =>
    api.patch<RoadRule>(`/pricing/road-rules/${id}`, body).then(r => r.data),

  publishRoadRule: (id: string) =>
    api.post<RoadRule>(`/pricing/road-rules/${id}/publish`).then(r => r.data),

  deleteRoadRule: (id: string) =>
    api.delete(`/pricing/road-rules/${id}`).then(r => r.data),

  // Air rules
  listAirRules: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<AirRule>>('/pricing/air-rules', { params }).then(r => r.data),

  getAirRule: (id: string) =>
    api.get<AirRule>(`/pricing/air-rules/${id}`).then(r => r.data),

  createAirRule: (body: Partial<AirRule>) =>
    api.post<AirRule>('/pricing/air-rules', body).then(r => r.data),

  updateAirRule: (id: string, body: Partial<AirRule>) =>
    api.patch<AirRule>(`/pricing/air-rules/${id}`, body).then(r => r.data),

  publishAirRule: (id: string) =>
    api.post<AirRule>(`/pricing/air-rules/${id}/publish`).then(r => r.data),

  deleteAirRule: (id: string) =>
    api.delete(`/pricing/air-rules/${id}`).then(r => r.data),

  // Taxes
  listTaxes: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<TaxRule>>('/pricing/taxes', { params }).then(r => r.data),

  createTax: (body: Partial<TaxRule>) =>
    api.post<TaxRule>('/pricing/taxes', body).then(r => r.data),

  updateTax: (id: string, body: Partial<TaxRule>) =>
    api.patch<TaxRule>(`/pricing/taxes/${id}`, body).then(r => r.data),

  deleteTax: (id: string) =>
    api.delete(`/pricing/taxes/${id}`).then(r => r.data),

  // Simulator
  simulate: (body: SimulateRequest) =>
    api.post<{ results: SimulateRuleResult[] }>('/pricing/simulate', body).then(r => r.data),
}
