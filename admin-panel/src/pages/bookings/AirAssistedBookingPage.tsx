import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { airBookingsService } from '../../services/airBookingsService'
import type { CreateAirBookingRequest } from '../../services/airBookingsService'
import { customerService } from '../../services/customerService'
import type { Customer } from '../../services/customerService'
import { catalogService } from '../../services/catalogService'
import type { AircraftType, AirRoute } from '../../services/catalogService'
import { pricingService } from '../../services/pricingService'
import type { AirRule } from '../../services/pricingService'
import { useFormatMoney, useCurrencySymbol } from '../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────


function calcFareMinor(rule: AirRule, pax: number): number {
  const perSeat = rule.per_seat_base ?? 0
  const base = perSeat * Math.max(pax, rule.min_pax ?? 1)
  const surcharge = base * (rule.fuel_surcharge_pct / 100)
  const tax = (base + surcharge) * (rule.tax_gst_pct / 100)
  return Math.round((base + surcharge + tax) * 100)
}

// ── Steps ─────────────────────────────────────────────────────────────────────

type Step = 'customer' | 'flight' | 'service' | 'payment' | 'confirm'
const STEP_ORDER: Step[] = ['customer', 'flight', 'service', 'payment', 'confirm']
const STEP_LABELS: Record<Step, string> = {
  customer: 'Customer', flight: 'Flight', service: 'Service & fare',
  payment: 'Payment', confirm: 'Confirm',
}

const SUBTYPE_CATEGORY_MAP: Record<string, string> = {
  helicopter_shuttle:   'shuttle',
  helicopter_on_demand: 'on-demand',
  charter:              'charter',
  vip:                  'vip',
}

const PAYMENT_METHODS = ['card', 'wire', 'corporate_po', 'upi', 'wallet']

// ── Step pills ────────────────────────────────────────────────────────────────

