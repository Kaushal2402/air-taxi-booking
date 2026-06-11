import api from '../lib/axios'

export interface AircraftDocument {
  id: string
  aircraft_id: string
  doc_type: string
  doc_number: string | null
  issued_date: string | null
  expiry_date: string | null
  is_permanent: boolean
  file_url: string | null
  created_at: string
}

export interface MaintenanceWindow {
  id: string
  aircraft_id: string
  task: string
  start_dt: string
  end_dt: string
  status: string
  notes: string | null
  created_at: string
}

export interface Aircraft {
  id: string
  operator_id: string
  registration_mark: string
  aircraft_type_id: string | null
  aircraft_type_name: string
  serial_number: string | null
  year_of_manufacture: number | null
  seat_capacity: number
  mtow_kg: number
  range_nm: number
  endurance_hours: string | null
  home_base_id: string | null
  home_base_name: string | null
  status: string
  total_flight_hours: number
  total_cycles: number
  notes: string | null
  created_at: string
  updated_at: string
  documents: AircraftDocument[]
  maintenance_windows: MaintenanceWindow[]
}

export interface AircraftListItem {
  id: string
  registration_mark: string
  aircraft_type_name: string
  seat_capacity: number
  range_nm: number
  status: string
  total_flight_hours: number
  total_cycles: number
  home_base_name: string | null
}

export interface AircraftCreate {
  registration_mark: string
  aircraft_type_name: string
  aircraft_type_id?: string
  serial_number?: string
  year_of_manufacture?: number
  seat_capacity: number
  mtow_kg: number
  range_nm: number
  endurance_hours?: string
  home_base_id?: string
  home_base_name?: string
  notes?: string
}

export interface AircraftUpdate {
  aircraft_type_name?: string
  seat_capacity?: number
  mtow_kg?: number
  range_nm?: number
  endurance_hours?: string
  home_base_id?: string
  home_base_name?: string
  notes?: string
  status?: string
  total_flight_hours?: number
  total_cycles?: number
}

export interface DocumentCreate {
  doc_type: string
  doc_number?: string
  issued_date?: string
  expiry_date?: string
  is_permanent?: boolean
  file_url?: string
}

export interface MaintenanceCreate {
  task: string
  start_dt: string
  end_dt: string
  status?: string
  notes?: string
}

export const operatorAircraftService = {
  list: () =>
    api.get<AircraftListItem[]>('/operator/aircraft').then(r => r.data),

  get: (id: string) =>
    api.get<Aircraft>(`/operator/aircraft/${id}`).then(r => r.data),

  create: (body: AircraftCreate) =>
    api.post<Aircraft>('/operator/aircraft', body).then(r => r.data),

  update: (id: string, body: AircraftUpdate) =>
    api.patch<Aircraft>(`/operator/aircraft/${id}`, body).then(r => r.data),

  submit: (id: string) =>
    api.post<Aircraft>(`/operator/aircraft/${id}/submit`).then(r => r.data),

  addDocument: (id: string, body: DocumentCreate) =>
    api.post<AircraftDocument>(`/operator/aircraft/${id}/documents`, body).then(r => r.data),

  addMaintenance: (id: string, body: MaintenanceCreate) =>
    api.post<MaintenanceWindow>(`/operator/aircraft/${id}/maintenance`, body).then(r => r.data),
}
