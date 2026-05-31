import api from '../lib/axios'

// ── Enums / literal types ─────────────────────────────────────────────────────

export type AirBookingStatus =
  | 'Requested'
  | 'Quote shared'
  | 'Confirmed'
  | 'Manifest locked'
  | 'Boarding'
  | 'Departed'
  | 'Arrived'
  | 'Completed'
  | 'Cancelled'
  | 'Refunded'
  | 'Rescheduled'

// ── Core entities ─────────────────────────────────────────────────────────────

export interface AirBookingListItem {
  id: string
  booking_ref: string
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  operator_id: string | null
  operator_name: string | null
  aircraft_id: string | null
  aircraft_registration: string | null
  service_subtype: string
  service_label: string
  route_from: string
  route_to: string
  pax_count: number
  etd: string
  scheduled_date: string | null
  status: AirBookingStatus
  fare_estimate_minor: number
  fare_final_minor: number | null
  payment_method: string | null
  flagged: boolean
  flag_reason: string | null
  created_at: string
  updated_at: string
}

export interface AirBookingTimelineEvent {
  id: string
  booking_id: string
  event: string
  message: string | null
  tone: 'ok' | 'warn' | 'info' | 'pending' | 'danger'
  created_at: string
}

export interface AirBookingNote {
  id: string
  booking_id: string
  note: string
  created_at: string
}

export interface AirBookingDetail extends AirBookingListItem {
  eta: string | null
  distance_nm: number | null
  flight_time_min: number | null
  fuel_weight_kg: number | null
  notes: string | null
  internal_reason: string | null
  reschedule_ref: string | null
  timeline: AirBookingTimelineEvent[]
  admin_notes: AirBookingNote[]
  manifest_locked: boolean
  manifest_locked_at: string | null
  operator_otp_pct: number | null
  operator_fleet_count: number | null
  aircraft_model: string | null
  aircraft_seats: number | null
  aircraft_mtow_kg: number | null
  aircraft_airworthy_until: string | null
  pilot_name: string | null
  pilot_license: string | null
  copilot_name: string | null
}

export interface AirBookingStats {
  in_air_count: number
  quote_pending_count: number
  manifest_open_count: number
  cancelled_7d_count: number
  refund_queue_count: number
  gross_revenue_minor: number
}

export interface AirBookingListResponse {
  items: AirBookingListItem[]
  total: number
  page: number
  pages: number
  stats: AirBookingStats
}

export interface ManifestPassenger {
  id: string
  booking_id: string
  seq: number
  name: string
  age: number | null
  id_number: string | null
  body_weight_kg: number
  baggage_weight_kg: number
  special_notes: string | null
  is_minor: boolean
}

export interface ManifestResponse {
  booking_id: string
  passengers: ManifestPassenger[]
  total_pax_weight_kg: number
  total_baggage_weight_kg: number
  aircraft_empty_weight_kg: number
  fuel_weight_kg: number
  total_weight_kg: number
  mtow_kg: number
  utilization_pct: number
  is_within_limits: boolean
  is_locked: boolean
}

export interface ManifestPassengerInput {
  id: string | null
  name: string
  age: number | null
  id_number: string | null
  body_weight_kg: number
  baggage_weight_kg: number
  special_notes: string | null
  is_minor: boolean
}

export interface ManifestUpdateBody {
  passengers: ManifestPassengerInput[]
}

export interface CharterQuote {
  id: string
  booking_id: string
  operator_id: string
  operator_name: string | null
  aircraft_registration: string | null
  aircraft_model: string | null
  pax_capacity: number | null
  range_nm: number | null
  depart_icao: string | null
  arrive_icao: string | null
  etd: string | null
  eta: string | null
  base_fare_minor: number
  positioning_minor: number
  night_halt_minor: number
  catering_minor: number
  fuel_surcharge_minor: number
  taxes_minor: number
  total_minor: number
  conditions: string | null
  otp_30d_pct: number | null
  score: number | null
  status: 'pending' | 'pushed' | 'accepted' | 'declined'
  is_recommended: boolean
  created_at: string
}

export interface QuotesListResponse {
  booking_id: string
  quotes: CharterQuote[]
}

export interface CancelPreviewResponse {
  booking_id: string
  fare_minor: number
  tier: string
  fee_pct: number
  cancel_fee_minor: number
  net_refund_minor: number
  hours_to_etd: number
  is_force_majeure_eligible: boolean
}

// ── Action body types ─────────────────────────────────────────────────────────

