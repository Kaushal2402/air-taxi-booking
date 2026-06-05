import api from '../lib/axios'

// ── Enums / literal types ─────────────────────────────────────────────────────

export type BookingStatus =
  | 'Requested'
  | 'Accepted'
  | 'Arrived'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled'
  | 'Disputed'
  | 'Refunded'
  | 'Scheduled'

// ── Core entities ─────────────────────────────────────────────────────────────

export interface RoadBookingListItem {
  id: string
  booking_ref: string
  customer_id: string
  customer_name: string
  driver_id: string | null
  driver_name: string | null
  service_type: string
  vehicle_class: string | null
  pickup_address: string
  pickup_lat: number | null
  pickup_lng: number | null
  drop_address: string
  drop_lat: number | null
  drop_lng: number | null
  status: BookingStatus
  fare_estimate_minor: number
  fare_final_minor: number | null
  payment_method: string
  flagged: boolean
  flag_reason: string | null
  scheduled_at: string | null
  created_at: string
  updated_at: string
}

export interface TimelineEvent {
  id: string
  booking_id: string
  event: string
  message: string | null
  tone: 'ok' | 'warn' | 'info' | 'pending' | 'danger'
  created_at: string
}

export interface FareComponent {
  label: string
  rule_ref: string | null
  amount_minor: number
}

export interface AdminNote {
  id: string
  booking_id: string
  note: string
  created_at: string
}

export interface DisputeResponse {
  id: string
  dispute_ref: string
  booking_id: string
  reason: string
  note: string | null
  priority: 'high' | 'medium' | 'low'
  stage: 'open' | 'in_review' | 'awaiting_driver' | 'awaiting_finance' | 'resolved' | 'closed'
  action: string | null
  refund_amount_minor: number | null
  driver_clawback_minor: number | null
  resolution_note: string | null
  created_at: string
  updated_at: string
}

export interface RoadBookingDetail extends RoadBookingListItem {
  pickup_lat: number | null
  pickup_lng: number | null
  drop_lat: number | null
  drop_lng: number | null
  distance_km: number | null
  duration_min: number | null
  surge_multiplier: number
  promo_code: string | null
  promo_discount_minor: number
  internal_reason: string | null
  admin_notes: AdminNote[]
  timeline: TimelineEvent[]
  fare_components: FareComponent[]
  dispute: DisputeResponse | null
  driver_vehicle_plate: string | null
  driver_vehicle_model: string | null
  customer_phone: string | null
  customer_ride_count: number
  customer_rating: number | null
}

export interface BookingStats {
  live_count: number
  scheduled_count: number
  cancelled_today: number
  disputed_count: number
  refund_pending_count: number
  gross_revenue_minor: number
}

export interface BookingListResponse {
  items: RoadBookingListItem[]
  total: number
  page: number
  pages: number
  stats: BookingStats
}

export interface DisputeListItem {
  id: string
  dispute_ref: string
  booking_id: string
  booking_ref: string
  customer_name: string
  reason: string
  disputed_amount_minor: number
  priority: 'high' | 'medium' | 'low'
  stage: string
  created_at: string
}

