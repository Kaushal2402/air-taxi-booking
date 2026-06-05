/* ─────────────────────────────────────────────────────────────
   Acme Mobility — Customer App · Moreen Theme
   Module 02 — Home & Discovery
   2.1 Home · 2.2 All Services · 2.3 Explore Routes
   2.4 Route Preview · 2.5 Promotions · 2.6 Notifications
   ───────────────────────────────────────────────────────────── */

// ── Extra icons for this module ───────────────────────────────
const EXTRA_M02 = {
  clock:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 3',
  tag:      'M20.59 13.41L13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82ZM7 7h.01',
  gift:     'M20 12v10H4V12M22 7H2v5h20V7ZM12 22V7M12 7h-4.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z',
  percent:  'M19 5L5 19M6.5 6.5h.01M17.5 17.5h.01',
  ticket:   'M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6ZM12 6v12',
  trending: 'M22 7L13 16L9 12L2 19M16 7h6v6',
  wallet:   'M2 7h20v14H2ZM16 14h.01M2 7V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2',
  copy:     'M9 9h13v13H9ZM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
};

// Icon wrapper — checks EXTRA_M02 first, falls back to shared Icon
function I({ name, size = 24, stroke = 1.6, style: sx, className }) {
  const d = EXTRA_M02[name];
  if (d) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth={stroke}
           strokeLinecap="round" strokeLinejoin="round"
           style={sx} className={className} aria-hidden="true">
        {d.split('M').filter(Boolean).map((seg, i) => (
          <path key={i} d={'M' + seg} />
        ))}
      </svg>
    );
  }
  return <Icon name={name} size={size} stroke={stroke} style={sx} className={className} />;
}

// ── Screen root ───────────────────────────────────────────────
function Screen({ children, bg = 'var(--bg)' }) {
  return (
    <div style={{
      width: 390, height: 844, overflow: 'hidden',
      background: bg, position: 'relative',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-sans)', color: 'var(--ink)',
    }}>
      {children}
    </div>
  );
}

