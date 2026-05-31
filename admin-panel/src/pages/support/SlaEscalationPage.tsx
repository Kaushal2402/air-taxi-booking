import { useState, useEffect } from 'react'
import Shell from '../../components/layout/Shell'
import { supportService } from '../../services/supportService'
import type { SlaPolicy, Ticket } from '../../services/supportService'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useIsTablet } from '../../hooks/useIsMobile'

function formatMins(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatCategory(c: string) {
  return c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const ESCALATION_STEPS = [
  {
    n: 1,
    title: 'Assigned agent',
    subtitle: 'Initial owner of the ticket',
    role: 'Agent',
  },
  {
    n: 2,
    title: 'On breach → Team lead',
    subtitle: 'Auto-escalated when SLA is breached',
    role: 'Team Lead',
  },
  {
    n: 3,
    title: '2× breach → Supervisor',
    subtitle: 'Triggered when SLA is breached twice',
    role: 'Supervisor',
  },
  {
    n: 4,
    title: 'Urgent + financial → Duty manager',
    subtitle: 'Urgent tickets with financial impact',
    role: 'Duty Manager',
  },
]

export default function SlaEscalationPage() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [policies, setPolicies] = useState<SlaPolicy[]>([])
  const [breachedTickets, setBreachedTickets] = useState<Ticket[]>([])
  const [loadingPolicies, setLoadingPolicies] = useState(false)
  const [loadingTickets, setLoadingTickets] = useState(false)

  useEffect(() => {
    setLoadingPolicies(true)
    supportService.listSlaPolicies()
      .then(setPolicies)
      .catch(() => {})
      .finally(() => setLoadingPolicies(false))

    setLoadingTickets(true)
    supportService.listTickets({ sla_breach: true, page_size: 50 })
      .then(res => setBreachedTickets(res.items))
      .catch(() => {})
      .finally(() => setLoadingTickets(false))
  }, [])

  return (
    <Shell
      activeId="support"
      breadcrumb="Operations · Support · SLA & escalation"
      title="SLA & escalation"
      subtitle="Response and resolution targets by category. Breach triggers auto-escalation."
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm ghost">Breach report</button>
          <button className="btn sm accent">New policy</button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: 12,
      }}>
        {[
          { label: 'SLA compliance (30d)', value: '—', sub: 'target: 95%' },
          { label: 'Breaches (7d)', value: String(breachedTickets.length), sub: 'total breached', warn: breachedTickets.length > 0 },
          { label: 'Auto-escalations', value: '—', sub: 'last 7 days' },
          { label: 'Avg resolution', value: '—', sub: 'all priorities' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: kpi.warn ? 'var(--danger, #e53e3e)' : 'var(--ink)',
            }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile || isTablet ? '1fr' : '1.5fr 1fr',
        gap: 20,
        alignItems: 'start',
      }}>
        {/* SLA Policy Matrix */}
        <div>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              fontWeight: 600,
              fontSize: 14,
            }}>
              SLA Policy matrix
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: 'center' }}>
                      <span className="badge danger" style={{ fontSize: 11 }}>URGENT</span>
                    </th>
                    <th style={{ textAlign: 'center' }}>
                      <span className="badge warn" style={{ fontSize: 11 }}>HIGH</span>
                    </th>
                    <th style={{ textAlign: 'center' }}>
                      <span className="badge info" style={{ fontSize: 11 }}>MEDIUM</span>
                    </th>
                    <th style={{ textAlign: 'center' }}>
                      <span className="badge" style={{ fontSize: 11 }}>LOW</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPolicies ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>
                        Loading…
                      </td>
                    </tr>
                  ) : policies.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>
                        No policies configured.
                      </td>
                    </tr>
                  ) : policies.map(p => (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontWeight: 500 }}>{formatCategory(p.category)}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                          <div style={{ color: 'var(--ink-2)' }}>{formatMins(p.urgent_first_response_minutes)}</div>
                          <div style={{ color: 'var(--ink-3)' }}>{formatMins(p.urgent_resolution_minutes)}</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                          <div style={{ color: 'var(--ink-2)' }}>{formatMins(p.high_first_response_minutes)}</div>
                          <div style={{ color: 'var(--ink-3)' }}>{formatMins(p.high_resolution_minutes)}</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                          <div style={{ color: 'var(--ink-2)' }}>{formatMins(p.med_first_response_minutes)}</div>
                          <div style={{ color: 'var(--ink-3)' }}>{formatMins(p.med_resolution_minutes)}</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                          <div style={{ color: 'var(--ink-2)' }}>{formatMins(p.low_first_response_minutes)}</div>
                          <div style={{ color: 'var(--ink-3)' }}>{formatMins(p.low_resolution_minutes)}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                Each cell: first response / resolution time (monospace)
              </span>
            </div>
          </div>

          {/* Active breaches */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
            marginTop: 16,
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Active breaches</span>
              {breachedTickets.length > 0 && (
                <span className="badge danger">{breachedTickets.length}</span>
              )}
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
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breachedTickets.map(t => (
                      <tr key={t.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.ticket_ref}</span>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t.subject}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: 13 }}>{t.requester_name}</span>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'capitalize' }}>{t.requester_type}</div>
                        </td>
                        <td>
                          <span className={t.priority === 'urgent' ? 'badge danger' : t.priority === 'high' ? 'badge warn' : 'badge info'}>
                            {t.priority.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className="badge danger">Breached</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Escalation chain */}
        <div>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 20,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 20 }}>Escalation chain</div>
            <div style={{ position: 'relative' }}>
              {/* Vertical connecting line */}
              <div style={{
                position: 'absolute',
                left: 15,
                top: 30,
                bottom: 30,
                width: 2,
                background: 'var(--border)',
              }} />

              {ESCALATION_STEPS.map((step, idx) => (
                <div key={step.n} style={{
                  display: 'flex',
                  gap: 14,
                  position: 'relative',
                  marginBottom: idx < ESCALATION_STEPS.length - 1 ? 24 : 0,
                }}>
                  {/* Circle */}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--accent, #0F8A5F)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                    zIndex: 1,
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
      </div>
    </Shell>
  )
}
