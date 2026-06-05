import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { vehicleService } from '../../services/vehicleService'
import type { Vehicle, VehicleStatus, VehicleDocStatus } from '../../services/vehicleService'
import { catalogService } from '../../services/catalogService'
import type { VehicleClass } from '../../services/catalogService'
import { getUserTimezone } from '../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatOdometer(km: number): string {
  return km.toLocaleString('en-IN') + ' km'
}

function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  if (status === 'active')    return <span className="badge ok"><span className="dot ok" />Active</span>
  if (status === 'pending')   return <span className="badge info"><span className="dot info" />Pending</span>
  if (status === 'suspended') return <span className="badge danger"><span className="dot danger" />Grounded</span>
  if (status === 'retired')   return <span className="badge"><span className="dot pending" />Retired</span>
  return <span className="badge">{status}</span>
}

function DocStatusBadge({ status, expHint }: { status: VehicleDocStatus; expHint?: string | null }) {
  const badge = status === 'ok'
    ? <span className="badge ok"><span className="dot ok" />OK</span>
    : status === 'expiring'
    ? <span className="badge warn"><span className="dot warn" />Expiring</span>
    : status === 'expired'
    ? <span className="badge danger"><span className="dot danger" />Expired</span>
    : status === 'rejected'
    ? <span className="badge danger"><span className="dot danger" />Rejected</span>
    : <span className="badge">{status}</span>

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {badge}
      {expHint && (
        <span className="t-meta" style={{ color: status === 'expired' ? 'var(--danger)' : 'var(--warn)' }}>
          · {expHint}
        </span>
      )}
    </div>
  )
}

// ── Row action menu ───────────────────────────────────────────────────────────

interface RowMenuProps {
  vehicle: Vehicle
  onGround: (v: Vehicle) => void
  onReactivate: (v: Vehicle) => void
}

function RowMenu({ vehicle, onGround, onReactivate }: RowMenuProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn ghost icon sm"
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
      >
        <Icon name="moreVert" size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--rule-strong)',
          boxShadow: 'var(--shadow-pop)', minWidth: 160, padding: '4px 0',
        }}>
          {vehicle.status === 'active' && (
            <button
              className="btn ghost"
              style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5, borderRadius: 0, justifyContent: 'flex-start', color: 'var(--danger)' }}
              onClick={e => { e.stopPropagation(); setOpen(false); onGround(vehicle) }}
            >
              Ground
            </button>
          )}
          {vehicle.status === 'suspended' && (
            <button
              className="btn ghost"
              style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5, borderRadius: 0, justifyContent: 'flex-start', color: 'var(--accent)' }}
              onClick={e => { e.stopPropagation(); setOpen(false); onReactivate(vehicle) }}
            >
              Reactivate
            </button>
          )}
          <button
            className="btn ghost"
            style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5, borderRadius: 0, justifyContent: 'flex-start' }}
            onClick={e => { e.stopPropagation(); setOpen(false); navigate(`/vehicles/${vehicle.id}`) }}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

// ── Ground modal ──────────────────────────────────────────────────────────────

function GroundModal({ vehicle, onConfirm, onCancel }: { vehicle: Vehicle; onConfirm: (r: string) => void; onCancel: () => void }) {
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
        <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Ground {vehicle.plate_no}</h3>
        <div className="input">
          <input
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for grounding…"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button className="btn sm danger" onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={!reason.trim()}>Ground vehicle</button>
        </div>
      </div>
    </div>
  )
}

// ── Add Vehicle modal ─────────────────────────────────────────────────────────

interface AddVehicleForm {
  plate_no: string
  make: string
  model: string
  year: string
  color: string
  fuel_type: string
  vehicle_class_id: string
  owner_type: string
  owner_vendor_id: string
}

