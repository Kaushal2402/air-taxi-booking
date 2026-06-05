import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { bookingsService } from '../../services/bookingsService'
import type { RoadBookingListItem, BookingStats } from '../../services/bookingsService'
import { useFormatMoney, formatTimeHM, formatDateShort, formatDateTime, isSameDayInTz, getUserTimezone } from '../../lib/utils'
import { usePlatformStore } from '../../store/platformStore'

// Fix leaflet default icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Helpers ───────────────────────────────────────────────────────────────────


function fmtFare(minor: number | null, estimate: number, fmt: (v: number) => string): string {
  return fmt(minor ?? estimate)
}

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

function formatWhen(iso: string, scheduledAt: string | null): string {
  if (scheduledAt) {
    try { return formatDateTime(scheduledAt) } catch { return scheduledAt }
  }
  try {
    const tz = getUserTimezone()
    const now = new Date().toISOString()
    const time = formatTimeHM(iso, tz)
    return isSameDayInTz(iso, now, tz) ? `${time} today` : formatDateShort(iso, tz) + ' · ' + time
  } catch { return iso }
}

function exportCsv(items: RoadBookingListItem[], fmtMinor: (v: number) => string) {
  const headers = ['Ref', 'Customer', 'Service', 'Pickup', 'Drop', 'Driver', 'Status', 'Fare', 'Payment', 'Created']
  const rows = items.map(b => [
    b.booking_ref,
    b.customer_name,
    [b.service_type, b.vehicle_class].filter(Boolean).join(' · '),
    b.pickup_address,
    b.drop_address,
    b.driver_name ?? '—',
    b.status,
    fmtFare(b.fare_final_minor, b.fare_estimate_minor, fmtMinor),
    b.payment_method,
    b.created_at,
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `road-bookings-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Tab strip config ──────────────────────────────────────────────────────────

type TabKey = 'all' | 'live' | 'scheduled' | 'cancelled' | 'disputed' | 'refund'

interface TabConfig {
  key: TabKey
  label: string
  tone?: string
  statusFilter?: string
  todayOnly?: boolean  // when true, also passes today's date_from to the API
}

const TABS: TabConfig[] = [
  { key: 'all',       label: 'All bookings' },
  { key: 'live',      label: 'Live · now',       tone: 'var(--accent)',  statusFilter: 'InProgress,Accepted,Arrived' },
  { key: 'scheduled', label: 'Scheduled',         tone: 'var(--info)',    statusFilter: 'Scheduled' },
  { key: 'cancelled', label: 'Cancelled today',   tone: 'var(--warn)',    statusFilter: 'Cancelled', todayOnly: true },
  { key: 'disputed',  label: 'Disputed',          tone: 'var(--danger)',  statusFilter: 'Disputed' },
  { key: 'refund',    label: 'Refund pending',    tone: 'var(--info)',    statusFilter: 'Refunded' },
]

// ── Fleet Map Modal ───────────────────────────────────────────────────────────

function FleetMapModal({ onClose, onSelect }: { onClose: () => void; onSelect: (id: string) => void }) {
  const [liveItems, setLiveItems] = useState<RoadBookingListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    bookingsService.listBookings({ status: 'InProgress,Accepted,Arrived', page_size: 100 })
      .then(r => setLiveItems(r.items))
      .catch(() => setLiveItems([]))
      .finally(() => setLoading(false))
  }, [])

  const withCoords = liveItems.filter(b => b.pickup_lat && b.pickup_lng)
  const center: [number, number] = withCoords.length > 0
    ? [withCoords[0].pickup_lat!, withCoords[0].pickup_lng!]
    : [12.9716, 77.5946] // Bengaluru default

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(15,13,10,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 4, width: '100%', maxWidth: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Live fleet map</span>
            <span className="t-meta" style={{ marginLeft: 12 }}>{loading ? '…' : `${withCoords.length} bookings with GPS`}</span>
          </div>
          <button className="btn ghost sm" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {loading ? (
            <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading live bookings…</div>
          ) : (
            <MapContainer center={center} zoom={12} style={{ height: 460, width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {withCoords.map(b => (
                <Marker key={b.id} position={[b.pickup_lat!, b.pickup_lng!]}>
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{b.booking_ref}</div>
                      <div style={{ fontSize: 12 }}>{b.customer_name ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{b.pickup_address.split('·')[0].trim()}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>→ {b.drop_address.split('·')[0].trim()}</div>
                      <button
                        style={{ marginTop: 8, fontSize: 11, background: '#0F8A5F', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 3, cursor: 'pointer', width: '100%' }}
                        onClick={() => { onClose(); onSelect(b.id) }}
                      >
                        Open detail →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
              {withCoords.length === 0 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 999, background: 'white', padding: '12px 20px', borderRadius: 4, fontSize: 13, color: '#666' }}>
                  No live bookings with GPS coordinates
                </div>
              )}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Row action menu ───────────────────────────────────────────────────────────

function RowMenu({ booking, onClose, onView, onFlag }: {
  booking: RoadBookingListItem
  onClose: () => void
  onView: () => void
  onFlag: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const canCancel = !['Cancelled', 'Completed', 'Refunded'].includes(booking.status)

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
        canCancel ? { label: 'Cancel booking', icon: 'close', action: () => { onClose(); onView() }, danger: true } : null,
      ].filter(Boolean).map(item => (
        <div
          key={item!.label}
          onClick={() => { item!.action(); onClose() }}
          style={{
            padding: '10px 14px', fontSize: 13, cursor: 'pointer',
            color: item!.danger ? 'var(--danger)' : 'var(--ink)',
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: '1px solid var(--rule-soft)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Icon name={item!.icon} size={13} style={{ color: item!.danger ? 'var(--danger)' : 'var(--ink-3)' }} />
          {item!.label}
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RoadBookingsPage() {
  const fmtMinor = useFormatMoney()
  const toggles = usePlatformStore(s => s.toggles)
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  useIsTablet() // ensure responsive hooks are registered

  const [items, setItems] = useState<RoadBookingListItem[]>([])
  const [stats, setStats] = useState<BookingStats | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [search, setSearch] = useState('')
  const [statusFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [flaggedFilter, setFlaggedFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [menuId, setMenuId] = useState<string | null>(null)
  const [showMapModal, setShowMapModal] = useState(false)

  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadData = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const tab = TABS.find(t => t.key === activeTab)
      const params: Record<string, string | number | boolean | undefined> = {
        page: p,
        page_size: 50,
      }
      if (search.trim()) params.search = search.trim()
      if (tab?.statusFilter) params.status = tab.statusFilter
      else if (statusFilter) params.status = statusFilter
      if (tab?.todayOnly) {
        // Filter to today only (midnight UTC)
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        params.date_from = todayStart.toISOString()
      }
      if (serviceFilter) params.service_type = serviceFilter
      if (paymentFilter) params.payment_method = paymentFilter
      if (flaggedFilter === 'yes') params.flagged = true
      if (flaggedFilter === 'no') params.flagged = false

      const res = await bookingsService.listBookings(params)
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
  }, [activeTab, search, statusFilter, serviceFilter, paymentFilter, flaggedFilter])

  useEffect(() => {
    loadData(1)
    setSelectedIds([])
  }, [loadData])

  // Auto-refresh every 30s for live tab
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    if (activeTab === 'live') {
      autoRefreshRef.current = setInterval(() => loadData(page), 30000)
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    }
  }, [activeTab, page, loadData])

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(items.map(b => b.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const tabCounts: Record<TabKey, number> = {
    all:       total,
    live:      stats?.live_count ?? 0,
    scheduled: stats?.scheduled_count ?? 0,
    cancelled: stats?.cancelled_today ?? 0,
    disputed:  stats?.disputed_count ?? 0,
    refund:    stats?.refund_pending_count ?? 0,
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

  return (
    <Shell
      activeId="bookings-r"
      breadcrumb="Operations · Bookings"
      title="Road bookings"
      subtitle={stats ? `${total.toLocaleString('en-IN')} today · ${fmtMinor(stats.gross_revenue_minor)} gross` : undefined}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => exportCsv(items)}>
            <Icon name="download" size={13} />Export
          </button>
          <button className="btn sm" onClick={() => setShowMapModal(true)}>
            <Icon name="map" size={13} />Fleet map
          </button>
          <button className="btn sm accent" onClick={() => navigate('/bookings/road/new')}>
            <Icon name="plus" size={13} />Assisted booking
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Status strip */}
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
                  borderBottom: isMobile && !isLastRow ? '1px solid var(--rule)' : (isActive ? '2px solid var(--accent)' : '2px solid transparent'),
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
            <div className="input" style={{ width: isMobile ? '100%' : 260, height: 32 }}>
              <Icon name="search" size={14} className="icon" />
              <input
                placeholder="Ref, customer, driver, plate…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="input" style={{ height: 32, width: 150, padding: 0, paddingLeft: 10 }}>
              <select
                value={serviceFilter}
                onChange={e => setServiceFilter(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 12.5 }}
              >
                <option value="">Service · All</option>
                <option value="cab">Cab</option>
                <option value="bike">Bike</option>
                <option value="rental">Rental</option>
                <option value="outstation">Outstation</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            <div className="input" style={{ height: 32, width: 150, padding: 0, paddingLeft: 10 }}>
              <select
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 12.5 }}
              >
                <option value="">Payment · All</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                {toggles.cash_payments && <option value="cash">Cash</option>}
                <option value="wallet">Wallet</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>

            <div className="input" style={{ height: 32, width: 130, padding: 0, paddingLeft: 10 }}>
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
              <button className="btn sm ghost" onClick={() => exportCsv(items.filter(b => selectedIds.includes(b.id)), fmtMinor)}>
                <Icon name="download" size={12} />Export selection
              </button>
              <button className="btn sm ghost">
                <Icon name="envelope" size={12} />Message customers
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
                      <th>Route</th>
                      {!isMobile && <th>Driver</th>}
                      <th>When</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Fare</th>
                      {!isMobile && <th>Payment</th>}
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={isMobile ? 7 : 10} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                          No bookings found.
                        </td>
                      </tr>
                    ) : items.map(b => (
                      <tr
                        key={b.id}
                        className={selectedIds.includes(b.id) ? 'selected' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/bookings/road/${b.id}`)}
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
                            <div className="t-meta" style={{ marginTop: 2 }}>
                              {[b.service_type, b.vehicle_class].filter(Boolean).join(' · ')}
                            </div>
                          </td>
                        )}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                            <span style={{ color: 'var(--ink)' }}>{b.pickup_address.split(' · ')[0]}</span>
                            <Icon name="arrowRight" size={11} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                            <span style={{ color: 'var(--ink-2)' }}>{b.drop_address.split(' · ')[0]}</span>
                          </div>
                        </td>
                        {!isMobile && (
                          <td style={{
                            fontSize: 13,
                            color: !b.driver_name ? 'var(--ink-4)' : 'var(--ink-2)',
                          }}>
                            {b.driver_name ?? '—'}
                          </td>
                        )}
                        <td className="num" style={{ color: 'var(--ink-2)', fontSize: 12.5 }}>
                          {formatWhen(b.created_at, b.scheduled_at)}
                        </td>
                        <td>{bStatusBadge(b.status)}</td>
                        <td className="num" style={{ textAlign: 'right', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
                          {fmtFare(b.fare_final_minor, b.fare_estimate_minor, fmtMinor)}
                        </td>
                        {!isMobile && (
                          <td className="t-meta" style={{ color: 'var(--ink-2)', fontSize: 12 }}>
                            {b.payment_method}
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
                            <RowMenu
                              booking={b}
                              onClose={() => setMenuId(null)}
                              onView={() => { setMenuId(null); navigate(`/bookings/road/${b.id}`) }}
                              onFlag={async () => {
                                setMenuId(null)
                                try {
                                  await bookingsService.flagBooking(b.id, { flagged: !b.flagged, flag_reason: b.flagged ? null : 'Flagged by admin' })
                                  await loadData(page)
                                } catch { /* ignore */ }
                              }}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && pages > 1 && (
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
                    {(page - 1) * 50 + 1}–{Math.min(page * 50, total)}
                  </span>{' '}
                  of{' '}
                  <span style={{ color: 'var(--ink-2)' }}>{total.toLocaleString('en-IN')}</span>
                  {selectedIds.length > 0 && ` · ${selectedIds.length} selected`}
                </div>
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
              </div>
            )}
          </div>
        </div>
      </div>

      {showMapModal && (
        <FleetMapModal
          onClose={() => setShowMapModal(false)}
          onSelect={id => navigate(`/bookings/road/${id}`)}
        />
      )}
    </Shell>
  )
}
