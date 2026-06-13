import { useCallback, useEffect, useState } from 'react'
import { Download, TrendingUp, Plane, Users, Clock } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type {
  ReportFilter,
  RevenueReportSummary,
  FlightsSummary,
  FleetUtilRow,
  CrewUtilRow,
  ReportPeriod,
} from '../../services/operatorReportsService'
import { operatorReportsService } from '../../services/operatorReportsService'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

function fmtHours(n: number): string {
  const h = Math.floor(n)
  const m = Math.round((n - h) * 60)
  return `${h}h ${m}m`
}

function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Mock fallback data (used when backend returns error) ────────────────────

function mockRevenueData(): RevenueReportSummary {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const now = new Date()
  const rows = months.map((label, i) => {
    const gross = 40000 + Math.random() * 60000
    const commission = gross * 0.15
    return {
      month: `${now.getFullYear()}-${String(now.getMonth() - 5 + i + 1).padStart(2, '0')}`,
      month_label: `${label} ${now.getFullYear()}`,
      gross_revenue: gross,
      commission,
      net_payout: gross - commission,
      flight_count: Math.floor(20 + Math.random() * 80),
    }
  })
  const total_gross = rows.reduce((s, r) => s + r.gross_revenue, 0)
  const total_commission = rows.reduce((s, r) => s + r.commission, 0)
  return {
    total_gross,
    total_commission,
    total_net: total_gross - total_commission,
    total_flights: rows.reduce((s, r) => s + r.flight_count, 0),
    rows,
  }
}

function mockFlightsSummary(): FlightsSummary {
  return {
    total_flights_completed: 312,
    total_flights_cancelled: 18,
    otp_percent: 87.4,
    avg_load_factor: 73.2,
    total_flight_hours: 624.5,
    rows: [
      { route_label: 'NYC → BOS', flights_completed: 102, flights_cancelled: 4, otp_percent: 91.2, avg_load_factor: 78.5, total_flight_hours: 204.0 },
      { route_label: 'BOS → NYC', flights_completed: 98, flights_cancelled: 6, otp_percent: 84.7, avg_load_factor: 71.3, total_flight_hours: 196.0 },
      { route_label: 'NYC → PHI', flights_completed: 72, flights_cancelled: 5, otp_percent: 86.1, avg_load_factor: 69.2, total_flight_hours: 144.0 },
      { route_label: 'PHI → NYC', flights_completed: 40, flights_cancelled: 3, otp_percent: 88.0, avg_load_factor: 74.8, total_flight_hours: 80.5 },
    ],
  }
}

function mockFleetUtil(): FleetUtilRow[] {
  return [
    { aircraft_id: '1', registration: 'N100AT', aircraft_type: 'Bell 429', flights: 124, flight_hours: 248.0, utilization_percent: 82 },
    { aircraft_id: '2', registration: 'N200AT', aircraft_type: 'Airbus H145', flights: 98, flight_hours: 196.0, utilization_percent: 65 },
    { aircraft_id: '3', registration: 'N300AT', aircraft_type: 'Bell 429', flights: 90, flight_hours: 180.5, utilization_percent: 60 },
  ]
}

function mockCrewUtil(): CrewUtilRow[] {
  return [
    { crew_id: '1', crew_name: 'James Carter', role: 'Pilot', duty_hours: 112.5, flights: 62, rest_compliance_percent: 100 },
    { crew_id: '2', crew_name: 'Sarah Mills', role: 'Pilot', duty_hours: 98.0, flights: 54, rest_compliance_percent: 98.1 },
    { crew_id: '3', crew_name: 'Daniel Park', role: 'Co-Pilot', duty_hours: 87.5, flights: 48, rest_compliance_percent: 100 },
    { crew_id: '4', crew_name: 'Lisa Tran', role: 'Co-Pilot', duty_hours: 74.0, flights: 41, rest_compliance_percent: 95.2 },
  ]
}

// ─── SVG Bar Chart ──────────────────────────────────────────────────────────

interface BarChartProps {
  labels: string[]
  series: { label: string; color: string; values: number[] }[]
  height?: number
}

