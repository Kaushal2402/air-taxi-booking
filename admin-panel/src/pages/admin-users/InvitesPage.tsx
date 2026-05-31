import { useState, useEffect } from 'react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { formatDate } from '../../lib/utils'
import { adminUserService } from '../../services/adminUserService'
import type { AdminUser } from '../../services/adminUserService'

const ROLES = [
  'super_admin', 'admin', 'dispatcher', 'finance',
  'support', 'catalog_editor', 'read_only',
]

interface InviteForm {
  name: string
  email: string
  role: string
}

const EMPTY_FORM: InviteForm = { name: '', email: '', role: 'admin' }

export default function InvitesPage() {
  const isMobile = useIsMobile()

  const [pendingInvites, setPendingInvites] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  // Resend loading per row
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set())

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteForm>(EMPTY_FORM)
  const [inviteError, setInviteError] = useState('')
  const [inviting, setInviting] = useState(false)

  // Toast
  const [toastMsg, setToastMsg] = useState('')
  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadInvites = async () => {
    setLoading(true)
    try {
      // TODO: wire up access-requests backend endpoint when available
      const res = await adminUserService.listAdmins({ status: 'invited', page_size: 50 })
      setPendingInvites(res.items.filter(u => u.status === 'invited'))
    } catch {
      setPendingInvites([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadInvites() }, [])

  // ── Resend invite ─────────────────────────────────────────────────────────────

  const handleResend = async (user: AdminUser) => {
    setResendingIds(s => new Set(s).add(user.id))
    try {
      await adminUserService.resendInvite(user.id)
      showToast(`Invitation resent to ${user.email}`)
    } catch {
      showToast(`Failed to resend invitation to ${user.email}`)
    } finally {
      setResendingIds(s => { const n = new Set(s); n.delete(user.id); return n })
    }
  }

  // ── Invite admin ──────────────────────────────────────────────────────────────

  const handleInvite = async () => {
    setInviteError('')
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      setInviteError('Name and email are required')
      return
    }
    setInviting(true)
    try {
      await adminUserService.inviteAdmin(inviteForm)
      setShowInvite(false)
      setInviteForm(EMPTY_FORM)
      showToast(`Invitation sent to ${inviteForm.email}`)
      await loadInvites()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setInviteError(err?.response?.data?.message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Shell
      activeId="admins"
      breadcrumb="System · Admin users · Access"
      title="Invites & access requests"
      subtitle={`${pendingInvites.length} invites pending · 0 access requests`}
      actions={
        <button className="btn sm accent" onClick={() => setShowInvite(true)}>
          <Icon name="plus" size={13} />Invite admin
        </button>
      }
    >
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: 'var(--surface)',
          padding: '10px 20px', borderRadius: 4,
          fontSize: 13, zIndex: 200,
          boxShadow: 'var(--shadow-2)',
          display: 'flex', alignItems: 'center', gap: 8,
          whiteSpace: 'nowrap',
        }}>
          <Icon name="check" size={13} stroke={2.4} style={{ color: 'var(--accent)' }} />
          {toastMsg}
        </div>
      )}

      <div style={{
        padding: isMobile ? '16px' : '24px 32px 28px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr',
        gap: 24,
        alignItems: 'start',
      }}>

        {/* ── Left panel — Access requests ───────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>
              Access requests
            </h3>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            <span className="t-meta">0 pending</span>
          </div>

          {/* Empty state — TODO: wire up access-requests backend endpoint when available */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            padding: '40px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div className="t-meta" style={{ textAlign: 'center' }}>
              No pending access requests
            </div>
          </div>
        </div>

        {/* ── Right panel — Pending invites ───────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>
                Pending invites
              </h3>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              {loading && (
                <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-3)' }}>
                  Loading…
                </div>
              )}

              {!loading && pendingInvites.length === 0 && (
                <div style={{ padding: '24px 20px' }}>
                  <div className="t-meta">No pending invites</div>
                </div>
              )}

              {!loading && pendingInvites.map((u, i) => {
                const initials = u.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
                const isResending = resendingIds.has(u.id)
                return (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '15px 20px',
                      borderBottom: i < pendingInvites.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                    }}
                  >
                    <div
                      className="avatar"
                      style={{ background: 'var(--surface-sunk)', color: 'var(--ink-4)', flexShrink: 0 }}
                    >
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13 }}>{u.name}</div>
                      <div className="t-meta" style={{ marginTop: 2 }}>
                        {u.email} · {u.role.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className="badge info"><span className="dot info" />Invited</span>
                      <div className="t-meta" style={{ marginTop: 4 }}>
                        {formatDate(u.created_at)}
                      </div>
                    </div>
                    <button
                      className="btn sm ghost"
                      disabled={isResending}
                      onClick={() => handleResend(u)}
                      style={{ flexShrink: 0 }}
                    >
                      {isResending
                        ? <Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                        : 'Resend'}
                    </button>
                  </div>
                )
              })}

              {/* Bottom bar */}
              <div style={{ padding: '14px 20px', display: 'flex', gap: 8 }}>
                <button
                  className="btn sm accent"
                  style={{ flex: 1 }}
                  onClick={() => setShowInvite(true)}
                >
                  <Icon name="plus" size={13} />New invite
                </button>
              </div>
            </div>
          </div>

          {/* Approval policy info box */}
          <div style={{
            padding: '16px 20px',
            background: 'var(--surface-2)',
            border: '1px solid var(--rule)',
            borderRadius: 3,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <Icon name="shield" size={15} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Approval policy</span>
            </div>
            <div className="t-meta" style={{ lineHeight: 1.5 }}>
              Finance &amp; Super Admin grants need two approvers. Invites expire in 7 days. All grants are written to the audit log.
            </div>
          </div>
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(26,24,20,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 16,
          }}
          onClick={() => { setShowInvite(false); setInviteError('') }}
        >
          <div
            className="card"
            style={{
              width: isMobile ? '100%' : 480, maxWidth: 480,
              padding: isMobile ? '28px 20px' : '36px 40px',
              background: 'var(--surface)', boxShadow: 'var(--shadow-pop)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{
              margin: 0,
              fontFamily: 'var(--font-serif)', fontSize: isMobile ? 20 : 24,
              fontWeight: 400, letterSpacing: '-0.018em',
            }}>
              Invite administrator
            </h2>
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)' }}>
              They'll receive an email with a link to set up their account.
            </p>

            {inviteError && (
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 32%, var(--rule-strong))',
                borderRadius: 3, fontSize: 13, color: 'var(--danger)',
              }}>
                {inviteError}
              </div>
            )}

            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label className="field-label">Full name</label>
                <div className="input">
                  <input
                    value={inviteForm.name}
                    onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Smith"
                    autoFocus
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Work email</label>
                <div className="input">
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jane@company.io"
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Role</label>
                <div className="input">
                  <select
                    value={inviteForm.role}
                    onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                    style={{ flex: 1, border: 0, outline: 0, background: 'transparent' }}
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <Icon name="chevDown" size={14} className="icon" />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={() => { setShowInvite(false); setInviteError('') }}
              >
                Cancel
              </button>
              <button
                className="btn accent"
                style={{ flex: 2 }}
                disabled={inviting}
                onClick={handleInvite}
              >
                {inviting
                  ? <><Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite', marginRight: 6 }} />Sending…</>
                  : 'Send invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
