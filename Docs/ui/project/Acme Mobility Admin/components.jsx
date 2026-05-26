/* Acme Mobility — shared components and icons.
   Loaded as Babel/JSX. Exposes Shell, NavRail, TopBar, Icon, etc. to window. */

// ──────────────────────────────────────────────────────────────
// Icon set — small, hairline, monoline (1.5 stroke). No fills.
// ──────────────────────────────────────────────────────────────
const ICONS = {
  search: 'M11 4a7 7 0 1 1-4.95 11.95L3 19m8-3a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  bell:  'M6 14V9a6 6 0 1 1 12 0v5l1.5 2.5h-15L6 14Zm3.5 3a2.5 2.5 0 0 0 5 0',
  plus:  'M12 5v14M5 12h14',
  chevDown: 'm6 9 6 6 6-6',
  chevRight: 'm9 6 6 6-6 6',
  chevLeft:  'm15 6-6 6 6 6',
  user:  'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 0c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6Z',
  settings: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm8 3a8.2 8.2 0 0 0-.1-1.3l2.1-1.6-2-3.4-2.4 1a8 8 0 0 0-2.3-1.3L15 2h-4l-.4 2.5a8 8 0 0 0-2.3 1.3l-2.4-1-2 3.4 2.1 1.6A8 8 0 0 0 4 12c0 .4 0 .9.1 1.3L2 14.9l2 3.4 2.4-1a8 8 0 0 0 2.3 1.3L9 22h4l.4-2.5a8 8 0 0 0 2.3-1.3l2.4 1 2-3.4-2.1-1.6c0-.4.1-.9.1-1.3Z',
  logout: 'M15 17l5-5-5-5M20 12H9M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z',
  key:    'M14.5 9.5a4 4 0 1 1-3 6L10 17l-2 2H4v-3l5.5-5.5a4 4 0 0 1 5-1Z',
  check:  'm5 13 4 4L19 7',
  close:  'M6 6l12 12M18 6 6 18',
  envelope: 'M3 7l9 6 9-6M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  phone:  'M5 4h3l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  globe:  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-2 4-5.5 4-9s-1.5-7-4-9m0 18c-2.5-2-4-5.5-4-9s1.5-7 4-9M3 12h18',
  map:    'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  car:    'M5 13l1.5-5h11L19 13M5 13v5h2v-2h10v2h2v-5M5 13h14M8 16h.01M16 16h.01',
  plane:  'M2 12l8-2 5-7 2 1-3 8 7 2 2-1-2 4-7-2-2 1-1 4-2-1 1-4-3-1-2 2-2-1 2-2-3-1',
  building: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h4a2 2 0 0 1 2 2v10M8 7h1M8 11h1M8 15h1M12 7h1M12 11h1M12 15h1M3 21h18',
  users:  'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 0c-4 0-7 2-7 6v2h14M16 11a4 4 0 1 0 0-8M16 11c4 0 6 2 6 6v2h-6',
  receipt:'M6 2v20l2-1.5L10 22l2-1.5L14 22l2-1.5L18 22V2l-2 1.5L14 2l-2 1.5L10 2 8 3.5 6 2Zm3 5h6M9 11h6M9 15h4',
  wallet: 'M3 8a2 2 0 0 1 2-2h12v4h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm14 4h2M17 12v4',
  bolt:   'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  pie:    'M12 12V3a9 9 0 1 0 9 9h-9Z',
  flag:   'M5 21V4m0 0h12l-2 4 2 4H5',
  layers: 'M12 2 2 7l10 5 10-5-10-5Zm-10 10 10 5 10-5M2 17l10 5 10-5',
  tag:    'M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Zm5-5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  alert:  'M12 3 2 21h20L12 3Zm0 6v6m0 3v.01',
  inbox:  'M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6m-18 0 3-9h12l3 9m-18 0h6l1 3h4l1-3h6',
  archive:'M3 7h18v3H3V7Zm2 3v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10M9 13h6',
  cog:    'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
  filter: 'M3 5h18l-7 8v7l-4-2v-5L3 5Z',
  download: 'M12 3v12m0 0-4-4m4 4 4-4M5 21h14',
  upload:   'M12 21V9m0 0-4 4m4-4 4 4M5 5h14',
  external: 'M14 4h6v6M10 14 20 4M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6',
  more:    'M6 12h.01M12 12h.01M18 12h.01',
  moreVert:'M12 6h.01M12 12h.01M12 18h.01',
  dot:     'M12 12h.01',
  clock:   'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  device:  'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7m0 0v3m-3 0h6M2 7v8a2 2 0 0 0 2 2h7',
  copy:    'M9 9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V9Zm-4-4h2v2M5 5a2 2 0 0 1 2-2M5 5v8a2 2 0 0 0 2 2h2',
  eye:     'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  sun:     'M12 5V3m0 18v-2m7-7h2M3 12h2m11.95-6.95-1.4 1.4M6.45 17.55l-1.4 1.4m13.5 0-1.4-1.4M6.45 6.45 5.05 5.05M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  moon:    'M21 13a8 8 0 1 1-10-10 7 7 0 0 0 10 10Z',
  refresh: 'M3 12a9 9 0 0 1 15-6.7L21 8m0-5v5h-5M21 12a9 9 0 0 1-15 6.7L3 16m0 5v-5h5',
  arrowRight: 'M5 12h14m0 0-6-6m6 6-6 6',
  arrowUp: 'M12 19V5m0 0-6 6m6-6 6 6',
  arrowDown: 'M12 5v14m0 0 6-6m-6 6-6-6',
  cmd: 'M9 9a3 3 0 1 1-3-3h12a3 3 0 1 1-3 3v6a3 3 0 1 1 3 3H6a3 3 0 1 1 3-3V9Z',
  helipad: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9 8v8m6-8v8M9 12h6',
  printer: 'M6 9V3h12v6M6 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-2M6 14h12v7H6v-7Z',
  briefcase: 'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Zm6 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4',
};

