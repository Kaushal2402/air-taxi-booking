import api from '../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlatformSettings {
  legal_entity: string
  gstin: string
  primary_region: string
  base_currency: string
  timezone: string
  fiscal_year_start: string
  settlement_cycle: string
  driver_payout_day: string
  surge_ceiling: number
  last_edited_at: string
  last_edited_by: string
  // Booking rules
  max_advance_days: number
  min_advance_minutes: number
  cancellation_free_window_min: number
  cancellation_fee_pct: number
  max_cancellations_per_day: number
  no_show_wait_minutes: number
  no_show_fee_pct: number
  driver_acceptance_timeout_sec: number
  max_dispatch_retries: number
  auto_assign_enabled: boolean
  dispatch_initial_radius_m: number
  dispatch_radius_step_m: number
  dispatch_max_radius_m: number
  rank_weight_distance: number
  rank_weight_rating: number
  rank_weight_acceptance: number
  free_waiting_minutes: number
  waiting_charge_per_min: number
  max_active_bookings_per_rider: number
  default_commission_pct: number
  refund_destination_default: string
  air_min_advance_hours: number
  // Quiet hours
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  quiet_hours_action: string
  // Data & Privacy
  data_retention_trip_days: number
  data_retention_pii_days: number
  data_retention_financial_years: number
  data_retention_audit_years: number
  privacy_export_sla_hours: number
  privacy_deletion_sla_days: number
  privacy_auto_anonymize: boolean
  consent_marketing_opt_in: boolean
  consent_analytics_tracking: boolean
  consent_cookie_banner: boolean
  data_share_authorities: boolean
  // Localization
  default_language: string
  supported_languages: string[]
  rtl_enabled: boolean
  date_format: string
  time_format: string
  week_starts_on: string
  currency_symbol_position: string
  decimal_separator: string
  thousands_separator: string
  // Safety & SOS
  sos_enabled: boolean
  sos_contact_number: string
  sos_share_location: boolean
  sos_alert_admin: boolean
  driver_grace_period_enabled: boolean
  driver_grace_period_days: number
  operator_site_visit_required: boolean
  driver_min_rating: number
  driver_max_cancellation_rate_pct: number
  driver_min_acceptance_rate_pct: number
  driver_threshold_window_days: number
  sla_dispatch_alert_min: number
  sla_pickup_alert_min: number
  sla_trip_overrun_alert_min: number
}

export interface PlatformToggle {
  key: string
  name: string
  description: string
  enabled: boolean
}

export interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string
  environment: string
  rollout_pct: number
  targeting: string
  owner: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface FeatureFlagsResponse {
  items: FeatureFlag[]
  total: number
}

export interface KillSwitch {
  key: string
  name: string
  description: string
  enabled: boolean
  tone: string
}

export interface MaintenanceWindow {
  id: string
  region_name: string
  description: string
  starts_at: string
  ends_at: string
  created_at: string
}

export interface MaintenanceWindowsResponse {
  items: MaintenanceWindow[]
}

export interface FlagMetrics {
  assign_latency_ms: number | null
  match_rate_pct: number | null
  cancellation_rate_pct: number | null
  rollback_armed: boolean | null
  latency_label: string | null
  match_rate_label: string | null
  cancellation_label: string | null
}

export interface CreateFlagBody {
  key: string
  name: string
  description?: string
  environment: string
  rollout_pct: number
  targeting: string
  owner: string
}

export interface CreateMaintenanceWindowBody {
  region_name: string
  description: string
  starts_at: string
  ends_at: string
}

// ── Service ───────────────────────────────────────────────────────────────────

export const settingsService = {
  getSettings: () =>
    api.get<PlatformSettings>('/settings').then(r => r.data),

  updateSettings: (body: Partial<PlatformSettings>) =>
    api.patch<PlatformSettings>('/settings', body).then(r => r.data),

  listToggles: () =>
    api.get<PlatformToggle[]>('/settings/toggles').then(r => r.data),

  updateToggle: (key: string, enabled: boolean) =>
    api.patch<PlatformToggle>(`/settings/toggles/${key}`, { enabled }).then(r => r.data),

  listFlags: (params?: Record<string, unknown>) =>
    api.get<FeatureFlagsResponse>('/settings/flags', { params }).then(r => r.data),

  createFlag: (body: CreateFlagBody) =>
    api.post<FeatureFlag>('/settings/flags', body).then(r => r.data),

  updateFlag: (id: string, body: Partial<FeatureFlag>) =>
    api.patch<FeatureFlag>(`/settings/flags/${id}`, body).then(r => r.data),

  getFlagMetrics: (id: string) =>
    api.get<FlagMetrics>(`/settings/flags/${id}/metrics`).then(r => r.data),

  listKillSwitches: () =>
    api.get<KillSwitch[]>('/settings/kill-switches').then(r => r.data),

  updateKillSwitch: (key: string, enabled: boolean) =>
    api.patch<KillSwitch>(`/settings/kill-switches/${key}`, { enabled }).then(r => r.data),

  listMaintenanceWindows: () =>
    api.get<MaintenanceWindowsResponse>('/settings/maintenance-windows').then(r => r.data),

  createMaintenanceWindow: (body: CreateMaintenanceWindowBody) =>
    api.post<MaintenanceWindow>('/settings/maintenance-windows', body).then(r => r.data),

  deleteMaintenanceWindow: (id: string) =>
    api.delete<{ message: string }>(`/settings/maintenance-windows/${id}`).then(r => r.data),
}
