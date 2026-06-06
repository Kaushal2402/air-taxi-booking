import api from '../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QueueItem {
  id: string
  booking_ref: string
  customer_name: string | null
  vehicle_class: string | null
  pickup_address: string
  pickup_lat: number | null
  pickup_lng: number | null
  drop_address: string
  drop_lat: number | null
  drop_lng: number | null
  fare_estimate_minor: number
  fare_display: string
  age_seconds: number
  dispatch_attempts: number
  current_radius_km: number
  zone_id: string | null
  zone_name: string | null
  eligible_count: number
  sla_status: 'ok' | 'warn' | 'danger'
  exception_type: string | null
  created_at: string
}

export interface QueueStats {
  total_in_queue: number
  exceptions_count: number
  online_drivers_count: number
  avg_pickup_eta_seconds: number
  auto_dispatch_rate: number
  stuck_over_timeout: number
  no_driver_count: number
  auto_assign_enabled: boolean
  ping_ttl_sec: number
  max_dispatch_retries: number
  // SLA thresholds from platform settings
  sla_dispatch_alert_min: number
  sla_pickup_alert_min: number
  sla_trip_overrun_alert_min: number
}

export interface ActiveBookingSlaItem {
  id: string
  booking_ref: string
  status: string
  customer_name: string | null
  driver_name: string | null
  pickup_address: string
  age_seconds: number
  sla_type: 'pickup' | 'overrun'
  sla_limit_seconds: number
  sla_status: 'ok' | 'warn' | 'danger'
  created_at: string
}

export interface SlaMonitorResponse {
  pickup_breached: number
  overrun_breached: number
  items: ActiveBookingSlaItem[]
}

export interface EligibleDriver {
  rank: number
  driver_id: string
  name: string
  vehicle_plate: string
  distance_km: number
  eta_minutes: number
  rating: number
  acceptance_rate: number
  recommended: boolean
  current_lat: number
  current_lng: number
}

export interface RankingWeights {
  distance: number
  rating: number
  acceptance: number
}

export interface EligibleDriversResponse {
  booking_ref: string
  total_eligible: number
  current_radius_km: number
  ranking_weights: RankingWeights
  drivers: EligibleDriver[]
}

export interface AssignDriverRequest {
  driver_id: string
  reason: string
}

export interface AssignDriverResponse {
  booking_id: string
  booking_ref: string
  driver_id: string
  driver_name: string
  message: string
}

export interface ExpandRadiusResponse {
  booking_id: string
  booking_ref: string
  old_radius_km: number
  new_radius_km: number
  new_eligible_count: number
  message: string
}

export interface ExceptionStats {
  active_count: number
  no_driver_count: number
  sla_breach_risk_count: number
  resolved_last_hour: number
  avg_resolve_seconds: number
}

export interface ExceptionPattern {
  description: string
  detail: string
  hot_zone_id: string | null
  hot_zone_name: string | null
}

export interface DispatchException {
  id: string
  exception_ref: string
  kind: 'no-driver' | 'rejected' | 'stuck-pickup' | 'sla-breach' | 'route-blocked'
  booking_id: string | null
  booking_ref: string | null
  customer_name: string | null
  zone_id: string
  zone_name: string
  vehicle_class: string | null
  age_display: string
  age_seconds: number
  dispatch_attempts: number
  recommended_action: string
  severity: 'danger' | 'warn' | 'info'
  resolved: boolean
  created_at: string
}

export interface ExceptionsResponse {
  stats: ExceptionStats
  pattern: ExceptionPattern
  exceptions: DispatchException[]
}

export interface SupplyStats {
  online_drivers_total: number
  approved_drivers_total: number
  online_percentage: number
  live_demand: number
  ds_ratio: number
  zones_above_1_3: number
  active_surge_zones: number
  total_zones: number
  avg_surge_multiplier: number
  capped_zones_count: number
}

export interface SupplyZone {
  zone_id: string
  zone_name: string
  online_drivers: number
  demand: number
  ds_ratio: number
  surge_multiplier: number
  is_capped: boolean
  tone: 'ok' | 'warn' | 'danger'
  active_override: SurgeOverride | null
}

export interface SupplyResponse {
  stats: SupplyStats
  zones: SupplyZone[]
}

export interface SurgeOverride {
  id: string
  zone_id: string
  zone_name: string
  multiplier: number
  reason: string
  duration_minutes?: number
  expires_at: string
  applies_to: string
  is_active?: boolean
  created_by_name: string
  bookings_affected: number
  created_at: string
}

export interface SurgeOverrideRequest {
  zone_id: string
  zone_name: string
  multiplier: number
  reason: string
  expires_in_minutes: number
  applies_to: string
}

// ── Service ───────────────────────────────────────────────────────────────────

export const dispatchService = {
  getQueue: (params?: { zone_id?: string; sla_filter?: string; limit?: number }) =>
    api.get<QueueItem[]>('/dispatch/queue', { params }).then(r => r.data),

  getQueueStats: () =>
    api.get<QueueStats>('/dispatch/queue/stats').then(r => r.data),

  getEligibleDrivers: (bookingId: string) =>
    api.get<EligibleDriversResponse>(`/dispatch/requests/${bookingId}/eligible-drivers`).then(r => r.data),

  assignDriver: (bookingId: string, body: AssignDriverRequest) =>
    api.post<AssignDriverResponse>(`/dispatch/requests/${bookingId}/assign`, body).then(r => r.data),

  expandRadius: (bookingId: string) =>
    api.post<ExpandRadiusResponse>(`/dispatch/requests/${bookingId}/expand-radius`, {}).then(r => r.data),

  getExceptions: (params?: { zone_id?: string; severity?: string; limit?: number }) =>
    api.get<ExceptionsResponse>('/dispatch/exceptions', { params }).then(r => r.data),

  resolveException: (exceptionId: string, body: { action_taken: string; resolved_by_driver_id?: string }) =>
    api.post(`/dispatch/exceptions/${exceptionId}/resolve`, body).then(r => r.data),

  getSupply: () =>
    api.get<SupplyResponse>('/dispatch/supply').then(r => r.data),

  createSurgeOverride: (body: SurgeOverrideRequest) =>
    api.post<SurgeOverride>('/dispatch/surge/override', body).then(r => r.data),

  getSurgeOverrides: (params?: { limit?: number; offset?: number }) =>
    api.get<SurgeOverride[]>('/dispatch/surge/overrides', { params }).then(r => r.data),

  getSlaMonitor: () =>
    api.get<SlaMonitorResponse>('/dispatch/sla-monitor').then(r => r.data),
}
