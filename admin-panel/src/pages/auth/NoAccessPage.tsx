import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/authService'
import Icon from '../../components/ui/Icon'
import BrandLockup from '../../components/layout/BrandLockup'

export default function NoAccessPage() {
  const { user, clearAuth } = useAuthStore()

  const handleSignOut = async () => {
    try { await authService.logout() } catch { /* ignore */ }
    clearAuth()
    window.location.href = '/login'
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: 32 }}>
        <BrandLockup />
      </div>

      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'color-mix(in oklab, var(--danger) 10%, var(--surface))',
        border: '1px solid color-mix(in oklab, var(--danger) 25%, var(--rule))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
      }}>
        <Icon name="shield" size={28} style={{ color: 'var(--danger)' }} />
      </div>

      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 26,
        fontWeight: 400,
        marginBottom: 12,
      }}>
        No access
      </div>

      <div style={{
        fontSize: 14,
        color: 'var(--ink-2)',
        maxWidth: 380,
        lineHeight: 1.6,
        marginBottom: 8,
      }}>
        Your account <strong>{user?.email}</strong> does not have permission
        to access any module in this admin panel.
      </div>

      <div style={{
        fontSize: 13,
        color: 'var(--ink-3)',
        maxWidth: 380,
        lineHeight: 1.6,
        marginBottom: 32,
      }}>
        Please contact your super admin to request the appropriate role and permissions.
      </div>

      <button
        className="btn sm"
        onClick={handleSignOut}
        style={{ minWidth: 120 }}
      >
        Sign out
      </button>
    </div>
  )
}
