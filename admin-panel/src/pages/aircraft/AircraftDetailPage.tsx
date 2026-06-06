import { useState, useEffect } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useParams } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { operatorService, uploadFile } from '../../services/operatorService'
import type { Aircraft, MaintenanceWindow, UpdateAircraftBody, Pilot, CreatePilotBody, UpdatePilotBody } from '../../services/operatorService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === 'ready')       return <span className="badge ok"><span className="dot ok" />Ready</span>
  if (status === 'maintenance') return <span className="badge warn"><span className="dot warn" />Maintenance</span>
  if (status === 'grounded')    return <span className="badge danger"><span className="dot danger" />Grounded</span>
  return <span className="badge info"><span className="dot info" />Pending review</span>
}

function airworthinessBadge(status: string) {
  if (status === 'ok')       return <span className="badge ok"><span className="dot ok" />Airworthy</span>
  if (status === 'expiring') return <span className="badge warn"><span className="dot warn" />Expiring</span>
  return <span className="badge danger"><span className="dot danger" />Expired</span>
}

function pilotStatusBadge(status: string) {
  if (status === 'active')   return <span className="badge ok"><span className="dot ok" />Active</span>
  if (status === 'grounded') return <span className="badge warn"><span className="dot warn" />Grounded</span>
  if (status === 'inactive') return <span className="badge"><span className="dot" />Inactive</span>
  return <span className="badge info"><span className="dot info" />Pending</span>
}

function initials(name: string) {
  return name.replace('Capt. ', '').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()
}

// ── Page ─────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'airworthiness' | 'crew' | 'maintenance'

const EMPTY_PILOT: Omit<CreatePilotBody, 'operator_id'> = {
  name: '', license_no: '', license_type: '', medical_expiry: '', notes: '',
}

