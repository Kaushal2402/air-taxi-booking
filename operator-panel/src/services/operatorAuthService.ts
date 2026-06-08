import api from '../lib/axios'
import type { AxiosResponse } from 'axios'

export interface LoginResponse {
  access_token: string
  refresh_token: string
  requires_2fa: boolean
  two_fa_token?: string
  user: {
    id: string
    name: string
    email: string
    role: string
    operator_id: string
    operator_name: string
    two_factor_enabled: boolean
    phone: string | null
    avatar_url: string | null
  }
}

export interface RefreshResponse {
  access_token: string
  refresh_token: string
  user: LoginResponse['user']
}

export const operatorAuthService = {
  login: (email: string, password: string, rememberDevice = false): Promise<LoginResponse> =>
    api
      .post<LoginResponse>('/auth/login', { email, password, remember_device: rememberDevice })
      .then((r: AxiosResponse<LoginResponse>) => r.data),

  verify2fa: (token: string, code: string): Promise<LoginResponse> =>
    api
      .post<LoginResponse>('/auth/2fa/verify', { token, code })
      .then((r: AxiosResponse<LoginResponse>) => r.data),

  refresh: (refreshToken: string): Promise<RefreshResponse> =>
    api
      .post<RefreshResponse>('/auth/refresh', { refresh_token: refreshToken })
      .then((r: AxiosResponse<RefreshResponse>) => r.data),

  logout: (): Promise<void> =>
    api.post('/auth/logout').then(() => undefined),

  forgotPassword: (email: string): Promise<void> =>
    api.post('/auth/forgot-password', { email }).then(() => undefined),

  resetPassword: (token: string, newPassword: string): Promise<void> =>
    api.post('/auth/reset-password', { token, new_password: newPassword }).then(() => undefined),
}
