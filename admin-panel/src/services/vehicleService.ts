import api from '../lib/axios'

// ── Types ──────────────────────────────────────────────────────────────────────

export type VehicleStatus = 'pending' | 'active' | 'suspended' | 'retired'
export type VehicleDocStatus = 'pending' | 'ok' | 'expiring' | 'rejected' | 'expired'
export type VehicleDocType = 'rc' | 'insurance' | 'permit' | 'fitness' | 'puc'
export type VehicleOwnerType = 'owner_driver' | 'vendor'
export type VendorStatus = 'active' | 'review' | 'suspended'
export type MaintenanceStatus = 'pending' | 'done' | 'skipped'

export interface Vehicle {
  id: string
  plate_no: string
  make: string
  model: string
  year: number
  color: string | null
  fuel_type: string | null
  vehicle_class_id: string
  vehicle_class_name: string | null
  vehicle_class_code: string | null
  owner_type: VehicleOwnerType
  owner_vendor_id: string | null
  owner_vendor_name: string | null
  linked_driver_id: string | null
  linked_driver_name: string | null
  linked_driver_code: string | null
  linked_since: string | null
  odometer_km: number
  status: VehicleStatus
  doc_status: VehicleDocStatus
  image_url: string | null
  flag_reason: string | null
  created_at: string
  updated_at: string
}

export interface VehicleDocument {
  id: string
  vehicle_id: string
  doc_type: VehicleDocType
  doc_number: string | null
  issued_date: string | null
  expiry_date: string | null
  image_url: string | null
  status: VehicleDocStatus
  review_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface VehicleMaintenance {
  id: string
  vehicle_id: string
  milestone_label: string
  milestone_km: number | null
  scheduled_date: string | null
  service_center: string | null
  notes: string | null
  status: MaintenanceStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface VehicleDetail extends Vehicle {
  documents: VehicleDocument[]
  maintenances: VehicleMaintenance[]
}

export interface VehicleListResponse {
  items: Vehicle[]
  total: number
  page: number
  per_page: number
  status_counts: Record<string, number>
}

export interface Vendor {
  id: string
  name: string
  city: string | null
  phone: string | null
  email: string | null
  status: VendorStatus
  commission_rate: number
  commission_type: string
  vehicle_count: number
  driver_count: number
  joined_at: string
  created_at: string
  updated_at: string
}

export interface VendorListResponse {
  items: Vendor[]
  total: number
  page: number
  per_page: number
}

// ── Service ────────────────────────────────────────────────────────────────────

export const vehicleService = {
  // Vehicles
  listVehicles: (params?: Record<string, string | number | boolean>) =>
    api.get<VehicleListResponse>('/vehicles', { params }).then(r => r.data),

  getVehicle: (id: string) =>
    api.get<VehicleDetail>(`/vehicles/${id}`).then(r => r.data),

  createVehicle: (body: Partial<Vehicle>) =>
    api.post<Vehicle>('/vehicles', body).then(r => r.data),

  updateVehicle: (id: string, body: Partial<Vehicle>) =>
    api.patch<Vehicle>(`/vehicles/${id}`, body).then(r => r.data),

  approveVehicle: (id: string) =>
    api.post<Vehicle>(`/vehicles/${id}/approve`).then(r => r.data),

  groundVehicle: (id: string, reason: string) =>
    api.post<Vehicle>(`/vehicles/${id}/ground`, { reason }).then(r => r.data),

  reactivateVehicle: (id: string) =>
    api.post<Vehicle>(`/vehicles/${id}/reactivate`).then(r => r.data),

  linkDriver: (id: string, driver_id: string) =>
    api.post<Vehicle>(`/vehicles/${id}/link-driver`, { driver_id }).then(r => r.data),

  unlinkDriver: (id: string) =>
    api.post<Vehicle>(`/vehicles/${id}/unlink-driver`).then(r => r.data),

  reassignClass: (id: string, vehicle_class_id: string) =>
    api.post<Vehicle>(`/vehicles/${id}/reassign-class`, { vehicle_class_id }).then(r => r.data),

  // Documents
  getDocuments: (id: string) =>
    api.get<{ items: VehicleDocument[] }>(`/vehicles/${id}/documents`).then(r => r.data),

  createDocument: (id: string, body: { doc_type: VehicleDocType; doc_number?: string; issued_date?: string; expiry_date?: string }) =>
    api.post<VehicleDocument>(`/vehicles/${id}/documents`, body).then(r => r.data),

  reviewDocument: (id: string, docId: string, body: { action: string; expiry_date?: string | null; review_note?: string | null }) =>
    api.patch<VehicleDocument>(`/vehicles/${id}/documents/${docId}`, body).then(r => r.data),

  uploadDocumentImage: (id: string, docId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<VehicleDocument>(`/vehicles/${id}/documents/${docId}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  uploadVehicleImage: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Vehicle>(`/vehicles/${id}/upload-image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  // Maintenances
  getMaintenances: (id: string) =>
    api.get<{ items: VehicleMaintenance[] }>(`/vehicles/${id}/maintenances`).then(r => r.data),

  createMaintenance: (id: string, body: Partial<VehicleMaintenance>) =>
    api.post<VehicleMaintenance>(`/vehicles/${id}/maintenances`, body).then(r => r.data),

  updateMaintenance: (id: string, mId: string, body: Partial<VehicleMaintenance>) =>
    api.patch<VehicleMaintenance>(`/vehicles/${id}/maintenances/${mId}`, body).then(r => r.data),

  deleteMaintenance: (id: string, mId: string) =>
    api.delete(`/vehicles/${id}/maintenances/${mId}`).then(r => r.data),

  // Vendors
  listVendors: (params?: Record<string, string | number>) =>
    api.get<VendorListResponse>('/vendors', { params }).then(r => r.data),

  getVendor: (id: string) =>
    api.get<Vendor>(`/vendors/${id}`).then(r => r.data),

  createVendor: (body: Partial<Vendor>) =>
    api.post<Vendor>('/vendors', body).then(r => r.data),

  updateVendor: (id: string, body: Partial<Vendor>) =>
    api.patch<Vendor>(`/vendors/${id}`, body).then(r => r.data),

  activateVendor: (id: string) =>
    api.post<Vendor>(`/vendors/${id}/activate`).then(r => r.data),

  suspendVendor: (id: string, reason: string) =>
    api.post<Vendor>(`/vendors/${id}/suspend`, { reason }).then(r => r.data),
}
