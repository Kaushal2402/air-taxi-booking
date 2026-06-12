import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { operatorAuthService } from '../../services/operatorAuthService'
import BrandLockup from '../../components/layout/BrandLockup'

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: 'var(--rule-strong)' }
  let score = 0
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['Weak', 'Fair', 'Good', 'Strong']
  const colors = ['var(--danger)', 'var(--warn)', '#0a7d5a', 'var(--accent)']
  return { score, label: labels[score - 1] ?? 'Weak', color: colors[score - 1] ?? 'var(--danger)' }
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  const strength = getStrength(password)

  const checks = [
    { label: 'At least 12 characters',   ok: password.length >= 12 },
    { label: 'One uppercase letter',      ok: /[A-Z]/.test(password) },
    { label: 'One number',               ok: /[0-9]/.test(password) },
    { label: 'One symbol',               ok: /[^A-Za-z0-9]/.test(password) },
    { label: 'Passwords match',          ok: password.length > 0 && password === confirmPassword },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (strength.score < 2) { setError('Please choose a stronger password'); return }
    setError(null)
    setLoading(true)
    try {
      await operatorAuthService.resetPassword(token, password)
      setDone(true)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? 'Invalid or expired reset link. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'grid',
      gridTemplateColumns: '420px 1fr',
    }}>
      {/* Left sidebar */}
      <div style={{
        background: 'var(--surface-2)',
        borderRight: '1px solid var(--rule)',
        padding: '40px 36px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <BrandLockup />

        <div style={{ marginTop: 44 }}>
          <div className="t-label" style={{ marginBottom: 10 }}>Account recovery</div>
          <h2 style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 30,
            fontWeight: 400,
            letterSpacing: '-0.018em',
            lineHeight: 1.1,
            color: 'var(--ink)',
          }}>
            Set a new password.
          </h2>
          <p style={{ marginTop: 14, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            Your reset link is valid for the next forty minutes. Once you save, every active
            session on your account is signed out.
          </p>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ marginTop: 32 }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Steps</div>
          {[
            { l: 'Email requested', done: true,  time: 'Completed' },
            { l: 'Link verified',   done: true,  time: 'Completed' },
            { l: 'Set new password',done: done,  time: done ? 'Done' : 'In progress' },
            { l: 'Sign back in',    done: false, time: '—' },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 0',
              borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                background: s.done ? 'var(--accent)' : 'var(--surface)',
                border: '1px solid ' + (s.done ? 'var(--accent)' : 'var(--rule-strong)'),
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}>
                {s.done && (
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                )}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: s.done ? 'var(--ink)' : 'var(--ink-2)', fontWeight: s.done ? 400 : 500 }}>{s.l}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>{s.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--rule)' }}>
          <div className="t-meta" style={{ lineHeight: 1.6, color: 'var(--ink-3)' }}>
            Reset requested via secure link.<br />
            All sessions will be revoked on save.
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}>
        <div style={{ width: 460 }}>
          {done ? (
            <>
              <div className="t-label" style={{ marginBottom: 14 }}>Password updated</div>
              <h2 style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 26,
                fontWeight: 400,
                letterSpacing: '-0.018em',
                color: 'var(--ink)',
              }}>
                You're all set.
              </h2>
              <p style={{ marginTop: 14, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                Your password has been updated and all other sessions have been signed out.
                Sign back in with your new credentials.
              </p>
              <div style={{ marginTop: 28 }}>
                <Link to="/login" className="btn primary lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Sign in →
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="t-label" style={{ marginBottom: 14 }}>New password</div>
              <h2 style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 26,
                fontWeight: 400,
                letterSpacing: '-0.018em',
                color: 'var(--ink)',
              }}>
                Choose something memorable, but unguessable.
              </h2>

              <form onSubmit={handleSubmit}>
                <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {error && (
                    <div style={{
                      background: 'var(--danger-soft)',
                      border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
                      borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)',
                    }}>
                      {error}
                    </div>
                  )}

                  <div className="field">
                    <label className="field-label" htmlFor="new-password">New password</label>
                    <div className="input lg" style={{ paddingLeft: 12 }}>
                      <input
                        id="new-password"
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        autoFocus
                        autoComplete="new-password"
                        style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 15 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(s => !s)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 44, height: '100%', flexShrink: 0,
                          color: 'var(--ink-4)', cursor: 'pointer',
                          background: 'none', border: 'none',
                        }}
                        tabIndex={-1}
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {password.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                          {[0, 1, 2, 3].map(i => (
                            <span key={i} style={{
                              flex: 1, height: 3, borderRadius: 2,
                              background: i < strength.score
                                ? (strength.score >= 3 ? 'var(--accent)' : 'var(--warn)')
                                : 'var(--rule)',
                            }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="t-meta" style={{ color: strength.color }}>{strength.label}</span>
                          {strength.score >= 4 && (
                            <span className="t-meta">Est. 4 centuries to crack</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
                    <div className="input lg" style={{ paddingLeft: 12 }}>
                      <input
                        id="confirm-password"
                        type={showPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        autoComplete="new-password"
                        style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 15 }}
                      />
                      {confirmPassword.length > 0 && password === confirmPassword && (
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', marginRight: 12 }}>
                          <path d="m5 13 4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Password policy */}
                  <div style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                    <div className="t-label" style={{ marginBottom: 8 }}>Password policy</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {checks.map(({ label, ok }, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: ok ? 'var(--ink-2)' : 'var(--ink-3)' }}>
                          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ok ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: ok ? 'var(--accent)' : 'var(--ink-4)', flexShrink: 0 }}>
                            {ok
                              ? <path d="m5 13 4 4L19 7" />
                              : <circle cx="12" cy="12" r="1" fill="currentColor" />
                            }
                          </svg>
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <Link to="/login" className="btn lg" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className="btn primary lg"
                      disabled={loading}
                      style={{ flex: 2 }}
                    >
                      {loading ? 'Saving…' : 'Save and sign out other sessions'}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
