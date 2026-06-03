import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { reportsService } from '../../services/reportsService'
import type { ReportFrequency, ReportFormat } from '../../services/reportsService'

const ALL_DIMENSIONS = ['Service', 'City', 'Date', 'Payment method', 'Driver', 'Operator', 'Promo code', 'Vehicle class']
const ALL_METRICS: Array<[string, boolean]> = [
  ['Gross volume', true], ['Net revenue', true], ['Completed trips', true],
  ['Avg fare', true], ['Take-rate %', false], ['Cancellations', false],
  ['Refunds', false], ['Incentive spend', false],
]

const SAMPLE_ROWS = [
  ['Sedan & XL', 'Bengaluru', '₹ 68.4 L', '₹ 17.3 L', '198 K', '₹ 345'],
  ['Sedan & XL', 'Mumbai', '₹ 52.1 L', '₹ 12.9 L', '146 K', '₹ 357'],
  ['Bike & auto', 'Bengaluru', '₹ 22.8 L', '₹ 4.1 L', '212 K', '₹ 108'],
  ['Air · charter', 'Mumbai', '₹ 41.2 L', '₹ 9.8 L', '184', '₹ 2.24 L'],
  ['Air · shuttle', 'Bengaluru', '₹ 18.6 L', '₹ 4.3 L', '264', '₹ 7,045'],
  ['Outstation', 'Delhi NCR', '₹ 14.2 L', '₹ 3.1 L', '8.4 K', '₹ 1,690'],
  ['Sedan & XL', 'Hyderabad', '₹ 31.0 L', '₹ 7.5 L', '92 K', '₹ 337'],
]

