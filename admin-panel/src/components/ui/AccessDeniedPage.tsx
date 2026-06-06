import Icon from './Icon'

interface Props {
  permissionKey?: string | null
  message?: string
}

/**
 * Full-page access denied state — used when the page's initial data load
 * is blocked by a 403. Replaces the page body content.
 */
export default function AccessDeniedPage({ permissionKey, message }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 320,
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'color-mix(in oklab, var(--danger) 10%, var(--surface))',
        border: '1px solid color-mix(in oklab, var(--danger) 25%, var(--rule))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <Icon name="shield" size={24} style={{ color: 'var(--danger)' }} />
      </div>

      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, marginBottom: 8 }}>
        Access denied
      </div>

      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', maxWidth: 420, lineHeight: 1.6 }}>
        {message || 'You do not have the required permission to view this page.'}
        {' '}Contact your super admin to request access.
      </div>

      {permissionKey && (
        <div style={{
          marginTop: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 11.5,
          color: 'var(--danger)',
          background: 'color-mix(in oklab, var(--danger) 10%, var(--surface))',
          border: '1px solid color-mix(in oklab, var(--danger) 20%, var(--rule))',
          padding: '4px 12px',
          borderRadius: 3,
        }}>
          Required: {permissionKey}
        </div>
      )}
    </div>
  )
}
