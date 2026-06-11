import api from '../lib/axios'

export interface Route {
  id: string
  operator_id: string
  origin_code: string
  origin_name: string
  destination_code: string
  destination_name: string
  distance_nm: number
  est_duration_min: number
  eligible_aircraft_types: string[]
  airspace_notes: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface RouteListItem {
  id: string
  origin_code: string
  origin_name: string
  destination_code: string
  destination_name: string
  distance_nm: number
  est_duration_min: number
  eligible_aircraft_types: string[]
  status: string
}

export interface Schedule {
  id: string
  operator_id: string
  route_id: string
  aircraft_id: string | null
  aircraft_registration: string | null
  etd: string
  eta: string
  seats_total: number
  seats_sold: number
  recurrence: string | null
  published: boolean
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RouteCreate {
  origin_code: string
  origin_name: string
  destination_code: string
  destination_name: string
  distance_nm: number
  est_duration_min: number
  eligible_aircraft_types?: string[]
  airspace_notes?: string
}

export interface RouteUpdate {
  origin_name?: string
  destination_name?: string
  distance_nm?: number
  est_duration_min?: number
  eligible_aircraft_types?: string[]
  airspace_notes?: string
  status?: string
}

export interface ScheduleCreate {
  route_id: string
  aircraft_id?: string
  aircraft_registration?: string
  etd: string
  eta: string
  seats_total?: number
  recurrence?: string
  notes?: string
}

export interface ScheduleUpdate {
  aircraft_id?: string
  aircraft_registration?: string
  etd?: string
  eta?: string
  seats_total?: number
  recurrence?: string
  notes?: string
  status?: string
}

export const operatorRoutesService = {
  listRoutes: () =>
    api.get<RouteListItem[]>('/operator/routes').then(r => r.data),

  getRoute: (id: string) =>
    api.get<Route>(`/operator/routes/${id}`).then(r => r.data),

  createRoute: (body: RouteCreate) =>
    api.post<Route>('/operator/routes', body).then(r => r.data),

  updateRoute: (id: string, body: RouteUpdate) =>
    api.patch<Route>(`/operator/routes/${id}`, body).then(r => r.data),

  listSchedules: () =>
    api.get<Schedule[]>('/operator/schedules').then(r => r.data),

  createSchedule: (body: ScheduleCreate) =>
    api.post<Schedule>('/operator/schedules', body).then(r => r.data),

  updateSchedule: (id: string, body: ScheduleUpdate) =>
    api.patch<Schedule>(`/operator/schedules/${id}`, body).then(r => r.data),

  publishSchedule: (id: string) =>
    api.post<Schedule>(`/operator/schedules/${id}/publish`).then(r => r.data),

  unpublishSchedule: (id: string) =>
    api.post<Schedule>(`/operator/schedules/${id}/unpublish`).then(r => r.data),
}
