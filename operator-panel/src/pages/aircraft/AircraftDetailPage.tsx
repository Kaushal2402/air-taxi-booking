import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Settings,
  Upload,
} from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { Aircraft, AircraftDocument, MaintenanceWindow } from '../../services/operatorAircraftService'
import { operatorAircraftService } from '../../services/operatorAircraftService'

const TABS = ['Overview', 'Maintenance', 'Documents', 'Assignments'] as const
type Tab = (typeof TABS)[number]

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 999
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.floor(diff / 86400000)
}

function CertPill({ label, expiry, daysLeft }: { label: string; expiry: string; daysLeft: number }) {
  const tone = daysLeft < 0 ? 'danger' : daysLeft < 30 ? 'warn' : 'ok'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        background: `color-mix(in oklab,var(--${tone}) 8%,var(--surface))`,
        border: `1px solid color-mix(in oklab,var(--${tone}) 22%,var(--rule))`,
        borderRadius: 3,
      }}
    >
      {tone === 'ok' ? (
        <CheckCircle2 size={11} style={{ color: `var(--${tone})`, flexShrink: 0 }} />
      ) : (
        <AlertTriangle size={11} style={{ color: `var(--${tone})`, flexShrink: 0 }} />
      )}
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</div>
        <div
          style={{
            fontSize: 10.5,
            color: `var(--${tone})`,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.03em',
            marginTop: 1,
          }}
        >
          {expiry} {daysLeft >= 0 ? `· ${daysLeft}d left` : '· EXPIRED'}
        </div>
      </div>
    </div>
  )
}

