import api from '../lib/axios'

export type BrandStatus = 'draft' | 'review' | 'live' | 'archived'
export type AssetStatus = 'live' | 'stale' | 'draft' | 'archived'
export type TouchpointStatus = 'live' | 'review' | 'disabled'

export interface BrandProfile {
  id: string
  brand_ref: string
  name: string
  scope: string | null
  status: BrandStatus
  primary_color: string | null
  ink_color: string | null
  surface_color: string | null
  bg_color: string | null
  success_color: string | null
  display_font: string | null
  text_font: string | null
  corner_radius: string | null
  button_style: string | null
  is_white_label: boolean
  partner_name: string | null
  published_at: string | null
  notes: string | null
  extra_config: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface BrandProfileListResponse {
  items: BrandProfile[]
  total: number
}

export interface BrandAsset {
  id: string
  profile_id: string
  asset_type: string
  name: string
  format: string | null
  used_in: string | null
  version: string | null
  file_url: string | null
  file_size_kb: string | null
  status: AssetStatus
  created_at: string
  updated_at: string
}

export interface BrandTouchpoint {
  id: string
  profile_id: string
  name: string
  description: string | null
  coverage: string | null
  icon: string | null
  status: TouchpointStatus
  created_at: string
  updated_at: string
}

export const brandingService = {
  listProfiles: (includeArchived = false) =>
    api.get<BrandProfileListResponse>('/branding/profiles', {
      params: { include_archived: includeArchived },
    }).then(r => r.data),

  getProfile: (id: string) =>
    api.get<BrandProfile>(`/branding/profiles/${id}`).then(r => r.data),

  createProfile: (body: Partial<BrandProfile>) =>
    api.post<BrandProfile>('/branding/profiles', body).then(r => r.data),

  updateProfile: (id: string, body: Partial<BrandProfile>) =>
    api.patch<BrandProfile>(`/branding/profiles/${id}`, body).then(r => r.data),

  publishProfile: (id: string, target: 'staging' | 'live', notes?: string) =>
    api.post<BrandProfile>(`/branding/profiles/${id}/publish`, { target, notes }).then(r => r.data),

  deleteProfile: (id: string) =>
    api.delete(`/branding/profiles/${id}`).then(r => r.data),

  listAssets: (profileId: string) =>
    api.get<BrandAsset[]>(`/branding/profiles/${profileId}/assets`).then(r => r.data),

  createAsset: (profileId: string, body: Partial<BrandAsset>) =>
    api.post<BrandAsset>(`/branding/profiles/${profileId}/assets`, body).then(r => r.data),

  updateAsset: (assetId: string, body: Partial<BrandAsset>) =>
    api.patch<BrandAsset>(`/branding/assets/${assetId}`, body).then(r => r.data),

  deleteAsset: (assetId: string) =>
    api.delete(`/branding/assets/${assetId}`).then(r => r.data),

  listTouchpoints: (profileId: string) =>
    api.get<BrandTouchpoint[]>(`/branding/profiles/${profileId}/touchpoints`).then(r => r.data),

  createTouchpoint: (profileId: string, body: Partial<BrandTouchpoint>) =>
    api.post<BrandTouchpoint>(`/branding/profiles/${profileId}/touchpoints`, body).then(r => r.data),

  updateTouchpoint: (tpId: string, body: Partial<BrandTouchpoint>) =>
    api.patch<BrandTouchpoint>(`/branding/touchpoints/${tpId}`, body).then(r => r.data),
}
