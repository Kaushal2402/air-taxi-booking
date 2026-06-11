import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { Schedule } from '../../services/operatorRoutesService'
import { operatorRoutesService } from '../../services/operatorRoutesService'

function getWeekStart(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
}

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
const CELL_H = 48
const DAY_W = 150
const TIME_W = 44

const TONE_BG: Record<string, string> = {
  scheduled: 'color-mix(in oklab,var(--accent) 10%,var(--surface))',
  'in-air': 'color-mix(in oklab,var(--info) 14%,var(--surface))',
  completed: 'color-mix(in oklab,var(--ok) 10%,var(--surface))',
}
const TONE_BDR: Record<string, string> = {
  scheduled: 'var(--accent)',
  'in-air': 'var(--info)',
  completed: 'var(--ok)',
}

export default function WeekSchedulePage() {
  const isMobile = useIsMobile()
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    operatorRoutesService
      .listSchedules()
      .then(setSchedules)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekEnd = addDays(weekStart, 7)
  const weekSchedules = schedules.filter(s => {
    const etd = new Date(s.etd)
    return etd >= weekStart && etd < weekEnd
  })

  function evTop(etd: string): number {
    const h = new Date(etd).getHours() + new Date(etd).getMinutes() / 60
    return Math.max(0, (h - HOURS[0]) * CELL_H)
  }

  function evHeight(etd: string, eta: string): number {
    const start = new Date(etd).getHours() + new Date(etd).getMinutes() / 60
    const end = new Date(eta).getHours() + new Date(eta).getMinutes() / 60
    return Math.max(CELL_H / 2, (end - start) * CELL_H)
  }

  const schedulesForDay = (day: Date) =>
    weekSchedules.filter(s => {
      const d = new Date(s.etd)
      d.setHours(0, 0, 0, 0)
      return d.getTime() === day.getTime()
    })

  const fmtLabel = (d: Date) =>
    `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}–${addDays(d, 6).getDate()}, ${d.getFullYear()}`

  return (
    <Shell
      activeId="routes"
      breadcrumb="Schedule & Pricing"
      title="Weekly Schedule"
      subtitle={`${fmtLabel(weekStart)} · ${weekSchedules.length} flights`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm" onClick={() => setWeekStart(w => addDays(w, -7))}>
            <ChevronLeft size={12} />Prev
          </button>
          <button
            className="btn sm accent"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em' }}
            onClick={() => setWeekStart(getWeekStart(new Date()))}
          >
            This week
          </button>
          <button className="btn sm" onClick={() => setWeekStart(w => addDays(w, 7))}>
            Next<ChevronRight size={12} />
          </button>
        </div>
      }
    >
      {loading ? (
        <div style={{ padding: '20px 28px', color: 'var(--ink-3)', fontSize: 13 }}>
          Loading schedule…
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div
            style={{
              display: 'flex',
              position: 'sticky',
              top: 0,
              zIndex: 20,
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <div style={{ width: TIME_W, flexShrink: 0 }} />
            {days.map((d, i) => {
              const isToday = d.getTime() === today.getTime()
              return (
                <div
                  key={i}
                  style={{
                    width: isMobile ? 110 : DAY_W,
                    flexShrink: 0,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.05em',
                    color: isToday ? 'var(--accent)' : 'var(--ink-3)',
                    fontWeight: isToday ? 600 : 400,
                    borderLeft: '1px solid var(--rule)',
                    background: isToday
                      ? 'color-mix(in oklab,var(--accent) 5%,var(--surface-2))'
                      : undefined,
                  }}
                >
                  {isToday && (
                    <span className="dot info" style={{ marginRight: 5 }} />
                  )}
                  {fmtDay(d)}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex' }}>
            <div style={{ width: TIME_W, flexShrink: 0 }}>
              {HOURS.map(h => (
                <div
                  key={h}
                  style={{
                    height: CELL_H,
                    display: 'flex',
                    alignItems: 'flex-start',
                    paddingTop: 4,
                    paddingRight: 6,
                    justifyContent: 'flex-end',
                    borderBottom: '1px solid var(--rule-soft)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9.5,
                      color: 'var(--ink-4)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {days.map((d, di) => {
              const isToday = d.getTime() === today.getTime()
              const dayEvents = schedulesForDay(d)
              return (
                <div
                  key={di}
                  style={{
                    width: isMobile ? 110 : DAY_W,
                    flexShrink: 0,
                    position: 'relative',
                    borderLeft: '1px solid var(--rule)',
                    background: isToday
                      ? 'color-mix(in oklab,var(--accent) 3%,var(--bg))'
                      : 'var(--bg)',
                  }}
                >
                  {HOURS.map(h => (
                    <div
                      key={h}
                      style={{ height: CELL_H, borderBottom: '1px solid var(--rule-soft)' }}
                    />
                  ))}
                  {dayEvents.map(e => {
                    const tone = e.status.toLowerCase()
                    return (
                      <div
                        key={e.id}
                        style={{
                          position: 'absolute',
                          top: evTop(e.etd) + 2,
                          height: evHeight(e.etd, e.eta) - 4,
                          left: 3,
                          right: 3,
                          background: TONE_BG[tone] ?? TONE_BG.scheduled,
                          border: `1px solid ${TONE_BDR[tone] ?? TONE_BDR.scheduled}`,
                          borderRadius: 2,
                          padding: '3px 5px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: '0.03em',
                            color: 'var(--ink)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {e.aircraft_registration ?? e.id.slice(0, 8)}
                        </div>
                        <div style={{ fontSize: 8.5, color: 'var(--ink-4)', marginTop: 1 }}>
                          {new Date(e.etd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Shell>
  )
}
