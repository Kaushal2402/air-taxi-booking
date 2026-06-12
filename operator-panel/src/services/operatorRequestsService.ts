import api from '../lib/axios'

export interface BookingRequest {
  id: string
  operator_id: string
  booking_ref: string
  service_subtype: string
  passenger_name: string | null
  passenger_org: string | null
  origin_name: string
  destination_name: string
  flight_date: string | null
  pax_count: number
  baggage_kg: number
  special_requests: string | null
  is_vip: boolean
  ttl_expires_at: string | null
  status: string
  reject_reason: string | null
  quote_id: string | null
  received_at: string
  actioned_at: string | null
  created_at: string
  updated_at: string
}

export const operatorRequestsService = {
  list: (status?: string) => {
    const params = status ? { status } : {}
    return api.get<BookingRequest[]>('/operator/requests', { params }).then(r => r.data)
  },
  get: (id: string) => api.get<BookingRequest>(`/operator/requests/${id}`).then(r => r.data),
  accept: (id: string) =>
    api.post<BookingRequest>(`/operator/requests/${id}/accept`).then(r => r.data),
  reject: (id: string, reason: string) =>
    api.post<BookingRequest>(`/operator/requests/${id}/reject`, { reason }).then(r => r.data),
  attachQuote: (id: string, quoteId: string) =>
    api.post<BookingRequest>(`/operator/requests/${id}/quote`, { quote_id: quoteId }).then(r => r.data),
}
