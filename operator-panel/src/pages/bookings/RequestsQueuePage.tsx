import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  Download,
  Search,
  Tag,
  X,
} from 'lucide-react'
import { fmtDateShort, fmtTime } from '../../lib/format'
import Shell from '../../components/layout/Shell'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { BookingRequest } from '../../services/operatorRequestsService'
import { operatorRequestsService } from '../../services/operatorRequestsService'

type TabId = 'all' | 'pending' | 'quoted' | 'accepted' | 'expired' | 'rejected'

function ttlRemaining(iso: string | null): { label: string; tone: 'danger' | 'warn' | null } {
  if (!iso) return { label: '', tone: null }
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return { label: 'Expired', tone: 'danger' }
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return { label: `${days}d ${hours % 24}h left`, tone: null }
  if (hours > 0) return { label: `${hours}h ${minutes % 60}m left`, tone: hours < 2 ? 'warn' : null }
  return { label: `${minutes} min left`, tone: minutes < 20 ? 'danger' : 'warn' }
}

const SUBTYPE_TONE: Record<string, string> = {
  charter: 'info',
  shuttle: 'ok',
  cargo: 'pending',
  medevac: 'danger',
  vip: 'warn',
}

function TypeBadge({ type }: { type: string }) {
  const tone = SUBTYPE_TONE[type] ?? 'pending'
  return (
    <span className={`badge ${tone}`} style={{ height: 19, fontSize: 10 }}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  )
}

