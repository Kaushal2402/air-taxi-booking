import axios from 'axios'
import { usePlatformStore } from '../store/platformStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── LocalStorage helpers ─────────────────────────────────────────────────────

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.accessToken ?? null
  } catch {
    return null
  }
}

function getRefreshToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.refreshToken ?? null
  } catch {
    return null
  }
}

/**
 * Patch the persisted Zustand store in-place so the updated tokens are
 * available to the next request without requiring a full store re-hydration.
 */
function patchStoredTokens(accessToken: string, refreshToken: string): void {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return
    const parsed = JSON.parse(raw)
    parsed.state.accessToken = accessToken
    parsed.state.refreshToken = refreshToken
    localStorage.setItem('auth-storage', JSON.stringify(parsed))
  } catch { /* ignore */ }
}

function clearAndRedirect(): void {
  localStorage.removeItem('auth-storage')
  window.location.href = '/login'
}

// ── Request interceptor — attach Bearer token + timezone ────────────────────

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Read platform timezone on every request so it reflects settings after load.
  // Falls back to UTC (never browser TZ) to stay consistent with getUserTimezone().
  const tz = usePlatformStore.getState().timezone || 'UTC'
  config.headers['X-Timezone'] = tz
  return config
})

// ── Response interceptor — silent token refresh on 401 ──────────────────────

// These paths return 401 legitimately (wrong credentials, bad partial token…).
// Never attempt a token refresh for them, and never redirect to /login.
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/2fa/verify',
  '/auth/2fa/backup-verify',
  '/auth/2fa/email-otp',
  '/auth/2fa/sms-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/invite/accept',
  '/auth/change-password',
  '/auth/refresh',  // must be here to prevent an infinite refresh loop
]

// Shared state for concurrent 401 handling.
// When one request triggers a refresh, all other 401s queue up and wait
// for the single refresh attempt to resolve before retrying.
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

    // Only attempt a refresh for authenticated endpoints that return 401
    // and only once per request (guard with _retry flag).
    if (error.response?.status !== 401 || isPublic || original?._retry) {
      return Promise.reject(error)
    }

    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearAndRedirect()
      return Promise.reject(error)
    }

    // A refresh is already in-flight — queue this request.
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
      // Use a raw axios call (not `api`) to bypass this interceptor.
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
