import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plane } from 'lucide-react'
import { operatorAuthService } from '../../services/operatorAuthService'

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
              Reset Password
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
              Enter your email to receive a reset link
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
          {sent ? (
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
                If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your inbox.
              </div>
              <Link
                to="/login"
                className="btn sm"
                style={{ display: 'inline-block' }}
              >
                Back to sign in
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
                <label className="field-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="btn accent lg"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <Link
                  to="/login"
                  style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}
                >
                  ← Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
