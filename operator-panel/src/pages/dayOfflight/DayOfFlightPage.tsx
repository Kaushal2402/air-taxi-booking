import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Clock, Plus, Send } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { DayFlightCard, FlightEvent, DayBoardData } from '../../services/operatorDayOfFlightService'
import { operatorDayOfFlightService } from '../../services/operatorDayOfFlightService'

const STATUS_COLOR: Record<string, string> = {
  departed: 'var(--accent)',
  airborne: '#0ea5e9',
  arrived: '#22c55e',
  delayed: 'var(--danger)',
  scheduled: 'var(--ink-4)',
  confirmed: 'var(--ink-3)',
}

const EVENT_COLOR: Record<string, string> = {
  departed: 'var(--accent)',
  arrived: '#22c55e',
  delayed: 'var(--danger)',
  note: 'var(--ink-3)',
  crew: '#a78bfa',
  system: 'var(--ink-4)',
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtTs(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'var(--ink-4)'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 18,
        padding: '0 7px',
        background: `color-mix(in oklab,${color} 14%,var(--surface))`,
        border: `1px solid color-mix(in oklab,${color} 35%,var(--rule))`,
        borderRadius: 2,
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        letterSpacing: '0.06em',
        color,
        textTransform: 'uppercase',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      {status}
    </span>
  )
}

