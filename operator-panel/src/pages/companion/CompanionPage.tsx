import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarDays, ChevronRight, Plane } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { MyAssignment } from '../../services/operatorCompanionService'
import { operatorCompanionService } from '../../services/operatorCompanionService'

function statusColor(status: string): string {
  const s = status.toLowerCase()
  if (s === 'boarding') return 'var(--warning, #d97706)'
  if (s === 'departed') return 'var(--accent)'
  if (s === 'arrived' || s === 'completed') return 'var(--ink-4)'
  if (s === 'confirmed' || s === 'assigned') return 'var(--accent)'
  return 'var(--ink-4)'
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase()
  if (s === 'departed' || s === 'arrived' || s === 'completed') return 'badge ok'
  if (s === 'boarding') return 'badge info'
  return 'badge'
}

function roleBadgeLabel(role: string): string {
  const r = role.toLowerCase()
  if (r === 'pilot' || r === 'captain') return 'CPT'
  if (r === 'copilot' || r === 'first_officer') return 'F/O'
  if (r === 'cabin_crew' || r === 'attendant') return 'CC'
  return role.toUpperCase().slice(0, 3)
}

function fmtETD(etd: string | null): string {
  if (!etd) return '—'
  const d = new Date(etd)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(etd: string | null): string {
  if (!etd) return '—'
  const d = new Date(etd)
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function AssignmentCard({
  assignment,
  onClick,
}: {
  assignment: MyAssignment
  onClick: () => void
}) {
  const isMobile = useIsMobile()

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        padding: isMobile ? '16px' : '14px 18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBottom: 12,
        minHeight: 44,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <CalendarDays size={13} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
            <span
              style={{
                fontSize: 12,
                color: 'var(--ink-3)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
              }}
            >
              {fmtDate(assignment.etd)}
            </span>
            <span
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                color: 'var(--ink-2)',
                fontWeight: 600,
              }}
            >
              {fmtETD(assignment.etd)}
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              color: 'var(--ink-4)',
            }}
          >
            {assignment.booking_ref}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span className={statusBadgeClass(assignment.status)} style={{ fontSize: 10 }}>
            {assignment.status}
          </span>
          <ChevronRight size={16} style={{ color: 'var(--ink-4)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: isMobile ? 17 : 15,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {assignment.origin_name}
        </span>
        <ArrowRight size={16} style={{ color: statusColor(assignment.status), flexShrink: 0 }} />
        <span
          style={{
            fontSize: isMobile ? 17 : 15,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {assignment.destination_name}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Plane size={12} style={{ color: 'var(--ink-4)' }} />
        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>
          {assignment.aircraft_reg ?? '—'}
        </span>
        {assignment.aircraft_type && (
          <span className="t-meta" style={{ fontSize: 11 }}>
            {assignment.aircraft_type}
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 4,
            background: 'color-mix(in oklab,var(--accent) 12%,var(--surface))',
            border: '1px solid color-mix(in oklab,var(--accent) 30%,var(--rule))',
            color: 'var(--accent)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
            minHeight: 24,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {roleBadgeLabel(assignment.my_role)}
        </span>
      </div>
    </div>
  )
}

export default function CompanionPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [assignments, setAssignments] = useState<MyAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    operatorCompanionService
      .getAssignments()
      .then(setAssignments)
      .catch(() => setError('Failed to load assignments'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Shell
      activeId="companion"
      breadcrumb="Crew"
      title="My Assignments"
      subtitle="Your upcoming flights"
    >
      <div
        style={{
          maxWidth: isMobile ? '100%' : 560,
          margin: '0 auto',
          padding: isMobile ? '16px 12px' : '24px 16px',
          flex: 1,
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

        {!loading && !error && assignments.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 64,
              gap: 12,
            }}
          >
            <Plane size={36} style={{ color: 'var(--ink-4)' }} />
            <span className="t-meta" style={{ fontSize: 14, textAlign: 'center' }}>
              No upcoming assignments
            </span>
          </div>
        )}

        {!loading && !error && assignments.length > 0 && (
          <>
            <div className="t-label" style={{ marginBottom: 12, fontSize: 11 }}>
              {assignments.length} flight{assignments.length !== 1 ? 's' : ''}
            </div>
            {assignments.map(a => (
              <AssignmentCard
                key={a.flight_id}
                assignment={a}
                onClick={() => navigate(`/companion/${a.flight_id}`)}
              />
            ))}
          </>
        )}
      </div>
    </Shell>
  )
}
