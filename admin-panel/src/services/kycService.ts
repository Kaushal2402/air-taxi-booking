import api from '../lib/axios'

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface KycQueueItem {
  id: string
  entity_type: string       // "driver" | "operator" | "vehicle"
  entity_id: string
  entity_name: string
  doc_type: string
  status: string            // "pending" | "in_review" | "approved" | "rejected" | "expired"
  file_url: string | null
  expiry_date: string | null
  review_notes: string | null
  created_at: string
  age_seconds: number | null
}

export interface KycExpiryItem {
  id: string
  entity_type: string
  entity_id: string
  entity_name: string
  doc_type: string
  expiry_date: string
  days_until_expiry: number
  impact: string
  file_url: string | null
}

export interface KycReviewBody {
  action: 'approve' | 'reject' | 'request_reupload'
  expiry_date?: string | null
  reason?: string | null
}

export interface KycQueueResponse {
  items: KycQueueItem[]
  total: number
  page: number
  pages: number
}

// ── Service ───────────────────────────────────────────────────────────────────

export const kycService = {
  getQueue: (params?: { page?: number; page_size?: number; entity_type?: string; status?: string }) =>
    api.get<KycQueueResponse>('/kyc/queue', { params }).then(r => r.data),

  getExpiryWatchlist: (days?: number) =>
    api.get<KycExpiryItem[]>('/kyc/expiry-watchlist', { params: { days } }).then(r => r.data),

  reviewDriverDoc: (docId: string, body: KycReviewBody) =>
    api.patch<KycQueueItem>(`/kyc/driver-documents/${docId}/review`, body).then(r => r.data),

  reviewOperatorDoc: (docId: string, body: KycReviewBody) =>
    api.patch<KycQueueItem>(`/kyc/operator-documents/${docId}/review`, body).then(r => r.data),

  reviewVehicleDoc: (docId: string, body: KycReviewBody) =>
    api.patch<KycQueueItem>(`/kyc/vehicle-documents/${docId}/review`, body).then(r => r.data),
}
