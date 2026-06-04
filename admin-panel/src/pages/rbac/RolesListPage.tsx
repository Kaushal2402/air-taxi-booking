import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { rbacService } from '../../services/rbacService'
import type { Role, RbacStats, RoleCreate } from '../../services/rbacService'

const EMPTY_ROLE: RoleCreate = {
  name: '',
  description: '',
  is_system: false,
  scope: 'Global',
}

function roleToneClass(name: string): string {
  if (/super/i.test(name)) return 'ok'
  if (/finance/i.test(name)) return 'info'
  if (/dispatch/i.test(name)) return 'warn'
  if (/support/i.test(name)) return 'ok'
  return 'pending'
}

export default function RolesListPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [roles, setRoles] = useState<Role[]>([])
  const [filtered, setFiltered] = useState<Role[]>([])
  const [stats, setStats] = useState<RbacStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | 'system' | 'custom'>('all')
  const [showNewForm, setShowNewForm] = useState(false)
  const [showMobileEditor, setShowMobileEditor] = useState(false)
  const [draft, setDraft] = useState<RoleCreate>({ ...EMPTY_ROLE })
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Role | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [rolesData, statsData] = await Promise.all([
        rbacService.listRoles(),
        rbacService.getStats(),
      ])
      setRoles(rolesData.items)
      setStats(statsData)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      roles.filter(r => {
        const matchKind =
          kindFilter === 'all' ||
          (kindFilter === 'system' && r.is_system) ||
          (kindFilter === 'custom' && !r.is_system)
        const matchSearch = !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
        return matchKind && matchSearch
      })
    )
  }, [roles, search, kindFilter])

  const startNew = () => {
    setDraft({ ...EMPTY_ROLE })
    setApiError('')
    setShowNewForm(true)
    if (isMobile) setShowMobileEditor(true)
  }

  const saveNew = async () => {
    if (!draft.name.trim()) { setApiError('Name is required'); return }
    setSaving(true); setApiError('')
    try {
      await rbacService.createRole(draft)
      await load()
      setShowNewForm(false)
      setShowMobileEditor(false)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setApiError(err?.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  const deleteRole = async (role: Role) => {
    try {
      await rbacService.deleteRole(role.id)
      await load()
    } catch { /* ignore */ }
    setConfirmDelete(null)
  }

  const totalPerms = stats?.total_permissions ?? 143
  const showEditor = showNewForm

  const KPIS = [
    { k: 'Total roles',         v: String(stats?.total_roles ?? '—'),    m: `${stats?.system_roles ?? 0} system · ${stats?.custom_roles ?? 0} custom` },
    { k: 'Admins assigned',     v: String(stats?.admins_assigned ?? '—'),m: 'Spread across active roles', tone: 'ok' as const },
    { k: 'Permissions in use',  v: String(totalPerms),                   m: 'Canonical registry', tone: 'info' as const },
    { k: 'Pending review',      v: String(stats?.pending_review ?? 0),   m: '', tone: 'warn' as const },
  ]

  return (
    <Shell
      activeId="rbac"
      breadcrumb="System · Identity & Access"
      title="Roles & Access"
      subtitle={stats ? `${stats.total_roles} roles · ${stats.system_roles} system · ${stats.custom_roles} custom · ${stats.total_permissions} permissions` : 'Loading…'}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/rbac/permissions')}>
            <Icon name="archive" size={13} />Permission catalog
          </button>
          <button className="btn sm accent" onClick={startNew}>
            <Icon name="plus" size={13} />New role
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 18 }}>

        {/* KPI strip */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        }}>
          {KPIS.map((s, i) => (
            <div key={s.k} style={{
              padding: isMobile ? '12px 14px' : '20px 22px',
              borderRight: isMobile ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none') : (i < 3 ? '1px solid var(--rule)' : 'none'),
              borderBottom: isMobile && i < 2 ? '1px solid var(--rule)' : 'none',
            }}>
              <div className="t-label" style={{ padding: 0 }}>{s.k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 22 : 30, fontWeight: 400, letterSpacing: '-0.018em' }}>{s.v}</div>
              <div className="t-meta" style={{
                marginTop: 8,
                color: s.tone === 'ok' ? 'var(--accent)' : s.tone === 'warn' ? 'var(--warn)' : s.tone === 'info' ? 'var(--info)' : 'var(--ink-3)',
              }}>{s.m}</div>
            </div>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: (!isTablet && showEditor) ? '1fr 340px' : '1fr',
          gap: 18, alignItems: 'start',
        }}>
          {/* Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            {/* Filter bar */}
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <div className="input" style={{ width: isMobile ? '100%' : 260, height: 32 }}>
                <Icon name="search" size={14} className="icon" />
                <input
                  placeholder="Name, scope…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {(['all', 'system', 'custom'] as const).map(f => (
                <button
                  key={f}
                  className={`btn sm ${kindFilter === f ? 'accent' : 'ghost'}`}
                  onClick={() => setKindFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'system' ? 'System' : 'Custom'}
                </button>
              ))}
            </div>

            {loading && <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>}

            {!loading && (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="tbl" style={{ minWidth: isMobile ? 600 : undefined }}>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Members</th>
                      <th>Kind</th>
                      <th>Scope</th>
                      <th>Permissions</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                          {search || kindFilter !== 'all' ? 'No roles match your filter.' : 'No roles yet.'}
                        </td>
                      </tr>
                    ) : filtered.map(r => (
                      <tr
                        key={r.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/rbac/roles/${r.id}`)}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{
                              width: 28, height: 28, borderRadius: 3,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'var(--surface-sunk)', border: '1px solid var(--rule)', color: 'var(--ink-2)',
                            }}>
                              <Icon name={r.is_system ? 'shield' : 'key'} size={13} />
                            </span>
                            <div>
                              <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{r.name}</div>
                              <div className="t-meta" style={{ marginTop: 2 }}>{r.description}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)', minWidth: 22, textAlign: 'right' }}>{r.member_count}</span>
                            <span className="t-meta">admins</span>
                          </div>
                        </td>
                        <td>
                          {r.is_system
                            ? <span className="badge"><Icon name="shield" size={10} stroke={2} /> System</span>
                            : <span className={`badge ${roleToneClass(r.name)}`}><span className={`dot ${roleToneClass(r.name)}`} /> Custom</span>}
                        </td>
                        <td className="num" style={{ color: 'var(--ink-2)' }}>{r.scope}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 60, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{
                                width: totalPerms > 0 ? (r.permission_count / totalPerms) * 100 + '%' : '0%',
                                height: '100%',
                                background: r.permission_count === totalPerms ? 'var(--accent)' : 'var(--ink-3)',
                              }} />
                            </div>
                            <span className="num" style={{ color: 'var(--ink-2)' }}>{r.permission_count} / {totalPerms}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn ghost icon sm"
                            onClick={e => { e.stopPropagation(); if (!r.is_system) setConfirmDelete(r) }}
                            title={r.is_system ? 'System roles cannot be deleted' : 'Delete role'}
                            style={{ opacity: r.is_system ? 0.3 : 1 }}
                          >
                            <Icon name="trash" size={13} style={{ color: 'var(--danger)' }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)' }}>
              <div className="t-meta">Showing <span style={{ color: 'var(--ink-2)' }}>1–{filtered.length}</span> of <span style={{ color: 'var(--ink-2)' }}>{roles.length}</span></div>
              <div className="t-meta">All role changes are versioned and audit-logged</div>
            </div>
          </div>

          {/* New role form */}
          {showEditor && (!isMobile || showMobileEditor) && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              {isMobile && (
                <button
                  onClick={() => { setShowMobileEditor(false); setShowNewForm(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                    width: '100%', fontSize: 13, color: 'var(--accent)',
                    background: 'var(--surface-2)', border: 'none', borderBottom: '1px solid var(--rule)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}
                >
                  <Icon name="chevLeft" size={14} stroke={2} />
                  Back to roles
                </button>
              )}
              <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--rule)' }}>
                <div className="t-label">New role</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>
                  {draft.name || 'Untitled role'}
                </h3>
              </div>
              {apiError && (
                <div style={{ margin: '12px 16px 0', padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
                  {apiError}
                </div>
              )}
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div className="input"><input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Finance Manager" /></div>
                </div>
                <div className="field">
                  <label className="field-label">Description</label>
                  <div className="input"><input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Manages payments and refunds…" /></div>
                </div>
                <div className="field">
                  <label className="field-label">Scope</label>
                  <div className="input"><input value={draft.scope} onChange={e => setDraft(d => ({ ...d, scope: e.target.value }))} placeholder="Global" /></div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button className="btn sm" onClick={() => { setShowNewForm(false); setShowMobileEditor(false) }}>Cancel</button>
                  <button className="btn accent sm" onClick={saveNew} disabled={saving}>
                    {saving ? 'Creating…' : 'Create role'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete role"
          description={`"${confirmDelete.name}" and all its permission assignments will be permanently removed.`}
          confirmLabel="Delete role"
          variant="danger"
          onConfirm={() => deleteRole(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </Shell>
  )
}
