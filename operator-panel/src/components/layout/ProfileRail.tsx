import { useNavigate } from 'react-router-dom'
import { useOperatorAuthStore } from '../../stores/authStore'

const NAV_ITEMS = [
  { label: 'Profile',       icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 0c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6Z',   path: '/profile' },
  { label: 'Security',      icon: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z',                              path: '/security' },
  { label: 'Sessions',      icon: 'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7m0 0v3m-3 0h6M2 7v8a2 2 0 0 0 2 2h7', path: '/sessions' },
  { label: 'Notifications', icon: 'M6 14V9a6 6 0 1 1 12 0v5l1.5 2.5h-15L6 14Zm3.5 3a2.5 2.5 0 0 0 5 0',          path: '/notifications' },
  { label: 'Activity log',  icon: 'M3 7h18v3H3V7Zm2 3v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10M9 13h6',               path: '/activity' },
]

interface ProfileRailProps {
  active: string
}

export default function ProfileRail({ active }: ProfileRailProps) {
  const navigate = useNavigate()
  const user = useOperatorAuthStore(s => s.user)

  const initials = (user?.name ?? 'U').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
  const roleName = (user?.role ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <aside style={{ borderRight: '1px solid var(--rule)', padding: '28px 24px', background: 'var(--surface)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 22, borderBottom: '1px solid var(--rule)' }}>
        <div className="avatar lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' }}>
          {initials}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)' }}>
            {user?.name ?? '—'}
          </div>
          <div style={{ marginTop: 8 }}>
            <span className="badge ok">
              <span className="dot ok" />
              {roleName || 'Operator'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ paddingTop: 18 }}>
        <div className="t-label" style={{ marginBottom: 8, padding: 0 }}>Account</div>
        {NAV_ITEMS.map(item => {
          const on = item.label === active
          return (
            <div
              key={item.label}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', margin: '2px -12px',
                fontSize: 13, color: on ? 'var(--ink)' : 'var(--ink-2)',
                background: on ? 'var(--surface-2)' : 'transparent', borderRadius: 3,
                borderLeft: '2px solid ' + (on ? 'var(--accent)' : 'transparent'),
                fontWeight: on ? 500 : 400, cursor: 'pointer',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
                <path d={item.icon} />
              </svg>
              {item.label}
              {on && (
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', color: 'var(--ink-3)' }}>
                  <path d="m9 6 6 6-6 6" />
                </svg>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 24, padding: '14px 0 0', borderTop: '1px solid var(--rule)' }}>
        <div className="t-label" style={{ padding: 0, marginBottom: 10 }}>Organisation</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Operator', user?.operatorName ?? '—'],
            ['Your role', roleName || '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="t-meta" style={{ color: 'var(--ink-3)' }}>{k}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
