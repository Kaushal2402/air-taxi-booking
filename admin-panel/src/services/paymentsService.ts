import api from '../lib/axios'

export interface PaymentListItem {
  id: string
  created_at: string
  customer_name: string
  customer_id: string
  booking_ref: string
  service: string
  method: string
  vpa: string | null
  gross_amount: number
  gateway_fee: number
  net_amount: number
  status: string
  gateway_ref: string | null
  currency: string
}

export interface PaymentKPIs {
  gross_volume: number
  net_revenue: number
  refunds_total: number
  chargebacks_total: number
  success_rate: number
}

export interface PaymentListResponse {
  items: PaymentListItem[]
  total: number
  page: number
  page_size: number
  kpis: PaymentKPIs
}

export interface BreakdownItem {
  label: string
  amount: number
  kind: string
}

export interface InstrumentDetail {
  method: string
  display: string
  bank: string | null
  sub_type: string | null
  verified: boolean
  risk_score: number | null
  avs_status: string | null
  three_ds: string | null
}

export interface TimelineEvent {
  event: string
  timestamp: string
  note: string
  status: string
}

export interface RefundSummary {
  id: string
  amount: number
  status: string
  reason: string
  created_at: string
}

export interface PaymentDetail extends PaymentListItem {
  breakdown: BreakdownItem[]
  instrument: InstrumentDetail
  timeline: TimelineEvent[]
  refunds: RefundSummary[]
}

export interface RefundRequest {
  refund_type: 'full' | 'partial'
  amount?: number
  reason: string
}

export interface RefundResponse {
  refund_id: string
  transaction_id: string
  amount: number
  status: string
  message: string
  created_at: string
}

export interface BookingSearchResult {
  booking_ref: string
  customer_id: string
  customer_name: string
  service: string
  gross_amount: number
}

export interface ManualEntryRequest {
  customer_name: string
  customer_id?: string
  booking_ref?: string
  service?: string
  method: string
  vpa?: string
  gross_amount: number
  gateway_fee?: number
  net_amount: number
  status?: string
  gateway_ref?: string
  currency?: string
  notes?: string
}

export interface ManualEntryResponse {
  id: string
  message: string
  created_at: string
}

export interface GatewaySummary {
  name: string
  ref: string
  expected_amount: number
  settled_amount: number
  variance: number
  match_pct: number
  status: string
}

export interface ReconciliationSummaryResponse {
  cycle_date: string
  total_variance: number
  unmatched_count: number
  gateways: GatewaySummary[]
}

export interface BatchItem {
  id: string
  gateway: string
  settlement_date: string
  transaction_count: number
  amount: number
  matched_count: number
  status: string
}

export interface BatchListResponse {
  items: BatchItem[]
  total: number
  page: number
  page_size: number
}

export interface UnmatchedItem {
  category: string
  count: number
  count_label: string
  amount: number
  note: string
  tone: string
}

export interface UnmatchedResponse {
  items: UnmatchedItem[]
}

export interface RerunMatchResponse {
  message: string
  matched_count: number
  unmatched_count: number
}

export interface ResolveAllResponse {
  message: string
  resolved_count: number
}

export const paymentsService = {
  listTransactions: (params: {
    page?: number
    page_size?: number
    search?: string
    method?: string
    status?: string
    gateway?: string
    service?: string
    date_from?: string
    date_to?: string
    customer_id?: string
  }) => api.get<PaymentListResponse>('/payments', { params }).then(r => r.data),

  searchBooking: (ref: string) =>
    api.get<BookingSearchResult>('/payments/booking-search', { params: { ref } }).then(r => r.data),

  createManualEntry: (body: ManualEntryRequest) =>
    api.post<ManualEntryResponse>('/payments', body).then(r => r.data),

  getTransaction: (txnId: string) =>
    api.get<PaymentDetail>(`/payments/${txnId}`).then(r => r.data),

  issueRefund: (txnId: string, body: RefundRequest) =>
    api.post<RefundResponse>(`/payments/${txnId}/refund`, body).then(r => r.data),

  getReconciliationSummary: () =>
    api.get<ReconciliationSummaryResponse>('/payments/reconciliation/summary').then(r => r.data),

  listSettlementBatches: (params?: { page?: number; page_size?: number; hours?: number }) =>
    api.get<BatchListResponse>('/payments/reconciliation/batches', { params }).then(r => r.data),

  listUnmatchedItems: () =>
    api.get<UnmatchedResponse>('/payments/reconciliation/unmatched').then(r => r.data),

  rerunMatch: () =>
    api.post<RerunMatchResponse>('/payments/reconciliation/rerun').then(r => r.data),

  resolveAll: () =>
    api.post<ResolveAllResponse>('/payments/reconciliation/resolve-all').then(r => r.data),
}
