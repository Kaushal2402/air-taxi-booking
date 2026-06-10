import { useState, useEffect } from 'react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import { operatorRolesService } from '../../services/operatorRolesService'
import type { OperatorRole } from '../../services/operatorRolesService'

const ALL_PERMISSIONS = [
  { key: 'operator.profile.view', label: 'Profile — View' },
  { key: 'operator.profile.edit', label: 'Profile — Edit' },
  { key: 'operator.onboarding.submit', label: 'Onboarding — Submit' },
  { key: 'operator.payout_details.edit', label: 'Payout Details — Edit' },
  { key: 'operator.dashboard.view', label: 'Dashboard — View' },
  { key: 'operator.dashboard.revenue', label: 'Dashboard — Revenue KPIs' },
  { key: 'operator.team.view', label: 'Team — View' },
  { key: 'operator.team.invite', label: 'Team — Invite' },
  { key: 'operator.team.suspend', label: 'Team — Suspend' },
  { key: 'operator.roles.manage', label: 'Roles — Manage' },
  { key: 'operator.roles.assign', label: 'Roles — Assign' },
  { key: 'operator.aircraft.view', label: 'Aircraft — View' },
  { key: 'operator.aircraft.manage', label: 'Aircraft — Manage' },
  { key: 'operator.aircraft.maintenance', label: 'Aircraft — Maintenance' },
  { key: 'operator.aircraft.documents', label: 'Aircraft — Documents' },
  { key: 'operator.crew.view', label: 'Crew — View' },
  { key: 'operator.crew.manage', label: 'Crew — Manage' },
  { key: 'operator.crew.documents', label: 'Crew — Documents' },
  { key: 'operator.crew.roster', label: 'Crew — Roster' },
  { key: 'operator.routes.view', label: 'Routes — View' },
  { key: 'operator.routes.manage', label: 'Routes — Manage' },
  { key: 'operator.schedule.manage', label: 'Schedule — Manage' },
  { key: 'operator.schedule.publish', label: 'Schedule — Publish' },
  { key: 'operator.pricing.view', label: 'Pricing — View' },
  { key: 'operator.pricing.manage', label: 'Pricing — Manage' },
  { key: 'operator.quotes.create', label: 'Quotes — Create' },
  { key: 'operator.quotes.send', label: 'Quotes — Send' },
  { key: 'operator.requests.view', label: 'Requests — View' },
  { key: 'operator.requests.accept', label: 'Requests — Accept' },
  { key: 'operator.requests.reject', label: 'Requests — Reject' },
  { key: 'operator.requests.quote', label: 'Requests — Quote' },
  { key: 'operator.assignment.view', label: 'Assignment — View' },
  { key: 'operator.assignment.assign', label: 'Assignment — Assign' },
  { key: 'operator.assignment.reassign', label: 'Assignment — Reassign' },
  { key: 'operator.manifest.view', label: 'Manifest — View' },
  { key: 'operator.manifest.edit', label: 'Manifest — Edit' },
  { key: 'operator.manifest.lock', label: 'Manifest — Lock' },
  { key: 'operator.manifest.post_lock_edit', label: 'Manifest — Post-lock Edit' },
  { key: 'operator.flightops.view', label: 'Flight Ops — View' },
  { key: 'operator.flightops.update', label: 'Flight Ops — Update' },
  { key: 'operator.flightops.close', label: 'Flight Ops — Close' },
  { key: 'operator.cancel.view', label: 'Cancellation — View' },
  { key: 'operator.cancel.execute', label: 'Cancellation — Execute' },
  { key: 'operator.reschedule.execute', label: 'Reschedule — Execute' },
  { key: 'operator.forcemajeure.apply', label: 'Force Majeure — Apply' },
  { key: 'operator.settlements.view', label: 'Settlements — View' },
  { key: 'operator.settlements.export', label: 'Settlements — Export' },
  { key: 'operator.settlements.query', label: 'Settlements — Query' },
  { key: 'operator.reports.operational', label: 'Reports — Operational' },
  { key: 'operator.reports.financial', label: 'Reports — Financial' },
  { key: 'operator.reports.export', label: 'Reports — Export' },
  { key: 'operator.reports.schedule', label: 'Reports — Schedule' },
  { key: 'operator.documents.view', label: 'Documents — View' },
  { key: 'operator.documents.upload', label: 'Documents — Upload' },
  { key: 'operator.notifications.view', label: 'Notifications — View' },
  { key: 'operator.notifications.preferences', label: 'Notifications — Preferences' },
  { key: 'operator.communication.view', label: 'Communication — View' },
  { key: 'operator.settings.view', label: 'Settings — View' },
  { key: 'operator.settings.edit', label: 'Settings — Edit' },
  { key: 'operator.companion.assignments', label: 'Companion — Assignments' },
  { key: 'operator.companion.status_update', label: 'Companion — Status Update' },
]

