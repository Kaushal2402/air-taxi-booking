import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import { useIsMobile, useIsCompact } from '../../hooks/useIsMobile'

const SETTINGS_NAV = [
  { id: 'profile',       label: 'Profile',       icon: 'user' },
  { id: 'security',      label: 'Security',      icon: 'shield' },
  { id: 'sessions',      label: 'Sessions',      icon: 'device' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'activity',      label: 'Activity log',  icon: 'archive' },
  { id: 'api',           label: 'API tokens',    icon: 'key' },
]

export default function AdminProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)!
  const setAuth = useAuthStore(s => s.setAuth)
  const accessToken = useAuthStore(s => s.accessToken)
  const refreshToken = useAuthStore(s => s.refreshToken)
  const isMobile = useIsMobile()
  const isCompact = useIsCompact()

  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const initials = user.name.split(' ').map(p => p[0]).slice(0, 2).join('')

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await authService.updateMe(name)
      setAuth({ ...user, name: updated.name }, accessToken!, refreshToken!)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell
      activeId="admins"
      breadcrumb="System · Admin Users · My Profile"
      title={user.name}
      subtitle={isMobile ? undefined : `${user.role.replace('_', ' ')} · Account settings`}
      actions={
        !isMobile ? (
          <button className="btn sm">
            <Icon name="external" size={13} />
            {!isCompact && ' View activity'}
          </button>
        ) : undefined
      }
    >
      <div style={{
        display: isMobile ? 'flex' : 'grid',
        flexDirection: isMobile ? 'column' : undefined,
        gridTemplateColumns: isMobile ? undefined : '300px 1fr',
        minHeight: '100%',
      }}>
        {/* Sub-nav */}
        <aside style={{
          borderRight: isMobile ? 'none' : '1px solid var(--rule)',
          borderBottom: isMobile ? '1px solid var(--rule)' : 'none',
          padding: isMobile ? '16px' : '28px 24px',
          background: 'var(--surface)',
        }}>
          {/* Avatar row — desktop only */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 22, borderBottom: '1px solid var(--rule)' }}>
              <div className="avatar lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' }}>
                {initials}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)' }}>{user.name}</div>
                <div style={{ marginTop: 8 }}>
                  <span className="badge ok"><span className="dot ok" />{user.role.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Nav items */}
          <div style={{
            paddingTop: isMobile ? 0 : 18,
            display: isMobile ? 'flex' : 'block',
            overflowX: isMobile ? 'auto' : undefined,
            gap: isMobile ? 4 : undefined,
          }}>
            {!isMobile && <div className="t-label" style={{ marginBottom: 8, padding: 0 }}>Settings</div>}
            {SETTINGS_NAV.map(s => (
              <div
                key={s.id}
                onClick={() => s.id === 'security' && navigate('/profile/security')}
                style={isMobile ? {
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  fontSize: 12.5,
                  color: s.id === 'profile' ? 'var(--ink)' : 'var(--ink-2)',
                  background: s.id === 'profile' ? 'var(--surface-2)' : 'transparent',
                  borderRadius: 20,
                  border: '1px solid ' + (s.id === 'profile' ? 'var(--rule-strong)' : 'transparent'),
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  flexShrink: 0,
                } : {
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', margin: '2px -12px',
                  fontSize: 13,
                  color: s.id === 'profile' ? 'var(--ink)' : 'var(--ink-2)',
                  background: s.id === 'profile' ? 'var(--surface-2)' : 'transparent',
                  borderRadius: 3,
                  borderLeft: '2px solid ' + (s.id === 'profile' ? 'var(--accent)' : 'transparent'),
                  fontWeight: s.id === 'profile' ? 500 : 400,
                  cursor: 'pointer',
                }}
              >
                <Icon name={s.icon} size={14} stroke={1.4} style={{ color: 'var(--ink-3)' }} />
                {s.label}
                {!isMobile && s.id === 'profile' && <Icon name="chevRight" size={12} style={{ marginLeft: 'auto', color: 'var(--ink-3)' }} />}
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <div style={{ padding: isMobile ? '20px 16px' : '28px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Personal details */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 18 : 22, fontWeight: 400, letterSpacing: '-0.014em' }}>Personal details</h3>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              Visible to other administrators when assigning work and resolving incidents.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label className="field-label">Full name</label>
                <div className="input">
                  <input value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Work email</label>
                <div className="input">
                  <input value={user.email} readOnly />
                  <span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Verified</span>
                </div>
              </div>
            </div>
          </section>

          {/* Role summary */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 18 : 22, fontWeight: 400, letterSpacing: '-0.014em' }}>Role & access summary</h3>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              You hold the <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{user.role}</span> role.
            </p>
            <div style={{ border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface)' }}>
              <div style={{
                padding: '14px 18px',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                gap: isMobile ? 10 : 0,
              }}>
                <div className="t-meta">
                  Role · <span style={{ color: 'var(--ink-2)' }}>{user.role.replace('_', ' ')}</span>
                </div>
                <div className="t-meta">
                  Status · <span style={{ color: user.status === 'active' ? 'var(--accent)' : 'var(--warn)' }}>{user.status}</span>
                </div>
                <div className="t-meta">
                  2FA · <span style={{ color: user.two_factor_enabled ? 'var(--accent)' : 'var(--warn)' }}>
                    {user.two_factor_enabled ? 'Enabled' : 'Not enrolled'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '18px 0 8px', borderTop: '1px solid var(--rule)',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div className="t-meta">
              {saved && <span style={{ color: 'var(--accent)' }}>✓ Saved</span>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={() => setName(user.name)}>Discard</button>
              <button className="btn accent" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
