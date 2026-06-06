import { useEffect } from 'react'
import { usePermissionStore } from '../../store/permissionStore'
import Icon from './Icon'

/**
 * Global 403 banner — rendered once inside Shell.
 * Auto-dismisses after 6 s; user can also close manually.
 * Appears at the top of the main content area so it never covers nav.
 */
export default function PermissionDeniedBanner() {
  const { denied, clearDenied } = usePermissionStore()

  useEffect(() => {
    if (!denied) return
    const t = setTimeout(clearDenied, 6000)
    return () => clearTimeout(t)
  }, [denied, clearDenied])

  if (!denied) return null

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 20px',
        background: 'color-mix(in oklab, var(--danger) 10%, var(--surface))',
        borderBottom: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule))',
        flexShrink: 0,
      }}
    >
      <Icon
        name="shield"
        size={16}
        style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>
          Access denied
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>
          {denied.message}
          {denied.permissionKey && (
            <span
              style={{
                marginLeft: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                background: 'color-mix(in oklab, var(--danger) 15%, var(--surface))',
                padding: '1px 6px',
                borderRadius: 3,
                color: 'var(--danger)',
              }}
            >
              {denied.permissionKey}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={clearDenied}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink-3)',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  )
}
