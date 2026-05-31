import { useState, useEffect } from 'react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { promotionsService } from '../../services/promotionsService'
import type { PromotionAnalytics } from '../../services/promotionsService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMinor = (v: number) => `₹${(v / 100).toLocaleString('en-IN')}`

// ── Bar Chart ─────────────────────────────────────────────────────────────────

interface BarChartProps {
  series: { date: string; count: number; spent_minor: number }[]
  height?: number
}

function BarChart({ series, height = 220 }: BarChartProps) {
  const w = 880
  const padX = 40
  const padT = 16
  const padB = 28

  if (series.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
        No data for this period
      </div>
    )
  }

  const max = Math.max(...series.map(d => d.count), 1)
  const bw = (w - padX - 20) / series.length

  const yLabels = ['', '25%', '50%', '75%', '100%'].reverse().slice(1)
  const gridLines = [0, 1, 2, 3, 4]

  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      {/* Grid lines */}
      {gridLines.map(i => (
        <line
          key={i}
          x1={padX} x2={w - 20}
          y1={padT + i * (height - padT - padB) / 4}
          y2={padT + i * (height - padT - padB) / 4}
          stroke="var(--rule-soft)"
        />
      ))}
      {/* Y-axis labels */}
      {yLabels.map((_, i) => {
        const val = Math.round(max * (1 - (i + 1) / 4))
        return (
          <text key={i} x={padX - 6} y={padT + (i + 1) * (height - padT - padB) / 4 + 3}
            textAnchor="end" fill="var(--ink-3)"
            style={{ font: '10px IBM Plex Mono' }}>
            {val >= 1000 ? `${(val / 1000).toFixed(1)}K` : String(val)}
          </text>
        )
      })}
      {/* Bars */}
      {series.map((d, i) => {
        const bh = Math.max((d.count / max) * (height - padT - padB), 1)
        const isLast = i === series.length - 1
        return (
          <g key={i}>
            <rect
              x={padX + i * bw + 3}
              y={height - padB - bh}
              width={Math.max(bw - 6, 1)}
              height={bh}
              fill={isLast ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 45%, var(--surface-2))'}
            />
            {i % 2 === 0 && (
              <text
                x={padX + i * bw + bw / 2}
                y={height - 10}
                textAnchor="middle"
                fill="var(--ink-3)"
                style={{ font: '9px IBM Plex Mono' }}>
                {d.date.slice(-2)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function exportAnalyticsCsv(analytics: PromotionAnalytics, days: number) {
  const rows: string[][] = [
    ['Date', 'Redemptions', 'Amount Spent (₹)'],
    ...analytics.daily_series.map(d => [d.date, String(d.count), (d.spent_minor / 100).toFixed(2)]),
    [],
    ['Code', 'Redemptions', 'Spent (₹)', 'Share (%)'],
    ...analytics.by_promo.map(r => [r.code, String(r.redemptions), (r.spent_minor / 100).toFixed(2), String(r.pct)]),
  ]
  const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `redemption-analytics-${days}d-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function RedemptionAnalyticsPage() {
  const isMobile = useIsMobile()
  const [days, setDays] = useState(14)
  const [analytics, setAnalytics] = useState<PromotionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async (d: number) => {
    setLoading(true)
    try {
      const data = await promotionsService.getAnalytics(d)
      setAnalytics(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load(days) }, [days])

  const kpis = analytics ? [
    { label: `Redemptions · ${days}d`, value: analytics.total_redemptions.toLocaleString('en-IN'), meta: 'Total', color: 'var(--accent)' },
    { label: 'Budget consumed', value: fmtMinor(analytics.total_budget_spent_minor), meta: 'Spent so far', color: 'var(--warn)' },
    { label: 'Avg discount', value: fmtMinor(analytics.avg_discount_minor), meta: 'Per redemption', color: 'var(--ink-2)' },
    { label: 'New customers', value: analytics.new_customers.toLocaleString('en-IN'), meta: 'From promo codes', color: 'var(--accent)' },
    { label: 'Blended CPA', value: fmtMinor(analytics.blended_cpa_minor), meta: 'Target ≤ ₹100', color: 'var(--accent)' },
  ] : []

  return (
    <Shell
      activeId="promotions"
      breadcrumb="Catalog & Pricing · Growth · Analytics"
      title="Redemption analytics"
      subtitle={`All promotions · last ${days} days`}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn ghost sm" onClick={() => analytics && exportAnalyticsCsv(analytics, days)} disabled={!analytics}>
            <Icon name="download" size={13} />Export
          </button>
          <div className="input" style={{ height: 30, padding: 0, paddingLeft: 10, width: 140 }}>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 12 }}>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
        </div>
      }
    >
      {loading ? (
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ padding: isMobile ? '16px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* KPI strip */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--rule)',
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : `repeat(${kpis.length}, 1fr)`,
          }}>
            {kpis.map((k, i) => (
              <div key={k.label} style={{
                padding: isMobile ? '12px 14px' : '18px 22px',
                borderRight: isMobile
                  ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                  : (i < kpis.length - 1 ? '1px solid var(--rule)' : 'none'),
                borderBottom: isMobile && i < kpis.length - 2 ? '1px solid var(--rule)' : 'none',
              }}>
                <div className="t-label" style={{ padding: 0 }}>{k.label}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 22 : 28, fontWeight: 400 }}>{k.value}</div>
                <div className="t-meta" style={{ marginTop: 8, color: k.color }}>{k.meta}</div>
              </div>
            ))}
          </div>

          {/* Two-column layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr',
            gap: 18,
          }}>
            {/* Bar chart */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                <div className="t-label">Redemptions per day</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  Rolling {days} days
                </h3>
              </div>
              <div style={{ padding: '16px 18px' }}>
                <BarChart series={analytics?.daily_series ?? []} height={isMobile ? 160 : 220} />
              </div>
            </div>

            {/* By promo breakdown */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                <div className="t-label">By promo · spend share</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  Where the budget goes
                </h3>
              </div>
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!analytics || analytics.by_promo.length === 0 ? (
                  <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '8px 0' }}>No redemption data</div>
                ) : (
                  analytics.by_promo.map(row => (
                    <div key={row.code}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.code}</span>
                        <span className="t-meta">{fmtMinor(row.spent_minor)} · {row.pct % 1 === 0 ? row.pct : row.pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${row.pct}%`, height: '100%', background: 'var(--accent)' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