export interface DisputeListResponse {
  items: DisputeListItem[]
  total: number
  page: number
  pages: number
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

export interface GpsPoint {
  lat: number
  lng: number
  ts: string
}

export interface BookingTelemetry {
  booking_id: string
  pickup_lat: number
  pickup_lng: number
  drop_lat: number
  drop_lng: number
  gps_points: GpsPoint[]
  distance_expected_km: number
  distance_actual_km: number
  avg_speed_kmh: number
}

// ── Action request types ──────────────────────────────────────────────────────

export interface CancelBookingBody {
  reason: string
  note?: string | null
  refund_destination: 'original' | 'wallet' | 'none'
  override_fee_minor?: number | null
}

export interface ReassignBody {
  driver_id: string
  reason: string
}

export interface AdjustFareBody {
  new_fare_minor: number
  reason: string
}

export interface RefundBody {
  amount_minor: number
  destination: 'original' | 'wallet'
  reason: string
}

export interface OpenDisputeBody {
  reason: string
  note?: string | null
}

export interface ResolveDisputeBody {
  action: 'partial_refund' | 'full_refund' | 'uphold_fare' | 'goodwill_credit'
  refund_amount_minor?: number | null
  driver_clawback_minor?: number | null
  resolution_note: string
}

export interface FlagBookingBody {
  flagged: boolean
  flag_reason?: string | null
}

export interface AddNoteBody {
  note: string
}

export interface AdvanceStatusBody {
  status: 'Accepted' | 'Arrived' | 'InProgress' | 'Completed' | 'Cancelled'
  note?: string | null
}

export interface AdminNoteResponse {
  id: string
  booking_id: string
  note: string
  created_at: string
}

export interface CancelPreview {
  booking_id: string
  fare_minor: number
  cancel_fee_minor: number
  net_refund_minor: number
  is_free_window: boolean
  free_window_min: number
  fee_pct: number
  policy: string
}

export interface AssistedBookingCreate {
  customer_id: string
  pickup_address: string
  pickup_lat?: number | null
  pickup_lng?: number | null
  drop_address: string
  drop_lat?: number | null
  drop_lng?: number | null
  service_type: string
  vehicle_class: string
  scheduled_at?: string | null
  payment_method: string
  promo_code?: string | null
  fare_estimate_minor: number
  internal_reason: string
  admin_note?: string | null
}

// ── Service ───────────────────────────────────────────────────────────────────

export const bookingsService = {
  listBookings: (params?: {
    page?: number
    page_size?: number
    per_page?: number
    search?: string
    status?: string
    service_type?: string
    date_from?: string
    date_to?: string
    flagged?: boolean
    payment_method?: string
    customer_id?: string
  }) =>
    api.get<BookingListResponse>('/bookings/road', { params }).then(r => r.data),

  getBooking: (id: string) =>
    api.get<RoadBookingDetail>(`/bookings/road/${id}`).then(r => r.data),

  createAssistedBooking: (body: AssistedBookingCreate) =>
    api.post<RoadBookingDetail>('/bookings/road', body).then(r => r.data),

  getCancelPreview: (id: string) =>
    api.get<CancelPreview>(`/bookings/road/${id}/cancel-preview`).then(r => r.data),

  cancelBooking: (id: string, body: CancelBookingBody) =>
    api.post<RoadBookingDetail>(`/bookings/road/${id}/cancel`, body).then(r => r.data),

  reassignDriver: (id: string, body: ReassignBody) =>
    api.post<RoadBookingDetail>(`/bookings/road/${id}/reassign`, body).then(r => r.data),

  adjustFare: (id: string, body: AdjustFareBody) =>
    api.post<RoadBookingDetail>(`/bookings/road/${id}/adjust-fare`, body).then(r => r.data),

  processRefund: (id: string, body: RefundBody) =>
    api.post<RoadBookingDetail>(`/bookings/road/${id}/refund`, body).then(r => r.data),

  openDispute: (id: string, body: OpenDisputeBody) =>
    api.post<DisputeResponse>(`/bookings/road/${id}/dispute`, body).then(r => r.data),

  resolveDispute: (id: string, body: ResolveDisputeBody) =>
    api.post<DisputeResponse>(`/bookings/road/${id}/dispute/resolve`, body).then(r => r.data),

  addNote: (id: string, body: AddNoteBody) =>
    api.post<AdminNoteResponse>(`/bookings/road/${id}/notes`, body).then(r => r.data),

  flagBooking: (id: string, body: FlagBookingBody) =>
    api.patch<RoadBookingDetail>(`/bookings/road/${id}/flag`, body).then(r => r.data),

  getTelemetry: (id: string) =>
    api.get<BookingTelemetry>(`/bookings/road/${id}/telemetry`).then(r => r.data),

  advanceStatus: (id: string, body: AdvanceStatusBody) =>
    api.post<RoadBookingDetail>(`/bookings/road/${id}/advance-status`, body).then(r => r.data),

  listDisputes: (params?: {
    page?: number
    page_size?: number
    search?: string
    stage?: string
    priority?: string
  }) =>
    api.get<DisputeListResponse>('/bookings/road/disputes', { params }).then(r => r.data),
}
