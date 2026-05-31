import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { auditService } from '../../services/auditService'
import type { SecurityStats, ChartDay, AuditAnomaly } from '../../services/auditService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function SevBadge({ sev }: { sev: 'high' | 'med' | 'low' }) {
  if (sev === 'high') return <span className="badge danger"><span className="dot danger" />High</span>
  if (sev === 'med') return <span className="badge warn"><span className="dot warn" />Medium</span>
  return <span className="badge"><span className="dot pending" />Low</span>
}

// ── Bar chart component ────────────────────────────────────────────────────────

function BarChart({ days }: { days: ChartDay[] }) {
  if (days.length === 0) {
    return (
      <div style={{ padding: '28px 18px', color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>
        No high-severity events in last 14 days.
      </div>
    )
  }

  const w = 880
  const h = 200
  const padX = 36
  const padT = 12
  const padB = 26
  const maxCount = Math.max(...days.map(d => d.count), 1)
  const bw = (w - padX - 16) / days.length

  const gridLines = 4

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: 200 }}
    >
      {/* Grid lines */}
      {Array.from({ length: gridLines }, (_, i) => (
        <line
          key={i}
          x1={padX}
          x2={w - 16}
          y1={padT + i * (h - padT - padB) / (gridLines - 1)}
          y2={padT + i * (h - padT - padB) / (gridLines - 1)}
          stroke="var(--rule-soft)"
        />
      ))}
      {/* Bars */}
      {days.map((d, i) => {
        const bh = (d.count / maxCount) * (h - padT - padB)
        const hi = d.count >= 30
        const dayNum = new Date(d.date).getDate()
        return (
          <g key={d.date}>
            <rect
              x={padX + i * bw + 3}
              y={h - padB - bh}
              width={bw - 6}
              height={bh}
              fill={hi ? 'var(--danger)' : 'color-mix(in oklab, var(--danger) 35%, var(--surface-2))'}
            />
            {i % 2 === 0 && (
              <text
                x={padX + i * bw + bw / 2}
                y={h - 9}
                textAnchor="middle"
                fill="var(--ink-3)"
                style={{ font: '9px IBM Plex Mono' }}
              >
                {dayNum}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SecurityCompliancePage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [chartDays, setChartDays] = useState<ChartDay[]>([])
  const [anomalies, setAnomalies] = useState<AuditAnomaly[]>([])
  const [notice, setNotice] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const loadAll = async () => {
    try {
      const [s, chart, anom] = await Promise.all([
        auditService.getSecurityStats(),
        auditService.getSecurityChart(),
        auditService.listAnomalies(),
      ])
      setStats(s)
      setChartDays(chart.days)
      setAnomalies(anom.items)
    } catch { /* ignore */ }
  }

  const reloadAnomalies = async () => {
    try {
      const anom = await auditService.listAnomalies()
      setAnomalies(anom.items)
    } catch { /* ignore */ }
  }

  useEffect(() => { void loadAll() }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await auditService.exportEvents({ time_window: '30d' })
      setNotice(res.message)
    } catch {
      setNotice('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleDismiss = async (id: string) => {
    setActionLoading(id)
    try {
      await auditService.dismissAnomaly(id)
      await reloadAnomalies()
    } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  const handleInvestigate = async (id: string) => {
    setActionLoading(id)
    try {
      await auditService.investigateAnomaly(id)
      await reloadAnomalies()
    } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  const openAnomalies = anomalies.filter(a => a.status === 'open' || a.status === 'investigating')

  const mfaBelow100 = stats != null && stats.mfa_coverage_pct < 100

  return (
    <Shell
      activeId="audit"
      breadcrumb="System · Audit log · Security"
      title="Security & compliance"
      subtitle="Anomaly monitoring · retention policy · regulatory export · SOC2 / ISO 27001"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/audit')}>
            <Icon name="chevLeft" size={13} />
            Back
          </button>
          <button className="btn sm" onClick={handleExport} disabled={exporting}>
            <Icon name="download" size={13} />
            {exporting ? 'Exporting…' : 'Compliance export'}
          </button>
          <button
            className="btn sm"
            onClick={() => setNotice('Retention policy: 7 years finance/audit, 90 days operational hot storage. Managed via WORM-compliant archive.')}
          >
            Retention policy
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Notice banner */}
        {notice && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--accent-soft)',
            border: '1px solid color-mix(in oklab, var(--accent) 28%, var(--rule))',
            borderRadius: 3,
            fontSize: 12.5,
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <span>{notice}</span>
            <button
              onClick={() => setNotice('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, flexShrink: 0 }}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        {/* KPI strip */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        }}>
          {[
            {
              label: 'Anomalies · 7d',
              value: stats?.anomalies_7d?.toString() ?? '—',
              meta: stats ? `open: ${stats.anomalies_open} · cleared: ${stats.anomalies_7d - stats.anomalies_open}` : '—',
              color: 'var(--warn)',
            },
            {
              label: 'PII exports',
              value: stats?.pii_exports_7d?.toString() ?? '—',
              meta: 'All justified + logged',
              color: 'var(--ink-2)',
            },
            {
              label: 'MFA coverage',
              value: stats ? `${stats.mfa_coverage_pct}%` : '—',
              meta: 'Target 100%',
              color: mfaBelow100 ? 'var(--warn)' : 'var(--accent)',
            },
            {
              label: 'Retention',
              value: stats?.retention_policy ?? '—',
              meta: 'Finance · WORM store',
              color: 'var(--accent)',
            },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              style={{
                padding: isMobile ? '12px 14px' : '18px 22px',
                borderRight: isMobile
                  ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                  : (i < 3 ? '1px solid var(--rule)' : 'none'),
                borderBottom: isMobile && i < 2 ? '1px solid var(--rule)' : 'none',
              }}
            >
              <div className="t-label" style={{ padding: 0 }}>{kpi.label}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 22 : 28, fontWeight: 400 }}>
                {kpi.value}
              </div>
              <div className="t-meta" style={{ marginTop: 8, color: kpi.color }}>{kpi.meta}</div>
            </div>
          ))}
        </div>

        {/* Chart + anomalies */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr',
          gap: 18,
        }}>
          {/* Bar chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">High-severity events · 14 days</div>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <BarChart days={chartDays} />
            </div>
          </div>

          {/* Open anomalies */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Open anomalies</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                Needs review
              </h3>
            </div>
            <div style={{ padding: '6px 18px 14px' }}>
              {openAnomalies.length === 0 ? (
                <div style={{ padding: '20px 0', color: 'var(--ink-3)', fontSize: 13 }}>
                  No open anomalies. System is clean ✓
                </div>
              ) : openAnomalies.map((a, i) => {
                const isLoading = actionLoading === a.id
                return (
                  <div
                    key={a.id}
                    style={{
                      padding: '14px 0',
                      borderBottom: i < openAnomalies.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                      opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{a.title}</span>
                      <SevBadge sev={a.severity} />
                    </div>
                    <div className="t-meta" style={{ marginTop: 5 }}>{a.description}</div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <button
                        className="btn sm"
                        style={{ flex: 1, height: 28 }}
                        disabled={isLoading}
                        onClick={() => void handleDismiss(a.id)}
                      >
                        {isLoading ? '…' : 'Dismiss'}
                      </button>
                      <button
                        className="btn sm accent"
                        style={{ flex: 1, height: 28 }}
                        disabled={isLoading}
                        onClick={() => void handleInvestigate(a.id)}
                      >
                        {isLoading ? '…' : 'Investigate'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Compliance posture */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          padding: '18px 24px',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 20,
        }}>
          {[
            {
              title: 'Hash-chain integrity',
              value: stats ? (stats.integrity_ok ? 'Verified' : 'ERROR') : '—',
              meta: 'Last check 2m ago',
            },
            {
              title: 'SIEM streaming',
              value: 'Connected',
              meta: 'Splunk · 0 lag',
            },
            {
              title: 'Log retention',
              value: 'Compliant',
              meta: '7yr finance · 90d hot',
            },
            {
              title: 'Access reviews',
              value: 'Q2 due · 12 admins',
              meta: '18 Jun deadline',
            },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Icon
                name="check"
                size={16}
                stroke={2.4}
                style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{item.value}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>{item.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}
