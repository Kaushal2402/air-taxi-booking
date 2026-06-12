import React, { useState } from 'react'
import Sidebar from './Sidebar'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useOperatorAuthStore } from '../../stores/authStore'
import { Menu, Bell, ChevronDown, AlertTriangle, LogOut, Search, Plus, User, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { operatorAuthService } from '../../services/operatorAuthService'

interface ShellProps {
  activeId?: string
  title: string
  subtitle?: string
  breadcrumb?: string
  actions?: React.ReactNode
  adminBannerMessage?: string
  children: React.ReactNode
}

export default function Shell({
  activeId,
  title,
  subtitle,
  breadcrumb,
  actions,
  adminBannerMessage,
  children,
}: ShellProps) {
  const isMobile = useIsMobile()
  const [navOpen, setNavOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const user = useOperatorAuthStore(s => s.user)
  const clearAuth = useOperatorAuthStore(s => s.clearAuth)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await operatorAuthService.logout() } catch { /* ignore */ }
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100vh',
      background: 'var(--bg)',
      color: 'var(--ink)',
      fontFamily: 'var(--font-sans)',
    }}>
      {isMobile && navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15, 13, 10, 0.5)',
            zIndex: 199,
          }}
        />
      )}

      <Sidebar
        activeId={activeId}
        isMobile={isMobile}
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {adminBannerMessage && (
          <div style={{
            background: 'var(--warn-soft)',
            borderBottom: '1px solid color-mix(in oklab, var(--warn) 32%, var(--rule-strong))',
            padding: '9px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'var(--font-mono)',
            fontSize: 11.5,
            color: 'var(--warn)',
            letterSpacing: '0.04em',
          }}>
            <AlertTriangle size={14} strokeWidth={1.6} />
            {adminBannerMessage}
          </div>
        )}

        <header style={{
          height: 64,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          alignItems: 'stretch',
          flexShrink: 0,
        }}>
          {/* Left — breadcrumb + page title */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, minWidth: 0 }}>
            {isMobile && (
              <button
                onClick={() => setNavOpen(true)}
                style={{ color: 'var(--ink-3)', display: 'flex', alignItems: 'center', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <Menu size={20} />
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              {breadcrumb && (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                }}>
                  {breadcrumb}
                </div>
              )}
              <h1 style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontWeight: 400,
                fontSize: 22,
                letterSpacing: '-0.018em',
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.1,
              }}>
                {title}
              </h1>
              {subtitle && (
                <div style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          {/* Right — org badge, search, actions, bell, quick-create, divider, profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 0 0', flexShrink: 0 }}>

            {/* Operator org + approval badge */}
            {!isMobile && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                height: 28, padding: '0 10px',
                border: '1px solid var(--rule-strong)',
                borderRadius: 3,
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--ink-2)',
                background: 'var(--surface-2)',
                whiteSpace: 'nowrap',
              }}>
                <span className="dot ok" />
                {user?.operatorName ?? 'Operator'} · Approved
              </div>
            )}

            {/* Search */}
            {!isMobile && (
              <div className="input" style={{ width: 220, height: 32, paddingLeft: 10, gap: 8 }}>
                <Search size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                <input
                  placeholder="Search flights, crew, requests…"
                  style={{ flex: 1, border: 0, outline: 0, background: 'transparent', padding: 0, fontSize: 12.5, fontFamily: 'inherit', minWidth: 0 }}
                />
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)',
                  background: 'var(--surface-2)', border: '1px solid var(--rule-strong)',
                  borderRadius: 2, padding: '1px 5px', flexShrink: 0,
                }}>⌘K</span>
              </div>
            )}

            {/* Page-level actions */}
            {actions && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {actions}
              </div>
            )}

            {/* Notification bell */}
            <button
              className="btn icon sm"
              title="Notifications"
              style={{ position: 'relative', flexShrink: 0 }}
            >
              <Bell size={15} strokeWidth={1.4} />
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 6, height: 6, borderRadius: 3,
                background: 'var(--warn)',
                border: '1.5px solid var(--surface)',
              }} />
            </button>

            {/* Quick create */}
            {!isMobile && (
              <button className="btn sm" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Plus size={13} /> Quick create
              </button>
            )}

            {/* Divider */}
            <div style={{ width: 1, height: 28, background: 'var(--rule)', margin: '0 4px', flexShrink: 0 }} />

            {/* Profile dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '4px 8px 4px 4px', borderRadius: 4,
                  border: '1px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div className="avatar" style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--rule-strong))',
                  fontSize: 11, fontWeight: 600,
                }}>
                  {(user?.name ?? 'O').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, textAlign: 'left' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>
                      {user?.name ?? '—'}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'capitalize' }}>
                      {user?.role?.replace(/_/g, ' ') ?? '—'}
                    </span>
                  </div>
                )}
                <ChevronDown size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
              </button>

              {profileOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setProfileOpen(false)} />
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                    background: 'var(--surface)',
                    border: '1px solid var(--rule)',
                    borderRadius: 4,
                    boxShadow: 'var(--shadow-pop)',
                    minWidth: 210,
                    zIndex: 50,
                    overflow: 'hidden',
                  }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--rule)' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{user?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{user?.email}</div>
                      <div style={{ marginTop: 6 }}>
                        <span className="badge ok" style={{ fontSize: 10.5 }}>
                          <span className="dot ok" />
                          {user?.role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? 'Operator'}
                        </span>
                      </div>
                    </div>
                    {[
                      { label: 'My Profile', Icon: User,     path: '/profile' },
                      { label: 'Settings',   Icon: Settings, path: '/settings' },
                    ].map(({ label, Icon, path }) => (
                      <button
                        key={label}
                        onClick={() => { setProfileOpen(false); navigate(path) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '9px 14px',
                          fontSize: 13, color: 'var(--ink)', cursor: 'pointer',
                          background: 'none', border: 'none', textAlign: 'left',
                        }}
                      >
                        <Icon size={14} style={{ color: 'var(--ink-3)' }} />
                        {label}
                      </button>
                    ))}
                    <div style={{ borderTop: '1px solid var(--rule)' }}>
                      <button
                        onClick={handleLogout}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '9px 14px',
                          fontSize: 13, color: 'var(--danger)', cursor: 'pointer',
                          background: 'none', border: 'none', textAlign: 'left',
                        }}
                      >
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