export interface AssignOperatorBody {
  operator_id: string
  aircraft_id: string
  note?: string | null
}

export interface CancelAirBookingBody {
  reason: string
  note?: string | null
  force_majeure?: boolean
  refund_destination: 'original' | 'wallet' | 'wire'
}

export interface RescheduleBody {
  new_etd: string
  reason: string
}

export interface RefundAirBookingBody {
  amount_minor: number
  destination: 'original' | 'wallet' | 'wire'
  reason: string
}

export interface FlagAirBookingBody {
  flagged: boolean
  flag_reason?: string | null
}

export interface AddAirNoteBody {
  note: string
}

export interface AdvanceAirStatusBody {
  status: 'Confirmed' | 'Manifest locked' | 'Boarding' | 'Departed' | 'Arrived' | 'Completed'
  note?: string | null
}

export interface CharterQuoteCreate {
  operator_id: string
  aircraft_id: string
  aircraft_registration: string
  aircraft_model: string
  pax_capacity: number
  range_nm: number
  depart_icao: string
  arrive_icao: string
  etd: string
  eta: string
  base_fare_minor: number
  positioning_minor: number
  night_halt_minor: number
  catering_minor: number
  fuel_surcharge_minor: number
  taxes_minor: number
  conditions?: string | null
  otp_30d_pct?: number | null
  score?: number | null
}

// ── Service ───────────────────────────────────────────────────────────────────

export const airBookingsService = {
  listBookings: (params?: {
    page?: number
    page_size?: number
    search?: string
    status?: string
    service_subtype?: string
    operator_id?: string
    date_from?: string
    date_to?: string
    flagged?: boolean
  }) =>
    api.get<AirBookingListResponse>('/bookings/air', { params }).then(r => r.data),

  getBooking: (id: string) =>
    api.get<AirBookingDetail>(`/bookings/air/${id}`).then(r => r.data),

  getCancelPreview: (id: string) =>
    api.get<CancelPreviewResponse>(`/bookings/air/${id}/cancel-preview`).then(r => r.data),

  assignOperator: (id: string, body: AssignOperatorBody) =>
    api.post<AirBookingDetail>(`/bookings/air/${id}/assign-operator`, body).then(r => r.data),

  cancelBooking: (id: string, body: CancelAirBookingBody) =>
    api.post<AirBookingDetail>(`/bookings/air/${id}/cancel`, body).then(r => r.data),

  rescheduleBooking: (id: string, body: RescheduleBody) =>
    api.post<AirBookingDetail>(`/bookings/air/${id}/reschedule`, body).then(r => r.data),

  processRefund: (id: string, body: RefundAirBookingBody) =>
    api.post<AirBookingDetail>(`/bookings/air/${id}/refund`, body).then(r => r.data),

  getManifest: (id: string) =>
    api.get<ManifestResponse>(`/bookings/air/${id}/manifest`).then(r => r.data),

  updateManifest: (id: string, body: ManifestUpdateBody) =>
    api.patch<ManifestResponse>(`/bookings/air/${id}/manifest`, body).then(r => r.data),

  lockManifest: (id: string) =>
    api.post<ManifestResponse>(`/bookings/air/${id}/manifest/lock`).then(r => r.data),

  listQuotes: (id: string) =>
    api.get<QuotesListResponse>(`/bookings/air/${id}/quotes`).then(r => r.data),

  createQuote: (id: string, body: CharterQuoteCreate) =>
    api.post<CharterQuote>(`/bookings/air/${id}/quotes`, body).then(r => r.data),

  pushQuote: (id: string, quoteId: string) =>
    api.post<AirBookingDetail>(`/bookings/air/${id}/quotes/${quoteId}/push`).then(r => r.data),

  declineQuote: (id: string, quoteId: string) =>
    api.post<CharterQuote>(`/bookings/air/${id}/quotes/${quoteId}/decline`).then(r => r.data),

  addNote: (id: string, body: AddAirNoteBody) =>
    api.post<AirBookingNote>(`/bookings/air/${id}/notes`, body).then(r => r.data),

  advanceStatus: (id: string, body: AdvanceAirStatusBody) =>
    api.post<AirBookingDetail>(`/bookings/air/${id}/advance-status`, body).then(r => r.data),

  flagBooking: (id: string, body: FlagAirBookingBody) =>
    api.patch<AirBookingDetail>(`/bookings/air/${id}/flag`, body).then(r => r.data),
}
