import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { operatorAuthService } from '../../services/operatorAuthService'
import { useOperatorAuthStore } from '../../stores/authStore'
import { buildUserFromApi } from '../../lib/buildUser'
import BrandLockup from '../../components/layout/BrandLockup'

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
      setAuth(buildUserFromApi(res.user), res.access_token, res.refresh_token)
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
      display: 'grid',
      gridTemplateColumns: '1.08fr 1fr',
      width: '100%',
      minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      {/* Left — editorial panel */}
      <div style={{
        background: 'var(--surface-2)',
        borderRight: '1px solid var(--rule)',
        padding: '52px 60px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* faint route geometry */}
        <svg viewBox="0 0 600 600" style={{
          position: 'absolute', top: -120, right: -160, width: 720, height: 720,
          opacity: 0.10, color: 'var(--ink-3)',
        }} aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="0.8">
            <circle cx="300" cy="300" r="260" />
            <circle cx="300" cy="300" r="190" />
            <circle cx="300" cy="300" r="120" />
            <line x1="40" y1="300" x2="560" y2="300" />
            <line x1="300" y1="40" x2="300" y2="560" />
          </g>
          <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2 5">
            <path d="M120 410 Q300 110 470 230" />
            <path d="M90 230 Q300 470 500 360" />
          </g>
          <g fill="currentColor">
            <circle cx="120" cy="410" r="2.5" />
            <circle cx="470" cy="230" r="2.5" />
            <circle cx="90" cy="230" r="2.5" />
            <circle cx="500" cy="360" r="2.5" />
          </g>
        </svg>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <BrandLockup size="lg" />
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 520 }}>
            <div className="t-label" style={{ marginBottom: 26 }}>
              <span style={{ color: 'var(--accent)' }}>●</span>&nbsp;&nbsp;Operator Console · v1.0
            </div>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontSize: 46,
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: '-0.022em',
              color: 'var(--ink)',
            }}>
              Your fleet, crew, and flights —<br />
              <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-2)' }}>
                one operator workspace.
              </span>
            </h1>
            <p style={{ marginTop: 22, maxWidth: 440, fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-3)' }}>
              Accept booking requests, dispatch aircraft and crew, lock manifests, and track
              payouts — scoped to your operator account.
            </p>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ height: 1, background: 'var(--rule)', marginBottom: 18 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
            {[
              ['Platform', 'Acme Mobility'],
              ['Panel', 'Operator'],
              ['Version', 'v1.0'],
              ['Status', 'Live'],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="t-label" style={{ marginBottom: 6 }}>{k}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '52px',
        position: 'relative',
      }}>
        <div style={{ width: 384, maxWidth: '100%' }}>
          <div className="t-label" style={{ marginBottom: 14 }}>Operator sign in</div>
          <h2 style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 32,
            fontWeight: 400,
            letterSpacing: '-0.020em',
            color: 'var(--ink)',
            lineHeight: 1.08,
          }}>
            Welcome back.
          </h2>
          <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-3)' }}>
            Sign in with your operator credentials. Two-factor is required for privileged roles.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                <div className="input lg" style={{ paddingLeft: 12, gap: 10 }}>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                    autoFocus
                    style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 15 }}
                  />
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="icon" style={{ marginRight: 12 }}>
                    <path d="M3 7l9 6 9-6M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                  </svg>
                </div>
              </div>

              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label className="field-label" htmlFor="password">Password</label>
                  <Link to="/forgot-password" className="t-meta" style={{ color: 'var(--accent)' }}>
                    Forgot password?
                  </Link>
                </div>
                <div className="input lg" style={{ paddingLeft: 12 }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 15 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 44, height: '100%', flexShrink: 0,
                      color: 'var(--ink-4)', cursor: 'pointer',
                      background: 'none', border: 'none',
                    }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)' }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 2, flexShrink: 0,
                  border: '1px solid ' + (rememberDevice ? 'var(--accent)' : 'var(--rule-strong)'),
                  background: rememberDevice ? 'var(--accent-soft)' : 'var(--surface)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {rememberDevice && (
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                  )}
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={e => setRememberDevice(e.target.checked)}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                </span>
                Remember this device for 30 days
              </label>

              <button
                type="submit"
                className="btn primary lg"
                disabled={loading}
                style={{ marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {loading ? 'Signing in…' : (
                  <>
                    Continue
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14m0 0-6-6m6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '26px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            <span className="t-label" style={{ padding: 0 }}>Or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>

          <button className="btn lg" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 9.5a4 4 0 1 1-3 6L10 17l-2 2H4v-3l5.5-5.5a4 4 0 0 1 5-1Z" />
            </svg>
            Continue with Single Sign-On
          </button>

          <div style={{
            marginTop: 24, padding: '12px 14px', background: 'var(--surface-2)',
            border: '1px solid var(--rule)', borderRadius: 3,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink-3)', marginTop: 2, flexShrink: 0 }}>
              <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h4a2 2 0 0 1 2 2v10M8 7h1M8 11h1M8 15h1M12 7h1M12 11h1M12 15h1M3 21h18" />
            </svg>
            <div className="t-meta" style={{ lineHeight: 1.5 }}>
              New air operator?{' '}
              <a style={{ color: 'var(--accent)', cursor: 'pointer' }}>Request onboarding</a> — the
              platform admin reviews and approves your company before publishing.
            </div>
          </div>

          <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="t-meta">© 2026 · Acme Mobility</div>
            <div style={{ display: 'flex', gap: 16 }} className="t-meta">
              <a style={{ cursor: 'pointer' }}>Terms</a>
              <a style={{ cursor: 'pointer' }}>Privacy</a>
              <a style={{ cursor: 'pointer' }}>
                Status<span style={{ color: 'var(--ok)', marginLeft: 5 }}>●</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
