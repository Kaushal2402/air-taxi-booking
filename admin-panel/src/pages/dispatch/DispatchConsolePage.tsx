import { useState, useEffect, useCallback } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Shell from '../../components/layout/Shell'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { dispatchService } from '../../services/dispatchService'
import type { QueueItem, QueueStats, EligibleDriversResponse, SlaMonitorResponse } from '../../services/dispatchService'
import { settingsService } from '../../services/settingsService'

// Fix Leaflet default icon paths when bundled with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const pickupIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const driverIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#0F8A5F;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
  </div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
})

// Fly map to coords when selection changes
function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.flyTo([lat, lng], 13, { duration: 1 }) }, [lat, lng, map])
  return null
}

const ACCENT = '#0F8A5F'

function fmtSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function fmtEta(s: number): string {
  const m = Math.round(s / 60)
  return `${m} min`
}

function initials(name: string | null | undefined): string {
  if (isForbidden) return <AccessDeniedPage message={`You don't have permission to access this page.`} />

  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function slaColor(status: 'ok' | 'warn' | 'danger' | string): string {
  if (status === 'danger') return 'var(--danger, #d32f2f)'
  if (status === 'warn') return 'var(--warn, #e65100)'
  return ACCENT
}

/** Compute sla_status from age against a limit (in seconds), warning at 75% */
function computeSlaStatus(ageSec: number, limitSec: number): 'ok' | 'warn' | 'danger' {
  if (ageSec >= limitSec) return 'danger'
  if (ageSec >= limitSec * 0.75) return 'warn'
  return 'ok'
}

export default function DispatchConsolePage() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const navigate = useNavigate()

  const [queue, setQueue] = useState<QueueItem[]>([])
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)
  const [eligibleData, setEligibleData] = useState<EligibleDriversResponse | null>(null)
  const [loadingEligible, setLoadingEligible] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [expandingRadius, setExpandingRadius] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isForbidden, setIsForbidden] = useState(false)
  const [radiusStepKm, setRadiusStepKm] = useState(1.0)
  const [radiusMaxKm, setRadiusMaxKm] = useState(10.0)

  // SLA monitor (pickup + overrun)
  const [slaMonitor, setSlaMonitor] = useState<SlaMonitorResponse | null>(null)

  // Mobile state: 'queue' | 'drivers'
  const [mobilePanel, setMobilePanel] = useState<'queue' | 'drivers'>('queue')

  // Filter state
  const [slaFilter, setSlaFilter] = useState<string>('all')
  const canManualAssign = usePermission('dispatch.manual_assign')
  const [zoneFilter] = useState<string>('')

  const loadQueue = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (slaFilter !== 'all') params.sla_filter = slaFilter
      if (zoneFilter) params.zone_id = zoneFilter
      const [q, s, sla] = await Promise.all([
        dispatchService.getQueue(params),
        dispatchService.getQueueStats(),
        dispatchService.getSlaMonitor(),
      ])
      setQueue(q)
      setStats(s)
      setSlaMonitor(sla)
    } catch {
      // silently fail on refresh
    }
  }, [slaFilter, zoneFilter])

  const loadEligibleDrivers = useCallback(async (bookingId: string) => {
    setLoadingEligible(true)
    setEligibleData(null)
    try {
      const data = await dispatchService.getEligibleDrivers(bookingId)
      setEligibleData(data)
    } catch {
      setEligibleData(null)
    } finally {
      setLoadingEligible(false)
    }
  }, [])

  // Initial load — queue + radius settings
  useEffect(() => {
    loadQueue()
    settingsService.getSettings().then(s => {
      if (s.dispatch_radius_step_m != null) setRadiusStepKm(s.dispatch_radius_step_m / 1000)
      if (s.dispatch_max_radius_m != null) setRadiusMaxKm(s.dispatch_max_radius_m / 1000)
    }).catch(() => {})
  }, [loadQueue])

  // Auto-refresh every 5s
  useEffect(() => {
    const interval = setInterval(() => { loadQueue() }, 5000)
    return () => clearInterval(interval)
  }, [loadQueue])

  // Load eligible drivers when selection changes
  useEffect(() => {
    if (selectedItem) {
      loadEligibleDrivers(selectedItem.id)
    } else {
      setEligibleData(null)
    }
  }, [selectedItem, loadEligibleDrivers])

  const handleSelectItem = (item: QueueItem) => {
    setSelectedItem(item)
    if (isMobile) setMobilePanel('drivers')
  }

  const handleAssign = async () => {
    if (!selectedItem || !eligibleData) return
    const recommended = eligibleData.drivers.find(d => d.recommended)
    if (!recommended) return
    setAssigning(true)
    setError(null)
    try {
      await dispatchService.assignDriver(selectedItem.id, {
        driver_id: recommended.driver_id,
        reason: 'Manual dispatch by admin',
      })
      await loadQueue()
      setSelectedItem(null)
      setEligibleData(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Assignment failed'
      setIsForbidden(parseApiError(e).isForbidden)
      setError(msg)
    } finally {
      setAssigning(false)
    }
  }

  const handleNotifyCustomer = () => {
    if (!selectedItem) return
    const name = selectedItem.customer_name ?? 'the customer'
    alert(`Notification sent to ${name} for booking ${selectedItem.booking_ref}.\n\nIn production this triggers an SMS/push via the Notifications module.`)
  }

  const handleCancelRefund = async () => {
    if (!selectedItem) return
    const confirmed = window.confirm(
      `Cancel booking ${selectedItem.booking_ref} and issue a refund?\n\nThis will set the booking to Cancelled status.`
    )
    if (!confirmed) return
    try {
      await import('../../lib/axios').then(m =>
        m.default.post(`/bookings/${selectedItem.id}/cancel`, { reason: 'Cancelled from dispatch console — no driver available' })
      )
      await loadQueue()
      setSelectedItem(null)
      setEligibleData(null)
    } catch {
      setError('Cancel failed — please cancel from the Bookings module.')
    }
  }

  const handleExpandRadius = async () => {
    if (!selectedItem) return
    setExpandingRadius(true)
    setError(null)
    try {
      await dispatchService.expandRadius(selectedItem.id)
      await loadEligibleDrivers(selectedItem.id)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Expand radius failed'
      setIsForbidden(parseApiError(e).isForbidden)
      setError(msg)
    } finally {
      setExpandingRadius(false)
    }
  }

  const recommendedDriver = eligibleData?.drivers.find(d => d.recommended)

  // Panel visibility
  const showQueue = isMobile ? mobilePanel === 'queue' : true
  const showDrivers = isMobile ? mobilePanel === 'drivers' : true
  const showMap = !isMobile && !isTablet

  const queuePanel = (
    <div style={{
      width: isMobile ? '100%' : 440,
      flexShrink: 0,
      borderRight: '1px solid var(--rule)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Live request queue</span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
            color: ACCENT, letterSpacing: '0.08em',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: ACCENT,
              animation: 'pulse 1.5s ease infinite',
            }} />
            STREAMING
          </span>
          {stats && (
            <span className="badge" style={{ marginLeft: 'auto', fontSize: 11 }}>
              {stats.total_in_queue} in queue
            </span>
          )}
        </div>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'warn', 'danger'] as const).map(f => (
            <button
              key={f}
              className={'btn sm' + (slaFilter === f ? ' accent' : ' ghost')}
              onClick={() => setSlaFilter(f)}
              style={{ fontSize: 11, padding: '3px 10px' }}
            >
              {f === 'all' ? 'All SLA' : f === 'warn' ? 'SLA Warn' : 'SLA Danger'}
            </button>
          ))}
        </div>
      </div>

      {/* Queue list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {queue.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            No requests in queue
          </div>
        )}
        {queue.map(item => (
          <div
            key={item.id}
            onClick={() => handleSelectItem(item)}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--rule)',
              cursor: 'pointer',
              background: selectedItem?.id === item.id ? 'var(--surface-2, #f8f9fa)' : undefined,
              borderLeft: selectedItem?.id === item.id ? `3px solid ${ACCENT}` : '3px solid transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {/* Timer — colour driven by live sla_dispatch_alert_min from settings */}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: slaColor(stats
                  ? computeSlaStatus(item.age_seconds, stats.sla_dispatch_alert_min * 60)
                  : item.sla_status),
                fontWeight: 600,
                minWidth: 40,
              }}>
                {fmtSeconds(item.age_seconds)}
              </span>
              <span className="t-label" style={{ fontSize: 11 }}>{item.booking_ref}</span>
              <span style={{ fontSize: 12, flex: 1 }}>{item.customer_name ?? '—'}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{item.fare_display}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>
              {item.pickup_address} → {item.drop_address}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="t-meta" style={{ fontSize: 10 }}>
                {item.dispatch_attempts}/{stats?.max_dispatch_retries ?? '?'} attempts · r={item.current_radius_km}km · {item.eligible_count} eligible
              </span>
              {item.exception_type && (
                <span className="badge danger" style={{ fontSize: 10 }}>{item.exception_type}</span>
              )}
              {stats && item.age_seconds > stats.ping_ttl_sec && !item.exception_type && (
                <span className="badge warn" style={{ fontSize: 10 }}>TTL exceeded</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const mapPanel = (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Leaflet map */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapContainer
          center={[12.9716, 77.5946]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Fly to selected pickup */}
          {selectedItem?.pickup_lat && selectedItem?.pickup_lng && (
            <MapFlyTo lat={selectedItem.pickup_lat} lng={selectedItem.pickup_lng} />
          )}

          {/* All pending requests as pickup markers */}
          {queue.map(item => item.pickup_lat && item.pickup_lng ? (
            <Marker
              key={item.id}
              position={[item.pickup_lat, item.pickup_lng]}
              icon={pickupIcon}
              opacity={selectedItem?.id === item.id ? 1 : 0.6}
            >
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <strong>{item.booking_ref}</strong><br />
                  {item.pickup_address}<br />
                  <span style={{ color: slaColor(stats ? computeSlaStatus(item.age_seconds, stats.sla_dispatch_alert_min * 60) : item.sla_status) }}>
                    {fmtSeconds(item.age_seconds)} · {stats ? computeSlaStatus(item.age_seconds, stats.sla_dispatch_alert_min * 60) : item.sla_status}
                  </span>
                </div>
              </Popup>
            </Marker>
          ) : null)}

          {/* Search radius ring for selected item */}
          {selectedItem?.pickup_lat && selectedItem?.pickup_lng && (
            <Circle
              center={[selectedItem.pickup_lat, selectedItem.pickup_lng]}
              radius={selectedItem.current_radius_km * 1000}
              pathOptions={{ color: ACCENT, fillColor: ACCENT, fillOpacity: 0.06, weight: 1.5, dashArray: '5 6' }}
            />
          )}

          {/* Eligible driver markers */}
          {eligibleData?.drivers.map(driver => driver.current_lat && driver.current_lng ? (
            <Marker
              key={driver.driver_id}
              position={[driver.current_lat, driver.current_lng]}
              icon={driverIcon}
            >
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <strong>{driver.name}</strong><br />
                  {driver.vehicle_plate}<br />
                  {driver.distance_km.toFixed(1)} km · ★ {driver.rating?.toFixed(2)}
                </div>
              </Popup>
            </Marker>
          ) : null)}
        </MapContainer>
      </div>

      {/* Bottom stat bar */}
      {stats && (
        <div style={{
          padding: '10px 20px',
          background: 'var(--surface)',
          borderTop: '1px solid var(--rule)',
          display: 'flex', gap: 24, flexWrap: 'wrap',
          flexShrink: 0,
        }}>
          {[
            { label: 'Avg pickup ETA', value: fmtEta(stats.avg_pickup_eta_seconds) },
            { label: `Dispatch SLA`, value: `${stats.sla_dispatch_alert_min}min`, highlight: (slaMonitor?.items.length ?? 0) > 0 },
            { label: `Pickup SLA`, value: `${stats.sla_pickup_alert_min}min`, highlight: (slaMonitor?.pickup_breached ?? 0) > 0 },
            { label: `Overrun SLA`, value: `${stats.sla_trip_overrun_alert_min}min`, highlight: (slaMonitor?.overrun_breached ?? 0) > 0 },
            { label: `Stuck >${stats.ping_ttl_sec}s`, value: String(stats.stuck_over_timeout) },
            { label: 'No-driver', value: String(stats.no_driver_count) },
            { label: 'Max retries', value: String(stats.max_dispatch_retries) },
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{ fontSize: 12 }}>
              <div className="t-meta">{label}</div>
              <div style={{ fontWeight: 600, color: highlight ? 'var(--danger)' : undefined }}>{value}</div>
            </div>
          ))}
          <div style={{ fontSize: 12 }}>
            <div className="t-meta">Auto-assign</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: stats.auto_assign_enabled ? 'var(--accent)' : 'var(--danger)',
                flexShrink: 0,
              }} />
              {stats.auto_assign_enabled ? 'On' : 'Off'}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const driversPanel = (
    <div style={{
      width: isMobile ? '100%' : 360,
      flexShrink: 0,
      borderLeft: '1px solid var(--rule)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Mobile back button */}
      {isMobile && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--rule)' }}>
          <button className="btn ghost sm" onClick={() => setMobilePanel('queue')}>
            ← Back to Queue
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Eligible drivers</div>
        {eligibleData && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {eligibleData.total_eligible} eligible · radius {eligibleData.current_radius_km}km
          </div>
        )}
        {eligibleData?.ranking_weights && (
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            Distance·{eligibleData.ranking_weights.distance} · Rating·{eligibleData.ranking_weights.rating} · Accept·{eligibleData.ranking_weights.acceptance}
          </div>
        )}
      </div>

      {/* Driver list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selectedItem && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            Select a request to see eligible drivers
          </div>
        )}
        {selectedItem && loadingEligible && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            Loading drivers…
          </div>
        )}
        {selectedItem && !loadingEligible && eligibleData && eligibleData.drivers.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.6 }}>
            No eligible drivers found<br />
            <span style={{ fontSize: 11 }}>Try expanding the radius below</span>
          </div>
        )}
        {selectedItem && !loadingEligible && eligibleData?.drivers.map(driver => (
          <div
            key={driver.driver_id}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--rule)',
              background: driver.recommended ? 'rgba(15, 138, 95, 0.04)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Rank */}
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: driver.recommended ? ACCENT : 'var(--rule)',
                color: driver.recommended ? '#fff' : 'var(--ink-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>
                {driver.rank}
              </div>
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: driver.recommended ? ACCENT : '#e0e0e0',
                color: driver.recommended ? '#fff' : 'var(--ink-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, flexShrink: 0,
              }}>
                {initials(driver.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{driver.name}</div>
                <div className="t-meta" style={{ fontSize: 10 }}>{driver.vehicle_plate}</div>
              </div>
              {driver.recommended && (
                <button
                  className="btn sm accent"
                  onClick={handleAssign}
                  disabled={assigning}
                  style={{ fontSize: 11 }}
                >
                  {assigning ? '…' : 'Assign'}
                </button>
              )}
            </div>
            <div style={{
              marginTop: 6, marginLeft: 64,
              display: 'flex', gap: 12, fontSize: 11, color: 'var(--ink-3)',
            }}>
              <span>{driver.distance_km.toFixed(1)}km</span>
              <span>{driver.eta_minutes}min ETA</span>
              <span>★ {driver.rating.toFixed(2)}</span>
              <span>{driver.acceptance_rate}% acc</span>
            </div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      {selectedItem && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--rule)', flexShrink: 0 }}>
          {error && (
            <div style={{ fontSize: 11, color: 'var(--danger, #d32f2f)', marginBottom: 8 }}>
              {error}
            </div>
          )}
          {recommendedDriver && (
            <button
              className="btn accent"
              style={{ width: '100%', marginBottom: 8, fontSize: 13 }}
              onClick={handleAssign}
              disabled={assigning}
            >
              {assigning ? 'Assigning…' : `Assign to ${recommendedDriver.name}`}
            </button>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn ghost sm"
              style={{ flex: 1, fontSize: 11 }}
              onClick={handleExpandRadius}
              disabled={expandingRadius || (selectedItem ? selectedItem.current_radius_km >= radiusMaxKm : false)}
            >
              {expandingRadius
                ? '…'
                : selectedItem && selectedItem.current_radius_km >= radiusMaxKm
                  ? `Max radius (${radiusMaxKm}km)`
                  : `Expand +${radiusStepKm}km`}
            </button>
            <button className="btn ghost sm" style={{ flex: 1, fontSize: 11 }} onClick={handleNotifyCustomer}>
              Notify customer
            </button>
          </div>
          <button
            className="btn ghost sm"
            style={{ width: '100%', marginTop: 6, fontSize: 11, color: 'var(--danger, #d32f2f)' }}
            onClick={handleCancelRefund}
          >
            Cancel &amp; refund
          </button>
        </div>
      )}
    </div>
  )

  return (
    <Shell
      activeId="dispatch"
      breadcrumb="Operations · Live"
      title="Dispatch console"
      subtitle="Real-time booking queue with driver assignment"
      actions={
        <button className="btn ghost sm" onClick={() => navigate('/dispatch/exceptions')}>
          Exceptions
          {stats?.exceptions_count ? (
            <span className="badge danger" style={{ marginLeft: 6, fontSize: 10 }}>
              {stats.exceptions_count}
            </span>
          ) : null}
        </button>
      }
    >
      {/* ── SLA Monitor banner (pickup + overrun alerts) ──────────────────── */}
      {slaMonitor && (slaMonitor.pickup_breached > 0 || slaMonitor.overrun_breached > 0 || slaMonitor.items.length > 0) && (
        <div style={{
          borderBottom: '1px solid var(--rule)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          {/* Summary row */}
          <div style={{
            display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
            padding: '8px 20px',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>SLA Alerts</span>
            {slaMonitor.pickup_breached > 0 && (
              <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
                🚨 {slaMonitor.pickup_breached} pickup{slaMonitor.pickup_breached > 1 ? 's' : ''} breached
                {stats ? ` (limit: ${stats.sla_pickup_alert_min}min)` : ''}
              </span>
            )}
            {slaMonitor.overrun_breached > 0 && (
              <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
                🚨 {slaMonitor.overrun_breached} trip{slaMonitor.overrun_breached > 1 ? 's' : ''} overrun
                {stats ? ` (limit: ${stats.sla_trip_overrun_alert_min}min)` : ''}
              </span>
            )}
            {slaMonitor.items.filter(i => i.sla_status === 'warn').length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 500 }}>
                ⚠ {slaMonitor.items.filter(i => i.sla_status === 'warn').length} approaching SLA
              </span>
            )}
          </div>
          {/* Detail rows */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', gap: 8, padding: '0 20px 10px', minWidth: 'max-content' }}>
              {slaMonitor.items.map(item => (
                <div key={item.id} style={{
                  border: `1px solid ${slaColor(item.sla_status)}`,
                  borderRadius: 6, padding: '6px 10px', fontSize: 11,
                  background: item.sla_status === 'danger' ? 'color-mix(in oklab, var(--danger) 8%, var(--surface))' : 'color-mix(in oklab, var(--warn) 8%, var(--surface))',
                  minWidth: 190,
                }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, color: slaColor(item.sla_status) }}>
                      {item.sla_type === 'pickup' ? '📍 Pickup' : '🔄 Overrun'}
                    </span>
                    <span className="t-label" style={{ fontSize: 10 }}>{item.booking_ref}</span>
                  </div>
                  <div style={{ color: 'var(--ink-2)', marginBottom: 2 }}>{item.customer_name ?? '—'}</div>
                  {item.driver_name && <div className="t-meta">Driver: {item.driver_name}</div>}
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontWeight: 600, color: slaColor(item.sla_status) }}>
                    {fmtSeconds(item.age_seconds)} / {fmtSeconds(item.sla_limit_seconds)} limit
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        height: 'calc(100vh - 120px)',
        overflow: 'hidden',
      }}>
        {showQueue && queuePanel}
        {showMap && mapPanel}
        {showDrivers && driversPanel}
      </div>
    </Shell>
  )
}
