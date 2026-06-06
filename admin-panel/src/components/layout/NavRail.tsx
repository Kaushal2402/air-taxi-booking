import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BrandLockup from './BrandLockup'
import Icon from '../ui/Icon'
import { driverService } from '../../services/driverService'
import { dispatchService } from '../../services/dispatchService'
import { supportService } from '../../services/supportService'
import { usePermissionStore } from '../../store/permissionStore'

// Permission keys that gate each nav item.
// A user sees the item if they have ANY of the listed keys granted/scoped,
// OR if they are a super admin (which bypasses all checks).
// Items with an empty array are always visible to any authenticated user.
const NAV_PERMISSIONS: Record<string, string[]> = {
  'dashboard':        ['dashboard.view'],
  'dispatch':         ['dispatch.console.view'],
  'bookings-r':       ['bookings.road.view'],
  'bookings-a':       ['bookings.air.view'],
  'support':          ['support.tickets.view'],
  'drivers':          ['drivers.view'],
  'vehicles':         ['vehicles.view'],
  'operators':        ['operators.view'],
  'aircraft':         ['aircraft.view'],
  'customers':        ['customers.view'],
  'privacy-requests': ['customers.data.export', 'customers.data.delete'],
  'kyc':              ['kyc.documents.view'],
  'catalog':          ['catalog.vehicle_classes.view', 'catalog.zones.view', 'catalog.aircraft_types.view', 'catalog.routes.view'],
  'pricing':          ['pricing.rules.view'],
  'promotions':       ['promotions.view', 'referrals.view'],
  'payments':         ['payments.view'],
  'payouts':          ['payouts.view'],
  'reports':          ['reports.view'],
  'notifications':    ['notifications.templates.view', 'notifications.delivery.view'],
  'branding':         ['branding.view'],
  'rbac':             ['rbac.roles.view'],
  'admins':           ['admin_users.view'],
  'settings':         ['settings.view'],
  'audit':            ['audit.events.view', 'audit.security.view'],
  'integrations':     [],  // always visible when module exists
}

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { id: 'dashboard',  label: 'Dashboard',         icon: 'pie',     path: '/dashboard' },
      { id: 'dispatch',   label: 'Live Dispatch',     icon: 'bolt',    path: '/dispatch' },
      { id: 'bookings-r', label: 'Bookings · Road',   icon: 'car',     path: '/bookings/road' },
      { id: 'bookings-a', label: 'Bookings · Air',    icon: 'plane',   path: '/bookings/air' },
      { id: 'support',    label: 'Support & Tickets', icon: 'inbox',   path: '/support' },
    ],
  },
  {
    label: 'People & Fleet',
    items: [
      { id: 'drivers',   label: 'Drivers',           icon: 'users',    path: '/drivers' },
      { id: 'vehicles',  label: 'Vehicles & Fleet',  icon: 'car',      path: '/vehicles' },
      { id: 'operators', label: 'Air Operators',     icon: 'building', path: '/operators' },
      { id: 'aircraft',  label: 'Aircraft & Crew',   icon: 'helipad',  path: '/aircraft' },
      { id: 'customers',        label: 'Customers',         icon: 'user',     path: '/customers' },
      { id: 'privacy-requests', label: 'Privacy Requests',  icon: 'shield',   path: '/privacy/requests' },
      { id: 'kyc',              label: 'KYC & Documents',   icon: 'shield',   path: '/kyc', count: '9' },
    ],
  },
  {
    label: 'Catalog & Pricing',
    items: [
      { id: 'catalog',    label: 'Catalog & Zones', icon: 'map',    path: '/catalog' },
      { id: 'pricing',    label: 'Pricing & Fares', icon: 'tag',    path: '/pricing' },
      { id: 'promotions', label: 'Promotions',      icon: 'flag',   path: '/promotions' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'payments', label: 'Payments & Ledger', icon: 'receipt', path: '/payments' },
      { id: 'payouts',  label: 'Payouts',           icon: 'wallet',  path: '/payouts' },
      { id: 'reports',  label: 'Reports',           icon: 'archive', path: '/reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'notifications', label: 'Notifications',    icon: 'envelope',  path: '/notifications' },
      { id: 'branding',      label: 'Branding',         icon: 'layers',    path: '/branding' },
      { id: 'rbac',          label: 'Roles & Access',   icon: 'key',       path: '/rbac' },
      { id: 'admins',        label: 'Admin Users',      icon: 'briefcase', path: '/admin-users' },
      { id: 'settings',      label: 'Settings & Flags', icon: 'settings',  path: '/settings' },
      { id: 'audit',         label: 'Audit Log',        icon: 'archive',   path: '/audit' },
      { id: 'integrations',  label: 'Integrations',     icon: 'globe',     path: '/integrations' },
    ],
  },
]

