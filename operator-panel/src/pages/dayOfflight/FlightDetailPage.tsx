import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Gauge,
  Layers,
  MessageSquare,
  Phone,
  Send,
  Users,
  X,
} from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { FlightDetail, DelayPayload } from '../../services/operatorDayOfFlightService'
import { operatorDayOfFlightService } from '../../services/operatorDayOfFlightService'

function fmtTime(iso: string | null) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtTs(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function TelemetryItem({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: string | number | null
  unit?: string
}) {
  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        padding: '10px 12px',
        borderRight: '1px solid var(--rule)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ink-4)' }}>
        {icon}
        <span className="t-label" style={{ fontSize: 9.5 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 700,
            color: value !== null ? 'var(--ink)' : 'var(--ink-4)',
          }}
        >
          {value !== null && value !== undefined ? String(value) : '—'}
        </span>
        {unit && value !== null && (
          <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

function FlightSVGMap({ flight }: { flight: FlightDetail }) {
  const ox = 160
  const oy = 320
  const dx = 640
  const dy = 160
  const px = ox + (dx - ox) * (flight.progress_pct / 100)
  const py = oy + (dy - oy) * (flight.progress_pct / 100)

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 800 480"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
    >
      <defs>
        <pattern id="flt-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--rule-soft)" strokeWidth="0.5" />
        </pattern>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="color-mix(in oklab,var(--accent) 50%,var(--rule))" />
        </marker>
      </defs>
      <rect width="800" height="480" fill="url(#flt-grid)" />

      <line
        x1={ox} y1={oy} x2={dx} y2={dy}
        stroke="color-mix(in oklab,var(--accent) 30%,var(--rule))"
        strokeWidth={1.5}
        strokeDasharray="8 5"
        markerEnd="url(#arrow)"
      />

      <circle cx={ox} cy={oy} r={8} fill="var(--surface)" stroke="var(--rule-strong)" strokeWidth={2} />
      <text x={ox + 12} y={oy + 5} fontSize={11} fill="var(--ink-2)" fontFamily="var(--font-mono)" fontWeight="600">
        {flight.origin_name}
      </text>

      <circle cx={dx} cy={dy} r={8} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2} />
      <text x={dx + 12} y={dy + 5} fontSize={11} fill="var(--ink-2)" fontFamily="var(--font-mono)" fontWeight="600">
        {flight.destination_name}
      </text>

      {(flight.status === 'airborne' || flight.status === 'departed') && (
        <g>
          <circle
            cx={px}
            cy={py}
            r={10}
            fill={flight.is_delayed ? 'var(--danger)' : 'var(--accent)'}
            opacity={0.9}
          />
          <text
            x={px}
            y={py + 4}
            textAnchor="middle"
            fontSize={10}
            fill="white"
            fontFamily="var(--font-mono)"
            fontWeight="700"
          >
            ✈
          </text>
        </g>
      )}

      <text
        x="400" y="460"
        textAnchor="middle"
        fontSize={10}
        fill="var(--ink-4)"
        fontFamily="var(--font-mono)"
        letterSpacing="0.06em"
      >
        {flight.booking_ref} · {flight.progress_pct}% COMPLETE
      </text>
    </svg>
  )
}

function DelayModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (payload: DelayPayload) => void
  onCancel: () => void
}) {
  const [minutes, setMinutes] = useState('')
  const [reason, setReason] = useState('')
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--rule)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14 }}>Log Delay</span>
          <button className="btn sm ghost" onClick={onCancel} style={{ padding: '2px 6px' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label className="field-label">Delay (minutes)</label>
            <input
              className="input"
              type="number"
              min={1}
              placeholder="e.g. 30"
              value={minutes}
              onChange={e => setMinutes(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">Reason</label>
            <input
              className="input"
              placeholder="Weather, ATC, mechanical…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        </div>
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--rule)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <button className="btn sm ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn sm accent"
            disabled={!minutes || !reason.trim()}
            onClick={() => onConfirm({ delay_minutes: parseInt(minutes, 10), reason: reason.trim() })}
          >
            Log Delay
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FlightDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [flight, setFlight] = useState<FlightDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatMsg, setChatMsg] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDelayModal, setShowDelayModal] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const loadData = () => {
    if (!id) return
    operatorDayOfFlightService
      .getFlightDetail(id)
      .then(setFlight)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [id])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [flight?.crew_comms])

  const handleAction = async (action: string) => {
    if (!id) return
    setActionLoading(action)
    try {
      if (action === 'depart') {
        const updated = await operatorDayOfFlightService.markDepart(id, {})
        setFlight(updated)
      } else if (action === 'arrive') {
        const updated = await operatorDayOfFlightService.markArrive(id, {})
        setFlight(updated)
      } else if (action === 'close') {
        const updated = await operatorDayOfFlightService.closeFlight(id)
        setFlight(updated)
      }
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogDelay = async (payload: DelayPayload) => {
    if (!id) return
    setShowDelayModal(false)
    setActionLoading('delay')
    try {
      const updated = await operatorDayOfFlightService.logDelay(id, payload)
      setFlight(updated)
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendChat = async () => {
    if (!chatMsg.trim() || !id) return
    setSendingChat(true)
    try {
      await operatorDayOfFlightService.addEventLog(id, chatMsg.trim())
      setChatMsg('')
      loadData()
    } catch {
      // silent
    } finally {
      setSendingChat(false)
    }
  }

  const canDepart = flight && !['departed', 'airborne', 'arrived', 'closed'].includes(flight.status)
  const canArrive = flight && ['departed', 'airborne'].includes(flight.status)
  const canClose = flight && flight.status === 'arrived'

  if (loading) {
    return (
      <Shell activeId="dayof" breadcrumb="Day-of-Flight" title="Flight Detail" subtitle="">
        <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>Loading…</div>
      </Shell>
    )
  }

  if (!flight) {
    return (
      <Shell activeId="dayof" breadcrumb="Day-of-Flight" title="Flight Detail" subtitle="">
        <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>Flight not found.</div>
      </Shell>
    )
  }

  return (
    <Shell
      activeId="dayof"
      breadcrumb="Day-of-Flight"
      title={flight.booking_ref}
      subtitle={`${flight.origin_name} → ${flight.destination_name}`}
      actions={
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className="btn sm ghost"
            onClick={() => navigate('/day-of-flight')}
          >
            <ArrowLeft size={12} />
            Board
          </button>
          <button
            className="btn sm"
            onClick={() => setShowDelayModal(true)}
            disabled={actionLoading !== null}
          >
            <AlertTriangle size={12} />
            Log Delay
          </button>
          <button
            className="btn sm"
            disabled={actionLoading !== null}
            onClick={() => window.alert('Crew call initiated')}
          >
            <Phone size={12} />
            Call Crew
          </button>
          {canDepart && (
            <button
              className="btn sm accent"
              disabled={actionLoading !== null}
              onClick={() => handleAction('depart')}
            >
              {actionLoading === 'depart' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
              Mark Departed
            </button>
          )}
          {canArrive && (
            <button
              className="btn sm accent"
              disabled={actionLoading !== null}
              onClick={() => handleAction('arrive')}
            >
              {actionLoading === 'arrive' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
              Mark Arrived
            </button>
          )}
          {canClose && (
            <button
              className="btn sm"
              style={{ color: 'var(--ink-4)' }}
              disabled={actionLoading !== null}
              onClick={() => handleAction('close')}
            >
              {actionLoading === 'close' ? <Clock size={12} /> : <X size={12} />}
              Close Flight
            </button>
          )}
        </div>
      }
    >
      {showDelayModal && (
        <DelayModal
          onConfirm={handleLogDelay}
          onCancel={() => setShowDelayModal(false)}
        />
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            borderRight: isMobile ? 'none' : '1px solid var(--rule)',
          }}
        >
          <div
            style={{
              flex: 1,
              background: 'color-mix(in oklab,var(--accent) 4%,var(--bg))',
              overflow: 'hidden',
            }}
          >
            <FlightSVGMap flight={flight} />
          </div>

          <div
            style={{
              flexShrink: 0,
              borderTop: '1px solid var(--rule)',
              background: 'var(--surface)',
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            <TelemetryItem
              icon={<Layers size={10} />}
              label="ALTITUDE"
              value={flight.telemetry.altitude_ft}
              unit="ft"
            />
            <TelemetryItem
              icon={<Gauge size={10} />}
              label="SPEED"
              value={flight.telemetry.speed_kts}
              unit="kts"
            />
            <TelemetryItem
              icon={<Compass size={10} />}
              label="HEADING"
              value={flight.telemetry.heading_deg !== null ? `${flight.telemetry.heading_deg}°` : null}
            />
            <div
              style={{
                flex: '1 1 0',
                minWidth: 0,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span className="t-label" style={{ fontSize: 9.5 }}>ETA</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: flight.is_delayed ? 'var(--danger)' : 'var(--ink)' }}>
                {fmtTime(flight.eta)}
              </span>
              {flight.telemetry.last_acars && (
                <span className="t-meta" style={{ fontSize: 9.5 }}>
                  ACARS {fmtTs(flight.telemetry.last_acars)}
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              flexShrink: 0,
              borderTop: '1px solid var(--rule)',
              padding: '8px 16px',
              background: 'var(--surface-2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 5,
              }}
            >
              <span className="t-meta" style={{ fontSize: 10.5 }}>
                {fmtTime(flight.etd)}
              </span>
              <span className="t-meta" style={{ fontSize: 10.5 }}>
                {flight.progress_pct}% complete
              </span>
              <span className="t-meta" style={{ fontSize: 10.5 }}>
                {fmtTime(flight.eta)}
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: 'var(--rule-soft)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(flight.progress_pct, 100)}%`,
                  background: flight.is_delayed ? 'var(--danger)' : 'var(--accent)',
                  borderRadius: 3,
                  transition: 'width 0.6s',
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            width: isMobile ? '100%' : 380,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--surface)',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              padding: '14px 16px 12px',
              borderBottom: '1px solid var(--rule)',
              background: 'var(--surface-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <Users size={13} style={{ color: 'var(--ink-3)' }} />
              <span className="t-label">Passenger Manifest</span>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="t-label" style={{ fontSize: 9.5 }}>TOTAL PAX</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                  {flight.passenger_summary.total}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="t-label" style={{ fontSize: 9.5 }}>CHECKED IN</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 18,
                    fontWeight: 700,
                    color: flight.passenger_summary.checked_in === flight.passenger_summary.total
                      ? 'var(--accent)'
                      : 'var(--ink)',
                  }}
                >
                  {flight.passenger_summary.checked_in}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="t-label" style={{ fontSize: 9.5 }}>BAGGAGE</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                  {flight.passenger_summary.baggage_kg}
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink-4)', marginLeft: 2 }}>kg</span>
                </span>
              </div>
            </div>
            {flight.passenger_summary.all_checked && (
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  background: 'color-mix(in oklab,var(--accent) 10%,var(--surface))',
                  border: '1px solid color-mix(in oklab,var(--accent) 30%,var(--rule))',
                  borderRadius: 3,
                }}
              >
                <CheckCircle2 size={12} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                  All passengers checked in
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              flexShrink: 0,
              padding: '10px 16px 8px',
              borderBottom: '1px solid var(--rule)',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <MessageSquare size={13} style={{ color: 'var(--ink-3)' }} />
            <span className="t-label">Crew Comms</span>
            {flight.pilot_name && (
              <span className="t-meta" style={{ fontSize: 10.5, marginLeft: 4 }}>
                {flight.pilot_name}
                {flight.copilot_name ? ` · ${flight.copilot_name}` : ''}
              </span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {flight.crew_comms.length === 0 && (
              <div className="t-meta" style={{ textAlign: 'center', padding: '16px 0' }}>
                No messages yet.
              </div>
            )}
            {flight.crew_comms.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: msg.is_ops ? 'row-reverse' : 'row',
                  gap: 8,
                  alignItems: 'flex-end',
                }}
              >
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '7px 10px',
                    borderRadius: msg.is_ops ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                    background: msg.is_ops
                      ? 'color-mix(in oklab,var(--accent) 15%,var(--surface))'
                      : 'var(--surface-2)',
                    border: `1px solid ${msg.is_ops ? 'color-mix(in oklab,var(--accent) 30%,var(--rule))' : 'var(--rule)'}`,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: msg.is_ops ? 'var(--accent)' : 'var(--ink-2)', marginBottom: 3 }}>
                    {msg.sender}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.4 }}>
                    {msg.message}
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--ink-4)', marginTop: 4, fontFamily: 'var(--font-mono)', textAlign: msg.is_ops ? 'right' : 'left' }}>
                    {fmtTs(msg.sent_at)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
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
              placeholder="Message crew…"
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendChat() }}
              disabled={sendingChat}
            />
            <button
              className="btn sm accent"
              onClick={handleSendChat}
              disabled={sendingChat || !chatMsg.trim()}
              style={{ flexShrink: 0 }}
            >
              {sendingChat ? <Clock size={12} /> : <Send size={12} />}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )
}
