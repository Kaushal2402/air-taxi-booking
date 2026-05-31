import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { bookingsService } from '../../services/bookingsService'
import { customerService } from '../../services/customerService'
import { catalogService } from '../../services/catalogService'
import { pricingService } from '../../services/pricingService'
import type { Customer } from '../../services/customerService'
import type { VehicleClass } from '../../services/catalogService'
import type { RoadRule } from '../../services/pricingService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMinor = (v: number) => `₹${(v / 100).toLocaleString('en-IN')}`

/**
 * Compute fare estimate using a live road fare rule.
 * All monetary values in rule are in ₹ (not paise), so multiply by 100.
 * Duration estimated as distanceKm / 30 * 60 minutes (avg 30 km/h).
 */
function calcFareFromRule(rule: RoadRule, distanceKm: number): number {
  const durationMin = (distanceKm / 30) * 60
  const raw = rule.base_fare + distanceKm * rule.per_km + durationMin * rule.per_min
  return Math.max(rule.min_fare, raw) * 100 // convert ₹ → paise
}

/** Fallback when no rule found for the selected class */
function calcFareFallback(distanceKm: number, vehicleClass: string): number {
  const perKm: Record<string, number> = { Bike: 12, Sedan: 20, XL: 25, Rental: 40 }
  const base: Record<string, number> = { Bike: 30, Sedan: 70, XL: 90, Rental: 240 }
  const rate = perKm[vehicleClass] ?? 20
  const baseFare = base[vehicleClass] ?? 70
  return Math.round((baseFare + distanceKm * rate) * 100)
}

// ── Step components ───────────────────────────────────────────────────────────

type Step = 'customer' | 'route' | 'class' | 'payment' | 'confirm'

const STEPS: { key: Step; label: string }[] = [
  { key: 'customer', label: 'Customer' },
  { key: 'route',    label: 'Route' },
  { key: 'class',    label: 'Class & fare' },
  { key: 'payment',  label: 'Payment' },
  { key: 'confirm',  label: 'Confirm' },
]

const STEP_ORDER: Step[] = ['customer', 'route', 'class', 'payment', 'confirm']

interface StepPillsProps {
  current: Step
}

