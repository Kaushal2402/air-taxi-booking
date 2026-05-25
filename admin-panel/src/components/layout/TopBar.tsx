import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../ui/Icon'
import { useAuthStore } from '../../store/authStore'

interface TopBarProps {
  title: string
  subtitle?: string
  breadcrumb?: string
  actions?: React.ReactNode
  /** Icon-only fallback for the actions — shown when the bar is compact */
  actionsCompact?: React.ReactNode
  isMobile?: boolean
  onMenuClick?: () => void
}

export default function TopBar({
  title, subtitle, breadcrumb,
  actions, actionsCompact,
  isMobile, onMenuClick,
}: TopBarProps) {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).slice(0, 2).join('')
    : 'SA'

  /* ── Mobile layout ─────────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--rule)',
        background: 'var(--surface)',
        height: 56,
        flexShrink: 0,
        padding: '0 12px 0 4px',
        gap: 8,
        minWidth: 0,
      }}>
        <button onClick={onMenuClick} className="btn icon sm" style={{ flexShrink: 0 }}>
          <Icon name="menu" size={20} stroke={1.6} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {breadcrumb && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9.5,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--ink-3)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{breadcrumb}</div>
          )}
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 400,
            fontSize: 18, letterSpacing: '-0.016em', color: 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{title}</h1>
        </div>

        {/* compact actions (icon-only version) */}
        {actionsCompact && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>{actionsCompact}</div>
        )}

        <button className="btn icon sm" title="Notifications" style={{ position: 'relative', flexShrink: 0 }}>
          <Icon name="bell" size={16} />
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 6, height: 6, borderRadius: 3,
            background: 'var(--warn)', border: '1.5px solid var(--surface)',
          }} />
        </button>

        <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate('/profile')}>
          <div className="avatar">{initials}</div>
        </div>
      </div>
    )
  }

  /* ── Desktop layout ────────────────────────────────────────────────────── */
  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      borderBottom: '1px solid var(--rule)',
      background: 'var(--surface)',
      height: 64,
      flexShrink: 0,
      minWidth: 0,
      overflow: 'hidden',
    }}>

      {/* Left — title (shrinks first) */}
      <div style={{
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px 0 28px',
        gap: 12,
        overflow: 'hidden',
      }}>
        <div style={{ minWidth: 0, flex: '1 1 0' }}>
          {breadcrumb && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10.5,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--ink-3)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{breadcrumb}</div>
          )}
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 400,
            fontSize: 22, letterSpacing: '-0.018em', color: 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{title}</h1>
          {subtitle && (
            <div style={{
              fontSize: 12, color: 'var(--ink-3)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{subtitle}</div>
          )}
        </div>
      </div>

      {/* Right — chrome (never shrinks below its content) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px 0 0',
        flexShrink: 0,
      }}>

        {/* Status chip — hidden via CSS at < 1440px */}
        <div className="topbar-status-chip" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 28, padding: '0 10px',
          border: '1px solid var(--rule-strong)', borderRadius: 3,
          fontFamily: 'var(--font-mono)', fontSize: 10.5,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--ink-2)', background: 'var(--surface-2)',
          whiteSpace: 'nowrap',
        }}>
          <span className="dot ok" /> Acme Mobility · Prod · IN
        </div>

        {/* Search — collapses to icon at < 1280px, hides at < 1024px */}
        {searchOpen ? (
          <div className="input topbar-search" style={{ width: 220, height: 32, transition: 'width 200ms' }}>
            <Icon name="search" size={14} className="icon" />
            <input
              ref={searchRef}
              placeholder="Search bookings, drivers, ops…"
              onBlur={() => setSearchOpen(false)}
            />
            <span className="kbd">⌘K</span>
          </div>
        ) : (
          <>
            {/* Expanded search input visible via CSS at ≥ 1280px */}
            <div className="input topbar-search" style={{ width: 200, height: 32 }}>
              <Icon name="search" size={14} className="icon" />
              <input
                placeholder="Search…"
                onFocus={() => setSearchOpen(true)}
              />
              <span className="kbd">⌘K</span>
            </div>
            {/* Search icon button shown only when input is hidden — controlled by CSS class */}
            <button
              className="btn icon sm topbar-search-icon"
              title="Search"
              onClick={() => setSearchOpen(true)}
              style={{ display: 'none' }}
            >
              <Icon name="search" size={15} />
            </button>
          </>
        )}

        {/* Page-level actions — compact icon version shown via actionsCompact */}
        {actions && (
          <div className="topbar-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {actions}
          </div>
        )}

        {/* Notification bell */}
        <button className="btn icon sm" title="Notifications" style={{ position: 'relative' }}>
          <Icon name="bell" size={15} />
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 6, height: 6, borderRadius: 3,
            background: 'var(--warn)', border: '1.5px solid var(--surface)',
          }} />
        </button>

        {/* Quick create — hidden via CSS at < 1280px */}
        <button className="btn sm topbar-quick-create">
          <Icon name="plus" size={13} /> Quick create
        </button>

        <div style={{ width: 1, height: 28, background: 'var(--rule)', margin: '0 2px' }} />

        {/* Profile */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 4, cursor: 'pointer' }}
          onClick={() => navigate('/profile')}
        >
          <div className="avatar">{initials}</div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{
              fontSize: 12.5, fontWeight: 500, color: 'var(--ink)',
              whiteSpace: 'nowrap', maxWidth: 120,
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{user?.name || 'Admin'}</span>
            <span style={{
              fontSize: 10.5, color: 'var(--ink-3)',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}>
              {user?.role?.replace(/_/g, ' ') || 'Admin'}
            </span>
          </div>
          <Icon name="chevDown" size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
        </div>
      </div>
    </div>
  )
}
