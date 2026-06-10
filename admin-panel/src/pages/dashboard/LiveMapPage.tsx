import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import { CityMap } from './DashboardPage'
import api from '../../lib/axios'
import { useFormatMoney } from '../../lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface KpiStats {
  live_trips_road: number
  live_trips_air: number
  live_trips_total: number
  online_drivers: number
  online_drivers_idle: number
  online_drivers_on_trip: number
  online_drivers_total: number
  today_bookings: number
  today_gbv_minor: number
  today_completed: number
  cancel_rate_pct: number
  pickup_eta_median_sec: number | null
  active_operators: number
  active_operators_total: number
  active_operators_paused: number
  bookings_14d: number[]
  revenue_14d_minor: number[]
}

interface LiveBookingItem {
  id: string
  booking_ref: string
  service: string
  route: string
  status: string
  fare_minor: number
  kind: 'road' | 'air'
  driver_name?: string | null
  driver_rating?: number | null
  vehicle_info?: string | null
}

interface AlertItem {
  severity: 'danger' | 'warn' | 'info'
  title: string
  message: string
  module: string
}

interface DashboardData {
  kpi: KpiStats
  live_bookings: LiveBookingItem[]
  alerts: AlertItem[]
}

// ── Static data (TODO: wire to live APIs) ─────────────────────────────────────

// TODO: wire to pricing/surge engine (Module 13)
const DEMAND_SUPPLY: [string, number][] = [
  ['Indiranagar', 1.0],
  ['HSR Layout', 1.6],
  ['Whitefield', 1.1],
  ['Koramangala', 1.3],
  ['Bommanahalli', 0.9],
]

// ── FilterChip ────────────────────────────────────────────────────────────────

function FilterChip({ label, active, count, onClick }: {
  label: string; active?: boolean; count?: number; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 3,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--rule)'}`,
        background: active ? 'color-mix(in oklab, var(--accent) 10%, var(--surface))' : 'var(--surface)',
        color: active ? 'var(--accent)' : 'var(--ink-2)',
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          background: active ? 'var(--accent)' : 'var(--rule-strong)',
          color: active ? 'var(--surface)' : 'var(--ink-3)',
          borderRadius: 2, padding: '1px 5px', fontSize: 10,
        }}>{count}</span>
      )}
    </button>
  )
}

// ── Demand/Supply bar ─────────────────────────────────────────────────────────

