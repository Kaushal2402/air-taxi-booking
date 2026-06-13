import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Plane,
  Users,
  Weight,
} from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { FlightBrief } from '../../services/operatorCompanionService'
import { operatorCompanionService } from '../../services/operatorCompanionService'

function fmtTime(val: string | null): string {
  if (!val) return '—'
  const d = new Date(val)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtDateTime(val: string | null): string {
  if (!val) return '—'
  const d = new Date(val)
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function roleBadgeLabel(role: string): string {
  const r = role.toLowerCase()
  if (r === 'pilot' || r === 'captain') return 'CPT'
  if (r === 'copilot' || r === 'first_officer') return 'F/O'
  if (r === 'cabin_crew' || r === 'attendant') return 'CC'
  return role.toUpperCase().slice(0, 3)
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  confirmed: ['boarding'],
  assigned: ['boarding'],
  boarding: ['departed'],
  departed: ['arrived'],
}

const STATUS_LABELS: Record<string, string> = {
  boarding: 'Mark Boarding',
  departed: 'Mark Departed',
  arrived: 'Mark Arrived',
}

const STATUS_COLORS: Record<string, string> = {
  boarding: 'var(--warning, #d97706)',
  departed: 'var(--accent)',
  arrived: 'var(--ink)',
}

export default function FlightBriefPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [brief, setBrief] = useState<FlightBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const loadBrief = () => {
    if (!id) return
    operatorCompanionService
      .getFlightBrief(id)
      .then(setBrief)
      .catch(() => setError('Failed to load flight brief'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadBrief() }, [id])

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id || updating) return
    setUpdating(true)
    try {
      const updated = await operatorCompanionService.updateStatus(id, newStatus)
      setBrief(updated)
    } catch {
      setError('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const nextStatuses = brief ? (STATUS_TRANSITIONS[brief.status.toLowerCase()] ?? []) : []

  return (
    <Shell
      activeId="companion"
      breadcrumb="My Assignments"
      title="Flight Brief"
      subtitle={brief?.booking_ref ?? ''}
      actions={
        <button
          className="btn sm ghost"
          onClick={() => navigate('/companion')}
          style={{ minHeight: 44, minWidth: 44 }}
        >
          <ArrowLeft size={14} />
          Back
        </button>
      }
    >
      <div
        style={{
          maxWidth: isMobile ? '100%' : 600,
          margin: '0 auto',
          padding: isMobile ? '16px 12px 80px' : '24px 16px 40px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {loading && (
          <div className="t-meta" style={{ textAlign: 'center', padding: 48 }}>
            Loading…
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              background: 'var(--danger-soft)',
              border: '1px solid color-mix(in oklab,var(--danger) 25%,var(--rule))',
              color: 'var(--danger)',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {!loading && brief && (
          <>
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--rule)',
                borderRadius: 8,
                padding: isMobile ? 16 : 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    letterSpacing: '0.07em',
                    color: 'var(--ink)',
                    fontWeight: 600,
                  }}
                >
                  {brief.booking_ref}
                </span>
                <span className="badge info" style={{ fontSize: 10 }}>
                  {brief.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: isMobile ? 20 : 18,
                    fontWeight: 800,
                    color: 'var(--ink)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {brief.origin_name}
                </span>
                <ArrowRight size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: isMobile ? 20 : 18,
                    fontWeight: 800,
                    color: 'var(--ink)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {brief.destination_name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Clock size={13} style={{ color: 'var(--ink-4)' }} />
                <span className="t-meta" style={{ fontSize: 12 }}>
                  ETD {fmtDateTime(brief.etd)}
                </span>
                {brief.eta && (
                  <>
                    <span style={{ color: 'var(--rule-strong)' }}>·</span>
                    <span className="t-meta" style={{ fontSize: 12 }}>
                      ETA {fmtTime(brief.eta)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--rule)',
                borderRadius: 8,
                padding: isMobile ? 16 : 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <span className="t-label" style={{ fontSize: 11 }}>
                Aircraft
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plane size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                  {brief.aircraft_reg ?? '—'}
                </span>
                {brief.aircraft_type && (
                  <span className="t-meta" style={{ fontSize: 12 }}>
                    {brief.aircraft_type}
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--rule)',
                borderRadius: 8,
                padding: isMobile ? 16 : 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <span className="t-label" style={{ fontSize: 11 }}>
                Crew
              </span>
              {brief.crew.length === 0 && (
                <span className="t-meta" style={{ fontSize: 13 }}>
                  No crew assigned
                </span>
              )}
              {brief.crew.map((c, i) => (
                <div
                  key={c.crew_member_id + i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 0',
                    borderTop: i > 0 ? '1px solid var(--rule-soft)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'color-mix(in oklab,var(--accent) 15%,var(--surface))',
                      border: '1px solid color-mix(in oklab,var(--accent) 30%,var(--rule))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--accent)',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {c.crew_member_name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', flex: 1 }}>
                    {c.crew_member_name}
                  </span>
                  <span
                    style={{
                      padding: '2px 9px',
                      borderRadius: 4,
                      background: 'color-mix(in oklab,var(--accent) 10%,var(--surface))',
                      border: '1px solid color-mix(in oklab,var(--accent) 25%,var(--rule))',
                      color: 'var(--accent)',
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {roleBadgeLabel(c.role)}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--rule)',
                  borderRadius: 8,
                  padding: isMobile ? 16 : 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  alignItems: 'flex-start',
                }}
              >
                <Users size={18} style={{ color: 'var(--accent)' }} />
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: 'var(--ink)',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {brief.pax_count}
                </span>
                <span className="t-meta" style={{ fontSize: 11 }}>
                  Passengers
                </span>
                {brief.all_checked_in && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 4,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'color-mix(in oklab,var(--accent) 10%,var(--surface))',
                      border: '1px solid color-mix(in oklab,var(--accent) 25%,var(--rule))',
                    }}
                  >
                    <Check size={10} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>
                      All Checked In
                    </span>
                  </div>
                )}
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--rule)',
                  borderRadius: 8,
                  padding: isMobile ? 16 : 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  alignItems: 'flex-start',
                }}
              >
                <Weight size={18} style={{ color: 'var(--ink-3)' }} />
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: 'var(--ink)',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {brief.total_baggage_kg}
                </span>
                <span className="t-meta" style={{ fontSize: 11 }}>
                  Total Baggage (kg)
                </span>
              </div>
            </div>

            {brief.special_assistance && brief.special_assistance.length > 0 && (
              <div
                style={{
                  background: 'var(--warning-soft, color-mix(in oklab,#d97706 10%,var(--surface)))',
                  border: '1px solid color-mix(in oklab,#d97706 25%,var(--rule))',
                  borderRadius: 8,
                  padding: isMobile ? 14 : 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={15} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#d97706',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Special Assistance Required
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {brief.special_assistance.map((flag, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 4,
                        background: 'color-mix(in oklab,#d97706 15%,var(--surface))',
                        border: '1px solid color-mix(in oklab,#d97706 30%,var(--rule))',
                        color: '#92400e',
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {nextStatuses.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  marginTop: 8,
                }}
              >
                {nextStatuses.map(s => (
                  <button
                    key={s}
                    disabled={updating}
                    onClick={() => handleStatusUpdate(s)}
                    style={{
                      width: '100%',
                      minHeight: 52,
                      fontSize: 15,
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      border: 'none',
                      borderRadius: 8,
                      cursor: updating ? 'not-allowed' : 'pointer',
                      background: STATUS_COLORS[s] ?? 'var(--accent)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: updating ? 0.6 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {updating ? 'Updating…' : STATUS_LABELS[s] ?? s}
                  </button>
                ))}
              </div>
            )}

            {nextStatuses.length === 0 && brief.status.toLowerCase() !== 'arrived' && brief.status.toLowerCase() !== 'completed' && (
              <div className="t-meta" style={{ textAlign: 'center', fontSize: 12, padding: '8px 0' }}>
                No status actions available
              </div>
            )}

            {(brief.status.toLowerCase() === 'arrived' || brief.status.toLowerCase() === 'completed') && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '16px',
                  borderRadius: 8,
                  background: 'color-mix(in oklab,var(--accent) 8%,var(--surface))',
                  border: '1px solid color-mix(in oklab,var(--accent) 20%,var(--rule))',
                }}
              >
                <Check size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                  Flight Complete
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  )
}