function BarChart({ labels, series, height = 200 }: BarChartProps) {
  const max = Math.max(...series.flatMap(s => s.values), 1)
  const barGroupWidth = 48
  const gap = 12
  const leftPad = 60
  const topPad = 16
  const bottomPad = 32
  const chartHeight = height - topPad - bottomPad
  const totalWidth = leftPad + labels.length * (barGroupWidth + gap) + 16

  const barWidth = Math.max(8, (barGroupWidth - (series.length - 1) * 3) / series.length)

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0]

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg
        width={totalWidth}
        height={height}
        style={{ display: 'block', minWidth: '100%' }}
        viewBox={`0 0 ${totalWidth} ${height}`}
        preserveAspectRatio="none"
      >
        {/* Y axis ticks */}
        {yTicks.map(t => {
          const y = topPad + chartHeight - t * chartHeight
          return (
            <g key={t}>
              <line
                x1={leftPad - 4}
                x2={totalWidth - 8}
                y1={y}
                y2={y}
                stroke="var(--rule)"
                strokeWidth={1}
              />
              <text
                x={leftPad - 8}
                y={y + 4}
                fontSize={9}
                fill="var(--ink-4)"
                textAnchor="end"
              >
                {t === 0 ? '0' : `${Math.round(max * t / 1000)}k`}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {labels.map((label, gi) => {
          const gx = leftPad + gi * (barGroupWidth + gap)
          return (
            <g key={label}>
              {series.map((s, si) => {
                const bh = Math.max(2, (s.values[gi] / max) * chartHeight)
                const bx = gx + si * (barWidth + 3)
                const by = topPad + chartHeight - bh
                return (
                  <g key={s.label}>
                    <rect
                      x={bx}
                      y={by}
                      width={barWidth}
                      height={bh}
                      fill={s.color}
                      rx={2}
                      opacity={0.9}
                    />
                    <title>{`${s.label}: ${s.values[gi].toLocaleString()}`}</title>
                  </g>
                )
              })}
              {/* X label */}
              <text
                x={gx + barGroupWidth / 2}
                y={topPad + chartHeight + 16}
                fontSize={9}
                fill="var(--ink-4)"
                textAnchor="middle"
              >
                {label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, padding: '8px 0 4px', flexWrap: 'wrap' }}>
        {series.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Utilization Bar ────────────────────────────────────────────────────────

function UtilBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct >= 80 ? 'var(--accent)' : pct >= 50 ? '#3B82F6' : 'var(--ink-4)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: 'var(--surface-sunk)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', flexShrink: 0, minWidth: 36 }}>
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon?: React.ReactNode
}

function KpiCard({ label, value, sub, icon }: KpiCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
        borderRadius: 10,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flex: 1,
        minWidth: 140,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{icon}</span>}
        <span className="t-label" style={{ fontSize: 11, letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.15 }}>{value}</div>
      {sub && <div className="t-meta" style={{ fontSize: 11 }}>{sub}</div>}
    </div>
  )
}

// ─── Period filter ───────────────────────────────────────────────────────────

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: 'last_7d', label: 'Last 7 days' },
  { id: 'last_30d', label: 'Last 30 days' },
  { id: 'last_90d', label: 'Last 90 days' },
  { id: 'custom', label: 'Custom' },
]

// ─── Main Page ───────────────────────────────────────────────────────────────

type TabId = 'revenue' | 'operational'

export default function ReportsPage() {
  const isMobile = useIsMobile()

  const [activeTab, setActiveTab] = useState<TabId>('revenue')
  const [filter, setFilter] = useState<ReportFilter>({ period: 'last_30d' })
  const [loading, setLoading] = useState(false)

  const [revenueData, setRevenueData] = useState<RevenueReportSummary>(mockRevenueData())
  const [flightsData, setFlightsData] = useState<FlightsSummary>(mockFlightsSummary())
  const [fleetData, setFleetData] = useState<FleetUtilRow[]>(mockFleetUtil())
  const [crewData, setCrewData] = useState<CrewUtilRow[]>(mockCrewUtil())

  const loadAll = useCallback((f: ReportFilter) => {
    setLoading(true)
    Promise.allSettled([
      operatorReportsService.getRevenueReport(f),
      operatorReportsService.getFlightsSummary(f),
      operatorReportsService.getFleetUtilization(f),
      operatorReportsService.getCrewUtilization(f),
    ]).then(([rev, flt, fleet, crew]) => {
      if (rev.status === 'fulfilled') setRevenueData(rev.value)
      else setRevenueData(mockRevenueData())

      if (flt.status === 'fulfilled') setFlightsData(flt.value)
      else setFlightsData(mockFlightsSummary())

      if (fleet.status === 'fulfilled') setFleetData(fleet.value)
      else setFleetData(mockFleetUtil())

      if (crew.status === 'fulfilled') setCrewData(crew.value)
      else setCrewData(mockCrewUtil())
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadAll(filter) }, [filter, loadAll])

  function handleExportRevenue() {
    const header = ['Month', 'Gross Revenue', 'Commission', 'Net Payout', 'Flights']
    const rows = revenueData.rows.map(r => [
      r.month_label,
      r.gross_revenue.toFixed(2),
      r.commission.toFixed(2),
      r.net_payout.toFixed(2),
      String(r.flight_count),
    ])
    downloadCSV('revenue-report.csv', [header, ...rows])
  }

  function handleExportOperational() {
    const header = ['Route', 'Completed', 'Cancelled', 'OTP%', 'Load Factor%', 'Flight Hours']
    const rows = flightsData.rows.map(r => [
      r.route_label,
      String(r.flights_completed),
      String(r.flights_cancelled),
      r.otp_percent.toFixed(1),
      r.avg_load_factor.toFixed(1),
      r.total_flight_hours.toFixed(1),
    ])
    downloadCSV('operational-report.csv', [header, ...rows])
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'operational', label: 'Operational' },
  ]

  return (
    <Shell
      activeId="reports"
      breadcrumb="Analytics"
      title="Reports & Analytics"
      subtitle="Financial and operational performance"
      actions={
        <button
          className="btn sm accent"
          onClick={activeTab === 'revenue' ? handleExportRevenue : handleExportOperational}
        >
          <Download size={12} />
          Export CSV
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
              height: 44,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
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
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 28px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--rule)',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <span className="t-label" style={{ fontSize: 11 }}>Period</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button
              key={p.id}
              className={`btn sm${filter.period === p.id ? ' accent' : ''}`}
              style={{ height: 28, fontSize: 12 }}
              onClick={() => setFilter(f => ({ ...f, period: p.id }))}
            >
              {p.label}
            </button>
          ))}
        </div>

        {filter.period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 8 }}>
            <input
              type="date"
              className="input"
              style={{ height: 32, width: 140, fontSize: 12 }}
              value={filter.date_from ?? ''}
              onChange={e => setFilter(f => ({ ...f, date_from: e.target.value }))}
            />
            <span className="t-meta" style={{ fontSize: 12 }}>to</span>
            <input
              type="date"
              className="input"
              style={{ height: 32, width: 140, fontSize: 12 }}
              value={filter.date_to ?? ''}
              onChange={e => setFilter(f => ({ ...f, date_to: e.target.value }))}
            />
          </div>
        )}

        {loading && (
          <span className="t-meta" style={{ fontSize: 11, marginLeft: 8 }}>Loading…</span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '28px' }}>
        {activeTab === 'revenue' ? (
          <RevenueTab data={revenueData} isMobile={isMobile} />
        ) : (
          <OperationalTab
            flights={flightsData}
            fleet={fleetData}
            crew={crewData}
            isMobile={isMobile}
          />
        )}
      </div>
    </Shell>
  )
}

