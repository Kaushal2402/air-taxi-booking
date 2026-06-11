import api from '../lib/axios'

export interface CrewDocument {
  id: string
  crew_member_id: string
  doc_type: string
  doc_number: string | null
  issued_date: string | null
  expiry_date: string | null
  is_permanent: boolean
  file_url: string | null
  created_at: string
}

export interface CrewTypeRating {
  id: string
  crew_member_id: string
  aircraft_type_id: string | null
  aircraft_type_name: string
  rating_number: string | null
  is_current: boolean
  expiry_date: string | null
  created_at: string
}

export interface CrewMember {
  id: string
  operator_id: string
  name: string
  crew_role: string
  license_no: string | null
  employee_id: string | null
  email: string | null
  phone: string | null
  home_base_name: string | null
  medical_expiry: string | null
  total_flight_hours: number
  duty_hours_month: number
  status: string
  availability: string
  joined_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  documents: CrewDocument[]
  type_ratings: CrewTypeRating[]
}

export interface CrewMemberListItem {
  id: string
  name: string
  crew_role: string
  license_no: string | null
  status: string
  availability: string
  total_flight_hours: number
  duty_hours_month: number
  medical_expiry: string | null
}

export interface CrewMemberCreate {
  name: string
  crew_role: string
  license_no?: string
  employee_id?: string
  email?: string
  phone?: string
  home_base_name?: string
  medical_expiry?: string
  joined_date?: string
  notes?: string
}

export interface CrewMemberUpdate {
  name?: string
  crew_role?: string
  license_no?: string
  employee_id?: string
  email?: string
  phone?: string
  home_base_name?: string
  medical_expiry?: string
  status?: string
  availability?: string
  total_flight_hours?: number
  duty_hours_month?: number
  notes?: string
}

export interface CrewDocumentCreate {
  doc_type: string
  doc_number?: string
  issued_date?: string
  expiry_date?: string
  is_permanent?: boolean
  file_url?: string
}

export interface CrewRatingCreate {
  aircraft_type_name: string
  aircraft_type_id?: string
  rating_number?: string
  is_current?: boolean
  expiry_date?: string
}

export const operatorCrewService = {
  list: () =>
    api.get<CrewMemberListItem[]>('/operator/crew').then(r => r.data),

  get: (id: string) =>
    api.get<CrewMember>(`/operator/crew/${id}`).then(r => r.data),

  create: (body: CrewMemberCreate) =>
    api.post<CrewMember>('/operator/crew', body).then(r => r.data),

  update: (id: string, body: CrewMemberUpdate) =>
    api.patch<CrewMember>(`/operator/crew/${id}`, body).then(r => r.data),

  submit: (id: string) =>
    api.post<CrewMember>(`/operator/crew/${id}/submit`).then(r => r.data),

  addDocument: (id: string, body: CrewDocumentCreate) =>
    api.post<CrewDocument>(`/operator/crew/${id}/documents`, body).then(r => r.data),

  updateRatings: (id: string, ratings: CrewRatingCreate[]) =>
    api.patch<CrewMember>(`/operator/crew/${id}/ratings`, { ratings }).then(r => r.data),
}
