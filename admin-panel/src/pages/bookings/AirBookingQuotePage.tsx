import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { airBookingsService } from '../../services/airBookingsService'
import type { CharterQuote, AirBookingDetail } from '../../services/airBookingsService'
import { operatorService } from '../../services/operatorService'
import type { Operator, Aircraft } from '../../services/operatorService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtL = (minor: number) => '₹' + (minor / 10000000).toFixed(2) + ' L'
const fmtMinor = (v: number) => `₹${(v / 100).toLocaleString('en-IN')}`

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch { return iso }
}

// ── Add Quote Form ────────────────────────────────────────────────────────────

interface AddQuoteFormProps {
  bookingId: string
  onSuccess: () => void
  onCancel: () => void
}

function AddQuoteForm({ bookingId, onSuccess, onCancel }: AddQuoteFormProps) {
  const [form, setForm] = useState({
    operator_id: '',
    aircraft_id: '',
    depart_icao: '',
    arrive_icao: '',
    etd: '',
    eta: '',
    base_fare_minor: '',
    positioning_minor: '',
    night_halt_minor: '',
    catering_minor: '',
    fuel_surcharge_minor: '',
    taxes_minor: '',
    conditions: '',
    otp_30d_pct: '',
    score: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [operators, setOperators] = useState<Operator[]>([])
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [loadingOps, setLoadingOps] = useState(true)
  const [loadingAc, setLoadingAc] = useState(false)

  useEffect(() => {
    operatorService.listOperators({ page_size: 100 })
      .then(r => setOperators(r.items))
      .catch(() => {})
      .finally(() => setLoadingOps(false))
  }, [])

  useEffect(() => {
    if (!form.operator_id) { setAircraft([]); setForm(f => ({ ...f, aircraft_id: '' })); return }
    setLoadingAc(true)
    operatorService.listAircraft({ operator_id: form.operator_id, page_size: 100 })
      .then(r => setAircraft(r.items))
      .catch(() => setAircraft([]))
      .finally(() => setLoadingAc(false))
  }, [form.operator_id])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const num = (v: string) => v ? parseInt(v, 10) : 0
  const numOpt = (v: string) => v ? parseFloat(v) : undefined

  const selectedAircraft = aircraft.find(a => a.id === form.aircraft_id) ?? null

  async function handleSubmit() {
    if (!form.operator_id || !form.aircraft_id || !form.base_fare_minor) {
      setError('Operator, Aircraft, and Base fare are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await airBookingsService.addQuote(bookingId, {
        operator_id: form.operator_id,
        aircraft_id: form.aircraft_id,
        aircraft_registration: selectedAircraft?.registration_mark || undefined,
        pax_capacity: selectedAircraft?.seat_capacity || undefined,
        range_nm: selectedAircraft?.range_nm || undefined,
        depart_icao: form.depart_icao || undefined,
        arrive_icao: form.arrive_icao || undefined,
        etd: form.etd || undefined,
        eta: form.eta || undefined,
        base_fare_minor: num(form.base_fare_minor),
        positioning_minor: num(form.positioning_minor),
        night_halt_minor: num(form.night_halt_minor),
        catering_minor: num(form.catering_minor),
        fuel_surcharge_minor: num(form.fuel_surcharge_minor),
        taxes_minor: num(form.taxes_minor),
        conditions: form.conditions || undefined,
        otp_30d_pct: numOpt(form.otp_30d_pct),
        score: numOpt(form.score),
      })
      onSuccess()
    } catch {
      setError('Failed to add quote.')
    } finally {
      setSubmitting(false)
    }
  }

  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="input">
        <input
          type={type}
          value={(form as Record<string, string>)[key]}
          onChange={e => set(key, e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  )

  const selStyle = { flex: 1, border: 'none', outline: 'none', background: 'transparent', height: 36, fontSize: 12.5, cursor: 'pointer' }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Add Quote</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Operator dropdown */}
        <div className="field">
          <label className="field-label">Operator *</label>
          <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
            <select value={form.operator_id} onChange={e => set('operator_id', e.target.value)} style={selStyle} disabled={loadingOps}>
              <option value="">{loadingOps ? 'Loading…' : 'Select operator…'}</option>
              {operators.map(o => (
                <option key={o.id} value={o.id}>{o.name}{o.hq_city ? ` · ${o.hq_city}` : ''}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Aircraft dropdown */}
        <div className="field">
          <label className="field-label">Aircraft *</label>
          <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
            <select value={form.aircraft_id} onChange={e => set('aircraft_id', e.target.value)} style={selStyle} disabled={!form.operator_id || loadingAc}>
              <option value="">{!form.operator_id ? 'Select operator first' : loadingAc ? 'Loading…' : aircraft.length === 0 ? 'No aircraft' : 'Select aircraft…'}</option>
              {aircraft.map(a => (
                <option key={a.id} value={a.id}>{a.registration_mark} · {a.seat_capacity} seats{a.range_nm ? ` · ${a.range_nm} nm` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {field('Depart ICAO', 'depart_icao', 'text', 'VOBG')}
        {field('Arrive ICAO', 'arrive_icao', 'text', 'VIIJ')}
        {field('ETD', 'etd', 'datetime-local', '')}
        {field('ETA', 'eta', 'datetime-local', '')}
        {field('Base fare (minor/paise)', 'base_fare_minor', 'number', '108000000')}
        {field('Positioning (minor)', 'positioning_minor', 'number', '0')}
        {field('Night halt (minor)', 'night_halt_minor', 'number', '0')}
        {field('Catering (minor)', 'catering_minor', 'number', '0')}
        {field('Fuel surcharge (minor)', 'fuel_surcharge_minor', 'number', '0')}
        {field('Taxes (minor)', 'taxes_minor', 'number', '0')}
        {field('OTP 30d (%)', 'otp_30d_pct', 'number', '95.0')}
        {field('Score (0–100)', 'score', 'number', '80')}
      </div>
      <div className="field">
        <label className="field-label">Conditions</label>
        <div className="input"><input value={form.conditions} onChange={e => set('conditions', e.target.value)} placeholder="No fuel-stop · 30 kg pax baggage" /></div>
      </div>
      {error && <div style={{ fontSize: 12.5, color: 'var(--danger)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn accent" disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'Adding…' : 'Add Quote'}
        </button>
      </div>
    </div>
  )
}

// ── Quote card ────────────────────────────────────────────────────────────────

interface QuoteCardProps {
  quote: CharterQuote
  bookingId: string
  onAction: () => void
}

function QuoteCard({ quote, bookingId, onAction }: QuoteCardProps) {
  const [pushing, setPushing] = useState(false)
  const [declining, setDeclining] = useState(false)

  const breakdown = [
    ['Base · hourly', quote.base_fare_minor],
    ['Positioning', quote.positioning_minor],
    ['Night halt', quote.night_halt_minor],
    ['Catering', quote.catering_minor],
    ['Fuel surcharge', quote.fuel_surcharge_minor],
    ['Taxes · GST 5%', quote.taxes_minor],
  ]

  async function handlePush() {
    setPushing(true)
    try { await airBookingsService.pushQuote(bookingId, quote.id); onAction() } catch { /* ignore */ }
    setPushing(false)
  }

  async function handleDecline() {
    setDeclining(true)
    try { await airBookingsService.declineQuote(bookingId, quote.id); onAction() } catch { /* ignore */ }
    setDeclining(false)
  }

  const isDeclined = quote.status === 'declined'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid ' + (quote.is_recommended ? 'var(--accent)' : 'var(--rule)'),
      boxShadow: quote.is_recommended ? '0 0 0 1px var(--accent)' : 'none',
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      opacity: isDeclined ? 0.6 : 1,
    }}>
      {quote.is_recommended && (
        <div style={{
          position: 'absolute', top: -1, left: -1, right: -1,
          background: 'var(--accent)', color: '#fff',
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          padding: '4px 14px', textAlign: 'center',
        }}>Recommended · best fit</div>
      )}

      <div style={{ padding: quote.is_recommended ? '32px 22px 18px' : '20px 22px 18px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="t-label">Operator</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>{quote.operator_name ?? '—'}</h3>
          </div>
          {quote.score !== null && (
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              border: '1px solid var(--rule-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: quote.is_recommended ? 'var(--accent-soft)' : 'var(--surface-2)',
              fontFamily: 'var(--font-serif)', fontSize: 20,
              color: quote.is_recommended ? 'var(--accent)' : 'var(--ink-2)',
            }}>{quote.score}</div>
          )}
        </div>
        <div style={{ marginTop: 12, fontSize: 13.5, color: 'var(--ink-2)' }}>{quote.aircraft_model ?? '—'} · {quote.aircraft_registration ?? '—'}</div>
        {quote.pax_capacity !== null && (
          <div className="t-meta" style={{ marginTop: 4 }}>{quote.pax_capacity} pax · range {quote.range_nm} nm</div>
        )}
        <div style={{ marginTop: 8 }}>
          <span className={`badge ${quote.status === 'pushed' || quote.status === 'accepted' ? 'ok' : quote.status === 'declined' ? 'danger' : 'pending'}`}>
            <span className={`dot ${quote.status === 'pushed' || quote.status === 'accepted' ? 'ok' : quote.status === 'declined' ? 'danger' : 'pending'}`} />
            {quote.status}
          </span>
        </div>
      </div>

      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
        <div>
          <div className="t-label" style={{ padding: 0 }}>Depart</div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{fmtTime(quote.etd)} · {quote.depart_icao ?? '—'}</div>
        </div>
        <div>
          <div className="t-label" style={{ padding: 0 }}>Arrive</div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{fmtTime(quote.eta)} · {quote.arrive_icao ?? '—'}</div>
        </div>
        {quote.otp_30d_pct !== null && (
          <div>
            <div className="t-label" style={{ padding: 0 }}>OTP · 30d</div>
            <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)' }}>{quote.otp_30d_pct}%</div>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 22px' }}>
        <div className="t-label" style={{ marginBottom: 10 }}>Pricing breakdown</div>
        {breakdown.map(([k, v]) => (
          <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5 }}>
            <span style={{ color: 'var(--ink-2)' }}>{k}</span>
            <span className="num">{fmtL(v as number)}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 500 }}>Total</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, color: quote.is_recommended ? 'var(--accent)' : 'var(--ink)' }}>
            {fmtMinor(quote.total_minor)}
          </span>
        </div>
      </div>

      {quote.conditions && (
        <div style={{ padding: '12px 22px 16px', background: 'var(--surface-2)', borderTop: '1px solid var(--rule)' }}>
          <div className="t-label" style={{ marginBottom: 6 }}>Conditions</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.45 }}>{quote.conditions}</div>
        </div>
      )}

      {!isDeclined && (
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--rule)', display: 'flex', gap: 8 }}>
          <button className="btn sm" style={{ flex: 1 }} disabled={declining} onClick={handleDecline}>
            {declining ? '…' : 'Decline'}
          </button>
          <button
            className={`btn sm ${quote.is_recommended ? 'accent' : ''}`}
            style={{ flex: 2 }}
            disabled={pushing || quote.status === 'pushed' || quote.status === 'accepted'}
            onClick={handlePush}
          >
            {pushing ? '…' : quote.status === 'pushed' ? 'Pushed' : quote.status === 'accepted' ? 'Accepted' : quote.is_recommended ? 'Push to customer' : 'Push this'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AirBookingQuotePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  useIsTablet()

  const bookingId = id ?? ''

  const [booking, setBooking] = useState<AirBookingDetail | null>(null)
  const [quotes, setQuotes] = useState<CharterQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [b, q] = await Promise.all([
        airBookingsService.getAirBooking(bookingId),
        airBookingsService.listQuotes(bookingId),
      ])
      setBooking(b)
      setQuotes(q.quotes)
    } catch {
      setBooking(null)
      setQuotes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  const sortedQuotes = [...quotes].sort((a, b) => {
    if (a.is_recommended && !b.is_recommended) return -1
    if (!a.is_recommended && b.is_recommended) return 1
    return (b.score ?? 0) - (a.score ?? 0)
  })

  if (loading) {
    return (
      <Shell activeId="bookings-a" breadcrumb="Operations · Air bookings · Quotes" title="Loading…">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading quotes…</div>
      </Shell>
    )
  }

  const title = booking ? `Quote oversight · ${booking.booking_ref}` : 'Quote oversight'
  const subtitle = booking
    ? `${booking.customer_name ?? '—'} · ${booking.service_label} · ${booking.route_from} → ${booking.route_to} · ${booking.pax_count} pax`
    : ''

  const recommendedQuote = sortedQuotes.find(q => q.is_recommended && q.status !== 'declined')

  return (
    <Shell
      activeId="bookings-a"
      breadcrumb="Operations · Air bookings · Quotes"
      title={title}
      subtitle={subtitle}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate(`/bookings/air/${bookingId}`)}>
            ← Back to booking
          </button>
          <button className="btn sm" onClick={() => setShowAddForm(v => !v)}>
            <Icon name="plus" size={13} />{showAddForm ? 'Cancel' : 'Add quote'}
          </button>
          {recommendedQuote && (
            <button className="btn sm accent" onClick={async () => {
              await airBookingsService.pushQuote(bookingId, recommendedQuote.id)
              loadData()
            }}>
              Push recommended →
            </button>
          )}
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Booking summary */}
        {booking && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: 16 }}>
            {[
              ['Itinerary', `${booking.route_from} → ${booking.route_to}`],
              ['Pax', `${booking.pax_count} · ${booking.service_label}`],
              ['Status', booking.status],
              ['Operator', booking.operator_name ?? 'Unassigned'],
              ['Quotes', `${quotes.length} received`],
            ].map(([k, v], i) => (
              <div key={String(k)} style={{ borderRight: !isMobile && i < 4 ? '1px solid var(--rule)' : 'none', paddingRight: 18 }}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontSize: 14, color: 'var(--ink)' }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Header strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="t-label">{quotes.length} quote{quotes.length !== 1 ? 's' : ''}</span>
          <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          <span className="t-meta">Sorted by · <span style={{ color: 'var(--ink-2)' }}>Recommended ↓</span></span>
        </div>

        {/* Add quote form */}
        {showAddForm && (
          <AddQuoteForm
            bookingId={bookingId}
            onSuccess={() => { setShowAddForm(false); loadData() }}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Quote cards */}
        {sortedQuotes.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            No quotes yet. Add the first quote using the button above.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
            {sortedQuotes.map(q => (
              <QuoteCard key={q.id} quote={q} bookingId={bookingId} onAction={loadData} />
            ))}
          </div>
        )}

        {/* Comparison strip */}
        {sortedQuotes.length > 1 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '16px 24px' }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Fare spread</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12.5 }}>
              {(() => {
                const totals = sortedQuotes.filter(q => q.status !== 'declined').map(q => q.total_minor)
                if (totals.length === 0) return null
                const minT = Math.min(...totals)
                const maxT = Math.max(...totals)
                const avgT = totals.reduce((a, b) => a + b, 0) / totals.length
                return (
                  <>
                    <span>Min: <strong>{fmtMinor(minT)}</strong></span>
                    <span>Max: <strong>{fmtMinor(maxT)}</strong></span>
                    <span>Avg: <strong>{fmtMinor(Math.round(avgT))}</strong></span>
                    <span style={{ color: 'var(--ink-2)' }}>Δ {fmtMinor(maxT - minT)} ({(((maxT - minT) / minT) * 100).toFixed(0)}%)</span>
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
