import api from '../lib/axios'

export interface ManifestPassenger {
  id: string
  seat_number: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  id_type: 'passport' | 'national_id' | 'driving_license' | 'other'
  id_number: string
  nationality: string
  role: 'passenger' | 'crew' | 'infant' | 'unaccompanied_minor'
  verified: boolean
  special_assistance: string | null
  dietary_requirements: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}

export interface ManifestHistoryEntry {
  id: string
  action: string
  performed_by: string
  performed_at: string
  remarks: string | null
}

export interface ManifestSummary {
  flight_id: string
  booking_ref: string
  origin_code: string
  origin_name: string
  destination_code: string
  destination_name: string
  departure_at: string
  pax_count: number
  crew_count: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submission_deadline: string | null
  submitted_at: string | null
  is_locked: boolean
  unverified_count: number
}

export interface ManifestDetail {
  flight_id: string
  booking_ref: string
  origin_code: string
  origin_name: string
  destination_code: string
  destination_name: string
  departure_at: string
  arrival_at: string | null
  aircraft_registration: string | null
  aircraft_type: string | null
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submission_deadline: string | null
  submitted_at: string | null
  submitted_by: string | null
  submission_remarks: string | null
  is_locked: boolean
  passengers: ManifestPassenger[]
  history: ManifestHistoryEntry[]
  checklist: {
    all_passengers_verified: boolean
    ids_collected: boolean
    safety_briefing_completed: boolean
    weight_balance_checked: boolean
    authority_clearance_obtained: boolean
  }
}

export interface PassengerUpdate {
  seat_number?: string
  first_name?: string
  last_name?: string
  date_of_birth?: string
  id_type?: ManifestPassenger['id_type']
  id_number?: string
  nationality?: string
  role?: ManifestPassenger['role']
  verified?: boolean
  special_assistance?: string
  dietary_requirements?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
}

export const operatorManifestsService = {
  list: () =>
    api.get<ManifestSummary[]>('/operator/manifests').then(r => r.data),

  getDetail: (flightId: string) =>
    api.get<ManifestDetail>(`/operator/manifests/${flightId}`).then(r => r.data),

  updatePassenger: (flightId: string, passengerId: string, body: PassengerUpdate) =>
    api
      .patch<ManifestPassenger>(`/operator/manifests/${flightId}/passengers/${passengerId}`, body)
      .then(r => r.data),

  lock: (flightId: string) =>
    api.post<{ is_locked: boolean }>(`/operator/manifests/${flightId}/lock`).then(r => r.data),

  unlock: (flightId: string) =>
    api.post<{ is_locked: boolean }>(`/operator/manifests/${flightId}/unlock`).then(r => r.data),

  submit: (flightId: string, remarks?: string) =>
    api
      .post<ManifestDetail>(`/operator/manifests/${flightId}/submit`, { remarks })
      .then(r => r.data),

  exportManifest: (flightId: string) =>
    api
      .get(`/operator/manifests/${flightId}/export`, { responseType: 'blob' })
      .then(r => r.data as Blob),
}
