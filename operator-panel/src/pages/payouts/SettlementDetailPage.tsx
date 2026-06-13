import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Send } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import { fmtCurrency, fmtDate } from '../../lib/format'
import type { SettlementDetail, SettlementQuery } from '../../services/operatorSettlementsService'
import { operatorSettlementsService } from '../../services/operatorSettlementsService'

const STATUS_TONE: Record<string, string> = {
  paid: 'ok',
  pending: 'warn',
  processing: 'info',
  disputed: 'danger',
  on_hold: 'danger',
}

function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'info'
  const label = status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span className={`badge ${tone}`} style={{ height: 22, fontSize: 12 }}>
      <span className={`dot ${tone}`} />
      {label}
    </span>
  )
}

export default function SettlementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [detail, setDetail] = useState<SettlementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [queryText, setQueryText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [queries, setQueries] = useState<SettlementQuery[]>([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!id) return
    operatorSettlementsService
      .getDetail(id)
      .then(data => {
        setDetail(data)
        setQueries(data.queries ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleExport = () => {
    if (!id) return
    setExporting(true)
    operatorSettlementsService
      .exportSettlement(id)
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `settlement-${id}.csv`
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(console.error)
      .finally(() => setExporting(false))
  }

  const handleRaiseQuery = () => {
    if (!id || !queryText.trim()) return
    setSubmitting(true)
    operatorSettlementsService
      .raiseQuery(id, queryText.trim())
      .then(newQuery => {
        setQueries(prev => [newQuery, ...prev])
        setQueryText('')
      })
      .catch(console.error)
      .finally(() => setSubmitting(false))
  }

  if (loading) {
    return (
      <Shell activeId="payouts" breadcrumb="Finance / Payouts" title="Settlement Detail">
        <div className="t-meta" style={{ textAlign: 'center', padding: 60 }}>
          Loading…
        </div>
      </Shell>
    )
  }

  if (!detail) {
    return (
      <Shell activeId="payouts" breadcrumb="Finance / Payouts" title="Settlement Detail">
        <div className="t-meta" style={{ textAlign: 'center', padding: 60 }}>
          Settlement not found.
        </div>
      </Shell>
    )
  }

  const lineItemCols = [
    ['Flight Date', 110],
    ['Route', 0],
    ['Ref', 120],
    ['Gross', 110],
    ['Commission', 110],
    ['Deduction', 110],
    ['Net', 110],
  ] as [string, number][]

  const rightPanel = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: isMobile ? '100%' : 300,
        flexShrink: 0,
      }}
    >
      {/* Payout Summary Card */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 10,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Payout Summary</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="t-label" style={{ fontSize: 11 }}>Status</span>
            <StatusBadge status={detail.status} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="t-label" style={{ fontSize: 11 }}>Net Amount</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--accent)',
              }}
            >
              {fmtCurrency(detail.net_amount)}
            </span>
          </div>

          {detail.payout_ref && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="t-label" style={{ fontSize: 11 }}>Payout Ref</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--ink-2)',
                  letterSpacing: '0.04em',
                }}
              >
                {detail.payout_ref}
              </span>
            </div>
          )}

          {detail.payout_date && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="t-label" style={{ fontSize: 11 }}>Payout Date</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{fmtDate(detail.payout_date)}</span>
            </div>
          )}

          {detail.bank_last4 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="t-label" style={{ fontSize: 11 }}>Bank Account</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                ••••{detail.bank_last4}
              </span>
            </div>
          )}

          {detail.bank_account_name && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="t-label" style={{ fontSize: 11 }}>Account Name</span>
              <span style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right', maxWidth: 140 }}>
                {detail.bank_account_name}
              </span>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div className="t-label" style={{ fontSize: 10, marginBottom: 4 }}>Gross</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                {fmtCurrency(detail.gross_amount)}
              </div>
            </div>
            <div>
              <div className="t-label" style={{ fontSize: 10, marginBottom: 4 }}>Commission</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--danger)' }}>
                -{fmtCurrency(detail.commission_amount)}
              </div>
            </div>
            <div>
              <div className="t-label" style={{ fontSize: 10, marginBottom: 4 }}>Deductions</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--danger)' }}>
                -{fmtCurrency(detail.deduction_amount)}
              </div>
            </div>
          </div>
        </div>

        <button
          className="btn accent"
          style={{ width: '100%', justifyContent: 'center', gap: 8 }}
          onClick={handleExport}
          disabled={exporting}
        >
          <Download size={13} />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* Raise Query */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 10,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Raise a Query</div>
        <textarea
          className="input"
          style={{
            width: '100%',
            height: 80,
            resize: 'vertical',
            padding: '8px 10px',
            fontSize: 13,
            borderRadius: 6,
          }}
          placeholder="Describe your concern about this settlement…"
          value={queryText}
          onChange={e => setQueryText(e.target.value)}
        />
        <button
          className="btn accent sm"
          style={{ alignSelf: 'flex-end', gap: 6 }}
          onClick={handleRaiseQuery}
          disabled={submitting || !queryText.trim()}
        >
          <Send size={12} />
          {submitting ? 'Submitting…' : 'Submit Query'}
        </button>

        {/* Existing queries */}
        {queries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <div className="t-label" style={{ fontSize: 10 }}>Previous Queries</div>
            {queries.map(q => (
              <div
                key={q.id}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--rule)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtDate(q.created_at)}</span>
                  <span
                    className={`badge ${q.status === 'resolved' ? 'ok' : 'warn'}`}
                    style={{ height: 16, fontSize: 9 }}
                  >
                    {q.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>
                  {q.query_text}
                </p>
                {q.response && (
                  <div
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--rule-strong)',
                      borderRadius: 4,
                      padding: '6px 10px',
                      fontSize: 11.5,
                      color: 'var(--ink-3)',
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Response: </span>
                    {q.response}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <Shell
      activeId="payouts"
      breadcrumb="Finance / Payouts"
      title={detail.period_label}
      subtitle={`Net payout: ${fmtCurrency(detail.net_amount)}`}
      actions={
        <button
          className="btn sm"
          onClick={() => navigate('/payouts')}
          style={{ gap: 6 }}
        >
          <ArrowLeft size={13} />
          Back to Payouts
        </button>
      }
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 20,
          padding: '20px 28px',
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {/* Left: line items table */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              paddingBottom: 8,
              borderBottom: '1px solid var(--rule)',
            }}
          >
            Flight Line Items
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                padding: '8px 12px',
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--rule)',
                borderRadius: '6px 6px 0 0',
                minWidth: 700,
              }}
            >
              {lineItemCols.map(([label, width]) => (
                <div
                  key={label}
                  className="t-label"
                  style={{
                    width: width || undefined,
                    flex: !width ? 1 : undefined,
                    flexShrink: width ? 0 : undefined,
                    fontSize: 10.5,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {detail.line_items.length === 0 && (
              <div className="t-meta" style={{ textAlign: 'center', padding: 32 }}>
                No line items found.
              </div>
            )}

            {detail.line_items.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderBottom:
                    i === detail.line_items.length - 1
                      ? 'none'
                      : '1px solid var(--rule-soft)',
                  minWidth: 700,
                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                }}
              >
                {/* Flight Date */}
                <div style={{ width: 110, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                    {fmtDate(item.flight_date)}
                  </span>
                </div>

                {/* Route */}
                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                    }}
                  >
                    {item.route}
                  </span>
                </div>

                {/* Booking Ref */}
                <div style={{ width: 120, flexShrink: 0 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.04em',
                      color: 'var(--ink-3)',
                    }}
                  >
                    {item.booking_ref}
                  </span>
                </div>

                {/* Gross */}
                <div style={{ width: 110, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                    {fmtCurrency(item.gross_amount)}
                  </span>
                </div>

                {/* Commission */}
                <div style={{ width: 110, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--danger)' }}>
                    -{fmtCurrency(item.commission_amount)}
                  </span>
                </div>

                {/* Deduction */}
                <div style={{ width: 110, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--danger)' }}>
                    -{fmtCurrency(item.deduction_amount)}
                  </span>
                </div>

                {/* Net */}
                <div style={{ width: 110, flexShrink: 0 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--accent)',
                    }}
                  >
                    {fmtCurrency(item.net_amount)}
                  </span>
                </div>
              </div>
            ))}

            {/* Totals row */}
            {detail.line_items.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: 'var(--surface-2)',
                  borderTop: '2px solid var(--rule)',
                  minWidth: 700,
                  borderRadius: '0 0 6px 6px',
                }}
              >
                <div style={{ width: 110, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span className="t-label" style={{ fontSize: 11 }}>Total</span>
                </div>
                <div style={{ width: 120, flexShrink: 0 }} />
                <div style={{ width: 110, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                    {fmtCurrency(detail.gross_amount)}
                  </span>
                </div>
                <div style={{ width: 110, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--danger)' }}>
                    -{fmtCurrency(detail.commission_amount)}
                  </span>
                </div>
                <div style={{ width: 110, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--danger)' }}>
                    -{fmtCurrency(detail.deduction_amount)}
                  </span>
                </div>
                <div style={{ width: 110, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                    {fmtCurrency(detail.net_amount)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: payout summary + raise query */}
        {rightPanel}
      </div>
    </Shell>
  )
}
