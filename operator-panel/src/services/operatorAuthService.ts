import api from '../lib/axios'
import type { AxiosResponse } from 'axios'

export interface OperatorSubUser {
  id: string
  name: string
  email: string
  phone: string | null
  operator_role: string
  status: string
  twofa_enabled: boolean
  last_login_at: string | null
  created_at: string | null
  operator_id: string
}

export interface OperatorUserOut {
  id: string
  name: string
  email: string
  phone: string | null
  phone_verified: boolean
  operator_role: string
  role: string
  status: string
  twofa_enabled: boolean
  twofa_enrolled_at: string | null
  two_factor_enabled: boolean
  operator_id: string
  operator_name: string | null
  avatar_url: string | null
  password_changed_at: string | null
  timezone: string
  language: string
  date_format: string
  time_format: string
}

export interface NotifPref {
  alert_type: string
  email: boolean
  push: boolean
  sms: boolean
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

export interface OperatorLoginHistory {
  id: string
  ip_address: string | null
  success: boolean
  event_type: string
  attempted_at: string
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
      .post<LoginResponse>('/operator/auth/login', { email, password, remember_device: rememberDevice })
      .then((r: AxiosResponse<LoginResponse>) => r.data),

  verify2faLogin: (two_fa_token: string, code: string): Promise<LoginResponse> =>
    api
      .post<LoginResponse>('/operator/auth/2fa/verify', { two_fa_token, code })
      .then((r: AxiosResponse<LoginResponse>) => r.data),

  refresh: (refreshToken: string): Promise<RefreshResponse> =>
    api
      .post<RefreshResponse>('/operator/auth/refresh', { refresh_token: refreshToken })
      .then((r: AxiosResponse<RefreshResponse>) => r.data),

  logout: (refreshToken?: string): Promise<void> =>
    api.post('/operator/auth/logout', { refresh_token: refreshToken ?? '' }).then(() => undefined),

  forgotPassword: (email: string): Promise<void> =>
    api.post('/operator/auth/password/forgot', { email }).then(() => undefined),

  resetPassword: (token: string, newPassword: string): Promise<void> =>
    api.post('/operator/auth/password/reset', { token, new_password: newPassword }).then(() => undefined),

  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    api
      .post('/operator/auth/me/change-password', { current_password: currentPassword, new_password: newPassword })
      .then(() => undefined),

  getMe: (): Promise<OperatorUserOut> =>
    api.get<OperatorUserOut>('/operator/auth/me').then((r: AxiosResponse<OperatorUserOut>) => r.data),

  updateMe: (body: { name?: string; phone?: string; timezone?: string; language?: string; date_format?: string; time_format?: string }): Promise<OperatorUserOut> =>
    api
      .patch<OperatorUserOut>('/operator/auth/me', body)
      .then((r: AxiosResponse<OperatorUserOut>) => r.data),

  enroll2fa: (): Promise<EnrollResponse> =>
    api.post<EnrollResponse>('/operator/auth/2fa/enroll').then((r: AxiosResponse<EnrollResponse>) => r.data),

  confirm2fa: (code: string): Promise<void> =>
    api.post('/operator/auth/2fa/confirm', { code }).then(() => undefined),

  disable2fa: (code: string): Promise<void> =>
    api.post('/operator/auth/2fa/disable', { code }).then(() => undefined),

  listSessions: (): Promise<OperatorSession[]> =>
    api
      .get<OperatorSession[]>('/operator/auth/me/sessions')
      .then((r: AxiosResponse<OperatorSession[]>) => r.data),

  revokeSession: (sessionId: string): Promise<void> =>
    api.delete(`/operator/auth/me/sessions/${sessionId}`).then(() => undefined),

  acceptInvite: (token: string, password: string): Promise<{ message: string; needs_2fa_setup: boolean }> =>
    api.post<{ message: string; needs_2fa_setup: boolean }>('/operator/auth/invite/accept', { token, password }).then((r) => r.data),

  signOutAllSessions: (): Promise<void> =>
    api.delete('/operator/auth/me/sessions').then(() => undefined),

