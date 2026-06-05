/* ─────────────────────────────────────────────────────────────
   Acme Mobility — Customer App · Moreen Theme
   Shared mobile components: Icons, StatusBar, NavBar, BrandMark
   ───────────────────────────────────────────────────────────── */

// ── Icon set ─────────────────────────────────────────────────
// Paths use uppercase M separators so the split-render helper works.
const ICONS = {
  /* Navigation */
  arrowLeft:  'M19 12H5M11 6L5 12L11 18',
  arrowRight: 'M5 12H19M13 6L19 12L13 18',
  chevLeft:   'M15 18L9 12L15 6',
  chevRight:  'M9 6L15 12L9 18',
  chevDown:   'M6 9L12 15L18 9',
  chevUp:     'M18 15L12 9L6 15',
  close:      'M6 6L18 18M18 6L6 18',

  /* Auth & identity */
  eye:       'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  eyeOff:    'M17.94 17.94A10 10 0 0 1 12 20c-7 0-10-7-10-7a18.06 18.06 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1L23 23',
  lock:      'M7 11V7a5 5 0 0 1 10 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z',
  unlock:    'M7 11V7a5 5 0 0 1 9.9-1M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z',
  envelope:  'M3 7L12 13L21 7M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  phone:     'M5 4h3l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  user:      'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 20c0-4-3.6-7-8-7s-8 3-8 7',
  shield:    'M12 3L4 7v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7L12 3Z',
  key:       'M14.5 9.5a4 4 0 1 1-3 6L10 17L8 19H5v-2L5 15h2l1.5-1.5a4 4 0 0 1 6-4Z',
  check:     'M5 13L9 17L19 7',
  checkCircle: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01L9 11.01',

  /* Profile & settings */
  camera:    'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4L9 3h6l2 3h4a2 2 0 0 1 2 2ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  bell:      'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  settings:  'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM2 12h2M20 12h2M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41',
  location:  'M12 21S4 13.6 4 9a8 8 0 0 1 16 0c0 4.6-8 12-8 12ZM12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',

  /* Mobility */
  plane:     'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9L2 14v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16Z',
  helicopter:'M5 11h14M12 11V7M9 7h6M5 11L3 17M19 11L21 17M10 17h4',
  compass:   'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z',

  /* UI */
  info:      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v4M12 16h.01',
  refresh:   'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5H16M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
  star:      'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z',
  home:      'M3 12L12 3L21 12V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z',
  search:    'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35',
  logout:    'M15 17l5-5-5-5M20 12H9M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7',
  more:      'M12 5h.01M12 12h.01M12 19h.01',
  sun:       'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  moon:      'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
};

function Icon({ name, size = 24, stroke = 1.6, style, className }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round"
         style={style} className={className} aria-hidden="true">
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={'M' + seg} />
      ))}
    </svg>
  );
}

// ── iOS-style status bar ─────────────────────────────────────
function StatusBar({ dark = false }) {
  const fg = dark ? 'rgba(255,255,255,0.95)' : 'var(--ink)';
  return (
    <div style={{
      height: 50, flexShrink: 0,
      display: 'flex', alignItems: 'flex-end',
      justifyContent: 'space-between',
      padding: '0 28px 10px',
    }}>
      <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3,
                     fontFamily: 'var(--font-sans)', color: fg }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {/* Signal */}
        <svg width={17} height={11} viewBox="0 0 17 11">
          <rect x="0"   y="4"   width="3" height="7"  rx="0.8" fill={fg}/>
          <rect x="4.5" y="2.5" width="3" height="8.5" rx="0.8" fill={fg}/>
          <rect x="9"   y="1"   width="3" height="10" rx="0.8" fill={fg}/>
          <rect x="13.5" y="0" width="3" height="11" rx="0.8" fill={fg} opacity="0.25"/>
        </svg>
        {/* WiFi */}
        <svg width={16} height={12} viewBox="0 0 16 12" fill="none">
          <circle cx="8" cy="10.5" r="1" fill={fg}/>
          <path d="M5.5 7.5A3.5 3.5 0 0 1 8 6.5a3.5 3.5 0 0 1 2.5 1"
                stroke={fg} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
          <path d="M3 5A6.5 6.5 0 0 1 8 3a6.5 6.5 0 0 1 5 2"
                stroke={fg} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.6"/>
          <path d="M1 2.5A9 9 0 0 1 8 0a9 9 0 0 1 7 2.5"
                stroke={fg} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.3"/>
        </svg>
        {/* Battery */}
        <svg width={26} height={12} viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3"
                stroke={fg} strokeOpacity="0.35" strokeWidth="1"/>
          <rect x="2" y="2" width="16" height="8" rx="1.5" fill={fg}/>
          <path d="M23.5 4.5v3a1.5 1.5 0 0 0 0-3Z" fill={fg} fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

// ── Mobile navigation bar (top) ──────────────────────────────
function NavBar({ title = '', dark = false, showBack = true, right = null }) {
  const c = dark ? '#FFFFFF' : 'var(--ink)';
  return (
    <div style={{
      height: 52, flexShrink: 0,
      display: 'flex', alignItems: 'center',
      padding: '0 8px', position: 'relative',
    }}>
      {showBack && (
        <button style={{
          width: 44, height: 44, borderRadius: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: c,
        }}>
          <Icon name="chevLeft" size={26} stroke={2} />
        </button>
      )}
      {title && (
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 17, fontWeight: 600, color: c, letterSpacing: -0.3,
          fontFamily: 'var(--font-sans)',
        }}>{title}</span>
      )}
      {right && (
        <div style={{ marginLeft: 'auto', paddingRight: 8 }}>{right}</div>
      )}
    </div>
  );
}

