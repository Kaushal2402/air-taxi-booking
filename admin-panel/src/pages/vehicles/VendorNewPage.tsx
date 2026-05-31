import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { vehicleService } from '../../services/vehicleService'

// ── Main page ─────────────────────────────────────────────────────────────────

interface VendorForm {
  name: string
  city: string
  phone: string
  email: string
  commission_rate: string
  commission_type: 'percentage' | 'flat'
  status: 'review' | 'active'
}

export default function VendorNewPage() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()

  const [form, setForm] = useState<VendorForm>({
    name: '',
    city: '',
    phone: '',
    email: '',
    commission_rate: '22',
    commission_type: 'percentage',
    status: 'review',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Company name is required')
      return
    }
    setSaving(true); setError('')
    try {
      await vehicleService.createVendor({
        name:            form.name.trim(),
        city:            form.city.trim()  || undefined,
        phone:           form.phone.trim() || undefined,
        email:           form.email.trim() || undefined,
        commission_rate: parseFloat(form.commission_rate) || 22,
        commission_type: form.commission_type,
        status:          form.status,
      })
      navigate('/vehicles/vendors')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to onboard vendor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell
      activeId="vehicles"
      breadcrumb="People & Fleet · Vehicles · Fleet owners · New vendor"
      title="Onboard vendor"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/vehicles/vendors')} disabled={saving}>Cancel</button>
          <button className="btn sm accent" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '16px' : '24px 32px', maxWidth: 720 }}>
        {/* Error banner */}
        {error && (
          <div style={{
            marginBottom: 20, padding: '10px 14px', background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span>{error}</span>
            <button className="btn ghost icon sm" onClick={() => setError('')}><Icon name="x" size={12} /></button>
          </div>
        )}

        {/* Company info section */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', marginBottom: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label" style={{ padding: 0 }}>Company info</div>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label className="field-label">Company name<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
              <div className="input">
                <input
                  autoFocus
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Yellow Wheels"
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label className="field-label">City</label>
                <div className="input">
                  <input
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Bengaluru"
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Phone</label>
                <div className="input">
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 98201 00000"
                  />
                </div>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <div className="input">
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="ops@yellowwheels.in"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Commercial section */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label" style={{ padding: 0 }}>Commercial</div>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 16 }}>
              <div className="field">
                <label className="field-label">Commission rate</label>
                <div className="input">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.commission_rate}
                    onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))}
                    placeholder="22"
                  />
                </div>
                <div style={{ marginTop: 5, fontSize: 12, color: 'var(--ink-3)' }}>
                  {form.commission_type === 'percentage' ? 'Percentage of fare' : 'Flat amount per trip'}
                </div>
              </div>
              <div className="field">
                <label className="field-label">Commission type</label>
                <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                  <select
                    value={form.commission_type}
                    onChange={e => setForm(f => ({ ...f, commission_type: e.target.value as 'percentage' | 'flat' }))}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Initial status</label>
                <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as 'review' | 'active' }))}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
                  >
                    <option value="review">Review (pending activation)</option>
                    <option value="active">Active (immediately)</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12, color: 'var(--ink-3)' }}>
              Commission rate and type can be adjusted later on the vendor file. Vendor agreement should be signed before activating.
            </div>
          </div>
        </div>

        {/* Save action (also in Shell actions, but duplicated for long-form UX) */}
        <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn sm" onClick={() => navigate('/vehicles/vendors')} disabled={saving}>Cancel</button>
          <button className="btn sm accent" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Onboard vendor'}
          </button>
        </div>
      </div>
    </Shell>
  )
}
