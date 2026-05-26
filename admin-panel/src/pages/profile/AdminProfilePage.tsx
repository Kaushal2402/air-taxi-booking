import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import { useIsMobile, useIsCompact } from '../../hooks/useIsMobile'

const SETTINGS_NAV = [
  { id: 'profile',  label: 'Profile',       icon: 'user',    soon: false },
  { id: 'security', label: 'Security',      icon: 'shield',  soon: false },
  { id: 'sessions', label: 'Sessions',      icon: 'device',  soon: false },
  { id: 'activity', label: 'Activity log',  icon: 'archive', soon: false },
  { id: 'notif',    label: 'Notifications', icon: 'bell',    soon: true  },
  { id: 'api',      label: 'API tokens',    icon: 'key',     soon: true  },
]

const LOCALES: { value: string; label: string }[] = [
  { value: 'en',    label: 'English (US)'          },
  { value: 'en-GB', label: 'English (UK)'          },
  { value: 'fr',    label: 'Français'              },
  { value: 'de',    label: 'Deutsch'               },
  { value: 'es',    label: 'Español'               },
  { value: 'pt',    label: 'Português'             },
  { value: 'it',    label: 'Italiano'              },
  { value: 'ru',    label: 'Русский'               },
  { value: 'ar',    label: 'العربية'               },
  { value: 'hi',    label: 'हिन्दी'                 },
  { value: 'ja',    label: '日本語'                 },
  { value: 'zh-CN', label: '中文（简体）'           },
]

// E.164: + followed by 7–15 digits with no leading zero after the +
const E164_RE = /^\+[1-9]\d{6,14}$/

