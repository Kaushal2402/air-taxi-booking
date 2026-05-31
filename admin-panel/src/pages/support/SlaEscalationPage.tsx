import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import { supportService } from '../../services/supportService'
import type { SlaPolicy, Ticket, SlaPolicyCreatePayload } from '../../services/supportService'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'

function formatMins(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
function formatCategory(c: string) {
  return c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const CATEGORY_OPTIONS = [
  'refunds_billing', 'booking_road', 'booking_air', 'payouts',
  'documents_kyc', 'app_issue', 'lost_found', 'onboarding', 'other',
]

const ESCALATION_STEPS = [
  { n: 1, title: 'Assigned agent',              subtitle: 'Initial owner of the ticket',               role: 'Agent' },
  { n: 2, title: 'On breach → Team lead',        subtitle: 'Auto-escalated when SLA is breached',       role: 'Team Lead' },
  { n: 3, title: '2× breach → Supervisor',       subtitle: 'Triggered when SLA is breached twice',      role: 'Supervisor' },
  { n: 4, title: 'Urgent + financial → Duty mgr',subtitle: 'Urgent tickets with financial impact',      role: 'Duty Manager' },
]

// ── Breach Report Modal ────────────────────────────────────────────────────────
function BreachReportModal({ tickets, onClose }: { tickets: Ticket[]; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 10, width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: 15 }}>SLA Breach Report</span>
            <span className="badge danger" style={{ marginLeft: 10 }}>{tickets.length} breached</span>
          </div>
          <button className="btn sm ghost" onClick={onClose}>✕</button>
        </div>

        {tickets.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
            🎉 No SLA breaches right now.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Requester</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>SLA Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => {
                  const dueDate = t.sla_due_at ? new Date(t.sla_due_at) : null
                  const breachAgo = dueDate ? Math.round((Date.now() - dueDate.getTime()) / 60000) : null
                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.ticket_ref}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t.subject}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>{t.requester_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'capitalize' }}>{t.requester_type}</div>
                      </td>
                      <td><span className="badge">{formatCategory(t.category)}</span></td>
                      <td>
                        <span className={t.priority === 'urgent' ? 'badge danger' : t.priority === 'high' ? 'badge warn' : 'badge info'}>
                          {t.priority.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--danger,#e53e3e)', fontWeight: 600, fontSize: 12 }}>
                          {breachAgo !== null ? `${breachAgo}m ago` : '—'}
                        </span>
                      </td>
                      <td><span className="badge danger">Breached</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn sm ghost" onClick={() => window.print()}>🖨 Print report</button>
          <button className="btn sm accent" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── New / Edit Policy Modal ────────────────────────────────────────────────────
const BLANK_POLICY: SlaPolicyCreatePayload = {
  category: 'refunds_billing',
  urgent_first_response_minutes: 15,
  urgent_resolution_minutes: 120,
  high_first_response_minutes: 30,
  high_resolution_minutes: 240,
  med_first_response_minutes: 120,
  med_resolution_minutes: 720,
  low_first_response_minutes: 480,
  low_resolution_minutes: 2880,
}

function PolicyModal({ existing, onClose, onSaved }: {
  existing: SlaPolicy | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!existing
  const [form, setForm] = useState<SlaPolicyCreatePayload>(
    existing
      ? {
          category: existing.category,
          urgent_first_response_minutes: existing.urgent_first_response_minutes,
          urgent_resolution_minutes: existing.urgent_resolution_minutes,
          high_first_response_minutes: existing.high_first_response_minutes,
          high_resolution_minutes: existing.high_resolution_minutes,
          med_first_response_minutes: existing.med_first_response_minutes,
          med_resolution_minutes: existing.med_resolution_minutes,
          low_first_response_minutes: existing.low_first_response_minutes,
          low_resolution_minutes: existing.low_resolution_minutes,
        }
      : BLANK_POLICY
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function setNum(field: keyof SlaPolicyCreatePayload, raw: string) {
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n > 0) setForm(f => ({ ...f, [field]: n }))
  }

  const PRIORITIES: Array<{
    key: string
    label: string
    first: keyof SlaPolicyCreatePayload
    res:   keyof SlaPolicyCreatePayload
  }> = [
    { key: 'urgent', label: 'Urgent',  first: 'urgent_first_response_minutes', res: 'urgent_resolution_minutes' },
    { key: 'high',   label: 'High',    first: 'high_first_response_minutes',   res: 'high_resolution_minutes'   },
    { key: 'med',    label: 'Medium',  first: 'med_first_response_minutes',    res: 'med_resolution_minutes'    },
    { key: 'low',    label: 'Low',     first: 'low_first_response_minutes',    res: 'low_resolution_minutes'    },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      if (isEdit && existing) {
        await supportService.updateSlaPolicy(existing.id, form)
      } else {
        await supportService.createSlaPolicy(form)
      }
      onSaved(); onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Failed to save policy. Category may already exist.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 10, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{isEdit ? 'Edit SLA policy' : 'New SLA policy'}</span>
          <button className="btn sm ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label className="field-label">Category</label>
            {isEdit ? (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--surface-2)', fontSize: 13 }}>{formatCategory(form.category)}</div>
            ) : (
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
              </select>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>Priority</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>First response (mins)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>Resolution (mins)</th>
                </tr>
              </thead>
              <tbody>
                {PRIORITIES.map((row, i) => (
                  <tr key={row.key} style={{ borderTop: i > 0 ? '1px solid var(--rule)' : 'none' }}>
                    <td style={{ padding: '10px 10px' }}>
                      <span className={row.key === 'urgent' ? 'badge danger' : row.key === 'high' ? 'badge warn' : row.key === 'med' ? 'badge info' : 'badge'} style={{ fontSize: 11 }}>
                        {row.label.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input
                        type="number" min={1} className="input"
                        style={{ width: '100%', textAlign: 'center' }}
                        value={form[row.first] as number}
                        onChange={e => setNum(row.first, e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input
                        type="number" min={1} className="input"
                        style={{ width: '100%', textAlign: 'center' }}
                        value={form[row.res] as number}
                        onChange={e => setNum(row.res, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>All times are in minutes. Example: 60 = 1 hour, 1440 = 24 hours.</div>

          {error && (
            <div style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--danger-soft,#fff5f5)', border: '1px solid var(--danger,#e53e3e)', color: 'var(--danger,#e53e3e)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn sm ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn sm accent" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SlaEscalationPage() {
  const navigate   = useNavigate()
  const isMobile   = useIsMobile()
  const isTablet   = useIsTablet()

  const [policies,        setPolicies]        = useState<SlaPolicy[]>([])
  const [breachedTickets, setBreachedTickets] = useState<Ticket[]>([])
  const [loadingPolicies, setLoadingPolicies] = useState(false)
  const [loadingTickets,  setLoadingTickets]  = useState(false)

  const [showBreachModal,  setShowBreachModal]  = useState(false)
  const [policyModal,      setPolicyModal]      = useState<{ open: boolean; existing: SlaPolicy | null }>({ open: false, existing: null })

  function loadData() {
    setLoadingPolicies(true)
    supportService.listSlaPolicies()
      .then(setPolicies).catch(() => {}).finally(() => setLoadingPolicies(false))

    setLoadingTickets(true)
    supportService.listTickets({ sla_breach: true, page_size: 100 })
      .then(res => setBreachedTickets(res.items)).catch(() => {}).finally(() => setLoadingTickets(false))
  }

  useEffect(() => { loadData() }, [])

  return (
    <>
      {showBreachModal && (
        <BreachReportModal tickets={breachedTickets} onClose={() => setShowBreachModal(false)} />
      )}
      {policyModal.open && (
        <PolicyModal
          existing={policyModal.existing}
          onClose={() => setPolicyModal({ open: false, existing: null })}
          onSaved={() => { loadData(); setPolicyModal({ open: false, existing: null }) }}
        />
      )}

      <Shell
        activeId="support"
        breadcrumb="Operations · Support · SLA & escalation"
        title="SLA & escalation"
        subtitle="Response and resolution targets by category. Breach triggers auto-escalation."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm ghost" onClick={() => navigate('/support')}>← Back to queue</button>
            <button className="btn sm" onClick={() => setShowBreachModal(true)}>
              Breach report {breachedTickets.length > 0 && <span className="badge danger" style={{ marginLeft: 6 }}>{breachedTickets.length}</span>}
            </button>
            <button className="btn sm accent" onClick={() => setPolicyModal({ open: true, existing: null })}>+ New policy</button>
          </div>
        }
      >
        <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12 }}>
            {[
              { label: 'SLA compliance (30d)', value: '—',                        sub: 'target: 95%' },
              { label: 'Breaches (7d)',         value: String(breachedTickets.length), sub: 'total breached', warn: breachedTickets.length > 0 },
              { label: 'Auto-escalations',      value: '—',                        sub: 'last 7 days' },
              { label: 'Avg resolution',        value: '—',                        sub: 'all priorities' },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: kpi.warn ? 'var(--danger,#e53e3e)' : 'var(--ink)' }}>{kpi.value}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : '1.5fr 1fr', gap: 20, alignItems: 'start' }}>

            {/* Left: SLA matrix + active breaches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* SLA Policy Matrix */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>SLA Policy matrix</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>first response / resolution</span>
                </div>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th style={{ textAlign: 'center' }}><span className="badge danger" style={{ fontSize: 11 }}>URGENT</span></th>
                        <th style={{ textAlign: 'center' }}><span className="badge warn"   style={{ fontSize: 11 }}>HIGH</span></th>
                        <th style={{ textAlign: 'center' }}><span className="badge info"   style={{ fontSize: 11 }}>MEDIUM</span></th>
                        <th style={{ textAlign: 'center' }}><span className="badge"        style={{ fontSize: 11 }}>LOW</span></th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingPolicies ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>Loading…</td></tr>
                      ) : policies.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>
                            <div style={{ color: 'var(--ink-3)', marginBottom: 12 }}>No policies configured.</div>
                            <button className="btn sm accent" onClick={() => setPolicyModal({ open: true, existing: null })}>+ Add first policy</button>
                          </td>
                        </tr>
                      ) : policies.map(p => (
                        <tr key={p.id}>
                          <td><span style={{ fontWeight: 500 }}>{formatCategory(p.category)}</span></td>
                          {(['urgent','high','med','low'] as const).map(pri => (
                            <td key={pri} style={{ textAlign: 'center' }}>
                              <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                <div style={{ color: 'var(--ink-2)' }}>{formatMins((p as unknown as Record<string, number>)[`${pri}_first_response_minutes`])}</div>
                                <div style={{ color: 'var(--ink-3)' }}>{formatMins((p as unknown as Record<string, number>)[`${pri}_resolution_minutes`])}</div>
                              </div>
                            </td>
                          ))}
                          <td>
                            <button className="btn sm ghost" style={{ padding: '0 8px' }} onClick={() => setPolicyModal({ open: true, existing: p })}>Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '8px 16px', borderTop: '1px solid var(--rule)' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Each cell: first response / resolution time</span>
                </div>
              </div>

              {/* Active Breaches */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Active breaches</span>
                  {breachedTickets.length > 0 && <span className="badge danger">{breachedTickets.length}</span>}
                </div>
                {loadingTickets ? (
                  <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)' }}>Loading…</div>
                ) : breachedTickets.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)' }}>No active breaches. 🎉</div>
                ) : (
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="tbl" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Ticket</th>
                          <th>Requester</th>
                          <th>Priority</th>
                          <th>Breach age</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breachedTickets.map(t => {
                          const breachMins = t.sla_due_at
                            ? Math.round((Date.now() - new Date(t.sla_due_at).getTime()) / 60000)
                            : null
                          return (
                            <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/support/${t.id}`)}>
                              <td>
                                <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.ticket_ref}</div>
                                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t.subject}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: 13 }}>{t.requester_name}</div>
                                <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'capitalize' }}>{t.requester_type}</div>
                              </td>
                              <td>
                                <span className={t.priority === 'urgent' ? 'badge danger' : t.priority === 'high' ? 'badge warn' : 'badge info'}>
                                  {t.priority.toUpperCase()}
                                </span>
                              </td>
                              <td>
                                <span style={{ color: 'var(--danger,#e53e3e)', fontWeight: 600, fontSize: 12 }}>
                                  {breachMins !== null ? `${breachMins}m ago` : '—'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Escalation chain */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 20 }}>Escalation chain</div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 15, top: 32, bottom: 32, width: 2, background: 'var(--rule)' }} />
                {ESCALATION_STEPS.map((step, idx) => (
                  <div key={step.n} style={{ display: 'flex', gap: 14, position: 'relative', marginBottom: idx < ESCALATION_STEPS.length - 1 ? 28 : 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--accent,#0F8A5F)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, flexShrink: 0, zIndex: 1,
                    }}>
                      {step.n}
                    </div>
                    <div style={{ paddingTop: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{step.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{step.subtitle}</div>
                      <span className="badge info" style={{ fontSize: 11 }}>{step.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Shell>
    </>
  )
}
