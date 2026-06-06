import { usePermissionStore } from '../store/permissionStore'

/**
 * Returns true if the current user has 'granted' or 'scoped' state for the
 * given permission key, or if they are a super admin (which bypasses all checks).
 *
 * Usage:
 *   const canApprove = usePermission('drivers.approve')
 *   {canApprove && <button>Approve</button>}
 */
export function usePermission(key: string): boolean {
  return usePermissionStore(s => s.can(key))
}

/**
 * Returns a function to imperatively check permissions (for use inside callbacks).
 * Usage:
 *   const can = useCan()
 *   if (can('payments.refund.initiate')) { ... }
 */
export function useCan(): (key: string) => boolean {
  return usePermissionStore(s => s.can)
}
