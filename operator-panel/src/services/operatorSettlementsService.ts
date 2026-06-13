import api from '../lib/axios'

export interface SettlementSummary {
  id: string
  period_label: string
  period_start: string
  period_end: string
  gross_amount: number
  commission_amount: number
  deduction_amount: number
  net_amount: number
  status: 'pending' | 'processing' | 'paid' | 'disputed' | 'on_hold'
  payout_date: string | null
  payout_ref: string | null
  created_at: string
}

export interface SettlementLineItem {
  id: string
  settlement_id: string
  flight_date: string
  route: string
  booking_ref: string
  gross_amount: number
  commission_amount: number
  deduction_amount: number
  net_amount: number
}

export interface SettlementQuery {
  id: string
  settlement_id: string
  query_text: string
  status: 'open' | 'resolved'
  created_at: string
  resolved_at: string | null
  response: string | null
}

export interface SettlementDetail extends SettlementSummary {
  line_items: SettlementLineItem[]
  bank_last4: string | null
  bank_account_name: string | null
  queries: SettlementQuery[]
}

export interface SettlementsKPI {
  total_earned: number
  pending_payout: number
  disputed: number
  next_payout_date: string | null
}

export const operatorSettlementsService = {
  list: () =>
    api.get<{ kpi: SettlementsKPI; settlements: SettlementSummary[] }>('/operator/settlements').then(r => r.data),

  getDetail: (id: string) =>
    api.get<SettlementDetail>(`/operator/settlements/${id}`).then(r => r.data),

  exportSettlement: (id: string) =>
    api.get(`/operator/settlements/${id}/export`, { responseType: 'blob' }).then(r => r.data),

  raiseQuery: (id: string, queryText: string) =>
    api.post<SettlementQuery>(`/operator/settlements/${id}/queries`, { query_text: queryText }).then(r => r.data),
}
