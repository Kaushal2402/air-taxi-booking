import React, { useState } from 'react'
import NavRail from './NavRail'
import TopBar from './TopBar'
import { useIsMobile } from '../../hooks/useIsMobile'

interface ShellProps {
  activeId?: string
  title: string
  subtitle?: string
  breadcrumb?: string
  actions?: React.ReactNode
  actionsCompact?: React.ReactNode
  children: React.ReactNode
}

export default function Shell({ activeId, title, subtitle, breadcrumb, actions, actionsCompact, children }: ShellProps) {
  const isMobile = useIsMobile()
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100vh',
      background: 'var(--bg)',
      color: 'var(--ink)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Backdrop — mobile nav overlay */}
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

      <NavRail
        activeId={activeId}
        isMobile={isMobile}
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          title={title}
          subtitle={subtitle}
          breadcrumb={breadcrumb}
          actions={actions}
          actionsCompact={actionsCompact}
          isMobile={isMobile}
          onMenuClick={() => setNavOpen(true)}
        />
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
