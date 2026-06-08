import { useState, useEffect } from 'react'
import { usePermission } from '../../hooks/usePermission'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { customerService } from '../../services/customerService'
import type { Customer, CustomerSegment, WalletTransaction } from '../../services/customerService'
import { privacyService } from '../../services/privacyService'
import type { PrivacyRequest } from '../../services/privacyService'
import { bookingsService } from '../../services/bookingsService'
import type { RoadBookingListItem } from '../../services/bookingsService'
import { airBookingsService } from '../../services/airBookingsService'
import type { AirBookingListItem } from '../../services/airBookingsService'
import { paymentsService } from '../../services/paymentsService'
import type { PaymentListItem } from '../../services/paymentsService'
import { supportService } from '../../services/supportService'
import type { Ticket } from '../../services/supportService'
import { auditService } from '../../services/auditService'
import type { AuditEventSummary } from '../../services/auditService'
import { formatMoney, currencySymbol, formatDate, useFormatMoney } from '../../lib/utils'

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function segmentLabel(seg: CustomerSegment): string {
  const MAP: Record<CustomerSegment, string> = {
    vip_corp: 'VIP · Corp',
    loyalist: 'Loyalist',
    frequent: 'Frequent',
    new:      'New',
    regular:  'Regular',
  }
  return MAP[seg] ?? seg
}


// ── Shared helpers ────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const s = status.toLowerCase()
  if (['completed', 'success', 'paid', 'resolved', 'closed'].includes(s))
    return <span className="badge ok">{status}</span>
  if (['cancelled', 'failed', 'refunded', 'banned'].includes(s))
    return <span className="badge danger">{status}</span>
  if (['pending', 'processing', 'in_progress', 'open'].includes(s))
    return <span className="badge info">{status}</span>
  if (['flagged', 'disputed', 'sla_breached'].includes(s))
    return <span className="badge warn">{status}</span>
  return <span className="badge">{status}</span>
}

function TabEmpty({ message }: { message: string }) {
  return (
    <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
      {message}
    </div>
  )
}

// ── Trips tab ─────────────────────────────────────────────────────────────────

