import { useState } from 'react'
import { Link } from 'react-router-dom'
import { operatorAuthService } from '../../services/operatorAuthService'
import BrandLockup from '../../components/layout/BrandLockup'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await operatorAuthService.forgotPassword(email)
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
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
            Recover your account.
          </h2>
          <p style={{ marginTop: 14, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            Enter the email address associated with your operator account. We'll send a secure
            reset link valid for 40 minutes.
          </p>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ marginTop: 32 }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Steps</div>
          {[
            { l: 'Request reset link', done: !sent, active: !sent, time: 'In progress' },
            { l: 'Check your email',   done: sent,  active: sent,  time: sent ? 'Link sent' : '—' },
            { l: 'Set new password',   done: false, active: false, time: '—' },
            { l: 'Sign back in',       done: false, active: false, time: '—' },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 0',
              borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                background: s.done ? 'var(--accent)' : 'var(--surface)',
                border: '1px solid ' + (s.done ? 'var(--accent)' : s.active ? 'var(--ink-2)' : 'var(--rule-strong)'),
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
                <div style={{ fontSize: 13, color: s.active ? 'var(--ink)' : 'var(--ink-3)', fontWeight: s.active ? 500 : 400 }}>{s.l}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>{s.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--rule)' }}>
          <div className="t-meta" style={{ lineHeight: 1.6 }}>
            Remember your password?{' '}
            <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in →</Link>
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
          {sent ? (
            <>
              <div className="t-label" style={{ marginBottom: 14 }}>Email sent</div>
              <h2 style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 26,
                fontWeight: 400,
                letterSpacing: '-0.018em',
                color: 'var(--ink)',
              }}>
                Check your inbox.
              </h2>
              <p style={{ marginTop: 14, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                If an account exists for <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{email}</span>, a
                reset link has been sent. The link is valid for 40 minutes.
              </p>

              <div style={{
                marginTop: 28, padding: '14px 16px',
                background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3,
              }}>
                <div className="t-label" style={{ marginBottom: 6 }}>Didn't receive it?</div>
                <div className="t-meta" style={{ lineHeight: 1.5 }}>
                  Check your spam folder, or{' '}
                  <button
                    onClick={() => setSent(false)}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}
                  >
                    try a different email address
                  </button>.
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <Link to="/login" className="btn lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  ← Back to sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="t-label" style={{ marginBottom: 14 }}>Password reset</div>
              <h2 style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 26,
                fontWeight: 400,
                letterSpacing: '-0.018em',
                color: 'var(--ink)',
              }}>
                Enter your email address.
              </h2>
              <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                We'll send a secure link to reset your password.
              </p>

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
                    <label className="field-label" htmlFor="email">Email address</label>
                    <div className="input lg" style={{ paddingLeft: 12, gap: 10 }}>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                        autoFocus
                        autoComplete="email"
                        style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 15 }}
                      />
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="icon" style={{ marginRight: 12 }}>
                        <path d="M3 7l9 6 9-6M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                      </svg>
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
                      {loading ? 'Sending…' : 'Send reset link'}
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
