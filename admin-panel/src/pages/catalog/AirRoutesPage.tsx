import { useState, useEffect } from 'react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { catalogService } from '../../services/catalogService'
import type { AirRoute, AircraftType } from '../../services/catalogService'

// ── Flight path arc SVG ───────────────────────────────────────────────────────

function FlightPathChart({
  originCode, originLabel,
  destCode, destLabel,
}: {
  originCode: string; originLabel: string
  destCode: string; destLabel: string
}) {
  return (
    <svg viewBox="0 0 560 140" style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* grid dots */}
      <pattern id="rg" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.9" fill="var(--rule-strong)" />
      </pattern>
      <rect width="560" height="140" fill="url(#rg)" />

      {/* arc */}
      <path
        d="M 72,110 C 72,28 488,28 488,110"
        stroke="var(--accent)" strokeWidth="1.8"
        fill="none" strokeDasharray="6 4"
      />

      {/* origin dot */}
      <circle cx="72" cy="110" r="5" fill="var(--accent)" />
      <circle cx="72" cy="110" r="10" fill="var(--accent)" fillOpacity="0.15" />

      {/* dest dot */}
      <circle cx="488" cy="110" r="5" fill="var(--accent)" />
      <circle cx="488" cy="110" r="10" fill="var(--accent)" fillOpacity="0.15" />

      {/* centre aircraft icon (decorative) */}
      <g transform="translate(280,36)" opacity="0.4">
        <circle cx="0" cy="0" r="12" fill="var(--surface-2)" stroke="var(--rule-strong)" strokeWidth="1" />
        <text
          x="0" y="4"
          textAnchor="middle"
          style={{ font: '11px IBM Plex Mono, monospace', fill: 'var(--accent)' }}
        >✈</text>
      </g>

      {/* origin labels */}
      <text x="72" y="128" textAnchor="middle" style={{ font: '600 11px IBM Plex Mono, monospace', fill: 'var(--ink)', letterSpacing: '0.06em' }}>
        {originCode}
      </text>
      <text x="72" y="16" textAnchor="middle" style={{ font: '10px IBM Plex Sans, sans-serif', fill: 'var(--ink-3)' }}>
        {originLabel.length > 18 ? originLabel.slice(0, 18) + '…' : originLabel}
      </text>

      {/* destination labels */}
      <text x="488" y="128" textAnchor="middle" style={{ font: '600 11px IBM Plex Mono, monospace', fill: 'var(--ink)', letterSpacing: '0.06em' }}>
        {destCode}
      </text>
      <text x="488" y="16" textAnchor="middle" style={{ font: '10px IBM Plex Sans, sans-serif', fill: 'var(--ink-3)' }}>
        {destLabel.length > 18 ? destLabel.slice(0, 18) + '…' : destLabel}
      </text>
    </svg>
  )
}

// ── Category badge ────────────────────────────────────────────────────────────

const CAT_BADGE: Record<AirRoute['category'], string> = {
  shuttle:   'ok',
  on_demand: '',
  charter:   '',
  vip:       'info',
}

function CatBadge({ cat }: { cat: AirRoute['category'] }) {
  const labels: Record<AirRoute['category'], string> = {
    shuttle: 'Shuttle', on_demand: 'On-demand', charter: 'Charter', vip: 'VIP',
  }
  const cls = CAT_BADGE[cat]
  return (
    <span className={`badge ${cls}`}>
      {cat === 'shuttle' && <span className="dot ok" />}
      {labels[cat]}
    </span>
  )
}

// ── Empty form ────────────────────────────────────────────────────────────────

const EMPTY: Partial<AirRoute> = {
  code: '', origin_name: '', origin_code: '', destination_name: '', destination_code: '',
  category: 'on_demand', distance_nm: undefined, block_time_minutes: undefined,
  eligible_type_codes: [], authorized_operators: [], is_active: true,
}

// ── Helper: unique operators from all routes ──────────────────────────────────

