import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Plane } from 'lucide-react'
import { operatorAuthService } from '../../services/operatorAuthService'
import { useOperatorAuthStore } from '../../stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useOperatorAuthStore(s => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await operatorAuthService.login(email, password, rememberDevice)
      if (res.requires_2fa) {
        navigate('/2fa', { state: { twoFaToken: res.two_fa_token } })
        return
      }
      setAuth(
        {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
          operatorId: res.user.operator_id,
          operatorName: res.user.operator_name,
          twoFactorEnabled: res.user.two_factor_enabled,
          phone: res.user.phone,
          avatarUrl: res.user.avatar_url,
        },
        res.access_token,
        res.refresh_token,
      )
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response?.status
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (status === 403 && detail?.toLowerCase().includes('suspend')) {
        setError('Your organization has been suspended. Please contact support.')
      } else if (status === 401) {
        setError('Invalid email or password.')
      } else {
        setError(detail ?? 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 36,
          gap: 12,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Plane size={24} color="#fff" strokeWidth={1.6} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontSize: 24,
              fontWeight: 400,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
            }}>
              Operator Panel
            </h1>
            <p style={{
              margin: '6px 0 0',
              fontSize: 13,
              color: 'var(--ink-3)',
            }}>
              Sign in to your operator account
            </p>
          </div>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          padding: 28,
          boxShadow: 'var(--shadow-2)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && (
              <div style={{
                background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
                borderRadius: 4,
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--danger)',
              }}>
                {error}
              </div>
            )}

            <div className="field">
              <label className="field-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 40, height: 38, flexShrink: 0,
                    color: 'var(--ink-4)', cursor: 'pointer',
                    background: 'none', border: 'none',
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={e => setRememberDevice(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                />
                Remember this device
              </label>

              <Link
                to="/forgot-password"
                style={{
                  fontSize: 12,
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.02em',
                }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn accent lg"
              disabled={loading}
              style={{ width: '100%', marginTop: 4 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: 12,
          color: 'var(--ink-4)',
          fontFamily: 'var(--font-mono)',
        }}>
          Acme Mobility · Operator Portal
        </p>
      </div>
    </div>
  )
}
