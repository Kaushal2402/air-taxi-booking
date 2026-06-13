import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, CheckCheck, Search, X } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type {
  NotificationPrefs,
  NotificationPrefRow,
  NotificationType,
  OperatorNotification,
} from '../../services/operatorNotificationCenterService'
import { operatorNotificationCenterService } from '../../services/operatorNotificationCenterService'

// ── helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const TYPE_COLOR: Record<NotificationType, string> = {
  request:      '#0F8A5F',
  assignment:   '#2563EB',
  expiry:       '#D97706',
  payout:       '#7C3AED',
  cancel:       '#DC2626',
  announcement: '#6B7280',
}

const TYPE_LABEL: Record<NotificationType, string> = {
  request:      'Request',
  assignment:   'Assignment',
  expiry:       'Expiry',
  payout:       'Payout',
  cancel:       'Cancellation',
  announcement: 'Announcement',
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        width: 36, height: 20, borderRadius: 10, flexShrink: 0,
        background: on ? 'var(--accent)' : 'var(--rule-strong)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.15s', padding: 0,
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

// ── Notification row ──────────────────────────────────────────────────────────

function NotifRow({
  notif,
  onRead,
}: {
  notif: OperatorNotification
  onRead: (id: string, link: string | null) => void
}) {
  const color = TYPE_COLOR[notif.type] ?? '#6B7280'
  return (
    <div
      onClick={() => onRead(notif.id, notif.link_path)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '14px 18px',
        cursor: 'pointer',
        background: notif.is_read ? 'transparent' : 'rgba(15,138,95,0.04)',
        borderBottom: '1px solid var(--rule-soft)',
        transition: 'background 0.12s',
      }}
    >
      {/* Colored type dot */}
      <div style={{
        marginTop: 5, width: 9, height: 9, borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 13.5,
            fontWeight: notif.is_read ? 400 : 600,
            color: 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: 340,
          }}>
            {notif.title}
          </span>
          <span className="badge" style={{
            fontSize: 10, background: color + '20', color,
            border: `1px solid ${color}40`,
          }}>
            {TYPE_LABEL[notif.type]}
          </span>
        </div>
        <div className="t-meta" style={{ marginTop: 3, lineHeight: 1.5 }}>
          {notif.message}
        </div>
      </div>

      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="t-meta" style={{ whiteSpace: 'nowrap' }}>
          {timeAgo(notif.created_at)}
        </span>
        {!notif.is_read && (
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />
        )}
      </div>
    </div>
  )
}

// ── Preferences tab ───────────────────────────────────────────────────────────

const PREF_EVENTS: Array<{ key: string; label: string; desc: string }> = [
  { key: 'booking_request',   label: 'New booking request',  desc: 'Inbound requests routed to your operator account' },
  { key: 'ttl_warning',       label: 'TTL warning',          desc: 'Request nearing its response deadline' },
  { key: 'assignment_update', label: 'Assignment update',    desc: 'Crew assigned, reassigned, or removed on a flight' },
  { key: 'document_expiry',   label: 'Document expiry',      desc: 'Certifications and airworthiness items nearing expiry' },
  { key: 'payout_update',     label: 'Payout update',        desc: 'Settlement runs and payout status changes' },
  { key: 'cancellation',      label: 'Cancellation',         desc: 'Booking cancelled by customer or platform' },
]

const CH_LABELS = ['Email', 'SMS', 'In-App'] as const
type ChKey = 'email' | 'sms' | 'in_app'
const CH_KEYS: ChKey[] = ['email', 'sms', 'in_app']

function defaultPrefs(): NotificationPrefs {
  return {
    preferences: PREF_EVENTS.map(e => ({
      event_type: e.key,
      channels: { email: true, sms: false, in_app: true },
    })),
    quiet_hours_start: null,
    quiet_hours_end: null,
  }
}