function Icon({ name, size = 16, stroke = 1.5, className, style }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round"
         className={className} style={style} aria-hidden="true">
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={'M' + seg} />
      ))}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// Brand lockup
// ──────────────────────────────────────────────────────────────
function BrandMark({ size = 22 }) {
  // A simple geometric mark — looks like a tail number plate.
  // Square with an inset diamond — neutral, brand-agnostic.
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <rect x="0.5" y="0.5" width="21" height="21" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11 4 18 11 11 18 4 11Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="11" r="1.6" fill="currentColor" />
    </svg>
  );
}

function BrandLockup({ size = 'md' }) {
  const isLg = size === 'lg';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isLg ? 12 : 10, color: 'var(--ink)' }}>
      <BrandMark size={isLg ? 28 : 22} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          fontSize: isLg ? 16 : 14,
          letterSpacing: '0.02em',
        }}>Acme Mobility</span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: isLg ? 10.5 : 9.5,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginTop: 4,
        }}>Operations Console</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// NavRail — left sidebar grouped by domain
// ──────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { id: 'dashboard',  label: 'Dashboard',          icon: 'pie'  },
      { id: 'dispatch',   label: 'Live Dispatch',      icon: 'bolt', count: '12' },
      { id: 'bookings-r', label: 'Bookings · Road',    icon: 'car'  },
      { id: 'bookings-a', label: 'Bookings · Air',     icon: 'plane' },
      { id: 'support',    label: 'Support & Tickets',  icon: 'inbox', count: '37' },
    ],
  },
  {
    label: 'People & Fleet',
    items: [
      { id: 'drivers',   label: 'Drivers',            icon: 'users', count: '4' },
      { id: 'vehicles',  label: 'Vehicles & Fleet',   icon: 'car' },
      { id: 'operators', label: 'Air Operators',      icon: 'building' },
      { id: 'aircraft',  label: 'Aircraft & Crew',    icon: 'helipad' },
      { id: 'customers', label: 'Customers',          icon: 'user' },
      { id: 'kyc',       label: 'KYC & Documents',    icon: 'shield', count: '9' },
    ],
  },
  {
    label: 'Catalog & Pricing',
    items: [
      { id: 'catalog',    label: 'Catalog & Zones',  icon: 'map' },
      { id: 'pricing',    label: 'Pricing & Fares',  icon: 'tag' },
      { id: 'promotions', label: 'Promotions',       icon: 'flag' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'payments', label: 'Payments & Ledger',  icon: 'receipt' },
      { id: 'payouts',  label: 'Payouts',            icon: 'wallet' },
      { id: 'reports',  label: 'Reports',            icon: 'archive' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'notifications', label: 'Notifications', icon: 'envelope' },
      { id: 'branding',      label: 'Branding',      icon: 'layers' },
      { id: 'rbac',          label: 'Roles & Access', icon: 'key' },
      { id: 'admins',        label: 'Admin Users',   icon: 'briefcase' },
      { id: 'settings',      label: 'Settings & Flags', icon: 'settings' },
      { id: 'audit',         label: 'Audit Log',     icon: 'archive' },
      { id: 'integrations',  label: 'Integrations',  icon: 'globe' },
    ],
  },
];

