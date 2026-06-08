import { useState, useEffect, useRef } from 'react'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { vehicleService } from '../../services/vehicleService'
import type { VehicleDetail, VehicleDocument, VehicleMaintenance, VehicleDocType, VehicleOwnerType, MaintenanceStatus } from '../../services/vehicleService'
import { catalogService } from '../../services/catalogService'
import type { VehicleClass } from '../../services/catalogService'
import { driverService } from '../../services/driverService'
import type { Driver } from '../../services/driverService'
import { auditService } from '../../services/auditService'
import type { AuditEventSummary } from '../../services/auditService'
import { formatDate, useCurrencySymbol } from '../../lib/utils'
import { kycService } from '../../services/kycService'
import type { DocTypeItem } from '../../services/kycService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATIC_BASE = import.meta.env.VITE_API_BASE_URL
  ? (import.meta.env.VITE_API_BASE_URL as string).replace('/api/v1', '')
  : 'http://localhost:8001'

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null
  const diff = new Date(isoDate).getTime() - Date.now()
  return Math.ceil(diff / (24 * 3600 * 1000))
}


// ── Reason modal ──────────────────────────────────────────────────────────────

interface ReasonModalProps {
  title: string
  placeholder: string
  confirmLabel?: string
  variant?: 'danger' | 'accent'
  onConfirm: (reason: string) => void
  onCancel: () => void
}

function ReasonModal({ title, placeholder, confirmLabel = 'Confirm', variant = 'accent', onConfirm, onCancel }: ReasonModalProps) {
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
        <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>{title}</h3>
        <div className="input">
          <input
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={placeholder}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button
            className={`btn sm ${variant}`}
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Link Driver search modal ───────────────────────────────────────────────────

function LinkDriverSearchModal({ onConfirm, onCancel }: { onConfirm: (driverId: string) => void; onCancel: () => void }) {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<Driver[]>([])
  const [selected, setSelected]     = useState<Driver | null>(null)
  const [searching, setSearching]   = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await driverService.listDrivers({ search: query.trim(), per_page: 10 })
        setResults(data.items)
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Link driver</h3>
          <button className="btn ghost icon sm" onClick={onCancel}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: '16px 24px' }}>
          {selected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--accent-soft-2)', border: '1px solid var(--accent)', borderRadius: 3 }}>
              <div className="avatar" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                {selected.name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5 }}>{selected.name}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>{selected.driver_code ?? selected.phone}</div>
              </div>
              <button className="btn ghost icon sm" onClick={() => setSelected(null)}><Icon name="x" size={12} /></button>
            </div>
          ) : (
            <>
              <div className="input">
                <Icon name="search" size={14} className="icon" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name or phone…"
                />
              </div>
              {searching && (
                <div style={{ padding: '8px 4px', color: 'var(--ink-3)', fontSize: 12.5 }}>Searching…</div>
              )}
              {!searching && results.length > 0 && (
                <div style={{ marginTop: 6, border: '1px solid var(--rule)', background: 'var(--surface)', maxHeight: 200, overflowY: 'auto' }}>
                  {results.map(d => (
                    <div
                      key={d.id}
                      style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--rule-soft)', display: 'flex', alignItems: 'center', gap: 10 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => { setSelected(d); setQuery(''); setResults([]) }}
                    >
                      <div className="avatar sm" style={{ background: 'var(--surface-sunk)', color: 'var(--ink-2)', fontSize: 10 }}>
                        {d.name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{d.name}</div>
                        <div className="t-meta" style={{ marginTop: 1 }}>{d.driver_code ?? d.phone} · {d.vehicle_class ?? '—'}</div>
                      </div>
                      <span className="badge ok" style={{ fontSize: 10.5 }}>{d.status}</span>
                    </div>
                  ))}
                </div>
              )}
              {!searching && query.trim() && results.length === 0 && (
                <div style={{ padding: '8px 4px', color: 'var(--ink-3)', fontSize: 12.5 }}>No drivers found.</div>
              )}
            </>
          )}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface-2)' }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button className="btn sm accent" disabled={!selected} onClick={() => selected && onConfirm(selected.id)}>
            Link driver
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Vehicle modal ────────────────────────────────────────────────────────

function EditVehicleModal({ vehicle, classes, onConfirm, onCancel }: {
  vehicle: VehicleDetail
  classes: VehicleClass[]
  onConfirm: (updates: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const currentYear = new Date().getFullYear()
  const [form, setForm] = useState({
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year),
    color: vehicle.color ?? '',
    fuel_type: vehicle.fuel_type ?? '',
    vehicle_class_id: vehicle.vehicle_class_id,
    owner_type: vehicle.owner_type,
    owner_vendor_id: vehicle.owner_vendor_id ?? '',
    odometer_km: String(vehicle.odometer_km),
  })
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isForbidden, setIsForbidden] = useState(false)

  useEffect(() => {
    vehicleService.listVendors({ per_page: 100 })
      .then(data => setVendors(data.items.map(v => ({ id: v.id, name: v.name }))))
      .catch(() => {})
  }, [])

  const handleSave = () => {
    const year = parseInt(form.year, 10)
    if (isNaN(year) || year < 2000 || year > currentYear) {
      setError(`Year must be between 2000 and ${currentYear}`)
      return
    }
    if (!form.make.trim() || !form.model.trim()) {
      setError('Make and model are required')
      return
    }
    setSaving(true); setError('')
    onConfirm({
      make: form.make.trim(),
      model: form.model.trim(),
      year,
      color: form.color.trim() || null,
      fuel_type: form.fuel_type || null,
      vehicle_class_id: form.vehicle_class_id,
      owner_type: form.owner_type,
      owner_vendor_id: form.owner_type === 'vendor' ? (form.owner_vendor_id || null) : null,
      odometer_km: parseInt(form.odometer_km, 10) || 0,
    })
    setSaving(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Edit · {vehicle.plate_no}</h3>
          <button className="btn ghost icon sm" onClick={onCancel}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>{error}</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Make</label>
              <div className="input">
                <input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} placeholder="Toyota" />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Model</label>
              <div className="input">
                <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Etios" />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Year</label>
              <div className="input">
                <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} min={2000} max={currentYear} />
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
                <select value={form.fuel_type} onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value }))}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}>
                  <option value="">Select fuel type</option>
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="cng">CNG</option>
                  <option value="electric">Electric</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Odometer (km)</label>
              <div className="input">
                <input type="number" value={form.odometer_km} onChange={e => setForm(f => ({ ...f, odometer_km: e.target.value }))} min={0} />
              </div>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Vehicle class</label>
              <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                <select value={form.vehicle_class_id} onChange={e => setForm(f => ({ ...f, vehicle_class_id: e.target.value }))}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}>
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
                <select value={form.owner_type} onChange={e => setForm(f => ({ ...f, owner_type: e.target.value as VehicleOwnerType, owner_vendor_id: '' }))}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}>
                  <option value="owner_driver">Owner-driver</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
            </div>
            {form.owner_type === 'vendor' && (
              <div className="field">
                <label className="field-label">Vendor</label>
                <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                  <select value={form.owner_vendor_id} onChange={e => setForm(f => ({ ...f, owner_vendor_id: e.target.value }))}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}>
                    <option value="">Select vendor…</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface-2)' }}>
          <button className="btn sm" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="btn sm accent" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Add Maintenance modal ─────────────────────────────────────────────────────

