import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Monitor, Smartphone, RefreshCw, Shield, ShieldOff, Copy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Shell from '../../components/layout/Shell'
import ProfileRail from '../../components/layout/ProfileRail'
import { operatorAuthService } from '../../services/operatorAuthService'
import { useOperatorAuthStore } from '../../stores/authStore'
import type { OperatorSession, OperatorLoginHistory } from '../../services/operatorAuthService'
import { fmtDateTime, fmtDate } from '../../lib/format'

// ── helpers ──────────────────────────────────────────────────
function FormSection({ title, description, children }: {
  title: string
  description: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={{ paddingBottom: 32, borderBottom: '1px solid var(--rule)' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{title}</div>
        <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 600 }}>{description}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  )
}

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw.length) return { score: 0, label: '', color: 'var(--rule-strong)' }
  let s = 0
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return {
    score: s,
    label: ['Weak', 'Fair', 'Good', 'Strong'][s - 1] ?? 'Weak',
    color: ['var(--danger)', 'var(--warn)', '#0a7d5a', 'var(--accent)'][s - 1] ?? 'var(--danger)',
  }
}

const fmt = fmtDateTime

// ── page ─────────────────────────────────────────────────────
export default function SecurityPage() {
  const qc = useQueryClient()
  const storeUser = useOperatorAuthStore(s => s.user)
  const clearAuth = useOperatorAuthStore(s => s.clearAuth)

  // ── change password ──
  const [currentPw, setCurrentPw] = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [pwError,   setPwError]   = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [showPwForm, setShowPwForm] = useState(false)

  // ── 2FA ──
  const [twoFaCode,   setTwoFaCode]   = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [enrollData,  setEnrollData]  = useState<{ secret: string; otpauth_uri: string } | null>(null)
  const [twoFaMsg,    setTwoFaMsg]    = useState<{ text: string; ok: boolean } | null>(null)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

  // ── recovery codes ──
  const [backupCodes,     setBackupCodes]     = useState<string[] | null>(null)
  const [showBackup,      setShowBackup]      = useState(false)
  const [copiedBackup,    setCopiedBackup]    = useState(false)
  const [backupLoading,   setBackupLoading]   = useState(false)

  // ── sign out all ──
  const [signingOutAll, setSigningOutAll] = useState(false)

  const strength = getStrength(newPw)

  const { data: me } = useQuery({
    queryKey: ['operator-me'],
    queryFn: operatorAuthService.getMe,
    staleTime: 60_000,
  })

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['operator-sessions'],
    queryFn: operatorAuthService.listSessions,
    staleTime: 30_000,
  })

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['operator-sign-in-history'],
    queryFn: operatorAuthService.getSignInHistory,
    staleTime: 60_000,
  })

  const { data: backupStatus } = useQuery({
    queryKey: ['operator-backup-status'],
    queryFn: operatorAuthService.getBackupCodeStatus,
    staleTime: 60_000,
  })

  // ── mutations ──
  const changePwMutation = useMutation({
    mutationFn: () => operatorAuthService.changePassword(currentPw, newPw),
    onSuccess: () => {
      setPwSuccess(true); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setShowPwForm(false)
      setTimeout(() => setPwSuccess(false), 5000)
    },
    onError: (err: unknown) => {
      setPwError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to change password.')
    },
  })

  const startEnrollMutation = useMutation({
    mutationFn: operatorAuthService.enroll2fa,
    onSuccess: (data) => setEnrollData(data),
    onError: () => setTwoFaMsg({ text: 'Failed to start 2FA enrollment.', ok: false }),
  })

  const confirmEnrollMutation = useMutation({
    mutationFn: () => operatorAuthService.confirm2fa(twoFaCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operator-me'] })
      setEnrollData(null); setTwoFaCode('')
      setTwoFaMsg({ text: 'Two-factor authentication is now enabled.', ok: true })
    },
    onError: () => setTwoFaMsg({ text: 'Invalid code. Please try again.', ok: false }),
  })

  const disableMutation = useMutation({
    mutationFn: () => operatorAuthService.disable2fa(disableCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operator-me'] })
      setDisableCode(''); setShowDisableConfirm(false)
      setTwoFaMsg({ text: '2FA disabled. We recommend re-enabling it.', ok: false })
    },
    onError: () => setTwoFaMsg({ text: 'Invalid code. Please try again.', ok: false }),
  })

  const revokeSession = useMutation({
    mutationFn: (id: string) => operatorAuthService.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operator-sessions'] }),
  })

  const handleChangePw = () => {
    setPwError(null)
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    if (strength.score < 2)  { setPwError('Please choose a stronger password'); return }
    changePwMutation.mutate()
  }

  const handleSignOutAll = async () => {
    setSigningOutAll(true)
    try {
      await operatorAuthService.signOutAllSessions()
      clearAuth()
    } catch { setSigningOutAll(false) }
  }

  const handleGenerateBackupCodes = async () => {
    setBackupLoading(true)
    try {
      const { codes } = await operatorAuthService.generateBackupCodes()
      setBackupCodes(codes)
      setShowBackup(true)
      qc.invalidateQueries({ queryKey: ['operator-backup-status'] })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleCopyBackup = () => {
    if (!backupCodes) return
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopiedBackup(true)
    setTimeout(() => setCopiedBackup(false), 2000)
  }

  const twoFaEnabled       = me?.twofa_enabled ?? storeUser?.twoFactorEnabled ?? false
  const twoFaEnrolledAt    = (me as { twofa_enrolled_at?: string | null } | undefined)?.twofa_enrolled_at ?? null
  const passwordChangedAt  = (me as { password_changed_at?: string | null } | undefined)?.password_changed_at ?? null
  const userName           = storeUser?.name ?? '—'
  const orgName            = storeUser?.operatorName ?? '—'

  return (
    <Shell
      activeId="security"
      breadcrumb="Account · Security"
      title={userName}
      subtitle="Security · Sessions · Sign-in history"
      actions={
        <button
          className="btn sm danger"
          disabled={signingOutAll}
          onClick={handleSignOutAll}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 17l5-5-5-5M20 12H9M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
          </svg>
          {signingOutAll ? 'Signing out…' : 'Sign out of all sessions'}
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: '100%' }}>
        <ProfileRail active="Security" />

        <div style={{ padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 32, overflowY: 'auto' }}>

          {/* ── Password & 2FA ── */}
          <FormSection
            title="Password & two-factor"
            description="Operator Admin and Finance roles cannot disable 2FA on themselves. Ask another Operator Admin to override from Team & Roles."
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Password card */}
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="t-label" style={{ padding: 0 }}>Password</div>
                  <span className="badge ok">
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                    {pwSuccess ? 'Updated' : 'Healthy'}
                  </span>
                </div>
                <div style={{ marginTop: 14, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: 2 }}>
                  ••••••••••••
                </div>
                {(pwSuccess || passwordChangedAt) && (
                  <div className="t-meta" style={{ marginTop: 6 }}>
                    {pwSuccess
                      ? 'Just changed · all other sessions revoked'
                      : passwordChangedAt
                        ? `Last changed ${fmtDate(passwordChangedAt)}`
                        : null
                    }
                  </div>
                )}

                {!showPwForm ? (
                  <div style={{ marginTop: 18 }}>
                    <button
                      className="btn sm"
                      onClick={() => { setShowPwForm(true); setPwError(null) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <RefreshCw size={12} /> Change password
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pwError && (
                      <div style={{ padding: '8px 10px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))', borderRadius: 3, fontSize: 12, color: 'var(--danger)' }}>
                        {pwError}
                      </div>
                    )}
                    {(['Current password', 'New password', 'Confirm new password'] as const).map((lbl, i) => {
                      const vals  = [currentPw, newPw, confirmPw]
                      const setters = [setCurrentPw, setNewPw, setConfirmPw]
                      return (
                        <div key={lbl} className="field">
                          <label className="field-label" style={{ fontSize: 11 }}>{lbl}</label>
                          <div className="input" style={{ paddingLeft: 10, height: 36 }}>
                            <input
                              type={showPw ? 'text' : 'password'}
                              value={vals[i]}
                              onChange={e => setters[i](e.target.value)}
                              placeholder="••••••••"
                              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 13 }}
                            />
                            {i === 0 && (
                              <button type="button" onClick={() => setShowPw(s => !s)} style={{ display: 'flex', alignItems: 'center', padding: '0 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)' }} tabIndex={-1}>
                                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            )}
                          </div>
                          {i === 1 && newPw.length > 0 && (
                            <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                              {[0,1,2,3].map(j => (
                                <span key={j} style={{ flex: 1, height: 2, borderRadius: 2, background: j < strength.score ? strength.color : 'var(--rule)' }} />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn sm" onClick={() => { setShowPwForm(false); setPwError(null); setCurrentPw(''); setNewPw(''); setConfirmPw('') }}>Cancel</button>
                      <button
                        className="btn accent sm"
                        disabled={changePwMutation.isPending || !currentPw || !newPw || !confirmPw}
                        onClick={handleChangePw}
                      >
                        {changePwMutation.isPending ? 'Saving…' : 'Update password'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2FA card */}
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="t-label" style={{ padding: 0 }}>Two-factor authentication</div>
                  {twoFaEnabled
                    ? <span className="badge ok"><Shield size={10} strokeWidth={2.2} /> Enrolled · Required</span>
                    : <span className="badge"><ShieldOff size={10} strokeWidth={2.2} /> Not enrolled</span>
                  }
                </div>

                {twoFaMsg && (
                  <div style={{ marginTop: 12, padding: '8px 10px', background: twoFaMsg.ok ? 'var(--ok-soft)' : 'var(--danger-soft)', border: `1px solid color-mix(in oklab, ${twoFaMsg.ok ? 'var(--ok)' : 'var(--danger)'} 30%, var(--rule-strong))`, borderRadius: 3, fontSize: 12, color: twoFaMsg.ok ? 'var(--ok)' : 'var(--danger)' }}>
                    {twoFaMsg.text}
                  </div>
                )}

                {twoFaEnabled && !enrollData && (
                  <>
                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 4, background: 'var(--surface-2)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Monitor size={18} style={{ color: 'var(--ink-3)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, color: 'var(--ink)' }}>TOTP · Authenticator app</div>
                        <div className="t-meta" style={{ marginTop: 4 }}>
                          {twoFaEnrolledAt
                            ? `Enrolled ${fmtDate(twoFaEnrolledAt)}`
                            : 'Authenticator app enrolled'}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn sm"
                        onClick={handleGenerateBackupCodes}
                        disabled={backupLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        {backupLoading ? 'Generating…' : `View recovery codes${backupStatus ? ` · ${backupStatus.remaining} left` : ''}`}
                      </button>
                      <button
                        className="btn sm ghost"
                        onClick={() => { setTwoFaMsg(null); startEnrollMutation.mutate() }}
                        disabled={startEnrollMutation.isPending}
                      >
                        Re-enroll device
                      </button>
                    </div>
                    {!showDisableConfirm ? (
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--rule-soft)' }}>
                        <button
                          className="btn sm ghost"
                          style={{ color: 'var(--danger)', fontSize: 11 }}
                          onClick={() => setShowDisableConfirm(true)}
                        >
                          Disable 2FA…
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--rule-soft)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>Enter authenticator code to confirm</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text" inputMode="numeric" maxLength={6}
                            className="input"
                            value={disableCode}
                            onChange={e => setDisableCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            style={{ width: 100, textAlign: 'center', letterSpacing: '0.24em', fontFamily: 'var(--font-mono)', fontSize: 14 }}
                          />
                          <button className="btn sm danger" disabled={disableMutation.isPending || disableCode.length !== 6} onClick={() => disableMutation.mutate()}>
                            {disableMutation.isPending ? 'Disabling…' : 'Disable'}
                          </button>
                          <button className="btn sm ghost" onClick={() => { setShowDisableConfirm(false); setDisableCode('') }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!twoFaEnabled && !enrollData && (
                  <div style={{ marginTop: 14 }}>
                    <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                      Protect your account with an authenticator app. Required for Operator Admin and Finance roles.
                    </p>
                    <button
                      className="btn sm"
                      onClick={() => { setTwoFaMsg(null); startEnrollMutation.mutate() }}
                      disabled={startEnrollMutation.isPending}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Shield size={13} /> {startEnrollMutation.isPending ? 'Starting…' : 'Enable 2FA'}
                    </button>
                  </div>
                )}

                {enrollData && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>Scan with Google Authenticator or Authy, then enter the 6-digit code.</p>
                    <div style={{ display: 'inline-flex', padding: 12, background: '#fff', border: '1px solid var(--rule)', borderRadius: 4 }}>
                      <QRCodeSVG value={enrollData.otpauth_uri} size={140} level="M" includeMargin={false} />
                    </div>
                    <details>
                      <summary style={{ fontSize: 11.5, color: 'var(--ink-3)', cursor: 'pointer' }}>Can't scan? Enter key manually</summary>
                      <div style={{ marginTop: 6, padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', color: 'var(--accent)', wordBreak: 'break-all' }}>
                        {enrollData.secret}
                      </div>
                    </details>
                    {twoFaMsg && (
                      <div style={{ padding: '8px 10px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))', borderRadius: 3, fontSize: 12, color: 'var(--danger)' }}>
                        {twoFaMsg.text}
                      </div>
                    )}
                    <div className="field">
                      <label className="field-label" style={{ fontSize: 11 }}>6-digit code from app</label>
                      <input type="text" inputMode="numeric" maxLength={6} className="input" value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" autoFocus style={{ maxWidth: 130, textAlign: 'center', letterSpacing: '0.3em', fontFamily: 'var(--font-mono)', fontSize: 16 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn accent sm" disabled={confirmEnrollMutation.isPending || twoFaCode.length !== 6} onClick={() => { setTwoFaMsg(null); confirmEnrollMutation.mutate() }}>
                        {confirmEnrollMutation.isPending ? 'Verifying…' : 'Enable 2FA'}
                      </button>
                      <button className="btn sm ghost" onClick={() => { setEnrollData(null); setTwoFaCode('') }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recovery codes sheet */}
            {showBackup && backupCodes && (
              <div style={{ padding: '20px 22px', border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>Recovery codes</div>
                    <div className="t-meta" style={{ marginTop: 3 }}>Each code can only be used once. Store them somewhere safe — they won't be shown again.</div>
                  </div>
                  <button className="btn sm ghost" onClick={() => { setShowBackup(false); setBackupCodes(null) }}>Close</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {backupCodes.map(c => (
                    <div key={c} style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, letterSpacing: '0.12em', color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 3, padding: '8px 12px' }}>
                      {c}
                    </div>
                  ))}
                </div>
                <button className="btn sm" onClick={handleCopyBackup} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Copy size={12} /> {copiedBackup ? 'Copied!' : 'Copy all codes'}
                </button>
              </div>
            )}
          </FormSection>

          {/* ── Active sessions ── */}
          <FormSection
            title="Active sessions"
            description="Each row is a signed-in device. Revoking ends the session and rotates the refresh token immediately."
          >
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {sessionsLoading ? (
                <div style={{ padding: '24px 18px', color: 'var(--ink-3)', fontSize: 13 }}>Loading sessions…</div>
              ) : !sessions?.length ? (
                <div style={{ padding: '24px 18px', color: 'var(--ink-3)', fontSize: 13 }}>No active sessions found.</div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th>Device</th>
                        <th>Session</th>
                        <th>IP address</th>
                        <th>Started</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s: OperatorSession) => {
                        const isMobileDevice = s.device_info?.toLowerCase().match(/mobile|iphone|android/)
                        const deviceLabel = s.device_info ?? null
                        return (
                        <tr key={s.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {isMobileDevice
                                ? <Smartphone size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                                : <Monitor size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                              }
                              <div>
                                {deviceLabel ? (
                                  <>
                                    <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>
                                      {deviceLabel.split(' · ')[1] ?? deviceLabel}
                                    </div>
                                    <div className="t-meta" style={{ marginTop: 2 }}>
                                      {deviceLabel.split(' · ').slice(2).join(' · ')}
                                    </div>
                                  </>
                                ) : (
                                  <div style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>—</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="num" style={{ color: 'var(--ink-2)', fontSize: 11.5 }}>
                            {s.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td>
                            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>{s.ip_address ?? '—'}</div>
                          </td>
                          <td className="num" style={{ color: 'var(--ink-2)' }}>{fmt(s.created_at)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn sm danger"
                              disabled={revokeSession.isPending}
                              onClick={() => revokeSession.mutate(s.id)}
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </FormSection>

          {/* ── Sign-in history ── */}
          <FormSection
            title="Sign-in history"
            description="The last seven days. Failed attempts are highlighted."
          >
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {historyLoading ? (
                <div style={{ padding: '24px 18px', color: 'var(--ink-3)', fontSize: 13 }}>Loading history…</div>
              ) : !history?.length ? (
                <div style={{ padding: '24px 18px', color: 'var(--ink-3)', fontSize: 13 }}>No sign-in activity in the last 7 days.</div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ minWidth: 400 }}>
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Event</th>
                        <th>IP address</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h: OperatorLoginHistory) => (
                        <tr key={h.id}>
                          <td className="num" style={{ color: 'var(--ink-2)' }}>{fmt(h.attempted_at)}</td>
                          <td style={{ color: 'var(--ink-2)' }}>{h.success ? 'Signed in' : 'Failed sign-in'}</td>
                          <td className="num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>{h.ip_address ?? '—'}</td>
                          <td>
                            {h.success
                              ? <span className="badge ok"><span className="dot ok" />Success</span>
                              : <span className="badge danger"><span className="dot danger" />Failed</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </FormSection>

        </div>
      </div>
    </Shell>
  )
}
