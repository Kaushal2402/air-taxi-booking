import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { rbacService } from '../../services/rbacService'
import type { Role, RolePermissionItem, PermissionDomainGroup } from '../../services/rbacService'

type PermState = 'none' | 'scoped' | 'granted'

interface LocalPerm extends RolePermissionItem {
  dirty: boolean
}

function TriState({
  state,
  onChange,
}: {
  state: PermState
  onChange: (s: PermState) => void
}) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--rule-strong)', borderRadius: 3, overflow: 'hidden' }}>
      {(['none', 'scoped', 'granted'] as PermState[]).map((s, i) => {
        const on = state === s
        const label = s === 'none' ? 'Off' : s === 'scoped' ? 'Scoped' : 'Granted'
        return (
          <span
            key={s}
            onClick={() => onChange(s)}
            style={{
              height: 26, padding: '0 10px', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.10em', textTransform: 'uppercase',
              borderRight: i < 2 ? '1px solid var(--rule)' : 'none',
              color: on ? (s === 'granted' ? '#fff' : 'var(--ink)') : 'var(--ink-3)',
              background: on
                ? (s === 'granted' ? 'var(--accent)' : 'var(--surface-sunk)')
                : 'var(--surface)',
              fontWeight: on ? 500 : 400,
            }}
          >
            <span style={{
              width: 7, height: 7,
              background: s === 'granted' ? (on ? '#fff' : 'var(--accent)') :
                          s === 'scoped'  ? 'var(--warn)' : 'var(--ink-4)',
              borderRadius: s === 'scoped' ? 0 : '50%',
              transform: s === 'scoped' ? 'rotate(45deg)' : 'none',
              flexShrink: 0,
            }} />
            {label}
          </span>
        )
      })}
    </div>
  )
}

