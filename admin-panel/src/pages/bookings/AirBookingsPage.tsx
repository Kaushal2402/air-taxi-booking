import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { airBookingsService } from '../../services/airBookingsService'
import type { AirBookingListItem, AirBookingStats } from '../../services/airBookingsService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMinor = (v: number) => `₹${(v / 100).toLocaleString('en-IN')}`

function aStatusBadge(s: string) {
  const map: Record<string, string> = {
    'Confirmed':        'ok',
    'Boarding':         'info',
    'Departed':         'ok',
    'Arrived':          'pending',
    'Completed':        'pending',
    'Quote shared':     'warn',
    'Manifest locked':  'info',
    'Requested':        'warn',
    'Cancelled':        'danger',
    'Refunded':         'info',
    'Rescheduled':      'info',
  }
  const tone = map[s] || 'pending'
  return (
    <span className={`badge ${tone}`}>
      <span className={`dot ${tone}`} />
      {s}
    </span>
  )
}

function formatEtd(iso: string): { time: string; date: string } {
  try {
    const d = new Date(iso)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    const isTomorrow = d.toDateString() === tomorrow.toDateString()
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    let date: string
    if (isToday) date = 'Today'
    else if (isTomorrow) date = 'Tomorrow'
    else date = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    return { time, date }
  } catch {
    return { time: iso, date: '' }
  }
}

