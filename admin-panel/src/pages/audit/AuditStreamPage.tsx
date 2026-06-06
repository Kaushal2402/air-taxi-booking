import { useState, useEffect, useRef } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { auditService } from '../../services/auditService'
import type { AuditEventSummary, AuditStats } from '../../services/auditService'
import { formatTime } from '../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

type TimeWindow = '1h' | '6h' | '24h' | '7d' | '30d'
const TIME_WINDOWS: TimeWindow[] = ['1h', '6h', '24h', '7d', '30d']

const CATEGORIES = ['All', 'Finance', 'Pricing', 'Security', 'Support', 'Growth', 'System', 'Catalog', 'Operations']
const SEVERITIES = ['All', 'High', 'Medium', 'Low']

function SevBadge({ sev }: { sev: 'high' | 'med' | 'low' }) {
  if (sev === 'high') return <span className="badge danger"><span className="dot danger" />High</span>
  if (sev === 'med') return <span className="badge warn"><span className="dot warn" />Medium</span>
  return <span className="badge"><span className="dot pending" />Low</span>
}

function ActorAvatar({ name }: { name: string }) {
  const isSystem = name === 'System'
  return (
    <div
      className="avatar"
      style={isSystem ? { background: 'var(--ink)', color: 'var(--surface)' } : {}}
    >
      {isSystem
        ? <Icon name="cog" size={14} />
        : name.split(' ').map(x => x[0]).join('').slice(0, 2)}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuditStreamPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [events, setEvents] = useState<AuditEventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const perPage = 25

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [severityFilter, setSeverityFilter] = useState('All')
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h')
  const [showTimeDropdown, setShowTimeDropdown] = useState(false)
  const timeDropdownRef = useRef<HTMLDivElement>(null)

  const [stats, setStats] = useState<AuditStats | null>(null)
  const [exportMsg, setExportMsg] = useState('')
  const [exporting, setExporting] = useState(false)
  const canExportAudit = usePermission('audit.export')

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target as Node)) {
        setShowTimeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {
        page,
        per_page: perPage,
        time_window: timeWindow,
      }
      if (search.trim()) params.search = search.trim()
      if (categoryFilter !== 'All') params.category = categoryFilter
      if (severityFilter !== 'All') params.severity = severityFilter.toLowerCase() === 'medium' ? 'med' : severityFilter.toLowerCase()
      const data = await auditService.listEvents(params)
      setEvents(data.items)
      setTotal(data.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const loadStats = async () => {
    try {
      const data = await auditService.getStats({ time_window: timeWindow })
      setStats(data)
    } catch { /* ignore */ }
  }

  useEffect(() => { void loadEvents() }, [search, categoryFilter, severityFilter, timeWindow, page]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void loadStats() }, [timeWindow]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async () => {
    setExporting(true)
    setExportMsg('')
    try {
      const res = await auditService.exportEvents({
        time_window: timeWindow,
        category: categoryFilter !== 'All' ? categoryFilter : null,
        severity: severityFilter !== 'All' ? severityFilter.toLowerCase() : null,
      })
      setExportMsg(res.message)
    } catch {
      setExportMsg('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <Shell
      activeId="audit"
      breadcrumb="System · Audit log"
      title="Audit log"
      subtitle={`Immutable · ${stats?.events_total?.toLocaleString() ?? '…'} events · 90-day hot retention`}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{ display: canExportAudit ? undefined : 'none' }} className="btn sm" onClick={() => navigate('/audit/security')}>
            <Icon name="shield" size={13} />
            Security
          </button>
          <button className="btn sm" onClick={handleExport} disabled={exporting}>
            <Icon name="download" size={13} />
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Export message */}
        {exportMsg && (
          <div style={{
            padding: '10px 14px', borderRadius: 3, fontSize: 12.5,
            background: exportMsg.includes('failed') ? 'var(--danger-soft)' : 'var(--accent-soft)',
            border: `1px solid ${exportMsg.includes('failed') ? 'color-mix(in oklab, var(--danger) 28%, var(--rule))' : 'color-mix(in oklab, var(--accent) 28%, var(--rule))'}`,
            color: exportMsg.includes('failed') ? 'var(--danger)' : 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {exportMsg}
            <button
              onClick={() => setExportMsg('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 4px' }}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        {/* KPI hero strip */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        }}>
          {[
            {
              label: `Events · ${timeWindow}`,
              value: stats?.events_total?.toLocaleString() ?? '—',
              meta: 'Across all categories',
              color: 'var(--ink-2)',
            },
            {
              label: 'Admin actions',
              value: stats?.admin_actions?.toLocaleString() ?? '—',
              meta: 'Active admins',
              color: 'var(--ink-2)',
            },
            {
              label: 'High severity',
              value: stats?.high_severity?.toLocaleString() ?? '—',
              meta: 'Sensitive operations',
              color: 'var(--danger)',
            },
            {
              label: 'Failed logins',
              value: stats?.failed_logins?.toLocaleString() ?? '—',
              meta: 'Rate-limited IPs',
              color: 'var(--warn)',
            },
            {
              label: 'Integrity',
              value: stats == null ? '—' : (stats.integrity_ok ? 'Verified' : 'ERROR'),
              meta: stats?.integrity_ok ? 'Hash chain intact' : 'Chain broken — alert!',
              color: stats == null ? 'var(--ink-2)' : (stats.integrity_ok ? 'var(--accent)' : 'var(--danger)'),
            },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              style={{
                padding: isMobile ? '12px 14px' : '18px 22px',
                borderRight: isMobile
                  ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                  : (i < 4 ? '1px solid var(--rule)' : 'none'),
                borderBottom: isMobile && i < 3 ? '1px solid var(--rule)' : 'none',
              }}
            >
              <div className="t-label" style={{ padding: 0 }}>{kpi.label}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 22 : 28, fontWeight: 400 }}>{kpi.value}</div>
              <div className="t-meta" style={{ marginTop: 8, color: kpi.color }}>{kpi.meta}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: isMobile ? '100%' : 400, height: 32 }}>
            <Icon name="search" size={13} className="icon" />
            <input
              placeholder="Actor, action, target, IP…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          {/* Time window — rendered in page flow so dropdown is never clipped */}
          <div ref={timeDropdownRef} style={{ position: 'relative' }}>
            <button
              className="btn sm"
              onClick={() => setShowTimeDropdown(v => !v)}
            >
              <Icon name="filter" size={13} />
              Last {timeWindow}
              <Icon name="chevDown" size={11} />
            </button>
            {showTimeDropdown && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                background: 'var(--surface)', border: '1px solid var(--rule)',
                borderRadius: 4, boxShadow: 'var(--shadow-pop)', zIndex: 200,
                minWidth: 110, padding: '4px 0',
              }}>
                {TIME_WINDOWS.map(w => (
                  <button
                    key={w}
                    onClick={() => { setTimeWindow(w); setPage(1); setShowTimeDropdown(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '7px 14px', fontSize: 13, border: 'none',
                      background: timeWindow === w ? 'var(--accent-soft)' : 'transparent',
                      color: timeWindow === w ? 'var(--accent)' : 'var(--ink)',
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Last {w}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Category chip */}
          <div className="input" style={{ height: 32, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Category:</span>
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--font-sans)', color: 'var(--ink)' }}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {/* Severity chip */}
          <div className="input" style={{ height: 32, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Severity:</span>
            <select
              value={severityFilter}
              onChange={e => { setSeverityFilter(e.target.value); setPage(1) }}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--font-sans)', color: 'var(--ink)' }}
            >
              {SEVERITIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <span className="badge ok"><span className="dot ok" />Live tail</span>
        </div>

        {/* Event table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          {loading && (
            <div style={{ padding: 28, color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>Loading events…</div>
          )}
          {!loading && (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl" style={{ minWidth: isMobile ? 640 : undefined }}>
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    {!isMobile && <th>Target</th>}
                    {!isMobile && <th>Category</th>}
                    <th>Severity</th>
                    {!isMobile && <th>Source IP</th>}
                    <th style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={isMobile ? 4 : 8} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                        No events match your filters.
                      </td>
                    </tr>
                  ) : events.map(e => (
                    <tr
                      key={e.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/audit/events/${e.id}`)}
                    >
                      <td>
                        <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                          {formatTime(e.timestamp)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <ActorAvatar name={e.actor_name} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 12.5 }}>{e.actor_name}</span>
                            <span className="t-meta">{e.actor_role}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink)' }}>{e.action}</span>
                      </td>
                      {!isMobile && <td className="t-meta">{e.target}</td>}
                      {!isMobile && <td><span className="badge">{e.category}</span></td>}
                      <td><SevBadge sev={e.severity} /></td>
                      {!isMobile && (
                        <td>
                          <span className="t-mono t-meta">{e.source_ip ?? '—'}</span>
                        </td>
                      )}
                      <td>
                        <button
                          className="btn icon sm ghost"
                          onClick={ev => { ev.stopPropagation(); navigate(`/audit/events/${e.id}`) }}
                          title="View event"
                        >
                          <Icon name="chevRight" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid var(--rule)', flexWrap: 'wrap', gap: 8,
          }}>
            <span className="t-meta">
              Showing {events.length} of {total.toLocaleString()} · {timeWindow} window · events are append-only & cryptographically chained
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn icon sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <Icon name="chevLeft" size={14} />
              </button>
              <button
                className="btn icon sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <Icon name="chevRight" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
