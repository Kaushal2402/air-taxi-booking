import axios from 'axios'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001') + '/api/v1/operator'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('operator-auth-storage')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.accessToken ?? null
  } catch {
    return null
  }
}

function getRefreshToken(): string | null {
  try {
    const raw = localStorage.getItem('operator-auth-storage')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.refreshToken ?? null
  } catch {
    return null
  }
}

function patchStoredTokens(accessToken: string, refreshToken: string): void {
  try {
    const raw = localStorage.getItem('operator-auth-storage')
    if (!raw) return
    const parsed = JSON.parse(raw)
    parsed.state.accessToken = accessToken
    parsed.state.refreshToken = refreshToken
    localStorage.setItem('operator-auth-storage', JSON.stringify(parsed))
  } catch { /* ignore */ }
}

function clearAndRedirect(): void {
  localStorage.removeItem('operator-auth-storage')
  window.location.href = '/login'
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/2fa/verify',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
  '/auth/invite/accept',
]

let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function flushQueue(err: unknown, token: string | null): void {
  refreshQueue.forEach(p => (err ? p.reject(err) : p.resolve(token!)))
  refreshQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean }
    const url: string = original?.url ?? ''
    const isPublic = PUBLIC_AUTH_PATHS.some(p => url.includes(p))

    if (error.response?.status !== 401 || isPublic || original?._retry) {
      return Promise.reject(error)
    }

    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearAndRedirect()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      )
      patchStoredTokens(data.access_token, data.refresh_token)
      flushQueue(null, data.access_token)
      original.headers.Authorization = `Bearer ${data.access_token}`
      return api(original)
    } catch (refreshErr) {
      flushQueue(refreshErr, null)
      clearAndRedirect()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
