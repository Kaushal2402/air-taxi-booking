import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Shell from '../../components/layout/Shell'
import ProfileRail from '../../components/layout/ProfileRail'
import { operatorAuthService } from '../../services/operatorAuthService'
import { useOperatorAuthStore } from '../../stores/authStore'
import { ALL_TIMEZONES, TIMEZONE_REGIONS } from '../../data/timezones'
import { fmtDate } from '../../lib/format'

// ── layout helpers ────────────────────────────────────────────
function FormSection({ title, description, children }: {
  title: string
  description: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={{ paddingBottom: 32, borderBottom: '1px solid var(--rule)' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{title}</div>
        <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 600 }}>{description}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  )
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>
}

function VerifiedBadge() {
  return (
    <span className="badge ok" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 13 4 4L19 7" />
      </svg>
      Verified
    </span>
  )
}

function UnverifiedBadge() {
  return <span className="badge warn" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Unverified</span>
}

const LANGUAGES = [
  { value: 'en',    label: 'English' },
  { value: 'hi',    label: 'Hindi (हिन्दी)' },
  { value: 'ar',    label: 'Arabic (العربية)' },
  { value: 'ta',    label: 'Tamil (தமிழ்)' },
  { value: 'te',    label: 'Telugu (తెలుగు)' },
  { value: 'kn',    label: 'Kannada (ಕನ್ನಡ)' },
  { value: 'fr',    label: 'French (Français)' },
]
// timezones imported from data/timezones.ts — full IANA list grouped by region
const DATE_FORMATS = [
  { value: 'DD/MM/YYYY',  label: 'DD/MM/YYYY · 28/05/2026' },
  { value: 'MM/DD/YYYY',  label: 'MM/DD/YYYY · 05/28/2026' },
  { value: 'YYYY-MM-DD',  label: 'YYYY-MM-DD · 2026-05-28' },
  { value: 'D MMM YYYY',  label: 'D MMM YYYY · 28 May 2026' },
]
const TIME_FORMATS = [
  { value: '24h', label: '24-hour · 14:30' },
  { value: '12h', label: '12-hour AM/PM · 2:30 PM' },
]

const NOTIF_LABEL: Record<string, { title: string; desc: string }> = {
  booking_requests:      { title: 'New booking requests',   desc: 'Inbound requests routed to your operator' },
  assignment_crew:       { title: 'Assignment & crew',      desc: 'Crew assigned, reassigned, or notified' },
  compliance_documents:  { title: 'Compliance & documents', desc: 'Certifications and airworthiness nearing expiry' },
  payouts_settlements:   { title: 'Payouts & settlements',  desc: 'Settlement runs and payout status changes' },
  platform_announcements:{ title: 'Platform announcements', desc: 'Maintenance windows and feature updates' },
  day_of_flight:         { title: 'Day-of-flight alerts',   desc: 'Real-time flight status — always sent' },
}
const NOTIF_ORDER = Object.keys(NOTIF_LABEL)
const NOTIF_LOCKED = new Set(['day_of_flight'])

