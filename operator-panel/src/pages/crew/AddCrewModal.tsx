import { useState } from 'react'
import { X } from 'lucide-react'
import type { CrewMember, CrewMemberCreate } from '../../services/operatorCrewService'
import { operatorCrewService } from '../../services/operatorCrewService'

interface Props {
  onClose: () => void
  onCreated: (c: CrewMember) => void
}

export default function AddCrewModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState<CrewMemberCreate>({
    name: '',
    crew_role: 'pilot',
    license_no: '',
    email: '',
    phone: '',
    home_base_name: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof CrewMemberCreate, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name || !form.crew_role) {
      setError('Name and role are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const created = await operatorCrewService.create(form)
      onCreated(created)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Failed to add crew member.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,13,10,0.5)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          width: 480,
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', flex: 1 }}>
            Add crew member
          </span>
          <button className="btn sm icon" style={{ height: 28, width: 28 }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && (
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab,var(--danger) 25%,var(--rule))',
                borderRadius: 3,
                fontSize: 12.5,
                color: 'var(--danger)',
              }}
            >
              {error}
            </div>
          )}

          <div className="field">
            <label className="field-label">Full name *</label>
            <div className="input">
              <input
                placeholder="e.g. Capt. Rohan Sharma"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Role *</label>
            <select
              className="input"
              style={{ height: 36, fontSize: 13 }}
              value={form.crew_role}
              onChange={e => set('crew_role', e.target.value)}
            >
              <option value="pilot">Captain (PIC)</option>
              <option value="copilot">First Officer (FO)</option>
              <option value="cabin">Cabin Crew</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">License number</label>
              <div className="input">
                <input
                  placeholder="e.g. ATPL-H · DGP-0421"
                  value={form.license_no ?? ''}
                  onChange={e => set('license_no', e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Medical expiry</label>
              <div className="input">
                <input
                  type="date"
                  value={form.medical_expiry ?? ''}
                  onChange={e => set('medical_expiry', e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <div className="input">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={form.email ?? ''}
                  onChange={e => set('email', e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Phone</label>
              <div className="input">
                <input
                  placeholder="+91-98200-xxxxx"
                  value={form.phone ?? ''}
                  onChange={e => set('phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Home base</label>
            <div className="input">
              <input
                placeholder="e.g. MUM Juhu FBO"
                value={form.home_base_name ?? ''}
                onChange={e => set('home_base_name', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            padding: '14px 20px',
            borderTop: '1px solid var(--rule)',
          }}
        >
          <button className="btn sm ghost" onClick={onClose}>Cancel</button>
          <button className="btn sm accent" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Add crew member'}
          </button>
        </div>
      </div>
    </div>
  )
}