interface NavRailProps {
  activeId?: string
  isMobile?: boolean
  isOpen?: boolean
  onClose?: () => void
}

export default function NavRail({ activeId, isMobile, isOpen, onClose }: NavRailProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // Permission-based visibility
  const can = usePermissionStore(s => s.can)
  const isSuperAdmin = usePermissionStore(s => s.isSuperAdmin)
  const permissionsLoaded = usePermissionStore(s => s.permissionsLoaded)

  const canSeeItem = (id: string): boolean => {
    // Before permissions load, hide nothing (avoids flash)
    if (!permissionsLoaded) return true
    // Super admin sees everything
    if (isSuperAdmin) return true
    const keys = NAV_PERMISSIONS[id]
    // Unknown item or empty array = always show
    if (!keys || keys.length === 0) return true
    // Show if user has ANY of the required keys
    return keys.some(k => can(k))
  }

  // Dynamic driver badge: shows in_review count (drivers awaiting review)
  const [driverBadge,   setDriverBadge]   = useState<string | undefined>(undefined)
  const [dispatchBadge, setDispatchBadge] = useState<string | undefined>(undefined)
  const [supportBadge,  setSupportBadge]  = useState<string | undefined>(undefined)

  function fetchBadges() {
    // Drivers awaiting review
    driverService.listDrivers({ per_page: 1 })
      .then(data => {
        const count = data.status_counts['in_review'] ?? 0
        setDriverBadge(count > 0 ? String(count) : undefined)
      })
      .catch(() => setDriverBadge(undefined))

    // Live dispatch queue depth
    dispatchService.getQueueStats()
      .then(stats => {
        const n = stats.total_in_queue ?? 0
        setDispatchBadge(n > 0 ? String(n) : undefined)
      })
      .catch(() => setDispatchBadge(undefined))

    // Open + in-progress support tickets
    supportService.listTickets({ page: 1, page_size: 1, status: 'open' })
      .then(res => {
        const n = res.total ?? 0
        setSupportBadge(n > 0 ? String(n) : undefined)
      })
      .catch(() => setSupportBadge(undefined))
  }

  useEffect(() => {
    fetchBadges()
    // Refresh every 60 s so counts stay roughly current
    const timer = setInterval(fetchBadges, 60_000)
    return () => clearInterval(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = (item: { id: string; path: string }) => {
    if (activeId) return item.id === activeId
    return location.pathname.startsWith(item.path)
  }

  const handleNav = (path: string) => {
    navigate(path)
    if (isMobile) onClose?.()
  }

  return (
    <aside style={{
      width: 244,
      background: 'var(--surface)',
      borderRight: '1px solid var(--rule)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      // Mobile: fixed overlay drawer that slides in/out
      ...(isMobile ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        bottom: 0,
        height: '100%',
        zIndex: 200,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 260ms cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isOpen ? 'var(--shadow-pop)' : 'none',
      } : {}),
    }}>
      <div style={{
        padding: '20px 18px 16px',
        borderBottom: '1px solid var(--rule)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <BrandLockup />
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-3)', padding: '4px 6px', borderRadius: 3,
              display: 'flex', alignItems: 'center',
            }}
          >
            <Icon name="x" size={18} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => canSeeItem(item.id))
          if (visibleItems.length === 0) return null
          return (
          <div key={group.label}>
            <div className="nav-section-label">{group.label}</div>
            {visibleItems.map(item => (
              <div
                key={item.id}
                className={'nav-item' + (isActive(item) ? ' active' : '')}
                onClick={() => handleNav(item.path)}
              >
                <Icon name={item.icon} size={15} stroke={1.4} style={{ color: 'var(--ink-3)' }} />
                <span>{item.label}</span>
                {(() => {
                  const badge =
                    item.id === 'drivers'  ? driverBadge   :
                    item.id === 'dispatch' ? dispatchBadge :
                    item.id === 'support'  ? supportBadge  :
                    (item as { count?: string }).count
                  return badge ? <span className="count">{badge}</span> : null
                })()}
              </div>
            ))}
          </div>
          )
        })}
      </div>

      <div style={{
        padding: '12px 18px',
        borderTop: '1px solid var(--rule)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
        flexShrink: 0,
      }}>
        <span className="dot ok" />
        <span>All systems · v1.4.2</span>
      </div>
    </aside>
  )
}
