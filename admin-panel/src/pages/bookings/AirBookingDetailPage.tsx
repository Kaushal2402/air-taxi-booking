import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { airBookingsService } from '../../services/airBookingsService'
import type {
  AirBookingDetail,
  ManifestResponse,
  ManifestPassengerInput,
  CharterQuote,
  CancelPreviewResponse,
  CancelAirBookingBody,
  RescheduleBody,
  AdvanceAirStatusBody,
  CharterQuoteCreate,
} from '../../services/airBookingsService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMinor = (v: number) => `₹${(v / 100).toLocaleString('en-IN')}`
const fmtL = (v: number) => `₹${(v / 10000000).toFixed(2)} L`

function aStatusBadge(s: string) {
  const map: Record<string, string> = {
    'Confirmed': 'ok', 'Boarding': 'info', 'Departed': 'ok', 'Arrived': 'pending',
    'Completed': 'pending', 'Quote shared': 'warn', 'Manifest locked': 'info',
    'Requested': 'warn', 'Cancelled': 'danger', 'Refunded': 'info', 'Rescheduled': 'info',
  }
  const tone = map[s] || 'pending'
  return <span className={`badge ${tone}`}><span className={`dot ${tone}`} />{s}</span>
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function formatTs(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) }
  catch { return iso }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
  } catch { return iso }
}

const CANCEL_REASONS = [
  'Customer requested', 'Weather · force majeure', 'Operator failure', 'Regulatory hold',
  'Trip purpose cancelled', 'Other',
]

const CANCEL_TIERS = [
  { l: '> 48h before',          pct: 0,   id: '>48h' },
  { l: '24–48h before',         pct: 25,  id: '24–48h' },
  { l: '4–24h before',          pct: 50,  id: '4–24h' },
  { l: '< 4h before / no-show', pct: 100, id: '<4h' },
]

const AIR_NEXT_STATUS: Record<string, AdvanceAirStatusBody['status']> = {
  'Requested':       'Confirmed',
  'Confirmed':       'Manifest locked',
  'Manifest locked': 'Boarding',
  'Boarding':        'Departed',
  'Departed':        'Arrived',
  'Arrived':         'Completed',
}

// ── FlightChart SVG (defined OUTSIDE page) ───────────────────────────────────

interface FlightChartProps {
  route_from: string
  route_to: string
}

