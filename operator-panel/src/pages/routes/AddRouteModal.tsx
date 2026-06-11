import { useState } from 'react'
import { X } from 'lucide-react'
import type { Route, RouteCreate } from '../../services/operatorRoutesService'
import { operatorRoutesService } from '../../services/operatorRoutesService'

interface Props {
  onClose: () => void
  onCreated: (r: Route) => void
}

export default function AddRouteModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState<RouteCreate>({
    origin_code: '',
    origin_name: '',
    destination_code: '',
    destination_name: '',
    distance_nm: 0,
    est_duration_min: 0,
    eligible_aircraft_types: [],
    airspace_notes: '',
  })
  const [typesInput, setTypesInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof RouteCreate>(k: K, v: RouteCreate[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.origin_code || !form.destination_code || !form.distance_nm || !form.est_duration_min) {
      setError('Please fill in all required fields.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        origin_code: form.origin_code.toUpperCase(),
        destination_code: form.destination_code.toUpperCase(),
        eligible_aircraft_types: typesInput
          ? typesInput.split(',').map(t => t.trim()).filter(Boolean)
          : [],
      }
      const created = await operatorRoutesService.createRoute(payload)
      onCreated(created)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Failed to create route.')
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
          width: 520,
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
            Add route
          </span>
          <button className="btn sm icon" style={{ height: 28, width: 28 }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && (
            <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab,var(--danger) 25%,var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Origin code *</label>
              <div className="input">
                <input
                  placeholder="MUM"
                  value={form.origin_code}
                  onChange={e => set('origin_code', e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Destination code *</label>
              <div className="input">
                <input
                  placeholder="DEL"
                  value={form.destination_code}
                  onChange={e => set('destination_code', e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Origin name *</label>
              <div className="input">
                <input
                  placeholder="e.g. Mumbai Juhu Aerodrome"
                  value={form.origin_name}
                  onChange={e => set('origin_name', e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Destination name *</label>
              <div className="input">
                <input
                  placeholder="e.g. Delhi Safdarjung Airport"
                  value={form.destination_name}
                  onChange={e => set('destination_name', e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Distance (nm) *</label>
              <div className="input">
                <input
                  type="number"
                  placeholder="e.g. 720"
                  value={form.distance_nm || ''}
                  onChange={e => set('distance_nm', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Est. duration (min) *</label>
              <div className="input">
                <input
                  type="number"
                  placeholder="e.g. 210"
                  value={form.est_duration_min || ''}
                  onChange={e => set('est_duration_min', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Eligible aircraft types (comma-separated)</label>
            <div className="input">
              <input
                placeholder="e.g. AW169, EC135"
                value={typesInput}
                onChange={e => setTypesInput(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Airspace notes</label>
            <div className="input">
              <input
                placeholder="Optional notes…"
                value={form.airspace_notes ?? ''}
                onChange={e => set('airspace_notes', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid var(--rule)' }}>
          <button className="btn sm ghost" onClick={onClose}>Cancel</button>
          <button className="btn sm accent" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Add route'}
          </button>
        </div>
      </div>
    </div>
  )
}