// ── Bottom tab bar ────────────────────────────────────────────
function BottomBar({ active = 'home' }) {
  const tabs = [
    { id: 'home',    icon: 'home',   label: 'Home' },
    { id: 'explore', icon: 'search', label: 'Explore' },
    { id: 'trips',   icon: 'plane',  label: 'My Trips' },
    { id: 'profile', icon: 'user',   label: 'Profile' },
  ];
  return (
    <div style={{
      height: 82, flexShrink: 0, background: 'var(--surface)',
      borderTop: '1px solid var(--rule)',
      display: 'flex', alignItems: 'flex-start', paddingTop: 10,
    }}>
      {tabs.map(({ id, icon, label }) => {
        const on = id === active;
        return (
          <button key={id} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 4,
            color: on ? 'var(--emerald)' : 'var(--ink-4)',
            position: 'relative',
          }}>
            {on && (
              <div style={{
                position: 'absolute', top: -10, left: '50%',
                transform: 'translateX(-50%)',
                width: 28, height: 3, borderRadius: '0 0 3px 3px',
                background: 'var(--emerald)',
              }} />
            )}
            <I name={icon} size={24} stroke={on ? 2.2 : 1.5} />
            <span style={{ fontSize: 11, fontWeight: on ? 600 : 400, fontFamily: 'var(--font-sans)' }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Section header row
function SHdr({ title, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.015em' }}>{title}</span>
      {action && <button style={{ fontSize: 13, color: 'var(--emerald)', fontWeight: 500 }}>{action}</button>}
    </div>
  );
}

// Availability badge
function AvailBadge({ label, type = 'ok' }) {
  const map = { ok: ['var(--ok-soft)', 'var(--ok)'], warn: ['var(--warn-soft)', 'var(--warn)'], info: ['var(--info-soft)', 'var(--info)'] };
  const [bg, fg] = map[type] || map.ok;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', height: 22,
      padding: '0 8px', borderRadius: 'var(--r-pill)',
      background: bg, fontSize: 11, fontWeight: 600, color: fg,
    }}>{label}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2.1 — Home Dashboard
// ─────────────────────────────────────────────────────────────
function HomeScreen() {
  const CHIPS = [
    { icon: 'helicopter', label: 'Helicopter', on: true },
    { icon: 'plane',      label: 'Charter',    on: false },
    { icon: 'compass',    label: 'Shuttle',    on: false },
    { icon: 'star',       label: 'VIP',        on: false },
  ];
  const POPULAR = [
    { from: 'BOM', to: 'PNQ', fromLabel: 'Mumbai', toLabel: 'Pune',   dur: '42 min', price: '₹8,500', badge: 'Popular',   bt: 'ok' },
    { from: 'DEL', to: 'AGR', fromLabel: 'Delhi',  toLabel: 'Agra',   dur: '38 min', price: '₹9,200', badge: 'Available', bt: 'ok' },
    { from: 'BOM', to: 'GOI', fromLabel: 'Mumbai', toLabel: 'Goa',    dur: '80 min', price: '₹22,000',badge: 'Charter',   bt: 'info' },
  ];

  return (
    <Screen bg="var(--bg)">
      {/* ── Forest hero header ──────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(152deg, var(--forest) 0%, var(--forest-3) 100%)',
        paddingBottom: 48, flexShrink: 0, position: 'relative', overflow: 'visible',
      }}>
        {/* Decorative rings */}
        <svg style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none' }}
             width={200} height={200} viewBox="0 0 200 200" fill="none" aria-hidden>
          <circle cx="170" cy="30"  r="110" stroke="white" strokeWidth="0.7" opacity="0.05" />
          <circle cx="170" cy="30"  r="65"  stroke="white" strokeWidth="0.7" opacity="0.05" />
        </svg>

        <StatusBar dark />

        {/* Greeting row */}
        <div style={{ padding: '2px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 3 }}>
              Good afternoon
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Hello, Priya.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={{ width: 42, height: 42, borderRadius: 21, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <I name="bell" size={20} stroke={1.8} style={{ color: '#fff' }} />
              <div style={{ position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, background: 'var(--emerald)', border: '1.5px solid var(--forest)' }} />
            </button>
            <div style={{ width: 42, height: 42, borderRadius: 21, background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.2)' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, fontFamily: 'var(--font-sans)' }}>P</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick book card (overlapping header) ────────────── */}
      <div style={{ marginTop: -40, padding: '0 18px', position: 'relative', zIndex: 2, flexShrink: 0 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '16px 16px 14px', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>
            Where are you flying?
          </div>
          {/* From row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid var(--rule-soft)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <I name="location" size={16} stroke={1.8} style={{ color: 'var(--emerald)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 1 }}>From</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Mumbai Juhu Heliport</div>
            </div>
            <I name="chevRight" size={17} stroke={1.8} style={{ color: 'var(--ink-5)', flexShrink: 0 }} />
          </div>
          {/* To row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10, paddingBottom: 2 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <I name="compass" size={16} stroke={1.8} style={{ color: 'var(--ink-4)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 1 }}>To</div>
              <div style={{ fontSize: 15, color: 'var(--ink-4)', letterSpacing: '-0.01em' }}>Select destination</div>
            </div>
            <I name="chevRight" size={17} stroke={1.8} style={{ color: 'var(--ink-5)', flexShrink: 0 }} />
          </div>
          {/* CTA */}
          <div style={{ marginTop: 12 }}>
            <CTAButton variant="primary" style={{ height: 48 }}>
              <I name="search" size={16} stroke={2.2} /> Search flights
            </CTAButton>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ───────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '18px 0 0' }}>
        {/* Service type chips */}
        <div style={{ padding: '0 18px', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {CHIPS.map(({ icon, label, on }) => (
              <button key={label} style={{
                height: 36, padding: '0 13px', borderRadius: 'var(--r-pill)',
                background: on ? 'var(--forest)' : 'var(--surface)',
                border: '1.5px solid ' + (on ? 'transparent' : 'var(--rule)'),
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: on ? 600 : 400,
                color: on ? '#fff' : 'var(--ink-2)', whiteSpace: 'nowrap',
                boxShadow: on ? 'var(--shadow-sm)' : 'none',
              }}>
                <I name={icon} size={14} stroke={1.8} style={{ color: on ? 'var(--jade)' : 'var(--ink-4)' }} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming trip */}
        <div style={{ padding: '0 18px', marginBottom: 18 }}>
          <SHdr title="Upcoming trip" action="See all" />
          <div style={{ background: 'var(--forest)', borderRadius: 'var(--r-lg)', padding: '16px 16px 14px', position: 'relative', overflow: 'hidden' }}>
            <svg style={{ position: 'absolute', right: -10, top: -10, pointerEvents: 'none' }}
                 width={130} height={130} viewBox="0 0 130 130" fill="none" aria-hidden>
              <circle cx="110" cy="20" r="75" stroke="white" strokeWidth="0.8" opacity="0.06" />
              <circle cx="110" cy="20" r="44" stroke="white" strokeWidth="0.8" opacity="0.06" />
            </svg>
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 'var(--r-pill)', background: 'rgba(24,181,116,0.18)', border: '1px solid rgba(24,181,116,0.28)' }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--emerald)' }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--emerald)' }}>Confirmed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <I name="clock" size={13} stroke={1.8} style={{ color: 'rgba(255,255,255,0.35)' }} />
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>Today · 4:30 PM</span>
              </div>
            </div>
            {/* Route */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>BOM</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>Juhu Heliport</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 12px' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>42 min</span>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.18)', borderRadius: 1 }} />
                  <I name="plane" size={17} stroke={1.5} style={{ color: 'var(--jade)', flexShrink: 0 }} />
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.18)', borderRadius: 1 }} />
                </div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Direct</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>PNQ</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>Pune Lohegaon</div>
              </div>
            </div>
            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <I name="helicopter" size={13} stroke={1.8} style={{ color: 'rgba(255,255,255,0.45)' }} />
                <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Bell 407 · VT-HAX</span>
              </div>
              <button style={{ height: 30, padding: '0 12px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 12.5, fontWeight: 500, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                View ticket <I name="chevRight" size={13} stroke={2.2} />
              </button>
            </div>
          </div>
        </div>

        {/* Popular routes horizontal scroll */}
        <div>
          <div style={{ padding: '0 18px' }}>
            <SHdr title="Popular routes" action="See all" />
          </div>
          <div style={{ display: 'flex', gap: 12, paddingLeft: 18, overflow: 'hidden' }}>
            {POPULAR.map((r, i) => (
              <div key={i} style={{ width: 156, flexShrink: 0, background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '13px 13px 13px', border: '1px solid var(--rule)', boxShadow: 'var(--shadow-sm)' }}>
                <AvailBadge label={r.badge} type={r.bt} />
                <div style={{ marginTop: 8, fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {r.fromLabel}
                  <span style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 400 }}> → </span>
                  {r.toLabel}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 6 }}>
                  <I name="clock" size={12} stroke={1.8} style={{ color: 'var(--ink-4)' }} />
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.dur}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 17, fontWeight: 700, color: 'var(--emerald)', letterSpacing: '-0.02em' }}>{r.price}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomBar active="home" />
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 2.2 — All Services
// ─────────────────────────────────────────────────────────────
function AllServicesScreen() {
  const SERVICES = [
    { icon: 'helicopter', label: 'Helicopter',     sub: 'City-to-city transfer',   from: '₹7,500',  dark: true  },
    { icon: 'plane',      label: 'Charter Flight', sub: 'Full private charter',     from: '₹18,000', dark: true  },
    { icon: 'compass',    label: 'Air Shuttle',    sub: 'Shared scheduled seats',   from: '₹3,200',  dark: false },
    { icon: 'star',       label: 'VIP Transfer',   sub: 'Ground + air combined',    from: '₹24,000', dark: false },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 18px', flexShrink: 0 }}>
        <span style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.025em', fontFamily: 'var(--font-serif)' }}>
          Our Services
        </span>
      </div>

      <div style={{ flex: 1, padding: '4px 18px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Intro label */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 2 }}>
          4 mobility types available
        </div>

        {SERVICES.map(({ icon, label, sub, from, dark }) => (
          <div key={label} style={{
            borderRadius: 'var(--r-lg)', overflow: 'hidden',
            background: dark ? 'linear-gradient(132deg, var(--forest) 0%, var(--forest-3) 100%)' : 'var(--surface)',
            border: dark ? 'none' : '1.5px solid var(--rule)',
            boxShadow: dark ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            display: 'flex', alignItems: 'center', padding: '18px 18px',
            gap: 16, position: 'relative', overflow: 'hidden',
          }}>
            {dark && (
              <svg style={{ position: 'absolute', right: -12, top: -12, pointerEvents: 'none' }}
                   width={100} height={100} viewBox="0 0 100 100" fill="none" aria-hidden>
                <circle cx="80" cy="20" r="60" stroke="white" strokeWidth="0.7" opacity="0.07" />
              </svg>
            )}
            {/* Icon container */}
            <div style={{
              width: 52, height: 52, borderRadius: 'var(--r-md)', flexShrink: 0,
              background: dark ? 'rgba(255,255,255,0.1)' : 'var(--mint)',
              border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(24,181,116,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <I name={icon} size={26} stroke={1.6} style={{ color: dark ? 'var(--jade)' : 'var(--emerald)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: dark ? '#fff' : 'var(--ink)', letterSpacing: '-0.015em', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.5)' : 'var(--ink-3)', lineHeight: 1.4 }}>{sub}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.35)' : 'var(--ink-4)', marginBottom: 2 }}>from</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: dark ? 'var(--jade)' : 'var(--emerald)', letterSpacing: '-0.02em' }}>{from}</div>
            </div>
          </div>
        ))}

        {/* Loyalty card */}
        <div style={{
          borderRadius: 'var(--r-lg)', padding: '14px 16px',
          background: 'var(--mint)', border: '1.5px solid rgba(24,181,116,0.22)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <I name="wallet" size={24} stroke={1.6} style={{ color: 'var(--canopy)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--forest)', letterSpacing: '-0.01em' }}>Acme Miles · 2,450 pts</div>
            <div style={{ fontSize: 12.5, color: 'var(--canopy)', marginTop: 2 }}>₹245 credit available on next booking</div>
          </div>
          <I name="chevRight" size={18} stroke={1.8} style={{ color: 'var(--canopy)', flexShrink: 0 }} />
        </div>
      </div>

      <BottomBar active="home" />
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 2.3 — Explore Routes
// ─────────────────────────────────────────────────────────────
function ExploreRoutesScreen() {
  const FILTERS = ['All routes', 'Mumbai', 'Delhi', 'Bangalore', 'Goa'];
  const ROUTES = [
    { from: 'Mumbai', to: 'Pune',      code: 'BOM→PNQ', type: 'Helicopter',  dur: '42 min', price: '₹8,500',  avail: 6,  badge: 'ok' },
    { from: 'Mumbai', to: 'Shirdi',    code: 'BOM→SAG', type: 'Helicopter',  dur: '55 min', price: '₹11,200', avail: 4,  badge: 'warn' },
    { from: 'Delhi',  to: 'Agra',      code: 'DEL→AGR', type: 'Helicopter',  dur: '38 min', price: '₹9,200',  avail: 8,  badge: 'ok' },
    { from: 'Mumbai', to: 'Goa',       code: 'BOM→GOI', type: 'Charter',     dur: '80 min', price: '₹22,000', avail: 1,  badge: 'warn' },
    { from: 'Bangalore', to: 'Mysore', code: 'BLR→MYQ', type: 'Helicopter',  dur: '30 min', price: '₹7,800',  avail: 10, badge: 'ok' },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      {/* Header */}
      <div style={{ padding: '8px 18px 0', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)', marginBottom: 14 }}>
          Explore <em style={{ fontWeight: 300, color: 'var(--ink-3)', fontStyle: 'italic' }}>routes.</em>
        </div>
        {/* Search bar */}
        <div style={{ height: 48, borderRadius: 'var(--r-pill)', background: 'var(--surface)', border: '1.5px solid var(--rule-strong)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, marginBottom: 14 }}>
          <I name="search" size={18} stroke={1.8} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
          <span style={{ fontSize: 15, color: 'var(--ink-4)' }}>Search city or helipad…</span>
        </div>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
          {FILTERS.map((f, i) => (
            <button key={f} style={{
              height: 34, padding: '0 14px', borderRadius: 'var(--r-pill)', whiteSpace: 'nowrap', flexShrink: 0,
              background: i === 0 ? 'var(--forest)' : 'var(--surface)',
              border: '1.5px solid ' + (i === 0 ? 'transparent' : 'var(--rule)'),
              fontSize: 13, fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? '#fff' : 'var(--ink-2)',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Route list */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 18px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 2 }}>
          {ROUTES.length} routes found
        </div>
        {ROUTES.map((r, i) => (
          <div key={i} style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '14px 14px', border: '1px solid var(--rule)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Type icon */}
            <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: r.type === 'Charter' ? 'var(--forest)' : 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <I name={r.type === 'Charter' ? 'plane' : 'helicopter'} size={22} stroke={1.6}
                 style={{ color: r.type === 'Charter' ? 'var(--jade)' : 'var(--emerald)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
                  {r.from} <span style={{ color: 'var(--ink-4)', fontWeight: 400, fontSize: 13 }}>→</span> {r.to}
                </span>
                <AvailBadge label={r.avail <= 2 ? `${r.avail} left` : r.type} type={r.badge} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <I name="clock" size={12} stroke={1.8} style={{ color: 'var(--ink-4)' }} />
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{r.dur}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{r.code}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--emerald)', letterSpacing: '-0.02em' }}>{r.price}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>per seat</div>
            </div>
          </div>
        ))}
      </div>

      <BottomBar active="explore" />
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 2.4 — Route Preview
// ─────────────────────────────────────────────────────────────
function RoutePreviewScreen() {
  const TIERS = [
    { name: 'Standard',  price: '₹8,500',  seats: '6 seats avail', active: true },
    { name: 'Business',  price: '₹13,200', seats: '3 seats avail', active: false },
    { name: 'Charter',   price: '₹48,000', seats: 'Whole aircraft', active: false },
  ];

  return (
    <Screen bg="var(--bg)">
      {/* ── Forest hero with route arc ── */}
      <div style={{ height: 264, flexShrink: 0, background: 'linear-gradient(152deg, var(--forest) 0%, var(--forest-3) 100%)', position: 'relative', overflow: 'hidden' }}>
        <StatusBar dark />
        <NavBar dark showBack title="" right={
          <button style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <I name="star" size={17} stroke={1.8} style={{ color: '#fff' }} />
          </button>
        } />
        {/* Route arc SVG */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
             viewBox="0 0 390 264" fill="none" aria-hidden>
          <path d="M70 200 Q195 50 320 170" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="8 12" fill="none" />
          <path d="M70 200 Q195 60 320 170" stroke="var(--emerald)" strokeWidth="2" strokeDasharray="none" fill="none" opacity="0.5" />
          <circle cx="70"  cy="200" r="6" fill="var(--emerald)" opacity="0.9" />
          <circle cx="70"  cy="200" r="14" stroke="var(--emerald)" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="320" cy="170" r="6" fill="var(--jade)"    opacity="0.9" />
          <circle cx="320" cy="170" r="14" stroke="var(--jade)"    strokeWidth="1" fill="none" opacity="0.3" />
          {/* Aircraft */}
          <circle cx="198" cy="102" r="7"  fill="white" opacity="0.95" />
          <circle cx="198" cy="102" r="16" stroke="white" strokeWidth="0.8" fill="none" opacity="0.2" />
        </svg>
        {/* IATA codes */}
        <div style={{ position: 'absolute', bottom: 52, left: 52, color: '#fff' }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>BOM</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>Mumbai Juhu</div>
        </div>
        <div style={{ position: 'absolute', bottom: 52, right: 52, textAlign: 'right', color: '#fff' }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>PNQ</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>Pune Lohegaon</div>
        </div>
      </div>

      {/* ── Route detail card (overlapping hero) ── */}
      <div style={{ marginTop: -28, padding: '0 18px', position: 'relative', zIndex: 2, flexShrink: 0 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '18px 18px 16px', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)' }}>
                Mumbai <em style={{ fontStyle: 'italic', color: 'var(--ink-3)', fontWeight: 300 }}>to</em> Pune
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                {[['clock', '42 min'], ['helicopter', 'Helicopter'], ['location', 'Direct']].map(([ic, txt]) => (
                  <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <I name={ic} size={13} stroke={1.8} style={{ color: 'var(--ink-4)' }} />
                    <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{txt}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 2 }}>from</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--emerald)', letterSpacing: '-0.02em' }}>₹8,500</div>
            </div>
          </div>
          {/* Aircraft info */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--rule)', display: 'flex', gap: 16 }}>
            {[['Bell 407 GXi', 'Aircraft'], ['VT-HAX', 'Reg. no.'], ['6 seats', 'Capacity']].map(([val, lbl]) => (
              <div key={lbl}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pricing tiers ── */}
      <div style={{ padding: '18px 18px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 10 }}>Select your fare</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TIERS.map(({ name, price, seats, active }) => (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', padding: '13px 14px',
              borderRadius: 'var(--r-md)', gap: 14,
              border: '2px solid ' + (active ? 'var(--emerald)' : 'var(--rule)'),
              background: active ? 'var(--mint-2)' : 'var(--surface)',
              boxShadow: active ? 'var(--focus-ring)' : 'none',
            }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, border: '2px solid ' + (active ? 'var(--emerald)' : 'var(--rule-strong)'), background: active ? 'var(--emerald)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {active && <div style={{ width: 8, height: 8, borderRadius: 4, background: '#fff' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: active ? 'var(--forest)' : 'var(--ink)', letterSpacing: '-0.01em' }}>{name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{seats}</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: active ? 'var(--emerald)' : 'var(--ink-2)', letterSpacing: '-0.015em' }}>{price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Book CTA ── */}
      <div style={{ padding: '16px 18px 32px', flexShrink: 0 }}>
        <CTAButton variant="primary">
          Book now — ₹8,500 <I name="arrowRight" size={18} stroke={2.2} />
        </CTAButton>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 2.5 — Promotions & Offers
// ─────────────────────────────────────────────────────────────
function PromotionsScreen() {
  const COUPONS = [
    { code: 'FLY20',    label: '20% off',         sub: 'Your first helicopter booking', expires: 'Exp. Jun 15', bg: 'var(--forest)',    fg: '#fff', accent: 'var(--jade)' },
    { code: 'WEEKEND',  label: '₹1,500 off',      sub: 'Weekend bookings, Mumbai routes', expires: 'Exp. Jun 8', bg: 'var(--surface)',   fg: 'var(--ink)', accent: 'var(--emerald)' },
    { code: 'MEMBER10', label: '10% Members',      sub: 'Exclusive for Acme Miles members', expires: 'Ongoing',  bg: 'var(--surface)',   fg: 'var(--ink)', accent: 'var(--info)' },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 18px', flexShrink: 0 }}>
        <span style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.025em', fontFamily: 'var(--font-serif)' }}>Offers & Promos</span>
      </div>

      {/* Hero promo banner */}
      <div style={{ margin: '0 18px', borderRadius: 'var(--r-xl)', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(132deg, var(--forest) 0%, var(--canopy) 100%)', padding: '20px 20px', position: 'relative' }}>
        <svg style={{ position: 'absolute', right: -16, top: -16, pointerEvents: 'none' }}
             width={160} height={160} viewBox="0 0 160 160" fill="none" aria-hidden>
          <circle cx="140" cy="20" r="90" stroke="white" strokeWidth="0.8" opacity="0.07" />
          <circle cx="140" cy="20" r="54" stroke="white" strokeWidth="0.8" opacity="0.07" />
        </svg>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
          First flight offer
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 300, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 6 }}>
          20% <em style={{ fontStyle: 'italic' }}>off.</em>
        </div>
        <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 16, maxWidth: 200 }}>
          Use code at checkout on your first helicopter booking.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, color: '#fff', letterSpacing: '0.1em' }}>FLY20</span>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px', borderRadius: 'var(--r-pill)', background: 'var(--emerald)', border: 'none', fontSize: 13.5, fontWeight: 600, color: '#fff' }}>
            <I name="copy" size={14} stroke={2} /> Copy code
          </button>
        </div>
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <I name="tag" size={28} stroke={1.4} style={{ color: 'rgba(255,255,255,0.15)' }} />
        </div>
      </div>

      {/* Coupon list */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '18px 18px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 2 }}>
          All offers
        </div>
        {COUPONS.map(({ code, label, sub, expires, bg, fg, accent }) => (
          <div key={code} style={{
            background: bg, borderRadius: 'var(--r-lg)', overflow: 'hidden',
            border: bg === 'var(--surface)' ? '1.5px solid var(--rule)' : 'none',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex', alignItems: 'center',
          }}>
            {/* Accent strip */}
            <div style={{ width: 5, alignSelf: 'stretch', background: accent, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: bg === 'var(--surface)' ? 'var(--mint)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <I name="percent" size={20} stroke={2.2} style={{ color: accent }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: bg === 'var(--surface)' ? accent : '#fff', letterSpacing: '-0.01em' }}>{label}</div>
                <div style={{ fontSize: 12.5, color: bg === 'var(--surface)' ? 'var(--ink-3)' : 'rgba(255,255,255,0.5)', marginTop: 2, lineHeight: 1.35 }}>{sub}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: bg === 'var(--surface)' ? 'var(--ink)' : '#fff', letterSpacing: '0.06em' }}>{code}</div>
                <div style={{ fontSize: 11, color: bg === 'var(--surface)' ? 'var(--ink-4)' : 'rgba(255,255,255,0.35)', marginTop: 2 }}>{expires}</div>
              </div>
            </div>
          </div>
        ))}

        {/* Referral card */}
        <div style={{ background: 'var(--mint)', borderRadius: 'var(--r-lg)', padding: '14px 16px', border: '1.5px solid rgba(24,181,116,0.22)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <I name="gift" size={22} stroke={1.6} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--forest)', letterSpacing: '-0.01em' }}>Refer a friend</div>
            <div style={{ fontSize: 12.5, color: 'var(--canopy)', marginTop: 2, lineHeight: 1.4 }}>Both of you earn ₹500 when they book their first flight.</div>
          </div>
          <I name="chevRight" size={18} stroke={1.8} style={{ color: 'var(--canopy)' }} />
        </div>
      </div>

      <BottomBar active="home" />
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 2.6 — Notifications
// ─────────────────────────────────────────────────────────────
function NotificationsScreen() {
  const TODAY = [
    { type: 'ok',   icon: 'checkCircle', title: 'Booking confirmed',          body: 'BOM → PNQ · Today 4:30 PM · Bell 407',               time: '11:22 AM', read: false },
    { type: 'info', icon: 'plane',       title: 'Departure in 4 hours',        body: 'Your helicopter departs at 4:30 PM from Juhu Heliport.', time: '12:31 PM', read: false },
  ];
  const YESTERDAY = [
    { type: 'warn', icon: 'bell',        title: 'Price alert — Pune route',    body: 'Mumbai → Pune fare dropped to ₹7,900 for this weekend.', time: 'Yesterday', read: true },
    { type: 'ok',   icon: 'star',        title: 'Rate your last flight',       body: 'How was your BOM → GOI experience on Jun 2?',           time: 'Yesterday', read: true },
  ];
  const typeColors = { ok: 'var(--ok)', warn: 'var(--warn)', info: 'var(--info)', danger: 'var(--danger)' };
  const typeBg     = { ok: 'var(--ok-soft)', warn: 'var(--warn-soft)', info: 'var(--info-soft)', danger: 'var(--danger-soft)' };

  function NItem({ n }) {
    return (
      <div style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--rule-soft)', opacity: n.read ? 0.6 : 1 }}>
        <div style={{ width: 40, height: 40, borderRadius: 20, background: typeBg[n.type], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <I name={n.icon} size={19} stroke={1.6} style={{ color: typeColors[n.type] }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 14.5, fontWeight: n.read ? 500 : 600, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.2, flex: 1 }}>{n.title}</span>
            <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginLeft: 10, flexShrink: 0 }}>{n.time}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.45 }}>{n.body}</div>
        </div>
        {!n.read && <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--emerald)', flexShrink: 0, marginTop: 4 }} />}
      </div>
    );
  }

  return (
    <Screen bg="var(--surface)">
      <StatusBar />
      {/* Header */}
      <div style={{ padding: '8px 18px 14px', flexShrink: 0, borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)' }}>
          Notifications
        </div>
        <button style={{ fontSize: 13, color: 'var(--emerald)', fontWeight: 500 }}>Mark all read</button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '0 18px' }}>
        {/* Unread count pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 6px' }}>
          <div style={{ height: 22, padding: '0 10px', borderRadius: 'var(--r-pill)', background: 'var(--forest)', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#fff' }}>2 new</span>
          </div>
          <span style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Today</span>
        </div>

        {TODAY.map((n, i) => <NItem key={i} n={n} />)}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 6px' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Yesterday</span>
        </div>

        {YESTERDAY.map((n, i) => <NItem key={i} n={n} />)}

        {/* Empty state hint */}
        <div style={{ padding: '28px 0', textAlign: 'center' }}>
          <I name="bell" size={32} stroke={1.3} style={{ color: 'var(--ink-5)', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
          <div style={{ fontSize: 13.5, color: 'var(--ink-4)', lineHeight: 1.5 }}>You're all caught up.<br />We'll notify you of any flight updates.</div>
        </div>
      </div>

      <BottomBar active="home" />
    </Screen>
  );
}

Object.assign(window, {
  HomeScreen, AllServicesScreen, ExploreRoutesScreen,
  RoutePreviewScreen, PromotionsScreen, NotificationsScreen,
});
