import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { brandingService } from '../../services/brandingService'
import type { BrandProfile } from '../../services/brandingService'

const LOGO_SLOTS = [
  { label: 'Wordmark', dim: '240 × 64' },
  { label: 'App icon', dim: '512 × 512' },
  { label: 'Splash mark', dim: '180 × 180' },
]

const FONT_OPTIONS = ['Newsreader', 'Playfair Display', 'Merriweather', 'Lora', 'IBM Plex Serif']
const TEXT_FONT_OPTIONS = ['IBM Plex Sans', 'Inter', 'DM Sans', 'Nunito', 'Source Sans 3']
const RADIUS_OPTIONS = ['None · 0px', 'Small · 4px', 'Medium · 8px', 'Large · 12px', 'XL · 16px']
const BUTTON_OPTIONS = ['Solid · square', 'Solid · pill', 'Outline · pill', 'Ghost · square']

export default function ThemeEditorPage() {
  const { profileId } = useParams<{ profileId: string }>()
  const isMobile = useIsMobile()

  const [profile, setProfile] = useState<BrandProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishConfirm, setPublishConfirm] = useState<'staging' | 'live' | null>(null)

  // Local edits (not yet saved)
  const [colors, setColors] = useState({
    primary: '#0F8A5F',
    ink: '#1A1814',
    surface: '#FBF9F4',
    bg: '#F4F1EA',
    success: '#0F8A5F',
  })
  const [displayFont, setDisplayFont] = useState('Newsreader')
  const [textFont, setTextFont] = useState('IBM Plex Sans')
  const [cornerRadius, setCornerRadius] = useState('Medium · 8px')
  const [buttonStyle, setButtonStyle] = useState('Solid · pill')

  const load = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    try {
      const data = await brandingService.getProfile(profileId)
      setProfile(data)
      setColors({
        primary: data.primary_color ?? '#0F8A5F',
        ink: data.ink_color ?? '#1A1814',
        surface: data.surface_color ?? '#FBF9F4',
        bg: data.bg_color ?? '#F4F1EA',
        success: data.success_color ?? '#0F8A5F',
      })
      setDisplayFont(data.display_font ?? 'Newsreader')
      setTextFont(data.text_font ?? 'IBM Plex Sans')
      setCornerRadius(data.corner_radius ?? 'Medium · 8px')
      setButtonStyle(data.button_style ?? 'Solid · pill')
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!profileId) return
    setSaving(true)
    try {
      await brandingService.updateProfile(profileId, {
        primary_color: colors.primary,
        ink_color: colors.ink,
        surface_color: colors.surface,
        bg_color: colors.bg,
        success_color: colors.success,
        display_font: displayFont,
        text_font: textFont,
        corner_radius: cornerRadius,
        button_style: buttonStyle,
      })
      await load()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!profileId || !publishConfirm) return
    try {
      await brandingService.publishProfile(profileId, publishConfirm)
      setPublishConfirm(null)
      await load()
    } catch {
      // ignore
    }
  }

  if (loading && !profile) {
    return (
      <Shell activeId="branding" title="Loading…">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--ink-4)' }}>
          Loading theme editor…
        </div>
      </Shell>
    )
  }

  if (!profile) return null

  const colorTokens = [
    { key: 'primary', label: 'Primary', meta: 'Buttons, links, active', value: colors.primary },
    { key: 'ink', label: 'Ink', meta: 'Headings, body', value: colors.ink },
    { key: 'surface', label: 'Surface', meta: 'Cards, sheets', value: colors.surface },
    { key: 'bg', label: 'Background', meta: 'App canvas', value: colors.bg },
    { key: 'success', label: 'Success', meta: 'Confirmations', value: colors.success },
  ]

  return (
    <Shell
      activeId="branding"
      breadcrumb={`System · Branding · Theme editor`}
      title={profile.name}
      subtitle={`${profile.brand_ref} · ${profile.scope ?? ''} · ${profile.status} · edits publish to staging first`}
      actions={
        <>
          <button className="btn sm" onClick={() => load()}>Reset</button>
          <button className="btn sm" disabled={saving} onClick={async () => { await handleSave(); setPublishConfirm('staging') }}>
            Publish to staging
          </button>
          <button className="btn sm accent" onClick={() => setPublishConfirm('live')}>
            <Icon name="check" size={13} />Publish live
          </button>
        </>
      }
    >
      <div style={{
        padding: isMobile ? '16px' : '24px 32px 28px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr',
        gap: 24,
      }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Logo uploads */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Logo & marks</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {LOGO_SLOTS.map(({ label, dim }) => (
                <div key={label}>
                  <div style={{
                    aspectRatio: '1.6', border: '1px dashed var(--rule-strong)', borderRadius: 4,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'repeating-linear-gradient(45deg, var(--surface-2), var(--surface-2) 7px, var(--surface) 7px, var(--surface) 14px)',
                    color: 'var(--ink-3)', cursor: 'pointer',
                  }}>
                    <Icon name="upload" size={16} />
                    <span className="t-mono" style={{ fontSize: 10 }}>{dim}</span>
                  </div>
                  <div className="t-meta" style={{ marginTop: 6, textAlign: 'center' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Color tokens */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Color tokens</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {colorTokens.map(t => (
                <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <input
                    type="color"
                    value={t.value}
                    onChange={e => setColors(prev => ({ ...prev, [t.key]: e.target.value }))}
                    style={{ width: 32, height: 32, borderRadius: 5, border: '1px solid var(--rule-strong)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.label}</div>
                    <div className="t-meta" style={{ marginTop: 1 }}>{t.meta}</div>
                  </div>
                  <input
                    className="input"
                    style={{ width: 90, height: 30, padding: '0 8px', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    value={t.value}
                    onChange={e => setColors(prev => ({ ...prev, [t.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Typography & shape */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Type & shape</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Display font', value: displayFont, setter: setDisplayFont, opts: FONT_OPTIONS },
                { label: 'Text font', value: textFont, setter: setTextFont, opts: TEXT_FONT_OPTIONS },
                { label: 'Corner radius', value: cornerRadius, setter: setCornerRadius, opts: RADIUS_OPTIONS },
                { label: 'Button style', value: buttonStyle, setter: setButtonStyle, opts: BUTTON_OPTIONS },
              ].map(({ label, value, setter, opts }) => (
                <div key={label} className="field">
                  <div className="field-label">{label}</div>
                  <select
                    className="input"
                    style={{ width: '100%', height: 36, padding: '0 10px' }}
                    value={value}
                    onChange={e => setter(e.target.value)}
                  >
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <button className="btn sm accent" disabled={saving} onClick={handleSave} style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {/* Phone preview */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="t-label">Live preview · rider app</div>
            <span className="badge"><Icon name="device" size={11} />iPhone</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Phone frame */}
            <div style={{
              width: 268, borderRadius: 30,
              border: `8px solid ${colors.ink}`,
              background: colors.bg,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-pop)',
            }}>
              {/* Status + header */}
              <div style={{ background: colors.surface, padding: '12px 18px 14px', borderBottom: `1px solid color-mix(in oklab, ${colors.ink} 12%, transparent)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--font-mono)', color: colors.ink, opacity: 0.5, marginBottom: 12 }}>
                  <span>9:41</span><span>5G · 100%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.ink }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: colors.primary }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 15 }}>{profile.name}</span>
                </div>
              </div>
              {/* Body */}
              <div style={{ padding: '16px 18px 20px' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, color: colors.ink, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  Where to,<br />Priya?
                </div>
                {/* Search box */}
                <div style={{
                  marginTop: 14, background: colors.surface,
                  border: `1px solid color-mix(in oklab, ${colors.ink} 20%, transparent)`,
                  borderRadius: 10, padding: '11px 13px',
                  display: 'flex', alignItems: 'center', gap: 9,
                  color: colors.ink, opacity: 0.6, fontSize: 12.5,
                }}>
                  <Icon name="search" size={14} />Enter destination
                </div>
                {/* Service tiles */}
                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[['car', 'Cab'], ['bolt', 'Bike'], ['helipad', 'Heli'], ['map', 'Rental']].map(([ic, l]) => (
                    <div key={l} style={{
                      background: colors.surface,
                      border: `1px solid color-mix(in oklab, ${colors.ink} 15%, transparent)`,
                      borderRadius: 10, padding: '12px',
                      display: 'flex', flexDirection: 'column', gap: 6, color: colors.ink,
                    }}>
                      <Icon name={ic} size={18} style={{ color: colors.primary }} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{l}</span>
                    </div>
                  ))}
                </div>
                {/* CTA */}
                <div style={{
                  marginTop: 16, background: colors.primary, color: '#fff',
                  borderRadius: buttonStyle.includes('pill') ? 999 : 8,
                  padding: '12px', textAlign: 'center', fontSize: 13.5, fontWeight: 600,
                }}>Book a ride</div>
              </div>
            </div>
          </div>
          <div className="t-meta" style={{ marginTop: 14, textAlign: 'center' }}>
            Updates reflect primary, surface & radius tokens in real time.
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={publishConfirm === 'staging'}
        title="Publish to staging"
        description={`Push "${profile.name}" theme changes to the staging environment? Users won't see changes until you publish live.`}
        confirmLabel="Publish to staging"
        variant="default"
        onConfirm={handlePublish}
        onCancel={() => setPublishConfirm(null)}
      />

      <ConfirmDialog
        open={publishConfirm === 'live'}
        title="Publish live"
        description={`Publish "${profile.name}" theme to production? Changes will be visible to all users immediately.`}
        confirmLabel="Publish live"
        variant="default"
        onConfirm={handlePublish}
        onCancel={() => setPublishConfirm(null)}
      />
    </Shell>
  )
}
