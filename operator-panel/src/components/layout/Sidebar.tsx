import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BrandLockup from './BrandLockup'
import { useOperatorAuthStore } from '../../stores/authStore'
import {
  PieChart,
  Inbox,
  Zap,
  CloudSun,
  Users,
  RefreshCw,
  Heater,
  User,
  Route,
  Tag,
  Wallet,
  Archive,
  Shield,
  Bell,
  BellRing,
  Key,
  Building2,
  Settings,
  X,
  Clipboard,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { id: 'dashboard',  label: 'Dashboard',            Icon: PieChart,   path: '/dashboard' },
      { id: 'bookings',   label: 'Booking Requests',     Icon: Inbox,      path: '/bookings' },
      { id: 'dispatch',   label: 'Assignment',           Icon: Zap,        path: '/dispatch' },
      { id: 'dayof',      label: 'Day-of-Flight',        Icon: CloudSun,   path: '/day-of-flight' },
      { id: 'manifests',  label: 'Manifests',            Icon: Users,      path: '/manifests' },
      { id: 'cancel',              label: 'Cancel & Reschedule',  Icon: RefreshCw,  path: '/cancel' },
      { id: 'notification-center', label: 'Notification Center',  Icon: BellRing,   path: '/notification-center' },
    ],
  },
  {
    label: 'Crew Companion',
    items: [
      { id: 'companion', label: 'My Assignments', Icon: Clipboard, path: '/companion' },
    ],
  },
  {
    label: 'Fleet & Crew',
    items: [
      { id: 'aircraft', label: 'Aircraft & Fleet', Icon: Heater, path: '/aircraft' },
      { id: 'crew',     label: 'Crew',             Icon: User,   path: '/crew' },
    ],
  },
  {
    label: 'Schedule & Pricing',
    items: [
      { id: 'routes',  label: 'Routes & Schedule', Icon: Route, path: '/routes' },
      { id: 'pricing', label: 'Pricing & Quotes',  Icon: Tag,   path: '/pricing' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'payouts', label: 'Payouts & Settlements', Icon: Wallet,  path: '/payouts' },
      { id: 'reports', label: 'Reports',               Icon: Archive, path: '/reports' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { id: 'documents', label: 'Documents', Icon: Shield, path: '/documents' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'notifications', label: 'Notifications',   Icon: Bell,     path: '/notifications' },
      { id: 'team',          label: 'Team & Roles',    Icon: Key,      path: '/team' },
      { id: 'onboarding',    label: 'Company Profile', Icon: Building2, path: '/onboarding' },
      { id: 'settings',      label: 'Settings',        Icon: Settings, path: '/settings' },
    ],
  },
]

interface SidebarProps {
  activeId?: string
  isMobile?: boolean
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ activeId, isMobile, isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [_collapsed, setCollapsed] = useState(false)
  const operatorName = useOperatorAuthStore(s => s.user?.operatorName) ?? undefined

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
        <BrandLockup org={operatorName} />
        {isMobile && (
          <button
            onClick={() => { setCollapsed(false); onClose?.() }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-3)', padding: '4px 6px', borderRadius: 3,
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
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
                <item.Icon size={15} strokeWidth={1.4} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                <span>{item.label}</span>
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
        <span>Operator Panel · v1.0</span>
      </div>
    </aside>
  )
}
