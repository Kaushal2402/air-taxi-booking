import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { privacyService } from '../../services/privacyService'
import type { PrivacyRequest } from '../../services/privacyService'
import { useFormatDateTime } from '../../lib/utils'

// ── SLA countdown helper ──────────────────────────────────────────────────────

function SlaCell({ sla_due_at, sla_breached, status }: {
  sla_due_at: string | null
  sla_breached: boolean
  status: string
}) {
  if (status === 'completed' || status === 'rejected') return <span style={{ color: 'var(--ink-3)' }}>—</span>
  if (!sla_due_at) return <span style={{ color: 'var(--ink-3)' }}>—</span>

  const due = new Date(sla_due_at)
  const diffMs = due.getTime() - Date.now()
  const diffH = Math.floor(Math.abs(diffMs) / 3_600_000)
  const diffM = Math.floor((Math.abs(diffMs) % 3_600_000) / 60_000)
  const overdue = sla_breached || diffMs < 0

  const color = overdue ? 'var(--danger)' : diffMs < 3_600_000 ? '#f59e0b' : 'var(--ink-2)'
  const label = overdue
    ? `Overdue ${diffH}h ${diffM}m`
    : diffH > 0
      ? `${diffH}h ${diffM}m left`
      : `${diffM}m left`

  return <span style={{ fontSize: 12, color, fontWeight: overdue ? 600 : 400 }}>{label}</span>
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending:    { background: '#fef3c7', color: '#92400e' },
  processing: { background: '#dbeafe', color: '#1e40af' },
  completed:  { background: '#d1fae5', color: '#065f46' },
  rejected:   { background: '#fee2e2', color: '#991b1b' },
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 600,
      padding: '2px 7px', borderRadius: 20, textTransform: 'capitalize',
      ...STATUS_STYLE[status] ?? {},
    }}>
      {status}
    </span>
  )
}

// ── Resolve modal (approve / reject) ─────────────────────────────────────────

