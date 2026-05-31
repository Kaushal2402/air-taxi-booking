import api from '../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  two_factor_enabled: boolean
  last_sign_in_at: string | null
  created_at: string
  phone: string | null
  avatar_url: string | null
  locale: string
  failed_attempts: number
  locked_until: string | null
}

export interface AdminSession {
  id: string
  device_name: string | null
  device_os: string | null
  ip_address: string | null
  location: string | null
  two_fa_method: string | null
  last_activity_at: string
  is_current: boolean
}

export interface InviteAdminBody {
  name: string
  email: string
  role: string
}

export interface UpdateAdminBody {
  name?: string | null
  phone?: string | null
  role?: string | null
  locale?: string | null
}

export interface MessageResponse {
  message: string
}

export interface PaginatedAdmins {
  items: AdminUser[]
  total: number
  page: number
  pages: number
}

export interface ListAdminsParams {
  page?: number
  page_size?: number
  search?: string
  role?: string
  status?: string
}

// ── Service ───────────────────────────────────────────────────────────────────

export const adminUserService = {
  listAdmins: (params?: ListAdminsParams) =>
    api.get<PaginatedAdmins>('/admin-users', { params }).then(r => r.data),

  inviteAdmin: (body: InviteAdminBody) =>
    api.post<AdminUser>('/admin-users/invite', body).then(r => r.data),

  resendInvite: (id: string) =>
    api.post<MessageResponse>(`/admin-users/${id}/resend-invite`).then(r => r.data),

  getAdmin: (id: string) =>
    api.get<AdminUser>(`/admin-users/${id}`).then(r => r.data),

  updateAdmin: (id: string, body: UpdateAdminBody) =>
    api.patch<AdminUser>(`/admin-users/${id}`, body).then(r => r.data),

  suspendAdmin: (id: string) =>
    api.post<AdminUser>(`/admin-users/${id}/suspend`).then(r => r.data),

  reactivateAdmin: (id: string) =>
    api.post<AdminUser>(`/admin-users/${id}/reactivate`).then(r => r.data),

  forceLogout: (id: string) =>
    api.post<MessageResponse>(`/admin-users/${id}/force-logout`).then(r => r.data),

  reset2fa: (id: string) =>
    api.post<MessageResponse>(`/admin-users/${id}/reset-2fa`).then(r => r.data),

  deleteAdmin: (id: string) =>
    api.delete<MessageResponse>(`/admin-users/${id}`).then(r => r.data),

  getAdminSessions: (id: string) =>
    api.get<AdminSession[]>(`/admin-users/${id}/sessions`).then(r => r.data),

  revokeAllSessions: (id: string) =>
    api.delete<MessageResponse>(`/admin-users/${id}/sessions`).then(r => r.data),

  unlockAdmin: (id: string) =>
    api.post<AdminUser>(`/admin-users/${id}/unlock`).then(r => r.data),
}
