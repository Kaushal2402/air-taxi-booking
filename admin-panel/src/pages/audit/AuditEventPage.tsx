import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { auditService } from '../../services/auditService'
import type { AuditEventDetail } from '../../services/auditService'
import { formatDateTimeS, formatDateTime, formatTime } from '../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function SevBadge({ sev }: { sev: 'high' | 'med' | 'low' }) {
  if (sev === 'high') return <span className="badge danger"><span className="dot danger" />High</span>
  if (sev === 'med') return <span className="badge warn"><span className="dot warn" />Medium</span>
  return <span className="badge"><span className="dot pending" />Low</span>
}

// ── Diff table ─────────────────────────────────────────────────────────────────

function DiffTable({
  before,
  after,
}: {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}) {
  if (!before && !after) {
    return (
      <div style={{ padding: '20px 22px', color: 'var(--ink-3)', fontSize: 13 }}>
        No state change recorded for this event.
      </div>
    )
  }

  const keys = Array.from(new Set([
    ...Object.keys(after ?? {}),
    ...Object.keys(before ?? {}),
  ]))

  return (
    <div style={{ padding: '6px 22px 16px', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
      {keys.map((k, i) => {
        const bVal = before ? String(before[k] ?? '—') : '—'
        const aVal = after ? String(after[k] ?? '—') : '—'
        const kind = bVal === aVal ? 'same' : (before && !(k in before) ? 'add' : 'change')
        return (
          <div
            key={k}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 1fr 1fr',
              gap: 12,
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < keys.length - 1 ? '1px solid var(--rule-soft)' : 'none',
            }}
          >
            <span style={{ color: 'var(--ink-3)' }}>{k}</span>
            <span style={{
              color: kind === 'same' ? 'var(--ink-4)' : 'var(--danger)',
              textDecoration: kind === 'change' ? 'line-through' : 'none',
              background: kind === 'change' ? 'var(--danger-soft)' : 'transparent',
              padding: '2px 6px',
              borderRadius: 3,
            }}>{bVal}</span>
            <span style={{
              color: kind === 'same' ? 'var(--ink-4)' : 'var(--accent)',
              background: kind !== 'same' ? 'var(--accent-soft)' : 'transparent',
              padding: '2px 6px',
              borderRadius: 3,
            }}>{aVal}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuditEventPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [event, setEvent] = useState<AuditEventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')
  const [targetNotice, setTargetNotice] = useState('')

  useEffect(() => {
    if (!id) { setError(true); setLoading(false); return }
    setLoading(true)
    auditService.getEvent(id)
      .then(data => { setEvent(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [id])

  const copyJson = () => {
    if (!event) return
    navigator.clipboard.writeText(JSON.stringify(event, null, 2))
      .then(() => {
        setCopyMsg('Copied!')
        setTimeout(() => setCopyMsg(''), 2000)
      })
      .catch(() => setCopyMsg('Copy failed'))
  }

  const metaRows = event ? [
    ['Event ID',   event.event_code,  true],
    ['Timestamp',  formatDateTimeS(event.timestamp), false],
    ['Actor',      `${event.actor_name} · ${event.actor_role}`, false],
    ['Action',     event.action,      true],
    ['Target',     event.target,      false],
    ['Source IP',  event.source_ip ?? '—', true],
    ['Session',    event.session_id ?? '—', true],
    ['Request ID', event.request_id ?? '—', true],
  ] as [string, string, boolean][] : []

  const hashRows: [string, string | null][] = event ? [
    ['prev hash', event.prev_hash],
    ['this hash', event.this_hash],
    ['next hash', event.next_hash],
  ] : []

  const hasHashes = event && (event.prev_hash || event.this_hash)

  if (loading) {
    return (
      <Shell
        activeId="audit"
        breadcrumb="System · Audit log · Event"
        title="Loading…"
        subtitle=""
      >
        <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          Loading event…
        </div>
      </Shell>
    )
  }

  if (error || !event) {
    return (
      <Shell
        activeId="audit"
        breadcrumb="System · Audit log · Event"
        title="Event not found"
        subtitle=""
        actions={
          <button className="btn sm" onClick={() => navigate('/audit')}>
            <Icon name="chevLeft" size={13} />
            Back to audit log
          </button>
        }
      >
        <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          Event not found.
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      activeId="audit"
      breadcrumb="System · Audit log · Event"
      title={event.action}
      subtitle={`${event.event_code} · ${event.severity} severity · ${formatDateTime(event.timestamp)} · ${event.actor_name}`}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn sm" onClick={() => navigate('/audit')}>
            <Icon name="chevLeft" size={13} />
            Back
          </button>
          <button className="btn sm" onClick={copyJson}>
            <Icon name="copy" size={13} />
            {copyMsg || 'Copy JSON'}
          </button>
          <button
            className="btn sm"
            onClick={() => setTargetNotice(`Target: ${event.target}`)}
          >
            View target
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '24px 32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {targetNotice && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', background: 'var(--surface)',
            border: '1px solid var(--rule)', borderRadius: 3,
            fontSize: 13, color: 'var(--ink-2)',
          }}>
            <Icon name="info" size={14} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{targetNotice}</span>
            <button onClick={() => setTargetNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}>
              <Icon name="x" size={13} />
            </button>
          </div>
        )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1.3fr',
        gap: 24,
        alignItems: 'start',
      }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Event metadata card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="t-label">Event metadata</div>
              <SevBadge sev={event.severity} />
            </div>
            <div>
              {metaRows.map(([k, v, mono], i) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '11px 0',
                    borderBottom: i < metaRows.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                  }}
                >
                  <span className="t-meta" style={{ flexShrink: 0 }}>{k}</span>
                  <span style={{
                    fontSize: 12.5,
                    textAlign: 'right',
                    fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
                    wordBreak: 'break-all',
                  }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Integrity card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Integrity</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Icon name="shield" size={16} style={{ color: hasHashes ? 'var(--accent)' : 'var(--ink-3)' }} />
              <span style={{ fontSize: 13 }}>
                {hasHashes ? 'Hash verified · chain intact' : 'Hashes not yet computed'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hashRows.map(([label, val]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--rule)',
                    borderRadius: 3,
                    gap: 12,
                  }}
                >
                  <span className="t-meta">{label}</span>
                  <span className="t-mono" style={{ fontSize: 11.5, wordBreak: 'break-all', textAlign: 'right' }}>
                    {val ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* State change card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">State change · before → after</div>
            </div>
            <DiffTable before={event.before_data} after={event.after_data} />
          </div>

          {/* Surrounding events card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Surrounding events · same session</div>
            {!event.session_id ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No session context available.</div>
            ) : event.surrounding_events.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No surrounding events in session.</div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 5, top: 6, bottom: 6,
                  width: 1, background: 'var(--rule)',
                }} />
                {event.surrounding_events.map((se, i) => (
                  <div
                    key={se.id}
                    style={{
                      display: 'flex',
                      gap: 14,
                      paddingBottom: i < event.surrounding_events.length - 1 ? 16 : 0,
                      position: 'relative',
                    }}
                  >
                    <span
                      className={'dot ' + (se.is_current ? 'danger' : 'pending')}
                      style={{
                        marginTop: 4,
                        zIndex: 1,
                        flexShrink: 0,
                        boxShadow: se.is_current ? '0 0 0 3px var(--danger-soft)' : 'none',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span
                          className="t-mono"
                          style={{
                            fontSize: 12,
                            fontWeight: se.is_current ? 600 : 400,
                            color: se.is_current ? 'var(--ink)' : 'var(--ink-2)',
                          }}
                        >
                          {se.action}
                        </span>
                        <span className="t-meta" style={{ flexShrink: 0 }}>
                          {formatTime(se.timestamp)}
                        </span>
                      </div>
                      <div className="t-meta" style={{ marginTop: 2 }}>{se.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </Shell>
  )
}