function TripsTab({ customerId, onCountLoaded }: { customerId: string; onCountLoaded?: (n: number) => void }) {
  const [roadBookings, setRoadBookings] = useState<RoadBookingListItem[]>([])
  const [airBookings, setAirBookings]   = useState<AirBookingListItem[]>([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      bookingsService.listBookings({ customer_id: customerId, page: 1, page_size: 50 }).catch(() => ({ items: [] })),
      airBookingsService.listAirBookings({ customer_id: customerId, page: 1, page_size: 50 }).catch(() => ({ items: [] })),
    ]).then(([road, air]) => {
      const roadItems = (road as { items: RoadBookingListItem[] }).items ?? []
      const airItems  = (air  as { items: AirBookingListItem[]  }).items ?? []
      setRoadBookings(roadItems)
      setAirBookings(airItems)
      onCountLoaded?.(roadItems.length + airItems.length)
    }).finally(() => setLoading(false))
  }, [customerId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <TabEmpty message="Loading trips…" />

  const totalCount = roadBookings.length + airBookings.length
  if (totalCount === 0) return <TabEmpty message="No bookings found for this customer." />

  type UnifiedTrip = {
    id: string; ref: string; type: 'Road' | 'Air'; route: string
    status: string; fare: number; created_at: string
  }

  const unified: UnifiedTrip[] = [
    ...roadBookings.map(b => ({
      id: b.id, ref: b.booking_ref, type: 'Road' as const,
      route: b.pickup_address,
      status: b.status, fare: b.fare_final_minor ?? b.fare_estimate_minor,
      created_at: b.created_at,
    })),
    ...airBookings.map(b => ({
      id: b.id, ref: b.booking_ref, type: 'Air' as const,
      route: `${b.route_from} → ${b.route_to}`,
      status: b.status, fare: b.fare_final_minor ?? b.fare_estimate_minor,
      created_at: b.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--rule)', fontSize: 12.5, color: 'var(--ink-3)' }}>
        {totalCount} booking{totalCount !== 1 ? 's' : ''} · {roadBookings.length} road · {airBookings.length} air
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Type</th>
              <th>Route / Pickup</th>
              <th>Status</th>
              <th>Fare</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {unified.map(t => (
              <tr key={t.id}>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{t.ref}</span></td>
                <td><span className="badge">{t.type}</span></td>
                <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.route}</td>
                <td>{statusBadge(t.status)}</td>
                <td>{formatMoney(t.fare)}</td>
                <td className="t-meta">{formatDate(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Payments tab ──────────────────────────────────────────────────────────────

function PaymentsTab({ customerId }: { customerId: string }) {
  const [payments, setPayments] = useState<PaymentListItem[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    paymentsService.listTransactions({ customer_id: customerId, page: 1, page_size: 50 })
      .then(data => { setPayments(data.items); setTotal(data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [customerId])

  if (loading) return <TabEmpty message="Loading payments…" />
  if (payments.length === 0) return <TabEmpty message="No payments found for this customer." />

  return (
    <div>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--rule)', fontSize: 12.5, color: 'var(--ink-3)' }}>
        {total} transaction{total !== 1 ? 's' : ''}
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Booking ref</th>
              <th>Service</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td className="t-meta">{formatDate(p.created_at)}</td>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{p.booking_ref}</span></td>
                <td>{p.service}</td>
                <td>{p.method}</td>
                <td>{formatMoney(p.gross_amount)}</td>
                <td>{statusBadge(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Addresses tab ─────────────────────────────────────────────────────────────

function AddressesTab() {
  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 6 }}>Saved addresses</div>
      <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>
        Address storage is managed by the customer app. Saved places will sync here once the address module is active.
      </div>
    </div>
  )
}

// ── Support tickets tab ───────────────────────────────────────────────────────

function TicketsTab({ customerId }: { customerId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supportService.listTickets({ requester_id: customerId, page: 1, page_size: 50 })
      .then(data => { setTickets(data.items); setTotal(data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [customerId])

  if (loading) return <TabEmpty message="Loading tickets…" />
  if (tickets.length === 0) return <TabEmpty message="No support tickets raised by this customer." />

  return (
    <div>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--rule)', fontSize: 12.5, color: 'var(--ink-3)' }}>
        {total} ticket{total !== 1 ? 's' : ''}
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Subject</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>SLA</th>
              <th>Opened</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id}>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{t.ticket_ref}</span></td>
                <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</td>
                <td className="t-meta">{t.category}</td>
                <td>{statusBadge(t.priority)}</td>
                <td>{statusBadge(t.status)}</td>
                <td>
                  {t.sla_breached
                    ? <span className="badge danger">Breached</span>
                    : t.sla_due_at
                      ? <span className="t-meta">{formatDate(t.sla_due_at)}</span>
                      : <span className="t-meta">—</span>}
                </td>
                <td className="t-meta">{formatDate(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Risk tab ──────────────────────────────────────────────────────────────────

function RiskTab({ customer }: { customer: Customer }) {
  const cancRate = customer.cancellation_rate * 100
  const riskScore = Math.min(100, Math.round(
    (cancRate > 20 ? 40 : cancRate > 10 ? 20 : 0) +
    (customer.status === 'flagged' ? 30 : customer.status === 'suspended' ? 50 : customer.status === 'banned' ? 100 : 0) +
    (customer.rating != null && customer.rating < 3 ? 20 : 0) +
    (customer.trips_count === 0 ? 10 : 0)
  ))
  const riskLevel = riskScore >= 60 ? 'High' : riskScore >= 30 ? 'Medium' : 'Low'
  const riskColor = riskScore >= 60 ? 'var(--danger)' : riskScore >= 30 ? 'var(--warn)' : 'var(--ok)'

  const signals: { label: string; value: string; flag: boolean }[] = [
    { label: 'Account status',      value: customer.status,                                     flag: customer.status !== 'active' },
    { label: 'Cancellation rate',   value: `${cancRate.toFixed(1)}%`,                          flag: cancRate > 10 },
    { label: 'Customer rating',     value: customer.rating != null ? `${customer.rating.toFixed(2)} ★` : 'No ratings', flag: customer.rating != null && customer.rating < 3 },
    { label: 'Trips completed',     value: String(customer.trips_count),                        flag: customer.trips_count === 0 },
    { label: 'Segment',             value: customer.segment,                                    flag: false },
    { label: 'Flag reason',         value: customer.flag_reason ?? '—',                         flag: !!customer.flag_reason },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 640 }}>
      {/* Score */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div className="t-label" style={{ marginBottom: 10 }}>Risk score</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, color: riskColor }}>{riskScore}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: riskColor }}>{riskLevel} risk</div>
            <div className="t-meta">Computed from account signals</div>
          </div>
        </div>
        <div style={{ marginTop: 14, height: 6, borderRadius: 3, background: 'var(--rule)', overflow: 'hidden' }}>
          <div style={{ width: `${riskScore}%`, height: '100%', background: riskColor, borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* Signals */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--rule)' }}>
          <div className="t-label">Signal breakdown</div>
        </div>
        {signals.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px', borderBottom: '1px solid var(--rule-soft)' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {s.flag && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />}
              <span style={{ fontSize: 13, fontWeight: s.flag ? 500 : 400, color: s.flag ? 'var(--danger)' : 'var(--ink)' }}>{s.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Audit tab ─────────────────────────────────────────────────────────────────

function AuditTab({ customerId }: { customerId: string }) {
  const [events, setEvents] = useState<AuditEventSummary[]>([])
  const [total, setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    auditService.listEvents({ target: `customer:${customerId}`, per_page: 50 })
      .then(data => { setEvents(data.items); setTotal(data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [customerId])

  if (loading) return <TabEmpty message="Loading audit events…" />
  if (events.length === 0) return <TabEmpty message="No audit events recorded for this customer yet." />

  return (
    <div>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--rule)', fontSize: 12.5, color: 'var(--ink-3)' }}>
        {total} event{total !== 1 ? 's' : ''}
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Category</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id}>
                <td className="t-meta" style={{ whiteSpace: 'nowrap' }}>{formatDate(e.timestamp)}</td>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{e.action}</span></td>
                <td className="t-meta">{e.actor_name}</td>
                <td className="t-meta">{e.category}</td>
                <td>
                  {e.severity === 'high'
                    ? <span className="badge danger">High</span>
                    : e.severity === 'med'
                      ? <span className="badge warn">Med</span>
                      : <span className="badge">Low</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────

function TripSparkline({ months }: { months: number[] }) {
  const w = 460, h = 110, padX = 10, padT = 10, padB = 22
  const min = Math.min(...months)
  const max = Math.max(...months)
  const range = max - min || 1

  const xAt = (i: number) => padX + (i / (months.length - 1)) * (w - 2 * padX)
  const yAt = (v: number) => padT + (1 - (v - min) / range) * (h - padT - padB)

  const path = months.map((v, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ')
  const fillPath = `${path} L${xAt(months.length - 1)} ${h - padB} L${xAt(0)} ${h - padB} Z`
  const MONTH_LABELS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 120 }}>
      <path d={fillPath} fill="var(--accent)" opacity="0.10" />
      <path d={path} stroke="var(--accent)" strokeWidth="1.6" fill="none" />
      {months.map((v, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(v)} r="2.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.2" />
          <text x={xAt(i)} y={h - 6} textAnchor="middle" fill="var(--ink-3)" style={{ font: '9px IBM Plex Mono' }}>
            {MONTH_LABELS[i % MONTH_LABELS.length]}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── Wallet Adjust Modal ───────────────────────────────────────────────────────

const WALLET_REASONS = [
  'Driver delay',
  'Service issue',
  'Booking error',
  'Goodwill gesture',
  'Manual adjustment',
  'Other',
]

const AMOUNT_PRESETS = [100, 250, 500, 1000]

interface WalletModalProps {
  customer: Customer
  initialDirection?: 'credit' | 'debit'
  onClose: () => void
  onSuccess: (updated: Customer) => void
}

function WalletAdjustModal({ customer, initialDirection = 'credit', onClose, onSuccess }: WalletModalProps) {
  const isMobile = useIsMobile()
  const fmtMoney = useFormatMoney()

  const [direction, setDirection]       = useState<'credit' | 'debit'>(initialDirection)
  const [amountStr, setAmountStr]       = useState('500')
  const [reason, setReason]             = useState(WALLET_REASONS[0])
  const [auditNote, setAuditNote]       = useState('')
  const [notifyPush, setNotifyPush]     = useState(true)
  const [notifySms, setNotifySms]       = useState(false)
  const [notifyEmail, setNotifyEmail]   = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  const amount = Math.max(0, parseInt(amountStr, 10) || 0)
  const amountMinor = amount * 100
  const balanceMinor = customer.wallet_balance_minor
  const newBalanceMinor = direction === 'credit'
    ? balanceMinor + amountMinor
    : balanceMinor - amountMinor

  const withinCap = direction === 'credit' && amountMinor <= 200_000  // ₹2,000

  const handleConfirm = async () => {
    if (amount <= 0) { setError('Amount must be greater than 0'); return }
    if (direction === 'debit' && amountMinor > balanceMinor) {
      setError('Insufficient wallet balance')
      return
    }
    setLoading(true); setError('')
    try {
      const result = await customerService.adjustWallet(customer.id, {
        direction,
        amount_minor: amountMinor,
        reason,
        audit_note: auditNote.trim() || undefined,
        notify_push: notifyPush,
        notify_sms: notifySms,
        notify_email: notifyEmail,
      })
      onSuccess(result.customer)
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to adjust wallet')
    } finally {
      setLoading(false)
    }
  }

  const modalContent = (
    <>
      {/* Header */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 4, flexShrink: 0,
          background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
        }}>
          <Icon name="wallet" size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="t-label">Customer wallet · {customer.name} · {customer.customer_code}</div>
          <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, letterSpacing: '-0.018em' }}>
            {direction === 'credit' ? 'Issue goodwill credit' : 'Debit wallet'}
          </h2>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-3)' }}>
            Current balance{' '}
            <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
              {formatMoney(balanceMinor)}
            </span>
            {' '}· next trip applies wallet first by default
          </div>
        </div>
        <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={14} /></button>
      </div>

      {error && (
        <div style={{ margin: '16px 28px 0', padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>

        {/* Left col */}
        <div>
          <div className="t-label" style={{ marginBottom: 10 }}>Direction</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {(['credit', 'debit'] as const).map(d => {
              const color = d === 'credit' ? 'var(--accent)' : 'var(--danger)'
              const active = direction === d
              return (
                <div
                  key={d}
                  onClick={() => setDirection(d)}
                  style={{
                    flex: 1, padding: '12px 14px',
                    border: `1px solid ${active ? color : 'var(--rule)'}`,
                    background: active ? `color-mix(in oklab, ${color} 8%, var(--surface))` : 'var(--surface)',
                    borderRadius: 3,
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  }}
                >
                  <Icon
                    name={d === 'credit' ? 'plus' : 'x'}
                    size={13}
                    stroke={2.2}
                    style={{ color: active ? color : 'var(--ink-3)' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: active ? 500 : 400, textTransform: 'capitalize' }}>{d}</span>
                </div>
              )
            })}
          </div>

          <div className="t-label" style={{ marginBottom: 10 }}>Amount</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `1px solid ${direction === 'credit' ? 'var(--accent)' : 'var(--danger)'}`, borderRadius: 3, padding: '14px 16px', background: direction === 'credit' ? 'var(--accent-soft-2)' : 'var(--danger-soft)' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 30, color: direction === 'credit' ? 'var(--accent)' : 'var(--danger)', marginRight: 12 }}>{currencySymbol()}</span>
            <input
              value={amountStr}
              onChange={e => setAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
              style={{ flex: 1, border: 0, background: 'transparent', outline: 'none', fontFamily: 'var(--font-serif)', fontSize: 34, color: 'var(--ink)', width: 0 }}
            />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {AMOUNT_PRESETS.map(p => (
              <button
                key={p}
                className="btn sm ghost"
                style={{
                  border: '1px dashed var(--rule-strong)',
                  fontFamily: 'var(--font-mono)', fontSize: 11.5,
                  color: amount === p ? 'var(--accent)' : 'var(--ink-2)',
                  background: amount === p ? 'var(--accent-soft-2)' : 'transparent',
                }}
                onClick={() => setAmountStr(String(p))}
              >
                {currencySymbol()}{p}
              </button>
            ))}
            <button
              className="btn sm ghost"
              style={{ border: '1px dashed var(--rule-strong)', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)' }}
              onClick={() => setAmountStr('')}
            >
              Custom
            </button>
          </div>

          <div className="t-label" style={{ marginTop: 22, marginBottom: 10 }}>Reason · required</div>
          <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
            >
              {WALLET_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="t-label" style={{ marginTop: 18, marginBottom: 10 }}>Audit note · internal</div>
          <div className="input">
            <input
              value={auditNote}
              onChange={e => setAuditNote(e.target.value)}
              placeholder="Optional note for the file"
            />
          </div>
        </div>

        {/* Right col */}
        <div>
          <div className="t-label" style={{ marginBottom: 10 }}>Preview</div>
          <div style={{ padding: '18px 20px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
            <table className="tbl" style={{ marginTop: 0 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>Current balance</td>
                  <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: 'var(--ink-2)' }}>{formatMoney(balanceMinor)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>
                    {direction === 'credit' ? 'Goodwill credit' : 'Debit'}
                  </td>
                  <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: direction === 'credit' ? 'var(--accent)' : 'var(--danger)' }}>
                    {direction === 'credit' ? '+' : '-'}{formatMoney(amountMinor)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>Tax adjustment</td>
                  <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: 'var(--ink-3)' }}>{currencySymbol()}0</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--rule-strong)' }}>
                  <td style={{ padding: '14px 0 0', border: 0, fontSize: 14, fontWeight: 500 }}>New balance</td>
                  <td className="num" style={{ padding: '14px 0 0', border: 0, textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 26, color: newBalanceMinor >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                    {formatMoney(Math.max(0, newBalanceMinor))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {withinCap && (
            <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--info-soft)', border: '1px solid color-mix(in oklab, var(--info) 24%, var(--rule-strong))', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--info)' }}>
                <Icon name="shield" size={13} />
                <span className="t-label" style={{ padding: 0, color: 'var(--info)' }}>Within your goodwill cap</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
                {formatMoney(amountMinor)} is within your per-customer credit cap ({fmtMoney(200000)}). You may issue this directly.
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div className="t-label" style={{ marginBottom: 8 }}>Notify customer</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { label: 'Push',  checked: notifyPush,  set: setNotifyPush },
                { label: 'SMS',   checked: notifySms,   set: setNotifySms },
                { label: 'Email', checked: notifyEmail, set: setNotifyEmail },
              ] as const).map(({ label, checked, set }) => (
                <label
                  key={label}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flex: 1, background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12.5, cursor: 'pointer' }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: 2,
                    border: `1px solid ${checked ? 'var(--accent)' : 'var(--rule-strong)'}`,
                    background: checked ? 'var(--accent)' : 'var(--surface)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {checked && <Icon name="check" size={9} stroke={2.4} style={{ color: '#fff' }} />}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => set(e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 28px', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="t-meta">All wallet adjustments are double-entry · audit-logged</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn accent" onClick={handleConfirm} disabled={loading || amount <= 0}>
            {loading ? 'Processing…' : `${direction === 'credit' ? 'Credit' : 'Debit'} ${formatMoney(amountMinor)} →`}
          </button>
        </div>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--surface)', zIndex: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {modalContent}
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'color-mix(in oklab, var(--ink) 35%, transparent)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 400, padding: '60px 16px 24px', overflowY: 'auto' }}>
      <div style={{
        width: '100%', maxWidth: 760,
        background: 'var(--surface)', border: '1px solid var(--rule-strong)',
        boxShadow: 'var(--shadow-pop)',
      }}>
        {modalContent}
      </div>
    </div>
  )
}

// ── Flag reason modal ─────────────────────────────────────────────────────────

interface FlagModalProps {
  title: string
  placeholder: string
  confirmLabel?: string
  variant?: 'danger' | 'accent'
  onConfirm: (reason: string) => void
  onCancel: () => void
}

function FlagReasonModal({ title, placeholder, confirmLabel = 'Confirm', variant = 'accent', onConfirm, onCancel }: FlagModalProps) {
  const [reason, setReason] = useState('')
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)', padding: '24px 24px 20px' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>{title}</h3>
        <div className="input">
          <input
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={placeholder}
            onKeyDown={e => { if (e.key === 'Enter' && reason.trim()) onConfirm(reason.trim()) }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button className={`btn sm ${variant}`} onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={!reason.trim()}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Wallet & Ledger tab ───────────────────────────────────────────────────────

function WalletTab({ customerId }: { customerId: string }) {
  const canViewWallet = usePermission('customers.wallet.view')
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    setLoading(true)
    customerService.listWalletTransactions(customerId, { page: 1, per_page: 25 })
      .then(data => { setTransactions(data.items); setTotal(data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [customerId])

  if (!canViewWallet) return <AccessDeniedPage message="You don't have permission to view wallet transactions." />

  if (loading) {
    return <div style={{ padding: 32, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
  }

  if (transactions.length === 0) {
    return (
      <div style={{ padding: '40px 32px', textAlign: 'center', color: 'var(--ink-3)' }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>No wallet transactions yet</div>
        <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Wallet adjustments will appear here</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--rule)', fontSize: 12.5, color: 'var(--ink-3)' }}>
        {total} transaction{total !== 1 ? 's' : ''}
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Direction</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td className="num" style={{ color: 'var(--ink-3)' }}>{formatDate(tx.created_at)}</td>
                <td>
                  {tx.direction === 'credit'
                    ? <span className="badge ok"><span className="dot ok" />Credit</span>
                    : <span className="badge danger"><span className="dot danger" />Debit</span>
                  }
                </td>
                <td className="num" style={{ fontFamily: 'var(--font-mono)', color: tx.direction === 'credit' ? 'var(--accent)' : 'var(--danger)' }}>
                  {tx.direction === 'credit' ? '+' : '-'}{formatMoney(tx.amount_minor)}
                </td>
                <td style={{ fontSize: 13 }}>
                  <div>{tx.reason}</div>
                  {tx.audit_note && <div className="t-meta" style={{ marginTop: 2, color: 'var(--ink-3)' }}>{tx.audit_note}</div>}
                </td>
                <td className="t-meta" style={{ color: 'var(--ink-3)' }}>{tx.created_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ customer, isMobile }: { customer: Customer; isMobile: boolean }) {
  // Stub: 12 months of zeros until bookings module populates
  const months = Array(12).fill(0) as number[]

  return (
    <div style={{
      padding: '24px 32px',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr',
      gap: 24,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Trips per month */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div className="t-label">Trips per month · last 12</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                {customer.trips_count > 0 ? 'Trip trend' : 'No trip data yet'}
              </h3>
            </div>
            <div className="t-meta">{customer.trips_count} trips · all-time</div>
          </div>
          <TripSparkline months={months} />
        </div>

        {/* Recent trips stub */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Recent trips</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Last rides</h3>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>When</th>
                <th>Driver · Vehicle</th>
                <th>Route</th>
                <th>Fare</th>
                <th>Payment</th>
                <th>Rated</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '24px 0', fontSize: 13 }}>
                  Trip history will appear once the bookings module is active
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Service mix */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div className="t-label" style={{ marginBottom: 10 }}>Service mix · last 90d</div>
          <div style={{ display: 'flex', height: 8, borderRadius: 2, overflow: 'hidden', background: 'var(--rule)' }}>
            <div style={{ width: '100%', background: 'var(--rule)' }} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="t-meta" style={{ color: 'var(--ink-4)', fontSize: 12 }}>
              Service mix will appear once the bookings module is active
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Payment methods</div>
          <div className="t-meta" style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>
            Payment methods will appear here
          </div>
        </div>

        {/* Saved places */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Saved places</div>
          <div className="t-meta" style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>
            Saved places will appear here
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'trips' | 'payments' | 'wallet' | 'addresses' | 'tickets' | 'risk' | 'audit'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile  = useIsMobile()
  useIsTablet() // reserved for responsive layout adjustments

  const [customer, setCustomer]           = useState<Customer | null>(null)
  const [loading, setLoading]             = useState(true)
  const [activeTab, setActiveTab]         = useState<Tab>('overview')
  const [liveTripsCount, setLiveTripsCount] = useState<number | null>(null)

  const [showWalletModal, setShowWalletModal]         = useState(false)
  const [walletDirection, setWalletDirection]         = useState<'credit' | 'debit'>('credit')
  const [showSuspendDialog, setShowSuspendDialog]     = useState(false)
  const [showBanModal, setShowBanModal]               = useState(false)
  const [showFlagModal, setShowFlagModal]             = useState(false)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)
  const [showUnflagDialog, setShowUnflagDialog]       = useState(false)
  const [apiError, setApiError]                       = useState('')

  // Privacy requests
  const [privacyRequests, setPrivacyRequests]         = useState<PrivacyRequest[]>([])
  const [privacyLoading, setPrivacyLoading]           = useState(false)
  const [showExportConfirm, setShowExportConfirm]     = useState(false)
  const [showDeletionConfirm, setShowDeletionConfirm] = useState(false)
  const canAdjustWallet = usePermission('customers.wallet.adjust')
  const canSuspendCustomer = usePermission('customers.suspend')

  const loadCustomer = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await customerService.getCustomer(id)
      setCustomer(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const loadPrivacyRequests = async () => {
    if (!id) return
    try {
      const data = await privacyService.listRequests({ customer_id: id, per_page: 10 })
      setPrivacyRequests(data.items)
    } catch { /* ignore */ }
  }

  const handleExportRequest = async () => {
    if (!customer) return
    setPrivacyLoading(true)
    try {
      await privacyService.createExportRequest(customer.id)
      await loadPrivacyRequests()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setApiError(err?.response?.data?.detail || 'Failed to submit export request')
    } finally {
      setPrivacyLoading(false)
      setShowExportConfirm(false)
    }
  }

  const handleDeletionRequest = async () => {
    if (!customer) return
    setPrivacyLoading(true)
    try {
      await privacyService.createDeletionRequest(customer.id)
      await loadPrivacyRequests()
      await loadCustomer()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setApiError(err?.response?.data?.detail || 'Failed to submit deletion request')
    } finally {
      setPrivacyLoading(false)
      setShowDeletionConfirm(false)
    }
  }

  useEffect(() => { loadCustomer(); loadPrivacyRequests() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSuspend = async (reason: string) => {
    if (!customer) return
    setApiError('')
    try {
      const updated = await customerService.suspendCustomer(customer.id, reason)
      setCustomer(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to suspend customer')
    }
    setShowSuspendDialog(false)
  }

  const handleReactivate = async () => {
    if (!customer) return
    setApiError('')
    try {
      const updated = await customerService.reactivateCustomer(customer.id)
      setCustomer(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to reactivate customer')
    }
    setShowReactivateDialog(false)
  }

  const handleFlag = async (reason: string) => {
    if (!customer) return
    setApiError('')
    try {
      const updated = await customerService.flagCustomer(customer.id, reason)
      setCustomer(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to flag customer')
    }
    setShowFlagModal(false)
  }

  const handleUnflag = async () => {
    if (!customer) return
    setApiError('')
    try {
      const updated = await customerService.unflagCustomer(customer.id)
      setCustomer(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to remove flag')
    }
    setShowUnflagDialog(false)
  }

  const handleBan = async (reason: string) => {
    if (!customer) return
    setApiError('')
    try {
      const updated = await customerService.banCustomer(customer.id, reason)
      setCustomer(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to ban customer')
    }
    setShowBanModal(false)
  }

  const openGoodwillCredit = () => {
    setWalletDirection('credit')
    setShowWalletModal(true)
  }

  if (loading) {
    return (
      <Shell activeId="customers" breadcrumb="People & Fleet · Customers" title="Loading…">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading customer…</div>
      </Shell>
    )
  }

  if (!customer) {
    return (
      <Shell activeId="customers" breadcrumb="People & Fleet · Customers" title="Not found">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>
          Customer not found.{' '}
          <button className="btn sm ghost" onClick={() => navigate('/customers')}>← Back to customers</button>
        </div>
      </Shell>
    )
  }

  const canSuspend    = customer.status === 'active' || customer.status === 'flagged'
  const canBan        = customer.status === 'active' || customer.status === 'suspended' || customer.status === 'flagged'
  const canReactivate = customer.status === 'suspended' || customer.status === 'banned'

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'trips',     label: `Trips · ${liveTripsCount ?? customer.trips_count}` },
    { key: 'payments',  label: 'Payments' },
    { key: 'wallet',    label: 'Wallet & ledger' },
    { key: 'addresses', label: 'Addresses' },
    { key: 'tickets',   label: 'Tickets' },
    { key: 'risk',      label: 'Risk' },
    { key: 'audit',     label: 'Audit' },
  ]

  return (
    <Shell
      activeId="customers"
      breadcrumb="People & Fleet · Customers"
      title={customer.name}
      subtitle={`${customer.customer_code} · ${segmentLabel(customer.segment)} · ${customer.trips_count} trips · LTV ${formatMoney(customer.ltv_minor)}`}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn sm"
            disabled
            title="Messaging available when Notifications module is active"
          >
            <Icon name="envelope" size={13} />Message
          </button>
          <button className="btn sm" onClick={openGoodwillCredit}>
            Goodwill credit
          </button>
          {/* Privacy actions — disabled when an open request of that type already exists */}
          {(() => {
            const hasOpenExport   = privacyRequests.some(r => r.request_type === 'export'   && ['pending','processing'].includes(r.status))
            const hasOpenDeletion = privacyRequests.some(r => r.request_type === 'deletion' && ['pending','processing'].includes(r.status))
            return (
              <>
                <button
                  className="btn sm ghost"
                  onClick={() => setShowExportConfirm(true)}
                  disabled={hasOpenExport || privacyLoading}
                  title={hasOpenExport ? 'Export request already pending' : 'Request data export (GDPR)'}
                >
                  {hasOpenExport ? '⏳ Export pending' : 'Export data'}
                </button>
                <button
                  className="btn sm ghost"
                  onClick={() => setShowDeletionConfirm(true)}
                  disabled={hasOpenDeletion || privacyLoading || customer.status === 'deleted'}
                  title={hasOpenDeletion ? 'Deletion request already pending' : 'Request account deletion (GDPR)'}
                  style={hasOpenDeletion ? {} : { color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 40%, var(--rule))' }}
                >
                  {hasOpenDeletion ? '⏳ Deletion pending' : 'Delete account'}
                </button>
              </>
            )
          })()}
          {customer.status === 'flagged' ? (
            <button className="btn sm" onClick={() => setShowUnflagDialog(true)}>Unflag</button>
          ) : (
            <button className="btn sm" onClick={() => setShowFlagModal(true)}>Flag</button>
          )}
          {canSuspend && (
            <button className="btn sm danger" style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }} onClick={() => setShowSuspendDialog(true)}>
              Suspend
            </button>
          )}
          {canBan && !canReactivate && (
            <button className="btn sm ghost" style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 40%, var(--rule))' }} onClick={() => setShowBanModal(true)}>
              Ban
            </button>
          )}
          {canReactivate && (
            <button className="btn sm accent" onClick={() => setShowReactivateDialog(true)}>
              Reactivate
            </button>
          )}
        </div>
      }
    >
      <div>
        {/* API error banner */}
        {apiError && (
          <div style={{
            margin: '12px 32px 0',
            padding: '10px 14px',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3,
            fontSize: 12.5,
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <span>{apiError}</span>
            <button
              className="btn ghost icon sm"
              onClick={() => setApiError('')}
              style={{ flexShrink: 0 }}
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        )}

        {/* Hero */}
        <div style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--rule)',
          padding: isMobile ? '20px 16px' : '28px 32px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '420px 1fr',
          gap: 36,
        }}>
          {/* Left: identity */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div
              className="avatar xl"
              style={customer.segment === 'vip_corp' ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
            >
              {getInitials(customer.name)}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                {customer.status === 'active'    && <span className="badge ok"><span className="dot ok" />Active</span>}
                {customer.status === 'flagged'   && <span className="badge warn"><span className="dot warn" />Flagged</span>}
                {customer.status === 'suspended' && <span className="badge danger"><span className="dot danger" />Suspended</span>}
                {customer.status === 'banned'    && <span className="badge danger"><span className="dot danger" />Banned</span>}
                <span className="badge">
                  <Icon name="shield" size={9} />
                  {segmentLabel(customer.segment)}
                </span>
                <span className="badge"><span className="dot ok" />KYC OK</span>
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.020em' }}>
                {customer.name}
              </div>
              <div className="t-meta" style={{ marginTop: 6 }}>
                {customer.customer_code} · {customer.phone} · {customer.email}
              </div>
              <div className="t-meta" style={{ marginTop: 2 }}>
                {customer.city ?? 'Unknown city'} · joined {formatDate(customer.joined_at)}
              </div>
            </div>
          </div>

          {/* Right: stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
            gap: 0,
            alignSelf: 'center',
            minWidth: 0,
            overflowX: isMobile ? 'auto' : undefined,
          }}>
            {[
              { k: 'Total trips',    v: String(customer.trips_count),                                    m: '',                                                  c: 'var(--ink)' },
              { k: 'Lifetime spend', v: formatMoney(customer.ltv_minor),                                  m: 'Lifetime value',                                    c: 'var(--ink)' },
              { k: 'Avg fare',       v: customer.avg_fare_minor != null ? formatMoney(customer.avg_fare_minor) : '—', m: 'Per trip',                             c: 'var(--ink-2)' },
              { k: 'Rating · given', v: customer.rating != null ? `${customer.rating.toFixed(2)} ★` : '—', m: 'Avg across drivers',                            c: 'var(--accent)' },
              { k: 'Cancellations',  v: `${(customer.cancellation_rate * 100).toFixed(1)}%`,             m: customer.cancellation_rate < 0.1 ? 'Healthy range' : 'Above average', c: 'var(--ink-2)' },
            ].map(({ k, v, m, c }, i) => (
              <div
                key={k}
                style={{
                  padding: isMobile ? '12px 10px' : '0 18px',
                  borderRight: isMobile ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none') : (i < 4 ? '1px solid var(--rule)' : 'none'),
                  borderBottom: isMobile && i < (isMobile ? 2 : 0) ? '1px solid var(--rule)' : 'none',
                  borderTop: isMobile && i >= 2 ? '1px solid var(--rule)' : 'none',
                }}
              >
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 22, color: c }}>{v}</div>
                {m && <div className="t-meta" style={{ marginTop: 6 }}>{m}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          padding: isMobile ? '0 4px' : '0 32px',
          borderBottom: '1px solid var(--rule)',
          background: 'var(--surface)',
          display: 'flex',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          {TABS.map(({ key, label }) => {
            const active = activeTab === key
            return (
              <div
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: isMobile ? '12px 14px' : '14px 18px',
                  fontSize: 13,
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: active ? 500 : 400,
                  borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: -1,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {label}
              </div>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview'  && <OverviewTab customer={customer} isMobile={isMobile} />}
        {activeTab === 'trips'     && <TripsTab customerId={customer.id} onCountLoaded={setLiveTripsCount} />}
        {activeTab === 'payments'  && <PaymentsTab customerId={customer.id} />}
        {activeTab === 'wallet'    && <WalletTab customerId={customer.id} />}
        {activeTab === 'addresses' && <AddressesTab />}
        {activeTab === 'tickets'   && <TicketsTab customerId={customer.id} />}
        {activeTab === 'risk'      && <RiskTab customer={customer} />}
        {activeTab === 'audit'     && <AuditTab customerId={customer.id} />}
      </div>

      {/* Wallet Adjust Modal */}
      {showWalletModal && (
        <WalletAdjustModal
          customer={customer}
          initialDirection={walletDirection}
          onClose={() => setShowWalletModal(false)}
          onSuccess={updated => setCustomer(updated)}
        />
      )}

      {/* Suspend — reason required */}
      {showSuspendDialog && (
        <FlagReasonModal
          title={`Suspend ${customer.name}`}
          placeholder="Reason for suspension (required)…"
          confirmLabel="Suspend"
          variant="danger"
          onConfirm={handleSuspend}
          onCancel={() => setShowSuspendDialog(false)}
        />
      )}

      {/* Flag modal */}
      {showFlagModal && (
        <FlagReasonModal
          title={`Flag ${customer.name}`}
          placeholder="Reason for flagging…"
          onConfirm={handleFlag}
          onCancel={() => setShowFlagModal(false)}
        />
      )}

      {/* Ban modal */}
      {showBanModal && (
        <FlagReasonModal
          title={`Ban ${customer.name}`}
          placeholder="Reason for ban (required)…"
          confirmLabel="Ban customer"
          variant="danger"
          onConfirm={handleBan}
          onCancel={() => setShowBanModal(false)}
        />
      )}

      {/* Reactivate confirm */}
      <ConfirmDialog
        open={showReactivateDialog}
        title="Reactivate customer"
        description={`Restore ${customer.name}'s account. They will be able to make new bookings immediately.`}
        confirmLabel="Reactivate"
        variant="default"
        onConfirm={handleReactivate}
        onCancel={() => setShowReactivateDialog(false)}
      />

      {/* Unflag confirm */}
      <ConfirmDialog
        open={showUnflagDialog}
        title="Remove flag"
        description={`Clear the flag on ${customer.name} and restore their Active status.`}
        confirmLabel="Unflag"
        variant="default"
        onConfirm={handleUnflag}
        onCancel={() => setShowUnflagDialog(false)}
      />

      {/* Privacy — Export request confirmation */}
      <ConfirmDialog
        open={showExportConfirm}
        title="Request data export"
        description={`A GDPR data-export package will be prepared for ${customer.name}. The SLA timer starts immediately. You can track progress in Privacy Requests.`}
        confirmLabel="Submit export request"
        variant="default"
        onConfirm={handleExportRequest}
        onCancel={() => setShowExportConfirm(false)}
      />

      {/* Privacy — Deletion request confirmation */}
      <ConfirmDialog
        open={showDeletionConfirm}
        title="Request account deletion"
        description={`This will permanently anonymize ${customer.name}'s personal data (name, phone, email). If auto-process is enabled in Settings → Data & Privacy, it will execute immediately. This cannot be undone.`}
        confirmLabel="Submit deletion request"
        variant="danger"
        onConfirm={handleDeletionRequest}
        onCancel={() => setShowDeletionConfirm(false)}
      />
    </Shell>
  )
}
