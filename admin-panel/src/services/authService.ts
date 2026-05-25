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
}

export interface AdminUserBrief {
  id: string
  name: string
  email: string
  role: string
  status: string
  two_factor_enabled: boolean
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: AdminUserBrief
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

  updateMe: (name: string) =>
    api.patch('/auth/me', { name }).then(r => r.data),

  changePassword: (current_password: string, new_password: string, confirm_password: string) =>
    api.post('/auth/change-password', { current_password, new_password, confirm_password }).then(r => r.data),

  getSessions: (refreshToken?: string) =>
    api.get('/auth/me/sessions', {
      headers: refreshToken ? { 'X-Refresh-Token': refreshToken } : {},
    }).then(r => r.data),

  revokeSession: (sessionId: string) =>
    api.delete(`/auth/me/sessions/${sessionId}`).then(r => r.data),

  getSignInHistory: () =>
    api.get('/auth/me/sign-in-history').then(r => r.data),

  setupTOTP: () =>
    api.post('/auth/2fa/setup').then(r => r.data),

  enrollTOTP: (code: string) =>
    api.post('/auth/2fa/enroll', { code }).then(r => r.data),
}