function PreferencesTab() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    operatorNotificationCenterService
      .getPreferences()
      .then(p => { setPrefs(p); setDirty(false) })
      .catch(() => { /* keep defaults */ })
      .finally(() => setLoading(false))
  }, [])

  const getPrefRow = (eventType: string): NotificationPrefRow => {
    return (
      prefs.preferences.find(p => p.event_type === eventType) ?? {
        event_type: eventType,
        channels: { email: false, sms: false, in_app: false },
      }
    )
  }

  const toggleChannel = (eventType: string, ch: ChKey) => {
    setPrefs(prev => {
      const existing = prev.preferences.find(p => p.event_type === eventType)
      const updated = prev.preferences.map(p =>
        p.event_type === eventType
          ? { ...p, channels: { ...p.channels, [ch]: !p.channels[ch] } }
          : p
      )
      if (!existing) {
        updated.push({
          event_type: eventType,
          channels: { email: false, sms: false, in_app: false, [ch]: true },
        })
      }
      return { ...prev, preferences: updated }
    })
    setDirty(true)
    setSaved(false)
  }

  const handleSave = () => {
    setSaving(true)
    operatorNotificationCenterService
      .updatePreferences(prefs)
      .then(updated => {
        setPrefs(updated)
        setDirty(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      })
      .catch(console.error)
      .finally(() => setSaving(false))
  }

  if (loading) {
    return <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: 24 }}>Loading preferences…</div>
  }

  return (
    <div>
      {/* Channel header row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 18px 10px' }}>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 36 }}>
          {CH_LABELS.map(lbl => (
            <div key={lbl} style={{
              width: 36, textAlign: 'center',
              fontSize: 11, color: 'var(--ink-3)',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {lbl}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {PREF_EVENTS.map((ev, i) => {
          const row = getPrefRow(ev.key)
          return (
            <div key={ev.key} style={{
              display: 'flex', alignItems: 'center',
              padding: '13px 18px',
              borderBottom: i < PREF_EVENTS.length - 1 ? '1px solid var(--rule-soft)' : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{ev.label}</div>
                <div className="t-meta" style={{ marginTop: 3 }}>{ev.desc}</div>
              </div>
              <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
                {CH_KEYS.map(ch => (
                  <div key={ch} style={{ width: 36, display: 'flex', justifyContent: 'center' }}>
                    <Toggle
                      on={row.channels[ch]}
                      onChange={() => toggleChannel(ev.key, ch)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quiet hours */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
          Quiet hours
        </div>
        <div className="t-meta" style={{ marginBottom: 14 }}>
          Suppress non-critical notifications during these hours (your local time).
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Start</label>
            <input
              type="time"
              className="input"
              style={{ width: 130 }}
              value={prefs.quiet_hours_start ?? ''}
              onChange={e => {
                setPrefs(p => ({ ...p, quiet_hours_start: e.target.value || null }))
                setDirty(true)
                setSaved(false)
              }}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">End</label>
            <input
              type="time"
              className="input"
              style={{ width: 130 }}
              value={prefs.quiet_hours_end ?? ''}
              onChange={e => {
                setPrefs(p => ({ ...p, quiet_hours_end: e.target.value || null }))
                setDirty(true)
                setSaved(false)
              }}
            />
          </div>
          {(prefs.quiet_hours_start || prefs.quiet_hours_end) && (
            <button
              className="btn sm ghost"
              onClick={() => {
                setPrefs(p => ({ ...p, quiet_hours_start: null, quiet_hours_end: null }))
                setDirty(true)
                setSaved(false)
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="t-meta">
          {saved && !dirty
            ? <span style={{ color: 'var(--ok)' }}>Preferences saved</span>
            : dirty
              ? 'You have unsaved changes.'
              : 'Changes apply immediately after saving.'}
        </div>
        <button
          className="btn accent sm"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </div>
  )
}

// ── Feed tab ──────────────────────────────────────────────────────────────────

const ALL_TYPES: Array<{ value: NotificationType | 'all'; label: string }> = [
  { value: 'all',          label: 'All types' },
  { value: 'request',      label: 'Requests' },
  { value: 'assignment',   label: 'Assignments' },
  { value: 'expiry',       label: 'Expiry' },
  { value: 'payout',       label: 'Payouts' },
  { value: 'cancel',       label: 'Cancellations' },
  { value: 'announcement', label: 'Announcements' },
]

function FeedTab() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [notifs, setNotifs] = useState<OperatorNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const load = (unread?: boolean) => {
    setLoading(true)
    operatorNotificationCenterService
      .list(unread)
      .then(setNotifs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(false) }, [])

  const handleRead = (id: string, link: string | null) => {
    const notif = notifs.find(n => n.id === id)
    if (!notif?.is_read) {
      operatorNotificationCenterService
        .markRead(id)
        .then(updated => {
          setNotifs(prev => prev.map(n => n.id === id ? updated : n))
        })
        .catch(console.error)
    }
    if (link) navigate(link)
  }

  const handleMarkAllRead = () => {
    setMarkingAll(true)
    operatorNotificationCenterService
      .markAllRead()
      .then(() => {
        setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
      })
      .catch(console.error)
      .finally(() => setMarkingAll(false))
  }

  const handleUnreadToggle = () => {
    const next = !unreadOnly
    setUnreadOnly(next)
    load(next)
  }

  const filtered = useMemo(() => {
    let list = notifs
    if (filterType !== 'all') list = list.filter(n => n.type === filterType)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      )
    }
    return list
  }, [notifs, filterType, search])

  const unreadCount = useMemo(() => notifs.filter(n => !n.is_read).length, [notifs])

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        flexWrap: 'wrap', marginBottom: 16,
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '0 0 220px' }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--ink-3)', pointerEvents: 'none',
          }} />
          <input
            className="input"
            style={{ paddingLeft: 30, width: '100%' }}
            placeholder="Search notifications…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                color: 'var(--ink-3)',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Type filter */}
        <select
          className="input"
          style={{ flex: isMobile ? '1 1 auto' : '0 0 160px' }}
          value={filterType}
          onChange={e => setFilterType(e.target.value as NotificationType | 'all')}
        >
          {ALL_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Unread toggle */}
        <button
          className={`btn sm ${unreadOnly ? 'accent' : 'ghost'}`}
          onClick={handleUnreadToggle}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {unreadOnly ? <Bell size={13} /> : <BellOff size={13} />}
          Unread
          {unreadCount > 0 && !unreadOnly && (
            <span style={{
              background: 'var(--accent)', color: '#fff',
              borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 600,
            }}>
              {unreadCount}
            </span>
          )}
        </button>

        <div style={{ flex: 1 }} />

        {/* Mark all read */}
        {unreadCount > 0 && (
          <button
            className="btn sm"
            disabled={markingAll}
            onClick={handleMarkAllRead}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <CheckCheck size={13} />
            {markingAll ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '24px 0' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{
          padding: '48px 24px', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <CheckCheck size={32} style={{ color: 'var(--accent)', opacity: 0.6 }} />
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
            {search || filterType !== 'all' || unreadOnly ? 'No notifications match your filters' : 'All caught up!'}
          </div>
          <div className="t-meta">
            {search || filterType !== 'all' || unreadOnly
              ? 'Try clearing filters to see all notifications.'
              : 'You have no notifications at this time.'}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {filtered.map(n => (
              <NotifRow key={n.id} notif={n} onRead={handleRead} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type TabId = 'feed' | 'preferences'

export default function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState<TabId>('feed')

  const TAB_BAR_STYLE: React.CSSProperties = {
    display: 'flex', gap: 4, marginBottom: 24,
    borderBottom: '1px solid var(--rule)',
  }

  const tabStyle = (id: TabId): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: 13.5, fontWeight: activeTab === id ? 600 : 400,
    color: activeTab === id ? 'var(--accent)' : 'var(--ink-3)',
    background: 'none', border: 'none', cursor: 'pointer',
    borderBottom: activeTab === id ? '2px solid var(--accent)' : '2px solid transparent',
    marginBottom: -1, transition: 'color 0.12s',
  })

  return (
    <Shell
      activeId="notification-center"
      breadcrumb="Notification Center"
      title="Notification Center"
      subtitle="Inbox, alerts, and notification preferences"
    >
      <div style={{ padding: '28px 32px', maxWidth: 900 }}>
        {/* Tab bar */}
        <div style={TAB_BAR_STYLE}>
          <button style={tabStyle('feed')} onClick={() => setActiveTab('feed')}>
            Feed
          </button>
          <button style={tabStyle('preferences')} onClick={() => setActiveTab('preferences')}>
            Preferences
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'feed' ? <FeedTab /> : <PreferencesTab />}
      </div>
    </Shell>
  )
}
