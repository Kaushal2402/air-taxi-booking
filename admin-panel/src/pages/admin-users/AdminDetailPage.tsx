import { useState, useEffect } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { formatDate, formatDateTime } from '../../lib/utils'
import { adminUserService } from '../../services/adminUserService'
import type { AdminUser, AdminSession, AdminActivityEvent } from '../../services/adminUserService'
import { rbacService } from '../../services/rbacService'
import type { Role, RolePermissionItem } from '../../services/rbacService'

function permColor(state: string): string {
  if (state === 'granted') return 'var(--accent)'
  if (state === 'scoped') return 'var(--warn)'
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
  const [activity, setActivity] = useState<AdminActivityEvent[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<RolePermissionItem[]>([])
  const [permsLoading, setPermsLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [error, setError] = useState('')
  const [isForbidden, setIsForbidden] = useState(false)

  const [confirm, setConfirm] = useState<ConfirmState>(CONFIRM_CLOSED)
  const closeConfirm = () => setConfirm(CONFIRM_CLOSED)

  const [toastMsg, setToastMsg] = useState('')
  const canManageAdmins = usePermission('admin_users.manage')
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

  const loadActivity = async () => {
    if (!id) return
    setActivityLoading(true)
    try {
      const data = await adminUserService.getAdminActivity(id, 10)
      setActivity(data)
    } catch {
      setActivity([])
    } finally {
      setActivityLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      const res = await rbacService.listRoles()
      setRoles(res.items.filter(r => r.is_active))
    } catch { /* ignore */ }
  }

  const loadPermissions = async (roleName: string) => {
    setPermsLoading(true)
    try {
      const role = await rbacService.getRoleByName(roleName)
      const res = await rbacService.getRolePermissions(role.id)
      setPermissions(res.permissions.filter(p => p.state !== 'none'))
    } catch {
      setPermissions([])
    } finally {
      setPermsLoading(false)
    }
  }

  useEffect(() => {
    loadAdmin()
    loadSessions()
    loadActivity()
    loadRoles()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load permissions whenever admin (and their role) is resolved
  useEffect(() => {
    if (admin?.role) loadPermissions(admin.role)
  }, [admin?.role]) // eslint-disable-line react-hooks/exhaustive-deps

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


  // ── Render ──────────────────────────────────────────────────────────────────

  if (isForbidden) return <AccessDeniedPage message={`You don't have permission to access this page.`} />

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
            <button className="btn sm accent" onClick={handleReactivate} style={{ display: canManageAdmins ? undefined : 'none' }}>Reactivate</button>
          )}
          {admin.status === 'active' && (
            <button
              className="btn sm"
              style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 30%, var(--rule))' }}
              onClick={handleSuspend} style={{ display: canManageAdmins ? undefined : 'none' }}
            >
              Suspend
            </button>
          )}
          <button className="btn sm" onClick={handleForceLogout} style={{ display: canManageAdmins ? undefined : 'none' }}>
            <Icon name="logout" size={13} />Force logout
          </button>
          <button className="btn sm" onClick={handleReset2fa} style={{ display: canManageAdmins ? undefined : 'none' }}>
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
              {/* Role change select — locked for super_admin */}
              {admin.role === 'super_admin' ? (
                <span className="badge" style={{ fontSize: 11 }}>super admin · locked</span>
              ) : (
              <div className="input" style={{ height: 28, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <select
                  value={admin.role}
                  onChange={async e => {
                    const newRole = e.target.value
                    try {
                      const updated = await adminUserService.updateAdmin(admin.id, { role: newRole })
                      setAdmin(updated)
                      showToast(`Role updated to ${newRole.replace(/_/g, ' ')}`)
                    } catch (e: unknown) {
                      const err = e as { response?: { data?: { detail?: string } } }
                      showToast(err?.response?.data?.detail || 'Failed to update role')
                    }
                  }}
                  style={{ border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink-2)' }}
                >
                  {roles.filter(r => r.name !== 'super_admin').map(r => (
                    <option key={r.id} value={r.name}>
                      {r.name.replace(/_/g, ' ')}{r.is_system ? '' : ' (custom)'}
                    </option>
                  ))}
                </select>
                <Icon name="chevDown" size={12} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
              </div>
              )}
            </div>

            {permsLoading && (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '8px 0' }}>Loading permissions…</div>
            )}
            {!permsLoading && permissions.length === 0 && (
              <div className="t-meta" style={{ padding: '8px 0' }}>
                No permissions granted for this role. Configure them in Role &amp; Access.
              </div>
            )}
            {!permsLoading && permissions.length > 0 && (
              <>
                {/* Group by domain */}
                {Array.from(new Set(permissions.map(p => p.domain))).map(domain => (
                  <div key={domain} style={{ marginBottom: 12 }}>
                    <div className="t-label" style={{ padding: '0 0 6px', fontSize: 10.5 }}>{domain}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {permissions.filter(p => p.domain === domain).map(p => (
                        <div
                          key={p.permission_key}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '7px 10px',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--rule)',
                            borderRadius: 3,
                          }}
                        >
                          <span style={{ fontSize: 12.5 }}>{p.description || p.permission_key}</span>
                          <span className="t-mono" style={{ fontSize: 11, color: permColor(p.state) }}>
                            {p.state}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
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
                onClick={handleRevokeAllSessions} style={{ display: canManageAdmins ? undefined : 'none' }}
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
            <div style={{ padding: '4px 22px 12px' }}>
              {activityLoading && (
                <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-3)' }}>Loading activity…</div>
              )}
              {!activityLoading && activity.length === 0 && (
                <div className="t-meta" style={{ padding: '16px 0', textAlign: 'center' }}>No recent activity logged</div>
              )}
              {!activityLoading && activity.map((ev, i) => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '11px 0',
                    borderBottom: i < activity.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                  }}
                >
                  <span
                    className={'dot ' + (ev.severity === 'high' ? 'warn' : ev.severity === 'critical' ? 'danger' : 'ok')}
                    style={{ marginTop: 5, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.action}</div>
                    <div className="t-meta" style={{ marginTop: 2, wordBreak: 'break-all' }}>{ev.target}</div>
                  </div>
                  <div className="t-meta" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {formatDateTime(ev.timestamp || ev.created_at)}
                  </div>
                </div>
              ))}
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
