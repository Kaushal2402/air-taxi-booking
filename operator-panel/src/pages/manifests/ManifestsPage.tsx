import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Download, Search } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import { fmtDateTime, fmtDateShort } from '../../lib/format'
import type { ManifestSummary } from '../../services/operatorManifestsService'
import { operatorManifestsService } from '../../services/operatorManifestsService'

type TabId = 'all' | 'draft' | 'submitted' | 'approved' | 'overdue'

const STATUS_TONE: Record<string, string> = {
  draft: 'pending',
  submitted: 'info',
  approved: 'ok',
  rejected: 'danger',
}

function isOverdue(m: ManifestSummary): boolean {
  if (!m.submission_deadline) return false
  if (m.status === 'submitted' || m.status === 'approved') return false
  return new Date(m.submission_deadline).getTime() < Date.now()
}

function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'pending'
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`badge ${tone}`} style={{ height: 19 }}>
      <span className={`dot ${tone}`} />
      {label}
    </span>
  )
}

function OverdueBadge() {
  return (
    <span
      className="badge danger"
      style={{ height: 19 }}
    >
      <span className="dot danger" />
      Overdue
    </span>
  )
}

export default function ManifestsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [manifests, setManifests] = useState<ManifestSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [search, setSearch] = useState('')

  const loadData = () => {
    operatorManifestsService
      .list()
      .then(setManifests)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const overdueItems = useMemo(() => manifests.filter(isOverdue), [manifests])

  const tabCounts = useMemo<Record<TabId, number>>(() => ({
    all: manifests.length,
    draft: manifests.filter(m => m.status === 'draft').length,
    submitted: manifests.filter(m => m.status === 'submitted').length,
    approved: manifests.filter(m => m.status === 'approved').length,
    overdue: overdueItems.length,
  }), [manifests, overdueItems])

  const filtered = useMemo(() => {
    return manifests.filter(m => {
      if (activeTab === 'overdue') return isOverdue(m)
      if (activeTab !== 'all' && m.status !== activeTab) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          m.booking_ref.toLowerCase().includes(q) ||
          m.origin_code.toLowerCase().includes(q) ||
          m.destination_code.toLowerCase().includes(q) ||
          m.origin_name.toLowerCase().includes(q) ||
          m.destination_name.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [manifests, activeTab, search])

  const handleExport = (e: React.MouseEvent, flightId: string) => {
    e.stopPropagation()
    operatorManifestsService.exportManifest(flightId).then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `manifest-${flightId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }).catch(console.error)
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'submitted', label: 'Submitted' },
    { id: 'approved', label: 'Approved' },
    { id: 'overdue', label: 'Overdue' },
  ]

  return (
    <Shell
      activeId="manifests"
      breadcrumb="Operations"
      title="Passenger Manifests"
      subtitle={`${tabCounts.draft} draft · ${tabCounts.submitted} submitted`}
      actions={
        <button className="btn sm">
          <Download size={12} />
          Export All
        </button>
      }
    >
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--rule)',
          padding: '0 28px',
          background: 'var(--surface)',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {tabs.map(t => (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              height: 44,
              padding: '0 14px',
              cursor: 'pointer',
              borderBottom: t.id === activeTab ? '2px solid var(--ink)' : '2px solid transparent',
              color: t.id === activeTab ? 'var(--ink)' : 'var(--ink-3)',
              fontSize: 13,
              fontWeight: t.id === activeTab ? 500 : 400,
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                padding: '1px 7px',
                borderRadius: 10,
                background: t.id === activeTab ? 'var(--ink)' : 'var(--surface-sunk)',
                color: t.id === activeTab ? 'var(--bg)' : t.id === 'overdue' && tabCounts.overdue > 0 ? 'var(--danger)' : 'var(--ink-3)',
                border: t.id === activeTab ? 'none' : '1px solid var(--rule-strong)',
              }}
            >
              {tabCounts[t.id]}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 28px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--rule)',
          flexShrink: 0,
        }}
      >
        <div className="input" style={{ width: isMobile ? '100%' : 280, height: 32 }}>
          <Search size={13} className="icon" />
          <input
            placeholder="Search booking ref, route…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>
          {filtered.length} results
        </span>
      </div>

      {overdueItems.length > 0 && activeTab !== 'approved' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 28px',
            height: 40,
            background: 'var(--danger-soft)',
            borderBottom: '1px solid color-mix(in oklab, var(--danger) 20%, var(--rule))',
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
            {overdueItems.length} manifest{overdueItems.length > 1 ? 's' : ''} past submission deadline
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
            — Submit immediately to avoid regulatory penalty.
          </span>
        </div>
      )}

      {isMobile ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>Loading…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>No manifests found.</div>
          )}
          {!loading && filtered.map(m => {
            const overdue = isOverdue(m)
            return (
              <div
                key={m.flight_id}
                onClick={() => navigate(`/manifests/${m.flight_id}`)}
                style={{
                  background: overdue ? 'var(--danger-soft)' : 'var(--surface)',
                  border: `1px solid ${overdue ? 'color-mix(in oklab,var(--danger) 25%,var(--rule))' : 'var(--rule)'}`,
                  borderRadius: 8,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, letterSpacing: '0.06em', color: 'var(--ink)' }}>
                    {m.booking_ref}
                  </span>
                  {overdue ? <OverdueBadge /> : <StatusBadge status={m.status} />}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{m.origin_code}</span>
                  <ArrowRight size={12} style={{ color: 'var(--ink-4)' }} />
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{m.destination_code}</span>
                  <span className="t-meta" style={{ fontSize: 11, marginLeft: 4 }}>{m.origin_name} → {m.destination_name}</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span className="t-meta" style={{ fontSize: 11 }}>{m.pax_count} pax · {m.crew_count} crew</span>
                  {m.submission_deadline && (
                    <span className="t-meta" style={{ fontSize: 11, color: overdue ? 'var(--danger)' : 'var(--ink-3)' }}>
                      Deadline: {fmtDateShort(m.submission_deadline)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ flex: 1, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div
            style={{
              display: 'flex',
              padding: '8px 24px',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--rule)',
              minWidth: 960,
            }}
          >
            {([
              ['Booking Ref', 130],
              ['Route', 0],
              ['Pax / Crew', 100],
              ['Departure', 130],
              ['Deadline', 130],
              ['Status', 110],
              ['', 190],
            ] as [string, number][]).map(([label, w]) => (
              <div
                key={label || 'actions'}
                className="t-label"
                style={{
                  width: w || undefined,
                  flex: !w ? 1 : undefined,
                  flexShrink: w ? 0 : undefined,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {loading && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>Loading…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>No manifests found.</div>
          )}

          {!loading && filtered.map((m, i) => {
            const overdue = isOverdue(m)
            return (
              <div
                key={m.flight_id}
                onClick={() => navigate(`/manifests/${m.flight_id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '11px 24px',
                  borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--rule-soft)',
                  background: overdue
                    ? 'color-mix(in oklab, var(--danger-soft) 70%, transparent)'
                    : 'transparent',
                  minWidth: 960,
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 130, flexShrink: 0 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      letterSpacing: '0.06em',
                      color: 'var(--ink)',
                    }}
                  >
                    {m.booking_ref}
                  </span>
                  {m.unverified_count > 0 && (
                    <div style={{ marginTop: 3 }}>
                      <span style={{ fontSize: 10, color: 'var(--warn)', fontFamily: 'var(--font-mono)' }}>
                        {m.unverified_count} unverified
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{m.origin_code}</span>
                    <ArrowRight size={11} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{m.destination_code}</span>
                  </div>
                  <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>
                    {m.origin_name} → {m.destination_name}
                  </div>
                </div>

                <div style={{ width: 100, flexShrink: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{m.pax_count} pax</div>
                  <div className="t-meta" style={{ fontSize: 11 }}>{m.crew_count} crew</div>
                </div>

                <div style={{ width: 130, flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--ink-2)',
                    }}
                  >
                    {fmtDateTime(m.departure_at)}
                  </div>
                </div>

                <div style={{ width: 130, flexShrink: 0 }}>
                  {m.submission_deadline ? (
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                        color: overdue ? 'var(--danger)' : 'var(--ink-2)',
                        fontWeight: overdue ? 600 : 400,
                      }}
                    >
                      {fmtDateTime(m.submission_deadline)}
                    </span>
                  ) : (
                    <span className="t-meta" style={{ fontSize: 11 }}>—</span>
                  )}
                </div>

                <div style={{ width: 110, flexShrink: 0 }}>
                  {overdue ? <OverdueBadge /> : <StatusBadge status={m.status} />}
                </div>

                <div
                  style={{ display: 'flex', gap: 5, flexShrink: 0, width: 190, justifyContent: 'flex-end' }}
                  onClick={e => e.stopPropagation()}
                >
                  {(m.status === 'draft') && (
                    <button
                      className="btn sm accent"
                      style={{ height: 26 }}
                      onClick={() => navigate(`/manifests/${m.flight_id}`)}
                    >
                      Submit
                    </button>
                  )}
                  {m.status !== 'draft' && (
                    <button
                      className="btn sm"
                      style={{ height: 26 }}
                      onClick={() => navigate(`/manifests/${m.flight_id}`)}
                    >
                      View
                    </button>
                  )}
                  {m.status === 'draft' && (
                    <button
                      className="btn sm"
                      style={{ height: 26 }}
                      onClick={() => navigate(`/manifests/${m.flight_id}`)}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    className="btn sm"
                    style={{ height: 26 }}
                    onClick={e => handleExport(e, m.flight_id)}
                  >
                    <Download size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Shell>
  )
}
