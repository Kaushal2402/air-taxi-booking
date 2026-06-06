import { useState, useEffect, useCallback } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { payoutsService } from '../../services/payoutsService'
import type { PayoutRun, PayoutRunType, CreatePayoutRun } from '../../services/payoutsService'
import { useFormatMoney } from '../../lib/utils'


function runTypeLabel(t: string) {
  switch (t) {
    case 'driver_weekly': return 'Driver · weekly'
    case 'operator_monthly': return 'Operator · monthly'
    case 'referral': return 'Referral payouts'
    case 'vendor': return 'Vendor payout'
    default: return t
  }
}

// ── New Run Modal ──────────────────────────────────────────────────────────────
interface NewRunModalProps {
  onClose: () => void
  onCreated: (runId: string) => void
}

function NewRunModal({ onClose, onCreated }: NewRunModalProps) {
  const [runType, setRunType] = useState<PayoutRunType>('driver_weekly')
  const [periodLabel, setPeriodLabel] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isForbidden, setIsForbidden] = useState(false)

  const handleCreate = async () => {
    if (!periodLabel.trim()) { setError('Period label is required'); return }
    setSaving(true)
    setError(null)
    try {
      const body: CreatePayoutRun = {
        run_type: runType,
        period_label: periodLabel.trim(),
        period_start: periodStart || null,
        period_end: periodEnd || null,
        notes: notes || undefined,
      }
      const run = await payoutsService.createRun(body)
      onCreated(run.id)
    } catch {
      setError('Failed to create payout run. Please try again.')
      setSaving(false)
    }
  }

  const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: 4 }
  const labelStyle = { fontSize: 11, fontWeight: 600 as const, color: 'var(--ink-3)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
  const inputStyle = { height: 34, padding: '0 10px', width: '100%', fontSize: 13 }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 4, width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-pop)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>New payout run</div>
            <div className="t-meta" style={{ marginTop: 3 }}>Configure the run — payees can be added after creation</div>
          </div>
          <button className="btn icon sm ghost" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        {/* Form */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 13, color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>Run type *</label>
            <select className="input" style={inputStyle} value={runType} onChange={e => setRunType(e.target.value as PayoutRunType)}>
              <option value="driver_weekly">Driver · Weekly</option>
              <option value="operator_monthly">Operator · Monthly</option>
              <option value="referral">Referral payouts</option>
              <option value="vendor">Vendor payout</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Period label * <span style={{ fontWeight: 400, textTransform: 'none' }}>(e.g. "Week 22 · 26 May – 1 Jun 2026")</span></label>
            <input
              className="input"
              style={inputStyle}
              placeholder="Week XX · DD Mon – DD Mon YYYY"
              value={periodLabel}
              onChange={e => setPeriodLabel(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Period start</label>
              <input className="input" style={inputStyle} type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Period end</label>
              <input className="input" style={inputStyle} type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Notes</label>
            <input className="input" style={inputStyle} placeholder="Optional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn sm accent" onClick={handleCreate} disabled={saving}>
            {saving
              ? <><Icon name="refresh" size={13} style={{ animation: 'spin 1s linear infinite' }} />Creating…</>
              : <><Icon name="plus" size={13} />Create run</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PayoutRunsPage() {
  const fmtINR = useFormatMoney()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [runs, setRuns] = useState<PayoutRun[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNewRun, setShowNewRun] = useState(false)
  const [approving, setApproving] = useState<PayoutRun | null>(null)
  const [rejecting, setRejecting] = useState<PayoutRun | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const canApprovePayout = usePermission('payouts.approve')
  const canCreatePayout = usePermission('payouts.create')

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
          <button style={{ display: canCreatePayout ? undefined : 'none' }} className="btn sm accent" onClick={() => setShowNewRun(true)}>
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
                          <button className="btn sm danger" onClick={() => setRejecting(r)} style={{ display: canApprovePayout ? undefined : 'none' }}>Reject</button>
                          <button className="btn sm accent" onClick={() => setApproving(r)} style={{ display: canApprovePayout ? undefined : 'none' }}>Approve</button>
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

      {/* New Run Modal */}
      {showNewRun && (
        <NewRunModal
          onClose={() => setShowNewRun(false)}
          onCreated={(runId) => {
            setShowNewRun(false)
            navigate(`/payouts/runs/${runId}`)
          }}
        />
      )}

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