export default function RequestsQueuePage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [search, setSearch] = useState('')
  const [rejectTarget, setRejectTarget] = useState<BookingRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadData = () => {
    operatorRequestsService
      .list()
      .then(setRequests)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const urgentCount = useMemo(() => {
    const now = Date.now()
    return requests.filter(r => {
      if (r.status !== 'pending' || !r.ttl_expires_at) return false
      return new Date(r.ttl_expires_at).getTime() - now < 60 * 60 * 1000
    }).length
  }, [requests])

  const tabCounts: Record<TabId, number> = useMemo(() => ({
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    quoted: requests.filter(r => r.status === 'quote_shared').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    expired: requests.filter(r => r.status === 'expired').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }), [requests])

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (activeTab !== 'all') {
        const statusMap: Record<TabId, string[]> = {
          all: [],
          pending: ['pending'],
          quoted: ['quote_shared'],
          accepted: ['accepted'],
          expired: ['expired'],
          rejected: ['rejected'],
        }
        if (!statusMap[activeTab].includes(r.status)) return false
      }
      if (search) {
        const q = search.toLowerCase()
        return (
          r.booking_ref.toLowerCase().includes(q) ||
          (r.passenger_name ?? '').toLowerCase().includes(q) ||
          (r.passenger_org ?? '').toLowerCase().includes(q) ||
          r.origin_name.toLowerCase().includes(q) ||
          r.destination_name.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [requests, activeTab, search])

  const handleAccept = (r: BookingRequest) => {
    operatorRequestsService
      .accept(r.id)
      .then(() => loadData())
      .catch(console.error)
  }

  const handleRejectConfirm = () => {
    if (!rejectTarget || !rejectReason.trim()) return
    operatorRequestsService
      .reject(rejectTarget.id, rejectReason)
      .then(() => {
        setRejectTarget(null)
        setRejectReason('')
        loadData()
      })
      .catch(console.error)
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'quoted', label: 'Quoted' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'expired', label: 'Expired' },
    { id: 'rejected', label: 'Rejected' },
  ]

  const STATUS_TONE: Record<string, string> = {
    pending: 'warn',
    quote_shared: 'info',
    accepted: 'ok',
    expired: 'warn',
    rejected: 'danger',
  }

  return (
    <Shell
      activeId="bookings"
      breadcrumb="Operations"
      title="Booking Requests"
      subtitle={`${tabCounts.pending} pending${urgentCount > 0 ? ` · ${urgentCount} urgent` : ''}`}
      actions={
        <button className="btn sm">
          <Download size={12} />
          Export
        </button>
      }
    >
      {/* Tab bar */}
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
        {tabs.map(t => (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              height: 44,
              padding: '0 14px',
              cursor: 'pointer',
              borderBottom: t.id === activeTab ? '2px solid var(--ink)' : '2px solid transparent',
              color: t.id === activeTab ? 'var(--ink)' : 'var(--ink-3)',
              fontSize: 13,
              fontWeight: t.id === activeTab ? 500 : 400,
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                padding: '1px 7px',
                borderRadius: 10,
                background: t.id === activeTab ? 'var(--ink)' : 'var(--surface-sunk)',
                color: t.id === activeTab ? 'var(--bg)' : 'var(--ink-3)',
                border: t.id === activeTab ? 'none' : '1px solid var(--rule-strong)',
              }}
            >
              {tabCounts[t.id]}
            </span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
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
        <div className="input" style={{ width: 260, height: 32 }}>
          <Search size={13} className="icon" />
          <input
            placeholder="Search passengers, refs, routes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>
          {filtered.length} results
        </span>
      </div>

      {/* Urgency strip */}
      {urgentCount > 0 && activeTab !== 'rejected' && activeTab !== 'accepted' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 28px',
            height: 40,
            background: 'var(--danger-soft)',
            borderBottom: '1px solid color-mix(in oklab, var(--danger) 20%, var(--rule))',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--danger)',
              fontWeight: 500,
            }}
          >
            {urgentCount} expiring within the hour
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
            — Unanswered requests auto-reject at deadline.
          </span>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {/* Col header */}
        <div
          style={{
            display: 'flex',
            padding: '8px 24px',
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--rule)',
            minWidth: 900,
          }}
        >
          {[
            ['Ref / Type', 130],
            ['Passenger · Route', 0],
            ['Load', 78],
            ['Flight Date', 96],
            ['Submitted', 90],
            ['Deadline', 120],
            ['Status', 96],
            ['', 160],
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
            No requests found.
          </div>
        )}

        {!loading &&
          filtered.map((r, i) => {
            const { label: ttlLabel, tone: ttlTone } = ttlRemaining(r.ttl_expires_at)
            const statusTone = STATUS_TONE[r.status] ?? 'pending'
            const rowBg =
              ttlTone === 'danger'
                ? 'color-mix(in oklab, var(--danger-soft) 70%, transparent)'
                : ttlTone === 'warn'
                ? 'color-mix(in oklab, var(--warn-soft) 45%, transparent)'
                : 'transparent'

            return (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '11px 24px',
                  borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--rule-soft)',
                  background: rowBg,
                  minWidth: 900,
                }}
              >
                {/* Ref + type */}
                <div style={{ width: 130, flexShrink: 0 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      letterSpacing: '0.06em',
                      color: 'var(--ink)',
                    }}
                  >
                    {r.booking_ref}
                  </span>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    <TypeBadge type={r.service_subtype} />
                    {r.is_vip && <TypeBadge type="vip" />}
                  </div>
                </div>

                {/* Passenger + route */}
                <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: 'var(--ink)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.passenger_org || r.passenger_name || '—'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span className="t-meta" style={{ fontSize: 11.5 }}>
                      {r.origin_name}
                    </span>
                    <ArrowRight size={10} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                    <span className="t-meta" style={{ fontSize: 11.5 }}>
                      {r.destination_name}
                    </span>
                  </div>
                </div>

                {/* Load */}
                <div style={{ width: 78, flexShrink: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{r.pax_count} pax</div>
                  <div className="t-meta" style={{ fontSize: 11 }}>{r.baggage_kg} kg</div>
                </div>

                {/* Flight date */}
                <div style={{ width: 96, flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.02em',
                      color: 'var(--ink-2)',
                    }}
                  >
                    {r.flight_date ? fmtDateShort(r.flight_date) : 'ASAP'}
                  </div>
                </div>

                {/* Submitted */}
                <div style={{ width: 90, flexShrink: 0 }}>
                  <div className="t-meta" style={{ fontSize: 11 }}>
                    {fmtTime(r.received_at)}
                  </div>
                </div>

                {/* TTL */}
                <div style={{ width: 120, flexShrink: 0 }}>
                  {ttlLabel && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        height: 22,
                        padding: '0 8px',
                        background:
                          ttlTone === 'danger'
                            ? 'var(--danger-soft)'
                            : ttlTone === 'warn'
                            ? 'var(--warn-soft)'
                            : 'var(--surface-2)',
                        border: `1px solid ${
                          ttlTone === 'danger'
                            ? 'color-mix(in oklab,var(--danger) 28%,var(--rule))'
                            : ttlTone === 'warn'
                            ? 'color-mix(in oklab,var(--warn) 28%,var(--rule))'
                            : 'var(--rule-strong)'
                        }`,
                        borderRadius: 2,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.06em',
                        color:
                          ttlTone === 'danger'
                            ? 'var(--danger)'
                            : ttlTone === 'warn'
                            ? 'var(--warn)'
                            : 'var(--ink-4)',
                      }}
                    >
                      <Clock size={10} />
                      {ttlLabel}
                    </span>
                  )}
                </div>

                {/* Status */}
                <div style={{ width: 96, flexShrink: 0 }}>
                  <span className={`badge ${statusTone}`} style={{ height: 19 }}>
                    <span className={`dot ${statusTone}`} />
                    {r.status.charAt(0).toUpperCase() + r.status.replace('_', ' ').slice(1)}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 5, flexShrink: 0, width: 160, justifyContent: 'flex-end' }}>
                  <button
                    className="btn sm"
                    style={{ height: 26 }}
                    onClick={() => navigate(`/bookings/${r.id}`)}
                  >
                    View
                  </button>
                  {r.status === 'pending' && r.service_subtype === 'shuttle' && (
                    <button
                      className="btn sm accent"
                      style={{ height: 26 }}
                      onClick={() => handleAccept(r)}
                    >
                      <Check size={11} />
                      Accept
                    </button>
                  )}
                  {r.status === 'pending' && r.service_subtype !== 'shuttle' && (
                    <button
                      className="btn sm accent"
                      style={{ height: 26 }}
                      onClick={() => navigate(`/bookings/${r.id}`)}
                    >
                      <Tag size={11} />
                      Quote
                    </button>
                  )}
                  {r.status === 'pending' && (
                    <button
                      className="btn sm"
                      style={{ height: 26, color: 'var(--danger)', borderColor: 'color-mix(in oklab,var(--danger) 40%,var(--rule))' }}
                      onClick={() => { setRejectTarget(r); setRejectReason('') }}
                    >
                      <X size={11} />
                      Reject
                    </button>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      {/* Reject dialog */}
      {rejectTarget && (
        <ConfirmDialog
          open
          title={`Reject ${rejectTarget.booking_ref}?`}
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
          onConfirm={handleRejectConfirm}
          onCancel={() => { setRejectTarget(null); setRejectReason('') }}
        />
      )}
    </Shell>
  )
}