function StepPills({ current }: { current: Step }) {
  const currentIdx = STEP_ORDER.indexOf(current)
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
      {STEP_ORDER.map((s, i) => {
        const done = i < currentIdx
        const active = s === current
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: done ? 'var(--accent)' : active ? 'var(--ink)' : 'var(--surface)',
              color: (done || active) ? 'var(--surface)' : 'var(--ink-3)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 10.5,
              border: `1px solid ${done ? 'var(--accent)' : active ? 'var(--ink)' : 'var(--rule-strong)'}`,
            }}>
              {done ? <Icon name="check" size={11} stroke={2.4} /> : i + 1}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: active ? 'var(--ink)' : done ? 'var(--accent)' : 'var(--ink-3)',
              fontWeight: active ? 500 : 400,
            }}>{STEP_LABELS[s]}</span>
            {i < STEP_ORDER.length - 1 && (
              <span style={{ width: 24, height: 1, background: 'var(--rule-strong)', marginLeft: 4 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AirAssistedBookingPage() {
  const fmtMinor = useFormatMoney()
  const sym = useCurrencySymbol()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [step, setStep] = useState<Step>('customer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // ── Customer step ─────────────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Flight step ───────────────────────────────────────────────────────────
  const [routeFrom, setRouteFrom] = useState('')
  const [routeTo, setRouteTo] = useState('')
  const [paxCount, setPaxCount] = useState(1)
  const [etdDate, setEtdDate] = useState('')
  const [etdTime, setEtdTime] = useState('09:00')
  const [selectedRoute, setSelectedRoute] = useState<AirRoute | null>(null)
  const [airRoutes, setAirRoutes] = useState<AirRoute[]>([])
  const [loadingRoutes, setLoadingRoutes] = useState(true)

  // ── Service step ──────────────────────────────────────────────────────────
  const [subtype, setSubtype] = useState('helicopter_shuttle')
  const [selectedAircraftType, setSelectedAircraftType] = useState<AircraftType | null>(null)
  const [aircraftTypes, setAircraftTypes] = useState<AircraftType[]>([])
  const [airRules, setAirRules] = useState<AirRule[]>([])
  const [loadingService, setLoadingService] = useState(true)

  // ── Payment step ──────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [internalReason, setInternalReason] = useState('')
  const [notes, setNotes] = useState('')

  // ── Load catalog + pricing data ───────────────────────────────────────────
  useEffect(() => {
    catalogService.listAirRoutes(false)
      .then(routes => setAirRoutes(routes))
      .catch(() => {})
      .finally(() => setLoadingRoutes(false))
  }, [])

  useEffect(() => {
    Promise.all([
      catalogService.listAircraftTypes(false),
      pricingService.listAirRules({ status: 'live', page_size: 100 }).then(r => r.items),
    ])
      .then(([types, rules]) => { setAircraftTypes(types); setAirRules(rules) })
      .catch(() => {})
      .finally(() => setLoadingService(false))
  }, [])

  // ── Customer search (debounced, Road-style) ───────────────────────────────
  const handleCustomerSearch = (val: string) => {
    setCustomerSearch(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (val.trim().length < 2) { setCustomerResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearchingCustomer(true)
      try {
        const res = await customerService.listCustomers({ search: val.trim(), per_page: 8 })
        setCustomerResults(res.items)
      } catch { setCustomerResults([]) }
      finally { setSearchingCustomer(false) }
    }, 300)
  }

  // ── Fare calculation from live rules ─────────────────────────────────────
  const matchedRule = airRules.find(r =>
    r.category === SUBTYPE_CATEGORY_MAP[subtype] &&
    (selectedRoute ? r.route_name?.toLowerCase().includes(selectedRoute.code.toLowerCase()) : true)
  ) ?? airRules.find(r => r.category === SUBTYPE_CATEGORY_MAP[subtype])

  const fareMinor = matchedRule ? calcFareMinor(matchedRule, paxCount) : 0

  // ── Filtered routes by subtype ────────────────────────────────────────────
  const filteredRoutes = airRoutes.filter(r => r.category === SUBTYPE_CATEGORY_MAP[subtype]?.replace('-', '_') || true)

  // ── Navigation ─────────────────────────────────────────────────────────────
  const canAdvance = (): boolean => {
    if (step === 'customer') return selectedCustomer !== null
    if (step === 'flight') return routeFrom.trim().length > 0 && routeTo.trim().length > 0 && etdDate.length > 0
    if (step === 'service') return subtype.length > 0
    if (step === 'payment') return internalReason.trim().length > 0
    return true
  }

  const goNext = () => {
    if (!canAdvance()) return
    const idx = STEP_ORDER.indexOf(step)
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1])
  }

  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step)
    if (idx > 0) setStep(STEP_ORDER[idx - 1])
  }

  const etdIso = etdDate && etdTime ? `${etdDate}T${etdTime}:00Z` : ''

  const handleConfirm = async () => {
    if (!selectedCustomer) return
    setSubmitting(true); setError('')
    try {
      const req: CreateAirBookingRequest = {
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        customer_phone: selectedCustomer.phone,
        service_subtype: subtype,
        route_from: selectedRoute ? selectedRoute.origin_code : routeFrom.trim(),
        route_to: selectedRoute ? selectedRoute.destination_code : routeTo.trim(),
        pax_count: paxCount,
        etd: etdIso,
        fare_estimate_minor: fareMinor,
        payment_method: paymentMethod,
        internal_reason: internalReason.trim(),
        notes: notes.trim() || undefined,
      }
      const booking = await airBookingsService.createAirBooking(req)
      navigate(`/bookings/air/${booking.id}`)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail ?? 'Failed to create booking')
      setSubmitting(false)
    }
  }

  const subtypeOptions = [
    { value: 'helicopter_shuttle',   label: 'Heli · Shuttle',   desc: 'Fixed-route shuttle' },
    { value: 'helicopter_on_demand', label: 'Heli · On-demand', desc: 'Point-to-point helicopter' },
    { value: 'charter',              label: 'Charter',           desc: 'Full aircraft charter' },
    { value: 'vip',                  label: 'VIP',               desc: 'Premium private charter' },
  ]

  return (
    <Shell
      activeId="bookings-a"
      breadcrumb="Operations · Air bookings · New"
      title="Assisted booking · Air"
      subtitle="Create an air booking on behalf of a customer"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/bookings/air')}>Cancel</button>
          {step === 'confirm' ? (
            <button className="btn sm accent" onClick={handleConfirm} disabled={submitting || !internalReason.trim()}>
              {submitting ? 'Creating…' : `Confirm booking${fareMinor ? ' · ' + fmtMinor(fareMinor) : ''}`}
            </button>
          ) : (
            <button className="btn sm accent" onClick={goNext} disabled={!canAdvance()}>
              Next <Icon name="chevRight" size={13} />
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 380px', minHeight: 'calc(100vh - 120px)' }}>

        {/* ── Form panel ── */}
        <div style={{ padding: isMobile ? '20px 16px' : '28px 36px', overflowY: 'auto' }}>
          <StepPills current={step} />

          {error && (
            <div style={{ marginBottom: 18, padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {/* ── STEP 1: Customer (Road-style) ── */}
          {step === 'customer' && (
            <div>
              <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 4 }}>Customer</div>
              <div className="t-meta" style={{ marginBottom: 20 }}>Search by name, phone, or email.</div>

              {selectedCustomer ? (
                <div style={{
                  padding: '14px 16px',
                  border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
                  borderRadius: 3, background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-sunk)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)', flexShrink: 0,
                  }}>
                    {selectedCustomer.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--ink)' }}>{selectedCustomer.name}</div>
                    <div className="t-meta" style={{ marginTop: 3 }}>
                      {selectedCustomer.phone}
                      {selectedCustomer.trips_count != null && ` · ${selectedCustomer.trips_count} rides`}
                      {selectedCustomer.rating != null && ` · ${selectedCustomer.rating.toFixed(2)} ★`}
                    </div>
                  </div>
                  <span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Loaded</span>
                  <button className="btn sm ghost" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); setCustomerResults([]) }}>
                    <Icon name="close" size={12} />Change
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <div className="input" style={{ flex: 1 }}>
                      <Icon name="search" size={14} className="icon" />
                      <input
                        placeholder="Search by name, phone, or email…"
                        value={customerSearch}
                        onChange={e => handleCustomerSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCustomerSearch(customerSearch)}
                        autoFocus
                      />
                    </div>
                    <button className="btn sm" onClick={() => handleCustomerSearch(customerSearch)} disabled={searchingCustomer}>
                      {searchingCustomer ? '…' : 'Search'}
                    </button>
                  </div>

                  {searchingCustomer && (
                    <div style={{ padding: '10px 0', fontSize: 12.5, color: 'var(--ink-3)' }}>Searching…</div>
                  )}

                  {customerResults.length > 0 && (
                    <div style={{ border: '1px solid var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                      {customerResults.map((c, i) => (
                        <div
                          key={c.id}
                          onClick={() => { setSelectedCustomer(c); setCustomerResults([]); setCustomerSearch('') }}
                          style={{
                            padding: '10px 14px', cursor: 'pointer',
                            borderBottom: i < customerResults.length - 1 ? '1px solid var(--rule)' : 'none',
                            display: 'flex', alignItems: 'center', gap: 12,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-sunk)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', flexShrink: 0,
                          }}>
                            {c.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, color: 'var(--ink)' }}>{c.name}</div>
                            <div className="t-meta" style={{ marginTop: 2 }}>
                              {c.phone}
                              {c.trips_count != null && ` · ${c.trips_count} rides`}
                              {c.rating != null && ` · ${c.rating.toFixed(2)} ★`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!searchingCustomer && customerSearch.length >= 2 && customerResults.length === 0 && (
                    <div style={{ padding: '12px 0', fontSize: 12.5, color: 'var(--ink-3)' }}>
                      No customers found. Try a different search.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Flight ── */}
          {step === 'flight' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 4 }}>Flight details</div>
                <div className="t-meta">Select a saved air route or enter ICAO / helipad codes manually.</div>
              </div>

              {/* Route picker */}
              {loadingRoutes ? (
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Loading routes…</div>
              ) : filteredRoutes.length > 0 && (
                <div>
                  <div className="field-label" style={{ marginBottom: 8 }}>Select route</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                    {filteredRoutes.map(r => (
                      <div
                        key={r.id}
                        onClick={() => {
                          setSelectedRoute(r)
                          setRouteFrom(r.origin_code)
                          setRouteTo(r.destination_code)
                        }}
                        style={{
                          padding: '10px 14px', cursor: 'pointer',
                          border: `1px solid ${selectedRoute?.id === r.id ? 'var(--accent)' : 'var(--rule)'}`,
                          background: selectedRoute?.id === r.id ? 'var(--accent-soft-2)' : 'var(--surface)',
                          borderRadius: 3, display: 'flex', alignItems: 'center', gap: 14,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                            {r.origin_code} → {r.destination_code}
                          </div>
                          <div className="t-meta" style={{ marginTop: 2 }}>
                            {r.origin_name} → {r.destination_name} · {r.distance_nm} nm · {r.block_time_minutes} min
                          </div>
                        </div>
                        {selectedRoute?.id === r.id && <Icon name="check" size={14} style={{ color: 'var(--accent)' }} />}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-3)' }}>
                    Or enter manually below to override
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div className="field">
                  <label className="field-label">Origin (ICAO / helipad) *</label>
                  <input className="input" value={routeFrom} onChange={e => { setRouteFrom(e.target.value); setSelectedRoute(null) }} placeholder="e.g. VOBG · BLR-PAD" />
                </div>
                <div className="field">
                  <label className="field-label">Destination *</label>
                  <input className="input" value={routeTo} onChange={e => { setRouteTo(e.target.value); setSelectedRoute(null) }} placeholder="e.g. VIIJ · MYS-PAD" />
                </div>
                <div className="field">
                  <label className="field-label">Departure date *</label>
                  <input className="input" type="date" value={etdDate} onChange={e => setEtdDate(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">Departure time (local)</label>
                  <input className="input" type="time" value={etdTime} onChange={e => setEtdTime(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">Passengers</label>
                  <input className="input" type="number" min={1} max={50} value={paxCount}
                    onChange={e => setPaxCount(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Service & fare ── */}
          {step === 'service' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 4 }}>Service type</div>
                <div className="t-meta">Fare is computed from live pricing rules.</div>
              </div>

              {/* Service subtype cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {subtypeOptions.map(s => {
                  const rule = airRules.find(r => r.category === SUBTYPE_CATEGORY_MAP[s.value])
                  const est = rule ? calcFareMinor(rule, paxCount) : null
                  return (
                    <div
                      key={s.value}
                      onClick={() => setSubtype(s.value)}
                      style={{
                        padding: '16px', borderRadius: 3, cursor: 'pointer', position: 'relative' as const,
                        border: `1px solid ${s.value === subtype ? 'var(--accent)' : 'var(--rule)'}`,
                        background: s.value === subtype ? 'var(--accent-soft-2)' : 'var(--surface)',
                      }}
                    >
                      {s.value === subtype && (
                        <span style={{
                          position: 'absolute', top: -8, right: 12,
                          background: 'var(--accent)', color: '#fff',
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                          textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 2,
                        }}>Selected</span>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{s.label}</span>
                        <Icon name="plane" size={15} style={{ color: 'var(--ink-3)' }} />
                      </div>
                      <div className="t-meta" style={{ marginBottom: 8 }}>{s.desc}</div>
                      {loadingService ? (
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Loading fare…</div>
                      ) : est ? (
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink)' }}>
                          {fmtMinor(est)}
                          <span style={{ fontSize: 11.5, fontFamily: 'var(--font-sans)', color: 'var(--ink-3)', marginLeft: 6 }}>est.</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>No live rule · quote on request</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Aircraft type selector */}
              {aircraftTypes.length > 0 && (
                <div>
                  <div className="field-label" style={{ marginBottom: 8 }}>Aircraft type preference — optional</div>
                  <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                    <select
                      value={selectedAircraftType?.id ?? ''}
                      onChange={e => setSelectedAircraftType(aircraftTypes.find(t => t.id === e.target.value) ?? null)}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', height: 36, fontSize: 12.5, cursor: 'pointer' }}
                    >
                      <option value="">Any aircraft type</option>
                      {aircraftTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name} · {t.category}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {matchedRule && (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, padding: '12px 14px' }}>
                  <div className="t-label" style={{ marginBottom: 8 }}>Pricing rule · {matchedRule.rule_code}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {[
                        ['Per seat base', matchedRule.per_seat_base != null ? `${sym}${matchedRule.per_seat_base}` : '—'],
                        ['Min pax', matchedRule.min_pax ?? '—'],
                        ['Fuel surcharge', `${matchedRule.fuel_surcharge_pct}%`],
                        ['GST', `${matchedRule.tax_gst_pct}%`],
                        [`Est. fare (${paxCount} pax)`, fmtMinor(fareMinor)],
                      ].map(([k, v]) => (
                        <tr key={k as string}>
                          <td style={{ padding: '4px 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{k}</td>
                          <td style={{ padding: '4px 0', fontSize: 12.5, color: 'var(--ink)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Payment ── */}
          {step === 'payment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 4 }}>Payment & reason</div>
              </div>

              <div>
                <div className="field-label" style={{ marginBottom: 8 }}>Payment method</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {PAYMENT_METHODS.map(m => (
                    <div
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      style={{
                        padding: '12px 14px', borderRadius: 3, cursor: 'pointer', fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)',
                        border: `1px solid ${m === paymentMethod ? 'var(--accent)' : 'var(--rule)'}`,
                        background: m === paymentMethod ? 'var(--accent-soft-2)' : 'var(--surface)',
                      }}
                    >
                      {m === paymentMethod && <Icon name="check" size={12} stroke={2.4} style={{ color: 'var(--accent)' }} />}
                      {m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="field-label">
                  Internal reason *{' '}
                  <span style={{ color: 'var(--danger)', fontWeight: 400, fontSize: 11.5 }}>required for assisted bookings</span>
                </label>
                <input
                  className="input" value={internalReason} onChange={e => setInternalReason(e.target.value)}
                  placeholder="e.g. Customer called support — app not loading"
                />
              </div>

              <div className="field">
                <label className="field-label">Admin notes — optional</label>
                <textarea
                  className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any special instructions or context…"
                  style={{ resize: 'vertical', minHeight: 72, padding: '8px 10px', fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule-strong))', borderRadius: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warn)', marginBottom: 6 }}>
                  <Icon name="alert" size={13} />
                  <span className="t-label" style={{ padding: 0, color: 'var(--warn)' }}>Audit · assisted booking</span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-2)' }}>
                  This booking will be flagged as admin-assisted and linked to your account in the audit log.
                  The internal reason is mandatory and will be visible to compliance.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 5: Confirm ── */}
          {step === 'confirm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 4 }}>Review & confirm</div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                {[
                  { label: 'Customer',    value: `${selectedCustomer?.name} · ${selectedCustomer?.phone ?? ''}` },
                  { label: 'Service',     value: subtypeOptions.find(s => s.value === subtype)?.label ?? subtype },
                  { label: 'Route',       value: `${routeFrom} → ${routeTo}` },
                  { label: 'Passengers',  value: String(paxCount) },
                  { label: 'ETD',         value: etdDate ? `${etdDate} ${etdTime}` : '—' },
                  { label: 'Payment',     value: paymentMethod.replace(/_/g, ' ') },
                  { label: 'Fare est.',   value: fareMinor ? fmtMinor(fareMinor) : 'Quote on request' },
                  { label: 'Reason',      value: internalReason },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', padding: '10px 16px', borderBottom: '1px solid var(--rule)', gap: 16 }}>
                    <span style={{ width: 130, fontSize: 12.5, color: 'var(--ink-3)', flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            {step !== 'customer' && (
              <button className="btn sm ghost" onClick={goBack}><Icon name="chevLeft" size={13} /> Back</button>
            )}
            {step !== 'confirm' ? (
              <button className="btn sm accent" onClick={goNext} disabled={!canAdvance()}>
                Next <Icon name="chevRight" size={13} />
              </button>
            ) : (
              <button className="btn sm accent" onClick={handleConfirm} disabled={submitting || !internalReason.trim()}>
                {submitting ? 'Creating…' : 'Confirm booking'}
              </button>
            )}
          </div>
        </div>

        {/* ── Summary rail ── */}
        {!isMobile && (
          <aside style={{ background: 'var(--surface)', borderLeft: '1px solid var(--rule)', padding: '28px 24px', position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
            <div className="t-label" style={{ marginBottom: 10 }}>Summary</div>
            <h3 style={{ margin: '0 0 20px', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>Air booking</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedCustomer && <SummaryRow label="Customer" value={selectedCustomer.name} />}
              {subtype && <SummaryRow label="Service" value={subtypeOptions.find(s => s.value === subtype)?.label ?? subtype} />}
              {routeFrom && <SummaryRow label="From" value={routeFrom} />}
              {routeTo && <SummaryRow label="To" value={routeTo} />}
              {etdDate && <SummaryRow label="ETD" value={`${etdDate} ${etdTime}`} />}
              <SummaryRow label="Pax" value={String(paxCount)} />
              {fareMinor > 0 && <SummaryRow label="Fare estimate" value={fmtMinor(fareMinor)} highlight />}
              {paymentMethod && <SummaryRow label="Payment" value={paymentMethod.replace(/_/g, ' ')} />}
            </div>

            {internalReason && (
              <>
                <div style={{ height: 1, background: 'var(--rule)', margin: '20px 0' }} />
                <div className="t-label" style={{ marginBottom: 6 }}>Internal reason</div>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-2)' }}>{internalReason}</p>
              </>
            )}
          </aside>
        )}
      </div>
    </Shell>
  )
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{label}</span>
      <span style={{
        fontSize: highlight ? 20 : 13, textAlign: 'right',
        fontFamily: highlight ? 'var(--font-serif)' : undefined,
        color: highlight ? 'var(--ink)' : 'var(--ink-2)',
      }}>{value}</span>
    </div>
  )
}
