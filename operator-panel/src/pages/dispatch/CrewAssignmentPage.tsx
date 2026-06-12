import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
} from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type {
  EligibleAircraft,
  EligibleCrew,
  EligibleResources,
  Flight,
} from '../../services/operatorAssignmentService'
import { operatorAssignmentService } from '../../services/operatorAssignmentService'

function fmtDT(iso: string | null): string {
  if (!iso) return 'ASAP'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SelectableCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--rule)'}`,
        background: selected ? 'var(--accent-soft-2)' : 'var(--bg)',
        borderRadius: 3,
        cursor: 'pointer',
        marginBottom: 6,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          flexShrink: 0,
          border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--rule-strong)'}`,
          background: selected ? 'var(--accent)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && (
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#fff',
            }}
          />
        )}
      </div>
      {children}
    </div>
  )
}

export default function CrewAssignmentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [flight, setFlight] = useState<Flight | null>(null)
  const [resources, setResources] = useState<EligibleResources | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null)
  const [selectedPilotId, setSelectedPilotId] = useState<string | null>(null)
  const [selectedCopilotId, setSelectedCopilotId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      operatorAssignmentService.getFlight(id),
      operatorAssignmentService.getEligibleResources(id),
    ])
      .then(([f, r]) => {
        setFlight(f)
        setResources(r)
        if (f.aircraft_id) setSelectedAircraftId(f.aircraft_id)
        if (f.pilot_id) setSelectedPilotId(f.pilot_id)
        if (f.copilot_id) setSelectedCopilotId(f.copilot_id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const selectedAircraft = resources?.aircraft.find(a => a.id === selectedAircraftId) ?? null
  const selectedPilot = resources?.pilots.find(p => p.id === selectedPilotId) ?? null
  const selectedCopilot = resources?.pilots.find(p => p.id === selectedCopilotId) ?? null

  const canConfirm = selectedAircraftId && selectedPilotId

  const handleConfirm = async () => {
    if (!flight || !selectedAircraft || !selectedPilot) return
    setSaving(true)
    try {
      await operatorAssignmentService.assign(flight.id, {
        aircraft_id: selectedAircraft.id,
        aircraft_reg: selectedAircraft.registration_mark,
        aircraft_type: selectedAircraft.aircraft_type_name,
        pilot_id: selectedPilot.id,
        pilot_name: selectedPilot.full_name,
        copilot_id: selectedCopilot?.id,
        copilot_name: selectedCopilot?.full_name,
        crew: [],
      })
      navigate('/dispatch')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Shell activeId="dispatch" breadcrumb="Assignment Board" title="Loading…">
        <div className="t-meta" style={{ textAlign: 'center', padding: 60 }}>
          Loading…
        </div>
      </Shell>
    )
  }

  if (!flight) {
    return (
      <Shell activeId="dispatch" breadcrumb="Assignment Board" title="Not found">
        <div className="t-meta" style={{ textAlign: 'center', padding: 60 }}>
          Flight not found.
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      activeId="dispatch"
      breadcrumb={`Assignment Board / ${flight.booking_ref}`}
      title={`Assign Crew — ${flight.booking_ref}`}
      subtitle={`${flight.origin_name} → ${flight.destination_name} · ${fmtDT(flight.etd)}`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn sm ghost"
            style={{ height: 32, color: 'var(--ink-3)' }}
            onClick={() => navigate('/dispatch')}
          >
            <ArrowLeft size={12} />
            Back
          </button>
          <button
            className="btn sm accent"
            style={{ height: 32 }}
            disabled={!canConfirm || saving}
            onClick={handleConfirm}
          >
            <Check size={12} />
            {saving ? 'Saving…' : 'Confirm Assignment'}
          </button>
        </div>
      }
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left: context */}
        <div
          style={{
            flex: 1,
            padding: '22px 26px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            borderRight: '1px solid var(--rule)',
          }}
        >
          {/* Flight summary */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>
              Flight Summary
            </div>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {[
                  ['Reference', flight.booking_ref, true],
                  ['Aircraft', selectedAircraft ? `${selectedAircraft.registration_mark} — ${selectedAircraft.aircraft_type_name}` : 'Not assigned', false],
                  ['Departure', fmtDT(flight.etd), false],
                ].map(([k, v, mono]) => (
                  <div key={String(k)}>
                    <div className="t-label" style={{ marginBottom: 4 }}>
                      {k}
                    </div>
                    <span
                      style={{
                        fontFamily: mono ? 'var(--font-mono)' : undefined,
                        fontSize: 13,
                        letterSpacing: mono ? '0.06em' : undefined,
                        color: 'var(--ink)',
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: 'var(--rule-soft)', margin: '12px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {[
                  ['Route', `${flight.origin_name} → ${flight.destination_name}`],
                  ['Payload', `${flight.pax_count} pax · ${flight.baggage_kg} kg`],
                  ['Status', flight.status.charAt(0).toUpperCase() + flight.status.slice(1)],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <div className="t-label" style={{ marginBottom: 4 }}>
                      {k}
                    </div>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Compliance notice */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '11px 14px',
              background: 'color-mix(in oklab,var(--ok) 9%,var(--surface))',
              border: '1px solid color-mix(in oklab,var(--ok) 25%,var(--rule))',
              borderRadius: 3,
            }}
          >
            <Check size={14} style={{ color: 'var(--ok)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--ok)', lineHeight: 1.55 }}>
              Aircraft availability and capacity checks are validated on assignment. Pilot FDP
              limits are checked server-side against active duty records.
            </span>
          </div>
        </div>

        {/* Right: crew selection */}
        <div
          style={{
            width: 400,
            flexShrink: 0,
            background: 'var(--surface)',
            overflowY: 'auto',
            padding: '22px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Aircraft selection */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>
              Select Aircraft
            </div>
            {resources?.aircraft.length === 0 && (
              <div className="t-meta" style={{ fontSize: 12 }}>
                No eligible aircraft found.
              </div>
            )}
            {resources?.aircraft.map(a => (
              <SelectableCard
                key={a.id}
                selected={selectedAircraftId === a.id}
                onClick={() => setSelectedAircraftId(a.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        letterSpacing: '0.05em',
                        color: 'var(--ink)',
                      }}
                    >
                      {a.registration_mark}
                    </span>
                    <span className="t-meta" style={{ fontSize: 11 }}>
                      {a.aircraft_type_name} · {a.seat_capacity} pax · {a.range_nm} nm
                    </span>
                  </div>
                  {a.eligibility_note && (
                    <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>
                      {a.eligibility_note}
                    </div>
                  )}
                </div>
                <span className="badge ok" style={{ height: 19 }}>
                  <span className="dot ok" />
                  {a.status}
                </span>
              </SelectableCard>
            ))}
          </section>

          {/* Pilot selection */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>
              Assign Captain
            </div>
            {resources?.pilots.length === 0 && (
              <div className="t-meta" style={{ fontSize: 12 }}>
                No eligible pilots found.
              </div>
            )}
            {resources?.pilots.map(p => (
              <SelectableCard
                key={p.id}
                selected={selectedPilotId === p.id}
                onClick={() => setSelectedPilotId(p.id)}
              >
                <div
                  className="avatar"
                  style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}
                >
                  {p.full_name
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>
                    {p.full_name}
                  </div>
                  <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>
                    {p.license_type ?? 'ATPL-H'} · {p.total_hours} hrs
                  </div>
                </div>
                <span className={`badge ${CREW_TONE[p.status] ?? 'ok'}`} style={{ height: 17 }}>
                  <span className={`dot ${CREW_TONE[p.status] ?? 'ok'}`} />
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
              </SelectableCard>
            ))}
          </section>

          {/* Copilot selection */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>
              Assign First Officer{' '}
              <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--ink-4)', fontSize: 11 }}>
                optional
              </span>
            </div>
            <SelectableCard
              selected={selectedCopilotId === null}
              onClick={() => setSelectedCopilotId(null)}
            >
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>None</span>
            </SelectableCard>
            {resources?.pilots.map(p => (
              <SelectableCard
                key={p.id + '-co'}
                selected={selectedCopilotId === p.id}
                onClick={() =>
                  setSelectedCopilotId(prev => (prev === p.id ? null : p.id))
                }
              >
                <div
                  className="avatar"
                  style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}
                >
                  {p.full_name
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>
                    {p.full_name}
                  </div>
                  <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>
                    {p.license_type ?? 'CPL-H'} · {p.total_hours} hrs
                  </div>
                </div>
                <span className={`badge ${CREW_TONE[p.status] ?? 'ok'}`} style={{ height: 17 }}>
                  <span className={`dot ${CREW_TONE[p.status] ?? 'ok'}`} />
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
              </SelectableCard>
            ))}
          </section>

          {/* Assignment summary */}
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--rule)',
              borderRadius: 3,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div className="t-label">Assignment Summary</div>
            {[
              ['Aircraft', selectedAircraft ? `${selectedAircraft.registration_mark} — ${selectedAircraft.aircraft_type_name}` : '—'],
              ['Captain', selectedPilot?.full_name ?? '—'],
              ['First Officer', selectedCopilot?.full_name ?? 'None'],
              ['Est. departure', fmtDT(flight.etd)],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span className="t-meta" style={{ fontSize: 11.5 }}>
                  {k}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>
                  {v}
                </span>
              </div>
            ))}
          </div>

          <button
            className="btn accent"
            style={{
              width: '100%',
              height: 40,
              justifyContent: 'center',
              fontWeight: 500,
              fontSize: 14,
              opacity: canConfirm ? 1 : 0.5,
            }}
            disabled={!canConfirm || saving}
            onClick={handleConfirm}
          >
            <Check size={14} />
            {saving ? 'Saving…' : 'Confirm Assignment'}
          </button>
          <button
            className="btn"
            style={{
              width: '100%',
              height: 32,
              justifyContent: 'center',
              fontSize: 12.5,
              color: 'var(--ink-3)',
            }}
            onClick={() => navigate('/dispatch')}
          >
            Save draft
          </button>
        </div>
      </div>
    </Shell>
  )
}

const CREW_TONE: Record<string, string> = {
  active: 'ok',
  available: 'ok',
  standby: 'warn',
  rest: 'danger',
  inactive: 'warn',
}
