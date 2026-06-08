import React, { useState } from 'react'
import Sidebar from './Sidebar'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useOperatorAuthStore } from '../../stores/authStore'
import { Menu, Bell, ChevronDown, AlertTriangle, LogOut } from 'lucide-react'
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
          height: 56,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 12,
          flexShrink: 0,
        }}>
          {isMobile && (
            <button
              onClick={() => setNavOpen(true)}
              style={{ color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}
            >
              <Menu size={20} />
            </button>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            {breadcrumb && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                marginBottom: 1,
              }}>
                {breadcrumb}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </h1>
              {subtitle && (
                <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {actions}
            </div>
          )}

          <button
            style={{
              color: 'var(--ink-3)', display: 'flex', alignItems: 'center',
              padding: '6px', borderRadius: 4, position: 'relative',
            }}
          >
            <Bell size={18} strokeWidth={1.4} />
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 8px', borderRadius: 4,
                border: '1px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--accent-soft)',
                border: '1px solid color-mix(in oklab, var(--accent) 30%, var(--rule))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
                color: 'var(--accent)',
                flexShrink: 0,
              }}>
                {user?.name?.charAt(0)?.toUpperCase() ?? 'O'}
              </div>
              {!isMobile && (
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>
                    {user?.operatorName ?? '—'}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', textTransform: 'capitalize' }}>
                    {user?.role?.replace(/_/g, ' ') ?? '—'}
                  </div>
                </div>
              )}
              <ChevronDown size={14} style={{ color: 'var(--ink-4)' }} />
            </button>

            {profileOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                  onClick={() => setProfileOpen(false)}
                />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--rule)',
                  borderRadius: 4,
                  boxShadow: 'var(--shadow-pop)',
                  minWidth: 200,
                  zIndex: 50,
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--rule)' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>
                      {user?.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                      {user?.email}
                    </div>
                  </div>
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/profile') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '10px 14px',
                      fontSize: 13, color: 'var(--ink)', cursor: 'pointer',
                      background: 'none', border: 'none',
                    }}
                  >
                    My Profile
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/settings') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '10px 14px',
                      fontSize: 13, color: 'var(--ink)', cursor: 'pointer',
                      background: 'none', border: 'none',
                    }}
                  >
                    Settings
                  </button>
                  <div style={{ borderTop: '1px solid var(--rule)' }}>
                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '10px 14px',
                        fontSize: 13, color: 'var(--danger)', cursor: 'pointer',
                        background: 'none', border: 'none',
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
        </header>

        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
