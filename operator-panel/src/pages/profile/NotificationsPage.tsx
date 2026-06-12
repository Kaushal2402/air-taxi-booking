import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Shell from '../../components/layout/Shell'
import ProfileRail from '../../components/layout/ProfileRail'
import { operatorAuthService } from '../../services/operatorAuthService'
import { useOperatorAuthStore } from '../../stores/authStore'

const CHANNELS = ['email', 'push', 'sms'] as const
type Channel = typeof CHANNELS[number]

const NOTIF_ORDER = [
  'booking_requests',
  'assignment_crew',
  'compliance_documents',
  'payouts_settlements',
  'platform_announcements',
  'day_of_flight',
]

const NOTIF_META: Record<string, { title: string; desc: string }> = {
  booking_requests:       { title: 'New booking requests',    desc: 'Inbound requests routed to your operator account' },
  assignment_crew:        { title: 'Assignment & crew',       desc: 'Crew assigned, reassigned, or notified on a flight' },
  compliance_documents:   { title: 'Compliance & documents',  desc: 'Certifications and airworthiness items nearing expiry' },
  payouts_settlements:    { title: 'Payouts & settlements',   desc: 'Settlement runs and payout status changes' },
  platform_announcements: { title: 'Platform announcements',  desc: 'Maintenance windows and feature updates from Acme Mobility' },
  day_of_flight:          { title: 'Day-of-flight alerts',    desc: 'Real-time flight status changes — always sent regardless' },
}

const LOCKED = new Set(['day_of_flight'])

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      style={{
        width: 36, height: 20, borderRadius: 10, flexShrink: 0,
        background: on ? 'var(--accent)' : 'var(--rule-strong)',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        position: 'relative', transition: 'background 0.15s', padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 19 : 3,
        width: 14, height: 14, borderRadius: 7,
        background: '#fff', transition: 'left 0.15s',
      }} />
    </button>
  )
}

export default function NotificationsPage() {
  const storeUser = useOperatorAuthStore(s => s.user)
  const qc = useQueryClient()

  const [prefs, setPrefs] = useState<Record<string, Record<Channel, boolean>>>({})
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['operator-notif-prefs'],
    queryFn: operatorAuthService.getNotificationPrefs,
    staleTime: 60_000,
  })

  // Sync local state from server data
  useEffect(() => {
    if (!data) return
    const m: typeof prefs = {}
    data.forEach(p => { m[p.alert_type] = { email: p.email, push: p.push, sms: p.sms } })
    setPrefs(m)
    setDirty(false)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () => operatorAuthService.updateNotificationPrefs(
      NOTIF_ORDER.map(type => ({
        alert_type: type,
        email: prefs[type]?.email ?? false,
        push:  prefs[type]?.push  ?? false,
        sms:   prefs[type]?.sms   ?? false,
      }))
    ),
    onSuccess: (updated) => {
      qc.setQueryData(['operator-notif-prefs'], updated)
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const resetMutation = useMutation({
    mutationFn: operatorAuthService.resetNotificationPrefs,
    onSuccess: (updated) => {
      qc.setQueryData(['operator-notif-prefs'], updated)
      const m: typeof prefs = {}
      updated.forEach(p => { m[p.alert_type] = { email: p.email, push: p.push, sms: p.sms } })
      setPrefs(m)
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const toggle = (type: string, ch: Channel) => {
    if (LOCKED.has(type)) return
    setPrefs(p => ({
      ...p,
      [type]: { ...(p[type] ?? { email: false, push: false, sms: false }), [ch]: !p[type]?.[ch] },
    }))
    setDirty(true)
    setSaved(false)
  }

  const discardChanges = () => {
    if (!data) return
    const m: typeof prefs = {}
    data.forEach(p => { m[p.alert_type] = { email: p.email, push: p.push, sms: p.sms } })
    setPrefs(m)
    setDirty(false)
  }

  return (
    <Shell
      activeId="notifications"
      breadcrumb="Account · Notifications"
      title={storeUser?.name ?? 'Notifications'}
      subtitle="Alert channels and preferences"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: '100%' }}>
        <ProfileRail active="Notifications" />

        <div style={{ padding: '28px 40px', overflowY: 'auto' }}>

          {/* Section header — vertical stack */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Notification preferences</div>
            <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 600 }}>
              Choose which channels receive each type of alert. Day-of-flight events and booking-request TTLs always push in real time regardless of these settings.
            </div>
          </div>

          {isLoading ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading preferences…</div>
          ) : (
            <>
              {/* Toggle table */}
              <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 20 }}>

                {/* Channel column headers */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 18px 8px' }}>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: 'flex', gap: 40, paddingRight: 2 }}>
                    {CHANNELS.map(ch => (
                      <div key={ch} style={{
                        width: 36, textAlign: 'center',
                        fontSize: 11, color: 'var(--ink-3)',
                        fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>
                        {ch}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {NOTIF_ORDER.map((type, i) => {
                    const meta   = NOTIF_META[type]
                    const p      = prefs[type] ?? { email: false, push: false, sms: false }
                    const locked = LOCKED.has(type)
                    return (
                      <div key={type} style={{
                        display: 'flex', alignItems: 'center',
                        padding: '14px 18px',
                        borderBottom: i < NOTIF_ORDER.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                        opacity: locked ? 0.7 : 1,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {meta.title}
                            {locked && <span className="badge" style={{ fontSize: 10 }}>Always on</span>}
                          </div>
                          <div className="t-meta" style={{ marginTop: 3 }}>{meta.desc}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 40, alignItems: 'center', paddingRight: 2 }}>
                          {CHANNELS.map(ch => (
                            <div key={ch} style={{ width: 36, display: 'flex', justifyContent: 'center' }}>
                              <Toggle
                                on={locked || p[ch]}
                                onChange={() => toggle(type, ch)}
                                disabled={locked}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer actions */}
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="t-meta">
                    {saved && !dirty
                      ? <span style={{ color: 'var(--ok)' }}>✓ Preferences saved</span>
                      : dirty
                        ? 'You have unsaved changes.'
                        : 'Changes are saved per-user and apply immediately.'}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn sm"
                      onClick={() => resetMutation.mutate()}
                      disabled={resetMutation.isPending}
                    >
                      {resetMutation.isPending ? 'Resetting…' : 'Reset to defaults'}
                    </button>
                    {dirty && (
                      <button className="btn sm" onClick={discardChanges}>Discard</button>
                    )}
                    <button
                      className="btn accent sm"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending || !dirty}
                    >
                      {saveMutation.isPending ? 'Saving…' : 'Save preferences'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}
