import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Grip,
  Users,
} from 'lucide-react'
import { fmtDate as _fmtDate } from '../../lib/format'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { Flight } from '../../services/operatorAssignmentService'
import { operatorAssignmentService } from '../../services/operatorAssignmentService'

const TL_START = 6
const TL_END = 22
const TL_PX = 58
const TL_W = (TL_END - TL_START) * TL_PX

function hx(h: number, m = 0) {
  return ((h + m / 60) - TL_START) * TL_PX
}
function hw(h: number, m = 0) {
  return (h + m / 60) * TL_PX
}

function GridLines() {
  const hrs: number[] = []
  for (let h = TL_START; h <= TL_END; h++) hrs.push(h)
  return (
    <>
      {hrs
        .filter(h => h > TL_START)
        .map(h => (
          <div
            key={h}
            style={{
              position: 'absolute',
              left: hx(h),
              top: 0,
              bottom: 0,
              width: 1,
              background: 'var(--rule-soft)',
              pointerEvents: 'none',
            }}
          />
        ))}
    </>
  )
}

function HourRuler() {
  const hrs: number[] = []
  for (let h = TL_START; h <= TL_END; h++) hrs.push(h)
  return (
    <div
      style={{
        position: 'relative',
        height: 28,
        borderBottom: '1px solid var(--rule)',
        background: 'var(--surface-2)',
        flexShrink: 0,
        width: TL_W,
      }}
    >
      {hrs.map(h => (
        <div
          key={h}
          style={{
            position: 'absolute',
            left: hx(h),
            top: 0,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 5,
            borderLeft: h > TL_START ? '1px solid var(--rule)' : 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.05em',
            color: 'var(--ink-4)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {String(h).padStart(2, '0')}:00
        </div>
      ))}
    </div>
  )
}

function NowLine() {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  if (h < TL_START || h > TL_END) return null
  return (
    <div
      style={{
        position: 'absolute',
        left: hx(h, m),
        top: 0,
        bottom: 0,
        width: 1.5,
        background: 'var(--danger)',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -1,
          left: -18,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.06em',
          color: 'var(--danger)',
          background: 'var(--danger-soft)',
          border: '1px solid color-mix(in oklab,var(--danger) 30%,var(--rule))',
          padding: '1px 5px',
          borderRadius: 2,
        }}
      >
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
      </div>
    </div>
  )
}

function UnassignedCard({
  flight,
  onClick,
}: {
  flight: Flight
  onClick: () => void
}) {
  const etd = flight.etd ? new Date(flight.etd) : null
  const msTtl = etd ? etd.getTime() - Date.now() : Infinity
  const urgent = etd && msTtl < 60 * 60 * 1000

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px',
        border: `1.5px solid ${urgent ? 'color-mix(in oklab,var(--danger) 30%,var(--rule))' : 'var(--rule)'}`,
        background: urgent ? 'var(--danger-soft)' : 'var(--surface)',
        borderRadius: 3,
        cursor: 'pointer',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.05em',
            color: urgent ? 'var(--danger)' : 'var(--ink)',
            fontWeight: 500,
          }}
        >
          {flight.booking_ref}
        </span>
        <span className="badge info" style={{ height: 17, fontSize: 9.5 }}>
          Accepted
        </span>
        {urgent && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 17,
              padding: '0 6px',
              background: 'var(--danger-soft)',
              border: '1px solid color-mix(in oklab,var(--danger) 28%,var(--rule))',
              borderRadius: 2,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.06em',
              color: 'var(--danger)',
            }}
          >
            <Clock size={9} />
            ASAP
          </span>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <Grip size={12} style={{ color: 'var(--ink-4)' }} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 2 }}>
        {flight.origin_name}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <ArrowRight size={10} style={{ color: 'var(--ink-4)' }} />
        <span className="t-meta" style={{ fontSize: 11 }}>
          {flight.destination_name}
        </span>
        <span
          style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: 'var(--rule-strong)',
          }}
        />
        <span className="t-meta" style={{ fontSize: 11 }}>
          {flight.pax_count} pax · {flight.baggage_kg} kg
        </span>
      </div>
    </div>
  )
}

