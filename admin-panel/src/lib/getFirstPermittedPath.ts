/**
 * Returns the path of the first nav item the current user has access to,
 * based on their permission map. Falls back to '/no-access' if none found.
 *
 * Order matches the sidebar NAV_GROUPS order so the user always lands on
 * the first visible item from the top.
 */

// Ordered list of [path, requiredPermissions[]] — same order as NAV_GROUPS.
// Empty array = always accessible to any authenticated user.
const ORDERED_NAV: [string, string[]][] = [
  ['/dashboard',        ['dashboard.view']],
  ['/dispatch',         ['dispatch.console.view']],
  ['/bookings/road',    ['bookings.road.view']],
  ['/bookings/air',     ['bookings.air.view']],
  ['/support',          ['support.tickets.view']],
  ['/drivers',          ['drivers.view']],
  ['/vehicles',         ['vehicles.view']],
  ['/operators',        ['operators.view']],
  ['/aircraft',         ['aircraft.view']],
  ['/customers',        ['customers.view']],
  ['/privacy/requests', ['customers.data.export', 'customers.data.delete']],
  ['/kyc',              ['kyc.documents.view']],
  ['/catalog',          ['catalog.vehicle_classes.view', 'catalog.zones.view', 'catalog.aircraft_types.view', 'catalog.routes.view']],
  ['/pricing',          ['pricing.rules.view']],
  ['/promotions',       ['promotions.view', 'referrals.view']],
  ['/payments',         ['payments.view']],
  ['/payouts',          ['payouts.view']],
  ['/reports',          ['reports.view']],
  ['/notifications',    ['notifications.templates.view', 'notifications.delivery.view']],
  ['/branding',         ['branding.view']],
  ['/rbac',             ['rbac.roles.view']],
  ['/admin-users',      ['admin_users.view']],
  ['/settings',         ['settings.view']],
  ['/audit',            ['audit.events.view', 'audit.security.view']],
]

export function getFirstPermittedPath(
  isSuperAdmin: boolean,
  can: (key: string) => boolean,
): string {
  if (isSuperAdmin) return '/dashboard'

  for (const [path, keys] of ORDERED_NAV) {
    if (keys.length === 0) return path          // always accessible
    if (keys.some(k => can(k))) return path     // at least one key granted
  }

  return '/no-access'
}
