import api from '../lib/axios'

// ── Enums ─────────────────────────────────────────────────────────────────────

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

export type ServiceSubtype = 'helicopter_shuttle' | 'helicopter_on_demand' | 'charter' | 'vip'

export type PaymentMethod = 'card' | 'wire' | 'corporate_po' | 'upi' | 'wallet'

export type RefundDestination = 'original' | 'wallet' | 'wire'

export type QuoteStatus = 'pending' | 'pushed' | 'accepted' | 'declined'

export type TimelineTone = 'ok' | 'warn' | 'info' | 'pending' | 'danger'

// ── Core interfaces ────────────────────────────────────────────────────────────

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
  service_subtype: ServiceSubtype
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
  status: QuoteStatus
  is_recommended: boolean
  created_at: string
}

export interface AirBookingNote {
  id: string
  booking_id: string
  note: string
  created_at: string
}

export interface AirBookingTimelineEvent {
  id: string
  booking_id: string
  event: string
  message: string | null
  tone: TimelineTone
  created_at: string
}

export interface AirBookingStats {
  in_air_count: number
  quote_pending_count: number
  manifest_open_count: number
  cancelled_7d_count: number
  refund_queue_count: number
  gross_revenue_minor: number
}

export interface PaginatedAirBookings {
  items: AirBookingListItem[]
  total: number
  page: number
  pages: number
  stats: AirBookingStats
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

// ── Request types ─────────────────────────────────────────────────────────────

export interface ListAirBookingsParams {
  page?: number
  page_size?: number
  search?: string
  status?: string
  service_subtype?: string
  operator_id?: string
  date_from?: string
  date_to?: string
  flagged?: boolean
}

export interface AssignOperatorRequest {
  operator_id: string
  aircraft_id: string
  note?: string
}

export interface CancelBookingRequest {
  reason: string
  note?: string
  force_majeure: boolean
  refund_destination: RefundDestination
}

export interface RescheduleBookingRequest {
  new_etd: string
  reason: string
}

export interface ProcessRefundRequest {
  amount_minor: number
  destination: RefundDestination
  reason: string
}

export interface ManifestPassengerInput {
  id?: string | null
  name: string
  age?: number | null
  id_number?: string | null
  body_weight_kg: number
  baggage_weight_kg: number
  special_notes?: string | null
  is_minor?: boolean
}

export interface UpdateManifestRequest {
  passengers: ManifestPassengerInput[]
}

export interface AddQuoteRequest {
  operator_id: string
  aircraft_id: string
  aircraft_registration?: string
  aircraft_model?: string
  pax_capacity?: number
  range_nm?: number
  depart_icao?: string
  arrive_icao?: string
  etd?: string
  eta?: string
  base_fare_minor: number
  positioning_minor: number
  night_halt_minor: number
  catering_minor: number
  fuel_surcharge_minor: number
  taxes_minor: number
  conditions?: string
  otp_30d_pct?: number
  score?: number
}

export interface AddNoteRequest {
  note: string
}

export interface AdvanceStatusRequest {
  status: string
  note?: string
}

export interface FlagBookingRequest {
  flagged: boolean
  flag_reason: string | null
}

export interface QuotesResponse {
  booking_id: string
  quotes: CharterQuote[]
}

export interface AirBookingNoteResponse {
  id: string
  booking_id: string
  note: string
  created_at: string
}

// ── Service ───────────────────────────────────────────────────────────────────

export const airBookingsService = {
  listAirBookings: (params?: ListAirBookingsParams) =>
    api.get<PaginatedAirBookings>('/bookings/air', { params }).then(r => r.data),

  getAirBooking: (id: string) =>
    api.get<AirBookingDetail>(`/bookings/air/${id}`).then(r => r.data),

  assignOperator: (id: string, req: AssignOperatorRequest) =>
    api.post<AirBookingDetail>(`/bookings/air/${id}/assign-operator`, req).then(r => r.data),

  cancelBooking: (id: string, req: CancelBookingRequest) =>
    api.post<AirBookingDetail>(`/bookings/air/${id}/cancel`, req).then(r => r.data),

  getCancelPreview: (id: string) =>
    api.get<CancelPreviewResponse>(`/bookings/air/${id}/cancel-preview`).then(r => r.data),

  rescheduleBooking: (id: string, req: RescheduleBookingRequest) =>
    api.post<AirBookingDetail>(`/bookings/air/${id}/reschedule`, req).then(r => r.data),

  processRefund: (id: string, req: ProcessRefundRequest) =>
    api.post<AirBookingDetail>(`/bookings/air/${id}/refund`, req).then(r => r.data),

  getManifest: (id: string) =>
    api.get<ManifestResponse>(`/bookings/air/${id}/manifest`).then(r => r.data),

  updateManifest: (id: string, req: UpdateManifestRequest) =>
    api.patch<ManifestResponse>(`/bookings/air/${id}/manifest`, req).then(r => r.data),

  lockManifest: (id: string) =>
    api.post<ManifestResponse>(`/bookings/air/${id}/manifest/lock`).then(r => r.data),

  listQuotes: (id: string) =>
    api.get<QuotesResponse>(`/bookings/air/${id}/quotes`).then(r => r.data),

  addQuote: (id: string, req: AddQuoteRequest) =>
    api.post<CharterQuote>(`/bookings/air/${id}/quotes`, req).then(r => r.data),

  pushQuote: (id: string, quoteId: string) =>
    api.post<AirBookingDetail>(`/bookings/air/${id}/quotes/${quoteId}/push`).then(r => r.data),

  declineQuote: (id: string, quoteId: string) =>
    api.post<CharterQuote>(`/bookings/air/${id}/quotes/${quoteId}/decline`).then(r => r.data),

  addNote: (id: string, req: AddNoteRequest) =>
    api.post<AirBookingNoteResponse>(`/bookings/air/${id}/notes`, req).then(r => r.data),

  advanceStatus: (id: string, req: AdvanceStatusRequest) =>
    api.post<AirBookingDetail>(`/bookings/air/${id}/advance-status`, req).then(r => r.data),

  flagBooking: (id: string, req: FlagBookingRequest) =>
    api.patch<AirBookingDetail>(`/bookings/air/${id}/flag`, req).then(r => r.data),

  createAirBooking: (req: CreateAirBookingRequest) =>
    api.post<AirBookingDetail>('/bookings/air', req).then(r => r.data),
}

export interface CreateAirBookingRequest {
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  service_subtype: string
  route_from: string
  route_to: string
  pax_count: number
  etd: string
  fare_estimate_minor?: number
  payment_method?: string
  operator_id?: string
  aircraft_id?: string
  internal_reason?: string
  notes?: string
}
