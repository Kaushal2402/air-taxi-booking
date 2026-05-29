import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { catalogService } from '../../services/catalogService'
import type { AircraftType } from '../../services/catalogService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function CodeChip({ code }: { code: string }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.08em',
      padding: '2px 7px', background: 'var(--surface-2)',
      border: '1px solid var(--rule)', borderRadius: 2, color: 'var(--ink-2)',
    }}>{code}</span>
  )
}

function CatBadge({ cat }: { cat: 'heli' | 'jet' }) {
  const isJet = cat === 'jet'
  return (
    <div style={{
      width: 36, height: 28, borderRadius: 2, flexShrink: 0,
      background: isJet ? 'var(--ink)' : 'var(--accent)',
      color: 'var(--surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={isJet ? 'plane' : 'helipad'} size={14} stroke={1.4} />
    </div>
  )
}

// ── Empty form state ──────────────────────────────────────────────────────────

const EMPTY: Partial<AircraftType> = {
  code: '', name: '', category: 'heli', seats: 4,
  mtow_kg: undefined, range_nm: undefined, cruise_kts: undefined,
  description: '', is_active: true,
}

// ── KPI helpers ───────────────────────────────────────────────────────────────

function kpiAvgRange(types: AircraftType[], category: 'heli' | 'jet'): string {
  const filtered = types.filter(t => t.category === category && t.range_nm && t.is_active)
  if (!filtered.length) return '—'
  const avg = filtered.reduce((s, t) => s + (t.range_nm ?? 0), 0) / filtered.length
  return `${Math.round(avg).toLocaleString()} nm`
}

export default function AircraftTypesPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()   // < 1024px — editor stacks below table
  const [types, setTypes]         = useState<AircraftType[]>([])
  const [allTypes, setAllTypes]   = useState<AircraftType[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [selected, setSelected]   = useState<AircraftType | null>(null)
  const [isNew, setIsNew]         = useState(false)
  const [draft, setDraft]         = useState<Partial<AircraftType>>(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [loading, setLoading]     = useState(true)
  const [apiError, setApiError]   = useState('')
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState<'all' | 'heli' | 'jet'>('all')
  const [confirmDeactivate, setConfirmDeactivate] = useState<AircraftType | null>(null)

  const load = async (inactive: boolean) => {
    setLoading(true)
    try {
      const data = await catalogService.listAircraftTypes(inactive)
      setAllTypes(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }
  useEffect(() => { load(showInactive) }, [showInactive])

  useEffect(() => {
    const q = search.toLowerCase()
    setTypes(
      allTypes.filter(t =>
        (catFilter === 'all' || t.category === catFilter) &&
        (!q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
      )
    )
  }, [allTypes, search, catFilter])

  const [showMobileEditor, setShowMobileEditor] = useState(false)

  const selectType = (t: AircraftType) => {
    setSelected(t); setIsNew(false); setDraft({ ...t }); setApiError('')
    if (isMobile) setShowMobileEditor(true)
  }

  const startNew = () => {
    setSelected(null); setIsNew(true); setDraft({ ...EMPTY }); setApiError('')
    if (isMobile) setShowMobileEditor(true)
  }

  const patch = (k: keyof AircraftType, v: unknown) => setDraft(d => ({ ...d, [k]: v }))

  const save = async () => {
    if (!draft.code?.trim()) { setApiError('Code is required'); return }
    if (!draft.name?.trim()) { setApiError('Name is required'); return }
    setSaving(true); setApiError('')
    try {
      if (isNew) await catalogService.createAircraftType(draft)
      else if (selected) await catalogService.updateAircraftType(selected.id, draft)
      await load(showInactive)
      setIsNew(false); setSelected(null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setApiError(err?.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const discard = () => {
    if (selected) setDraft({ ...selected })
    else { setIsNew(false); setSelected(null) }
    setApiError('')
  }

  const deactivate = async (t: AircraftType) => {
    try {
      await catalogService.deactivateAircraftType(t.id)
      await load(showInactive)
      if (selected?.id === t.id) { setSelected(null); setIsNew(false) }
    } catch { setApiError('Failed to deactivate') }
    setConfirmDeactivate(null)
  }

  const activeCount = allTypes.filter(t => t.is_active).length
  const heliCount   = allTypes.filter(t => t.category === 'heli' && t.is_active).length
  const jetCount    = allTypes.filter(t => t.category === 'jet' && t.is_active).length
  const showEditor  = isNew || selected !== null

  const KPIS = [
    { label: 'Active types',    value: String(activeCount), meta: `${heliCount} heli · ${jetCount} jet` },
    { label: 'Total types',     value: String(allTypes.length), meta: 'Including inactive' },
    { label: 'Heli range · avg', value: kpiAvgRange(allTypes, 'heli'), meta: 'Active helicopters' },
    { label: 'Jet range · avg',  value: kpiAvgRange(allTypes, 'jet'),  meta: 'Active jets' },
  ]

  return (
    <Shell
      activeId="catalog"
      breadcrumb="Catalog & Pricing · Aircraft types"
      title="Aircraft types"
      subtitle={`${allTypes.length} types · ${heliCount} helicopters · ${jetCount} jets`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/catalog/vehicle-classes')}>Vehicle classes</button>
          <button className="btn sm" onClick={() => navigate('/catalog/air-routes')}>Air routes</button>
          <button className="btn sm accent" onClick={startNew}><Icon name="plus" size={13} />New type</button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 18 }}>

        {/* KPI strip — 4-col desktop, 2×2 on mobile/tablet */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        }}>
          {KPIS.map((k, i) => (
            <div key={k.label} style={{
              padding: isMobile ? '12px 14px' : '16px 20px',
              borderRight: isMobile
                ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                : (i < 3 ? '1px solid var(--rule)' : 'none'),
              borderBottom: isMobile && i < 2 ? '1px solid var(--rule)' : 'none',
            }}>
              <div className="t-label">{k.label}</div>
              <div style={{
                marginTop: 6, fontFamily: 'var(--font-serif)',
                fontSize: isMobile ? 22 : 28, fontWeight: 400, letterSpacing: '-0.02em',
              }}>{k.value}</div>
              <div className="t-meta" style={{ marginTop: 4 }}>{k.meta}</div>
            </div>
          ))}
        </div>

        {/* Main content — side-by-side on wide desktop, stacked on tablet/mobile */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: (!isTablet && showEditor) ? '1fr 360px' : '1fr',
          gap: 18,
          alignItems: 'start',
        }}>

          {/* Table card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', minWidth: 0 }}>
            {/* Table toolbar */}
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div className="input" style={{ flex: 1, height: 30 }}>
                <Icon name="search" size={13} className="icon" />
                <input
                  placeholder="Search aircraft types…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {(['all', 'heli', 'jet'] as const).map(f => (
                <button
                  key={f}
                  className={`btn sm ${catFilter === f ? 'accent' : 'ghost'}`}
                  onClick={() => setCatFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'heli' ? 'Helicopters' : 'Jets'}
                </button>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={e => setShowInactive(e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                Inactive
              </label>
            </div>

            {loading && <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>}

            {!loading && (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="tbl" style={{ minWidth: isMobile ? 600 : undefined }}>
                  <thead>
                    <tr>
                      <th>Aircraft type</th>
                      <th>Code</th>
                      <th>Category</th>
                      <th>Seats</th>
                      <th>MTOW · kg</th>
                      <th>Range · nm</th>
                      <th>Cruise · kts</th>
                      <th>Status</th>
                      <th style={{ width: 36 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {types.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                          {search || catFilter !== 'all' ? 'No types match your filter.' : 'No aircraft types yet. Add one →'}
                        </td>
                      </tr>
                    ) : types.map(t => {
                      const isSel = selected?.id === t.id
                      return (
                        <tr
                          key={t.id}
                          className={isSel ? 'selected' : ''}
                          style={{ opacity: t.is_active ? 1 : 0.45, cursor: 'pointer' }}
                          onClick={() => selectType(t)}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <CatBadge cat={t.category} />
                              <div>
                                <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{t.name}</div>
                                {t.description && (
                                  <div className="t-meta" style={{ marginTop: 2 }}>
                                    {t.description.length > 40
                                      ? t.description.slice(0, 40) + '…'
                                      : t.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td><CodeChip code={t.code} /></td>
                          <td>
                            <span className={`badge ${t.category === 'jet' ? '' : 'info'}`}>
                              {t.category === 'heli' ? 'Helicopter' : 'Jet'}
                            </span>
                          </td>
                          <td className="num">{t.seats}</td>
                          <td className="num">{t.mtow_kg ? t.mtow_kg.toLocaleString() : '—'}</td>
                          <td className="num">{t.range_nm ? t.range_nm.toLocaleString() : '—'}</td>
                          <td className="num">{t.cruise_kts ?? '—'}</td>
                          <td>
                            {t.is_active
                              ? <span className="badge ok"><span className="dot ok" />Active</span>
                              : <span className="badge"><span className="dot pending" />Off</span>
                            }
                          </td>
                          <td>
                            <button
                              className="btn ghost icon sm"
                              onClick={e => { e.stopPropagation(); setConfirmDeactivate(t) }}
                              title="Deactivate"
                            >
                              <Icon name="trash" size={13} style={{ color: 'var(--danger)' }} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Editor panel — on tablet/mobile renders below table */}
          {showEditor && (!isMobile || showMobileEditor) && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              {/* Mobile back button */}
              {isMobile && (
                <button
                  onClick={() => { setShowMobileEditor(false); setSelected(null); setIsNew(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                    width: '100%', fontSize: 13, color: 'var(--accent)',
                    background: 'var(--surface-2)', border: 'none',
                    borderBottom: '1px solid var(--rule)', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <Icon name="chevLeft" size={14} stroke={2} />
                  Back to types
                </button>
              )}
              {/* Header */}
              <div style={{
                padding: '15px 20px', borderBottom: '1px solid var(--rule)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
              }}>
                <div>
                  <div className="t-label">{isNew ? 'New aircraft type' : 'Editing'}</div>
                  <h3 style={{
                    margin: '4px 0 0', fontFamily: 'var(--font-serif)',
                    fontSize: 20, fontWeight: 400, letterSpacing: '-0.016em',
                  }}>
                    {isNew ? 'Untitled type' : draft.name || selected?.name}
                  </h3>
                  {!isNew && selected && (
                    <div className="t-meta" style={{ marginTop: 3 }}>
                      {selected.code} · {new Date(selected.updated_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn sm" onClick={discard}>Discard</button>
                  <button className="btn accent sm" onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {apiError && (
                <div style={{
                  margin: '14px 20px 0',
                  padding: '9px 12px',
                  background: 'var(--danger-soft)',
                  border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                  borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
                }}>
                  {apiError}
                </div>
              )}

              {/* Form */}
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 400 }}>Identity</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label className="field-label">
                      Code{isNew && <span style={{ color: 'var(--danger)' }}> *</span>}
                    </label>
                    <div className="input">
                      <input
                        value={draft.code ?? ''}
                        readOnly={!isNew}
                        onChange={e => patch('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                        placeholder="BELL_407"
                        style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Category</label>
                    <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                      <select
                        value={draft.category ?? 'heli'}
                        onChange={e => patch('category', e.target.value)}
                        style={{
                          flex: 1, border: 'none', outline: 'none',
                          background: 'transparent', cursor: 'pointer', height: '100%',
                        }}
                      >
                        <option value="heli">Helicopter</option>
                        <option value="jet">Jet</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Name<span style={{ color: 'var(--danger)' }}> *</span></label>
                  <div className="input">
                    <input
                      value={draft.name ?? ''}
                      onChange={e => patch('name', e.target.value)}
                      placeholder="Bell 407"
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Description</label>
                  <div className="input">
                    <input
                      value={draft.description ?? ''}
                      onChange={e => patch('description', e.target.value)}
                      placeholder="Single-turbine utility helicopter…"
                    />
                  </div>
                </div>

                {/* Specifications */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 400 }}>Specifications</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 12 }}>
                  <div className="field">
                    <label className="field-label">Seats</label>
                    <div className="input">
                      <input
                        type="number" min={1}
                        value={draft.seats ?? 4}
                        onChange={e => patch('seats', parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">MTOW · kg</label>
                    <div className="input">
                      <input
                        type="number" min={0}
                        value={draft.mtow_kg ?? ''}
                        onChange={e => patch('mtow_kg', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="2722"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Range · nm</label>
                    <div className="input">
                      <input
                        type="number" min={0}
                        value={draft.range_nm ?? ''}
                        onChange={e => patch('range_nm', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="324"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Cruise · kts</label>
                    <div className="input">
                      <input
                        type="number" min={0}
                        value={draft.cruise_kts ?? ''}
                        onChange={e => patch('cruise_kts', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="133"
                      />
                    </div>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={draft.is_active ?? true}
                    onChange={e => patch('is_active', e.target.checked)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  Type active
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmDeactivate && (
        <ConfirmDialog
          open
          title="Deactivate aircraft type"
          description={`"${confirmDeactivate.name}" will be hidden from flight scheduling and operator assignment.`}
          confirmLabel="Deactivate"
          variant="danger"
          onConfirm={() => deactivate(confirmDeactivate)}
          onCancel={() => setConfirmDeactivate(null)}
        />
      )}
    </Shell>
  )
}
