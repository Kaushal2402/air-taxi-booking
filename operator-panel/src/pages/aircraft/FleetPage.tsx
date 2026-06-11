import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  Plus,
  Search,
  Settings,
  Upload,
} from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { AircraftListItem } from '../../services/operatorAircraftService'
import { operatorAircraftService } from '../../services/operatorAircraftService'
import AddAircraftModal from './AddAircraftModal'

const STATUS_TONE: Record<string, string> = {
  available: 'ok',
  'in-air': 'info',
  maintenance: 'warn',
  grounded: 'danger',
  scheduled: 'pending',
  submitted: 'pending',
  approved: 'ok',
}

function normaliseStatus(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, '-')
}

function AircraftStatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status.toLowerCase()] ?? 'pending'
  return (
    <span className={`badge ${tone}`} style={{ height: 20, fontSize: 10.5 }}>
      <span className={`dot ${tone}`} />
      {normaliseStatus(status)}
    </span>
  )
}

function UtilBar({ pct }: { pct: number }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="t-meta" style={{ fontSize: 10.5 }}>Flight hours utilisation</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: pct > 70 ? 'var(--ok)' : 'var(--accent)',
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  )
}

function FleetCard({
  a,
  onClick,
}: {
  a: AircraftListItem
  onClick: () => void
}) {
  const isGrounded = a.status.toLowerCase() === 'grounded' || a.status.toLowerCase() === 'maintenance'
  const util = a.total_flight_hours > 0 ? Math.min(Math.round((a.total_flight_hours / 5000) * 100), 100) : 0

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px 18px',
        background: isGrounded
          ? 'color-mix(in oklab,var(--warn-soft) 50%,var(--surface))'
          : 'var(--surface)',
        border: `1.5px solid ${isGrounded ? 'color-mix(in oklab,var(--warn) 28%,var(--rule))' : 'var(--rule)'}`,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 15,
                letterSpacing: '0.06em',
                color: 'var(--ink)',
                fontWeight: 600,
              }}
            >
              {a.registration_mark}
            </span>
            <AircraftStatusBadge status={a.status} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{a.aircraft_type_name}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--rule-strong)' }} />
            <span>{a.seat_capacity} pax max</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--rule-strong)' }} />
            <span>{a.range_nm} nm range</span>
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

      <UtilBar pct={util} />

      <div
        style={{
          display: 'flex',
          gap: 0,
          borderTop: '1px solid var(--rule-soft)',
          paddingTop: 10,
        }}
      >
        {[
          ['Total hours', `${a.total_flight_hours} h`],
          ['Cycles', `${a.total_cycles}`],
          ['Base', a.home_base_name ?? '—'],
        ].map(([k, v], i) => (
          <div
            key={k}
            style={{
              flex: 1,
              paddingLeft: i > 0 ? 14 : 0,
              borderLeft: i > 0 ? '1px solid var(--rule-soft)' : 'none',
              marginLeft: i > 0 ? 14 : 0,
            }}
          >
            <div className="t-label" style={{ marginBottom: 3 }}>
              {k}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--ink)',
                letterSpacing: '0.03em',
              }}
            >
              {v}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FleetPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [aircraft, setAircraft] = useState<AircraftListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    operatorAircraftService
      .list()
      .then(setAircraft)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const hasGrounded = aircraft.some(
    a => a.status.toLowerCase() === 'grounded'
  )

  const filtered = aircraft.filter(a => {
    const matchSearch =
      a.registration_mark.toLowerCase().includes(search.toLowerCase()) ||
      a.aircraft_type_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      statusFilter === 'All' || a.status.toLowerCase() === statusFilter.toLowerCase()
    return matchSearch && matchStatus
  })

  const statuses = ['All', ...Array.from(new Set(aircraft.map(a => normaliseStatus(a.status))))]

  return (
    <Shell
      activeId="aircraft"
      breadcrumb="Fleet & Crew"
      title="Aircraft & Fleet"
      subtitle={`${aircraft.length} aircraft registered${hasGrounded ? ' · airworthiness alert' : ''}`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn sm accent"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={12} />
            Add aircraft
          </button>
        </div>
      }
    >
      {hasGrounded && (
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
          <AlertTriangle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
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
            One or more aircraft grounded
          </span>
          <span style={{ width: 1, height: 14, background: 'color-mix(in oklab,var(--danger) 28%,var(--rule))' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
            Review airworthiness documents and renew before scheduling flights.
          </span>
          <div style={{ flex: 1 }} />
          <button className="btn sm danger" style={{ height: 28 }}>
            <Upload size={11} />
            Upload ARC →
          </button>
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
            placeholder="Search by reg, type…"
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
          {statuses.map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>
          {filtered.length} aircraft
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
            Loading fleet…
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
            <Layers size={32} strokeWidth={1} />
            <div style={{ fontSize: 14 }}>No aircraft registered yet</div>
            <button
              className="btn sm accent"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={12} />
              Add your first aircraft
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: 16,
            }}
          >
            {filtered.map(a => (
              <FleetCard
                key={a.id}
                a={a}
                onClick={() => navigate(`/aircraft/${a.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddAircraftModal
          onClose={() => setShowAddModal(false)}
          onCreated={a => {
            setAircraft(prev => [a as unknown as AircraftListItem, ...prev])
            setShowAddModal(false)
          }}
        />
      )}
    </Shell>
  )
}