function DemandBar({ zone, ratio }: { zone: string; ratio: number }) {
  const color = ratio >= 1.5 ? 'var(--danger)' : ratio >= 1.2 ? 'var(--warn)' : 'var(--accent)'
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{zone}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color }}>{ratio.toFixed(1)}×</span>
      </div>
      <div style={{ height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(ratio / 2, 1) * 100}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LiveMapPage() {
  const fmtMinor = useFormatMoney()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [data, setData] = useState<DashboardData | null>(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchVal, setSearchVal] = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    api.get<DashboardData>('/dashboard', { params: { window: 'today' } })
      .then(r => setData(r.data))
      .catch(() => {})
  }, [])

  const kpi = data?.kpi
  const alerts = data?.alerts ?? []
  const liveBookings = data?.live_bookings ?? []

  // Driver counts — real data from Driver.online_status (Module 07 DB field)
  const totalOnline = kpi?.online_drivers ?? 0
  const totalDrivers = kpi?.online_drivers_total ?? 0
  const onTripCount = kpi?.online_drivers_on_trip ?? 0
  const idleCount = kpi?.online_drivers_idle ?? 0
  const pickupCount = Math.max(0, totalOnline - onTripCount - idleCount)
  const airFlyingCount = kpi?.live_trips_air ?? 0
  const airGroundCount = 0 // TODO: wire to air ground status from Module 10 (Aircraft)

  const driversHeader = `${totalOnline.toLocaleString('en-IN')} / ${totalDrivers.toLocaleString('en-IN')}`

  const selectedTrip = liveBookings[0] ?? null

  const handleCancel = async () => {
    if (!selectedTrip || selectedTrip.kind !== 'road') return
    if (!window.confirm(`Cancel booking ${selectedTrip.booking_ref}?`)) return
    setCancelling(true)
    try {
      await api.post(`/bookings/road/${selectedTrip.id}/cancel`, { reason: 'Admin cancelled from live map' })
      const r = await api.get<DashboardData>('/dashboard', { params: { window: 'today' } })
      setData(r.data)
    } catch {
      alert('Cancel failed — please try from the bookings page.')
    } finally {
      setCancelling(false)
    }
  }

  if (isMobile) {
    // Mobile: map + scrollable summary below
    return (
      <Shell
        activeId="dashboard"
        breadcrumb="Operations · Live · Full map"
        title="Live operations · map"
        subtitle="Live · streaming"
        actions={
          <button className="btn sm ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Map */}
          <div style={{ height: 300, overflow: 'hidden' }}>
            <CityMap
              showLegend
              height={300}
              onlineCount={idleCount}
              onTripCount={onTripCount}
              pickupCount={pickupCount}
              airCount={airFlyingCount}
            />
          </div>

          {/* Summary */}
          <div style={{ padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Driver counts */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: 16 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em' }}>
                {driversHeader}
              </div>
              <div className="t-meta">Online drivers</div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'On trip', val: onTripCount, color: 'var(--accent)' },
                  { label: 'Idle', val: idleCount, color: 'var(--ink-3)' },
                  { label: 'Pickup', val: pickupCount, color: 'var(--warn)' },
                  { label: 'Air flying', val: airFlyingCount, color: 'var(--info)' },
                  { label: 'Air ground', val: airGroundCount, color: 'var(--ink-3)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--ink-2)' }}>{row.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: row.color }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Demand vs supply */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: 16 }}>
              <div className="t-label" style={{ marginBottom: 10 }}>Demand vs supply</div>
              {DEMAND_SUPPLY.map(([zone, ratio]) => (
                <DemandBar key={zone} zone={zone} ratio={ratio} />
              ))}
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  // Desktop: full-screen map with floating panels
  return (
    <Shell
      activeId="dashboard"
      breadcrumb="Operations · Live · Full map"
      title="Live operations · map"
      subtitle="Bengaluru · streaming"
      actions={
        <button className="btn sm ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      }
    >
      <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>

        {/* Full-bleed map */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <CityMap
            showLegend={false}
            height={undefined}
            onlineCount={idleCount}
            onTripCount={onTripCount}
            pickupCount={pickupCount}
            airCount={airFlyingCount}
          />
        </div>

        {/* Top filter bar */}
        <div style={{
          position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10,
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        }}>
          {[
            { id: 'all', label: 'All drivers', count: totalOnline },
            { id: 'on-trip', label: 'On trip', count: onTripCount },
            { id: 'idle', label: 'Idle', count: idleCount },
            { id: 'pickup', label: 'Pickup', count: pickupCount },
            { id: 'air', label: 'Air', count: airFlyingCount },
          ].map(f => (
            <FilterChip
              key={f.id}
              label={f.label}
              count={f.count}
              active={activeFilter === f.id}
              onClick={() => setActiveFilter(f.id)}
            />
          ))}
          <input
            className="input"
            placeholder="Search driver, trip, zone…"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            style={{ height: 32, width: 220, fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
        </div>

        {/* Left stats panel */}
        <div style={{
          position: 'absolute', left: 16, top: 84, bottom: 16, width: 280, zIndex: 10,
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Driver count header */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--rule)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.02em' }}>
              {driversHeader}
            </div>
            <div className="t-meta">Online drivers</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Status breakdown */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Status</div>
              {[
                { label: 'On trip', val: onTripCount, color: 'var(--accent)' },
                { label: 'Idle', val: idleCount, color: 'var(--ink-3)' },
                { label: 'Pickup', val: pickupCount, color: 'var(--warn)' },
                { label: 'Air flying', val: airFlyingCount, color: 'var(--info)' },
                { label: 'Air ground', val: airGroundCount, color: 'var(--ink-3)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: row.color, display: 'inline-block', flexShrink: 0 }} />
                    {row.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: row.color }}>{row.val}</span>
                </div>
              ))}
            </div>

            {/* Demand vs supply — TODO: wire to pricing/surge engine (Module 13) */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label" style={{ marginBottom: 10 }}>Demand vs supply</div>
              {DEMAND_SUPPLY.map(([zone, ratio]) => (
                <DemandBar key={zone} zone={zone} ratio={ratio} />
              ))}
            </div>

            {/* Recent exceptions */}
            <div style={{ padding: '12px 16px' }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Recent exceptions</div>
              {alerts.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0' }}>No alerts</div>
              ) : alerts.slice(0, 3).map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <span className={`dot ${a.severity}`} style={{ marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{a.module}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right trip detail panel */}
        <div style={{
          position: 'absolute', right: 16, top: 84, width: 320, zIndex: 10,
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'flex', flexDirection: 'column',
        }}>
          {selectedTrip == null ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              <div style={{ fontSize: 22, marginBottom: 10, opacity: 0.3 }}>✈</div>
              No live trips right now
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)' }}>
                <div className="t-label">Live trip · {selectedTrip.booking_ref}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 400, marginTop: 3 }}>{selectedTrip.service}</div>
              </div>

              {/* Route visual */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedTrip.route.split(' → ').map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: i === 0 ? 'var(--accent)' : 'var(--danger)',
                        border: '2px solid var(--surface)', boxShadow: '0 0 0 1px var(--rule)',
                        flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--ink)' }}>{pt}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{i === 0 ? 'Pickup' : 'Drop'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Driver */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-sunk)',
                  border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--ink-3)', flexShrink: 0,
                }}>
                  {selectedTrip.driver_name ? selectedTrip.driver_name[0].toUpperCase() : '—'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {selectedTrip.driver_name ?? 'No driver assigned'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                    {[
                      selectedTrip.driver_rating != null ? `${selectedTrip.driver_rating.toFixed(2)} ★` : null,
                      selectedTrip.vehicle_info,
                    ].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
              </div>

              {/* Metrics grid */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Estimate', val: fmtMinor(selectedTrip.fare_minor) },
                    { label: 'Distance', val: '—' },
                    { label: 'Duration', val: '—' },
                    { label: 'Surge', val: '—' },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="t-label" style={{ padding: 0, marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '12px 16px', display: 'flex', gap: 6 }}>
                <button className="btn sm" style={{ flex: 1 }} onClick={() => navigate('/dispatch/console')}>
                  Reassign
                </button>
                <button className="btn sm ghost" style={{ flex: 1 }} onClick={() => navigate(`/bookings/${selectedTrip.kind}/${selectedTrip.id}`)}>
                  View
                </button>
                <button
                  className="btn sm ghost"
                  style={{ flex: 1, color: 'var(--danger)' }}
                  disabled={cancelling || selectedTrip.kind !== 'road'}
                  onClick={handleCancel}
                >
                  {cancelling ? '…' : 'Cancel'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Bottom legend bar */}
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
          background: 'var(--surface)', border: '1px solid var(--rule)',
          padding: '8px 18px', display: 'flex', gap: 20, alignItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 11,
        }}>
          {[
            { color: 'var(--accent)', label: 'On trip' },
            { color: 'var(--ink-3)', label: 'Idle' },
            { color: 'var(--warn)', label: 'Pickup' },
            { color: 'var(--info)', label: 'Air' },
          ].map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ink-2)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </Shell>
  )
}
