import api from '../lib/axios'

export interface PrivacyRequest {
  id: string
  customer_id: string
  customer_name: string | null
  customer_email: string | null
  request_type: 'export' | 'deletion'
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  sla_due_at: string | null
  sla_breached: boolean
  auto_processed: boolean
  resolved_by: string | null
  resolution_note: string | null
  completed_at: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

export interface PrivacyRequestListResponse {
  items: PrivacyRequest[]
  total: number
  page: number
  per_page: number
}

export const privacyService = {
  /** Submit a data-export request on behalf of a customer */
  createExportRequest: (customerId: string, notes?: string) =>
    api.post<PrivacyRequest>(`/privacy/customers/${customerId}/export-request`, { notes }).then(r => r.data),

  /** Submit a deletion (right-to-be-forgotten) request on behalf of a customer */
  createDeletionRequest: (customerId: string, notes?: string) =>
    api.post<PrivacyRequest>(`/privacy/customers/${customerId}/deletion-request`, { notes }).then(r => r.data),

  /** List all privacy requests (admin queue) */
  listRequests: (params?: {
    status?: string
    request_type?: string
    customer_id?: string
    page?: number
    per_page?: number
  }) =>
    api.get<PrivacyRequestListResponse>('/privacy/requests', { params }).then(r => r.data),

  /** Get a single privacy request */
  getRequest: (requestId: string) =>
    api.get<PrivacyRequest>(`/privacy/requests/${requestId}`).then(r => r.data),

  /** Approve a request (admin) — executes export or anonymizes PII */
  approveRequest: (requestId: string, resolutionNote?: string) =>
    api.patch<PrivacyRequest>(`/privacy/requests/${requestId}/approve`, { resolution_note: resolutionNote }).then(r => r.data),

  /** Reject a request (admin) */
  rejectRequest: (requestId: string, resolutionNote?: string) =>
    api.patch<PrivacyRequest>(`/privacy/requests/${requestId}/reject`, { resolution_note: resolutionNote }).then(r => r.data),
}
