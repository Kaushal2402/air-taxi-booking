import { useState, useEffect } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { operatorService, uploadFile } from '../../services/operatorService'
import type { OperatorDetail, Aircraft, Pilot, OperatorDocument, OperatorPerformanceResponse, DocType, CreateAircraftBody, CreatePilotBody, UpdatePilotBody, OperatorUser } from '../../services/operatorService'
import { useFormatMoney } from '../../lib/utils'
import { kycService } from '../../services/kycService'
import type { DocTypeItem } from '../../services/kycService'
import { settingsService } from '../../services/settingsService'
import { catalogService } from '../../services/catalogService'
import type { AircraftType } from '../../services/catalogService'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'company' | 'fleet' | 'crew' | 'performance' | 'compliance' | 'team'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === 'active')         return <span className="badge ok"><span className="dot ok" />Active</span>
  if (status === 'approved')       return <span className="badge ok"><span className="dot ok" />Approved</span>
  if (status === 'paused')         return <span className="badge warn"><span className="dot warn" />Paused</span>
  if (status === 'pending')        return <span className="badge info"><span className="dot info" />Pending</span>
  if (status === 'review')         return <span className="badge info"><span className="dot info" />Review</span>
  if (status === 'rejected')       return <span className="badge danger"><span className="dot danger" />Rejected</span>
  if (status === 'deactivated')    return <span className="badge"><span className="dot" />Deactivated</span>
  return <span className="badge">{status}</span>
}

function aircraftStatusBadge(status: string) {
  if (status === 'ready')          return <span className="badge ok"><span className="dot ok" />Ready</span>
  if (status === 'maintenance')    return <span className="badge warn"><span className="dot warn" />Maintenance</span>
  if (status === 'grounded')       return <span className="badge danger"><span className="dot danger" />Grounded</span>
  return <span className="badge info"><span className="dot info" />Pending review</span>
}

function airworthinessBadge(status: string) {
  if (status === 'ok')       return <span className="badge ok"><span className="dot ok" />OK</span>
  if (status === 'expiring') return <span className="badge warn"><span className="dot warn" />Expiring</span>
  return <span className="badge danger"><span className="dot danger" />Expired</span>
}

function pilotStatusBadge(status: string) {
  if (status === 'active')       return <span className="badge ok"><span className="dot ok" />Active</span>
  if (status === 'grounded')     return <span className="badge warn"><span className="dot warn" />Grounded</span>
  if (status === 'inactive')     return <span className="badge"><span className="dot" />Inactive</span>
  return <span className="badge info"><span className="dot info" />Pending review</span>
}