function exportCsv(items: AirBookingListItem[]) {
  const headers = ['Ref', 'Customer', 'Service', 'Route From', 'Route To', 'Operator', 'Pax', 'ETD', 'Status', 'Fare', 'Payment', 'Flagged']
  const rows = items.map(b => [
    b.booking_ref,
    b.customer_name ?? '—',
    b.service_label,
    b.route_from,
    b.route_to,
    b.operator_name ?? '—',
    b.pax_count,
    b.etd,
    b.status,
    fmtMinor(b.fare_final_minor ?? b.fare_estimate_minor),
    b.payment_method ?? '—',
    b.flagged ? 'Yes' : 'No',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `air-bookings-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Tab config ────────────────────────────────────────────────────────────────

type AirTabKey = 'all' | 'in_air' | 'quote_pending' | 'manifest_open' | 'cancelled_7d' | 'refund_queue'

interface AirTabConfig {
  key: AirTabKey
  label: string
  tone?: string
  statusFilter?: string
}

const AIR_TABS: AirTabConfig[] = [
  { key: 'all',           label: 'All bookings' },
  { key: 'in_air',        label: 'In air',         tone: 'var(--accent)',  statusFilter: 'Boarding,Departed,Arrived' },
  { key: 'quote_pending', label: 'Quote pending',   tone: 'var(--warn)',    statusFilter: 'Quote shared' },
  { key: 'manifest_open', label: 'Manifest open',   tone: 'var(--info)',    statusFilter: 'Confirmed,Manifest locked' },
  { key: 'cancelled_7d',  label: 'Cancelled · 7d',  tone: 'var(--danger)', statusFilter: 'Cancelled' },
  { key: 'refund_queue',  label: 'Refund queue',    tone: 'var(--info)',    statusFilter: 'Refunded' },
]

// ── Row menu component (defined OUTSIDE page) ─────────────────────────────────

interface AirRowMenuProps {
  booking: AirBookingListItem
  onClose: () => void
  onView: () => void
  onFlag: () => void
}

function AirRowMenu({ booking, onClose, onView, onFlag }: AirRowMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute', right: 0, top: '100%', zIndex: 100,
      background: 'var(--surface)', border: '1px solid var(--rule)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      minWidth: 160, borderRadius: 3,
    }}>
      {[
        { label: 'View details', icon: 'external', action: onView },
        { label: booking.flagged ? 'Remove flag' : 'Flag booking', icon: 'flag', action: onFlag },
      ].map(item => (
        <div
          key={item.label}
          onClick={() => { item.action(); onClose() }}
          style={{
            padding: '10px 14px', fontSize: 13, cursor: 'pointer',
            color: 'var(--ink)',
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: '1px solid var(--rule-soft)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Icon name={item.icon} size={13} style={{ color: 'var(--ink-3)' }} />
          {item.label}
        </div>
      ))}
    </div>
  )
}

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

  const [activeTab, setActiveTab] = useState<AirTabKey>('all')
  const [search, setSearch] = useState('')
  const [subtypeFilter, setSubtypeFilter] = useState('')
  const [operatorFilter, setOperatorFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [flaggedFilter, setFlaggedFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [menuId, setMenuId] = useState<string | null>(null)

  const loadData = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const tab = AIR_TABS.find(t => t.key === activeTab)
      const params: Record<string, string | number | boolean | undefined> = {
        page: p,
        page_size: 50,
      }
      if (search.trim()) params.search = search.trim()
      if (tab?.statusFilter) params.status = tab.statusFilter
      if (subtypeFilter) params.service_subtype = subtypeFilter
      if (operatorFilter) params.operator_id = operatorFilter
      if (dateFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        params.date_from = today.toISOString()
        const end = new Date(today)
        end.setHours(23, 59, 59, 999)
        params.date_to = end.toISOString()
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        params.date_from = tomorrow.toISOString()
        const end = new Date(tomorrow)
        end.setHours(23, 59, 59, 999)
        params.date_to = end.toISOString()
      }
      if (flaggedFilter === 'yes') params.flagged = true
      if (flaggedFilter === 'no') params.flagged = false

      const res = await airBookingsService.listBookings(params)
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
  }, [activeTab, search, subtypeFilter, operatorFilter, dateFilter, flaggedFilter])

  useEffect(() => {
    loadData(1)
    setSelectedIds([])
  }, [loadData])

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) setSelectedIds([])
    else setSelectedIds(items.map(b => b.id))
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const tabCounts: Record<AirTabKey, number> = {
    all:           total,
    in_air:        stats?.in_air_count ?? 0,
    quote_pending: stats?.quote_pending_count ?? 0,
    manifest_open: stats?.manifest_open_count ?? 0,
    cancelled_7d:  stats?.cancelled_7d_count ?? 0,
    refund_queue:  stats?.refund_queue_count ?? 0,
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

  const grossRevenue = stats?.gross_revenue_minor ?? 0
  const subtitleText = stats
    ? `${total.toLocaleString('en-IN')} bookings · ${tabCounts.in_air} in air · ${fmtMinor(grossRevenue)} gross`
    : undefined

  return (
    <Shell
      activeId="bookings-a"
      breadcrumb="Operations · Bookings"
      title="Air bookings"
      subtitle={subtitleText}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => exportCsv(items)}>
            <Icon name="download" size={13} />Export
          </button>
          <button className="btn sm" onClick={() => console.log('Open ops board — coming soon')}>
            <Icon name="external" size={13} />Open ops board
          </button>
          <button className="btn sm accent" onClick={() => navigate('/bookings/air/new')}>
            <Icon name="plus" size={13} />Assisted booking
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Tab strip */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
          overflowX: 'auto',
        }}>
          {AIR_TABS.map((tab, i) => {
            const isActive = activeTab === tab.key
            const count = tabCounts[tab.key]
            const cols = isMobile ? 3 : 6
            const isLastInRow = (i + 1) % cols === 0 || i === AIR_TABS.length - 1
            const isLastRow = isMobile ? i >= AIR_TABS.length - 3 : true

            return (
              <div
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '16px 18px',
                  borderRight: isLastInRow ? 'none' : '1px solid var(--rule)',
                  borderBottom: isMobile && !isLastRow ? '1px solid var(--rule)' : (isActive ? '2px solid var(--accent)' : '2px solid transparent'),
                  cursor: 'pointer',
                  background: isActive ? 'var(--surface-2)' : 'transparent',
                  minWidth: isMobile ? 0 : 100,
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
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
            <div className="input" style={{ width: isMobile ? '100%' : 280, height: 32 }}>
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
                value={operatorFilter}
                onChange={e => setOperatorFilter(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 12.5 }}
              >
                <option value="">Operator · All</option>
              </select>
            </div>

            <div className="input" style={{ height: 32, width: 160, padding: 0, paddingLeft: 10 }}>
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 12.5 }}
              >
                <option value="">Date · All</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
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

            <div style={{ flex: 1 }} />

            <button className="btn sm ghost">
              <Icon name="filter" size={13} />
              Saved view <Icon name="chevDown" size={11} />
            </button>
          </div>

          {/* Bulk action bar */}
          {selectedIds.length > 0 && (
            <div style={{
              background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))',
              border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
              borderTop: 0,
              borderBottom: 0,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}>
              <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{selectedIds.length} selected</span> · across this page
              </span>
              <span style={{ width: 1, height: 16, background: 'var(--rule-strong)' }} />
              <button className="btn sm ghost" onClick={() => exportCsv(items.filter(b => selectedIds.includes(b.id)))}>
                <Icon name="download" size={12} />Export selection
              </button>
              <button className="btn sm ghost">
                <Icon name="flag" size={12} />Flag
              </button>
              <div style={{ flex: 1 }} />
              <button className="btn sm ghost" style={{ color: 'var(--ink-3)' }} onClick={() => setSelectedIds([])}>
                Clear
              </button>
            </div>
          )}

          {/* Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: selectedIds.length > 0 ? 0 : '1px solid var(--rule)' }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="tbl" style={{ minWidth: isMobile ? 700 : undefined }}>
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.length === items.length && items.length > 0}
                          onChange={toggleSelectAll}
                          style={{ accentColor: 'var(--accent)' }}
                        />
                      </th>
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
                        <td colSpan={isMobile ? 7 : 11} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                          No bookings found.
                        </td>
                      </tr>
                    ) : items.map(b => {
                      const { time, date } = formatEtd(b.etd)
                      return (
                        <tr
                          key={b.id}
                          className={selectedIds.includes(b.id) ? 'selected' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/bookings/air/${b.id}`)}
                        >
                          <td onClick={e => { e.stopPropagation(); toggleSelect(b.id) }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(b.id)}
                              onChange={() => toggleSelect(b.id)}
                              style={{ accentColor: 'var(--accent)' }}
                            />
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>{time}</div>
                            <div className="t-meta" style={{ marginTop: 2 }}>{date}</div>
                          </td>
                          <td>{aStatusBadge(b.status)}</td>
                          <td className="num" style={{ textAlign: 'right', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
                            {fmtMinor(b.fare_final_minor ?? b.fare_estimate_minor)}
                          </td>
                          {!isMobile && (
                            <td className="t-meta" style={{ color: 'var(--ink-2)', fontSize: 12 }}>
                              {b.payment_method ?? '—'}
                            </td>
                          )}
                          <td onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
                            <button
                              className="btn ghost icon sm"
                              onClick={() => setMenuId(menuId === b.id ? null : b.id)}
                            >
                              <Icon name="moreVert" size={14} />
                            </button>
                            {menuId === b.id && (
                              <AirRowMenu
                                booking={b}
                                onClose={() => setMenuId(null)}
                                onView={() => { setMenuId(null); navigate(`/bookings/air/${b.id}`) }}
                                onFlag={async () => {
                                  setMenuId(null)
                                  try {
                                    await airBookingsService.flagBooking(b.id, { flagged: !b.flagged, flag_reason: b.flagged ? null : 'Flagged by admin' })
                                    await loadData(page)
                                  } catch { /* ignore */ }
                                }}
                              />
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer / pagination */}
            {!loading && (
              <div style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
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
            )}
          </div>
        </div>
      </div>
    </Shell>
  )
}
