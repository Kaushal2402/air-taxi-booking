import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

interface KpiStats {
  live_trips_road: number
  live_trips_air: number
  live_trips_total: number
  today_bookings: number
  today_gbv_minor: number
  today_completed: number
  cancel_rate_pct: number
  active_operators: number
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

type Window = 'today' | '7d' | '30d' | '90d'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMinor = (v: number) => {
  const lakh = v / 100 / 100000
  if (lakh >= 1) return `₹${lakh.toFixed(1)} L`
  return `₹${(v / 100).toLocaleString('en-IN')}`
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [window, setWindow] = useState<Window>('today')
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
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Shell
      activeId="dashboard"
      breadcrumb="Operations · Live"
      title="Operations"
      subtitle={dateLabel}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', border: '1px solid var(--rule-strong)', borderRadius: 3, overflow: 'hidden' }}>
            {(['today', '7d', '30d', '90d'] as Window[]).map((w, i, arr) => (
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

        {/* KPI strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          background: 'var(--surface)', border: '1px solid var(--rule)', overflow: 'hidden',
        }}>
          <KpiCard
            kicker="Live trips"
            value={loading ? '—' : kpi?.live_trips_total ?? 0}
            sparkline={kpi?.bookings_14d}
            sparkColor="var(--accent)"
            footer={kpi ? `Road · ${kpi.live_trips_road} · Air · ${kpi.live_trips_air}` : undefined}
          />
          <KpiCard
            kicker="Today's bookings"
            value={loading ? '—' : (kpi?.today_bookings ?? 0).toLocaleString('en-IN')}
            sparkline={kpi?.bookings_14d}
            sparkColor="var(--ink-3)"
            footer={kpi ? `Completed · ${kpi.today_completed}` : undefined}
          />
          <KpiCard
            kicker="Today's GBV"
            value={loading ? '—' : fmtMinor(kpi?.today_gbv_minor ?? 0)}
            sparkline={kpi?.revenue_14d_minor}
            sparkColor="var(--accent)"
            footer="Gross booking value (incl. tax)"
          />
          <KpiCard
            kicker="Cancel rate"
            value={loading ? '—' : `${kpi?.cancel_rate_pct ?? 0}%`}
            deltaTone={(kpi?.cancel_rate_pct ?? 0) > 6 ? 'danger' : (kpi?.cancel_rate_pct ?? 0) > 4 ? 'warn' : 'ok'}
            delta={kpi ? `${kpi.cancel_rate_pct}%` : undefined}
            footer="Today · road bookings"
          />
        </div>

        {/* Map placeholder + Alerts */}
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
                <button className="btn sm" onClick={() => navigate('/dispatch')}>
                  <Icon name="external" size={12} />Full map
                </button>
              </div>
            </div>

            {/* City grid SVG */}
            <div style={{ flex: 1, minHeight: 320, position: 'relative', background: 'var(--surface-sunk)', overflow: 'hidden' }}>
              <CityGrid liveRoad={kpi?.live_trips_road ?? 0} liveAir={kpi?.live_trips_air ?? 0} />
              <div style={{ position: 'absolute', top: 14, right: 14, background: 'var(--surface)', border: '1px solid var(--rule)', padding: '10px 14px', display: 'flex', gap: 18, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                <div><div className="t-label" style={{ padding: 0 }}>Road</div><div style={{ color: 'var(--accent)', marginTop: 3 }}>{kpi?.live_trips_road ?? '—'}</div></div>
                <div><div className="t-label" style={{ padding: 0 }}>Air</div><div style={{ color: 'var(--ink)', marginTop: 3 }}>{kpi?.live_trips_air ?? '—'}</div></div>
                <div><div className="t-label" style={{ padding: 0 }}>Total</div><div style={{ color: 'var(--ink)', marginTop: 3 }}>{kpi?.live_trips_total ?? '—'}</div></div>
              </div>
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

              {/* Always show a sensible set of static operational reminders */}
              {[
                { sev: 'info', t: 'Payout run', m: 'Check weekly driver payout queue in Payouts module', mod: 'Payouts' },
                { sev: 'warn', t: 'KYC queue', m: 'Review pending driver document verifications', mod: 'KYC' },
              ].map((a, i) => (
                <div key={`static-${i}`} style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule-soft)', display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', opacity: 0.7 }}>
                  <span className={`dot ${a.sev}`} style={{ marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{a.t}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>{a.m}</div>
                    <div style={{ marginTop: 6 }}><span className="t-meta" style={{ color: 'var(--ink-2)' }}>{a.mod} →</span></div>
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
                      {fmtMinor(b.fare_minor)}
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

// ── City grid SVG (static decorative map) ────────────────────────────────────

function CityGrid({ liveRoad, liveAir }: { liveRoad: number; liveAir: number }) {
  const dots = Array.from({ length: Math.min(liveRoad, 20) }, (_, i) => ({
    x: 80 + (i % 6) * 110 + Math.sin(i * 1.7) * 30,
    y: 80 + Math.floor(i / 6) * 100 + Math.cos(i * 2.1) * 25,
    kind: 'road',
  }))
  const airDots = Array.from({ length: Math.min(liveAir, 6) }, (_, i) => ({
    x: 150 + i * 130,
    y: 60 + (i % 2) * 140,
  }))

  return (
    <svg viewBox="0 0 800 340" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <pattern id="g1" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0 L0 0 0 48" stroke="var(--rule)" strokeWidth="0.5" fill="none" />
        </pattern>
        <pattern id="g2" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0 L0 0 0 12" stroke="var(--rule-soft)" strokeWidth="0.3" fill="none" />
        </pattern>
      </defs>
      <rect width="800" height="340" fill="var(--surface-sunk)" />
      <rect width="800" height="340" fill="url(#g2)" />
      <rect width="800" height="340" fill="url(#g1)" opacity="0.6" />
      <g stroke="var(--rule-strong)" strokeWidth="1.2" fill="none" opacity="0.7">
        <path d="M-10 100 Q200 80 420 140 T820 180" />
        <path d="M-10 260 Q220 300 480 260 T820 230" />
        <path d="M120 -10 Q160 150 260 230 T320 350" />
        <path d="M520 -10 Q540 120 580 240 T620 360" />
      </g>
      <g stroke="var(--rule)" strokeWidth="0.6" fill="none" opacity="0.5">
        <path d="M-10 50 Q300 70 800 80" /><path d="M-10 200 Q300 220 800 180" />
        <path d="M280 -10 Q300 170 300 360" /><path d="M430 -10 Q450 160 460 360" />
        <path d="M-10 160 L820 160" />
      </g>
      <path d="M-10 300 Q200 260 360 300 Q520 340 800 280" fill="none" stroke="var(--info)" strokeWidth="5" opacity="0.15" strokeLinecap="round" />
      {dots.map((d, i) => (
        <circle key={`r${i}`} cx={d.x} cy={d.y} r="5" fill="var(--accent)" opacity="0.85" />
      ))}
      {airDots.map((d, i) => (
        <text key={`a${i}`} x={d.x} y={d.y} textAnchor="middle" dominantBaseline="middle"
              fill="var(--ink)" style={{ font: '14px sans-serif' }}>✈</text>
      ))}
      <rect width="800" height="340" fill="url(#cityVignette)" />
    </svg>
  )
}