export default function AdminProfilePage() {
  const navigate  = useNavigate()
  const user      = useAuthStore(s => s.user)!
  const setAuth   = useAuthStore(s => s.setAuth)
  const accessToken  = useAuthStore(s => s.accessToken)
  const refreshToken = useAuthStore(s => s.refreshToken)
  const isMobile  = useIsMobile()
  useIsCompact()  // reserved for responsive compact layout

  // ── Form state (initialise from stored user) ─────────────────────────────
  const [name,   setName]   = useState(user.name)
  const [phone,  setPhone]  = useState(user.phone  ?? '')
  const [locale, setLocale] = useState(user.locale ?? 'en')
  const [phoneError, setPhoneError] = useState('')

  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [saveErr, setSaveErr] = useState('')

  // ── Avatar ────────────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError,   setAvatarError]   = useState('')

  const initials = user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

  const isDirty =
    name.trim()  !== user.name ||
    (phone.trim() || null) !== (user.phone ?? null) ||
    locale !== (user.locale ?? 'en')

  // ── Avatar handlers ───────────────────────────────────────────────────────
  const handleAvatarClick = () => {
    setAvatarError('')
    fileRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!e.target.files) return
    e.target.value = ''               // reset so same file can be re-selected
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setAvatarError('Only JPEG, PNG, or WebP images are accepted')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be smaller than 2 MB')
      return
    }

    setAvatarLoading(true)
    setAvatarError('')
    try {
      const updated = await authService.uploadAvatar(file)
      setAuth({ ...user, avatar_url: updated.avatar_url }, accessToken!, refreshToken!)
    } catch {
      setAvatarError('Upload failed — please try again')
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true)
    setAvatarError('')
    try {
      await authService.removeAvatar()
      setAuth({ ...user, avatar_url: null }, accessToken!, refreshToken!)
    } catch {
      setAvatarError('Could not remove photo — please try again')
    } finally {
      setAvatarLoading(false)
    }
  }

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveErr('')
    setPhoneError('')

    const trimmedPhone = phone.trim()
    if (trimmedPhone && !E164_RE.test(trimmedPhone)) {
      setPhoneError('Use E.164 format, e.g. +14155552671')
      return
    }

    setSaving(true)
    try {
      const updated = await authService.updateMe({
        name:   name.trim(),
        phone:  trimmedPhone || null,
        locale,
      })
      setAuth(
        { ...user, name: updated.name, phone: updated.phone ?? null, locale: updated.locale ?? 'en' },
        accessToken!,
        refreshToken!,
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setSaveErr(e?.response?.data?.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setName(user.name)
    setPhone(user.phone ?? '')
    setLocale(user.locale ?? 'en')
    setPhoneError('')
    setSaveErr('')
  }

  return (
    <Shell
      activeId="admins"
      breadcrumb="System · Admin Users · My Profile"
      title={user.name}
      subtitle={isMobile ? undefined : `${user.role.replace(/_/g, ' ')} · Account settings`}
    >
      <div style={{
        display: isMobile ? 'flex' : 'grid',
        flexDirection: isMobile ? 'column' : undefined,
        gridTemplateColumns: isMobile ? undefined : '300px 1fr',
        minHeight: '100%',
      }}>

        {/* ── Sub-nav ─────────────────────────────────────────────────────── */}
        <aside style={{
          borderRight: isMobile ? 'none' : '1px solid var(--rule)',
          borderBottom: isMobile ? '1px solid var(--rule)' : 'none',
          padding: isMobile ? '16px' : '28px 24px',
          background: 'var(--surface)',
        }}>
          {/* Avatar + name — desktop only */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 22, borderBottom: '1px solid var(--rule)' }}>
              {/* Avatar preview (sidebar) */}
              <div style={{
                width: 44, height: 44, borderRadius: 4, flexShrink: 0,
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                fontFamily: 'var(--font-serif)', fontSize: 16,
              }}>
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)' }}>{user.name}</div>
                <div style={{ marginTop: 8 }}>
                  <span className="badge ok"><span className="dot ok" />{user.role.replace(/_/g, ' ')}</span>
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
            {SETTINGS_NAV.map(s => {
              const isActive = s.id === 'profile'
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (s.soon) return
                    if (s.id === 'security') navigate('/profile/security')
                  }}
                  style={isMobile ? {
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', fontSize: 12.5,
                    color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                    background: isActive ? 'var(--surface-2)' : 'transparent',
                    borderRadius: 20,
                    border: '1px solid ' + (isActive ? 'var(--rule-strong)' : 'transparent'),
                    whiteSpace: 'nowrap',
                    cursor: s.soon ? 'default' : 'pointer',
                    flexShrink: 0, opacity: s.soon ? 0.5 : 1,
                  } : {
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', margin: '2px -12px', fontSize: 13,
                    color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                    background: isActive ? 'var(--surface-2)' : 'transparent',
                    borderRadius: 3,
                    borderLeft: '2px solid ' + (isActive ? 'var(--accent)' : 'transparent'),
                    fontWeight: isActive ? 500 : 400,
                    cursor: s.soon ? 'default' : 'pointer',
                    opacity: s.soon ? 0.55 : 1,
                  }}
                >
                  <Icon name={s.icon} size={14} stroke={1.4} style={{ color: isActive ? 'var(--accent)' : 'var(--ink-3)' }} />
                  {s.label}
                  {s.soon && !isMobile && (
                    <span style={{
                      marginLeft: 'auto', fontFamily: 'var(--font-mono)',
                      fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: 'var(--ink-3)', background: 'var(--surface-2)',
                      border: '1px solid var(--rule)', borderRadius: 3, padding: '1px 5px',
                    }}>Soon</span>
                  )}
                  {!isMobile && !s.soon && isActive && (
                    <Icon name="chevRight" size={12} style={{ marginLeft: 'auto', color: 'var(--ink-3)' }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Security health — desktop only */}
          {!isMobile && (
            <div style={{ marginTop: 24, padding: '14px', background: 'var(--accent-soft-2)', border: '1px solid color-mix(in oklab, var(--accent) 18%, var(--rule-strong))', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Icon name="shield" size={14} style={{ color: 'var(--accent)' }} />
                <span className="t-label" style={{ padding: 0, color: 'var(--accent-ink)' }}>
                  {user.two_factor_enabled ? 'Account healthy' : 'Action required'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                {user.two_factor_enabled
                  ? '2FA is active on your account.'
                  : '2FA is not enrolled. Go to Security to set it up.'}
              </div>
            </div>
          )}
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div style={{ padding: isMobile ? '20px 16px' : '28px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* ── Avatar ─────────────────────────────────────────────────────── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 18 : 22, fontWeight: 400, letterSpacing: '-0.014em' }}>
                Profile photo
              </h3>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
              {/* Avatar click target */}
              <div
                onClick={handleAvatarClick}
                style={{
                  width: 80, height: 80, borderRadius: 4, flexShrink: 0,
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  border: '2px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', cursor: 'pointer', position: 'relative',
                  fontFamily: 'var(--font-serif)', fontSize: 28,
                }}
                title="Click to upload a photo"
              >
                {avatarLoading ? (
                  <Icon name="loader" size={22} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--accent)' }} />
                ) : user.avatar_url ? (
                  <>
                    <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {/* Hover overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.45)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 150ms',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                    >
                      <Icon name="refresh" size={18} style={{ color: '#fff' }} />
                    </div>
                  </>
                ) : (
                  <>
                    {initials}
                    {/* Hover overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.28)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 150ms',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                    >
                      <Icon name="plus" size={20} style={{ color: '#fff' }} />
                    </div>
                  </>
                )}
              </div>

              {/* Upload instructions */}
              <div style={{ paddingTop: 6 }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>
                  {user.avatar_url ? 'Change or remove your photo' : 'Upload a profile photo'}
                </div>
                <div className="t-meta" style={{ marginTop: 4, lineHeight: 1.55 }}>
                  JPEG, PNG, or WebP · Max 2 MB
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn sm" onClick={handleAvatarClick} disabled={avatarLoading}>
                    <Icon name="plus" size={12} />
                    {user.avatar_url ? 'Change photo' : 'Upload photo'}
                  </button>
                  {user.avatar_url && (
                    <button className="btn sm danger" onClick={handleRemoveAvatar} disabled={avatarLoading}>
                      Remove
                    </button>
                  )}
                </div>
                {avatarError && (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="alert" size={13} stroke={2} />
                    {avatarError}
                  </div>
                )}
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </section>

          {/* ── Personal details ───────────────────────────────────────────── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 18 : 22, fontWeight: 400, letterSpacing: '-0.014em' }}>
                Personal details
              </h3>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              Visible to other administrators when assigning work and resolving incidents.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              {/* Full name */}
              <div className="field">
                <label className="field-label">Full name</label>
                <div className="input">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
                </div>
              </div>

              {/* Work email — read-only */}
              <div className="field">
                <label className="field-label">Work email</label>
                <div className="input">
                  <input value={user.email} readOnly style={{ color: 'var(--ink-3)' }} />
                  <span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Verified</span>
                </div>
              </div>

              {/* Phone */}
              <div className="field">
                <label className="field-label">Phone number <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span></label>
                <div className={`input${phoneError ? ' error' : ''}`}>
                  <Icon name="device" size={14} className="icon" style={{ color: 'var(--ink-3)' }} />
                  <input
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                    placeholder="+14155552671"
                  />
                </div>
                {phoneError
                  ? <span className="field-error">{phoneError}</span>
                  : <span className="t-meta" style={{ marginTop: 4, display: 'block' }}>E.164 format including country code</span>
                }
              </div>

              {/* Language / locale */}
              <div className="field">
                <label className="field-label">Language</label>
                <div className="input">
                  <select
                    value={locale}
                    onChange={e => setLocale(e.target.value)}
                    style={{ flex: 1, border: 0, outline: 0, background: 'transparent', color: 'var(--ink)' }}
                  >
                    {LOCALES.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                  <Icon name="chevDown" size={14} className="icon" />
                </div>
                <span className="t-meta" style={{ marginTop: 4, display: 'block' }}>
                  Used for date, number, and currency formatting
                </span>
              </div>
            </div>
          </section>

          {/* ── Role summary ───────────────────────────────────────────────── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 18 : 22, fontWeight: 400, letterSpacing: '-0.014em' }}>
                Role & access
              </h3>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>
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
                  Role · <span style={{ color: 'var(--ink-2)' }}>{user.role.replace(/_/g, ' ')}</span>
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
            <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              Your role and status are managed by a super admin.
              To change your role, contact your administrator.
            </p>
          </section>

          {/* ── Save bar ──────────────────────────────────────────────────── */}
          {saveErr && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--danger-soft)',
              border: '1px solid color-mix(in oklab, var(--danger) 32%, var(--rule-strong))',
              borderRadius: 3, fontSize: 13, color: 'var(--danger)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon name="alert" size={14} stroke={2} />
              {saveErr}
            </div>
          )}

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '18px 0 8px', borderTop: '1px solid var(--rule)',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div className="t-meta">
              {saved && (
                <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="check" size={13} stroke={2.4} />
                  Changes saved
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={handleDiscard} disabled={saving || !isDirty}>
                Discard
              </button>
              <button
                className="btn accent"
                onClick={handleSave}
                disabled={saving || !isDirty}
              >
                {saving
                  ? <><Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite', marginRight: 7 }} />Saving…</>
                  : 'Save changes'
                }
              </button>
            </div>
          </div>

        </div>
      </div>
    </Shell>
  )
}
