import api from '../lib/axios'
import type { AxiosResponse } from 'axios'

export interface OperatorUserOut {
  id: string
  name: string
  email: string
  phone: string | null
  operator_role: string
  role: string
  status: string
  twofa_enabled: boolean
  two_factor_enabled: boolean
  operator_id: string
  operator_name: string | null
  avatar_url: string | null
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  requires_2fa: boolean
  two_fa_token?: string
  user: OperatorUserOut
}

export interface RefreshResponse {
  access_token: string
  refresh_token: string
  user: OperatorUserOut
}

export interface EnrollResponse {
  secret: string
  otpauth_uri: string
}

export interface OperatorSession {
  id: string
  ip_address: string | null
  device_info: string | null
  created_at: string
  expires_at: string
}

export const operatorAuthService = {
  login: (email: string, password: string, rememberDevice = false): Promise<LoginResponse> =>
    api
      .post<LoginResponse>('/auth/login', { email, password, remember_device: rememberDevice })
      .then((r: AxiosResponse<LoginResponse>) => r.data),

  verify2faLogin: (two_fa_token: string, code: string): Promise<LoginResponse> =>
    api
      .post<LoginResponse>('/auth/2fa/verify', { two_fa_token, code })
      .then((r: AxiosResponse<LoginResponse>) => r.data),

  refresh: (refreshToken: string): Promise<RefreshResponse> =>
    api
      .post<RefreshResponse>('/auth/refresh', { refresh_token: refreshToken })
      .then((r: AxiosResponse<RefreshResponse>) => r.data),

  logout: (refreshToken?: string): Promise<void> =>
    api.post('/auth/logout', { refresh_token: refreshToken ?? '' }).then(() => undefined),

  forgotPassword: (email: string): Promise<void> =>
    api.post('/auth/password/forgot', { email }).then(() => undefined),

  resetPassword: (token: string, newPassword: string): Promise<void> =>
    api.post('/auth/password/reset', { token, new_password: newPassword }).then(() => undefined),

  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    api
      .post('/auth/me/change-password', { current_password: currentPassword, new_password: newPassword })
      .then(() => undefined),

  getMe: (): Promise<OperatorUserOut> =>
    api.get<OperatorUserOut>('/auth/me').then((r: AxiosResponse<OperatorUserOut>) => r.data),

  updateMe: (body: { name?: string; phone?: string }): Promise<OperatorUserOut> =>
    api
      .patch<OperatorUserOut>('/auth/me', body)
      .then((r: AxiosResponse<OperatorUserOut>) => r.data),

  enroll2fa: (): Promise<EnrollResponse> =>
    api.post<EnrollResponse>('/auth/2fa/enroll').then((r: AxiosResponse<EnrollResponse>) => r.data),

  confirm2fa: (code: string): Promise<void> =>
    api.post('/auth/2fa/confirm', { code }).then(() => undefined),

  disable2fa: (code: string): Promise<void> =>
    api.post('/auth/2fa/disable', { code }).then(() => undefined),

  listSessions: (): Promise<OperatorSession[]> =>
    api
      .get<OperatorSession[]>('/auth/me/sessions')
      .then((r: AxiosResponse<OperatorSession[]>) => r.data),

  revokeSession: (sessionId: string): Promise<void> =>
    api.delete(`/auth/me/sessions/${sessionId}`).then(() => undefined),
}
