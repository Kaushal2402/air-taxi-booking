import { useState, useEffect } from 'react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useIsTablet } from '../../hooks/useIsMobile'
import { pricingService } from '../../services/pricingService'
import { catalogService } from '../../services/catalogService'
import type { SimulateRuleResult } from '../../services/pricingService'
import type { VehicleClass, ServiceZone } from '../../services/catalogService'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RuleOption {
  id: string
  rule_code: string
  version: number
  status: string
  label: string
  meta: string
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FareSimulatorPage() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([])
  const [serviceZones, setServiceZones]     = useState<ServiceZone[]>([])
  const [ruleOptions, setRuleOptions]       = useState<RuleOption[]>([])
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set())

  // Inputs
  const [zoneId, setZoneId]               = useState('')
  const [dropZoneId, setDropZoneId]       = useState('')
  const [vehicleClassId, setVehicleClassId] = useState('')
  const [distanceKm, setDistanceKm]       = useState(38.4)
  const [durationMin, setDurationMin]     = useState(34)
  const [waitingMin, setWaitingMin]       = useState(3)
  const [toll, setToll]                   = useState(85)
  const [timeOfDay, setTimeOfDay]         = useState('17:42')
  const [dayType, setDayType]             = useState('weekday')
  const [demandRatio, setDemandRatio]     = useState(1.3)
  const [promoDiscount, setPromoDiscount] = useState(0)

  const [results, setResults]   = useState<SimulateRuleResult[] | null>(null)
  const [running, setRunning]   = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    catalogService.listVehicleClasses().then(setVehicleClasses).catch(() => null)
    catalogService.listServiceZones().then(setServiceZones).catch(() => null)
  }, [])

  // Load available rules when zone + class change
  useEffect(() => {
    if (!zoneId || !vehicleClassId) { setRuleOptions([]); return }
    pricingService.listRoadRules({ zone_id: zoneId, vehicle_class_id: vehicleClassId, per_page: 10 })
      .then(res => {
        const opts: RuleOption[] = res.items.map(r => ({
          id: r.id,
          rule_code: r.rule_code,
          version: r.version,
          status: r.status,
          label: `${r.status === 'live' ? 'Current' : r.status === 'draft' ? 'Draft' : 'Prior'} · v${r.version} (${r.status})`,
          meta: `${r.rule_code} · since ${r.effective_from ? new Date(r.effective_from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}`,
        }))
        setRuleOptions(opts)
        // Auto-select live rule
        const live = opts.find(o => o.status === 'live')
        if (live) setSelectedRuleIds(new Set([live.id]))
      })
      .catch(() => null)
  }, [zoneId, vehicleClassId])

  const toggleRule = (id: string) => {
    setSelectedRuleIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const compareDrafts = async () => {
    if (!zoneId || !vehicleClassId) {
      setApiError('Select a pickup zone and vehicle class first, then click Compare drafts')
      return
    }
    const ids = ruleOptions.filter(r => r.status === 'live' || r.status === 'draft').map(r => r.id)
    if (ids.length === 0) {
      setApiError('No live or draft rules found for this zone + class combination')
      return
    }
    setSelectedRuleIds(new Set(ids))
    setRunning(true)
    setApiError('')
    try {
      const res = await pricingService.simulate({
        zone_id: zoneId,
        vehicle_class_id: vehicleClassId,
        distance_km: distanceKm,
        duration_min: durationMin,
        waiting_min: waitingMin,
        toll,
        time_of_day: timeOfDay,
        day_type: dayType,
        demand_supply_ratio: demandRatio,
        promo_discount: promoDiscount,
        rule_ids: ids,
      })
      setResults(res.results)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setApiError(err?.response?.data?.message || 'Compare failed — check that live/draft rules exist')
    } finally {
      setRunning(false)
    }
  }

  const reset = () => {
    setZoneId('')
    setDropZoneId('')
    setVehicleClassId('')
    setDistanceKm(38.4)
    setDurationMin(34)
    setWaitingMin(3)
    setToll(85)
    setTimeOfDay('17:42')
    setDayType('weekday')
    setDemandRatio(1.3)
    setPromoDiscount(0)
    setResults(null)
    setApiError('')
    setRuleOptions([])
    setSelectedRuleIds(new Set())
  }

  const run = async () => {
    if (!zoneId || !vehicleClassId) { setApiError('Select a pickup zone and vehicle class'); return }
    setRunning(true); setApiError('')
    try {
      const res = await pricingService.simulate({
        zone_id: zoneId,
        vehicle_class_id: vehicleClassId,
        distance_km: distanceKm,
        duration_min: durationMin,
        waiting_min: waitingMin,
        toll,
        time_of_day: timeOfDay,
        day_type: dayType,
        demand_supply_ratio: demandRatio,
        promo_discount: promoDiscount,
        rule_ids: selectedRuleIds.size > 0 ? Array.from(selectedRuleIds) : undefined,
      })
      setResults(res.results)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setApiError(err?.response?.data?.message || 'Simulation failed')
    } finally { setRunning(false) }
  }

  const isWide = !isMobile && !isTablet

  return (
    <Shell
      activeId="pricing"
      breadcrumb="Catalog & Pricing · Pricing · Simulator"
      title="Fare simulator"
      subtitle="Run a hypothetical trip against any draft or live rule set · production engine"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={reset}>Reset</button>
          <button className="btn sm" onClick={() => void compareDrafts()} disabled={running}>
            <Icon name="copy" size={13} />{running ? 'Running…' : 'Compare drafts'}
          </button>
          <button className="btn sm accent" onClick={run} disabled={running}>
            <Icon name="bolt" size={13} />{running ? 'Running…' : 'Run simulation'}
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '16px' : '24px 32px 28px', display: 'grid', gridTemplateColumns: isWide ? '440px 1fr' : '1fr', gap: 24 }}>

        {/* Left: inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

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

          {/* Trip inputs */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Scenario</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Trip inputs</h3>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Pickup zone</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                    <select
                      value={zoneId}
                      onChange={e => setZoneId(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%' }}
                    >
                      <option value="">Select…</option>
                      {serviceZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Drop zone</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                    <select
                      value={dropZoneId}
                      onChange={e => setDropZoneId(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%' }}
                    >
                      <option value="">Select…</option>
                      {serviceZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Distance · km</label>
                  <div className="input">
                    <input type="number" step="0.1" min="0" value={distanceKm} onChange={e => setDistanceKm(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Duration · min</label>
                  <div className="input">
                    <input type="number" min="0" value={durationMin} onChange={e => setDurationMin(parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Waiting · min</label>
                  <div className="input">
                    <input type="number" min="0" value={waitingMin} onChange={e => setWaitingMin(parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Toll · ₹</label>
                  <div className="input">
                    <input type="number" min="0" value={toll} onChange={e => setToll(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Time of day</label>
                  <div className="input">
                    <input type="time" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Day</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                    <select
                      value={dayType}
                      onChange={e => setDayType(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%' }}
                    >
                      <option value="weekday">Weekday</option>
                      <option value="weekend">Weekend</option>
                      <option value="holiday">Holiday</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Demand/Supply ratio</label>
                  <div className="input">
                    <input type="number" step="0.1" min="0" value={demandRatio} onChange={e => setDemandRatio(parseFloat(e.target.value) || 1)} />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Vehicle class</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                    <select
                      value={vehicleClassId}
                      onChange={e => setVehicleClassId(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%' }}
                    >
                      <option value="">Select…</option>
                      {vehicleClasses.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Promo discount · ₹</label>
                  <div className="input">
                    <input type="number" min="0" value={promoDiscount} onChange={e => setPromoDiscount(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rule set */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Rule set</div>
            </div>
            <div style={{ padding: '18px 22px' }}>
              {ruleOptions.length === 0 ? (
                <div className="t-meta" style={{ color: 'var(--ink-3)' }}>
                  {zoneId && vehicleClassId ? 'No rules found for this zone + class.' : 'Select pickup zone and vehicle class to load rules.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ruleOptions.map(r => {
                    const on = selectedRuleIds.has(r.id)
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleRule(r.id)}
                        style={{
                          padding: '10px 12px',
                          border: `1px solid ${on ? 'var(--accent)' : 'var(--rule)'}`,
                          background: on ? 'var(--accent-soft-2, color-mix(in oklab, var(--accent) 8%, var(--surface)))' : 'var(--surface)',
                          borderRadius: 3,
                          display: 'flex', alignItems: 'center', gap: 10,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: `1px solid ${on ? 'var(--accent)' : 'var(--rule-strong)'}`,
                          background: on ? 'var(--accent)' : 'var(--surface)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {on && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13 }}>{r.label}</div>
                          <div className="t-meta" style={{ marginTop: 2 }}>{r.meta}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {!results ? (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--rule)',
              padding: '48px 32px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <Icon name="bolt" size={32} style={{ color: 'var(--ink-3)' }} />
              <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>
                Fill in trip details and click <strong>Run simulation →</strong>
              </div>
            </div>
          ) : (
            <>
              {/* Big total — first result */}
              {results[0] && (
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--accent)',
                  boxShadow: '0 0 0 1px var(--accent)',
                  padding: '24px 28px',
                }}>
                  <div className="t-label">Computed fare · v{results[0].version} ({results[0].status})</div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-serif)', fontSize: 64,
                      color: 'var(--ink)', letterSpacing: '-0.020em', lineHeight: 1,
                    }}>
                      ₹ {results[0].fare_total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    {results.length > 1 && (
                      <div>
                        {results.slice(1).map(r => (
                          <div key={r.rule_id} className="t-meta" style={{ marginTop: 3 }}>
                            v{r.version} ({r.status}) would charge ₹{r.fare_total.toLocaleString('en-IN', { maximumFractionDigits: 0 })} · {r.fare_total > results[0].fare_total ? '+' : ''}₹{(r.fare_total - results[0].fare_total).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Breakdown table */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                  <div className="t-label">Breakdown</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                    Line items · with rule references
                  </h3>
                </div>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ minWidth: 500 }}>
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Rule</th>
                        <th>Inputs</th>
                        {results.map(r => (
                          <th key={r.rule_id} style={{ textAlign: 'right' }}>
                            v{r.version} · {r.status}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results[0].breakdown.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.component}</td>
                          <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{item.rule_ref}</td>
                          <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{item.inputs}</td>
                          {results.map((r, ri) => {
                            const val = r.breakdown[idx]?.amount ?? 0
                            return (
                              <td key={r.rule_id} className="num" style={{ textAlign: 'right', color: ri > 0 ? 'var(--ink-3)' : undefined }}>
                                {val < 0 ? '−' : ''}₹ {Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <td colSpan={3} style={{ fontWeight: 500 }}>Total</td>
                        {results.map((r, ri) => (
                          <td key={r.rule_id} className="num" style={{ textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 22, color: ri > 0 ? 'var(--ink-3)' : undefined }}>
                            ₹ {r.fare_total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}
