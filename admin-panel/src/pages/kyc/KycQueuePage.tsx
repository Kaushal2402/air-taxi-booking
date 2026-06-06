import { useState, useEffect } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { kycService } from '../../services/kycService'
import type { KycQueueItem } from '../../services/kycService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAge(ageSeconds: number | null): string {
  if (ageSeconds == null) return '—'
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m`
  if (ageSeconds < 86400) {
    const h = Math.floor(ageSeconds / 3600)
    const m = Math.floor((ageSeconds % 3600) / 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${Math.floor(ageSeconds / 86400)}d`
}

function entityIcon(t: string): string {
  if (t === 'driver') return 'car'
  if (t === 'operator') return 'building'
  if (t === 'pilot') return 'plane'
  if (t === 'aircraft') return 'layers'
  if (t === 'vehicle') return 'car'
  return 'car'
}

function docStatusBadge(s: string) {
  if (s === 'in_review' || s === 'pending')
    return <span className="badge warn"><span className="dot warn" />In review</span>
  if (s === 'approved' || s === 'ok')
    return <span className="badge ok"><span className="dot ok" />Approved</span>
  if (s === 'rejected')
    return <span className="badge danger"><span className="dot danger" />Rejected</span>
  if (s === 'expired')
    return <span className="badge danger"><span className="dot danger" />Expired</span>
  return <span className="badge info"><span className="dot info" />Uploaded</span>
}

// ── Review Modal ──────────────────────────────────────────────────────────────

interface ReviewModalProps {
  item: KycQueueItem
  action: 'approve' | 'reject'
  onClose: () => void
  onConfirm: (item: KycQueueItem, action: 'approve' | 'reject', expiry: string, reason: string) => Promise<void>
}

