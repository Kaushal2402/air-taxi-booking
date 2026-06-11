import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Mail,
  Phone,
  Plus,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { CrewMemberListItem } from '../../services/operatorCrewService'
import { operatorCrewService } from '../../services/operatorCrewService'
import AddCrewModal from './AddCrewModal'

const AVAIL_TONE: Record<string, string> = {
  available: 'ok',
  'on duty': 'info',
  'rest period': 'warn',
  'off duty': 'pending',
  'fdp exceeded': 'danger',
  leave: 'pending',
}

function AvailPill({ status }: { status: string }) {
  const tone = AVAIL_TONE[status.toLowerCase()] ?? 'pending'
  return (
    <span className={`badge ${tone}`} style={{ height: 20, fontSize: 10.5 }}>
      <span className={`dot ${tone}`} />
      {status}
    </span>
  )
}

function DutyBar({ hours }: { hours: number }) {
  const pct = Math.min(Math.round((hours / 100) * 100), 100)
  const color = pct > 80 ? 'var(--danger)' : pct > 70 ? 'var(--warn)' : 'var(--ok)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="t-meta" style={{ fontSize: 10.5 }}>
          Duty hours (this month)
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: pct > 80 ? 'var(--danger)' : pct > 70 ? 'var(--warn)' : 'var(--ink-3)',
          }}
        >
          {hours} / 100 h
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
    </div>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function CrewCard({ c, onClick }: { c: CrewMemberListItem; onClick: () => void }) {
  const isAlert = c.duty_hours_month > 95 || c.availability.toLowerCase() === 'fdp exceeded'

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px 18px',
        background: isAlert
          ? 'color-mix(in oklab,var(--danger-soft) 45%,var(--surface))'
          : 'var(--surface)',
        border: `1.5px solid ${isAlert ? 'color-mix(in oklab,var(--danger) 28%,var(--rule))' : 'var(--rule)'}`,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          className="avatar"
          style={{ width: 44, height: 44, fontSize: 15, flexShrink: 0 }}
        >
          {initials(c.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 3,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>
              {c.name}
            </span>
            <AvailPill status={c.availability} />
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--ink-3)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span>{c.crew_role}</span>
            {c.license_no && (
              <>
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: 'var(--rule-strong)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
                  {c.license_no}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          className="btn sm icon"
          style={{ height: 28, width: 28 }}
          onClick={e => {
            e.stopPropagation()
            onClick()
          }}
        >
          <Settings size={13} />
        </button>
      </div>

      <DutyBar hours={c.duty_hours_month} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingTop: 8,
          borderTop: '1px solid var(--rule-soft)',
        }}
      >
        <div
          style={{
            flex: 1,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-4)',
          }}
        >
          {c.total_flight_hours.toLocaleString()} hrs total
        </div>
        <button className="btn sm icon" style={{ height: 24, width: 24 }}>
          <Phone size={11} />
        </button>
        <button className="btn sm icon" style={{ height: 24, width: 24 }}>
          <Mail size={11} />
        </button>
      </div>

      {isAlert && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 7,
            padding: '7px 10px',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab,var(--danger) 25%,var(--rule))',
            borderRadius: 2,
          }}
        >
          <AlertTriangle
            size={12}
            style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }}
          />
          <span style={{ fontSize: 11.5, color: 'var(--danger)', lineHeight: 1.4 }}>
            Monthly FDP at {c.duty_hours_month} h — review before assigning.
          </span>
        </div>
      )}
    </div>
  )
}

export default function CrewRosterPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [crew, setCrew] = useState<CrewMemberListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [availFilter, setAvailFilter] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    operatorCrewService
      .list()
      .then(setCrew)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const hasFdpAlert = crew.some(
    c => c.duty_hours_month > 95 || c.availability.toLowerCase() === 'fdp exceeded'
  )

  const roles = ['All', ...Array.from(new Set(crew.map(c => c.crew_role)))]
  const availabilities = ['All', ...Array.from(new Set(crew.map(c => c.availability)))]

  const filtered = crew.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'All' || c.crew_role === roleFilter
    const matchAvail = availFilter === 'All' || c.availability === availFilter
    return matchSearch && matchRole && matchAvail
  })

  return (
    <Shell
      activeId="crew"
      breadcrumb="Fleet & Crew"
      title="Crew Roster"
      subtitle={`${crew.length} crew members${hasFdpAlert ? ' · FDP alert' : ''}`}
      actions={
        <button className="btn sm accent" onClick={() => setShowAddModal(true)}>
          <Plus size={12} />
          Add crew member
        </button>
      }
    >
      {hasFdpAlert && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 28px',
            height: 42,
            background: 'var(--danger-soft)',
            borderBottom:
              '1px solid color-mix(in oklab,var(--danger) 24%,var(--rule))',
            flexShrink: 0,
          }}
        >
          <AlertTriangle
            size={14}
            style={{ color: 'var(--danger)', flexShrink: 0 }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--danger)',
              fontWeight: 500,
            }}
          >
            FDP exceeded — crew cannot be assigned
          </span>
          <span
            style={{
              width: 1,
              height: 14,
              background: 'color-mix(in oklab,var(--danger) 28%,var(--rule))',
            }}
          />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
            One or more crew members have exceeded monthly FDP. Review before scheduling.
          </span>
        </div>
      )}

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
        <div className="input" style={{ width: 220, height: 32 }}>
          <Search size={13} className="icon" />
          <input
            placeholder="Search crew…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ height: 32, fontSize: 12 }}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          {roles.map(r => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          className="input"
          style={{ height: 32, fontSize: 12 }}
          value={availFilter}
          onChange={e => setAvailFilter(e.target.value)}
        >
          {availabilities.map(a => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>
          {filtered.length} crew members
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '14px' : '20px 24px',
        }}
      >
        {loading ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: 20 }}>
            Loading crew roster…
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
            <Users size={32} strokeWidth={1} />
            <div style={{ fontSize: 14 }}>No crew members yet</div>
            <button
              className="btn sm accent"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={12} />
              Add crew member
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 14,
            }}
          >
            {filtered.map(c => (
              <CrewCard
                key={c.id}
                c={c}
                onClick={() => navigate(`/crew/${c.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddCrewModal
          onClose={() => setShowAddModal(false)}
          onCreated={c => {
            setCrew(prev => [c as unknown as CrewMemberListItem, ...prev])
            setShowAddModal(false)
          }}
        />
      )}
    </Shell>
  )
}
