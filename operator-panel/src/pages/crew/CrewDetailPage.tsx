import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Phone,
  Settings,
  Upload,
} from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { CrewMember, CrewDocument } from '../../services/operatorCrewService'
import { operatorCrewService } from '../../services/operatorCrewService'

const TABS = ['Overview', 'Licenses & Ratings', 'Flight log', 'Schedule'] as const
type Tab = (typeof TABS)[number]

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 999
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function AvailPill({ status }: { status: string }) {
  const MAP: Record<string, string> = {
    available: 'ok',
    'on duty': 'info',
    'rest period': 'warn',
    'off duty': 'pending',
    'fdp exceeded': 'danger',
    leave: 'pending',
  }
  const tone = MAP[status.toLowerCase()] ?? 'pending'
  return (
    <span className={`badge ${tone}`} style={{ height: 20, fontSize: 10.5 }}>
      <span className={`dot ${tone}`} />{status}
    </span>
  )
}

function LicChip({ label, expiry, warn }: { label: string; expiry?: string; warn?: boolean }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 22,
        padding: '0 8px',
        background: warn ? 'var(--warn-soft)' : 'var(--surface-2)',
        border: `1px solid ${warn ? 'color-mix(in oklab,var(--warn) 28%,var(--rule))' : 'var(--rule-strong)'}`,
        borderRadius: 2,
        fontSize: 10.5,
      }}
    >
      {warn && <AlertTriangle size={10} style={{ color: 'var(--warn)' }} />}
      <span style={{ fontWeight: 500, color: warn ? 'var(--warn)' : 'var(--ink-2)' }}>{label}</span>
      {expiry && (
        <span
          style={{
            color: warn ? 'var(--warn)' : 'var(--ink-4)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.04em',
          }}
        >
          · {expiry}
        </span>
      )}
    </div>
  )
}

