import api from '../lib/axios'

export interface CrewAssignment {
  crew_member_id: string
  crew_member_name: string
  role: string
}

export interface Flight {
  id: string
  operator_id: string
  booking_ref: string
  booking_request_id: string | null
  origin_name: string
  destination_name: string
  etd: string | null
  eta: string | null
  pax_count: number
  baggage_kg: number
  aircraft_id: string | null
  aircraft_reg: string | null
  aircraft_type: string | null
  pilot_id: string | null
  pilot_name: string | null
  copilot_id: string | null
  copilot_name: string | null
  status: string
  notes: string | null
  crew_assignments: CrewAssignment[]
  created_at: string
  updated_at: string
}

export interface EligibleAircraft {
  id: string
  registration_mark: string
  aircraft_type_name: string
  seat_capacity: number
  range_nm: number
  mtow_kg: number
  status: string
  eligibility_note: string | null
}

export interface EligibleCrew {
  id: string
  full_name: string
  license_type: string | null
  total_hours: number
  status: string
  availability_note: string | null
}

export interface EligibleResources {
  aircraft: EligibleAircraft[]
  pilots: EligibleCrew[]
  crew: EligibleCrew[]
}

export interface AssignPayload {
  aircraft_id: string
  aircraft_reg: string
  aircraft_type: string
  pilot_id: string
  pilot_name: string
  copilot_id?: string
  copilot_name?: string
  crew?: CrewAssignment[]
  etd?: string
  eta?: string
}

export const operatorAssignmentService = {
  listBoard: () =>
    api.get<Flight[]>('/operator/flights/assignment-board').then(r => r.data),
  getFlight: (id: string) =>
    api.get<Flight>(`/operator/flights/${id}`).then(r => r.data),
  getEligibleResources: (flightId: string) =>
    api.get<EligibleResources>(`/operator/flights/${flightId}/eligible-resources`).then(r => r.data),
  assign: (flightId: string, payload: AssignPayload) =>
    api.post<Flight>(`/operator/flights/${flightId}/assign`, payload).then(r => r.data),
  reassign: (flightId: string, payload: AssignPayload) =>
    api.post<Flight>(`/operator/flights/${flightId}/reassign`, payload).then(r => r.data),
  confirm: (flightId: string) =>
    api.post<Flight>(`/operator/flights/${flightId}/confirm`).then(r => r.data),
}
