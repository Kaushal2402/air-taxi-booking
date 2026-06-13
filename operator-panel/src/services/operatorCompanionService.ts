import api from '../lib/axios'

export interface CrewAssignment {
  crew_member_id: string
  crew_member_name: string
  role: string
}

export interface MyAssignment {
  flight_id: string
  booking_ref: string
  origin_name: string
  destination_name: string
  etd: string | null
  eta: string | null
  aircraft_reg: string | null
  aircraft_type: string | null
  my_role: string
  status: string
}

export interface FlightBrief {
  flight_id: string
  booking_ref: string
  origin_name: string
  destination_name: string
  etd: string | null
  eta: string | null
  aircraft_reg: string | null
  aircraft_type: string | null
  pax_count: number
  total_baggage_kg: number
  all_checked_in: boolean
  special_assistance: string[]
  crew: CrewAssignment[]
  status: string
  notes: string | null
}

export const operatorCompanionService = {
  getAssignments: () =>
    api.get<MyAssignment[]>('/operator/companion/assignments').then(r => r.data),

  getFlightBrief: (flightId: string) =>
    api.get<FlightBrief>(`/operator/companion/flights/${flightId}/brief`).then(r => r.data),

  updateStatus: (flightId: string, newStatus: string, notes?: string) =>
    api
      .post<FlightBrief>(`/operator/companion/flights/${flightId}/status`, {
        status: newStatus,
        notes,
      })
      .then(r => r.data),
}
