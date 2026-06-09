import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { operatorAuthService } from '../../services/operatorAuthService'
import { useOperatorAuthStore } from '../../stores/authStore'

export default function TwoFAChallengePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useOperatorAuthStore(s => s.setAuth)

  const twoFaToken: string = (location.state as { twoFaToken?: string })?.twoFaToken ?? ''

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!twoFaToken) navigate('/login', { replace: true })
    inputRef.current?.focus()
  }, [twoFaToken, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return
    setError(null)
    setLoading(true)
    try {
      const res = await operatorAuthService.verify2faLogin(twoFaToken, code)
      setAuth(
        {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
          operatorId: res.user.operator_id,
          operatorName: res.user.operator_name ?? '',
          twoFactorEnabled: res.user.two_factor_enabled,
          phone: res.user.phone,
          avatarUrl: res.user.avatar_url,
        },
        res.access_token,
        res.refresh_token,
      )
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Invalid code. Please try again.')
      setCode('')
      inputRef.current?.focus()
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
            <ShieldCheck size={24} color="#fff" strokeWidth={1.6} />
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
              Two-Factor Authentication
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
              Enter the 6-digit code from your authenticator app
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
              <label className="field-label" htmlFor="otp-code">Authentication Code</label>
              <input
                ref={inputRef}
                id="otp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="input"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                autoComplete="one-time-code"
                style={{ letterSpacing: '0.4em', fontSize: 22, textAlign: 'center' }}
              />
            </div>

            <button
              type="submit"
              className="btn accent lg"
              disabled={loading || code.length !== 6}
              style={{ width: '100%' }}
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Link
              to="/login"
              style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