function DocRow({ doc, last }: { doc: AircraftDocument; last: boolean }) {
  const days = daysUntil(doc.expiry_date)
  const isOk = doc.is_permanent || days > 30
  const tone = doc.is_permanent ? 'ok' : days < 0 ? 'danger' : days < 30 ? 'warn' : 'ok'
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
      {isOk ? (
        <CheckCircle2 size={14} style={{ color: `var(--${tone})`, flexShrink: 0 }} />
      ) : (
        <AlertTriangle size={14} style={{ color: 'var(--warn)', flexShrink: 0 }} />
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
            color: doc.is_permanent ? 'var(--ink-3)' : days < 30 ? 'var(--warn)' : 'var(--ok)',
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

function MaintRow({ w, last }: { w: MaintenanceWindow; last: boolean }) {
  const tone = w.status === 'done' ? 'ok' : w.status === 'upcoming' ? 'warn' : 'info'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: '9px 14px',
        borderBottom: last ? 'none' : '1px solid var(--rule-soft)',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>{w.task}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>
          {new Date(w.start_dt).toLocaleDateString()} – {new Date(w.end_dt).toLocaleDateString()}
        </div>
      </div>
      <span className={`badge ${tone}`} style={{ height: 18, fontSize: 10 }}>
        <span className={`dot ${tone}`} />
        {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
      </span>
    </div>
  )
}

export default function AircraftDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [aircraft, setAircraft] = useState<Aircraft | null>(null)
  const [tab, setTab] = useState<Tab>('Overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    operatorAircraftService
      .get(id)
      .then(setAircraft)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <Shell activeId="aircraft" breadcrumb="Aircraft & Fleet" title="Loading…">
        <div style={{ padding: 28, color: 'var(--ink-3)', fontSize: 13 }}>Loading aircraft…</div>
      </Shell>
    )
  }

  if (!aircraft) {
    return (
      <Shell activeId="aircraft" breadcrumb="Aircraft & Fleet" title="Not found">
        <div style={{ padding: 28, color: 'var(--danger)', fontSize: 13 }}>Aircraft not found.</div>
      </Shell>
    )
  }

  const airworthDoc = aircraft.documents.find(d =>
    d.doc_type.toLowerCase().includes('airworthiness')
  )
  const arcDoc = aircraft.documents.find(d => d.doc_type.toLowerCase().includes('arc'))

  return (
    <Shell
      activeId="aircraft"
      breadcrumb={`Aircraft & Fleet / ${aircraft.registration_mark}`}
      title={`${aircraft.registration_mark} — ${aircraft.aircraft_type_name}`}
      subtitle={`${aircraft.aircraft_type_name} · ${aircraft.seat_capacity} pax · ${aircraft.range_nm} nm · ${aircraft.status}`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn sm ghost"
            style={{ height: 32, color: 'var(--ink-3)' }}
            onClick={() => navigate('/aircraft')}
          >
            <ArrowLeft size={12} />
            Back
          </button>
          <button className="btn sm" style={{ height: 32 }}>
            <Settings size={12} />
            Edit aircraft
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

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '16px' : '22px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {tab === 'Overview' && (
          <>
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>
                Aircraft specifications
              </div>
              <div className="card" style={{ padding: '14px 16px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                    gap: 14,
                  }}
                >
                  {[
                    ['Registration', aircraft.registration_mark, true],
                    ['Type', aircraft.aircraft_type_name, false],
                    ['Serial no.', aircraft.serial_number ?? '—', true],
                    ['Year of mfr', aircraft.year_of_manufacture?.toString() ?? '—', true],
                    ['MTOW', `${aircraft.mtow_kg.toLocaleString()} kg`, false],
                    ['Max pax', `${aircraft.seat_capacity}`, false],
                    ['Range', `${aircraft.range_nm} nm`, false],
                    ['Endurance', aircraft.endurance_hours ?? '—', false],
                  ].map(([k, v, mono]) => (
                    <div key={k as string}>
                      <div className="t-label" style={{ marginBottom: 4 }}>
                        {k}
                      </div>
                      <span
                        style={{
                          fontFamily: mono ? 'var(--font-mono)' : undefined,
                          fontSize: 13,
                          letterSpacing: mono ? '0.05em' : undefined,
                          color: 'var(--ink)',
                        }}
                      >
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div style={{ display: 'flex', gap: 16, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <section style={{ flex: 1 }}>
                <div className="t-label" style={{ marginBottom: 10 }}>
                  Flight hours & cycles
                </div>
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 14,
                    }}
                  >
                    {[
                      ['Total flight hours', `${aircraft.total_flight_hours} h`],
                      ['Total cycles', `${aircraft.total_cycles}`],
                      ['Status', aircraft.status],
                      ['Home base', aircraft.home_base_name ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="t-label" style={{ marginBottom: 4 }}>
                          {k}
                        </div>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 14,
                            color: 'var(--ink)',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {(airworthDoc || arcDoc) && (
                <section style={{ flex: 1 }}>
                  <div className="t-label" style={{ marginBottom: 10 }}>
                    Certificate validity
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                    }}
                  >
                    {airworthDoc && (
                      <CertPill
                        label="Airworthiness"
                        expiry={airworthDoc.expiry_date ?? 'Permanent'}
                        daysLeft={daysUntil(airworthDoc.expiry_date)}
                      />
                    )}
                    {arcDoc && (
                      <CertPill
                        label="ARC"
                        expiry={arcDoc.expiry_date ?? 'Permanent'}
                        daysLeft={daysUntil(arcDoc.expiry_date)}
                      />
                    )}
                  </div>
                </section>
              )}
            </div>
          </>
        )}

        {tab === 'Maintenance' && (
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>
              Maintenance schedule
            </div>
            {aircraft.maintenance_windows.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                No maintenance windows scheduled.
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {aircraft.maintenance_windows.map((w, i) => (
                  <MaintRow
                    key={w.id}
                    w={w}
                    last={i === aircraft.maintenance_windows.length - 1}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'Documents' && (
          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <span className="t-label">Aircraft documents</span>
              <div style={{ flex: 1 }} />
              <button className="btn sm accent" style={{ height: 28 }}>
                <Upload size={11} />
                Upload document
              </button>
            </div>
            {aircraft.documents.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                No documents uploaded yet.
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {aircraft.documents.map((d, i) => (
                  <DocRow
                    key={d.id}
                    doc={d}
                    last={i === aircraft.documents.length - 1}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'Assignments' && (
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>
              Flight assignments
            </div>
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
              Assignments are managed in Flight Dispatch.
            </div>
          </section>
        )}
      </div>
    </Shell>
  )
}
