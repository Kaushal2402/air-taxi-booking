import { useState, useEffect, useCallback } from 'react'
import Shell from '../../components/layout/Shell'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { dispatchService } from '../../services/dispatchService'
import type { SupplyResponse, SupplyZone, SurgeOverride } from '../../services/dispatchService'

function zoneToneColor(dsRatio: number): string {
  if (dsRatio > 1.6) return 'rgba(211, 47, 47, 0.08)'
  if (dsRatio > 1.3) return 'rgba(230, 81, 0, 0.08)'
  if (dsRatio > 1.05) return 'rgba(245, 127, 23, 0.06)'
  if (dsRatio >= 0.9) return 'var(--surface)'
  return 'rgba(21, 101, 192, 0.06)'
}

function zoneToneBorder(dsRatio: number): string {
  if (dsRatio > 1.6) return 'rgba(211, 47, 47, 0.3)'
  if (dsRatio > 1.3) return 'rgba(230, 81, 0, 0.3)'
  if (dsRatio > 1.05) return 'rgba(245, 127, 23, 0.3)'
  if (dsRatio >= 0.9) return 'var(--rule)'
  return 'rgba(21, 101, 192, 0.25)'
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export default function SupplySurgePage() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [supplyData, setSupplyData] = useState<SupplyResponse | null>(null)
  const [overrides, setOverrides] = useState<SurgeOverride[]>([])
  const [selectedZone, setSelectedZone] = useState<SupplyZone | null>(null)

  // Override form state
  const [overrideZoneId, setOverrideZoneId] = useState<string>('')
  const [overrideZoneName, setOverrideZoneName] = useState<string>('')
  const [overrideMultiplier, setOverrideMultiplier] = useState<number>(1.0)
  const [overrideReason, setOverrideReason] = useState<string>('')
  const [overrideExpires, setOverrideExpires] = useState<number>(30)
  const [overrideAppliesTo, setOverrideAppliesTo] = useState<string>('all')
  const [submittingOverride, setSubmittingOverride] = useState(false)
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null)
  const [overrideError, setOverrideError] = useState<string | null>(null)

  // Mobile: show form in modal
  const [showMobileForm, setShowMobileForm] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [sd, ov] = await Promise.all([
        dispatchService.getSupply(),
        dispatchService.getSurgeOverrides({ limit: 20 }),
      ])
      setSupplyData(sd)
      setOverrides(ov)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const interval = setInterval(() => { loadData() }, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleZoneClick = (zone: SupplyZone) => {
    setSelectedZone(zone)
    setOverrideZoneId(zone.zone_id)
    setOverrideZoneName(zone.zone_name)
    if (isMobile) setShowMobileForm(true)
  }

  const handleSubmitOverride = async () => {
    if (!overrideZoneId || !overrideReason) return
    setSubmittingOverride(true)
    setOverrideError(null)
    setOverrideSuccess(null)
    try {
      await dispatchService.createSurgeOverride({
        zone_id: overrideZoneId,
        zone_name: overrideZoneName,
        multiplier: overrideMultiplier,
        reason: overrideReason,
        expires_in_minutes: overrideExpires,
        applies_to: overrideAppliesTo,
      })
      setOverrideSuccess('Override applied successfully')
      setOverrideReason('')
      setOverrideMultiplier(1.0)
      await loadData()
      if (isMobile) setShowMobileForm(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to apply override'
      setOverrideError(msg)
    } finally {
      setSubmittingOverride(false)
    }
  }

  const stats = supplyData?.stats
  const zones = supplyData?.zones ?? []

  const overrideForm = (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--rule)',
      borderRadius: 8,
      padding: 20,
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>Manual override</div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label">Zone</label>
        <select
          className="input"
          value={overrideZoneId}
          onChange={e => {
            const zone = zones.find(z => z.zone_id === e.target.value)
            setOverrideZoneId(e.target.value)
            setOverrideZoneName(zone?.zone_name ?? '')
          }}
        >
          <option value="">Select zone…</option>
          {zones.map(z => (
            <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>
          ))}
        </select>
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label">
          Surge multiplier: <strong>{overrideMultiplier.toFixed(1)}×</strong>
        </label>
        <input
          type="range"
          min={1.0} max={2.0} step={0.1}
          value={overrideMultiplier}
          onChange={e => setOverrideMultiplier(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-3)' }}>
          <span>1.0×</span><span>2.0×</span>
        </div>
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label">Reason</label>
        <input
          className="input"
          value={overrideReason}
          onChange={e => setOverrideReason(e.target.value)}
          placeholder="e.g. Driver shift change · evening peak"
        />
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label">Expires in (minutes)</label>
        <input
          className="input"
          type="number"
          value={overrideExpires}
          onChange={e => setOverrideExpires(parseInt(e.target.value) || 30)}
          min={5} max={480}
        />
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label className="field-label">Applies to</label>
        <select
          className="input"
          value={overrideAppliesTo}
          onChange={e => setOverrideAppliesTo(e.target.value)}
        >
          <option value="all">All classes</option>
          <option value="sedan">Sedan</option>
          <option value="suv">SUV</option>
          <option value="xl">XL</option>
        </select>
      </div>

      {/* Audit warning */}
      <div style={{
        background: 'rgba(230, 81, 0, 0.06)',
        border: '1px solid rgba(230, 81, 0, 0.2)',
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: 11,
        color: 'var(--ink-2)',
        marginBottom: 16,
      }}>
        ⚠ This action will be audit-logged with your admin identity.
        Surge overrides affect fare pricing for all new bookings in this zone.
      </div>

      {overrideError && (
        <div style={{ fontSize: 11, color: 'var(--danger, #d32f2f)', marginBottom: 10 }}>
          {overrideError}
        </div>
      )}
      {overrideSuccess && (
        <div style={{ fontSize: 11, color: '#0F8A5F', marginBottom: 10 }}>
          {overrideSuccess}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn accent"
          style={{ flex: 1 }}
          onClick={handleSubmitOverride}
          disabled={submittingOverride || !overrideZoneId || !overrideReason}
        >
          {submittingOverride ? 'Applying…' : 'Apply override'}
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            setOverrideReason('')
            setOverrideMultiplier(1.0)
            setOverrideZoneId('')
            setOverrideZoneName('')
            setOverrideSuccess(null)
            setOverrideError(null)
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )

  return (
    <Shell
      activeId="dispatch"
      breadcrumb="Operations · Live · Supply"
      title="Supply & surge monitor"
      subtitle="Real-time driver supply and demand by zone"
      actions={
        isMobile ? (
          <button className="btn accent sm" onClick={() => setShowMobileForm(true)}>
            + Override
          </button>
        ) : undefined
      }
    >
      {/* Hero KPI strip */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
          gap: 12, marginBottom: 24,
        }}>
          {[
            { label: 'Online drivers', value: stats.online_drivers_total },
            { label: 'Live demand', value: stats.live_demand },
            { label: 'D/S ratio', value: stats.ds_ratio.toFixed(2) },
            { label: 'Active surge', value: stats.active_surge_zones },
            { label: 'Capped zones', value: stats.capped_zones_count },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'var(--surface)',
              border: '1px solid var(--rule)',
              borderRadius: 8,
              padding: '14px 16px',
            }}>
              <div className="t-meta" style={{ fontSize: 11, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main content: heatmap + form */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile || isTablet ? '1fr' : '1fr 320px',
        gap: 20,
        marginBottom: 24,
      }}>
        {/* Zone heatmap */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Zone demand heatmap</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: 12,
          }}>
            {zones.map(zone => (
              <div
                key={zone.zone_id}
                onClick={() => handleZoneClick(zone)}
                style={{
                  background: zoneToneColor(zone.ds_ratio),
                  border: `1px solid ${zoneToneBorder(zone.ds_ratio)}`,
                  borderRadius: 8, padding: '14px 16px',
                  cursor: 'pointer',
                  outline: selectedZone?.zone_id === zone.zone_id ? `2px solid #0F8A5F` : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{zone.zone_name}</span>
                  {zone.is_capped && (
                    <span className="badge warn" style={{ fontSize: 9 }}>CAPPED</span>
                  )}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-serif, serif)', lineHeight: 1 }}>
                  {zone.ds_ratio.toFixed(2)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, display: 'flex', gap: 8 }}>
                  <span>↑ {zone.demand} demand</span>
                  <span>⟳ {zone.online_drivers} drivers</span>
                </div>
                {zone.surge_multiplier > 1.0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#e65100', marginTop: 4 }}>
                    {zone.surge_multiplier.toFixed(1)}× surge
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Override form — desktop/tablet */}
        {!isMobile && overrideForm}
      </div>

      {/* Override history */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
        borderRadius: 8,
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', fontWeight: 600, fontSize: 13 }}>
          Override history
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="tbl" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th className="t-label">When</th>
                <th className="t-label">Zone</th>
                <th className="t-label">Multiplier</th>
                <th className="t-label">Duration</th>
                <th className="t-label">By</th>
                <th className="t-label">Reason</th>
                <th className="t-label">Bookings affected</th>
              </tr>
            </thead>
            <tbody>
              {overrides.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24, fontSize: 13 }}>
                    No override history
                  </td>
                </tr>
              )}
              {overrides.map(ov => (
                <tr key={ov.id}>
                  <td style={{ fontSize: 12 }}>{fmtDate(ov.created_at)}</td>
                  <td style={{ fontSize: 12 }}>{ov.zone_name}</td>
                  <td style={{ fontSize: 12, fontWeight: 600 }}>{ov.multiplier.toFixed(1)}×</td>
                  <td style={{ fontSize: 12 }}>{ov.duration_minutes ?? '—'} min</td>
                  <td style={{ fontSize: 12 }}>{ov.created_by_name}</td>
                  <td style={{ fontSize: 12, maxWidth: 200 }}>{ov.reason}</td>
                  <td style={{ fontSize: 12 }}>{ov.bookings_affected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile override modal */}
      {isMobile && showMobileForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 500, overflowY: 'auto',
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '12px 12px 0 0',
            padding: 20, width: '100%', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Manual override</span>
              <button className="btn ghost sm" onClick={() => setShowMobileForm(false)}>✕</button>
            </div>
            {overrideForm}
          </div>
        </div>
      )}
    </Shell>
  )
}
