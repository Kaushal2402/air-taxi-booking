import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { pricingService } from '../../services/pricingService'
import type { AirRule } from '../../services/pricingService'
import { useFormatMoney, useCurrencySymbol } from '../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function CategoryBadge({ cat }: { cat: string }) {
  if (cat === 'shuttle') return <span className="badge ok">Shuttle</span>
  if (cat === 'vip')     return <span className="badge info">VIP</span>
  if (cat === 'charter') return <span className="badge">Charter</span>
  return <span className="badge">On-demand</span>
}

const EMPTY_AIR_RULE: Partial<AirRule> = {
  route_name: '',
  aircraft_type: '',
  category: 'shuttle',
  per_seat_base: null,
  min_pax: null,
  hourly_rate: null,
  baggage_per_kg: 0,
  excess_baggage_cap: 20,
  positioning_charge: null,
  night_halt_charge: null,
  fuel_surcharge_pct: 0,
  tax_gst_pct: 5,
  effective_from: new Date().toISOString().slice(0, 16),
  effective_to: null,
}

// ── Live example calculator ───────────────────────────────────────────────────

function LiveExample({ rule }: { rule: Partial<AirRule> }) {
  const pax     = rule.min_pax ?? 4
  const perSeat = rule.per_seat_base ?? 0
  const baggage = 24
  const bpkg    = rule.baggage_per_kg ?? 0
  const fuel    = rule.fuel_surcharge_pct ?? 0
  const gst     = rule.tax_gst_pct ?? 0

  const base   = pax * perSeat + baggage * bpkg
  const fueled = base * (1 + fuel / 100)
  const total  = fueled * (1 + gst / 100)

  return (
    <div style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12.5, color: 'var(--ink-2)' }}>
      Live computed example · {pax} pax, {baggage} kg baggage, no night halt, surcharge applied:
      <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
        {pax} × {sym}{perSeat.toLocaleString()} + {baggage} × {sym}{bpkg} + {fuel}% fuel + {gst}% GST ={' '}
        <span style={{ color: 'var(--accent)' }}>{sym} {Math.round(total).toLocaleString()}</span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AirFareRulesPage() {
  const fmtMinor = useFormatMoney()
  const sym = useCurrencySymbol()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [rules, setRules]         = useState<AirRule[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<AirRule | null>(null)
  const [draft, setDraft]         = useState<Partial<AirRule>>(EMPTY_AIR_RULE)
  const [isNew, setIsNew]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [apiError, setApiError]   = useState('')
  const [showMobileEditor, setShowMobileEditor] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<AirRule | null>(null)

  const loadRules = async () => {
    setLoading(true)
    try {
      const res = await pricingService.listAirRules({ search: search || undefined })
      setRules(res.items)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadRules() }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectRule = async (r: AirRule) => {
    setApiError('')
    try {
      const full = await pricingService.getAirRule(r.id)
      setSelected(full)
      setDraft({ ...full })
    } catch {
      setSelected(r)
      setDraft({ ...r })
    }
    setIsNew(false)
    if (isMobile) setShowMobileEditor(true)
  }

  const startNew = () => {
    setSelected(null)
    setIsNew(true)
    setDraft({ ...EMPTY_AIR_RULE })
    setApiError('')
    if (isMobile) setShowMobileEditor(true)
  }

  const patch = <K extends keyof AirRule>(k: K, v: AirRule[K]) =>
    setDraft(d => ({ ...d, [k]: v }))

  const save = async () => {
    if (!draft.route_name?.trim()) { setApiError('Route name is required'); return }
    setSaving(true); setApiError('')
    try {
      if (isNew) {
        await pricingService.createAirRule(draft)
      } else if (selected) {
        await pricingService.updateAirRule(selected.id, draft)
      }
      await loadRules()
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

  const publish = async () => {
    if (!selected) return
    setPublishing(true); setApiError('')
    try {
      const updated = await pricingService.publishAirRule(selected.id)
      await loadRules()
      setSelected(updated)
      setDraft({ ...updated })
    } catch {
      setApiError('Publish failed')
    } finally { setPublishing(false) }
  }

  const deleteRule = async (r: AirRule) => {
    try {
      await pricingService.deleteAirRule(r.id)
      await loadRules()
      if (selected?.id === r.id) { setSelected(null); setIsNew(false) }
    } catch {
      setApiError('Delete failed')
    }
    setConfirmDelete(null)
  }

  const [notice, setNotice] = useState('')

  const showEditor = isNew || selected !== null
  const isTwoPanel = !isMobile && !isTablet

  return (
    <Shell
      activeId="pricing"
      breadcrumb="Catalog & Pricing · Pricing · Air"
      title="Air fare rules"
      subtitle={`${rules.length} air rules · per-route per-type · supports shuttle, charter, VIP`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/pricing/simulator')}>
            <Icon name="bolt" size={13} />Simulate flight
          </button>
          <button className="btn sm" onClick={() => setNotice('Surge configuration is managed in System Settings — available in a future module.')}>Surge config</button>
          <button className="btn sm accent" onClick={startNew}>
            <Icon name="plus" size={13} />New air rule
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '16px' : '24px 32px 28px', display: 'flex', flexDirection: 'column', gap: notice ? 16 : 0 }}>
        {notice && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            borderRadius: 3, fontSize: 13, color: 'var(--ink-2)',
          }}>
            <Icon name="info" size={14} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{notice}</span>
            <button
              onClick={() => setNotice('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}
            >
              <Icon name="x" size={13} />
            </button>
          </div>
        )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isTwoPanel && showEditor ? '1.2fr 1fr' : '1fr',
        gap: 24,
      }}>

        {/* Left: table */}
        {(!isMobile || !showMobileEditor) && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', minWidth: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Air fare rules</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                Per route · per aircraft type
              </h3>
            </div>

            {/* Search toolbar */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 8 }}>
              <div className="input" style={{ flex: 1, height: 30 }}>
                <Icon name="search" size={13} className="icon" />
                <input
                  placeholder="Search routes…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loading && <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>}

            {!loading && (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="tbl" style={{ minWidth: isMobile ? 600 : undefined }}>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Per seat</th>
                      <th>Hourly</th>
                      <th>Surcharges</th>
                      <th>Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                          No air rules found.
                        </td>
                      </tr>
                    ) : rules.map(r => {
                      const isSel = selected?.id === r.id
                      return (
                        <tr
                          key={r.id}
                          className={isSel ? 'selected' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => selectRule(r)}
                        >
                          <td>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{r.route_name}</div>
                            <div className="t-meta" style={{ marginTop: 2 }}>{r.rule_code}</div>
                          </td>
                          <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{r.aircraft_type}</td>
                          <td><CategoryBadge cat={r.category} /></td>
                          <td className="num">
                            {r.per_seat_base != null ? `${sym} ${r.per_seat_base.toLocaleString()}` : '—'}
                          </td>
                          <td className="num">
                            {r.hourly_rate != null ? `${sym} ${r.hourly_rate.toLocaleString()}` : '—'}
                          </td>
                          <td className="t-meta" style={{ color: 'var(--ink-2)' }}>
                            {r.fuel_surcharge_pct > 0 ? `Fuel · ${r.fuel_surcharge_pct}%` : '—'}
                          </td>
                          <td><span className="t-meta">v{r.version}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Right: editor */}
        {showEditor && (!isMobile || showMobileEditor) && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            {/* Mobile back */}
            {isMobile && (
              <button
                onClick={() => { setShowMobileEditor(false); setSelected(null); setIsNew(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', width: '100%', fontSize: 13, color: 'var(--accent)',
                  background: 'var(--surface-2)', border: 'none',
                  borderBottom: '1px solid var(--rule)', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <Icon name="chevLeft" size={14} stroke={2} />
                Back to Air Rules
              </button>
            )}

            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <div>
                <div className="t-label">{isNew ? 'New air rule' : 'Editing'}</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  {isNew
                    ? 'New draft air rule'
                    : `${draft.route_name ?? '—'} · ${draft.aircraft_type ?? '—'} · ${draft.category ?? '—'}`
                  }
                </h3>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn sm" onClick={discard}>Discard</button>
                {(isNew || selected?.status === 'draft') && (
                  <button className="btn sm accent" onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                )}
                {!isNew && selected?.status === 'draft' && (
                  <button
                    className="btn sm"
                    style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                    onClick={publish}
                    disabled={publishing}
                  >
                    {publishing ? '…' : `Publish v${(selected.version ?? 0) + 1}`}
                  </button>
                )}
                {!isNew && selected?.status === 'draft' && (
                  <button className="btn sm ghost" onClick={() => setConfirmDelete(selected)} style={{ color: 'var(--danger)' }}>
                    <Icon name="trash" size={12} />
                  </button>
                )}
              </div>
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

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Route name + Aircraft type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Route name</label>
                  <div className="input">
                    <input
                      value={draft.route_name ?? ''}
                      onChange={e => patch('route_name', e.target.value)}
                      placeholder="BLR-PAD → MYS-PAD"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Aircraft type</label>
                  <div className="input">
                    <input
                      value={draft.aircraft_type ?? ''}
                      onChange={e => patch('aircraft_type', e.target.value)}
                      placeholder="Bell 407"
                    />
                  </div>
                </div>
              </div>

              {/* Category + Effective from */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Category</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                    <select
                      value={draft.category ?? 'shuttle'}
                      onChange={e => patch('category', e.target.value as AirRule['category'])}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%' }}
                    >
                      <option value="shuttle">Shuttle</option>
                      <option value="on-demand">On-demand</option>
                      <option value="charter">Charter</option>
                      <option value="vip">VIP</option>
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
              </div>

              {/* Effective to */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Effective to (optional)</label>
                  <div className="input">
                    <input
                      type="datetime-local"
                      value={(draft.effective_to ?? '').slice(0, 16)}
                      onChange={e => patch('effective_to', e.target.value || null)}
                    />
                  </div>
                </div>
              </div>

              {/* Per-seat base + Min pax */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Per-seat base · {sym}</label>
                  <div className="input">
                    <input
                      type="number"
                      min="0"
                      value={draft.per_seat_base ?? ''}
                      onChange={e => patch('per_seat_base', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="68500"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Min pax for departure</label>
                  <div className="input">
                    <input
                      type="number"
                      min="1"
                      value={draft.min_pax ?? ''}
                      onChange={e => patch('min_pax', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="2"
                    />
                  </div>
                </div>
              </div>

              {/* Hourly rate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Hourly rate · {sym} (optional)</label>
                  <div className="input">
                    <input
                      type="number"
                      min="0"
                      value={draft.hourly_rate ?? ''}
                      onChange={e => patch('hourly_rate', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="184000"
                    />
                  </div>
                </div>
              </div>

              {/* Baggage per kg + Excess baggage cap */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Baggage · per kg · {sym}/kg</label>
                  <div className="input">
                    <input
                      type="number"
                      min="0"
                      value={draft.baggage_per_kg ?? 0}
                      onChange={e => patch('baggage_per_kg', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Excess baggage cap · kg</label>
                  <div className="input">
                    <input
                      type="number"
                      min="0"
                      value={draft.excess_baggage_cap ?? 20}
                      onChange={e => patch('excess_baggage_cap', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Positioning + Night-halt */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Positioning charge · {sym} (optional)</label>
                  <div className="input">
                    <input
                      type="number"
                      min="0"
                      value={draft.positioning_charge ?? ''}
                      onChange={e => patch('positioning_charge', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Included"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Night-halt charge · {sym}</label>
                  <div className="input">
                    <input
                      type="number"
                      min="0"
                      value={draft.night_halt_charge ?? ''}
                      onChange={e => patch('night_halt_charge', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="60000"
                    />
                  </div>
                </div>
              </div>

              {/* Fuel surcharge + GST */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Fuel surcharge · %</label>
                  <div className="input">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={draft.fuel_surcharge_pct ?? 0}
                      onChange={e => patch('fuel_surcharge_pct', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Tax · GST · %</label>
                  <div className="input">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={draft.tax_gst_pct ?? 5}
                      onChange={e => patch('tax_gst_pct', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Live example */}
              <LiveExample rule={draft} />
            </div>
          </div>
        )}
      </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete draft air rule"
          description="This air rule will be permanently deleted."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => deleteRule(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </Shell>
  )
}
