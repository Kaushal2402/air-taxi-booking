import api from '../lib/axios'

export interface LoginRequest {
  email: string
  password: string
  remember_me: boolean
}

export interface LoginResponse {
  requires_2fa: boolean
  partial_token?: string
  access_token?: string
  refresh_token?: string
  user?: AdminUserBrief
  has_phone?: boolean   // populated when requires_2fa=true — controls SMS option visibility
}

export interface AdminUserBrief {
  id: string
  name: string
  email: string
  role: string
  status: string
  two_factor_enabled: boolean
  phone: string | null
  avatar_url: string | null
  locale: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: AdminUserBrief
}

export interface SignInHistoryEntry {
  id: string
  event_type: string
  ip_address: string | null
  location: string | null
  result: string
  user_agent: string | null
  created_at: string
}

export interface PaginatedHistoryResponse {
  items: SignInHistoryEntry[]
  total: number
  page: number
  limit: number
  pages: number
}

export const authService = {
  login: (body: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', body).then(r => r.data),

  verify2FA: (partial_token: string, code: string, trust_device = false) =>
    api.post<TokenResponse>('/auth/2fa/verify', { partial_token, code, trust_device }).then(r => r.data),

  refresh: (refresh_token: string) =>
    api.post<TokenResponse>('/auth/refresh', { refresh_token }).then(r => r.data),

  logout: (refresh_token: string) =>
    api.post('/auth/logout', { refresh_token }).then(r => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then(r => r.data),

  resetPassword: (token: string, password: string, confirm_password: string) =>
    api.post('/auth/reset-password', { token, password, confirm_password }).then(r => r.data),

  getMe: () =>
    api.get('/auth/me').then(r => r.data),

  updateMe: (data: { name?: string; phone?: string | null; locale?: string }) =>
    api.patch('/auth/me', data).then(r => r.data),

  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('avatar', file)
    return api.post<AdminUserBrief>('/auth/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  removeAvatar: () =>
    api.delete<AdminUserBrief>('/auth/me/avatar').then(r => r.data),

  changePassword: (current_password: string, new_password: string, confirm_password: string) =>
    api.post('/auth/change-password', { current_password, new_password, confirm_password }).then(r => r.data),

  getSessions: (refreshToken?: string) =>
    api.get('/auth/me/sessions', {
      headers: refreshToken ? { 'X-Refresh-Token': refreshToken } : {},
    }).then(r => r.data),

  revokeSession: (sessionId: string) =>
    api.delete(`/auth/me/sessions/${sessionId}`).then(r => r.data),

  getSignInHistory: (page = 1, limit = 15) =>
    api.get<PaginatedHistoryResponse>('/auth/me/sign-in-history', { params: { page, limit } }).then(r => r.data),

  setupTOTP: () =>
    api.post('/auth/2fa/setup').then(r => r.data),

  enrollTOTP: (code: string) =>
    api.post('/auth/2fa/enroll', { code }).then(r => r.data),

  generateBackupCodes: () =>
    api.post<{ codes: string[]; total: number; remaining: number }>('/auth/2fa/backup-codes').then(r => r.data),

  getBackupCodeStatus: () =>
    api.get<{ total: number; used: number; remaining: number; generated: boolean }>('/auth/2fa/backup-codes/status').then(r => r.data),

  verifyBackupCode: (partial_token: string, code: string) =>
    api.post<TokenResponse>('/auth/2fa/backup-verify', { partial_token, code }).then(r => r.data),

  disable2FA: (code: string) =>
    api.post<{ message: string }>('/auth/2fa/disable', { code }).then(r => r.data),

  sendEmailOTP: (partial_token: string) =>
    api.post<{ sent_at: string; cooldown_seconds: number }>('/auth/2fa/email-otp', { partial_token }).then(r => r.data),

  sendSmsOTP: (partial_token: string) =>
    api.post<{ sent_at: string; cooldown_seconds: number; masked_phone: string }>('/auth/2fa/sms-otp', { partial_token }).then(r => r.data),

  acceptInvite: (token: string, password: string, confirm_password: string) =>
    api.post<{ message: string }>('/auth/invite/accept', { token, password, confirm_password }).then(r => r.data),
}
