import { useState } from 'react'
import { X } from 'lucide-react'
import type { Aircraft, AircraftCreate } from '../../services/operatorAircraftService'
import { operatorAircraftService } from '../../services/operatorAircraftService'

interface Props {
  onClose: () => void
  onCreated: (a: Aircraft) => void
}

export default function AddAircraftModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState<AircraftCreate>({
    registration_mark: '',
    aircraft_type_name: '',
    seat_capacity: 0,
    mtow_kg: 0,
    range_nm: 0,
    serial_number: '',
    year_of_manufacture: undefined,
    home_base_name: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof AircraftCreate, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.registration_mark || !form.aircraft_type_name || !form.seat_capacity || !form.mtow_kg || !form.range_nm) {
      setError('Please fill in all required fields.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const created = await operatorAircraftService.create(form)
      onCreated(created)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Failed to create aircraft.')
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
          width: 540,
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 0,
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
            Add aircraft
          </span>
          <button
            className="btn sm icon"
            style={{ height: 28, width: 28 }}
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Registration mark *</label>
              <div className="input">
                <input
                  placeholder="e.g. VT-HXE"
                  value={form.registration_mark}
                  onChange={e => set('registration_mark', e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Aircraft type *</label>
              <div className="input">
                <input
                  placeholder="e.g. Leonardo AW169"
                  value={form.aircraft_type_name}
                  onChange={e => set('aircraft_type_name', e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Serial number</label>
              <div className="input">
                <input
                  placeholder="e.g. AW169-69106"
                  value={form.serial_number ?? ''}
                  onChange={e => set('serial_number', e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Year of manufacture</label>
              <div className="input">
                <input
                  type="number"
                  placeholder="e.g. 2019"
                  value={form.year_of_manufacture ?? ''}
                  onChange={e => set('year_of_manufacture', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Seat capacity *</label>
              <div className="input">
                <input
                  type="number"
                  placeholder="e.g. 16"
                  value={form.seat_capacity || ''}
                  onChange={e => set('seat_capacity', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">MTOW (kg) *</label>
              <div className="input">
                <input
                  type="number"
                  placeholder="e.g. 4600"
                  value={form.mtow_kg || ''}
                  onChange={e => set('mtow_kg', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Range (nm) *</label>
              <div className="input">
                <input
                  type="number"
                  placeholder="e.g. 830"
                  value={form.range_nm || ''}
                  onChange={e => set('range_nm', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Endurance</label>
              <div className="input">
                <input
                  placeholder="e.g. ~4h 30m"
                  value={form.endurance_hours ?? ''}
                  onChange={e => set('endurance_hours', e.target.value)}
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
          <button className="btn sm ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn sm accent" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Add aircraft'}
          </button>
        </div>
      </div>
    </div>
  )
}
