import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Settings } from 'lucide-react'
import { fmtDateTime } from '../../lib/format'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { Route, Schedule } from '../../services/operatorRoutesService'
import { operatorRoutesService } from '../../services/operatorRoutesService'

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `~${h}h ${m.toString().padStart(2, '0')}m`
}

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [route, setRoute] = useState<Route | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      operatorRoutesService.getRoute(id),
      operatorRoutesService.listSchedules(),
    ])
      .then(([r, s]) => {
        setRoute(r)
        setSchedules(s.filter(sc => sc.route_id === id))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <Shell activeId="routes" breadcrumb="Routes & Schedule" title="Loading…">
        <div style={{ padding: 28, color: 'var(--ink-3)', fontSize: 13 }}>Loading route…</div>
      </Shell>
    )
  }

  if (!route) {
    return (
      <Shell activeId="routes" breadcrumb="Routes & Schedule" title="Not found">
        <div style={{ padding: 28, color: 'var(--danger)', fontSize: 13 }}>Route not found.</div>
      </Shell>
    )
  }

  return (
    <Shell
      activeId="routes"
      breadcrumb={`Routes & Schedule / ${route.origin_code} → ${route.destination_code}`}
      title={`Route: ${route.origin_code} → ${route.destination_code}`}
      subtitle={`${route.origin_name} → ${route.destination_name} · ${route.distance_nm} nm · ${fmtDuration(route.est_duration_min)}`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn sm ghost"
            style={{ height: 32, color: 'var(--ink-3)' }}
            onClick={() => navigate('/routes')}
          >
            <ArrowLeft size={12} />Back
          </button>
          <button className="btn sm" style={{ height: 32 }}>
            <Settings size={12} />Edit route
          </button>
          <button className="btn sm danger" style={{ height: 32 }}>
            Pause route
          </button>
        </div>
      }
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '22px 26px', display: 'flex', flexDirection: 'column', gap: 20, borderRight: isMobile ? 'none' : '1px solid var(--rule)' }}>
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Route specifications</div>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 14 }}>
                {[
                  ['Origin', `${route.origin_code} — ${route.origin_name}`],
                  ['Destination', `${route.destination_code} — ${route.destination_name}`],
                  ['Distance', `${route.distance_nm} nm`],
                  ['Est. block time', fmtDuration(route.est_duration_min)],
                  ['Eligible types', route.eligible_aircraft_types.length > 0 ? route.eligible_aircraft_types.join(', ') : '—'],
                  ['Airspace notes', route.airspace_notes ?? '—'],
                  ['Status', route.status],
                  ['Schedules', `${schedules.length} scheduled`],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <div className="t-label" style={{ marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className="t-label">Scheduled flights</span>
              <div style={{ flex: 1 }} />
              <button className="btn sm accent" style={{ height: 28 }}>Add schedule</button>
            </div>
            {schedules.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No schedules yet.</div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {schedules.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderBottom: i < schedules.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink)' }}>
                        {fmtDateTime(s.etd)} → {fmtDateTime(s.eta)}
                      </div>
                      {s.aircraft_registration && (
                        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>
                          {s.aircraft_registration}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                        {s.seats_sold}/{s.seats_total} seats
                      </div>
                    </div>
                    <span className={`badge ${s.published ? 'ok' : 'pending'}`} style={{ height: 18, fontSize: 10 }}>
                      <span className={`dot ${s.published ? 'ok' : 'pending'}`} />
                      {s.published ? 'Published' : 'Draft'}
                    </span>
                    <button
                      className={`btn sm ${s.published ? 'danger' : 'accent'}`}
                      style={{ height: 26 }}
                      onClick={async () => {
                        const updated = s.published
                          ? await operatorRoutesService.unpublishSchedule(s.id)
                          : await operatorRoutesService.publishSchedule(s.id)
                        setSchedules(prev => prev.map(x => x.id === updated.id ? updated : x))
                      }}
                    >
                      {s.published ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {!isMobile && (
          <div style={{ width: 360, flexShrink: 0, background: 'var(--surface)', overflowY: 'auto', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Route details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Origin code', route.origin_code],
                  ['Destination code', route.destination_code],
                  ['Distance', `${route.distance_nm} nm`],
                  ['Block time', fmtDuration(route.est_duration_min)],
                  ['Status', route.status],
                  ['Schedules', `${schedules.length}`],
                  ['Published', `${schedules.filter(s => s.published).length}`],
                ].map(([k, v]) => (
                  <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid var(--rule-soft)' }}>
                    <span className="t-meta" style={{ fontSize: 11.5 }}>{k}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </section>

            {route.eligible_aircraft_types.length > 0 && (
              <section>
                <div className="t-label" style={{ marginBottom: 10 }}>Eligible aircraft types</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {route.eligible_aircraft_types.map(t => (
                    <span key={t} className="badge" style={{ height: 20, fontSize: 10.5 }}>{t}</span>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </Shell>
  )
}
