/* ─────────────────────────────────────────────────────────────
   Acme Mobility — Customer App · Moreen Theme
   Module 05 — My Trips
   5.1 Trips List · 5.2 Trip Detail · 5.3 E-Ticket
   5.4 Live Tracking · 5.5 Cancel Booking
   ───────────────────────────────────────────────────────────── */

const EXTRA_M05 = {
  clock:       'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 3',
  headphones:  'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3ZM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z',
  message:     'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
  activity:    'M22 12h-4l-3 9L9 3l-3 9H2',
  xCircle:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15 9L9 15M9 9l6 6',
  ticket:      'M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6ZM12 6v12',
  download:    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  edit:        'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z',
  alertCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v4M12 16h.01',
  wallet:      'M2 7h20v14H2ZM16 14h.01M2 7V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2',
};

function I({ name, size = 24, stroke = 1.6, style: sx, className }) {
  const d = EXTRA_M05[name];
  if (d) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth={stroke}
           strokeLinecap="round" strokeLinejoin="round"
           style={sx} className={className} aria-hidden="true">
        {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={'M' + seg} />)}
      </svg>
    );
  }
  return <Icon name={name} size={size} stroke={stroke} style={sx} className={className} />;
}

function Screen({ children, bg = 'var(--bg)' }) {
  return (
    <div style={{
      width: 390, height: 844, overflow: 'hidden', background: bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-sans)', color: 'var(--ink)',
    }}>
      {children}
    </div>
  );
}

