import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { airBookingsService } from '../../services/airBookingsService'
import type {
  AirBookingDetail,
  AirBookingStatus,
  CancelPreviewResponse,
  ManifestResponse,
} from '../../services/airBookingsService'
import { operatorService } from '../../services/operatorService'
import type { Operator, Aircraft } from '../../services/operatorService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMinor = (v: number) => `₹${(v / 100).toLocaleString('en-IN')}`

function statusBadge(s: AirBookingStatus) {
  const map: Record<string, string> = {
    'Confirmed': 'ok',
    'Boarding': 'info',
    'Departed': 'ok',
    'Arrived': 'pending',
    'Completed': 'pending',
    'Quote shared': 'warn',
    'Manifest locked': 'info',
    'Requested': 'warn',
    'Cancelled': 'danger',
    'Refunded': 'info',
    'Rescheduled': 'info',
  }
  const tone = map[s] || 'pending'
  return (
    <span className={`badge ${tone}`}>
      <span className={`dot ${tone}`} />
      {s}
    </span>
  )
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
  } catch { return iso }
}

// ── Status advance config ─────────────────────────────────────────────────────

const STATUS_TRANSITIONS: Record<string, string> = {
  'Requested': 'Confirmed',
  'Quote shared': 'Confirmed',
  'Confirmed': 'Manifest locked',
  'Manifest locked': 'Boarding',
  'Boarding': 'Departed',
  'Departed': 'Arrived',
  'Arrived': 'Completed',
}

// ── Cancel/Reschedule Modal ───────────────────────────────────────────────────

interface CancelModalProps {
  bookingId: string
  booking: AirBookingDetail
  preview: CancelPreviewResponse | null
  loadingPreview: boolean
  onClose: () => void
  onSuccess: () => void
}

