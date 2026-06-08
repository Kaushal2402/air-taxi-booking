import api from '../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CustomerSegment  = 'vip_corp' | 'loyalist' | 'frequent' | 'new' | 'regular'
export type CustomerStatus   = 'active' | 'suspended' | 'banned' | 'flagged'
export type WalletDirection  = 'credit' | 'debit'

export interface Customer {
  id: string
  seq_id: number
  customer_code: string       // "C-0042"
  name: string
  phone: string
  email: string
  city: string | null
  status: CustomerStatus
  computed_segment: CustomerSegment
  segment_override: CustomerSegment | null
  segment: CustomerSegment    // = segment_override ?? computed_segment
  wallet_balance_minor: number
  trips_count: number
  ltv_minor: number
  avg_fare_minor: number | null
  rating: number | null
  cancellation_rate: number
  last_active_at: string | null
  flag_reason: string | null
  joined_at: string
  created_at: string
  updated_at: string
}

export interface CustomerListResponse {
  items: Customer[]
  total: number
  page: number
  per_page: number
  segment_counts: Record<string, number>
}

export interface WalletTransaction {
  id: string
  customer_id: string
  direction: 'credit' | 'debit'
  amount_minor: number
  reason: string
  audit_note: string | null
  notify_push: boolean
  notify_sms: boolean
  notify_email: boolean
  created_by: string
  created_at: string
}

export interface WalletTransactionListResponse {
  items: WalletTransaction[]
  total: number
  page: number
  per_page: number
}

export interface WalletAdjustResponse {
  customer: Customer
  transaction: WalletTransaction
}

// ── Service ───────────────────────────────────────────────────────────────────

export const customerService = {
  listCustomers: (params?: {
    search?: string
    segment?: string
    status?: string
    city?: string
    page?: number
    per_page?: number
  }) =>
    api.get<CustomerListResponse>('/customers', { params }).then(r => r.data),

  createCustomer: (body: {
    name: string
    phone: string
    email: string
    city?: string
    segment_override?: string | null
  }) =>
    api.post<Customer>('/customers', body).then(r => r.data),

  getCustomer: (id: string) =>
    api.get<Customer>(`/customers/${id}`).then(r => r.data),

  updateCustomer: (
    id: string,
    body: Partial<{
      name: string
      phone: string
      email: string
      city: string | null
      segment_override: string | null
    }>,
  ) =>
    api.patch<Customer>(`/customers/${id}`, body).then(r => r.data),

  suspendCustomer: (id: string, reason: string) =>
    api.post<Customer>(`/customers/${id}/suspend`, { reason }).then(r => r.data),

  reactivateCustomer: (id: string) =>
    api.post<Customer>(`/customers/${id}/reactivate`, {}).then(r => r.data),

  flagCustomer: (id: string, reason: string) =>
    api.post<Customer>(`/customers/${id}/flag`, { reason }).then(r => r.data),

  unflagCustomer: (id: string) =>
    api.post<Customer>(`/customers/${id}/unflag`, {}).then(r => r.data),

  banCustomer: (id: string, reason: string) =>
    api.post<Customer>(`/customers/${id}/ban`, { reason }).then(r => r.data),

  adjustWallet: (
    id: string,
    body: {
      direction: string
      amount_minor: number
      reason: string
      audit_note?: string
      notify_push: boolean
      notify_sms: boolean
      notify_email: boolean
    },
  ) =>
    api.post<WalletAdjustResponse>(`/customers/${id}/wallet/adjust`, body).then(r => r.data),

  listWalletTransactions: (id: string, params?: { page?: number; per_page?: number }) =>
    api.get<WalletTransactionListResponse>(`/customers/${id}/wallet/transactions`, { params }).then(r => r.data),

  // Stub callers for future modules — used by detail tabs
  // These gracefully return null on 404/network error
  getCustomerBookings: async (id: string) => {
    try { return await api.get(`/bookings?customer_id=${id}`).then(r => r.data) }
    catch { return null }
  },
  getCustomerPayments: async (id: string) => {
    try { return await api.get(`/payments?customer_id=${id}`).then(r => r.data) }
    catch { return null }
  },
  getCustomerTickets: async (id: string) => {
    try { return await api.get(`/support/tickets?customer_id=${id}`).then(r => r.data) }
    catch { return null }
  },
}