function ResolveModal({ req, onClose, onDone }: {
  req: PrivacyRequest
  onClose: () => void
  onDone: () => void
}) {
  const [action, setAction] = useState<'approve' | 'reject'>('approve')
  const [note, setNote]     = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setErr('')
    try {
      if (action === 'approve') {
        await privacyService.approveRequest(req.id, note || undefined)
      } else {
        await privacyService.rejectRequest(req.id, note || undefined)
      }
      onDone()
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { detail?: string } } }
      setErr(ex?.response?.data?.detail || 'Failed to process request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 6, padding: 28, width: 420, maxWidth: '92vw',
        boxShadow: '0 12px 40px rgba(0,0,0,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            Process {req.request_type} request
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
          Customer: <strong>{req.customer_name || req.customer_id}</strong>
          {req.customer_email && <span> · {req.customer_email}</span>}
        </div>

        {req.request_type === 'deletion' && (
          <div style={{
            background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 4,
            padding: '8px 12px', fontSize: 12, color: '#c2410c', marginBottom: 14,
          }}>
            ⚠ Approving will permanently anonymize this customer's PII. This cannot be undone.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['approve', 'reject'] as const).map(a => (
            <button
              key={a}
              className={`btn sm ${action === a ? (a === 'approve' ? 'accent' : 'danger') : 'ghost'}`}
              style={action === a && a === 'reject' ? { background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' } : {}}
              onClick={() => setAction(a)}
            >
              {a === 'approve' ? 'Approve' : 'Reject'}
            </button>
          ))}
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label className="field-label">Resolution note (optional)</label>
          <textarea
            className="input"
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note for audit trail…"
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {err && <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn sm ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className={`btn sm ${action === 'approve' ? 'accent' : ''}`}
            style={action === 'reject' ? { background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' } : {}}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Processing…' : action === 'approve' ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type FilterStatus = '' | 'pending' | 'processing' | 'completed' | 'rejected'
type FilterType   = '' | 'export' | 'deletion'

export default function PrivacyRequestsPage() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const fmtDT     = useFormatDateTime()

  const [requests, setRequests]         = useState<PrivacyRequest[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('')
  const [filterType, setFilterType]     = useState<FilterType>('')
  const [page, setPage]                 = useState(1)
  const PER_PAGE = 25

  const [resolveTarget, setResolveTarget] = useState<PrivacyRequest | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await privacyService.listRequests({
        status: filterStatus || undefined,
        request_type: filterType || undefined,
        page,
        per_page: PER_PAGE,
      })
      setRequests(data.items)
      setTotal(data.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [filterStatus, filterType, page]) // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount   = requests.filter(r => r.status === 'pending').length
  const breachedCount  = requests.filter(r => r.sla_breached && r.status !== 'completed' && r.status !== 'rejected').length
  const autoCount      = requests.filter(r => r.auto_processed).length
  const totalPages     = Math.ceil(total / PER_PAGE)

  const select: React.CSSProperties = {
    padding: '5px 10px', borderRadius: 4, border: '1px solid var(--rule)',
    background: 'var(--surface)', fontSize: 13, color: 'var(--ink-1)', cursor: 'pointer',
  }

  return (
    <Shell
      activeId="privacy-requests"
      breadcrumb="People & Fleet · Customers · Privacy Requests"
      title="Privacy Requests"
      subtitle="Data export and deletion requests from customers"
      actions={
        <button className="btn sm ghost" onClick={() => navigate('/customers')}>
          ← Customers
        </button>
      }
    >
      <div style={{ padding: isMobile ? '16px' : '24px 32px 40px' }}>

        {/* ── Stat chips ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { label: 'Pending',        value: pendingCount,  warn: pendingCount > 0 },
            { label: 'SLA breached',   value: breachedCount, warn: breachedCount > 0 },
            { label: 'Auto-processed', value: autoCount,     warn: false },
            { label: 'Total',          value: total,         warn: false },
          ].map(s => (
            <div key={s.label} style={{
              padding: '10px 16px', borderRadius: 6,
              background: s.warn && s.value > 0 ? '#fef3c7' : 'var(--surface-raised)',
              border: `1px solid ${s.warn && s.value > 0 ? '#fbbf24' : 'var(--rule)'}`,
              minWidth: 90,
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.warn && s.value > 0 ? '#92400e' : 'var(--ink-1)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <select style={select} value={filterStatus} onChange={e => { setFilterStatus(e.target.value as FilterStatus); setPage(1) }}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <select style={select} value={filterType} onChange={e => { setFilterType(e.target.value as FilterType); setPage(1) }}>
            <option value="">All types</option>
            <option value="export">Export</option>
            <option value="deletion">Deletion</option>
          </select>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>No requests found.</div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>SLA due</th>
                  <th>Submitted</th>
                  <th>Resolved by</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{r.customer_name || '—'}</div>
                      <div className="t-meta">{r.customer_email || r.customer_id}</div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                        color: r.request_type === 'deletion' ? 'var(--danger)' : 'var(--accent)',
                      }}>
                        {r.request_type}
                      </span>
                      {r.auto_processed && <span className="t-meta" style={{ marginLeft: 4 }}>(auto)</span>}
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      <div className="t-meta">{r.sla_due_at ? fmtDT(r.sla_due_at) : '—'}</div>
                      <SlaCell sla_due_at={r.sla_due_at} sla_breached={r.sla_breached} status={r.status} />
                    </td>
                    <td className="t-meta">{r.created_at ? fmtDT(r.created_at) : '—'}</td>
                    <td className="t-meta">{r.resolved_by || '—'}</td>
                    <td>
                      {(r.status === 'pending' || r.status === 'processing') && (
                        <button
                          className="btn sm accent"
                          onClick={() => setResolveTarget(r)}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          Process
                        </button>
                      )}
                      {(r.status === 'completed' || r.status === 'rejected') && r.resolution_note && (
                        <span className="t-meta" style={{ display: 'block', marginTop: 4, color: 'var(--ink-2)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.resolution_note}>
                          {r.resolution_note}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, fontSize: 13 }}>
            <button className="btn sm ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</button>
            <span style={{ color: 'var(--ink-3)' }}>Page {page} of {totalPages}</span>
            <button className="btn sm ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
          </div>
        )}
      </div>

      {/* ── Resolve modal ── */}
      {resolveTarget && (
        <ResolveModal
          req={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onDone={() => { setResolveTarget(null); loadData() }}
        />
      )}
    </Shell>
  )
}
