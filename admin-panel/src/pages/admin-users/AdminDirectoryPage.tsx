import { useState, useEffect } from 'react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import api from '../../lib/axios'
import { useIsMobile, useIsCompact } from '../../hooks/useIsMobile'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  two_factor_enabled: boolean
  last_sign_in_at: string | null
  created_at: string
}

interface InviteForm {
  name: string
  email: string
  role: string
}

const ROLES = ['super_admin', 'admin', 'dispatcher', 'finance', 'support', 'compliance']

function statusBadge(s: string) {
  if (s === 'active')    return <span className="badge ok"><span className="dot ok" />Active</span>
  if (s === 'invited')   return <span className="badge info"><span className="dot info" />Invited</span>
  if (s === 'suspended') return <span className="badge warn"><span className="dot warn" />Suspended</span>
  return <span className="badge pending">{s}</span>
}

export default function AdminDirectoryPage() {
  const isMobile = useIsMobile()
  const isCompact = useIsCompact()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteForm>({ name: '', email: '', role: 'admin' })
  const [inviteError, setInviteError] = useState('')
  const [inviting, setInviting] = useState(false)
  const [loading, setLoading] = useState(true)

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

  const active = users.filter(u => u.status === 'active').length
  const invited = users.filter(u => u.status === 'invited').length
  const suspended = users.filter(u => u.status === 'suspended').length
  const twofa = users.filter(u => u.two_factor_enabled).length

  const handleInvite = async () => {
    setInviteError('')
    if (!inviteForm.name || !inviteForm.email) { setInviteError('Name and email are required'); return }
    setInviting(true)
    try {
      await api.post('/admin-users/invite', inviteForm)
      setShowInvite(false)
      setInviteForm({ name: '', email: '', role: 'admin' })
      load()
    } catch (e: any) {
      setInviteError(e?.response?.data?.message || 'Failed to invite admin')
    } finally {
      setInviting(false)
    }
  }

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
          {isMobile ? null : (
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
      <div style={{ padding: isMobile ? '16px' : '20px 32px 28px' }}>
        {/* Summary strip */}
        <div className="stat-grid-4" style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          marginBottom: 20,
        }}>
          {[
            { k: 'Total admins',    v: String(total),          m: 'All roles',              tone: 'ink' },
            { k: 'Active',          v: String(active),         m: 'Currently active',       tone: 'ok' },
            { k: 'Awaiting invite', v: String(invited),        m: 'Pending activation',     tone: 'info' },
            { k: '2FA enrolled',    v: `${twofa} / ${total}`,  m: users.length ? `${Math.round(twofa / (users.length || 1) * 100)}% coverage` : '—', tone: twofa < total ? 'warn' : 'ok' },
          ].map((s, i) => (
            <div key={s.k} style={{
              padding: isMobile ? '14px 16px' : '20px 22px',
              borderRight: isMobile
                ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                : (i < 3 ? '1px solid var(--rule)' : 'none'),
              borderBottom: isMobile
                ? (i < 2 ? '1px solid var(--rule)' : 'none')
                : 'none',
            }}>
              <div className="t-label" style={{ padding: 0 }}>{s.k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 24 : 30, fontWeight: 400, letterSpacing: '-0.018em', color: 'var(--ink)', lineHeight: 1 }}>
                {s.v}
              </div>
              <div className="t-meta" style={{
                marginTop: 8,
                color: s.tone === 'ok' ? 'var(--accent)' : s.tone === 'warn' ? 'var(--warn)' : s.tone === 'info' ? 'var(--info)' : 'var(--ink-3)',
              }}>{s.m}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderBottom: 0,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div className="input" style={{ flex: 1, maxWidth: 300, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input
              placeholder="Name, email, role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm" onClick={load}><Icon name="refresh" size={13} />{!isMobile && 'Refresh'}</button>
        </div>

        {/* Table — horizontal scroll on mobile */}
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
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={isMobile ? 6 : 7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 32 }}>Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={isMobile ? 6 : 7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 32 }}>No administrators found</td></tr>
              )}
              {filtered.map(a => {
                const initials = a.name.split(' ').map(p => p[0]).slice(0, 2).join('')
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar">{initials}</div>
                        <div>
                          <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{a.name}</div>
                          <div className="t-meta" style={{ marginTop: 2 }}>{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{a.role.replace(/_/g, ' ')}</td>
                    <td>{statusBadge(a.status)}</td>
                    <td>
                      {a.two_factor_enabled
                        ? <span className="badge ok"><span className="dot ok" />TOTP</span>
                        : <span className="badge warn"><span className="dot warn" />None</span>}
                    </td>
                    <td className="num" style={{ color: 'var(--ink-2)' }}>
                      {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleDateString() : '—'}
                    </td>
                    {!isMobile && (
                      <td className="num" style={{ color: 'var(--ink-3)' }}>
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    )}
                    <td>
                      <button className="btn ghost icon sm"><Icon name="moreVert" size={14} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid var(--rule)',
          background: 'var(--surface-2)',
          border: '1px solid var(--rule)',
          borderTop: 'none',
        }}>
          <div className="t-meta">
            Showing <span style={{ color: 'var(--ink-2)' }}>1–{filtered.length}</span> of <span style={{ color: 'var(--ink-2)' }}>{total}</span>
          </div>
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(26,24,20,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
          padding: 16,
        }} onClick={() => setShowInvite(false)}>
          <div className="card modal-card" style={{
            width: isMobile ? '100%' : 480,
            maxWidth: 480,
            padding: isMobile ? '28px 20px' : '36px 40px',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-pop)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 20 : 24, fontWeight: 400, letterSpacing: '-0.018em' }}>
              Invite administrator
            </h2>
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)' }}>
              They'll receive an invitation email to set up their account.
            </p>

            {inviteError && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 32%, var(--rule-strong))', borderRadius: 3, fontSize: 13, color: 'var(--danger)' }}>
                {inviteError}
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label className="field-label">Full name</label>
                <div className="input">
                  <input value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Work email</label>
                <div className="input">
                  <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@acmemobility.io" />
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
                    {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                  <Icon name="chevDown" size={14} className="icon" />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setShowInvite(false)}>Cancel</button>
              <button className="btn accent" style={{ flex: 2 }} disabled={inviting} onClick={handleInvite}>
                {inviting ? 'Sending invite…' : 'Send invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
