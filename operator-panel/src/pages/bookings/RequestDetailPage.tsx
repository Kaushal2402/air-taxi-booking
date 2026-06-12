import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Mail,
  Phone,
  Send,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { fmtDateTime } from '../../lib/format'
import Shell from '../../components/layout/Shell'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { BookingRequest } from '../../services/operatorRequestsService'
import { operatorRequestsService } from '../../services/operatorRequestsService'

function ttlMs(iso: string | null): number {
  if (!iso) return Infinity
  return new Date(iso).getTime() - Date.now()
}

function ttlLabel(ms: number): string {
  if (ms <= 0) return 'Expired'
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m remaining`
  return `${minutes} min remaining`
}

function DetField({
  label,
  value,
  mono,
  tone,
  sub,
}: {
  label: string
  value: string
  mono?: boolean
  tone?: string
  sub?: string
}) {
  return (
    <div>
      <div className="t-label" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.3,
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
          letterSpacing: mono ? '0.04em' : undefined,
          color: tone ? `var(--${tone})` : 'var(--ink)',
        }}
      >
        {value}
      </div>
      {sub && (
        <div className="t-meta" style={{ marginTop: 3, fontSize: 11 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function QuoteLine({
  label,
  amount,
  sub,
  bold,
  separator,
}: {
  label: string
  amount: string
  sub?: string
  bold?: boolean
  separator?: boolean
}) {
  return (
    <>
      {separator && <div style={{ height: 1, background: 'var(--rule)', margin: '8px 0' }} />}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '3px 0',
        }}
      >
        <span
          style={{
            fontSize: bold ? 13.5 : 12.5,
            color: bold ? 'var(--ink)' : 'var(--ink-2)',
            fontWeight: bold ? 600 : 400,
          }}
        >
          {label}
          {sub && (
            <span
              style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 7 }}
            >
              {sub}
            </span>
          )}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: bold ? 14 : 12.5,
            color: bold ? 'var(--ok)' : 'var(--ink-3)',
            letterSpacing: '0.04em',
            fontWeight: bold ? 600 : 400,
          }}
        >
          {amount}
        </span>
      </div>
    </>
  )
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [request, setRequest] = useState<BookingRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [quoteValidity, setQuoteValidity] = useState('4 hours from sending')
  const [quoteTerms, setQuoteTerms] = useState('50% advance · 50% on departure')
  const [quoteNote, setQuoteNote] = useState('')

  useEffect(() => {
    if (!id) return
    operatorRequestsService
      .get(id)
      .then(setRequest)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleAccept = () => {
    if (!request) return
    operatorRequestsService
      .accept(request.id)
      .then(updated => setRequest(updated))
      .catch(console.error)
  }

  const handleReject = () => {
    if (!request || !rejectReason.trim()) return
    operatorRequestsService
      .reject(request.id, rejectReason)
      .then(updated => {
        setRequest(updated)
        setShowRejectDialog(false)
        setRejectReason('')
      })
      .catch(console.error)
  }

  const ms = request ? ttlMs(request.ttl_expires_at) : Infinity
  const isUrgent = ms < 30 * 60 * 1000

  if (loading) {
    return (
      <Shell activeId="bookings" breadcrumb="Booking Requests" title="Loading…">
        <div className="t-meta" style={{ textAlign: 'center', padding: 60 }}>
          Loading…
        </div>
      </Shell>
    )
  }

  if (!request) {
    return (
      <Shell activeId="bookings" breadcrumb="Booking Requests" title="Not found">
        <div className="t-meta" style={{ textAlign: 'center', padding: 60 }}>
          Request not found.
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      activeId="bookings"
      breadcrumb={`Booking Requests / ${request.booking_ref}`}
      title={`${request.booking_ref} — ${request.service_subtype.charAt(0).toUpperCase() + request.service_subtype.slice(1)} Request`}
      subtitle={`${request.passenger_org || request.passenger_name || 'Unknown'} · ${request.origin_name} → ${request.destination_name}`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn sm ghost"
            style={{ color: 'var(--ink-3)', height: 32 }}
            onClick={() => navigate('/bookings')}
          >
            <ArrowLeft size={12} />
            Back to inbox
          </button>
          {request.status === 'pending' && (
            <>
              <button
                className="btn sm"
                style={{
                  height: 32,
                  color: 'var(--danger)',
                  borderColor: 'color-mix(in oklab,var(--danger) 40%,var(--rule))',
                }}
                onClick={() => setShowRejectDialog(true)}
              >
                <X size={12} />
                Reject
              </button>
              {request.service_subtype === 'shuttle' ? (
                <button className="btn sm accent" style={{ height: 32 }} onClick={handleAccept}>
                  <Check size={12} />
                  Accept
                </button>
              ) : (
                <button className="btn sm accent" style={{ height: 32 }}>
                  <Tag size={12} />
                  Send Quote
                </button>
              )}
            </>
          )}
        </div>
      }
    >
      {/* Urgency bar */}
      {request.status === 'pending' && request.ttl_expires_at && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 28px',
            height: 40,
            background: isUrgent ? 'var(--danger-soft)' : 'var(--warn-soft)',
            borderBottom: `1px solid color-mix(in oklab, ${isUrgent ? 'var(--danger)' : 'var(--warn)'} 24%, var(--rule))`,
            flexShrink: 0,
          }}
        >
          <Clock size={13} style={{ color: isUrgent ? 'var(--danger)' : 'var(--warn)', flexShrink: 0 }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isUrgent ? 'var(--danger)' : 'var(--warn)',
              fontWeight: 500,
            }}
          >
            Response deadline: {ttlLabel(ms)}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
            — Request auto-rejects if not responded to before deadline.
          </span>
        </div>
      )}

      {/* Two-column body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
        {/* Left: request context */}
        <div
          style={{
            flex: 1,
            padding: '22px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            borderRight: '1px solid var(--rule)',
            overflowY: 'auto',
          }}
        >
          {/* Requestor */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>
              Requestor
            </div>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  className="avatar"
                  style={{ width: 40, height: 40, fontSize: 15, flexShrink: 0 }}
                >
                  {(request.passenger_org || request.passenger_name || '?')
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>
                    {request.passenger_org || request.passenger_name || 'Unknown'}
                  </div>
                  {request.passenger_name && request.passenger_org && (
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                      {request.passenger_name}
                    </div>
                  )}
                </div>
                <button className="btn sm icon">
                  <Mail size={13} />
                </button>
                <button className="btn sm icon">
                  <Phone size={13} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rule-soft)', flexWrap: 'wrap' }}>
                <span
                  className={`badge ${SUBTYPE_TONE[request.service_subtype] ?? 'pending'}`}
                  style={{ height: 19 }}
                >
                  {request.service_subtype.charAt(0).toUpperCase() + request.service_subtype.slice(1)}
                </span>
                {request.is_vip && (
                  <span className="badge warn" style={{ height: 19 }}>
                    VIP
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Flight details */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>
              Flight Details
            </div>
            <div
              className="card"
              style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <DetField label="Origin" value={request.origin_name} />
                <DetField label="Destination" value={request.destination_name} />
                <DetField label="Service type" value={request.service_subtype} />
              </div>
              <div style={{ height: 1, background: 'var(--rule-soft)' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <DetField
                  label="Requested departure"
                  value={
                    request.flight_date
                      ? fmtDateTime(request.flight_date)
                      : 'ASAP'
                  }
                  mono
                />
                <DetField
                  label="Received"
                  value={fmtDateTime(request.received_at)}
                  mono
                />
              </div>
              <div style={{ height: 1, background: 'var(--rule-soft)' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <DetField label="Passengers" value={`${request.pax_count} adults`} />
                <DetField label="Baggage" value={`${request.baggage_kg} kg total`} />
              </div>
            </div>
          </section>

          {/* Special requests */}
          {request.special_requests && (
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>
                Special Requests
              </div>
              <div className="card" style={{ padding: '12px 16px' }}>
                <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
                  {request.special_requests}
                </p>
              </div>
            </section>
          )}

          {/* Payload warning */}
          {request.pax_count >= 6 && (
            <div
              style={{
                display: 'flex',
                gap: 10,
                padding: '11px 14px',
                background: 'var(--warn-soft)',
                border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule))',
                borderRadius: 3,
              }}
            >
              <AlertTriangle size={14} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--warn)' }}>
                  High pax count — verify aircraft selection
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.45 }}>
                  {request.pax_count} passengers + {request.baggage_kg} kg baggage. Confirm MTOW
                  margin before accepting.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: quote builder */}
        <div
          style={{
            width: 372,
            flexShrink: 0,
            background: 'var(--surface)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '22px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {/* Fare breakdown */}
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>
                Fare Breakdown
              </div>
              <div className="card" style={{ padding: '12px 14px' }}>
                <QuoteLine label="Base charter rate" amount="—" sub="Select pricing rule" />
                <QuoteLine label="Fuel surcharge" amount="—" sub="Estimated" />
                <QuoteLine label="Platform service fee" amount="—" sub="3%" />
                <QuoteLine label="GST" amount="—" sub="18%" separator />
                <QuoteLine label="Total" amount="—" bold separator />
              </div>
            </section>

            {/* Quote settings */}
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>
                Quote Settings
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="field">
                  <label className="field-label">Quote validity</label>
                  <div className="input">
                    <input
                      value={quoteValidity}
                      onChange={e => setQuoteValidity(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <ChevronDown size={14} className="icon" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Payment terms</label>
                  <div className="input">
                    <input
                      value={quoteTerms}
                      onChange={e => setQuoteTerms(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <ChevronDown size={14} className="icon" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">
                    Note to requestor{' '}
                    <span
                      style={{
                        textTransform: 'none',
                        letterSpacing: 0,
                        fontStyle: 'italic',
                        fontWeight: 400,
                        color: 'var(--ink-4)',
                      }}
                    >
                      optional
                    </span>
                  </label>
                  <textarea
                    value={quoteNote}
                    onChange={e => setQuoteNote(e.target.value)}
                    placeholder="Message to include with the quote…"
                    style={{
                      border: '1px solid var(--rule-strong)',
                      background: 'var(--surface-sunk)',
                      borderRadius: 2,
                      padding: '8px 10px',
                      minHeight: 52,
                      fontSize: 12.5,
                      color: 'var(--ink-2)',
                      lineHeight: 1.5,
                      resize: 'vertical',
                      width: '100%',
                    }}
                  />
                </div>
              </div>
            </section>

            {/* CTAs */}
            {request.status === 'pending' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <button className="btn accent" style={{ width: '100%', height: 40, justifyContent: 'center', fontWeight: 500, fontSize: 14 }}>
                  <Tag size={14} />
                  Send Quote
                </button>
                <button className="btn" style={{ width: '100%', height: 32, justifyContent: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
                  Save draft
                </button>
              </div>
            )}

            {request.status !== 'pending' && (
              <div
                className="card"
                style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <span
                  className={`badge ${STATUS_TONE[request.status] ?? 'pending'}`}
                  style={{ height: 22 }}
                >
                  <span className={`dot ${STATUS_TONE[request.status] ?? 'pending'}`} />
                  {request.status.charAt(0).toUpperCase() + request.status.replace('_', ' ').slice(1)}
                </span>
                <span className="t-meta" style={{ fontSize: 12 }}>
                  {request.actioned_at
                    ? `Actioned ${fmtDateTime(request.actioned_at)}`
                    : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject dialog */}
      {showRejectDialog && (
        <ConfirmDialog
          open
          title={`Reject ${request.booking_ref}?`}
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span>Please provide a reason for rejection.</span>
              <textarea
                className="input"
                style={{ height: 72, width: '100%', resize: 'vertical', padding: '8px 10px', fontSize: 13 }}
                placeholder="Reason…"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
          }
          confirmLabel="Reject request"
          variant="danger"
          onConfirm={handleReject}
          onCancel={() => { setShowRejectDialog(false); setRejectReason('') }}
        />
      )}
    </Shell>
  )
}

const SUBTYPE_TONE: Record<string, string> = {
  charter: 'info',
  shuttle: 'ok',
  cargo: 'pending',
  medevac: 'danger',
  vip: 'warn',
}

const STATUS_TONE: Record<string, string> = {
  pending: 'warn',
  quote_shared: 'info',
  accepted: 'ok',
  expired: 'warn',
  rejected: 'danger',
}
