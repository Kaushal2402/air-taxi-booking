import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { airBookingsService } from '../../services/airBookingsService'
import type { AirBookingDetail, CharterQuote } from '../../services/airBookingsService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtL = (v: number) => `₹${(v / 10000000).toFixed(2)} L`

function formatTs(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) }
  catch { return iso }
}

function quoteTotal(q: CharterQuote): number {
  return q.base_fare_minor + q.positioning_minor + q.night_halt_minor + q.catering_minor + q.fuel_surcharge_minor + q.taxes_minor
}

// ── Quote Card (defined OUTSIDE page) ────────────────────────────────────────

interface QuoteCardProps {
  quote: CharterQuote
  onPush: (id: string) => void
  onDecline: (id: string) => void
  actingId: string | null
}

function QuoteCard({ quote: q, onPush, onDecline, actingId }: QuoteCardProps) {
  const total = quoteTotal(q)
  const isActing = actingId === q.id

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${q.is_recommended ? 'var(--accent)' : 'var(--rule)'}`,
      boxShadow: q.is_recommended ? '0 0 0 1px var(--accent)' : 'none',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {q.is_recommended && (
        <div style={{
          position: 'absolute', top: -1, left: -1, right: -1,
          background: 'var(--accent)', color: '#fff',
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          padding: '4px 14px', textAlign: 'center',
        }}>Recommended · best fit</div>
      )}

      {/* Header */}
      <div style={{ padding: q.is_recommended ? '32px 22px 18px' : '20px 22px 18px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="t-label">Operator</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>{q.operator_name ?? '—'}</h3>
          </div>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            border: '1px solid var(--rule-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: q.is_recommended ? 'var(--accent-soft)' : 'var(--surface-2)',
            fontFamily: 'var(--font-serif)', fontSize: 20,
            color: q.is_recommended ? 'var(--accent)' : 'var(--ink-2)',
          }}>{q.score ?? '—'}</div>
        </div>
        <div style={{ marginTop: 12, fontSize: 13.5, color: 'var(--ink-2)' }}>
          {q.aircraft_model} · {q.aircraft_registration}
        </div>
        <div className="t-meta" style={{ marginTop: 4 }}>{q.pax_capacity} pax · range {q.range_nm} nm</div>
      </div>

      {/* Flight info */}
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
        <div>
          <div className="t-label" style={{ padding: 0 }}>Depart</div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
            {q.etd ? formatTs(q.etd) : '—'} · {q.depart_icao ?? '—'}
          </div>
        </div>
        <div>
          <div className="t-label" style={{ padding: 0 }}>Arrive</div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
            {q.eta ? formatTs(q.eta) : '—'} · {q.arrive_icao ?? '—'}
          </div>
        </div>
        <div>
          <div className="t-label" style={{ padding: 0 }}>OTP · 30d</div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)' }}>{q.otp_30d_pct != null ? `${q.otp_30d_pct}%` : '—'}</div>
        </div>
        <div>
          <div className="t-label" style={{ padding: 0 }}>Status</div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', textTransform: 'capitalize' }}>{q.status}</div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ padding: '14px 22px' }}>
        <div className="t-label" style={{ marginBottom: 10 }}>Pricing breakdown</div>
        {[
          ['Base · hourly',   q.base_fare_minor],
          ['Positioning',     q.positioning_minor],
          ['Night halt',      q.night_halt_minor],
          ['Catering',        q.catering_minor],
          ['Fuel surcharge',  q.fuel_surcharge_minor],
          ['Taxes · GST 5%',  q.taxes_minor],
        ].map(([k, v]) => (
          <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5 }}>
            <span style={{ color: 'var(--ink-2)' }}>{k}</span>
            <span className="num">{fmtL(Number(v))}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 500 }}>Total</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, color: q.is_recommended ? 'var(--accent)' : 'var(--ink)' }}>
            {fmtL(total)}
          </span>
        </div>
      </div>

      {/* Vetting */}
      {q.conditions && (
        <div style={{ padding: '12px 22px 16px', background: 'var(--surface-2)', borderTop: '1px solid var(--rule)' }}>
          <div className="t-label" style={{ marginBottom: 6 }}>Vetting</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.45 }}>{q.conditions}</div>
        </div>
      )}

      {/* Actions */}
      {q.status !== 'declined' ? (
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--rule)', display: 'flex', gap: 8 }}>
          <button className="btn sm" style={{ flex: 1 }} onClick={() => onDecline(q.id)} disabled={isActing}>Decline</button>
          <button className={`btn sm${q.is_recommended ? ' accent' : ''}`} style={{ flex: 2 }} onClick={() => onPush(q.id)} disabled={isActing}>
            {q.is_recommended ? 'Push to customer' : 'Push this'}
          </button>
        </div>
      ) : (
        <div style={{ padding: '10px 22px', borderTop: '1px solid var(--rule)', background: 'var(--danger-soft)' }}>
          <span className="badge danger"><span className="dot danger" />Declined</span>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AirBookingQuotePage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [booking, setBooking] = useState<AirBookingDetail | null>(null)
  const [quotes, setQuotes] = useState<CharterQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  useEffect(() => {
    if (!bookingId) { navigate('/bookings/air'); return }
    const load = async () => {
      setLoading(true)
      try {
        const [b, q] = await Promise.all([
          airBookingsService.getBooking(bookingId),
          airBookingsService.listQuotes(bookingId),
        ])
        setBooking(b)
        setQuotes(q.quotes)
      } catch {
        navigate('/bookings/air')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [bookingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePush = async (quoteId: string) => {
    if (!bookingId) return
    setActingId(quoteId)
    try {
      await airBookingsService.pushQuote(bookingId, quoteId)
      const q = await airBookingsService.listQuotes(bookingId)
      setQuotes(q.quotes)
    } catch { /* ignore */ }
    finally { setActingId(null) }
  }

  const handleDecline = async (quoteId: string) => {
    if (!bookingId) return
    setActingId(quoteId)
    try {
      await airBookingsService.declineQuote(bookingId, quoteId)
      const q = await airBookingsService.listQuotes(bookingId)
      setQuotes(q.quotes)
    } catch { /* ignore */ }
    finally { setActingId(null) }
  }

  const recommended = quotes.find(q => q.is_recommended)
  const totals = quotes.map(q => quoteTotal(q))
  const minT = totals.length > 0 ? Math.min(...totals) : 0
  const maxT = totals.length > 0 ? Math.max(...totals) : 0
  const avgT = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0

  if (loading) {
    return (
      <Shell activeId="bookings-a" breadcrumb="Operations · Air bookings · Quotes" title="Loading…">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading quotes…</div>
      </Shell>
    )
  }

  if (!booking) return null

  return (
    <Shell
      activeId="bookings-a"
      breadcrumb="Operations · Air bookings · Quotes"
      title={`Quote oversight · ${booking.booking_ref}`}
      subtitle={`${booking.customer_name} · ${booking.service_label} · ${booking.route_from} → ${booking.route_to} · ${booking.pax_count} pax`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate(`/bookings/air/${booking.id}`)}>
            <Icon name="chevLeft" size={13} />Back to booking
          </button>
          <button className="btn sm" onClick={() => navigate(`/bookings/air/${booking.id}?tab=quotes`)}>
            Request more quotes
          </button>
          {recommended && (
            <button className="btn sm accent" onClick={() => handlePush(recommended.id)}>
              Push {recommended.operator_name ?? 'recommended'} quote →
            </button>
          )}
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Request summary */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          padding: '20px 24px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
          gap: 0,
        }}>
          {[
            ['Itinerary',  `${booking.route_from} → ${booking.route_to}`],
            ['Pax',        `${booking.pax_count} · ${booking.service_label}`],
            ['Depart',     booking.etd ? new Date(booking.etd).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'],
            ['Return',     'One-way'],
            ['Notes',      booking.notes ?? '—'],
          ].map(([k, v], i) => (
            <div key={k} style={{
              borderRight: isMobile ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none') : (i < 4 ? '1px solid var(--rule)' : 'none'),
              paddingRight: 18,
              borderBottom: isMobile && i < 4 ? '1px solid var(--rule)' : 'none',
              paddingBottom: isMobile ? 12 : 0,
            }}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 8, fontSize: 14, color: 'var(--ink)' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Header strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="t-label">{quotes.length} quote{quotes.length !== 1 ? 's' : ''} received</span>
          <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          <span className="t-meta">Sort by · <span style={{ color: 'var(--ink-2)' }}>Recommended ↓</span></span>
        </div>

        {quotes.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 12 }}>No quotes yet for this booking.</div>
            <button className="btn sm accent" onClick={() => navigate(`/bookings/air/${booking.id}?tab=quotes`)}>
              <Icon name="plus" size={13} />Add first quote
            </button>
          </div>
        ) : (
          <>
            {/* Quote cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(quotes.length, 3)}, 1fr)`,
              gap: 16,
            }}>
              {quotes.map(q => (
                <QuoteCard key={q.id} quote={q} onPush={handlePush} onDecline={handleDecline} actingId={actingId} />
              ))}
            </div>

            {/* Comparison strip */}
            {quotes.length >= 2 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '16px 24px', display: 'grid', gridTemplateColumns: '180px 1fr auto auto', gap: 12, alignItems: 'center' }}>
                <div className="t-label">Price spread</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, height: 6, background: 'var(--rule)', borderRadius: 3, position: 'relative' }}>
                    {quotes.map((q, i) => {
                      const t = quoteTotal(q)
                      const pct = maxT > minT ? ((t - minT) / (maxT - minT)) * 100 : 50
                      return (
                        <span key={i} style={{
                          position: 'absolute', left: `${pct}%`, top: -3, width: 12, height: 12, borderRadius: '50%',
                          background: q.is_recommended ? 'var(--accent)' : 'var(--ink-2)',
                          transform: 'translateX(-50%)',
                        }} title={fmtL(t)} />
                      )
                    })}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                  Δ {fmtL(maxT - minT)} ({maxT > 0 ? Math.round(((maxT - minT) / minT) * 100) : 0}%)
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                  min {fmtL(minT)} · max {fmtL(maxT)} · avg {fmtL(avgT)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  )
}
