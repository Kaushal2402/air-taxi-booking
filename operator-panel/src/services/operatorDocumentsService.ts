import api from '../lib/axios'

export interface DocumentItem {
  id: string
  entity_type: 'company' | 'aircraft' | 'crew'
  entity_id: string
  entity_name: string
  doc_type: string
  status: 'approved' | 'under_review' | 'expiring_soon' | 'expired' | 'rejected' | 'pending'
  expiry_date: string | null
  days_left: number | null
  file_url: string | null
  uploaded_at: string | null
}

export interface ExpiryWatchlistItem {
  id: string
  entity_type: 'company' | 'aircraft' | 'crew'
  entity_name: string
  doc_type: string
  status: 'approved' | 'under_review' | 'expiring_soon' | 'expired' | 'rejected' | 'pending'
  expiry_date: string | null
  days_left: number | null
  file_url: string | null
}

export interface ComplianceCategoryStatus {
  label: string
  total: number
  approved: number
  issues: string[]
}

export interface ComplianceOverview {
  ready: boolean
  readiness_score: number
  blockers: string[]
  aircraft_status: ComplianceCategoryStatus
  crew_status: ComplianceCategoryStatus
  doc_status: ComplianceCategoryStatus
}

export interface UploadDocumentPayload {
  entity_type: 'company' | 'aircraft' | 'crew'
  entity_id: string
  doc_type: string
  expiry_date?: string
  file: File
}

export const operatorDocumentsService = {
  list: (entityType?: 'company' | 'aircraft' | 'crew') => {
    const params = entityType ? { entity_type: entityType } : {}
    return api.get<DocumentItem[]>('/operator/documents', { params }).then(r => r.data)
  },

  uploadDocument: (payload: UploadDocumentPayload) => {
    const form = new FormData()
    form.append('entity_type', payload.entity_type)
    form.append('entity_id', payload.entity_id)
    form.append('doc_type', payload.doc_type)
    if (payload.expiry_date) form.append('expiry_date', payload.expiry_date)
    form.append('file', payload.file)
    return api.post<DocumentItem>('/operator/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  getExpiryWatchlist: () =>
    api.get<ExpiryWatchlistItem[]>('/operator/documents/expiry-watchlist').then(r => r.data),

  getComplianceOverview: () =>
    api.get<ComplianceOverview>('/operator/documents/compliance-overview').then(r => r.data),
}
