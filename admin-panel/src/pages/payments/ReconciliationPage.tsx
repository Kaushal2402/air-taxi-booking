import { useState, useEffect, useCallback } from 'react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { paymentsService } from '../../services/paymentsService'
import type { GatewaySummary, BatchItem, UnmatchedItem, ReconciliationSummaryResponse } from '../../services/paymentsService'

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

// ── CSV export helper ──────────────────────────────────────────────────────────
function downloadCSV(rows: BatchItem[], summary: ReconciliationSummaryResponse, filename: string) {
  const lines: string[] = []
  // Summary header
  lines.push(`"Settlement Reconciliation Statement"`)
  lines.push(`"Cycle Date","${summary.cycle_date}"`)
  lines.push(`"Total Variance","${fmt(summary.total_variance)}"`)
  lines.push(`"Unmatched Items","${summary.unmatched_count}"`)
  lines.push('')

  // Gateway summary
  lines.push('"Gateway","Ref","Expected","Settled","Variance","Match %","Status"')
  summary.gateways.forEach(g => {
    lines.push([
      `"${g.name}"`, `"${g.ref}"`,
      g.expected_amount, g.settled_amount, g.variance,
      g.match_pct, `"${g.status}"`,
    ].join(','))
  })
  lines.push('')

  // Batches
  lines.push('"Batch ID","Gateway","Date","Transactions","Amount","Matched","Status"')
  rows.forEach(b => {
    lines.push([
      `"${b.id}"`, `"${b.gateway}"`,
      `"${new Date(b.settlement_date).toLocaleString('en-IN')}"`,
      b.transaction_count, b.amount, b.matched_count, `"${b.status}"`,
    ].join(','))
  })

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Status badges ──────────────────────────────────────────────────────────────
function gatewayStatusBadge(status: string) {
  switch (status) {
    case 'matched':  return <span className="badge ok"><span className="dot ok" />Matched</span>
    case 'variance': return <span className="badge danger"><span className="dot danger" />Variance</span>
    case 'pending':  return <span className="badge warn"><span className="dot warn" />Pending</span>
    default: return <span className="badge">{status}</span>
  }
}

function batchStatusBadge(status: string, count: number, matched: number) {
  if (status === 'matched') return <span className="badge ok"><span className="dot ok" />Matched</span>
  if (status === 'variance') return <span className="badge danger"><span className="dot danger" />{count - matched} unmatched</span>
  return <span className="badge warn"><span className="dot warn" />Pending</span>
}

// ── Toast notification ─────────────────────────────────────────────────────────
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 400,
      background: 'var(--surface)', border: '1px solid var(--rule)',
      borderRadius: 4, padding: '12px 16px', boxShadow: 'var(--shadow-pop)',
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, maxWidth: 360,
    }}>
      <span className="dot ok" />
      {message}
      <button className="btn icon sm ghost" style={{ marginLeft: 4 }} onClick={onDismiss}><Icon name="x" size={12} /></button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ReconciliationPage() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [summary, setSummary] = useState<ReconciliationSummaryResponse | null>(null)
  const [batches, setBatches] = useState<BatchItem[]>([])
  const [unmatched, setUnmatched] = useState<UnmatchedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [rerunning, setRerunning] = useState(false)
  const [showResolveConfirm, setShowResolveConfirm] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, b, u] = await Promise.all([
        paymentsService.getReconciliationSummary(),
        paymentsService.listSettlementBatches({ hours: 48 }),
        paymentsService.listUnmatchedItems(),
      ])
      setSummary(s)
      setBatches(b.items)
      setUnmatched(u.items)
    } catch {
      setError('Failed to load reconciliation data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleRerunMatch = async () => {
    setRerunning(true)
    try {
      const res = await paymentsService.rerunMatch()
      setToast(res.message)
      await loadAll()
    } catch {
      setError('Re-run match failed. Please try again.')
    } finally {
      setRerunning(false)
    }
  }

  const handleResolveAll = async () => {
    setResolving(true)
    setShowResolveConfirm(false)
    try {
      const res = await paymentsService.resolveAll()
      setToast(res.message)
      await loadAll()
    } catch {
      setError('Resolve all failed. Please try again.')
    } finally {
      setResolving(false)
    }
  }

  const handleStatement = () => {
    if (!summary) return
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(batches, summary, `settlement-statement-${date}.csv`)
  }

  const subtitle = summary
    ? `${summary.cycle_date} cycle · ${summary.gateways.length} gateways · ${summary.unmatched_count} unmatched items · ${fmt(summary.total_variance)} variance open`
    : 'Settlement reconciliation'

  const actions = (
    <>
      <button className="btn sm" onClick={handleStatement} disabled={!summary || loading}>
        <Icon name="download" size={13} />Statement
      </button>
      <button className="btn sm" onClick={handleRerunMatch} disabled={rerunning || loading}>
        <Icon name="refresh" size={13} style={rerunning ? { animation: 'spin 1s linear infinite' } : undefined} />
        {rerunning ? 'Running…' : 'Re-run match'}
      </button>
      <button className="btn sm accent" onClick={() => setShowResolveConfirm(true)} disabled={resolving || unmatched.length === 0}>
        {resolving ? 'Resolving…' : 'Resolve all'}
      </button>
    </>
  )

  const gatewayGridCols = isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'
  const bottomGridCols = isMobile || isTablet ? '1fr' : '1.7fr 1fr'

  return (
    <Shell
      activeId="payments"
      breadcrumb="Finance · Payments · Reconciliation"
      title="Settlement reconciliation"
      subtitle={subtitle}
      actions={actions}
    >
      <div style={{ padding: isMobile ? '16px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Error banner */}
        {error && (
          <div style={{ padding: '10px 16px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 13, color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {error}
            <button className="btn icon sm ghost" onClick={() => setError(null)}><Icon name="x" size={13} /></button>
          </div>
        )}

        {/* Gateway summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: gatewayGridCols, gap: 16 }}>
          {loading && !summary && [1, 2, 3, 4].map(i => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px', minHeight: 160, borderRadius: 2 }} />
          ))}
          {summary?.gateways.map((g: GatewaySummary) => (
            <div key={g.name} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{g.name}</div>
                {gatewayStatusBadge(g.status)}
              </div>
              <div className="t-meta" style={{ marginTop: 4 }}>{g.ref}</div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="t-meta">Expected</span>
                  <span className="t-mono" style={{ fontSize: 12.5 }}>{fmt(g.expected_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="t-meta">Settled</span>
                  <span className="t-mono" style={{ fontSize: 12.5 }}>{fmt(g.settled_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--rule-soft)' }}>
                  <span className="t-meta">Variance</span>
                  <span className="t-mono" style={{ fontSize: 12.5, color: g.variance < 0 ? 'var(--danger)' : 'var(--accent)' }}>
                    {g.variance === 0 ? '₹0' : '−' + fmt(Math.abs(g.variance))}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(g.match_pct, 100)}%`, height: '100%',
                    background: g.match_pct >= 100 ? 'var(--accent)' : g.match_pct >= 99 ? 'var(--warn)' : 'var(--danger)',
                  }} />
                </div>
                <span className="t-meta" style={{ fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{g.match_pct}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom grid: batches + unmatched */}
        <div style={{ display: 'grid', gridTemplateColumns: bottomGridCols, gap: 18 }}>

          {/* Settlement batches table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Settlement batches</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Last 48 hours</h3>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Gateway</th>
                    <th style={{ textAlign: 'right' }}>Txns</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Match</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</td></tr>
                  )}
                  {!loading && batches.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>No settlement batches in the last 48 hours</td></tr>
                  )}
                  {batches.map(b => (
                    <tr key={b.id} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span className="t-mono" style={{ fontSize: 12 }}>{b.id}</span>
                          <span className="t-meta">{new Date(b.settlement_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12.5 }}>{b.gateway}</td>
                      <td className="num" style={{ textAlign: 'right', fontSize: 12.5 }}>{b.transaction_count.toLocaleString('en-IN')}</td>
                      <td className="num" style={{ textAlign: 'right', fontSize: 13 }}>{fmt(b.amount)}</td>
                      <td>
                        <span className="t-mono" style={{ fontSize: 12, color: b.matched_count === b.transaction_count ? 'var(--accent)' : 'var(--danger)' }}>
                          {b.matched_count.toLocaleString('en-IN')}
                          {b.matched_count !== b.transaction_count && ' / ' + b.transaction_count.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>{batchStatusBadge(b.status, b.transaction_count, b.matched_count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unmatched items panel */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Needs attention</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Unmatched items</h3>
            </div>
            <div style={{ padding: '8px 18px 16px' }}>
              {loading && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
              )}
              {!loading && unmatched.length === 0 && (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>All clear</div>
                  <div className="t-meta" style={{ marginTop: 4 }}>No unmatched items</div>
                </div>
              )}
              {unmatched.map((item: UnmatchedItem, i: number) => (
                <div key={item.category} style={{ padding: '13px 0', borderBottom: i < unmatched.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span className={`dot ${item.tone}`} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{item.category}</span>
                    </div>
                    <span className="t-mono" style={{ fontSize: 12.5 }}>{fmt(item.amount)}</span>
                  </div>
                  <div className="t-meta" style={{ marginTop: 5, marginLeft: 16 }}>
                    {item.count_label} · {item.note}
                  </div>
                </div>
              ))}
              {unmatched.length > 0 && (
                <button
                  className="btn sm"
                  style={{ width: '100%', marginTop: 14 }}
                  onClick={() => setShowResolveConfirm(true)}
                  disabled={resolving}
                >
                  Open resolution queue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resolve All confirmation */}
      <ConfirmDialog
        open={showResolveConfirm}
        title="Resolve all unmatched items"
        description={`This will mark all ${unmatched.length} unmatched items as resolved and update affected settlement batches to matched. This action cannot be undone.`}
        confirmLabel="Resolve all"
        variant="danger"
        loading={resolving}
        onConfirm={handleResolveAll}
        onCancel={() => setShowResolveConfirm(false)}
      />

      {/* Toast notification */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </Shell>
  )
}
