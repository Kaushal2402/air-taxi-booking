import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BrandLockup from './BrandLockup'
import Icon from '../ui/Icon'
import { driverService } from '../../services/driverService'

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { id: 'dashboard',  label: 'Dashboard',         icon: 'pie',     path: '/dashboard' },
      { id: 'dispatch',   label: 'Live Dispatch',     icon: 'bolt',    path: '/dispatch',  count: '12' },
      { id: 'bookings-r', label: 'Bookings · Road',   icon: 'car',     path: '/bookings/road' },
      { id: 'bookings-a', label: 'Bookings · Air',    icon: 'plane',   path: '/bookings/air' },
      { id: 'support',    label: 'Support & Tickets', icon: 'inbox',   path: '/support', count: '37' },
    ],
  },
  {
    label: 'People & Fleet',
    items: [
      { id: 'drivers',   label: 'Drivers',           icon: 'users',    path: '/drivers' },
      { id: 'vehicles',  label: 'Vehicles & Fleet',  icon: 'car',      path: '/vehicles' },
      { id: 'operators', label: 'Air Operators',     icon: 'building', path: '/operators' },
      { id: 'aircraft',  label: 'Aircraft & Crew',   icon: 'helipad',  path: '/aircraft' },
      { id: 'customers', label: 'Customers',         icon: 'user',     path: '/customers' },
      { id: 'kyc',       label: 'KYC & Documents',   icon: 'shield',   path: '/kyc', count: '9' },
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

  // Dynamic driver badge: shows in_review count (drivers awaiting review)
  const [driverBadge, setDriverBadge] = useState<string | undefined>(undefined)

  useEffect(() => {
    driverService.listDrivers({ per_page: 1 })
      .then(data => {
        const count = data.status_counts['in_review'] ?? 0
        setDriverBadge(count > 0 ? String(count) : undefined)
      })
      .catch(() => setDriverBadge(undefined))
  }, [])

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
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <div className="nav-section-label">{group.label}</div>
            {group.items.map(item => (
              <div
                key={item.id}
                className={'nav-item' + (isActive(item) ? ' active' : '')}
                onClick={() => handleNav(item.path)}
              >
                <Icon name={item.icon} size={15} stroke={1.4} style={{ color: 'var(--ink-3)' }} />
                <span>{item.label}</span>
                {(item.id === 'drivers' ? driverBadge : item.count) && (
                  <span className="count">{item.id === 'drivers' ? driverBadge : item.count}</span>
                )}
              </div>
            ))}
          </div>
        ))}
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
