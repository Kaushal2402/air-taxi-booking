import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import OTPInput from '../../components/ui/OTPInput'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import { useIsMobile, useIsCompact } from '../../hooks/useIsMobile'
import { formatDateTime, formatNow, getUserTimezone } from '../../lib/utils'

const SETTINGS_NAV = [
  { id: 'profile',  label: 'Profile',       icon: 'user',    soon: false },
  { id: 'security', label: 'Security',      icon: 'shield',  soon: false },
  { id: 'sessions', label: 'Sessions',      icon: 'device',  soon: false },
  { id: 'activity', label: 'Activity log',  icon: 'archive', soon: false },
  { id: 'notif',    label: 'Notifications', icon: 'bell',    soon: true  },
  { id: 'api',      label: 'API tokens',    icon: 'key',     soon: true  },
]

interface Session { id: string; device_name: string | null; device_os: string | null; ip_address: string | null; location: string | null; two_fa_method: string | null; last_activity_at: string; is_current: boolean }
interface HistoryEntry { id: string; event_type: string; ip_address: string | null; location: string | null; result: string; user_agent: string | null; created_at: string }

// Parses a raw User-Agent string into a human-readable browser + OS label.
function parseUserAgent(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: '—', os: '—' }
  let browser = 'Browser'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Safari\//.test(ua)) browser = 'Safari'
  let os = 'Unknown OS'
  if (/Windows NT/.test(ua)) os = 'Windows'
  else if (/Mac OS X/.test(ua)) os = 'macOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/iPhone|iPad/.test(ua)) os = 'iOS'
  else if (/Linux/.test(ua)) os = 'Linux'
  return { browser, os }
}

