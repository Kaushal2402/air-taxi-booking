import { useState, useEffect } from 'react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { bookingsService } from '../../services/bookingsService'
import type {
  DisputeListItem,
  ResolveDisputeBody,
} from '../../services/bookingsService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMinor = (v: number) => `₹${(v / 100).toLocaleString('en-IN')}`

function formatAge(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime()
    const h = Math.floor(ms / 3600000)
    if (h < 24) return `${h}h`
    const d = Math.floor(h / 24)
    return `${d}d`
  } catch { return '—' }
}

function priorityBadge(priority: 'high' | 'medium' | 'low') {
  const map = {
    high:   { tone: 'danger', label: 'High' },
    medium: { tone: 'warn',   label: 'Medium' },
    low:    { tone: 'pending', label: 'Low' },
  }
  const { tone, label } = map[priority]
  return (
    <span className={`badge ${tone}`}>
      <span className={`dot ${tone}`} />
      {label}
    </span>
  )
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    open:             'Open',
    in_review:        'In review',
    awaiting_driver:  'Awaiting driver',
    awaiting_finance: 'Awaiting Finance',
    resolved:         'Resolved',
    closed:           'Closed',
  }
  return map[stage] ?? stage
}

function exportDisputesCsv(items: DisputeListItem[]) {
  const headers = ['Dispute Ref', 'Booking Ref', 'Customer', 'Reason', 'Amount', 'Priority', 'Stage', 'Created']
  const rows = items.map(d => [
    d.dispute_ref,
    d.booking_ref,
    d.customer_name,
    d.reason,
    fmtMinor(d.disputed_amount_minor),
    d.priority,
    d.stage,
    d.created_at,
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `disputes-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Resolution Panel ──────────────────────────────────────────────────────────

type DisputeAction = 'uphold_fare' | 'partial_refund' | 'full_refund' | 'goodwill_credit'

interface ResolutionPanelProps {
  dispute: DisputeListItem
  onResolve: (body: ResolveDisputeBody) => Promise<void>
}

function ResolutionPanel({ dispute, onResolve }: ResolutionPanelProps) {
  const [action, setAction] = useState<DisputeAction>('partial_refund')
  const [resolutionNote, setResolutionNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const actionOptions: { key: DisputeAction; label: string }[] = [
    { key: 'uphold_fare',    label: 'Uphold fare · close dispute' },
    { key: 'partial_refund', label: 'Partial refund · to customer' },
    { key: 'full_refund',    label: 'Full refund · to customer' },
    { key: 'goodwill_credit', label: 'Goodwill credit · wallet only' },
  ]

  const partialRefund = Math.round(dispute.disputed_amount_minor * 0.2)
  const clawback = Math.round(partialRefund * 0.7)
  const needsFinance = action !== 'uphold_fare'

  const handleResolve = async () => {
    if (!resolutionNote.trim()) { setError('Resolution note is required'); return }
    setSaving(true); setError('')
    try {
      await onResolve({
        action,
        refund_amount_minor: action === 'partial_refund' ? partialRefund : (action === 'full_refund' ? dispute.disputed_amount_minor : null),
        driver_clawback_minor: action !== 'uphold_fare' ? clawback : null,
        resolution_note: resolutionNote,
      })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Failed to resolve dispute')
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 0 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
        <div className="t-label">Resolution</div>
        <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 400 }}>Proposed outcome</h3>
      </div>
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
            {error}
          </div>
        )}
        <div>
          <div className="t-label" style={{ marginBottom: 10 }}>Action</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {actionOptions.map(opt => (
              <div
                key={opt.key}
                onClick={() => setAction(opt.key)}
                style={{
                  padding: '10px 12px',
                  border: `1px solid ${action === opt.key ? 'var(--accent)' : 'var(--rule)'}`,
                  background: action === opt.key ? 'color-mix(in oklab, var(--accent) 8%, var(--surface))' : 'var(--surface)',
                  borderRadius: 3,
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  border: `1px solid ${action === opt.key ? 'var(--accent)' : 'var(--rule-strong)'}`,
                  background: action === opt.key ? 'var(--accent)' : 'var(--surface)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {action === opt.key && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                </span>
                {opt.label}
              </div>
            ))}
          </div>
        </div>

        {action !== 'uphold_fare' && (
          <div>
            <div className="t-label" style={{ marginBottom: 10 }}>Driver impact</div>
            <div style={{ padding: '10px 12px', border: '1px solid var(--rule)', background: 'var(--surface-2)', borderRadius: 3, fontSize: 13, color: 'var(--ink-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Clawback from next payout</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtMinor(clawback)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span>Warning issued · score −2</span>
                <span className="t-meta">No suspension</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="input">
            <input
              placeholder="Resolution note (visible in audit) *"
              value={resolutionNote}
              onChange={e => setResolutionNote(e.target.value)}
            />
          </div>
        </div>

        {needsFinance && (
          <div style={{ padding: '12px 14px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule-strong))', borderRadius: 3, fontSize: 12.5, color: 'var(--ink-2)' }}>
            <span style={{ color: 'var(--warn)' }}>Finance approval may be required.</span> Refund and clawback amounts need Finance sign-off.
          </div>
        )}

        <button className="btn accent lg" style={{ width: '100%' }} onClick={handleResolve} disabled={saving}>
          {saving ? 'Resolving…' : 'Resolve →'}
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DisputesPage() {
  const isMobile = useIsMobile()

  const [disputes, setDisputes] = useState<DisputeListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [selected, setSelected] = useState<DisputeListItem | null>(null)
  const [showMobileDetail, setShowMobileDetail] = useState(false)
  const [resolveError, setResolveError] = useState('')

  const loadDisputes = async () => {
    setLoading(true)
    try {
      const res = await bookingsService.listDisputes({
        page_size: 50,
        search: search || undefined,
        stage: stageFilter || undefined,
        priority: priorityFilter || undefined,
      })
      setDisputes(res.items)
      setTotal(res.total)
      if (res.items.length > 0 && !selected) setSelected(res.items[0])
    } catch {
      setDisputes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDisputes() }, [stageFilter, priorityFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = search.trim()
    ? disputes.filter(d =>
        d.dispute_ref.toLowerCase().includes(search.toLowerCase()) ||
        d.booking_ref.toLowerCase().includes(search.toLowerCase()) ||
        d.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        d.reason.toLowerCase().includes(search.toLowerCase())
      )
    : disputes

  const handleSelect = (d: DisputeListItem) => {
    setSelected(d)
    if (isMobile) setShowMobileDetail(true)
  }

  const handleResolve = async (body: ResolveDisputeBody) => {
    if (!selected) return
    setResolveError('')
    try {
      await bookingsService.resolveDispute(selected.booking_id, body)
      setSelected(null)
      await loadDisputes()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setResolveError(err?.response?.data?.detail || 'Failed to resolve dispute')
    }
  }

  const reviewCount = disputes.filter(d => d.stage === 'in_review' || d.stage === 'awaiting_driver').length
  const financeCount = disputes.filter(d => d.stage === 'awaiting_finance').length

  // Mobile: show detail
  if (isMobile && showMobileDetail && selected) {
    return (
      <Shell
        activeId="bookings-r"
        breadcrumb="Operations · Road bookings · Disputes"
        title={`Dispute · ${selected.dispute_ref}`}
      >
        <button
          onClick={() => setShowMobileDetail(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            width: '100%', fontSize: 13, color: 'var(--accent)',
            background: 'var(--surface-2)', border: 'none',
            borderBottom: '1px solid var(--rule)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <Icon name="chevLeft" size={14} stroke={2} />
          Back to disputes
        </button>
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: 16 }}>
            <div className="t-label">Dispute · {selected.dispute_ref} · linked to {selected.booking_ref}</div>
            <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>
              "{selected.reason}"
            </h2>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)' }}>
              Filed by {selected.customer_name} · {formatAge(selected.created_at)} ago
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 3, marginBottom: 16 }}>
            <ResolutionPanel dispute={selected} onResolve={handleResolve} />
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      activeId="bookings-r"
      breadcrumb="Operations · Road bookings · Disputes"
      title="Disputed bookings"
      subtitle={`${total} open · ${reviewCount} awaiting evidence · ${financeCount} awaiting Finance`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => exportDisputesCsv(disputes)}>
            <Icon name="download" size={13} />Export
          </button>
          <button className="btn sm">
            <Icon name="filter" size={13} />Saved view
          </button>
        </div>
      }
    >
      <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '420px 1fr', minHeight: '100%' }}>
        {/* Left panel — dispute list */}
        <aside style={{ borderRight: isMobile ? 'none' : '1px solid var(--rule)', background: 'var(--surface)', overflowY: 'auto' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 8 }}>
            <div className="input" style={{ flex: 1, height: 32 }}>
              <Icon name="search" size={14} className="icon" />
              <input
                placeholder="Search disputes…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="input" style={{ height: 32, width: 140, padding: 0, paddingLeft: 8 }}>
              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 12.5 }}>
                <option value="">All priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <button className="btn ghost icon sm">
              <Icon name="filter" size={13} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No disputes found.</div>
          ) : filtered.map((d) => {
            const isSel = selected?.id === d.id
            return (
              <div
                key={d.id}
                onClick={() => handleSelect(d)}
                style={{
                  padding: '16px 18px',
                  borderBottom: '1px solid var(--rule-soft)',
                  borderLeft: `3px solid ${isSel ? 'var(--accent)' : 'transparent'}`,
                  background: isSel ? 'var(--surface-2)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' }}>{d.dispute_ref}</span>
                  <span className="t-meta">{formatAge(d.created_at)}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink)' }}>{d.customer_name}</div>
                <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>{d.reason}</div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {priorityBadge(d.priority)}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                    · {stageLabel(d.stage)}
                  </span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                    {fmtMinor(d.disputed_amount_minor)}
                  </span>
                </div>
              </div>
            )
          })}
        </aside>

        {/* Right panel — dispute detail */}
        {!isMobile && (
          <div style={{ overflowY: 'auto' }}>
            {!selected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-3)', fontSize: 13 }}>
                Select a dispute to review
              </div>
            ) : (
              <>
                {resolveError && (
                  <div style={{ margin: '16px 32px 0', padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)', display: 'flex', justifyContent: 'space-between' }}>
                    {resolveError}
                    <button className="btn ghost icon sm" onClick={() => setResolveError('')} style={{ color: 'var(--danger)' }}>×</button>
                  </div>
                )}
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
                    <div>
                      <div className="t-label">Dispute · {selected.dispute_ref} · linked to {selected.booking_ref}</div>
                      <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.018em' }}>
                        "{selected.reason}"
                      </h2>
                      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)' }}>
                        Filed by {selected.customer_name} · {formatAge(selected.created_at)} ago
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button className="btn sm">Escalate</button>
                      <button className="btn sm">Request more info</button>
                      <button className="btn sm danger">Reject</button>
                      <button className="btn sm accent" onClick={() => {
                        if (selected) {
                          const noteEl = document.querySelector<HTMLInputElement>('[placeholder="Resolution note (visible in audit) *"]')
                          if (noteEl) noteEl.focus()
                        }
                      }}>Resolve →</button>
                    </div>
                  </div>

                  {/* SLA strip */}
                  <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: 'var(--surface-2)', border: '1px solid var(--rule)' }}>
                    {[
                      ['Disputed amount', fmtMinor(selected.disputed_amount_minor)],
                      ['SLA · remaining', '12h'],
                      ['Stage', stageLabel(selected.stage)],
                      ['Priority', selected.priority.charAt(0).toUpperCase() + selected.priority.slice(1)],
                    ].map(([k, v], i) => (
                      <div key={k} style={{ padding: '14px 18px', borderRight: i < 3 ? '1px solid var(--rule)' : 'none' }}>
                        <div className="t-label" style={{ padding: 0 }}>{k}</div>
                        <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
                  {/* Evidence */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Telemetry */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
                      <div className="t-label" style={{ marginBottom: 10 }}>Telemetry · evidence</div>
                      <div style={{ height: 180, background: 'var(--surface-2)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: 'var(--ink-4)', fontSize: 13 }}>
                        Map placeholder · GPS trace
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                        {[
                          ['Expected', '24.8 km', false],
                          ['Actual',   '31.4 km', false],
                          ['Delta',    '+6.6 km', true],
                          ['Variance', '+26.6%',  true],
                        ].map(([k, v, warn]) => (
                          <div key={String(k)}>
                            <div className="t-label" style={{ padding: 0 }}>{String(k)}</div>
                            <div style={{
                              marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 13,
                              color: warn ? 'var(--warn)' : 'var(--ink-2)',
                            }}>{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Communication thread placeholder */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                        <div className="t-label">Communication</div>
                        <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 400 }}>Customer thread</h3>
                      </div>
                      <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
                        No messages yet.
                      </div>
                    </div>
                  </div>

                  {/* Resolution */}
                  <div>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                      <ResolutionPanel dispute={selected} onResolve={handleResolve} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Shell>
  )
}