export default function RoleEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [role, setRole] = useState<Role | null>(null)
  const [domains, setDomains] = useState<PermissionDomainGroup[]>([])
  const [perms, setPerms] = useState<LocalPerm[]>([])
  const [activeDomain, setActiveDomain] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftDesc, setDraftDesc] = useState('')

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [roleData, catalogData, permData] = await Promise.all([
        rbacService.getRole(id),
        rbacService.getPermissionCatalog(),
        rbacService.getRolePermissions(id),
      ])
      setRole(roleData)
      setDraftName(roleData.name)
      setDraftDesc(roleData.description)
      setDomains(catalogData.domains)
      if (catalogData.domains.length > 0) setActiveDomain(catalogData.domains[0].domain)

      const localPerms: LocalPerm[] = permData.permissions.map(p => ({
        ...p,
        state: (p.state as PermState) || 'none',
        dirty: false,
      }))
      setPerms(localPerms)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const updatePerm = (key: string, state: PermState) => {
    setPerms(prev => prev.map(p =>
      p.permission_key === key ? { ...p, state, dirty: true } : p
    ))
  }

  const grantAll = (domain: string) => {
    setPerms(prev => prev.map(p =>
      p.domain === domain ? { ...p, state: 'granted', dirty: true } : p
    ))
  }

  const clearAll = (domain: string) => {
    setPerms(prev => prev.map(p =>
      p.domain === domain ? { ...p, state: 'none', dirty: true } : p
    ))
  }

  const saveChanges = async () => {
    if (!id || !role) return
    setSaving(true); setApiError('')
    try {
      const permissions = perms.map(p => ({
        permission_key: p.permission_key,
        state: p.state,
        scope_data: p.scope_data,
      }))
      await rbacService.setRolePermissions(id, { permissions })
      if (draftName !== role.name || draftDesc !== role.description) {
        await rbacService.updateRole(id, { name: draftName, description: draftDesc })
      }
      await load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setApiError(err?.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  const deleteRole = async () => {
    if (!id) return
    try {
      await rbacService.deleteRole(id)
      navigate('/rbac')
    } catch { /* ignore */ }
  }

  const activeDomainPerms = perms.filter(p => p.domain === activeDomain)
  const grantedCount = activeDomainPerms.filter(p => p.state !== 'none').length

  const domainStats = domains.map(d => ({
    ...d,
    granted: perms.filter(p => p.domain === d.domain && p.state !== 'none').length,
  }))

  const totalGranted = perms.filter(p => p.state !== 'none').length
  const totalPerms = perms.length

  const accessSummary = domains.slice(0, 10).map(d => {
    const total = d.items.length
    const granted = perms.filter(p => p.domain === d.domain && p.state !== 'none').length
    const tone = granted === total ? 'ok' : granted > 0 ? 'warn' : 'pending'
    return { d: d.domain.split('·')[0].trim(), v: `${granted} / ${total}`, tone }
  })

  if (loading) {
    return (
      <Shell activeId="rbac" breadcrumb="System · Identity & Access · Roles" title="Loading…" subtitle="">
        <div style={{ padding: 32, color: 'var(--ink-3)' }}>Loading role…</div>
      </Shell>
    )
  }

  if (!role) {
    return (
      <Shell activeId="rbac" breadcrumb="System · Identity & Access" title="Not found" subtitle="">
        <div style={{ padding: 32, color: 'var(--ink-3)' }}>Role not found.</div>
      </Shell>
    )
  }

  return (
    <Shell
      activeId="rbac"
      breadcrumb="System · Identity & Access · Roles"
      title={role.name}
      subtitle={`${role.is_system ? 'System' : 'Custom'} role · v${role.version} · ${role.member_count} admins assigned`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          {!role.is_system && (
            <button className="btn sm" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDelete(true)}>Delete</button>
          )}
          <button className="btn sm" onClick={() => navigate('/rbac')}>← Roles</button>
          <button className="btn accent sm" onClick={saveChanges} disabled={saving}>
            {saving ? 'Saving…' : `Publish · v${role.version + 1}`}
          </button>
        </div>
      }
    >
      {/* Role header */}
      <div style={{
        padding: isMobile ? '14px 16px' : '20px 32px',
        background: 'var(--surface)', borderBottom: '1px solid var(--rule)',
        display: 'flex', gap: isMobile ? 16 : 28, alignItems: 'flex-start', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="t-label">Role name</div>
          <div className="input" style={{ marginTop: 6, maxWidth: 400 }}>
            <input
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              readOnly={role.is_system}
              style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}
            />
          </div>
          <div className="t-label" style={{ marginTop: 12 }}>Description</div>
          <div className="input" style={{ marginTop: 6, maxWidth: 560 }}>
            <input
              value={draftDesc}
              onChange={e => setDraftDesc(e.target.value)}
              readOnly={role.is_system}
              placeholder="Role description…"
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            ['Permissions granted', String(totalGranted), `/ ${totalPerms}`],
            ['Scope', role.scope, ''],
            ['Version', `v${role.version}`, role.is_system ? 'System role' : 'Custom'],
          ].map(([k, v, m]) => (
            <div key={k}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 6, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>{v}</div>
              <div className="t-meta" style={{ marginTop: 4 }}>{m}</div>
            </div>
          ))}
        </div>
      </div>

      {apiError && (
        <div style={{ margin: '12px 32px 0', padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
          {apiError}
        </div>
      )}

      {/* Matrix layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? '200px 1fr' : '244px 1fr 300px',
        minHeight: 400,
      }}>
        {/* Domain rail */}
        {!isMobile && (
          <aside style={{ background: 'var(--surface)', borderRight: '1px solid var(--rule)', padding: '18px 0' }}>
            <div className="t-label" style={{ padding: '0 18px 8px' }}>Domains</div>
            {domainStats.map(g => (
              <div
                key={g.domain}
                onClick={() => setActiveDomain(g.domain)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 18px', cursor: 'pointer',
                  borderLeft: '2px solid ' + (g.domain === activeDomain ? 'var(--accent)' : 'transparent'),
                  background: g.domain === activeDomain ? 'var(--surface-2)' : 'transparent',
                  color: g.domain === activeDomain ? 'var(--ink)' : 'var(--ink-2)',
                  fontWeight: g.domain === activeDomain ? 500 : 400,
                }}
              >
                <span style={{ flex: 1, fontSize: 13 }}>{g.domain}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10.5,
                  color: g.granted > 0 ? 'var(--accent)' : 'var(--ink-4)',
                }}>{g.granted}/{g.items.length}</span>
              </div>
            ))}
          </aside>
        )}

        {/* Permission matrix */}
        <div style={{ padding: isMobile ? '14px 16px' : '20px 28px' }}>
          {isMobile && (
            <div style={{ marginBottom: 12 }}>
              <select
                value={activeDomain}
                onChange={e => setActiveDomain(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--rule-strong)', borderRadius: 3, background: 'var(--surface)', fontSize: 13 }}
              >
                {domains.map(d => <option key={d.domain} value={d.domain}>{d.domain}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="t-label">Permissions in domain</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>
                {activeDomain} <span style={{ color: 'var(--ink-3)' }}>· {grantedCount} of {activeDomainPerms.length} granted</span>
              </h3>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sm ghost" onClick={() => grantAll(activeDomain)}>
                <Icon name="check" size={12} stroke={2.2} />Grant all
              </button>
              <button className="btn sm ghost" onClick={() => clearAll(activeDomain)}>
                <Icon name="close" size={12} />Clear all
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            {activeDomainPerms.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                No permissions in this domain.
              </div>
            ) : activeDomainPerms.map((p, i) => (
              <div
                key={p.permission_key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1.5fr 280px',
                  padding: '14px 16px',
                  borderBottom: i < activeDomainPerms.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                  gap: 12, alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>{p.permission_key}</div>
                  <div className="t-meta" style={{ marginTop: 4, color: 'var(--ink-3)' }}>{p.description}</div>
                </div>
                <TriState state={p.state as PermState} onChange={s => updatePerm(p.permission_key, s)} />
              </div>
            ))}
          </div>
        </div>

        {/* Right rail - access summary */}
        {!isMobile && !isTablet && (
          <aside style={{ background: 'var(--surface)', borderLeft: '1px solid var(--rule)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <div className="t-label" style={{ marginBottom: 10 }}>Effective access</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {accessSummary.map(s => (
                  <div key={s.d} style={{
                    padding: '8px 10px', border: '1px solid var(--rule)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: s.tone === 'ok' ? 'var(--accent-soft-2)' : 'var(--surface-2)',
                  }}>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{s.d}</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: s.tone === 'ok' ? 'var(--accent)' : s.tone === 'warn' ? 'var(--warn)' : 'var(--ink-3)',
                    }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="t-label" style={{ marginBottom: 10 }}>Role info</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Scope', role.scope],
                  ['Members', String(role.member_count)],
                  ['Version', `v${role.version}`],
                  ['Kind', role.is_system ? 'System' : 'Custom'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--ink-3)' }}>{k}</span>
                    <span style={{ color: 'var(--ink-2)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete role"
          description={`"${role.name}" and all its permission assignments will be permanently removed.`}
          confirmLabel="Delete role"
          variant="danger"
          onConfirm={deleteRole}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </Shell>
  )
}
