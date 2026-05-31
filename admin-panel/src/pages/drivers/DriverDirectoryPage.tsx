import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { driverService } from '../../services/driverService'
import type { Driver, DriverStatus, KycStatus } from '../../services/driverService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function DriverStatusBadge({ status }: { status: DriverStatus }) {
  if (status === 'active')      return <span className="badge ok"><span className="dot ok" />Active</span>
  if (status === 'in_review')   return <span className="badge warn"><span className="dot warn" />Review</span>
  if (status === 'suspended')   return <span className="badge danger"><span className="dot danger" />Suspended</span>
  if (status === 'pending')     return <span className="badge info"><span className="dot info" />Pending</span>
  if (status === 'rejected')    return <span className="badge danger"><span className="dot danger" />Rejected</span>
  if (status === 'deactivated') return <span className="badge"><span className="dot pending" />Deactivated</span>
  if (status === 'approved')    return <span className="badge ok"><span className="dot ok" />Approved</span>
  return <span className="badge">{status}</span>
}

function KycBadge({ status }: { status: KycStatus }) {
  if (status === 'approved') return <span className="badge ok"><span className="dot ok" />OK</span>
  if (status === 'expiring') return <span className="badge warn"><span className="dot warn" />Expiring</span>
  if (status === 'rejected') return <span className="badge danger"><span className="dot danger" />Rejected</span>
  return <span className="badge">{status}</span>
}

// ── Row action menu ───────────────────────────────────────────────────────────

interface RowMenuProps {
  driver: Driver
  onSuspend: (d: Driver) => void
  onReactivate: (d: Driver) => void
  onForceOffline: (d: Driver) => void
}

function RowMenu({ driver, onSuspend, onReactivate, onForceOffline }: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn ghost icon sm"
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
      >
        <Icon name="moreVert" size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--rule-strong)',
          boxShadow: 'var(--shadow-pop)', minWidth: 160, padding: '4px 0',
        }}>
          {driver.online_status === 'online' && (
            <button
              className="btn ghost"
              style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5, borderRadius: 0, justifyContent: 'flex-start' }}
              onClick={e => { e.stopPropagation(); setOpen(false); onForceOffline(driver) }}
            >
              Force offline
            </button>
          )}
          {(driver.status === 'active' || driver.status === 'in_review') && (
            <button
              className="btn ghost"
              style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5, borderRadius: 0, justifyContent: 'flex-start', color: 'var(--danger)' }}
              onClick={e => { e.stopPropagation(); setOpen(false); onSuspend(driver) }}
            >
              Suspend
            </button>
          )}
          {driver.status === 'suspended' && (
            <button
              className="btn ghost"
              style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5, borderRadius: 0, justifyContent: 'flex-start', color: 'var(--accent)' }}
              onClick={e => { e.stopPropagation(); setOpen(false); onReactivate(driver) }}
            >
              Reactivate
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Mobile card view ──────────────────────────────────────────────────────────