// ── Customer brand mark — a route-compass mark ───────────────
function BrandMark({ size = 44, light = false }) {
  const ring  = light ? 'rgba(255,255,255,0.18)' : 'var(--mint)';
  const stroke = light ? '#FFFFFF' : 'var(--emerald)';
  const dot    = light ? 'rgba(255,255,255,0.9)' : 'var(--emerald)';
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: ring,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: light ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(24,181,116,0.22)',
    }}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.6"/>
        <path d="M15 9L12 12L9 15" stroke={stroke} strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 9L12 12L15 15" stroke={stroke} strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round" opacity="0.35"/>
        <circle cx="12" cy="12" r="1.8" fill={dot}/>
      </svg>
    </div>
  );
}

function BrandLockup({ size = 'md', light = false }) {
  const isLg = size === 'lg';
  const c  = light ? '#FFFFFF' : 'var(--ink)';
  const sc = light ? 'rgba(255,255,255,0.5)' : 'var(--ink-3)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isLg ? 14 : 10 }}>
      <BrandMark size={isLg ? 48 : 36} light={light}/>
      <div style={{ lineHeight: 1 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontWeight: 600,
          fontSize: isLg ? 20 : 15, color: c, letterSpacing: -0.3,
        }}>Acme Mobility</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: isLg ? 10 : 9.5,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: sc, marginTop: 4,
        }}>Premium Transport</div>
      </div>
    </div>
  );
}

// ── Shared CTA button ────────────────────────────────────────
function CTAButton({ children, variant = 'primary', style: xStyle = {}, onClick }) {
  const base = {
    width: '100%', height: 56, borderRadius: 'var(--r-pill)',
    border: 'none', fontFamily: 'var(--font-sans)',
    fontSize: 16, fontWeight: 600, cursor: 'pointer', letterSpacing: -0.2,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };
  const variants = {
    primary:  { background: 'var(--emerald)', color: '#fff' },
    outline:  { background: 'transparent', color: 'var(--emerald)',
                border: '1.5px solid var(--emerald)' },
    ghost:    { background: 'transparent', color: 'var(--ink-2)' },
    subtle:   { background: 'var(--surface-2)', color: 'var(--ink-2)' },
    dark:     { background: 'rgba(255,255,255,0.13)', color: '#fff',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.18)' },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...xStyle }} onClick={onClick}>
      {children}
    </button>
  );
}

// ── Mobile text input ────────────────────────────────────────
function MobileInput({ label, type = 'text', value, placeholder, icon, rightSlot, focused }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)',
                        letterSpacing: -0.1, fontFamily: 'var(--font-sans)' }}>
          {label}
        </label>
      )}
      <div style={{
        height: 56, borderRadius: 'var(--r-md)',
        border: '1.5px solid ' + (focused ? 'var(--emerald)' : 'var(--rule-strong)'),
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
        boxShadow: focused ? 'var(--focus-ring)' : 'none',
      }}>
        {icon && <Icon name={icon} size={20} stroke={1.5}
                       style={{ color: 'var(--ink-4)', flexShrink: 0 }}/>}
        <span style={{ flex: 1, fontSize: 16, color: value ? 'var(--ink)' : 'var(--ink-4)',
                       fontFamily: 'var(--font-sans)' }}>
          {value || placeholder}
        </span>
        {rightSlot}
      </div>
    </div>
  );
}

Object.assign(window, {
  Icon, StatusBar, NavBar, BrandMark, BrandLockup, CTAButton, MobileInput,
});
