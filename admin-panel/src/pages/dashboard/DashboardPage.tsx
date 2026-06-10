import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/axios'
import { useFormatMoney, formatMoneyWith, formatDateLong } from '../../lib/utils'
import { usePlatformStore } from '../../store/platformStore'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ZoneDemandItem {
  zone_name: string
  surge_multiplier: number
  tone: string
}

interface KpiStats {
  live_trips_road: number
  live_trips_air: number
  live_trips_air_ground: number
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
  demand_supply: ZoneDemandItem[]
}

interface LiveBookingItem {
  id: string
  booking_ref: string
  service: string
  route: string
  status: string
  fare_minor: number
  kind: 'road' | 'air'
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

type WindowParam = 'today' | '7d' | '30d' | '90d'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Exported for LiveMapPage — reads platform currency from store at call time
export const fmtMinor = (v: number) => {
  const cur = usePlatformStore.getState().base_currency
  return formatMoneyWith(v, cur)
}

export const fmtEta = (sec: number | null | undefined) => {
  if (sec == null || sec === 0) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data, color = 'var(--ink-2)', height = 28, fill }: {
  data: number[]; color?: string; height?: number; fill?: string
}) {
  const w = 100, h = height
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 2 - ((v - min) / range) * (h - 4),
  ])
  const d = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2)).join(' ')
  const fillD = d + ` L${w} ${h} L0 ${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      {fill && <path d={fillD} fill={fill} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ kicker, value, delta, deltaTone = 'ok', sparkline, sparkColor, footer, hero }: {
  kicker: string; value: string | number; delta?: string; deltaTone?: string
  sparkline?: number[]; sparkColor?: string; footer?: string; hero?: boolean
}) {
  return (
    <div style={{
      padding: hero ? '22px 24px' : '18px 18px 16px',
      borderRight: '1px solid var(--rule)',
      background: 'var(--surface)',
      display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="t-label" style={{ padding: 0 }}>{kicker}</span>
        {delta && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3,
            color: deltaTone === 'ok' ? 'var(--accent)' : deltaTone === 'warn' ? 'var(--warn)' : deltaTone === 'danger' ? 'var(--danger)' : 'var(--ink-3)',
          }}>
            <Icon name={deltaTone === 'warn' || deltaTone === 'danger' ? 'arrowDown' : 'arrowUp'} size={10} stroke={2} />
            {delta}
          </span>
        )}
      </div>
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: hero ? 44 : 30, fontWeight: 400,
        letterSpacing: '-0.020em', color: 'var(--ink)', lineHeight: 1,
      }}>{value}</div>
      {sparkline && (
        <div style={{ marginTop: 4 }}>
          <Sparkline data={sparkline} color={sparkColor ?? 'var(--ink-3)'} height={hero ? 36 : 24} />
        </div>
      )}
      {footer && <div className="t-meta" style={{ marginTop: 4 }}>{footer}</div>}
    </div>
  )
}

// ── Trend chart ───────────────────────────────────────────────────────────────

function TrendChart({ bookings, revenue }: { bookings: number[]; revenue: number[] }) {
  const days = bookings.length
  if (days < 2) return null
  const w = 880, h = 200, padX = 40, padT = 14, padB = 30

  const bMin = Math.max(0, Math.min(...bookings) * 0.9)
  const bMax = Math.max(...bookings) * 1.1 || 1
  const rMin = Math.max(0, Math.min(...revenue) * 0.9)
  const rMax = Math.max(...revenue) * 1.1 || 1

  const xAt = (i: number) => padX + (i / (days - 1)) * (w - padX - 24)
  const bY = (v: number) => padT + (1 - (v - bMin) / (bMax - bMin)) * (h - padT - padB)
  const rY = (v: number) => padT + (1 - (v - rMin) / (rMax - rMin)) * (h - padT - padB)

  const bPath = bookings.map((v, i) => (i ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + bY(v).toFixed(1)).join(' ')
  const rPath = revenue.map((v, i) => (i ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + rY(v).toFixed(1)).join(' ')
  const bFill = bPath + ` L${xAt(days - 1)} ${h - padB} L${padX} ${h - padB} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      {[0, 1, 2, 3, 4].map(i => {
        const y = padT + (i / 4) * (h - padT - padB)
        return <line key={i} x1={padX} x2={w - 24} y1={y} y2={y} stroke="var(--rule-soft)" strokeWidth="1" />
      })}
      <path d={bFill} fill="var(--ink)" opacity="0.05" />
      <path d={bPath} fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={rPath} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xAt(days - 1)} cy={bY(bookings[days - 1])} r="4" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.6" />
      <circle cx={xAt(days - 1)} cy={rY(revenue[days - 1])} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.6" />
      <line x1={xAt(days - 1)} x2={xAt(days - 1)} y1={padT} y2={h - padB} stroke="var(--rule-strong)" strokeWidth="0.8" strokeDasharray="2 3" />
      <text x={xAt(days - 1)} y={padT - 4} textAnchor="end" fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono', letterSpacing: '0.10em' }}>TODAY</text>
    </svg>
  )
}

