import api from '../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export type DriverStatus   = 'pending' | 'in_review' | 'approved' | 'active' | 'suspended' | 'deactivated' | 'rejected'
export type OnlineStatus   = 'online' | 'offline'
export type KycStatus      = 'pending' | 'approved' | 'expiring' | 'rejected'
export type OnboardStage   = 'signup' | 'docs' | 'review' | 'background' | 'approved'
export type DocType        = string   // region-specific; fetch valid values from GET /kyc/doc-types
export type DocStatus      = 'pending' | 'ok' | 'rejected' | 'expired'
export type WalletDirection = 'credit' | 'debit'

export interface Driver {
  id: string
  seq_id: number | null
  driver_code: string | null
  name: string
  phone: string
  email: string | null
  city: string | null
  zone_code: string | null
  vehicle_class: string | null
  vehicle_plate: string | null
  status: DriverStatus
  online_status: OnlineStatus
  kyc_status: KycStatus
  stage: OnboardStage
  rating: number | null
  acceptance_rate: number | null
  cancellation_rate: number
  trips_count: number
  wallet_balance_minor: number
  flag_reason: string | null
  joined_at: string
  created_at: string
  updated_at: string
}

export interface DriverDocument {
  id: string
  driver_id: string
  doc_type: DocType
  status: DocStatus
  doc_number: string | null
  expiry_date: string | null
  image_url: string | null
  review_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface DriverListResponse {
  items: Driver[]
  total: number
  page: number
  per_page: number
  status_counts: Record<string, number>
}

export interface OnboardingDriverItem extends Driver {
  documents: DriverDocument[]
  doc_progress: number
  sla_status: 'ok' | 'warn' | 'danger'
  submitted_at: string
}

export interface OnboardingQueueResponse {
  items: OnboardingDriverItem[]
  total: number
  stats: Record<string, number>
}

export interface DriverWalletTransaction {
  id: string
  driver_id: string
  direction: WalletDirection
  amount_minor: number
  reason: string
  audit_note: string | null
  created_by: string
  created_at: string
}

export interface DriverWalletAdjustResponse {
  driver: Driver
  transaction: DriverWalletTransaction
}

export interface DriverWalletTransactionListResponse {
  items: DriverWalletTransaction[]
  total: number
  page: number
  per_page: number
}

// ── Service ───────────────────────────────────────────────────────────────────

export const driverService = {
  listDrivers: (params?: {
    search?: string
    status?: string
    online_status?: string
    vehicle_class?: string
    zone_code?: string
    kyc_status?: string
    min_rating?: number
    include_inactive?: boolean
    page?: number
    per_page?: number
  }) =>
    api.get<DriverListResponse>('/drivers', { params }).then(r => r.data),

  getOnboardingQueue: (params?: {
    search?: string
    stage?: string
    vehicle_class?: string
    zone_code?: string
    missing_doc?: string
  }) =>
    api.get<OnboardingQueueResponse>('/drivers/onboarding', { params }).then(r => r.data),

  getDriver: (id: string) =>
    api.get<Driver>(`/drivers/${id}`).then(r => r.data),

  updateDriver: (id: string, body: Partial<Driver>) =>
    api.patch<Driver>(`/drivers/${id}`, body).then(r => r.data),

  approveDriver: (id: string) =>
    api.post<Driver>(`/drivers/${id}/approve`).then(r => r.data),

  rejectDriver: (id: string, reason: string) =>
    api.post<Driver>(`/drivers/${id}/reject`, { reason }).then(r => r.data),

  suspendDriver: (id: string, reason: string) =>
    api.post<Driver>(`/drivers/${id}/suspend`, { reason }).then(r => r.data),

  reactivateDriver: (id: string) =>
    api.post<Driver>(`/drivers/${id}/reactivate`).then(r => r.data),

  deactivateDriver: (id: string, reason: string) =>
    api.post<Driver>(`/drivers/${id}/deactivate`, { reason }).then(r => r.data),

  forceOffline: (id: string) =>
    api.post<Driver>(`/drivers/${id}/force-offline`).then(r => r.data),

  getDocuments: (id: string) =>
    api.get<{ items: DriverDocument[] }>(`/drivers/${id}/documents`).then(r => r.data),

  reviewDocument: (
    id: string,
    docId: string,
    body: { action: string; expiry_date?: string | null; review_note?: string | null },
  ) =>
    api.patch<DriverDocument>(`/drivers/${id}/documents/${docId}`, body).then(r => r.data),

  getWalletTransactions: (id: string, params?: { page?: number; per_page?: number }) =>
    api.get<DriverWalletTransactionListResponse>(`/drivers/${id}/wallet/transactions`, { params }).then(r => r.data),

  createDriver: (body: { name: string; phone: string; email?: string; city?: string; zone_code?: string; vehicle_class?: string; vehicle_plate?: string }) =>
    api.post<Driver>('/drivers', body).then(r => r.data),

  createDocument: (id: string, body: { doc_type: DocType; doc_number?: string; expiry_date?: string }) =>
    api.post<DriverDocument>(`/drivers/${id}/documents`, body).then(r => r.data),

  getTrips: (id: string) =>
    api.get<{ items: unknown[]; total: number; message: string }>(`/drivers/${id}/trips`).then(r => r.data),

  getEarnings: (id: string) =>
    api.get<{ items: unknown[]; total: number; message: string }>(`/drivers/${id}/earnings`).then(r => r.data),

  adjustWallet: (
    id: string,
    body: { direction: WalletDirection; amount_minor: number; reason: string; audit_note?: string },
  ) =>
    api.post<DriverWalletAdjustResponse>(`/drivers/${id}/wallet/adjust`, body).then(r => r.data),

  uploadDocumentImage: (id: string, docId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<DriverDocument>(`/drivers/${id}/documents/${docId}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}
