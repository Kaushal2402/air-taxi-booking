import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { payoutsService } from '../../services/payoutsService'
import type { PayoutRun, PayoutPayee } from '../../services/payoutsService'
import { useFormatMoney } from '../../lib/utils'


function runTypeLabel(t: string) {
  switch (t) {
    case 'driver_weekly': return 'Driver weekly'
    case 'operator_monthly': return 'Operator monthly'
    case 'referral': return 'Referral payouts'
    case 'vendor': return 'Vendor payout'
    default: return t
  }
}

export default function PayoutRunDetailPage() {
  const fmtINR = useFormatMoney()
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [run, setRun] = useState<PayoutRun | null>(null)
  const [payees, setPayees] = useState<PayoutPayee[]>([])
  const [totalPayees, setTotalPayees] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showMobileEditor, setShowMobileEditor] = useState(false)
  const [selectedPayee, setSelectedPayee] = useState<PayoutPayee | null>(null)

  const PAGE_SIZE = 20

  // Guard: if runId is "new" or missing, redirect to list immediately
  useEffect(() => {
    if (!runId || runId === 'new') {
      navigate('/payouts', { replace: true })
    }
  }, [runId, navigate])

  const load = useCallback(async () => {
    if (!runId || runId === 'new') return
    setLoading(true)
    try {
      const [runData, payeesData] = await Promise.all([
        payoutsService.getRun(runId),
        payoutsService.listPayees(runId, { page, page_size: PAGE_SIZE, search: search || undefined }),
      ])
      setRun(runData)
      setPayees(payeesData.items)
      setTotalPayees(payeesData.total)
    } catch {
      setError('Failed to load payout run. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [runId, page, search])

  useEffect(() => { load() }, [load])

  async function handleApprove() {
    if (!runId) return
    try {
      await payoutsService.approveRun(runId)
      setApproving(false)
      await load()
    } catch {
      // ignore
    }
  }

  async function handleReject() {
    if (!runId || !rejectReason.trim()) return
    try {
      await payoutsService.rejectRun(runId, rejectReason)
      setRejecting(false)
      setRejectReason('')
      await load()
    } catch {
      // ignore
    }
  }

  const readyCount = payees.filter(p => p.status === 'ready').length
  const holdCount = payees.filter(p => p.status === 'hold').length
  const bankFailCount = payees.filter(p => p.status === 'bank_fail').length

  if (loading && !run) {
    return (
      <Shell activeId="payouts" title="Loading…">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--ink-4)' }}>
          Loading payout run…
        </div>
      </Shell>
    )
  }

  if (error && !run) {
    return (
      <Shell activeId="payouts" breadcrumb="Finance · Payouts · Run" title="Error">
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>{error}</div>
          <button className="btn sm" onClick={() => navigate('/payouts')}>← Back to payout runs</button>
        </div>
      </Shell>
    )
  }

  if (!run) return null

  const isReview = run.status === 'review'

  const payeePanel = selectedPayee ? (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isMobile && (
        <button className="btn sm ghost" onClick={() => { setShowMobileEditor(false); setSelectedPayee(null) }} style={{ alignSelf: 'flex-start' }}>
          ← Back to payees
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="avatar">{selectedPayee.entity_name.split(' ').map((x: string) => x[0]).join('').slice(0, 2)}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{selectedPayee.entity_name}</div>
          <div className="t-meta">{selectedPayee.entity_ref} · {selectedPayee.entity_type}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          ['Trips', selectedPayee.trip_count.toString()],
          ['Gross', fmtINR(selectedPayee.gross_amount)],
          ['Incentive', '+' + fmtINR(selectedPayee.incentive_amount)],
          ['Deductions', selectedPayee.deduction_amount > 0 ? '−' + fmtINR(selectedPayee.deduction_amount) : '—'],
          ['Hold', selectedPayee.hold_amount > 0 ? '−' + fmtINR(selectedPayee.hold_amount) : '—'],
          ['Net', fmtINR(selectedPayee.net_amount)],
        ].map(([k, v]) => (
          <div key={k} style={{ padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
            <div className="t-label" style={{ padding: 0 }}>{k}</div>
            <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>
      {selectedPayee.adjustments.length > 0 && (
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>Adjustments</div>
          {selectedPayee.adjustments.map(adj => (
            <div key={adj.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--rule-soft)' }}>
              <div>
                <div style={{ fontSize: 13 }}>{adj.description}</div>
                {adj.reference && <div className="t-meta">{adj.reference}</div>}
              </div>
              <span className="t-mono" style={{ fontSize: 13, color: adj.adjustment_type === 'addition' ? 'var(--accent)' : 'var(--ink-3)' }}>
                {adj.adjustment_type === 'addition' ? '+' : '−'}{fmtINR(Math.abs(adj.amount))}
              </span>
            </div>
          ))}
        </div>
      )}
      {selectedPayee.hold_reason && (
        <div style={{ padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule-strong)', borderRadius: 3 }}>
          <div className="t-label" style={{ padding: 0, color: 'var(--danger)' }}>Hold reason</div>
          <div style={{ marginTop: 4, fontSize: 13 }}>{selectedPayee.hold_reason}</div>
        </div>
      )}
      <button className="btn sm ghost" onClick={() => navigate(`/payouts/payees/${selectedPayee.id}`)}>
        View full statement →
      </button>
    </div>
  ) : null

  return (
    <Shell
      activeId="payouts"
      breadcrumb="Finance · Payouts · Run detail"
      title={run.run_ref}
      subtitle={`${runTypeLabel(run.run_type)} · ${run.period_label} · ${run.payee_count.toLocaleString('en-IN')} payees · ${fmtINR(run.net_amount)} · ${run.status}`}
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />NACH file</button>
          {isReview && <button className="btn sm danger" onClick={() => setRejecting(true)}>Reject</button>}
          {isReview && (
            <button className="btn sm accent" onClick={() => setApproving(true)}>
              <Icon name="check" size={13} />Approve & release
            </button>
          )}
        </>
      }
    >
      <div style={{ padding: isMobile ? '16px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Summary band */}
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16 }}>
            {[
              ['Gross earnings', fmtINR(run.gross_amount), 'Trip fares + incentives'],
              ['Deductions', '−' + fmtINR(run.deduction_amount), 'Commission already netted'],
              ['Holds', '−' + fmtINR(run.hold_amount), `${holdCount} payees flagged`],
              ['Net payout', fmtINR(run.net_amount), `${readyCount} ready · ${holdCount} held`],
            ].map(([k, v, m], i) => (
              <div key={k as string} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '16px 18px' }}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 6, fontFamily: 'var(--font-serif)', fontSize: 22, color: i === 3 ? 'var(--accent)' : 'var(--ink)' }}>{v}</div>
                <div className="t-meta" style={{ marginTop: 4 }}>{m}</div>
              </div>
            ))}
          </div>
        )}

        {/* Payees section */}
        {isMobile && showMobileEditor && selectedPayee ? (
          payeePanel
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div className="t-label">Payees</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  {totalPayees.toLocaleString('en-IN')} payees · sorted by net
                </h3>
              </div>
              <div className="input" style={{ width: isMobile ? '100%' : 240, height: 30 }}>
                <Icon name="search" size={13} className="icon" />
                <input
                  placeholder="Driver, ID…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Driver</th>
                    {!isMobile && <th style={{ textAlign: 'right' }}>Trips</th>}
                    {!isMobile && <th style={{ textAlign: 'right' }}>Gross</th>}
                    {!isMobile && <th style={{ textAlign: 'right' }}>Incentive</th>}
                    {!isMobile && <th style={{ textAlign: 'right' }}>Deductions</th>}
                    {!isMobile && <th style={{ textAlign: 'right' }}>Hold</th>}
                    <th style={{ textAlign: 'right' }}>Net</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payees.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-4)' }}>No payees found</td></tr>
                  ) : payees.map(p => (
                    <tr
                      key={p.id}
                      style={{ cursor: 'pointer' }}
                      className={selectedPayee?.id === p.id ? 'selected' : ''}
                      onClick={() => {
                        setSelectedPayee(p)
                        if (isMobile) setShowMobileEditor(true)
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar">{p.entity_name.split(' ').map((x: string) => x[0]).join('').slice(0, 2)}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13 }}>{p.entity_name}</span>
                            {p.entity_ref && <span className="t-mono t-meta">{p.entity_ref}</span>}
                          </div>
                        </div>
                      </td>
                      {!isMobile && <td className="num" style={{ textAlign: 'right', fontSize: 12.5 }}>{p.trip_count}</td>}
                      {!isMobile && <td className="num" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmtINR(p.gross_amount)}</td>}
                      {!isMobile && <td className="num" style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--accent)' }}>+{fmtINR(p.incentive_amount)}</td>}
                      {!isMobile && <td className="num" style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--ink-3)' }}>{p.deduction_amount > 0 ? '−' + fmtINR(p.deduction_amount) : '—'}</td>}
                      {!isMobile && <td className="num" style={{ textAlign: 'right', fontSize: 12.5, color: p.hold_amount > 0 ? 'var(--danger)' : 'var(--ink-4)' }}>{p.hold_amount > 0 ? '−' + fmtINR(p.hold_amount) : '—'}</td>}
                      <td className="num" style={{ textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{fmtINR(p.net_amount)}</td>
                      <td>
                        {p.status === 'ready'    ? <span className="badge ok"><span className="dot ok" />Ready</span> :
                         p.status === 'hold'     ? <span className="badge danger"><span className="dot danger" />Hold</span> :
                         p.status === 'bank_fail'? <span className="badge warn"><span className="dot warn" />Bank fail</span> :
                         p.status === 'paid'     ? <span className="badge ok"><span className="dot ok" />Paid</span> :
                         <span className="badge"><span className="dot pending" />{p.status}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
              <span className="t-meta">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, totalPayees)}–{Math.min(page * PAGE_SIZE, totalPayees)} of {totalPayees.toLocaleString('en-IN')} · {readyCount} ready · {holdCount} hold · {bankFailCount} bank-fail
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn icon sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <Icon name="chevLeft" size={14} />
                </button>
                <button className="btn icon sm" disabled={page * PAGE_SIZE >= totalPayees} onClick={() => setPage(p => p + 1)}>
                  <Icon name="chevRight" size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Side panel on desktop */}
        {!isMobile && selectedPayee && (
          <div style={{ marginTop: 8 }}>
            {payeePanel}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={approving}
        title="Approve payout run"
        description={`Approve run ${run.run_ref}? Net amount: ${fmtINR(run.net_amount)}. This will release funds to ${run.payee_count} payees.`}
        confirmLabel="Approve & release"
        variant="default"
        onConfirm={handleApprove}
        onCancel={() => setApproving(false)}
      />

      {rejecting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(15,13,10,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={() => setRejecting(false)}>
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: 24, width: '100%', maxWidth: 420, borderRadius: 4 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Reject payout run</div>
            <div className="t-meta" style={{ marginBottom: 16 }}>Rejecting {run.run_ref}. Please provide a reason.</div>
            <textarea
              className="input"
              rows={3}
              style={{ width: '100%', padding: '8px 10px', resize: 'vertical' }}
              placeholder="Reason for rejection…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn sm ghost" onClick={() => { setRejecting(false); setRejectReason('') }}>Cancel</button>
              <button className="btn sm danger" disabled={!rejectReason.trim()} onClick={handleReject}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