function CancelRescheduleModal({ bookingId, booking, preview, loadingPreview, onClose, onSuccess }: CancelModalProps) {
  const [mode, setMode] = useState<'cancel' | 'reschedule'>('cancel')
  const [reason, setReason] = useState('')
  const [forceMajeure, setForceMajeure] = useState(false)
  const [refundDest, setRefundDest] = useState<'original' | 'wallet' | 'wire'>('original')
  const [newEtd, setNewEtd] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const CANCEL_TIERS = [
    { l: '> 48h before', pct: 0 },
    { l: '24–48h before', pct: 25 },
    { l: '4–24h before', pct: 50 },
    { l: '< 4h before / no-show', pct: 100 },
  ]

  const currentTierPct = preview?.fee_pct ?? null

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'cancel') {
        await airBookingsService.cancelBooking(bookingId, {
          reason,
          force_majeure: forceMajeure,
          refund_destination: refundDest,
        })
      } else {
        await airBookingsService.rescheduleBooking(bookingId, {
          new_etd: newEtd,
          reason: rescheduleReason,
        })
      }
      onSuccess()
    } catch {
      setError('Action failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(15,13,10,0.55)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px',
      overflowY: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 920,
        background: 'var(--surface)',
        border: '1px solid var(--rule-strong)',
        boxShadow: 'var(--shadow-pop)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 4, flexShrink: 0,
            background: 'var(--warn-soft)', color: 'var(--warn)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid color-mix(in oklab, var(--warn) 24%, var(--rule-strong))',
          }}>
            <Icon name="clock" size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="t-label">{booking.booking_ref} · {booking.service_label} · {booking.pax_count} pax</div>
            <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, letterSpacing: '-0.018em' }}>
              Cancel or reschedule?
            </h2>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-3)' }}>
              {booking.route_from} → {booking.route_to} · {booking.customer_name ?? '—'} · {booking.operator_name ?? '—'} · ETD{' '}
              <span style={{ color: 'var(--ink-2)' }}>{fmtDateTime(booking.etd)}</span>
            </div>
          </div>
          <button className="btn ghost icon sm" onClick={onClose}>
            <Icon name="close" size={14} />
          </button>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--rule)' }}>
          {[
            { key: 'cancel' as const, l: 'Cancel booking', desc: 'Apply cancellation tier and refund per policy.' },
            { key: 'reschedule' as const, l: 'Reschedule', desc: 'Pick a new slot · manifest re-locks · fee may apply.' },
          ].map((o, i) => (
            <div
              key={o.key}
              onClick={() => setMode(o.key)}
              style={{
                padding: '20px 28px',
                borderRight: i === 0 ? '1px solid var(--rule)' : 'none',
                borderBottom: '2px solid ' + (mode === o.key ? 'var(--accent)' : 'transparent'),
                background: mode === o.key ? 'var(--accent-soft-2)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '1px solid ' + (mode === o.key ? 'var(--accent)' : 'var(--rule-strong)'),
                  background: mode === o.key ? 'var(--accent)' : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {mode === o.key && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                </span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)' }}>{o.l}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--ink-3)' }}>{o.desc}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
          {mode === 'cancel' ? (
            <>
              {/* Left: tiers + reason */}
              <div>
                <div className="t-label" style={{ marginBottom: 12 }}>Cancellation policy</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {CANCEL_TIERS.map(t => {
                    const isActive = currentTierPct === t.pct
                    return (
                      <div key={t.l} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 14px',
                        border: '1px solid ' + (isActive ? 'var(--accent)' : 'var(--rule)'),
                        background: isActive ? 'var(--accent-soft-2)' : 'var(--surface)',
                        borderRadius: 3,
                      }}>
                        <span style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: '1px solid ' + (isActive ? 'var(--accent)' : 'var(--rule-strong)'),
                          background: isActive ? 'var(--accent)' : 'var(--surface)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {isActive && <span style={{ width: 5, height: 5, background: '#fff', borderRadius: '50%' }} />}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--ink)' : 'var(--ink-2)' }}>{t.l}</span>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 13,
                          color: t.pct === 0 ? 'var(--accent)' : t.pct === 100 ? 'var(--danger)' : t.pct === 50 ? 'var(--warn)' : 'var(--ink-2)',
                        }}>{t.pct}% fee</span>
                      </div>
                    )
                  })}
                </div>

                <div style={{ marginTop: 18 }}>
                  <div className="field">
                    <label className="field-label">Reason · required</label>
                    <div className="input">
                      <input
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Select or type a reason…"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Icon name="shield" size={14} style={{ color: 'var(--accent)', marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>Force-majeure waiver</div>
                      <div className="t-meta" style={{ marginTop: 3, lineHeight: 1.5 }}>
                        Toggle to waive cancellation fee for weather, regulator hold, or operator-side failure.
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          className={`btn sm ${forceMajeure ? 'accent' : 'ghost'}`}
                          onClick={() => setForceMajeure(v => !v)}
                        >
                          {forceMajeure ? <Icon name="check" size={11} stroke={2.4} /> : null}
                          {forceMajeure ? 'Waiver applied' : 'Apply waiver'}
                        </button>
                        {preview?.is_force_majeure_eligible && (
                          <span className="badge ok"><span className="dot ok" />FM eligible</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: refund preview */}
              <div>
                <div className="t-label" style={{ marginBottom: 12 }}>
                  Refund preview {preview ? `· ${preview.tier} tier` : ''}
                </div>
                {loadingPreview ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Computing preview…</div>
                ) : preview ? (
                  <div style={{ padding: '18px 20px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                    <table className="tbl" style={{ marginTop: 0 }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>Booking fare</td>
                          <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: 'var(--ink-2)' }}>{fmtMinor(preview.fare_minor)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>Cancellation fee · {preview.fee_pct}%</td>
                          <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: 'var(--warn)' }}>−{fmtMinor(preview.cancel_fee_minor)}</td>
                        </tr>
                        <tr style={{ borderTop: '1px solid var(--rule-strong)' }}>
                          <td style={{ padding: '14px 0 0', border: 0, fontWeight: 500, fontSize: 14 }}>Net refund to customer</td>
                          <td className="num" style={{ padding: '14px 0 0', border: 0, textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--accent)' }}>
                            {fmtMinor(forceMajeure ? preview.fare_minor : preview.net_refund_minor)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div style={{ marginTop: 16 }}>
                  <div className="field">
                    <label className="field-label">Refund destination</label>
                    <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                      <select
                        value={refundDest}
                        onChange={e => setRefundDest(e.target.value as 'original' | 'wallet' | 'wire')}
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 12.5 }}
                      >
                        <option value="original">Original instrument</option>
                        <option value="wallet">Platform wallet</option>
                        <option value="wire">Wire transfer</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Reschedule mode */
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label className="field-label">New departure date & time</label>
                <div className="input">
                  <input
                    type="datetime-local"
                    value={newEtd}
                    onChange={e => setNewEtd(e.target.value)}
                    style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: 13 }}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Reason</label>
                <div className="input">
                  <input
                    value={rescheduleReason}
                    onChange={e => setRescheduleReason(e.target.value)}
                    placeholder="Customer request, weather, etc."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="t-meta">All air {mode === 'cancel' ? 'cancellations' : 'reschedules'} are audit-logged</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {error && <span style={{ fontSize: 12.5, color: 'var(--danger)', alignSelf: 'center' }}>{error}</span>}
            <button className="btn" onClick={onClose}>Keep booking</button>
            <button
              className="btn accent"
              disabled={submitting || (mode === 'cancel' && !reason) || (mode === 'reschedule' && (!newEtd || !rescheduleReason))}
              onClick={handleSubmit}
            >
              {submitting ? 'Processing…' : mode === 'cancel' ? 'Confirm cancellation' : 'Confirm reschedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Assign Operator Modal ─────────────────────────────────────────────────────

function AssignOperatorModal({ bookingId, onClose, onSuccess }: { bookingId: string; onClose: () => void; onSuccess: () => void }) {
  const [operatorId, setOperatorId] = useState('')
  const [aircraftId, setAircraftId] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [operators, setOperators] = useState<Operator[]>([])
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [loadingOps, setLoadingOps] = useState(true)
  const [loadingAc, setLoadingAc] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setLoadError(null)
    operatorService.listOperators({ page_size: 100 })
      .then(r => setOperators(r.items ?? []))
      .catch((e: unknown) => {
        const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
        let msg = 'Failed to load operators'
        if (typeof detail === 'string') {
          msg = detail
        } else if (Array.isArray(detail) && detail.length > 0) {
          msg = (detail as Array<{ msg?: string; loc?: unknown[] }>)
            .map(d => d.msg ?? JSON.stringify(d))
            .join(', ')
        } else if ((e as { message?: string })?.message) {
          msg = (e as { message: string }).message
        }
        setLoadError(msg)
      })
      .finally(() => setLoadingOps(false))
  }, [])

  useEffect(() => {
    if (!operatorId) { setAircraft([]); setAircraftId(''); return }
    setLoadingAc(true)
    operatorService.listAircraft({ operator_id: operatorId, page_size: 100 })
      .then(r => setAircraft(r.items ?? []))
      .catch(() => setAircraft([]))
      .finally(() => setLoadingAc(false))
  }, [operatorId])

  async function handleSubmit() {
    if (!operatorId || !aircraftId) { setError('Operator and Aircraft are required'); return }
    setSubmitting(true)
    setError(null)
    try {
      await airBookingsService.assignOperator(bookingId, { operator_id: operatorId, aircraft_id: aircraftId, note })
      onSuccess()
    } catch {
      setError('Failed to assign operator.')
    } finally {
      setSubmitting(false)
    }
  }

  const selStyle = { flex: 1, border: 'none', outline: 'none', background: 'transparent', height: 36, fontSize: 12.5, cursor: 'pointer' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(15,13,10,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule-strong)', width: '100%', maxWidth: 480 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>Assign Operator</span>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loadError && (
            <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {loadError}
            </div>
          )}
          <div className="field">
            <label className="field-label">Operator *</label>
            <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
              <select value={operatorId} onChange={e => { setOperatorId(e.target.value); setAircraftId('') }} style={selStyle} disabled={loadingOps}>
                <option value="">
                  {loadingOps ? 'Loading operators…' : operators.length === 0 ? 'No operators found' : 'Select operator…'}
                </option>
                {operators.map(o => (
                  <option key={o.id} value={o.id}>{o.name}{o.hq_city ? ` · ${o.hq_city}` : ''} · {o.status}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Aircraft *</label>
            <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
              <select value={aircraftId} onChange={e => setAircraftId(e.target.value)} style={selStyle} disabled={!operatorId || loadingAc}>
                <option value="">{!operatorId ? 'Select operator first' : loadingAc ? 'Loading aircraft…' : aircraft.length === 0 ? 'No ready aircraft' : 'Select aircraft…'}</option>
                {aircraft.map(a => (
                  <option key={a.id} value={a.id}>{a.registration_mark} · {a.seat_capacity} seats{a.range_nm ? ` · ${a.range_nm} nm` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Note (optional)</label>
            <div className="input"><input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for assignment…" /></div>
          </div>
          {error && <div style={{ fontSize: 12.5, color: 'var(--danger)' }}>{error}</div>}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn accent" disabled={submitting || !operatorId || !aircraftId} onClick={handleSubmit}>
            {submitting ? 'Assigning…' : 'Assign Operator'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type ActiveTab = 'overview' | 'manifest' | 'notes' | 'timeline'

export default function AirBookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  useIsTablet()

  const [booking, setBooking] = useState<AirBookingDetail | null>(null)
  const [manifest, setManifest] = useState<ManifestResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [cancelPreview, setCancelPreview] = useState<CancelPreviewResponse | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const [advancingStatus, setAdvancingStatus] = useState(false)
  const [togglingFlag, setTogglingFlag] = useState(false)

  const [showPassengerForm, setShowPassengerForm] = useState(false)
  const [savingManifest, setSavingManifest] = useState(false)
  type PaxDraft = { id?: string; name: string; age: string; id_number: string; body_weight_kg: string; baggage_weight_kg: string; special_notes: string; is_minor: boolean }
  const emptyPax = (): PaxDraft => ({ name: '', age: '', id_number: '', body_weight_kg: '', baggage_weight_kg: '', special_notes: '', is_minor: false })
  const [paxDrafts, setPaxDrafts] = useState<PaxDraft[]>([])

  const bookingId = id ?? ''

  const loadBooking = async () => {
    if (!bookingId) return
    setLoading(true)
    try {
      const [b, m] = await Promise.all([
        airBookingsService.getAirBooking(bookingId),
        airBookingsService.getManifest(bookingId).catch(() => null),
      ])
      setBooking(b)
      setManifest(m)
    } catch {
      setBooking(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooking()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  const openCancelModal = async () => {
    setShowCancelModal(true)
    setLoadingPreview(true)
    try {
      const preview = await airBookingsService.getCancelPreview(bookingId)
      setCancelPreview(preview)
    } catch {
      setCancelPreview(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleAdvanceStatus = async () => {
    if (!booking) return
    const next = STATUS_TRANSITIONS[booking.status]
    if (!next) return
    setAdvancingStatus(true)
    try {
      await airBookingsService.advanceStatus(bookingId, { status: next })
      await loadBooking()
    } catch { /* ignore */ }
    setAdvancingStatus(false)
  }

  const handleToggleFlag = async () => {
    if (!booking) return
    setTogglingFlag(true)
    try {
      await airBookingsService.flagBooking(bookingId, {
        flagged: !booking.flagged,
        flag_reason: booking.flagged ? null : 'Flagged by admin',
      })
      await loadBooking()
    } catch { /* ignore */ }
    setTogglingFlag(false)
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      await airBookingsService.addNote(bookingId, { note: newNote.trim() })
      setNewNote('')
      await loadBooking()
    } catch { /* ignore */ }
    setAddingNote(false)
  }

  const handleLockManifest = async () => {
    try {
      const m = await airBookingsService.lockManifest(bookingId)
      setManifest(m)
      await loadBooking()
    } catch { /* ignore */ }
  }

  const openPassengerForm = () => {
    const existing = (manifest?.passengers ?? []).map(p => ({
      id: p.id,
      name: p.name,
      age: p.age != null ? String(p.age) : '',
      id_number: p.id_number ?? '',
      body_weight_kg: String(p.body_weight_kg),
      baggage_weight_kg: String(p.baggage_weight_kg),
      special_notes: p.special_notes ?? '',
      is_minor: p.is_minor,
    }))
    setPaxDrafts(existing.length > 0 ? existing : [emptyPax()])
    setShowPassengerForm(true)
  }

  const handleSaveManifest = async () => {
    setSavingManifest(true)
    try {
      const passengers = paxDrafts
        .filter(p => p.name.trim())
        .map(p => ({
          id: p.id || undefined,
          name: p.name.trim(),
          age: p.age ? parseInt(p.age) : undefined,
          id_number: p.id_number.trim() || undefined,
          body_weight_kg: parseFloat(p.body_weight_kg) || 0,
          baggage_weight_kg: parseFloat(p.baggage_weight_kg) || 0,
          special_notes: p.special_notes.trim() || undefined,
          is_minor: p.is_minor,
        }))
      const m = await airBookingsService.updateManifest(bookingId, { passengers })
      setManifest(m)
      setShowPassengerForm(false)
    } catch { /* ignore */ }
    setSavingManifest(false)
  }

  if (loading) {
    return (
      <Shell activeId="bookings-a" breadcrumb="Operations · Air bookings" title="Loading…">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading booking…</div>
      </Shell>
    )
  }

  if (!booking) {
    return (
      <Shell activeId="bookings-a" breadcrumb="Operations · Air bookings" title="Not found">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          Booking not found. <Link to="/bookings/air" style={{ color: 'var(--accent)' }}>Back to air bookings</Link>
        </div>
      </Shell>
    )
  }

  const nextStatus = STATUS_TRANSITIONS[booking.status]
  const fareDisplay = booking.fare_final_minor !== null ? fmtMinor(booking.fare_final_minor) : fmtMinor(booking.fare_estimate_minor)

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'manifest', label: 'Manifest' },
    { key: 'notes', label: `Notes (${booking.admin_notes.length})` },
    { key: 'timeline', label: 'Timeline' },
  ]

  const mainContent = (
    <>
      {/* Tab strip */}
      <div style={{ padding: '0 32px', borderBottom: '1px solid var(--rule)', background: 'var(--surface)', display: 'flex', overflowX: 'auto' }}>
        {TABS.map(t => (
          <div
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '14px 18px',
              fontSize: 13,
              color: activeTab === t.key ? 'var(--ink)' : 'var(--ink-3)',
              fontWeight: activeTab === t.key ? 500 : 400,
              borderBottom: '2px solid ' + (activeTab === t.key ? 'var(--accent)' : 'transparent'),
              marginBottom: -1,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >{t.label}</div>
        ))}
      </div>

      <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {activeTab === 'overview' && (
          <>
            {/* Hero strip */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--rule)',
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
              overflowX: 'auto',
            }}>
              {[
                ['Status', statusBadge(booking.status)],
                ['Distance', booking.distance_nm !== null ? `${booking.distance_nm} nm` : '—'],
                ['Flight time', booking.flight_time_min !== null ? `${booking.flight_time_min} min · est` : '—'],
                ['Block fuel', booking.fuel_weight_kg !== null ? `${booking.fuel_weight_kg} kg` : '—'],
                ['Pax', `${booking.pax_count} pax`],
                ['Fare', fareDisplay],
              ].map(([k, v], i) => (
                <div key={String(k)} style={{ padding: '14px 18px', borderRight: i < 5 ? '1px solid var(--rule)' : 'none' }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 8, fontFamily: typeof v === 'string' ? 'var(--font-serif)' : undefined, fontSize: 18, fontWeight: 400 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Flight info */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
              <div className="t-label" style={{ marginBottom: 12 }}>Flight information</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 18 }}>
                {[
                  ['Route', `${booking.route_from} → ${booking.route_to}`],
                  ['ETD', fmtDateTime(booking.etd)],
                  ['ETA', booking.eta ? fmtDateTime(booking.eta) : '—'],
                  ['Service', booking.service_label],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <div className="t-label" style={{ padding: 0 }}>{k}</div>
                    <div style={{ marginTop: 6, fontSize: 13.5, color: 'var(--ink)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'manifest' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="t-label">{manifest?.is_locked ? 'Manifest · locked' : 'Manifest · open'}</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  {manifest?.passengers.length ?? 0} passengers · {manifest?.total_pax_weight_kg ?? 0} kg pax + {manifest?.total_baggage_weight_kg ?? 0} kg baggage
                </h3>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!manifest?.is_locked && !showPassengerForm && (
                  <button className="btn sm" onClick={openPassengerForm}>
                    <Icon name="plus" size={13} /> {(manifest?.passengers.length ?? 0) > 0 ? 'Edit passengers' : 'Add passengers'}
                  </button>
                )}
                {!manifest?.is_locked && (manifest?.passengers.length ?? 0) > 0 && (
                  <button className="btn sm accent" onClick={handleLockManifest}>Lock manifest</button>
                )}
              </div>
            </div>

            {/* Weight & balance bar */}
            {manifest && (manifest.passengers.length > 0 || manifest.mtow_kg) && (
              <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--rule)', background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span className="t-label" style={{ padding: 0 }}>Weight & balance · MTOW</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                    {booking.aircraft_model ?? '—'} · {booking.aircraft_registration ?? '—'} · max gross {manifest.mtow_kg?.toLocaleString() ?? '—'} kg
                  </span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink)' }}>
                    {manifest.total_weight_kg?.toLocaleString() ?? '—'} / {manifest.mtow_kg?.toLocaleString() ?? '—'} kg
                  </span>
                  {manifest.is_within_limits === true && (
                    <span className="badge ok"><span className="dot ok" />{manifest.utilization_pct?.toFixed(1) ?? '—'}% · within limits</span>
                  )}
                  {manifest.is_within_limits === false && (
                    <span className="badge danger"><span className="dot danger" />{manifest.utilization_pct?.toFixed(1) ?? '—'}% · OVER LIMIT</span>
                  )}
                  {manifest.is_within_limits === null && manifest.passengers.length > 0 && (
                    <span className="badge info"><span className="dot info" />no MTOW data</span>
                  )}
                </div>
                {manifest.mtow_kg && (
                  <div style={{ display: 'flex', height: 18, borderRadius: 2, overflow: 'hidden', border: '1px solid var(--rule-strong)' }}>
                    {[
                      { l: 'Empty', v: manifest.aircraft_empty_weight_kg ?? 0, c: 'var(--ink-2)' },
                      { l: 'Fuel', v: manifest.fuel_weight_kg ?? 0, c: 'var(--info)' },
                      { l: 'Pax', v: manifest.total_pax_weight_kg ?? 0, c: 'var(--accent)' },
                      { l: 'Bags', v: manifest.total_baggage_weight_kg ?? 0, c: 'var(--warn)' },
                      { l: 'Margin', v: Math.max(0, (manifest.mtow_kg ?? 0) - (manifest.total_weight_kg ?? 0)), c: 'var(--surface-sunk)' },
                    ].map((s, idx) => (
                      <div
                        key={s.l}
                        style={{ width: (s.v / manifest.mtow_kg!) * 100 + '%', background: s.c, borderRight: idx < 4 ? '1px solid var(--surface)' : 'none' }}
                        title={`${s.l}: ${s.v} kg`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Passenger edit form */}
            {showPassengerForm && !manifest?.is_locked && (
              <div style={{ padding: '18px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="t-label">Edit passengers</div>
                {paxDrafts.map((p, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1.5fr 1fr 1fr 1.5fr auto', gap: 8, alignItems: 'end', padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)' }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label className="field-label">Name *</label>
                      <input className="input" value={p.name} onChange={e => { const d = [...paxDrafts]; d[i] = { ...d[i], name: e.target.value }; setPaxDrafts(d) }} placeholder="Full name" />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label className="field-label">Age</label>
                      <input className="input" type="number" value={p.age} onChange={e => { const d = [...paxDrafts]; d[i] = { ...d[i], age: e.target.value }; setPaxDrafts(d) }} placeholder="—" />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label className="field-label">ID / Passport</label>
                      <input className="input" value={p.id_number} onChange={e => { const d = [...paxDrafts]; d[i] = { ...d[i], id_number: e.target.value }; setPaxDrafts(d) }} placeholder="—" />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label className="field-label">Body wt (kg) *</label>
                      <input className="input" type="number" value={p.body_weight_kg} onChange={e => { const d = [...paxDrafts]; d[i] = { ...d[i], body_weight_kg: e.target.value }; setPaxDrafts(d) }} placeholder="70" />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label className="field-label">Baggage (kg)</label>
                      <input className="input" type="number" value={p.baggage_weight_kg} onChange={e => { const d = [...paxDrafts]; d[i] = { ...d[i], baggage_weight_kg: e.target.value }; setPaxDrafts(d) }} placeholder="0" />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label className="field-label">Notes</label>
                      <input className="input" value={p.special_notes} onChange={e => { const d = [...paxDrafts]; d[i] = { ...d[i], special_notes: e.target.value }; setPaxDrafts(d) }} placeholder="—" />
                    </div>
                    <button className="btn sm ghost" style={{ alignSelf: 'flex-end' }} onClick={() => setPaxDrafts(paxDrafts.filter((_, j) => j !== i))}>
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn sm ghost" onClick={() => setPaxDrafts([...paxDrafts, emptyPax()])}>
                    <Icon name="plus" size={13} /> Add row
                  </button>
                  <span style={{ flex: 1 }} />
                  <button className="btn sm" onClick={() => setShowPassengerForm(false)}>Cancel</button>
                  <button className="btn sm accent" disabled={savingManifest || paxDrafts.filter(p => p.name.trim()).length === 0} onClick={handleSaveManifest}>
                    {savingManifest ? 'Saving…' : 'Save manifest'}
                  </button>
                </div>
              </div>
            )}

            {/* Passenger table */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Passenger</th>
                    <th>Age</th>
                    <th>ID</th>
                    <th style={{ textAlign: 'right' }}>Body wt.</th>
                    <th style={{ textAlign: 'right' }}>Baggage</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(manifest?.passengers ?? []).map(p => (
                    <tr key={p.id}>
                      <td className="num" style={{ color: 'var(--ink-3)' }}>{String(p.seq).padStart(2, '0')}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>
                            {p.name.split(' ').map((x: string) => x[0]).join('')}
                          </div>
                          <span style={{ fontSize: 13 }}>{p.name}</span>
                          {p.is_minor && <span className="badge warn" style={{ fontSize: 10 }}>Minor</span>}
                        </div>
                      </td>
                      <td>{p.age ?? '—'}</td>
                      <td className="num" style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{p.id_number ?? '—'}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{p.body_weight_kg} kg</td>
                      <td className="num" style={{ textAlign: 'right' }}>{p.baggage_weight_kg} kg</td>
                      <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{p.special_notes ?? '—'}</td>
                    </tr>
                  ))}
                  {(manifest?.passengers.length ?? 0) === 0 && !showPassengerForm && (
                    <tr>
                      <td colSpan={7}>
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)' }}>
                          <div style={{ fontSize: 13, marginBottom: 10 }}>No passengers in manifest yet.</div>
                          {!manifest?.is_locked && (
                            <button className="btn sm" onClick={openPassengerForm}>
                              <Icon name="plus" size={13} /> Add passengers
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Admin notes</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                {booking.admin_notes.length} note{booking.admin_notes.length !== 1 ? 's' : ''}
              </h3>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', gap: 10 }}>
              <div className="input" style={{ flex: 1 }}>
                <input
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note…"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote() } }}
                />
              </div>
              <button className="btn sm accent" disabled={addingNote || !newNote.trim()} onClick={handleAddNote}>
                {addingNote ? '…' : 'Add note'}
              </button>
            </div>
            <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {booking.admin_notes.length === 0 ? (
                <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No notes yet.</div>
              ) : [...booking.admin_notes].reverse().map(n => (
                <div key={n.id} style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{n.note}</div>
                  <div className="t-meta" style={{ marginTop: 6 }}>{fmtDateTime(n.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">State timeline</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Pre-flight progress</h3>
            </div>
            <div style={{ padding: '18px 24px' }}>
              {booking.timeline.length === 0 ? (
                <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No timeline events.</div>
              ) : booking.timeline.map((e, i) => (
                <div key={e.id} style={{ display: 'flex', gap: 14, paddingBottom: i < booking.timeline.length - 1 ? 14 : 0, position: 'relative' }}>
                  <div style={{ position: 'relative', width: 12, flexShrink: 0 }}>
                    <span className={`dot ${e.tone}`} style={{ width: 8, height: 8, position: 'absolute', top: 4, left: 1 }} />
                    {i < booking.timeline.length - 1 && (
                      <span style={{ position: 'absolute', left: 5, top: 16, bottom: -14, width: 1, background: 'var(--rule-strong)' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{e.event}</span>
                      <span className="t-meta">{fmtDateTime(e.created_at)}</span>
                    </div>
                    {e.message && <div className="t-meta" style={{ marginTop: 2 }}>{e.message}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )

  const rightRail = (
    <aside style={{ background: 'var(--surface)', borderLeft: '1px solid var(--rule)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Customer */}
      <div className="t-label" style={{ marginBottom: 12 }}>Customer</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="avatar lg" style={{ background: 'var(--surface-sunk)' }}>
          {(booking.customer_name ?? '?').split(' ').map(x => x[0]).join('').slice(0, 2)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14 }}>{booking.customer_name ?? '—'}</div>
          {booking.customer_phone && (
            <div className="t-meta" style={{ marginTop: 2 }}>{booking.customer_phone}</div>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

      {/* Operator */}
      <div className="t-label" style={{ marginBottom: 12 }}>Operator</div>
      <div style={{ padding: '14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 3,
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
          }}>
            <Icon name="helipad" size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14 }}>{booking.operator_name ?? 'Unassigned'}</div>
            {booking.operator_otp_pct !== null && (
              <div className="t-meta" style={{ marginTop: 2 }}>OTP 30d: {booking.operator_otp_pct}%</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

      {/* Aircraft */}
      <div className="t-label" style={{ marginBottom: 12 }}>Aircraft</div>
      {booking.aircraft_model ? (
        <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13 }}>{booking.aircraft_model}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{booking.aircraft_registration ?? '—'}</span>
          </div>
          <div className="t-meta" style={{ marginTop: 4 }}>
            {booking.aircraft_seats} seats · MTOW {booking.aircraft_mtow_kg?.toLocaleString()} kg
            {booking.aircraft_airworthy_until && ` · airworthy until ${booking.aircraft_airworthy_until}`}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No aircraft assigned</div>
      )}

      {/* Pilot */}
      {booking.pilot_name && (
        <>
          <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />
          <div className="t-label" style={{ marginBottom: 12 }}>Crew</div>
          <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar">
                {booking.pilot_name.split(' ').map(x => x[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{booking.pilot_name} · PIC</div>
                {booking.pilot_license && <div className="t-meta" style={{ marginTop: 2 }}>{booking.pilot_license}</div>}
              </div>
            </div>
            {booking.copilot_name && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar">
                  {booking.copilot_name.split(' ').map(x => x[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{booking.copilot_name} · co-pilot</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Quick actions */}
      <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />
      <div className="t-label" style={{ marginBottom: 12 }}>Quick actions</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {nextStatus && (
          <button className="btn sm accent" disabled={advancingStatus} onClick={handleAdvanceStatus}>
            {advancingStatus ? 'Advancing…' : `Advance → ${nextStatus}`}
          </button>
        )}
        <button className="btn sm" onClick={() => setShowAssignModal(true)}>
          <Icon name="refresh" size={13} />{booking.operator_id ? 'Reassign operator' : 'Assign operator'}
        </button>
        {['charter', 'vip'].includes(booking.service_subtype) && (
          <button className="btn sm" onClick={() => navigate(`/bookings/air/${bookingId}/quotes`)}>
            <Icon name="external" size={13} />Manage quotes
          </button>
        )}
        <button
          className={`btn sm ${booking.flagged ? 'danger' : 'ghost'}`}
          disabled={togglingFlag}
          onClick={handleToggleFlag}
        >
          <Icon name="flag" size={13} />
          {booking.flagged ? 'Remove flag' : 'Flag booking'}
        </button>
        <button className="btn sm" onClick={openCancelModal}>
          Reschedule / Cancel
        </button>
      </div>
    </aside>
  )

  return (
    <Shell
      activeId="bookings-a"
      breadcrumb="Operations · Air bookings"
      title={`${booking.booking_ref} · ${booking.route_from} → ${booking.route_to}`}
      subtitle={`${booking.service_label} · ${booking.operator_name ?? 'Unassigned'} · ETD ${fmtDateTime(booking.etd)} · ${booking.pax_count} pax`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/bookings/air')}>
            ← Back to Air Bookings
          </button>
        </div>
      }
    >
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {mainContent}
          {rightRail}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', minHeight: '100%' }}>
          <div style={{ minWidth: 0 }}>{mainContent}</div>
          {rightRail}
        </div>
      )}

      {showCancelModal && booking && (
        <CancelRescheduleModal
          bookingId={bookingId}
          booking={booking}
          preview={cancelPreview}
          loadingPreview={loadingPreview}
          onClose={() => { setShowCancelModal(false); setCancelPreview(null) }}
          onSuccess={() => { setShowCancelModal(false); setCancelPreview(null); loadBooking() }}
        />
      )}

      {showAssignModal && (
        <AssignOperatorModal
          bookingId={bookingId}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => { setShowAssignModal(false); loadBooking() }}
        />
      )}
    </Shell>
  )
}