function DocRow({ doc, last }: { doc: CrewDocument; last: boolean }) {
  const days = daysUntil(doc.expiry_date)
  const tone = doc.is_permanent ? 'ok' : days < 0 ? 'danger' : days < 60 ? 'warn' : 'ok'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '11px 14px',
        borderBottom: last ? 'none' : '1px solid var(--rule-soft)',
      }}
    >
      {tone === 'ok' ? (
        <CheckCircle2 size={14} style={{ color: 'var(--ok)', flexShrink: 0 }} />
      ) : (
        <AlertTriangle size={14} style={{ color: `var(--${tone})`, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{doc.doc_type}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>
          {doc.doc_number ? `${doc.doc_number} · ` : ''}
          {doc.issued_date ? `Issued ${doc.issued_date}` : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11.5,
            color: doc.is_permanent ? 'var(--ink-3)' : days < 60 ? 'var(--warn)' : 'var(--ok)',
            letterSpacing: '0.03em',
          }}
        >
          {doc.is_permanent ? 'Permanent' : doc.expiry_date ?? '—'}
        </div>
        {!doc.is_permanent && doc.expiry_date && (
          <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>
            {days}d remaining
          </div>
        )}
      </div>
      <button className="btn sm icon" style={{ height: 26, width: 26 }}>
        <Download size={11} />
      </button>
    </div>
  )
}

export default function CrewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [member, setMember] = useState<CrewMember | null>(null)
  const [tab, setTab] = useState<Tab>('Overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    operatorCrewService
      .get(id)
      .then(setMember)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <Shell activeId="crew" breadcrumb="Crew Roster" title="Loading…">
        <div style={{ padding: 28, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      </Shell>
    )
  }

  if (!member) {
    return (
      <Shell activeId="crew" breadcrumb="Crew Roster" title="Not found">
        <div style={{ padding: 28, color: 'var(--danger)', fontSize: 13 }}>Crew member not found.</div>
      </Shell>
    )
  }

  const dutyPct = Math.min(Math.round((member.duty_hours_month / 100) * 100), 100)

  return (
    <Shell
      activeId="crew"
      breadcrumb={`Crew Roster / ${member.name}`}
      title={member.name}
      subtitle={`${member.crew_role} · ${member.license_no ?? ''} · ${member.total_flight_hours.toLocaleString()} hrs total`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn sm ghost"
            style={{ height: 32, color: 'var(--ink-3)' }}
            onClick={() => navigate('/crew')}
          >
            <ArrowLeft size={12} />Back
          </button>
          <button className="btn sm" style={{ height: 32 }}>
            <Phone size={12} />Contact
          </button>
          <button className="btn sm" style={{ height: 32 }}>
            <Settings size={12} />Edit
          </button>
        </div>
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
        {TABS.map(t => (
          <div
            key={t}
            onClick={() => setTab(t)}
            style={{
              height: 44,
              padding: '0 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              borderBottom: tab === t ? '2px solid var(--ink)' : '2px solid transparent',
              color: tab === t ? 'var(--ink)' : 'var(--ink-3)',
              fontSize: 13,
              fontWeight: tab === t ? 500 : 400,
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {t}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '16px' : '22px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            borderRight: isMobile ? 'none' : '1px solid var(--rule)',
          }}
        >
          {tab === 'Overview' && (
            <>
              <section>
                <div className="card" style={{ padding: '16px 18px', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                  <div className="avatar" style={{ width: 56, height: 56, fontSize: 20, flexShrink: 0 }}>
                    {initials(member.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 10 }}>
                      {member.crew_role}
                      {member.employee_id ? ` · ${member.employee_id}` : ''}
                      {member.joined_date ? ` · Joined ${member.joined_date}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {member.type_ratings.map(r => (
                        <LicChip key={r.id} label={r.aircraft_type_name} expiry={r.expiry_date ? `exp ${r.expiry_date}` : undefined} />
                      ))}
                    </div>
                  </div>
                  <AvailPill status={member.availability} />
                </div>
              </section>

              <section>
                <div className="t-label" style={{ marginBottom: 10 }}>Flight statistics</div>
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 14 }}>
                    {[
                      ['Total flight hours', `${member.total_flight_hours.toLocaleString()} h`],
                      ['Duty hrs (month)', `${member.duty_hours_month} h`],
                      ['Status', member.status],
                      ['Home base', member.home_base_name ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="t-label" style={{ marginBottom: 3 }}>{k}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)', letterSpacing: '0.03em' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section>
                <div className="t-label" style={{ marginBottom: 10 }}>Monthly duty hours</div>
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="t-meta" style={{ fontSize: 11.5 }}>Duty hours used</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: dutyPct > 80 ? 'var(--danger)' : 'var(--ok)' }}>
                      {member.duty_hours_month} / 100 h · {100 - member.duty_hours_month} h remaining
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'var(--rule)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${dutyPct}%`, height: '100%', background: dutyPct > 80 ? 'var(--danger)' : 'var(--ok)', borderRadius: 4 }} />
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === 'Licenses & Ratings' && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="t-label">Licenses, ratings & medicals</span>
                <div style={{ flex: 1 }} />
                <button className="btn sm accent" style={{ height: 28 }}>
                  <Upload size={11} />Upload document
                </button>
              </div>
              {member.documents.length === 0 ? (
                <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No documents uploaded yet.</div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {member.documents.map((d, i) => (
                    <DocRow key={d.id} doc={d} last={i === member.documents.length - 1} />
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'Flight log' && (
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Flight log</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                Flight log is populated from flight assignments.
              </div>
            </section>
          )}

          {tab === 'Schedule' && (
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Upcoming schedule</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                Schedule is managed in Flight Dispatch.
              </div>
            </section>
          )}
        </div>

        {!isMobile && (
          <div
            style={{
              width: 280,
              flexShrink: 0,
              background: 'var(--surface)',
              overflowY: 'auto',
              padding: '22px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Contact</div>
              <div className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Mobile', member.phone ?? '—'],
                  ['Email', member.email ?? '—'],
                  ['Base', member.home_base_name ?? '—'],
                  ['Employee ID', member.employee_id ?? '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="t-label" style={{ marginBottom: 2, fontSize: 9.5 }}>{k}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', wordBreak: 'break-all' }}>{v}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Type ratings</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {member.type_ratings.length === 0 ? (
                  <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>No ratings added.</div>
                ) : (
                  member.type_ratings.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid var(--rule-soft)' }}>
                      <span className="t-meta" style={{ fontSize: 11.5 }}>{r.aircraft_type_name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: r.is_current ? 'var(--ok)' : 'var(--warn)' }}>
                        {r.is_current ? 'Current' : 'Expired'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </Shell>
  )
}
