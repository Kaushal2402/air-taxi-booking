import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Plane, CheckCircle } from 'lucide-react'
import { operatorAuthService } from '../../services/operatorAuthService'

export default function AcceptInvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) setError('Invalid invite link — no token found.')
  }, [token])

  const passwordsMatch = password === confirm
  const strongEnough = password.length >= 8

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch) { setError('Passwords do not match.'); return }
    if (!strongEnough) { setError('Password must be at least 8 characters.'); return }
    setError(null)
    setLoading(true)
    try {
      await operatorAuthService.acceptInvite(token, password)
      setDone(true)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? 'Something went wrong. Please try again.')
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
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
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
              Activate your account
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
              Set a password to get started
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
          {done ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <CheckCircle size={40} color="var(--accent)" strokeWidth={1.5} />
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
                  Account activated!
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
                  Your password has been set. You can now sign in.
                </p>
              </div>
              <button
                className="btn accent"
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => navigate('/login')}
              >
                Go to login
              </button>
            </div>
          ) : (
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

              {!token && (
                <p style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', margin: 0 }}>
                  This invite link is invalid or has expired.{' '}
                  <Link to="/login" style={{ color: 'var(--accent)' }}>Go to login</Link>
                </p>
              )}

              {token && (
                <>
                  <div className="field">
                    <label className="field-label" htmlFor="password">New password</label>
                    <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        required
                        autoFocus
                        autoComplete="new-password"
                        style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 14 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 38, flexShrink: 0, color: 'var(--ink-4)', cursor: 'pointer', background: 'none', border: 'none' }}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="confirm">Confirm password</label>
                    <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                      <input
                        id="confirm"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="Repeat password"
                        required
                        autoComplete="new-password"
                        style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 14 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(s => !s)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 38, flexShrink: 0, color: 'var(--ink-4)', cursor: 'pointer', background: 'none', border: 'none' }}
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {confirm && !passwordsMatch && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--danger)' }}>Passwords do not match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn accent lg"
                    disabled={loading || !passwordsMatch || !strongEnough}
                    style={{ width: '100%', marginTop: 4 }}
                  >
                    {loading ? 'Activating…' : 'Activate account'}
                  </button>
                </>
              )}
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
          Acme Mobility · Operator Portal
        </p>
      </div>
    </div>
  )
}
