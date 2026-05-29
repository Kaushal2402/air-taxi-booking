import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { catalogService } from '../../services/catalogService'
import type { VehicleClass } from '../../services/catalogService'

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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--accent)' : 'var(--rule-strong)',
        position: 'relative', transition: 'background 0.15s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 18 : 3,
        width: 14, height: 14, borderRadius: 7,
        background: 'var(--surface)', transition: 'left 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

// ── Empty editor state ────────────────────────────────────────────────────────

const EMPTY: Partial<VehicleClass> = {
  code: '', name: '', sort_order: 0, description: '',
  seats: 4, luggage_large: 2,
  ac_required: true, pet_friendly: false, airport_eligible: false,
  vehicle_type: '', min_year_of_make: undefined,
  min_driver_rating: undefined, permit_required: '',
  max_vehicle_age_years: undefined, is_active: true,
}

export default function VehicleClassesPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  // Mobile: show list or editor, not both at once
  const [mobilePanel, setMobilePanel] = useState<'list' | 'editor'>('list')

  const [classes, setClasses] = useState<VehicleClass[]>([])
  const [allClasses, setAllClasses] = useState<VehicleClass[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [selected, setSelected] = useState<VehicleClass | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [draft, setDraft] = useState<Partial<VehicleClass>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [apiError, setApiError] = useState('')
  const [search, setSearch] = useState('')
  const [confirmDeactivate, setConfirmDeactivate] = useState<VehicleClass | null>(null)

  const load = async (inactive: boolean) => {
    setLoading(true)
    try {
      const data = await catalogService.listVehicleClasses(inactive)
      setAllClasses(data)
    } catch { setError('Failed to load vehicle classes') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(showInactive) }, [showInactive])

  useEffect(() => {
    const q = search.toLowerCase()
    setClasses(q
      ? allClasses.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      : allClasses
    )
  }, [allClasses, search])

  const selectClass = (c: VehicleClass) => {
    setSelected(c); setIsNew(false); setDraft({ ...c }); setApiError('')
    if (isMobile) setMobilePanel('editor')
  }

  const startNew = () => {
    setSelected(null); setIsNew(true); setDraft({ ...EMPTY }); setApiError('')
    if (isMobile) setMobilePanel('editor')
  }

  const backToList = () => {
    setMobilePanel('list')
    setSelected(null); setIsNew(false); setApiError('')
  }

  const patch = (k: keyof VehicleClass, v: unknown) => setDraft(d => ({ ...d, [k]: v }))

  const save = async () => {
    if (!draft.code?.trim()) { setApiError('Code is required'); return }
    if (!draft.name?.trim()) { setApiError('Name is required'); return }
    setSaving(true); setApiError('')
    try {
      if (isNew) {
        await catalogService.createVehicleClass(draft)
      } else if (selected) {
        await catalogService.updateVehicleClass(selected.id, draft)
      }
      await load(showInactive)
      setIsNew(false)
      setSelected(null)
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

  const deactivate = async (c: VehicleClass) => {
    try {
      await catalogService.deactivateVehicleClass(c.id)
      await load(showInactive)
      if (selected?.id === c.id) { setSelected(null); setIsNew(false) }
    } catch { setApiError('Failed to deactivate') }
    setConfirmDeactivate(null)
  }

  const activeCount = allClasses.filter(c => c.is_active).length
  const showEditor = isNew || selected !== null

  return (
    <Shell
      activeId="catalog"
      breadcrumb="Catalog & Pricing · Vehicle classes"
      title="Vehicle classes"
      subtitle={`${allClasses.length} classes · ${activeCount} active · drives pricing, dispatch eligibility, customer-facing labels`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/catalog/aircraft-types')}>Aircraft types</button>
          <button className="btn sm accent" onClick={startNew}><Icon name="plus" size={13} />New class</button>
        </div>
      }
    >
      <div style={{
        padding: isMobile ? '12px 16px 24px' : '20px 28px 28px',
        display: isMobile ? 'flex' : 'grid',
        flexDirection: 'column',
        gridTemplateColumns: '300px 1fr',
        gap: isMobile ? 0 : 20,
        minHeight: 0,
      }}>

        {/* ── Left — list ── */}
        {(!isMobile || mobilePanel === 'list') && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', marginBottom: isMobile ? 16 : 0 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="input" style={{ flex: 1, height: 30 }}>
              <Icon name="search" size={13} className="icon" />
              <input placeholder="Filter classes…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer', flexShrink: 0 }}>
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
              Inactive
            </label>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <div style={{ padding: 20, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>}
            {error && <div style={{ padding: 20, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
            {!loading && classes.length === 0 && (
              <div style={{ padding: 20, color: 'var(--ink-3)', fontSize: 13 }}>
                {search ? 'No classes match your filter.' : 'No vehicle classes yet. Add one →'}
              </div>
            )}
            {classes.map(c => {
              const isSelected = selected?.id === c.id
              return (
                <div
                  key={c.id}
                  onClick={() => selectClass(c)}
                  style={{
                    padding: '13px 16px',
                    borderBottom: '1px solid var(--rule-soft)',
                    borderLeft: `3px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                    background: isSelected ? 'var(--surface-2)' : 'transparent',
                    cursor: 'pointer',
                    opacity: c.is_active ? 1 : 0.45,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--ink)' }}>{c.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>
                      {c.seats}-pax
                    </span>
                  </div>
                  <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <CodeChip code={c.code} />
                    {c.airport_eligible && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 5px', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule))', borderRadius: 2 }}>Airport</span>
                    )}
                    {!c.is_active && (
                      <span className="badge"><span className="dot pending" />Off</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="t-meta">{classes.length} shown</span>
            <button className="btn ghost sm" onClick={() => navigate('/catalog/zones')}>
              <Icon name="map" size={12} /> Zones →
            </button>
          </div>
        </div>
        )}

        {/* ── Right — editor ── */}
        {(!isMobile || mobilePanel === 'editor') && showEditor ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', minWidth: 0 }}>
            {/* Mobile back button */}
            {isMobile && (
              <button
                onClick={backToList}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', width: '100%',
                  fontSize: 13, color: 'var(--accent)', background: 'var(--surface-2)',
                  border: 'none', borderBottom: '1px solid var(--rule)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                <Icon name="chevLeft" size={14} stroke={2} />
                Back to classes
              </button>
            )}
            {/* header */}
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div className="t-label">{isNew ? 'New class' : 'Editing'}</div>
                <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, letterSpacing: '-0.018em' }}>
                  {isNew ? 'Untitled class' : draft.name || selected?.name}
                </h2>
                {!isNew && selected && (
                  <div className="t-meta" style={{ marginTop: 4 }}>
                    {selected.code} · last edited {new Date(selected.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {!isNew && selected && (
                  <button className="btn sm" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDeactivate(selected)}>
                    <Icon name="trash" size={13} />Deactivate
                  </button>
                )}
                <button className="btn sm" onClick={discard}>Discard</button>
                <button className="btn accent sm" disabled={saving} onClick={save}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {apiError && (
              <div style={{ margin: '16px 22px 0', padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 13, color: 'var(--danger)' }}>
                {apiError}
              </div>
            )}

            <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 28, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>

              {/* Identity */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Identity</h3>
                  <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
                </div>
                <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                  Stable code drives pricing and dispatch eligibility — do not change once published. Display name is customer-facing.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Stable code {isNew && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                    <div className="input">
                      <input
                        value={draft.code ?? ''}
                        readOnly={!isNew}
                        onChange={e => patch('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                        placeholder="SEDAN_XL"
                        style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Display name <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <div className="input">
                      <input value={draft.name ?? ''} onChange={e => patch('name', e.target.value)} placeholder="Sedan XL" />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Sort order</label>
                    <div className="input">
                      <input type="number" value={draft.sort_order ?? 0} onChange={e => patch('sort_order', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
                <div className="field" style={{ marginTop: 14 }}>
                  <label className="field-label">Short description</label>
                  <div className="input">
                    <input value={draft.description ?? ''} onChange={e => patch('description', e.target.value)} placeholder="Larger sedan · extra legroom · airport-eligible" />
                  </div>
                </div>
              </section>

              {/* Capacity & Features */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Capacity & features</h3>
                  <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
                  <div className="field">
                    <label className="field-label">Seats</label>
                    <div className="input">
                      <input type="number" min={1} value={draft.seats ?? 4} onChange={e => patch('seats', parseInt(e.target.value) || 1)} />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Luggage · large</label>
                    <div className="input">
                      <input type="number" min={0} value={draft.luggage_large ?? 0} onChange={e => patch('luggage_large', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  {([
                    ['ac_required', 'AC required'],
                    ['pet_friendly', 'Pet-friendly'],
                    ['airport_eligible', 'Airport-eligible'],
                    ['is_active', 'Active'],
                  ] as [keyof VehicleClass, string][]).map(([k, label]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
                      <Toggle checked={!!draft[k]} onChange={v => patch(k, v)} />
                      {label}
                    </label>
                  ))}
                </div>
              </section>

              {/* Dispatch eligibility */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Dispatch eligibility</h3>
                  <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Vehicle type</label>
                    <div className="input">
                      <input value={draft.vehicle_type ?? ''} onChange={e => patch('vehicle_type', e.target.value)} placeholder="Sedan body · ≥ 4 doors" />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Min year of make</label>
                    <div className="input">
                      <input type="number" value={draft.min_year_of_make ?? ''} onChange={e => patch('min_year_of_make', e.target.value ? parseInt(e.target.value) : null)} placeholder="2018" />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Min driver rating</label>
                    <div className="input">
                      <input type="number" step="0.1" min="1" max="5" value={draft.min_driver_rating ?? ''} onChange={e => patch('min_driver_rating', e.target.value ? parseFloat(e.target.value) : null)} placeholder="4.4" />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Permit required</label>
                    <div className="input">
                      <input value={draft.permit_required ?? ''} onChange={e => patch('permit_required', e.target.value)} placeholder="Commercial · valid" />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Max vehicle age (years)</label>
                    <div className="input">
                      <input type="number" min={1} value={draft.max_vehicle_age_years ?? ''} onChange={e => patch('max_vehicle_age_years', e.target.value ? parseInt(e.target.value) : null)} placeholder="8" />
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>
        ) : (!isMobile || mobilePanel === 'editor') ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--rule)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)', gap: 12, padding: 40, minHeight: 200,
          }}>
            <Icon name="car" size={32} stroke={1} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: 14, textAlign: 'center' }}>
              Select a class from the list to edit,<br />or add a new one.
            </div>
            <button className="btn accent sm" onClick={startNew}><Icon name="plus" size={13} />New class</button>
          </div>
        ) : null}
      </div>

      {confirmDeactivate && (
        <ConfirmDialog
          open
          title="Deactivate vehicle class"
          description={`"${confirmDeactivate.name}" will be hidden from pricing and dispatch. This cannot be reversed without re-activating it via the API.`}
          confirmLabel="Deactivate"
          variant="danger"
          onConfirm={() => deactivate(confirmDeactivate)}
          onCancel={() => setConfirmDeactivate(null)}
        />
      )}
    </Shell>
  )
}