export default function AssignmentBoardPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  const loadData = () => {
    operatorAssignmentService
      .listBoard()
      .then(setFlights)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const unassigned = flights.filter(f => !f.aircraft_id)
  const assigned = flights.filter(f => f.aircraft_id)

  const prevDay = () =>
    setSelectedDate(d => new Date(d.getTime() - 86400000))
  const nextDay = () =>
    setSelectedDate(d => new Date(d.getTime() + 86400000))

  const fmtDate = (d: Date) => _fmtDate(d.toISOString())

  const isToday = (d: Date) =>
    d.toDateString() === new Date().toDateString()

  return (
    <Shell
      activeId="dispatch"
      breadcrumb="Operations"
      title="Assignment Board"
      subtitle={`${unassigned.length} accepted requests unassigned`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm" onClick={prevDay}>
            <ChevronLeft size={12} />
            Prev
          </button>
          <button
            className="btn sm accent"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em' }}
            onClick={() => setSelectedDate(new Date())}
          >
            {isToday(selectedDate) ? 'Today · ' : ''}
            {fmtDate(selectedDate)}
          </button>
          <button className="btn sm" onClick={nextDay}>
            Next
            <ChevronRight size={12} />
          </button>
        </div>
      }
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Unassigned sidebar */}
        <div
          style={{
            width: 268,
            flexShrink: 0,
            borderRight: '1px solid var(--rule)',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 14px 10px',
              borderBottom: '1px solid var(--rule)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="t-label">Unassigned</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  padding: '1px 7px',
                  borderRadius: 10,
                  background: 'var(--ink)',
                  color: 'var(--bg)',
                }}
              >
                {unassigned.length}
              </span>
            </div>
            <div className="t-meta" style={{ fontSize: 11, marginTop: 4 }}>
              Click to assign crew and aircraft
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
            {loading && (
              <div className="t-meta" style={{ textAlign: 'center', padding: 20 }}>
                Loading…
              </div>
            )}
            {!loading && unassigned.length === 0 && (
              <div className="t-meta" style={{ textAlign: 'center', padding: 20 }}>
                All flights assigned.
              </div>
            )}
            {!loading &&
              unassigned.map(f => (
                <UnassignedCard
                  key={f.id}
                  flight={f}
                  onClick={() => navigate(`/dispatch/${f.id}/assign`)}
                />
              ))}
          </div>
        </div>

        {/* Gantt / timeline */}
        <div
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Ruler header */}
          <div
            style={{
              display: 'flex',
              flexShrink: 0,
              position: 'sticky',
              top: 0,
              zIndex: 20,
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <div
              style={{
                width: 220,
                flexShrink: 0,
                height: 28,
                borderRight: '1px solid var(--rule)',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 16,
              }}
            >
              <span className="t-label" style={{ fontSize: 10 }}>
                Flight
              </span>
            </div>
            <HourRuler />
          </div>

          {loading && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
              Loading…
            </div>
          )}

          {!loading && assigned.length === 0 && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
              No assigned flights for this date.
            </div>
          )}

          {/* Assigned flight rows */}
          {!loading &&
            assigned.map((f, i) => {
              const etd = f.etd ? new Date(f.etd) : null
              const eta = f.eta ? new Date(f.eta) : null
              const startH = etd ? etd.getHours() + etd.getMinutes() / 60 : TL_START
              const endH = eta ? eta.getHours() + eta.getMinutes() / 60 : startH + 1
              const x = hx(startH)
              const w = Math.max(hw(endH - startH) - 4, 20)

              return (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    borderBottom: i === assigned.length - 1 ? 'none' : '1px solid var(--rule-soft)',
                    minHeight: 56,
                  }}
                >
                  <div
                    style={{
                      width: 220,
                      flexShrink: 0,
                      padding: '10px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: 4,
                      borderRight: '1px solid var(--rule)',
                      background: 'var(--surface)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12.5,
                          letterSpacing: '0.06em',
                          color: 'var(--ink)',
                          fontWeight: 500,
                        }}
                      >
                        {f.aircraft_reg}
                      </span>
                      <span className="badge ok" style={{ height: 17 }}>
                        <span className="dot ok" />
                        Assigned
                      </span>
                    </div>
                    <div className="t-meta" style={{ fontSize: 10.5 }}>
                      {f.aircraft_type}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      position: 'relative',
                      overflow: 'hidden',
                      background: 'var(--bg)',
                      minWidth: TL_W,
                    }}
                  >
                    <GridLines />
                    <NowLine />
                    <div
                      onClick={() => navigate(`/dispatch/${f.id}/assign`)}
                      style={{
                        position: 'absolute',
                        left: x + 2,
                        width: w,
                        top: 6,
                        bottom: 6,
                        background: 'color-mix(in oklab,var(--accent) 16%,var(--surface))',
                        border: '1px solid var(--accent)',
                        borderRadius: 2,
                        overflow: 'hidden',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ padding: '3px 6px', color: 'var(--ink-2)' }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 9.5,
                            letterSpacing: '0.05em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: 500,
                          }}
                        >
                          {f.booking_ref}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: 'var(--ink-4)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: 1,
                          }}
                        >
                          {f.origin_name} → {f.destination_name}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

          {/* Crew strip */}
          {!loading && (
            <div
              style={{
                flexShrink: 0,
                borderTop: '1px solid var(--rule)',
                background: 'var(--surface-2)',
                padding: '10px 0',
              }}
            >
              <div style={{ display: 'flex' }}>
                <div
                  style={{
                    width: 220,
                    flexShrink: 0,
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRight: '1px solid var(--rule)',
                  }}
                >
                  <span className="t-label" style={{ fontSize: 10 }}>
                    Crew
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    padding: '4px 12px',
                    alignItems: 'center',
                  }}
                >
                  {flights
                    .filter(f => f.pilot_name)
                    .map(f => (
                      <div
                        key={f.id + '-pilot'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          background: 'var(--bg)',
                          border: '1px solid var(--rule)',
                          borderRadius: 3,
                          fontSize: 11.5,
                        }}
                      >
                        <span className="dot ok" style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: 'var(--ink-2)' }}>
                          {f.pilot_name}
                        </span>
                        <span className="badge" style={{ height: 16, fontSize: 9 }}>
                          CPT
                        </span>
                        <span className="t-meta" style={{ fontSize: 10.5 }}>
                          {f.booking_ref}
                        </span>
                      </div>
                    ))}
                  {flights.every(f => !f.pilot_name) && (
                    <span className="t-meta" style={{ fontSize: 11 }}>
                      No crew assigned yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
