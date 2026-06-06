import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { reportsService } from '../../services/reportsService'
import type { ReportTemplate, ReportSchedule, ReportExport } from '../../services/reportsService'
import { formatTimeHM } from '../../lib/utils'
import { usePlatformStore } from '../../store/platformStore'

export default function ReportLibraryPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [exports, setExports] = useState<ReportExport[]>([])
  const [running, setRunning] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [tmplRes, schedRes, expRes] = await Promise.all([
        reportsService.listTemplates(),
        reportsService.listSchedules(),
        reportsService.listExports({ page: 1, page_size: 10 }),
      ])
      setTemplates(tmplRes.items)
      setSchedules(schedRes)
      setExports(expRes.items)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRun(tmpl: ReportTemplate) {
    setRunning(tmpl.id)
    try {
      await reportsService.runTemplate(tmpl.id, { name: tmpl.name, format: tmpl.default_format })
      await load()
    } catch {
      // ignore
    } finally {
      setRunning(null)
    }
  }

  async function toggleSchedule(s: ReportSchedule) {
    try {
      await reportsService.updateSchedule(s.id, { is_active: !s.is_active })
      await load()
    } catch {
      // ignore
    }
  }

  const dataShareAllowed = usePlatformStore(s => s.data_share_authorities)
  const analyticsAllowed = usePlatformStore(s => s.consent_analytics_tracking)

  const standardTemplates = templates.filter(t => t.is_standard)
  const customTemplates = templates.filter(t => !t.is_standard)
  const allTemplates = [...standardTemplates, ...customTemplates]

  return (
    <Shell
      activeId="reports"
      breadcrumb="Finance · Reports"
      title="Report library"
      subtitle={`${allTemplates.length} reports · ${schedules.length} scheduled · ${exports.length} recent exports`}
      actions={
        <>
          <button className="btn sm" onClick={() => navigate('/reports/exports')}>
            <Icon name="clock" size={13} />Export history
          </button>
          <button className="btn sm accent" onClick={() => navigate('/reports/builder')}>
            <Icon name="plus" size={13} />Build report
          </button>
        </>
      }
    >
      {/* Gap 15: consent-driven banners */}
      {!analyticsAllowed && (
        <div style={{
          margin: '12px 32px 0', padding: '10px 16px', background: '#fef3c7',
          border: '1px solid #fbbf24', borderRadius: 4, fontSize: 13, color: '#92400e',
        }}>
          ⚠ <strong>Analytics tracking is off.</strong> Exports that contain analytics data will be blocked.
          Enable <em>In-app analytics tracking</em> in <strong>Settings → Data &amp; Privacy → Consent</strong>.
        </div>
      )}
      <div style={{ padding: isMobile ? '16px' : '24px 32px 28px', display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : '1.5fr 1fr', gap: 24 }}>
        {/* Standard reports */}
        <div>
          {/* Gap 15: Authority export card — visible only when data_share_authorities is on */}
          {dataShareAllowed && (
            <div style={{
              marginBottom: 14, background: 'var(--surface)',
              border: '1px solid var(--accent)', padding: '16px 20px',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderRadius: 2,
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, border: '1px solid var(--accent)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                  <Icon name="globe" size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Authority Export</div>
                  <div className="t-meta" style={{ marginTop: 4, lineHeight: 1.45 }}>
                    Anonymised aggregate trip data for transport regulators — zone counts, time slots, service split. No PII.
                  </div>
                </div>
              </div>
              <a
                href="/api/v1/reports/authority-export?days=30"
                target="_blank"
                rel="noreferrer"
                className="btn sm accent"
                style={{ whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Icon name="download" size={13} />Export JSON
              </a>
            </div>
          )}
        </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.014em' }}>Standard reports</h3>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            {allTemplates.length === 0 ? (
              <div className="t-meta" style={{ gridColumn: '1/-1', padding: 24 }}>No report templates found.</div>
            ) : allTemplates.map(r => (
              <div
                key={r.id}
                style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}
                onClick={() => navigate(`/reports/${r.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ width: 40, height: 40, border: '1px solid var(--rule-strong)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Icon name={r.icon ?? 'archive'} size={18} />
                  </div>
                  {r.tag && <span className="badge">{r.tag}</span>}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
                  {r.description && <div className="t-meta" style={{ marginTop: 4, lineHeight: 1.45 }}>{r.description}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--rule-soft)' }} onClick={e => e.stopPropagation()}>
                  <span className="t-meta">
                    <Icon name="refresh" size={11} style={{ verticalAlign: -1, marginRight: 5 }} />
                    {r.default_frequency}
                  </span>
                  <button
                    className="btn sm"
                    disabled={running === r.id}
                    onClick={() => handleRun(r)}
                  >
                    {running === r.id ? 'Running…' : 'Run'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: scheduled + recent exports */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Scheduled deliveries */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label">Scheduled deliveries</div>
              <button className="btn sm ghost" onClick={() => navigate('/reports/schedules')}>
                <Icon name="plus" size={12} />
              </button>
            </div>
            <div style={{ padding: '6px 20px 12px' }}>
              {schedules.length === 0 ? (
                <div className="t-meta" style={{ padding: '12px 0' }}>No scheduled reports.</div>
              ) : schedules.slice(0, 6).map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: i < Math.min(schedules.length, 6) - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <span className={'dot ' + (s.is_active ? 'ok' : 'pending')} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{s.name}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>
                      {s.format.toUpperCase()} · {s.recipients.split(',')[0].trim()} · {s.frequency}
                    </div>
                  </div>
                  {/* Toggle */}
                  <div
                    style={{
                      width: 32, height: 18, borderRadius: 9, padding: 2, cursor: 'pointer',
                      background: s.is_active ? 'var(--accent)' : 'var(--rule-strong)',
                      display: 'flex', justifyContent: s.is_active ? 'flex-end' : 'flex-start',
                    }}
                    onClick={() => toggleSchedule(s)}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent exports */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label">Recent exports</div>
              <button className="btn sm ghost" onClick={() => navigate('/reports/exports')}>View all</button>
            </div>
            <div style={{ padding: '6px 20px 12px' }}>
              {exports.length === 0 ? (
                <div className="t-meta" style={{ padding: '12px 0' }}>No exports yet.</div>
              ) : exports.slice(0, 5).map((exp, i) => (
                <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < Math.min(exports.length, 5) - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <Icon
                    name={exp.status === 'running' ? 'refresh' : 'download'}
                    size={14}
                    style={{ color: exp.status === 'running' ? 'var(--warn)' : 'var(--ink-3)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{exp.name}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>
                      {exp.format.toUpperCase()}{exp.file_size_kb ? ` · ${exp.file_size_kb} KB` : ''} · {formatTimeHM(exp.created_at)}
                    </div>
                  </div>
                  {exp.status === 'done'
                    ? <button className="btn sm ghost"><Icon name="download" size={13} /></button>
                    : exp.status === 'running'
                    ? <span className="badge warn"><span className="dot warn" />Running</span>
                    : <span className="badge danger"><span className="dot danger" />Failed</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