function AddMaintenanceModal({ onConfirm, onCancel }: {
  onConfirm: (body: Partial<VehicleMaintenance>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({ milestone_label: '', milestone_km: '', scheduled_date: '', service_center: '', notes: '' })
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Add service record</h3>
          <button className="btn ghost icon sm" onClick={onCancel}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label className="field-label">Milestone label<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
            <div className="input">
              <input value={form.milestone_label} onChange={e => setForm(f => ({ ...f, milestone_label: e.target.value }))} placeholder="90,000 km service" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Milestone km</label>
              <div className="input">
                <input type="number" value={form.milestone_km} onChange={e => setForm(f => ({ ...f, milestone_km: e.target.value }))} placeholder="90000" />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Scheduled date</label>
              <div className="input">
                <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Service center</label>
            <div className="input">
              <input value={form.service_center} onChange={e => setForm(f => ({ ...f, service_center: e.target.value }))} placeholder="Toyota MASS · Indiranagar" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Notes</label>
            <div className="input">
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Full drivetrain check…" />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface-2)' }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button
            className="btn sm accent"
            onClick={() => {
              if (!form.milestone_label.trim()) return
              onConfirm({
                milestone_label: form.milestone_label.trim(),
                milestone_km: form.milestone_km ? parseInt(form.milestone_km, 10) : undefined,
                scheduled_date: form.scheduled_date || undefined,
                service_center: form.service_center.trim() || undefined,
                notes: form.notes.trim() || undefined,
                status: 'pending',
              })
            }}
            disabled={!form.milestone_label.trim()}
          >
            Add record
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Maintenance modal ────────────────────────────────────────────────────

function EditMaintenanceModal({ maint, onConfirm, onCancel }: {
  maint: VehicleMaintenance
  onConfirm: (body: Partial<VehicleMaintenance>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    milestone_label: maint.milestone_label,
    milestone_km: maint.milestone_km ? String(maint.milestone_km) : '',
    scheduled_date: maint.scheduled_date ?? '',
    service_center: maint.service_center ?? '',
    notes: maint.notes ?? '',
    status: maint.status,
  })

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Edit service record</h3>
          <button className="btn ghost icon sm" onClick={onCancel}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label className="field-label">Milestone label<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
            <div className="input">
              <input value={form.milestone_label} onChange={e => setForm(f => ({ ...f, milestone_label: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Milestone km</label>
              <div className="input">
                <input type="number" value={form.milestone_km} onChange={e => setForm(f => ({ ...f, milestone_km: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Scheduled date</label>
              <div className="input">
                <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Service center</label>
            <div className="input">
              <input value={form.service_center} onChange={e => setForm(f => ({ ...f, service_center: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Notes</label>
            <div className="input">
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Status</label>
            <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as MaintenanceStatus }))}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}>
                <option value="pending">Pending</option>
                <option value="done">Done</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface-2)' }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button
            className="btn sm accent"
            onClick={() => {
              if (!form.milestone_label.trim()) return
              onConfirm({
                milestone_label: form.milestone_label.trim(),
                milestone_km: form.milestone_km ? parseInt(form.milestone_km, 10) : undefined,
                scheduled_date: form.scheduled_date || undefined,
                service_center: form.service_center.trim() || undefined,
                notes: form.notes.trim() || undefined,
                status: form.status as VehicleMaintenance['status'],
              })
            }}
            disabled={!form.milestone_label.trim()}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Change Class modal ────────────────────────────────────────────────────────

function ChangeClassModal({ classes, onConfirm, onCancel }: {
  classes: VehicleClass[]
  onConfirm: (classId: string) => void
  onCancel: () => void
}) {
  const [classId, setClassId] = useState('')
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)', padding: '24px 24px 20px' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Change vehicle class</h3>
        <div className="field">
          <label className="field-label">New class</label>
          <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
            <select
              value={classId}
              onChange={e => setClassId(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
            >
              <option value="">Select class…</option>
              {classes.filter(c => c.is_active).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button className="btn sm accent" onClick={() => classId && onConfirm(classId)} disabled={!classId}>
            Reassign class
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Document modal ────────────────────────────────────────────────────────

function AddDocumentModal({ onConfirm, onCancel, docTypeOptions }: {
  onConfirm: (body: { doc_type: VehicleDocType; doc_number?: string; issued_date?: string; expiry_date?: string }) => void
  onCancel: () => void
  docTypeOptions: DocTypeItem[]
}) {
  const [form, setForm] = useState({ doc_type: docTypeOptions[0]?.key ?? '', doc_number: '', issued_date: '', expiry_date: '' })
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Add document</h3>
          <button className="btn ghost icon sm" onClick={onCancel}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label className="field-label">Document type</label>
            <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
              <select
                value={form.doc_type}
                onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
              >
                {docTypeOptions.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Document number</label>
            <div className="input">
              <input value={form.doc_number} onChange={e => setForm(f => ({ ...f, doc_number: e.target.value }))} placeholder="e.g. KA0520210084231" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Issued date</label>
              <div className="input">
                <input type="date" value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Expiry date</label>
              <div className="input">
                <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface-2)' }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button
            className="btn sm accent"
            onClick={() => onConfirm({
              doc_type: form.doc_type as VehicleDocType,
              doc_number: form.doc_number.trim() || undefined,
              issued_date: form.issued_date || undefined,
              expiry_date: form.expiry_date || undefined,
            })}
          >
            Add document
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Doc Review modal ──────────────────────────────────────────────────────────

function DocReviewModal({ doc, action, onConfirm, onCancel }: {
  doc: VehicleDocument
  action: 'approve' | 'reject' | 'request_reupload'
  onConfirm: (opts: { action: string; expiry_date?: string | null; review_note?: string | null }) => void
  onCancel: () => void
}) {
  const [expiryDate, setExpiryDate] = useState(doc.expiry_date ?? '')
  const [note, setNote] = useState(doc.review_note ?? '')

  const isApprove = action === 'approve'
  const isReject  = action === 'reject'
  const title = isApprove ? 'Approve document' : isReject ? 'Reject document' : 'Request re-upload'
  const confirmLabel = isApprove ? 'Approve' : isReject ? 'Reject' : 'Request re-upload'
  const btnClass = isApprove ? 'btn sm accent' : 'btn sm danger'

  const canSubmit = isApprove ? true : note.trim().length > 0

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)', padding: '24px 24px 20px' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>{title}</h3>
        <div className="t-meta" style={{ marginBottom: 16 }}>{docTypeOptions.find(o => o.key === doc.doc_type)?.label ?? doc.doc_type}</div>

        {isApprove && (
          <div className="field" style={{ marginBottom: 12 }}>
            <label className="field-label">Confirm expiry date</label>
            <div className="input">
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            </div>
          </div>
        )}

        <div className="field">
          <label className="field-label">
            Note
            {!isApprove && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
            {isApprove && <span style={{ color: 'var(--ink-3)', marginLeft: 4 }}>(optional)</span>}
          </label>
          <div className="input">
            <input
              autoFocus={!isApprove}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={isApprove ? 'Optional note…' : isReject ? 'Reason for rejection…' : 'Reason for requesting re-upload…'}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button
            className={btnClass}
            disabled={!canSubmit}
            onClick={() => onConfirm({
              action,
              expiry_date: isApprove ? (expiryDate || null) : null,
              review_note: note.trim() || null,
            })}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Doc Actions menu ──────────────────────────────────────────────────────────

function DocActionsMenu({ doc, onReview }: {
  doc: VehicleDocument
  onReview: (d: VehicleDocument, a: 'approve' | 'reject' | 'request_reupload') => void
}) {
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
      <button className="btn ghost icon sm" title="Review actions" onClick={e => { e.stopPropagation(); setOpen(v => !v) }}>
        <Icon name="moreVert" size={13} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 300,
          background: 'var(--surface)', border: '1px solid var(--rule-strong)',
          boxShadow: 'var(--shadow-pop)', minWidth: 170, padding: '4px 0',
        }}>
          <button className="btn ghost" style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, borderRadius: 0, justifyContent: 'flex-start', color: 'var(--accent)' }}
            onClick={() => { setOpen(false); onReview(doc, 'approve') }}>
            ✓ Approve
          </button>
          <button className="btn ghost" style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, borderRadius: 0, justifyContent: 'flex-start', color: 'var(--danger)' }}
            onClick={() => { setOpen(false); onReview(doc, 'reject') }}>
            ✗ Reject
          </button>
          <button className="btn ghost" style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, borderRadius: 0, justifyContent: 'flex-start' }}
            onClick={() => { setOpen(false); onReview(doc, 'request_reupload') }}>
            ↺ Request re-upload
          </button>
        </div>
      )}
    </div>
  )
}

// ── Documents tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ vehicle, onVehicleUpdate }: { vehicle: VehicleDetail; onVehicleUpdate: () => void }) {
  const [docs, setDocs]           = useState<VehicleDocument[]>(vehicle.documents)
  const [error, setError]         = useState('')
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [reviewTarget, setReviewTarget] = useState<{ doc: VehicleDocument; action: 'approve' | 'reject' | 'request_reupload' } | null>(null)
  const [docTypeOptions, setDocTypeOptions] = useState<DocTypeItem[]>([])

  useEffect(() => {
    kycService.getDocTypes().then(r => setDocTypeOptions(r.vehicle)).catch(() => {})
  }, [])

  const uploadRefs: Record<string, HTMLInputElement | null> = {}

  const reloadDocs = async () => {
    try {
      const data = await vehicleService.getDocuments(vehicle.id)
      setDocs(data.items)
      onVehicleUpdate()
    } catch { /* ignore */ }
  }

  const handleAddDoc = async (body: { doc_type: VehicleDocType; doc_number?: string; issued_date?: string; expiry_date?: string }) => {
    setError('')
    try {
      await vehicleService.createDocument(vehicle.id, body)
      await reloadDocs()
      setShowAddDoc(false)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to add document')
    }
  }

  const handleUpload = async (docId: string, file: File) => {
    setError('')
    try {
      await vehicleService.uploadDocumentImage(vehicle.id, docId, file)
      await reloadDocs()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setError(err?.response?.data?.detail || err?.response?.data?.message || 'Upload failed')
    }
  }

  const handleDocReview = async (opts: { action: string; expiry_date?: string | null; review_note?: string | null }) => {
    if (!reviewTarget) return
    setError('')
    try {
      await vehicleService.reviewDocument(vehicle.id, reviewTarget.doc.id, opts)
      await reloadDocs()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setError(err?.response?.data?.detail || err?.response?.data?.message || 'Review action failed')
    }
    setReviewTarget(null)
  }

  return (
    <>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="t-label">Documents · vehicle</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              {docs.length} document{docs.length !== 1 ? 's' : ''}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" onClick={() => setShowAddDoc(true)}>
              <Icon name="plus" size={12} />Add document
            </button>
          </div>
        </div>

        {error && (
          <div style={{ margin: '0 18px 12px', padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Document</th>
                <th>Number</th>
                <th>Issued</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Review</th>
                <th style={{ width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docTypeOptions.map(({ key: docType, label: docLabel }) => {
                const doc = docs.find(d => d.doc_type === docType)
                const days = doc ? daysUntil(doc.expiry_date) : null
                const expiryColor = days !== null && days < 0 ? 'var(--danger)' : days !== null && days < 30 ? 'var(--warn)' : 'var(--ink)'
                const barPercent = days !== null ? Math.max(0, Math.min(100, (days / 365) * 100)) : 0
                const barColor = days !== null && days < 0 ? 'var(--danger)' : days !== null && days < 30 ? 'var(--warn)' : 'var(--accent)'

                return (
                  <tr key={docType}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon name="shield" size={14} style={{ color: 'var(--ink-3)' }} />
                        <span style={{ fontSize: 13 }}>{docLabel}</span>
                      </div>
                    </td>
                    <td className="num" style={{ color: 'var(--ink-2)' }}>{doc?.doc_number ?? '—'}</td>
                    <td className="num" style={{ color: 'var(--ink-3)' }}>{formatDate(doc?.issued_date ?? null)}</td>
                    <td className="num" style={{ color: doc ? expiryColor : 'var(--ink-4)' }}>
                      {formatDate(doc?.expiry_date ?? null)}
                    </td>
                    <td>
                      {doc ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: barPercent + '%', height: '100%', background: barColor }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: barColor }}>
                            {days !== null ? (days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`) : '—'}
                          </span>
                        </div>
                      ) : (
                        <span className="t-meta" style={{ color: 'var(--ink-4)' }}>Not uploaded</span>
                      )}
                    </td>
                    <td>
                      {doc ? (
                        <div>
                          <span className={`badge ${doc.status === 'ok' ? 'ok' : doc.status === 'rejected' ? 'danger' : doc.status === 'expiring' ? 'warn' : ''}`} style={{ fontSize: 11 }}>
                            {doc.status}
                          </span>
                          {doc.review_note && (
                            <div style={{ marginTop: 4, fontSize: 11, color: doc.status === 'rejected' ? 'var(--danger)' : 'var(--ink-2)', maxWidth: 160, lineHeight: 1.3 }}>
                              {doc.review_note}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="t-meta">—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {doc?.image_url && (
                          <button className="btn ghost icon sm" title="View document" onClick={() => setLightboxUrl(doc.image_url ? STATIC_BASE + doc.image_url : null)}>
                            <Icon name="eye" size={13} />
                          </button>
                        )}
                        {doc && (
                          <>
                            <input
                              ref={el => { uploadRefs[doc.id] = el }}
                              type="file"
                              accept="image/*,application/pdf"
                              style={{ display: 'none' }}
                              onChange={async e => {
                                const file = e.target.files?.[0]
                                if (file) await handleUpload(doc.id, file)
                                e.target.value = ''
                              }}
                            />
                            <button
                              className="btn ghost icon sm"
                              title="Upload document"
                              onClick={() => uploadRefs[doc.id]?.click()}
                            >
                              <Icon name="upload" size={13} />
                            </button>
                            <DocActionsMenu
                              doc={doc}
                              onReview={(d, a) => setReviewTarget({ doc: d, action: a })}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Document" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 4 }} />
        </div>
      )}

      {showAddDoc && (
        <AddDocumentModal
          onConfirm={handleAddDoc}
          onCancel={() => setShowAddDoc(false)}
          docTypeOptions={docTypeOptions}
        />
      )}

      {reviewTarget && (
        <DocReviewModal
          doc={reviewTarget.doc}
          action={reviewTarget.action}
          onConfirm={handleDocReview}
          onCancel={() => setReviewTarget(null)}
        />
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'documents' | 'maintenance' | 'driver_history' | 'trips' | 'audit'

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const isTablet  = useIsTablet()
  const sym = useCurrencySymbol()

  const [vehicle, setVehicle]     = useState<VehicleDetail | null>(null)
  const [loading, setLoading]     = useState(true)
  const [isForbidden, setIsForbidden] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('documents')
  const handleTabChange = (key: TabKey) => {
    setActiveTab(key)
    if ((key === 'driver_history' || key === 'audit') && vehicle) {
      loadAuditEvents(vehicle.id)
    }
  }

  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([])
  const [apiError, setApiError]   = useState('')

  // Modal state
  const [showGroundModal, setShowGroundModal]           = useState(false)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog]       = useState(false)
  const [showUnlinkDialog, setShowUnlinkDialog]         = useState(false)
  const [showLinkDriverModal, setShowLinkDriverModal]   = useState(false)
  const [showAddMaintModal, setShowAddMaintModal]       = useState(false)
  const [showChangeClassModal, setShowChangeClassModal] = useState(false)
  const [showEditModal, setShowEditModal]               = useState(false)
  const [editingMaint, setEditingMaint]                 = useState<VehicleMaintenance | null>(null)
  const [deleteMaintTarget, setDeleteMaintTarget]       = useState<VehicleMaintenance | null>(null)

  // Vehicle image upload
  const vehicleImgRef = useRef<HTMLInputElement | null>(null)
  const [uploadingVehicleImg, setUploadingVehicleImg] = useState(false)

  // Audit / history tabs
  const [auditEvents, setAuditEvents]         = useState<AuditEventSummary[]>([])
  const [auditLoading, setAuditLoading]       = useState(false)
  const [auditLoaded, setAuditLoaded]         = useState(false)

  const loadAuditEvents = async (vehicleId: string) => {
    if (auditLoaded) return
    setAuditLoading(true)
    try {
      const res = await auditService.listEvents({ target: `vehicle:${vehicleId}`, per_page: 100, time_window: 'all' })
      setAuditEvents(res.items)
      setAuditLoaded(true)
    } catch { /* ignore — audit may not be accessible */ }
    finally { setAuditLoading(false) }
  }

  const loadVehicle = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await vehicleService.getVehicle(id)
      setVehicle(data)
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } }
      if (err?.response?.status === 403) setIsForbidden(true)
    }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadVehicle()
    catalogService.listVehicleClasses()
      .then(setVehicleClasses)
      .catch(() => {})
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGround = async (reason: string) => {
    if (!vehicle) return
    setApiError('')
    try {
      const updated = await vehicleService.groundVehicle(vehicle.id, reason)
      setVehicle(v => v ? { ...v, ...updated } : null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to ground vehicle')
    }
    setShowGroundModal(false)
  }

  const handleReactivate = async () => {
    if (!vehicle) return
    setApiError('')
    try {
      const updated = await vehicleService.reactivateVehicle(vehicle.id)
      setVehicle(v => v ? { ...v, ...updated } : null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to reactivate vehicle')
    }
    setShowReactivateDialog(false)
  }

  const handleApprove = async () => {
    if (!vehicle) return
    setApiError('')
    try {
      const updated = await vehicleService.approveVehicle(vehicle.id)
      setVehicle(v => v ? { ...v, ...updated } : null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to approve vehicle')
    }
    setShowApproveDialog(false)
  }

  const handleUnlink = async () => {
    if (!vehicle) return
    setApiError('')
    try {
      const updated = await vehicleService.unlinkDriver(vehicle.id)
      setVehicle(v => v ? { ...v, ...updated } : null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to unlink driver')
    }
    setShowUnlinkDialog(false)
  }

  const handleLinkDriver = async (driverId: string) => {
    if (!vehicle) return
    setApiError('')
    try {
      const updated = await vehicleService.linkDriver(vehicle.id, driverId)
      setVehicle(v => v ? { ...v, ...updated } : null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to link driver')
    }
    setShowLinkDriverModal(false)
  }

  const handleAddMaintenance = async (body: Partial<VehicleMaintenance>) => {
    if (!vehicle) return
    setApiError('')
    try {
      await vehicleService.createMaintenance(vehicle.id, body)
      await loadVehicle()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to add maintenance')
    }
    setShowAddMaintModal(false)
  }

  const handleEditMaintenance = async (body: Partial<VehicleMaintenance>) => {
    if (!vehicle || !editingMaint) return
    setApiError('')
    try {
      await vehicleService.updateMaintenance(vehicle.id, editingMaint.id, body)
      await loadVehicle()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to update maintenance')
    }
    setEditingMaint(null)
  }

  const handleDeleteMaintenance = async () => {
    if (!vehicle || !deleteMaintTarget) return
    setApiError('')
    try {
      await vehicleService.deleteMaintenance(vehicle.id, deleteMaintTarget.id)
      await loadVehicle()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to delete record')
    }
    setDeleteMaintTarget(null)
  }

  const handleChangeClass = async (classId: string) => {
    if (!vehicle) return
    setApiError('')
    try {
      const updated = await vehicleService.reassignClass(vehicle.id, classId)
      setVehicle(v => v ? { ...v, ...updated } : null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to change class')
    }
    setShowChangeClassModal(false)
  }

  const handleEditVehicle = async (updates: Record<string, unknown>) => {
    if (!vehicle) return
    setApiError('')
    try {
      const updated = await vehicleService.updateVehicle(vehicle.id, updates as Partial<typeof vehicle>)
      setVehicle(v => v ? { ...v, ...updated } : null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to update vehicle')
    }
    setShowEditModal(false)
  }

  const handleVehicleImageUpload = async (file: File) => {
    if (!vehicle) return
    setUploadingVehicleImg(true)
    try {
      await vehicleService.uploadVehicleImage(vehicle.id, file)
      // Silent refresh — get full VehicleDetail (includes documents/maintenances)
      // without touching the loading flag so the page doesn't flash to "Loading vehicle…"
      const fresh = await vehicleService.getVehicle(vehicle.id)
      setVehicle(fresh)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to upload vehicle image')
    }
    setUploadingVehicleImg(false)
  }

  if (isForbidden) return <AccessDeniedPage message="You don't have permission to access this page." />

  if (loading) {
    return (
      <Shell activeId="vehicles" breadcrumb="People & Fleet · Vehicles" title="Loading…">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading vehicle…</div>
      </Shell>
    )
  }

  if (!vehicle) {
    return (
      <Shell activeId="vehicles" breadcrumb="People & Fleet · Vehicles" title="Not found">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>
          Vehicle not found.{' '}
          <button className="btn sm ghost" onClick={() => navigate('/vehicles')}>← Back to vehicles</button>
        </div>
      </Shell>
    )
  }

  const pendingMaintenances = vehicle.maintenances
    .filter(m => m.status === 'pending')
    .sort((a, b) => {
      if (!a.scheduled_date) return 1
      if (!b.scheduled_date) return -1
      return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    })

  const lastService = vehicle.maintenances
    .filter(m => m.status === 'done')
    .sort((a, b) => {
      if (!a.completed_at) return 1
      if (!b.completed_at) return -1
      return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    })[0] ?? null

  const classInfo = vehicleClasses.find(c => c.id === vehicle.vehicle_class_id)

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview',       label: 'Overview' },
    { key: 'documents',      label: `Documents · ${vehicle.documents.length}` },
    { key: 'maintenance',    label: 'Maintenance' },
    { key: 'driver_history', label: 'Driver history' },
    { key: 'trips',          label: 'Trips' },
    { key: 'audit',          label: 'Audit' },
  ]

  return (
    <Shell
      activeId="vehicles"
      breadcrumb="People & Fleet · Vehicles"
      title={vehicle.plate_no}
      subtitle={`${vehicle.make} ${vehicle.model} · ${vehicle.vehicle_class_name ?? '—'} · ${vehicle.year}${vehicle.linked_driver_name ? ` · Linked to ${vehicle.linked_driver_name}` : ''}`}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {vehicle.status === 'pending' && (
            <button className="btn sm accent" onClick={() => setShowApproveDialog(true)}>
              <Icon name="check" size={13} />Approve
            </button>
          )}
          {vehicle.status === 'active' && (
            <button
              className="btn sm"
              style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 40%, var(--rule))' }}
              onClick={() => setShowGroundModal(true)}
            >
              Ground
            </button>
          )}
          {vehicle.status === 'suspended' && (
            <button className="btn sm accent" onClick={() => setShowReactivateDialog(true)}>
              Reactivate
            </button>
          )}
          {vehicle.linked_driver_id && (
            <button className="btn sm" onClick={() => setShowUnlinkDialog(true)}>Unlink driver</button>
          )}
          <button className="btn sm" onClick={() => setShowEditModal(true)}>Edit</button>
        </div>
      }
    >
      <div>
        {/* API error */}
        {apiError && (
          <div style={{
            margin: '12px 32px 0', padding: '10px 14px', background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span>{apiError}</span>
            <button className="btn ghost icon sm" onClick={() => setApiError('')}><Icon name="x" size={12} /></button>
          </div>
        )}

        {/* Hero card */}
        <div style={{
          background: 'var(--surface)', borderBottom: '1px solid var(--rule)',
          padding: isMobile ? '20px 16px' : '28px 32px',
          display: 'grid',
          gridTemplateColumns: isMobile || isTablet ? '1fr' : '420px 1fr',
          gap: 36,
        }}>
          {/* Left: Vehicle photo + plate */}
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            {/* Photo box */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 120, height: 80, borderRadius: 4,
                background: 'var(--surface-sunk)',
                border: '1px solid var(--rule-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {vehicle.image_url ? (
                  <img
                    src={STATIC_BASE + vehicle.image_url}
                    alt={vehicle.plate_no}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <svg viewBox="0 0 100 60" width="80" height="48">
                    <path d="M10 40 Q15 20 30 18 L65 18 Q78 18 84 30 L88 40 L88 46 L78 46 L78 44 A4 4 0 0 0 70 44 L70 46 L30 46 L30 44 A4 4 0 0 0 22 44 L22 46 L12 46 Z" fill="none" stroke="var(--ink)" strokeWidth="1.2" />
                    <circle cx="26" cy="46" r="4" fill="var(--ink)" />
                    <circle cx="74" cy="46" r="4" fill="var(--ink)" />
                    <line x1="30" y1="20" x2="64" y2="20" stroke="var(--ink-3)" strokeWidth="0.8" />
                  </svg>
                )}
              </div>
              {/* Upload overlay button */}
              <button
                title={uploadingVehicleImg ? 'Uploading…' : 'Upload vehicle photo'}
                style={{
                  position: 'absolute', bottom: 4, right: 4,
                  background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 3,
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0,
                }}
                onClick={() => vehicleImgRef.current?.click()}
                disabled={uploadingVehicleImg}
              >
                <Icon name="camera" size={12} style={{ color: '#fff' }} />
              </button>
              <input
                ref={vehicleImgRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (file) await handleVehicleImageUpload(file)
                  e.target.value = ''
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                {vehicle.status === 'active'    && <span className="badge ok"><span className="dot ok" />Active</span>}
                {vehicle.status === 'pending'   && <span className="badge info"><span className="dot info" />Pending</span>}
                {vehicle.status === 'suspended' && <span className="badge danger"><span className="dot danger" />Grounded</span>}
                {vehicle.status === 'retired'   && <span className="badge"><span className="dot pending" />Retired</span>}
                {vehicle.doc_status === 'ok'       && <span className="badge"><span className="dot ok" />All docs valid</span>}
                {vehicle.doc_status === 'expiring' && <span className="badge warn"><span className="dot warn" />Docs expiring</span>}
                {vehicle.doc_status === 'expired'  && <span className="badge danger"><span className="dot danger" />Docs expired</span>}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: isMobile ? 18 : 24, fontWeight: 500,
                background: 'var(--ink)', color: 'var(--surface)',
                padding: '6px 12px', display: 'inline-block', letterSpacing: '0.05em',
              }}>{vehicle.plate_no}</div>
              <div className="t-meta" style={{ marginTop: 8 }}>
                {[vehicle.make, vehicle.model, vehicle.vehicle_class_name, vehicle.color, vehicle.year, vehicle.fuel_type ? vehicle.fuel_type.charAt(0).toUpperCase() + vehicle.fuel_type.slice(1) : null].filter(Boolean).join(' · ')}
              </div>
              {/* Ground reason */}
              {vehicle.status === 'suspended' && vehicle.flag_reason && (
                <div style={{
                  marginTop: 8, padding: '6px 10px', background: 'color-mix(in oklab, var(--danger) 8%, var(--surface))',
                  border: '1px solid color-mix(in oklab, var(--danger) 25%, var(--rule))',
                  borderRadius: 3, fontSize: 12, color: 'var(--danger)',
                  maxWidth: 260,
                }}>
                  <span style={{ fontWeight: 500 }}>Grounded:</span> {vehicle.flag_reason}
                </div>
              )}
            </div>
          </div>

          {/* Right: Stats grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
            gap: 0, alignSelf: 'center',
          }}>
            {[
              { k: 'Odometer',      v: vehicle.odometer_km.toLocaleString('en-IN') + ' km', m: 'Total distance',        c: 'var(--ink)' },
              { k: 'Trips logged',  v: '0',      m: 'Links once Bookings module ships', c: 'var(--ink-2)' },
              { k: 'Gross fare',    v: `${sym}0`, m: 'Links once Payouts module ships',  c: 'var(--accent)' },
              { k: 'Last service',  v: lastService ? formatDate(lastService.completed_at) : '—', m: lastService?.service_center ?? 'No record', c: 'var(--ink-2)' },
              { k: 'Next service',  v: pendingMaintenances[0]?.milestone_label ?? '—',        m: pendingMaintenances[0]?.service_center ?? (pendingMaintenances[0]?.scheduled_date ? formatDate(pendingMaintenances[0].scheduled_date) : '—'), c: 'var(--ink-2)' },
            ].map(({ k, v, m, c }, i) => (
              <div key={k} style={{
                padding: isMobile ? '12px 10px' : '0 18px',
                borderRight: isMobile ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none') : (i < 4 ? '1px solid var(--rule)' : 'none'),
                borderTop: isMobile && i >= 2 ? '1px solid var(--rule)' : 'none',
              }}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: c }}>{v}</div>
                <div className="t-meta" style={{ marginTop: 6 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          padding: isMobile ? '0 4px' : '0 32px',
          borderBottom: '1px solid var(--rule)',
          background: 'var(--surface)',
          display: 'flex',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          {TABS.map(({ key, label }) => {
            const active = activeTab === key
            return (
              <div
                key={key}
                onClick={() => handleTabChange(key as TabKey)}
                style={{
                  padding: isMobile ? '12px 14px' : '14px 18px',
                  fontSize: 13,
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: active ? 500 : 400,
                  borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: -1,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {label}
              </div>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile || isTablet ? '1fr' : 'repeat(3, 1fr)',
              gap: 16,
            }}>
              {[
                ['Plate number', vehicle.plate_no],
                ['Make', vehicle.make],
                ['Model', vehicle.model],
                ['Year', String(vehicle.year)],
                ['Color', vehicle.color ?? '—'],
                ['Fuel type', vehicle.fuel_type ?? '—'],
                ['Vehicle class', vehicle.vehicle_class_name ?? '—'],
                ['Owner type', vehicle.owner_type === 'owner_driver' ? 'Owner-driver' : 'Vendor'],
                ['Vendor', vehicle.owner_vendor_name ?? '—'],
                ['Linked driver', vehicle.linked_driver_name ?? '—'],
                ['Odometer', vehicle.odometer_km.toLocaleString('en-IN') + ' km'],
                ['Status', vehicle.status],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 6, fontSize: 14, color: 'var(--ink)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : '1.6fr 1fr', gap: 24 }}>
            {/* Left: documents table */}
            <DocumentsTab vehicle={vehicle} onVehicleUpdate={loadVehicle} />

            {/* Right: side cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* Vehicle class card */}
              <div className="card" style={{ padding: '18px 20px' }}>
                <div className="t-label" style={{ marginBottom: 10 }}>Vehicle class</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--accent)', background: 'var(--accent-soft-2)', borderRadius: 3 }}>
                  <Icon name="car" size={16} style={{ color: 'var(--accent)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{vehicle.vehicle_class_name ?? '—'}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{classInfo?.description ?? (classInfo ? `${classInfo.seats} seats` : 'No description')}</div>
                  </div>
                  <button className="btn sm ghost" onClick={() => setShowChangeClassModal(true)}>
                    <Icon name="refresh" size={11} />Change
                  </button>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-3)' }}>
                  Class drives pricing rule, dispatch eligibility, and customer-facing display name. Reassigning is audit-logged.
                </div>
              </div>

              {/* Linked driver card */}
              <div className="card" style={{ padding: '18px 20px' }}>
                <div className="t-label" style={{ marginBottom: 10 }}>Linked driver</div>
                {vehicle.linked_driver_id ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        {vehicle.linked_driver_name
                          ? vehicle.linked_driver_name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
                          : 'DR'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14 }}>{vehicle.linked_driver_name}</div>
                        <div className="t-meta" style={{ marginTop: 2 }}>
                          {vehicle.linked_driver_code}{vehicle.linked_since ? ` · linked since ${formatDate(vehicle.linked_since)}` : ''}
                        </div>
                      </div>
                      <button
                        className="btn ghost icon sm"
                        onClick={() => vehicle.linked_driver_id && navigate(`/drivers/${vehicle.linked_driver_id}`)}
                      >
                        <Icon name="external" size={12} />
                      </button>
                    </div>
                    <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12, color: 'var(--ink-2)' }}>
                      Only one active driver per vehicle at a time. Unlinking ends the current shift and re-evaluates dispatch eligibility.
                    </div>
                    <button className="btn sm ghost" style={{ marginTop: 12 }} onClick={() => setShowUnlinkDialog(true)}>
                      Unlink driver
                    </button>
                  </>
                ) : (
                  <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
                    <div className="t-meta">No driver linked to this vehicle.</div>
                    <button className="btn sm accent" style={{ marginTop: 10 }} onClick={() => setShowLinkDriverModal(true)}>
                      <Icon name="plus" size={13} />Link driver
                    </button>
                  </div>
                )}
              </div>

              {/* Owner card */}
              <div className="card" style={{ padding: '18px 20px' }}>
                <div className="t-label" style={{ marginBottom: 10 }}>Owner</div>
                <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div style={{ fontSize: 13.5 }}>
                    {vehicle.owner_type === 'owner_driver' ? 'Owner-driver' : 'Vendor'}
                  </div>
                  <div className="t-meta" style={{ marginTop: 3 }}>
                    {vehicle.owner_type === 'owner_driver'
                      ? `Vehicle owned by ${vehicle.linked_driver_name ?? 'the driver'} personally · no fleet share`
                      : `Fleet vehicle · ${vehicle.owner_vendor_name ?? 'Vendor'}`
                    }
                  </div>
                </div>
              </div>

              {/* Upcoming maintenance card */}
              <div className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div className="t-label">Service · upcoming</div>
                  <button className="btn sm ghost" onClick={() => setShowAddMaintModal(true)}>
                    <Icon name="plus" size={11} />Add
                  </button>
                </div>
                {pendingMaintenances.length === 0 ? (
                  <div className="t-meta" style={{ color: 'var(--ink-3)' }}>No upcoming service records.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pendingMaintenances.slice(0, 3).map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 3, border: '1px solid var(--rule)' }}>
                        <span className="dot pending" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5 }}>{m.milestone_label}</div>
                          <div className="t-meta" style={{ marginTop: 2 }}>{m.service_center ?? (m.notes ?? '—')}</div>
                        </div>
                        <span className="t-meta" style={{ color: 'var(--ink-2)' }}>{formatDate(m.scheduled_date)}</span>
                        <button
                          className="btn ghost icon sm"
                          title="Edit service record"
                          onClick={() => setEditingMaint(m)}
                          style={{ flexShrink: 0 }}
                        >
                          <Icon name="pencil" size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              {/* Header */}
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="t-label">Service records · all</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                    {vehicle.maintenances.length} record{vehicle.maintenances.length !== 1 ? 's' : ''}
                  </h3>
                </div>
                <button className="btn sm" onClick={() => setShowAddMaintModal(true)}>
                  <Icon name="plus" size={12} />Add record
                </button>
              </div>

              {vehicle.maintenances.length === 0 ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  No service records yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Milestone</th>
                        <th>Scheduled</th>
                        <th>Completed</th>
                        <th>Service center</th>
                        <th>Notes</th>
                        <th>Status</th>
                        <th style={{ width: 72 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {[...vehicle.maintenances]
                        .sort((a, b) => {
                          // pending first, then by scheduled date desc
                          if (a.status === 'pending' && b.status !== 'pending') return -1
                          if (a.status !== 'pending' && b.status === 'pending') return 1
                          const aDate = a.scheduled_date ?? a.completed_at ?? ''
                          const bDate = b.scheduled_date ?? b.completed_at ?? ''
                          return bDate.localeCompare(aDate)
                        })
                        .map(m => (
                          <tr key={m.id}>
                            <td>
                              <div style={{ fontSize: 13 }}>{m.milestone_label}</div>
                              {m.milestone_km && (
                                <div className="t-meta" style={{ marginTop: 2 }}>
                                  {m.milestone_km.toLocaleString('en-IN')} km
                                </div>
                              )}
                            </td>
                            <td className="num" style={{ color: 'var(--ink-2)' }}>
                              {formatDate(m.scheduled_date)}
                            </td>
                            <td className="num" style={{ color: 'var(--ink-2)' }}>
                              {formatDate(m.completed_at ?? null)}
                            </td>
                            <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                              {m.service_center ?? <span className="t-meta">—</span>}
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--ink-3)', maxWidth: 180 }}>
                              {m.notes ?? <span className="t-meta">—</span>}
                            </td>
                            <td>
                              {m.status === 'pending'  && <span className="badge info"><span className="dot info" />Pending</span>}
                              {m.status === 'done'     && <span className="badge ok"><span className="dot ok" />Done</span>}
                              {m.status === 'skipped'  && <span className="badge"><span className="dot pending" />Skipped</span>}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  className="btn ghost icon sm"
                                  title="Edit"
                                  onClick={() => setEditingMaint(m)}
                                >
                                  <Icon name="pencil" size={12} />
                                </button>
                                <button
                                  className="btn ghost icon sm"
                                  title="Delete"
                                  style={{ color: 'var(--danger)' }}
                                  onClick={() => setDeleteMaintTarget(m)}
                                >
                                  <Icon name="trash" size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Driver history tab ── */}
        {activeTab === 'driver_history' && (
          <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Current driver card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)' }}>
                <span className="t-label">Current linked driver</span>
              </div>
              <div style={{ padding: '16px 20px' }}>
                {vehicle.linked_driver_id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'var(--accent-soft)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 600, flexShrink: 0,
                    }}>
                      {(vehicle.linked_driver_name ?? 'D').split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                        {vehicle.linked_driver_name ?? vehicle.linked_driver_code ?? vehicle.linked_driver_id}
                      </div>
                      {vehicle.linked_driver_code && (
                        <div className="t-meta" style={{ fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                          {vehicle.linked_driver_code}
                        </div>
                      )}
                      {vehicle.linked_since && (
                        <div className="t-meta" style={{ marginTop: 2 }}>
                          Linked since {formatDate(vehicle.linked_since)}
                        </div>
                      )}
                    </div>
                    <span className="badge ok" style={{ marginLeft: 'auto' }}><span className="dot ok" />Active link</span>
                  </div>
                ) : (
                  <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No driver currently linked to this vehicle.</div>
                )}
              </div>
            </div>

            {/* Link/unlink audit trail */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)' }}>
                <span className="t-label">Link / unlink history</span>
              </div>
              {auditLoading ? (
                <div style={{ padding: '24px 20px', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
              ) : (() => {
                const driverEvents = auditEvents.filter(e =>
                  e.action === 'vehicle.link_driver' || e.action === 'vehicle.unlink_driver'
                )
                if (driverEvents.length === 0) {
                  return (
                    <div style={{ padding: '24px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
                      No driver link/unlink events recorded yet.
                    </div>
                  )
                }
                return (
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Actor</th>
                          <th>When</th>
                          <th>IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {driverEvents.map(ev => (
                          <tr key={ev.id}>
                            <td>
                              <span style={{
                                fontFamily: 'var(--font-mono)', fontSize: 11,
                                padding: '2px 7px', borderRadius: 2,
                                background: ev.action === 'vehicle.link_driver' ? 'var(--accent-soft)' : 'color-mix(in oklab, var(--warn) 12%, var(--surface))',
                                color: ev.action === 'vehicle.link_driver' ? 'var(--accent)' : 'var(--warn)',
                                border: `1px solid ${ev.action === 'vehicle.link_driver' ? 'color-mix(in oklab, var(--accent) 28%, var(--rule))' : 'color-mix(in oklab, var(--warn) 28%, var(--rule))'}`,
                              }}>
                                {ev.action === 'vehicle.link_driver' ? 'Linked' : 'Unlinked'}
                              </span>
                              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--ink-3)' }}>{ev.target}</span>
                            </td>
                            <td style={{ fontSize: 13 }}>{ev.actor_name}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                              {new Date(ev.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                              {ev.source_ip ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* ── Trips tab ── */}
        {activeTab === 'trips' && (
          <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--rule)',
              padding: '40px 24px', textAlign: 'center',
            }}>
              <Icon name="route" size={28} style={{ color: 'var(--ink-4)', display: 'block', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>Trip history</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
                Trip records will appear here once the Bookings module links completed rides to this vehicle.
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  padding: '12px 20px', background: 'var(--surface-2)', border: '1px solid var(--rule)',
                  borderRadius: 4, textAlign: 'center', minWidth: 100,
                }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400 }}>0</div>
                  <div className="t-label" style={{ marginTop: 4 }}>Trips</div>
                </div>
                <div style={{
                  padding: '12px 20px', background: 'var(--surface-2)', border: '1px solid var(--rule)',
                  borderRadius: 4, textAlign: 'center', minWidth: 100,
                }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400 }}>{vehicle.odometer_km.toLocaleString('en-IN')}</div>
                  <div className="t-label" style={{ marginTop: 4 }}>Odometer km</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Audit tab ── */}
        {activeTab === 'audit' && (
          <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="t-label">All admin actions on this vehicle</span>
                {auditEvents.length > 0 && (
                  <span className="badge info">{auditEvents.length} events</span>
                )}
              </div>
              {auditLoading ? (
                <div style={{ padding: '24px 20px', color: 'var(--ink-3)', fontSize: 13 }}>Loading audit events…</div>
              ) : auditEvents.length === 0 ? (
                <div style={{ padding: '24px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
                  No audit events recorded for this vehicle yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ minWidth: 600 }}>
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Actor</th>
                        <th>Severity</th>
                        <th>When</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditEvents.map(ev => (
                        <tr key={ev.id}>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                              {ev.action}
                            </span>
                          </td>
                          <td style={{ fontSize: 13 }}>{ev.actor_name}</td>
                          <td>
                            {ev.severity === 'high' && <span className="badge danger"><span className="dot danger" />High</span>}
                            {ev.severity === 'med'  && <span className="badge warn"><span className="dot warn" />Med</span>}
                            {ev.severity === 'low'  && <span className="badge"><span className="dot" />Low</span>}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                            {new Date(ev.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                            {ev.source_ip ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showGroundModal && (
        <ReasonModal
          title={`Ground ${vehicle.plate_no}`}
          placeholder="Reason for grounding (required)…"
          confirmLabel="Ground vehicle"
          variant="danger"
          onConfirm={handleGround}
          onCancel={() => setShowGroundModal(false)}
        />
      )}

      <ConfirmDialog
        open={showReactivateDialog}
        title="Reactivate vehicle"
        description={`Restore ${vehicle.plate_no} to active service. It will be eligible for dispatch immediately.`}
        confirmLabel="Reactivate"
        variant="default"
        onConfirm={handleReactivate}
        onCancel={() => setShowReactivateDialog(false)}
      />

      <ConfirmDialog
        open={showApproveDialog}
        title="Approve vehicle"
        description={`Approve ${vehicle.plate_no} as an active vehicle. All required documents must be verified.`}
        confirmLabel="Approve vehicle"
        variant="default"
        onConfirm={handleApprove}
        onCancel={() => setShowApproveDialog(false)}
      />

      <ConfirmDialog
        open={showUnlinkDialog}
        title="Unlink driver"
        description={`Unlink ${vehicle.linked_driver_name ?? 'the driver'} from ${vehicle.plate_no}. This ends their current shift and re-evaluates dispatch eligibility.`}
        confirmLabel="Unlink driver"
        variant="danger"
        onConfirm={handleUnlink}
        onCancel={() => setShowUnlinkDialog(false)}
      />

      {showLinkDriverModal && (
        <LinkDriverSearchModal
          onConfirm={handleLinkDriver}
          onCancel={() => setShowLinkDriverModal(false)}
        />
      )}

      {showAddMaintModal && (
        <AddMaintenanceModal
          onConfirm={handleAddMaintenance}
          onCancel={() => setShowAddMaintModal(false)}
        />
      )}

      {editingMaint && (
        <EditMaintenanceModal
          maint={editingMaint}
          onConfirm={handleEditMaintenance}
          onCancel={() => setEditingMaint(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteMaintTarget}
        title="Delete service record"
        description={deleteMaintTarget ? `Delete "${deleteMaintTarget.milestone_label}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteMaintenance}
        onCancel={() => setDeleteMaintTarget(null)}
      />

      {showChangeClassModal && (
        <ChangeClassModal
          classes={vehicleClasses}
          onConfirm={handleChangeClass}
          onCancel={() => setShowChangeClassModal(false)}
        />
      )}

      {showEditModal && (
        <EditVehicleModal
          vehicle={vehicle}
          classes={vehicleClasses}
          onConfirm={handleEditVehicle}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </Shell>
  )
}
