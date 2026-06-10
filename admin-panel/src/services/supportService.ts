import api from '../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Ticket {
  id: string
  ticket_ref: string
  requester_type: 'customer' | 'driver' | 'operator'
  requester_id: string
  requester_name: string
  category: string
  priority: 'urgent' | 'high' | 'med' | 'low'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assignee_id: string | null
  assignee_name: string | null
  sla_due_at: string | null
  sla_breached: boolean
  linked_booking_id: string | null
  linked_booking_type: 'road' | 'air' | null
  linked_transaction_id: string | null
  subject: string
  created_at: string
  updated_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  kind: 'reply' | 'internal_note'
  author_id: string
  author_name: string
  author_role: string
  body: string
  created_at: string
}

export interface TicketDetail extends Ticket {
  messages: TicketMessage[]
  resolution_code: string | null
  resolution_note: string | null
  resolved_at: string | null
  escalated_at: string | null
}

export interface SlaPolicy {
  id: string
  category: string
  urgent_first_response_minutes: number
  urgent_resolution_minutes: number
  high_first_response_minutes: number
  high_resolution_minutes: number
  med_first_response_minutes: number
  med_resolution_minutes: number
  low_first_response_minutes: number
  low_resolution_minutes: number
  created_at: string
  updated_at: string
}

export interface TicketListResponse {
  items: Ticket[]
  total: number
  page: number
  page_size: number
}

export interface TicketCreatePayload {
  requester_type: string
  requester_id: string
  requester_name: string
  category: string
  priority: string
  subject: string
  body: string
  linked_booking_id?: string
  linked_booking_type?: 'road' | 'air'
  linked_transaction_id?: string
}

export interface SlaPolicyCreatePayload {
  category: string
  urgent_first_response_minutes: number
  urgent_resolution_minutes: number
  high_first_response_minutes: number
  high_resolution_minutes: number
  med_first_response_minutes: number
  med_resolution_minutes: number
  low_first_response_minutes: number
  low_resolution_minutes: number
}

export interface TicketListParams {
  page?: number
  page_size?: number
  category?: string
  priority?: string
  status?: string
  assignee_id?: string
  sla_breach?: boolean
  search?: string
  requester_id?: string
}

export interface SupportStats {
  open_count: number
  in_progress_count: number
  breaching_count: number
  due_in_1h_count: number
  median_first_reply_seconds: number | null
  total_tickets_30d: number
}

// ── Service ───────────────────────────────────────────────────────────────────

export const supportService = {
  listTickets: (params: TicketListParams) =>
    api.get<TicketListResponse>('/support/tickets', { params }).then(r => r.data),

  getTicket: (id: string) =>
    api.get<TicketDetail>(`/support/tickets/${id}`).then(r => r.data),

  createTicket: (body: TicketCreatePayload) =>
    api.post<TicketDetail>('/support/tickets', body).then(r => r.data),

  assignTicket: (id: string, assignee_id: string) =>
    api.post(`/support/tickets/${id}/assign`, { assignee_id }).then(r => r.data),

  addMessage: (id: string, kind: string, body: string) =>
    api.post<TicketMessage>(`/support/tickets/${id}/messages`, { kind, body }).then(r => r.data),

  resolveTicket: (id: string, resolution_code: string, resolution_note?: string) =>
    api.post(`/support/tickets/${id}/resolve`, { resolution_code, resolution_note }).then(r => r.data),

  escalateTicket: (id: string, reason: string) =>
    api.post(`/support/tickets/${id}/escalate`, { reason }).then(r => r.data),

  listSlaPolicies: () =>
    api.get<SlaPolicy[]>('/support/sla-policies').then(r => r.data),

  updateSlaPolicy: (id: string, body: Partial<SlaPolicy>) =>
    api.patch<SlaPolicy>(`/support/sla-policies/${id}`, body).then(r => r.data),

  createSlaPolicy: (body: SlaPolicyCreatePayload) =>
    api.post<SlaPolicy>('/support/sla-policies', body).then(r => r.data),

  updateTicketStatus: (
    id: string,
    status: string,
    resolution_code?: string,
    resolution_note?: string,
  ) =>
    api.post(`/support/tickets/${id}/status`, { status, resolution_code, resolution_note })
       .then(r => r.data),

  getStats: () =>
    api.get<SupportStats>('/support/stats').then(r => r.data),

  updateTicketBookingType: (id: string, booking_type: 'road' | 'air' | null) =>
    api.patch(`/support/tickets/${id}`, { linked_booking_type: booking_type }).then(r => r.data),
}
