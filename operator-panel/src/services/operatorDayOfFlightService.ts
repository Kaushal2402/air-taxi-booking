import api from '../lib/axios'

export interface DayFlightCard {
  id: string
  booking_ref: string
  origin_name: string
  destination_name: string
  status: string
  progress_pct: number
  etd: string | null
  eta: string | null
  pilot_name: string | null
  copilot_name: string | null
  aircraft_reg: string | null
  aircraft_type: string | null
  is_delayed: boolean
  delay_minutes: number | null
  pax_count: number
}

export interface FlightEvent {
  id: string
  flight_id: string
  booking_ref: string
  event_type: string
  message: string
  created_at: string
  created_by: string | null
}

export interface DayBoardData {
  flights: DayFlightCard[]
  events: FlightEvent[]
}

export interface Telemetry {
  altitude_ft: number | null
  speed_kts: number | null
  heading_deg: number | null
  last_acars: string | null
  eta_updated: string | null
}

export interface PassengerSummary {
  total: number
  checked_in: number
  baggage_kg: number
  all_checked: boolean
}

export interface CrewCommsMessage {
  id: string
  sender: string
  message: string
  sent_at: string
  is_ops: boolean
}

export interface FlightDetail {
  id: string
  booking_ref: string
  origin_name: string
  destination_name: string
  origin_lat: number | null
  origin_lng: number | null
  destination_lat: number | null
  destination_lng: number | null
  status: string
  progress_pct: number
  etd: string | null
  eta: string | null
  pilot_name: string | null
  copilot_name: string | null
  aircraft_reg: string | null
  aircraft_type: string | null
  is_delayed: boolean
  delay_minutes: number | null
  pax_count: number
  telemetry: Telemetry
  passenger_summary: PassengerSummary
  crew_comms: CrewCommsMessage[]
}

export interface DepartPayload {
  actual_departure?: string
  notes?: string
}

export interface ArrivePayload {
  actual_arrival?: string
  notes?: string
}

export interface DelayPayload {
  delay_minutes: number
  reason: string
}

export const operatorDayOfFlightService = {
  getDayBoard: () =>
    api.get<DayBoardData>('/operator/day-of-flight/board').then(r => r.data),

  getFlightDetail: (flightId: string) =>
    api.get<FlightDetail>(`/operator/day-of-flight/${flightId}`).then(r => r.data),

  markDepart: (flightId: string, payload: DepartPayload) =>
    api.post<FlightDetail>(`/operator/day-of-flight/${flightId}/depart`, payload).then(r => r.data),

  markArrive: (flightId: string, payload: ArrivePayload) =>
    api.post<FlightDetail>(`/operator/day-of-flight/${flightId}/arrive`, payload).then(r => r.data),

  logDelay: (flightId: string, payload: DelayPayload) =>
    api.post<FlightDetail>(`/operator/day-of-flight/${flightId}/delay`, payload).then(r => r.data),

  closeFlight: (flightId: string) =>
    api.post<FlightDetail>(`/operator/day-of-flight/${flightId}/close`).then(r => r.data),

  addEventLog: (flightId: string, message: string) =>
    api.post<FlightEvent>(`/operator/day-of-flight/${flightId}/events`, { message }).then(r => r.data),
}