// ── page ─────────────────────────────────────────────────────
export default function ProfilePage() {
  const setAuth      = useOperatorAuthStore(s => s.setAuth)
  const storeUser    = useOperatorAuthStore(s => s.user)
  const accessToken  = useOperatorAuthStore(s => s.accessToken)
  const refreshToken = useOperatorAuthStore(s => s.refreshToken)
  const qc = useQueryClient()

  // personal
  const [name,       setName]       = useState(storeUser?.name ?? '')
  const [phone,      setPhone]      = useState(storeUser?.phone ?? '')
  // preferences
  const [timezone,   setTimezone]   = useState('Asia/Kolkata')
  const [language,   setLanguage]   = useState('en')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [timeFormat, setTimeFormat] = useState('24h')

  const [saved,    setSaved]    = useState(false)
  const [saveErr,  setSaveErr]  = useState<string | null>(null)
  const [notifDirty, setNotifDirty] = useState(false)
  const [notifSaved,  setNotifSaved]  = useState(false)

  // notif local state: alert_type → {email,push,sms}
  const [notifPrefs, setNotifPrefs] = useState<Record<string, { email: boolean; push: boolean; sms: boolean }>>({})

  const { data: me } = useQuery({
    queryKey: ['operator-me'],
    queryFn: operatorAuthService.getMe,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const { data: permissions } = useQuery({
    queryKey: ['operator-permissions'],
    queryFn: operatorAuthService.getPermissions,
    staleTime: 300_000,
  })

  const { data: notifData } = useQuery({
    queryKey: ['operator-notif-prefs'],
    queryFn: operatorAuthService.getNotificationPrefs,
    staleTime: 60_000,
  })

  // sync form from API
  useEffect(() => {
    if (!me) return
    setName(me.name ?? '')
    setPhone(me.phone ?? '')
    setTimezone(me.timezone ?? 'Asia/Kolkata')
    setLanguage(me.language ?? 'en')
    setDateFormat(me.date_format ?? 'DD/MM/YYYY')
    setTimeFormat(me.time_format ?? '24h')
  }, [me])

  useEffect(() => {
    if (!notifData) return
    const map: Record<string, { email: boolean; push: boolean; sms: boolean }> = {}
    notifData.forEach(p => { map[p.alert_type] = { email: p.email, push: p.push, sms: p.sms } })
    setNotifPrefs(map)
  }, [notifData])

  const profileMutation = useMutation({
    mutationFn: () => operatorAuthService.updateMe({ name, phone: phone || undefined, timezone, language, date_format: dateFormat, time_format: timeFormat }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['operator-me'] })
      if (accessToken && refreshToken && storeUser) {
        setAuth({
          ...storeUser,
          name:       updated.name,
          phone:      updated.phone ?? null,
          timezone:   updated.timezone   ?? storeUser.timezone,
          language:   updated.language   ?? storeUser.language,
          dateFormat: updated.date_format ?? storeUser.dateFormat,
          timeFormat: updated.time_format ?? storeUser.timeFormat,
        }, accessToken, refreshToken)
      }
      setSaved(true); setSaveErr(null)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSaveErr(detail ?? 'Failed to save. Please try again.')
    },
  })

  const notifMutation = useMutation({
    mutationFn: () => operatorAuthService.updateNotificationPrefs(
      NOTIF_ORDER.map(type => ({
        alert_type: type,
        email: notifPrefs[type]?.email ?? false,
        push:  notifPrefs[type]?.push  ?? false,
        sms:   notifPrefs[type]?.sms   ?? false,
      }))
    ),
    onSuccess: (updated) => {
      qc.setQueryData(['operator-notif-prefs'], updated)
      setNotifDirty(false); setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 3000)
    },
  })

  const displayUser   = me ?? storeUser
  const roleName      = ((displayUser as { operator_role?: string })?.operator_role ?? storeUser?.role ?? '')
    .replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const orgName       = (displayUser as { operator_name?: string | null })?.operator_name ?? storeUser?.operatorName ?? '—'
  const phoneVerified = (me as { phone_verified?: boolean } | undefined)?.phone_verified ?? false
  const twoFaEnrolledAt = (me as { twofa_enrolled_at?: string | null } | undefined)?.twofa_enrolled_at

  const permOps  = permissions?.operations ?? '— / —'
  const permFC   = permissions?.fleet_crew  ?? '— / —'
  const permFin  = permissions?.finance      ?? '— / —'
  const allGranted = permissions?.all_granted ?? false

  const toggleNotif = (type: string, ch: 'email' | 'push' | 'sms') => {
    if (NOTIF_LOCKED.has(type)) return
    setNotifPrefs(p => ({ ...p, [type]: { ...(p[type] ?? { email: false, push: false, sms: false }), [ch]: !(p[type]?.[ch] ?? false) } }))
    setNotifDirty(true)
  }

  return (
    <Shell
      activeId="profile"
      breadcrumb="Account · My Profile"
      title={storeUser?.name ?? 'My Profile'}
      subtitle={`${roleName} · ${orgName}`}
      actions={
        <button className="btn sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 4h6v6M10 14 20 4M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
          </svg>
          View activity
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: '100%' }}>
        <ProfileRail active="Profile" />

        <div style={{ padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 32, overflowY: 'auto' }}>

          {/* ── 1. Personal details ── */}
          <FormSection
            title="Personal details"
            description="Visible to your teammates when assigning flights, dispatching crew, and resolving day-of-flight exceptions."
          >
            {saveErr && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))', borderRadius: 3, fontSize: 13, color: 'var(--danger)' }}>
                {saveErr}
              </div>
            )}
            <FieldRow>
              <div className="field">
                <label className="field-label" htmlFor="full-name">Full name</label>
                <input id="full-name" type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" maxLength={80} />
              </div>
              <div className="field">
                <label className="field-label">Display name</label>
                <div className="input" style={{ color: 'var(--ink-2)' }}>
                  <input readOnly value={name.split(' ')[0] ?? ''} style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 14, color: 'inherit', cursor: 'default' }} />
                </div>
              </div>
            </FieldRow>
            <FieldRow>
              <div className="field">
                <label className="field-label">Work email</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="input" style={{ flex: 1, color: 'var(--ink-2)' }}>
                    <input readOnly value={displayUser?.email ?? ''} style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, minWidth: 0, fontFamily: 'inherit', fontSize: 14, color: 'inherit', cursor: 'default' }} />
                  </div>
                  <VerifiedBadge />
                </div>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="phone">Phone (E.164)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input id="phone" type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={{ flex: 1 }} />
                  {phone ? (phoneVerified ? <VerifiedBadge /> : <UnverifiedBadge />) : null}
                </div>
              </div>
            </FieldRow>
          </FormSection>

          {/* ── 2. Preferences ── */}
          <FormSection
            title="Preferences"
            description="How the console renders dates, numbers, and times for you. Times across flights and rosters follow your timezone."
          >
            <FieldRow>
              <div className="field">
                <label className="field-label" htmlFor="language">Language</label>
                <select id="language" className="input" value={language} onChange={e => setLanguage(e.target.value)} style={{ cursor: 'pointer' }}>
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="timezone">Timezone</label>
                <select id="timezone" className="input" value={timezone} onChange={e => setTimezone(e.target.value)} style={{ cursor: 'pointer' }}>
                  {TIMEZONE_REGIONS.map(region => (
                    <optgroup key={region} label={region}>
                      {ALL_TIMEZONES.filter(t => t.region === region).map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </FieldRow>
            <FieldRow>
              <div className="field">
                <label className="field-label" htmlFor="date-format">Date format</label>
                <select id="date-format" className="input" value={dateFormat} onChange={e => setDateFormat(e.target.value)} style={{ cursor: 'pointer' }}>
                  {DATE_FORMATS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="time-format">Time format</label>
                <select id="time-format" className="input" value={timeFormat} onChange={e => setTimeFormat(e.target.value)} style={{ cursor: 'pointer' }}>
                  {TIME_FORMATS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </FieldRow>
          </FormSection>

          {/* ── 3. Notification preferences ── */}
          <FormSection
            title="Notification preferences"
            description="Channels for operational alerts. Day-of-flight events always push in real time regardless of these settings."
          >
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {NOTIF_ORDER.map((type, i) => {
                const meta   = NOTIF_LABEL[type]
                const prefs  = notifPrefs[type] ?? { email: false, push: false, sms: false }
                const locked = NOTIF_LOCKED.has(type)
                return (
                  <div key={type} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderBottom: i < NOTIF_ORDER.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                    opacity: locked ? 0.75 : 1,
                  }}>
                    <div>
                      <div style={{ fontSize: 13.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {meta.title}
                        {locked && <span className="badge" style={{ fontSize: 10 }}>Always on</span>}
                      </div>
                      <div className="t-meta" style={{ marginTop: 3 }}>{meta.desc}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 16 }}>
                      {(['email', 'push', 'sms'] as const).map(ch => {
                        const on = locked || prefs[ch]
                        return (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => toggleNotif(type, ch)}
                            className={on ? 'badge ok' : 'badge'}
                            style={{ cursor: locked ? 'default' : 'pointer', border: 'none', fontFamily: 'inherit', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', ...(on ? {} : { color: 'var(--ink-4)' }) }}
                          >
                            {on && (
                              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                                <path d="m5 13 4 4L19 7" />
                              </svg>
                            )}
                            {ch}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            {notifDirty && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button className="btn sm" onClick={() => { if (notifData) { const m: typeof notifPrefs = {}; notifData.forEach(p => { m[p.alert_type] = { email: p.email, push: p.push, sms: p.sms } }); setNotifPrefs(m) }; setNotifDirty(false) }}>Discard</button>
                <button className="btn accent sm" onClick={() => notifMutation.mutate()} disabled={notifMutation.isPending}>
                  {notifMutation.isPending ? 'Saving…' : 'Save notifications'}
                </button>
              </div>
            )}
            {notifSaved && !notifDirty && (
              <div className="t-meta" style={{ color: 'var(--ok)', textAlign: 'right' }}>✓ Notification preferences saved</div>
            )}
          </FormSection>

          {/* ── 4. Role & organisation ── */}
          <FormSection
            title="Role & organisation"
            description={
              <>
                You hold the{' '}
                <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
                  {(displayUser as { operator_role?: string })?.operator_role ?? storeUser?.role ?? 'operator_admin'}
                </span>{' '}
                role at {orgName}. Role, scope, and approval status are read-only here — managed in Team &amp; Roles and by the platform admin.
              </>
            }
          >
            <div style={{ border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--rule)' }}>
                {[
                  ['Operations', permOps],
                  ['Fleet & Crew', permFC],
                  ['Finance', permFin],
                ].map(([k, v], i) => {
                  const [granted, total] = v.split(' / ').map(Number)
                  const isAll = granted === total
                  return (
                    <div key={k} style={{ padding: '14px 18px', borderRight: i < 2 ? '1px solid var(--rule)' : 'none' }}>
                      <div className="t-label" style={{ padding: 0 }}>{k}</div>
                      <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink)' }}>{v}</div>
                      <div className="t-meta" style={{ marginTop: 2, color: isAll ? 'var(--accent)' : 'var(--ink-3)' }}>
                        {isAll ? 'All permissions granted' : `${granted} of ${total} permissions`}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="t-meta">
                  Scope · <span style={{ color: 'var(--ink-2)' }}>{orgName} · all bases · all aircraft</span>
                </div>
                {twoFaEnrolledAt && (
                  <div className="t-meta">
                    2FA enrolled · {fmtDate(twoFaEnrolledAt)}
                  </div>
                )}
              </div>
            </div>
          </FormSection>

          {/* ── Footer ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, paddingBottom: 24 }}>
            <div className="t-meta">
              {saved
                ? <span style={{ color: 'var(--ok)' }}>✓ Changes saved</span>
                : 'Changes are audit-logged'}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn"
                onClick={() => {
                  if (me) { setName(me.name ?? ''); setPhone(me.phone ?? ''); setTimezone(me.timezone ?? 'Asia/Kolkata'); setLanguage(me.language ?? 'en'); setDateFormat(me.date_format ?? 'DD/MM/YYYY'); setTimeFormat(me.time_format ?? '24h') }
                  setSaveErr(null)
                }}
              >
                Discard
              </button>
              <button className="btn accent" disabled={profileMutation.isPending || !name.trim()} onClick={() => profileMutation.mutate()}>
                {profileMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </Shell>
  )
}