function DriverCard({ driver, onClick }: { driver: Driver; onClick: () => void }) {
  return (
    <div
      style={{
        padding: '14px 16px', borderBottom: '1px solid var(--rule-soft)',
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <div className="avatar" style={driver.status === 'active' ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}>
        {getInitials(driver.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{driver.name}</span>
          {driver.flag_reason && <Icon name="flag" size={11} stroke={1.6} style={{ color: 'var(--warn)' }} />}
        </div>
        <div className="t-meta" style={{ marginTop: 2 }}>{driver.driver_code} · {driver.phone}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
          <DriverStatusBadge status={driver.status} />
          {driver.rating != null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: driver.rating >= 4.7 ? 'var(--accent)' : driver.rating >= 4.5 ? 'var(--ink-2)' : 'var(--warn)' }}>
              {driver.rating.toFixed(2)} ★
            </span>
          )}
          <span className="t-meta">{driver.trips_count.toLocaleString()} trips</span>
        </div>
      </div>
      <Icon name="chevRight" size={14} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type TabKey = 'all' | 'online' | 'review' | 'suspended' | 'docs_expiring' | 'top_performers'

interface SuspendPending { driver: Driver }

function SuspendModal({ driver, onConfirm, onCancel }: { driver: Driver; onConfirm: (r: string) => void; onCancel: () => void }) {
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
        <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Suspend {driver.name}</h3>
        <div className="input">
          <input
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for suspension…"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button className="btn sm danger" onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={!reason.trim()}>Suspend</button>
        </div>
      </div>
    </div>
  )
}

export default function DriverDirectoryPage() {
  const navigate = useNavigate()
  const isMobile  = useIsMobile()
  const isTablet  = useIsTablet()

  const [drivers, setDrivers]           = useState<Driver[]>([])
  const [total, setTotal]               = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading]           = useState(true)
  const [apiError, setApiError]         = useState('')

  const [activeTab, setActiveTab]     = useState<TabKey>('all')
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [kycFilter, setKycFilter]     = useState('')
  const [page, setPage]               = useState(1)

  const [suspendPending, setSuspendPending] = useState<SuspendPending | null>(null)
  const [sortField, setSortField]   = useState<'trips' | 'rating' | 'acceptance' | 'cancellation' | 'name'>('trips')
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  const loadDrivers = async (opts?: { tab?: TabKey; q?: string; status?: string; kyc?: string; p?: number }) => {
    setLoading(true)
    try {
      const tab    = opts?.tab    ?? activeTab
      const q      = opts?.q      ?? search
      const status = opts?.status ?? statusFilter
      const kyc    = opts?.kyc    ?? kycFilter
      const pg     = opts?.p      ?? page

      const params: Record<string, string | number | boolean> = { page: pg, per_page: 25 }
      if (q)      params.search = q
      if (status) params.status = status
      if (kyc)    params.kyc_status = kyc

      // Tab-based filters
      if (tab === 'online')          params.online_status = 'online'
      if (tab === 'review')          params.status = 'in_review'
      if (tab === 'suspended')       params.status = 'suspended'
      if (tab === 'docs_expiring')   params.kyc_status = 'expiring'
      if (tab === 'top_performers')  params.min_rating = 4.8

      const data = await driverService.listDrivers(params)
      setDrivers(data.items)
      setTotal(data.total)
      setStatusCounts(data.status_counts)
      setApiError('')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to load drivers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDrivers() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => loadDrivers({ q: search, p: 1 }), 350)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showSortMenu) return
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSortMenu])

  const handleTab = (tab: TabKey) => {
    setActiveTab(tab)
    setPage(1)
    loadDrivers({ tab, p: 1 })
  }

  const handleSuspend = async (reason: string) => {
    if (!suspendPending) return
    try {
      await driverService.suspendDriver(suspendPending.driver.id, reason)
      await loadDrivers()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to suspend driver')
    }
    setSuspendPending(null)
  }

  const handleReactivate = async (driver: Driver) => {
    try {
      await driverService.reactivateDriver(driver.id)
      await loadDrivers()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to reactivate driver')
    }
  }

  const handleForceOffline = async (driver: Driver) => {
    try {
      await driverService.forceOffline(driver.id)
      await loadDrivers()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to force offline')
    }
  }

  const handleExport = () => {
    const headers = ['Driver Code', 'Name', 'Phone', 'City', 'Zone', 'Vehicle Class', 'Vehicle Plate', 'Online', 'Trips', 'Rating', 'Acceptance %', 'Cancellation %', 'KYC', 'Status']
    const rows = drivers.map(d => [
      d.driver_code ?? '',
      d.name,
      d.phone,
      d.city ?? '',
      d.zone_code ?? '',
      d.vehicle_class ?? '',
      d.vehicle_plate ?? '',
      d.online_status,
      d.trips_count,
      d.rating?.toFixed(2) ?? '',
      d.acceptance_rate?.toFixed(1) ?? '',
      d.cancellation_rate.toFixed(1),
      d.kyc_status,
      d.status,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `drivers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const DRIVER_SORT_OPTIONS: { key: 'trips' | 'rating' | 'acceptance' | 'cancellation' | 'name'; label: string }[] = [
    { key: 'trips',        label: 'Trips' },
    { key: 'rating',       label: 'Rating' },
    { key: 'acceptance',   label: 'Acceptance' },
    { key: 'cancellation', label: 'Cancellation' },
    { key: 'name',         label: 'Name' },
  ]

  const sortedDrivers = [...drivers].sort((a, b) => {
    let cmp = 0
    if (sortField === 'name')              cmp = a.name.localeCompare(b.name)
    else if (sortField === 'trips')        cmp = a.trips_count - b.trips_count
    else if (sortField === 'rating')       cmp = (a.rating ?? 0) - (b.rating ?? 0)
    else if (sortField === 'acceptance')   cmp = (a.acceptance_rate ?? 0) - (b.acceptance_rate ?? 0)
    else if (sortField === 'cancellation') cmp = a.cancellation_rate - b.cancellation_rate
    return sortDir === 'desc' ? -cmp : cmp
  })

  const TABS: { key: TabKey; label: string; tone?: string }[] = [
    { key: 'all',           label: 'All' },
    { key: 'online',        label: 'Online',        tone: 'var(--accent)' },
    { key: 'review',        label: 'Review queue',  tone: 'var(--warn)' },
    { key: 'suspended',     label: 'Suspended',     tone: 'var(--danger)' },
    { key: 'docs_expiring', label: 'Docs expiring', tone: 'var(--warn)' },
    { key: 'top_performers',label: 'Top performers',tone: 'var(--accent)' },
  ]

  const countFor = (key: TabKey): number => {
    if (key === 'all')           return statusCounts['all'] ?? total
    if (key === 'online')        return statusCounts['online'] ?? 0
    if (key === 'review')        return statusCounts['in_review'] ?? 0
    if (key === 'suspended')     return statusCounts['suspended'] ?? 0
    if (key === 'docs_expiring') return statusCounts['docs_expiring'] ?? 0
    return 0
  }

  const allCount    = statusCounts['all'] ?? total
  const onlineCount = statusCounts['online'] ?? 0
  const reviewCount = statusCounts['in_review'] ?? 0
  const suspCount   = statusCounts['suspended'] ?? 0

  return (
    <Shell
      activeId="drivers"
      breadcrumb="People & Fleet · Drivers"
      title="Driver directory"
      subtitle={`${allCount.toLocaleString()} approved · ${onlineCount.toLocaleString()} online · ${reviewCount} in review · ${suspCount} suspended`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={handleExport}><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Bulk message</button>
          <button className="btn sm accent" onClick={() => navigate('/drivers/onboarding')}>
            <Icon name="plus" size={13} />Onboard driver
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* API error */}
        {apiError && (
          <div style={{
            padding: '10px 14px', background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span>{apiError}</span>
            <button className="btn ghost icon sm" onClick={() => setApiError('')}><Icon name="x" size={12} /></button>
          </div>
        )}

        {/* Segmented tabs */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : isTablet ? 'repeat(4, 1fr)' : 'repeat(6, 1fr)',
        }}>
          {TABS.map((v, i) => {
            const active = activeTab === v.key
            return (
              <div
                key={v.key}
                onClick={() => handleTab(v.key)}
                style={{
                  padding: isMobile ? '12px 10px' : '14px 18px',
                  borderRight: isMobile ? (i % 3 !== 2 ? '1px solid var(--rule)' : 'none') : (i < 5 ? '1px solid var(--rule)' : 'none'),
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  borderTop: isMobile && i >= 3 ? '1px solid var(--rule)' : 'none',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5, color: active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: active ? 500 : 400 }}>{v.label}</span>
                  {v.tone && !active && <span className="dot" style={{ background: v.tone }} />}
                </div>
                <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 18 : 22, fontWeight: 400, letterSpacing: '-0.018em' }}>
                  {countFor(v.key).toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Filter bar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0,
          padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <div className="input" style={{ width: isMobile ? '100%' : 280, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input
              placeholder="Name, phone, plate, driver ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {!isMobile && (
            <>
              <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10, minWidth: 120 }}>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); loadDrivers({ status: e.target.value, p: 1 }) }}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="in_review">In review</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10, minWidth: 100 }}>
                <select
                  value={kycFilter}
                  onChange={e => { setKycFilter(e.target.value); loadDrivers({ kyc: e.target.value, p: 1 }) }}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                >
                  <option value="">All KYC</option>
                  <option value="approved">Approved</option>
                  <option value="expiring">Expiring</option>
                  <option value="rejected">Rejected</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </>
          )}
          <div style={{ flex: 1 }} />
          <div ref={sortRef} style={{ position: 'relative' }}>
            <button
              className="btn sm ghost"
              onClick={() => setShowSortMenu(v => !v)}
            >
              Sort · {DRIVER_SORT_OPTIONS.find(o => o.key === sortField)?.label} {sortDir === 'desc' ? '↓' : '↑'}
            </button>
            {showSortMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 200,
                background: 'var(--surface)', border: '1px solid var(--rule-strong)',
                boxShadow: 'var(--shadow-pop)', minWidth: 170, padding: '4px 0',
              }}>
                {DRIVER_SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className="btn ghost"
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5,
                      borderRadius: 0, justifyContent: 'space-between',
                      color: sortField === opt.key ? 'var(--accent)' : undefined,
                    }}
                    onClick={() => {
                      if (sortField === opt.key) {
                        setSortDir(d => d === 'desc' ? 'asc' : 'desc')
                      } else {
                        setSortField(opt.key)
                        setSortDir('desc')
                      }
                      setShowSortMenu(false)
                    }}
                  >
                    <span>{opt.label}</span>
                    {sortField === opt.key && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          {loading && <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>}

          {/* Mobile card view */}
          {!loading && isMobile && (
            <div>
              {drivers.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  {search || statusFilter ? 'No drivers match your filter.' : 'No drivers yet.'}
                </div>
              ) : sortedDrivers.map(d => (
                <DriverCard key={d.id} driver={d} onClick={() => navigate(`/drivers/${d.id}`)} />
              ))}
            </div>
          )}

          {/* Desktop table */}
          {!loading && !isMobile && (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}><input type="checkbox" /></th>
                    <th>Driver</th>
                    <th>Vehicle</th>
                    <th>Zone</th>
                    <th>Online</th>
                    <th>Trips</th>
                    <th>Rating</th>
                    <th>Accept</th>
                    <th>Cancel</th>
                    <th>KYC</th>
                    <th>Status</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {drivers.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                        {search || statusFilter ? 'No drivers match your filter.' : 'No drivers yet.'}
                      </td>
                    </tr>
                  ) : sortedDrivers.map((d, i) => (
                    <tr
                      key={d.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/drivers/${d.id}`)}
                    >
                      <td onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            className="avatar"
                            style={i === 0 ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
                          >
                            {getInitials(d.name)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{d.name}</span>
                              {d.flag_reason && (
                                <span title={d.flag_reason}>
                                  <Icon name="flag" size={11} stroke={1.6} style={{ color: 'var(--warn)' }} />
                                </span>
                              )}
                            </div>
                            <div className="t-meta" style={{ marginTop: 2 }}>{d.driver_code} · {d.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="t-meta" style={{ color: 'var(--ink-2)' }}>
                        {[d.vehicle_plate, d.vehicle_class].filter(Boolean).join(' · ')}
                      </td>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>
                        {[d.city, d.zone_code].filter(Boolean).join(' · ')}
                      </td>
                      <td>
                        {d.online_status === 'online'
                          ? <span className="badge ok"><span className="dot ok" />Online</span>
                          : <span className="t-meta">Offline</span>
                        }
                      </td>
                      <td className="num">{d.trips_count.toLocaleString()}</td>
                      <td>
                        {d.rating != null ? (
                          <>
                            <span style={{ fontFamily: 'var(--font-mono)', color: d.rating >= 4.7 ? 'var(--accent)' : d.rating >= 4.5 ? 'var(--ink-2)' : 'var(--warn)' }}>
                              {d.rating.toFixed(2)}
                            </span>
                            <span style={{ color: 'var(--ink-4)', marginLeft: 3 }}>★</span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--ink-4)' }}>—</span>
                        )}
                      </td>
                      <td className="num">
                        {d.acceptance_rate != null ? `${d.acceptance_rate.toFixed(0)}%` : '—'}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', color: d.cancellation_rate >= 5 ? 'var(--warn)' : 'var(--ink-2)' }}>
                          {d.cancellation_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td><KycBadge status={d.kyc_status} /></td>
                      <td><DriverStatusBadge status={d.status} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        <RowMenu
                          driver={d}
                          onSuspend={drv => setSuspendPending({ driver: drv })}
                          onReactivate={handleReactivate}
                          onForceOffline={handleForceOffline}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && total > 25 && (
            <div style={{
              padding: '12px 16px', borderTop: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--surface-2)',
            }}>
              <div className="t-meta">
                Showing <span style={{ color: 'var(--ink-2)' }}>{((page - 1) * 25) + 1}–{Math.min(page * 25, total)}</span> of{' '}
                <span style={{ color: 'var(--ink-2)' }}>{total.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn ghost sm"
                  disabled={page <= 1}
                  onClick={() => { setPage(p => p - 1); loadDrivers({ p: page - 1 }) }}
                >
                  ← Prev
                </button>
                <button
                  className="btn ghost sm"
                  disabled={page >= Math.ceil(total / 25)}
                  onClick={() => { setPage(p => p + 1); loadDrivers({ p: page + 1 }) }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suspend modal */}
      {suspendPending && (
        <SuspendModal
          driver={suspendPending.driver}
          onConfirm={handleSuspend}
          onCancel={() => setSuspendPending(null)}
        />
      )}
    </Shell>
  )
}
