import { useState, useEffect } from 'react'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useNavigate, useLocation } from 'react-router-dom'
import BrandLockup from '../../components/layout/BrandLockup'
import Icon from '../../components/ui/Icon'
import OTPInput from '../../components/ui/OTPInput'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { usePermissionStore } from '../../store/permissionStore'
import { rbacService } from '../../services/rbacService'
import { getFirstPermittedPath } from '../../lib/getFirstPermittedPath'
import { useIsMobile } from '../../hooks/useIsMobile'

/** Mask an email for display: jane.doe@example.com → j***e@example.com */
function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at < 0) return email
  const local = email.slice(0, at)
  const domain = email.slice(at)
  if (local.length <= 2) return local[0] + '***' + domain
  return local[0] + '***' + local.slice(-1) + domain
}

export default function TwoFAPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore(s => s.setAuth)
  const setPermissions = usePermissionStore(s => s.setPermissions)
  const isMobile = useIsMobile()

  const applyPermissions = (role: string): Promise<string> => {
    if (role === 'super_admin') {
      setPermissions({}, true)
      return Promise.resolve('/dashboard')
    }
    return rbacService.getRoleByName(role)
      .then(r => rbacService.getRolePermissions(r.id))
      .then(({ permissions }) => {
        const map: Record<string, string> = {}
        permissions.forEach(p => { map[p.permission_key] = p.state })
        setPermissions(map, false)
        const can = (key: string) => map[key] === 'granted' || map[key] === 'scoped'
        return getFirstPermittedPath(false, can)
      })
      .catch(() => { setPermissions({}, false); return '/no-access' })
  }

  const state = (location.state as { partial_token?: string; email?: string; has_phone?: boolean }) || {}
  const partial_token: string | undefined = state.partial_token
  const email: string = state.email ?? ''
  const hasPhone: boolean = state.has_phone ?? false

  // ── TOTP mode ─────────────────────────────────────────────────
  const [code, setCode] = useState('')
  const [trustDevice, setTrustDevice] = useState(false)

  // ── Backup code mode ───────────────────────────────────────────
  const [useBackupMode, setUseBackupMode] = useState(false)
  const [backupCode, setBackupCode] = useState('')

  // ── Email OTP ──────────────────────────────────────────────────
  const [otpSending, setOtpSending] = useState(false)
  const [otpSentAt, setOtpSentAt] = useState<Date | null>(null)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [otpConfirmVisible, setOtpConfirmVisible] = useState(false)

  // ── SMS OTP ────────────────────────────────────────────────────
  const [smsSending, setSmsSending] = useState(false)
  const [smsSentAt, setSmsSentAt] = useState<Date | null>(null)
  const [smsCooldown, setSmsCooldown] = useState(0)
  const [smsConfirmVisible, setSmsConfirmVisible] = useState(false)
  const [maskedPhone, setMaskedPhone] = useState('')

  // ── Shared ────────────────────────────────────────────────────
  const [apiError, setApiError] = useState('')
  const [isForbidden, setIsForbidden] = useState(false)
  const [loading, setLoading] = useState(false)

  // ── Cooldown ticker ───────────────────────────────────────────
  // Ticks every second while cooldown > 0, derived from otpSentAt.
  useEffect(() => {
    if (!otpSentAt) return
    const tick = () => {
      const elapsed = Math.floor((Date.now() - otpSentAt.getTime()) / 1000)
      const remaining = Math.max(0, 60 - elapsed)
      setOtpCooldown(remaining)
      if (remaining === 0) clearInterval(id)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [otpSentAt])

  useEffect(() => {
    if (!smsSentAt) return
    const tick = () => {
      const elapsed = Math.floor((Date.now() - smsSentAt.getTime()) / 1000)
      const remaining = Math.max(0, 60 - elapsed)
      setSmsCooldown(remaining)
      if (remaining === 0) clearInterval(id)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [smsSentAt])

  // ── Guard: must arrive here via the login flow ────────────────
  if (isForbidden) return <AccessDeniedPage message={`You don't have permission to access this page.`} />

  if (!partial_token) {
    navigate('/login')
    return null
  }

  // ── Handlers ──────────────────────────────────────────────────

  /** Redirect to login when the 15-minute partial token has expired. */
  const handleExpiredSession = () => {
    navigate('/login', { state: { message: 'Your session expired — please sign in again.' } })
  }

  const isExpiredSession = (e: unknown): boolean => {
    const err = e as { response?: { status?: number; data?: { message?: string } } }
    const msg = (err?.response?.data?.message ?? '').toLowerCase()
    return err?.response?.status === 401 && (msg.includes('expired') || msg.includes('step-1'))
  }

  const handleVerify = async () => {
    if (code.length < 6) return
    setApiError('')
    setLoading(true)
    try {
      const res = await authService.verify2FA(partial_token, code, trustDevice)
      setAuth(res.user, res.access_token, res.refresh_token)
      const destination = await applyPermissions(res.user.role)
      navigate(destination)
    } catch (e: unknown) {
      if (isExpiredSession(e)) { handleExpiredSession(); return }
      const err = e as { response?: { data?: { message?: string } } }
      setApiError(err?.response?.data?.message || 'Invalid verification code')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyBackup = async () => {
    const normalised = backupCode.trim()
    if (!normalised) return
    setApiError('')
    setLoading(true)
    try {
      const res = await authService.verifyBackupCode(partial_token, normalised)
      setAuth(res.user, res.access_token, res.refresh_token)
      const destination = await applyPermissions(res.user.role)
      navigate(destination)
    } catch (e: unknown) {
      if (isExpiredSession(e)) { handleExpiredSession(); return }
      const err = e as { response?: { data?: { message?: string } } }
      setApiError(err?.response?.data?.message || 'Invalid or already-used backup code')
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmailOTP = async () => {
    setOtpSending(true)
    setApiError('')
    try {
      const res = await authService.sendEmailOTP(partial_token)
      const sentAt = new Date(res.sent_at)
      setOtpSentAt(sentAt)
      setOtpCooldown(res.cooldown_seconds)
      // Show the "Code sent" confirmation for 6 seconds
      setOtpConfirmVisible(true)
      setTimeout(() => setOtpConfirmVisible(false), 6000)
    } catch (e: unknown) {
      if (isExpiredSession(e)) { handleExpiredSession(); return }
      const err = e as { response?: { status?: number; data?: { message?: string; details?: { retry_after?: number } } } }
      if (err?.response?.status === 429) {
        // Server cooldown — seed the local timer from the retry_after value
        const retryAfter: number = err?.response?.data?.details?.retry_after ?? 60
        setOtpSentAt(new Date(Date.now() - (60 - retryAfter) * 1000))
      } else {
        setApiError(err?.response?.data?.message || 'Failed to send code — try again')
      }
    } finally {
      setOtpSending(false)
    }
  }

  // Auto-format backup code: insert dash after 4th char
  const handleBackupCodeChange = (raw: string) => {
    const stripped = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    const formatted = stripped.length > 4
      ? `${stripped.slice(0, 4)}-${stripped.slice(4)}`
      : stripped
    setBackupCode(formatted)
    setApiError('')
  }

  const handleSendSmsOTP = async () => {
    setSmsSending(true)
    setApiError('')
    try {
      const res = await authService.sendSmsOTP(partial_token as string)
      const sentAt = new Date(res.sent_at)
      setSmsSentAt(sentAt)
      setSmsCooldown(res.cooldown_seconds)
      setMaskedPhone(res.masked_phone)
      setSmsConfirmVisible(true)
      setTimeout(() => setSmsConfirmVisible(false), 6000)
    } catch (e: unknown) {
      if (isExpiredSession(e)) { handleExpiredSession(); return }
      const err = e as { response?: { status?: number; data?: { message?: string; details?: { retry_after?: number } } } }
      if (err?.response?.status === 429) {
        const retryAfter: number = err?.response?.data?.details?.retry_after ?? 60
        setSmsSentAt(new Date(Date.now() - (60 - retryAfter) * 1000))
      } else {
        setApiError(err?.response?.data?.message || 'Failed to send SMS code — try again')
      }
    } finally {
      setSmsSending(false)
    }
  }

  const switchToBackup = () => {
    setUseBackupMode(true); setCode(''); setBackupCode(''); setApiError('')
  }
  const switchToTOTP = () => {
    setUseBackupMode(false); setCode(''); setBackupCode(''); setApiError('')
  }

  const canResend = !otpSending && otpCooldown === 0

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: 'center',
      position: 'relative',
      overflowY: 'auto',
    }}>
      {/* Top bar */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        padding: isMobile ? '16px 20px' : '28px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--rule-soft)',
        background: 'var(--bg)',
        zIndex: 10,
      }}>
        <BrandLockup />
        <div className="t-meta">Step 2 of 2 · Verify identity</div>
      </div>

      {/* Progress indicator */}
      {!isMobile && (
        <div style={{ position: 'absolute', top: 96, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)' }} className="t-label">
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="check" size={11} stroke={2.2} />
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
      )}

      <div className="card" style={{
        width: isMobile ? 'calc(100vw - 32px)' : 520,
        maxWidth: 520,
        padding: isMobile ? '28px 20px' : '44px 48px',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-2)',
        marginTop: isMobile ? 80 : 60,
        marginBottom: isMobile ? 32 : 0,
      }}>
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 4,
          background: useBackupMode ? 'color-mix(in oklab, var(--warning, #d97706) 12%, transparent)' : 'var(--accent-soft)',
          color: useBackupMode ? 'var(--warning, #d97706)' : 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 22,
          border: `1px solid color-mix(in oklab, ${useBackupMode ? 'var(--warning, #d97706)' : 'var(--accent)'} 25%, var(--rule-strong))`,
          transition: 'all 0.2s',
        }}>
          <Icon name={useBackupMode ? 'key' : 'shield'} size={20} />
        </div>

        {/* Heading */}
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--font-serif)',
          fontSize: isMobile ? 24 : 28,
          fontWeight: 400,
          letterSpacing: '-0.018em',
          lineHeight: 1.1,
        }}>
          {useBackupMode ? 'Use a backup code' : 'Two-factor verification'}
        </h2>
        <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          {useBackupMode
            ? <>Enter one of the backup codes you saved when you set up two-factor authentication.</>
            : <>Open your authenticator app and enter the six-digit code for{' '}
                <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{email}</span>.
              </>
          }
        </p>

        {/* Error */}
        {apiError && (
          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 32%, var(--rule-strong))',
            borderRadius: 3, fontSize: 13, color: 'var(--danger)',
          }}>{apiError}</div>
        )}

        {/* ── TOTP mode ── */}
        {!useBackupMode && (
          <>
            <div style={{ marginTop: 28 }}>
              <label className="field-label" style={{ marginBottom: 10, display: 'block' }}>Verification code</label>
              <OTPInput value={code} onChange={v => { setCode(v); setApiError('') }} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22, cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)' }}>
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={e => setTrustDevice(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: 'var(--accent)' }}
              />
              Trust this device for 30 days
            </label>

            <button
              className="btn primary lg"
              style={{ marginTop: 22, width: '100%' }}
              onClick={handleVerify}
              disabled={loading || code.length < 6}
            >
              {loading
                ? <><Icon name="loader" size={15} style={{ animation: 'spin 0.8s linear infinite', marginRight: 7 }} />Verifying…</>
                : 'Verify and sign in'
              }
            </button>

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="t-meta">Having trouble?</span>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="t-meta"
                style={{ color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none' }}
              >← Back to sign in</button>
            </div>

            {/* ── Email OTP section ── */}
            <div style={{
              marginTop: 20,
              padding: '16px 18px',
              background: 'var(--surface-2)',
              border: '1px solid var(--rule)',
              borderRadius: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Icon name="envelope" size={14} style={{ color: 'var(--ink-3)', marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>
                    Can't access your authenticator?
                  </div>
                  <div className="t-meta" style={{ marginTop: 3, lineHeight: 1.5 }}>
                    Send a one-time code to{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)' }}>
                      {maskEmail(email ?? '')}
                    </span>
                  </div>

                  {/* Confirmation flash */}
                  {otpConfirmVisible && (
                    <div style={{
                      marginTop: 8,
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 12, color: 'var(--accent)',
                    }}>
                      <Icon name="check" size={12} stroke={2.5} />
                      Code sent — check your inbox and enter it above
                    </div>
                  )}

                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      disabled={!canResend}
                      onClick={handleSendEmailOTP}
                      style={{
                        fontSize: 12.5,
                        padding: '5px 12px',
                        borderRadius: 3,
                        border: '1px solid var(--rule-strong)',
                        background: canResend ? 'var(--surface)' : 'var(--surface-2)',
                        color: canResend ? 'var(--ink-2)' : 'var(--ink-3)',
                        cursor: canResend ? 'pointer' : 'default',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.15s',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => { if (canResend) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ink-3)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--rule-strong)' }}
                    >
                      {otpSending
                        ? <><Icon name="loader" size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Sending…</>
                        : otpCooldown > 0
                          ? <><Icon name="clock" size={12} /> Resend in {otpCooldown}s</>
                          : otpSentAt
                            ? <><Icon name="refresh" size={12} /> Resend code</>
                            : <><Icon name="envelope" size={12} /> Send code to email</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SMS OTP section (only shown when account has a phone) ── */}
            {hasPhone && (
              <div style={{
                marginTop: 10,
                padding: '16px 18px',
                background: 'var(--surface-2)',
                border: '1px solid var(--rule)',
                borderRadius: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon name="phone" size={14} style={{ color: 'var(--ink-3)', marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>
                      Get a code by SMS
                    </div>
                    <div className="t-meta" style={{ marginTop: 3, lineHeight: 1.5 }}>
                      {maskedPhone
                        ? <>Send to <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)' }}>{maskedPhone}</span></>
                        : 'Send a one-time code to your registered mobile number'
                      }
                    </div>

                    {smsConfirmVisible && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)' }}>
                        <Icon name="check" size={12} stroke={2.5} />
                        Code sent — check your messages and enter it above
                      </div>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        disabled={smsSending || smsCooldown > 0}
                        onClick={handleSendSmsOTP}
                        style={{
                          fontSize: 12.5,
                          padding: '5px 12px',
                          borderRadius: 3,
                          border: '1px solid var(--rule-strong)',
                          background: (smsSending || smsCooldown > 0) ? 'var(--surface-2)' : 'var(--surface)',
                          color: (smsSending || smsCooldown > 0) ? 'var(--ink-3)' : 'var(--ink-2)',
                          cursor: (smsSending || smsCooldown > 0) ? 'default' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          transition: 'all 0.15s',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { if (!smsSending && smsCooldown === 0) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ink-3)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--rule-strong)' }}
                      >
                        {smsSending
                          ? <><Icon name="loader" size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Sending…</>
                          : smsCooldown > 0
                            ? <><Icon name="clock" size={12} /> Resend in {smsCooldown}s</>
                            : smsSentAt
                              ? <><Icon name="refresh" size={12} /> Resend code</>
                              : <><Icon name="phone" size={12} /> Send code via SMS</>
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Backup code toggle */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rule)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Icon name="key" size={14} style={{ color: 'var(--ink-3)', marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Lost your authenticator?</div>
                  <div className="t-meta" style={{ marginTop: 3 }}>
                    You can{' '}
                    <button
                      type="button"
                      onClick={switchToBackup}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        color: 'var(--accent)', cursor: 'pointer',
                        fontSize: 'inherit', fontFamily: 'inherit',
                        textDecoration: 'underline', textUnderlineOffset: 2,
                      }}
                    >
                      use a backup code instead
                    </button>
                    , or contact a workspace administrator to reset 2FA.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Backup code mode ── */}
        {useBackupMode && (
          <>
            <div style={{ marginTop: 28 }}>
              <label className="field-label" style={{ marginBottom: 8, display: 'block' }}>Backup code</label>
              <input
                type="text"
                className="field"
                placeholder="XXXX-XXXX"
                value={backupCode}
                onChange={e => handleBackupCodeChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && backupCode.length >= 9 && handleVerifyBackup()}
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 18,
                  letterSpacing: '0.1em',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                maxLength={9}
              />
              <div className="t-meta" style={{ marginTop: 6, textAlign: 'center' }}>
                Format: XXXX-XXXX (e.g. A3B2-C7D9)
              </div>
            </div>

            <button
              className="btn primary lg"
              style={{ marginTop: 22, width: '100%' }}
              onClick={handleVerifyBackup}
              disabled={loading || backupCode.length < 9}
            >
              {loading
                ? <><Icon name="loader" size={15} style={{ animation: 'spin 0.8s linear infinite', marginRight: 7 }} />Verifying…</>
                : 'Verify with backup code'
              }
            </button>

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={switchToTOTP}
                className="t-meta"
                style={{ color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                ← Use authenticator app instead
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="t-meta"
                style={{ color: 'var(--ink-3)', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                Back to sign in
              </button>
            </div>

            {/* Warning note */}
            <div style={{
              marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--rule)',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <Icon name="alert" size={14} style={{ color: 'var(--warn, #d97706)', marginTop: 2, flexShrink: 0 }} />
              <div className="t-meta" style={{ lineHeight: 1.55 }}>
                Each backup code can only be used once. After using it, you'll need to generate new codes in your security settings.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