export default function AircraftDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isMobile = useIsMobile()

  const [aircraft, setAircraft]           = useState<Aircraft | null>(null)
  const [operatorName, setOperatorName]   = useState<string | null>(null)
  const [loading, setLoading]             = useState(true)
  const [apiError, setApiError]           = useState('')
  const [isForbidden, setIsForbidden]     = useState(false)
  const [activeTab, setActiveTab]         = useState<TabId>('overview')

  // Edit specs
  const [editing, setEditing]             = useState(false)
  const [draft, setDraft]                 = useState<UpdateAircraftBody>({})
  const [saving, setSaving]               = useState(false)

  // Ground dialog
  const [showGround, setShowGround]       = useState(false)
  const [groundReason, setGroundReason]   = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Maintenance schedule dialog
  const [showMaint, setShowMaint]         = useState(false)
  const [maintForm, setMaintForm]         = useState({ starts_at: '', ends_at: '', notes: '' })

  // Airworthiness doc upload
  const [awDocFile, setAwDocFile]         = useState<File | null>(null)
  const [awUploading, setAwUploading]     = useState(false)
  const [awUploadError, setAwUploadError] = useState('')

  // Crew tab
  const [pilots, setPilots]                   = useState<Pilot[]>([])
  const [pilotsLoading, setPilotsLoading]     = useState(false)
  // Add pilot
  const [showAddPilot, setShowAddPilot]       = useState(false)
  const [pilotForm, setPilotForm]             = useState<Omit<CreatePilotBody, 'operator_id'>>({ ...EMPTY_PILOT })
  const [pilotSaving, setPilotSaving]         = useState(false)
  const [pilotError, setPilotError]           = useState('')
  // Pilot detail / edit
  const [selectedPilot, setSelectedPilot]     = useState<Pilot | null>(null)
  const [editingPilot, setEditingPilot]       = useState(false)
  const [pilotDraft, setPilotDraft]           = useState<UpdatePilotBody>({})
  const [pilotUpdateSaving, setPilotUpdateSaving] = useState(false)
  const [pilotUpdateError, setPilotUpdateError]   = useState('')
  const [pilotActionLoading, setPilotActionLoading] = useState(false)
  // Ground pilot dialog
  const [showGroundPilot, setShowGroundPilot] = useState(false)
  const [groundPilotReason, setGroundPilotReason] = useState('')
  const canManageAircraft = usePermission('aircraft.manage')

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const a = await operatorService.getAircraft(id)
      setAircraft(a)
      setDraft({
        registration_mark: a.registration_mark,
        seat_capacity: a.seat_capacity,
        mtow_kg: a.mtow_kg ?? undefined,
        range_nm: a.range_nm ?? undefined,
        total_hours: a.total_hours ?? undefined,
        airworthiness_expiry: a.airworthiness_expiry ?? undefined,
        airworthiness_doc_url: a.airworthiness_doc_url ?? undefined,
        notes: a.notes ?? undefined,
      })
      try {
        const op = await operatorService.getOperator(a.operator_id)
        setOperatorName(op.name)
      } catch {
        setOperatorName(null)
      }
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 403) setIsForbidden(true)
      else setApiError('Failed to load aircraft')
    } finally {
      setLoading(false)
    }
  }

  const loadCrew = async () => {
    if (!aircraft) return
    setPilotsLoading(true)
    try {
      const res = await operatorService.listPilots({ operator_id: aircraft.operator_id, page_size: 50 })
      setPilots(res.items)
    } catch { /* silently fail */ }
    finally { setPilotsLoading(false) }
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === 'crew') loadCrew()
  }, [activeTab, aircraft]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveSpecs = async () => {
    if (!aircraft) return
    setSaving(true); setApiError('')
    try {
      await operatorService.updateAircraft(aircraft.id, draft)
      await load()
      setEditing(false)
    } catch {
      setApiError('Failed to save specs')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!aircraft) return
    setActionLoading(true)
    try {
      await operatorService.approveAircraft(aircraft.id)
      await load()
    } catch {
      setApiError('Failed to approve aircraft')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGround = async () => {
    if (!aircraft || !groundReason.trim()) return
    setActionLoading(true)
    try {
      await operatorService.groundAircraft(aircraft.id, { reason: groundReason })
      setShowGround(false); setGroundReason('')
      await load()
    } catch {
      setApiError('Failed to ground aircraft')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnground = async () => {
    if (!aircraft) return
    setActionLoading(true)
    try {
      await operatorService.ungroundAircraft(aircraft.id)
      await load()
    } catch {
      setApiError('Failed to unground aircraft')
    } finally {
      setActionLoading(false)
    }
  }

  const handleScheduleMaint = async () => {
    if (!aircraft || !maintForm.starts_at || !maintForm.ends_at) return
    setActionLoading(true)
    try {
      await operatorService.setMaintenance(aircraft.id, {
        starts_at: maintForm.starts_at,
        ends_at: maintForm.ends_at,
        notes: maintForm.notes || undefined,
      })
      setShowMaint(false); setMaintForm({ starts_at: '', ends_at: '', notes: '' })
      await load()
    } catch {
      setApiError('Failed to schedule maintenance')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAwDocUpload = async () => {
    if (!aircraft || !awDocFile) return
    setAwUploading(true); setAwUploadError('')
    try {
      const uploaded = await uploadFile(awDocFile, 'documents')
      await operatorService.updateAircraft(aircraft.id, { airworthiness_doc_url: uploaded.url })
      setAwDocFile(null)
      await load()
    } catch {
      setAwUploadError('Upload failed. Please try again.')
    } finally {
      setAwUploading(false)
    }
  }

  const handleAddPilot = async () => {
    if (!aircraft) return
    if (!pilotForm.name?.trim()) { setPilotError('Name is required'); return }
    setPilotSaving(true); setPilotError('')
    try {
      await operatorService.createPilot({ ...pilotForm, operator_id: aircraft.operator_id })
      setPilotForm({ ...EMPTY_PILOT })
      setShowAddPilot(false)
      await loadCrew()
    } catch {
      setPilotError('Failed to add pilot')
    } finally {
      setPilotSaving(false)
    }
  }

  const openPilotDetail = (p: Pilot) => {
    setSelectedPilot(p)
    setEditingPilot(false)
    setPilotDraft({
      name: p.name,
      license_no: p.license_no ?? '',
      license_type: p.license_type ?? '',
      type_ratings: p.type_ratings ?? [],
      medical_expiry: p.medical_expiry ?? '',
      notes: p.notes ?? '',
    })
    setPilotUpdateError('')
  }

  const handleUpdatePilot = async () => {
    if (!selectedPilot) return
    setPilotUpdateSaving(true); setPilotUpdateError('')
    try {
      const updated = await operatorService.updatePilot(selectedPilot.id, pilotDraft)
      setSelectedPilot(updated)
      setEditingPilot(false)
      await loadCrew()
    } catch {
      setPilotUpdateError('Failed to update pilot')
    } finally {
      setPilotUpdateSaving(false)
    }
  }

  const handleApprovePilot = async () => {
    if (!selectedPilot) return
    setPilotActionLoading(true); setPilotUpdateError('')
    try {
      const updated = await operatorService.approvePilot(selectedPilot.id)
      setSelectedPilot(updated)
      await loadCrew()
    } catch {
      setPilotUpdateError('Failed to approve pilot')
    } finally {
      setPilotActionLoading(false)
    }
  }

  const handleGroundPilot = async () => {
    if (!selectedPilot || !groundPilotReason.trim()) return
    setPilotActionLoading(true); setPilotUpdateError('')
    try {
      const updated = await operatorService.groundPilot(selectedPilot.id, { reason: groundPilotReason })
      setSelectedPilot(updated)
      setShowGroundPilot(false); setGroundPilotReason('')
      await loadCrew()
    } catch {
      setPilotUpdateError('Failed to ground pilot')
    } finally {
      setPilotActionLoading(false)
    }
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: 'overview',      label: 'Overview' },
    { id: 'airworthiness', label: 'Airworthiness' },
    { id: 'crew',          label: `Crew${pilots.length ? ` · ${pilots.length}` : ''}` },
    { id: 'maintenance',   label: 'Maintenance' },
  ]

  if (isForbidden) return <AccessDeniedPage message={`You don't have permission to access this page.`} />

  if (loading) {
    return (
      <Shell activeId="aircraft" breadcrumb="Operations · Aircraft & Crew · Aircraft · …" title="Loading…">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading aircraft…</div>
      </Shell>
    )
  }

  if (!aircraft) {
    return (
      <Shell activeId="aircraft" breadcrumb="Operations · Aircraft & Crew · Aircraft" title="Not found">
        <div style={{ padding: 40, color: 'var(--danger)', fontSize: 13 }}>{apiError || 'Aircraft not found.'}</div>
      </Shell>
    )
  }

  const showApprove = aircraft.status === 'pending_review'
  const windows: MaintenanceWindow[] = aircraft.maintenance_windows ?? []
  const backendBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace('/api/v1', '') || 'http://localhost:8001'

  return (
    <Shell
      activeId="aircraft"
      breadcrumb={`Operations · Aircraft & Crew · Aircraft · ${aircraft.registration_mark}`}
      title={`${aircraft.registration_mark} · ${aircraft.aircraft_type_id || 'Unknown type'}`}
      subtitle={`${aircraft.seat_capacity} seats · ${aircraft.mtow_kg ? `MTOW ${aircraft.mtow_kg.toLocaleString()} kg` : ''} · ${aircraft.total_hours ? `${aircraft.total_hours.toLocaleString()} hrs` : ''}`}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {showApprove && (
            <button className="btn sm accent" onClick={handleApprove} disabled={actionLoading}>Approve</button>
          )}
          {aircraft.status === 'grounded' ? (
            <button className="btn sm accent" onClick={handleUnground} disabled={actionLoading}>
              {actionLoading ? 'Ungrounding…' : 'Unground'}
            </button>
          ) : (
            <>
              <button className="btn sm" onClick={() => setShowMaint(true)}>Schedule maintenance</button>
              <button className="btn sm ghost" style={{ color: 'var(--danger)' }} onClick={() => setShowGround(true)}>
                Ground
              </button>
            </>
          )}
        </div>
      }
    >
      <div>
        {/* Hero */}
        <div style={{
          background: 'var(--surface)', borderBottom: '1px solid var(--rule)',
          padding: isMobile ? '16px' : '24px 32px',
          display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{
            width: 120, height: 76, borderRadius: 3, flexShrink: 0,
            background: aircraft.status === 'grounded' ? 'color-mix(in oklab, var(--danger) 8%, var(--surface-sunk))' : 'var(--surface-sunk)',
            border: `1px solid ${aircraft.status === 'grounded' ? 'color-mix(in oklab, var(--danger) 28%, var(--rule))' : 'var(--rule-strong)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: aircraft.status === 'grounded' ? 'var(--danger)' : 'var(--ink-3)',
          }}>
            <Icon name="helipad" size={40} />
          </div>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
              {statusBadge(aircraft.status)}
              {airworthinessBadge(aircraft.airworthiness_status)}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 22,
              background: 'var(--ink)', color: 'var(--surface)',
              padding: '4px 12px', display: 'inline-block', letterSpacing: '0.06em',
            }}>{aircraft.registration_mark}</div>
            <div className="t-meta" style={{ marginTop: 6 }}>
              Operator: {operatorName || aircraft.operator_id}
              {aircraft.airworthiness_expiry && ` · Airworthy until ${aircraft.airworthiness_expiry}`}
            </div>
          </div>

          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginLeft: 'auto' }}>
              {[
                ['Seats',       String(aircraft.seat_capacity), 'Passenger capacity'],
                ['MTOW',        aircraft.mtow_kg ? `${aircraft.mtow_kg.toLocaleString()} kg` : '—', 'Max takeoff weight'],
                ['Range',       aircraft.range_nm ? `${aircraft.range_nm} nm` : '—', 'No reserve'],
                ['Total hours', aircraft.total_hours ? aircraft.total_hours.toLocaleString() : '—', 'Lifetime hours'],
              ].map(([k, v, m], i) => (
                <div key={k} style={{ padding: '0 16px', borderRight: i < 3 ? '1px solid var(--rule)' : 'none' }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>{v}</div>
                  <div className="t-meta" style={{ marginTop: 4 }}>{m}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grounded reason banner */}
        {aircraft.status === 'grounded' && aircraft.notes && (
          <div style={{
            margin: '0', padding: '10px 32px',
            background: 'color-mix(in oklab, var(--danger) 7%, var(--surface))',
            borderBottom: '1px solid color-mix(in oklab, var(--danger) 22%, var(--rule))',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          }}>
            <Icon name="alert" size={14} />
            <span style={{ color: 'var(--ink-2)' }}>
              <strong style={{ color: 'var(--danger)' }}>Grounded:</strong> {aircraft.notes}
            </span>
          </div>
        )}

        {apiError && (
          <div style={{
            margin: '12px 32px 0', padding: '9px 12px',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
          }}>{apiError}</div>
        )}

        {/* Tabs */}
        <div style={{
          padding: '0 32px', borderBottom: '1px solid var(--rule)',
          background: 'var(--surface)', display: 'flex',
          overflowX: isMobile ? 'auto' : undefined,
          WebkitOverflowScrolling: isMobile ? 'touch' : undefined,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 18px', fontSize: 13,
                color: activeTab === tab.id ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: activeTab === tab.id ? 500 : 400,
                background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>

          {/* ── Overview tab ── */}
          {activeTab === 'overview' && (
            <div style={{ maxWidth: 700 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Aircraft specs</h3>
                {!editing ? (
                  <button className="btn sm" onClick={() => setEditing(true)} style={{ display: canManageAircraft ? undefined : 'none' }}>Edit specs</button>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn sm" onClick={() => setEditing(false)}>Discard</button>
                    <button className="btn accent sm" onClick={saveSpecs} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Registration mark',    key: 'registration_mark' as const,   type: 'text' },
                  { label: 'Seat capacity',         key: 'seat_capacity' as const,       type: 'number' },
                  { label: 'MTOW · kg',             key: 'mtow_kg' as const,             type: 'number' },
                  { label: 'Range · nm',            key: 'range_nm' as const,            type: 'number' },
                  { label: 'Total hours',           key: 'total_hours' as const,         type: 'number' },
                  { label: 'Airworthiness expiry',  key: 'airworthiness_expiry' as const, type: 'date' },
                ].map(f => (
                  <div key={f.key} className="field">
                    <label className="field-label">{f.label}</label>
                    {editing ? (
                      <div className="input">
                        <input
                          type={f.type}
                          value={(draft[f.key] as string | number) ?? ''}
                          onChange={e => setDraft(d => ({
                            ...d,
                            [f.key]: f.type === 'number'
                              ? (e.target.value ? Number(e.target.value) : undefined)
                              : (e.target.value || undefined),
                          }))}
                        />
                      </div>
                    ) : (
                      <div style={{ fontSize: 13.5, color: 'var(--ink)', padding: '6px 0' }}>
                        {(aircraft[f.key as keyof Aircraft] as string | number | null) ?? '—'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label className="field-label">{aircraft.status === 'grounded' ? 'Grounded reason' : 'Notes'}</label>
                {editing ? (
                  <div className="input">
                    <input
                      value={draft.notes ?? ''}
                      onChange={e => setDraft(d => ({ ...d, notes: e.target.value || undefined }))}
                      placeholder="Internal notes…"
                    />
                  </div>
                ) : (
                  <div style={{
                    fontSize: 13, padding: '6px 0',
                    color: aircraft.status === 'grounded' ? 'var(--danger)' : 'var(--ink-2)',
                  }}>
                    {aircraft.notes || '—'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Airworthiness tab ── */}
          {activeTab === 'airworthiness' && (
            <div style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Status card */}
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px',
              }}>
                <div className="t-label" style={{ marginBottom: 14 }}>Certificate status · DGCA</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 16 }}>
                  {[
                    ['Status',      aircraft.airworthiness_status],
                    ['Valid until', aircraft.airworthiness_expiry || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="t-label" style={{ padding: 0 }}>{k}</div>
                      <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {airworthinessBadge(aircraft.airworthiness_status)}
              </div>

              {/* Document card */}
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px',
              }}>
                <div className="t-label" style={{ marginBottom: 14 }}>Airworthiness certificate document</div>

                {/* Current doc */}
                {aircraft.airworthiness_doc_url ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', marginBottom: 14,
                    background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3,
                  }}>
                    <Icon name="upload" size={14} />
                    <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {aircraft.airworthiness_doc_url.split('/').pop()}
                    </div>
                    <a
                      href={aircraft.airworthiness_doc_url.startsWith('http') ? aircraft.airworthiness_doc_url : `${backendBase}${aircraft.airworthiness_doc_url}`}
                      target="_blank" rel="noreferrer"
                      className="btn sm ghost"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Icon name="eye" size={11} />View
                    </a>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>No document on file.</div>
                )}

                {/* Upload area */}
                <label
                  htmlFor="aw-doc-input"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    cursor: 'pointer',
                    border: `1.5px dashed ${awDocFile ? 'var(--accent)' : 'var(--rule-strong)'}`,
                    borderRadius: 3,
                    background: awDocFile ? 'var(--accent-soft)' : 'var(--surface-sunk)',
                  }}
                >
                  <Icon name="upload" size={15} />
                  <div style={{ flex: 1 }}>
                    {awDocFile ? (
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{awDocFile.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                          {(awDocFile.size / 1024).toFixed(0)} KB · {aircraft.airworthiness_doc_url ? 'Will replace current document' : 'Ready to upload'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                          {aircraft.airworthiness_doc_url ? 'Click to replace document' : 'Click to upload certificate'}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>PDF, PNG, JPG — max 10 MB</div>
                      </div>
                    )}
                  </div>
                  {awDocFile && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>✓</span>}
                </label>
                <input
                  id="aw-doc-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setAwDocFile(f); setAwUploadError('') }
                    e.target.value = ''
                  }}
                />

                {awUploadError && (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--danger)' }}>{awUploadError}</div>
                )}

                {awDocFile && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn sm" onClick={() => { setAwDocFile(null); setAwUploadError('') }}>Cancel</button>
                    <button className="btn sm accent" onClick={handleAwDocUpload} disabled={awUploading}>
                      {awUploading ? 'Uploading…' : 'Save document'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Crew tab ── */}
          {activeTab === 'crew' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                    Crew assigned to this operator
                  </h3>
                  <div className="t-meta" style={{ marginTop: 4 }}>
                    Pilots are assigned to the operator ({operatorName || aircraft.operator_id}) and can fly any aircraft in the fleet.
                  </div>
                </div>
                <button
                  className="btn sm accent"
                  onClick={() => { setPilotForm({ ...EMPTY_PILOT }); setPilotError(''); setShowAddPilot(true) }}
                >
                  <Icon name="plus" size={13} />Add pilot
                </button>
              </div>

              {pilotsLoading ? (
                <div style={{ padding: '24px 0', color: 'var(--ink-3)', fontSize: 13 }}>Loading crew…</div>
              ) : pilots.length === 0 ? (
                <div style={{
                  padding: '40px 0', textAlign: 'center',
                  color: 'var(--ink-3)', fontSize: 13,
                }}>
                  No pilots onboarded for this operator yet.
                  <br />
                  <button
                    className="btn sm accent"
                    style={{ marginTop: 12 }}
                    onClick={() => { setPilotForm({ ...EMPTY_PILOT }); setPilotError(''); setShowAddPilot(true) }}
                  >
                    <Icon name="plus" size={13} />Onboard first pilot
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ minWidth: 640 }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>License no.</th>
                        <th>License type</th>
                        <th>Type ratings</th>
                        <th>Medical expiry</th>
                        <th>Notes</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pilots.map(p => (
                        <tr
                          key={p.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => openPilotDetail(p)}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                background: p.status === 'grounded'
                                  ? 'color-mix(in oklab, var(--danger) 12%, var(--surface-sunk))'
                                  : p.status === 'active'
                                    ? 'color-mix(in oklab, var(--accent) 12%, var(--surface-sunk))'
                                    : 'var(--surface-sunk)',
                                color: p.status === 'grounded' ? 'var(--danger)' : p.status === 'active' ? 'var(--accent)' : 'var(--ink-3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 600,
                              }}>{initials(p.name)}</div>
                              <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{p.name}</div>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                            {p.license_no || '—'}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                            {p.license_type || '—'}
                          </td>
                          <td>
                            {(p.type_ratings ?? []).length === 0 ? (
                              <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>—</span>
                            ) : (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {(p.type_ratings ?? []).slice(0, 3).map(r => (
                                  <span key={r} style={{
                                    fontFamily: 'var(--font-mono)', fontSize: 10,
                                    padding: '2px 5px', background: 'var(--surface-2)',
                                    border: '1px solid var(--rule)', borderRadius: 2, color: 'var(--ink-2)',
                                  }}>{r}</span>
                                ))}
                                {(p.type_ratings ?? []).length > 3 && (
                                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>+{(p.type_ratings ?? []).length - 3}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                            {p.medical_expiry || '—'}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--ink-3)', maxWidth: 140 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.notes || '—'}
                            </div>
                          </td>
                          <td>{pilotStatusBadge(p.status)}</td>
                          <td>
                            <button
                              className="btn sm ghost"
                              style={{ fontSize: 11, padding: '3px 10px' }}
                              onClick={e => { e.stopPropagation(); openPilotDetail(p) }}
                            >
                              Details →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Maintenance tab ── */}
          {activeTab === 'maintenance' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  Maintenance windows
                </h3>
                <button className="btn sm" onClick={() => setShowMaint(true)}>Schedule new →</button>
              </div>
              {windows.length === 0 ? (
                <div style={{ padding: '32px 0', color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>
                  No maintenance windows scheduled.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ minWidth: 500 }}>
                    <thead>
                      <tr>
                        <th>Starts at</th>
                        <th>Ends at</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {windows.map((w, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{w.starts_at}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{w.ends_at}</td>
                          <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>{w.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ground aircraft dialog */}
      {showGround && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 420, background: 'var(--surface)',
            border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)', padding: '28px',
          }}>
            <h3 style={{ margin: '0 0 12px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              Ground {aircraft.registration_mark}?
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-3)' }}>
              This aircraft will be taken out of service. Please provide a reason:
            </p>
            <div className="input" style={{ marginBottom: 20 }}>
              <input
                value={groundReason}
                onChange={e => setGroundReason(e.target.value)}
                placeholder="Reason for grounding…"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn sm" onClick={() => { setShowGround(false); setGroundReason('') }}>Cancel</button>
              <button
                className="btn sm"
                style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
                onClick={handleGround}
                disabled={actionLoading || !groundReason.trim()}
              >
                {actionLoading ? 'Grounding…' : 'Ground aircraft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule maintenance dialog */}
      {showMaint && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 440, background: 'var(--surface)',
            border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)', padding: '28px',
          }}>
            <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              Schedule maintenance window
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label className="field-label">Starts at *</label>
                <div className="input">
                  <input
                    type="datetime-local"
                    value={maintForm.starts_at}
                    onChange={e => setMaintForm(f => ({ ...f, starts_at: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Ends at *</label>
                <div className="input">
                  <input
                    type="datetime-local"
                    value={maintForm.ends_at}
                    onChange={e => setMaintForm(f => ({ ...f, ends_at: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Notes</label>
                <div className="input">
                  <input
                    value={maintForm.notes}
                    onChange={e => setMaintForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="300-hr inspection, A-check…"
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="btn sm" onClick={() => { setShowMaint(false); setMaintForm({ starts_at: '', ends_at: '', notes: '' }) }}>
                Cancel
              </button>
              <button className="btn sm accent" onClick={handleScheduleMaint} disabled={actionLoading}>
                {actionLoading ? 'Scheduling…' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add pilot modal */}
      {showAddPilot && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 460, background: 'var(--surface)',
            border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)', padding: '28px',
          }}>
            <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              Add pilot · {operatorName}
            </h3>
            {pilotError && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
              }}>{pilotError}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label className="field-label">Name *</label>
                <div className="input">
                  <input
                    value={pilotForm.name ?? ''}
                    onChange={e => setPilotForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Capt. Renu Bhandari"
                    autoFocus
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label className="field-label">License no.</label>
                  <div className="input">
                    <input
                      value={pilotForm.license_no ?? ''}
                      onChange={e => setPilotForm(f => ({ ...f, license_no: e.target.value }))}
                      placeholder="IND-CPL-12345"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">License type</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                    <select
                      value={pilotForm.license_type ?? ''}
                      onChange={e => setPilotForm(f => ({ ...f, license_type: e.target.value }))}
                      style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10, flex: 1 }}
                    >
                      <option value="">—</option>
                      <option value="CPL">CPL</option>
                      <option value="ATPL">ATPL</option>
                      <option value="PPL">PPL</option>
                      <option value="CPL-H">CPL-H</option>
                      <option value="ATPL-H">ATPL-H</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Medical expiry</label>
                <div className="input">
                  <input
                    type="date"
                    value={pilotForm.medical_expiry ?? ''}
                    onChange={e => setPilotForm(f => ({ ...f, medical_expiry: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Type ratings <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>· comma-separated</span></label>
                <div className="input">
                  <input
                    value={(pilotForm.type_ratings ?? []).join(', ')}
                    onChange={e => setPilotForm(f => ({
                      ...f,
                      type_ratings: e.target.value ? e.target.value.split(',').map(x => x.trim()).filter(Boolean) : [],
                    }))}
                    placeholder="B407, AS350, R44…"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Notes</label>
                <div className="input">
                  <input
                    value={pilotForm.notes ?? ''}
                    onChange={e => setPilotForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Internal notes…"
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="btn sm" onClick={() => { setShowAddPilot(false); setPilotError('') }}>Cancel</button>
              <button className="btn sm accent" onClick={handleAddPilot} disabled={pilotSaving}>
                {pilotSaving ? 'Adding…' : 'Add pilot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pilot detail / edit modal ── */}
      {selectedPilot && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 520, background: 'var(--surface)',
            border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: selectedPilot.status === 'grounded'
                  ? 'color-mix(in oklab, var(--danger) 12%, var(--surface-sunk))'
                  : selectedPilot.status === 'active'
                    ? 'color-mix(in oklab, var(--accent) 12%, var(--surface-sunk))'
                    : 'var(--surface-sunk)',
                color: selectedPilot.status === 'grounded' ? 'var(--danger)' : selectedPilot.status === 'active' ? 'var(--accent)' : 'var(--ink-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>{initials(selectedPilot.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{selectedPilot.name}</div>
                <div style={{ marginTop: 4 }}>{pilotStatusBadge(selectedPilot.status)}</div>
              </div>
              <button
                onClick={() => { setSelectedPilot(null); setEditingPilot(false); setPilotUpdateError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 18, padding: 4 }}
              >✕</button>
            </div>

            {/* Status action bar */}
            {!editingPilot && (
              <div style={{
                padding: '10px 24px', borderBottom: '1px solid var(--rule)',
                background: 'var(--surface-sunk)',
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', marginRight: 4 }}>Actions:</span>
                {(selectedPilot.status === 'pending_review' || selectedPilot.status === 'grounded' || selectedPilot.status === 'inactive') && (
                  <button
                    className="btn sm accent"
                    onClick={handleApprovePilot}
                    disabled={pilotActionLoading}
                  >
                    {pilotActionLoading ? 'Approving…' : selectedPilot.status === 'grounded' ? 'Reactivate' : 'Approve'}
                  </button>
                )}
                {selectedPilot.status === 'active' && (
                  <button
                    className="btn sm ghost"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => { setShowGroundPilot(true); setGroundPilotReason('') }}
                    disabled={pilotActionLoading}
                  >
                    Ground pilot
                  </button>
                )}
                {selectedPilot.status === 'pending_review' && (
                  <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>· Approve to mark as active</span>
                )}
                {selectedPilot.status === 'grounded' && selectedPilot.notes && (
                  <span style={{ fontSize: 11.5, color: 'var(--danger)' }}>
                    · Grounded: {selectedPilot.notes}
                  </span>
                )}
              </div>
            )}

            {pilotUpdateError && (
              <div style={{
                margin: '8px 24px 0', padding: '7px 10px', fontSize: 12.5,
                background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                borderRadius: 3, color: 'var(--danger)',
              }}>{pilotUpdateError}</div>
            )}

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {editingPilot ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="field">
                    <label className="field-label">Name *</label>
                    <div className="input">
                      <input
                        value={pilotDraft.name ?? ''}
                        onChange={e => setPilotDraft(d => ({ ...d, name: e.target.value }))}
                        placeholder="Capt. Renu Bhandari"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="field">
                      <label className="field-label">License no.</label>
                      <div className="input">
                        <input
                          value={pilotDraft.license_no ?? ''}
                          onChange={e => setPilotDraft(d => ({ ...d, license_no: e.target.value }))}
                          placeholder="IND-ATPL-00123"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label className="field-label">License type</label>
                      <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                        <select
                          value={pilotDraft.license_type ?? ''}
                          onChange={e => setPilotDraft(d => ({ ...d, license_type: e.target.value }))}
                          style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10, flex: 1 }}
                        >
                          <option value="">—</option>
                          <option value="CPL">CPL</option>
                          <option value="ATPL">ATPL</option>
                          <option value="PPL">PPL</option>
                          <option value="CPL-H">CPL-H</option>
                          <option value="ATPL-H">ATPL-H</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Medical expiry</label>
                    <div className="input">
                      <input
                        type="date"
                        value={pilotDraft.medical_expiry ?? ''}
                        onChange={e => setPilotDraft(d => ({ ...d, medical_expiry: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Type ratings <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>· comma-separated</span></label>
                    <div className="input">
                      <input
                        value={(pilotDraft.type_ratings ?? []).join(', ')}
                        onChange={e => setPilotDraft(d => ({
                          ...d,
                          type_ratings: e.target.value ? e.target.value.split(',').map(x => x.trim()).filter(Boolean) : [],
                        }))}
                        placeholder="B407, AS350, R44…"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Notes</label>
                    <div className="input">
                      <input
                        value={pilotDraft.notes ?? ''}
                        onChange={e => setPilotDraft(d => ({ ...d, notes: e.target.value }))}
                        placeholder="Internal notes…"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    ['License no.', selectedPilot.license_no, 'mono'],
                    ['License type', selectedPilot.license_type, 'mono'],
                    ['Medical expiry', selectedPilot.medical_expiry, 'mono'],
                    ['Joined', selectedPilot.created_at?.slice(0, 10), 'mono'],
                  ].map(([label, val, font]) => (
                    <div key={label as string}>
                      <div className="t-label" style={{ padding: 0, marginBottom: 4 }}>{label}</div>
                      <div style={{
                        fontSize: 13, color: val ? 'var(--ink)' : 'var(--ink-3)',
                        fontFamily: font === 'mono' ? 'var(--font-mono)' : undefined,
                      }}>{val || '—'}</div>
                    </div>
                  ))}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="t-label" style={{ padding: 0, marginBottom: 6 }}>Type ratings</div>
                    {(selectedPilot.type_ratings ?? []).length === 0 ? (
                      <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {(selectedPilot.type_ratings ?? []).map(r => (
                          <span key={r} style={{
                            fontFamily: 'var(--font-mono)', fontSize: 11,
                            padding: '3px 7px', background: 'var(--surface-2)',
                            border: '1px solid var(--rule)', borderRadius: 3, color: 'var(--ink-2)',
                          }}>{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="t-label" style={{ padding: 0, marginBottom: 4 }}>Notes</div>
                    <div style={{ fontSize: 13, color: selectedPilot.notes ? 'var(--ink-2)' : 'var(--ink-3)' }}>
                      {selectedPilot.notes || '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 24px', borderTop: '1px solid var(--rule)',
              display: 'flex', justifyContent: 'flex-end', gap: 8,
            }}>
              {editingPilot ? (
                <>
                  <button className="btn sm" onClick={() => { setEditingPilot(false); setPilotUpdateError('') }}>Discard</button>
                  <button className="btn sm accent" onClick={handleUpdatePilot} disabled={pilotUpdateSaving}>
                    {pilotUpdateSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn sm" onClick={() => { setSelectedPilot(null) }}>Close</button>
                  <button className="btn sm accent" onClick={() => setEditingPilot(true)}>Edit details</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Ground pilot dialog ── */}
      {showGroundPilot && selectedPilot && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 400, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 400, background: 'var(--surface)',
            border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)', padding: '28px',
          }}>
            <h3 style={{ margin: '0 0 10px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              Ground {selectedPilot.name}?
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-3)' }}>
              This pilot will be removed from active duty. Please provide a reason:
            </p>
            <div className="input" style={{ marginBottom: 20 }}>
              <input
                value={groundPilotReason}
                onChange={e => setGroundPilotReason(e.target.value)}
                placeholder="Reason for grounding…"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn sm" onClick={() => { setShowGroundPilot(false); setGroundPilotReason('') }}>Cancel</button>
              <button
                className="btn sm"
                style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
                onClick={handleGroundPilot}
                disabled={pilotActionLoading || !groundPilotReason.trim()}
              >
                {pilotActionLoading ? 'Grounding…' : 'Ground pilot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