function ReviewModal({ item, action, onClose, onConfirm }: ReviewModalProps) {
  const [expiry, setExpiry] = useState(item.expiry_date ?? '')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isForbidden, setIsForbidden] = useState(false)

  const handleConfirm = async () => {
    if (action === 'approve' && !expiry.trim()) { setError('Expiry date is required to approve'); return }
    if (action === 'reject' && !reason.trim()) { setError('Reject reason is required'); return }
    setSaving(true)
    setError('')
    try {
      await onConfirm(item, action, expiry, reason)
    } catch {
      setError('Action failed. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: 'var(--surface)',
        border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)', padding: '28px',
      }}>
        <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
          {action === 'approve' ? 'Approve document' : 'Reject document'}
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-3)' }}>
          {item.entity_name} · {item.doc_type}
        </p>

        {error && (
          <div style={{
            marginBottom: 12, padding: '8px 12px', background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
          }}>{error}</div>
        )}

        {action === 'approve' && (
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label">Set expiry (required)</label>
            <div className="input" style={{ height: 38 }}>
              <Icon name="clock" size={14} className="icon" />
              <input
                type="date"
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}

        {action === 'reject' && (
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label">Reject reason (required)</label>
            <div className="input" style={{ height: 38 }}>
              <input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Reason for rejection…"
                autoFocus
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className={`btn sm ${action === 'approve' ? 'accent' : 'danger'}`}
            style={action === 'reject' ? { background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' } : {}}
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? 'Processing…' : action === 'approve' ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KycQueuePage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [items, setItems] = useState<KycQueueItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('pending')

  const [reviewItem, setReviewItem] = useState<KycQueueItem | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const canApproveKyc = usePermission('kyc.documents.approve')

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const params: { page: number; page_size: number; entity_type?: string; status?: string } = {
        page: p,
        page_size: 20,
      }
      if (entityFilter !== 'all') params.entity_type = entityFilter
      if (statusFilter !== 'all') params.status = statusFilter
      const res = await kycService.getQueue(params)
      setItems(res.items)
      setTotal(res.total)
      setPage(res.page)
      setPages(res.pages)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [entityFilter, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = search.trim()
    ? items.filter(i => i.entity_name.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()))
    : items

  const oldestItem = items.reduce<KycQueueItem | null>((acc, i) => {
    if (!acc || (i.age_seconds ?? 0) > (acc.age_seconds ?? 0)) return i
    return acc
  }, null)

  const callReviewApi = (item: KycQueueItem, body: { action: 'approve' | 'reject' | 'request_reupload'; expiry_date?: string | null; reason?: string | null }) => {
    if (item.entity_type === 'driver') return kycService.reviewDriverDoc(item.id, body)
    if (item.entity_type === 'vehicle') return kycService.reviewVehicleDoc(item.id, body)
    return kycService.reviewOperatorDoc(item.id, body)
  }

  const handleReupload = async (item: KycQueueItem) => {
    try {
      await callReviewApi(item, { action: 'request_reupload' })
      await load(page)
    } catch {
      // silently fail
    }
  }

  const handleReviewConfirm = async (item: KycQueueItem, action: 'approve' | 'reject', expiry: string, reason: string) => {
    const body = action === 'approve'
      ? { action: 'approve' as const, expiry_date: expiry || null }
      : { action: 'reject' as const, reason: reason || null }

    await callReviewApi(item, body)
    setReviewItem(null)
    await load(page)
  }

  // KPI calculations
  const pendingReviewCount = items.filter(i => i.status === 'pending' || i.status === 'in_review').length

  const renderMobileCard = (item: KycQueueItem) => (
    <div
      key={item.id}
      style={{
        background: 'var(--surface)', border: '1px solid var(--rule)',
        borderRadius: 4, padding: '14px 16px', marginBottom: 10,
        cursor: 'pointer',
      }}
      onClick={() => navigate(`/kyc/${item.entity_type}-documents/${item.id}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name={entityIcon(item.entity_type)} size={13} style={{ color: 'var(--ink-3)' }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{item.entity_name}</span>
          </div>
          <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{item.id}</span>
        </div>
        {docStatusBadge(item.status)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="badge">{item.doc_type}</span>
        <span className="t-meta">{formatAge(item.age_seconds)} in queue</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn sm" style={{ height: 28 }} onClick={e => { e.stopPropagation(); handleReupload(item) }}>Reupload</button>
        <button className="btn sm danger" style={{ height: 28, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={e => { e.stopPropagation(); setReviewAction('reject'); setReviewItem(item) }}>Reject</button>
        <button className="btn sm accent" style={{ height: 28 }} onClick={e => { e.stopPropagation(); setReviewAction('approve'); setReviewItem(item) }}>Approve</button>
      </div>
    </div>
  )

  return (
    <Shell
      activeId="kyc"
      breadcrumb="Compliance · KYC & Documents"
      title="Verification queue"
      subtitle={`${total} documents pending · across drivers, operators & crew`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/kyc/expiry')}>
            <Icon name="clock" size={13} />Expiry watchlist
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* KPI Strip */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        }}>
          {[
            ['In queue', String(total), 'Across all entity types', 'var(--ink-2)'],
            ['Oldest', formatAge(oldestItem?.age_seconds ?? null), 'Longest waiting', 'var(--warn)'],
            ['Pending review', String(pendingReviewCount), 'Awaiting decision', 'var(--ink-2)'],
            ['Approved today', '—', 'No data available', 'var(--ink-2)'],
            ['Entity filter', entityFilter === 'all' ? 'All entities' : entityFilter, 'Current filter', 'var(--ink-2)'],
          ].map(([k, v, m, c], i) => (
            <div key={k} style={{
              padding: isMobile ? '12px 14px' : '18px 22px',
              borderRight: isMobile
                ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                : (i < 4 ? '1px solid var(--rule)' : 'none'),
              borderBottom: isMobile && i < 4 ? '1px solid var(--rule)' : 'none',
            }}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 22 : 28 }}>{v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: c as string }}>{m}</div>
            </div>
          ))}
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: isMobile ? '100%' : 280, height: 32 }}>
            <Icon name="search" size={13} className="icon" />
            <input
              placeholder="Search by name, doc ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="input" style={{ height: 32, width: isMobile ? '100%' : 180, padding: 0, paddingLeft: 10 }}>
            <select
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
            >
              <option value="all">All entities</option>
              <option value="driver">Driver</option>
              <option value="operator">Operator</option>
              <option value="vehicle">Vehicle</option>
              <option value="pilot">Pilot</option>
              <option value="aircraft">Aircraft</option>
            </select>
          </div>

          <div className="input" style={{ height: 32, width: isMobile ? '100%' : 180, padding: 0, paddingLeft: 10 }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
            >
              <option value="pending">Pending review</option>
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
        )}

        {/* Mobile cards */}
        {!loading && isMobile && (
          filtered.length === 0
            ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No documents in queue.</div>
            : <div>{filtered.map(renderMobileCard)}</div>
        )}

        {/* Desktop table */}
        {!loading && !isMobile && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th style={{ width: 34 }}></th>
                    <th style={{ width: 110 }}>Document</th>
                    <th>Submitter</th>
                    <th style={{ width: 150 }}>Doc type</th>
                    <th style={{ width: 90 }}>In queue</th>
                    <th style={{ width: 120 }}>Status</th>
                    <th style={{ width: 210 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                        No documents in queue.
                      </td>
                    </tr>
                  ) : filtered.map(item => (
                    <tr
                      key={item.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/kyc/${item.entity_type}-documents/${item.id}`)}
                    >
                      <td>
                        <span style={{ width: 14, height: 14, border: '1px solid var(--rule-strong)', borderRadius: 3, display: 'inline-block' }} />
                      </td>
                      <td>
                        <span className="t-mono" style={{ fontSize: 12 }}>{item.id}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 3, background: 'var(--surface-2)',
                            border: '1px solid var(--rule)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexShrink: 0, color: 'var(--ink-3)',
                          }}>
                            <Icon name={entityIcon(item.entity_type)} size={13} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 12.5 }}>{item.entity_name}</span>
                            <span className="t-meta" style={{ textTransform: 'capitalize' }}>{item.entity_type}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge">{item.doc_type}</span>
                      </td>
                      <td className="t-meta">{formatAge(item.age_seconds)}</td>
                      <td>{docStatusBadge(item.status)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="btn sm"
                            style={{ height: 28 }}
                            onClick={e => { e.stopPropagation(); handleReupload(item) }}
                          >
                            Reupload
                          </button>
                          <button
                            className="btn sm"
                            style={{ height: 28, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            onClick={e => { e.stopPropagation(); setReviewAction('reject'); setReviewItem(item) }}
                          >
                            Reject
                          </button>
                          <button
                            className="btn sm accent"
                            style={{ height: 28 }}
                            onClick={e => { e.stopPropagation(); setReviewAction('approve'); setReviewItem(item) }}
                          >
                            Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
              <span className="t-meta">Showing {filtered.length} of {total}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn icon sm"
                  disabled={page <= 1}
                  onClick={() => { load(page - 1) }}
                >
                  <Icon name="chevLeft" size={14} />
                </button>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)', padding: '0 8px', lineHeight: '28px' }}>
                  {page} / {pages}
                </span>
                <button
                  className="btn icon sm"
                  disabled={page >= pages}
                  onClick={() => { load(page + 1) }}
                >
                  <Icon name="chevRight" size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewItem && (
        <ReviewModal
          item={reviewItem}
          action={reviewAction}
          onClose={() => setReviewItem(null)}
          onConfirm={handleReviewConfirm}
        />
      )}
    </Shell>
  )
}
