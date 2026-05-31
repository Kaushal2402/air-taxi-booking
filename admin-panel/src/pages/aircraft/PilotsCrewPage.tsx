import { useState, useEffect } from 'react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { operatorService } from '../../services/operatorService'
import type { Pilot, Operator, CreatePilotBody, UpdatePilotBody } from '../../services/operatorService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === 'active')        return <span className="badge ok"><span className="dot ok" />Active</span>
  if (status === 'grounded')      return <span className="badge warn"><span className="dot warn" />Grounded</span>
  if (status === 'inactive')      return <span className="badge"><span className="dot" />Inactive</span>
  return <span className="badge info"><span className="dot info" />Pending review</span>
}

function medicalColor(expiryDate: string | null): string {
  if (!expiryDate) return 'var(--ink-2)'
  const today    = new Date()
  const expiry   = new Date(expiryDate)
  const in60     = new Date(); in60.setDate(today.getDate() + 60)
  if (expiry < today)  return 'var(--danger)'
  if (expiry < in60)   return 'var(--warn)'
  return 'var(--ink-2)'
}

function initials(name: string): string {
  return name.replace('Capt. ', '').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()
}

// ── Empty form ────────────────────────────────────────────────────────────────

const EMPTY_CREATE: CreatePilotBody = {
  operator_id: '', name: '',
  license_no: '', license_type: '',
  type_ratings: [], medical_expiry: '', notes: '',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PilotsCrewPage() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [pilots, setPilots]         = useState<Pilot[]>([])
  const [operators, setOperators]   = useState<Operator[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [operatorFilter, setOperatorFilter] = useState('all')

  const [selected, setSelected]     = useState<Pilot | null>(null)
  const [isNew, setIsNew]           = useState(false)
  const [showMobileEditor, setShowMobileEditor] = useState(false)
  const [draft, setDraft]           = useState<UpdatePilotBody>({})
  const [createDraft, setCreateDraft] = useState<CreatePilotBody>({ ...EMPTY_CREATE })
  const [saving, setSaving]         = useState(false)
  const [apiError, setApiError]     = useState('')

  // Ground dialog
  const [groundTarget, setGroundTarget] = useState<Pilot | null>(null)
  const [groundReason, setGroundReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params: { operator_id?: string; status?: string; search?: string; page_size?: number } = { page_size: 100 }
      if (operatorFilter !== 'all') params.operator_id = operatorFilter
      if (statusFilter !== 'all')   params.status = statusFilter
      if (search.trim())            params.search = search.trim()
      const res = await operatorService.listPilots(params)
      setPilots(res.items)
    } catch { /* silently fail */ }
    finally { setLoading(false) }
  }

  const loadOperators = async () => {
    try {
      const res = await operatorService.listOperators({ page_size: 100 })
      setOperators(res.items)
    } catch { /* silently fail */ }
  }

  useEffect(() => { load(); loadOperators() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [statusFilter, operatorFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load() }

  const selectPilot = (p: Pilot) => {
    setSelected(p); setIsNew(false); setApiError('')
    setDraft({
      name: p.name,
      license_no: p.license_no ?? '',
      license_type: p.license_type ?? '',
      type_ratings: p.type_ratings ?? [],
      medical_expiry: p.medical_expiry ?? '',
      notes: p.notes ?? '',
    })
    if (isMobile) setShowMobileEditor(true)
  }

  const startNew = () => {
    setSelected(null); setIsNew(true); setApiError('')
    setCreateDraft({ ...EMPTY_CREATE })
    if (isMobile) setShowMobileEditor(true)
  }

  const save = async () => {
    setSaving(true); setApiError('')
    try {
      if (isNew) {
        if (!createDraft.operator_id) { setApiError('Operator is required'); setSaving(false); return }
        if (!createDraft.name.trim()) { setApiError('Name is required'); setSaving(false); return }
        await operatorService.createPilot(createDraft)
      } else if (selected) {
        await operatorService.updatePilot(selected.id, draft)
      }
      await load()
      setSelected(null); setIsNew(false); setShowMobileEditor(false)
    } catch {
      setApiError('Failed to save pilot')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (p: Pilot) => {
    try {
      await operatorService.approvePilot(p.id)
      await load()
      if (selected?.id === p.id) setSelected(null)
    } catch {
      setApiError('Failed to approve pilot')
    }
  }

  const handleGround = async () => {
    if (!groundTarget || !groundReason.trim()) return
    setActionLoading(true)
    try {
      await operatorService.groundPilot(groundTarget.id, { reason: groundReason })
      setGroundTarget(null); setGroundReason('')
      await load()
      if (selected?.id === groundTarget.id) setSelected(null)
    } catch {
      setApiError('Failed to ground pilot')
    } finally {
      setActionLoading(false)
    }
  }

  const setTypeRatings = (raw: string) => {
    const ratings = raw.split(',').map(r => r.trim()).filter(Boolean)
    if (isNew) setCreateDraft(d => ({ ...d, type_ratings: ratings }))
    else setDraft(d => ({ ...d, type_ratings: ratings }))
  }

  const operatorsMap: Record<string, string> = Object.fromEntries(operators.map(o => [o.id, o.name]))

  const activeCount   = pilots.filter(p => p.status === 'active').length
  const groundedCount = pilots.filter(p => p.status === 'grounded').length
  const showEditor    = isNew || selected !== null

  // ── Editor panel ─────────────────────────────────────────────────────────
  const renderEditor = () => {
    const typeRatingsStr = (isNew ? createDraft.type_ratings : draft.type_ratings ?? [])?.join(', ') ?? ''

    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
        {isMobile && (
          <button
            onClick={() => { setShowMobileEditor(false); setSelected(null); setIsNew(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              width: '100%', fontSize: 13, color: 'var(--accent)',
              background: 'var(--surface-2)', border: 'none', borderBottom: '1px solid var(--rule)',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            <Icon name="chevLeft" size={14} stroke={2} />
            Back to pilots
          </button>
        )}
        <div style={{
          padding: '15px 20px', borderBottom: '1px solid var(--rule)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
        }}>
          <div>
            <div className="t-label">{isNew ? 'New pilot' : 'Editing pilot'}</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, letterSpacing: '-0.016em' }}>
              {isNew ? 'Untitled pilot' : (selected?.name ?? '')}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button className="btn sm" onClick={() => { setSelected(null); setIsNew(false); setShowMobileEditor(false) }}>Discard</button>
            <button className="btn accent sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {apiError && (
          <div style={{
            margin: '12px 20px 0', padding: '9px 12px',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
          }}>{apiError}</div>
        )}

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isNew && (
            <div className="field">
              <label className="field-label">Operator *</label>
              <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                <select
                  value={createDraft.operator_id}
                  onChange={e => setCreateDraft(cd => ({ ...cd, operator_id: e.target.value }))}
                  style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10, flex: 1 }}
                >
                  <option value="">Select operator…</option>
                  {operators.map(op => (
                    <option key={op.id} value={op.id}>{op.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="field">
            <label className="field-label">Name {isNew && '*'}</label>
            <div className="input">
              <input
                value={isNew ? createDraft.name : (draft.name ?? '')}
                onChange={e => isNew ? setCreateDraft(cd => ({ ...cd, name: e.target.value })) : setDraft(dd => ({ ...dd, name: e.target.value }))}
                placeholder="Capt. Renu Bhandari"
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label className="field-label">License no.</label>
              <div className="input">
                <input
                  value={isNew ? (createDraft.license_no ?? '') : (draft.license_no ?? '')}
                  onChange={e => isNew ? setCreateDraft(cd => ({ ...cd, license_no: e.target.value })) : setDraft(dd => ({ ...dd, license_no: e.target.value }))}
                  placeholder="IND-CPL-12345"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">License type</label>
              <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                <select
                  value={isNew ? (createDraft.license_type ?? '') : (draft.license_type ?? '')}
                  onChange={e => isNew ? setCreateDraft(cd => ({ ...cd, license_type: e.target.value })) : setDraft(dd => ({ ...dd, license_type: e.target.value }))}
                  style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10, flex: 1 }}
                >
                  <option value="">—</option>
                  <option value="CPL">CPL</option>
                  <option value="ATPL">ATPL</option>
                  <option value="PPL">PPL</option>
                  <option value="CPL-H">CPL-H</option>
                  <option value="ATPL-H">ATPL-H</option>
                  <option value="CPL-A">CPL-A</option>
                  <option value="ATPL-A">ATPL-A</option>
                </select>
              </div>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Type ratings (comma-separated)</label>
            <div className="input">
              <input
                value={typeRatingsStr}
                onChange={e => setTypeRatings(e.target.value)}
                placeholder="Bell 407, Airbus H125…"
              />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Medical expiry</label>
            <div className="input">
              <input
                type="date"
                value={isNew ? (createDraft.medical_expiry ?? '') : (draft.medical_expiry ?? '')}
                onChange={e => isNew ? setCreateDraft(cd => ({ ...cd, medical_expiry: e.target.value })) : setDraft(dd => ({ ...dd, medical_expiry: e.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Notes</label>
            <div className="input">
              <input
                value={isNew ? (createDraft.notes ?? '') : (draft.notes ?? '')}
                onChange={e => isNew ? setCreateDraft(cd => ({ ...cd, notes: e.target.value })) : setDraft(dd => ({ ...dd, notes: e.target.value }))}
                placeholder="Internal notes…"
              />
            </div>
          </div>

          {/* Actions on existing pilots */}
          {!isNew && selected && (
            <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {(selected.status === 'pending_review' || selected.status === 'grounded' || selected.status === 'inactive') && (
                <button className="btn sm accent" onClick={() => handleApprove(selected)}>
                  {selected.status === 'grounded' || selected.status === 'inactive' ? 'Reactivate' : 'Approve'}
                </button>
              )}
              {selected.status === 'active' && (
                <button
                  className="btn sm ghost"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => { setGroundTarget(selected); setGroundReason('') }}
                >
                  Ground pilot
                </button>
              )}
              {selected.status === 'grounded' && selected.notes && (
                <span style={{ fontSize: 12, color: 'var(--danger)', fontStyle: 'italic' }}>
                  Grounded: {selected.notes}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Shell
      activeId="aircraft"
      breadcrumb="Operations · Aircraft & Crew · Pilots"
      title="Pilots & crew"
      subtitle={`${pilots.length} crew · ${activeCount} active · ${groundedCount} grounded`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm accent" onClick={startNew}>
            <Icon name="plus" size={13} />Onboard pilot
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* KPI strip */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        }}>
          {[
            { l: 'Total crew',   v: String(pilots.length),   tone: 'var(--ink)' },
            { l: 'Active',       v: String(activeCount),      tone: 'var(--accent)' },
            { l: 'Grounded',     v: String(groundedCount),    tone: 'var(--danger)' },
            {
              l: 'Medicals expiring · 30d',
              v: String(pilots.filter(p => {
                if (!p.medical_expiry) return false
                const d = new Date(p.medical_expiry)
                const in30 = new Date(); in30.setDate(in30.getDate() + 30)
                return d > new Date() && d < in30
              }).length),
              tone: 'var(--warn)',
            },
          ].map((s, i) => (
            <div key={s.l} style={{
              padding: isMobile ? '12px 14px' : '16px 20px',
              borderRight: isMobile
                ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                : (i < 3 ? '1px solid var(--rule)' : 'none'),
              borderBottom: isMobile && i < 2 ? '1px solid var(--rule)' : 'none',
            }}>
              <div className="t-label">{s.l}</div>
              <div style={{
                marginTop: 6, fontFamily: 'var(--font-serif)',
                fontSize: isMobile ? 22 : 26, fontWeight: 400, letterSpacing: '-0.02em', color: s.tone,
              }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <form
          onSubmit={handleSearch}
          style={{
            background: 'var(--surface)', border: '1px solid var(--rule)',
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}
        >
          <div className="input" style={{ width: 240, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input
              placeholder="Name, license, type rating…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10 }}>
            <select
              value={operatorFilter}
              onChange={e => setOperatorFilter(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10 }}
            >
              <option value="all">All operators</option>
              {operators.map(op => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          </div>
          <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10 }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10 }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="grounded">Grounded</option>
              <option value="pending_review">Pending review</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button type="submit" className="btn sm">Search</button>
        </form>

        {/* Mobile: single panel flow */}
        {isMobile && showMobileEditor ? (
          renderEditor()
        ) : isMobile ? (
          loading ? (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : pilots.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>No pilots found.</div>
          ) : (
            <div>
              {pilots.map(p => (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--rule)',
                    borderRadius: 4, padding: '14px', marginBottom: 10, cursor: 'pointer',
                  }}
                  onClick={() => selectPilot(p)}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--accent-soft)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 600,
                    }}>{initials(p.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{p.name}</div>
                      <div className="t-meta" style={{ marginTop: 2 }}>{p.license_type || '—'} · {p.license_no || '—'}</div>
                    </div>
                    {statusBadge(p.status)}
                  </div>
                  {p.medical_expiry && (
                    <div style={{ marginTop: 8, fontSize: 12, color: medicalColor(p.medical_expiry) }}>
                      Medical: {p.medical_expiry}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          /* Desktop/tablet: table + side panel */
          <div style={{
            display: 'grid',
            gridTemplateColumns: (!isTablet && showEditor) ? '1fr 360px' : '1fr',
            gap: 18, alignItems: 'start',
          }}>
            {/* Table */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', minWidth: 0 }}>
              {loading ? (
                <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ minWidth: 700 }}>
                    <thead>
                      <tr>
                        <th>Pilot</th>
                        <th>Operator</th>
                        <th>License</th>
                        <th>Type ratings</th>
                        <th>Medical expiry</th>
                        <th>Status</th>
                        <th style={{ width: 40 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {pilots.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                            No pilots found.
                          </td>
                        </tr>
                      ) : pilots.map(p => (
                        <tr
                          key={p.id}
                          className={selected?.id === p.id ? 'selected' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => selectPilot(p)}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                background: selected?.id === p.id ? 'var(--accent-soft)' : 'var(--surface-sunk)',
                                color: selected?.id === p.id ? 'var(--accent)' : 'var(--ink-3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 600,
                              }}>{initials(p.name)}</div>
                              <div>
                                <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{p.name}</div>
                                <div className="t-meta" style={{ marginTop: 2 }}>{p.id}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>{operatorsMap[p.operator_id] || p.operator_id}</td>
                          <td>
                            {p.license_type && (
                              <span style={{
                                fontFamily: 'var(--font-mono)', fontSize: 11,
                                padding: '2px 6px',
                                background: p.license_type.startsWith('ATPL') ? 'var(--accent-soft)' : 'var(--surface-2)',
                                color: p.license_type.startsWith('ATPL') ? 'var(--accent)' : 'var(--ink-2)',
                                border: `1px solid ${p.license_type.startsWith('ATPL') ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' : 'var(--rule)'}`,
                                borderRadius: 2, letterSpacing: '0.10em',
                              }}>{p.license_type}</span>
                            )}
                            {!p.license_type && <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>—</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {(p.type_ratings ?? []).slice(0, 3).map(r => (
                                <span key={r} style={{
                                  fontFamily: 'var(--font-mono)', fontSize: 10.5,
                                  padding: '2px 6px', background: 'var(--surface-2)',
                                  border: '1px solid var(--rule)', borderRadius: 2, color: 'var(--ink-2)',
                                }}>{r}</span>
                              ))}
                              {(p.type_ratings ?? []).length > 3 && (
                                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                                  +{(p.type_ratings ?? []).length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 12,
                              color: medicalColor(p.medical_expiry),
                            }}>{p.medical_expiry || '—'}</span>
                          </td>
                          <td>{statusBadge(p.status)}</td>
                          <td>
                            <button
                              className="btn ghost icon sm"
                              onClick={e => { e.stopPropagation(); selectPilot(p) }}
                            >
                              <Icon name="chevRight" size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Side editor */}
            {showEditor && !isTablet && renderEditor()}

            {/* Tablet: editor below */}
            {showEditor && isTablet && (
              <div style={{ gridColumn: '1 / -1' }}>
                {renderEditor()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ground pilot dialog */}
      {groundTarget && (
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
              Ground {groundTarget.name}?
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-3)' }}>
              This pilot will be taken off the roster. Please provide a reason:
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
              <button className="btn sm" onClick={() => { setGroundTarget(null); setGroundReason('') }}>Cancel</button>
              <button
                className="btn sm"
                style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
                onClick={handleGround}
                disabled={actionLoading}
              >
                {actionLoading ? 'Grounding…' : 'Ground pilot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