function BottomBar({ active = 'trips' }) {
  const tabs = [
    { id: 'home',    icon: 'home',   label: 'Home' },
    { id: 'explore', icon: 'search', label: 'Explore' },
    { id: 'trips',   icon: 'plane',  label: 'My Trips' },
    { id: 'profile', icon: 'user',   label: 'Profile' },
  ];
  return (
    <div style={{ height: 82, flexShrink: 0, background: 'var(--surface)', borderTop: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', paddingTop: 10 }}>
      {tabs.map(({ id, icon, label }) => {
        const on = id === active;
        return (
          <button key={id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: on ? 'var(--emerald)' : 'var(--ink-4)', position: 'relative' }}>
            {on && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', width: 28, height: 3, borderRadius: '0 0 3px 3px', background: 'var(--emerald)' }} />}
            <I name={icon} size={24} stroke={on ? 2.2 : 1.5} />
            <span style={{ fontSize: 11, fontWeight: on ? 600 : 400 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Compact trip card for list screen
function TripCard({ route, date, time, bref, aircraft, status, past = false }) {
  const statusCfg = {
    Confirmed: { bg: 'rgba(24,181,116,0.18)', border: 'rgba(24,181,116,0.28)', color: 'var(--emerald)', dot: 'var(--emerald)' },
    Pending:   { bg: 'rgba(201,123,12,0.18)',  border: 'rgba(201,123,12,0.28)',  color: 'var(--warn)',    dot: 'var(--warn)' },
    Completed: { bg: 'rgba(255,255,255,0.12)',  border: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', dot: 'rgba(255,255,255,0.4)' },
  }[status] || {};

  return (
    <div style={{
      background: past ? 'var(--surface-2)' : 'linear-gradient(132deg, var(--forest) 0%, var(--forest-3) 100%)',
      borderRadius: 'var(--r-lg)', padding: '15px 16px', position: 'relative', overflow: 'hidden',
      border: past ? '1px solid var(--rule)' : 'none',
      opacity: past ? 0.75 : 1,
    }}>
      {!past && (
        <svg style={{ position: 'absolute', right: -10, top: -10, pointerEvents: 'none' }}
             width={110} height={110} viewBox="0 0 110 110" fill="none" aria-hidden>
          <circle cx="90" cy="20" r="65" stroke="white" strokeWidth="0.7" opacity="0.06" />
        </svg>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 22, padding: '0 9px', borderRadius: 'var(--r-pill)', background: statusCfg.bg, border: '1px solid ' + statusCfg.border }}>
          <div style={{ width: 5, height: 5, borderRadius: 3, background: statusCfg.dot }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: statusCfg.color }}>{status}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <I name="clock" size={12} stroke={1.8} style={{ color: past ? 'var(--ink-4)' : 'rgba(255,255,255,0.38)' }} />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: past ? 'var(--ink-3)' : 'rgba(255,255,255,0.45)' }}>{date} · {time}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: past ? 'var(--ink)' : '#fff', letterSpacing: '-0.025em', lineHeight: 1 }}>{route.split('→')[0].trim()}</div>
          <div style={{ fontSize: 11, color: past ? 'var(--ink-4)' : 'rgba(255,255,255,0.4)', marginTop: 2 }}>{route.split('→')[0].trim() === 'BOM' ? 'Juhu Heliport' : route.split('→')[0].trim() === 'DEL' ? 'Safdarjung' : 'Origin'}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 10px', gap: 3 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: past ? 'var(--ink-4)' : 'rgba(255,255,255,0.3)' }}>42 min</span>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ flex: 1, height: 1, background: past ? 'var(--rule)' : 'rgba(255,255,255,0.18)' }} />
            <I name="plane" size={14} stroke={1.5} style={{ color: past ? 'var(--ink-3)' : 'var(--jade)', flexShrink: 0 }} />
            <div style={{ flex: 1, height: 1, background: past ? 'var(--rule)' : 'rgba(255,255,255,0.18)' }} />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: past ? 'var(--ink)' : '#fff', letterSpacing: '-0.025em', lineHeight: 1 }}>{route.split('→')[1].trim()}</div>
          <div style={{ fontSize: 11, color: past ? 'var(--ink-4)' : 'rgba(255,255,255,0.4)', marginTop: 2 }}>{route.split('→')[1].trim() === 'PNQ' ? 'Lohegaon' : route.split('→')[1].trim() === 'GOI' ? 'Dabolim' : 'Destination'}</div>
        </div>
      </div>
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid ' + (past ? 'var(--rule)' : 'rgba(255,255,255,0.1)'), display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: past ? 'var(--ink-4)' : 'rgba(255,255,255,0.38)', letterSpacing: '0.04em' }}>{bref}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <I name="helicopter" size={12} stroke={1.8} style={{ color: past ? 'var(--ink-4)' : 'rgba(255,255,255,0.38)' }} />
          <span style={{ fontSize: 11.5, color: past ? 'var(--ink-3)' : 'rgba(255,255,255,0.45)' }}>{aircraft}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5.1 — Trips List
// ─────────────────────────────────────────────────────────────
function TripsListScreen() {
  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <div style={{ padding: '8px 18px 0', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)', marginBottom: 16 }}>
          My <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-3)' }}>Trips.</em>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--rule)', marginBottom: 0 }}>
          {['Upcoming', 'Past'].map((t, i) => (
            <button key={t} style={{
              flex: 1, height: 44, fontSize: 14.5, fontWeight: i === 0 ? 600 : 500,
              color: i === 0 ? 'var(--ink)' : 'var(--ink-3)',
              borderBottom: i === 0 ? '2.5px solid var(--emerald)' : '2.5px solid transparent',
              marginBottom: -2, background: 'transparent',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Upcoming trips */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 18px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 2 }}>
          2 upcoming
        </div>

        <TripCard route="BOM → PNQ" date="Sat, Jun 7"  time="09:15 AM" bref="ACM-2026-04821" aircraft="Bell 407" status="Confirmed" />
        <TripCard route="BOM → GOI" date="Sun, Jun 22" time="08:00 AM" bref="ACM-2026-05144" aircraft="AS350"    status="Pending" />

        {/* Past divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>Past</span>
          <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        </div>

        <TripCard route="BOM → GOI" date="Mon, Jun 2"  time="10:00 AM" bref="ACM-2026-03762" aircraft="Bell 407" status="Completed" past />
      </div>

      <BottomBar active="trips" />
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 5.2 — Trip Detail
// ─────────────────────────────────────────────────────────────
function TripDetailScreen() {
  return (
    <Screen bg="var(--bg)">
      {/* Forest hero */}
      <div style={{ height: 240, flexShrink: 0, background: 'linear-gradient(152deg, var(--forest) 0%, var(--forest-3) 100%)', position: 'relative', overflow: 'hidden' }}>
        <StatusBar dark />
        <NavBar dark showBack title="" right={
          <button style={{ width: 34, height: 34, borderRadius: 17, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <I name="ticket" size={16} stroke={1.8} style={{ color: '#fff' }} />
          </button>
        } />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
             viewBox="0 0 390 240" fill="none" aria-hidden>
          <path d="M60 190 Q195 60 330 160" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="8 12" fill="none" />
          <path d="M60 190 Q195 70 330 160" stroke="var(--emerald)" strokeWidth="2" fill="none" opacity="0.45" />
          <circle cx="60"  cy="190" r="5"  fill="var(--emerald)" opacity="0.9" />
          <circle cx="60"  cy="190" r="12" stroke="var(--emerald)" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="330" cy="160" r="5"  fill="var(--jade)"    opacity="0.9" />
          <circle cx="330" cy="160" r="12" stroke="var(--jade)"    strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="196" cy="110" r="7"  fill="white" opacity="0.92" />
          <circle cx="196" cy="110" r="16" stroke="white" strokeWidth="0.8" fill="none" opacity="0.2" />
        </svg>
        <div style={{ position: 'absolute', bottom: 42, left: 44, color: '#fff' }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1 }}>BOM</div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>09:15 · Juhu</div>
        </div>
        <div style={{ position: 'absolute', bottom: 42, right: 44, textAlign: 'right', color: '#fff' }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1 }}>PNQ</div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>09:57 · Lohegaon</div>
        </div>
      </div>

      {/* Content sheet */}
      <div style={{ flex: 1, marginTop: -24, background: 'var(--surface)', borderRadius: '24px 24px 0 0', boxShadow: 'var(--shadow-hero)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Status + ref */}
        <div style={{ padding: '18px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', borderRadius: 'var(--r-pill)', background: 'var(--ok-soft)', border: '1px solid rgba(24,181,116,0.22)' }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--emerald)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ok)' }}>Confirmed</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>ACM-2026-04821</span>
        </div>

        {/* Info sections */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '14px 18px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Flight info */}
          {[
            { icon: 'plane', title: 'Flight info', items: [['Departure', 'Sat, Jun 7 · 09:15 AM'], ['Aircraft', 'Bell 407 GXi · VT-MBX'], ['Duration', '42 min · Direct'], ['Seats', '2A & 3A']] },
            { icon: 'users', title: 'Passengers', items: [['Passenger 1', 'Priya Sharma · Seat 2A'], ['Passenger 2', 'Arjun Sharma · Seat 3A']] },
            { icon: 'wallet', title: 'Payment', items: [['Total paid', '₹18,478'], ['Method', 'Visa •••• 4242'], ['Date', 'Jun 5, 2026']] },
          ].map(({ icon, title, items }) => (
            <div key={title} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '12px 14px', border: '1px solid var(--rule-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <I name={icon} size={15} stroke={1.8} style={{ color: 'var(--ink-3)' }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '-0.01em', textTransform: 'none' }}>{title}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Action row */}
          <div style={{ display: 'flex', gap: 8, paddingBottom: 24 }}>
            {[{ icon: 'ticket', label: 'E-Ticket', dark: true }, { icon: 'edit', label: 'Modify', dark: false }, { icon: 'xCircle', label: 'Cancel', dark: false }].map(({ icon, label, dark }) => (
              <button key={label} style={{ flex: 1, height: 46, borderRadius: 'var(--r-md)', background: dark ? 'var(--forest)' : 'var(--surface)', border: '1.5px solid ' + (dark ? 'transparent' : 'var(--rule)'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: dark ? '#fff' : label === 'Cancel' ? 'var(--danger)' : 'var(--ink-2)' }}>
                <I name={icon} size={17} stroke={1.8} />
                <span style={{ fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 5.3 — E-Ticket (Full Screen)
// ─────────────────────────────────────────────────────────────
function ETicketScreen() {
  return (
    <Screen bg="var(--surface-2)">
      <StatusBar />
      <div style={{ padding: '0 18px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 52 }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)', fontSize: 15 }}>
          <I name="chevLeft" size={22} stroke={2} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.015em' }}>E-Ticket</span>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 'var(--r-pill)', background: 'var(--forest)', fontSize: 13, fontWeight: 500, color: '#fff' }}>
          <I name="download" size={14} stroke={2} /> Save
        </button>
      </div>

      <div style={{ flex: 1, padding: '8px 18px 0', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Boarding pass */}
        <div style={{ background: '#fff', borderRadius: 20, overflow: 'visible', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--rule)', position: 'relative' }}>
          {/* Header strip */}
          <div style={{ background: 'linear-gradient(132deg, var(--forest) 0%, var(--forest-3) 100%)', borderRadius: '20px 20px 0 0', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <BrandLockup light size="sm" />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Boarding pass</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--jade)', letterSpacing: '0.06em' }}>ACM-2026-04821</div>
            </div>
          </div>

          {/* Route block */}
          <div style={{ padding: '16px 20px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>BOM</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>Mumbai · Juhu Heliport</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px', gap: 4 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)' }}>42 min</span>
                <svg width={80} height={20} viewBox="0 0 80 20" fill="none">
                  <line x1="2" y1="10" x2="60" y2="10" stroke="var(--ink-4)" strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d="M55 5l7 5-7 5" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="74" cy="10" r="3" fill="var(--emerald)" />
                </svg>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Direct</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>PNQ</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>Pune · Lohegaon Pad</div>
              </div>
            </div>
            {/* Fields grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 0', paddingTop: 10, borderTop: '1px solid var(--rule-soft)' }}>
              {[['Date', 'Sat, Jun 7'], ['Departure', '09:15 AM'], ['Arrival', '09:57 AM'], ['Aircraft', 'Bell 407 GXi'], ['Reg. No.', 'VT-MBX'], ['Class', 'Standard']].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Passenger section */}
          <div style={{ margin: '0 16px', borderTop: '1px dashed var(--rule-strong)', paddingTop: 12, paddingBottom: 12 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              {[{ name: 'PRIYA SHARMA', seat: '2A' }, { name: 'ARJUN SHARMA', seat: '3A' }].map(({ name, seat }) => (
                <div key={name} style={{ flex: 1, padding: '10px 12px', background: 'var(--mint-2)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(24,181,116,0.15)' }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--ink-4)', marginBottom: 3 }}>PASSENGER</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--forest)', letterSpacing: '0.03em' }}>{name}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Seat</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>{seat}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Perforated divider */}
          <div style={{ position: 'relative', margin: '0 -1px' }}>
            <div style={{ borderTop: '2px dashed var(--rule-strong)' }} />
            <div style={{ position: 'absolute', left: -10, top: -10, width: 20, height: 20, borderRadius: 10, background: 'var(--surface-2)' }} />
            <div style={{ position: 'absolute', right: -10, top: -10, width: 20, height: 20, borderRadius: 10, background: 'var(--surface-2)' }} />
          </div>

          {/* QR block */}
          <div style={{ padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 10, background: 'var(--surface-2)', border: '1.5px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width={56} height={56} viewBox="0 0 24 24" fill="none">
                <rect x="2"  y="2"  width="8" height="8" rx="1" stroke="var(--ink-3)" strokeWidth="1.4" />
                <rect x="14" y="2"  width="8" height="8" rx="1" stroke="var(--ink-3)" strokeWidth="1.4" />
                <rect x="2"  y="14" width="8" height="8" rx="1" stroke="var(--ink-3)" strokeWidth="1.4" />
                <rect x="4.5" y="4.5" width="3" height="3" fill="var(--ink-3)" />
                <rect x="16.5" y="4.5" width="3" height="3" fill="var(--ink-3)" />
                <rect x="4.5" y="16.5" width="3" height="3" fill="var(--ink-3)" />
                <path d="M14 14h2v2h-2ZM18 14h2v2h-2ZM14 18h4M20 16v4M18 20h2" stroke="var(--ink-3)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 4 }}>Scan at boarding gate</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--forest)', letterSpacing: '0.05em' }}>ACM-2026-04821</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>Sat, Jun 7 · Gate opens 09:00 AM</div>
            </div>
          </div>
        </div>

        {/* Share row */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, paddingBottom: 24 }}>
          <CTAButton variant="primary" style={{ height: 48, background: 'var(--forest)' }}>
            <I name="download" size={16} stroke={2} /> Download PDF
          </CTAButton>
          <button style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1.5px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <I name="share" size={20} stroke={1.8} style={{ color: 'var(--ink-2)' }} />
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 5.4 — Live Tracking
// ─────────────────────────────────────────────────────────────
function LiveTrackingScreen() {
  const STEPS = [
    { label: 'Departed',  time: '09:15', done: true },
    { label: 'In flight', time: '09:32', done: true, active: true },
    { label: 'Landing',   time: '09:57', done: false },
  ];

  return (
    <Screen bg="var(--bg)">
      {/* Map bg with route */}
      <div style={{ flex: 1, position: 'relative', background: '#EEF2ED', overflow: 'hidden' }}>
        {/* Dot grid map */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
             viewBox="0 0 390 600" fill="none" aria-hidden>
          {Array.from({ length: 20 }, (_, row) =>
            Array.from({ length: 13 }, (_, col) => (
              <circle key={`${row}-${col}`} cx={col * 30 + 10} cy={row * 30 + 10} r="1.2" fill="var(--canopy)" opacity="0.15" />
            ))
          )}
          {/* Route arc dashed */}
          <path d="M70 480 Q195 180 330 280"
                stroke="rgba(12,42,28,0.12)" strokeWidth="2" strokeDasharray="10 14" fill="none" />
          {/* Route solid progress (60%) */}
          <path d="M70 480 Q195 180 264 235"
                stroke="var(--emerald)" strokeWidth="3" fill="none" opacity="0.8" />
          {/* Origin */}
          <circle cx="70"  cy="480" r="7" fill="var(--emerald)" />
          <circle cx="70"  cy="480" r="16" stroke="var(--emerald)" strokeWidth="1.5" fill="none" opacity="0.3" />
          <text x="76" y="500" fontSize="11" fill="var(--forest)" fontWeight="600" fontFamily="monospace">BOM</text>
          {/* Destination */}
          <circle cx="330" cy="280" r="7" fill="var(--ink-4)" />
          <circle cx="330" cy="280" r="14" stroke="var(--ink-4)" strokeWidth="1.2" fill="none" opacity="0.3" />
          <text x="334" y="273" fontSize="11" fill="var(--forest)" fontWeight="600" fontFamily="monospace">PNQ</text>
          {/* Aircraft position ~60% */}
          <circle cx="264" cy="235" r="10" fill="var(--forest)" />
          <circle cx="264" cy="235" r="20" stroke="var(--forest)" strokeWidth="1.5" fill="none" opacity="0.2" />
          <circle cx="264" cy="235" r="32" stroke="var(--forest)" strokeWidth="1" fill="none" opacity="0.08" />
        </svg>

        {/* Top bar */}
        <div style={{ background: 'linear-gradient(180deg, var(--forest) 0%, rgba(12,42,28,0.92) 100%)', padding: '0 0 14px', position: 'relative', zIndex: 2, flexShrink: 0 }}>
          <StatusBar dark />
          <div style={{ padding: '0 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--emerald)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Live tracking</span>
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: '#fff', letterSpacing: '-0.02em', marginTop: 2 }}>
                BOM <em style={{ fontStyle: 'italic', fontWeight: 300, opacity: 0.6 }}>→</em> PNQ
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>ETA</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--jade)' }}>25 min</div>
            </div>
          </div>
        </div>

        {/* Bottom info card */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '16px 18px 20px', boxShadow: '0 -8px 24px rgba(0,0,0,0.1)', zIndex: 2 }}>
          {/* Progress bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>09:15 Departure</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>09:57 Arrival</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--rule)', overflow: 'hidden' }}>
              <div style={{ width: '62%', height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--forest), var(--emerald))' }} />
            </div>
          </div>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
            {[['220 km/h', 'Speed'], ['1,800 ft', 'Altitude'], ['Bell 407', 'Aircraft'], ['VT-MBX', 'Reg.']].map(([v, k]) => (
              <div key={k} style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--rule-soft)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}>{v}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{k}</div>
              </div>
            ))}
          </div>
          {/* Status steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s.label}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 13, background: s.done ? 'var(--emerald)' : 'var(--surface-2)', border: s.active ? '2px solid var(--emerald)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.done && !s.active
                      ? <I name="check" size={13} stroke={2.5} style={{ color: '#fff' }} />
                      : s.active
                        ? <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--emerald)' }} />
                        : <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--ink-5)' }} />
                    }
                  </div>
                  <span style={{ fontSize: 11, fontWeight: s.active ? 600 : 400, color: s.active ? 'var(--ink)' : s.done ? 'var(--emerald)' : 'var(--ink-4)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{s.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{s.time}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: s.done && !s.active ? 'var(--emerald)' : 'var(--rule)', borderRadius: 1, margin: '0 6px', marginTop: -24 }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 5.5 — Cancel Booking
// ─────────────────────────────────────────────────────────────
function CancelBookingScreen() {
  const POLICY = [
    { label: '24+ hrs before', refund: '100%', amt: '₹18,478', active: false },
    { label: '12–24 hrs',      refund: '75%',  amt: '₹13,858', active: true },
    { label: '2–12 hrs',       refund: '50%',  amt: '₹9,239',  active: false },
    { label: 'Under 2 hrs',    refund: '0%',   amt: '₹0',      active: false },
  ];
  const REASONS = ['Change of plans', 'Booked by mistake', 'Medical emergency', 'Other'];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="Cancel booking" />

      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 18px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Booking recap */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '13px 16px', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <I name="plane" size={20} stroke={1.6} style={{ color: 'var(--jade)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>BOM → PNQ</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>Sat, Jun 7 · 09:15 AM · 2 passengers</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>₹18,478</div>
          </div>
        </div>

        {/* Cancellation policy */}
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 10 }}>Cancellation & refund policy</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {POLICY.map(({ label, refund, amt, active }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderRadius: 'var(--r-md)', background: active ? 'var(--warn-soft)' : 'var(--surface)',
                border: '1.5px solid ' + (active ? 'rgba(201,123,12,0.3)' : 'var(--rule)'),
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? 'var(--warn)' : 'var(--ink-2)' }}>{label}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: active ? 'var(--warn)' : 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{refund}</div>
                  <div style={{ fontSize: 11.5, color: active ? 'var(--warn)' : 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{amt}</div>
                </div>
                {active && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 10, background: 'var(--warn)', flexShrink: 0 }}>
                    <I name="check" size={11} stroke={2.5} style={{ color: '#fff' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Refund summary */}
        <div style={{ padding: '13px 16px', background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Estimated refund</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2 }}>Back to Visa •••• 4242 in 5–7 days</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warn)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>₹13,858</div>
        </div>

        {/* Reason */}
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Reason for cancellation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {REASONS.map((r, i) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', borderRadius: 'var(--r-md)', border: '1.5px solid ' + (i === 0 ? 'var(--emerald)' : 'var(--rule)'), cursor: 'pointer' }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, border: '2px solid ' + (i === 0 ? 'var(--emerald)' : 'var(--rule-strong)'), background: i === 0 ? 'var(--emerald)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {i === 0 && <div style={{ width: 7, height: 7, borderRadius: 4, background: '#fff' }} />}
                </div>
                <span style={{ fontSize: 14, color: i === 0 ? 'var(--ink)' : 'var(--ink-2)', fontWeight: i === 0 ? 500 : 400 }}>{r}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Confirm cancel CTA */}
        <div style={{ paddingBottom: 36, flexShrink: 0 }}>
          <CTAButton variant="primary" style={{ background: 'var(--danger)' }}>
            <I name="xCircle" size={18} stroke={2} /> Confirm cancellation
          </CTAButton>
          <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-4)' }}>
            This action cannot be undone.
          </p>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, {
  TripsListScreen, TripDetailScreen, ETicketScreen,
  LiveTrackingScreen, CancelBookingScreen,
});
