import { useState, useEffect, useRef } from 'react'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { paymentsService } from '../../services/paymentsService'
import type { PaymentDetail } from '../../services/paymentsService'
import { formatMoney, useFormatMoney, formatDateTime, currencySymbol } from '../../lib/utils'

function statusBadge(s: string) {
  switch (s) {
    case 'captured':    return <span className="badge ok"><span className="dot ok" />Captured</span>
    case 'invoiced':    return <span className="badge info"><span className="dot info" />Invoiced</span>
    case 'pending':     return <span className="badge"><span className="dot pending" />Pending</span>
    case 'failed':      return <span className="badge danger"><span className="dot danger" />Failed</span>
    case 'refunded':    return <span className="badge warn"><span className="dot warn" />Refunded</span>
    case 'part-refund': return <span className="badge warn"><span className="dot warn" />Partial</span>
    case 'chargeback':  return <span className="badge danger"><span className="dot danger" />Chargeback</span>
    default: return <span className="badge">{s}</span>
  }
}

function fmtAmt(v: number): string {
  if (v === 0) return '—'
  if (v < 0) return '−' + formatMoney(Math.abs(v) * 100)
  return formatMoney(v * 100)
}

export default function TransactionDetailPage() {
  const { txnId } = useParams<{ txnId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [txn, setTxn] = useState<PaymentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isForbidden, setIsForbidden] = useState(false)

  // Refund form state
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null)
  const refundPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!txnId) return
    setLoading(true)
    paymentsService.getTransaction(txnId)
      .then(data => { setTxn(data); setLoading(false) })
      .catch(() => { setError('Failed to load transaction'); setLoading(false) })
  }, [txnId])

  const handleRefund = async () => {
    if (!txn || !txnId) return
    setRefunding(true)
    try {
      const amt = refundType === 'full' ? txn.net_amount : parseFloat(refundAmount)
      await paymentsService.issueRefund(txnId, {
        refund_type: refundType,
        amount: refundType === 'partial' ? amt : undefined,
        reason: refundReason,
      })
      setRefundSuccess('Refund initiated successfully')
      setShowConfirm(false)
      // Refresh data
      const refreshed = await paymentsService.getTransaction(txnId)
      setTxn(refreshed)
    } catch (_) {
      setRefundSuccess('Refund failed. Please try again.')
    } finally {
      setRefunding(false)
    }
  }

  const refundAmtValue = refundType === 'full'
    ? (txn?.net_amount ?? 0)
    : parseFloat(refundAmount) || 0

  if (isForbidden) return <AccessDeniedPage message={`You don't have permission to access this page.`} />

  if (loading) {
    return (
      <Shell activeId="payments" breadcrumb="Finance · Payments · Transaction" title="Loading…">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      </Shell>
    )
  }

  if (error || !txn) {
    return (
      <Shell activeId="payments" breadcrumb="Finance · Payments · Transaction" title="Error">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)', fontSize: 13 }}>{error ?? 'Transaction not found'}</div>
      </Shell>
    )
  }

  const subtitle = `${txn.status} · ${txn.method} · ${formatMoney(txn.gross_amount * 100)} · ${formatDateTime(txn.created_at)}`

  const actions = (
    <>
      {isMobile && (
        <button className="btn sm ghost" onClick={() => navigate('/payments')}>← Back to Payments</button>
      )}
      <button className="btn sm"><Icon name="download" size={13} />Receipt</button>
      <button className="btn sm" onClick={() => refundPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Issue refund</button>
      <button className="btn sm danger"><Icon name="alert" size={13} />Flag dispute</button>
    </>
  )

  return (
    <Shell activeId="payments" breadcrumb="Finance · Payments · Transaction" title={txn.id} subtitle={subtitle} actions={actions}>
      <div style={{
        padding: isMobile ? '16px' : '24px 32px 28px',
        display: 'grid',
        gridTemplateColumns: isMobile || isTablet ? '1fr' : '1.2fr 1fr',
        gap: 24,
      }}>

        {/* LEFT: Breakdown + Instrument */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Amount breakdown */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div className="t-label" style={{ padding: 0 }}>Amount breakdown</div>
              {statusBadge(txn.status)}
            </div>
            <div style={{ padding: '8px 24px 16px' }}>
              {txn.breakdown.map((row, i) => {
                const isTotal = row.kind === 'total'
                const isNet = row.kind === 'net'
                const isFee = row.kind === 'fee'
                return (
                  <div key={row.label + i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 0',
                    borderBottom: i < txn.breakdown.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                    borderTop: isTotal ? '1px solid var(--rule-strong)' : 'none',
                  }}>
                    <span style={{
                      fontSize: isTotal || isNet ? 14 : 13,
                      fontWeight: isTotal || isNet ? 500 : 400,
                      color: isFee ? 'var(--ink-3)' : 'var(--ink)',
                      fontFamily: isTotal || isNet ? 'var(--font-serif)' : 'var(--font-sans)',
                    }}>{row.label}</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: isTotal || isNet ? 16 : 13,
                      fontWeight: isTotal || isNet ? 500 : 400,
                      color: isNet ? 'var(--accent)' : row.amount < 0 ? 'var(--ink-3)' : 'var(--ink)',
                    }}>{fmtAmt(row.amount)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Payment instrument */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Payment instrument</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52, border: '1px solid var(--rule-strong)', borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
                flexShrink: 0,
              }}>
                <Icon name="wallet" size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{txn.instrument.display}</div>
                <div className="t-meta" style={{ marginTop: 3 }}>
                  {[txn.instrument.bank, txn.instrument.sub_type, txn.instrument.verified ? 'verified instrument' : 'unverified'].filter(Boolean).join(' · ')}
                </div>
              </div>
              {txn.gateway_ref && (
                <div style={{ textAlign: 'right' }}>
                  <div className="t-label" style={{ padding: 0 }}>Gateway ref</div>
                  <div className="t-mono" style={{ fontSize: 12.5, marginTop: 4 }}>{txn.gateway_ref}</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                ['Risk score', txn.instrument.risk_score !== null ? `${txn.instrument.risk_score} / 100` : 'N/A', txn.instrument.risk_score !== null && txn.instrument.risk_score < 30 ? 'Low' : 'Check'],
                ['AVS', txn.instrument.avs_status ?? 'N/A', 'Match'],
                ['3DS', txn.instrument.three_ds ?? 'N/A', txn.instrument.method.toUpperCase()],
              ].map(([k, v, m]) => (
                <div key={k} style={{
                  padding: '12px 14px', background: 'var(--surface-2)',
                  border: '1px solid var(--rule)', borderRadius: 3,
                }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 5, fontSize: 14, fontWeight: 500 }}>{v}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{m}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Timeline + Refund panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Lifecycle timeline */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div className="t-label" style={{ marginBottom: 16 }}>Lifecycle</div>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 5, top: 6, bottom: 6,
                width: 1, background: 'var(--rule)',
              }} />
              {txn.timeline.map((ev, i) => (
                <div key={ev.event + i} style={{
                  display: 'flex', gap: 14,
                  paddingBottom: i < txn.timeline.length - 1 ? 18 : 0,
                  position: 'relative',
                }}>
                  <span style={{
                    width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
                    marginTop: 4, position: 'relative', zIndex: 1,
                    background: ev.status === 'ok' ? 'var(--accent)' : 'var(--surface)',
                    border: ev.status === 'pending' ? '1.5px solid var(--ink-4)' : 'none',
                    boxShadow: ev.status === 'ok' ? '0 0 0 3px var(--accent-soft)' : 'none',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: 13, fontWeight: 500,
                        color: ev.status === 'pending' ? 'var(--ink-3)' : 'var(--ink)',
                      }}>{ev.event}</span>
                      <span className="t-meta">{ev.timestamp}</span>
                    </div>
                    <div className="t-meta" style={{ marginTop: 3 }}>{ev.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Refund panel */}
          <div ref={refundPanelRef} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div style={{ marginBottom: 16 }}>
              <div className="t-label" style={{ padding: 0 }}>Issue refund</div>
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                Refunds return to the original instrument. UPI refunds settle in 1–3 business days; gateway fee is non-recoverable.
              </p>
            </div>

            {refundSuccess && (
              <div style={{
                marginBottom: 14, padding: '10px 14px',
                background: 'var(--accent-soft)', border: '1px solid var(--accent)',
                borderRadius: 3, fontSize: 13, color: 'var(--accent)',
              }}>
                {refundSuccess}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="field">
                <label className="field-label">Refund type</label>
                <select
                  className="input"
                  value={refundType}
                  onChange={e => setRefundType(e.target.value as 'full' | 'partial')}
                  style={{ width: '100%', padding: '0 10px', height: 34 }}
                >
                  <option value="full">Full</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              {refundType === 'partial' && (
                <div className="field">
                  <label className="field-label">Amount ({currencySymbol()})</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0"
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    style={{ width: '100%', padding: '0 10px', height: 34 }}
                  />
                </div>
              )}
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label className="field-label">Reason</label>
              <select
                className="input"
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                style={{ width: '100%', padding: '0 10px', height: 34 }}
              >
                <option value="">Select reason…</option>
                <option value="Trip cancelled mid-route · service issue">Trip cancelled mid-route · service issue</option>
                <option value="Driver no-show">Driver no-show</option>
                <option value="Duplicate charge">Duplicate charge</option>
                <option value="Service not rendered">Service not rendered</option>
                <option value="Customer complaint">Customer complaint</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Warning banner */}
            {refundAmtValue > 0 && (
              <div style={{
                marginBottom: 16, padding: '14px 16px',
                background: 'var(--warn-soft)',
                border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule))',
                borderRadius: 3, display: 'flex', gap: 12,
              }}>
                <Icon name="alert" size={16} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  {formatMoney(refundAmtValue * 100)} of {formatMoney(txn.gross_amount * 100)} will be refunded to{' '}
                  <span className="t-mono">{txn.vpa ?? txn.instrument.display}</span>.
                  {txn.gateway_fee > 0 && ` Gateway fee (${formatMoney(txn.gateway_fee * 100)}) is not returned.`}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn sm" onClick={() => { setRefundType('full'); setRefundAmount(''); setRefundReason('') }}>Cancel</button>
              <button
                className="btn sm accent"
                disabled={!refundReason || (refundType === 'partial' && !refundAmount)}
                onClick={() => setShowConfirm(true)}
              >
                Confirm refund{refundAmtValue > 0 ? ` · ${formatMoney(refundAmtValue * 100)}` : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Confirm refund"
        description={`${formatMoney(refundAmtValue * 100)} will be refunded to ${txn.vpa ?? txn.instrument.display}. This action cannot be undone.`}
        confirmLabel="Confirm refund"
        variant="default"
        loading={refunding}
        onConfirm={handleRefund}
        onCancel={() => setShowConfirm(false)}
      />
    </Shell>
  )
}
