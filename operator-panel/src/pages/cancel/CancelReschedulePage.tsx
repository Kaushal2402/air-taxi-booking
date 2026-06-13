import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Calendar, Search, X } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { CancellableBooking, CancelPreview, ReschedulePreview } from '../../services/operatorCancelService'
import { operatorCancelService } from '../../services/operatorCancelService'

type StatusFilter = 'all' | 'confirmed' | 'in_flight'

const STATUS_TONE: Record<string, string> = {
  confirmed: 'ok',
  in_flight: 'info',
  boarding: 'warn',
}

function fmtDt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function fmtCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export default function CancelReschedulePage() {
  const isMobile = useIsMobile()

  const [bookings, setBookings] = useState<CancellableBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [cancelTarget, setCancelTarget] = useState<CancellableBooking | null>(null)
  const [cancelPreview, setCancelPreview] = useState<CancelPreview | null>(null)
  const [cancelPreviewLoading, setCancelPreviewLoading] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelForceMajeure, setCancelForceMajeure] = useState(false)
  const [cancelNotes, setCancelNotes] = useState('')
  const [cancelSubmitting, setCancelSubmitting] = useState(false)

  const [rescheduleTarget, setRescheduleTarget] = useState<CancellableBooking | null>(null)
  const [rescheduleNewEtd, setRescheduleNewEtd] = useState('')
  const [rescheduleNewEta, setRescheduleNewEta] = useState('')
  const [rescheduleAircraftId, setRescheduleAircraftId] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [reschedulePreview, setReschedulePreview] = useState<ReschedulePreview | null>(null)
  const [reschedulePreviewLoading, setReschedulePreviewLoading] = useState(false)
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)

  const loadData = () => {
    setLoading(true)
    operatorCancelService
      .list()
      .then(setBookings)
      .catch(() => setErrorMsg('Failed to load bookings.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          b.booking_ref.toLowerCase().includes(q) ||
          b.origin_name.toLowerCase().includes(q) ||
          b.destination_name.toLowerCase().includes(q) ||
          b.aircraft_reg.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [bookings, statusFilter, search])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const showError = (msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 5000)
  }

  const openCancelDialog = (b: CancellableBooking) => {
    setCancelTarget(b)
    setCancelReason('')
    setCancelForceMajeure(false)
    setCancelNotes('')
    setCancelPreview(null)
    setCancelPreviewLoading(true)
    operatorCancelService
      .getCancelPreview(b.id)
      .then(setCancelPreview)
      .catch(() => setCancelPreview(null))
      .finally(() => setCancelPreviewLoading(false))
  }

  const handleCancelConfirm = () => {
    if (!cancelTarget || !cancelReason.trim()) return
    setCancelSubmitting(true)
    operatorCancelService
      .cancelBooking(cancelTarget.id, cancelReason, cancelForceMajeure, cancelNotes)
      .then(() => {
        setCancelTarget(null)
        showSuccess(`Booking ${cancelTarget.booking_ref} has been cancelled.`)
        loadData()
      })
      .catch(() => showError('Failed to cancel booking. Please try again.'))
      .finally(() => setCancelSubmitting(false))
  }

  const openReschedulePanel = (b: CancellableBooking) => {
    setRescheduleTarget(b)
    setRescheduleNewEtd('')
    setRescheduleNewEta('')
    setRescheduleAircraftId('')
    setRescheduleReason('')
    setReschedulePreview(null)
  }

  const fetchReschedulePreview = () => {
    if (!rescheduleTarget || !rescheduleNewEtd || !rescheduleNewEta) return
    setReschedulePreviewLoading(true)
    operatorCancelService
      .getReschedulePreview(rescheduleTarget.id, rescheduleNewEtd, rescheduleNewEta)
      .then(setReschedulePreview)
      .catch(() => setReschedulePreview(null))
      .finally(() => setReschedulePreviewLoading(false))
  }

  const handleRescheduleConfirm = () => {
    if (!rescheduleTarget || !rescheduleNewEtd || !rescheduleNewEta || !rescheduleReason.trim()) return
    setRescheduleSubmitting(true)
    operatorCancelService
      .rescheduleBooking(rescheduleTarget.id, {
        new_etd: rescheduleNewEtd,
        new_eta: rescheduleNewEta,
        aircraft_id: rescheduleAircraftId,
        reason: rescheduleReason,
      })
      .then(() => {
        const ref = rescheduleTarget.booking_ref
        setRescheduleTarget(null)
        showSuccess(`Booking ${ref} has been rescheduled.`)
        loadData()
      })
      .catch(() => showError('Failed to reschedule booking. Please try again.'))
      .finally(() => setRescheduleSubmitting(false))
  }

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'in_flight', label: 'In Flight' },
  ]

  const cancelReasonOptions = [
    'Passenger request',
    'Operational issue',
    'Weather conditions',
    'Aircraft unserviceable',
    'Crew unavailability',
    'Other',
  ]

  return (
    <Shell
      activeId="cancel"
      breadcrumb="Operations"
      title="Cancellation & Rescheduling"
      subtitle={`${bookings.length} cancellable bookings`}
    >
      {successMsg && (
        <div
          style={{
            margin: '12px 28px 0',
            padding: '10px 16px',
            background: 'var(--accent-soft, #e6f7f0)',
            border: '1px solid color-mix(in oklab,var(--accent) 30%,var(--rule))',
            borderRadius: 6,
            fontSize: 13,
            color: 'var(--accent)',
            fontWeight: 500,
          }}
        >
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            margin: '12px 28px 0',
            padding: '10px 16px',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab,var(--danger) 30%,var(--rule))',
            borderRadius: 6,
            fontSize: 13,
            color: 'var(--danger)',
            fontWeight: 500,
          }}
        >
          {errorMsg}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--rule)',
          padding: '0 28px',
          background: 'var(--surface)',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {statusTabs.map(t => (
          <div
            key={t.id}
            onClick={() => setStatusFilter(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              height: 44,
              padding: '0 14px',
              cursor: 'pointer',
              borderBottom: t.id === statusFilter ? '2px solid var(--ink)' : '2px solid transparent',
              color: t.id === statusFilter ? 'var(--ink)' : 'var(--ink-3)',
              fontSize: 13,
              fontWeight: t.id === statusFilter ? 500 : 400,
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 28px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--rule)',
          flexShrink: 0,
        }}
      >
        <div className="input" style={{ width: isMobile ? '100%' : 280, height: 32 }}>
          <Search size={13} className="icon" />
          <input
            placeholder="Search by ref, route, aircraft…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>
          {filtered.length} results
        </span>
      </div>

      {isMobile ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
              Loading…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
              No cancellable bookings found.
            </div>
          )}
          {!loading && filtered.map(b => {
            const tone = STATUS_TONE[b.status] ?? 'pending'
            return (
              <div
                key={b.id}
                className="card"
                style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      letterSpacing: '0.06em',
                      color: 'var(--ink)',
                      fontWeight: 600,
                    }}
                  >
                    {b.booking_ref}
                  </span>
                  <span className={`badge ${tone}`} style={{ height: 19 }}>
                    <span className={`dot ${tone}`} />
                    {b.status.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="t-meta" style={{ fontSize: 12 }}>{b.origin_name}</span>
                  <ArrowRight size={10} style={{ color: 'var(--ink-4)' }} />
                  <span className="t-meta" style={{ fontSize: 12 }}>{b.destination_name}</span>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div className="t-label" style={{ fontSize: 10 }}>Aircraft</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{b.aircraft_type} · {b.aircraft_reg}</div>
                  </div>
                  <div>
                    <div className="t-label" style={{ fontSize: 10 }}>Pax</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{b.pax_count}</div>
                  </div>
                </div>

                <div>
                  <div className="t-label" style={{ fontSize: 10 }}>Departure</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                    {fmtDt(b.departure_at)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                  <button
                    className="btn sm"
                    style={{ flex: 1, justifyContent: 'center', color: 'var(--danger)', borderColor: 'color-mix(in oklab,var(--danger) 40%,var(--rule))' }}
                    onClick={() => openCancelDialog(b)}
                  >
                    <X size={12} />
                    Cancel
                  </button>
                  <button
                    className="btn sm accent"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => openReschedulePanel(b)}
                  >
                    <Calendar size={12} />
                    Reschedule
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ flex: 1, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div
            style={{
              display: 'flex',
              padding: '8px 24px',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--rule)',
              minWidth: 960,
            }}
          >
            {[
              ['Booking Ref', 130],
              ['Route', 0],
              ['Aircraft', 160],
              ['Departure', 150],
              ['Pax', 60],
              ['Total', 100],
              ['Status', 96],
              ['', 180],
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

          {loading && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
              Loading…
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
              No cancellable bookings found.
            </div>
          )}

          {!loading && filtered.map((b, i) => {
            const tone = STATUS_TONE[b.status] ?? 'pending'
            return (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '11px 24px',
                  borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--rule-soft)',
                  minWidth: 960,
                }}
              >
                <div style={{ width: 130, flexShrink: 0 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      letterSpacing: '0.06em',
                      color: 'var(--ink)',
                    }}
                  >
                    {b.booking_ref}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                      {b.origin_name}
                    </span>
                    <ArrowRight size={10} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                      {b.destination_name}
                    </span>
                  </div>
                </div>

                <div style={{ width: 160, flexShrink: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{b.aircraft_type}</div>
                  <div className="t-meta" style={{ fontSize: 11 }}>{b.aircraft_reg}</div>
                </div>

                <div style={{ width: 150, flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>
                    {fmtDt(b.departure_at)}
                  </div>
                </div>

                <div style={{ width: 60, flexShrink: 0 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{b.pax_count}</span>
                </div>

                <div style={{ width: 100, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>
                    {fmtCurrency(b.total_amount, b.currency)}
                  </span>
                </div>

                <div style={{ width: 96, flexShrink: 0 }}>
                  <span className={`badge ${tone}`} style={{ height: 19 }}>
                    <span className={`dot ${tone}`} />
                    {b.status.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 5, flexShrink: 0, width: 180, justifyContent: 'flex-end' }}>
                  <button
                    className="btn sm"
                    style={{ height: 26, color: 'var(--danger)', borderColor: 'color-mix(in oklab,var(--danger) 40%,var(--rule))' }}
                    onClick={() => openCancelDialog(b)}
                  >
                    <X size={11} />
                    Cancel
                  </button>
                  <button
                    className="btn sm accent"
                    style={{ height: 26 }}
                    onClick={() => openReschedulePanel(b)}
                  >
                    <Calendar size={11} />
                    Reschedule
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {cancelTarget && (
        <ConfirmDialog
          open
          title={`Cancel ${cancelTarget.booking_ref}?`}
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cancelPreviewLoading && (
                <div className="t-meta" style={{ fontSize: 12 }}>Loading policy preview…</div>
              )}
              {cancelPreview && !cancelPreviewLoading && (
                <div
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--rule)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 2 }}>
                    Cancellation Policy — {cancelPreview.policy_tier}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--ink-3)' }}>Hours to departure</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                      {cancelPreview.hours_to_departure}h
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--ink-3)' }}>Cancellation fee</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                      {cancelPreview.fee_pct}% · {fmtCurrency(cancelPreview.fee_amount, cancelTarget.currency)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--ink-3)' }}>Refund amount</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                      {fmtCurrency(cancelPreview.refund_amount, cancelTarget.currency)}
                    </span>
                  </div>
                  {cancelPreview.compensation_note && (
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', borderTop: '1px solid var(--rule)', paddingTop: 6, marginTop: 2 }}>
                      {cancelPreview.compensation_note}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label className="field-label" style={{ fontSize: 11 }}>Reason</label>
                <select
                  className="input"
                  style={{ height: 34, fontSize: 13 }}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                >
                  <option value="">Select a reason…</option>
                  {cancelReasonOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label className="field-label" style={{ fontSize: 11 }}>Additional notes</label>
                <textarea
                  className="input"
                  style={{ height: 60, width: '100%', resize: 'vertical', padding: '8px 10px', fontSize: 13 }}
                  placeholder="Optional notes…"
                  value={cancelNotes}
                  onChange={e => setCancelNotes(e.target.value)}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cancelForceMajeure}
                  onChange={e => setCancelForceMajeure(e.target.checked)}
                />
                <span>Force Majeure — waive cancellation fee</span>
              </label>
            </div>
          }
          confirmLabel="Confirm cancellation"
          variant="danger"
          loading={cancelSubmitting}
          onConfirm={handleCancelConfirm}
          onCancel={() => { setCancelTarget(null); setCancelPreview(null) }}
        />
      )}

      {rescheduleTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
          }}
        >
          <div
            style={{
              flex: 1,
              background: 'rgba(26,24,20,0.4)',
            }}
            onClick={() => { if (!rescheduleSubmitting) setRescheduleTarget(null) }}
          />

          <div
            style={{
              width: isMobile ? '100%' : 420,
              background: 'var(--surface)',
              borderLeft: '1px solid var(--rule)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 200ms cubic-bezier(0.16,1,0.3,1)',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid var(--rule)',
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-serif)' }}>
                  Reschedule Booking
                </div>
                <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>
                  {rescheduleTarget.booking_ref} · {rescheduleTarget.origin_name} → {rescheduleTarget.destination_name}
                </div>
              </div>
              <button
                className="btn sm ghost"
                style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setRescheduleTarget(null)}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label className="field-label">New Departure (ETD)</label>
                <input
                  type="datetime-local"
                  className="input"
                  style={{ height: 34, fontSize: 13 }}
                  value={rescheduleNewEtd}
                  onChange={e => { setRescheduleNewEtd(e.target.value); setReschedulePreview(null) }}
                  onBlur={fetchReschedulePreview}
                />
              </div>

              <div className="field">
                <label className="field-label">New Arrival (ETA)</label>
                <input
                  type="datetime-local"
                  className="input"
                  style={{ height: 34, fontSize: 13 }}
                  value={rescheduleNewEta}
                  onChange={e => { setRescheduleNewEta(e.target.value); setReschedulePreview(null) }}
                  onBlur={fetchReschedulePreview}
                />
              </div>

              <div className="field">
                <label className="field-label">Aircraft ID (optional)</label>
                <input
                  type="text"
                  className="input"
                  style={{ height: 34, fontSize: 13 }}
                  placeholder="Leave blank to keep current aircraft"
                  value={rescheduleAircraftId}
                  onChange={e => setRescheduleAircraftId(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="field-label">Reason</label>
                <textarea
                  className="input"
                  style={{ height: 72, width: '100%', resize: 'vertical', padding: '8px 10px', fontSize: 13 }}
                  placeholder="Reason for rescheduling…"
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                />
              </div>

              {reschedulePreviewLoading && (
                <div className="t-meta" style={{ fontSize: 12 }}>Loading policy preview…</div>
              )}

              {reschedulePreview && !reschedulePreviewLoading && (
                <div
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--rule)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 2 }}>
                    Reschedule Policy — {reschedulePreview.policy_tier}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--ink-3)' }}>Hours to departure</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                      {reschedulePreview.hours_to_departure}h
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--ink-3)' }}>Reschedule fee</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                      {reschedulePreview.fee_pct}% · {fmtCurrency(reschedulePreview.fee_amount, rescheduleTarget.currency)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--ink-3)' }}>Aircraft available</span>
                    <span style={{ fontSize: 12, color: reschedulePreview.aircraft_available ? 'var(--accent)' : 'var(--danger)' }}>
                      {reschedulePreview.aircraft_available ? 'Yes' : 'No — reassignment needed'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--rule)',
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                flexShrink: 0,
              }}
            >
              <button
                className="btn sm"
                onClick={() => setRescheduleTarget(null)}
                disabled={rescheduleSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn sm accent"
                disabled={rescheduleSubmitting || !rescheduleNewEtd || !rescheduleNewEta || !rescheduleReason.trim()}
                onClick={handleRescheduleConfirm}
              >
                {rescheduleSubmitting ? 'Saving…' : 'Confirm reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
