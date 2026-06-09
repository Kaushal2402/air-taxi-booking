import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Plane } from 'lucide-react'
import { operatorAuthService } from '../../services/operatorAuthService'

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: 'var(--rule-strong)' }
  let score = 0
  if (pw.length >= 8) score++
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (strength.score < 2) {
      setError('Please choose a stronger password')
      return
    }
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
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
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
              New Password
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
              Choose a new password for your account
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
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: 'var(--ok-soft)',
                border: '1px solid color-mix(in oklab, var(--ok) 30%, var(--rule))',
                borderRadius: 4,
                padding: '14px 18px',
                fontSize: 13,
                color: 'var(--ok)',
                marginBottom: 20,
              }}>
                Password reset successfully. You can now sign in.
              </div>
              <Link to="/login" className="btn accent sm" style={{ display: 'inline-block' }}>
                Sign in
              </Link>
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

              <div className="field">
                <label className="field-label" htmlFor="new-password">New Password</label>
                <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                  <input
                    id="new-password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoFocus
                    autoComplete="new-password"
                    style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 14 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 40, height: 38, flexShrink: 0,
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
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{
                          height: 3, flex: 1, borderRadius: 2,
                          background: i <= strength.score ? strength.color : 'var(--rule-strong)',
                          transition: 'background 0.2s',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: strength.color, fontFamily: 'var(--font-mono)' }}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type={showPw ? 'text' : 'password'}
                  className="input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn accent lg"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Resetting…' : 'Set new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
