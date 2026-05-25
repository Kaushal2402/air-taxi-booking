import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BrandLockup from '../../components/layout/BrandLockup'
import Icon from '../../components/ui/Icon'
import OTPInput from '../../components/ui/OTPInput'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'

export default function TwoFAPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore(s => s.setAuth)
  const isMobile = useIsMobile()

  const { partial_token, email } = (location.state as any) || {}

  const [code, setCode] = useState('')
  const [trustDevice, setTrustDevice] = useState(false)
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!partial_token) {
    navigate('/login')
    return null
  }

  const handleVerify = async () => {
    if (code.length < 6) return
    setApiError('')
    setLoading(true)
    try {
      const res = await authService.verify2FA(partial_token, code, trustDevice)
      setAuth(res.user, res.access_token, res.refresh_token)
      navigate('/dashboard')
    } catch (e: any) {
      setApiError(e?.response?.data?.message || 'Invalid verification code')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

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
        <div style={{
          width: 44, height: 44, borderRadius: 4,
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 22,
          border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--rule-strong))',
        }}>
          <Icon name="shield" size={20} />
        </div>

        <h2 style={{
          margin: 0,
          fontFamily: 'var(--font-serif)',
          fontSize: isMobile ? 24 : 28,
          fontWeight: 400,
          letterSpacing: '-0.018em',
          lineHeight: 1.1,
        }}>Two-factor verification</h2>
        <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          Open your authenticator app and enter the six-digit code for{' '}
          <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{email}</span>.
        </p>

        {apiError && (
          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 32%, var(--rule-strong))',
            borderRadius: 3, fontSize: 13, color: 'var(--danger)',
          }}>{apiError}</div>
        )}

        <div style={{ marginTop: 28 }}>
          <label className="field-label" style={{ marginBottom: 10, display: 'block' }}>Verification code</label>
          <OTPInput value={code} onChange={setCode} />
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
          {loading ? 'Verifying…' : 'Verify and sign in'}
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

        <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--rule)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="key" size={14} style={{ color: 'var(--ink-3)', marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Lost your authenticator?</div>
              <div className="t-meta" style={{ marginTop: 3 }}>
                Use one of your recovery codes, or contact a workspace administrator to reset 2FA.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
