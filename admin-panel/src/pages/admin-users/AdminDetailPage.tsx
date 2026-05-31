import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { formatDate, formatDateTime } from '../../lib/utils'
import { adminUserService } from '../../services/adminUserService'
import type { AdminUser, AdminSession } from '../../services/adminUserService'

// ── Permission mapping ────────────────────────────────────────────────────────

const ALL_MODULES = [
  'Bookings', 'Dispatch', 'Drivers & fleet',
  'Payments', 'Payouts', 'Pricing',
  'RBAC & admins', 'Settings',
]

function getPermissions(role: string): Array<[string, string]> {
  switch (role) {
    case 'super_admin':
      return ALL_MODULES.map(m => [m, 'Full'])
    case 'admin':
      return [
        ['Bookings', 'Full'], ['Dispatch', 'Full'], ['Drivers & fleet', 'Full'],
        ['Payments', 'View'], ['Payouts', 'Approve'], ['Pricing', 'Edit'],
        ['RBAC & admins', 'View'], ['Settings', 'View'],
      ]
    case 'finance':
      return [
        ['Bookings', 'View'], ['Dispatch', 'None'], ['Drivers & fleet', 'None'],
        ['Payments', 'Full'], ['Payouts', 'Full'], ['Pricing', 'View'],
        ['RBAC & admins', 'None'], ['Settings', 'None'],
      ]
    case 'dispatcher':
      return [
        ['Bookings', 'Full'], ['Dispatch', 'Full'], ['Drivers & fleet', 'View'],
        ['Payments', 'None'], ['Payouts', 'None'], ['Pricing', 'None'],
        ['RBAC & admins', 'None'], ['Settings', 'None'],
      ]
    case 'support':
      return [
        ['Bookings', 'View'], ['Dispatch', 'View'], ['Drivers & fleet', 'None'],
        ['Payments', 'None'], ['Payouts', 'None'], ['Pricing', 'None'],
        ['RBAC & admins', 'None'], ['Settings', 'None'],
      ]
    case 'catalog_editor':
      return [
        ['Bookings', 'None'], ['Dispatch', 'None'], ['Drivers & fleet', 'None'],
        ['Payments', 'None'], ['Payouts', 'None'], ['Pricing', 'Edit'],
        ['RBAC & admins', 'None'], ['Settings', 'None'],
      ]
    default:
      return ALL_MODULES.map(m => [m, 'View'])
  }
}

function permColor(level: string): string {
  if (level === 'Full' || level === 'Approve' || level === 'Edit') return 'var(--accent)'
  return 'var(--ink-3)'
}