// ── CityMap SVG (exported for use in LiveMapPage) ─────────────────────────────

export interface CityMapProps {
  showLegend?: boolean
  height?: number
  onlineCount?: number
  onTripCount?: number
  pickupCount?: number
  airCount?: number
}

export function CityMap({ showLegend = true, height = 340, onlineCount, onTripCount, pickupCount, airCount }: CityMapProps) {
  const roadMarkers = Array.from({ length: 15 }, (_, i) => ({
    x: 80 + (i % 6) * 110 + Math.sin(i * 1.7) * 30,
    y: 80 + Math.floor(i / 6) * 100 + Math.cos(i * 2.1) * 25,
  }))
  const idleMarkers = Array.from({ length: 8 }, (_, i) => ({
    x: 60 + (i % 4) * 160 + Math.cos(i * 2.3) * 20,
    y: 180 + Math.floor(i / 4) * 100 + Math.sin(i * 1.4) * 20,
  }))
  const pickupMarkers = Array.from({ length: 5 }, (_, i) => ({
    x: 100 + i * 140 + Math.sin(i * 3) * 15,
    y: 130 + (i % 2) * 120,
  }))
  const airMarkers = Array.from({ length: 3 }, (_, i) => ({
    x: 150 + i * 200,
    y: 60 + (i % 2) * 180,
  }))

  return (
    <svg viewBox="0 0 800 340" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <pattern id="cm-g1" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0 L0 0 0 48" stroke="var(--rule)" strokeWidth="0.5" fill="none" />
        </pattern>
        <pattern id="cm-g2" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0 L0 0 0 12" stroke="var(--rule-soft)" strokeWidth="0.3" fill="none" />
        </pattern>
        <radialGradient id="cm-vignette" cx="50%" cy="50%" r="60%">
          <stop offset="60%" stopColor="transparent" />
          <stop offset="100%" stopColor="var(--surface)" stopOpacity="0.4" />
        </radialGradient>
      </defs>

      {/* Base */}
      <rect width="800" height="340" fill="var(--surface-sunk)" />
      <rect width="800" height="340" fill="url(#cm-g2)" />
      <rect width="800" height="340" fill="url(#cm-g1)" opacity="0.6" />

      {/* Park / green areas */}
      <ellipse cx="640" cy="220" rx="80" ry="50" fill="var(--accent)" opacity="0.07" />
      <ellipse cx="160" cy="290" rx="60" ry="30" fill="var(--accent)" opacity="0.06" />

      {/* River */}
      <path d="M-10 300 Q200 260 360 300 Q520 340 800 280" fill="none" stroke="var(--info)" strokeWidth="6" opacity="0.12" strokeLinecap="round" />

      {/* Major arteries */}
      <g stroke="var(--rule-strong)" strokeWidth="1.8" fill="none" opacity="0.6">
        <path d="M-10 100 Q200 80 420 140 T820 180" />
        <path d="M-10 260 Q220 300 480 260 T820 230" />
        <path d="M120 -10 Q160 150 260 230 T320 350" />
        <path d="M520 -10 Q540 120 580 240 T620 360" />
      </g>

      {/* Secondary streets */}
      <g stroke="var(--rule)" strokeWidth="0.8" fill="none" opacity="0.45">
        <path d="M-10 50 Q300 70 800 80" />
        <path d="M-10 200 Q300 220 800 180" />
        <path d="M280 -10 Q300 170 300 360" />
        <path d="M430 -10 Q450 160 460 360" />
        <path d="M-10 160 L820 160" />
        <path d="M-10 145 L820 145" />
        <path d="M200 -10 L220 360" />
        <path d="M680 -10 L660 360" />
      </g>

      {/* Active route polylines */}
      <g stroke="var(--accent)" strokeWidth="2" fill="none" opacity="0.35" strokeLinecap="round" strokeDasharray="6 4">
        <path d="M160 110 Q280 130 380 200 Q440 240 530 260" />
        <path d="M250 80 Q350 120 460 160 Q540 190 620 240" />
      </g>
      <g stroke="var(--ink-3)" strokeWidth="1.5" fill="none" opacity="0.25" strokeLinecap="round" strokeDasharray="4 4">
        <path d="M80 240 Q180 220 290 240 Q380 255 460 230" />
      </g>

      {/* Zone labels */}
      <g fontFamily="IBM Plex Mono, monospace" fontSize="9" letterSpacing="0.08em" fill="var(--ink-3)" opacity="0.7">
        <text x="340" y="128">Z-N4 · Indiranagar</text>
        <text x="540" y="85">Z-E2 · Whitefield</text>
        <text x="110" y="252">Z-S1 · HSR Layout</text>
      </g>

      {/* Idle markers (grey) */}
      {idleMarkers.map((m, i) => (
        <circle key={`idle-${i}`} cx={m.x} cy={m.y} r="4" fill="var(--ink-3)" opacity="0.5" />
      ))}

      {/* Pickup markers (yellow/warn) */}
      {pickupMarkers.map((m, i) => (
        <circle key={`pickup-${i}`} cx={m.x} cy={m.y} r="5" fill="var(--warn)" opacity="0.8" />
      ))}

      {/* On-trip markers (accent green, animated) */}
      {roadMarkers.map((m, i) => (
        <circle key={`road-${i}`} cx={m.x} cy={m.y} r="5" fill="var(--accent)" opacity="0.85">
          <animate attributeName="opacity" values="0.85;0.5;0.85" dur={`${2 + (i % 3) * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Air markers */}
      {airMarkers.map((m, i) => (
        <text key={`air-${i}`} x={m.x} y={m.y} textAnchor="middle" dominantBaseline="middle"
          fill="var(--ink)" style={{ font: '14px sans-serif' }}>✈</text>
      ))}

      {/* Corner stats overlay */}
      <g>
        <rect x="12" y="12" width="138" height="92" rx="3" fill="var(--surface)" fillOpacity="0.92" stroke="var(--rule)" strokeWidth="0.7" />
        <text x="20" y="28" fontFamily="IBM Plex Mono, monospace" fontSize="9" letterSpacing="0.10em" fill="var(--ink-3)">LIVE STATUS</text>
        <circle cx="22" cy="42" r="4" fill="var(--accent)" />
        <text x="32" y="46" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="var(--ink)">On trip {onTripCount ?? '—'}</text>
        <circle cx="22" cy="58" r="4" fill="var(--ink-3)" />
        <text x="32" y="62" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="var(--ink)">Idle {onlineCount ?? '—'}</text>
        <circle cx="22" cy="74" r="4" fill="var(--warn)" />
        <text x="32" y="78" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="var(--ink)">Pickup {pickupCount ?? '—'}</text>
        <text x="22" y="97" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="var(--ink)">✈ Air {airCount ?? '—'}</text>
      </g>

      {/* Vignette */}
      <rect width="800" height="340" fill="url(#cm-vignette)" />

      {/* Legend */}
      {showLegend && (
        <g transform="translate(520, 310)">
          <rect x="-8" y="-14" width="278" height="24" rx="3" fill="var(--surface)" fillOpacity="0.9" stroke="var(--rule)" strokeWidth="0.7" />
          <circle cx="4" cy="0" r="4" fill="var(--accent)" />
          <text x="12" y="4" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="var(--ink-3)">On trip</text>
          <circle cx="72" cy="0" r="4" fill="var(--ink-3)" />
          <text x="80" y="4" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="var(--ink-3)">Idle</text>
          <circle cx="118" cy="0" r="4" fill="var(--warn)" />
          <text x="126" y="4" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="var(--ink-3)">Pickup</text>
          <text x="176" y="4" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="var(--ink-3)">✈ Air</text>
        </g>
      )}
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const fmtMinorLocal = useFormatMoney()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const analyticsAllowed = usePlatformStore(s => s.consent_analytics_tracking)
  const [window, setWindow] = useState<WindowParam>('today')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get<DashboardData>('/dashboard', { params: { window } })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [window])

  const kpi = data?.kpi
  const liveBookings = data?.live_bookings ?? []
  const alerts = data?.alerts ?? []

  const now = new Date()
  const dateLabel = formatDateLong(now.toISOString())

  const cancelTone = (kpi?.cancel_rate_pct ?? 0) > 6 ? 'danger' : (kpi?.cancel_rate_pct ?? 0) > 4 ? 'warn' : 'ok'
  const completionRate = kpi && kpi.today_bookings > 0
    ? ((kpi.today_completed / kpi.today_bookings) * 100).toFixed(1)
    : '0.0'

  const driversValue = loading ? '—' :
    `${(kpi?.online_drivers ?? 0).toLocaleString('en-IN')} / ${(kpi?.online_drivers_total ?? 0).toLocaleString('en-IN')}`
  const driversFooter = kpi
    ? `Idle ${kpi.online_drivers_idle} · On-trip ${kpi.online_drivers_on_trip}`
    : undefined

  const operatorsPaused = kpi?.active_operators_paused ?? 0

  return (
    <Shell
      activeId="dashboard"
      breadcrumb="Operations · Live"
      title="Operations"
      subtitle={dateLabel}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', border: '1px solid var(--rule-strong)', borderRadius: 3, overflow: 'hidden' }}>
            {(['today', '7d', '30d', '90d'] as WindowParam[]).map((w, i, arr) => (
              <button key={w} className="btn sm ghost" onClick={() => setWindow(w)} style={{
                height: 28, borderRadius: 0,
                borderRight: i < arr.length - 1 ? '1px solid var(--rule)' : 'none',
                background: w === window ? 'var(--surface-sunk)' : 'transparent',
                color: w === window ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: w === window ? 500 : 400,
                padding: '0 12px', fontFamily: 'var(--font-mono)', fontSize: 11,
                letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              }}>{w}</button>
            ))}
          </div>
          <button className="btn sm accent" onClick={() => navigate('/bookings/road/new')}>
            <Icon name="plus" size={13} />New booking
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 28px' : '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Gap 9: analytics consent warning */}
        {!analyticsAllowed && (
          <div style={{
            padding: '10px 16px', background: '#fef3c7', border: '1px solid #fbbf24',
            borderRadius: 4, fontSize: 13, color: '#92400e',
          }}>
            ⚠ <strong>In-app analytics tracking is disabled.</strong> Dashboard metrics and KPIs
            are read-only for this session. Enable <em>In-app analytics tracking</em> in{' '}
            <strong>Settings → Data &amp; Privacy → Consent</strong> to restore full analytics.
          </div>
        )}

        {/* Quick-actions bar */}
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 16px',
          background: 'var(--surface)', border: '1px solid var(--rule)',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.10em', color: 'var(--ink-3)', alignSelf: 'center', marginRight: 4 }}>QUICK ACTIONS</span>
          <button className="btn sm" onClick={() => navigate('/bookings/road/new')}>
            <Icon name="plus" size={12} />Create road booking
          </button>
          <button className="btn sm" onClick={() => navigate('/bookings/air/new')}>
            <Icon name="plus" size={12} />Create air booking
          </button>
          <button className="btn sm ghost" onClick={() => navigate('/notifications')}>
            <Icon name="bell" size={12} />Broadcast notification
          </button>
          <button className="btn sm ghost" onClick={() => navigate('/dispatch/console')}>
            <Icon name="external" size={12} />Dispatch console
          </button>
        </div>

        {/* KPI strip — 8 cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          background: 'var(--surface)', border: '1px solid var(--rule)', overflow: 'hidden',
        }}>
          {/* Row 1 */}
          <KpiCard
            kicker="Live trips"
            value={loading ? '—' : kpi?.live_trips_total ?? 0}
            sparkline={kpi?.bookings_14d}
            sparkColor="var(--accent)"
            footer={kpi ? `Road · ${kpi.live_trips_road} · Air · ${kpi.live_trips_air}` : undefined}
          />
          <KpiCard
            kicker="Online drivers"
            value={driversValue}
            footer={driversFooter}
          />
          <KpiCard
            kicker="Today's bookings"
            value={loading ? '—' : (kpi?.today_bookings ?? 0).toLocaleString('en-IN')}
            sparkline={kpi?.bookings_14d}
            sparkColor="var(--ink-3)"
            footer="vs. last period"
          />
          <KpiCard
            kicker="Today's GBV"
            value={loading ? '—' : fmtMinorLocal(kpi?.today_gbv_minor ?? 0)}
            sparkline={kpi?.revenue_14d_minor}
            sparkColor="var(--accent)"
            footer="Gross booking value"
          />

          {/* Row 2 */}
          <KpiCard
            kicker="Completed"
            value={loading ? '—' : (kpi?.today_completed ?? 0).toLocaleString('en-IN')}
            footer={`${completionRate}% completion rate`}
          />
          <KpiCard
            kicker="Cancel rate"
            value={loading ? '—' : `${kpi?.cancel_rate_pct ?? 0}%`}
            deltaTone={cancelTone}
            delta={kpi ? `${kpi.cancel_rate_pct}%` : undefined}
            footer="Today · road bookings"
          />
          <KpiCard
            kicker="Pickup ETA"
            value={loading ? '—' : fmtEta(kpi?.pickup_eta_median_sec ?? 0)}
            footer="Median · all classes"
          />
          <KpiCard
            kicker="Active operators"
            value={loading ? '—' : `${kpi?.active_operators ?? '—'} / ${kpi?.active_operators_total ?? '—'}`}
            deltaTone={operatorsPaused > 0 ? 'danger' : 'ok'}
            delta={operatorsPaused > 0 ? `${operatorsPaused} paused` : undefined}
            footer={operatorsPaused > 0 ? `${operatorsPaused} paused` : 'All operators active'}
          />
        </div>

        {/* Map section + Alerts */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2.1fr 1fr', gap: 16, minHeight: 0 }}>

          {/* Map panel */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="t-label">Live operations</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  Drivers and active trips
                  <span style={{ marginLeft: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>· streaming</span>
                  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', marginLeft: 6, boxShadow: '0 0 0 3px color-mix(in oklab, var(--accent) 20%, transparent)' }} />
                </h3>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn sm" onClick={() => navigate('/dashboard/live')}>
                  <Icon name="external" size={12} />Full map
                </button>
              </div>
            </div>

            {/* CityMap SVG */}
            <div style={{ flex: 1, minHeight: 320, position: 'relative', background: 'var(--surface-sunk)', overflow: 'hidden' }}>
              <CityMap
                showLegend
                height={320}
                onlineCount={kpi?.online_drivers_idle}
                onTripCount={kpi?.online_drivers_on_trip}
                pickupCount={kpi?.live_trips_road}
                airCount={kpi?.live_trips_air}
              />
            </div>
          </div>

          {/* Alerts */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="t-label">Exceptions · now</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  Needs attention
                  {alerts.filter(a => a.severity === 'danger').length > 0 && (
                    <span style={{ color: 'var(--danger)' }}> · {alerts.filter(a => a.severity === 'danger').length}</span>
                  )}
                </h3>
              </div>
              <button className="btn sm ghost" onClick={() => navigate('/audit')}>View all</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {alerts.length === 0 ? (
                <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  No active alerts
                </div>
              ) : alerts.map((a, i) => (
                <div key={i} style={{ padding: '14px 18px', borderBottom: i < alerts.length - 1 ? '1px solid var(--rule-soft)' : 'none', display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <span className={`dot ${a.severity}`} style={{ marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{a.title}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.4 }}>{a.message}</div>
                    <div style={{ marginTop: 6 }}>
                      <span className="t-meta" style={{ color: 'var(--ink-2)' }}>{a.module} →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend chart + Live bookings */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2.1fr 1fr', gap: 16 }}>

          {/* Trend */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="t-label">Bookings & revenue · last 14 days</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Rolling fortnight</h3>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 2, background: 'var(--ink)', display: 'inline-block' }} /> Bookings
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 0, borderTop: '1.5px dashed var(--accent)', display: 'inline-block' }} /> Revenue
                </span>
              </div>
            </div>
            <div style={{ padding: '12px 18px 16px', height: 220 }}>
              {kpi && kpi.bookings_14d.length > 1 ? (
                <TrendChart bookings={kpi.bookings_14d} revenue={kpi.revenue_14d_minor.map(v => v / 100000)} />
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  No data yet
                </div>
              )}
            </div>
          </div>

          {/* Live bookings */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="t-label">In progress · now</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Live bookings</h3>
              </div>
              <button className="btn sm ghost" onClick={() => navigate('/bookings/road')}>All →</button>
            </div>
            <div>
              {liveBookings.length === 0 ? (
                <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  No live bookings right now
                </div>
              ) : liveBookings.map((b, i) => (
                <div
                  key={b.id}
                  onClick={() => navigate(b.kind === 'air' ? `/bookings/air/${b.id}` : `/bookings/road/${b.id}`)}
                  style={{ padding: '12px 18px', borderBottom: i < liveBookings.length - 1 ? '1px solid var(--rule-soft)' : 'none', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)' }}>{b.booking_ref}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.10em', textTransform: 'uppercase' as const }}>· {b.service}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.route}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.10em', textTransform: 'uppercase' as const,
                      color: b.status === 'InProgress' || b.status === 'Departed' ? 'var(--accent)' :
                             b.status === 'Accepted' || b.status === 'Boarding' ? 'var(--warn)' : 'var(--ink-3)',
                    }}>{b.status}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)', marginTop: 3 }}>
                      {fmtMinorLocal(b.fare_minor)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
