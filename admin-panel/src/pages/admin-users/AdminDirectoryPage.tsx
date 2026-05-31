import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import api from '../../lib/axios'
import { useIsMobile, useIsCompact } from '../../hooks/useIsMobile'
import { formatDate } from '../../lib/utils'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  two_factor_enabled: boolean
  last_sign_in_at: string | null
  created_at: string
  avatar_url: string | null
  locked_until: string | null
  failed_attempts: number
}

function isLocked(u: AdminUser): boolean {
  return !!u.locked_until && new Date(u.locked_until) > new Date()
}

interface InviteForm {
  name: string
  email: string
  role: string
}

// ── Types for row actions ────────────────────────────────────────────────────
type RowAction = 'suspend' | 'reactivate' | 'force-logout' | 'reset-2fa' | 'resend-invite' | 'unlock'

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

const ROLES = ['super_admin', 'admin', 'dispatcher', 'finance', 'support', 'compliance']

function statusBadge(u: AdminUser) {
  const s = u.status
  const locked = isLocked(u)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {s === 'active'    && <span className="badge ok"><span className="dot ok" />Active</span>}
      {s === 'invited'   && <span className="badge info"><span className="dot info" />Invited</span>}
      {s === 'suspended' && <span className="badge warn"><span className="dot warn" />Suspended</span>}
      {!['active','invited','suspended'].includes(s) && <span className="badge pending">{s}</span>}
      {locked && <span className="badge warn" style={{ background: 'var(--warn-soft, #fef3c7)', color: 'var(--warn, #d97706)', borderColor: 'color-mix(in oklab, var(--warn) 30%, transparent)' }}>
        <span style={{ fontSize: 10 }}>🔒</span> Locked
      </span>}
    </div>
  )
}

// ── Row dropdown menu ────────────────────────────────────────────────────────
interface RowMenuProps {
  user: AdminUser
  onAction: (action: RowAction, user: AdminUser) => void
}

