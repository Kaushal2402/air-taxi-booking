import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { airBookingsService } from '../../services/airBookingsService'
import type { AirBookingListItem, AirBookingStats, AirBookingStatus } from '../../services/airBookingsService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMinor = (v: number) => `₹${(v / 100).toLocaleString('en-IN')}`

function fmtFare(finalMinor: number | null, estimateMinor: number): string {
  const val = finalMinor ?? estimateMinor
  return fmtMinor(val)
}

function fmtEtd(etd: string): string {
  try {
    const d = new Date(etd)
    const now = new Date()
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    const isToday = d.toDateString() === now.toDateString()
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
    const isTomorrow = d.toDateString() === tomorrow.toDateString()
    if (isToday) return `Today ${time}`
    if (isTomorrow) return `Tomorrow ${time}`
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' · ' + time
  } catch { return etd }
}

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

// ── Tab strip config ──────────────────────────────────────────────────────────

type TabKey = 'all' | 'in_air' | 'quote_pending' | 'manifest_open' | 'cancelled' | 'refund'

interface TabConfig {
  key: TabKey
  label: string
  tone?: string
  statusFilter?: string
}

const TABS: TabConfig[] = [
  { key: 'all',           label: 'All bookings' },
  { key: 'in_air',        label: 'In air',         tone: 'var(--accent)',  statusFilter: 'Departed' },
  { key: 'quote_pending', label: 'Quote pending',   tone: 'var(--warn)',    statusFilter: 'Quote shared,Requested' },
  { key: 'manifest_open', label: 'Manifest open',   tone: 'var(--info)',    statusFilter: 'Confirmed,Boarding' },
  { key: 'cancelled',     label: 'Cancelled · 7d',  tone: 'var(--danger)', statusFilter: 'Cancelled' },
  { key: 'refund',        label: 'Refund queue',    tone: 'var(--info)',    statusFilter: 'Refunded' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AirBookingsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  useIsTablet()

  const [items, setItems] = useState<AirBookingListItem[]>([])
  const [stats, setStats] = useState<AirBookingStats | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [search, setSearch] = useState('')
  const [subtypeFilter, setSubtypeFilter] = useState('')
  const [flaggedFilter, setFlaggedFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadData = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const tab = TABS.find(t => t.key === activeTab)
      const params: Record<string, string | number | boolean | undefined> = {
        page: p,
        page_size: 50,
      }
      if (search.trim()) params.search = search.trim()
      if (tab?.statusFilter && activeTab !== 'all') params.status = tab.statusFilter
      if (subtypeFilter) params.service_subtype = subtypeFilter
      if (flaggedFilter === 'yes') params.flagged = true
      if (flaggedFilter === 'no') params.flagged = false
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const res = await airBookingsService.listAirBookings(params)
      setItems(res.items)
      setTotal(res.total)
      setPage(res.page)
      setPages(res.pages)
      setStats(res.stats)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, search, subtypeFilter, flaggedFilter, dateFrom, dateTo])

  useEffect(() => {
    loadData(1)
  }, [loadData])

  const tabCounts: Record<TabKey, number> = {
    all:           total,
    in_air:        stats?.in_air_count ?? 0,
    quote_pending: stats?.quote_pending_count ?? 0,
    manifest_open: stats?.manifest_open_count ?? 0,
    cancelled:     stats?.cancelled_7d_count ?? 0,
    refund:        stats?.refund_queue_count ?? 0,
  }

  const pageNumbers: (number | '...')[] = []
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) pageNumbers.push(i)
  } else {
    pageNumbers.push(1)
    if (page > 3) pageNumbers.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) pageNumbers.push(i)
    if (page < pages - 2) pageNumbers.push('...')
    pageNumbers.push(pages)
  }

  const grossRevFmt = stats ? fmtMinor(stats.gross_revenue_minor) : ''

  return (
    <Shell
      activeId="bookings-a"
      breadcrumb="Operations · Bookings"
      title="Air bookings"
      subtitle={stats ? `${total.toLocaleString('en-IN')} bookings · ${stats.in_air_count} in air · ${grossRevFmt} gross` : undefined}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm">
            <Icon name="download" size={13} />Export
          </button>
          <button className="btn sm accent" onClick={() => navigate('/bookings/air/new')}>
            <Icon name="plus" size={13} />Assisted booking
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Stats / Tab strip */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
          overflowX: 'auto',
        }}>
          {TABS.map((tab, i) => {
            const isActive = activeTab === tab.key
            const count = tabCounts[tab.key]
            const isLastInRow = isMobile ? (i % 2 === 1) : (i === TABS.length - 1)
            const isLastRow = isMobile ? i >= TABS.length - 2 : true

            return (
              <div
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '16px 18px',
                  borderRight: isLastInRow ? 'none' : '1px solid var(--rule)',
                  borderBottom: isMobile && !isLastRow
                    ? '1px solid var(--rule)'
                    : isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  background: isActive ? 'var(--surface-2)' : 'transparent',
                  minWidth: isMobile ? 0 : 120,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 12.5,
                    color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                    fontWeight: isActive ? 500 : 400,
                  }}>{tab.label}</span>
                  {tab.tone && !isActive && (
                    <span className="dot" style={{ background: tab.tone, width: 6, height: 6 }} />
                  )}
                </div>
                <div style={{
                  marginTop: 4,
                  fontFamily: 'var(--font-serif)',
                  fontSize: isMobile ? 18 : 22,
                  fontWeight: 400,
                  letterSpacing: '-0.018em',
                  color: 'var(--ink)',
                }}>{count.toLocaleString('en-IN')}</div>
              </div>
            )
          })}
        </div>

        {/* Filter bar */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderBottom: 0,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          <div className="input" style={{ width: isMobile ? '100%' : 260, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input
              placeholder="Ref, customer, route, registration…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="input" style={{ height: 32, width: 160, padding: 0, paddingLeft: 10 }}>
            <select
              value={subtypeFilter}
              onChange={e => setSubtypeFilter(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 12.5 }}
            >
              <option value="">Sub-type · All</option>
              <option value="helicopter_shuttle">Heli · Shuttle</option>
              <option value="helicopter_on_demand">Heli · On-demand</option>
              <option value="charter">Charter</option>
              <option value="vip">VIP</option>
            </select>
          </div>

          <div className="input" style={{ height: 32, width: 140, padding: 0, paddingLeft: 10 }}>
            <select
              value={flaggedFilter}
              onChange={e => setFlaggedFilter(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 12.5 }}
            >
              <option value="">Flagged · Either</option>
              <option value="yes">Flagged only</option>
              <option value="no">Not flagged</option>
            </select>
          </div>

          {!isMobile && (
            <>
              <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10 }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 12.5, width: 130 }}
                  title="Date from"
                />
              </div>
              <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10 }}>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 12.5, width: 130 }}
                  title="Date to"
                />
              </div>
            </>
          )}

          <div style={{ flex: 1 }} />

          <button className="btn sm ghost">
            <Icon name="filter" size={13} />
            Saved view <Icon name="chevDown" size={11} />
          </button>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl" style={{ minWidth: isMobile ? 640 : undefined }}>
                <thead>
                  <tr>
                    <th>Ref</th>
                    {!isMobile && <th>Customer · Service</th>}
                    <th>Itinerary</th>
                    {!isMobile && <th>Operator</th>}
                    <th>Pax</th>
                    <th>ETD</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Fare</th>
                    {!isMobile && <th>Payment</th>}
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={isMobile ? 6 : 9} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                        No bookings found.
                      </td>
                    </tr>
                  ) : items.map(b => (
                    <tr
                      key={b.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/bookings/air/${b.id}`)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                            {b.booking_ref}
                          </span>
                          {b.flagged && (
                            <span title={b.flag_reason ?? 'Flagged'}>
                              <Icon name="flag" size={12} stroke={1.6} style={{ color: 'var(--danger)' }} />
                            </span>
                          )}
                        </div>
                      </td>
                      {!isMobile && (
                        <td>
                          <div style={{ fontSize: 13, color: 'var(--ink)' }}>{b.customer_name ?? '—'}</div>
                          <div className="t-meta" style={{ marginTop: 2 }}>{b.service_label}</div>
                        </td>
                      )}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          <span style={{ color: 'var(--ink)' }}>{b.route_from}</span>
                          <Icon name="arrowRight" size={11} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                          <span style={{ color: 'var(--ink-2)' }}>{b.route_to}</span>
                        </div>
                      </td>
                      {!isMobile && (
                        <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                          {b.operator_name ?? '—'}
                        </td>
                      )}
                      <td className="num">{b.pax_count}</td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>
                          {fmtEtd(b.etd)}
                        </div>
                      </td>
                      <td>{statusBadge(b.status)}</td>
                      <td className="num" style={{ textAlign: 'right', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
                        {fmtFare(b.fare_final_minor, b.fare_estimate_minor)}
                      </td>
                      {!isMobile && (
                        <td className="t-meta" style={{ color: 'var(--ink-2)' }}>
                          {b.payment_method ?? '—'}
                        </td>
                      )}
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          className="btn ghost icon sm"
                          onClick={() => navigate(`/bookings/air/${b.id}`)}
                        >
                          <Icon name="moreVert" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer + pagination */}
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--rule)',
            background: 'var(--surface-2)',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <div className="t-meta">
              Showing{' '}
              <span style={{ color: 'var(--ink-2)' }}>
                {items.length === 0 ? 0 : (page - 1) * 50 + 1}–{Math.min(page * 50, total)}
              </span>{' '}
              of{' '}
              <span style={{ color: 'var(--ink-2)' }}>{total.toLocaleString('en-IN')}</span>
              {' '}bookings · All air bookings respect operator pause state · audit-logged
            </div>
            {pages > 1 && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  className="btn ghost sm"
                  disabled={page <= 1}
                  onClick={() => loadData(page - 1)}
                  style={{ opacity: page <= 1 ? 0.4 : 1 }}
                >
                  <Icon name="chevLeft" size={13} />
                </button>
                {pageNumbers.map((p, i) => (
                  p === '...'
                    ? <span key={`ellipsis-${i}`} style={{ width: 28, textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>…</span>
                    : (
                      <span
                        key={p}
                        onClick={() => loadData(p)}
                        style={{
                          width: 28, height: 28,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 3,
                          background: p === page ? 'var(--ink)' : 'transparent',
                          color: p === page ? 'var(--surface)' : 'var(--ink-3)',
                          fontFamily: 'var(--font-mono)', fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >{p}</span>
                    )
                ))}
                <button
                  className="btn ghost sm"
                  disabled={page >= pages}
                  onClick={() => loadData(page + 1)}
                  style={{ opacity: page >= pages ? 0.4 : 1 }}
                >
                  <Icon name="chevRight" size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  )
}
