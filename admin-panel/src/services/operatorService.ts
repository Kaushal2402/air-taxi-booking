import api from '../lib/axios'

// ── File upload ────────────────────────────────────────────────────────────────

export interface UploadResponse {
  url: string
  original_filename: string
  size_bytes: number
}

export const uploadFile = (file: File, folder = 'documents'): Promise<UploadResponse> => {
  const fd = new FormData()
  fd.append('file', file)
  return api
    .post<UploadResponse>(`/upload?folder=${encodeURIComponent(folder)}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type OperatorStatus = 'pending' | 'review' | 'approved' | 'active' | 'paused' | 'rejected' | 'deactivated'
export type DocStatus      = 'pending' | 'approved' | 'rejected' | 'expired'
export type DocType        = string   // region-specific; fetch valid values from GET /kyc/doc-types
export type AircraftStatus = 'ready' | 'maintenance' | 'grounded' | 'pending_review'
export type AirworthinessStatus = 'ok' | 'expiring' | 'expired'
export type PilotStatus    = 'active' | 'grounded' | 'pending_review' | 'inactive'

export interface Operator {
  id: string
  name: string
  company_registration_no: string | null
  hq_city: string | null
  cert_type: string | null
  status: OperatorStatus
  commission_pct: number | null
  payout_account_ref: string | null
  site_visit_status: string | null
  insurance_expiry: string | null
  cert_expiry: string | null
  rejection_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  fleet_count: number
  pilot_count: number
}

export interface OperatorDocument {
  id: string
  operator_id: string
  doc_type: DocType
  file_url: string
  expires_at: string | null
  status: DocStatus
  review_notes: string | null
  created_at: string
}

export interface OperatorDetail extends Operator {
  fleet_count: number
  pilot_count: number
  docs: OperatorDocument[]
}

export interface Aircraft {
  id: string
  operator_id: string
  aircraft_type_id: string | null
  registration_mark: string
  seat_capacity: number
  mtow_kg: number | null
  range_nm: number | null
  total_hours: number | null
  status: AircraftStatus
  airworthiness_status: AirworthinessStatus
  airworthiness_expiry: string | null
  airworthiness_doc_url: string | null
  maintenance_windows: MaintenanceWindow[] | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MaintenanceWindow {
  starts_at: string
  ends_at: string
  notes?: string
}

export interface Pilot {
  id: string
  operator_id: string
  name: string
  license_no: string | null
  license_type: string | null
  type_ratings: string[] | null
  medical_expiry: string | null
  status: PilotStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OperatorListResponse {
  items: Operator[]
  total: number
}

export interface AircraftListResponse {
  items: Aircraft[]
  total: number
}

export interface PilotListResponse {
  items: Pilot[]
  total: number
}

export interface OperatorPerformanceResponse {
  otp_pct: number
  load_factor_pct: number
  booking_count_mtd: number
  cancellation_rate_pct: number
  payouts_mtd_amount: number
}

export interface ComplianceAircraftRow {
  id: string
  registration_mark: string
  operator_id: string
  status: AircraftStatus
  airworthiness_status: AirworthinessStatus
  airworthiness_expiry: string | null
}

export interface AircraftComplianceSummary {
  total: number
  ok: number
  expiring_count: number
  expired_count: number
  grounded_count: number
  expiring: ComplianceAircraftRow[]
  expired: ComplianceAircraftRow[]
}

export interface CompliancePilotRow {
  id: string
  name: string
  operator_id: string
  status: PilotStatus
  license_no: string | null
  medical_expiry: string | null
}

export interface PilotComplianceSummary {
  total: number
  ok_count: number
  no_medical_count: number
  expired_medical_count: number
  expiring_30d_count: number
  expiring_60d_count: number
  expired_medical: CompliancePilotRow[]
  expiring_30d: CompliancePilotRow[]
  expiring_60d: CompliancePilotRow[]
  no_medical: CompliancePilotRow[]
}

export interface CreateOperatorBody {
  name: string
  company_registration_no?: string
  hq_city?: string
  cert_type?: string
  notes?: string
}

export interface UpdateOperatorBody {
  name?: string
  company_registration_no?: string
  hq_city?: string
  cert_type?: string
  insurance_expiry?: string
  cert_expiry?: string
  notes?: string
  payout_account_ref?: string
  commission_pct?: number | null
  site_visit_status?: string | null
}

export interface CreateAircraftBody {
  operator_id: string
  registration_mark: string
  seat_capacity: number
  aircraft_type_id?: string
  mtow_kg?: number
  range_nm?: number
  airworthiness_expiry?: string
  airworthiness_doc_url?: string
  notes?: string
}

export interface UpdateAircraftBody {
  registration_mark?: string
  aircraft_type_id?: string
  seat_capacity?: number
  mtow_kg?: number
  range_nm?: number
  airworthiness_expiry?: string
  airworthiness_doc_url?: string
  maintenance_windows?: MaintenanceWindow[]
  total_hours?: number
  notes?: string
}

export interface CreatePilotBody {
  operator_id: string
  name: string
  license_no?: string
  license_type?: string
  type_ratings?: string[]
  medical_expiry?: string
  notes?: string
}

export interface UpdatePilotBody {
  name?: string
  license_no?: string
  license_type?: string
  type_ratings?: string[]
  medical_expiry?: string
  notes?: string
}

// ── Operator Users ─────────────────────────────────────────────────────────────

export interface OperatorUser {
  id: string
  operator_id: string
  name: string
  email: string
  phone: string | null
  operator_role: string
  status: string
  twofa_enabled: boolean
  last_login_at: string | null
  created_at: string
}

export interface InviteUserBody {
  name: string
  email: string
  operator_role: string
  phone?: string
}

// ── Service ───────────────────────────────────────────────────────────────────

export const operatorService = {
  // ── Operators ──────────────────────────────────────────────────────────────
  listOperators: (params?: { status?: string; search?: string; page?: number; page_size?: number }) =>
    api.get<OperatorListResponse>('/operators', { params }).then(r => r.data),

  createOperator: (body: CreateOperatorBody) =>
    api.post<Operator>('/operators', body).then(r => r.data),

  getOperator: (id: string) =>
    api.get<OperatorDetail>(`/operators/${id}`).then(r => r.data),

  updateOperator: (id: string, body: UpdateOperatorBody) =>
    api.patch<Operator>(`/operators/${id}`, body).then(r => r.data),

  approveOperator: (id: string) =>
    api.post<Operator>(`/operators/${id}/approve`).then(r => r.data),

  rejectOperator: (id: string, body: { reason: string }) =>
    api.post<Operator>(`/operators/${id}/reject`, body).then(r => r.data),

  pauseOperator: (id: string, body?: { reason?: string }) =>
    api.post<Operator>(`/operators/${id}/pause`, body ?? {}).then(r => r.data),

  reactivateOperator: (id: string) =>
    api.post<Operator>(`/operators/${id}/reactivate`).then(r => r.data),

  configureCommission: (id: string, body: { commission_pct: number }) =>
    api.post<Operator>(`/operators/${id}/commission`, body).then(r => r.data),

  getPerformance: (id: string) =>
    api.get<OperatorPerformanceResponse>(`/operators/${id}/performance`).then(r => r.data),

  // ── Operator Documents ──────────────────────────────────────────────────────
  listDocuments: (operatorId: string) =>
    api.get<OperatorDocument[]>(`/operators/${operatorId}/documents`).then(r => r.data),

  addDocument: (operatorId: string, body: { doc_type: DocType; file_url: string; expires_at?: string }) =>
    api.post<OperatorDocument>(`/operators/${operatorId}/documents`, body).then(r => r.data),

  updateDocument: (operatorId: string, docId: string, body: { status: DocStatus; review_notes?: string }) =>
    api.patch<OperatorDocument>(`/operators/${operatorId}/documents/${docId}`, body).then(r => r.data),

  // ── Aircraft ────────────────────────────────────────────────────────────────
  listAircraft: (params?: { operator_id?: string; status?: string; search?: string; page?: number; page_size?: number }) =>
    api.get<AircraftListResponse>('/aircraft', { params }).then(r => r.data),

  createAircraft: (body: CreateAircraftBody) =>
    api.post<Aircraft>('/aircraft', body).then(r => r.data),

  getAircraft: (id: string) =>
    api.get<Aircraft>(`/aircraft/${id}`).then(r => r.data),

  updateAircraft: (id: string, body: UpdateAircraftBody) =>
    api.patch<Aircraft>(`/aircraft/${id}`, body).then(r => r.data),

  approveAircraft: (id: string) =>
    api.post<Aircraft>(`/aircraft/${id}/approve`).then(r => r.data),

  groundAircraft: (id: string, body: { reason: string }) =>
    api.post<Aircraft>(`/aircraft/${id}/ground`, body).then(r => r.data),

  ungroundAircraft: (id: string) =>
    api.post<Aircraft>(`/aircraft/${id}/unground`).then(r => r.data),

  setMaintenance: (id: string, body: { starts_at: string; ends_at: string; notes?: string }) =>
    api.post<Aircraft>(`/aircraft/${id}/maintenance`, body).then(r => r.data),

  // ── Pilots ──────────────────────────────────────────────────────────────────
  listPilots: (params?: { operator_id?: string; status?: string; search?: string; page?: number; page_size?: number }) =>
    api.get<PilotListResponse>('/pilots', { params }).then(r => r.data),

  createPilot: (body: CreatePilotBody) =>
    api.post<Pilot>('/pilots', body).then(r => r.data),

  getPilot: (id: string) =>
    api.get<Pilot>(`/pilots/${id}`).then(r => r.data),

  updatePilot: (id: string, body: UpdatePilotBody) =>
    api.patch<Pilot>(`/pilots/${id}`, body).then(r => r.data),

  approvePilot: (id: string) =>
    api.post<Pilot>(`/pilots/${id}/approve`).then(r => r.data),

  groundPilot: (id: string, body: { reason: string }) =>
    api.post<Pilot>(`/pilots/${id}/ground`, body).then(r => r.data),

  // ── Operator Users (team) ───────────────────────────────────────────────────
  listUsers: (operatorId: string) =>
    api.get<OperatorUser[]>(`/operators/${operatorId}/users`).then(r => r.data),

  inviteUser: (operatorId: string, body: InviteUserBody) =>
    api.post<OperatorUser>(`/operators/${operatorId}/users/invite`, body).then(r => r.data),

  resendInvite: (operatorId: string, userId: string) =>
    api.post(`/operators/${operatorId}/users/${userId}/resend-invite`).then(r => r.data),

  // ── Compliance summaries ────────────────────────────────────────────────────
  getAircraftCompliance: () =>
    api.get<AircraftComplianceSummary>('/aircraft/compliance').then(r => r.data),

  getPilotsCompliance: () =>
    api.get<PilotComplianceSummary>('/pilots/compliance').then(r => r.data),
}