function AddVehicleModal({
  classes,
  onClose,
  onCreated,
}: {
  classes: VehicleClass[]
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState<AddVehicleForm>({
    plate_no: '', make: '', model: '', year: String(new Date().getFullYear()),
    color: '', fuel_type: '', vehicle_class_id: '', owner_type: 'owner_driver', owner_vendor_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    vehicleService.listVendors({ per_page: 100 })
      .then(data => setVendors(data.items.map(v => ({ id: v.id, name: v.name }))))
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!form.plate_no.trim() || !form.make.trim() || !form.model.trim() || !form.vehicle_class_id) {
      setError('Plate, make, model, and vehicle class are required')
      return
    }
    const yr = parseInt(form.year, 10)
    if (isNaN(yr) || yr < 2000 || yr > new Date().getFullYear()) {
      setError(`Year must be between 2000 and ${new Date().getFullYear()}`)
      return
    }
    setSaving(true); setError('')
    try {
      await vehicleService.createVehicle({
        plate_no: form.plate_no.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: parseInt(form.year, 10),
        color: form.color.trim() || undefined,
        fuel_type: form.fuel_type.trim() || undefined,
        vehicle_class_id: form.vehicle_class_id,
        owner_type: form.owner_type as 'owner_driver' | 'vendor',
        owner_vendor_id: form.owner_type === 'vendor' ? (form.owner_vendor_id || undefined) : undefined,
      } as Parameters<typeof vehicleService.createVehicle>[0])
      onCreated()
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to create vehicle')
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
        style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>Add vehicle</h3>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && (
            <div style={{ padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Plate number<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
              <div className="input">
                <input
                  value={form.plate_no}
                  onChange={e => setForm(f => ({ ...f, plate_no: e.target.value }))}
                  placeholder="KA 05 MK 4271"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Make<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
              <div className="input">
                <input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} placeholder="Toyota" />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Model<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
              <div className="input">
                <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Etios" />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Year</label>
              <div className="input">
                <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} min={2000} max={new Date().getFullYear()} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Color</label>
              <div className="input">
                <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="White" />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Fuel type</label>
              <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                <select
                  value={form.fuel_type}
                  onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value }))}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                >
                  <option value="">Select fuel type</option>
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="cng">CNG</option>
                  <option value="electric">Electric</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Vehicle class<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
              <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                <select
                  value={form.vehicle_class_id}
                  onChange={e => setForm(f => ({ ...f, vehicle_class_id: e.target.value }))}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                >
                  <option value="">Select class…</option>
                  {classes.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Owner type</label>
              <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                <select
                  value={form.owner_type}
                  onChange={e => setForm(f => ({ ...f, owner_type: e.target.value, owner_vendor_id: '' }))}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                >
                  <option value="owner_driver">Owner-driver</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
            </div>
            {form.owner_type === 'vendor' && (
              <div className="field">
                <label className="field-label">Vendor</label>
                <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                  <select
                    value={form.owner_vendor_id}
                    onChange={e => setForm(f => ({ ...f, owner_vendor_id: e.target.value }))}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                  >
                    <option value="">Select vendor…</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface-2)' }}>
          <button className="btn sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn sm accent" onClick={handleSave} disabled={saving}>
            {saving ? 'Adding…' : 'Add vehicle'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Mobile card view ──────────────────────────────────────────────────────────

function VehicleCard({ vehicle, onClick }: { vehicle: Vehicle; onClick: () => void }) {
  const initials = (vehicle.make + ' ' + vehicle.model).split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
  return (
    <div
      style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule-soft)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div className="avatar" style={{ background: 'var(--surface-sunk)', color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{vehicle.plate_no}</div>
        <div className="t-meta" style={{ marginTop: 2 }}>{vehicle.make} {vehicle.model} · {vehicle.year}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
          <VehicleStatusBadge status={vehicle.status} />
          <DocStatusBadge status={vehicle.doc_status} />
        </div>
      </div>
      <Icon name="chevRight" size={14} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type TabKey = 'all' | 'active' | 'docs_expiring' | 'docs_expired' | 'grounded' | 'unlinked'

export default function VehicleDirectoryPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const isMobile  = useIsMobile()
  const isTablet  = useIsTablet()

  const [vehicles, setVehicles]         = useState<Vehicle[]>([])
  const [total, setTotal]               = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading]           = useState(true)
  const [apiError, setApiError]         = useState('')

  const [activeTab, setActiveTab]         = useState<TabKey>('all')
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState('')
  const [docStatusFilter, setDocStatusFilter] = useState('')
  const [classFilter, setClassFilter]     = useState('')
  const [ownerTypeFilter, setOwnerTypeFilter] = useState('')
  const [yearMin, setYearMin]             = useState('')
  const [page, setPage]                   = useState(1)
  const [ownerVendorId, setOwnerVendorId] = useState('')

  const [groundPending, setGroundPending] = useState<Vehicle | null>(null)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([])
  const [notice, setNotice] = useState('')

  const [sortField, setSortField]   = useState<'plate' | 'make' | 'year' | 'odometer'>('plate')
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('asc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  const loadVehicles = async (opts?: { tab?: TabKey; q?: string; status?: string; docStatus?: string; classId?: string; ownerType?: string; yearMin?: string; p?: number; vendorId?: string }) => {
    setLoading(true)
    try {
      const tab        = opts?.tab       ?? activeTab
      const q          = opts?.q         ?? search
      const status     = opts?.status    ?? statusFilter
      const docSt      = opts?.docStatus ?? docStatusFilter
      const classId    = opts?.classId   !== undefined ? opts.classId   : classFilter
      const ownerType  = opts?.ownerType !== undefined ? opts.ownerType : ownerTypeFilter
      const yearMn     = opts?.yearMin   !== undefined ? opts.yearMin   : yearMin
      const pg         = opts?.p         ?? page
      const vendorId   = opts?.vendorId  !== undefined ? opts.vendorId  : ownerVendorId

      const params: Record<string, string | number | boolean> = { page: pg, per_page: 25 }
      if (q)          params.search = q
      if (status)     params.status = status
      if (docSt)      params.doc_status = docSt
      if (classId)    params.vehicle_class_id = classId
      if (ownerType)  params.owner_type = ownerType
      if (yearMn)     params.year_min = parseInt(yearMn, 10)
      if (vendorId)   params.owner_vendor_id = vendorId

      // Tab-based filters
      if (tab === 'active')        params.status = 'active'
      if (tab === 'docs_expiring') params.doc_status = 'expiring'
      if (tab === 'docs_expired')  params.doc_status = 'expired'
      if (tab === 'grounded')      params.status = 'suspended'
      if (tab === 'unlinked')      params.linked_driver_id = ''

      const data = await vehicleService.listVehicles(params)
      setVehicles(data.items)
      setTotal(data.total)
      setStatusCounts(data.status_counts)
      setApiError('')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to load vehicles')
    } finally {
      setLoading(false)
    }
  }

  // Load vehicle classes once on mount
  useEffect(() => {
    catalogService.listVehicleClasses()
      .then(setVehicleClasses)
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-apply vendor filter whenever the URL query string changes (handles navigation from VendorDirectoryPage)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const vendorId = params.get('owner_vendor_id') ?? ''
    setOwnerVendorId(vendorId)
    loadVehicles({ vendorId })
  }, [location.search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => loadVehicles({ q: search, p: 1 }), 350)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showSortMenu) return
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSortMenu])

  const handleTab = (tab: TabKey) => {
    setActiveTab(tab)
    setPage(1)
    loadVehicles({ tab, p: 1 })
  }

  const handleGround = async (reason: string) => {
    if (!groundPending) return
    try {
      await vehicleService.groundVehicle(groundPending.id, reason)
      await loadVehicles()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to ground vehicle')
    }
    setGroundPending(null)
  }

  const handleReactivate = async (vehicle: Vehicle) => {
    try {
      await vehicleService.reactivateVehicle(vehicle.id)
      await loadVehicles()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to reactivate vehicle')
    }
  }

  const handleExport = () => {
    const headers = ['Plate', 'Make', 'Model', 'Year', 'Color', 'Fuel', 'Class', 'Owner Type', 'Vendor', 'Driver', 'Odometer', 'Doc Status', 'Status']
    const rows = vehicles.map(v => [
      v.plate_no,
      v.make,
      v.model,
      v.year,
      v.color ?? '',
      v.fuel_type ?? '',
      v.vehicle_class_name ?? '',
      v.owner_type,
      v.owner_vendor_name ?? '',
      v.linked_driver_name ?? '',
      v.odometer_km,
      v.doc_status,
      v.status,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vehicles-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const SORT_OPTIONS: { key: 'plate' | 'make' | 'year' | 'odometer'; label: string }[] = [
    { key: 'plate',    label: 'Plate ↑' },
    { key: 'make',     label: 'Make' },
    { key: 'year',     label: 'Year ↓' },
    { key: 'odometer', label: 'Odometer ↓' },
  ]

  const sortedVehicles = [...vehicles].sort((a, b) => {
    let cmp = 0
    if (sortField === 'plate')    cmp = a.plate_no.localeCompare(b.plate_no)
    else if (sortField === 'make')     cmp = (a.make + ' ' + a.model).localeCompare(b.make + ' ' + b.model)
    else if (sortField === 'year')     cmp = a.year - b.year
    else if (sortField === 'odometer') cmp = a.odometer_km - b.odometer_km
    return sortDir === 'desc' ? -cmp : cmp
  })

  const TABS: { key: TabKey; label: string; tone?: string }[] = [
    { key: 'all',           label: 'All vehicles' },
    { key: 'active',        label: 'Active',          tone: 'var(--accent)' },
    { key: 'docs_expiring', label: 'Docs expiring',   tone: 'var(--warn)' },
    { key: 'docs_expired',  label: 'Docs expired',    tone: 'var(--danger)' },
    { key: 'grounded',      label: 'Grounded',        tone: 'var(--danger)' },
    { key: 'unlinked',      label: 'Unlinked',        tone: 'var(--pending)' },
  ]

  const countFor = (key: TabKey): number => {
    if (key === 'all')           return statusCounts['all'] ?? total
    if (key === 'active')        return statusCounts['active'] ?? 0
    if (key === 'docs_expiring') return statusCounts['docs_expiring'] ?? 0
    if (key === 'docs_expired')  return statusCounts['docs_expired'] ?? 0
    if (key === 'grounded')      return statusCounts['grounded'] ?? 0
    if (key === 'unlinked')      return statusCounts['unlinked'] ?? 0
    return 0
  }

  const activeCount  = statusCounts['active'] ?? 0
  const expiringCount = statusCounts['docs_expiring'] ?? 0
  const groundedCount = statusCounts['grounded'] ?? 0

  return (
    <Shell
      activeId="vehicles"
      breadcrumb="People & Fleet · Vehicles"
      title="Vehicle directory"
      subtitle={`${activeCount.toLocaleString()} active · ${expiringCount.toLocaleString()} expiring docs · ${groundedCount.toLocaleString()} grounded`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={handleExport}><Icon name="download" size={13} />Export</button>
          <button className="btn sm" onClick={() => setNotice('Bulk inspection is available in a future update.')}>Bulk inspect</button>
          <button className="btn sm accent" onClick={() => setShowAddVehicle(true)}>
            <Icon name="plus" size={13} />Add vehicle
          </button>
          <button className="btn sm" onClick={() => navigate('/vendors')}>Fleet owners</button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

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

        {/* Fleet owner filter chip */}
        {ownerVendorId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Filtered by fleet owner:</span>
            <span className="badge info" style={{ fontSize: 12 }}>
              {vehicles[0]?.owner_vendor_name ?? 'Vendor'}&nbsp;
              <button
                className="btn ghost icon"
                style={{ width: 14, height: 14, minWidth: 0, padding: 0, marginLeft: 4 }}
                onClick={() => { setOwnerVendorId(''); loadVehicles({ vendorId: '' }); navigate('/vehicles', { replace: true }) }}
              >
                <Icon name="x" size={10} />
              </button>
            </span>
          </div>
        )}

        {/* Segmented tabs */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : isTablet ? 'repeat(4, 1fr)' : 'repeat(6, 1fr)',
        }}>
          {TABS.map((v, i) => {
            const active = activeTab === v.key
            return (
              <div
                key={v.key}
                onClick={() => handleTab(v.key)}
                style={{
                  padding: isMobile ? '12px 10px' : '14px 18px',
                  borderRight: isMobile ? (i % 3 !== 2 ? '1px solid var(--rule)' : 'none') : (i < 5 ? '1px solid var(--rule)' : 'none'),
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  borderTop: isMobile && i >= 3 ? '1px solid var(--rule)' : 'none',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5, color: active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: active ? 500 : 400 }}>{v.label}</span>
                  {v.tone && !active && <span className="dot" style={{ background: v.tone }} />}
                </div>
                <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 18 : 22, fontWeight: 400, letterSpacing: '-0.018em' }}>
                  {countFor(v.key).toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Filter bar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0,
          padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <div className="input" style={{ width: isMobile ? '100%' : 280, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input
              placeholder="Plate, make/model, owner, driver…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {!isMobile && (
            <>
              {/* Class filter */}
              <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10, minWidth: 130 }}>
                <select
                  value={classFilter}
                  onChange={e => { setClassFilter(e.target.value); loadVehicles({ classId: e.target.value, p: 1 }) }}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                >
                  <option value="">All classes</option>
                  {vehicleClasses.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {/* Owner type filter */}
              <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10, minWidth: 130 }}>
                <select
                  value={ownerTypeFilter}
                  onChange={e => { setOwnerTypeFilter(e.target.value); loadVehicles({ ownerType: e.target.value, p: 1 }) }}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                >
                  <option value="">All owners</option>
                  <option value="owner_driver">Owner-driver</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              {/* Year filter */}
              <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10, minWidth: 100 }}>
                <select
                  value={yearMin}
                  onChange={e => { setYearMin(e.target.value); loadVehicles({ yearMin: e.target.value, p: 1 }) }}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                >
                  <option value="">Any year</option>
                  {[2020, 2021, 2022, 2023, 2024, 2025].map(y => (
                    <option key={y} value={String(y)}>{y}+</option>
                  ))}
                </select>
              </div>
              {/* Status filter */}
              <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10, minWidth: 120 }}>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); loadVehicles({ status: e.target.value, p: 1 }) }}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Grounded</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              {/* Doc status filter */}
              <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10, minWidth: 100 }}>
                <select
                  value={docStatusFilter}
                  onChange={e => { setDocStatusFilter(e.target.value); loadVehicles({ docStatus: e.target.value, p: 1 }) }}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                >
                  <option value="">All docs</option>
                  <option value="ok">OK</option>
                  <option value="expiring">Expiring</option>
                  <option value="expired">Expired</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              {/* Clear all active filters */}
              {(classFilter || ownerTypeFilter || yearMin || statusFilter || docStatusFilter) && (
                <button
                  className="btn ghost sm"
                  style={{ fontSize: 12, color: 'var(--danger)', flexShrink: 0 }}
                  onClick={() => {
                    setClassFilter(''); setOwnerTypeFilter(''); setYearMin('')
                    setStatusFilter(''); setDocStatusFilter('')
                    loadVehicles({ classId: '', ownerType: '', yearMin: '', status: '', docStatus: '', p: 1 })
                  }}
                >
                  Clear filters
                </button>
              )}
            </>
          )}
          <div style={{ flex: 1 }} />
          <div ref={sortRef} style={{ position: 'relative' }}>
            <button className="btn sm ghost" onClick={() => setShowSortMenu(v => !v)}>
              Sort · {SORT_OPTIONS.find(o => o.key === sortField)?.label} {sortDir === 'desc' ? '↓' : '↑'}
            </button>
            {showSortMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 200,
                background: 'var(--surface)', border: '1px solid var(--rule-strong)',
                boxShadow: 'var(--shadow-pop)', minWidth: 170, padding: '4px 0',
              }}>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className="btn ghost"
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5,
                      borderRadius: 0, justifyContent: 'space-between',
                      color: sortField === opt.key ? 'var(--accent)' : undefined,
                    }}
                    onClick={() => {
                      if (sortField === opt.key) {
                        setSortDir(d => d === 'desc' ? 'asc' : 'desc')
                      } else {
                        setSortField(opt.key)
                        setSortDir(opt.key === 'odometer' || opt.key === 'year' ? 'desc' : 'asc')
                      }
                      setShowSortMenu(false)
                    }}
                  >
                    <span>{opt.label}</span>
                    {sortField === opt.key && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          {loading && <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>}

          {/* Mobile card view */}
          {!loading && isMobile && (
            <div>
              {vehicles.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  {(search || statusFilter || docStatusFilter || classFilter || ownerTypeFilter || yearMin) ? 'No vehicles match your filters.' : 'No vehicles yet.'}
                </div>
              ) : sortedVehicles.map(v => (
                <VehicleCard key={v.id} vehicle={v} onClick={() => navigate(`/vehicles/${v.id}`)} />
              ))}
            </div>
          )}

          {/* Desktop table */}
          {!loading && !isMobile && (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}><input type="checkbox" /></th>
                    <th>Plate · Vehicle</th>
                    <th>Class</th>
                    <th>Year</th>
                    <th>Owner</th>
                    <th>Linked driver</th>
                    <th>Documents</th>
                    <th>Odometer</th>
                    <th>Status</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {vehicles.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                        {(search || statusFilter || docStatusFilter || classFilter || ownerTypeFilter || yearMin) ? 'No vehicles match your filters.' : 'No vehicles yet.'}
                      </td>
                    </tr>
                  ) : sortedVehicles.map(v => (
                    <tr
                      key={v.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/vehicles/${v.id}`)}
                    >
                      <td onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36, height: 24, borderRadius: 2,
                            background: 'var(--ink)', color: 'var(--surface)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.05em',
                            border: '1px solid var(--ink)', flexShrink: 0,
                          }}>
                            {v.plate_no.split(' ')[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{v.plate_no}</div>
                            <div className="t-meta" style={{ marginTop: 2 }}>{v.make} {v.model}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge"><Icon name="car" size={10} />{v.vehicle_class_name ?? '—'}</span>
                      </td>
                      <td className="num">{v.year}</td>
                      <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                        {v.owner_type === 'owner_driver' ? 'Owner-driver' : (v.owner_vendor_name ?? 'Vendor')}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                        {v.linked_driver_name ?? <span className="t-meta">—</span>}
                      </td>
                      <td>
                        <DocStatusBadge status={v.doc_status} />
                      </td>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{formatOdometer(v.odometer_km)}</td>
                      <td><VehicleStatusBadge status={v.status} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        <RowMenu
                          vehicle={v}
                          onGround={veh => setGroundPending(veh)}
                          onReactivate={handleReactivate}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {!loading && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--surface-2)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="t-meta">
                  Showing <span style={{ color: 'var(--ink-2)' }}>{((page - 1) * 25) + 1}–{Math.min(page * 25, total)}</span> of{' '}
                  <span style={{ color: 'var(--ink-2)' }}>{total.toLocaleString()}</span>
                </div>
                <div className="t-meta" style={{ color: 'var(--ink-4)' }}>
                  Expiry job runs daily at 02:00 {getUserTimezone()} · auto-grounds on expiry
                </div>
              </div>
              {total > 25 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn ghost sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); loadVehicles({ p: page - 1 }) }}>← Prev</button>
                  <button className="btn ghost sm" disabled={page >= Math.ceil(total / 25)} onClick={() => { setPage(p => p + 1); loadVehicles({ p: page + 1 }) }}>Next →</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ground modal */}
      {groundPending && (
        <GroundModal
          vehicle={groundPending}
          onConfirm={handleGround}
          onCancel={() => setGroundPending(null)}
        />
      )}

      {/* Add vehicle modal */}
      {showAddVehicle && (
        <AddVehicleModal
          classes={vehicleClasses}
          onClose={() => setShowAddVehicle(false)}
          onCreated={() => loadVehicles()}
        />
      )}
    </Shell>
  )
}
