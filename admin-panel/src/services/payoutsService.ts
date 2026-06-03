import api from '../lib/axios'

export type PayoutRunStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'processing' | 'paid' | 'failed' | 'cancelled'
export type PayoutRunType = 'driver_weekly' | 'operator_monthly' | 'referral' | 'vendor'
export type PayeeStatus = 'pending' | 'ready' | 'hold' | 'bank_fail' | 'paid' | 'cancelled'
export type AdjustmentType = 'deduction' | 'addition' | 'clawback' | 'penalty'

export interface PayoutRun {
  id: string
  run_ref: string
  run_type: PayoutRunType
  status: PayoutRunStatus
  period_label: string
  period_start: string | null
  period_end: string | null
  payee_count: number
  gross_amount: number
  deduction_amount: number
  hold_amount: number
  net_amount: number
  scheduled_at: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PayoutRunListResponse {
  items: PayoutRun[]
  total: number
  page: number
  page_size: number
}

export interface PayoutAdjustment {
  id: string
  adjustment_type: AdjustmentType
  description: string
  amount: number
  reference: string | null
  created_at: string
}

export interface PayoutPayee {
  id: string
  run_id: string
  entity_type: string
  entity_id: string
  entity_name: string
  entity_ref: string | null
  trip_count: number
  gross_amount: number
  incentive_amount: number
  deduction_amount: number
  hold_amount: number
  net_amount: number
  status: PayeeStatus
  bank_account_ref: string | null
  utr_number: string | null
  paid_at: string | null
  hold_reason: string | null
  created_at: string
  updated_at: string
  adjustments: PayoutAdjustment[]
}

export interface PayoutPayeeListResponse {
  items: PayoutPayee[]
  total: number
  page: number
  page_size: number
}

export interface CreatePayoutRun {
  run_type: PayoutRunType
  period_label: string
  period_start?: string | null
  period_end?: string | null
  notes?: string
}

export const payoutsService = {
  listRuns: (params?: {
    page?: number
    page_size?: number
    status?: string
    run_type?: string
    search?: string
  }) => api.get<PayoutRunListResponse>('/payouts/runs', { params }).then(r => r.data),

  getRun: (id: string) =>
    api.get<PayoutRun>(`/payouts/runs/${id}`).then(r => r.data),

  createRun: (body: CreatePayoutRun) =>
    api.post<PayoutRun>('/payouts/runs', body).then(r => r.data),

  updateRun: (id: string, body: Partial<PayoutRun>) =>
    api.patch<PayoutRun>(`/payouts/runs/${id}`, body).then(r => r.data),

  approveRun: (id: string, notes?: string) =>
    api.post<PayoutRun>(`/payouts/runs/${id}/approve`, { notes }).then(r => r.data),

  rejectRun: (id: string, reason: string) =>
    api.post<PayoutRun>(`/payouts/runs/${id}/reject`, { reason }).then(r => r.data),

  deleteRun: (id: string) =>
    api.delete(`/payouts/runs/${id}`).then(r => r.data),

  listPayees: (runId: string, params?: {
    page?: number
    page_size?: number
    status?: string
    search?: string
  }) => api.get<PayoutPayeeListResponse>(`/payouts/runs/${runId}/payees`, { params }).then(r => r.data),

  getPayee: (payeeId: string) =>
    api.get<PayoutPayee>(`/payouts/payees/${payeeId}`).then(r => r.data),

  updatePayee: (payeeId: string, body: Partial<PayoutPayee>) =>
    api.patch<PayoutPayee>(`/payouts/payees/${payeeId}`, body).then(r => r.data),

  addAdjustment: (payeeId: string, body: {
    adjustment_type: AdjustmentType
    description: string
    amount: number
    reference?: string
  }) => api.post<PayoutAdjustment>(`/payouts/payees/${payeeId}/adjustments`, body).then(r => r.data),
}
