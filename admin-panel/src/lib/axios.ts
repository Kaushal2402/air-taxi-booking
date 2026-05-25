import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Read token from Zustand persisted store (stored under "auth-storage")
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

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Public auth endpoints return 401 legitimately (wrong credentials, bad token).
// We must NOT clear the session or redirect for those — only do it for
// authenticated endpoints that reject an otherwise-valid Bearer token.
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/2fa/verify',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/invite/accept',
  '/auth/change-password',
]

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestUrl: string = error.config?.url ?? ''
    const isPublic = PUBLIC_AUTH_PATHS.some(p => requestUrl.includes(p))

    if (error.response?.status === 401 && !isPublic) {
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