function NavRail({ active = 'admins' }) {
  return (
    <aside style={{
      width: 244,
      background: 'var(--surface)',
      borderRight: '1px solid var(--rule)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--rule)' }}>
        <BrandLockup />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <div className="nav-section-label">{group.label}</div>
            {group.items.map(item => (
              <div key={item.id} className={'nav-item' + (item.id === active ? ' active' : '')}>
                <Icon name={item.icon} size={15} stroke={1.4} style={{ color: 'var(--ink-3)' }} />
                <span>{item.label}</span>
                {item.count && <span className="count">{item.count}</span>}
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
      }}>
        <span className="dot ok" />
        <span>All systems · v1.4.2</span>
      </div>
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────
// TopBar — env badge, search, bell, quick-create, profile
// ──────────────────────────────────────────────────────────────
function TopBar({ title, subtitle, breadcrumb, actions }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      borderBottom: '1px solid var(--rule)',
      background: 'var(--surface)',
      height: 64,
      flexShrink: 0,
    }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {breadcrumb && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
            }}>{breadcrumb}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              fontSize: 22,
              letterSpacing: '-0.018em',
              color: 'var(--ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{title}</h1>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 0 0' }}>
        {/* env / brand badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 28, padding: '0 10px',
          border: '1px solid var(--rule-strong)',
          borderRadius: 3,
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-2)',
          background: 'var(--surface-2)',
        }}>
          <span className="dot ok" /> Acme Mobility · Prod · IN
        </div>
        <div className="input" style={{ width: 220, height: 32 }}>
          <Icon name="search" size={14} className="icon" />
          <input placeholder="Search bookings, drivers, ops…" />
          <span className="kbd">⌘K</span>
        </div>
        {actions}
        <button className="btn icon sm" title="Notifications" style={{ position: 'relative' }}>
          <Icon name="bell" size={15} />
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 6, height: 6, borderRadius: 3,
            background: 'var(--warn)',
            border: '1.5px solid var(--surface)',
          }} />
        </button>
        <button className="btn sm">
          <Icon name="plus" size={13} /> Quick create
        </button>
        <div style={{ width: 1, height: 28, background: 'var(--rule)', margin: '0 4px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 8, cursor: 'pointer' }}>
          <div className="avatar">SR</div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>Sana Reyes</span>
            <span style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Super Admin</span>
          </div>
          <Icon name="chevDown" size={13} style={{ color: 'var(--ink-3)' }} />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Shell — the layout wrapper used in all "in-app" screens
// ──────────────────────────────────────────────────────────────
function Shell({ active, title, subtitle, breadcrumb, actions, children }) {
  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      background: 'var(--bg)',
      color: 'var(--ink)',
      fontFamily: 'var(--font-sans)',
    }}>
      <NavRail active={active} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar title={title} subtitle={subtitle} breadcrumb={breadcrumb} actions={actions} />
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Small reusable bits
// ──────────────────────────────────────────────────────────────
function StatusBadge({ tone = 'ok', children, dot = true }) {
  return (
    <span className={'badge ' + tone}>
      {dot && <span className={'dot ' + tone} />}
      {children}
    </span>
  );
}

function MonoLabel({ children, style }) {
  return <div className="t-label" style={style}>{children}</div>;
}

function PageSection({ title, kicker, action, children, noPad }) {
  return (
    <section style={{ padding: noPad ? 0 : '28px 32px 8px' }}>
      {(title || kicker) && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            {kicker && <div className="t-label" style={{ marginBottom: 6 }}>{kicker}</div>}
            {title && <h2 style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              fontSize: 26,
              letterSpacing: '-0.020em',
              color: 'var(--ink)',
            }}>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// Hairline rule with optional label
function RuledLabel({ children, align = 'left' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink-3)' }}>
      {align !== 'left' && <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />}
      <span className="t-label">{children}</span>
      {align !== 'right' && <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Shared form primitives
// ──────────────────────────────────────────────────────────────
function FormSection({ title, description, children }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.014em', color: 'var(--ink)' }}>{title}</h3>
        <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
      </div>
      {description && <p style={{ marginTop: 0, marginBottom: 16, fontSize: 13, color: 'var(--ink-3)', maxWidth: 720, lineHeight: 1.55 }}>{description}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </section>
  );
}
function Row({ children, cols = 2 }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>{children}</div>;
}
function Field({ label, value, right, select, type, readOnly = true, placeholder }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      <div className="input">
        <input type={type || 'text'} defaultValue={value} readOnly={readOnly} placeholder={placeholder} style={{ flex: 1 }} />
        {right}
        {select && <Icon name="chevDown" size={14} className="icon" />}
      </div>
    </div>
  );
}
function FilterChip({ label, value, count }) {
  return (
    <button className="btn sm" style={{
      borderStyle: 'dashed',
      borderColor: count ? 'var(--accent)' : 'var(--rule-strong)',
      background: count ? 'var(--accent-soft-2)' : 'var(--surface)',
    }}>
      <Icon name="plus" size={11} style={{ color: count ? 'var(--accent)' : 'var(--ink-3)' }} />
      <span style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span style={{ width: 1, height: 12, background: 'var(--rule)' }} />
      <span style={{ color: 'var(--ink)' }}>{value}</span>
      {count && <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        background: 'var(--accent)', color: '#fff',
        padding: '1px 6px', borderRadius: 8,
      }}>{count}</span>}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
Object.assign(window, {
  Icon, BrandMark, BrandLockup,
  NavRail, TopBar, Shell,
  StatusBadge, MonoLabel, PageSection, RuledLabel,
  FormSection, Row, Field, FilterChip,
  NAV_GROUPS,
});
