import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { pricingService } from '../../services/pricingService'
import { catalogService } from '../../services/catalogService'
import type { RoadRule, RoadRuleModifier } from '../../services/pricingService'
import type { VehicleClass, ServiceZone } from '../../services/catalogService'
import { useCurrencySymbol, formatDate } from '../../lib/utils'
import { usePlatformStore } from '../../store/platformStore'

// ── Empty form state ──────────────────────────────────────────────────────────

const EMPTY_MODIFIER: RoadRuleModifier = {
  name: '',
  window_start: null,
  window_end: null,
  type: 'pct',
  value: 0,
}

const EMPTY_RULE_BASE: Omit<Partial<RoadRule>, 'surge_cap'> = {
  zone_id: '',
  vehicle_class_id: '',
  base_fare: 0,
  per_km: 0,
  per_min: 0,
  min_fare: 0,
  free_km: 0,
  free_min: 0,
  waiting_per_min: 0,
  cancel_fee: 0,
  modifiers: [],
  effective_from: new Date().toISOString().slice(0, 16),
  effective_to: null,
}

// ── Status badge helper ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'live' | 'draft' | 'past' }) {
  if (status === 'live') return <span className="badge ok"><span className="dot ok" />Live</span>
  if (status === 'draft') return <span className="badge warn">Draft</span>
  return <span className="badge">Past</span>
}

// ── Surge bar chart ───────────────────────────────────────────────────────────