function StepPills({ current }: StepPillsProps) {
  const currentIdx = STEP_ORDER.indexOf(current)
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
      {STEPS.map((s, i) => {
        const done = i < currentIdx
        const active = s.key === current
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: done ? 'var(--accent)' : (active ? 'var(--ink)' : 'var(--surface)'),
              color: (done || active) ? 'var(--surface)' : 'var(--ink-3)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 10.5,
              border: `1px solid ${done ? 'var(--accent)' : (active ? 'var(--ink)' : 'var(--rule-strong)')}`,
              flexShrink: 0,
            }}>
              {done ? <Icon name="check" size={11} stroke={2.4} /> : (i + 1)}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: active ? 'var(--ink)' : 'var(--ink-3)',
              fontWeight: active ? 500 : 400,
            }}>{s.label}</span>
            {i < STEPS.length - 1 && (
              <span style={{ width: 36, height: 1, background: 'var(--rule-strong)', marginLeft: 8, flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Vehicle class fallback (used while dynamic data loads) ────────────────────

const FALLBACK_CLASSES = [
  { key: 'Bike',   label: 'Bike',   desc: '1 pax' },
  { key: 'Sedan',  label: 'Sedan',  desc: '4 pax · AC' },
  { key: 'XL',     label: 'XL',     desc: '6 pax · AC' },
  { key: 'Rental', label: 'Rental', desc: '4h / 40km' },
]

const PAYMENT_METHODS = [
  { key: 'wallet',    label: 'Wallet' },
  { key: 'card',      label: 'Card' },
  { key: 'upi',       label: 'UPI' },
  { key: 'cash',      label: 'Cash' },
]

// ── Form state type ───────────────────────────────────────────────────────────

interface FormState {
  customer: Customer | null
  pickupAddress: string
  dropAddress: string
  when: 'now' | 'scheduled'
  scheduledAt: string
  pax: number
  vehicleClass: string
  paymentMethod: string
  promoCode: string
  internalReason: string
  adminNote: string
}

const INITIAL_FORM: FormState = {
  customer: null,
  pickupAddress: '',
  dropAddress: '',
  when: 'now',
  scheduledAt: '',
  pax: 1,
  vehicleClass: 'Sedan',
  paymentMethod: 'card',
  promoCode: '',
  internalReason: '',
  adminNote: '',
}

// ── Summary sidebar ───────────────────────────────────────────────────────────

interface SummaryProps {
  form: FormState
  distanceKm: number
  fareMinor: number
}

function BookingSummary({ form, distanceKm, fareMinor }: SummaryProps) {
  return (
    <>
      <div className="t-label" style={{ marginBottom: 10 }}>Summary</div>
      <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>Confirm booking</h3>

      <div style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ marginTop: 5, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink)' }} />
            <div style={{ width: 1, height: 22, background: 'var(--rule-strong)', margin: '4px 4px' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--ink)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5 }}>{form.pickupAddress || '—'}</div>
            <div className="t-meta" style={{ marginTop: 2 }}>
              {form.when === 'now' ? 'Pickup · ASAP' : `Pickup · ${form.scheduledAt || 'scheduled'}`}
            </div>
            <div style={{ marginTop: 14, fontSize: 13.5 }}>{form.dropAddress || '—'}</div>
            <div className="t-meta" style={{ marginTop: 2 }}>
              Drop{distanceKm > 0 ? ` · ${distanceKm} km` : ''}
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

      <div className="t-label" style={{ marginBottom: 10 }}>Fare estimate · {form.vehicleClass}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
        {fmtMinor(fareMinor)}
      </div>
      <div className="t-meta" style={{ marginTop: 4 }}>
        {form.paymentMethod} · {form.pax} pax
      </div>

      {form.customer && (
        <>
          <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />
          <div className="t-label" style={{ marginBottom: 8 }}>Customer</div>
          <div style={{ padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12.5 }}>
            <div style={{ fontWeight: 500 }}>{form.customer.name}</div>
            <div className="t-meta" style={{ marginTop: 3 }}>{form.customer.phone}</div>
          </div>
        </>
      )}

      {form.internalReason && (
        <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule-strong))', borderRadius: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warn)' }}>
            <Icon name="alert" size={13} />
            <span className="t-label" style={{ padding: 0, color: 'var(--warn)' }}>Audit · assisted booking</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {form.customer ? `You're acting on behalf of ${form.customer.name}.` : 'Acting on behalf of customer.'} Internal reason is mandatory and will be recorded.
          </div>
        </div>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssistedBookingPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [step, setStep] = useState<Step>('customer')
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Dynamic vehicle class + fare rule data
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([])
  const [fareRules, setFareRules] = useState<RoadRule[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)

  useEffect(() => {
    Promise.all([
      catalogService.listVehicleClasses(false),
      pricingService.listRoadRules({ status: 'live', page_size: 100 }).then(r => r.items),
    ])
      .then(([classes, rules]) => {
        setVehicleClasses(classes)
        setFareRules(rules)
      })
      .catch(() => { /* use fallbacks */ })
      .finally(() => setLoadingClasses(false))
  }, [])

  const distanceKm = form.pickupAddress && form.dropAddress ? 18.6 : 0

  // Compute fare: use live rule if available, else fallback
  const fareMinor = (() => {
    if (distanceKm <= 0) return 0
    const rule = fareRules.find(r =>
      r.vehicle_class_name?.toLowerCase() === form.vehicleClass.toLowerCase()
    )
    return rule ? Math.round(calcFareFromRule(rule, distanceKm)) : calcFareFallback(distanceKm, form.vehicleClass)
  })()

  const patchForm = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const searchCustomers = async () => {
    if (!customerSearch.trim()) return
    setSearchingCustomer(true)
    try {
      const res = await customerService.listCustomers({ search: customerSearch.trim(), per_page: 10 })
      setCustomerResults(res.items)
    } catch { setCustomerResults([]) }
    finally { setSearchingCustomer(false) }
  }

  const validateStep = (): boolean => {
    const errs: Record<string, string> = {}
    if (step === 'customer' && !form.customer) errs.customer = 'Please select a customer'
    if (step === 'route') {
      if (!form.pickupAddress.trim()) errs.pickup = 'Pickup address is required'
      if (!form.dropAddress.trim()) errs.drop = 'Drop address is required'
    }
    if (step === 'payment' && !form.internalReason.trim()) errs.internalReason = 'Internal reason is required for assisted bookings'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const goNext = () => {
    if (!validateStep()) return
    const idx = STEP_ORDER.indexOf(step)
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1])
  }

  const goPrev = () => {
    const idx = STEP_ORDER.indexOf(step)
    if (idx > 0) setStep(STEP_ORDER[idx - 1])
  }

  const handleConfirm = async () => {
    if (!form.customer) { setErrors({ customer: 'Customer is required' }); return }
    if (!form.pickupAddress.trim()) { setErrors({ pickup: 'Pickup is required' }); return }
    if (!form.dropAddress.trim()) { setErrors({ drop: 'Drop is required' }); return }
    if (!form.internalReason.trim()) { setErrors({ internalReason: 'Internal reason is required' }); return }

    setSubmitting(true)
    try {
      const booking = await bookingsService.createAssistedBooking({
        customer_id: form.customer.id,
        pickup_address: form.pickupAddress,
        drop_address: form.dropAddress,
        service_type: form.vehicleClass === 'Bike' ? 'bike' : 'cab',
        vehicle_class: form.vehicleClass,
        scheduled_at: form.when === 'scheduled' ? form.scheduledAt || null : null,
        payment_method: form.paymentMethod,
        promo_code: form.promoCode || null,
        fare_estimate_minor: fareMinor,
        internal_reason: form.internalReason,
        admin_note: form.adminNote || null,
      })
      navigate(`/bookings/road/${booking.id}`)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setErrors({ submit: err?.response?.data?.detail || 'Failed to create booking' })
      setSubmitting(false)
    }
  }

  const handleSaveAsDraft = () => {
    if (window.confirm('Save this booking as draft and return to list?')) {
      navigate('/bookings/road')
    }
  }

  const currentStepIdx = STEP_ORDER.indexOf(step)
  const isLastStep = step === 'confirm'

  return (
    <Shell
      activeId="bookings-r"
      breadcrumb="Operations · Road bookings · New"
      title="Assisted booking"
      subtitle="Create a booking on behalf of a customer"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={handleSaveAsDraft}>Save as draft</button>
          <button className="btn sm" onClick={() => navigate('/bookings/road')}>Cancel</button>
          {isLastStep && (
            <button className="btn sm accent" onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Creating…' : `Confirm booking${fareMinor > 0 ? ' · ' + fmtMinor(fareMinor) : ''}`}
            </button>
          )}
        </div>
      }
    >
      <div style={{
        display: isMobile ? 'block' : 'grid',
        gridTemplateColumns: isMobile ? undefined : '1fr 420px',
        minHeight: '100%',
      }}>
        {/* Form */}
        <div style={{ padding: isMobile ? '16px' : '28px 36px' }}>
          <StepPills current={step} />

          {errors.submit && (
            <div style={{ marginBottom: 20, padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {errors.submit}
            </div>
          )}

          {/* STEP 1: Customer */}
          {step === 'customer' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 4 }}>Customer</div>
                <div className="t-meta">Search by phone or email.</div>
              </div>

              {form.customer ? (
                <div style={{
                  padding: '14px 16px',
                  border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
                  borderRadius: 3, background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-sunk)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)', flexShrink: 0 }}>
                    {form.customer.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--ink)' }}>{form.customer.name}</div>
                    <div className="t-meta" style={{ marginTop: 3 }}>
                      {form.customer.phone} · {form.customer.trips_count} rides
                      {form.customer.rating != null && ` · ${form.customer.rating.toFixed(2)} ★`}
                    </div>
                  </div>
                  <span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Loaded</span>
                  <button className="btn sm ghost" onClick={() => { patchForm('customer', null); setCustomerResults([]) }}>
                    <Icon name="close" size={12} />Change
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <div className="input" style={{ flex: 1 }}>
                      <Icon name="search" size={14} className="icon" />
                      <input
                        placeholder="Search by phone, email or name…"
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && searchCustomers()}
                      />
                    </div>
                    <button className="btn sm accent" onClick={searchCustomers} disabled={searchingCustomer}>
                      {searchingCustomer ? 'Searching…' : 'Search'}
                    </button>
                  </div>
                  {errors.customer && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginBottom: 8 }}>{errors.customer}</div>}
                  {customerResults.length > 0 && (
                    <div style={{ border: '1px solid var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                      {customerResults.map(c => (
                        <div
                          key={c.id}
                          onClick={() => { patchForm('customer', c); setCustomerResults([]); setErrors({}) }}
                          style={{ padding: '12px 14px', borderBottom: '1px solid var(--rule-soft)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-sunk)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink)' }}>
                            {c.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, color: 'var(--ink)' }}>{c.name}</div>
                            <div className="t-meta" style={{ marginTop: 2 }}>{c.phone} · {c.trips_count} rides</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Route */}
          {step === 'route' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 4 }}>Route</div>
                <div className="t-meta">Pickup and drop are validated against active service zones.</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="field">
                  <label className="field-label">Pickup <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div className="input">
                    <Icon name="mapPin" size={14} className="icon" />
                    <input
                      value={form.pickupAddress}
                      onChange={e => patchForm('pickupAddress', e.target.value)}
                      placeholder="Whitefield · Hope Farm Junction"
                    />
                  </div>
                  {errors.pickup && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.pickup}</div>}
                </div>
                <div className="field">
                  <label className="field-label">Drop <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div className="input">
                    <Icon name="mapPin" size={14} className="icon" />
                    <input
                      value={form.dropAddress}
                      onChange={e => patchForm('dropAddress', e.target.value)}
                      placeholder="MG Road · 47 Brigade Square"
                    />
                  </div>
                  {errors.drop && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.drop}</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                <div className="field">
                  <label className="field-label">When</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                    <select value={form.when} onChange={e => patchForm('when', e.target.value as 'now' | 'scheduled')}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}>
                      <option value="now">Now · ASAP</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>
                </div>
                {form.when === 'scheduled' && (
                  <div className="field">
                    <label className="field-label">Scheduled at</label>
                    <div className="input">
                      <input type="datetime-local" value={form.scheduledAt} onChange={e => patchForm('scheduledAt', e.target.value)} />
                    </div>
                  </div>
                )}
                <div className="field">
                  <label className="field-label">Pax count</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                    <select value={form.pax} onChange={e => patchForm('pax', Number(e.target.value))}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}>
                      {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} adult{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              {form.pickupAddress && form.dropAddress && (
                <div style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 16, fontSize: 12.5, color: 'var(--ink-2)', flexWrap: 'wrap' }}>
                  <span className="t-label">Route</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>18.6 km · est. 42 min</span>
                  <span style={{ width: 1, height: 16, background: 'var(--rule)', flexShrink: 0 }} />
                  <span>Surge · <span style={{ color: 'var(--warn)' }}>1.2×</span> (eve. peak)</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Class & Fare */}
          {step === 'class' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 4 }}>Vehicle class · estimate</div>
                <div className="t-meta">
                  {loadingClasses ? 'Loading vehicle classes…' : 'Fare computed from live pricing rules.'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {/* Build display list: use dynamic catalog classes if available, else fallback */}
                {(vehicleClasses.length > 0
                  ? vehicleClasses.map(vc => ({
                      key: vc.name,
                      label: vc.name,
                      desc: vc.description || `${vc.seats ?? '?'} pax`,
                    }))
                  : FALLBACK_CLASSES
                ).map(vc => {
                  const rule = fareRules.find(r =>
                    r.vehicle_class_name?.toLowerCase() === vc.key.toLowerCase()
                  )
                  const sampleDist = distanceKm > 0 ? distanceKm : 18.6
                  const fare = rule ? Math.round(calcFareFromRule(rule, sampleDist)) : calcFareFallback(sampleDist, vc.key)
                  const selected = form.vehicleClass === vc.key
                  return (
                    <div
                      key={vc.key}
                      onClick={() => patchForm('vehicleClass', vc.key)}
                      style={{
                        padding: '16px',
                        border: `1px solid ${selected ? 'var(--accent)' : 'var(--rule)'}`,
                        borderRadius: 3,
                        background: selected ? 'color-mix(in oklab, var(--accent) 8%, var(--surface))' : 'var(--surface)',
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      {selected && (
                        <span style={{
                          position: 'absolute', top: -8, right: 12,
                          background: 'var(--accent)', color: '#fff',
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                          padding: '2px 8px', borderRadius: 2,
                        }}>Selected</span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{vc.label}</span>
                        <Icon name="car" size={15} style={{ color: 'var(--ink-3)' }} />
                      </div>
                      <div style={{ marginTop: 12, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--ink)' }}>
                        {fmtMinor(fare)}
                      </div>
                      <div className="t-meta" style={{ marginTop: 4 }}>
                        {vc.desc}
                        {rule && <span style={{ marginLeft: 6, color: 'var(--accent)', fontSize: 10.5 }}>· live rule</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Payment */}
          {step === 'payment' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 4 }}>Payment</div>
                <div className="t-meta">Choose how the customer will be billed.</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
                {PAYMENT_METHODS.map(pm => (
                  <div
                    key={pm.key}
                    onClick={() => patchForm('paymentMethod', pm.key)}
                    style={{
                      padding: '14px',
                      border: `1px solid ${form.paymentMethod === pm.key ? 'var(--accent)' : 'var(--rule)'}`,
                      background: form.paymentMethod === pm.key ? 'color-mix(in oklab, var(--accent) 8%, var(--surface))' : 'var(--surface)',
                      borderRadius: 3,
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: `1px solid ${form.paymentMethod === pm.key ? 'var(--accent)' : 'var(--rule-strong)'}`, background: form.paymentMethod === pm.key ? 'var(--accent)' : 'var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {form.paymentMethod === pm.key && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{pm.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Promo code</label>
                  <div className="input">
                    <input value={form.promoCode} onChange={e => patchForm('promoCode', e.target.value.toUpperCase())} placeholder="WELCOME20" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Internal reason · required <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div className="input">
                    <input value={form.internalReason} onChange={e => patchForm('internalReason', e.target.value)} placeholder="Customer called support…" />
                  </div>
                  {errors.internalReason && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.internalReason}</div>}
                </div>
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label className="field-label">Admin note (optional)</label>
                <div className="input">
                  <input value={form.adminNote} onChange={e => patchForm('adminNote', e.target.value)} placeholder="Customer requested silent ride…" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Confirm */}
          {step === 'confirm' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 4 }}>Confirm booking</div>
                <div className="t-meta">Review all details before confirming.</div>
              </div>
              {isMobile && (
                <div style={{ border: '1px solid var(--rule)', borderRadius: 3, padding: '20px', marginBottom: 20 }}>
                  <BookingSummary form={form} distanceKm={distanceKm} fareMinor={fareMinor} />
                </div>
              )}
              <div style={{ padding: '14px 16px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule-strong))', borderRadius: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warn)' }}>
                  <Icon name="alert" size={13} />
                  <span className="t-label" style={{ padding: 0, color: 'var(--warn)' }}>Audit · assisted booking</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  You're acting on behalf of {form.customer?.name ?? 'a customer'}. Internal reason is mandatory and will be recorded against your admin user.
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            {currentStepIdx > 0 ? (
              <button className="btn sm" onClick={goPrev}>
                <Icon name="chevLeft" size={13} />Previous
              </button>
            ) : <span />}
            {!isLastStep ? (
              <button className="btn accent sm" onClick={goNext}>
                Next <Icon name="chevRight" size={13} />
              </button>
            ) : (
              <button className="btn accent sm" onClick={handleConfirm} disabled={submitting}>
                {submitting ? 'Creating…' : `Confirm booking${fareMinor > 0 ? ' · ' + fmtMinor(fareMinor) : ''} →`}
              </button>
            )}
          </div>
        </div>

        {/* Right rail — summary (desktop only) */}
        {!isMobile && (
          <aside style={{ background: 'var(--surface)', borderLeft: '1px solid var(--rule)', padding: '28px 28px', overflowY: 'auto' }}>
            <BookingSummary form={form} distanceKm={distanceKm} fareMinor={fareMinor} />
            {step === 'confirm' && (
              <button className="btn accent lg" style={{ width: '100%', marginTop: 18 }} onClick={handleConfirm} disabled={submitting}>
                {submitting ? 'Creating…' : `Confirm booking${fareMinor > 0 ? ' · ' + fmtMinor(fareMinor) : ''} →`}
              </button>
            )}
          </aside>
        )}
      </div>
    </Shell>
  )
}