function FlightCard({ flight, onClick }: { flight: DayFlightCard; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        minWidth: 240,
        maxWidth: 280,
        flexShrink: 0,
        padding: '14px 16px',
        border: `1.5px solid ${flight.is_delayed ? 'color-mix(in oklab,var(--danger) 35%,var(--rule))' : 'var(--rule)'}`,
        background: flight.is_delayed ? 'color-mix(in oklab,var(--danger) 6%,var(--surface))' : 'var(--surface)',
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {flight.is_delayed && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'var(--danger)',
          }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.07em',
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          {flight.booking_ref}
        </span>
        <StatusBadge status={flight.status} />
        {flight.is_delayed && (
          <AlertTriangle size={12} style={{ color: 'var(--danger)', marginLeft: 'auto', flexShrink: 0 }} />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
          {flight.origin_name}
        </span>
        <ArrowRight size={11} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>
          {flight.destination_name}
        </span>
      </div>

      <div
        style={{
          height: 4,
          background: 'var(--rule-soft)',
          borderRadius: 2,
          marginBottom: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(flight.progress_pct, 100)}%`,
            background: flight.is_delayed ? 'var(--danger)' : 'var(--accent)',
            borderRadius: 2,
            transition: 'width 0.6s',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="t-label" style={{ fontSize: 9.5 }}>DEP</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
            {flight.etd ? fmtTime(flight.etd) : '--:--'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
          <span className="t-label" style={{ fontSize: 9.5 }}>ETA</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: flight.is_delayed ? 'var(--danger)' : 'var(--ink-2)' }}>
            {flight.eta ? fmtTime(flight.eta) : '--:--'}
          </span>
        </div>
      </div>

      {flight.is_delayed && flight.delay_minutes !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            background: 'color-mix(in oklab,var(--danger) 12%,var(--surface))',
            border: '1px solid color-mix(in oklab,var(--danger) 25%,var(--rule))',
            borderRadius: 2,
            marginBottom: 8,
          }}
        >
          <Clock size={9} style={{ color: 'var(--danger)' }} />
          <span style={{ fontSize: 10.5, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
            +{flight.delay_minutes} min delay
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {flight.pilot_name && (
          <span className="t-meta" style={{ fontSize: 10.5 }}>
            {flight.pilot_name}
          </span>
        )}
        {flight.copilot_name && (
          <>
            <span className="t-meta" style={{ fontSize: 10.5 }}>·</span>
            <span className="t-meta" style={{ fontSize: 10.5 }}>{flight.copilot_name}</span>
          </>
        )}
      </div>
    </div>
  )
}

function EventLogEntry({ ev }: { ev: FlightEvent }) {
  const color = EVENT_COLOR[ev.event_type] ?? 'var(--ink-4)'
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid var(--rule-soft)',
      }}
    >
      <div style={{ flexShrink: 0, paddingTop: 3 }}>
        <span
          style={{
            display: 'block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-4)' }}>
            {fmtTs(ev.created_at)}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              padding: '1px 5px',
              background: 'color-mix(in oklab,var(--ink) 8%,var(--surface))',
              border: '1px solid var(--rule)',
              borderRadius: 2,
              color: 'var(--ink-2)',
              letterSpacing: '0.05em',
            }}
          >
            {ev.booking_ref}
          </span>
          <span
            style={{
              fontSize: 9,
              padding: '1px 5px',
              background: `color-mix(in oklab,${color} 12%,var(--surface))`,
              border: `1px solid color-mix(in oklab,${color} 30%,var(--rule))`,
              borderRadius: 2,
              color,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {ev.event_type}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4 }}>
          {ev.message}
        </div>
      </div>
    </div>
  )
}

function MapArea({ flights }: { flights: DayFlightCard[] }) {
  const active = flights.filter(f => f.status === 'airborne' || f.status === 'departed')
  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        background: 'color-mix(in oklab,var(--accent) 4%,var(--bg))',
        overflow: 'hidden',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="var(--rule-soft)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="800" height="500" fill="url(#grid)" />

        {[
          { x: 120, y: 340, label: 'JFK' },
          { x: 280, y: 180, label: 'BOS' },
          { x: 480, y: 260, label: 'ORD' },
          { x: 640, y: 200, label: 'DEN' },
          { x: 700, y: 380, label: 'LAX' },
          { x: 200, y: 420, label: 'MIA' },
          { x: 560, y: 400, label: 'DFW' },
        ].map(h => (
          <g key={h.label}>
            <circle cx={h.x} cy={h.y} r={5} fill="var(--surface)" stroke="var(--rule-strong)" strokeWidth={1.5} />
            <text
              x={h.x + 8}
              y={h.y + 4}
              fontSize={10}
              fill="var(--ink-3)"
              fontFamily="var(--font-mono)"
              letterSpacing="0.06em"
            >
              {h.label}
            </text>
          </g>
        ))}

        {active.map((f, i) => {
          const x1 = 120 + ((i * 137) % 580)
          const y1 = 180 + ((i * 79) % 200)
          const x2 = x1 + 120 + ((i * 53) % 140)
          const y2 = y1 - 40 + ((i * 67) % 80)
          const px = x1 + (x2 - x1) * (f.progress_pct / 100)
          const py = y1 + (y2 - y1) * (f.progress_pct / 100)
          return (
            <g key={f.id}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="color-mix(in oklab,var(--accent) 30%,var(--rule))"
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
              <circle
                cx={px}
                cy={py}
                r={7}
                fill={f.is_delayed ? 'var(--danger)' : 'var(--accent)'}
                opacity={0.9}
              />
              <text
                x={px + 10}
                y={py + 4}
                fontSize={9}
                fill="var(--ink)"
                fontFamily="var(--font-mono)"
                letterSpacing="0.05em"
                fontWeight="600"
              >
                {f.booking_ref}
              </text>
            </g>
          )
        })}

        {active.length === 0 && (
          <text
            x="400"
            y="250"
            textAnchor="middle"
            fontSize={13}
            fill="var(--ink-4)"
            fontFamily="var(--font-mono)"
          >
            No active flights
          </text>
        )}
      </svg>

      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          display: 'flex',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'block',
            }}
          />
          <span className="t-meta" style={{ fontSize: 10.5 }}>Active</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--danger)',
              display: 'block',
            }}
          />
          <span className="t-meta" style={{ fontSize: 10.5 }}>Delayed</span>
        </div>
      </div>
    </div>
  )
}

export default function DayOfFlightPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [data, setData] = useState<DayBoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [noteInput, setNoteInput] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const eventEndRef = useRef<HTMLDivElement>(null)

  const loadData = () => {
    operatorDayOfFlightService
      .getDayBoard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (eventEndRef.current) {
      eventEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [data?.events])

  const delayedFlights = (data?.flights ?? []).filter(f => f.is_delayed)
  const activeFlights = data?.flights ?? []

  const handleAddNote = async () => {
    if (!noteInput.trim() || !data?.flights.length) return
    setAddingNote(true)
    try {
      const firstFlight = data.flights[0]
      await operatorDayOfFlightService.addEventLog(firstFlight.id, noteInput.trim())
      setNoteInput('')
      loadData()
    } catch {
      // silent
    } finally {
      setAddingNote(false)
    }
  }

  return (
    <Shell
      activeId="dayof"
      breadcrumb="Operations"
      title="Day-of-Flight Control"
      subtitle={`${activeFlights.length} flights today`}
      actions={
        <button className="btn sm accent" onClick={loadData}>
          Refresh
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {delayedFlights.length > 0 && (
          <div
            style={{
              flexShrink: 0,
              background: 'color-mix(in oklab,var(--danger) 10%,var(--surface))',
              borderBottom: '1px solid color-mix(in oklab,var(--danger) 30%,var(--rule))',
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <AlertTriangle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--danger)' }}>
              {delayedFlights.length} flight{delayedFlights.length > 1 ? 's' : ''} delayed
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>—</span>
            {delayedFlights.map(f => (
              <button
                key={f.id}
                className="btn sm"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  letterSpacing: '0.06em',
                  color: 'var(--danger)',
                  borderColor: 'color-mix(in oklab,var(--danger) 30%,var(--rule))',
                }}
                onClick={() => navigate(`/day-of-flight/${f.id}`)}
              >
                {f.booking_ref}
                {f.delay_minutes !== null && ` +${f.delay_minutes}m`}
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            flexShrink: 0,
            padding: '12px 20px',
            borderBottom: '1px solid var(--rule)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div style={{ display: 'flex', gap: 12, width: 'max-content' }}>
            {loading && (
              <span className="t-meta" style={{ padding: '20px 0' }}>Loading flights…</span>
            )}
            {!loading && activeFlights.length === 0 && (
              <span className="t-meta" style={{ padding: '20px 0' }}>No flights scheduled today.</span>
            )}
            {!loading && activeFlights.map(f => (
              <FlightCard
                key={f.id}
                flight={f}
                onClick={() => navigate(`/day-of-flight/${f.id}`)}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            minHeight: 0,
            flexDirection: isMobile ? 'column' : 'row',
          }}
        >
          <MapArea flights={activeFlights} />

          <div
            style={{
              width: isMobile ? '100%' : 380,
              flexShrink: 0,
              borderLeft: isMobile ? 'none' : '1px solid var(--rule)',
              borderTop: isMobile ? '1px solid var(--rule)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--surface)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px 10px',
                borderBottom: '1px solid var(--rule)',
                flexShrink: 0,
              }}
            >
              <span className="t-label">Event Log</span>
              <span
                style={{
                  marginLeft: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: 'var(--ink)',
                  color: 'var(--bg)',
                }}
              >
                {data?.events.length ?? 0}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px' }}>
              {(data?.events ?? []).length === 0 && (
                <div className="t-meta" style={{ textAlign: 'center', padding: '20px 0' }}>
                  No events yet.
                </div>
              )}
              {(data?.events ?? []).map(ev => (
                <EventLogEntry key={ev.id} ev={ev} />
              ))}
              <div ref={eventEndRef} />
            </div>

            <div
              style={{
                flexShrink: 0,
                padding: '10px 12px',
                borderTop: '1px solid var(--rule)',
                display: 'flex',
                gap: 6,
              }}
            >
              <input
                className="input"
                style={{ flex: 1, fontSize: 12.5 }}
                placeholder="Add ops note…"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddNote() }}
                disabled={addingNote}
              />
              <button
                className="btn sm accent"
                onClick={handleAddNote}
                disabled={addingNote || !noteInput.trim()}
                style={{ flexShrink: 0 }}
              >
                {addingNote ? (
                  <Clock size={12} />
                ) : (
                  <Send size={12} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