function docStatusBadge(status: string) {
  if (status === 'approved') return <span className="badge ok"><span className="dot ok" />Approved</span>
  if (status === 'rejected') return <span className="badge danger"><span className="dot danger" />Rejected</span>
  if (status === 'expired')  return <span className="badge danger"><span className="dot danger" />Expired</span>
  return <span className="badge info"><span className="dot info" />Pending</span>
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OperatorDetailPage() {
  const fmtMinor = useFormatMoney()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [operator, setOperator]       = useState<OperatorDetail | null>(null)
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState<TabId>('company')
  const [apiError, setApiError]       = useState('')
  const [isForbidden, setIsForbidden] = useState(false)

  // Fleet & Crew
  const [aircraft, setAircraft]       = useState<Aircraft[]>([])
  const [pilots, setPilots]           = useState<Pilot[]>([])
  const [performance, setPerformance] = useState<OperatorPerformanceResponse | null>(null)
  const [docs, setDocs]               = useState<OperatorDocument[]>([])
  const [aircraftTypes, setAircraftTypes] = useState<AircraftType[]>([])

  // Edit company form
  const [editing, setEditing]         = useState(false)
  const [draft, setDraft]             = useState<Partial<OperatorDetail>>({})
  const [saving, setSaving]           = useState(false)

  // Action dialogs
  const [showReject, setShowReject]   = useState(false)
  const [showPause, setShowPause]     = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [pauseReason, setPauseReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Add document modal
  const [showAddDoc, setShowAddDoc]   = useState(false)
  const [docTypeOptions, setDocTypeOptions] = useState<DocTypeItem[]>([])
  const [docForm, setDocForm]         = useState<{ doc_type: DocType; file: File | null; expires_at: string }>({
    doc_type: '', file: null, expires_at: '',
  })
  const [docSaving, setDocSaving]     = useState(false)
  const [docError, setDocError]       = useState('')
  const [docUploadProgress, setDocUploadProgress] = useState<string>('')

  // Add aircraft modal
  const [showAddAircraft, setShowAddAircraft] = useState(false)
  const [aircraftForm, setAircraftForm] = useState<Omit<CreateAircraftBody, 'operator_id'>>({
    registration_mark: '', seat_capacity: 1, aircraft_type_id: undefined,
  })
  const [aircraftSaving, setAircraftSaving] = useState(false)
  const [aircraftError, setAircraftError]   = useState('')

  // Add pilot modal
  const [showAddPilot, setShowAddPilot]   = useState(false)
  const [pilotForm, setPilotForm]         = useState<Omit<CreatePilotBody, 'operator_id'>>({
    name: '', license_no: '', license_type: '', type_ratings: [], medical_expiry: '', notes: '',
  })
  const [pilotSaving, setPilotSaving]     = useState(false)
  const [pilotError, setPilotError]       = useState('')

  // Pilot detail modal
  const [selectedPilot, setSelectedPilot]         = useState<Pilot | null>(null)
  const [editingPilot, setEditingPilot]           = useState(false)
  const [pilotDraft, setPilotDraft]               = useState<UpdatePilotBody>({})
  const [pilotUpdateSaving, setPilotUpdateSaving] = useState(false)
  const [pilotUpdateError, setPilotUpdateError]   = useState('')
  const [pilotActionLoading, setPilotActionLoading] = useState(false)
  const [showGroundPilot, setShowGroundPilot]     = useState(false)
  const [groundPilotReason, setGroundPilotReason] = useState('')
  const [siteVisitRequired, setSiteVisitRequired] = useState(false)
  // Team (operator users)
  const [teamUsers, setTeamUsers]         = useState<OperatorUser[]>([])
  const [showInvite, setShowInvite]       = useState(false)
  const [inviteForm, setInviteForm]       = useState({ name: '', email: '', operator_role: 'viewer', phone: '' })
  const [inviteSaving, setInviteSaving]   = useState(false)
  const [inviteError, setInviteError]     = useState('')
  const [inviteDone, setInviteDone]       = useState('')
  const [resendingId, setResendingId]     = useState<string | null>(null)
  const [resendDoneId, setResendDoneId]   = useState<string | null>(null)

  const canApproveDoc = usePermission('kyc.documents.approve')
  const canSuspendOperator = usePermission('operators.suspend')
  const canApproveOperator = usePermission('operators.approve')

  const loadOperator = async () => {
    if (!id) return
    setLoading(true)
    try {
      const detail = await operatorService.getOperator(id)
      setOperator(detail)
      setDocs(detail.docs)
      setDraft({ ...detail })
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 403) setIsForbidden(true)
      else setApiError('Failed to load operator')
    } finally {
      setLoading(false)
    }
  }

  const loadFleet = async () => {
    if (!id) return
    try {
      const res = await operatorService.listAircraft({ operator_id: id, page_size: 50 })
      setAircraft(res.items)
    } catch { /* silently fail */ }
  }

  const loadCrew = async () => {
    if (!id) return
    try {
      const res = await operatorService.listPilots({ operator_id: id, page_size: 50 })
      setPilots(res.items)
    } catch { /* silently fail */ }
  }

  const loadTeam = async () => {
    if (!id) return
    try {
      const users = await operatorService.listUsers(id)
      setTeamUsers(users)
    } catch { /* silently fail */ }
  }

  const loadPerformance = async () => {
    if (!id) return
    try {
      const perf = await operatorService.getPerformance(id)
      setPerformance(perf)
    } catch { /* silently fail */ }
  }

  useEffect(() => {
    loadOperator()
    settingsService.getSettings().then(s => setSiteVisitRequired(!!s.operator_site_visit_required)).catch(() => {})
    catalogService.listAircraftTypes().then(setAircraftTypes).catch(() => {})
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    kycService.getDocTypes().then(r => {
      setDocTypeOptions(r.operator)
      setDocForm(f => ({ ...f, doc_type: r.operator[0]?.key ?? '' }))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab === 'fleet')       loadFleet()
    if (activeTab === 'crew')        loadCrew()
    if (activeTab === 'performance') loadPerformance()
    if (activeTab === 'compliance')  setDocs(operator?.docs ?? [])
    if (activeTab === 'team')        loadTeam()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (k: keyof OperatorDetail, v: unknown) => setDraft(d => ({ ...d, [k]: v }))

  const saveCompany = async () => {
    if (!operator) return
    setSaving(true); setApiError('')
    try {
      await operatorService.updateOperator(operator.id, {
        name: draft.name,
        company_registration_no: draft.company_registration_no ?? undefined,
        hq_city: draft.hq_city ?? undefined,
        cert_type: draft.cert_type ?? undefined,
        insurance_expiry: draft.insurance_expiry ?? undefined,
        cert_expiry: draft.cert_expiry ?? undefined,
        notes: draft.notes ?? undefined,
        payout_account_ref: draft.payout_account_ref ?? undefined,
        commission_pct: draft.commission_pct ?? null,
        site_visit_status: draft.site_visit_status ?? null,
      })
      await loadOperator()
      setEditing(false)
    } catch {
      setApiError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleAddDoc = async () => {
    if (!operator) return
    if (!docForm.file) { setDocError('Please select a file to upload'); return }
    setDocSaving(true); setDocError(''); setDocUploadProgress('Uploading file…')
    try {
      const uploaded = await uploadFile(docForm.file, 'documents')
      setDocUploadProgress('Saving document…')
      const newDoc = await operatorService.addDocument(operator.id, {
        doc_type: docForm.doc_type,
        file_url: uploaded.url,
        expires_at: docForm.expires_at || undefined,
      })
      setDocs(ds => [...ds, newDoc])
      setShowAddDoc(false)
      setDocForm({ doc_type: docTypeOptions[0]?.key ?? '', file: null, expires_at: '' })
      setDocUploadProgress('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setDocError(msg || 'Failed to upload document')
      setDocUploadProgress('')
    } finally {
      setDocSaving(false)
    }
  }

  const handleAddAircraft = async () => {
    if (!operator) return
    if (!aircraftForm.registration_mark.trim()) { setAircraftError('Registration mark is required'); return }
    setAircraftSaving(true); setAircraftError('')
    try {
      await operatorService.createAircraft({ ...aircraftForm, operator_id: operator.id })
      setShowAddAircraft(false)
      setAircraftForm({ registration_mark: '', seat_capacity: 1 })
      await loadFleet()
    } catch {
      setAircraftError('Failed to add aircraft')
    } finally {
      setAircraftSaving(false)
    }
  }

  const handleAddPilot = async () => {
    if (!operator) return
    if (!pilotForm.name?.trim()) { setPilotError('Name is required'); return }
    setPilotSaving(true); setPilotError('')
    try {
      await operatorService.createPilot({ ...pilotForm, operator_id: operator.id })
      setShowAddPilot(false)
      setPilotForm({ name: '', license_no: '', license_type: '', medical_expiry: '', notes: '' })
      await loadCrew()
    } catch {
      setPilotError('Failed to add pilot')
    } finally {
      setPilotSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!operator) return
    setActionLoading(true)
    try {
      await operatorService.approveOperator(operator.id)
      await loadOperator()
    } catch {
      setApiError('Failed to approve')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!operator || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      await operatorService.rejectOperator(operator.id, { reason: rejectReason })
      setShowReject(false); setRejectReason('')
      await loadOperator()
    } catch {
      setApiError('Failed to reject')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePause = async () => {
    if (!operator) return
    setActionLoading(true)
    try {
      await operatorService.pauseOperator(operator.id, pauseReason ? { reason: pauseReason } : undefined)
      setShowPause(false); setPauseReason('')
      await loadOperator()
    } catch {
      setApiError('Failed to pause')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivate = async () => {
    if (!operator) return
    setActionLoading(true)
    try {
      await operatorService.reactivateOperator(operator.id)
      await loadOperator()
    } catch {
      setApiError('Failed to reactivate')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveDoc = async (doc: OperatorDocument) => {
    if (!operator) return
    try {
      const updated = await operatorService.updateDocument(operator.id, doc.id, { status: 'approved' })
      setDocs(ds => ds.map(d => d.id === updated.id ? updated : d))
    } catch {
      setApiError('Failed to update document')
    }
  }

  const handleRejectDoc = async (doc: OperatorDocument) => {
    if (!operator) return
    try {
      const updated = await operatorService.updateDocument(operator.id, doc.id, { status: 'rejected' })
      setDocs(ds => ds.map(d => d.id === updated.id ? updated : d))
    } catch {
      setApiError('Failed to update document')
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

  const handleResendInvite = async (userId: string) => {
    if (!operator) return
    setResendingId(userId); setResendDoneId(null)
    try {
      await operatorService.resendInvite(operator.id, userId)
      setResendDoneId(userId)
      setTimeout(() => setResendDoneId(null), 3000)
    } catch {
      // silently ignore — user sees no change
    } finally {
      setResendingId(null)
    }
  }

  const handleInviteUser = async () => {
    if (!operator) return
    if (!inviteForm.name.trim()) { setInviteError('Name is required'); return }
    if (!inviteForm.email.trim()) { setInviteError('Email is required'); return }
    setInviteSaving(true); setInviteError(''); setInviteDone('')
    try {
      await operatorService.inviteUser(operator.id, {
        name: inviteForm.name,
        email: inviteForm.email,
        operator_role: inviteForm.operator_role,
        phone: inviteForm.phone || undefined,
      })
      setInviteDone(inviteForm.email)
      setInviteForm({ name: '', email: '', operator_role: 'viewer', phone: '' })
      await loadTeam()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setInviteError(detail ?? 'Failed to send invite')
    } finally {
      setInviteSaving(false)
    }
  }

  function pilotInitials(name: string) {
    return name.replace('Capt. ', '').split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase()
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: 'company',     label: 'Company' },
    { id: 'fleet',       label: `Fleet · ${operator?.fleet_count ?? 0}` },
    { id: 'crew',        label: `Crew · ${operator?.pilot_count ?? 0}` },
    { id: 'performance', label: 'Performance' },
    { id: 'compliance',  label: 'Compliance' },
    { id: 'team',        label: `Team · ${teamUsers.length}` },
  ]

  if (isForbidden) return <AccessDeniedPage message={`You don't have permission to access this page.`} />

  if (loading) {
    return (
      <Shell activeId="operators" breadcrumb="Operations · Air Operators · …" title="Loading…">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading operator…</div>
      </Shell>
    )
  }

  if (!operator) {
    return (
      <Shell activeId="operators" breadcrumb="Operations · Air Operators" title="Not found">
        <div style={{ padding: 40, color: 'var(--danger)', fontSize: 13 }}>{apiError || 'Operator not found.'}</div>
      </Shell>
    )
  }

  const showApprove    = ['pending', 'review', 'rejected'].includes(operator.status)
  const showActivate   = operator.status === 'approved'
  const showRejectBtn  = ['pending', 'review', 'approved'].includes(operator.status)
  const showPauseBtn   = operator.status === 'active'
  const showReactivate = ['paused', 'deactivated'].includes(operator.status)

  return (
    <Shell
      activeId="operators"
      breadcrumb={`Operations · Air Operators · ${operator.name}`}
      title={operator.name}
      subtitle={`${operator.hq_city || '—'} · ${operator.cert_type || 'No cert'} · ${operator.fleet_count} aircraft · ${operator.pilot_count} crew`}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {showApprove    && (
            <button
              className="btn sm accent"
              onClick={handleApprove}
              disabled={actionLoading || (siteVisitRequired && operator.site_visit_status !== 'completed')}
              title={siteVisitRequired && operator.site_visit_status !== 'completed' ? 'Site visit must be completed before approval' : undefined}
            >
              Approve
            </button>
          )}
          {showApprove && siteVisitRequired && operator.site_visit_status !== 'completed' && (
            <span style={{ fontSize: 12, color: 'var(--warn, #f59e0b)', alignSelf: 'center' }}>
              Site visit required
            </span>
          )}
          {showActivate   && <button className="btn sm accent" onClick={handleReactivate} disabled={actionLoading}>Activate</button>}
          {showRejectBtn  && <button className="btn sm ghost" style={{ color: 'var(--danger)' }} onClick={() => setShowReject(true)}>Reject</button>}
          {showPauseBtn   && <button className="btn sm" onClick={() => setShowPause(true)}>Pause publishing</button>}
          {showReactivate && <button className="btn sm accent" onClick={handleReactivate} disabled={actionLoading}>Reactivate</button>}
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
            width: 64, height: 64, borderRadius: 4, flexShrink: 0,
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
          }}>
            <Icon name="building" size={28} stroke={1.2} />
          </div>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
              {statusBadge(operator.status)}
              {operator.cert_type && <span className="badge">{operator.cert_type}</span>}
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.018em' }}>
              {operator.name}
            </div>
            <div className="t-meta" style={{ marginTop: 4 }}>
              {operator.company_registration_no || 'No reg no.'} · {operator.hq_city || '—'}
              {operator.commission_pct != null && ` · Commission ${operator.commission_pct}%`}
            </div>
          </div>
        </div>

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
          background: 'var(--surface)',
          display: 'flex',
          overflowX: isMobile ? 'auto' : undefined,
          WebkitOverflowScrolling: isMobile ? 'touch' : undefined,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 18px',
                fontSize: 13,
                color: activeTab === tab.id ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: activeTab === tab.id ? 500 : 400,
                marginBottom: -1,
                background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>

          {/* ── Company tab ── */}
          {activeTab === 'company' && (
            <div style={{ maxWidth: 700 }}>
              {operator.status === 'rejected' && operator.rejection_reason && (
                <div style={{
                  marginBottom: 18, padding: '12px 16px',
                  background: 'var(--danger-soft)',
                  border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                  borderRadius: 3,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <Icon name="alert" size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--danger)', marginBottom: 3 }}>
                      Rejection reason
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                      {operator.rejection_reason}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Company information</h3>
                {!editing ? (
                  <button className="btn sm" onClick={() => { setEditing(true); setDraft({ ...operator }) }}>Edit</button>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn sm" onClick={() => { setEditing(false); setDraft({ ...operator }) }}>Discard</button>
                    <button className="btn accent sm" onClick={saveCompany} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Operator name', key: 'name' as const, type: 'text' },
                  { label: 'Registration no.', key: 'company_registration_no' as const, type: 'text' },
                  { label: 'HQ city', key: 'hq_city' as const, type: 'text' },
                  { label: 'Cert type', key: 'cert_type' as const, type: 'text' },
                  { label: 'Insurance expiry', key: 'insurance_expiry' as const, type: 'date' },
                  { label: 'Cert expiry', key: 'cert_expiry' as const, type: 'date' },
                ].map(f => (
                  <div key={f.key} className="field">
                    <label className="field-label">{f.label}</label>
                    {editing ? (
                      <div className="input">
                        <input
                          type={f.type}
                          value={(draft[f.key] as string) ?? ''}
                          onChange={e => patch(f.key, e.target.value || null)}
                        />
                      </div>
                    ) : (
                      <div style={{ fontSize: 13.5, color: 'var(--ink)', padding: '6px 0' }}>
                        {(operator[f.key] as string | null) || '—'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label className="field-label">Site visit status</label>
                {editing ? (
                  <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                    <select
                      value={draft.site_visit_status ?? ''}
                      onChange={e => patch('site_visit_status', e.target.value || null)}
                      style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10 }}
                    >
                      <option value="">—</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="waived">Waived</option>
                    </select>
                  </div>
                ) : (
                  <div style={{ fontSize: 13.5, color: 'var(--ink)', padding: '6px 0' }}>
                    {operator.site_visit_status || '—'}
                  </div>
                )}
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label className="field-label">Commission %</label>
                {editing ? (
                  <div className="input">
                    <input
                      type="number" min={0} max={100} step={0.1}
                      value={draft.commission_pct ?? ''}
                      onChange={e => patch('commission_pct', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Platform default"
                    />
                  </div>
                ) : (
                  <div style={{ fontSize: 13.5, color: 'var(--ink)', padding: '6px 0' }}>
                    {operator.commission_pct != null ? `${operator.commission_pct}%` : 'Platform default'}
                  </div>
                )}
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label className="field-label">Payout account ref.</label>
                {editing ? (
                  <div className="input">
                    <input
                      value={draft.payout_account_ref ?? ''}
                      onChange={e => patch('payout_account_ref', e.target.value || null)}
                      placeholder="Bank account / payment ref…"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                ) : (
                  <div style={{ fontSize: 13.5, color: 'var(--ink)', padding: '6px 0', fontFamily: 'var(--font-mono)' }}>
                    {operator.payout_account_ref || '—'}
                  </div>
                )}
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label className="field-label">Notes</label>
                {editing ? (
                  <div className="input">
                    <input
                      value={draft.notes ?? ''}
                      onChange={e => patch('notes', e.target.value || null)}
                      placeholder="Internal notes…"
                    />
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', padding: '6px 0' }}>
                    {operator.notes || '—'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Fleet tab ── */}
          {activeTab === 'fleet' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  Fleet · {aircraft.length} aircraft
                </h3>
                <button className="btn sm accent" onClick={() => { setAircraftForm({ registration_mark: '', seat_capacity: 1, aircraft_type_id: undefined }); setAircraftError(''); setShowAddAircraft(true) }}>
                  <Icon name="plus" size={13} />Add aircraft
                </button>
              </div>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="tbl" style={{ minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th>Registration</th>
                      <th>Type</th>
                      <th>Seats</th>
                      <th>Total hours</th>
                      <th>Status</th>
                      <th>Airworthiness</th>
                      <th>Next maint.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aircraft.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                          No aircraft yet.
                        </td>
                      </tr>
                    ) : aircraft.map(a => {
                      const nextMaint = (a.maintenance_windows ?? [])
                        .filter((w: { starts_at: string; ends_at: string; notes?: string }) => new Date(w.starts_at) > new Date())
                        .sort((x: { starts_at: string }, y: { starts_at: string }) => new Date(x.starts_at).getTime() - new Date(y.starts_at).getTime())[0]
                      return (
                        <tr
                          key={a.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/aircraft/${a.id}`)}
                        >
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>
                              {a.registration_mark}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                            {a.aircraft_type_id
                              ? (aircraftTypes.find(t => t.id === a.aircraft_type_id)?.name || a.aircraft_type_id)
                              : '—'}
                          </td>
                          <td className="num">{a.seat_capacity}</td>
                          <td className="num">{a.total_hours?.toLocaleString() || '—'}</td>
                          <td>{aircraftStatusBadge(a.status)}</td>
                          <td>{airworthinessBadge(a.airworthiness_status)}</td>
                          <td className="num" style={{ color: 'var(--ink-2)' }}>
                            {nextMaint ? nextMaint.starts_at.slice(0, 10) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Crew tab ── */}
          {activeTab === 'crew' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  Crew · {pilots.length} pilots
                </h3>
                <button className="btn sm accent" onClick={() => { setPilotForm({ name: '', license_no: '', license_type: '', type_ratings: [], medical_expiry: '', notes: '' }); setPilotError(''); setShowAddPilot(true) }}>
                  <Icon name="plus" size={13} />Add pilot
                </button>
              </div>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="tbl" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>License no.</th>
                      <th>License type</th>
                      <th>Type ratings</th>
                      <th>Medical expiry</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pilots.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                          No pilots yet.
                        </td>
                      </tr>
                    ) : pilots.map(p => (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openPilotDetail(p)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              background: p.status === 'active' ? 'color-mix(in oklab, var(--accent) 12%, var(--surface-sunk))' : 'var(--surface-sunk)',
                              color: p.status === 'active' ? 'var(--accent)' : 'var(--ink-3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 700,
                            }}>{pilotInitials(p.name)}</div>
                            <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{p.name}</div>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                          {p.license_no || '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                          {p.license_type || '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {(p.type_ratings ?? []).slice(0, 2).map(r => (
                              <span key={r} style={{
                                fontFamily: 'var(--font-mono)', fontSize: 10.5,
                                padding: '2px 6px', background: 'var(--surface-2)',
                                border: '1px solid var(--rule)', borderRadius: 2, color: 'var(--ink-2)',
                              }}>{r}</span>
                            ))}
                            {(p.type_ratings ?? []).length > 2 && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>+{(p.type_ratings ?? []).length - 2}</span>}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                          {p.medical_expiry || '—'}
                        </td>
                        <td>{pilotStatusBadge(p.status)}</td>
                        <td>
                          <button className="btn sm ghost" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); openPilotDetail(p) }}>
                            Manage →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Performance tab ── */}
          {activeTab === 'performance' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
              {performance ? [
                { label: 'OTP %',              value: `${performance.otp_pct}%` },
                { label: 'Load factor %',       value: `${performance.load_factor_pct}%` },
                { label: 'Bookings MTD',         value: String(performance.booking_count_mtd) },
                { label: 'Cancellation rate %',  value: `${performance.cancellation_rate_pct}%` },
                { label: 'Payouts MTD',          value: fmtMinor(performance.payouts_mtd_amount) },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 22px',
                }}>
                  <div className="t-label">{s.label}</div>
                  <div style={{
                    marginTop: 8, fontFamily: 'var(--font-serif)',
                    fontSize: 28, fontWeight: 400, letterSpacing: '-0.018em',
                  }}>{s.value}</div>
                </div>
              )) : (
                <div style={{ color: 'var(--ink-3)', fontSize: 13, gridColumn: '1 / -1' }}>
                  Loading performance…
                </div>
              )}
            </div>
          )}

          {/* ── Compliance tab ── */}
          {activeTab === 'compliance' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  Documents · {docs.length}
                </h3>
                <button className="btn sm" onClick={() => { setDocForm({ doc_type: docTypeOptions[0]?.key ?? '', file: null, expires_at: '' }); setDocError(''); setDocUploadProgress(''); setShowAddDoc(true) }}>
                  <Icon name="upload" size={12} />Add document
                </button>
              </div>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="tbl" style={{ minWidth: 500 }}>
                  <thead>
                    <tr>
                      <th>Doc type</th>
                      <th>File</th>
                      <th>Expires</th>
                      <th>Status</th>
                      <th style={{ width: 180 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                          No documents uploaded.
                        </td>
                      </tr>
                    ) : docs.map(doc => {
                      const fileUrl = doc.file_url.startsWith('http')
                        ? doc.file_url
                        : `${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:8001'}${doc.file_url}`
                      const fileName = doc.file_url.split('/').pop() || 'document'
                      return (
                        <tr key={doc.id}>
                          <td style={{ fontSize: 13, color: 'var(--ink)', textTransform: 'capitalize' }}>
                            {doc.doc_type.replace(/_/g, ' ')}
                          </td>
                          <td>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
                                maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}
                            >
                              <Icon name="eye" size={11} />
                              {fileName}
                            </a>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                            {doc.expires_at || '—'}
                          </td>
                          <td>{docStatusBadge(doc.status)}</td>
                          <td>
                            {doc.status === 'pending' && (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn sm accent" onClick={() => handleApproveDoc(doc)} style={{ display: canApproveDoc ? undefined : 'none' }}>Approve</button>
                                <button className="btn sm ghost" style={{ color: 'var(--danger)' }} onClick={() => handleRejectDoc(doc)}>Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* ── Team tab ── */}
          {activeTab === 'team' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  Team · {teamUsers.length} {teamUsers.length === 1 ? 'member' : 'members'}
                </h3>
                <button
                  className="btn sm accent"
                  onClick={() => { setInviteForm({ name: '', email: '', operator_role: 'viewer', phone: '' }); setInviteError(''); setInviteDone(''); setShowInvite(true) }}
                >
                  <Icon name="plus" size={13} />Invite user
                </button>
              </div>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="tbl" style={{ minWidth: 560 }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last login</th>
                      <th>2FA</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '40px 0' }}>
                          No team members yet. Invite someone to get started.
                        </td>
                      </tr>
                    ) : teamUsers.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              background: u.status === 'active'
                                ? 'color-mix(in oklab, var(--accent) 12%, var(--surface-sunk))'
                                : 'var(--surface-sunk)',
                              color: u.status === 'active' ? 'var(--accent)' : 'var(--ink-3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 700,
                            }}>
                              {u.name.split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12.5, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                          {u.email}
                        </td>
                        <td>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 11,
                            padding: '2px 7px',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--rule)',
                            borderRadius: 3, color: 'var(--ink-2)',
                          }}>
                            {u.operator_role}
                          </span>
                        </td>
                        <td>
                          {u.status === 'active'   && <span className="badge ok"><span className="dot ok" />Active</span>}
                          {u.status === 'invited'  && <span className="badge info"><span className="dot info" />Invited</span>}
                          {u.status === 'suspended' && <span className="badge danger"><span className="dot danger" />Suspended</span>}
                          {!['active','invited','suspended'].includes(u.status) && <span className="badge">{u.status}</span>}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          {u.twofa_enabled
                            ? <span className="badge ok" style={{ fontSize: 10.5 }}>Enabled</span>
                            : <span className="badge" style={{ fontSize: 10.5 }}>Off</span>
                          }
                        </td>
                        <td>
                          {u.status === 'invited' && (
                            resendDoneId === u.id ? (
                              <span style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 500 }}>
                                ✓ Sent
                              </span>
                            ) : (
                              <button
                                className="btn sm ghost"
                                style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                                disabled={resendingId === u.id}
                                onClick={() => handleResendInvite(u.id)}
                              >
                                {resendingId === u.id ? 'Sending…' : 'Resend invite'}
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Reject operator dialog */}
      {showReject && (
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
              Reject {operator.name}?
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-3)' }}>
              This will reject the operator. Please provide a reason:
            </p>
            <div className="input" style={{ marginBottom: 20 }}>
              <input
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection…"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn sm" onClick={() => { setShowReject(false); setRejectReason('') }}>Cancel</button>
              <button
                className="btn sm"
                style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
                onClick={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? 'Rejecting…' : 'Reject operator'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause dialog */}
      {showPause && (
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
              Pause {operator.name}?
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-3)' }}>
              Publishing will be paused. Existing bookings continue. Optionally provide a reason:
            </p>
            <div className="input" style={{ marginBottom: 20 }}>
              <input
                value={pauseReason}
                onChange={e => setPauseReason(e.target.value)}
                placeholder="Reason (optional)…"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn sm" onClick={() => { setShowPause(false); setPauseReason('') }}>Cancel</button>
              <button
                className="btn sm"
                style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
                onClick={handlePause}
                disabled={actionLoading}
              >
                {actionLoading ? 'Pausing…' : 'Pause operator'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add document modal */}
      {showAddDoc && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 480, background: 'var(--surface)',
            border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)', padding: '28px',
          }}>
            <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              Upload document
            </h3>
            {docError && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
              }}>{docError}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Document type */}
              <div className="field">
                <label className="field-label">Document type *</label>
                <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                  <select
                    value={docForm.doc_type}
                    onChange={e => setDocForm(f => ({ ...f, doc_type: e.target.value as DocType }))}
                    style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10, flex: 1 }}
                  >
                    {docTypeOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* File picker */}
              <div className="field">
                <label className="field-label">File * <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(PDF, image or Word — max 10 MB)</span></label>
                <label
                  htmlFor="doc-file-input"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', cursor: 'pointer',
                    border: `1.5px dashed ${docForm.file ? 'var(--accent)' : 'var(--rule-strong)'}`,
                    borderRadius: 3,
                    background: docForm.file ? 'var(--accent-soft)' : 'var(--surface-sunk)',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <Icon name="upload" size={16} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {docForm.file ? (
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {docForm.file.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                          {(docForm.file.size / 1024).toFixed(0)} KB · Click to change
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Click to choose a file</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>PDF, PNG, JPG, DOCX</div>
                      </div>
                    )}
                  </div>
                  {docForm.file && (
                    <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>✓</span>
                  )}
                </label>
                <input
                  id="doc-file-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) setDocForm(d => ({ ...d, file: f }))
                    e.target.value = ''   // allow re-selecting same file
                  }}
                />
              </div>

              {/* Expiry date */}
              <div className="field">
                <label className="field-label">Expires on <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span></label>
                <div className="input">
                  <input
                    type="date"
                    value={docForm.expires_at}
                    onChange={e => setDocForm(f => ({ ...f, expires_at: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {docUploadProgress && (
              <div style={{
                marginTop: 12, padding: '8px 12px', background: 'var(--surface-2)',
                border: '1px solid var(--rule)', borderRadius: 3,
                fontSize: 12.5, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  border: '2px solid var(--accent)', borderTopColor: 'transparent',
                  animation: 'spin 0.7s linear infinite',
                }} />
                {docUploadProgress}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="btn sm" onClick={() => { setShowAddDoc(false); setDocError(''); setDocUploadProgress('') }} disabled={docSaving}>
                Cancel
              </button>
              <button className="btn sm accent" onClick={handleAddDoc} disabled={docSaving || !docForm.file}>
                {docSaving ? docUploadProgress || 'Uploading…' : 'Upload document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add aircraft modal */}
      {showAddAircraft && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 480, background: 'var(--surface)',
            border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)', padding: '28px',
          }}>
            <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              Add aircraft to {operator.name}
            </h3>
            {aircraftError && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
              }}>{aircraftError}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label className="field-label">Aircraft type</label>
                <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                  <select
                    value={aircraftForm.aircraft_type_id ?? ''}
                    onChange={e => {
                      const t = aircraftTypes.find(x => x.id === e.target.value)
                      setAircraftForm(f => ({
                        ...f,
                        aircraft_type_id: e.target.value || undefined,
                        seat_capacity: t ? t.seats : f.seat_capacity,
                        mtow_kg: t?.mtow_kg ?? f.mtow_kg,
                        range_nm: t?.range_nm ?? f.range_nm,
                      }))
                    }}
                    style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10, flex: 1 }}
                  >
                    <option value="">Select type…</option>
                    {aircraftTypes.filter(t => t.is_active).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.category.toUpperCase()})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Registration mark *</label>
                <div className="input">
                  <input
                    value={aircraftForm.registration_mark}
                    onChange={e => setAircraftForm(f => ({ ...f, registration_mark: e.target.value.toUpperCase() }))}
                    placeholder="VT-ABC"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    autoFocus
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label className="field-label">Seat capacity *</label>
                  <div className="input">
                    <input
                      type="number" min={1}
                      value={aircraftForm.seat_capacity}
                      onChange={e => setAircraftForm(f => ({ ...f, seat_capacity: Number(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">MTOW (kg)</label>
                  <div className="input">
                    <input
                      type="number" min={0}
                      value={aircraftForm.mtow_kg ?? ''}
                      onChange={e => setAircraftForm(f => ({ ...f, mtow_kg: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="3175"
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label className="field-label">Range (nm)</label>
                  <div className="input">
                    <input
                      type="number" min={0}
                      value={aircraftForm.range_nm ?? ''}
                      onChange={e => setAircraftForm(f => ({ ...f, range_nm: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="380"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Airworthiness expiry</label>
                  <div className="input">
                    <input
                      type="date"
                      value={aircraftForm.airworthiness_expiry ?? ''}
                      onChange={e => setAircraftForm(f => ({ ...f, airworthiness_expiry: e.target.value || undefined }))}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="btn sm" onClick={() => { setShowAddAircraft(false); setAircraftError('') }}>Cancel</button>
              <button className="btn sm accent" onClick={handleAddAircraft} disabled={aircraftSaving}>
                {aircraftSaving ? 'Adding…' : 'Add aircraft'}
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
              Add pilot to {operator.name}
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

      {/* ── Pilot detail / manage modal ── */}
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
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: selectedPilot.status === 'active' ? 'color-mix(in oklab, var(--accent) 14%, var(--surface-sunk))' : 'var(--surface-sunk)',
                color: selectedPilot.status === 'active' ? 'var(--accent)' : 'var(--ink-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>{pilotInitials(selectedPilot.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{selectedPilot.name}</div>
                <div style={{ marginTop: 4 }}>{pilotStatusBadge(selectedPilot.status)}</div>
              </div>
              <button onClick={() => { setSelectedPilot(null); setEditingPilot(false); setPilotUpdateError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 18, padding: 4 }}>✕</button>
            </div>

            {/* Action bar */}
            {!editingPilot && (
              <div style={{
                padding: '10px 24px', borderBottom: '1px solid var(--rule)',
                background: 'var(--surface-sunk)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', marginRight: 4 }}>Actions:</span>
                {(selectedPilot.status === 'pending_review' || selectedPilot.status === 'grounded' || selectedPilot.status === 'inactive') && (
                  <button className="btn sm accent" onClick={handleApprovePilot} disabled={pilotActionLoading}>
                    {pilotActionLoading ? '…' : selectedPilot.status === 'grounded' || selectedPilot.status === 'inactive' ? 'Reactivate' : 'Approve'}
                  </button>
                )}
                {selectedPilot.status === 'active' && (
                  <button className="btn sm ghost" style={{ color: 'var(--danger)' }}
                    onClick={() => { setShowGroundPilot(true); setGroundPilotReason('') }} disabled={pilotActionLoading}>
                    Ground pilot
                  </button>
                )}
                {selectedPilot.status === 'grounded' && selectedPilot.notes && (
                  <span style={{ fontSize: 11.5, color: 'var(--danger)' }}>· Grounded: {selectedPilot.notes}</span>
                )}
              </div>
            )}

            {pilotUpdateError && (
              <div style={{ margin: '8px 24px 0', padding: '7px 10px', fontSize: 12.5, background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, color: 'var(--danger)' }}>
                {pilotUpdateError}
              </div>
            )}

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {editingPilot ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="field">
                    <label className="field-label">Name *</label>
                    <div className="input"><input value={pilotDraft.name ?? ''} onChange={e => setPilotDraft(d => ({ ...d, name: e.target.value }))} autoFocus /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="field">
                      <label className="field-label">License no.</label>
                      <div className="input"><input value={pilotDraft.license_no ?? ''} onChange={e => setPilotDraft(d => ({ ...d, license_no: e.target.value }))} style={{ fontFamily: 'var(--font-mono)' }} placeholder="IND-ATPL-00123" /></div>
                    </div>
                    <div className="field">
                      <label className="field-label">License type</label>
                      <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                        <select value={pilotDraft.license_type ?? ''} onChange={e => setPilotDraft(d => ({ ...d, license_type: e.target.value }))}
                          style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10, flex: 1 }}>
                          <option value="">—</option>
                          <option value="CPL">CPL</option><option value="ATPL">ATPL</option><option value="PPL">PPL</option>
                          <option value="CPL-H">CPL-H</option><option value="ATPL-H">ATPL-H</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Medical expiry</label>
                    <div className="input"><input type="date" value={pilotDraft.medical_expiry ?? ''} onChange={e => setPilotDraft(d => ({ ...d, medical_expiry: e.target.value }))} /></div>
                  </div>
                  <div className="field">
                    <label className="field-label">Type ratings <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>· comma-separated</span></label>
                    <div className="input"><input value={(pilotDraft.type_ratings ?? []).join(', ')} onChange={e => setPilotDraft(d => ({ ...d, type_ratings: e.target.value ? e.target.value.split(',').map(x => x.trim()).filter(Boolean) : [] }))} placeholder="B407, AS350…" style={{ fontFamily: 'var(--font-mono)' }} /></div>
                  </div>
                  <div className="field">
                    <label className="field-label">Notes</label>
                    <div className="input"><input value={pilotDraft.notes ?? ''} onChange={e => setPilotDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Internal notes…" /></div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    ['License no.',   selectedPilot.license_no, true],
                    ['License type',  selectedPilot.license_type, true],
                    ['Medical expiry', selectedPilot.medical_expiry, true],
                    ['Joined',        selectedPilot.created_at?.slice(0, 10), true],
                  ].map(([label, val, mono]) => (
                    <div key={label as string}>
                      <div className="t-label" style={{ padding: 0, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 13, color: val ? 'var(--ink)' : 'var(--ink-3)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{(val as string) || '—'}</div>
                    </div>
                  ))}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="t-label" style={{ padding: 0, marginBottom: 6 }}>Type ratings</div>
                    {(selectedPilot.type_ratings ?? []).length === 0 ? (
                      <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {(selectedPilot.type_ratings ?? []).map(r => (
                          <span key={r} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 7px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, color: 'var(--ink-2)' }}>{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="t-label" style={{ padding: 0, marginBottom: 4 }}>Notes</div>
                    <div style={{ fontSize: 13, color: selectedPilot.notes ? 'var(--ink-2)' : 'var(--ink-3)' }}>{selectedPilot.notes || '—'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {editingPilot ? (
                <>
                  <button className="btn sm" onClick={() => { setEditingPilot(false); setPilotUpdateError('') }}>Discard</button>
                  <button className="btn sm accent" onClick={handleUpdatePilot} disabled={pilotUpdateSaving}>{pilotUpdateSaving ? 'Saving…' : 'Save changes'}</button>
                </>
              ) : (
                <>
                  <button className="btn sm" onClick={() => setSelectedPilot(null)}>Close</button>
                  <button className="btn sm accent" onClick={() => setEditingPilot(true)}>Edit details</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite user modal */}
      {showInvite && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 460, background: 'var(--surface)',
            border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)', padding: '28px',
          }}>
            <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              Invite team member
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--ink-3)' }}>
              An email with an activation link will be sent to the user.
            </p>

            {inviteError && (
              <div style={{
                marginBottom: 14, padding: '8px 12px', background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
              }}>{inviteError}</div>
            )}

            {inviteDone && (
              <div style={{
                marginBottom: 14, padding: '8px 12px', background: 'var(--accent-soft)',
                border: '1px solid color-mix(in oklab, var(--accent) 28%, var(--rule))',
                borderRadius: 3, fontSize: 12.5, color: 'var(--accent)',
              }}>
                ✓ Invite sent to <strong>{inviteDone}</strong>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label className="field-label">Full name *</label>
                <div className="input">
                  <input
                    value={inviteForm.name}
                    onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Priya Sharma"
                    autoFocus
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Email *</label>
                <div className="input">
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="priya@operator.com"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label className="field-label">Role *</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                    <select
                      value={inviteForm.operator_role}
                      onChange={e => setInviteForm(f => ({ ...f, operator_role: e.target.value }))}
                      style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10, flex: 1 }}
                    >
                      <option value="operator_admin">Operator Admin</option>
                      <option value="ops_manager">Ops Manager</option>
                      <option value="dispatcher">Dispatcher</option>
                      <option value="finance">Finance</option>
                      <option value="crew_coordinator">Crew Coordinator</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Phone <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(optional)</span></label>
                  <div className="input">
                    <input
                      value={inviteForm.phone}
                      onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
              <button className="btn sm" onClick={() => { setShowInvite(false); setInviteError(''); setInviteDone('') }}>
                {inviteDone ? 'Close' : 'Cancel'}
              </button>
              {!inviteDone && (
                <button className="btn sm accent" onClick={handleInviteUser} disabled={inviteSaving}>
                  {inviteSaving ? 'Sending…' : 'Send invite'}
                </button>
              )}
              {inviteDone && (
                <button className="btn sm accent" onClick={() => { setInviteForm({ name: '', email: '', operator_role: 'viewer', phone: '' }); setInviteDone('') }}>
                  Invite another
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ground pilot dialog */}
      {showGroundPilot && selectedPilot && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 400, padding: 16,
        }}>
          <div style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)', padding: '28px' }}>
            <h3 style={{ margin: '0 0 10px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Ground {selectedPilot.name}?</h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-3)' }}>Please provide a reason:</p>
            <div className="input" style={{ marginBottom: 20 }}>
              <input value={groundPilotReason} onChange={e => setGroundPilotReason(e.target.value)} placeholder="Reason for grounding…" autoFocus />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn sm" onClick={() => { setShowGroundPilot(false); setGroundPilotReason('') }}>Cancel</button>
              <button className="btn sm" style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
                onClick={handleGroundPilot} disabled={pilotActionLoading || !groundPilotReason.trim()}>
                {pilotActionLoading ? 'Grounding…' : 'Ground pilot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