export default function RolesPage() {
  const isMobile = useIsMobile()

  const [roles, setRoles] = useState<OperatorRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedRole, setSelectedRole] = useState<OperatorRole | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Create form
  const [newName, setNewName] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newPermissions, setNewPermissions] = useState<Set<string>>(new Set())
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await operatorRolesService.listRoles()
      setRoles(data)
    } catch {
      setError('Failed to load roles.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newDisplayName) return
    setCreating(true)
    setCreateError(null)
    try {
      await operatorRolesService.createRole({
        name: newName,
        display_name: newDisplayName,
        permissions: Array.from(newPermissions),
      })
      setShowCreateForm(false)
      setNewName('')
      setNewDisplayName('')
      setNewPermissions(new Set())
      await load()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setCreateError(detail ?? 'Failed to create role.')
    } finally {
      setCreating(false)
    }
  }

  const togglePerm = (perm: string, perms: Set<string>, setPerms: (s: Set<string>) => void) => {
    const next = new Set(perms)
    if (next.has(perm)) next.delete(perm)
    else next.add(perm)
    setPerms(next)
  }

  const PermMatrix = ({
    selected,
    onToggle,
    readOnly,
  }: {
    selected: Set<string>
    onToggle: (p: string) => void
    readOnly: boolean
  }) => (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
      {ALL_PERMISSIONS.map(p => (
        <label
          key={p.key}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 8px', borderRadius: 4,
            background: selected.has(p.key) ? 'var(--accent-soft)' : 'transparent',
            cursor: readOnly ? 'default' : 'pointer',
            fontSize: 12,
          }}
        >
          <input
            type="checkbox"
            checked={selected.has(p.key)}
            onChange={() => !readOnly && onToggle(p.key)}
            disabled={readOnly}
            style={{ accentColor: 'var(--accent)' }}
          />
          <span style={{ color: selected.has(p.key) ? 'var(--accent)' : 'var(--ink-2)' }}>
            {p.label}
          </span>
        </label>
      ))}
    </div>
  )

  return (
    <Shell
      activeId="team"
      breadcrumb="Team / Roles"
      title="Roles & Permissions"
      subtitle="Manage intra-org roles for your team"
      actions={
        <button className="btn accent sm" onClick={() => setShowCreateForm(true)}>
          + Create role
        </button>
      }
    >
      <div style={{ padding: isMobile ? '20px 16px' : '32px 32px' }}>

        {error && (
          <div style={{
            background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
            borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16,
          }}>{error}</div>
        )}

        {/* Create form */}
        {showCreateForm && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,13,10,0.5)', zIndex: 199 }}
              onClick={() => setShowCreateForm(false)}
            />
            <div style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              background: 'var(--surface)', border: '1px solid var(--rule)',
              borderRadius: 8, boxShadow: 'var(--shadow-pop)',
              padding: '28px', zIndex: 200,
              width: isMobile ? '95vw' : 620, maxWidth: '95vw',
              maxHeight: '85vh', overflowY: 'auto',
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Create custom role</div>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {createError && (
                  <div style={{
                    background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
                    borderRadius: 4, padding: '8px 12px', fontSize: 13, color: 'var(--danger)',
                  }}>{createError}</div>
                )}
                <div className="field">
                  <label className="field-label">Role name (slug) *</label>
                  <input
                    required
                    className="input"
                    value={newName}
                    onChange={e => setNewName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="custom_role_name"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Display name *</label>
                  <input
                    required
                    className="input"
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value)}
                    placeholder="Custom Role Name"
                  />
                </div>
                <div className="field">
                  <label className="field-label" style={{ marginBottom: 10 }}>Permissions</label>
                  <PermMatrix
                    selected={newPermissions}
                    onToggle={p => togglePerm(p, newPermissions, setNewPermissions)}
                    readOnly={false}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" className="btn sm ghost" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn accent sm" disabled={creating}>
                    {creating ? 'Creating…' : 'Create role'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading roles…</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            {roles.map(role => (
              <div
                key={role.id}
                style={{
                  background: 'var(--surface)', border: `1px solid ${selectedRole?.id === role.id ? 'var(--accent)' : 'var(--rule)'}`,
                  borderRadius: 8, padding: '18px 20px', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onClick={() => setSelectedRole(selectedRole?.id === role.id ? null : role)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{role.display_name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {role.is_system && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
                        textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3,
                        background: 'var(--surface-sunk)', color: 'var(--ink-3)',
                        border: '1px solid var(--rule)',
                      }}>
                        system
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {role.user_count} user{role.user_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', marginBottom: 10 }}>
                  {role.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {role.permissions.length} permissions
                </div>

                {/* Expanded permission list */}
                {selectedRole?.id === role.id && (
                  <div
                    style={{ marginTop: 16, borderTop: '1px solid var(--rule)', paddingTop: 16 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="t-label" style={{ marginBottom: 10 }}>Permissions</div>
                    <PermMatrix
                      selected={new Set(role.permissions)}
                      onToggle={() => {}}
                      readOnly={true}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}