// ── Confirm state ─────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [error, setError] = useState('')

  const [confirm, setConfirm] = useState<ConfirmState>(CONFIRM_CLOSED)
  const closeConfirm = () => setConfirm(CONFIRM_CLOSED)

  const [toastMsg, setToastMsg] = useState('')
  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadAdmin = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await adminUserService.getAdmin(id)
      setAdmin(data)
    } catch {
      setError('Failed to load admin user')
    } finally {
      setLoading(false)
    }
  }

  const loadSessions = async () => {
    if (!id) return
    setSessionsLoading(true)
    try {
      const data = await adminUserService.getAdminSessions(id)
      setSessions(data)
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => {
    loadAdmin()
    loadSessions()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleSuspend = () => {
    if (!admin) return
    setConfirm({
      open: true,
      title: `Suspend ${admin.name}?`,
      description: `${admin.name} will be immediately signed out and blocked from signing in. You can reactivate them at any time.`,
      confirmLabel: 'Suspend account',
      loading: false,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, loading: true }))
        try {
          const updated = await adminUserService.suspendAdmin(admin.id)
          setAdmin(updated)
          showToast(`${admin.name} has been suspended`)
          closeConfirm()
        } catch {
          showToast('Failed to suspend account')
          closeConfirm()
        }
      },
    })
  }

  const handleReactivate = () => {
    if (!admin) return
    setConfirm({
      open: true,
      title: `Reactivate ${admin.name}?`,
      description: `${admin.name} will be able to sign in again with their existing credentials.`,
      confirmLabel: 'Reactivate',
      loading: false,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, loading: true }))
        try {
          const updated = await adminUserService.reactivateAdmin(admin.id)
          setAdmin(updated)
          showToast(`${admin.name} has been reactivated`)
          closeConfirm()
        } catch {
          showToast('Failed to reactivate account')
          closeConfirm()
        }
      },
    })
  }

  const handleForceLogout = () => {
    if (!admin) return
    setConfirm({
      open: true,
      title: `Force sign-out ${admin.name}?`,
      description: `All active sessions for ${admin.name} will be immediately terminated. They will need to sign in again on all devices.`,
      confirmLabel: 'Force sign-out',
      loading: false,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, loading: true }))
        try {
          await adminUserService.forceLogout(admin.id)
          showToast(`${admin.name} has been signed out of all devices`)
          closeConfirm()
          await loadSessions()
        } catch {
          showToast('Failed to force sign-out')
          closeConfirm()
        }
      },
    })
  }

  const handleReset2fa = () => {
    if (!admin) return
    setConfirm({
      open: true,
      title: `Reset 2FA for ${admin.name}?`,
      description: `Two-factor authentication will be disabled. ${admin.name} will need to re-enroll on their next login.`,
      confirmLabel: 'Reset 2FA',
      loading: false,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, loading: true }))
        try {
          await adminUserService.reset2fa(admin.id)
          setAdmin(a => a ? { ...a, two_factor_enabled: false } : a)
          showToast(`2FA has been reset for ${admin.name}`)
          closeConfirm()
        } catch {
          showToast('Failed to reset 2FA')
          closeConfirm()
        }
      },
    })
  }

  const handleRevokeAllSessions = () => {
    if (!admin) return
    setConfirm({
      open: true,
      title: 'Revoke all other sessions?',
      description: 'All sessions except the current one will be terminated.',
      confirmLabel: 'Revoke all',
      loading: false,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, loading: true }))
        try {
          await adminUserService.revokeAllSessions(admin.id)
          showToast('All sessions revoked')
          closeConfirm()
          await loadSessions()
        } catch {
          showToast('Failed to revoke sessions')
          closeConfirm()
        }
      },
    })
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const initials = admin
    ? admin.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const perms = admin ? getPermissions(admin.role) : []

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Shell activeId="admins" breadcrumb="System · Admin users" title="Loading…">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      </Shell>
    )
  }

  if (error || !admin) {
    return (
      <Shell activeId="admins" breadcrumb="System · Admin users" title="Not found">
        <div style={{ padding: 40 }}>
          <div style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>
            {error || 'Admin user not found'}
          </div>
          <button className="btn sm" onClick={() => navigate('/admin-users')}>
            <Icon name="chevLeft" size={13} /> Back to admin users
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      activeId="admins"
      breadcrumb={`System · Admin users · ${admin.name}`}
      title={admin.name}
      subtitle={`${admin.role.replace(/_/g, ' ')} · ${admin.two_factor_enabled ? 'MFA on' : 'MFA off'}`}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {admin.status === 'suspended' && (
            <button className="btn sm accent" onClick={handleReactivate}>Reactivate</button>
          )}
          {admin.status === 'active' && (
            <button
              className="btn sm"
              style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 30%, var(--rule))' }}
              onClick={handleSuspend}
            >
              Suspend
            </button>
          )}
          <button className="btn sm" onClick={handleForceLogout}>
            <Icon name="logout" size={13} />Force logout
          </button>
          <button className="btn sm" onClick={handleReset2fa}>
            <Icon name="shield" size={13} />Reset 2FA
          </button>
        </div>
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
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1.4fr',
        gap: 24,
        alignItems: 'start',
      }}>

        {/* ── Left panel ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Profile card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                className="avatar"
                style={{
                  width: 56, height: 56, flexShrink: 0,
                  fontFamily: 'var(--font-serif)', fontSize: 20,
                  background: admin.status === 'suspended' ? 'var(--surface-2)' : undefined,
                  color: admin.status === 'suspended' ? 'var(--ink-3)' : undefined,
                  overflow: 'hidden', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {admin.avatar_url
                  ? <img src={admin.avatar_url} alt={admin.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>{admin.name}</div>
                <div className="t-meta" style={{ marginTop: 4 }}>{admin.email}</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge">{admin.role.replace(/_/g, ' ')}</span>
                  {admin.status === 'active'    && <span className="badge ok"><span className="dot ok" />Active</span>}
                  {admin.status === 'invited'   && <span className="badge info"><span className="dot info" />Invited</span>}
                  {admin.status === 'suspended' && <span className="badge warn"><span className="dot warn" />Suspended</span>}
                </div>
              </div>
            </div>

            {/* Meta grid */}
            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[
                ['MFA', admin.two_factor_enabled ? 'On · TOTP' : 'Off'],
                ['SSO', '—'],
                ['Last login', admin.last_sign_in_at ? formatDateTime(admin.last_sign_in_at) : 'Never'],
                ['Created', formatDate(admin.created_at)],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--rule)',
                    borderRadius: 3,
                  }}
                >
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 5, fontSize: 13, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Effective permissions card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="t-label">Effective permissions</div>
              <span className="t-meta">via {admin.role.replace(/_/g, ' ')} role</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {perms.map(([module, level]) => (
                <div
                  key={module}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 12px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--rule)',
                    borderRadius: 3,
                  }}
                >
                  <span style={{ fontSize: 12.5 }}>{module}</span>
                  <span
                    className="t-mono"
                    style={{ fontSize: 11, color: permColor(level) }}
                  >
                    {level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right panel ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Active sessions card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div className="t-label">Active sessions</div>
              <button
                className="btn sm ghost"
                style={{ color: 'var(--danger)' }}
                onClick={handleRevokeAllSessions}
              >
                Revoke all others
              </button>
            </div>
            <div style={{ padding: '4px 22px 12px' }}>
              {sessionsLoading && (
                <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)' }}>Loading sessions…</div>
              )}
              {!sessionsLoading && sessions.length === 0 && (
                <div className="t-meta" style={{ padding: '16px 0' }}>No active sessions</div>
              )}
              {!sessionsLoading && sessions.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '13px 0',
                    borderBottom: i < sessions.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                  }}
                >
                  <Icon name="layers" size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>
                      {[s.device_name, s.device_os].filter(Boolean).join(' · ') || 'Unknown device'}
                    </div>
                    <div className="t-meta" style={{ marginTop: 2 }}>
                      {[s.location, s.ip_address].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  {s.is_current
                    ? <span className="badge ok"><span className="dot ok" />Current</span>
                    : <span className="t-meta">{formatDateTime(s.last_activity_at)}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div className="t-label">Recent activity</div>
              <button className="btn sm ghost" onClick={() => navigate('/audit')}>
                View audit log
              </button>
            </div>
            <div style={{ padding: '16px 22px' }}>
              <div className="t-meta" style={{ textAlign: 'center', padding: '8px 0' }}>
                No recent activity logged
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
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
