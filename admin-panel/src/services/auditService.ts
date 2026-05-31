import api from '../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditEventSummary {
  id: string
  event_code: string
  timestamp: string
  actor_name: string
  actor_role: string
  action: string
  target: string
  category: string
  severity: 'high' | 'med' | 'low'
  source_ip: string | null
  created_at: string
}

export interface SurroundingEvent {
  id: string
  timestamp: string
  action: string
  description: string
  is_current: boolean
}

export interface AuditEventDetail extends AuditEventSummary {
  session_id: string | null
  request_id: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  prev_hash: string | null
  this_hash: string | null
  next_hash: string | null
  surrounding_events: SurroundingEvent[]
}

export interface AuditStats {
  events_total: number
  admin_actions: number
  high_severity: number
  failed_logins: number
  integrity_ok: boolean
}

export interface SecurityStats {
  anomalies_open: number
  anomalies_7d: number
  pii_exports_7d: number
  mfa_coverage_pct: number
  retention_policy: string
  integrity_ok: boolean
}

export interface ChartDay {
  date: string
  count: number
}

export interface AuditAnomaly {
  id: string
  title: string
  description: string
  severity: 'high' | 'med' | 'low'
  status: 'open' | 'investigating' | 'dismissed'
  detected_at: string
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface AuditEventsResponse {
  items: AuditEventSummary[]
  total: number
  page: number
  per_page: number
}

// ── Service ───────────────────────────────────────────────────────────────────

export const auditService = {
  listEvents: (params?: Record<string, unknown>) =>
    api.get<AuditEventsResponse>('/audit/events', { params }).then(r => r.data),

  getEvent: (id: string) =>
    api.get<AuditEventDetail>(`/audit/events/${id}`).then(r => r.data),

  exportEvents: (body: Record<string, unknown>) =>
    api.post<{ message: string }>('/audit/events/export', body).then(r => r.data),

  getStats: (params?: Record<string, unknown>) =>
    api.get<AuditStats>('/audit/stats', { params }).then(r => r.data),

  getSecurityStats: () =>
    api.get<SecurityStats>('/audit/security/stats').then(r => r.data),

  getSecurityChart: () =>
    api.get<{ days: ChartDay[] }>('/audit/security/chart').then(r => r.data),

  listAnomalies: (params?: Record<string, unknown>) =>
    api.get<{ items: AuditAnomaly[]; total: number }>('/audit/anomalies', { params }).then(r => r.data),

  createAnomaly: (body: { title: string; description: string; severity: string }) =>
    api.post<AuditAnomaly>('/audit/anomalies', body).then(r => r.data),

  dismissAnomaly: (id: string) =>
    api.post<AuditAnomaly>(`/audit/anomalies/${id}/dismiss`).then(r => r.data),

  investigateAnomaly: (id: string) =>
    api.post<AuditAnomaly>(`/audit/anomalies/${id}/investigate`).then(r => r.data),
}
