import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { vehicleService } from '../../services/vehicleService'
import type { Vendor, VendorStatus } from '../../services/vehicleService'
import { formatMonthYear, useCurrencySymbol } from '../../lib/utils'

// ── Vendor Detail / Edit modal ────────────────────────────────────────────────

function VendorDetailModal({
  vendor,
  onClose,
  onSaved,
}: {
  vendor: Vendor
  onClose: () => void
  onSaved: (updated: Vendor) => void
}) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: vendor.name,
    city: vendor.city ?? '',
    phone: vendor.phone ?? '',
    email: vendor.email ?? '',
    commission_rate: String(vendor.commission_rate),
    commission_type: vendor.commission_type,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    const rate = parseFloat(form.commission_rate)
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setError('Commission rate must be between 0 and 100')
      return
    }
    setSaving(true); setError('')
    try {
      const updated = await vehicleService.updateVendor(vendor.id, {
        name: form.name.trim() || undefined,
        city: form.city.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        commission_rate: rate,
        commission_type: form.commission_type,
      })
      onSaved(updated)
      setEditing(false)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to update vendor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 500, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>{vendor.name}</h3>
            <div style={{ marginTop: 3, fontSize: 12, color: 'var(--ink-3)' }}>Fleet operator profile</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!editing && (
              <button className="btn sm ghost" onClick={() => setEditing(true)}>
                <Icon name="pencil" size={12} />Edit
              </button>
            )}
            <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={14} /></button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {editing ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Company name<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
                <div className="input">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">City</label>
                <div className="input">
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Bangalore" />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Phone</label>
                <div className="input">
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
                </div>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Email</label>
                <div className="input">
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ops@vendor.com" />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Commission rate (%)</label>
                <div className="input">
                  <input type="number" value={form.commission_rate} min={0} max={100} step={0.5} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Commission type</label>
                <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                  <select value={form.commission_type} onChange={e => setForm(f => ({ ...f, commission_type: e.target.value }))}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}>
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat per trip</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                ['Company name',    vendor.name],
                ['City',           vendor.city ?? '—'],
                ['Phone',          vendor.phone ?? '—'],
                ['Email',          vendor.email ?? '—'],
                ['Commission',     `${vendor.commission_rate}% (${vendor.commission_type})`],
                ['Status',         vendor.status],
                ['Vehicles',       String(vendor.vehicle_count)],
                ['Drivers',        String(vendor.driver_count)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)' }}>
                  <div className="t-label" style={{ padding: 0, marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink)' }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', gap: 8, background: 'var(--surface-2)' }}>
          <button className="btn sm ghost" onClick={() => { navigate(`/vehicles?owner_vendor_id=${vendor.id}`); onClose() }}>
            <Icon name="car" size={12} />View vehicles
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? (
              <>
                <button className="btn sm" onClick={() => { setEditing(false); setError('') }} disabled={saving}>Cancel</button>
                <button className="btn sm accent" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              </>
            ) : (
              <button className="btn sm" onClick={onClose}>Close</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return formatMonthYear(iso)
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function VendorStatusBadge({ status }: { status: VendorStatus }) {
  if (status === 'active')    return <span className="badge ok"><span className="dot ok" />Active</span>
  if (status === 'review')    return <span className="badge warn"><span className="dot warn" />Review</span>
  if (status === 'suspended') return <span className="badge danger"><span className="dot danger" />Suspended</span>
  return <span className="badge">{status}</span>
}

// ── Ground/Suspend modal ──────────────────────────────────────────────────────

function SuspendModal({ vendor, onConfirm, onCancel }: { vendor: Vendor; onConfirm: (r: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)', padding: '24px 24px 20px' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Suspend {vendor.name}</h3>
        <div className="input">
          <input
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for suspension…"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button className="btn sm danger" onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={!reason.trim()}>
            Suspend vendor
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClassSlice { label: string; pct: number; color: string }

// ── Vendor card ───────────────────────────────────────────────────────────────

function VendorCard({
  vendor,
  composition,
  fleetShare,
  onActivate,
  onSuspend,
  onOpenFile,
  onNotice,
}: {
  vendor: Vendor
  composition: ClassSlice[]
  fleetShare: string
  onActivate: (v: Vendor) => void
  onSuspend: (v: Vendor) => void
  onOpenFile: (v: Vendor) => void
  onNotice: (msg: string) => void
}) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--rule)',
      padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 3,
          background: 'var(--surface-sunk)',
          border: '1px solid var(--rule-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink-2)',
          flexShrink: 0,
        }}>
          {getInitials(vendor.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, letterSpacing: '-0.014em' }}>{vendor.name}</h3>
            <VendorStatusBadge status={vendor.status} />
          </div>
          <div className="t-meta" style={{ marginTop: 4 }}>
            {vendor.city ?? '—'} · partner since {formatDate(vendor.joined_at)}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, background: 'var(--surface-2)', border: '1px solid var(--rule)' }}>
        {([
          ['Vehicles', vendor.vehicle_count],
          ['Drivers',  vendor.driver_count],
          ['Share',    fleetShare],
        ] as [string, number | string][]).map(([k, n], j) => (
          <div key={k} style={{ padding: '12px 14px', borderRight: j < 2 ? '1px solid var(--rule)' : 'none' }}>
            <div className="t-label" style={{ padding: 0 }}>{k}</div>
            <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>{n}</div>
          </div>
        ))}
      </div>

      {/* Composition bar */}
      <div>
        <div className="t-label" style={{ padding: 0, marginBottom: 8 }}>Composition</div>
        {composition.length === 0 ? (
          <div className="t-meta" style={{ color: 'var(--ink-4)' }}>No vehicles yet</div>
        ) : (
          <>
            <div style={{ display: 'flex', height: 8, borderRadius: 2, overflow: 'hidden', background: 'var(--rule)' }}>
              {composition.map(s => (
                <div key={s.label} style={{ width: `${s.pct}%`, background: s.color }} title={`${s.label} ${s.pct}%`} />
              ))}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
              {composition.map(s => (
                <span key={s.label}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, background: s.color, marginRight: 5 }} />
                  {s.label} {s.pct}%
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Commission + Last payout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
        <div>
          <div className="t-label" style={{ padding: 0 }}>Commission</div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
            {vendor.commission_rate}% · {vendor.commission_type}
          </div>
        </div>
        <div>
          <div className="t-label" style={{ padding: 0 }}>Last payout</div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', fontSize: 11 }}>
            — · Payouts module coming soon
          </div>
        </div>
      </div>

      {/* Contact info */}
      {(vendor.phone || vendor.email) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
          {vendor.phone && (
            <div>
              <div className="t-label" style={{ padding: 0 }}>Phone</div>
              <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', fontSize: 12 }}>{vendor.phone}</div>
            </div>
          )}
          {vendor.email && (
            <div>
              <div className="t-label" style={{ padding: 0 }}>Email</div>
              <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', fontSize: 12 }}>{vendor.email}</div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
        <button className="btn sm" style={{ flex: 1 }} onClick={() => onOpenFile(vendor)}>
          Open file
        </button>
        <button className="btn sm" onClick={() => onNotice('Financial statements are available in the Payouts module — coming soon.')}>
          Statements
        </button>
        <button className="btn sm" onClick={() => onNotice('Driver filtering by vendor will be available once the Drivers module supports vendor scoping.')}>
          Drivers
        </button>
        {vendor.status === 'review' && (
          <button className="btn sm accent" onClick={() => onActivate(vendor)}>Activate</button>
        )}
        {vendor.status === 'active' && (
          <button
            className="btn sm"
            style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 40%, var(--rule))' }}
            onClick={() => onSuspend(vendor)}
          >
            Suspend
          </button>
        )}
        {vendor.status === 'suspended' && (
          <button className="btn sm accent" onClick={() => onActivate(vendor)}>Reactivate</button>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VendorDirectoryPage() {
  const navigate = useNavigate()
  const isMobile  = useIsMobile()
  const isTablet  = useIsTablet()
  const sym = useCurrencySymbol()

  const [vendors, setVendors]     = useState<Vendor[]>([])
  const [totalFleet, setTotalFleet] = useState(0)
  const [loading, setLoading]     = useState(true)
  const [apiError, setApiError]   = useState('')
  const [notice, setNotice]       = useState('')
  const [suspendPending, setSuspendPending] = useState<Vendor | null>(null)
  const [openFileVendor, setOpenFileVendor] = useState<Vendor | null>(null)
  const [compositionMap, setCompositionMap] = useState<Record<string, ClassSlice[]>>({})

  const CLASS_COLORS = ['var(--ink-2)', 'var(--accent)', 'var(--info)', 'var(--warn)']

  const loadVendors = async () => {
    setLoading(true)
    try {
      const [data, fleetData] = await Promise.all([
        vehicleService.listVendors({ per_page: 100 }),
        vehicleService.listVehicles({ per_page: 1 }),   // just need total count
      ])
      setVendors(data.items)
      setTotalFleet(fleetData.total)
      setApiError('')

      // Load all vendor vehicles to compute composition
      try {
        const vehData = await vehicleService.listVehicles({ owner_type: 'vendor', per_page: 100 })
        const raw: Record<string, Record<string, number>> = {}
        for (const v of vehData.items) {
          if (!v.owner_vendor_id) continue
          if (!raw[v.owner_vendor_id]) raw[v.owner_vendor_id] = {}
          const cls = v.vehicle_class_name ?? 'Other'
          raw[v.owner_vendor_id][cls] = (raw[v.owner_vendor_id][cls] ?? 0) + 1
        }
        const comp: Record<string, ClassSlice[]> = {}
        for (const [vendorId, classes] of Object.entries(raw)) {
          const total = Object.values(classes).reduce((s, n) => s + n, 0)
          comp[vendorId] = Object.entries(classes).map(([label, count], i) => ({
            label,
            pct: Math.round((count / total) * 100),
            color: CLASS_COLORS[i % CLASS_COLORS.length],
          }))
        }
        setCompositionMap(comp)
      } catch { /* composition is non-critical */ }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadVendors() }, [])

  const handleActivate = async (vendor: Vendor) => {
    try {
      await vehicleService.activateVendor(vendor.id)
      await loadVendors()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to activate vendor')
    }
  }

  const handleSuspend = async (reason: string) => {
    if (!suspendPending) return
    try {
      await vehicleService.suspendVendor(suspendPending.id, reason)
      await loadVendors()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to suspend vendor')
    }
    setSuspendPending(null)
  }

  const handleExport = () => {
    const headers = ['Name', 'City', 'Phone', 'Email', 'Status', 'Commission', 'Vehicles', 'Drivers', 'Joined']
    const rows = vendors.map(v => [
      v.name,
      v.city ?? '',
      v.phone ?? '',
      v.email ?? '',
      v.status,
      `${v.commission_rate}%`,
      v.vehicle_count,
      v.driver_count,
      formatDate(v.joined_at),
    ])
    const csv = [headers, ...rows].map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vendors-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const activeVendors  = vendors.filter(v => v.status === 'active')
  const totalVehicles  = vendors.reduce((s, v) => s + v.vehicle_count, 0)
  const topVendor      = vendors.reduce<Vendor | null>((top, v) => (!top || v.vehicle_count > top.vehicle_count) ? v : top, null)
  const fleetSharePct  = totalFleet > 0 ? ((totalVehicles / totalFleet) * 100).toFixed(1) + '%' : '—'
  const topVendorSharePct = (totalFleet > 0 && topVendor) ? ((topVendor.vehicle_count / totalFleet) * 100).toFixed(1) + '%' : '—'
  const vendorShare    = (vendor: Vendor) => totalFleet > 0 ? ((vendor.vehicle_count / totalFleet) * 100).toFixed(1) + '%' : '—'

  return (
    <Shell
      activeId="vehicles"
      breadcrumb="People & Fleet · Vehicles · Fleet owners"
      title="Fleet owners & vendors"
      subtitle={`${activeVendors.length} active vendors · ${totalVehicles} vehicles under management`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={handleExport}><Icon name="download" size={13} />Export</button>
          <button className="btn sm" onClick={() => setNotice('Vendor agreement template download is available in a future update.')}>Vendor agreement template</button>
          <button className="btn sm accent" onClick={() => navigate('/vehicles/vendors/new')}>
            <Icon name="plus" size={13} />Onboard vendor
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* API error */}
        {apiError && (
          <div style={{
            padding: '10px 14px', background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span>{apiError}</span>
            <button className="btn ghost icon sm" onClick={() => setApiError('')}><Icon name="x" size={12} /></button>
          </div>
        )}

        {/* Coming-soon notice */}
        {notice && (
          <div style={{
            padding: '10px 14px', background: 'var(--surface-2)',
            border: '1px solid var(--rule-strong)',
            borderRadius: 3, fontSize: 12.5, color: 'var(--ink-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span>ℹ️ {notice}</span>
            <button className="btn ghost icon sm" onClick={() => setNotice('')}><Icon name="x" size={12} /></button>
          </div>
        )}

        {/* Hero strip */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
          {[
            { l: 'Active vendors',       v: String(activeVendors.length),             m: `${vendors.length} total`,                                          tone: 'var(--ink)' },
            { l: 'Fleet share',          v: fleetSharePct,                             m: `${totalVehicles} vehicles · ${vendors.reduce((s,v)=>s+v.driver_count,0)} drv`, tone: 'var(--accent)' },
            { l: 'Top vendor share',     v: topVendorSharePct,                         m: topVendor ? `${topVendor.name} · ${topVendor.vehicle_count} veh` : '—',         tone: 'var(--ink-2)' },
            { l: 'Vendor payouts · MTD', v: `${sym}—`,                                   m: 'Payouts module coming soon',                                                   tone: 'var(--ink)' },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: '20px 22px', borderRight: isMobile ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none') : (i < 3 ? '1px solid var(--rule)' : 'none'), borderTop: isMobile && i >= 2 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{s.l}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 22 : 30, fontWeight: 400, letterSpacing: '-0.018em' }}>{s.v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: s.tone }}>{s.m}</div>
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading vendors…</div>}

        {/* Vendor cards grid */}
        {!loading && vendors.length === 0 && (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            No vendors yet. Onboard your first fleet partner.
          </div>
        )}

        {!loading && vendors.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : '1fr 1fr', gap: 16 }}>
            {vendors.map(v => (
              <VendorCard
                key={v.id}
                vendor={v}
                composition={compositionMap[v.id] ?? []}
                fleetShare={vendorShare(v)}
                onActivate={handleActivate}
                onSuspend={ven => setSuspendPending(ven)}
                onOpenFile={ven => setOpenFileVendor(ven)}
                onNotice={setNotice}
              />
            ))}
          </div>
        )}
      </div>

      {/* Suspend modal */}
      {suspendPending && (
        <SuspendModal
          vendor={suspendPending}
          onConfirm={handleSuspend}
          onCancel={() => setSuspendPending(null)}
        />
      )}

      {/* Vendor detail / edit modal */}
      {openFileVendor && (
        <VendorDetailModal
          vendor={openFileVendor}
          onClose={() => setOpenFileVendor(null)}
          onSaved={updated => {
            setVendors(vs => vs.map(v => v.id === updated.id ? updated : v))
            setOpenFileVendor(updated)
          }}
        />
      )}
    </Shell>
  )
}
