import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { reportsService } from '../../services/reportsService'
import type { ReportTemplate } from '../../services/reportsService'
import { formatDate, useCurrencySymbol } from '../../lib/utils'

// Static sample data matching the spec (real data comes from warehouse ETL in production)
const MONTHS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
const GROSS = [3.6, 3.9, 4.1, 4.4, 4.6, 4.82]
const NET = [0.88, 0.95, 1.01, 1.08, 1.13, 1.18]

const BY_SERVICE_RAW = [
  { label: 'Sedan & XL',    pct: 41, amt: '1.98 Cr' },
  { label: 'Air · charter', pct: 28, amt: '1.35 Cr' },
  { label: 'Bike & auto',   pct: 16, amt: '0.77 Cr' },
  { label: 'Air · shuttle', pct: 9,  amt: '0.43 Cr' },
  { label: 'Outstation',    pct: 6,  amt: '0.29 Cr' },
]

const BY_CITY_RAW = [
  { city: 'Bengaluru', gross: '1.62 Cr', net: '41.2 L', trips: '486 K', avg: '333', rate: '25.4%', mom: '+5.1%', up: true },
  { city: 'Mumbai',    gross: '1.18 Cr', net: '28.9 L', trips: '342 K', avg: '345', rate: '24.5%', mom: '+4.2%', up: true },
  { city: 'Delhi NCR', gross: '0.94 Cr', net: '22.1 L', trips: '281 K', avg: '334', rate: '23.5%', mom: '+3.8%', up: true },
  { city: 'Hyderabad', gross: '0.61 Cr', net: '14.8 L', trips: '188 K', avg: '324', rate: '24.3%', mom: '+6.4%', up: true },
  { city: 'Chennai',   gross: '0.47 Cr', net: '11.0 L', trips: '146 K', avg: '322', rate: '23.4%', mom: '−1.2%', up: false },
]

export default function RevenueReportPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const sym = useCurrencySymbol()
  const BY_SERVICE = BY_SERVICE_RAW.map(r => ({ ...r, amt: `${sym} ${r.amt}` }))
  const BY_CITY = BY_CITY_RAW.map(r => ({ ...r, gross: `${sym} ${r.gross}`, net: `${sym} ${r.net}`, avg: `${sym} ${r.avg}` }))

  const [template, setTemplate] = useState<ReportTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    if (!templateId) return
    setLoading(true)
    try {
      const data = await reportsService.getTemplate(templateId)
      setTemplate(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [templateId])

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

        {/* KPIs */}
        {!isMobile && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)' }}>
            {[
              ['Gross volume', `${sym} 4.82 Cr`, '+4.8% MoM', 'var(--accent)'],
              ['Net revenue', `${sym} 1.18 Cr`, 'Take-rate 24.5%', 'var(--ink-2)'],
              ['Completed trips', '1.42 M', '+6.1% MoM', 'var(--accent)'],
              ['Avg fare', `${sym} 339`, '+1.2% MoM', 'var(--ink-2)'],
              ['Contribution', `${sym} 46 L`, 'After incentives', 'var(--accent)'],
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
              {BY_SERVICE.map(({ label, pct, amt }) => (
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

        {/* City table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">By city</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Top markets · May</h3>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>City</th>
                  <th style={{ textAlign: 'right' }}>Gross</th>
                  {!isMobile && <th style={{ textAlign: 'right' }}>Net</th>}
                  {!isMobile && <th style={{ textAlign: 'right' }}>Trips</th>}
                  {!isMobile && <th style={{ textAlign: 'right' }}>Avg fare</th>}
                  <th style={{ textAlign: 'right' }}>Take-rate</th>
                  <th style={{ textAlign: 'right' }}>MoM</th>
                </tr>
              </thead>
              <tbody>
                {BY_CITY.map(row => (
                  <tr key={row.city}>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>{row.city}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{row.gross}</td>
                    {!isMobile && <td className="num" style={{ textAlign: 'right' }}>{row.net}</td>}
                    {!isMobile && <td className="num" style={{ textAlign: 'right' }}>{row.trips}</td>}
                    {!isMobile && <td className="num" style={{ textAlign: 'right' }}>{row.avg}</td>}
                    <td className="num" style={{ textAlign: 'right' }}>{row.rate}</td>
                    <td className="num" style={{ textAlign: 'right', color: row.up ? 'var(--accent)' : 'var(--danger)' }}>{row.mom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  )
}