function RowMenu({ user, onAction }: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const item = (
    action: RowAction,
    icon: string,
    label: string,
    danger = false,
  ) => (
    <button
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', width: '100%',
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13, color: danger ? 'var(--danger)' : 'var(--ink-2)',
        textAlign: 'left',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      onClick={() => { setOpen(false); onAction(action, user) }}
    >
      <Icon name={icon} size={13} style={{ color: danger ? 'var(--danger)' : 'var(--ink-3)', flexShrink: 0 }} />
      {label}
    </button>
  )

  const divider = () => (
    <div style={{ height: 1, background: 'var(--rule)', margin: '3px 0' }} />
  )

  // Build menu items based on status
  const hasActions =
    user.status === 'invited' ||
    user.status === 'active' ||
    user.status === 'suspended'

  if (!hasActions) return null

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
      <button className="btn ghost icon sm" onClick={() => setOpen(o => !o)}>
        <Icon name="moreVert" size={14} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4,
          background: 'var(--surface)',
          border: '1px solid var(--rule-strong)',
          borderRadius: 4,
          boxShadow: 'var(--shadow-2)',
          zIndex: 50,
          minWidth: 190,
          overflow: 'hidden',
          paddingTop: 4,
          paddingBottom: 4,
        }}>

          {/* Invited users */}
          {user.status === 'invited' && (
            item('resend-invite', 'refresh', 'Resend invitation')
          )}

          {/* Active users */}
          {user.status === 'active' && (<>
            {isLocked(user) && item('unlock', 'unlock', 'Unlock account')}
            {isLocked(user) && divider()}
            {item('force-logout', 'logout', 'Force sign-out')}
            {user.two_factor_enabled && item('reset-2fa', 'shield', 'Reset 2FA')}
            {divider()}
            {item('suspend', 'alert', 'Suspend account', true)}
          </>)}

          {/* Suspended users */}
          {user.status === 'suspended' && (<>
            {item('reactivate', 'check', 'Reactivate account')}
            {item('force-logout', 'logout', 'Force sign-out')}
            {user.two_factor_enabled && item('reset-2fa', 'shield', 'Reset 2FA')}
          </>)}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDirectoryPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isCompact = useIsCompact()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteForm>({ name: '', email: '', role: 'admin' })
  const [inviteError, setInviteError] = useState('')
  const [inviting, setInviting] = useState(false)

  // Confirm dialog
  const [confirm, setConfirm] = useState<ConfirmState>(CONFIRM_CLOSED)
  const closeConfirm = () => setConfirm(CONFIRM_CLOSED)

  // Toast
  const [toastMsg, setToastMsg] = useState('')
  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin-users?per_page=50')
      setUsers(res.data.items)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )

  const active    = users.filter(u => u.status === 'active').length
  const invited   = users.filter(u => u.status === 'invited').length
  const suspended = users.filter(u => u.status === 'suspended').length
  const twofa     = users.filter(u => u.two_factor_enabled).length

  // ── Optimistic update helper ───────────────────────────────────────────────
  const patchUser = (id: string, patch: Partial<AdminUser>) =>
    setUsers(us => us.map(u => u.id === id ? { ...u, ...patch } : u))

  // ── Invite ─────────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    setInviteError('')
    if (!inviteForm.name || !inviteForm.email) { setInviteError('Name and email are required'); return }
    setInviting(true)
    try {
      await api.post('/admin-users/invite', inviteForm)
      setShowInvite(false)
      setInviteForm({ name: '', email: '', role: 'admin' })
      showToast(`Invitation sent to ${inviteForm.email}`)
      load()
    } catch (e: any) {
      setInviteError(e?.response?.data?.message || 'Failed to invite admin')
    } finally {
      setInviting(false)
    }
  }

  // ── Row action dispatch ────────────────────────────────────────────────────
  const handleAction = (action: RowAction, user: AdminUser) => {
    switch (action) {

      case 'resend-invite':
        setConfirm({
          open: true,
          title: 'Resend invitation?',
          description: `A fresh invitation link will be sent to ${user.email}. The previous link will be invalidated.`,
          confirmLabel: 'Resend',
          loading: false,
          onConfirm: async () => {
            setConfirm(c => ({ ...c, loading: true }))
            try {
              await api.post(`/admin-users/${user.id}/resend-invite`)
              showToast(`Invitation resent to ${user.email}`)
              closeConfirm()
            } catch (e: any) {
              showToast(e?.response?.data?.message || 'Failed to resend invitation')
              closeConfirm()
            }
          },
        })
        break

      case 'suspend':
        setConfirm({
          open: true,
          title: `Suspend ${user.name}?`,
          description: `${user.name} will be immediately signed out of all devices and blocked from signing in. You can reactivate them at any time.`,
          confirmLabel: 'Suspend account',
          loading: false,
          onConfirm: async () => {
            setConfirm(c => ({ ...c, loading: true }))
            try {
              const res = await api.post(`/admin-users/${user.id}/suspend`)
              patchUser(user.id, { status: res.data.status })
              showToast(`${user.name}'s account has been suspended`)
              closeConfirm()
            } catch (e: any) {
              showToast(e?.response?.data?.message || 'Failed to suspend account')
              closeConfirm()
            }
          },
        })
        break

      case 'reactivate':
        setConfirm({
          open: true,
          title: `Reactivate ${user.name}?`,
          description: `${user.name} will be able to sign in again with their existing credentials.`,
          confirmLabel: 'Reactivate',
          loading: false,
          onConfirm: async () => {
            setConfirm(c => ({ ...c, loading: true }))
            try {
              const res = await api.post(`/admin-users/${user.id}/reactivate`)
              patchUser(user.id, { status: res.data.status })
              showToast(`${user.name}'s account has been reactivated`)
              closeConfirm()
            } catch (e: any) {
              showToast(e?.response?.data?.message || 'Failed to reactivate account')
              closeConfirm()
            }
          },
        })
        break

      case 'force-logout':
        setConfirm({
          open: true,
          title: `Force sign-out ${user.name}?`,
          description: `All active sessions for ${user.name} will be immediately terminated. They will need to sign in again on all their devices.`,
          confirmLabel: 'Force sign-out',
          loading: false,
          onConfirm: async () => {
            setConfirm(c => ({ ...c, loading: true }))
            try {
              await api.post(`/admin-users/${user.id}/force-logout`)
              showToast(`${user.name} has been signed out of all devices`)
              closeConfirm()
            } catch (e: any) {
              showToast(e?.response?.data?.message || 'Failed to force sign-out')
              closeConfirm()
            }
          },
        })
        break

      case 'reset-2fa':
        setConfirm({
          open: true,
          title: `Reset 2FA for ${user.name}?`,
          description: `Two-factor authentication will be disabled and all backup codes removed. ${user.name} will need to re-enroll on their next login.`,
          confirmLabel: 'Reset 2FA',
          loading: false,
          onConfirm: async () => {
            setConfirm(c => ({ ...c, loading: true }))
            try {
              await api.post(`/admin-users/${user.id}/reset-2fa`)
              patchUser(user.id, { two_factor_enabled: false })
              showToast(`2FA has been reset for ${user.name}`)
              closeConfirm()
            } catch (e: any) {
              showToast(e?.response?.data?.message || 'Failed to reset 2FA')
              closeConfirm()
            }
          },
        })
        break

      case 'unlock':
        setConfirm({
          open: true,
          title: `Unlock ${user.name}?`,
          description: `The login lockout will be cleared. ${user.name} will be able to sign in again immediately. Their failed attempt counter will also be reset.`,
          confirmLabel: 'Unlock account',
          loading: false,
          onConfirm: async () => {
            setConfirm(c => ({ ...c, loading: true }))
            try {
              const res = await api.post(`/admin-users/${user.id}/unlock`)
              patchUser(user.id, { locked_until: res.data.locked_until, failed_attempts: res.data.failed_attempts })
              showToast(`${user.name}'s account has been unlocked`)
              closeConfirm()
            } catch (e: any) {
              showToast(e?.response?.data?.message || 'Failed to unlock account')
              closeConfirm()
            }
          },
        })
        break
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Shell
      activeId="admins"
      breadcrumb="System · Identity & Access"
      title="Administrators"
      subtitle={isMobile ? undefined : `${total} total · ${active} active · ${invited} invited · ${suspended} suspended`}
      actions={
        <>
          {!isMobile && !isCompact && (
            <button className="btn sm"><Icon name="download" size={13} />Export</button>
          )}
          {!isMobile && (
            <button className="btn sm" onClick={() => navigate('/admin-users/access')}>
              Access requests
            </button>
          )}
          {!isMobile && (
            <button className="btn sm accent" onClick={() => setShowInvite(true)}>
              <Icon name="plus" size={13} />{isCompact ? 'Invite' : 'Invite admin'}
            </button>
          )}
        </>
      }
      actionsCompact={
        isMobile ? (
          <button className="btn icon sm accent" title="Invite admin" onClick={() => setShowInvite(true)}>
            <Icon name="plus" size={14} />
          </button>
        ) : undefined
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
          animation: 'fadeIn 0.15s ease',
          whiteSpace: 'nowrap',
        }}>
          <Icon name="check" size={13} stroke={2.4} style={{ color: 'var(--accent)' }} />
          {toastMsg}
        </div>
      )}

      <div style={{ padding: isMobile ? '16px' : '20px 32px 28px' }}>

        {/* Summary strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          marginBottom: 20,
        }}>
          {[
            { k: 'Total admins',    v: String(total),          m: 'Others in your team',    tone: 'ink' },
            { k: 'Active',          v: String(active),         m: 'Currently active',        tone: 'ok' },
            { k: 'Awaiting invite', v: String(invited),        m: 'Pending activation',      tone: 'info' },
            { k: '2FA enrolled',    v: `${twofa} / ${total}`,  m: total ? `${Math.round(twofa / total * 100)}% coverage` : '—', tone: twofa < total ? 'warn' : 'ok' },
          ].map((s, i) => (
            <div key={s.k} style={{
              padding: isMobile ? '14px 16px' : '20px 22px',
              borderRight: isMobile ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none') : (i < 3 ? '1px solid var(--rule)' : 'none'),
              borderBottom: isMobile ? (i < 2 ? '1px solid var(--rule)' : 'none') : 'none',
            }}>
              <div className="t-label" style={{ padding: 0 }}>{s.k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 24 : 30, fontWeight: 400, letterSpacing: '-0.018em', lineHeight: 1 }}>
                {s.v}
              </div>
              <div className="t-meta" style={{
                marginTop: 8,
                color: s.tone === 'ok' ? 'var(--accent)' : s.tone === 'warn' ? 'var(--warn)' : s.tone === 'info' ? 'var(--info, #3b82f6)' : 'var(--ink-3)',
              }}>{s.m}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0,
          padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div className="input" style={{ flex: 1, maxWidth: 300, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Name, email, role…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm" onClick={load}>
            <Icon name="refresh" size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            {!isMobile && (loading ? 'Loading…' : 'Refresh')}
          </button>
        </div>

        {/* Table */}
        <div className="tbl-scroll" style={{ background: 'var(--surface)', border: '1px solid var(--rule)', overflow: 'auto' }}>
          <table className="tbl" style={{ minWidth: isMobile ? 580 : undefined }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>2FA</th>
                <th>Last sign-in</th>
                {!isMobile && <th>Member since</th>}
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={isMobile ? 6 : 7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 32 }}>Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={isMobile ? 6 : 7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 32 }}>No administrators found</td></tr>
              )}
              {!loading && filtered.map(a => {
                const initials = a.name.split(' ').map(p => p[0]).slice(0, 2).join('')
                const isSuspended = a.status === 'suspended'
                return (
                  <tr
                    key={a.id}
                    style={{ opacity: isSuspended ? 0.65 : 1, cursor: 'pointer' }}
                    onClick={() => navigate(`/admin-users/${a.id}`)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{
                          background: isSuspended ? 'var(--surface-2)' : undefined,
                          color: isSuspended ? 'var(--ink-3)' : undefined,
                          overflow: 'hidden', padding: 0,
                        }}>
                          {a.avatar_url
                            ? <img src={a.avatar_url} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : initials}
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5 }}>{a.name}</div>
                          <div className="t-meta" style={{ marginTop: 2 }}>{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{a.role.replace(/_/g, ' ')}</td>
                    <td>{statusBadge(a)}</td>
                    <td>
                      {a.two_factor_enabled
                        ? <span className="badge ok"><span className="dot ok" />TOTP</span>
                        : <span className="badge warn"><span className="dot warn" />None</span>}
                    </td>
                    <td className="num" style={{ color: 'var(--ink-2)' }}>
                      {a.last_sign_in_at ? formatDate(a.last_sign_in_at) : '—'}
                    </td>
                    {!isMobile && (
                      <td className="num" style={{ color: 'var(--ink-3)' }}>
                        {formatDate(a.created_at)}
                      </td>
                    )}
                    <td>
                      <RowMenu user={a} onAction={handleAction} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        <div style={{
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface-2)',
          border: '1px solid var(--rule)',
          borderTop: 'none',
        }}>
          <div className="t-meta">
            Showing{' '}
            <strong style={{ color: 'var(--ink-2)' }}>1–{filtered.length}</strong>
            {' '}of{' '}
            <strong style={{ color: 'var(--ink-2)' }}>{total}</strong>
            {' '}administrators
          </div>
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(26,24,20,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 16,
        }} onClick={() => setShowInvite(false)}>
          <div className="card" style={{
            width: isMobile ? '100%' : 480, maxWidth: 480,
            padding: isMobile ? '28px 20px' : '36px 40px',
            background: 'var(--surface)', boxShadow: 'var(--shadow-pop)',
          }} onClick={e => e.stopPropagation()}>

            <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 20 : 24, fontWeight: 400, letterSpacing: '-0.018em' }}>
              Invite administrator
            </h2>
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)' }}>
              They'll receive an email with a link to set up their account.
            </p>

            {inviteError && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 32%, var(--rule-strong))', borderRadius: 3, fontSize: 13, color: 'var(--danger)' }}>
                {inviteError}
              </div>
            )}

            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label className="field-label">Full name</label>
                <div className="input">
                  <input value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" autoFocus />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Work email</label>
                <div className="input">
                  <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.io" />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Role</label>
                <div className="input">
                  <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))} style={{ flex: 1, border: 0, outline: 0, background: 'transparent' }}>
                    {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                  <Icon name="chevDown" size={14} className="icon" />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => { setShowInvite(false); setInviteError('') }}>Cancel</button>
              <button className="btn accent" style={{ flex: 2 }} disabled={inviting} onClick={handleInvite}>
                {inviting
                  ? <><Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite', marginRight: 6 }} />Sending…</>
                  : 'Send invitation'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog (suspend, force-logout, reset-2fa, etc.) */}
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
