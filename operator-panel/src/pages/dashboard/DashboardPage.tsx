import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmtTime, fmtDateShort, fmtDateTime, fmtCurrency } from '../../lib/format'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import { operatorDashboardService } from '../../services/operatorDashboardService'
import type {
  DashboardKPIs,
  UpcomingFlight,
  ActionQueueItem,
  ComplianceAlert,
} from '../../services/operatorDashboardService'

const WINDOW_OPTIONS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
]

const formatMoney  = (minor: number) => fmtCurrency(minor)
const formatTime   = fmtTime
const formatDate   = fmtDateShort

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string
  value: string | number
  color: string
  sub?: string
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--rule)',
      borderRadius: 8,
      padding: '20px 22px',
    }}>
      <div className="t-label" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{
        fontSize: 30, fontFamily: 'var(--font-mono)', fontWeight: 600, color,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function AlertBanner({ alerts }: { alerts: ComplianceAlert[] }) {
  if (alerts.length === 0) return null
  return (
    <div style={{ marginBottom: 24 }}>
      {alerts.map((a, i) => (
        <div
          key={i}
          style={{
            background: a.severity === 'error' ? 'var(--danger-soft)' : 'color-mix(in oklab, var(--warn) 10%, var(--surface))',
            border: `1px solid color-mix(in oklab, ${a.severity === 'error' ? 'var(--danger)' : 'var(--warn)'} 30%, var(--rule))`,
            borderRadius: 6,
            padding: '12px 16px',
            fontSize: 13,
            color: a.severity === 'error' ? 'var(--danger)' : 'var(--warn)',
            marginBottom: 8,
          }}
        >
          {a.message}
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [flights, setFlights] = useState<UpcomingFlight[]>([])
  const [queue, setQueue] = useState<ActionQueueItem[]>([])
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [window_, setWindow] = useState('30d')

  const load = async () => {
    setLoading(true)
    try {
      const [kpiData, flightData, queueData, alertData] = await Promise.all([
        operatorDashboardService.getKPIs(window_),
        operatorDashboardService.getUpcomingFlights(),
        operatorDashboardService.getActionQueue(),
        operatorDashboardService.getComplianceAlerts(),
      ])
      setKpis(kpiData)
      setFlights(flightData.flights)
      setQueue(queueData.items)
      setAlerts(alertData)
    } catch {
      // keep previous state on refresh failure
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [window_])

  const kpiCards = kpis
    ? [
        { label: 'Pending Requests', value: kpis.pending_requests, color: 'var(--warn)' },
        { label: "Today's Flights", value: kpis.todays_flights, color: 'var(--info)' },
        { label: 'In-Air Now', value: kpis.in_air_now, color: 'var(--accent)' },
        { label: 'Available Aircraft', value: kpis.available_aircraft, color: 'var(--ok)' },
        { label: 'On-Duty Crew', value: kpis.on_duty_crew, color: 'var(--ok)' },
        { label: 'Load Factor', value: `${kpis.load_factor_pct.toFixed(1)}%`, color: 'var(--ink)' },
        { label: 'Period Revenue', value: `₹${formatMoney(kpis.period_revenue_minor)}`, color: 'var(--ink)', sub: window_ },
        { label: 'On-Time %', value: `${kpis.on_time_pct.toFixed(1)}%`, color: kpis.on_time_pct >= 80 ? 'var(--ok)' : 'var(--warn)' },
      ]
    : []

  return (
    <Shell
      activeId="dashboard"
      title="Dashboard"
      subtitle="Your operations overview"
      actions={
        <div style={{ display: 'flex', gap: 4 }}>
          {WINDOW_OPTIONS.map(w => (
            <button
              key={w.value}
              className={`btn sm${window_ === w.value ? ' accent' : ' ghost'}`}
              onClick={() => setWindow(w.value)}
            >
              {w.label}
            </button>
          ))}
        </div>
      }
    >
      <div style={{ padding: isMobile ? '20px 16px' : '28px 32px' }}>

        {/* Compliance alerts */}
        <AlertBanner alerts={alerts} />

        {/* KPI grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 28,
        }}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{
                  background: 'var(--surface)', border: '1px solid var(--rule)',
                  borderRadius: 8, padding: '20px 22px', height: 80,
                  opacity: 0.4,
                }} />
              ))
            : kpiCards.map(c => (
                <StatCard key={c.label} label={c.label} value={c.value} color={c.color} sub={'sub' in c ? c.sub as string : undefined} />
              ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>

          {/* Upcoming Flights */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--rule)',
            borderRadius: 8, padding: 20,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--ink)' }}>
              Upcoming Flights
            </div>
            {loading ? (
              <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading…</p>
            ) : flights.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-3)', fontSize: 13 }}>
                No upcoming flights in the next 72 hours
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {flights.map(f => (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: 'var(--surface-sunk)',
                      border: '1px solid var(--rule)', borderRadius: 6,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{f.route_label}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        {formatDate(f.etd)} · {formatTime(f.etd)} → {formatTime(f.eta)}
                      </div>
                      {f.aircraft_mark && (
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                          {f.aircraft_mark} · {f.pax_count} pax
                        </div>
                      )}
                    </div>
                    <span className={`badge ${f.status === 'confirmed' ? 'ok' : 'info'}`}>
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Queue */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--rule)',
            borderRadius: 8, padding: 20,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--ink)' }}>
              Action Queue
            </div>
            {loading ? (
              <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading…</p>
            ) : queue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-3)', fontSize: 13 }}>
                No pending actions
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {queue.map(item => (
                  <div
                    key={item.id}
                    onClick={() => navigate(item.link_path)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                      padding: '10px 12px', background: 'var(--surface-sunk)',
                      border: `1px solid ${item.priority === 'high' ? 'color-mix(in oklab, var(--danger) 30%, var(--rule))' : 'var(--rule)'}`,
                      borderRadius: 6, cursor: 'pointer',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: item.priority === 'high' ? 'var(--danger)' : 'var(--ink)' }}>
                        {item.label}
                      </div>
                      {item.sub_label && (
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                          {item.sub_label}
                        </div>
                      )}
                      {item.ttl_expires_at && (
                        <div style={{ fontSize: 11, color: 'var(--warn)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                          Expires: {fmtDateTime(item.ttl_expires_at)}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 18, color: 'var(--ink-3)', marginLeft: 8 }}>›</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </Shell>
  )
}