function collectOperators(routes: AirRoute[]): string[] {
  const set = new Set<string>()
  routes.forEach(r => (r.authorized_operators ?? []).forEach(o => set.add(o)))
  return Array.from(set).sort()
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AirRoutesPage() {
  const [routes, setRoutes]         = useState<AirRoute[]>([])
  const [allRoutes, setAllRoutes]   = useState<AirRoute[]>([])
  const [aircraftTypes, setAircraftTypes] = useState<AircraftType[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [selected, setSelected]     = useState<AirRoute | null>(null)
  const [isNew, setIsNew]           = useState(false)
  const [draft, setDraft]           = useState<Partial<AirRoute>>({ ...EMPTY })
  const [saving, setSaving]         = useState(false)
  const [loading, setLoading]       = useState(true)
  const [apiError, setApiError]     = useState('')
  const [search, setSearch]         = useState('')
  const [catFilter, setCatFilter]   = useState<AirRoute['category'] | 'all'>('all')
  const [newOperator, setNewOperator] = useState('')
  const [confirmDeactivate, setConfirmDeactivate] = useState<AirRoute | null>(null)

  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const [showMobileEditor, setShowMobileEditor] = useState(false)

  const load = async (inactive: boolean) => {
    setLoading(true)
    try {
      const [r, at] = await Promise.all([
        catalogService.listAirRoutes(inactive),
        catalogService.listAircraftTypes(false),
      ])
      setAllRoutes(r)
      setAircraftTypes(at)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }
  useEffect(() => { load(showInactive) }, [showInactive])

  useEffect(() => {
    const q = search.toLowerCase()
    setRoutes(
      allRoutes.filter(r =>
        (catFilter === 'all' || r.category === catFilter) &&
        (!q ||
          r.code.toLowerCase().includes(q) ||
          r.origin_name.toLowerCase().includes(q) ||
          r.destination_name.toLowerCase().includes(q)
        )
      )
    )
  }, [allRoutes, search, catFilter])

  const selectRoute = (r: AirRoute) => {
    setSelected(r); setIsNew(false); setDraft({ ...r }); setApiError(''); setNewOperator('')
    if (isMobile) setShowMobileEditor(true)
  }

  const startNew = () => {
    setSelected(null); setIsNew(true); setDraft({ ...EMPTY }); setApiError(''); setNewOperator('')
    if (isMobile) setShowMobileEditor(true)
  }

  const patch = (k: keyof AirRoute, v: unknown) => setDraft(d => ({ ...d, [k]: v }))

  const toggleTypeCode = (code: string) => {
    const cur = draft.eligible_type_codes ?? []
    patch('eligible_type_codes', cur.includes(code) ? cur.filter(c => c !== code) : [...cur, code])
  }

  const toggleOperator = (op: string) => {
    const cur = draft.authorized_operators ?? []
    patch('authorized_operators', cur.includes(op) ? cur.filter(o => o !== op) : [...cur, op])
  }

  const addOperator = () => {
    const op = newOperator.trim()
    if (!op) return
    const cur = draft.authorized_operators ?? []
    if (!cur.includes(op)) patch('authorized_operators', [...cur, op])
    setNewOperator('')
  }

  const save = async () => {
    if (!draft.code?.trim())        { setApiError('Code is required'); return }
    if (!draft.origin_code?.trim()) { setApiError('Origin ICAO is required'); return }
    if (!draft.destination_code?.trim()) { setApiError('Destination ICAO is required'); return }
    setSaving(true); setApiError('')
    try {
      if (isNew) await catalogService.createAirRoute(draft)
      else if (selected) await catalogService.updateAirRoute(selected.id, draft)
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

  const deactivate = async (r: AirRoute) => {
    try {
      await catalogService.deactivateAirRoute(r.id)
      await load(showInactive)
      if (selected?.id === r.id) { setSelected(null); setIsNew(false) }
    } catch { setApiError('Failed to deactivate') }
    setConfirmDeactivate(null)
  }

  const activeCount  = allRoutes.filter(r => r.is_active).length
  const knownOps     = collectOperators(allRoutes)
  const showEditor   = isNew || selected !== null

  const CAT_OPTIONS: Array<AirRoute['category'] | 'all'> = ['all', 'shuttle', 'on_demand', 'charter', 'vip']
  const CAT_LABELS: Record<AirRoute['category'] | 'all', string> = {
    all: 'All', shuttle: 'Shuttle', on_demand: 'On-demand', charter: 'Charter', vip: 'VIP',
  }

  return (
    <Shell
      activeId="catalog"
      breadcrumb="Catalog & Pricing · Air routes"
      title="Air routes"
      subtitle={`${allRoutes.length} routes · ${activeCount} active`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm accent" onClick={startNew}><Icon name="plus" size={13} />New route</button>
        </div>
      }
    >
      <div style={{
        padding: isMobile ? '12px 16px 24px' : '20px 28px 28px',
        display: 'grid',
        gridTemplateColumns: (!isTablet && showEditor) ? '1.3fr 1fr' : '1fr',
        gap: 20,
        alignItems: 'start',
      }}>

        {/* ── Left: routes table ─── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          {/* Toolbar */}
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--rule)',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <div className="input" style={{ flex: 1, minWidth: 180, height: 30 }}>
              <Icon name="search" size={13} className="icon" />
              <input
                placeholder="Code, origin, destination…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {CAT_OPTIONS.map(f => (
                <button
                  key={f}
                  className={`btn sm ${catFilter === f ? 'accent' : 'ghost'}`}
                  onClick={() => setCatFilter(f)}
                >
                  {CAT_LABELS[f]}
                </button>
              ))}
            </div>
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
              <table className="tbl" style={{ minWidth: isMobile ? 520 : undefined }}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Origin → Destination</th>
                    <th>Category</th>
                    <th>Distance</th>
                    <th>Block time</th>
                    <th>Status</th>
                    <th style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {routes.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                        {search || catFilter !== 'all'
                          ? 'No routes match your filter.'
                          : 'No air routes yet. Add one →'}
                      </td>
                    </tr>
                  ) : routes.map(r => {
                    const isSel = selected?.id === r.id
                    return (
                      <tr
                        key={r.id}
                        className={isSel ? 'selected' : ''}
                        style={{ opacity: r.is_active ? 1 : 0.45, cursor: 'pointer' }}
                        onClick={() => selectRoute(r)}
                      >
                        <td>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 12,
                            color: 'var(--ink)', letterSpacing: '0.06em',
                          }}>
                            {r.code}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                            <span style={{ color: 'var(--ink)' }}>{r.origin_code}</span>
                            <Icon name="arrowRight" size={11} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                            <span style={{ color: 'var(--ink-2)' }}>{r.destination_code}</span>
                          </div>
                          <div className="t-meta" style={{ marginTop: 2 }}>
                            {r.origin_name} → {r.destination_name}
                          </div>
                        </td>
                        <td><CatBadge cat={r.category} /></td>
                        <td className="num">{r.distance_nm ? `${r.distance_nm} nm` : '—'}</td>
                        <td className="num">
                          {r.block_time_minutes
                            ? r.block_time_minutes >= 60
                              ? `${Math.floor(r.block_time_minutes / 60)}h ${r.block_time_minutes % 60}m`
                              : `${r.block_time_minutes}m`
                            : '—'}
                        </td>
                        <td>
                          {r.is_active
                            ? <span className="badge ok"><span className="dot ok" />Active</span>
                            : <span className="badge"><span className="dot pending" />Draft</span>
                          }
                        </td>
                        <td>
                          <button
                            className="btn ghost icon sm"
                            onClick={e => { e.stopPropagation(); setConfirmDeactivate(r) }}
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

        {/* ── Right: editor / detail ─── */}
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
                Back to routes
              </button>
            )}
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">{isNew ? 'New route' : 'Editing'}</div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 400, letterSpacing: '-0.015em' }}>
                  {isNew
                    ? 'New air route'
                    : `${draft.origin_code || '—'} → ${draft.destination_code || '—'}`}
                </h3>
                {!isNew && selected && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>
                    {selected.code}
                  </span>
                )}
              </div>
            </div>

            {/* Flight path chart */}
            <div style={{ height: 140, borderBottom: '1px solid var(--rule)', background: 'var(--surface-sunk)' }}>
              <FlightPathChart
                originCode={draft.origin_code || '???'}
                originLabel={draft.origin_name || 'Origin'}
                destCode={draft.destination_code || '???'}
                destLabel={draft.destination_name || 'Destination'}
              />
            </div>

            {apiError && (
              <div style={{
                margin: '14px 18px 0',
                padding: '9px 12px',
                background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
              }}>
                {apiError}
              </div>
            )}

            {/* Form */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>

              {/* Route identity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 400 }}>Identity</span>
                <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
              </div>

              <div className="field">
                <label className="field-label">
                  Route code{isNew && <span style={{ color: 'var(--danger)' }}> *</span>}
                </label>
                <div className="input">
                  <input
                    value={draft.code ?? ''}
                    readOnly={!isNew}
                    onChange={e => patch('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder="BLR-MYS"
                    style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label className="field-label">Origin ICAO<span style={{ color: 'var(--danger)' }}> *</span></label>
                  <div className="input">
                    <input
                      value={draft.origin_code ?? ''}
                      onChange={e => patch('origin_code', e.target.value.toUpperCase())}
                      placeholder="VOBL"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Destination ICAO<span style={{ color: 'var(--danger)' }}> *</span></label>
                  <div className="input">
                    <input
                      value={draft.destination_code ?? ''}
                      onChange={e => patch('destination_code', e.target.value.toUpperCase())}
                      placeholder="VOMY"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Origin name</label>
                  <div className="input">
                    <input
                      value={draft.origin_name ?? ''}
                      onChange={e => patch('origin_name', e.target.value)}
                      placeholder="Bengaluru pad B"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Destination name</label>
                  <div className="input">
                    <input
                      value={draft.destination_name ?? ''}
                      onChange={e => patch('destination_name', e.target.value)}
                      placeholder="Mysuru pad"
                    />
                  </div>
                </div>
              </div>

              {/* Route details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 400 }}>Details</span>
                <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 10 }}>
                <div className="field">
                  <label className="field-label">Category</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                    <select
                      value={draft.category ?? 'on_demand'}
                      onChange={e => patch('category', e.target.value)}
                      style={{
                        flex: 1, border: 'none', outline: 'none',
                        background: 'transparent', cursor: 'pointer', height: '100%',
                      }}
                    >
                      <option value="shuttle">Shuttle</option>
                      <option value="on_demand">On-demand</option>
                      <option value="charter">Charter</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Distance · nm</label>
                  <div className="input">
                    <input
                      type="number" min={0}
                      value={draft.distance_nm ?? ''}
                      onChange={e => patch('distance_nm', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="78"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Block time · min</label>
                  <div className="input">
                    <input
                      type="number" min={0}
                      value={draft.block_time_minutes ?? ''}
                      onChange={e => patch('block_time_minutes', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="42"
                    />
                  </div>
                </div>
              </div>

              {/* Eligible aircraft types */}
              {aircraftTypes.length > 0 && (
                <div>
                  <div className="t-label" style={{ marginBottom: 8 }}>Eligible aircraft types</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {aircraftTypes.map(at => {
                      const on = (draft.eligible_type_codes ?? []).includes(at.code)
                      return (
                        <button
                          key={at.code}
                          type="button"
                          onClick={() => toggleTypeCode(at.code)}
                          style={{
                            fontFamily: 'var(--font-mono)', fontSize: 10.5,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            padding: '4px 8px', borderRadius: 2, cursor: 'pointer',
                            background: on ? 'var(--accent-soft)' : 'var(--surface-2)',
                            color: on ? 'var(--accent)' : 'var(--ink-3)',
                            border: `1px solid ${on
                              ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))'
                              : 'var(--rule)'}`,
                          }}
                        >
                          {on ? '✓ ' : '+ '}{at.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Authorised operators */}
              <div>
                <div className="t-label" style={{ marginBottom: 8 }}>Authorised operators</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {/* Known operators from existing routes */}
                  {knownOps.map(op => {
                    const on = (draft.authorized_operators ?? []).includes(op)
                    return (
                      <button
                        key={op}
                        type="button"
                        onClick={() => toggleOperator(op)}
                        style={{
                          padding: '5px 9px', borderRadius: 2, cursor: 'pointer',
                          fontSize: 12,
                          background: on ? 'var(--accent-soft)' : 'var(--surface-2)',
                          color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
                          border: `1px solid ${on
                            ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))'
                            : 'var(--rule)'}`,
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}
                      >
                        <Icon name={on ? 'check' : 'plus'} size={11} stroke={2.2} />
                        {op}
                      </button>
                    )
                  })}
                  {/* Operators in draft not in knownOps */}
                  {(draft.authorized_operators ?? [])
                    .filter(op => !knownOps.includes(op))
                    .map(op => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => toggleOperator(op)}
                        style={{
                          padding: '5px 9px', borderRadius: 2, cursor: 'pointer',
                          fontSize: 12,
                          background: 'var(--accent-soft)',
                          color: 'var(--accent-ink)',
                          border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}
                      >
                        <Icon name="check" size={11} stroke={2.2} />{op}
                      </button>
                    ))
                  }
                </div>
                {/* Add new operator inline */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <div className="input" style={{ flex: 1, height: 30 }}>
                    <input
                      value={newOperator}
                      onChange={e => setNewOperator(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addOperator()}
                      placeholder="Add operator…"
                      style={{ fontSize: 12 }}
                    />
                  </div>
                  <button className="btn sm" onClick={addOperator} disabled={!newOperator.trim()}>
                    Add
                  </button>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={draft.is_active ?? true}
                  onChange={e => patch('is_active', e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                Route active
              </label>
            </div>

            {/* Footer actions */}
            <div style={{
              padding: '12px 18px', borderTop: '1px solid var(--rule)',
              display: 'flex', gap: 8,
            }}>
              {!isNew && selected && (
                <button
                  className="btn sm"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => setConfirmDeactivate(selected)}
                >
                  <Icon name="trash" size={13} />Deactivate
                </button>
              )}
              <button className="btn sm" onClick={discard} style={{ marginLeft: 'auto' }}>
                Discard
              </button>
              <button className="btn accent sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : isNew ? 'Create route' : 'Save route'}
              </button>
            </div>
          </div>
        )}

        {/* Empty state when editor is closed */}
        {!showEditor && !loading && allRoutes.length === 0 && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--rule)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: 200, color: 'var(--ink-3)', gap: 12, padding: 40,
          }}>
            <Icon name="plane" size={32} stroke={1} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: 14, textAlign: 'center' }}>
              No air routes yet.<br />Add your first route.
            </div>
            <button className="btn accent sm" onClick={startNew}><Icon name="plus" size={13} />New route</button>
          </div>
        )}
      </div>

      {confirmDeactivate && (
        <ConfirmDialog
          open
          title="Deactivate air route"
          description={`"${confirmDeactivate.code}" will stop accepting new bookings. Existing bookings are unaffected.`}
          confirmLabel="Deactivate"
          variant="danger"
          onConfirm={() => deactivate(confirmDeactivate)}
          onCancel={() => setConfirmDeactivate(null)}
        />
      )}
    </Shell>
  )
}
