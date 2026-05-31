import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import { supportService } from '../../services/supportService'
import type { Ticket, TicketCreatePayload } from '../../services/supportService'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'

const CATEGORY_OPTIONS = [
  'refunds_billing', 'booking_road', 'booking_air', 'payouts',
  'documents_kyc', 'app_issue', 'lost_found', 'onboarding', 'other',
]
const PRIORITY_OPTIONS = ['urgent', 'high', 'med', 'low']
const STATUS_OPTIONS   = ['open', 'in_progress', 'resolved', 'closed']

function formatCategory(c: string) {
  return c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatSlaTime(sla_due_at: string | null, sla_breached: boolean): React.ReactNode {
  if (!sla_due_at) return <span style={{ color: 'var(--ink-3)' }}>—</span>
  const due     = new Date(sla_due_at)
  const diffMs  = due.getTime() - Date.now()
  const diffMins = Math.round(diffMs / 60000)

  const style: React.CSSProperties = sla_breached
    ? { color: 'var(--danger,#e53e3e)', fontWeight: 700 }
    : diffMins < 60
    ? { color: 'var(--warn,#d69e2e)', fontWeight: 600 }
    : { color: 'var(--ink-2)' }

  let label = ''
  if (sla_breached || diffMins < 0) {
    const absMins = Math.abs(diffMins)
    label = absMins < 60 ? `Breached ${absMins}m ago` : `Breached ${Math.floor(absMins / 60)}h ago`
  } else if (diffMins < 60) {
    label = `${diffMins}m left`
  } else {
    const h = Math.floor(diffMins / 60), m = diffMins % 60
    label = m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return <span style={{ display: 'flex', alignItems: 'center', gap: 4, ...style }}>🕐 {label}</span>
}

function priorityBadge(p: string) {
  const cls = p === 'urgent' ? 'badge danger' : p === 'high' ? 'badge warn' : p === 'med' ? 'badge info' : 'badge'
  return <span className={cls}>{p.toUpperCase()}</span>
}

function statusBadge(s: string) {
  const cls = s === 'open' ? 'badge info' : s === 'in_progress' ? 'badge warn' : s === 'resolved' ? 'badge ok' : 'badge'
  return <span className={cls}>{s.replace('_', ' ')}</span>
}

function requesterIcon(type: string) {
  return type === 'customer' ? '👤' : type === 'driver' ? '🚗' : '🏢'
}

// ── New Ticket Modal ───────────────────────────────────────────────────────────
const BLANK: TicketCreatePayload = {
  requester_type: 'customer',
  requester_id: '',
  requester_name: '',
  category: 'refunds_billing',
  priority: 'med',
  subject: '',
  body: '',
  linked_booking_id: '',
  linked_transaction_id: '',
}

function NewTicketModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState<TicketCreatePayload>(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof TicketCreatePayload, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.requester_name.trim()) { setError('Requester name is required'); return }
    if (!form.subject.trim())        { setError('Subject is required'); return }
    if (!form.body.trim())           { setError('Description is required'); return }
    setSaving(true); setError('')
    try {
      const payload: TicketCreatePayload = {
        ...form,
        requester_id: form.requester_id.trim() || 'manual',
        linked_booking_id:     form.linked_booking_id?.trim()     || undefined,
        linked_transaction_id: form.linked_transaction_id?.trim() || undefined,
      }
      await supportService.createTicket(payload)
      onCreated()
      onClose()
    } catch {
      setError('Failed to create ticket. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 10,
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>New support ticket</span>
          <button className="btn sm ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Requester */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Requester type</label>
              <select className="input" value={form.requester_type} onChange={e => set('requester_type', e.target.value)}>
                <option value="customer">Customer</option>
                <option value="driver">Driver</option>
                <option value="operator">Operator</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Requester name *</label>
              <input className="input" placeholder="Full name" value={form.requester_name} onChange={e => set('requester_name', e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Requester ID <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span></label>
            <input className="input" placeholder="UUID from customers / drivers / operators" value={form.requester_id} onChange={e => set('requester_id', e.target.value)} />
          </div>

          {/* Category + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Category</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Priority</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Subject *</label>
            <input className="input" placeholder="Brief description of the issue" value={form.subject} onChange={e => set('subject', e.target.value)} />
          </div>

          <div className="field">
            <label className="field-label">Description *</label>
            <textarea
              className="input"
              rows={4}
              placeholder="Full details of the issue reported by the customer, driver or operator…"
              value={form.body}
              onChange={e => set('body', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Optional links */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Linked booking ID <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span></label>
              <input className="input" placeholder="BK-... or UUID" value={form.linked_booking_id ?? ''} onChange={e => set('linked_booking_id', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Transaction ID <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span></label>
              <input className="input" placeholder="TXN-..." value={form.linked_transaction_id ?? ''} onChange={e => set('linked_transaction_id', e.target.value)} />
            </div>
          </div>

          <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--surface-2)', fontSize: 12, color: 'var(--ink-3)' }}>
            ℹ️ Tickets created here are on behalf of the customer, driver or operator. The SLA timer starts immediately based on category and priority.
          </div>

          {error && (
            <div style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--danger-soft,#fff5f5)', border: '1px solid var(--danger,#e53e3e)', color: 'var(--danger,#e53e3e)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" className="btn sm ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn sm accent" disabled={saving}>
              {saving ? 'Creating…' : 'Create ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TicketQueuePage() {
  const navigate = useNavigate()
  const isMobile  = useIsMobile()
  const isTablet  = useIsTablet()

  const [tickets, setTickets]           = useState<Ticket[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const [loading, setLoading]           = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)

  const [search,          setSearch]          = useState('')
  const [filterCategory,  setFilterCategory]  = useState('')
  const [filterPriority,  setFilterPriority]  = useState('')
  const [filterStatus,    setFilterStatus]    = useState('')
  const [filterBreached,  setFilterBreached]  = useState(false)

  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await supportService.listTickets({
        page,
        page_size: pageSize,
        search:    search    || undefined,
        category:  filterCategory  || undefined,
        priority:  filterPriority  || undefined,
        status:    filterStatus    || undefined,
        sla_breach: filterBreached || undefined,
      })
      setTickets(res.items)
      setTotal(res.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [page, search, filterCategory, filterPriority, filterStatus, filterBreached])

  useEffect(() => { load() }, [load])

  const openCount     = tickets.filter(t => t.status === 'open').length
  const breachingCount = tickets.filter(t => t.sla_breached).length
  const dueIn1h       = tickets.filter(t => {
    if (!t.sla_due_at || t.sla_breached) return false
    const mins = (new Date(t.sla_due_at).getTime() - Date.now()) / 60000
    return mins >= 0 && mins < 60
  }).length
  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      {showNewModal && (
        <NewTicketModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => { load(); setShowNewModal(false) }}
        />
      )}

      <Shell
        activeId="support"
        breadcrumb="Operations · Support"
        title="Ticket queue"
        subtitle="All support requests — auto-routed by category and priority."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" onClick={() => navigate('/support/sla')}>
              SLA &amp; Escalation
            </button>
            <button className="btn sm accent" onClick={() => setShowNewModal(true)}>
              + New ticket
            </button>
          </div>
        }
      >
        <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap: 12 }}>
            {[
              { label: 'Open tickets',      value: String(openCount),     sub: 'total open' },
              { label: 'SLA breaching',     value: String(breachingCount),sub: 'breached now',    warn: breachingCount > 0 },
              { label: 'Due < 1h',          value: String(dueIn1h),       sub: 'about to breach', warn: dueIn1h > 0 },
              { label: 'Median 1st reply',  value: '—',                   sub: 'response time' },
              { label: 'CSAT',              value: '—',                   sub: 'satisfaction' },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: kpi.warn ? 'var(--danger,#e53e3e)' : 'var(--ink)' }}>{kpi.value}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <input
              className="input"
              placeholder="Search ticket, requester, booking…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ width: isMobile ? '100%' : 240 }}
            />
            <select className="input" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1) }} style={{ width: 160 }}>
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
            </select>
            <select className="input" value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1) }} style={{ width: 130 }}>
              <option value="">All priorities</option>
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
            <select className="input" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} style={{ width: 130 }}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <button
              className={filterBreached ? 'btn sm danger' : 'btn sm ghost'}
              onClick={() => { setFilterBreached(v => !v); setPage(1) }}
            >
              {filterBreached ? '✕ SLA Breached' : 'SLA Breached'}
            </button>
          </div>

          {/* Table / Mobile cards */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>Loading…</div>
              ) : tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>
                  No tickets found.{' '}
                  <button className="btn sm accent" style={{ marginTop: 8 }} onClick={() => setShowNewModal(true)}>
                    Create first ticket
                  </button>
                </div>
              ) : tickets.map(t => (
                <div key={t.id} onClick={() => navigate(`/support/${t.id}`)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: 14, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-2)' }}>{t.ticket_ref}</span>
                    <div style={{ display: 'flex', gap: 4 }}>{priorityBadge(t.priority)}{statusBadge(t.status)}</div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{requesterIcon(t.requester_type)} {t.requester_name}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{formatSlaTime(t.sla_due_at, t.sla_breached)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Ticket</th>
                    <th>Requester</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    {!isTablet && <th>Assignee</th>}
                    <th>SLA</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>Loading…</td></tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 40 }}>
                        <div style={{ color: 'var(--ink-3)', marginBottom: 12 }}>No tickets found.</div>
                        <button className="btn sm accent" onClick={() => setShowNewModal(true)}>+ Create first ticket</button>
                      </td>
                    </tr>
                  ) : tickets.map(t => (
                    <tr key={t.id} onClick={() => navigate(`/support/${t.id}`)} style={{ cursor: 'pointer' }}>
                      <td onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                      <td>
                        <span className="t-mono" style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.ticket_ref}</span>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{t.subject}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 16 }}>{requesterIcon(t.requester_type)}</span>
                          <div>
                            <div style={{ fontSize: 13 }}>{t.requester_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'capitalize' }}>{t.requester_type}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge">{formatCategory(t.category)}</span></td>
                      <td>{priorityBadge(t.priority)}</td>
                      <td>{statusBadge(t.status)}</td>
                      {!isTablet && (
                        <td>
                          {t.assignee_name
                            ? <span style={{ fontSize: 13 }}>{t.assignee_name}</span>
                            : <button className="btn sm ghost" onClick={e => e.stopPropagation()}>Assign</button>}
                        </td>
                      )}
                      <td>{formatSlaTime(t.sla_due_at, t.sla_breached)}</td>
                      <td><span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{new Date(t.created_at).toLocaleDateString()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
              <button className="btn sm ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ padding: '4px 12px', fontSize: 13, color: 'var(--ink-2)' }}>
                Page {page} of {totalPages} · {total} tickets
              </span>
              <button className="btn sm ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      </Shell>
    </>
  )
}
