import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, Plus, Route, Search, Settings } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { RouteListItem } from '../../services/operatorRoutesService'
import { operatorRoutesService } from '../../services/operatorRoutesService'
import AddRouteModal from './AddRouteModal'

const ROUTE_TONE: Record<string, string> = {
  active: 'ok',
  paused: 'warn',
  draft: 'pending',
  archived: 'danger',
}

function RouteStatusBadge({ status }: { status: string }) {
  const tone = ROUTE_TONE[status.toLowerCase()] ?? 'pending'
  return (
    <span className={`badge ${tone}`} style={{ height: 20, fontSize: 10.5 }}>
      <span className={`dot ${tone}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `~${h}h ${m.toString().padStart(2, '0')}m`
}

export default function RoutesPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [routes, setRoutes] = useState<RouteListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    operatorRoutesService
      .listRoutes()
      .then(setRoutes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const activeCount = routes.filter(r => r.status.toLowerCase() === 'active').length

  const statuses = ['All', ...Array.from(new Set(routes.map(r =>
    r.status.charAt(0).toUpperCase() + r.status.slice(1)
  )))]

  const filtered = routes.filter(r => {
    const q = search.toLowerCase()
    const matchSearch =
      r.origin_code.toLowerCase().includes(q) ||
      r.destination_code.toLowerCase().includes(q) ||
      r.origin_name.toLowerCase().includes(q) ||
      r.destination_name.toLowerCase().includes(q)
    const matchStatus =
      statusFilter === 'All' ||
      r.status.toLowerCase() === statusFilter.toLowerCase()
    return matchSearch && matchStatus
  })

  return (
    <Shell
      activeId="routes"
      breadcrumb="Schedule & Pricing"
      title="Routes & Schedule"
      subtitle={`${routes.length} routes · ${activeCount} active`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" onClick={() => navigate('/routes/schedule')}>
            Calendar view
          </button>
          <button className="btn sm accent" onClick={() => setShowAddModal(true)}>
            <Plus size={12} />Add route
          </button>
        </div>
      }
    >
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
        <div className="input" style={{ width: 240, height: 32 }}>
          <Search size={13} className="icon" />
          <input
            placeholder="Search routes, destinations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ height: 32, fontSize: 12 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>{filtered.length} routes</span>
      </div>

      {!isMobile && (
        <div
          style={{
            display: 'flex',
            padding: '8px 24px',
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--rule)',
            flexShrink: 0,
          }}
        >
          {[
            ['Route', 240],
            ['Distance', 110],
            ['Aircraft types', 0],
            ['Est. time', 100],
            ['Status', 90],
            ['', 120],
          ].map(([l, w]) => (
            <div
              key={l as string}
              className="t-label"
              style={{
                width: (w as number) || undefined,
                flex: !w ? 1 : undefined,
                flexShrink: w ? 0 : undefined,
              }}
            >
              {l}
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '20px 28px', color: 'var(--ink-3)', fontSize: 13 }}>
            Loading routes…
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              paddingTop: 60,
              color: 'var(--ink-3)',
            }}
          >
            <Route size={32} strokeWidth={1} />
            <div style={{ fontSize: 14 }}>No routes defined yet</div>
            <button className="btn sm accent" onClick={() => setShowAddModal(true)}>
              <Plus size={12} />Add route
            </button>
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map(r => (
              <div
                key={r.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--rule-soft)',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/routes/${r.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.06em' }}>
                    {r.origin_code}
                  </span>
                  <ArrowRight size={10} style={{ color: 'var(--ink-4)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.06em' }}>
                    {r.destination_code}
                  </span>
                  <RouteStatusBadge status={r.status} />
                </div>
                <div className="t-meta" style={{ fontSize: 11 }}>
                  {r.origin_name} → {r.destination_name}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  <span>{r.distance_nm} nm</span>
                  <span>·</span>
                  <span>{fmtDuration(r.est_duration_min)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          filtered.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '11px 24px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--rule-soft)' : 'none',
              }}
            >
              <div style={{ width: 240, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>
                    {r.origin_code}
                  </span>
                  <ArrowRight size={10} style={{ color: 'var(--ink-4)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>
                    {r.destination_code}
                  </span>
                </div>
                <div className="t-meta" style={{ fontSize: 11 }}>
                  {r.origin_name} → {r.destination_name}
                </div>
              </div>

              <div style={{ width: 110, flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                  {r.distance_nm} nm
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {r.eligible_aircraft_types.length > 0 ? (
                    r.eligible_aircraft_types.map(a => (
                      <span key={a} className="badge" style={{ height: 18, fontSize: 9.5 }}>{a}</span>
                    ))
                  ) : (
                    <span className="t-meta" style={{ fontSize: 11 }}>—</span>
                  )}
                </div>
              </div>

              <div style={{ width: 100, flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                  {fmtDuration(r.est_duration_min)}
                </div>
              </div>

              <div style={{ width: 90, flexShrink: 0 }}>
                <RouteStatusBadge status={r.status} />
              </div>

              <div style={{ display: 'flex', gap: 5, flexShrink: 0, width: 120, justifyContent: 'flex-end' }}>
                <button
                  className="btn sm"
                  style={{ height: 26 }}
                  onClick={() => navigate(`/routes/${r.id}`)}
                >
                  <Eye size={11} />View
                </button>
                <button className="btn sm" style={{ height: 26 }}>
                  <Settings size={11} />Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <AddRouteModal
          onClose={() => setShowAddModal(false)}
          onCreated={r => {
            setRoutes(prev => [r as unknown as RouteListItem, ...prev])
            setShowAddModal(false)
          }}
        />
      )}
    </Shell>
  )
}
