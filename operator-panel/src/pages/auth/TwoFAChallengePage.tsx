import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { operatorAuthService } from '../../services/operatorAuthService'
import { useOperatorAuthStore } from '../../stores/authStore'
import { buildUserFromApi } from '../../lib/buildUser'
import BrandLockup from '../../components/layout/BrandLockup'

export default function TwoFAChallengePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useOperatorAuthStore(s => s.setAuth)

  const twoFaToken: string = (location.state as { twoFaToken?: string })?.twoFaToken ?? ''

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [trustDevice, setTrustDevice] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [emailMode, setEmailMode] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(38)

  const [recoveryMode, setRecoveryMode] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!twoFaToken) navigate('/login', { replace: true })
    inputRefs.current[0]?.focus()
  }, [twoFaToken, navigate])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const code = digits.join('')

  const finishAuth = (res: Awaited<ReturnType<typeof operatorAuthService.verify2faLogin>>) => {
    setAuth(buildUserFromApi(res.user), res.access_token, res.refresh_token)
    navigate('/dashboard', { replace: true })
  }

  const handleDigitChange = (idx: number, value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (!cleaned) {
      const next = [...digits]
      next[idx] = ''
      setDigits(next)
      return
    }
    // handle paste of full code
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split('')
      const next = ['', '', '', '', '', '']
      chars.forEach((c, i) => { next[i] = c })
      setDigits(next)
      const focusIdx = Math.min(chars.length, 5)
      inputRefs.current[focusIdx]?.focus()
      return
    }
    const next = [...digits]
    next[idx] = cleaned
    setDigits(next)
    if (idx < 5) inputRefs.current[idx + 1]?.focus()
  }

  const handleDigitKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    if (code.length !== 6) return
    setError(null)
    setLoading(true)
    try {
      const res = await operatorAuthService.verify2faLogin(twoFaToken, code)
      finishAuth(res)
    } catch {
      setError('Invalid code. Please try again.')
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmailCode = async () => {
    setSendingEmail(true)
    setEmailError(null)
    try {
      await operatorAuthService.send2faEmailCode(twoFaToken)
      setEmailSent(true)
      setEmailMode(true)
      setDigits(['', '', '', '', '', ''])
      setCountdown(38)
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setEmailError(detail ?? 'Failed to send email code')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleVerifyEmail = async () => {
    setEmailError(null)
    try {
      const res = await operatorAuthService.verify2faEmailCode(twoFaToken, code)
      finishAuth(res)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setEmailError(detail ?? 'Invalid code')
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }

  const handleVerifyRecovery = async () => {
    if (!recoveryCode.trim()) return
    setRecoveryLoading(true)
    setRecoveryError(null)
    try {
      const res = await operatorAuthService.verifyBackupCode(twoFaToken, recoveryCode)
      finishAuth(res)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setRecoveryError(detail ?? 'Invalid or already-used recovery code')
    } finally {
      setRecoveryLoading(false)
    }
  }

  const activeError = emailMode ? emailError : error
  const handleSubmit = emailMode ? handleVerifyEmail : handleVerify

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '28px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--rule-soft)',
      }}>
        <BrandLockup />
        <div className="t-meta">Step 2 of 2 · Verify identity</div>
      </div>

      {/* Step breadcrumb */}
      <div style={{
        position: 'absolute', top: 96, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)' }} className="t-label">
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 13 4 4L19 7" />
              </svg>
            </span>
            Credentials
          </span>
          <span style={{ width: 32, height: 1, background: 'var(--rule)' }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="t-label">
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--ink)', color: 'var(--surface)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 10,
            }}>2</span>
            <span style={{ color: 'var(--ink)' }}>Two-factor</span>
          </span>
        </div>
      </div>

      {/* Card */}
      <div className="card" style={{
        width: 520,
        padding: '44px 48px',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-2)',
        marginTop: 60,
      }}>
        {/* Shield icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 4,
          background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 22,
          border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--rule-strong))',
        }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
          </svg>
        </div>

        <h2 style={{
          margin: 0,
          fontFamily: 'var(--font-serif)',
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: '-0.018em',
          lineHeight: 1.1,
          color: 'var(--ink)',
        }}>
          Two-factor verification
        </h2>
        <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          {emailMode
            ? 'Enter the six-digit code sent to your email address.'
            : 'Open your authenticator app and enter the six-digit code. 2FA is mandatory for the Operator Admin role.'
          }
        </p>

        {emailSent && emailMode && (
          <div style={{
            marginTop: 16,
            padding: '10px 14px',
            background: 'color-mix(in oklab, var(--accent) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--accent) 30%, var(--rule-strong))',
            borderRadius: 3, fontSize: 13, color: 'var(--accent)',
          }}>
            Code sent to your email.
          </div>
        )}

        {activeError && (
          <div style={{
            marginTop: 16,
            padding: '10px 14px',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
            borderRadius: 3, fontSize: 13, color: 'var(--danger)',
          }}>
            {activeError}
          </div>
        )}

        {/* 6-box OTP */}
        <div style={{ marginTop: 28 }}>
          <label className="field-label" style={{ marginBottom: 10, display: 'block' }}>
            Verification code
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleDigitKeyDown(i, e)}
                onFocus={e => e.target.select()}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                style={{
                  width: 56, height: 64,
                  border: '1px solid ' + (d ? 'var(--rule-strong)' : document.activeElement === inputRefs.current[i] ? 'var(--accent)' : 'var(--rule-strong)'),
                  borderRadius: 3,
                  background: 'var(--surface)',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 26,
                  fontWeight: 400,
                  color: 'var(--ink)',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocusCapture={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = 'var(--focus-ring)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--rule-strong)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            ))}
          </div>
        </div>

        {/* Trust device checkbox */}
        <div style={{ marginTop: 22 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)' }}>
            <span style={{
              width: 16, height: 16, borderRadius: 2, flexShrink: 0,
              border: '1px solid ' + (trustDevice ? 'var(--accent)' : 'var(--rule-strong)'),
              background: trustDevice ? 'var(--accent-soft)' : 'var(--surface)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {trustDevice && (
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
                  <path d="m5 13 4 4L19 7" />
                </svg>
              )}
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={e => setTrustDevice(e.target.checked)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              />
            </span>
            Trust this device for 30 days
          </label>
        </div>

        <button
          className="btn primary lg"
          onClick={handleSubmit}
          disabled={loading || code.length !== 6}
          style={{ marginTop: 22, width: '100%' }}
        >
          {loading ? 'Verifying…' : 'Verify and sign in'}
        </button>

        {/* Resend / switch mode */}
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="t-meta">
            {countdown > 0
              ? <>Resend code in <span style={{ color: 'var(--ink-2)' }}>00:{pad(countdown)}</span></>
              : <button
                  type="button"
                  onClick={() => { setCountdown(38); if (emailMode) handleSendEmailCode() }}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                >
                  Resend code
                </button>
            }
          </span>
          {!emailMode ? (
            <button
              type="button"
              onClick={handleSendEmailCode}
              disabled={sendingEmail}
              className="t-meta"
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer' }}
            >
              {sendingEmail ? 'Sending…' : 'Email me a code instead →'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setEmailMode(false); setEmailError(null); setDigits(['', '', '', '', '', '']); setTimeout(() => inputRefs.current[0]?.focus(), 50) }}
              className="t-meta"
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer' }}
            >
              ← Use authenticator instead
            </button>
          )}
        </div>

        {/* Recovery section */}
        <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--rule)' }}>
          {!recoveryMode ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink-3)', marginTop: 2, flexShrink: 0 }}>
                <path d="M14.5 9.5a4 4 0 1 1-3 6L10 17l-2 2H4v-3l5.5-5.5a4 4 0 0 1 5-1Z" />
              </svg>
              <div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Lost your authenticator?</div>
                <div className="t-meta" style={{ marginTop: 3 }}>
                  <button
                    type="button"
                    onClick={() => { setRecoveryMode(true); setRecoveryError(null); setRecoveryCode('') }}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', textDecoration: 'underline' }}
                  >
                    Use a recovery code
                  </button>
                  {' '}— or ask your Operator Admin to reset 2FA from Team &amp; Roles.
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Recovery code</div>
                <button
                  type="button"
                  onClick={() => { setRecoveryMode(false); setRecoveryError(null) }}
                  className="t-meta"
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ink-3)', cursor: 'pointer' }}
                >
                  ← Back
                </button>
              </div>
              {recoveryError && (
                <div style={{
                  marginBottom: 10, padding: '8px 12px',
                  background: 'var(--danger-soft)',
                  border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
                  borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
                }}>
                  {recoveryError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={e => setRecoveryCode(e.target.value)}
                  placeholder="XXXXX-XXXXX"
                  autoFocus
                  className="input"
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', fontSize: 14, textTransform: 'uppercase' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleVerifyRecovery() }}
                />
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleVerifyRecovery}
                  disabled={recoveryLoading || !recoveryCode.trim()}
                >
                  {recoveryLoading ? 'Verifying…' : 'Use code'}
                </button>
              </div>
              <div className="t-meta" style={{ marginTop: 8 }}>
                Each recovery code can only be used once. Generate new codes from Security settings after signing in.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