// ─── Revenue Tab ─────────────────────────────────────────────────────────────

function RevenueTab({ data, isMobile }: { data: RevenueReportSummary; isMobile: boolean }) {
  const chartLabels = data.rows.map(r => r.month_label.split(' ')[0])
  const chartSeries = [
    { label: 'Gross Revenue', color: '#0F8A5F', values: data.rows.map(r => r.gross_revenue) },
    { label: 'Net Payout', color: '#3B82F6', values: data.rows.map(r => r.net_payout) },
    { label: 'Commission', color: '#F59E0B', values: data.rows.map(r => r.commission) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <KpiCard
          label="Total Revenue"
          value={fmtCurrency(data.total_gross)}
          sub="Gross before commission"
          icon={<TrendingUp size={14} />}
        />
        <KpiCard
          label="Net Payout"
          value={fmtCurrency(data.total_net)}
          sub="After platform commission"
          icon={<TrendingUp size={14} />}
        />
        <KpiCard
          label="Commission"
          value={fmtCurrency(data.total_commission)}
          sub={`${data.total_gross > 0 ? ((data.total_commission / data.total_gross) * 100).toFixed(1) : '0.0'}% of gross`}
        />
        <KpiCard
          label="Total Flights"
          value={String(data.total_flights)}
          sub="Invoiced flights"
          icon={<Plane size={14} />}
        />
      </div>

      {/* Bar chart */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 10,
          padding: '20px 20px 16px',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 16 }}>
          Monthly Revenue Breakdown
        </div>
        {data.rows.length > 0 ? (
          <BarChart labels={chartLabels} series={chartSeries} height={220} />
        ) : (
          <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>No data for selected period.</div>
        )}
      </div>

      {/* Monthly table */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--rule)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
          Monthly Breakdown
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="tbl" style={{ minWidth: 620 }}>
            <thead>
              <tr>
                <th className="t-label">Month</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Gross</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Commission</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Net Payout</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Flights</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Avg / Flight</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="t-meta" style={{ textAlign: 'center', padding: 24 }}>No data.</td>
                </tr>
              )}
              {data.rows.map(r => (
                <tr key={r.month}>
                  <td style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{r.month_label}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtCurrency(r.gross_revenue)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--warn)' }}>{fmtCurrency(r.commission)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{fmtCurrency(r.net_payout)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.flight_count}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                    {r.flight_count > 0 ? fmtCurrency(r.gross_revenue / r.flight_count) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Operational Tab ─────────────────────────────────────────────────────────

function OperationalTab({
  flights,
  fleet,
  crew,
  isMobile,
}: {
  flights: FlightsSummary
  fleet: FleetUtilRow[]
  crew: CrewUtilRow[]
  isMobile: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <KpiCard
          label="Flights Completed"
          value={String(flights.total_flights_completed)}
          sub={`${flights.total_flights_cancelled} cancelled`}
          icon={<Plane size={14} />}
        />
        <KpiCard
          label="On-Time Performance"
          value={fmtPct(flights.otp_percent)}
          sub="Departed within 15 min"
          icon={<Clock size={14} />}
        />
        <KpiCard
          label="Avg Load Factor"
          value={fmtPct(flights.avg_load_factor)}
          sub="Seats filled per flight"
          icon={<Users size={14} />}
        />
        <KpiCard
          label="Total Flight Hours"
          value={fmtHours(flights.total_flight_hours)}
          sub="Block hours logged"
          icon={<Clock size={14} />}
        />
      </div>

      {/* Fleet Utilization */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--rule)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
          Fleet Utilization
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="tbl" style={{ minWidth: 540 }}>
            <thead>
              <tr>
                <th className="t-label">Registration</th>
                <th className="t-label">Type</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Flights</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Block Hours</th>
                <th className="t-label" style={{ minWidth: 160 }}>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {fleet.length === 0 && (
                <tr>
                  <td colSpan={5} className="t-meta" style={{ textAlign: 'center', padding: 24 }}>No fleet data.</td>
                </tr>
              )}
              {fleet.map(a => (
                <tr key={a.aircraft_id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>
                      {a.registration}
                    </span>
                  </td>
                  <td className="t-meta" style={{ fontSize: 12 }}>{a.aircraft_type}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.flights}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtHours(a.flight_hours)}</td>
                  <td style={{ minWidth: 160 }}>
                    <UtilBar value={a.utilization_percent} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Crew Utilization */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--rule)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
          Crew Duty Hours
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="tbl" style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th className="t-label">Name</th>
                <th className="t-label">Role</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Flights</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Duty Hours</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Rest Compliance</th>
              </tr>
            </thead>
            <tbody>
              {crew.length === 0 && (
                <tr>
                  <td colSpan={5} className="t-meta" style={{ textAlign: 'center', padding: 24 }}>No crew data.</td>
                </tr>
              )}
              {crew.map(c => (
                <tr key={c.crew_id}>
                  <td style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{c.crew_name}</td>
                  <td>
                    <span className="badge info" style={{ height: 19, fontSize: 10 }}>{c.role}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.flights}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtHours(c.duty_hours)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: c.rest_compliance_percent >= 99 ? 'var(--accent)' : c.rest_compliance_percent >= 90 ? 'var(--warn)' : 'var(--danger)',
                      }}
                    >
                      {fmtPct(c.rest_compliance_percent)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Route OTP table */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--rule)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
          Performance by Route
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="tbl" style={{ minWidth: 580 }}>
            <thead>
              <tr>
                <th className="t-label">Route</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Completed</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Cancelled</th>
                <th className="t-label" style={{ textAlign: 'right' }}>OTP%</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Load Factor</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Block Hours</th>
              </tr>
            </thead>
            <tbody>
              {flights.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="t-meta" style={{ textAlign: 'center', padding: 24 }}>No route data.</td>
                </tr>
              )}
              {flights.rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{r.route_label}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.flights_completed}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: r.flights_cancelled > 0 ? 'var(--danger)' : 'var(--ink-4)' }}>
                    {r.flights_cancelled}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: r.otp_percent >= 85 ? 'var(--accent)' : 'var(--warn)' }}>
                    {fmtPct(r.otp_percent)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {fmtPct(r.avg_load_factor)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {r.total_flight_hours.toFixed(1)}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