function FlightChart({ route_from, route_to }: FlightChartProps) {
  const stops = [
    { x: 600, y: 140, code: route_from.slice(0, 4).toUpperCase(), label: route_from },
    { x: 200, y: 240, code: route_to.slice(0, 4).toUpperCase(),   label: route_to },
  ]

  return (
    <svg viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block', background: 'var(--surface-sunk)' }}>
      <defs>
        <pattern id="acGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0 L0 0 0 40" stroke="var(--rule)" strokeWidth="0.5" fill="none" />
        </pattern>
        <pattern id="acDots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.6" fill="var(--rule-strong)" />
        </pattern>
      </defs>
      <rect width="800" height="360" fill="url(#acGrid)" />
      <rect width="800" height="360" fill="url(#acDots)" opacity="0.6" />

      {/* topography */}
      <g fill="var(--accent)" opacity="0.06" stroke="var(--accent)" strokeOpacity="0.18" strokeWidth="0.7">
        <path d="M40 220 Q140 180 220 210 Q300 250 280 290 Q220 320 140 300 Q60 280 40 220 Z" />
        <path d="M520 60 Q620 70 680 130 Q700 200 660 250 Q580 240 560 180 Q540 110 520 60 Z" />
      </g>
      {/* coastline */}
      <path d="M-20 320 Q220 290 420 320 Q600 350 820 310 L820 360 L-20 360 Z" fill="var(--info)" opacity="0.08" />

      {/* airspace sectors */}
      <g stroke="var(--rule-strong)" strokeDasharray="3 4" strokeWidth="0.8" fill="none">
        <path d="M120 80 L320 60 L380 180 L240 240 L80 200 Z" />
        <path d="M420 60 L640 80 L660 220 L500 260 L380 180 Z" />
      </g>

      {/* great-circle route arc */}
      <path
        d={`M${stops[0].x} ${stops[0].y} Q${(stops[0].x + stops[1].x) / 2} ${Math.min(stops[0].y, stops[1].y) - 80} ${stops[1].x} ${stops[1].y}`}
        fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeDasharray="6 4"
      />
      {/* aircraft icon mid-flight */}
      <g transform={`translate(${(stops[0].x + stops[1].x) / 2 - 8} ${Math.min(stops[0].y, stops[1].y) - 70})`}>
        <g transform="rotate(60)">
          <path d="M0 -8 L4 5 L0 3 L-4 5 Z" fill="var(--accent)" stroke="var(--surface)" strokeWidth="0.6" />
        </g>
      </g>

      {/* nav fixes */}
      <g fill="var(--ink-3)" opacity="0.7">
        {([[160,140],[260,90],[440,120],[560,180],[330,260]] as [number,number][]).map(([x,y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M0 -4 L4 4 L-4 4 Z" fill="none" stroke="currentColor" strokeWidth="0.7" />
            <text x="6" y="5" style={{ font: '9px IBM Plex Mono', letterSpacing: '0.06em' }}>
              {['ABULA','VOMAK','TUTLO','GIPLO','OBNAV'][i]}
            </text>
          </g>
        ))}
      </g>

      {/* stops */}
      {stops.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y})`}>
          <circle r="9" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.4" />
          <circle r="3" fill="var(--ink)" />
          <text x="0" y="-16" textAnchor="middle" fill="var(--ink)" style={{ font: '600 12px IBM Plex Mono', letterSpacing: '0.08em' }}>{s.code}</text>
          <text x="0" y="24" textAnchor="middle" fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono', letterSpacing: '0.06em' }}>{s.label}</text>
        </g>
      ))}
    </svg>
  )
}

// ── Cancel/Reschedule Modal (defined OUTSIDE page) ────────────────────────────

interface CancelAirModalProps {
  booking: AirBookingDetail
  onClose: () => void
  onConfirm: () => void
}

function CancelAirModal({ booking, onClose, onConfirm }: CancelAirModalProps) {
  const [mode, setMode] = useState<'cancel' | 'reschedule'>('cancel')
  const [preview, setPreview] = useState<CancelPreviewResponse | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [forceMajeure, setForceMajeure] = useState(false)
  const [refundDest, setRefundDest] = useState<'original' | 'wallet' | 'wire'>('original')
  const [newEtd, setNewEtd] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    airBookingsService.getCancelPreview(booking.id)
      .then(p => setPreview(p))
      .catch(() => setPreview(null))
      .finally(() => setLoadingPreview(false))
  }, [booking.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeTier = CANCEL_TIERS.find(t => preview && t.id === preview.tier) ?? null
  const cancelFee = preview?.cancel_fee_minor ?? 0
  const netRefund = preview?.net_refund_minor ?? 0
  const needsApproval = netRefund > 20000000 // > ₹2,00,000

  const handleConfirm = async () => {
    if (mode === 'cancel') {
      if (!reason) { setError('Reason is required'); return }
      setSaving(true); setError('')
      try {
        const body: CancelAirBookingBody = { reason, note: note || null, force_majeure: forceMajeure, refund_destination: refundDest }
        await airBookingsService.cancelBooking(booking.id, body)
        onConfirm()
      } catch (e: unknown) {
        const err = e as { response?: { data?: { detail?: string } } }
        setError(err?.response?.data?.detail || 'Cancel failed')
        setSaving(false)
      }
    } else {
      if (!newEtd) { setError('New departure time is required'); return }
      if (!rescheduleReason) { setError('Reason is required'); return }
      setSaving(true); setError('')
      try {
        const body: RescheduleBody = { new_etd: newEtd, reason: rescheduleReason }
        await airBookingsService.rescheduleBooking(booking.id, body)
        onConfirm()
      } catch (e: unknown) {
        const err = e as { response?: { data?: { detail?: string } } }
        setError(err?.response?.data?.detail || 'Reschedule failed')
        setSaving(false)
      }
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(15,13,10,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 40, paddingLeft: 16, paddingRight: 16, overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--rule-strong)',
        boxShadow: 'var(--shadow-pop)', width: '100%', maxWidth: 920, marginBottom: 40,
      }}>
        {/* Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 4, flexShrink: 0,
            background: 'var(--warn-soft)', color: 'var(--warn)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid color-mix(in oklab, var(--warn) 24%, var(--rule-strong))',
          }}><Icon name="clock" size={20} /></div>
          <div style={{ flex: 1 }}>
            <div className="t-label">Air booking · {booking.booking_ref} · {booking.service_label}</div>
            <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, letterSpacing: '-0.018em' }}>
              Cancel or reschedule?
            </h2>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-3)' }}>
              {booking.route_from} → {booking.route_to} · {booking.customer_name} · {booking.operator_name} · ETD{' '}
              <span style={{ color: 'var(--ink-2)' }}>{formatDateTime(booking.etd)}</span>
              {preview && (
                <> · in <span style={{ color: 'var(--warn)' }}>{preview.hours_to_etd.toFixed(1)}h</span></>
              )}
            </div>
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--rule)' }}>
          {([
            { key: 'cancel',    l: 'Cancel booking',  desc: 'Apply cancellation tier and refund per policy.' },
            { key: 'reschedule', l: 'Reschedule',      desc: 'Pick a new slot · manifest re-locks · fee may apply.' },
          ] as const).map((o, i) => (
            <div key={o.key} onClick={() => setMode(o.key)} style={{
              padding: '20px 28px',
              borderRight: i === 0 ? '1px solid var(--rule)' : 'none',
              borderBottom: mode === o.key ? '2px solid var(--accent)' : '2px solid transparent',
              background: mode === o.key ? 'color-mix(in oklab, var(--accent) 5%, var(--surface))' : 'transparent',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: `1px solid ${mode === o.key ? 'var(--accent)' : 'var(--rule-strong)'}`,
                  background: mode === o.key ? 'var(--accent)' : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {mode === o.key && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                </span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)' }}>{o.l}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--ink-3)' }}>{o.desc}</div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ margin: '16px 28px 0', padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {mode === 'cancel' ? (
          <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            {/* Left: tiers + reason */}
            <div>
              <div className="t-label" style={{ marginBottom: 12 }}>Cancellation policy tiers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {CANCEL_TIERS.map(t => {
                  const isOn = activeTier?.id === t.id
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                      border: `1px solid ${isOn ? 'var(--accent)' : 'var(--rule)'}`,
                      background: isOn ? 'color-mix(in oklab, var(--accent) 5%, var(--surface))' : 'var(--surface)',
                      borderRadius: 3,
                    }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                        border: `1px solid ${isOn ? 'var(--accent)' : 'var(--rule-strong)'}`,
                        background: isOn ? 'var(--accent)' : 'var(--surface)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>{isOn && <span style={{ width: 5, height: 5, background: '#fff', borderRadius: '50%' }} />}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: isOn ? 500 : 400, color: isOn ? 'var(--ink)' : 'var(--ink-2)' }}>{t.l}</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 13,
                        color: t.pct === 0 ? 'var(--accent)' : t.pct === 100 ? 'var(--danger)' : t.pct === 50 ? 'var(--warn)' : 'var(--ink-2)',
                      }}>{t.pct}% fee</span>
                    </div>
                  )
                })}
              </div>

              <div style={{ marginTop: 18 }}>
                <div className="t-label" style={{ marginBottom: 8 }}>Reason · required</div>
                <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                  <select value={reason} onChange={e => setReason(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13, padding: '8px 0' }}>
                    <option value="">Select reason…</option>
                    {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="input">
                  <input placeholder="Additional note (optional)" value={note} onChange={e => setNote(e.target.value)} />
                </div>
              </div>

              {/* Force-majeure waiver */}
              {preview?.is_force_majeure_eligible && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Icon name="shield" size={14} style={{ color: 'var(--accent)', marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>Force-majeure waiver available</div>
                      <div className="t-meta" style={{ marginTop: 3, lineHeight: 1.5 }}>
                        Toggle to waive cancellation fee for weather, regulator hold, or operator-side failure.
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                          <input type="checkbox" checked={forceMajeure} onChange={e => setForceMajeure(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                          Apply force-majeure waiver
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: refund preview */}
            <div>
              <div className="t-label" style={{ marginBottom: 12 }}>
                Refund preview{preview ? ` · ${preview.tier} tier` : ''}
              </div>
              <div style={{ padding: '18px 20px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                {loadingPreview ? (
                  <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Computing…</div>
                ) : (
                  <table className="tbl" style={{ marginTop: 0 }}>
                    <tbody>
                      {[
                        ['Booking fare', fmtMinor(preview?.fare_minor ?? 0), 'var(--ink-2)'],
                        [`Cancellation fee · ${forceMajeure ? 'waived (F.M.)' : (preview?.fee_pct ?? 0) + '%'}`,
                          forceMajeure ? '₹0' : `−${fmtMinor(cancelFee)}`, 'var(--warn)'],
                      ].map(([k, v, c]) => (
                        <tr key={k}>
                          <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>{k}</td>
                          <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: c }}>{v}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '1px solid var(--rule-strong)' }}>
                        <td style={{ padding: '14px 0 0', border: 0, fontWeight: 500, fontSize: 14 }}>Net refund to customer</td>
                        <td className="num" style={{ padding: '14px 0 0', border: 0, textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--accent)' }}>
                          {fmtMinor(forceMajeure ? (preview?.fare_minor ?? 0) : netRefund)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="field">
                  <label className="field-label">Refund destination</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                    <select value={refundDest} onChange={e => setRefundDest(e.target.value as 'original' | 'wallet' | 'wire')}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}>
                      <option value="original">Original payment instrument</option>
                      <option value="wallet">Wallet credit (instant)</option>
                      <option value="wire">Wire transfer</option>
                    </select>
                  </div>
                </div>
              </div>

              {needsApproval && !forceMajeure && (
                <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--info-soft)', border: '1px solid color-mix(in oklab, var(--info) 24%, var(--rule-strong))', borderRadius: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--info)' }}>
                    <Icon name="shield" size={13} />
                    <span className="t-label" style={{ padding: 0, color: 'var(--info)' }}>Two-person rule · refund above ₹2,00,000</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
                    {fmtL(netRefund)} exceeds the second-approver threshold. Finance Manager must approve before disbursement.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Reschedule mode */
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
            <div className="field">
              <label className="field-label">New departure time · required</label>
              <div className="input">
                <input type="datetime-local" value={newEtd} onChange={e => setNewEtd(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Reason · required</label>
              <div className="input">
                <input value={rescheduleReason} onChange={e => setRescheduleReason(e.target.value)} placeholder="Customer request…" />
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="t-meta">All air cancellations audit-logged</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={onClose} disabled={saving}>Keep booking</button>
            {mode === 'cancel' ? (
              needsApproval && !forceMajeure ? (
                <button className="btn accent" onClick={handleConfirm} disabled={saving || !reason}>
                  {saving ? 'Processing…' : `Request Finance approval · ${fmtL(netRefund)}`}
                </button>
              ) : (
                <button className="btn danger" onClick={handleConfirm} disabled={saving || !reason}>
                  {saving ? 'Cancelling…' : `Cancel & refund ${fmtMinor(forceMajeure ? (preview?.fare_minor ?? 0) : netRefund)}`}
                </button>
              )
            ) : (
              <button className="btn accent" onClick={handleConfirm} disabled={saving || !newEtd || !rescheduleReason}>
                {saving ? 'Rescheduling…' : 'Confirm reschedule →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Reassign Operator Modal (defined OUTSIDE page) ────────────────────────────

interface ReassignOperatorModalProps {
  onClose: () => void
  onConfirm: (operatorId: string, aircraftId: string, note: string) => Promise<void>
}

function ReassignOperatorModal({ onClose, onConfirm }: ReassignOperatorModalProps) {
  const [operatorId, setOperatorId] = useState('')
  const [aircraftId, setAircraftId] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!operatorId) { setError('Operator ID is required'); return }
    if (!aircraftId) { setError('Aircraft ID is required'); return }
    setSaving(true); setError('')
    try {
      await onConfirm(operatorId, aircraftId, note)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Reassign failed')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,13,10,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 4, width: '100%', maxWidth: 440 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Reassign operator</span>
          <button className="btn ghost sm" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>{error}</div>}
          <div className="field">
            <label className="field-label">Operator ID <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input">
              <input value={operatorId} onChange={e => setOperatorId(e.target.value)} placeholder="Operator UUID…" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Aircraft ID <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input">
              <input value={aircraftId} onChange={e => setAircraftId(e.target.value)} placeholder="Aircraft UUID…" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Note</label>
            <div className="input">
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for reassignment…" />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn accent sm" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Reassigning…' : 'Reassign'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Quote Modal (defined OUTSIDE page) ────────────────────────────────────

interface AddQuoteModalProps {
  bookingId: string
  onClose: () => void
  onConfirm: () => void
}

function AddQuoteModal({ bookingId, onClose, onConfirm }: AddQuoteModalProps) {
  const [form, setForm] = useState<Partial<CharterQuoteCreate>>({
    base_fare_minor: 0, positioning_minor: 0, night_halt_minor: 0,
    catering_minor: 0, fuel_surcharge_minor: 0, taxes_minor: 0,
    pax_capacity: 4, range_nm: 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (k: keyof CharterQuoteCreate, v: string | number) => setForm(prev => ({ ...prev, [k]: v }))

  const handleConfirm = async () => {
    if (!form.operator_id || !form.aircraft_id || !form.depart_icao || !form.arrive_icao || !form.etd || !form.eta) {
      setError('Please fill all required fields'); return
    }
    setSaving(true); setError('')
    try {
      await airBookingsService.createQuote(bookingId, form as CharterQuoteCreate)
      onConfirm()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Failed to add quote')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,13,10,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 40, paddingLeft: 16, paddingRight: 16, overflowY: 'auto' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 4, width: '100%', maxWidth: 600, marginBottom: 40 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Add charter quote</span>
          <button className="btn ghost sm" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([
              ['Operator ID', 'operator_id', 'text'],
              ['Aircraft ID', 'aircraft_id', 'text'],
              ['Aircraft Registration', 'aircraft_registration', 'text'],
              ['Aircraft Model', 'aircraft_model', 'text'],
              ['Depart ICAO', 'depart_icao', 'text'],
              ['Arrive ICAO', 'arrive_icao', 'text'],
              ['ETD', 'etd', 'datetime-local'],
              ['ETA', 'eta', 'datetime-local'],
              ['Pax Capacity', 'pax_capacity', 'number'],
              ['Range (nm)', 'range_nm', 'number'],
              ['Base fare (minor)', 'base_fare_minor', 'number'],
              ['Positioning (minor)', 'positioning_minor', 'number'],
              ['Night halt (minor)', 'night_halt_minor', 'number'],
              ['Catering (minor)', 'catering_minor', 'number'],
              ['Fuel surcharge (minor)', 'fuel_surcharge_minor', 'number'],
              ['Taxes (minor)', 'taxes_minor', 'number'],
            ] as [string, keyof CharterQuoteCreate, string][]).map(([label, field, type]) => (
              <div key={field} className="field">
                <label className="field-label">{label}</label>
                <div className="input">
                  <input
                    type={type}
                    value={String(form[field] ?? '')}
                    onChange={e => setField(field, type === 'number' ? Number(e.target.value) : e.target.value)}
                    placeholder={label}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="field">
            <label className="field-label">Conditions</label>
            <div className="input">
              <input value={form.conditions ?? ''} onChange={e => setField('conditions', e.target.value)} placeholder="No fuel-stop · 30 kg pax baggage" />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn accent sm" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Adding…' : 'Add quote'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Manifest Tab (defined OUTSIDE page) ──────────────────────────────────────

interface ManifestTabProps {
  bookingId: string
  booking: AirBookingDetail
}

function ManifestTab({ bookingId, booking }: ManifestTabProps) {
  const [manifest, setManifest] = useState<ManifestResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editPassengers, setEditPassengers] = useState<ManifestPassengerInput[]>([])
  const [saving, setSaving] = useState(false)
  const [locking, setLocking] = useState(false)

  const loadManifest = async () => {
    setLoading(true)
    try {
      const m = await airBookingsService.getManifest(bookingId)
      setManifest(m)
      setEditPassengers(m.passengers.map(p => ({
        id: p.id, name: p.name, age: p.age, id_number: p.id_number,
        body_weight_kg: p.body_weight_kg, baggage_weight_kg: p.baggage_weight_kg,
        special_notes: p.special_notes, is_minor: p.is_minor,
      })))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadManifest() }, [bookingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveManifest = async () => {
    setSaving(true)
    try {
      await airBookingsService.updateManifest(bookingId, { passengers: editPassengers })
      await loadManifest()
      setEditMode(false)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleLock = async () => {
    setLocking(true)
    try {
      await airBookingsService.lockManifest(bookingId)
      await loadManifest()
    } catch { /* ignore */ }
    finally { setLocking(false) }
  }

  const updatePax = (i: number, field: keyof ManifestPassengerInput, value: string | number | boolean | null) => {
    setEditPassengers(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--ink-3)', fontSize: 13 }}>Loading manifest…</div>
  if (!manifest) return <div style={{ padding: 32, color: 'var(--ink-3)', fontSize: 13 }}>No manifest data.</div>

  const { aircraft_empty_weight_kg: baseWt, fuel_weight_kg: fuelWt, total_pax_weight_kg: paxWt,
          total_baggage_weight_kg: bgWt, mtow_kg: mtow, total_weight_kg: totalWt, utilization_pct } = manifest

  const utilizeBadgeTone = utilization_pct <= 95 ? 'ok' : utilization_pct <= 100 ? 'warn' : 'danger'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="t-label">Manifest{manifest.is_locked ? ' · locked' : ''}</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              {manifest.passengers.length} passengers · {paxWt} kg pax + {bgWt} kg baggage
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm ghost" onClick={() => console.log('Print manifest')}><Icon name="printer" size={12} />Print manifest</button>
            {!manifest.is_locked && !editMode && (
              <button className="btn sm" onClick={() => setEditMode(true)}><Icon name="pencil" size={12} />Edit manifest</button>
            )}
            {editMode && (
              <>
                <button className="btn sm" onClick={() => setEditMode(false)}>Cancel</button>
                <button className="btn accent sm" onClick={handleSaveManifest} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </>
            )}
            {!manifest.is_locked && !editMode && (
              <button className="btn sm accent" onClick={handleLock} disabled={locking}>
                <Icon name="lock" size={12} />{locking ? 'Locking…' : 'Lock manifest'}
              </button>
            )}
          </div>
        </div>

        {/* MTOW bar */}
        <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--rule)', background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10 }}>
            <span className="t-label" style={{ padding: 0 }}>Weight & balance · MTOW</span>
            <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
              {booking.aircraft_model ?? 'Aircraft'} · {booking.aircraft_registration ?? '—'} · max {mtow.toLocaleString()} kg
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink)' }}>
              {totalWt.toLocaleString()} / {mtow.toLocaleString()} kg
            </span>
            <span className={`badge ${utilizeBadgeTone}`}><span className={`dot ${utilizeBadgeTone}`} />{utilization_pct.toFixed(1)}% · {manifest.is_within_limits ? 'within limits' : 'OVER MTOW'}</span>
          </div>
          <div style={{ display: 'flex', height: 18, borderRadius: 2, overflow: 'hidden', border: '1px solid var(--rule-strong)' }}>
            {[
              { l: 'Empty',  v: baseWt,         c: 'var(--ink-2)' },
              { l: 'Fuel',   v: fuelWt,          c: 'var(--info)' },
              { l: 'Pax',    v: paxWt,            c: 'var(--accent)' },
              { l: 'Bags',   v: bgWt,             c: 'var(--warn)' },
              { l: 'Margin', v: Math.max(0, mtow - totalWt), c: 'var(--surface-sunk)' },
            ].map((s, i) => (
              <div key={s.l} style={{
                width: `${(s.v / mtow) * 100}%`,
                background: s.c,
                borderRight: i < 4 ? '1px solid var(--surface)' : 'none',
              }} title={`${s.l}: ${s.v} kg`} />
            ))}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {[['Empty', baseWt, 'var(--ink-2)'], ['Fuel', fuelWt, 'var(--info)'], ['Pax', paxWt, 'var(--accent)'], ['Bags', bgWt, 'var(--warn)'], ['Margin', Math.max(0, mtow - totalWt), 'var(--ink-3)']].map(([l, v, c]) => (
              <span key={String(l)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                <span style={{ width: 8, height: 8, background: String(c) }} />
                {l} · {v} kg
              </span>
            ))}
          </div>
        </div>

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
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {manifest.passengers.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '24px 0' }}>No passengers in manifest.</td></tr>
              ) : manifest.passengers.map((p, idx) => (
                <tr key={p.id}>
                  <td className="num" style={{ color: 'var(--ink-3)' }}>{String(p.seq).padStart(2, '0')}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'var(--surface-sunk)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink)',
                      }}>{initials(p.name)}</div>
                      {editMode ? (
                        <input className="input" value={editPassengers[idx]?.name ?? p.name}
                          onChange={e => updatePax(idx, 'name', e.target.value)}
                          style={{ fontSize: 13, padding: '2px 6px', height: 28 }} />
                      ) : (
                        <span style={{ fontSize: 13 }}>{p.name}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {editMode ? (
                      <input type="number" className="input" value={editPassengers[idx]?.age ?? p.age ?? ''}
                        onChange={e => updatePax(idx, 'age', e.target.value ? Number(e.target.value) : null)}
                        style={{ fontSize: 13, padding: '2px 6px', height: 28, width: 60 }} />
                    ) : p.age}
                  </td>
                  <td className="num" style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {p.id_number ? p.id_number.replace(/(\S{4})\S+(\S{4})/, '$1 ●●●● $2') : '—'}
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {editMode ? (
                      <input type="number" className="input" value={editPassengers[idx]?.body_weight_kg ?? p.body_weight_kg}
                        onChange={e => updatePax(idx, 'body_weight_kg', Number(e.target.value))}
                        style={{ fontSize: 13, padding: '2px 6px', height: 28, width: 70 }} />
                    ) : `${p.body_weight_kg} kg`}
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {editMode ? (
                      <input type="number" className="input" value={editPassengers[idx]?.baggage_weight_kg ?? p.baggage_weight_kg}
                        onChange={e => updatePax(idx, 'baggage_weight_kg', Number(e.target.value))}
                        style={{ fontSize: 13, padding: '2px 6px', height: 28, width: 70 }} />
                    ) : `${p.baggage_weight_kg} kg`}
                  </td>
                  <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{p.special_notes ?? '—'}</td>
                  <td><button className="btn ghost icon sm"><Icon name="moreVert" size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editMode && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--rule)' }}>
            <button className="btn sm ghost" onClick={() => setEditPassengers(prev => [...prev, {
              id: null, name: '', age: null, id_number: null,
              body_weight_kg: 0, baggage_weight_kg: 0, special_notes: null, is_minor: false,
            }])}>
              <Icon name="plus" size={12} />Add passenger
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Quotes Tab (defined OUTSIDE page) ────────────────────────────────────────

interface QuotesTabProps {
  bookingId: string
  onReload: () => void
}

function QuotesTab({ bookingId, onReload }: QuotesTabProps) {
  const [quotes, setQuotes] = useState<CharterQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddQuote, setShowAddQuote] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)

  const loadQuotes = async () => {
    setLoading(true)
    try {
      const res = await airBookingsService.listQuotes(bookingId)
      setQuotes(res.quotes)
    } catch { setQuotes([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadQuotes() }, [bookingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePush = async (quoteId: string) => {
    setActingId(quoteId)
    try { await airBookingsService.pushQuote(bookingId, quoteId); await loadQuotes(); onReload() }
    catch { /* ignore */ }
    finally { setActingId(null) }
  }

  const handleDecline = async (quoteId: string) => {
    setActingId(quoteId)
    try { await airBookingsService.declineQuote(bookingId, quoteId); await loadQuotes() }
    catch { /* ignore */ }
    finally { setActingId(null) }
  }

  const fmtL = (v: number) => `₹${(v / 10000000).toFixed(2)} L`
  const total = (q: CharterQuote) => q.base_fare_minor + q.positioning_minor + q.night_halt_minor + q.catering_minor + q.fuel_surcharge_minor + q.taxes_minor

  if (loading) return <div style={{ padding: 32, color: 'var(--ink-3)', fontSize: 13 }}>Loading quotes…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="t-label">{quotes.length} quote{quotes.length !== 1 ? 's' : ''} received</span>
        <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        <button className="btn sm" onClick={() => setShowAddQuote(true)}>
          <Icon name="plus" size={13} />Add quote
        </button>
      </div>

      {quotes.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 12 }}>No quotes yet for this booking.</div>
          <button className="btn sm accent" onClick={() => setShowAddQuote(true)}><Icon name="plus" size={13} />Add first quote</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {quotes.map(q => (
              <div key={q.id} style={{
                background: 'var(--surface)',
                border: `1px solid ${q.is_recommended ? 'var(--accent)' : 'var(--rule)'}`,
                boxShadow: q.is_recommended ? '0 0 0 1px var(--accent)' : 'none',
                position: 'relative', display: 'flex', flexDirection: 'column',
              }}>
                {q.is_recommended && (
                  <div style={{
                    position: 'absolute', top: -1, left: -1, right: -1,
                    background: 'var(--accent)', color: '#fff',
                    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                    padding: '4px 14px', textAlign: 'center',
                  }}>Recommended · best fit</div>
                )}
                <div style={{ padding: q.is_recommended ? '32px 22px 18px' : '20px 22px 18px', borderBottom: '1px solid var(--rule)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div className="t-label">Operator</div>
                      <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>{q.operator_name ?? '—'}</h3>
                    </div>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      border: '1px solid var(--rule-strong)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: q.is_recommended ? 'var(--accent-soft)' : 'var(--surface-2)',
                      fontFamily: 'var(--font-serif)', fontSize: 18,
                      color: q.is_recommended ? 'var(--accent)' : 'var(--ink-2)',
                    }}>{q.score ?? '—'}</div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-2)' }}>{q.aircraft_model} · {q.aircraft_registration}</div>
                  <div className="t-meta" style={{ marginTop: 4 }}>{q.pax_capacity} pax · range {q.range_nm} nm</div>
                </div>

                <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                  {[
                    ['Depart', `${q.etd ? formatTs(q.etd) : '—'} · ${q.depart_icao ?? '—'}`],
                    ['Arrive', `${q.eta ? formatTs(q.eta) : '—'} · ${q.arrive_icao ?? '—'}`],
                    ['OTP · 30d', q.otp_30d_pct != null ? `${q.otp_30d_pct}%` : '—'],
                    ['Status', q.status],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="t-label" style={{ padding: 0 }}>{k}</div>
                      <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '14px 22px' }}>
                  <div className="t-label" style={{ marginBottom: 10 }}>Pricing breakdown</div>
                  {[
                    ['Base · hourly',  q.base_fare_minor],
                    ['Positioning',    q.positioning_minor],
                    ['Night halt',     q.night_halt_minor],
                    ['Catering',       q.catering_minor],
                    ['Fuel surcharge', q.fuel_surcharge_minor],
                    ['Taxes · GST',    q.taxes_minor],
                  ].map(([k, v]) => (
                    <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--ink-2)' }}>{k}</span>
                      <span className="num">{fmtL(Number(v))}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 500 }}>Total</span>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: q.is_recommended ? 'var(--accent)' : 'var(--ink)' }}>
                      {fmtL(total(q))}
                    </span>
                  </div>
                </div>

                {q.conditions && (
                  <div style={{ padding: '10px 22px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--rule)' }}>
                    <div className="t-label" style={{ marginBottom: 4 }}>Conditions</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.45 }}>{q.conditions}</div>
                  </div>
                )}

                {q.status !== 'declined' && (
                  <div style={{ padding: '14px 22px', borderTop: '1px solid var(--rule)', display: 'flex', gap: 8 }}>
                    <button className="btn sm" style={{ flex: 1 }} onClick={() => handleDecline(q.id)} disabled={actingId === q.id}>Decline</button>
                    <button className={`btn sm${q.is_recommended ? ' accent' : ''}`} style={{ flex: 2 }} onClick={() => handlePush(q.id)} disabled={actingId === q.id}>
                      {q.is_recommended ? 'Push to customer' : 'Push this'}
                    </button>
                  </div>
                )}
                {q.status === 'declined' && (
                  <div style={{ padding: '10px 22px', borderTop: '1px solid var(--rule)', background: 'var(--danger-soft)' }}>
                    <span className="badge danger"><span className="dot danger" />Declined</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Comparison strip */}
          {quotes.length >= 2 && (() => {
            const totals = quotes.map(q => total(q))
            const minT = Math.min(...totals)
            const maxT = Math.max(...totals)
            const avgT = totals.reduce((a, b) => a + b, 0) / totals.length
            return (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <span className="t-label">Price spread</span>
                <span style={{ flex: 1, height: 6, background: 'var(--rule)', borderRadius: 3, position: 'relative' }}>
                  {totals.map((t, i) => {
                    const pct = maxT > minT ? ((t - minT) / (maxT - minT)) * 100 : 50
                    return (
                      <span key={i} style={{
                        position: 'absolute', left: `${pct}%`, top: -3, width: 12, height: 12, borderRadius: '50%',
                        background: quotes[i].is_recommended ? 'var(--accent)' : 'var(--ink-2)',
                        transform: 'translateX(-50%)',
                      }} title={fmtL(t)} />
                    )
                  })}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                  Δ {fmtL(maxT - minT)} · min {fmtL(minT)} · max {fmtL(maxT)} · avg {fmtL(avgT)}
                </span>
              </div>
            )
          })()}
        </>
      )}

      {showAddQuote && (
        <AddQuoteModal bookingId={bookingId} onClose={() => setShowAddQuote(false)} onConfirm={() => { setShowAddQuote(false); loadQuotes() }} />
      )}
    </div>
  )
}

// ── Audit Tab (defined OUTSIDE page) ─────────────────────────────────────────

interface AuditTabProps {
  booking: AirBookingDetail
}

function AuditTab({ booking }: AuditTabProps) {
  const toneColor = (tone: string) => {
    if (tone === 'ok') return 'var(--accent)'
    if (tone === 'warn') return 'var(--warn)'
    if (tone === 'danger') return 'var(--danger)'
    if (tone === 'info') return 'var(--info)'
    return 'var(--ink-3)'
  }

  const timeline = [...booking.timeline].reverse()

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="t-label">Booking operation log</div>
          <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>All state changes · {booking.booking_ref}</h3>
        </div>
        <span className="badge"><span className="dot pending" />{timeline.length} events</span>
      </div>
      {timeline.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No events yet.</div>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="tbl">
            <thead>
              <tr><th>Time</th><th>Event</th><th>Details</th><th style={{ width: 80 }}>State</th></tr>
            </thead>
            <tbody>
              {timeline.map(e => (
                <tr key={e.id}>
                  <td className="t-meta" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(e.created_at)}</td>
                  <td style={{ fontSize: 12.5, fontWeight: 500 }}>{e.event}</td>
                  <td className="t-meta" style={{ maxWidth: 280, wordBreak: 'break-word' }}>{e.message ?? '—'}</td>
                  <td>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: toneColor(e.tone), textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {e.tone}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type DetailTab = 'overview' | 'manifest' | 'quotes' | 'payments' | 'audit'

export default function AirBookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [booking, setBooking] = useState<AirBookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')

  const [showCancel, setShowCancel] = useState(false)
  const [showReassign, setShowReassign] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [advanceError, setAdvanceError] = useState('')

  const [showAddNote, setShowAddNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const loadBooking = async () => {
    if (!id) return
    setLoading(true)
    try {
      const b = await airBookingsService.getBooking(id)
      setBooking(b)
    } catch {
      setError('Booking not found')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBooking() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdvanceStatus = async () => {
    if (!id || !booking) return
    const next = AIR_NEXT_STATUS[booking.status]
    if (!next) return
    setAdvancing(true); setAdvanceError('')
    try {
      await airBookingsService.advanceStatus(id, { status: next })
      await loadBooking()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setAdvanceError(err?.response?.data?.detail || 'Status advance failed')
    } finally { setAdvancing(false) }
  }

  const handleAddNote = async () => {
    if (!id || !noteText.trim()) return
    setSavingNote(true)
    try {
      await airBookingsService.addNote(id, { note: noteText.trim() })
      setNoteText(''); setShowAddNote(false)
      await loadBooking()
    } catch { /* ignore */ }
    finally { setSavingNote(false) }
  }

  if (loading) {
    return (
      <Shell activeId="bookings-a" breadcrumb="Operations · Air bookings" title="Loading…">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading booking…</div>
      </Shell>
    )
  }

  if (error || !booking) {
    return (
      <Shell activeId="bookings-a" breadcrumb="Operations · Air bookings" title="Not found">
        <div style={{ padding: 40 }}>
          <div style={{ color: 'var(--danger)', marginBottom: 16 }}>{error || 'Booking not found'}</div>
          <button className="btn sm" onClick={() => navigate('/bookings/air')}><Icon name="chevLeft" size={13} /> Back to air bookings</button>
        </div>
      </Shell>
    )
  }

  const fare = booking.fare_final_minor ?? booking.fare_estimate_minor
  const nextStatus = AIR_NEXT_STATUS[booking.status]

  const TABS: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'manifest', label: 'Manifest' },
    { key: 'quotes',   label: 'Quotes' },
    { key: 'payments', label: 'Payments' },
    { key: 'audit',    label: 'Audit' },
  ]

  return (
    <Shell
      activeId="bookings-a"
      breadcrumb="Operations · Air bookings"
      title={`${booking.booking_ref} · ${booking.route_from} → ${booking.route_to}`}
      subtitle={`${booking.service_label} · ${booking.operator_name ?? '—'} · ETD ${formatTs(booking.etd)} · ${booking.pax_count} pax · ${fmtMinor(fare)}`}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isMobile && (
            <button className="btn sm" onClick={() => navigate('/bookings/air')}>
              <Icon name="chevLeft" size={13} /> Back
            </button>
          )}
          <button className="btn sm" onClick={() => setShowReassign(true)}>
            <Icon name="refresh" size={13} />Reassign operator
          </button>
          <button className="btn sm" onClick={() => console.log('Notify pax — coming soon')}>
            <Icon name="envelope" size={13} />Notify pax
          </button>
          {nextStatus && (
            <button className="btn sm accent" onClick={handleAdvanceStatus} disabled={advancing}>
              {advancing ? 'Updating…' : `Mark ${nextStatus}`}
            </button>
          )}
          {!['Cancelled', 'Completed', 'Refunded', 'Rescheduled'].includes(booking.status) && (
            <button className="btn sm danger" onClick={() => setShowCancel(true)}>Cancel</button>
          )}
        </div>
      }
    >
      {isMobile && (
        <button
          onClick={() => navigate('/bookings/air')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            width: '100%', fontSize: 13, color: 'var(--accent)',
            background: 'var(--surface-2)', border: 'none',
            borderBottom: '1px solid var(--rule)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <Icon name="chevLeft" size={14} stroke={2} />
          Back to air bookings
        </button>
      )}

      <div style={{
        display: isMobile ? 'block' : 'grid',
        gridTemplateColumns: isMobile ? undefined : '1fr 380px',
        minHeight: '100%',
      }}>
        {/* Main content */}
        <div>
          {advanceError && (
            <div style={{ margin: '12px 24px 0', padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {advanceError}
              <button className="btn ghost icon sm" onClick={() => setAdvanceError('')}><Icon name="close" size={12} /></button>
            </div>
          )}

          {/* Tab bar */}
          <div style={{ borderBottom: '1px solid var(--rule)', background: 'var(--surface)', display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {TABS.map(tab => (
              <div key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '14px 18px', cursor: 'pointer', fontSize: 13,
                color: activeTab === tab.key ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: activeTab === tab.key ? 500 : 400,
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1, whiteSpace: 'nowrap',
              }}>{tab.label}</div>
            ))}
          </div>

          <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                {/* KPI strip */}
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--rule)',
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
                }}>
                  {[
                    ['State',         null,   aStatusBadge(booking.status)],
                    ['Distance',      booking.distance_nm ? `${booking.distance_nm} nm` : '—', null],
                    ['Flight time',   booking.flight_time_min ? `${booking.flight_time_min} min` : '—', null],
                    ['Fuel weight',   booking.fuel_weight_kg ? `${booking.fuel_weight_kg} kg` : '—', null],
                    ['MTOW',          booking.aircraft_mtow_kg ? `${booking.aircraft_mtow_kg.toLocaleString()} kg` : '—', null],
                    ['Weather · pad', 'CAVOK', null],
                  ].map(([k, v, jsx], i) => (
                    <div key={String(k)} style={{
                      padding: '14px 18px',
                      borderRight: isMobile ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none') : (i < 5 ? '1px solid var(--rule)' : 'none'),
                      borderBottom: isMobile && i < 4 ? '1px solid var(--rule)' : 'none',
                    }}>
                      <div className="t-label" style={{ padding: 0 }}>{String(k)}</div>
                      <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                        {jsx ?? String(v)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart + timeline */}
                <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="t-label">Sectional chart</div>
                        <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>{booking.route_from} → {booking.route_to}</h3>
                      </div>
                      {aStatusBadge(booking.status)}
                    </div>
                    <div style={{ height: 280 }}>
                      <FlightChart route_from={booking.route_from} route_to={booking.route_to} />
                    </div>
                  </div>

                  <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                      <div className="t-label">State timeline</div>
                      <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Flight progress</h3>
                    </div>
                    <div style={{ padding: '14px 18px' }}>
                      {booking.timeline.length === 0 ? (
                        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No events yet.</div>
                      ) : booking.timeline.map((e, i) => (
                        <div key={e.id} style={{ display: 'flex', gap: 14, paddingBottom: i < booking.timeline.length - 1 ? 14 : 0, position: 'relative' }}>
                          <div style={{ position: 'relative', width: 12, flexShrink: 0 }}>
                            <span className={`dot ${e.tone}`} style={{
                              width: i === 0 ? 10 : 8, height: i === 0 ? 10 : 8,
                              position: 'absolute', top: 4, left: 1,
                              boxShadow: i === 0 ? `0 0 0 4px color-mix(in oklab, var(--${e.tone === 'info' ? 'info' : 'accent'}) 15%, var(--surface))` : undefined,
                            }} />
                            {i < booking.timeline.length - 1 && (
                              <span style={{ position: 'absolute', left: 5, top: 16, bottom: -14, width: 1, background: 'var(--rule-strong)' }} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{e.event}</span>
                              <span className="t-meta">{formatTs(e.created_at)}</span>
                            </div>
                            {e.message && <div className="t-meta" style={{ marginTop: 2, color: 'var(--ink-3)' }}>{e.message}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* MANIFEST TAB */}
            {activeTab === 'manifest' && (
              <ManifestTab bookingId={booking.id} booking={booking} />
            )}

            {/* QUOTES TAB */}
            {activeTab === 'quotes' && (
              <QuotesTab bookingId={booking.id} onReload={loadBooking} />
            )}

            {/* PAYMENTS TAB */}
            {activeTab === 'payments' && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: 24 }}>
                <div className="t-label" style={{ marginBottom: 14 }}>Payment details</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  {[
                    ['Payment method', booking.payment_method ?? '—'],
                    ['Fare estimate',  fmtMinor(booking.fare_estimate_minor)],
                    ['Fare final',     booking.fare_final_minor != null ? fmtMinor(booking.fare_final_minor) : 'Pending'],
                    ['Status',         booking.status],
                  ].map(([k, v]) => (
                    <div key={k} style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                      <div className="t-meta">{k}</div>
                      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AUDIT TAB */}
            {activeTab === 'audit' && <AuditTab booking={booking} />}
          </div>
        </div>

        {/* Right rail */}
        {!isMobile && (
          <aside style={{ background: 'var(--surface)', borderLeft: '1px solid var(--rule)', padding: 24, overflowY: 'auto' }}>
            {/* Customer */}
            <div className="t-label" style={{ marginBottom: 12 }}>Customer</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'var(--surface-sunk)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)',
              }}>{initials(booking.customer_name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: 'var(--ink)' }}>{booking.customer_name ?? '—'}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>{booking.service_label}</div>
                {booking.customer_phone && <div className="t-meta" style={{ marginTop: 2 }}>{booking.customer_phone}</div>}
              </div>
              <button className="btn icon sm"><Icon name="phone" size={12} /></button>
            </div>

            <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

            {/* Operator */}
            <div className="t-label" style={{ marginBottom: 12 }}>Operator</div>
            {booking.operator_name ? (
              <div style={{ padding: '14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 3, flexShrink: 0,
                    background: 'var(--accent-soft)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
                  }}><Icon name="helipad" size={18} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14 }}>{booking.operator_name}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{booking.operator_fleet_count != null ? `${booking.operator_fleet_count} aircraft` : 'DGCA NSOP'}</div>
                  </div>
                </div>
                {booking.operator_otp_pct != null && (
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div className="t-label" style={{ padding: 0 }}>OTP · 30d</div>
                      <div style={{ marginTop: 3, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{booking.operator_otp_pct}%</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No operator assigned</div>
            )}

            <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

            {/* Aircraft + Crew */}
            <div className="t-label" style={{ marginBottom: 12 }}>Aircraft · Crew</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {booking.aircraft_model && (
                <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13 }}>{booking.aircraft_model}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{booking.aircraft_registration}</span>
                  </div>
                  <div className="t-meta" style={{ marginTop: 4 }}>
                    {booking.aircraft_seats ? `${booking.aircraft_seats} seats` : ''}
                    {booking.aircraft_mtow_kg ? ` · MTOW ${booking.aircraft_mtow_kg.toLocaleString()} kg` : ''}
                    {booking.aircraft_airworthy_until ? ` · airworthy until ${formatDateTime(booking.aircraft_airworthy_until)}` : ''}
                  </div>
                </div>
              )}
              {booking.pilot_name && (
                <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-sunk)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                    }}>{initials(booking.pilot_name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{booking.pilot_name} · PIC</div>
                      {booking.pilot_license && <div className="t-meta" style={{ marginTop: 2 }}>{booking.pilot_license}</div>}
                    </div>
                  </div>
                </div>
              )}
              {booking.copilot_name && (
                <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-sunk)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                    }}>{initials(booking.copilot_name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{booking.copilot_name} · co-pilot</div>
                    </div>
                  </div>
                </div>
              )}
              {!booking.aircraft_model && !booking.pilot_name && (
                <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No aircraft/crew assigned</div>
              )}
            </div>

            <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

            {/* Admin notes */}
            <div className="t-label" style={{ marginBottom: 12 }}>Admin notes · internal</div>
            {booking.admin_notes.length === 0 ? (
              <div style={{ padding: '12px 14px', border: '1px dashed var(--rule-strong)', borderRadius: 3, background: 'var(--surface-2)', fontSize: 12.5, color: 'var(--ink-4)' }}>
                No notes yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {booking.admin_notes.map(n => (
                  <div key={n.id} style={{ padding: '10px 12px', border: '1px dashed var(--rule-strong)', borderRadius: 3, background: 'var(--surface-2)', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                    {n.note}
                    <div className="t-meta" style={{ marginTop: 4 }}>{formatDateTime(n.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
            {showAddNote ? (
              <div style={{ marginTop: 10 }}>
                <div className="input">
                  <input placeholder="Add a note…" value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className="btn sm" onClick={() => { setShowAddNote(false); setNoteText('') }}>Cancel</button>
                  <button className="btn accent sm" onClick={handleAddNote} disabled={savingNote || !noteText.trim()}>
                    {savingNote ? 'Saving…' : 'Save note'}
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn sm" style={{ marginTop: 10, width: '100%' }} onClick={() => setShowAddNote(true)}>
                <Icon name="plus" size={12} />Add note
              </button>
            )}

            <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

            {/* Quotes shortcut */}
            <button className="btn sm ghost" style={{ width: '100%' }} onClick={() => navigate(`/bookings/air/quotes/${booking.id}`)}>
              <Icon name="external" size={13} />View quotes page
            </button>
          </aside>
        )}
      </div>

      {/* Modals */}
      {showCancel && booking && (
        <CancelAirModal
          booking={booking}
          onClose={() => setShowCancel(false)}
          onConfirm={() => { setShowCancel(false); loadBooking() }}
        />
      )}
      {showReassign && (
        <ReassignOperatorModal
          onClose={() => setShowReassign(false)}
          onConfirm={async (operatorId, aircraftId, note) => {
            await airBookingsService.assignOperator(booking.id, { operator_id: operatorId, aircraft_id: aircraftId, note })
            setShowReassign(false)
            await loadBooking()
          }}
        />
      )}
    </Shell>
  )
}
