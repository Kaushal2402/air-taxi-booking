import { useState, useEffect } from 'react'
import { fmtDateTime } from '../../lib/format'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import { operatorAuthService } from '../../services/operatorAuthService'
import type { OperatorSubUser } from '../../services/operatorAuthService'
import { operatorRolesService } from '../../services/operatorRolesService'
import type { OperatorRole } from '../../services/operatorRolesService'

type StatusFilter = 'all' | 'active' | 'invited' | 'suspended'

const ROLE_LABELS: Record<string, string> = {
  operator_admin: 'Admin',
  ops_manager: 'Ops Manager',
  dispatcher: 'Dispatcher',
  finance: 'Finance',
  crew_coordinator: 'Crew',
  viewer: 'Viewer',
}

function initials(name: string) {
  return name
    .split(' ')
    .map(p => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const formatDate = fmtDateTime

interface ConfirmState {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  danger: boolean
  onConfirm: () => void
}

const CLOSED_CONFIRM: ConfirmState = {
  open: false, title: '', description: '', confirmLabel: '', danger: false, onConfirm: () => {},
}

export default function TeamPage() {
  const isMobile = useIsMobile()

  const [members, setMembers] = useState<OperatorSubUser[]>([])
  const [roles, setRoles] = useState<OperatorRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Inline confirm
  const [confirm, setConfirm] = useState<ConfirmState>(CLOSED_CONFIRM)
  const [confirming, setConfirming] = useState(false)

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [invitePhone, setInvitePhone] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Per-row resend feedback
  const [resentIds, setResentIds] = useState<Set<string>>(new Set())
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set())

  // Mobile expanded actions
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, roleList] = await Promise.all([
        operatorAuthService.listSubUsers(),
        operatorRolesService.listRoles(),
      ])
      setMembers(data)
      setRoles(roleList)
    } catch {
      setError('Failed to load team members.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = members.filter(m => {
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const openConfirm = (opts: Omit<ConfirmState, 'open'>) => setConfirm({ ...opts, open: true })
  const closeConfirm = () => setConfirm(CLOSED_CONFIRM)

  const runConfirm = async () => {
    setConfirming(true)
    try { await confirm.onConfirm() } finally {
      setConfirming(false)
      closeConfirm()
    }
  }

  const handleSuspend = (m: OperatorSubUser) => {
    openConfirm({
      title: 'Suspend member',
      description: `Suspend ${m.name}? They will lose access until reactivated.`,
      confirmLabel: 'Suspend',
      danger: true,
      onConfirm: async () => { await operatorAuthService.suspendSubUser(m.id); await load() },
    })
  }

  const handleForceLogout = (m: OperatorSubUser) => {
    openConfirm({
      title: 'Force logout',
      description: `Sign ${m.name} out of all active sessions?`,
      confirmLabel: 'Force logout',
      danger: true,
      onConfirm: async () => { await operatorAuthService.forceLogoutSubUser(m.id); await load() },
    })
  }

  const handleReactivate = (m: OperatorSubUser) => {
    openConfirm({
      title: 'Reactivate member',
      description: `Reactivate ${m.name}? They will regain access.`,
      confirmLabel: 'Reactivate',
      danger: false,
      onConfirm: async () => { await operatorAuthService.reactivateSubUser(m.id); await load() },
    })
  }

  const handleReset2fa = (m: OperatorSubUser) => {
    openConfirm({
      title: 'Reset 2FA',
      description: `Reset two-factor authentication for ${m.name}? They will need to re-enroll.`,
      confirmLabel: 'Reset 2FA',
      danger: false,
      onConfirm: async () => { await operatorAuthService.resetSubUser2fa(m.id) },
    })
  }

  const handleResend = async (m: OperatorSubUser) => {
    setResendingIds(s => new Set(s).add(m.id))
    try {
      await operatorAuthService.resendSubUserInvite(m.id)
      setResentIds(s => new Set(s).add(m.id))
      setTimeout(() => setResentIds(s => { const n = new Set(s); n.delete(m.id); return n }), 3000)
    } finally {
      setResendingIds(s => { const n = new Set(s); n.delete(m.id); return n })
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError(null)
    try {
      await operatorAuthService.inviteSubUser({
        name: inviteName,
        email: inviteEmail,
        operator_role: inviteRole,
        phone: invitePhone || undefined,
      })
      setInviteSuccess(true)
      await load()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setInviteError(detail ?? 'Failed to send invite.')
    } finally {
      setInviteLoading(false)
    }
  }

  const closeInvite = () => {
    setInviteOpen(false)
    setInviteName('')
    setInviteEmail('')
    setInviteRole('viewer')
    setInvitePhone('')
    setInviteError(null)
    setInviteSuccess(false)
  }

  const statusBadge = (status: string) => {
    if (status === 'active') return <span className="badge ok">Active</span>
    if (status === 'invited') return <span className="badge info">Invited</span>
    if (status === 'suspended') return <span className="badge danger">Suspended</span>
    return <span className="badge">{status}</span>
  }

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'invited', label: 'Invited' },
    { key: 'suspended', label: 'Suspended' },
  ]

  return (
    <Shell
      activeId="team"
      breadcrumb="Team"
      title="Team"
      subtitle="Manage your team members"
      actions={
        <button className="btn accent sm" onClick={() => setInviteOpen(true)}>
          + Invite member
        </button>
      }
    >
      <div style={{ padding: isMobile ? '20px 16px' : '32px 32px' }}>

        {/* Search + filter row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ minWidth: 220, flex: isMobile ? '1 1 100%' : '0 1 280px' }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`btn sm${statusFilter === t.key ? ' accent' : ' ghost'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div style={{
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
            borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading team members…</p>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)', fontSize: 14,
          }}>
            {members.length === 0
              ? 'No team members yet. Invite someone to get started.'
              : 'No members match your search/filter.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="tbl" style={{ width: '100%', minWidth: isMobile ? 600 : 800 }}>
              <thead>
                <tr>
                  <th className="t-label">Name</th>
                  <th className="t-label">Email</th>
                  <th className="t-label">Role</th>
                  <th className="t-label">Status</th>
                  <th className="t-label">Last login</th>
                  <th className="t-label">2FA</th>
                  <th className="t-label" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <>
                    <tr key={m.id}>
                      {/* Name + avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--accent-soft)',
                            border: '1px solid color-mix(in oklab, var(--accent) 30%, var(--rule))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
                            color: 'var(--accent)', flexShrink: 0,
                          }}>
                            {initials(m.name)}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{m.name}</span>
                        </div>
                      </td>
                      <td className="t-meta">{m.email}</td>
                      <td>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 11,
                          background: 'var(--surface-sunk)',
                          border: '1px solid var(--rule)',
                          borderRadius: 3, padding: '2px 6px',
                          color: 'var(--ink-2)',
                        }}>
                          {ROLE_LABELS[m.operator_role] ?? m.operator_role}
                        </span>
                      </td>
                      <td>{statusBadge(m.status)}</td>
                      <td className="t-meta">{formatDate(m.last_login_at)}</td>
                      <td>
                        <span style={{ fontSize: 12, color: m.twofa_enabled ? 'var(--ok)' : 'var(--ink-4)' }}>
                          {m.twofa_enabled ? 'On' : 'Off'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isMobile ? (
                          <button
                            className="btn sm ghost"
                            onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                          >
                            Manage
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {m.status === 'invited' && (
                              <button
                                className="btn sm ghost"
                                disabled={resendingIds.has(m.id)}
                                onClick={() => handleResend(m)}
                              >
                                {resentIds.has(m.id) ? 'Sent ✓' : resendingIds.has(m.id) ? 'Sending…' : 'Resend invite'}
                              </button>
                            )}
                            {m.status === 'active' && (
                              <>
                                <button className="btn sm ghost" onClick={() => handleForceLogout(m)}>
                                  Force logout
                                </button>
                                <button
                                  className="btn sm ghost"
                                  style={{ color: 'var(--danger)' }}
                                  onClick={() => handleSuspend(m)}
                                >
                                  Suspend
                                </button>
                              </>
                            )}
                            {m.status === 'suspended' && (
                              <>
                                {m.twofa_enabled && (
                                  <button className="btn sm ghost" onClick={() => handleReset2fa(m)}>
                                    Reset 2FA
                                  </button>
                                )}
                                <button className="btn accent sm" onClick={() => handleReactivate(m)}>
                                  Reactivate
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    {/* Mobile expanded actions */}
                    {isMobile && expandedId === m.id && (
                      <tr key={`${m.id}-actions`}>
                        <td colSpan={7} style={{ paddingTop: 0, paddingBottom: 12 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 42 }}>
                            {m.status === 'invited' && (
                              <button
                                className="btn sm ghost"
                                disabled={resendingIds.has(m.id)}
                                onClick={() => handleResend(m)}
                              >
                                {resentIds.has(m.id) ? 'Sent ✓' : 'Resend invite'}
                              </button>
                            )}
                            {m.status === 'active' && (
                              <>
                                <button className="btn sm ghost" onClick={() => handleForceLogout(m)}>
                                  Force logout
                                </button>
                                <button
                                  className="btn sm ghost"
                                  style={{ color: 'var(--danger)' }}
                                  onClick={() => handleSuspend(m)}
                                >
                                  Suspend
                                </button>
                              </>
                            )}
                            {m.status === 'suspended' && (
                              <>
                                {m.twofa_enabled && (
                                  <button className="btn sm ghost" onClick={() => handleReset2fa(m)}>
                                    Reset 2FA
                                  </button>
                                )}
                                <button className="btn accent sm" onClick={() => handleReactivate(m)}>
                                  Reactivate
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inline Confirm Modal */}
      {confirm.open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,13,10,0.5)', zIndex: 199 }}
            onClick={closeConfirm}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-pop)',
            padding: '28px 28px 24px',
            zIndex: 200,
            minWidth: 320,
            maxWidth: 440,
            width: '90vw',
          }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>
              {confirm.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 24, lineHeight: 1.6 }}>
              {confirm.description}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn sm ghost" onClick={closeConfirm} disabled={confirming}>
                Cancel
              </button>
              <button
                className={`btn sm${confirm.danger ? '' : ' accent'}`}
                style={confirm.danger ? { background: 'var(--danger)', color: '#fff', border: 'none' } : {}}
                disabled={confirming}
                onClick={runConfirm}
              >
                {confirming ? 'Please wait…' : confirm.confirmLabel}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Invite Modal */}
      {inviteOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,13,10,0.5)', zIndex: 199 }}
            onClick={closeInvite}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-pop)',
            padding: '28px 28px 24px',
            zIndex: 200,
            minWidth: 340,
            maxWidth: 480,
            width: '90vw',
          }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginBottom: 20 }}>
              Invite team member
            </div>

            {inviteSuccess ? (
              <div>
                <div style={{
                  background: 'var(--ok-soft)',
                  border: '1px solid color-mix(in oklab, var(--ok) 30%, var(--rule))',
                  borderRadius: 4, padding: '12px 14px', fontSize: 13, color: 'var(--ok)', marginBottom: 20,
                }}>
                  Invite sent successfully.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn sm accent" onClick={closeInvite}>Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {inviteError && (
                  <div style={{
                    background: 'var(--danger-soft)',
                    border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
                    borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)',
                  }}>
                    {inviteError}
                  </div>
                )}
                <div className="field">
                  <label className="field-label">Full name *</label>
                  <input
                    required
                    className="input"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Email *</label>
                  <input
                    required
                    type="email"
                    className="input"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Role</label>
                  <select
                    className="input"
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                  >
                    {roles.length > 0
                      ? roles.map(r => (
                          <option key={r.name} value={r.name}>{r.display_name}</option>
                        ))
                      : Object.entries(ROLE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))
                    }
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Phone (optional)</label>
                  <input
                    type="tel"
                    className="input"
                    value={invitePhone}
                    onChange={e => setInvitePhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button type="button" className="btn sm ghost" onClick={closeInvite} disabled={inviteLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn accent sm" disabled={inviteLoading}>
                    {inviteLoading ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </Shell>
  )
}
