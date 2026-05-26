import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import BrandLockup from '../../components/layout/BrandLockup'
import Icon from '../../components/ui/Icon'
import { authService } from '../../services/authService'
import { useIsMobile } from '../../hooks/useIsMobile'

const schema = z.object({
  password: z.string().min(12, 'At least 12 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type FormData = z.infer<typeof schema>

function strengthOf(pw: string): number {
  let s = 0
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const strengthLabels = ['', 'Weak', 'Fair', 'Strong', 'Excellent']
const strengthColors = ['', 'var(--danger)', 'var(--warn)', 'var(--accent)', 'var(--accent)']

export default function AcceptInvitePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const isMobile = useIsMobile()

  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const pw = watch('password', '')
  const strength = strengthOf(pw)

  const rules: [string, boolean][] = [
    ['At least 12 characters', pw.length >= 12],
    ['One uppercase letter',   /[A-Z]/.test(pw)],
    ['One number',             /[0-9]/.test(pw)],
    ['One symbol',             /[^A-Za-z0-9]/.test(pw)],
  ]

  const onSubmit = async (data: FormData) => {
    setApiError('')
    setLoading(true)
    try {
      await authService.acceptInvite(token, data.password, data.confirm_password)
      navigate('/login', { state: { message: 'Account activated — please sign in with your new password.' } })
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Invitation link is invalid or has expired')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <Icon name="alert" size={32} style={{ color: 'var(--danger)', marginBottom: 16 }} />
          <p style={{ color: 'var(--ink-3)', marginBottom: 16 }}>Invalid or missing invitation token.</p>
          <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Please use the link from your invitation email, or ask an administrator to resend it.</p>
          <Link to="/login"><button className="btn primary" style={{ marginTop: 20 }}>Go to sign in</button></Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--bg)',
      display: isMobile ? 'flex' : 'grid',
      flexDirection: isMobile ? 'column' : undefined,
      gridTemplateColumns: isMobile ? undefined : '420px 1fr',
    }}>
      {/* Left rail — desktop only */}
      {!isMobile && (
        <div style={{
          background: 'var(--surface-2)',
          borderRight: '1px solid var(--rule)',
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <BrandLockup />

          <div style={{ marginTop: 44 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 4,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
              border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--rule-strong))',
            }}>
              <Icon name="user" size={20} />
            </div>
            <div className="t-label" style={{ marginBottom: 10 }}>You've been invited</div>
            <h2 style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontSize: 30,
              fontWeight: 400,
              letterSpacing: '-0.018em',
              lineHeight: 1.1,
            }}>Welcome aboard.</h2>
            <p style={{ marginTop: 14, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
              Set a strong password to activate your account. You can set up two-factor authentication after signing in.
            </p>
          </div>

          <div style={{ flex: 1 }} />

          {/* Steps */}
          <div style={{ marginTop: 32 }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Steps</div>
            {[
              { l: 'Invitation sent',    done: true  },
              { l: 'Link opened',        done: true  },
              { l: 'Set password',       done: false, active: true },
              { l: 'Sign in',            done: false },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 0',
                borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none',
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: s.done ? 'var(--accent)' : (s.active ? 'var(--ink)' : 'var(--surface)'),
                  border: '1px solid ' + (s.done ? 'var(--accent)' : (s.active ? 'var(--ink)' : 'var(--rule-strong)')),
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 2,
                  color: s.done || s.active ? '#fff' : 'var(--ink-3)',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                }}>
                  {s.done ? <Icon name="check" size={11} stroke={2.4} /> : (i + 1)}
                </span>
                <div style={{ fontSize: 13, color: s.done || s.active ? 'var(--ink)' : 'var(--ink-3)', fontWeight: s.active ? 500 : 400, paddingTop: 2 }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Right — form */}
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '40px 24px 32px' : '40px',
        overflowY: 'auto',
      }}>
        <div style={{ width: 460, maxWidth: '100%' }}>
          {isMobile && <div style={{ marginBottom: 28 }}><BrandLockup /></div>}

          <div className="t-label" style={{ marginBottom: 14 }}>Create password</div>
          <h2 style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: isMobile ? 22 : 26,
            fontWeight: 400,
            letterSpacing: '-0.018em',
          }}>
            Activate your account.
          </h2>
          <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            Choose a strong password. This link expires in 72 hours.
          </p>

          {apiError && (
            <div style={{
              marginTop: 20, padding: '10px 14px',
              background: 'var(--danger-soft)',
              border: '1px solid color-mix(in oklab, var(--danger) 32%, var(--rule-strong))',
              borderRadius: 3, fontSize: 13, color: 'var(--danger)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon name="alert" size={14} stroke={2} style={{ flexShrink: 0 }} />
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Password */}
            <div className="field">
              <label className="field-label">Password</label>
              <div className={`input lg${errors.password ? ' error' : ''}`}>
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  autoFocus
                />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
                  <Icon name={showPw ? 'eyeOff' : 'eye'} size={15} />
                </button>
              </div>
              {pw && (
                <>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {[0, 1, 2, 3].map(i => (
                      <span key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i < strength ? strengthColors[strength] : 'var(--rule)',
                        transition: 'background 200ms',
                      }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span className="t-meta" style={{ color: strengthColors[strength] }}>{strengthLabels[strength]}</span>
                  </div>
                </>
              )}
              {errors.password && <span className="field-error">{errors.password.message}</span>}
            </div>

            {/* Confirm */}
            <div className="field">
              <label className="field-label">Confirm password</label>
              <div className={`input lg${errors.confirm_password ? ' error' : ''}`}>
                <input
                  {...register('confirm_password')}
                  type={showCf ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowCf(p => !p)} style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
                  <Icon name={showCf ? 'eyeOff' : 'eye'} size={15} />
                </button>
              </div>
              {errors.confirm_password && <span className="field-error">{errors.confirm_password.message}</span>}
            </div>

            {/* Policy checklist */}
            <div style={{
              padding: '14px 16px',
              background: 'var(--surface-2)',
              border: '1px solid var(--rule)',
              borderRadius: 3,
            }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Password policy</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 6 }}>
                {rules.map(([label, ok], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: ok ? 'var(--ink-2)' : 'var(--ink-4)' }}>
                    <Icon name={ok ? 'check' : 'dot'} size={12} stroke={ok ? 2.2 : 3} style={{ color: ok ? 'var(--accent)' : 'var(--ink-4)' }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn primary lg"
              style={{ marginTop: 4 }}
            >
              {loading
                ? <><Icon name="loader" size={15} style={{ animation: 'spin 0.8s linear infinite', marginRight: 7 }} />Activating…</>
                : 'Activate account and sign in'
              }
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <span className="t-meta">Already have an account? </span>
            <Link to="/login" style={{ color: 'var(--accent)', fontSize: 13 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
