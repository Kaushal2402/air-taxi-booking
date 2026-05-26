import api from '../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VehicleClass {
  id: string
  code: string
  name: string
  sort_order: number
  description: string | null
  seats: number
  luggage_large: number
  ac_required: boolean
  pet_friendly: boolean
  airport_eligible: boolean
  vehicle_type: string | null
  min_year_of_make: number | null
  min_driver_rating: number | null
  permit_required: string | null
  max_vehicle_age_years: number | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AircraftType {
  id: string
  code: string
  name: string
  category: 'heli' | 'jet'
  seats: number
  mtow_kg: number | null
  range_nm: number | null
  cruise_kts: number | null
  description: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceZone {
  id: string
  code: string
  name: string
  polygon: [number, number][]   // [lat, lng] pairs
  tax_jurisdiction: string
  priority: number
  surge_cap: number
  active_service_codes: string[] | null
  is_active: boolean
  version: number
  created_at: string
  updated_at: string
}

export interface AirRoute {
  id: string
  code: string
  origin_name: string
  origin_code: string
  destination_name: string
  destination_code: string
  category: 'shuttle' | 'on_demand' | 'charter' | 'vip'
  distance_nm: number
  block_time_minutes: number
  eligible_type_codes: string[] | null
  authorized_operators: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GeometryValidation {
  valid: boolean
  message: string
  vertex_count: number
  area_km2: number | null
}

// ── Vehicle Classes ───────────────────────────────────────────────────────────

export const catalogService = {
  // Vehicle Classes
  listVehicleClasses: (includeInactive = false) =>
    api.get<VehicleClass[]>('/catalog/vehicle-classes', { params: { include_inactive: includeInactive } }).then(r => r.data),

  createVehicleClass: (body: Partial<VehicleClass>) =>
    api.post<VehicleClass>('/catalog/vehicle-classes', body).then(r => r.data),

  updateVehicleClass: (id: string, body: Partial<VehicleClass>) =>
    api.patch<VehicleClass>(`/catalog/vehicle-classes/${id}`, body).then(r => r.data),

  deactivateVehicleClass: (id: string) =>
    api.delete(`/catalog/vehicle-classes/${id}`).then(r => r.data),

  // Aircraft Types
  listAircraftTypes: (includeInactive = false) =>
    api.get<AircraftType[]>('/catalog/aircraft-types', { params: { include_inactive: includeInactive } }).then(r => r.data),

  createAircraftType: (body: Partial<AircraftType>) =>
    api.post<AircraftType>('/catalog/aircraft-types', body).then(r => r.data),

  updateAircraftType: (id: string, body: Partial<AircraftType>) =>
    api.patch<AircraftType>(`/catalog/aircraft-types/${id}`, body).then(r => r.data),

  deactivateAircraftType: (id: string) =>
    api.delete(`/catalog/aircraft-types/${id}`).then(r => r.data),

  // Service Zones
  listServiceZones: (includeInactive = false) =>
    api.get<ServiceZone[]>('/catalog/zones', { params: { include_inactive: includeInactive } }).then(r => r.data),

  createServiceZone: (body: Partial<ServiceZone>) =>
    api.post<ServiceZone>('/catalog/zones', body).then(r => r.data),

  updateServiceZone: (id: string, body: Partial<ServiceZone>) =>
    api.patch<ServiceZone>(`/catalog/zones/${id}`, body).then(r => r.data),

  publishServiceZone: (id: string) =>
    api.post<ServiceZone>(`/catalog/zones/${id}/publish`).then(r => r.data),

  validateZoneGeometry: (polygon: [number, number][]) =>
    api.post<GeometryValidation>('/catalog/zones/validate-geometry', { polygon }).then(r => r.data),

  deactivateServiceZone: (id: string) =>
    api.delete(`/catalog/zones/${id}`).then(r => r.data),

  // Air Routes
  listAirRoutes: (includeInactive = false) =>
    api.get<AirRoute[]>('/catalog/air-routes', { params: { include_inactive: includeInactive } }).then(r => r.data),

  createAirRoute: (body: Partial<AirRoute>) =>
    api.post<AirRoute>('/catalog/air-routes', body).then(r => r.data),

  updateAirRoute: (id: string, body: Partial<AirRoute>) =>
    api.patch<AirRoute>(`/catalog/air-routes/${id}`, body).then(r => r.data),

  deactivateAirRoute: (id: string) =>
    api.delete(`/catalog/air-routes/${id}`).then(r => r.data),
}
