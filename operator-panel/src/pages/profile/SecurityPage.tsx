import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Monitor, Trash2, ShieldCheck, ShieldOff, QrCode } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import { operatorAuthService } from '../../services/operatorAuthService'
import type { OperatorSession } from '../../services/operatorAuthService'

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

export default function SecurityPage() {
  const isMobile = useIsMobile()
  const qc = useQueryClient()

  // Change password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  // 2FA enrollment
  const [twoFaCode, setTwoFaCode] = useState('')
  const [enrollData, setEnrollData] = useState<{ secret: string; otpauth_uri: string } | null>(null)
  const [twoFaError, setTwoFaError] = useState<string | null>(null)
  const [twoFaSuccess, setTwoFaSuccess] = useState<string | null>(null)

  // 2FA disable
  const [disableCode, setDisableCode] = useState('')

  const strength = getStrength(newPw)

  const { data: me } = useQuery({
    queryKey: ['operator-me'],
    queryFn: () => operatorAuthService.getMe(),
    staleTime: 60_000,
  })

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['operator-sessions'],
    queryFn: () => operatorAuthService.listSessions(),
    staleTime: 30_000,
  })

  const changePwMutation = useMutation({
    mutationFn: () => operatorAuthService.changePassword(currentPw, newPw),
    onSuccess: () => {
      setPwSuccess(true)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setTimeout(() => setPwSuccess(false), 4000)
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setPwError(detail ?? 'Failed to change password.')
    },
  })

  const handleChangePw = () => {
    setPwError(null)
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    if (strength.score < 2) { setPwError('Please choose a stronger password'); return }
    changePwMutation.mutate()
  }

  const startEnrollMutation = useMutation({
    mutationFn: () => operatorAuthService.enroll2fa(),
    onSuccess: (data) => setEnrollData(data),
    onError: () => setTwoFaError('Failed to start 2FA enrollment.'),
  })

  const confirmEnrollMutation = useMutation({
    mutationFn: () => operatorAuthService.confirm2fa(twoFaCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operator-me'] })
      setEnrollData(null)
      setTwoFaCode('')
      setTwoFaSuccess('Two-factor authentication is now enabled.')
      setTimeout(() => setTwoFaSuccess(null), 4000)
    },
    onError: () => setTwoFaError('Invalid code. Please try again.'),
  })

  const disableMutation = useMutation({
    mutationFn: () => operatorAuthService.disable2fa(disableCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operator-me'] })
      setDisableCode('')
      setTwoFaSuccess('Two-factor authentication disabled.')
      setTimeout(() => setTwoFaSuccess(null), 4000)
    },
    onError: () => setTwoFaError('Invalid code. Please try again.'),
  })

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => operatorAuthService.revokeSession(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operator-sessions'] }),
  })

  const card = (title: string, subtitle: string, children: React.ReactNode) => (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--rule)',
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  )

  return (
    <Shell activeId="security" breadcrumb="Settings" title="Security">
      <div style={{ padding: isMobile ? '20px 16px' : '32px 32px', maxWidth: 600 }}>

        {/* Change Password */}
        {card('Change Password', 'Use a strong, unique password', (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pwSuccess && (
              <div style={{
                background: 'var(--ok-soft)',
                border: '1px solid color-mix(in oklab, var(--ok) 30%, var(--rule))',
                borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--ok)',
              }}>
                Password changed. All sessions have been revoked.
              </div>
            )}
            {pwError && (
              <div style={{
                background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
                borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)',
              }}>
                {pwError}
              </div>
            )}
            <div className="field">
              <label className="field-label">Current Password</label>
              <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 38, color: 'var(--ink-4)', cursor: 'pointer', background: 'none', border: 'none' }}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="field">
              <label className="field-label">New Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                className="input"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="••••••••"
              />
              {newPw.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        height: 3, flex: 1, borderRadius: 2,
                        background: i <= strength.score ? strength.color : 'var(--rule-strong)',
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
              <label className="field-label">Confirm New Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                className="input"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <button
                className="btn accent sm"
                disabled={changePwMutation.isPending || !currentPw || !newPw || !confirmPw}
                onClick={handleChangePw}
              >
                {changePwMutation.isPending ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </div>
        ))}

        {/* 2FA */}
        {card(
          'Two-Factor Authentication',
          me?.twofa_enabled ? 'Currently enabled via authenticator app' : 'Add an extra layer of security',
          (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {twoFaSuccess && (
                <div style={{
                  background: 'var(--ok-soft)',
                  border: '1px solid color-mix(in oklab, var(--ok) 30%, var(--rule))',
                  borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--ok)',
                }}>
                  {twoFaSuccess}
                </div>
              )}
              {twoFaError && (
                <div style={{
                  background: 'var(--danger-soft)',
                  border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
                  borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)',
                }}>
                  {twoFaError}
                </div>
              )}

              {me?.twofa_enabled ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <ShieldCheck size={16} color="var(--ok)" />
                    <span style={{ fontSize: 13, color: 'var(--ok)' }}>2FA is enabled</span>
                  </div>
                  <div className="field">
                    <label className="field-label">Enter your authenticator code to disable</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="input"
                      value={disableCode}
                      onChange={e => setDisableCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      style={{ maxWidth: 160, letterSpacing: '0.3em', textAlign: 'center' }}
                    />
                  </div>
                  <button
                    className="btn sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    disabled={disableMutation.isPending || disableCode.length !== 6}
                    onClick={() => { setTwoFaError(null); disableMutation.mutate() }}
                  >
                    <ShieldOff size={13} />
                    {disableMutation.isPending ? 'Disabling…' : 'Disable 2FA'}
                  </button>
                </div>
              ) : enrollData ? (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>
                    Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
                  </p>
                  <div style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--rule)',
                    borderRadius: 4,
                    padding: '16px',
                    marginBottom: 16,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    wordBreak: 'break-all',
                    color: 'var(--ink-3)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <QrCode size={14} />
                      <span>Manual entry key:</span>
                    </div>
                    <span style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}>{enrollData.secret}</span>
                  </div>
                  <div className="field">
                    <label className="field-label">Enter the 6-digit code from your app</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="input"
                      value={twoFaCode}
                      onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      style={{ maxWidth: 160, letterSpacing: '0.3em', textAlign: 'center' }}
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn accent sm"
                      disabled={confirmEnrollMutation.isPending || twoFaCode.length !== 6}
                      onClick={() => { setTwoFaError(null); confirmEnrollMutation.mutate() }}
                    >
                      {confirmEnrollMutation.isPending ? 'Verifying…' : 'Enable 2FA'}
                    </button>
                    <button
                      className="btn sm ghost"
                      onClick={() => { setEnrollData(null); setTwoFaCode('') }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <ShieldOff size={16} color="var(--ink-3)" />
                    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>2FA is not enabled</span>
                  </div>
                  <button
                    className="btn sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    disabled={startEnrollMutation.isPending}
                    onClick={() => { setTwoFaError(null); startEnrollMutation.mutate() }}
                  >
                    <ShieldCheck size={13} />
                    {startEnrollMutation.isPending ? 'Starting…' : 'Enable 2FA'}
                  </button>
                </div>
              )}
            </div>
          )
        )}

        {/* Active Sessions */}
        {card('Active Sessions', 'Devices and sessions currently signed in', (
          <div>
            {sessionsLoading ? (
              <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading sessions…</p>
            ) : !sessions || sessions.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>No active sessions found.</p>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="tbl" style={{ width: '100%', minWidth: 420 }}>
                  <thead>
                    <tr>
                      <th className="t-label">IP Address</th>
                      <th className="t-label">Started</th>
                      <th className="t-label">Expires</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s: OperatorSession) => (
                      <tr key={s.id}>
                        <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Monitor size={13} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                            {s.ip_address ?? '—'}
                          </div>
                        </td>
                        <td className="t-meta">
                          {new Date(s.created_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="t-meta">
                          {new Date(s.expires_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric',
                          })}
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: 8 }}>
                          <button
                            className="btn sm ghost"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--danger)' }}
                            disabled={revokeSessionMutation.isPending}
                            onClick={() => revokeSessionMutation.mutate(s.id)}
                          >
                            <Trash2 size={12} />
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </Shell>
  )
}
