import { useState, useEffect, useCallback } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { brandingService } from '../../services/brandingService'
import type { BrandProfile } from '../../services/brandingService'
import { formatDate } from '../../lib/utils'

export default function BrandProfilesPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [profiles, setProfiles] = useState<BrandProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [deleting, setDeleting] = useState<BrandProfile | null>(null)
  const [form, setForm] = useState({
    brand_ref: '',
    name: '',
    scope: '',
    primary_color: '#0F8A5F',
    ink_color: '#1A1814',
    surface_color: '#FBF9F4',
    is_white_label: false,
    partner_name: '',
  })
  const [saving, setSaving] = useState(false)
  const canManageBranding = usePermission('branding.manage')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await brandingService.listProfiles()
      setProfiles(res.items)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    setSaving(true)
    try {
      await brandingService.createProfile({
        brand_ref: form.brand_ref,
        name: form.name,
        scope: form.scope || undefined,
        primary_color: form.primary_color,
        ink_color: form.ink_color,
        surface_color: form.surface_color,
        is_white_label: form.is_white_label,
        partner_name: form.is_white_label ? form.partner_name : undefined,
      })
      setShowNew(false)
      setForm({ brand_ref: '', name: '', scope: '', primary_color: '#0F8A5F', ink_color: '#1A1814', surface_color: '#FBF9F4', is_white_label: false, partner_name: '' })
      await load()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await brandingService.deleteProfile(deleting.id)
      setDeleting(null)
      await load()
    } catch {
      // ignore
    }
  }

  const liveCount = profiles.filter(p => p.status === 'live').length
  const wlCount = profiles.filter(p => p.is_white_label).length

  return (
    <Shell
      activeId="branding"
      breadcrumb="System · Branding"
      title="Brand profiles"
      subtitle={`${profiles.length} profiles · ${liveCount} live · ${wlCount} white-label partners`}
      actions={
        <>
          <button className="btn sm">Brand guidelines</button>
          <button style={{ display: canManageBranding ? undefined : 'none' }} className="btn sm accent" onClick={() => setShowNew(true)}>
            <Icon name="plus" size={13} />New profile
          </button>
        </>
      }
    >
      <div style={{ padding: isMobile ? '16px' : '24px 32px 28px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 18 }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: 'var(--ink-4)' }}>Loading brand profiles…</div>
        ) : profiles.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: 'var(--ink-4)' }}>No brand profiles found. Create your first profile.</div>
        ) : profiles.map(b => (
          <div
            key={b.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--rule)',
              borderLeft: `3px solid ${b.status === 'live' ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
            }}
            onClick={() => navigate(`/branding/${b.id}`)}
          >
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 18 }}>
              {/* Color swatch preview */}
              <div style={{ width: 88, height: 88, borderRadius: 6, border: '1px solid var(--rule)', overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, background: b.surface_color ?? '#FBF9F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: b.primary_color ?? '#0F8A5F' }} />
                </div>
                <div style={{ display: 'flex', height: 18 }}>
                  <div style={{ flex: 1, background: b.primary_color ?? '#0F8A5F' }} />
                  <div style={{ flex: 1, background: b.ink_color ?? '#1A1814' }} />
                  <div style={{ flex: 1, background: b.surface_color ?? '#FBF9F4', borderTop: '1px solid var(--rule)' }} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>{b.name}</div>
                  {b.status === 'live'   ? <span className="badge ok"><span className="dot ok" />Live</span> :
                   b.status === 'review' ? <span className="badge warn"><span className="dot warn" />In review</span> :
                   b.status === 'draft'  ? <span className="badge"><span className="dot pending" />Draft</span> :
                   <span className="badge"><span className="dot pending" />Archived</span>}
                </div>
                {b.scope && <div className="t-meta" style={{ marginTop: 5 }}>{b.scope}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  {[b.primary_color, b.ink_color, b.surface_color].map((c, i) => c && (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, background: c, border: '1px solid var(--rule-strong)' }} />
                      <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderTop: '1px solid var(--rule-soft)', background: 'var(--surface-2)' }} onClick={e => e.stopPropagation()}>
              <span className="t-meta">
                <span className="t-mono">{b.brand_ref}</span>
                {b.published_at ? ` · updated ${formatDate(b.updated_at)}` : ''}
                {b.is_white_label && ' · White-label'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn sm ghost" onClick={() => navigate(`/branding/${b.id}/touchpoints`)}>
                  <Icon name="globe" size={13} />Touchpoints
                </button>
                <button className="btn sm" onClick={() => navigate(`/branding/${b.id}`)}>Edit theme</button>
                <button className="btn sm ghost" onClick={() => setDeleting(b)}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New profile dialog */}
      {showNew && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(15,13,10,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={() => setShowNew(false)}>
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: 24, width: '100%', maxWidth: 480, borderRadius: 4 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 20 }}>New brand profile</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                ['Brand ref (e.g. BR-ACME)', 'brand_ref'],
                ['Profile name', 'name'],
                ['Scope / description', 'scope'],
              ].map(([label, field]) => (
                <div key={field} className="field">
                  <div className="field-label">{label}</div>
                  <input
                    className="input"
                    style={{ width: '100%', height: 36, padding: '0 10px' }}
                    value={form[field as keyof typeof form] as string}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={label}
                  />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  ['Primary', 'primary_color'],
                  ['Ink', 'ink_color'],
                  ['Surface', 'surface_color'],
                ].map(([label, field]) => (
                  <div key={field} className="field">
                    <div className="field-label">{label}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="color"
                        style={{ width: 32, height: 32, cursor: 'pointer', border: '1px solid var(--rule)', borderRadius: 3 }}
                        value={form[field as keyof typeof form] as string}
                        onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                      />
                      <input
                        className="input"
                        style={{ flex: 1, height: 32, padding: '0 8px', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                        value={form[field as keyof typeof form] as string}
                        onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_white_label}
                  onChange={e => setForm(prev => ({ ...prev, is_white_label: e.target.checked }))}
                />
                <span style={{ fontSize: 13 }}>White-label partner</span>
              </label>
              {form.is_white_label && (
                <div className="field">
                  <div className="field-label">Partner name</div>
                  <input
                    className="input"
                    style={{ width: '100%', height: 36, padding: '0 10px' }}
                    value={form.partner_name}
                    onChange={e => setForm(prev => ({ ...prev, partner_name: e.target.value }))}
                    placeholder="Partner company name"
                  />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn sm ghost" onClick={() => setShowNew(false)}>Cancel</button>
              <button
                className="btn sm accent"
                disabled={!form.brand_ref.trim() || !form.name.trim() || saving}
                onClick={handleCreate}
              >
                {saving ? 'Creating…' : 'Create profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete brand profile"
        description={`Delete "${deleting?.name}"? This cannot be undone. Live profiles cannot be deleted.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </Shell>
  )
}
