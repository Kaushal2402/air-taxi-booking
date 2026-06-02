import { useState, useEffect } from 'react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { paymentsService } from '../../services/paymentsService'
import type { GatewaySummary, BatchItem, UnmatchedItem, ReconciliationSummaryResponse } from '../../services/paymentsService'

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

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

export default function ReconciliationPage() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [summary, setSummary] = useState<ReconciliationSummaryResponse | null>(null)
  const [batches, setBatches] = useState<BatchItem[]>([])
  const [unmatched, setUnmatched] = useState<UnmatchedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      try {
        const [s, b, u] = await Promise.all([
          paymentsService.getReconciliationSummary(),
          paymentsService.listSettlementBatches({ hours: 48 }),
          paymentsService.listUnmatchedItems(),
        ])
        setSummary(s)
        setBatches(b.items)
        setUnmatched(u.items)
      } catch (_) {
        // silently ignore
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  const subtitle = summary
    ? `${summary.cycle_date} cycle · ${summary.gateways.length} gateways · ${summary.unmatched_count} unmatched items · ₹${summary.total_variance.toLocaleString('en-IN')} variance open`
    : 'Settlement reconciliation'

  const actions = (
    <>
      <button className="btn sm"><Icon name="download" size={13} />Statement</button>
      <button className="btn sm"><Icon name="refresh" size={13} />Re-run match</button>
      <button className="btn sm accent">Resolve all</button>
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

        {/* Gateway summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: gatewayGridCols, gap: 16 }}>
          {loading && !summary && [1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px', minHeight: 120 }} />
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
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  paddingTop: 8, borderTop: '1px solid var(--rule-soft)',
                }}>
                  <span className="t-meta">Variance</span>
                  <span className="t-mono" style={{
                    fontSize: 12.5,
                    color: g.variance < 0 ? 'var(--danger)' : 'var(--accent)',
                  }}>
                    {g.variance === 0 ? '₹0' : '−' + fmt(Math.abs(g.variance))}
                  </span>
                </div>
              </div>
              {/* Match % progress bar */}
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${g.match_pct}%`, height: '100%',
                    background: g.match_pct >= 100 ? 'var(--accent)' : g.match_pct >= 99 ? 'var(--warn)' : 'var(--danger)',
                  }} />
                </div>
                <span className="t-meta" style={{ fontFamily: 'var(--font-mono)' }}>{g.match_pct}%</span>
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
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</td>
                    </tr>
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
                        <span className="t-mono" style={{
                          fontSize: 12,
                          color: b.matched_count === b.transaction_count ? 'var(--accent)' : 'var(--danger)',
                        }}>
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
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  All clear — no unmatched items
                </div>
              )}
              {unmatched.map((item: UnmatchedItem, i: number) => (
                <div key={item.category} style={{
                  padding: '13px 0',
                  borderBottom: i < unmatched.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                }}>
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
              <button className="btn sm" style={{ width: '100%', marginTop: 14 }}>
                Open resolution queue
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
