import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import BrandLockup from '../../components/layout/BrandLockup'
import Icon from '../../components/ui/Icon'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore(s => s.setAuth)
  const isMobile = useIsMobile()
  const [showPw, setShowPw] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isLockedOut, setIsLockedOut] = useState(false)
  const [loading, setLoading] = useState(false)
  const locationMessage = (location.state as any)?.message as string | undefined

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { remember_me: false },
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    setIsLockedOut(false)
    setLoading(true)
    try {
      const res = await authService.login(data)
      if (res.requires_2fa && res.partial_token) {
        navigate('/2fa', { state: { partial_token: res.partial_token, email: data.email, has_phone: res.has_phone ?? false } })
      } else if (res.access_token && res.refresh_token && res.user) {
        setAuth(res.user, res.access_token, res.refresh_token)
        navigate('/dashboard')
      }
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 403) {
        setIsLockedOut(true)
        setApiError(e?.response?.data?.message || 'Account is temporarily locked due to too many failed attempts.')
      } else {
        setIsLockedOut(false)
        setApiError(e?.response?.data?.message || 'Invalid email or password')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: isMobile ? 'flex' : 'grid',
      gridTemplateColumns: isMobile ? undefined : '1.08fr 1fr',
      flexDirection: isMobile ? 'column' : undefined,
      width: '100%',
      height: '100vh',
      background: 'var(--bg)',
    }}>
      {/* Left editorial panel — desktop only */}
      {!isMobile && (
        <div style={{
          background: 'var(--surface-2)',
          borderRight: '1px solid var(--rule)',
          padding: '56px 64px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Faint route geometry */}
          <svg viewBox="0 0 600 600" style={{
            position: 'absolute', top: -120, right: -160,
            width: 720, height: 720,
            opacity: 0.10, color: 'var(--ink-3)',
          }} aria-hidden>
            <g fill="none" stroke="currentColor" strokeWidth="0.8">
              <circle cx="300" cy="300" r="260" />
              <circle cx="300" cy="300" r="200" />
              <circle cx="300" cy="300" r="140" />
              <circle cx="300" cy="300" r="80" />
              <line x1="40" y1="300" x2="560" y2="300" />
              <line x1="300" y1="40" x2="300" y2="560" />
              <line x1="118" y1="118" x2="482" y2="482" />
              <line x1="482" y1="118" x2="118" y2="482" />
            </g>
            <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2 4">
              <path d="M120 380 Q300 80 480 220" />
              <path d="M80 200 Q260 460 520 380" />
            </g>
            <g fill="currentColor">
              <circle cx="120" cy="380" r="2.5" />
              <circle cx="480" cy="220" r="2.5" />
              <circle cx="80" cy="200" r="2.5" />
              <circle cx="520" cy="380" r="2.5" />
            </g>
          </svg>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <BrandLockup size="lg" />
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ maxWidth: 520 }}>
              <div className="t-label" style={{ marginBottom: 28 }}>
                <span style={{ color: 'var(--accent)' }}>●</span>&nbsp;&nbsp;Operations Console · v1.4.2
              </div>
              <h1 style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 48,
                fontWeight: 400,
                lineHeight: 1.08,
                letterSpacing: '-0.022em',
                color: 'var(--ink)',
              }}>
                A single console for moving people,<br />
                <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-2)' }}>
                  on the ground and in the air.
                </span>
              </h1>
              <p style={{ marginTop: 22, maxWidth: 440, fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-3)' }}>
                Dispatch, fleet, fares, payouts, and compliance — all in one place.
                Built around the way operators actually work: by exception, by zone, by the hour.
              </p>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ height: 1, background: 'var(--rule)', marginBottom: 18 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
              {[
                ['Build', '26.05.21 · 9F23'],
                ['Region', 'Asia / Kolkata'],
                ['Licensed', 'Acme Mobility Pvt Ltd'],
                ['Channel', 'Stable · Prod'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="t-label" style={{ marginBottom: 6 }}>{k}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Form panel */}
      <div style={{
        background: 'var(--surface)',
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '40px 24px 32px' : '56px',
        flex: 1,
        overflowY: 'auto',
      }}>
        <div style={{ width: 384, maxWidth: '100%' }}>
          {/* Brand shown on mobile since editorial panel is hidden */}
          {isMobile && (
            <div style={{ marginBottom: 32 }}>
              <BrandLockup />
            </div>
          )}

          <div className="t-label" style={{ marginBottom: 14 }}>Sign in</div>
          <h2 style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: isMobile ? 28 : 32,
            fontWeight: 400,
            letterSpacing: '-0.020em',
            color: 'var(--ink)',
            lineHeight: 1.08,
          }}>Welcome back.</h2>
          <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-3)' }}>
            Use your administrator credentials to access the console.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {locationMessage && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--ok-soft)',
                border: '1px solid color-mix(in oklab, var(--ok) 32%, var(--rule-strong))',
                borderRadius: 3,
                fontSize: 13,
                color: 'var(--ok)',
              }}>{locationMessage}</div>
            )}
            {apiError && isLockedOut && (
              <div style={{
                padding: '12px 14px',
                background: 'var(--warn-soft, #fef3c7)',
                border: '1px solid color-mix(in oklab, var(--warn, #d97706) 35%, transparent)',
                borderRadius: 3,
                fontSize: 13,
                color: 'var(--warn, #92400e)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <Icon name="lock" size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--warn, #d97706)' }} />
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>Account temporarily locked</div>
                  <div style={{ opacity: 0.85 }}>{apiError}</div>
                </div>
              </div>
            )}
            {apiError && !isLockedOut && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 32%, var(--rule-strong))',
                borderRadius: 3,
                fontSize: 13,
                color: 'var(--danger)',
              }}>{apiError}</div>
            )}

            <div className="field">
              <label className="field-label">Email</label>
              <div className={`input lg${errors.email ? ' error' : ''}`}>
                <input {...register('email')} type="email" placeholder="you@acmemobility.io" autoComplete="email" />
              </div>
              {errors.email && <span className="field-error">{errors.email.message}</span>}
            </div>

            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label className="field-label">Password</label>
                <Link to="/forgot-password" className="t-meta" style={{ color: 'var(--accent)' }}>Forgot password?</Link>
              </div>
              <div className={`input lg${errors.password ? ' error' : ''}`}>
                <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="••••••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
                  <Icon name={showPw ? 'eyeOff' : 'eye'} size={15} />
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password.message}</span>}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)' }}>
              <input {...register('remember_me')} type="checkbox" style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
              Keep me signed in on this device
            </label>

            <button type="submit" disabled={loading} className="btn primary lg" style={{ marginTop: 8, width: '100%' }}>
              {loading ? 'Signing in…' : (<>Continue &nbsp;<Icon name="arrowRight" size={14} /></>)}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            <span className="t-label" style={{ padding: 0 }}>Or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>

          <button className="btn lg" disabled title="Single Sign-On is not yet configured for this workspace" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>
            <Icon name="key" size={14} /> Continue with Single Sign-On
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Soon</span>
          </button>

          <div style={{ marginTop: 36, paddingTop: 18, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="t-meta">© 2026 · Acme Mobility</div>
            <div style={{ display: 'flex', gap: 16 }} className="t-meta">
              <a style={{ cursor: 'pointer' }}>Terms</a>
              <a style={{ cursor: 'pointer' }}>Privacy</a>
              <a style={{ cursor: 'pointer' }}>Status<span style={{ color: 'var(--ok)', marginLeft: 5 }}>●</span></a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
