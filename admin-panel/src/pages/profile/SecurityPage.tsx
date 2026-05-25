import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import OTPInput from '../../components/ui/OTPInput'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import { useIsMobile, useIsCompact } from '../../hooks/useIsMobile'

const SETTINGS_NAV = [
  { id: 'profile',  label: 'Profile',       icon: 'user' },
  { id: 'security', label: 'Security',      icon: 'shield' },
  { id: 'sessions', label: 'Sessions',      icon: 'device' },
  { id: 'notif',    label: 'Notifications', icon: 'bell' },
  { id: 'activity', label: 'Activity log',  icon: 'archive' },
  { id: 'api',      label: 'API tokens',    icon: 'key' },
]

interface Session { id: string; device_name: string | null; device_os: string | null; ip_address: string | null; location: string | null; two_fa_method: string | null; last_activity_at: string; is_current: boolean }
interface HistoryEntry { id: string; event_type: string; ip_address: string | null; location: string | null; result: string; created_at: string }

export default function SecurityPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)!
  const setAuth = useAuthStore(s => s.setAuth)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const accessToken = useAuthStore(s => s.accessToken)
  const refreshToken = useAuthStore(s => s.refreshToken)
  const isMobile = useIsMobile()
  const isCompact = useIsCompact()

  const [sessions, setSessions] = useState<Session[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [totpSetup, setTotpSetup] = useState<{ secret: string; provisioning_uri: string } | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState('')
  const [enrollSuccess, setEnrollSuccess] = useState(false)

  const [showCpForm, setShowCpForm] = useState(false)
  const [cpCurrent, setCpCurrent] = useState('')
  const [cpNew, setCpNew] = useState('')
  const [cpConfirm, setCpConfirm] = useState('')
  const [cpError, setCpError] = useState('')
  const [cpLoading, setCpLoading] = useState(false)

  const initials = user.name.split(' ').map(p => p[0]).slice(0, 2).join('')

  useEffect(() => {
    authService.getSessions(refreshToken ?? undefined).then(setSessions).catch(() => {})
    authService.getSignInHistory().then(setHistory).catch(() => {})
  }, [])

  const revokeSession = async (id: string) => {
    await authService.revokeSession(id)
    setSessions(s => s.filter(x => x.id !== id))
  }

  const handleSignOutAll = async () => {
    if (!refreshToken) return
    await authService.logout(refreshToken)
    clearAuth()
    navigate('/login')
  }

  const handleSetupTOTP = async () => {
    const res = await authService.setupTOTP()
    setTotpSetup(res)
  }

  const handleEnrollTOTP = async () => {
    setEnrollError('')
    setEnrolling(true)
    try {
      await authService.enrollTOTP(totpCode)
      // Update the persisted user so the UI reflects two_factor_enabled: true immediately
      setAuth({ ...user, two_factor_enabled: true }, accessToken!, refreshToken!)
      setTotpSetup(null)
      setTotpCode('')
      setEnrollSuccess(true)
      setTimeout(() => setEnrollSuccess(false), 6000)
    } catch (e: any) {
      setEnrollError(e?.response?.data?.message || 'Incorrect code — check your authenticator app and try again')
      setTotpCode('')
    } finally {
      setEnrolling(false)
    }
  }

  const handleChangePassword = async () => {
    setCpError('')
    if (cpNew !== cpConfirm) { setCpError('New passwords do not match'); return }
    if (cpNew.length < 12) { setCpError('Password must be at least 12 characters'); return }
    setCpLoading(true)
    try {
      await authService.changePassword(cpCurrent, cpNew, cpConfirm)
      clearAuth()
      navigate('/login', { state: { message: 'Password changed — please sign in with your new password.' } })
    } catch (e: any) {
      setCpError(e?.response?.data?.message || 'Failed to change password')
    } finally {
      setCpLoading(false)
    }
  }

  const evLabel: Record<string, string> = {
    sign_in: 'Signed in', sign_out: 'Signed out',
    '2fa_verified': '2FA verified', '2fa_failed': '2FA failed',
    failed_password: 'Failed password', password_changed: 'Password changed',
  }

  return (
    <Shell
      activeId="admins"
      breadcrumb="System · Admin Users · My Profile"
      title={user.name}
      subtitle={isMobile ? undefined : 'Security · Sessions · Sign-in history'}
      actions={
        !isMobile ? (
          <button className="btn sm danger" onClick={handleSignOutAll}>
            <Icon name="logout" size={13} />
            {isCompact ? 'Sign out all' : 'Sign out of all sessions'}
          </button>
        ) : undefined
      }
      actionsCompact={
        isMobile ? (
          <button className="btn icon sm danger" title="Sign out of all sessions" onClick={handleSignOutAll}>
            <Icon name="logout" size={13} />
          </button>
        ) : undefined
      }
    >
      <div style={{
        display: isMobile ? 'flex' : 'grid',
        flexDirection: isMobile ? 'column' : undefined,
        gridTemplateColumns: isMobile ? undefined : '300px 1fr',
        minHeight: '100%',
      }}>
        {/* Sub-nav */}
        <aside style={{
          borderRight: isMobile ? 'none' : '1px solid var(--rule)',
          borderBottom: isMobile ? '1px solid var(--rule)' : 'none',
          padding: isMobile ? '16px' : '28px 24px',
          background: 'var(--surface)',
        }}>
          {/* Avatar row — desktop only */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 22, borderBottom: '1px solid var(--rule)' }}>
              <div className="avatar lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' }}>
                {initials}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{user.name}</div>
                <div style={{ marginTop: 8 }}>
                  <span className="badge ok"><span className="dot ok" />{user.role.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Nav items */}
          <div style={{
            paddingTop: isMobile ? 0 : 18,
            display: isMobile ? 'flex' : 'block',
            overflowX: isMobile ? 'auto' : undefined,
            gap: isMobile ? 4 : undefined,
          }}>
            {!isMobile && <div className="t-label" style={{ marginBottom: 8, padding: 0 }}>Settings</div>}
            {SETTINGS_NAV.map(s => (
              <div
                key={s.id}
                onClick={() => s.id === 'profile' && navigate('/profile')}
                style={isMobile ? {
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  fontSize: 12.5,
                  color: s.id === 'security' ? 'var(--ink)' : 'var(--ink-2)',
                  background: s.id === 'security' ? 'var(--surface-2)' : 'transparent',
                  borderRadius: 20,
                  border: '1px solid ' + (s.id === 'security' ? 'var(--rule-strong)' : 'transparent'),
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  flexShrink: 0,
                } : {
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', margin: '2px -12px',
                  fontSize: 13,
                  color: s.id === 'security' ? 'var(--ink)' : 'var(--ink-2)',
                  background: s.id === 'security' ? 'var(--surface-2)' : 'transparent',
                  borderRadius: 3,
                  borderLeft: '2px solid ' + (s.id === 'security' ? 'var(--accent)' : 'transparent'),
                  fontWeight: s.id === 'security' ? 500 : 400,
                  cursor: 'pointer',
                }}
              >
                <Icon name={s.icon} size={14} stroke={1.4} style={{ color: 'var(--ink-3)' }} />
                {s.label}
                {!isMobile && s.id === 'security' && <Icon name="chevRight" size={12} style={{ marginLeft: 'auto', color: 'var(--ink-3)' }} />}
              </div>
            ))}
          </div>

          {/* Security status — desktop only */}
          {!isMobile && (
            <div style={{ marginTop: 24, padding: '14px', background: 'var(--accent-soft-2)', border: '1px solid color-mix(in oklab, var(--accent) 18%, var(--rule-strong))', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Icon name="shield" size={14} style={{ color: 'var(--accent)' }} />
                <span className="t-label" style={{ padding: 0, color: 'var(--accent-ink)' }}>
                  {user.two_factor_enabled ? 'Account healthy' : 'Action required'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                {user.two_factor_enabled
                  ? '2FA enabled and active on this account.'
                  : '2FA is not enabled. Enroll an authenticator app below.'}
              </div>
            </div>
          )}
        </aside>

        {/* Main */}
        <div style={{ padding: isMobile ? '20px 16px' : '28px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Password + 2FA */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 18 : 22, fontWeight: 400, letterSpacing: '-0.014em' }}>Password & two-factor</h3>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>
            <div className="security-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              {/* Password card */}
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="t-label" style={{ padding: 0 }}>Password</div>
                  <span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Active</span>
                </div>
                <div style={{ marginTop: 14, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>••••••••••••</div>
                {!showCpForm ? (
                  <div style={{ marginTop: 18 }}>
                    <button className="btn sm" onClick={() => setShowCpForm(true)}>
                      <Icon name="refresh" size={12} />Change password
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {cpError && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{cpError}</div>}
                    <div className="field">
                      <label className="field-label">Current</label>
                      <div className="input"><input type="password" value={cpCurrent} onChange={e => setCpCurrent(e.target.value)} /></div>
                    </div>
                    <div className="field">
                      <label className="field-label">New</label>
                      <div className="input"><input type="password" value={cpNew} onChange={e => setCpNew(e.target.value)} /></div>
                    </div>
                    <div className="field">
                      <label className="field-label">Confirm</label>
                      <div className="input"><input type="password" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn sm" onClick={() => setShowCpForm(false)}>Cancel</button>
                      <button className="btn sm primary" onClick={handleChangePassword} disabled={cpLoading}>
                        {cpLoading ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2FA card */}
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="t-label" style={{ padding: 0 }}>Two-factor authentication</div>
                  <span className={`badge ${user.two_factor_enabled ? 'ok' : 'warn'}`}>
                    <Icon name="shield" size={10} stroke={2.2} />
                    {user.two_factor_enabled ? 'Enrolled' : 'Not enrolled'}
                  </span>
                </div>
                {totpSetup ? (
                  <div style={{ marginTop: 14 }}>
                    {/* Step 1 — QR code */}
                    <div className="t-label" style={{ padding: 0, marginBottom: 10 }}>
                      Step 1 · Scan with your authenticator app
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{
                        padding: 10,
                        background: '#fff',
                        border: '1px solid var(--rule)',
                        borderRadius: 4,
                        flexShrink: 0,
                      }}>
                        <QRCodeSVG
                          value={totpSetup.provisioning_uri}
                          size={120}
                          level="M"
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="t-meta" style={{ marginBottom: 6 }}>
                          Can't scan? Enter this key manually:
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                          letterSpacing: '0.12em',
                          wordBreak: 'break-all',
                          color: 'var(--ink)',
                          padding: '8px 10px',
                          background: 'var(--surface-2)',
                          border: '1px solid var(--rule)',
                          borderRadius: 3,
                          userSelect: 'all',
                        }}>
                          {totpSetup.secret.match(/.{1,4}/g)?.join(' ')}
                        </div>
                        <div className="t-meta" style={{ marginTop: 8, lineHeight: 1.5 }}>
                          Works with Google Authenticator, Authy, 1Password, and any TOTP app.
                        </div>
                      </div>
                    </div>

                    {/* Step 2 — enter code */}
                    <div className="t-label" style={{ padding: 0, marginTop: 18, marginBottom: 10 }}>
                      Step 2 · Enter the 6-digit code from your app
                    </div>

                    {enrollError && (
                      <div style={{
                        marginBottom: 12,
                        padding: '9px 12px',
                        background: 'var(--danger-soft)',
                        border: '1px solid color-mix(in oklab, var(--danger) 32%, var(--rule-strong))',
                        borderRadius: 3,
                        fontSize: 12.5,
                        color: 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <Icon name="alert" size={13} stroke={2} style={{ flexShrink: 0 }} />
                        {enrollError}
                      </div>
                    )}

                    <OTPInput value={totpCode} onChange={v => { setEnrollError(''); setTotpCode(v) }} />

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button className="btn sm" onClick={() => { setTotpSetup(null); setTotpCode(''); setEnrollError('') }}>Cancel</button>
                      <button className="btn sm primary" disabled={totpCode.length < 6 || enrolling} onClick={handleEnrollTOTP}>
                        {enrolling ? 'Verifying…' : 'Enable two-factor auth'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {enrollSuccess && (
                      <div style={{
                        marginTop: 14,
                        padding: '10px 14px',
                        background: 'var(--ok-soft)',
                        border: '1px solid color-mix(in oklab, var(--ok) 32%, var(--rule-strong))',
                        borderRadius: 3,
                        fontSize: 12.5,
                        color: 'var(--ok)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <Icon name="check" size={13} stroke={2.4} style={{ flexShrink: 0 }} />
                        Two-factor authentication is now enabled on your account.
                      </div>
                    )}
                    <div style={{ marginTop: 14, fontSize: 13, color: 'var(--ink-2)' }}>
                      {user.two_factor_enabled ? 'TOTP · Authenticator app' : 'Not configured — enroll an app to protect your account.'}
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                      <button className="btn sm" onClick={handleSetupTOTP}>
                        {user.two_factor_enabled ? 'Re-enroll device' : 'Set up authenticator'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Sessions */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 18 : 22, fontWeight: 400, letterSpacing: '-0.014em' }}>Active sessions</h3>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>
            <div className="card tbl-scroll" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Location</th>
                    <th>2FA</th>
                    <th>Last activity</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>No active sessions</td></tr>
                  )}
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Icon name="device" size={16} style={{ color: s.is_current ? 'var(--accent)' : 'var(--ink-3)' }} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                              {s.device_name || 'Unknown device'}
                              {s.is_current && (
                                <span className="badge ok" style={{ fontSize: 10.5 }}>
                                  <span className="dot ok" />This device
                                </span>
                              )}
                            </div>
                            <div className="t-meta" style={{ marginTop: 2 }}>{s.device_os || s.ip_address || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{s.location || '—'}</div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{s.ip_address}</div>
                      </td>
                      <td>
                        {s.two_fa_method
                          ? <span className="badge ok"><span className="dot ok" />{s.two_fa_method}</span>
                          : <span className="t-meta">—</span>}
                      </td>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>
                        {new Date(s.last_activity_at).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {s.is_current ? (
                          <button className="btn sm danger" onClick={handleSignOutAll}>
                            <Icon name="logout" size={12} />Log out
                          </button>
                        ) : (
                          <button className="btn sm" onClick={() => revokeSession(s.id)}>Revoke</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sign-in history */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 18 : 22, fontWeight: 400, letterSpacing: '-0.014em' }}>Sign-in history</h3>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>
            <div className="card tbl-scroll" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr><th>When</th><th>Event</th><th>IP</th><th>Location</th><th>Result</th></tr>
                </thead>
                <tbody>
                  {history.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>No history</td></tr>
                  )}
                  {history.map(h => (
                    <tr key={h.id}>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{new Date(h.created_at).toLocaleString()}</td>
                      <td>{evLabel[h.event_type] || h.event_type}</td>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{h.ip_address || '—'}</td>
                      <td>{h.location || '—'}</td>
                      <td>
                        {h.result === 'ok'
                          ? <span className="badge ok"><span className="dot ok" />Success</span>
                          : <span className="badge danger"><span className="dot danger" />Failed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  )
}
