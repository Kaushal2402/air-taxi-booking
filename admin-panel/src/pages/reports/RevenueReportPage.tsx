import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { reportsService } from '../../services/reportsService'
import type { ReportTemplate, ReportQueryResult } from '../../services/reportsService'
import { formatDate, useCurrencySymbol } from '../../lib/utils'

// Default date range: last 30 days
function defaultDateRange() {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export default function RevenueReportPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const sym = useCurrencySymbol()

  const [template, setTemplate] = useState<ReportTemplate | null>(null)
  const [reportData, setReportData] = useState<ReportQueryResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [dateRange] = useState(defaultDateRange)

  // Derive "by service" bars dynamically from report rows
  const byService = (() => {
    if (!reportData || reportData.rows.length === 0) return []
    const grouped: Record<string, number> = {}
    for (const row of reportData.rows) {
      const key = String(row.service_type || 'Other')
      grouped[key] = (grouped[key] ?? 0) + Number(row.gbv ?? 0)
    }
    const total = Object.values(grouped).reduce((a, b) => a + b, 0) || 1
    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .map(([label, gbv]) => ({
        label,
        pct: Math.round((gbv / total) * 100),
        amt: `${sym} ${gbv.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      }))
  })()

  const load = useCallback(async () => {
    if (!templateId) return
    setLoading(true)
    try {
      const tmpl = await reportsService.getTemplate(templateId)
      setTemplate(tmpl)
      // Run the live query for standard reports
      if (tmpl.is_standard) {
        const data = await reportsService.queryReport({
          report_name: tmpl.name,
          date_from: dateRange.from,
          date_to: dateRange.to,
        })
        setReportData(data)
      }
    } catch {
      // ignore — page still renders with template metadata
    } finally {
      setLoading(false)
    }
  }, [templateId, dateRange])

  useEffect(() => { load() }, [load])

  async function handleExport(format: 'pdf' | 'xlsx') {
    if (!templateId) return
    setExporting(true)
    try {
      await reportsService.runTemplate(templateId, {
        name: template?.name ?? 'Revenue & operations',
        format,
      })
    } catch {
      // ignore
    } finally {
      setExporting(false)
    }
  }

  // SVG chart static data
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const GROSS = [1.8, 2.1, 2.4, 2.2, 2.9, 3.1, 3.4, 3.2, 3.8, 4.1, 4.4, 5.0]
  const NET   = [1.2, 1.4, 1.6, 1.5, 2.0, 2.1, 2.3, 2.2, 2.6, 2.8, 3.0, 3.5]

  // SVG chart helpers
  const W = 620, H = 240, PX = 44, PT = 14, PB = 30, MAX_V = 5.5
  const xPos = (i: number) => PX + i * (W - PX - 16) / (MONTHS.length - 1)
  const yPos = (v: number) => PT + (1 - v / MAX_V) * (H - PT - PB)
  const pathData = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${xPos(i)} ${yPos(v)}`).join(' ')

  const title = template?.name ?? 'Revenue & operations'

  return (
    <Shell
      activeId="reports"
      breadcrumb={`Finance · Reports · ${title}`}
      title={title}
      subtitle={`Generated ${formatDate(new Date().toISOString())} · last 6 months · all services`}
      actions={
        <>
          <button className="btn sm" onClick={() => navigate('/reports')}>← Library</button>
          <button className="btn sm">
            <Icon name="printer" size={13} />Print
          </button>
          <button className="btn sm accent" disabled={exporting} onClick={() => handleExport('pdf')}>
            <Icon name="download" size={13} />{exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </>
      }
    >
      <div style={{ padding: isMobile ? '16px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--ink-4)' }}>
            Loading report…
          </div>
        )}

        {/* KPIs — live data when available */}
        {!isMobile && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)' }}>
            {[
              ['Gross volume', reportData ? `${sym} ${reportData.summary.gbv}` : '—', `${reportData?.summary.completed ?? '—'} completed trips`, 'var(--accent)'],
              ['Net revenue', reportData ? `${sym} ${reportData.summary.net_revenue}` : '—', `Take-rate ${reportData?.summary.take_rate_pct ?? '—'}%`, 'var(--ink-2)'],
              ['Completed trips', reportData ? String(reportData.summary.completed) : '—', `of ${reportData?.summary.total_bookings ?? '—'} total`, 'var(--accent)'],
              ['Completion rate', reportData ? `${reportData.summary.completion_rate_pct}%` : '—', `Cancel ${reportData?.summary.cancellation_rate_pct ?? '—'}%`, 'var(--ink-2)'],
              ['Commission', reportData ? `${sym} ${reportData.summary.platform_commission}` : '—', 'Platform earnings', 'var(--accent)'],
            ].map(([k, v, m, c], i) => (
              <div key={k as string} style={{ padding: '18px 22px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 28 }}>{v}</div>
                <div className="t-meta" style={{ marginTop: 8, color: c as string }}>{m}</div>
              </div>
            ))}
          </div>
        )}

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: 18 }}>
          {/* Trend line chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="t-label">Gross vs net revenue</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>6-month trend · {sym} crore</h3>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span className="t-meta">
                  <span style={{ display: 'inline-block', width: 10, height: 2, background: 'var(--accent)', verticalAlign: 4, marginRight: 6 }} />Gross
                </span>
                <span className="t-meta">
                  <span style={{ display: 'inline-block', width: 10, height: 2, background: 'var(--ink-4)', verticalAlign: 4, marginRight: 6 }} />Net
                </span>
              </div>
            </div>
            <div style={{ padding: '16px 18px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', minWidth: 320, height: 240 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <line key={i} x1={PX} x2={W - 16} y1={PT + i * (H - PT - PB) / 4} y2={PT + i * (H - PT - PB) / 4} stroke="var(--rule-soft)" />
                ))}
                {['5.5', '4.1', '2.8', '1.4'].map((l, i) => (
                  <text key={l} x={PX - 8} y={PT + (i + 1) * (H - PT - PB) / 4 + 3} textAnchor="end" fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono' }}>{l}</text>
                ))}
                <path d={pathData(GROSS)} fill="none" stroke="var(--accent)" strokeWidth="2" />
                <path d={pathData(NET)} fill="none" stroke="var(--ink-4)" strokeWidth="2" strokeDasharray="4 3" />
                {GROSS.map((v, i) => <circle key={i} cx={xPos(i)} cy={yPos(v)} r="3" fill="var(--accent)" />)}
                {MONTHS.map((m, i) => (
                  <text key={m} x={xPos(i)} y={H - 10} textAnchor="middle" fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono' }}>{m}</text>
                ))}
              </svg>
            </div>
          </div>

          {/* By service bars */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Revenue by service</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Share of gross · May</h3>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
              {byService.length === 0 && (
                <div className="t-meta" style={{ padding: '12px 0', textAlign: 'center' }}>{loading ? 'Loading…' : 'No data'}</div>
              )}
              {byService.map(({ label, pct, amt }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5 }}>{label}</span>
                    <span className="t-meta">{amt} · {pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: pct + '%', height: '100%', background: 'var(--accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zone table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">By zone</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Top zones · selected period</h3>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th style={{ textAlign: 'right' }}>Gross</th>
                  {!isMobile && <th style={{ textAlign: 'right' }}>Net</th>}
                  {!isMobile && <th style={{ textAlign: 'right' }}>Trips</th>}
                  {!isMobile && <th style={{ textAlign: 'right' }}>Avg fare</th>}
                  <th style={{ textAlign: 'right' }}>Take-rate</th>
                  <th style={{ textAlign: 'right' }}>MoM</th>
                </tr>
              </thead>
              <tbody>
                {reportData && reportData.rows.length > 0 ? reportData.rows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>{String(row.zone || '—')}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{sym} {String(row.gbv ?? '—')}</td>
                    {!isMobile && <td className="num" style={{ textAlign: 'right' }}>{sym} {String(row.platform_commission ?? '—')}</td>}
                    {!isMobile && <td className="num" style={{ textAlign: 'right' }}>{String(row.completed ?? '—')}</td>}
                    {!isMobile && <td className="num" style={{ textAlign: 'right' }}>{sym} {String(row.net_revenue ?? '—')}</td>}
                    <td className="num" style={{ textAlign: 'right' }}>{String(row.take_rate_pct ?? '—')}%</td>
                    <td className="num" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>{String(row.completion_rate_pct ?? '—')}%</td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-3)' }}>
                    {loading ? 'Loading data…' : 'No data for this period'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  )
}
