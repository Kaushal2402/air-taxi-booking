import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { payoutsService } from '../../services/payoutsService'
import type { PayoutRun } from '../../services/payoutsService'

const fmtINR = (n: number) =>
  '₹ ' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })

function runTypeLabel(t: string) {
  switch (t) {
    case 'driver_weekly': return 'Driver · weekly'
    case 'operator_monthly': return 'Operator · monthly'
    case 'referral': return 'Referral payouts'
    case 'vendor': return 'Vendor payout'
    default: return t
  }
}

export default function PayoutRunsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [runs, setRuns] = useState<PayoutRun[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState<PayoutRun | null>(null)
  const [rejecting, setRejecting] = useState<PayoutRun | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await payoutsService.listRuns({
        page,
        page_size: PAGE_SIZE,
        status: filterStatus || undefined,
        search: search || undefined,
      })
      setRuns(res.items)
      setTotal(res.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, search])

  useEffect(() => { load() }, [load])

  async function handleApprove() {
    if (!approving) return
    try {
      await payoutsService.approveRun(approving.id)
      setApproving(null)
      await load()
    } catch {
      // ignore
    }
  }

  async function handleReject() {
    if (!rejecting || !rejectReason.trim()) return
    try {
      await payoutsService.rejectRun(rejecting.id, rejectReason)
      setRejecting(null)
      setRejectReason('')
      await load()
    } catch {
      // ignore
    }
  }

  const pendingApproval = runs.filter(r => r.status === 'review').length
  const escrowTotal = runs.filter(r => r.status === 'approved' || r.status === 'scheduled').reduce((s, r) => s + r.net_amount, 0)
  const paidMTD = runs.filter(r => r.status === 'paid').reduce((s, r) => s + r.net_amount, 0)

  return (
    <Shell
      activeId="payouts"
      breadcrumb="Finance · Payouts"
      title="Payout runs"
      subtitle={`${pendingApproval} runs awaiting approval · escrow ${fmtINR(escrowTotal)}`}
      actions={
        <>
          <button className="btn sm">
            <Icon name="download" size={13} />Export
          </button>
          <button className="btn sm accent" onClick={() => navigate('/payouts/runs/new')}>
            <Icon name="plus" size={13} />New run
          </button>
        </>
      }
    >
      <div style={{ padding: isMobile ? '16px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* KPIs */}
        {!isMobile && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)' }}>
            {[
              ['Pending approval', fmtINR(runs.filter(r => r.status === 'review').reduce((s, r) => s + r.net_amount, 0)), `${pendingApproval} runs`, 'var(--warn)'],
              ['In escrow', fmtINR(escrowTotal), 'Held until release', 'var(--ink-2)'],
              ['Paid · MTD', fmtINR(paidMTD), `${runs.filter(r => r.status === 'paid').length} completed runs`, 'var(--accent)'],
              ['Total payees', runs.reduce((s, r) => s + r.payee_count, 0).toLocaleString('en-IN'), 'Across all runs', 'var(--ink-2)'],
              ['Total runs', total.toString(), 'All time', 'var(--ink-2)'],
            ].map(([k, v, m, c], i) => (
              <div key={k as string} style={{ padding: '18px 22px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 24 }}>{v}</div>
                <div className="t-meta" style={{ marginTop: 8, color: c as string }}>{m}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: isMobile ? '100%' : 280, height: 32 }}>
            <Icon name="search" size={13} className="icon" />
            <input
              placeholder="Run ID, period…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="btn sm"
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            style={{ height: 30 }}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Period</th>
                  {!isMobile && <th style={{ textAlign: 'right' }}>Payees</th>}
                  {!isMobile && <th style={{ textAlign: 'right' }}>Gross</th>}
                  <th style={{ textAlign: 'right' }}>Net</th>
                  <th>Status</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-4)' }}>Loading…</td></tr>
                ) : runs.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-4)' }}>No payout runs found</td></tr>
                ) : runs.map(r => (
                  <tr
                    key={r.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/payouts/runs/${r.id}`)}
                  >
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span className="t-mono" style={{ fontSize: 12.5, color: 'var(--ink)' }}>{r.run_ref}</span>
                        <span className="t-meta">{runTypeLabel(r.run_type)}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{r.period_label}</td>
                    {!isMobile && <td className="num" style={{ textAlign: 'right', fontSize: 13 }}>{r.payee_count.toLocaleString('en-IN')}</td>}
                    {!isMobile && <td className="num" style={{ textAlign: 'right', fontSize: 13 }}>{fmtINR(r.gross_amount)}</td>}
                    <td className="num" style={{ textAlign: 'right', fontSize: 14, fontWeight: 500 }}>{fmtINR(r.net_amount)}</td>
                    <td>
                      {r.status === 'review'     ? <span className="badge warn"><span className="dot warn" />Review</span> :
                       r.status === 'scheduled'  ? <span className="badge info"><span className="dot info" />Scheduled</span> :
                       r.status === 'paid'       ? <span className="badge ok"><span className="dot ok" />Paid</span> :
                       r.status === 'approved'   ? <span className="badge ok"><span className="dot ok" />Approved</span> :
                       r.status === 'draft'      ? <span className="badge"><span className="dot pending" />Draft</span> :
                       r.status === 'failed'     ? <span className="badge danger"><span className="dot danger" />Failed</span> :
                       <span className="badge"><span className="dot pending" />{r.status}</span>}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      {r.status === 'review' ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn sm danger" onClick={() => setRejecting(r)}>Reject</button>
                          <button className="btn sm accent" onClick={() => setApproving(r)}>Approve</button>
                        </div>
                      ) : (
                        <button className="btn sm ghost" onClick={() => navigate(`/payouts/runs/${r.id}`)}>
                          <Icon name="chevRight" size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > PAGE_SIZE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
              <span className="t-meta">Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn icon sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <Icon name="chevLeft" size={14} />
                </button>
                <button className="btn icon sm" disabled={page * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>
                  <Icon name="chevRight" size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approve confirm */}
      <ConfirmDialog
        open={!!approving}
        title="Approve payout run"
        description={`Approve run ${approving?.run_ref}? Net amount: ${approving ? fmtINR(approving.net_amount) : ''}. This will release funds to ${approving?.payee_count} payees.`}
        confirmLabel="Approve & release"
        variant="default"
        onConfirm={handleApprove}
        onCancel={() => setApproving(null)}
      />

      {/* Reject dialog */}
      {rejecting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(15,13,10,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={() => setRejecting(null)}>
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: 24, width: '100%', maxWidth: 420, borderRadius: 4 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Reject payout run</div>
            <div className="t-meta" style={{ marginBottom: 16 }}>Rejecting {rejecting.run_ref}. Please provide a reason.</div>
            <textarea
              className="input"
              rows={3}
              style={{ width: '100%', padding: '8px 10px', resize: 'vertical' }}
              placeholder="Reason for rejection…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn sm ghost" onClick={() => { setRejecting(null); setRejectReason('') }}>Cancel</button>
              <button className="btn sm danger" disabled={!rejectReason.trim()} onClick={handleReject}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