function SurgeChart() {
  const tiers = [
    { ratio: '< 1.0',    m: '1.0×', h: 30 },
    { ratio: '1.0–1.2',  m: '1.1×', h: 40 },
    { ratio: '1.2–1.4',  m: '1.3×', h: 56 },
    { ratio: '1.4–1.6',  m: '1.5×', h: 72 },
    { ratio: '1.6–1.8',  m: '1.7×', h: 92 },
    { ratio: '> 1.8',    m: '1.8×', h: 100, cap: true },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, marginBottom: 16, height: 120, paddingTop: 12 }}>
      {tiers.map((t, i) => (
        <div key={t.ratio} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{
            height: t.h, margin: '0 4px',
            background: t.cap ? 'var(--danger-soft)' : i === 0 ? 'var(--surface-2)' : `color-mix(in oklab, var(--accent) ${i * 14}%, var(--surface-2))`,
            border: `1px solid ${t.cap ? 'var(--danger)' : 'var(--rule-strong)'}`,
            borderRadius: '3px 3px 0 0',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: 6,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: t.cap ? 'var(--danger)' : 'var(--ink-2)' }}>{t.m}</span>
          </div>
          <div className="t-meta" style={{ textAlign: 'center', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{t.ratio}</div>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RoadFareRulesPage() {
  const sym = useCurrencySymbol()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const surgeCeiling = usePlatformStore(s => s.surge_ceiling)
  const emptyRule = (): Partial<RoadRule> => ({ ...EMPTY_RULE_BASE, surge_cap: surgeCeiling })

  const [rules, setRules]           = useState<RoadRule[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<RoadRule | null>(null)
  const [draft, setDraft]           = useState<Partial<RoadRule>>(emptyRule)
  const [isNew, setIsNew]           = useState(false)
  const [saving, setSaving]         = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [apiError, setApiError]     = useState('')
  const [showMobileEditor, setShowMobileEditor] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<RoadRule | null>(null)

  // Dropdown options
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([])
  const [serviceZones, setServiceZones]     = useState<ServiceZone[]>([])

  // Version history
  const [showVersions, setShowVersions]           = useState(false)
  const [versionHistory, setVersionHistory]       = useState<RoadRule[]>([])
  const [loadingVersions, setLoadingVersions]     = useState(false)

  const loadRules = async () => {
    setLoading(true)
    try {
      const res = await pricingService.listRoadRules({ search: search || undefined })
      setRules(res.items)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadRules() }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    catalogService.listVehicleClasses().then(setVehicleClasses).catch(() => null)
    catalogService.listServiceZones().then(setServiceZones).catch(() => null)
  }, [])

  const selectRule = async (r: RoadRule) => {
    setApiError('')
    try {
      const full = await pricingService.getRoadRule(r.id)
      setSelected(full)
      setIsNew(false)
      setDraft({ ...full })
    } catch {
      setSelected(r)
      setIsNew(false)
      setDraft({ ...r })
    }
    if (isMobile) setShowMobileEditor(true)
  }

  const startNew = () => {
    setSelected(null)
    setIsNew(true)
    setDraft(emptyRule())
    setApiError('')
    if (isMobile) setShowMobileEditor(true)
  }

  const patch = <K extends keyof RoadRule>(k: K, v: RoadRule[K]) =>
    setDraft(d => ({ ...d, [k]: v }))

  const save = async () => {
    if (!draft.zone_id) { setApiError('Service area is required'); return }
    if (!draft.vehicle_class_id) { setApiError('Vehicle class is required'); return }
    setSaving(true); setApiError('')
    try {
      if (isNew) {
        await pricingService.createRoadRule(draft)
      } else if (selected) {
        await pricingService.updateRoadRule(selected.id, draft)
      }
      await loadRules()
      setIsNew(false)
      setSelected(null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setApiError(err?.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const clone = async () => {
    if (!selected) return
    setSaving(true); setApiError('')
    try {
      const cloned = await pricingService.createRoadRule({
        ...selected,
        id: undefined,
        status: 'draft',
        published_at: null,
        created_at: undefined,
        updated_at: undefined,
      } as Partial<RoadRule>)
      await loadRules()
      setSelected(cloned)
      setIsNew(false)
      setDraft({ ...cloned })
    } catch {
      setApiError('Clone failed')
    } finally { setSaving(false) }
  }

  const publish = async () => {
    if (!selected) return
    setPublishing(true); setApiError('')
    try {
      const updated = await pricingService.publishRoadRule(selected.id)
      await loadRules()
      setSelected(updated)
      setDraft({ ...updated })
    } catch {
      setApiError('Publish failed')
    } finally { setPublishing(false) }
  }

  const deleteRule = async (r: RoadRule) => {
    try {
      await pricingService.deleteRoadRule(r.id)
      await loadRules()
      if (selected?.id === r.id) { setSelected(null); setIsNew(false) }
    } catch {
      setApiError('Delete failed')
    }
    setConfirmDelete(null)
  }

  const addModifier = () => {
    setDraft(d => ({ ...d, modifiers: [...(d.modifiers ?? []), { ...EMPTY_MODIFIER }] }))
  }

  const removeModifier = (idx: number) => {
    setDraft(d => ({ ...d, modifiers: (d.modifiers ?? []).filter((_, i) => i !== idx) }))
  }

  const patchModifier = (idx: number, k: keyof RoadRuleModifier, v: unknown) => {
    setDraft(d => {
      const mods = [...(d.modifiers ?? [])]
      mods[idx] = { ...mods[idx], [k]: v }
      return { ...d, modifiers: mods }
    })
  }

  const openVersionHistory = async () => {
    if (!selected) return
    setLoadingVersions(true)
    setShowVersions(true)
    try {
      const res = await pricingService.listRoadRules({
        zone_id: selected.zone_id,
        vehicle_class_id: selected.vehicle_class_id,
        per_page: 50,
      })
      // Sort: live first, then draft, then past desc by version
      const sorted = [...res.items].sort((a, b) => {
        const order = { live: 0, draft: 1, past: 2 }
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
        return b.version - a.version
      })
      setVersionHistory(sorted)
    } catch { /* ignore */ }
    finally { setLoadingVersions(false) }
  }

  const showEditor = isNew || selected !== null
  const totalRules = rules.length
  const liveCount  = rules.filter(r => r.status === 'live').length
  const draftCount = rules.filter(r => r.status === 'draft').length

  // Layout mode
  const isTwoPanel = !isMobile && !isTablet && showEditor

  return (
    <Shell
      activeId="pricing"
      breadcrumb="Catalog & Pricing · Pricing"
      title="Road fare rules"
      subtitle={`${liveCount} live · ${draftCount} drafts · ${totalRules} total`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/pricing/simulator')}>
            <Icon name="bolt" size={13} />Fare simulator
          </button>
          <button
            className="btn sm"
            onClick={openVersionHistory}
            disabled={!selected}
            title={selected ? `Version history for ${selected.vehicle_class_name} · ${selected.zone_name}` : 'Select a rule to view versions'}
          >
            <Icon name="archive" size={13} />Versions
          </button>
          <button className="btn sm accent" onClick={startNew}>
            <Icon name="plus" size={13} />Draft rule
          </button>
        </div>
      }
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: isTwoPanel ? '440px 1fr' : '1fr',
        minHeight: '100%',
      }}>
        {/* Left: rule list — hidden on mobile when editor is open */}
        {(!isMobile || !showMobileEditor) && (
          <aside style={{
            borderRight: isTwoPanel ? '1px solid var(--rule)' : 'none',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            borderBottom: isMobile && showEditor ? '1px solid var(--rule)' : 'none',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 8 }}>
              <div className="input" style={{ flex: 1, height: 32 }}>
                <Icon name="search" size={13} className="icon" />
                <input
                  placeholder="Filter rules…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="btn ghost icon sm"><Icon name="filter" size={13} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {loading && (
                <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
              )}
              {!loading && rules.length === 0 && (
                <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>No rules found.</div>
              )}
              {!loading && rules.map(r => {
                const isSel = selected?.id === r.id
                return (
                  <div
                    key={r.id}
                    onClick={() => selectRule(r)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--rule-soft)',
                      borderLeft: `3px solid ${isSel ? 'var(--accent)' : 'transparent'}`,
                      background: isSel ? 'var(--surface-2)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)' }}>
                        {r.rule_code}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>
                        {r.vehicle_class_name ?? '—'}
                      </span>
                      <span className="t-meta">v{r.version}</span>
                    </div>
                    <div className="t-meta" style={{ marginTop: 4, color: 'var(--ink-3)' }}>
                      {r.zone_name ?? '—'}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                      <span>{sym}{r.base_fare}</span>
                      <span>· {sym}{r.per_km}/km</span>
                      <span>· {r.surge_cap}× cap</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>
        )}

        {/* Right: editor */}
        {showEditor && (!isMobile || showMobileEditor) && (
          <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: 22, overflow: 'auto' }}>

            {/* Mobile back button */}
            {isMobile && (
              <button
                onClick={() => { setShowMobileEditor(false); setSelected(null); setIsNew(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, color: 'var(--accent)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', padding: '0 0 8px',
                }}
              >
                <Icon name="chevLeft" size={14} stroke={2} />
                Back to Rules
              </button>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="t-label">
                  {isNew ? 'New rule' : `Editing rule · v${selected?.version} · ${selected?.status}`}
                </div>
                <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.018em' }}>
                  {isNew
                    ? 'New draft rule'
                    : `${draft.vehicle_class_name ?? '—'} · ${draft.zone_name ?? '—'}`
                  }
                </h2>
                {!isNew && selected && (
                  <div className="t-meta" style={{ marginTop: 4 }}>
                    {selected.rule_code}
                    {selected.published_at ? ` · published ${formatDate(selected.published_at)}` : ''}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn sm" onClick={() => navigate('/pricing/simulator')}>
                  <Icon name="bolt" size={12} />Simulate
                </button>
                {!isNew && selected?.status === 'live' && (
                  <button className="btn sm" onClick={clone} disabled={saving}>
                    <Icon name="copy" size={12} />Clone
                  </button>
                )}
                <button className="btn sm" onClick={() => { setSelected(null); setIsNew(false); setApiError('') }}>
                  Cancel
                </button>
                {(isNew || selected?.status === 'draft') && (
                  <button className="btn sm accent" onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : isNew ? 'Save draft' : `Save · v${(selected?.version ?? 0) + 1} draft`}
                  </button>
                )}
                {!isNew && selected?.status === 'draft' && (
                  <button className="btn sm" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={publish} disabled={publishing}>
                    {publishing ? 'Publishing…' : 'Publish'}
                  </button>
                )}
                {!isNew && selected?.status === 'draft' && (
                  <button className="btn sm ghost" onClick={() => setConfirmDelete(selected)} style={{ color: 'var(--danger)' }}>
                    <Icon name="trash" size={12} />Delete
                  </button>
                )}
              </div>
            </div>

            {apiError && (
              <div style={{
                padding: '9px 12px',
                background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
              }}>
                {apiError}
              </div>
            )}

            {/* Scope & Effective dating */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                <div className="t-label">Scope · effective dating</div>
              </div>
              <div style={{ padding: '18px 22px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 16 }}>
                  <div className="field">
                    <label className="field-label">Vehicle class</label>
                    <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                      <select
                        value={draft.vehicle_class_id ?? ''}
                        onChange={e => patch('vehicle_class_id', e.target.value)}
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%' }}
                      >
                        <option value="">Select…</option>
                        {vehicleClasses.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Service area</label>
                    <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                      <select
                        value={draft.zone_id ?? ''}
                        onChange={e => patch('zone_id', e.target.value)}
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%' }}
                      >
                        <option value="">Select…</option>
                        {serviceZones.map(z => (
                          <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Effective from</label>
                    <div className="input">
                      <input
                        type="datetime-local"
                        value={(draft.effective_from ?? '').slice(0, 16)}
                        onChange={e => patch('effective_from', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Effective to</label>
                    <div className="input">
                      <input
                        type="datetime-local"
                        value={(draft.effective_to ?? '').slice(0, 16)}
                        onChange={e => patch('effective_to', e.target.value || null)}
                        placeholder="Open-ended"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Base components */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                <div className="t-label">Base components</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  Fare = Base + Distance + Time + Waiting + Surge − Discounts + Taxes
                </h3>
              </div>
              <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16 }}>
                {([
                  { l: 'Base fare',         k: 'base_fare',       unit: sym,           hint: 'Applied once per trip' },
                  { l: 'Per km',            k: 'per_km',          unit: `${sym}/km`,   hint: 'After free km' },
                  { l: 'Per minute',        k: 'per_min',         unit: `${sym}/min`,  hint: 'After free time' },
                  { l: 'Minimum fare',      k: 'min_fare',        unit: sym,           hint: 'Floor regardless of trip' },
                  { l: 'Free km',           k: 'free_km',         unit: 'km',          hint: 'Included in base' },
                  { l: 'Free time',         k: 'free_min',        unit: 'min',         hint: 'Boarding allowance' },
                  { l: 'Waiting · per min', k: 'waiting_per_min', unit: `${sym}/min`,  hint: 'After free time' },
                  { l: 'Cancel fee',        k: 'cancel_fee',      unit: sym,           hint: 'Post grace period' },
                ] as { l: string; k: keyof RoadRule; unit: string; hint: string }[]).map(c => (
                  <div key={c.k}>
                    <div className="t-label" style={{ padding: 0 }}>{c.l}</div>
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={String(draft[c.k] ?? 0)}
                        onChange={e => patch(c.k, parseFloat(e.target.value) || 0)}
                        style={{
                          width: '100%', padding: '8px 10px',
                          border: '1px solid var(--rule-strong)', borderRadius: 3,
                          background: 'var(--surface)', color: 'var(--ink)',
                          fontFamily: 'var(--font-mono)', fontSize: 16,
                        }}
                      />
                      <span className="t-meta" style={{ whiteSpace: 'nowrap', color: 'var(--ink-3)' }}>{c.unit}</span>
                    </div>
                    <div className="t-meta" style={{ marginTop: 4, color: 'var(--ink-3)' }}>{c.hint}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Surge config + Time-of-day modifiers */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 22 }}>

              {/* Surge */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                  <div className="t-label">Surge configuration</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                    Demand-to-supply multiplier · capped at {draft.surge_cap ?? surgeCeiling}×
                  </h3>
                </div>
                <div style={{ padding: '20px 22px' }}>
                  <SurgeChart />
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label className="field-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Surge cap</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={draft.surge_cap ?? surgeCeiling}
                      onChange={e => patch('surge_cap', parseFloat(e.target.value) || surgeCeiling)}
                      style={{
                        width: 90, padding: '6px 10px',
                        border: '1px solid var(--rule-strong)', borderRadius: 3,
                        background: 'var(--surface)', color: 'var(--ink)',
                        fontFamily: 'var(--font-mono)', fontSize: 14,
                      }}
                    />
                    <span className="t-meta">×</span>
                  </div>
                  <div className="t-meta" style={{ marginTop: 12, color: 'var(--ink-3)' }}>
                    Multiplier ladder applies live demand-to-supply ratio per zone. Hard cap enforced by the pricing engine.
                  </div>
                </div>
              </div>

              {/* Time-of-day modifiers */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="t-label">Time-of-day modifiers</div>
                  <button className="btn ghost sm" onClick={addModifier}>
                    <Icon name="plus" size={12} />Add
                  </button>
                </div>
                <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(draft.modifiers ?? []).length === 0 && (
                    <div className="t-meta" style={{ color: 'var(--ink-3)' }}>No modifiers yet.</div>
                  )}
                  {(draft.modifiers ?? []).map((mod, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span className="dot ok" />
                        <input
                          value={mod.name}
                          onChange={e => patchModifier(i, 'name', e.target.value)}
                          placeholder="Modifier name"
                          style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface)', color: 'var(--ink)', fontSize: 12.5 }}
                        />
                        <button className="btn ghost icon sm" onClick={() => removeModifier(i)}>
                          <Icon name="x" size={11} />
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 72px', gap: 6 }}>
                        <div>
                          <div className="t-meta" style={{ marginBottom: 3 }}>From</div>
                          <input
                            type="time"
                            value={mod.window_start ?? ''}
                            onChange={e => patchModifier(i, 'window_start', e.target.value || null)}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                          />
                        </div>
                        <div>
                          <div className="t-meta" style={{ marginBottom: 3 }}>To</div>
                          <input
                            type="time"
                            value={mod.window_end ?? ''}
                            onChange={e => patchModifier(i, 'window_end', e.target.value || null)}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                          />
                        </div>
                        <div>
                          <div className="t-meta" style={{ marginBottom: 3 }}>Type</div>
                          <select
                            value={mod.type}
                            onChange={e => patchModifier(i, 'type', e.target.value as 'pct' | 'flat')}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface)', cursor: 'pointer', fontSize: 12 }}
                          >
                            <option value="pct">%</option>
                            <option value="flat">{`flat ${sym}`}</option>
                          </select>
                        </div>
                        <div>
                          <div className="t-meta" style={{ marginBottom: 3 }}>Value</div>
                          <input
                            type="number"
                            step="0.01"
                            value={mod.value}
                            onChange={e => patchModifier(i, 'value', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete draft rule"
          description="This rule will be permanently deleted."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => deleteRule(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Version history modal */}
      {showVersions && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px 16px',
        }} onClick={() => setShowVersions(false)}>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--rule)',
              width: '100%', maxWidth: 700,
              maxHeight: '80vh',
              display: 'flex', flexDirection: 'column',
              borderRadius: 4,
              boxShadow: 'var(--shadow-pop)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div className="t-label">Version history</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>
                  {selected?.vehicle_class_name} · {selected?.zone_name}
                </h3>
              </div>
              <button
                onClick={() => setShowVersions(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {loadingVersions ? (
                <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading versions…</div>
              ) : versionHistory.length === 0 ? (
                <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>No version history found.</div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Rule code</th>
                        <th>Version</th>
                        <th>Status</th>
                        <th>Base</th>
                        <th>Per km</th>
                        <th>Surge cap</th>
                        <th>Effective from</th>
                        <th>Published</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versionHistory.map(r => (
                        <tr
                          key={r.id}
                          style={{ cursor: r.status !== 'past' ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (r.status !== 'past') { selectRule(r); setShowVersions(false) }
                          }}
                        >
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{r.rule_code}</span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>v{r.version}</span>
                          </td>
                          <td><StatusBadge status={r.status} /></td>
                          <td className="num">{sym}{r.base_fare}</td>
                          <td className="num">{sym}{r.per_km}/km</td>
                          <td className="num">{r.surge_cap}×</td>
                          <td className="t-meta">
                            {r.effective_from ? formatDate(r.effective_from) : '—'}
                          </td>
                          <td className="t-meta">
                            {r.published_at ? formatDate(r.published_at) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '12px 22px',
              borderTop: '1px solid var(--rule)',
              display: 'flex', justifyContent: 'flex-end',
            }}>
              <button className="btn sm" onClick={() => setShowVersions(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