export default function ReportBuilderPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [selectedDims, setSelectedDims] = useState<string[]>(['Service', 'City', 'Date'])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['Gross volume', 'Net revenue', 'Completed trips', 'Avg fare'])
  const [dateRange, setDateRange] = useState('Last 30 days')
  const [compareTo, setCompareTo] = useState('Prior period')
  const [service, setService] = useState('All services')
  const [city, setCity] = useState('All cities')
  const [frequency, setFrequency] = useState<ReportFrequency>('weekly')
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [recipients, setRecipients] = useState('')
  const [reportName, setReportName] = useState('')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)

  function toggleDim(d: string) {
    setSelectedDims(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function toggleMetric(m: string) {
    setSelectedMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  async function handleSaveTemplate() {
    if (!reportName.trim()) return
    setSaving(true)
    try {
      await reportsService.createTemplate({
        name: reportName,
        description: `Custom: ${selectedDims.join(', ')} × ${selectedMetrics.join(', ')}`,
        config: { dimensions: selectedDims, metrics: selectedMetrics, date_range: dateRange, service, city },
      })
      navigate('/reports')
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  async function handleRunOnce() {
    setRunning(true)
    try {
      await reportsService.createExport({
        name: reportName || 'Custom report',
        format,
        config: { dimensions: selectedDims, metrics: selectedMetrics, date_range: dateRange, service, city },
      })
      navigate('/reports/exports')
    } catch {
      // ignore
    } finally {
      setRunning(false)
    }
  }

  return (
    <Shell
      activeId="reports"
      breadcrumb="Finance · Reports · Builder"
      title="Build report"
      subtitle="Custom · dimensions, metrics, filters & schedule"
      actions={
        <>
          <button className="btn sm" disabled={!reportName.trim() || saving} onClick={handleSaveTemplate}>
            {saving ? 'Saving…' : 'Save as template'}
          </button>
          <button className="btn sm accent" disabled={running} onClick={handleRunOnce}>
            <Icon name="check" size={13} />{running ? 'Running…' : 'Run & schedule'}
          </button>
        </>
      }
    >
      <div style={{
        padding: isMobile ? '16px' : '24px 32px 28px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1.3fr',
        gap: 24,
      }}>
        {/* Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Report name */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 10 }}>Report name</div>
            <input
              className="input"
              style={{ width: '100%', height: 36, padding: '0 10px' }}
              placeholder="e.g. Weekly revenue by city"
              value={reportName}
              onChange={e => setReportName(e.target.value)}
            />
          </div>

          {/* Dimensions */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Dimensions · group by</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ALL_DIMENSIONS.map(d => {
                const on = selectedDims.includes(d)
                return (
                  <button
                    key={d}
                    className="btn sm"
                    style={{
                      borderStyle: on ? 'solid' : 'dashed',
                      borderColor: on ? 'var(--accent)' : 'var(--rule-strong)',
                      background: on ? 'color-mix(in oklab, var(--accent) 12%, var(--surface))' : 'var(--surface)',
                      color: on ? 'var(--accent)' : 'var(--ink-2)',
                    }}
                    onClick={() => toggleDim(d)}
                  >
                    <Icon name={on ? 'check' : 'plus'} size={11} />{d}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Metrics */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ALL_METRICS.map(([m]) => {
                const on = selectedMetrics.includes(m)
                return (
                  <div
                    key={m}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, cursor: 'pointer' }}
                    onClick={() => toggleMetric(m)}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                      border: '1px solid ' + (on ? 'var(--accent)' : 'var(--rule-strong)'),
                      background: on ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    }}>
                      {on && <Icon name="check" size={11} />}
                    </div>
                    <span style={{ fontSize: 12.5 }}>{m}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Filters */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Filters & range</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Date range', dateRange, setDateRange, ['Last 7 days', 'Last 30 days', 'Last 90 days', 'This month', 'Last month', 'Last 6 months']],
                ['Compare to', compareTo, setCompareTo, ['Prior period', 'Prior year', 'None']],
                ['Service', service, setService, ['All services', 'Sedan & XL', 'Bike & auto', 'Air · charter', 'Air · shuttle', 'Outstation']],
                ['City', city, setCity, ['All cities', 'Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai']],
              ].map(([label, val, setter, opts]) => (
                <div key={label as string} className="field">
                  <div className="field-label">{label as string}</div>
                  <select
                    className="input"
                    style={{ width: '100%', height: 36, padding: '0 10px' }}
                    value={val as string}
                    onChange={e => (setter as (v: string) => void)(e.target.value)}
                  >
                    {(opts as string[]).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 4 }}>Schedule & delivery</div>
            <div className="t-meta" style={{ marginBottom: 14 }}>Leave off to run once. Scheduled reports deliver to recipients as the chosen format.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="field">
                <div className="field-label">Frequency</div>
                <select className="input" style={{ width: '100%', height: 36, padding: '0 10px' }} value={frequency} onChange={e => setFrequency(e.target.value as ReportFrequency)}>
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="field">
                <div className="field-label">Format</div>
                <select className="input" style={{ width: '100%', height: 36, padding: '0 10px' }} value={format} onChange={e => setFormat(e.target.value as ReportFormat)}>
                  <option value="pdf">PDF</option>
                  <option value="xlsx">XLSX</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
            </div>
            <div className="field">
              <div className="field-label">Recipients</div>
              <input
                className="input"
                style={{ width: '100%', height: 36, padding: '0 10px' }}
                placeholder="email@company.com, another@company.com"
                value={recipients}
                onChange={e => setRecipients(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="t-label">Live preview</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                {selectedDims.slice(0, 3).join(' × ')} · {selectedMetrics.slice(0, 2).join(', ')}
              </h3>
            </div>
            <span className="badge"><Icon name="eye" size={11} />Sample · {dateRange}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    {selectedDims.slice(0, 2).map(d => <th key={d}>{d}</th>)}
                    {selectedMetrics.slice(0, 4).map(m => <th key={m} style={{ textAlign: 'right' }}>{m}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ROWS.map((row, i) => (
                    <tr key={i}>
                      {selectedDims.slice(0, 2).map((_, di) => (
                        <td key={di} style={{ fontSize: 12.5 }}>{row[di]}</td>
                      ))}
                      {selectedMetrics.slice(0, 4).map((_, mi) => (
                        <td key={mi} className="num" style={{ textAlign: 'right' }}>{row[mi + 2] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="t-meta">{selectedDims.length} dimensions · {selectedMetrics.length} metrics · {SAMPLE_ROWS.length} of ~1,240 rows</span>
            <span className="t-meta t-mono">~ 1,240 rows · est. 2.1 MB</span>
          </div>
        </div>
      </div>
    </Shell>
  )
}
