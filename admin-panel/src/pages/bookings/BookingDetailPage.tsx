import { useState, useEffect, useRef } from 'react'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useNavigate, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { bookingsService } from '../../services/bookingsService'
import { driverService } from '../../services/driverService'
import { auditService } from '../../services/auditService'
import { settingsService } from '../../services/settingsService'
import type {
  RoadBookingDetail,
  CancelBookingBody,
  ReassignBody,
  AdjustFareBody,
  RefundBody,
  OpenDisputeBody,
  ResolveDisputeBody,
  AddNoteBody,
  AdvanceStatusBody,
  CancelPreview,
  BookingTelemetry,
} from '../../services/bookingsService'
import type { Driver } from '../../services/driverService'
import type { AuditEventSummary } from '../../services/auditService'
import { useFormatMoney, useCurrencySymbol, formatTimeHM, formatDateTime } from '../../lib/utils'

// Fix leaflet default icon paths (needed when bundled with Vite)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Helpers ───────────────────────────────────────────────────────────────────


function bStatusBadge(s: string) {
  const map: Record<string, { tone: string; dot: boolean }> = {
    InProgress: { tone: 'ok', dot: true },
    Arrived:    { tone: 'warn', dot: true },
    Accepted:   { tone: 'info', dot: true },
    Scheduled:  { tone: 'pending', dot: true },
    Completed:  { tone: 'pending', dot: false },
    Cancelled:  { tone: 'danger', dot: true },
    Disputed:   { tone: 'danger', dot: true },
    Requested:  { tone: 'warn', dot: true },
    Refunded:   { tone: 'info', dot: true },
  }
  const cfg = map[s] || { tone: 'pending', dot: false }
  const label = s === 'InProgress' ? 'On trip' : s
  return (
    <span className={`badge ${cfg.tone}`}>
      {cfg.dot && <span className={`dot ${cfg.tone}`} />}
      {label}
    </span>
  )
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function formatTs(iso: string): string {
  try { return formatTimeHM(iso) } catch { return iso }
}

// ── Cancel Modal ──────────────────────────────────────────────────────────────

interface CancelModalProps {
  booking: RoadBookingDetail
  onClose: () => void
  onConfirm: (body: CancelBookingBody) => Promise<void>
}

const CANCEL_REASONS = [
  'Customer no-show',
  "Driver couldn't find",
  'Vehicle breakdown',
  'Customer requested',
  'Safety incident',
  'Other',
]

function CancelModal({ booking, onClose, onConfirm }: CancelModalProps) {
  const fmtMinor = useFormatMoney()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [destination, setDestination] = useState<'original' | 'wallet' | 'none'>('original')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isForbidden, setIsForbidden] = useState(false)
  const [preview, setPreview] = useState<CancelPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [noShowWaitMin, setNoShowWaitMin] = useState(5)
  const [noShowFeePct, setNoShowFeePct] = useState(25)

  useEffect(() => {
    settingsService.getSettings().then(s => {
      const dest = s.refund_destination_default as 'original' | 'wallet' | 'none'
      if (dest) setDestination(dest)
      setNoShowWaitMin(s.no_show_wait_minutes ?? 5)
      setNoShowFeePct(s.no_show_fee_pct ?? 25)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    bookingsService.getCancelPreview(booking.id)
      .then(p => setPreview(p))
      .catch(async () => {
        // Fallback: try to read real values from platform settings
        const fare = booking.fare_final_minor ?? booking.fare_estimate_minor
        try {
          const s = await settingsService.getSettings()
          const feePct = s.cancellation_fee_pct ?? 10
          const freeMin = s.cancellation_free_window_min ?? 5
          const cancelFee = Math.max(5000, Math.round(fare * feePct / 100))
          setPreview({
            booking_id: booking.id,
            fare_minor: fare,
            cancel_fee_minor: cancelFee,
            net_refund_minor: fare - cancelFee,
            is_free_window: false,
            free_window_min: freeMin,
            fee_pct: feePct,
            policy: `${feePct}% cancellation fee · ${freeMin}min free window`,
          })
        } catch {
          // Last resort static fallback
          const cancelFee = Math.max(5000, Math.round(fare * 0.1))
          setPreview({
            booking_id: booking.id,
            fare_minor: fare,
            cancel_fee_minor: cancelFee,
            net_refund_minor: fare - cancelFee,
            is_free_window: false,
            free_window_min: 5,
            fee_pct: 10,
            policy: '10% cancellation fee · 5min free window',
          })
        }
      })
      .finally(() => setLoadingPreview(false))
  }, [booking.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const isNoShow = reason === 'Customer no-show'
  const fare = booking.fare_final_minor ?? booking.fare_estimate_minor
  const noShowFeeMinor = Math.max(5000, Math.round(fare * noShowFeePct / 100))
  const cancelFee = isNoShow ? noShowFeeMinor : (preview?.cancel_fee_minor ?? 0)
  const netRefund = fare - cancelFee
  const needsApproval = netRefund > 200000

  const handleConfirm = async () => {
    if (!reason) { setError('Please select a cancellation reason'); return }
    setSaving(true); setError('')
    try {
      await onConfirm({ reason, note: note || null, refund_destination: destination })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Cancellation failed')
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(15,13,10,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 64, paddingLeft: 16, paddingRight: 16,
      overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule-strong)',
        boxShadow: 'var(--shadow-pop)',
        width: '100%', maxWidth: 720,
        marginBottom: 40,
      }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 4, flexShrink: 0,
            background: 'var(--danger-soft)', color: 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid color-mix(in oklab, var(--danger) 24%, var(--rule-strong))',
          }}>
            <Icon name="close" size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="t-label">Cancel booking · {booking.booking_ref}</div>
            <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>
              Cancel this booking?
            </h2>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-3)' }}>
              {booking.pickup_address} → {booking.drop_address} · {booking.customer_name}
            </div>
          </div>
          <button className="btn ghost icon sm" onClick={onClose}>
            <Icon name="close" size={14} />
          </button>
        </div>

        <div style={{ padding: '20px 28px' }}>
          {error && (
            <div style={{ marginBottom: 14, padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {/* Reason grid */}
          <div className="t-label" style={{ marginBottom: 10 }}>Reason · required</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {CANCEL_REASONS.map(r => (
              <div key={r} onClick={() => setReason(r)} style={{
                padding: '10px 12px',
                border: `1px solid ${reason === r ? 'var(--accent)' : 'var(--rule)'}`,
                background: reason === r ? 'color-mix(in oklab, var(--accent) 10%, var(--surface))' : 'var(--surface)',
                borderRadius: 3, fontSize: 13, color: 'var(--ink-2)',
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              }}>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  border: `1px solid ${reason === r ? 'var(--accent)' : 'var(--rule-strong)'}`,
                  background: reason === r ? 'var(--accent)' : 'var(--surface)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {reason === r && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                </span>
                {r}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="input">
              <input placeholder="Add a note for the audit log (optional)" value={note} onChange={e => setNote(e.target.value)} />
            </div>
          </div>

          {/* No-show policy banner */}
          {isNoShow && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule-strong))', borderRadius: 3, fontSize: 12.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warn)', fontWeight: 500, marginBottom: 4 }}>
                <Icon name="clock" size={13} /> No-show policy
              </div>
              <div style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Driver must wait <strong>{noShowWaitMin} min</strong> before marking no-show.
                A <strong>{noShowFeePct}%</strong> no-show fee applies.
              </div>
            </div>
          )}

          {/* Refund preview — from settings */}
          <div style={{ marginTop: 20, padding: '18px 20px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="t-label">Refund preview</div>
              {loadingPreview ? (
                <span className="t-meta">Computing…</span>
              ) : (
                <span className="t-meta">{preview?.policy}</span>
              )}
            </div>
            {preview?.is_free_window && (
              <div style={{ marginBottom: 10, padding: '8px 12px', background: 'color-mix(in oklab, var(--accent) 10%, var(--surface))', border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--accent)' }}>
                ✓ Within {preview.free_window_min}-minute free cancellation window — no fee applies.
              </div>
            )}
            <table className="tbl" style={{ marginTop: 0 }}>
              <tbody>
                {[
                  ['Original fare', fmtMinor(preview?.fare_minor ?? 0), 'var(--ink-2)'],
                  [isNoShow
                    ? `No-show fee · ${noShowFeePct}%`
                    : 'Cancellation fee' + (preview?.is_free_window ? ' (waived)' : ` · ${preview?.fee_pct ?? 10}%`),
                   cancelFee === 0 ? fmtMinor(0) : `−${fmtMinor(cancelFee)}`, 'var(--warn)'],
                ].map(([k, v, c]) => (
                  <tr key={k}>
                    <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>{k}</td>
                    <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: c }}>{v}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '1px solid var(--rule-strong)' }}>
                  <td style={{ padding: '14px 0 0', border: 0, fontSize: 14, fontWeight: 500 }}>Net refund to customer</td>
                  <td className="num" style={{ padding: '14px 0 0', border: 0, textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--accent)' }}>
                    {fmtMinor(netRefund)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Destination */}
          <div style={{ marginTop: 20 }}>
            <div className="field">
              <label className="field-label">Refund destination</label>
              <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                <select value={destination} onChange={e => setDestination(e.target.value as 'original' | 'wallet' | 'none')}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}>
                  <option value="original">Original payment instrument</option>
                  <option value="wallet">Wallet credit (instant)</option>
                  <option value="none">No refund</option>
                </select>
              </div>
              <div className="field-help">Wallet credit is instant. Original instrument takes 3–5 business days.</div>
            </div>
          </div>

          {/* Two-person rule */}
          {needsApproval ? (
            <div style={{ marginTop: 20, padding: '14px 16px', border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule-strong))', background: 'var(--warn-soft)', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warn)' }}>
                <Icon name="alert" size={13} />
                <span className="t-label" style={{ padding: 0, color: 'var(--warn)' }}>Two-person rule · Finance approval required</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
                Refund of {fmtMinor(netRefund)} exceeds {fmtMinor(200000)}. Finance Manager approval required.
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 20, padding: '14px 16px', border: '1px solid color-mix(in oklab, var(--info) 24%, var(--rule-strong))', background: 'var(--info-soft)', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--info)' }}>
                <Icon name="shield" size={13} />
                <span className="t-label" style={{ padding: 0, color: 'var(--info)' }}>Two-person rule · refund under threshold</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
                {fmtMinor(netRefund)} is below the {fmtMinor(200000)} threshold. You can process this directly.
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="t-meta">All cancellations are audit-logged</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={onClose} disabled={saving}>Keep booking</button>
            <button className="btn danger" onClick={handleConfirm} disabled={saving || !reason || loadingPreview}>
              {saving ? 'Cancelling…' : `Cancel & refund ${fmtMinor(netRefund)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Reassign Modal (with live driver search) ──────────────────────────────────

interface ReassignModalProps {
  onClose: () => void
  onConfirm: (body: ReassignBody) => Promise<void>
}

function ReassignModal({ onClose, onConfirm }: ReassignModalProps) {
  const [search, setSearch] = useState('')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim() || selectedDriver) return
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await driverService.listDrivers({ search: search.trim(), per_page: 10 })
        setDrivers(res.items)
        setShowDropdown(true)
      } catch { setDrivers([]) }
      finally { setSearching(false) }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, selectedDriver])

  const selectDriver = (d: Driver) => {
    setSelectedDriver(d)
    setSearch(d.name)
    setShowDropdown(false)
  }

  const handleConfirm = async () => {
    if (!selectedDriver) { setError('Please select a driver'); return }
    if (!reason.trim()) { setError('Reason is required'); return }
    setSaving(true); setError('')
    try {
      await onConfirm({ driver_id: selectedDriver.id, reason })
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
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Reassign driver</span>
          <button className="btn ghost sm" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>{error}</div>}

          <div className="field" style={{ position: 'relative' }}>
            <label className="field-label">Search driver <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input">
              <Icon name="search" size={14} className="icon" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedDriver(null) }}
                placeholder="Name or phone…"
              />
              {searching && <span className="t-meta" style={{ paddingRight: 8 }}>…</span>}
              {selectedDriver && (
                <button
                  className="btn ghost icon sm"
                  onClick={() => { setSelectedDriver(null); setSearch('') }}
                  style={{ marginRight: 4 }}
                >
                  <Icon name="close" size={11} />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && drivers.length > 0 && !selectedDriver && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--surface)', border: '1px solid var(--rule)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                maxHeight: 220, overflowY: 'auto',
              }}>
                {drivers.map(d => (
                  <div
                    key={d.id}
                    onClick={() => selectDriver(d)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--rule-soft)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>{d.name}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>
                      {d.phone}
                      {d.vehicle_class && ` · ${d.vehicle_class}`}
                      {d.vehicle_plate && ` · ${d.vehicle_plate}`}
                      {' · '}
                      <span style={{ color: d.online_status === 'online' ? 'var(--accent)' : 'var(--ink-4)' }}>
                        {d.online_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showDropdown && drivers.length === 0 && !searching && search.length > 1 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--surface)', border: '1px solid var(--rule)', padding: '12px 14px', fontSize: 13, color: 'var(--ink-3)' }}>
                No drivers found for "{search}"
              </div>
            )}
          </div>

          {selectedDriver && (
            <div style={{ padding: '10px 12px', background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))', border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--rule))', borderRadius: 3 }}>
              <div style={{ fontSize: 13 }}>{selectedDriver.name}</div>
              <div className="t-meta" style={{ marginTop: 2 }}>
                {selectedDriver.phone} · {selectedDriver.vehicle_class ?? '—'} · {selectedDriver.vehicle_plate ?? '—'}
              </div>
            </div>
          )}

          <div className="field">
            <label className="field-label">Reason <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input">
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for reassignment…" />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn accent sm" onClick={handleConfirm} disabled={saving || !selectedDriver}>{saving ? 'Reassigning…' : 'Reassign'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Adjust Fare Modal ─────────────────────────────────────────────────────────

interface AdjustFareModalProps {
  booking: RoadBookingDetail
  onClose: () => void
  onConfirm: (body: AdjustFareBody) => Promise<void>
}

function AdjustFareModal({ booking, onClose, onConfirm }: AdjustFareModalProps) {
  const sym = useCurrencySymbol()
  const current = booking.fare_final_minor ?? booking.fare_estimate_minor
  const [newFare, setNewFare] = useState(String(current / 100))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    const newFareMinor = Math.round(parseFloat(newFare) * 100)
    if (isNaN(newFareMinor) || newFareMinor <= 0) { setError('Enter a valid fare amount'); return }
    if (!reason.trim()) { setError('Reason is required'); return }
    setSaving(true); setError('')
    try {
      await onConfirm({ new_fare_minor: newFareMinor, reason })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Adjust fare failed')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,13,10,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 4, width: '100%', maxWidth: 400 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Adjust fare</span>
          <button className="btn ghost sm" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>{error}</div>}
          <div className="field">
            <label className="field-label">Current fare</label>
            <div style={{ fontSize: 20, fontFamily: 'var(--font-serif)', color: 'var(--ink-3)' }}>{fmtMinor(current)}</div>
          </div>
          <div className="field">
            <label className="field-label">New fare ({sym}) <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input">
              <input type="number" min={0} step={0.01} value={newFare} onChange={e => setNewFare(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Reason <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input">
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Route deviation correction…" />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn accent sm" onClick={handleConfirm} disabled={saving}>{saving ? 'Adjusting…' : 'Adjust fare'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Refund Modal ──────────────────────────────────────────────────────────────

interface RefundModalProps {
  booking: RoadBookingDetail
  onClose: () => void
  onConfirm: (body: RefundBody) => Promise<void>
}

function RefundModal({ booking, onClose, onConfirm }: RefundModalProps) {
  const sym = useCurrencySymbol()
  const fmtMinor = useFormatMoney()
  const fare = booking.fare_final_minor ?? booking.fare_estimate_minor
  const [amount, setAmount] = useState(String(fare / 100))
  const [destination, setDestination] = useState<'original' | 'wallet'>('original')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    settingsService.getSettings().then(s => {
      const dest = s.refund_destination_default as 'original' | 'wallet'
      if (dest === 'original' || dest === 'wallet') setDestination(dest)
    }).catch(() => {})
  }, [])

  const handleConfirm = async () => {
    const amountMinor = Math.round(parseFloat(amount) * 100)
    if (isNaN(amountMinor) || amountMinor <= 0) { setError('Enter a valid refund amount'); return }
    if (!reason.trim()) { setError('Reason is required'); return }
    setSaving(true); setError('')
    try {
      await onConfirm({ amount_minor: amountMinor, destination, reason })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Refund failed')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,13,10,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 4, width: '100%', maxWidth: 400 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Process refund</span>
          <button className="btn ghost sm" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>{error}</div>}
          <div className="field">
            <label className="field-label">Refund amount ({sym}) <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input">
              <input type="number" min={0} step={0.01} value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Destination</label>
            <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
              <select value={destination} onChange={e => setDestination(e.target.value as 'original' | 'wallet')}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}>
                <option value="original">Original payment instrument</option>
                <option value="wallet">Wallet credit</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Reason <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input">
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Customer goodwill…" />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn accent sm" onClick={handleConfirm} disabled={saving}>{saving ? 'Processing…' : 'Process refund'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Dispute Modal ─────────────────────────────────────────────────────────────

interface DisputeModalProps {
  onClose: () => void
  onConfirm: (body: OpenDisputeBody) => Promise<void>
}

function DisputeModal({ onClose, onConfirm }: DisputeModalProps) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!reason.trim()) { setError('Reason is required'); return }
    setSaving(true); setError('')
    try {
      await onConfirm({ reason, note: note || null })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Failed to open dispute')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,13,10,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 4, width: '100%', maxWidth: 420 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Open dispute</span>
          <button className="btn ghost sm" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>{error}</div>}
          <div className="field">
            <label className="field-label">Reason <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input">
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Route deviation · longer than necessary…" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Note</label>
            <div className="input">
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Additional context…" />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn accent sm" onClick={handleConfirm} disabled={saving}>{saving ? 'Opening…' : 'Open dispute'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Map Tab ───────────────────────────────────────────────────────────────────

function MapTab({ booking }: { booking: RoadBookingDetail }) {
  const [telemetry, setTelemetry] = useState<BookingTelemetry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    bookingsService.getTelemetry(booking.id)
      .then(t => setTelemetry(t))
      .catch(() => setTelemetry(null))
      .finally(() => setLoading(false))
  }, [booking.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickupPos: [number, number] | null = telemetry?.pickup_lat && telemetry?.pickup_lng
    ? [telemetry.pickup_lat, telemetry.pickup_lng]
    : booking.pickup_lat && booking.pickup_lng
      ? [booking.pickup_lat, booking.pickup_lng]
      : null

  const dropPos: [number, number] | null = telemetry?.drop_lat && telemetry?.drop_lng
    ? [telemetry.drop_lat, telemetry.drop_lng]
    : booking.drop_lat && booking.drop_lng
      ? [booking.drop_lat, booking.drop_lng]
      : null

  const center: [number, number] = pickupPos ?? [12.9716, 77.5946] // default: Bengaluru
  const gpsPoints: [number, number][] = (telemetry?.gps_points ?? []).map(p => [p.lat, p.lng])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {loading ? (
        <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          Loading map…
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="t-label">Route map</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                {booking.pickup_address.split('·')[0].trim()} → {booking.drop_address.split('·')[0].trim()}
              </h3>
            </div>
            {!pickupPos && <span className="badge warn"><span className="dot warn" />No GPS coordinates</span>}
          </div>

          <div style={{ height: 400 }}>
            <MapContainer center={center} zoom={pickupPos ? 13 : 11} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {pickupPos && (
                <Marker position={pickupPos}>
                  <Popup><b>Pickup</b><br />{booking.pickup_address}</Popup>
                </Marker>
              )}
              {dropPos && (
                <Marker position={dropPos}>
                  <Popup><b>Drop</b><br />{booking.drop_address}</Popup>
                </Marker>
              )}
              {gpsPoints.length > 1 && (
                <Polyline positions={gpsPoints} color="#0F8A5F" weight={3} opacity={0.8} dashArray="6 4" />
              )}
              {pickupPos && dropPos && gpsPoints.length === 0 && (
                <Polyline positions={[pickupPos, dropPos]} color="#0F8A5F" weight={2} opacity={0.5} dashArray="8 6" />
              )}
            </MapContainer>
          </div>

          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              ['Distance', booking.distance_km ? `${booking.distance_km} km` : '—'],
              ['GPS points', gpsPoints.length > 0 ? `${gpsPoints.length} recorded` : 'No live trace'],
              ['Avg speed', telemetry?.avg_speed_kmh ? `${telemetry.avg_speed_kmh} km/h` : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Audit Tab — uses booking timeline + system audit events ──────────────────

function AuditTab({ booking }: { booking: RoadBookingDetail }) {
  // Primary: booking's own timeline (always populated)
  const timeline = [...booking.timeline].reverse() // oldest first for audit

  // Secondary: system-wide audit events matching this booking
  const [sysEvents, setSysEvents] = useState<AuditEventSummary[]>([])
  useEffect(() => {
    auditService.listEvents({ search: booking.booking_ref, page_size: 50 })
      .then(res => setSysEvents(res.items))
      .catch(() => setSysEvents([]))
  }, [booking.booking_ref]) // eslint-disable-line react-hooks/exhaustive-deps

  const toneColor = (tone: string) => {
    if (tone === 'ok') return 'var(--accent)'
    if (tone === 'warn') return 'var(--warn)'
    if (tone === 'danger') return 'var(--danger)'
    if (tone === 'info') return 'var(--info)'
    return 'var(--ink-3)'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Booking operation log */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="t-label">Booking operation log</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              All state changes · {booking.booking_ref}
            </h3>
          </div>
          <span className="badge"><span className="dot pending" />{timeline.length} events</span>
        </div>
        {timeline.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No events yet.</div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Details</th>
                  <th style={{ width: 80 }}>State</th>
                </tr>
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

      {/* System audit events */}
      {sysEvents.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">System audit events · admin actions</div>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="tbl">
              <thead>
                <tr><th>Time</th><th>Action</th><th>Actor</th><th>Severity</th></tr>
              </thead>
              <tbody>
                {sysEvents.map(e => (
                  <tr key={e.id}>
                    <td className="t-meta" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(e.timestamp)}</td>
                    <td style={{ fontSize: 12.5 }}>{e.action}</td>
                    <td style={{ fontSize: 12.5 }}>{e.actor_name}</td>
                    <td className="t-meta">{e.severity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Resolve Dispute Modal ─────────────────────────────────────────────────────

interface ResolveDisputeModalProps {
  booking: RoadBookingDetail
  onClose: () => void
  onConfirm: (body: ResolveDisputeBody) => Promise<void>
}

const RESOLVE_ACTIONS = [
  { key: 'partial_refund',  label: 'Partial refund to customer', needsAmount: true },
  { key: 'full_refund',     label: 'Full refund to customer',    needsAmount: false },
  { key: 'uphold_fare',     label: 'Uphold fare · close dispute', needsAmount: false },
  { key: 'goodwill_credit', label: 'Goodwill wallet credit only', needsAmount: true },
]

function ResolveDisputeModal({ booking, onClose, onConfirm }: ResolveDisputeModalProps) {
  const fare = booking.fare_final_minor ?? booking.fare_estimate_minor
  const [action, setAction] = useState<ResolveDisputeBody['action']>('partial_refund')
  const [refundAmount, setRefundAmount] = useState(String((fare / 200).toFixed(2))) // default half
  const [clawback, setClawback] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const needsAmount = RESOLVE_ACTIONS.find(a => a.key === action)?.needsAmount ?? false

  const handleConfirm = async () => {
    if (!note.trim()) { setError('Resolution note is required'); return }
    const refundMinor = needsAmount && refundAmount ? Math.round(parseFloat(refundAmount) * 100) : null
    const clawbackMinor = clawback ? Math.round(parseFloat(clawback) * 100) : null
    setSaving(true); setError('')
    try {
      await onConfirm({
        action,
        refund_amount_minor: refundMinor,
        driver_clawback_minor: clawbackMinor,
        resolution_note: note,
      })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Resolve failed')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,13,10,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 4, width: '100%', maxWidth: 520 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="t-label">Resolve dispute · {booking.dispute?.dispute_ref}</div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Close this dispute</span>
          </div>
          <button className="btn ghost sm" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>{error}</div>}

          <div>
            <div className="t-label" style={{ marginBottom: 10 }}>Resolution action</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {RESOLVE_ACTIONS.map(a => (
                <div key={a.key} onClick={() => setAction(a.key as ResolveDisputeBody['action'])} style={{
                  padding: '10px 12px', borderRadius: 3, cursor: 'pointer',
                  border: `1px solid ${action === a.key ? 'var(--accent)' : 'var(--rule)'}`,
                  background: action === a.key ? 'color-mix(in oklab, var(--accent) 8%, var(--surface))' : 'var(--surface)',
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                    border: `1px solid ${action === a.key ? 'var(--accent)' : 'var(--rule-strong)'}`,
                    background: action === a.key ? 'var(--accent)' : 'var(--surface)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {action === a.key && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                  </span>
                  {a.label}
                </div>
              ))}
            </div>
          </div>

          {needsAmount && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">Refund amount ({sym})</label>
                <div className="input">
                  <input type="number" min={0} step={0.01} value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="field-help">Max: {fmtMinor(fare)}</div>
              </div>
              <div className="field">
                <label className="field-label">Driver clawback ({sym})</label>
                <div className="input">
                  <input type="number" min={0} step={0.01} value={clawback} onChange={e => setClawback(e.target.value)} placeholder="Optional" />
                </div>
              </div>
            </div>
          )}

          <div className="field">
            <label className="field-label">Resolution note · visible in audit <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input">
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="GPS trace confirms deviation…" />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn accent sm" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Resolving…' : 'Resolve dispute →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

// Allowed forward status transitions (ops workflow — when no driver app)
const NEXT_STATUS: Record<string, AdvanceStatusBody['status']> = {
  'Requested':  'Accepted',
  'Accepted':   'Arrived',
  'Arrived':    'InProgress',
  'InProgress': 'Completed',
}

type TabName = 'overview' | 'map' | 'fare' | 'payments' | 'audit'

export default function BookingDetailPage() {
  const fmtMinor = useFormatMoney()
  const sym = useCurrencySymbol()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [booking, setBooking] = useState<RoadBookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isForbidden, setIsForbidden] = useState(false)
  const [activeTab, setActiveTab] = useState<TabName>('overview')

  // Modal state
  const [showCancel, setShowCancel] = useState(false)
  const [showReassign, setShowReassign] = useState(false)
  const [showAdjustFare, setShowAdjustFare] = useState(false)
  const [showRefund, setShowRefund] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [showResolveDispute, setShowResolveDispute] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [advanceError, setAdvanceError] = useState('')

  // Note form
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Flag state
  const [flagging, setFlagging] = useState(false)

  const loadBooking = async () => {
    if (!id) return
    setLoading(true)
    try {
      const b = await bookingsService.getBooking(id)
      setBooking(b)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 403) setIsForbidden(true)
      else setError('Booking not found')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBooking() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async (body: CancelBookingBody) => {
    if (!id) return
    await bookingsService.cancelBooking(id, body)
    setShowCancel(false)
    await loadBooking()
  }

  const handleReassign = async (body: ReassignBody) => {
    if (!id) return
    await bookingsService.reassignDriver(id, body)
    setShowReassign(false)
    await loadBooking()
  }

  const handleAdjustFare = async (body: AdjustFareBody) => {
    if (!id) return
    await bookingsService.adjustFare(id, body)
    setShowAdjustFare(false)
    await loadBooking()
  }

  const handleRefund = async (body: RefundBody) => {
    if (!id) return
    await bookingsService.processRefund(id, body)
    setShowRefund(false)
    await loadBooking()
  }

  const handleDispute = async (body: OpenDisputeBody) => {
    if (!id) return
    await bookingsService.openDispute(id, body)
    setShowDispute(false)
    await loadBooking()
  }

  const handleResolveDispute = async (body: ResolveDisputeBody) => {
    if (!id) return
    await bookingsService.resolveDispute(id, body)
    setShowResolveDispute(false)
    await loadBooking()
  }

  const handleAdvanceStatus = async () => {
    if (!id || !booking) return
    const next = NEXT_STATUS[booking.status]
    if (!next) return
    setAdvancing(true)
    setAdvanceError('')
    try {
      await bookingsService.advanceStatus(id, { status: next })
      await loadBooking()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setAdvanceError(err?.response?.data?.detail || 'Status advance failed')
    } finally {
      setAdvancing(false)
    }
  }

  const handleAddNote = async () => {
    if (!id || !noteText.trim()) return
    setSavingNote(true)
    try {
      const addNoteBody: AddNoteBody = { note: noteText.trim() }
      await bookingsService.addNote(id, addNoteBody)
      setNoteText('')
      setShowAddNote(false)
      await loadBooking()
    } catch { /* ignore */ }
    finally { setSavingNote(false) }
  }

  const handleToggleFlag = async () => {
    if (!id || !booking) return
    setFlagging(true)
    try {
      await bookingsService.flagBooking(id, {
        flagged: !booking.flagged,
        flag_reason: booking.flagged ? null : 'Flagged by admin',
      })
      await loadBooking()
    } catch { /* ignore */ }
    finally { setFlagging(false) }
  }

  if (isForbidden) return <AccessDeniedPage message="You don't have permission to access this page." />

  if (loading) {
    return (
      <Shell activeId="bookings-r" breadcrumb="Operations · Road bookings" title="Loading…">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading booking…</div>
      </Shell>
    )
  }

  if (error || !booking) {
    return (
      <Shell activeId="bookings-r" breadcrumb="Operations · Road bookings" title="Not found">
        <div style={{ padding: 40 }}>
          <div style={{ color: 'var(--danger)', marginBottom: 16 }}>{error || 'Booking not found'}</div>
          <button className="btn sm" onClick={() => navigate('/bookings/road')}>
            <Icon name="chevLeft" size={13} /> Back to bookings
          </button>
        </div>
      </Shell>
    )
  }

  const fare = booking.fare_final_minor ?? booking.fare_estimate_minor
  const TABS: { key: TabName; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'map',      label: 'Map & route' },
    { key: 'fare',     label: 'Fare breakdown' },
    { key: 'payments', label: 'Payments' },
    { key: 'audit',    label: 'Audit' },
  ]

  return (
    <Shell
      activeId="bookings-r"
      breadcrumb="Operations · Road bookings"
      title={`${booking.booking_ref} · ${booking.pickup_address.split(' · ')[0]} → ${booking.drop_address.split(' · ')[0]}`}
      subtitle={`${booking.service_type}${booking.vehicle_class ? ' · ' + booking.vehicle_class : ''} · ${fmtMinor(fare)} estimate`}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isMobile && (
            <button className="btn sm" onClick={() => navigate('/bookings/road')}>
              <Icon name="chevLeft" size={13} /> Back
            </button>
          )}
          {['Requested', 'Accepted', 'Arrived', 'InProgress'].includes(booking.status) && (
            <button className="btn sm" onClick={() => setShowReassign(true)}>
              <Icon name="refresh" size={13} />Reassign
            </button>
          )}
          {NEXT_STATUS[booking.status] && (
            <button
              className="btn sm accent"
              onClick={handleAdvanceStatus}
              disabled={advancing}
              title={`Mark as ${NEXT_STATUS[booking.status]}`}
            >
              <Icon name="arrowRight" size={13} />
              {advancing ? 'Updating…' : `Mark ${NEXT_STATUS[booking.status]}`}
            </button>
          )}
          <button
            className={`btn sm${booking.flagged ? ' danger' : ''}`}
            onClick={handleToggleFlag}
            disabled={flagging}
            title={booking.flagged ? `Flagged: ${booking.flag_reason ?? ''}` : 'Flag this booking'}
          >
            <Icon name="flag" size={13} />{booking.flagged ? 'Flagged' : 'Flag'}
          </button>
          {booking.dispute && !['resolved', 'closed'].includes(booking.dispute.stage) && (
            <button className="btn sm accent" onClick={() => setShowResolveDispute(true)}>
              Resolve dispute
            </button>
          )}
          {!['Cancelled', 'Completed', 'Refunded', 'Disputed'].includes(booking.status) && (
            <button className="btn sm danger" onClick={() => setShowCancel(true)}>
              Cancel booking
            </button>
          )}
          <button className="btn sm" onClick={() => setActiveTab('audit')}>
            <Icon name="external" size={13} />Audit trail
          </button>
        </div>
      }
    >
      {isMobile && (
        <button
          onClick={() => navigate('/bookings/road')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            width: '100%', fontSize: 13, color: 'var(--accent)',
            background: 'var(--surface-2)', border: 'none',
            borderBottom: '1px solid var(--rule)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <Icon name="chevLeft" size={14} stroke={2} />
          Back to bookings
        </button>
      )}

      <div style={{
        display: isMobile ? 'block' : 'grid',
        gridTemplateColumns: isMobile ? undefined : '1fr 380px',
        minHeight: '100%',
      }}>
        {/* Main content */}
        <div>
          {/* Advance status error */}
          {advanceError && (
            <div style={{ margin: '12px 24px 0', padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {advanceError}
              <button className="btn ghost icon sm" onClick={() => setAdvanceError('')}><Icon name="close" size={12} /></button>
            </div>
          )}

          {/* Tab bar */}
          <div style={{ borderBottom: '1px solid var(--rule)', background: 'var(--surface)', display: 'flex', gap: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {TABS.map(tab => (
              <div
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '14px 18px',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: activeTab === tab.key ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: activeTab === tab.key ? 500 : 400,
                  borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: -1,
                  whiteSpace: 'nowrap',
                }}
              >{tab.label}</div>
            ))}
          </div>

          <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                {/* KPI strip */}
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--rule)',
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
                }}>
                  {[
                    ['State',    null, bStatusBadge(booking.status)],
                    ['Estimate', fmtMinor(fare), null],
                    ['Distance', booking.distance_km ? `${booking.distance_km} km` : '—', null],
                    ['Duration', booking.duration_min ? `${booking.duration_min} min` : '—', null],
                    ['Surge',    `${booking.surge_multiplier}×`, null],
                  ].map(([k, v, jsx], i) => (
                    <div key={String(k)} style={{
                      padding: '16px 18px',
                      borderRight: isMobile
                        ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                        : (i < 4 ? '1px solid var(--rule)' : 'none'),
                      borderBottom: isMobile && i < 4 ? '1px solid var(--rule)' : 'none',
                    }}>
                      <div className="t-label" style={{ padding: 0 }}>{String(k)}</div>
                      <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                        {jsx ?? String(v)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                    <div className="t-label">State timeline</div>
                    <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Step-by-step</h3>
                  </div>
                  <div style={{ padding: '14px 18px' }}>
                    {booking.timeline.length === 0 ? (
                      <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No timeline events yet.</div>
                    ) : booking.timeline.map((e, i) => (
                      <div key={e.id} style={{ display: 'flex', gap: 14, paddingBottom: i < booking.timeline.length - 1 ? 14 : 0, position: 'relative' }}>
                        <div style={{ position: 'relative', width: 12, flexShrink: 0 }}>
                          <span className={`dot ${e.tone}`} style={{
                            width: i === 0 ? 10 : 8, height: i === 0 ? 10 : 8,
                            position: 'absolute', top: 4, left: 1,
                            boxShadow: i === 0 ? '0 0 0 4px color-mix(in oklab, var(--accent) 15%, var(--surface))' : undefined,
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
                          {e.message && (
                            <div className="t-meta" style={{ marginTop: 2, color: 'var(--ink-3)' }}>{e.message}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* MAP TAB */}
            {activeTab === 'map' && <MapTab booking={booking} />}

            {/* FARE BREAKDOWN TAB */}
            {activeTab === 'fare' && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="t-label">Fare breakdown</div>
                    <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                      {booking.service_type}{booking.vehicle_class ? ' · ' + booking.vehicle_class : ''}
                    </h3>
                  </div>
                  <button className="btn sm" onClick={() => setShowAdjustFare(true)}>Adjust fare</button>
                </div>
                <div style={{ padding: '16px 18px' }}>
                  {booking.fare_components.length === 0 ? (
                    <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No fare components recorded yet.</div>
                  ) : (
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <table className="tbl" style={{ marginTop: 0 }}>
                        <thead>
                          <tr>
                            <th>Component</th>
                            <th>Rule reference</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {booking.fare_components.map((fc, i) => (
                            <tr key={i}>
                              <td>{fc.label}</td>
                              <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{fc.rule_ref ?? '—'}</td>
                              <td className="num" style={{ textAlign: 'right', color: fc.amount_minor < 0 ? 'var(--accent)' : 'var(--ink)' }}>
                                {fc.amount_minor < 0 ? '−' : ''}{fmtMinor(Math.abs(fc.amount_minor))}
                              </td>
                            </tr>
                          ))}
                          <tr style={{ background: 'var(--surface-2)' }}>
                            <td colSpan={2} style={{ fontWeight: 500 }}>Total</td>
                            <td className="num" style={{ textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 18 }}>
                              {fmtMinor(fare)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === 'payments' && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '24px' }}>
                <div className="t-label" style={{ marginBottom: 14 }}>Payment details</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  {[
                    ['Method', booking.payment_method ?? '—'],
                    ['Fare estimate', fmtMinor(booking.fare_estimate_minor)],
                    ['Fare final', booking.fare_final_minor != null ? fmtMinor(booking.fare_final_minor) : 'Pending'],
                    ['Promo code', booking.promo_code ?? 'None'],
                    ['Promo discount', booking.promo_discount_minor > 0 ? `−${fmtMinor(booking.promo_discount_minor)}` : fmtMinor(0)],
                    ['Status', booking.status],
                  ].map(([k, v]) => (
                    <div key={k} style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                      <div className="t-meta">{k}</div>
                      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink)' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <button className="btn sm" onClick={() => setShowRefund(true)}>
                    <Icon name="refresh" size={13} />Process refund
                  </button>
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
              }}>
                {initials(booking.customer_name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: 'var(--ink)' }}>{booking.customer_name}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>
                  {booking.customer_ride_count} rides
                  {booking.customer_rating != null && ` · ${booking.customer_rating.toFixed(2)} ★`}
                </div>
                {booking.customer_phone && (
                  <div className="t-meta" style={{ marginTop: 2 }}>{booking.customer_phone}</div>
                )}
              </div>
              <button className="btn icon sm"><Icon name="phone" size={12} /></button>
            </div>

            <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

            {/* Driver */}
            <div className="t-label" style={{ marginBottom: 12 }}>Driver · Vehicle</div>
            {booking.driver_name ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: 'color-mix(in oklab, var(--accent) 15%, var(--surface))',
                    color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                  }}>
                    {initials(booking.driver_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: 'var(--ink)' }}>{booking.driver_name}</div>
                  </div>
                  <button className="btn icon sm"><Icon name="phone" size={12} /></button>
                </div>
                {(booking.driver_vehicle_plate || booking.driver_vehicle_model) && (
                  <div style={{ marginTop: 12, padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: 'var(--ink)' }}>{booking.driver_vehicle_model ?? '—'}</span>
                      {booking.driver_vehicle_plate && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)' }}>
                          {booking.driver_vehicle_plate}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No driver assigned</div>
            )}

            <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

            {/* Payment */}
            <div className="t-label" style={{ marginBottom: 12 }}>Payment</div>
            <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{booking.payment_method ?? '—'}</div>
              </div>
              <span className="badge ok"><span className="dot ok" />Pre-auth</span>
            </div>

            {booking.dispute && (
              <>
                <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />
                <div className="t-label" style={{ marginBottom: 12 }}>Dispute</div>
                <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--danger-soft)' }}>
                  <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 500 }}>{booking.dispute.dispute_ref}</div>
                  <div className="t-meta" style={{ marginTop: 4 }}>{booking.dispute.reason}</div>
                  <div style={{ marginTop: 6 }}>
                    <span className="badge danger"><span className="dot danger" />{booking.dispute.stage}</span>
                  </div>
                </div>
              </>
            )}

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
                    <div className="t-meta" style={{ marginTop: 4 }}>
                      {formatDateTime(n.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAddNote ? (
              <div style={{ marginTop: 10 }}>
                <div className="input">
                  <input
                    placeholder="Add a note…"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    autoFocus
                  />
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

            {/* Additional actions */}
            <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Refund: only for cancelled/completed/disputed bookings */}
              {['Cancelled', 'Completed', 'Disputed'].includes(booking.status) && booking.status !== 'Refunded' && (
                <button className="btn sm ghost" style={{ width: '100%' }} onClick={() => setShowRefund(true)}>
                  <Icon name="refresh" size={13} />Process refund
                </button>
              )}
              {/* Open dispute: only for Completed bookings without existing dispute */}
              {booking.status === 'Completed' && !booking.dispute && (
                <button className="btn sm ghost" style={{ width: '100%' }} onClick={() => setShowDispute(true)}>
                  <Icon name="flag" size={13} />Open dispute
                </button>
              )}
              {/* Resolve dispute: if open dispute exists */}
              {booking.dispute && !['resolved', 'closed'].includes(booking.dispute.stage) && (
                <button className="btn sm accent" style={{ width: '100%' }} onClick={() => setShowResolveDispute(true)}>
                  <Icon name="check" size={13} />Resolve dispute
                </button>
              )}
              {/* Adjust fare: for in-progress/completed/disputed */}
              {['InProgress', 'Completed', 'Disputed'].includes(booking.status) && (
                <button className="btn sm ghost" style={{ width: '100%' }} onClick={() => setShowAdjustFare(true)}>
                  <Icon name="pencil" size={13} />Adjust fare
                </button>
              )}
              <button className="btn sm ghost" style={{ width: '100%' }} onClick={handleToggleFlag} disabled={flagging}>
                <Icon name="flag" size={13} style={{ color: booking.flagged ? 'var(--danger)' : undefined }} />
                {booking.flagged ? 'Remove flag' : 'Flag booking'}
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Modals */}
      {showCancel && booking && (
        <CancelModal booking={booking} onClose={() => setShowCancel(false)} onConfirm={handleCancel} />
      )}
      {showReassign && (
        <ReassignModal onClose={() => setShowReassign(false)} onConfirm={handleReassign} />
      )}
      {showAdjustFare && booking && (
        <AdjustFareModal booking={booking} onClose={() => setShowAdjustFare(false)} onConfirm={handleAdjustFare} />
      )}
      {showRefund && booking && (
        <RefundModal booking={booking} onClose={() => setShowRefund(false)} onConfirm={handleRefund} />
      )}
      {showDispute && (
        <DisputeModal onClose={() => setShowDispute(false)} onConfirm={handleDispute} />
      )}
      {showResolveDispute && booking && (
        <ResolveDisputeModal booking={booking} onClose={() => setShowResolveDispute(false)} onConfirm={handleResolveDispute} />
      )}
    </Shell>
  )
}