export default function SecurityPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)!
  const setAuth = useAuthStore(s => s.setAuth)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const accessToken = useAuthStore(s => s.accessToken)
  const refreshToken = useAuthStore(s => s.refreshToken)
  const isMobile = useIsMobile()
  const isCompact = useIsCompact()

  // ── Confirm dialog ──────────────────────────────────────────────────────────
  interface ConfirmState {
    open: boolean
    title: string
    description: string
    confirmLabel: string
    loading: boolean
    onConfirm: () => void
  }
  const CONFIRM_CLOSED: ConfirmState = {
    open: false, title: '', description: '', confirmLabel: '', loading: false, onConfirm: () => {},
  }
  const [confirm, setConfirm] = useState<ConfirmState>(CONFIRM_CLOSED)
  const closeConfirm = () => setConfirm(CONFIRM_CLOSED)

  const [sessions, setSessions] = useState<Session[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPages, setHistoryPages] = useState(1)
  const HISTORY_LIMIT = 15
  const [totpSetup, setTotpSetup] = useState<{ secret: string; provisioning_uri: string } | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState('')
  const [enrollSuccess, setEnrollSuccess] = useState(false)

  // ── Disable 2FA ─────────────────────────────────────────────────────────────
  const [showDisable2FA, setShowDisable2FA] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState('')
  const [disabling, setDisabling] = useState(false)

  // ── Backup codes ────────────────────────────────────────────────────────────
  const [backupStatus, setBackupStatus] = useState<{ total: number; used: number; remaining: number; generated: boolean } | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)   // plaintext — shown once after generation
  const [generatingBackup, setGeneratingBackup] = useState(false)

  const [showCpForm, setShowCpForm] = useState(false)
  const [cpCurrent, setCpCurrent] = useState('')
  const [cpNew, setCpNew] = useState('')
  const [cpConfirm, setCpConfirm] = useState('')
  const [cpError, setCpError] = useState('')
  const [cpLoading, setCpLoading] = useState(false)

  const initials = user.name.split(' ').map(p => p[0]).slice(0, 2).join('')

  // Section refs for nav scroll-to behaviour
  const securityRef = useRef<HTMLElement>(null)
  const sessionsRef = useRef<HTMLElement>(null)
  const activityRef = useRef<HTMLElement>(null)
  const [activeSection, setActiveSection] = useState('security')

  // Track which section is in view as the user scrolls
  useEffect(() => {
    const refs = [
      { id: 'security', ref: securityRef },
      { id: 'sessions', ref: sessionsRef },
      { id: 'activity', ref: activityRef },
    ]
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const found = refs.find(r => r.ref.current === entry.target)
            if (found) setActiveSection(found.id)
          }
        })
      },
      { threshold: 0.3 }
    )
    refs.forEach(r => { if (r.ref.current) observer.observe(r.ref.current) })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    const map: Record<string, React.RefObject<HTMLElement | null>> = {
      security: securityRef,
      sessions: sessionsRef,
      activity: activityRef,
    }
    map[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleNavClick = (id: string, soon: boolean) => {
    if (soon) return
    if (id === 'profile') { navigate('/profile'); return }
    scrollTo(id)
  }

  const fetchHistory = (page: number = 1) => {
    setHistoryLoading(true)
    setHistoryError(false)
    authService.getSignInHistory(page, HISTORY_LIMIT)
      .then(res => {
        setHistory(res.items)
        setHistoryTotal(res.total)
        setHistoryPages(res.pages)
        setHistoryPage(res.page)
        setHistoryLoading(false)
      })
      .catch(() => { setHistoryError(true); setHistoryLoading(false) })
  }

  useEffect(() => {
    authService.getSessions(refreshToken ?? undefined).then(setSessions).catch(() => {})
    fetchHistory(1)
    if (user.two_factor_enabled) {
      authService.getBackupCodeStatus().then(setBackupStatus).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actual async actions (called after confirm) ────────────────────────────
  const doRevokeSession = async (id: string) => {
    setConfirm(c => ({ ...c, loading: true }))
    try {
      await authService.revokeSession(id)
      setSessions(s => s.filter(x => x.id !== id))
      closeConfirm()
    } catch {
      closeConfirm()
    }
  }

  const doSignOutAll = async () => {
    if (!refreshToken) return
    setConfirm(c => ({ ...c, loading: true }))
    try {
      await authService.logout(refreshToken)
      clearAuth()
      navigate('/login')
    } catch {
      closeConfirm()
    }
  }

  // ── Openers — show the dialog, wire the confirmed action ───────────────────
  const handleSignOutAll = () => {
    setConfirm({
      open: true,
      title: 'Sign out of all sessions?',
      description: 'You will be signed out on every device, including this one. You will need to sign in again.',
      confirmLabel: 'Sign out all',
      loading: false,
      onConfirm: doSignOutAll,
    })
  }

  const handleRevokeSession = (id: string, deviceName: string | null) => {
    setConfirm({
      open: true,
      title: 'Revoke this session?',
      description: `The session on "${deviceName || 'Unknown device'}" will be signed out immediately and won't be able to access the console.`,
      confirmLabel: 'Revoke session',
      loading: false,
      onConfirm: () => doRevokeSession(id),
    })
  }

  const handleLogoutCurrent = () => {
    setConfirm({
      open: true,
      title: 'Sign out of this device?',
      description: 'Your current session will end and you will be redirected to the login screen.',
      confirmLabel: 'Sign out',
      loading: false,
      onConfirm: doSignOutAll,
    })
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

  const handleDisable2FA = async () => {
    setDisableError('')
    setDisabling(true)
    try {
      await authService.disable2FA(disableCode)
      // Reflect in auth store so the badge updates immediately without a page reload
      setAuth({ ...user, two_factor_enabled: false }, accessToken!, refreshToken!)
      setBackupStatus(null)
      setBackupCodes(null)
      setShowDisable2FA(false)
      setDisableCode('')
    } catch (e: any) {
      setDisableError(e?.response?.data?.message || 'Invalid code — check your authenticator app')
      setDisableCode('')
    } finally {
      setDisabling(false)
    }
  }

  const handleGenerateBackupCodes = () => {
    setConfirm({
      open: true,
      title: backupStatus?.generated ? 'Regenerate backup codes?' : 'Generate backup codes?',
      description: backupStatus?.generated
        ? 'This will permanently invalidate your existing codes. Make sure to save the new ones.'
        : 'You will receive 10 single-use codes. Store them somewhere safe — they are only shown once.',
      confirmLabel: backupStatus?.generated ? 'Regenerate' : 'Generate codes',
      loading: false,
      onConfirm: doGenerateBackupCodes,
    })
  }

  const doGenerateBackupCodes = async () => {
    setGeneratingBackup(true)
    setConfirm(c => ({ ...c, loading: true }))
    try {
      const res = await authService.generateBackupCodes()
      setBackupCodes(res.codes)
      setBackupStatus({ total: res.total, used: 0, remaining: res.remaining, generated: true })
      closeConfirm()
    } catch {
      closeConfirm()
    } finally {
      setGeneratingBackup(false)
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

  const evLabel: Record<string, { label: string; ok: boolean }> = {
    sign_in:          { label: 'Signed in',         ok: true  },
    sign_out:         { label: 'Signed out',         ok: true  },
    '2fa_verified':   { label: '2FA verified',       ok: true  },
    '2fa_failed':     { label: '2FA failed',         ok: false },
    '2fa_disabled':   { label: '2FA disabled',       ok: false },
    failed_password:  { label: 'Wrong password',     ok: false },
    account_locked:   { label: 'Account locked',     ok: false },
    password_changed: { label: 'Password changed',   ok: true  },
    session_revoked:  { label: 'Session revoked',    ok: true  },
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
              <div className="avatar lg" style={{
                background: 'var(--accent-soft)', color: 'var(--accent)',
                borderColor: 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
                overflow: 'hidden', padding: 0,
              }}>
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
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
            {SETTINGS_NAV.map(s => {
              const isActive = s.id === 'profile'
                ? false
                : s.id === activeSection
              return (
                <div
                  key={s.id}
                  onClick={() => handleNavClick(s.id, s.soon)}
                  style={isMobile ? {
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px',
                    fontSize: 12.5,
                    color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                    background: isActive ? 'var(--surface-2)' : 'transparent',
                    borderRadius: 20,
                    border: '1px solid ' + (isActive ? 'var(--rule-strong)' : 'transparent'),
                    whiteSpace: 'nowrap',
                    cursor: s.soon ? 'default' : 'pointer',
                    flexShrink: 0,
                    opacity: s.soon ? 0.5 : 1,
                  } : {
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', margin: '2px -12px',
                    fontSize: 13,
                    color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                    background: isActive ? 'var(--surface-2)' : 'transparent',
                    borderRadius: 3,
                    borderLeft: '2px solid ' + (isActive ? 'var(--accent)' : 'transparent'),
                    fontWeight: isActive ? 500 : 400,
                    cursor: s.soon ? 'default' : 'pointer',
                    opacity: s.soon ? 0.55 : 1,
                  }}
                >
                  <Icon name={s.icon} size={14} stroke={1.4} style={{ color: isActive ? 'var(--accent)' : 'var(--ink-3)' }} />
                  {s.label}
                  {s.soon && !isMobile && (
                    <span style={{
                      marginLeft: 'auto',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-3)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--rule)',
                      borderRadius: 3,
                      padding: '1px 5px',
                    }}>Soon</span>
                  )}
                  {!isMobile && !s.soon && isActive && (
                    <Icon name="chevRight" size={12} style={{ marginLeft: 'auto', color: 'var(--ink-3)' }} />
                  )}
                </div>
              )
            })}
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
          <section ref={securityRef}>
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
                    {cpError && <div style={{ fontSize: 12, color: 'var(--danger)', padding: '6px 10px', background: 'var(--danger-soft)', borderRadius: 3 }}>{cpError}</div>}
                    <div className="field">
                      <label className="field-label">Current</label>
                      <div className="input"><input type="password" value={cpCurrent} onChange={e => setCpCurrent(e.target.value)} autoComplete="current-password" /></div>
                    </div>
                    <div className="field">
                      <label className="field-label">New password</label>
                      <div className="input"><input type="password" value={cpNew} onChange={e => setCpNew(e.target.value)} autoComplete="new-password" /></div>
                      {/* Strength meter — only shown once user starts typing */}
                      {cpNew && (() => {
                        let s = 0
                        if (cpNew.length >= 12) s++
                        if (/[A-Z]/.test(cpNew)) s++
                        if (/[0-9]/.test(cpNew)) s++
                        if (/[^A-Za-z0-9]/.test(cpNew)) s++
                        const colors = ['', 'var(--danger)', 'var(--warn)', 'var(--accent)', 'var(--accent)']
                        const labels = ['', 'Weak', 'Fair', 'Strong', 'Excellent']
                        return (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ display: 'flex', gap: 3 }}>
                              {[0,1,2,3].map(i => (
                                <span key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < s ? colors[s] : 'var(--rule)', transition: 'background 200ms' }} />
                              ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                              <span style={{ fontSize: 11, color: colors[s] }}>{labels[s]}</span>
                            </div>
                            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
                              {([
                                ['12+ characters', cpNew.length >= 12],
                                ['Uppercase letter', /[A-Z]/.test(cpNew)],
                                ['Number', /[0-9]/.test(cpNew)],
                                ['Symbol', /[^A-Za-z0-9]/.test(cpNew)],
                              ] as [string, boolean][]).map(([label, ok], i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: ok ? 'var(--ink-2)' : 'var(--ink-4)' }}>
                                  <Icon name={ok ? 'check' : 'dot'} size={11} stroke={ok ? 2.4 : 3} style={{ color: ok ? 'var(--accent)' : 'var(--ink-4)', flexShrink: 0 }} />
                                  {label}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="field">
                      <label className="field-label">Confirm</label>
                      <div className="input"><input type="password" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)} autoComplete="new-password" /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn sm" onClick={() => { setShowCpForm(false); setCpCurrent(''); setCpNew(''); setCpConfirm(''); setCpError('') }}>Cancel</button>
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
                ) : showDisable2FA ? (
                  /* ── Disable 2FA confirmation panel ── */
                  <div style={{ marginTop: 14 }}>
                    {/* Warning banner */}
                    <div style={{
                      padding: '10px 14px', marginBottom: 16,
                      background: 'color-mix(in oklab, var(--danger) 8%, var(--surface))',
                      border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
                      borderRadius: 3,
                      fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <Icon name="alert" size={14} stroke={2} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
                      <span>
                        Disabling two-factor authentication will remove your authenticator and
                        delete all backup codes. Your account will be protected by password only.
                      </span>
                    </div>

                    <div className="t-label" style={{ padding: 0, marginBottom: 10 }}>
                      Enter your current 6-digit code to confirm
                    </div>

                    {disableError && (
                      <div style={{
                        marginBottom: 12, padding: '9px 12px',
                        background: 'var(--danger-soft)',
                        border: '1px solid color-mix(in oklab, var(--danger) 32%, var(--rule-strong))',
                        borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <Icon name="alert" size={13} stroke={2} style={{ flexShrink: 0 }} />
                        {disableError}
                      </div>
                    )}

                    <OTPInput
                      value={disableCode}
                      onChange={v => { setDisableError(''); setDisableCode(v) }}
                    />

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button
                        className="btn sm"
                        onClick={() => { setShowDisable2FA(false); setDisableCode(''); setDisableError('') }}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn sm danger"
                        disabled={disableCode.length < 6 || disabling}
                        onClick={handleDisable2FA}
                      >
                        {disabling
                          ? <><Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite', marginRight: 6 }} />Disabling…</>
                          : 'Disable two-factor auth'
                        }
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
                    <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn sm" onClick={handleSetupTOTP}>
                        {user.two_factor_enabled ? 'Re-enroll device' : 'Set up authenticator'}
                      </button>
                      {user.two_factor_enabled && (
                        <button className="btn sm" onClick={handleGenerateBackupCodes} disabled={generatingBackup}>
                          <Icon name="key" size={12} />
                          {backupStatus?.generated ? 'Regenerate backup codes' : 'Generate backup codes'}
                        </button>
                      )}
                    </div>

                    {/* Disable 2FA — only when enrolled */}
                    {user.two_factor_enabled && (
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--rule)' }}>
                        {(user.role === 'super_admin' || user.role === 'finance_manager' || user.role === 'finance') ? (
                          <div style={{
                            padding: '10px 14px',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--rule-strong)',
                            borderRadius: 3,
                            fontSize: 12.5,
                            color: 'var(--ink-2)',
                            lineHeight: 1.5,
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start',
                          }}>
                            <Icon name="shield" size={14} stroke={2} style={{ color: 'var(--ink-3)', flexShrink: 0, marginTop: 1 }} />
                            <span>
                              Two-Factor Authentication cannot be disabled for privileged roles.
                              Contact your system administrator if you need to reset your authenticator device.
                            </span>
                          </div>
                        ) : (
                          <>
                            <button
                              className="btn sm danger"
                              onClick={() => setShowDisable2FA(true)}
                            >
                              <Icon name="shield" size={12} />
                              Disable two-factor auth
                            </button>
                            <div className="t-meta" style={{ marginTop: 6, lineHeight: 1.4 }}>
                              You'll need your current authenticator code to confirm.
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Backup codes status pill */}
                    {user.two_factor_enabled && backupStatus && !backupCodes && (
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {backupStatus.generated ? (
                          <span className={`badge ${backupStatus.remaining === 0 ? 'danger' : backupStatus.remaining <= 3 ? 'warn' : 'ok'}`}>
                            <span className={`dot ${backupStatus.remaining === 0 ? 'danger' : backupStatus.remaining <= 3 ? 'warn' : 'ok'}`} />
                            {backupStatus.remaining} of {backupStatus.total} backup codes remaining
                          </span>
                        ) : (
                          <span className="badge warn">
                            <span className="dot warn" />No backup codes — generate some in case you lose your authenticator
                          </span>
                        )}
                      </div>
                    )}

                    {/* Newly generated codes — shown once */}
                    {backupCodes && (
                      <div style={{
                        marginTop: 16,
                        padding: '16px',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--rule-strong)',
                        borderRadius: 4,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>Your backup codes</div>
                            <div className="t-meta" style={{ marginTop: 3 }}>Save these somewhere safe. Each code can only be used once.</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn sm" onClick={() => {
                              navigator.clipboard.writeText(backupCodes.join('\n'))
                            }}>
                              <Icon name="archive" size={12} />Copy all
                            </button>
                            <button className="btn sm" onClick={() => {
                              const blob = new Blob([
                                `Backup codes for ${user.email}\nGenerated: ${formatNow()} (${getUserTimezone()})\n\n${backupCodes.join('\n')}\n\nEach code can only be used once.`
                              ], { type: 'text/plain' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url; a.download = 'backup-codes.txt'; a.click()
                              URL.revokeObjectURL(url)
                            }}>
                              <Icon name="chevDown" size={12} />Download
                            </button>
                            <button className="btn sm danger" onClick={() => setBackupCodes(null)}>
                              Done
                            </button>
                          </div>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '6px 16px',
                        }}>
                          {backupCodes.map((code, i) => (
                            <div key={i} style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 13.5,
                              letterSpacing: '0.10em',
                              padding: '7px 10px',
                              background: 'var(--surface)',
                              border: '1px solid var(--rule)',
                              borderRadius: 3,
                              color: 'var(--ink)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}>
                              {code}
                              <span className="t-meta" style={{ fontSize: 10, letterSpacing: 0 }}>#{i + 1}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'color-mix(in oklab, var(--warn) 10%, var(--surface))', border: '1px solid color-mix(in oklab, var(--warn) 28%, var(--rule-strong))', borderRadius: 3 }}>
                          <Icon name="alert" size={13} stroke={2} style={{ color: 'var(--warn)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>These codes won't be shown again. Copy or download them before closing.</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Sessions */}
          <section ref={sessionsRef}>
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
                        {formatDateTime(s.last_activity_at)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {s.is_current ? (
                          <button className="btn sm danger" onClick={handleLogoutCurrent}>
                            <Icon name="logout" size={12} />Log out
                          </button>
                        ) : (
                          <button className="btn sm" onClick={() => handleRevokeSession(s.id, s.device_name)}>Revoke</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Activity log / Sign-in history */}
          <section ref={activityRef}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 18 : 22, fontWeight: 400, letterSpacing: '-0.014em' }}>Activity log</h3>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
              <button
                className="btn sm"
                onClick={() => fetchHistory(historyPage)}
                disabled={historyLoading}
                title="Refresh sign-in history"
              >
                <Icon name="refresh" size={12} style={{ ...(historyLoading ? { animation: 'spin 1s linear infinite' } : {}) }} />
                {historyLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            {historyError && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 32%, var(--rule-strong))',
                borderRadius: 3,
                fontSize: 13,
                color: 'var(--danger)',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span><Icon name="alert" size={13} stroke={2} style={{ marginRight: 8 }} />Failed to load sign-in history.</span>
                <button className="btn sm" onClick={() => fetchHistory()}>Retry</button>
              </div>
            )}

            <div className="card tbl-scroll" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Event</th>
                    <th>Device / Browser</th>
                    <th>IP address</th>
                    {!isMobile && <th>Location</th>}
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading && (
                    /* Loading skeleton — 5 ghost rows */
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: isMobile ? 5 : 6 }).map((_, j) => (
                          <td key={j}>
                            <div style={{
                              height: 12, borderRadius: 2,
                              background: 'var(--surface-2)',
                              width: j === 0 ? 120 : j === 1 ? 90 : j === 2 ? 110 : 80,
                              opacity: 1 - i * 0.15,
                            }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                  {!historyLoading && !historyError && history.length === 0 && (
                    <tr>
                      <td colSpan={isMobile ? 5 : 6} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 32 }}>
                        <Icon name="archive" size={22} style={{ display: 'block', margin: '0 auto 10px', color: 'var(--ink-3)' }} />
                        No sign-in events recorded yet
                      </td>
                    </tr>
                  )}
                  {!historyLoading && history.map(h => {
                    const ev = evLabel[h.event_type]
                    const { browser, os } = parseUserAgent(h.user_agent)
                    return (
                      <tr key={h.id}>
                        <td className="num" style={{ color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                          {formatDateTime(h.created_at)}
                        </td>
                        <td>
                          <span style={{ fontWeight: 500, fontSize: 13 }}>
                            {ev ? ev.label : h.event_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          {h.user_agent ? (
                            <div>
                              <div style={{ fontSize: 13 }}>{browser}</div>
                              <div className="t-meta" style={{ marginTop: 2 }}>{os}</div>
                            </div>
                          ) : (
                            <span className="t-meta">—</span>
                          )}
                        </td>
                        <td className="num" style={{ color: 'var(--ink-2)' }}>
                          {h.ip_address || '—'}
                        </td>
                        {!isMobile && <td style={{ color: 'var(--ink-2)' }}>{h.location || '—'}</td>}
                        <td>
                          {(ev ? ev.ok : h.result === 'ok')
                            ? <span className="badge ok"><span className="dot ok" />Success</span>
                            : <span className="badge danger"><span className="dot danger" />Failed</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {!historyLoading && !historyError && historyTotal > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 12,
                flexWrap: 'wrap',
                gap: 10,
              }}>
                {/* Showing X–Y of Z */}
                <span className="t-meta">
                  Showing{' '}
                  <strong style={{ color: 'var(--ink-2)' }}>
                    {(historyPage - 1) * HISTORY_LIMIT + 1}–{Math.min(historyPage * HISTORY_LIMIT, historyTotal)}
                  </strong>
                  {' '}of{' '}
                  <strong style={{ color: 'var(--ink-2)' }}>{historyTotal}</strong>
                  {' '}events
                </span>

                {/* Prev / page numbers / Next */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    className="btn sm"
                    disabled={historyPage <= 1}
                    onClick={() => fetchHistory(historyPage - 1)}
                  >
                    <Icon name="chevLeft" size={13} />
                    {!isMobile && 'Prev'}
                  </button>

                  {/* Page number pills — show at most 5 around current page */}
                  {Array.from({ length: historyPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === historyPages || Math.abs(p - historyPage) <= 1)
                    .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      p === '…'
                        ? <span key={`e${i}`} className="t-meta" style={{ padding: '0 4px' }}>…</span>
                        : <button
                            key={p}
                            className={`btn sm${p === historyPage ? ' primary' : ''}`}
                            style={{ minWidth: 32 }}
                            onClick={() => fetchHistory(p as number)}
                          >
                            {p}
                          </button>
                    )
                  }

                  <button
                    className="btn sm"
                    disabled={historyPage >= historyPages}
                    onClick={() => fetchHistory(historyPage + 1)}
                  >
                    {!isMobile && 'Next'}
                    <Icon name="chevRight" size={13} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmLabel={confirm.confirmLabel}
        variant="danger"
        loading={confirm.loading}
        onConfirm={confirm.onConfirm}
        onCancel={closeConfirm}
      />
    </Shell>
  )
}
