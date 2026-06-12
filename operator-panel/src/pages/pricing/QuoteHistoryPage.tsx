import { useEffect, useState } from 'react'
import { Eye, Plus, Send } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { CharterQuote } from '../../services/operatorPricingService'
import { operatorPricingService } from '../../services/operatorPricingService'
import { fmtDate, fmtCurrency } from '../../lib/format'

const STATUS_TONE: Record<string, string> = {
  draft: 'pending',
  sent: 'info',
  accepted: 'ok',
  expired: 'warn',
  rejected: 'danger',
}

const fmtMoney = (minor: number, currency = 'INR') => fmtCurrency(minor, currency)

export default function QuoteHistoryPage() {
  const isMobile = useIsMobile()
  const [quotes, setQuotes] = useState<CharterQuote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    operatorPricingService
      .listQuotes()
      .then(setQuotes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSend = (q: CharterQuote) => {
    operatorPricingService
      .sendQuote(q.id)
      .then(updated => setQuotes(prev => prev.map(x => (x.id === updated.id ? updated : x))))
      .catch(console.error)
  }

  return (
    <Shell
      activeId="pricing"
      breadcrumb="Schedule & Pricing / Quote History"
      title="Quote History"
      subtitle={`${quotes.length} quotes`}
      actions={
        <button className="btn sm accent">
          <Plus size={12} />
          New quote
        </button>
      }
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          padding: '8px 28px',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--rule)',
          flexShrink: 0,
        }}
      >
        {[
          ['Quote ID', 150],
          ['Booking ref', 130],
          ['Total', 130],
          ['Validity', 80],
          ['Status', 100],
          ['Created', 120],
          ['', 100],
        ].map(([l, w]) => (
          <div
            key={String(l)}
            className="t-label"
            style={{
              width: (w as number) || undefined,
              flex: !(w as number) ? 1 : undefined,
              flexShrink: (w as number) ? 0 : undefined,
            }}
          >
            {l}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading && (
          <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
            Loading…
          </div>
        )}
        {!loading && quotes.length === 0 && (
          <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
            No quotes yet.
          </div>
        )}
        {!loading &&
          quotes.map((q, i) => {
            const tone = STATUS_TONE[q.status] ?? 'pending'
            return (
              <div
                key={q.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '11px 28px',
                  borderBottom: i === quotes.length - 1 ? 'none' : '1px solid var(--rule-soft)',
                }}
              >
                <div style={{ width: 150, flexShrink: 0 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      letterSpacing: '0.04em',
                      color: 'var(--ink)',
                    }}
                  >
                    {q.id.slice(0, 12)}…
                  </span>
                  <div className="t-meta" style={{ fontSize: 10, marginTop: 2 }}>
                    v{q.version}
                  </div>
                </div>
                <div style={{ width: 130, flexShrink: 0 }}>
                  <span className="t-meta" style={{ fontSize: 12 }}>
                    {q.booking_id ?? '—'}
                  </span>
                </div>
                <div style={{ width: 130, flexShrink: 0 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--ok)',
                      fontWeight: 600,
                    }}
                  >
                    {fmtMoney(q.total_minor, q.currency)}
                  </span>
                </div>
                <div style={{ width: 80, flexShrink: 0 }}>
                  <span className="t-meta" style={{ fontSize: 12 }}>
                    {q.validity_hours}h
                  </span>
                </div>
                <div style={{ width: 100, flexShrink: 0 }}>
                  <span className={`badge ${tone}`} style={{ height: 19 }}>
                    <span className={`dot ${tone}`} />
                    {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                  </span>
                </div>
                <div style={{ width: 120, flexShrink: 0 }}>
                  <span className="t-meta" style={{ fontSize: 12 }}>
                    {fmtDate(q.created_at)}
                  </span>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 5 }}>
                  <button className="btn sm" style={{ height: 26 }}>
                    <Eye size={11} />
                    View
                  </button>
                  {q.status === 'draft' && (
                    <button
                      className="btn sm accent"
                      style={{ height: 26 }}
                      onClick={() => handleSend(q)}
                    >
                      <Send size={11} />
                      Send
                    </button>
                  )}
                </div>
              </div>
            )
          })}
      </div>
    </Shell>
  )
}