  getSignInHistory: (): Promise<OperatorLoginHistory[]> =>
    api.get<OperatorLoginHistory[]>('/operator/auth/me/history').then((r: AxiosResponse<OperatorLoginHistory[]>) => r.data),

  // ── Sub-user (team) management ─────────────────────────────────────────────
  listSubUsers: (params?: { search?: string; status?: string }): Promise<OperatorSubUser[]> =>
    api.get<OperatorSubUser[]>('/operator/users', { params }).then((r: AxiosResponse<OperatorSubUser[]>) => r.data),

  inviteSubUser: (body: { name: string; email: string; operator_role: string; phone?: string }): Promise<OperatorSubUser> =>
    api.post<OperatorSubUser>('/operator/users/invite', body).then((r: AxiosResponse<OperatorSubUser>) => r.data),

  suspendSubUser: (userId: string): Promise<OperatorSubUser> =>
    api.post<OperatorSubUser>(`/operator/users/${userId}/suspend`).then((r: AxiosResponse<OperatorSubUser>) => r.data),

  reactivateSubUser: (userId: string): Promise<OperatorSubUser> =>
    api.post<OperatorSubUser>(`/operator/users/${userId}/reactivate`).then((r: AxiosResponse<OperatorSubUser>) => r.data),

  forceLogoutSubUser: (userId: string): Promise<void> =>
    api.post(`/operator/users/${userId}/force-logout`).then(() => undefined),

  resetSubUser2fa: (userId: string): Promise<void> =>
    api.post(`/operator/users/${userId}/reset-2fa`).then(() => undefined),

  resendSubUserInvite: (userId: string): Promise<void> =>
    api.post(`/operator/users/${userId}/resend-invite`).then(() => undefined),

  send2faEmailCode: (twoFaToken: string): Promise<void> =>
    api.post('/operator/auth/2fa/email-code', { two_fa_token: twoFaToken }).then(() => undefined),

  verify2faEmailCode: (twoFaToken: string, code: string): Promise<LoginResponse> =>
    api.post<LoginResponse>('/operator/auth/2fa/email-code/verify', { two_fa_token: twoFaToken, code }).then((r: AxiosResponse<LoginResponse>) => r.data),

  verifyBackupCode: (twoFaToken: string, code: string): Promise<LoginResponse> =>
    api.post<LoginResponse>('/operator/auth/2fa/verify-backup', { two_fa_token: twoFaToken, code }).then((r: AxiosResponse<LoginResponse>) => r.data),

  generateBackupCodes: (): Promise<{ codes: string[] }> =>
    api.post<{ codes: string[] }>('/operator/auth/backup-codes/generate').then((r: AxiosResponse<{ codes: string[] }>) => r.data),

  getBackupCodeStatus: (): Promise<{ total: number; used: number; remaining: number }> =>
    api.get<{ total: number; used: number; remaining: number }>('/operator/auth/backup-codes/status').then((r: AxiosResponse<{ total: number; used: number; remaining: number }>) => r.data),

  getNotificationPrefs: (): Promise<NotifPref[]> =>
    api.get<NotifPref[]>('/operator/auth/me/notification-prefs').then((r: AxiosResponse<NotifPref[]>) => r.data),

  updateNotificationPrefs: (body: NotifPref[]): Promise<NotifPref[]> =>
    api.put<NotifPref[]>('/operator/auth/me/notification-prefs', body).then((r: AxiosResponse<NotifPref[]>) => r.data),

  resetNotificationPrefs: (): Promise<NotifPref[]> =>
    api.post<NotifPref[]>('/operator/auth/me/notification-prefs/reset').then((r: AxiosResponse<NotifPref[]>) => r.data),

  getPermissions: (): Promise<{ operations: string; fleet_crew: string; finance: string; all_granted: boolean }> =>
    api.get<{ operations: string; fleet_crew: string; finance: string; all_granted: boolean }>('/operator/auth/me/permissions').then(r => r.data),
}
