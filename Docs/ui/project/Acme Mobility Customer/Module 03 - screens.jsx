/* ─────────────────────────────────────────────────────────────
   Acme Mobility — Customer App · Moreen Theme
   Module 03 — Search & Booking
   3.1 Destination Picker · 3.2 Date & Time · 3.3 Passengers
   3.4 Search Results · 3.5 Seat Map · 3.6 Passenger Details
   3.7 Booking Summary
   ───────────────────────────────────────────────────────────── */

const EXTRA_M03 = {
  calendar:   'M3 4h18v18H3V4ZM16 2v4M8 2v4M3 10h18',
  users:      'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  creditCard: 'M2 5h20v14H2ZM2 10h20',
  filter:     'M22 3H2l8 9.46V19l4 2v-8.54L22 3Z',
  sliders:    'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  minus:      'M5 12h14',
  plus:       'M12 5v14M5 12h14',
  clock:      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 3',
  trending:   'M22 7L13 16L9 12L2 19M16 7h6v6',
  ticket:     'M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6ZM12 6v12',
};

function I({ name, size = 24, stroke = 1.6, style: sx, className }) {
  const d = EXTRA_M03[name];
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
      fontFamily: 'var(--font-sans)', color: 'var(--ink)', position: 'relative',
    }}>
      {children}
    </div>
  );
}

// Booking flow step progress
function FlowStep({ steps = ['Seats', 'Details', 'Payment'], current = 1 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 24px 14px', flexShrink: 0 }}>
      {steps.map((s, i) => {
        const done = i < current;
        const on   = i === current;
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14,
                background: done ? 'var(--emerald)' : on ? 'var(--forest)' : 'var(--surface-2)',
                border: on || done ? 'none' : '1.5px solid var(--rule-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done
                  ? <I name="check" size={14} stroke={2.5} style={{ color: '#fff' }} />
                  : <span style={{ fontSize: 12, fontWeight: 600, color: on ? '#fff' : 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 400, color: on ? 'var(--ink)' : done ? 'var(--emerald)' : 'var(--ink-4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, borderRadius: 1, margin: '0 6px', marginTop: -18, background: done ? 'var(--emerald)' : 'var(--rule)' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Mock iOS keyboard
function MockKeyboard() {
  const rows = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['⇧','Z','X','C','V','B','N','M','⌫'],
  ];
  return (
    <div style={{ background: '#CDD0D6', padding: '10px 6px 6px', flexShrink: 0 }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: ri === 2 ? 0 : 5, marginBottom: 8 }}>
          {ri === 2 && <div style={{ flex: 1 }} />}
          {row.map((k, ki) => (
            <div key={ki} style={{
              height: 42, minWidth: k === '⇧' || k === '⌫' ? 42 : 33,
              flex: k === '⇧' || k === '⌫' ? '0 0 42px' : '0 0 33px',
              background: k === '⇧' || k === '⌫' ? '#AEB2BA' : '#FFFFFF',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: k.length > 1 ? 14 : 16, fontWeight: 400,
              color: '#131311', boxShadow: '0 1px 0 rgba(0,0,0,0.3)',
              fontFamily: 'var(--font-sans)',
            }}>{k}</div>
          ))}
          {ri === 2 && <div style={{ flex: 1 }} />}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
        {[{ w: 80, label: '123' }, { w: 180, label: 'space' }, { w: 80, label: 'return' }].map(({ w, label }) => (
          <div key={label} style={{ width: w, height: 42, background: label === 'space' ? '#fff' : '#AEB2BA', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#131311', boxShadow: '0 1px 0 rgba(0,0,0,0.3)' }}>{label}</div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3.1 — Destination Picker
// ─────────────────────────────────────────────────────────────
function DestinationPickerScreen() {
  const RECENT = [
    { city: 'Pune',    pad: 'Pune City Helipad',   code: 'PNQ' },
    { city: 'Shirdi',  pad: 'Shirdi Airport',       code: 'SAG' },
  ];
  const POPULAR = [
    { city: 'Pune',      code: 'PNQ', routes: 8 },
    { city: 'Goa',       code: 'GOI', routes: 5 },
    { city: 'Delhi',     code: 'DEL', routes: 6 },
    { city: 'Agra',      code: 'AGR', routes: 3 },
    { city: 'Bangalore', code: 'BLR', routes: 7 },
  ];

  return (
    <Screen bg="var(--surface)">
      {/* Forest header */}
      <div style={{ background: 'linear-gradient(152deg, var(--forest) 0%, var(--forest-3) 100%)', paddingBottom: 20, flexShrink: 0 }}>
        <StatusBar dark />
        <NavBar dark showBack title="" />
        <div style={{ padding: '0 22px 4px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>
            Mumbai Juhu → ?
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Flying <em style={{ fontStyle: 'italic', fontWeight: 300 }}>to?</em>
          </div>
        </div>
      </div>

      {/* Search input (focused) */}
      <div style={{ padding: '18px 18px 12px', flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--rule)' }}>
        <div style={{
          height: 52, borderRadius: 'var(--r-pill)',
          border: '2px solid var(--emerald)',
          background: 'var(--mint-2)',
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
          boxShadow: 'var(--focus-ring)',
        }}>
          <I name="search" size={18} stroke={2} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 16, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Pun</span>
          <div style={{ width: 2, height: 22, background: 'var(--emerald)', borderRadius: 1, animation: 'none' }} />
        </div>
      </div>

      {/* Results / suggestions */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* Recent */}
        <div style={{ padding: '14px 18px 6px' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>
            Recent
          </div>
          {RECENT.map((r) => (
            <div key={r.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--rule-soft)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <I name="clock" size={17} stroke={1.6} style={{ color: 'var(--ink-3)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{r.city}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>{r.pad}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>{r.code}</div>
            </div>
          ))}
        </div>

        {/* Popular */}
        <div style={{ padding: '14px 18px 0' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>
            Popular destinations
          </div>
          {POPULAR.map((p) => (
            <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--rule-soft)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <I name="location" size={17} stroke={1.6} style={{ color: 'var(--emerald)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{p.city}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>{p.routes} routes available</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>{p.code}</div>
            </div>
          ))}
        </div>
      </div>

      <MockKeyboard />
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 3.2 — Date & Time
// ─────────────────────────────────────────────────────────────
function DateTimeScreen() {
  // June 2026: starts Monday → 1 blank (Sunday) before day 1
  const blanks = 1;
  const cells = [...Array(blanks).fill(null), ...Array.from({ length: 30 }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const today = 5;
  const selected = 7;
  const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const TIMES = ['06:00', '09:15', '11:30', '14:00', '17:30'];
  const selTime = '09:15';

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="Date & time" />

      {/* Route recap pill */}
      <div style={{ padding: '0 18px 16px', flexShrink: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: '0 14px', borderRadius: 'var(--r-pill)', background: 'var(--forest)' }}>
          <I name="plane" size={14} stroke={1.8} style={{ color: 'var(--jade)' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em' }}>Mumbai Juhu → Pune</span>
        </div>
      </div>

      {/* Calendar card */}
      <div style={{ margin: '0 18px', background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '18px 16px 16px', boxShadow: 'var(--shadow-md)', flexShrink: 0 }}>
        {/* Month nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <I name="chevLeft" size={18} stroke={2} style={{ color: 'var(--ink-3)' }} />
          </button>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            June <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-3)' }}>2026</em>
          </div>
          <button style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <I name="chevRight" size={18} stroke={2} style={{ color: 'var(--ink)' }} />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {dayHeaders.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', paddingBottom: 6 }}>{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={{ height: 38 }} />;
            const isPast = d < today;
            const isSel  = d === selected;
            const isToday = d === today;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 38 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 17,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isSel ? 'var(--forest)' : isToday ? 'var(--mint)' : 'transparent',
                  border: isToday && !isSel ? '1.5px solid var(--emerald)' : 'none',
                  fontSize: 13.5, fontWeight: isSel ? 700 : 400,
                  color: isSel ? '#fff' : isPast ? 'var(--ink-5)' : isToday ? 'var(--emerald)' : 'var(--ink)',
                }}>
                  {d}
                  {isSel && (
                    <div style={{ position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 2, background: 'var(--emerald)' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time selector */}
      <div style={{ padding: '18px 18px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 10 }}>
          Available times — <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', fontWeight: 400 }}>Sat, Jun 7</span>
        </div>
        <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
          {TIMES.map(t => {
            const on = t === selTime;
            return (
              <div key={t} style={{
                flex: '0 0 72px', height: 52, borderRadius: 'var(--r-md)',
                background: on ? 'var(--forest)' : 'var(--surface)',
                border: '1.5px solid ' + (on ? 'transparent' : 'var(--rule)'),
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, boxShadow: on ? 'var(--shadow-sm)' : 'none',
              }}>
                <span style={{ fontSize: 14, fontWeight: on ? 700 : 500, color: on ? '#fff' : 'var(--ink)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>{t}</span>
                <span style={{ fontSize: 10.5, color: on ? 'var(--jade)' : 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>6 seats</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 18px 40px', flexShrink: 0 }}>
        <CTAButton variant="primary">
          Continue <I name="arrowRight" size={18} stroke={2.2} />
        </CTAButton>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 3.3 — Passenger Count
// ─────────────────────────────────────────────────────────────
function PassengerCountScreen() {
  const TYPES = [
    { label: 'Adults',   sub: 'Age 12+',   count: 2 },
    { label: 'Children', sub: 'Age 2–11',  count: 0 },
    { label: 'Infants',  sub: 'Under 2',   count: 0 },
  ];
  const CLASSES = ['Standard', 'Business', 'Charter'];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="Passengers" />

      <div style={{ flex: 1, padding: '8px 18px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Summary */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: '0 14px', borderRadius: 'var(--r-pill)', background: 'var(--forest)', alignSelf: 'flex-start' }}>
          <I name="plane" size={14} stroke={1.8} style={{ color: 'var(--jade)' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>BOM → PNQ · Sat Jun 7 · 09:15</span>
        </div>

        {/* Passenger type rows */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--rule)' }}>
          {TYPES.map(({ label, sub, count }, idx) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', borderBottom: idx < TYPES.length - 1 ? '1px solid var(--rule-soft)' : 'none', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <button style={{
                  width: 36, height: 36, borderRadius: 18,
                  background: count > 0 ? 'var(--surface-2)' : 'var(--rule-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: count > 0 ? 'var(--ink-2)' : 'var(--ink-5)',
                }}>
                  <I name="minus" size={16} stroke={2.2} />
                </button>
                <span style={{ width: 44, textAlign: 'center', fontSize: 20, fontWeight: 700, color: count > 0 ? 'var(--ink)' : 'var(--ink-4)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                  {count}
                </span>
                <button style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <I name="plus" size={16} stroke={2.2} style={{ color: '#fff' }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Max capacity note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--mint)', borderRadius: 'var(--r-md)', border: '1px solid rgba(24,181,116,0.2)' }}>
          <I name="info" size={16} stroke={1.6} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--canopy)', lineHeight: 1.45 }}>
            Bell 407 carries up to <strong>6 passengers</strong>. Max 2 per row.
          </span>
        </div>

        {/* Fare class */}
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 10 }}>Fare class</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {CLASSES.map((c, i) => (
              <button key={c} style={{
                flex: 1, height: 48, borderRadius: 'var(--r-md)',
                background: i === 0 ? 'var(--forest)' : 'var(--surface)',
                border: '1.5px solid ' + (i === 0 ? 'transparent' : 'var(--rule)'),
                fontSize: 13.5, fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? '#fff' : 'var(--ink-2)',
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Price preview */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--rule)', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>2 adults × ₹8,500</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--emerald)', letterSpacing: '-0.025em', marginTop: 2 }}>₹17,000</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'right', lineHeight: 1.5 }}>
            Taxes &amp;<br/>fees extra
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ paddingBottom: 36 }}>
          <CTAButton variant="primary">
            Search flights <I name="arrowRight" size={18} stroke={2.2} />
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 3.4 — Search Results
// ─────────────────────────────────────────────────────────────
function SearchResultsScreen() {
  const RESULTS = [
    { dep: '06:00', arr: '06:42', aircraft: 'Bell 407', tail: 'VT-HAX', dur: '42 min', seats: 4, price: '₹8,500',  badge: 'Best value', bt: 'ok' },
    { dep: '09:15', arr: '09:57', aircraft: 'Bell 407', tail: 'VT-MBX', dur: '42 min', seats: 6, price: '₹8,500',  badge: null, bt: null },
    { dep: '11:30', arr: '12:15', aircraft: 'AS350-B3', tail: 'VT-KGA', dur: '45 min', seats: 5, price: '₹9,200',  badge: 'Premium', bt: 'info' },
    { dep: '14:00', arr: '14:42', aircraft: 'Bell 407', tail: 'VT-HAX', dur: '42 min', seats: 2, price: '₹8,500',  badge: '2 left', bt: 'warn' },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />

      {/* Sticky search summary */}
      <div style={{ background: 'var(--forest)', padding: '8px 18px 14px', flexShrink: 0 }}>
        <NavBar dark showBack title="" right={
          <button style={{ width: 34, height: 34, borderRadius: 17, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <I name="sliders" size={16} stroke={2} style={{ color: '#fff' }} />
          </button>
        } />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>BOM</span>
              <I name="arrowRight" size={16} stroke={2} style={{ color: 'rgba(255,255,255,0.5)' }} />
              <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>PNQ</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <I name="calendar" size={12} stroke={1.8} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}>Sat, Jun 7</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <I name="users" size={12} stroke={1.8} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}>2 adults</span>
              </div>
            </div>
          </div>
          <button style={{ height: 32, padding: '0 12px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 12.5, color: 'rgba(255,255,255,0.8)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
            Edit <I name="chevDown" size={13} stroke={2} />
          </button>
        </div>
      </div>

      {/* Sort bar */}
      <div style={{ padding: '12px 18px', flexShrink: 0, display: 'flex', gap: 8, background: 'var(--bg)', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ flex: 1, display: 'flex', gap: 8 }}>
          {['Price', 'Departure', 'Duration'].map((f, i) => (
            <button key={f} style={{
              height: 32, padding: '0 12px', borderRadius: 'var(--r-pill)',
              background: i === 0 ? 'var(--surface-sunk)' : 'transparent',
              border: '1px solid ' + (i === 0 ? 'var(--rule-strong)' : 'transparent'),
              fontSize: 13, fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? 'var(--ink)' : 'var(--ink-3)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {f}{i === 0 && <I name="chevDown" size={12} stroke={2} />}
            </button>
          ))}
        </div>
        <button style={{ height: 32, padding: '0 12px', borderRadius: 'var(--r-pill)', background: 'var(--forest)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, color: '#fff' }}>
          <I name="filter" size={13} stroke={2} /> Filter
        </button>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '12px 18px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 2 }}>
          4 flights found
        </div>
        {RESULTS.map((r, i) => (
          <div key={i} style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '14px 16px', border: '1.5px solid ' + (i === 0 ? 'var(--emerald)' : 'var(--rule)'), boxShadow: i === 0 ? 'var(--focus-ring)' : 'var(--shadow-sm)', position: 'relative' }}>
            {r.badge && (
              <div style={{ position: 'absolute', top: -10, left: 14 }}>
                <div style={{
                  height: 20, padding: '0 8px', borderRadius: 'var(--r-pill)',
                  background: r.bt === 'ok' ? 'var(--emerald)' : r.bt === 'warn' ? 'var(--warn)' : 'var(--info)',
                  fontSize: 10.5, fontWeight: 600, color: '#fff', display: 'inline-flex', alignItems: 'center',
                }}>{r.badge}</div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 12 }}>
              {/* Dep time */}
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.025em', lineHeight: 1 }}>{r.dep}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>Juhu</div>
              </div>
              {/* Route line */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 10px' }}>
                <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{r.dur}</span>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--rule-strong)', borderRadius: 1 }} />
                  <I name="helicopter" size={16} stroke={1.5} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                  <div style={{ flex: 1, height: 1, background: 'var(--rule-strong)', borderRadius: 1 }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--ink-5)', fontFamily: 'var(--font-mono)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Direct</span>
              </div>
              {/* Arr time */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.025em', lineHeight: 1 }}>{r.arr}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>Lohegaon</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--rule-soft)' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <I name="helicopter" size={13} stroke={1.6} style={{ color: 'var(--ink-4)' }} />
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{r.aircraft}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <I name="users" size={13} stroke={1.6} style={{ color: 'var(--ink-4)' }} />
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{r.seats} seats left</span>
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--emerald)', letterSpacing: '-0.02em' }}>{r.price}</div>
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 3.5 — Seat Map
// ─────────────────────────────────────────────────────────────
function SeatMapScreen() {
  // Helicopter seating: 3 rows × 2 seats — A=left, B=right
  const SEATS = [
    { id: '1A', state: 'occupied' }, { id: '1B', state: 'occupied' },
    { id: '2A', state: 'mine',     label: 'P1' },
    { id: '2B', state: 'available' },
    { id: '3A', state: 'mine',     label: 'P2' },
    { id: '3B', state: 'occupied' },
  ];

  function Seat({ id, state, label }) {
    const cfg = {
      occupied:  { bg: 'var(--surface-sunk)', border: 'var(--rule)', color: 'var(--ink-5)', fw: 400 },
      available: { bg: 'var(--surface)',       border: 'var(--emerald)', color: 'var(--emerald)', fw: 600 },
      mine:      { bg: 'var(--emerald)',        border: 'var(--emerald)', color: '#fff',            fw: 700 },
    }[state];
    return (
      <div style={{
        width: 64, height: 64, borderRadius: 14,
        background: cfg.bg, border: '2px solid ' + cfg.border,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3,
      }}>
        <span style={{ fontSize: 14, fontWeight: cfg.fw, color: cfg.color, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
          {id}
        </span>
        {label && <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, fontFamily: 'var(--font-mono)' }}>{label}</span>}
        {state === 'occupied' && (
          <div style={{ width: 28, height: 3, borderRadius: 2, background: 'var(--ink-5)' }} />
        )}
      </div>
    );
  }

  return (
    <Screen bg="var(--bg)">
      {/* Forest header */}
      <div style={{ background: 'linear-gradient(152deg, var(--forest) 0%, var(--forest-3) 100%)', paddingBottom: 24, flexShrink: 0 }}>
        <StatusBar dark />
        <NavBar dark showBack title="Select seats" />
        <div style={{ padding: '0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Bell 407 GXi</div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>BOM → PNQ · 09:15 AM · VT-MBX</div>
          </div>
          <div style={{ height: 28, padding: '0 12px', borderRadius: 'var(--r-pill)', background: 'rgba(24,181,116,0.2)', border: '1px solid rgba(24,181,116,0.3)', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--emerald)' }}>2 / 6 selected</span>
          </div>
        </div>
      </div>

      {/* Seat map card */}
      <div style={{ flex: 1, padding: '18px 18px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--rule)', flexShrink: 0 }}>
          {/* Cockpit nose */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ width: 80, height: 32, borderRadius: '40px 40px 0 0', background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I name="helicopter" size={18} stroke={1.6} style={{ color: 'var(--jade)' }} />
            </div>
          </div>
          {/* Aircraft body outline */}
          <div style={{ border: '2px dashed var(--rule-strong)', borderRadius: 'var(--r-lg)', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[0, 1, 2].map(row => (
              <div key={row} style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                {[0, 1].map(col => {
                  const s = SEATS[row * 2 + col];
                  return <Seat key={s.id} {...s} />;
                })}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 16 }}>
            {[{ state: 'available', label: 'Available' }, { state: 'mine', label: 'Selected' }, { state: 'occupied', label: 'Taken' }].map(({ state, label }) => (
              <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 4,
                  background: state === 'mine' ? 'var(--emerald)' : state === 'available' ? 'var(--surface)' : 'var(--surface-sunk)',
                  border: '1.5px solid ' + (state === 'mine' || state === 'available' ? 'var(--emerald)' : 'var(--rule)'),
                }} />
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected summary */}
        <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--rule)', display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Seats 2A &amp; 3A selected</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>Left side · Window seats</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--emerald)', letterSpacing: '-0.02em' }}>₹17,000</div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ paddingBottom: 36, flexShrink: 0 }}>
          <CTAButton variant="primary">
            Continue to details <I name="arrowRight" size={18} stroke={2.2} />
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 3.6 — Passenger Details
// ─────────────────────────────────────────────────────────────
function PassengerDetailsScreen() {
  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="Passenger details" />
      <FlowStep steps={['Seats', 'Details', 'Payment']} current={1} />

      <div style={{ flex: 1, overflow: 'hidden', padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Passenger 1 — prefilled */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', overflow: 'hidden', border: '2px solid var(--emerald)', boxShadow: 'var(--focus-ring)' }}>
          <div style={{ padding: '14px 16px', background: 'var(--mint-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(24,181,116,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>P1</span>
              </div>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--forest)' }}>Passenger 1</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <I name="checkCircle" size={16} stroke={1.8} style={{ color: 'var(--emerald)' }} />
              <span style={{ fontSize: 12.5, color: 'var(--emerald)', fontWeight: 500 }}>From account</span>
            </div>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <MobileInput label="Full name"      icon="user"     value="Priya Sharma" />
            <MobileInput label="Date of birth"  icon="calendar" value="15 Mar 1992" />
            <MobileInput label="ID / Passport"  icon="shield"   value="Aadhar · XXXX XXXX 4321" />
          </div>
        </div>

        {/* Passenger 2 — empty */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', overflow: 'hidden', border: '1.5px solid var(--rule)' }}>
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--rule-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--surface-2)', border: '1.5px dashed var(--rule-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>P2</span>
              </div>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>Passenger 2</span>
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>Required</span>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <MobileInput label="Full name"      icon="user"     placeholder="Enter full name" />
            <MobileInput label="Date of birth"  icon="calendar" placeholder="DD MMM YYYY" />
            <MobileInput label="ID / Passport"  icon="shield"   placeholder="Aadhar / Passport no." focused />
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ paddingBottom: 36 }}>
          <CTAButton variant="primary">
            Review booking <I name="arrowRight" size={18} stroke={2.2} />
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 3.7 — Booking Summary
// ─────────────────────────────────────────────────────────────
function BookingSummaryScreen() {
  const FARE = [
    { label: 'Base fare × 2',   amt: '₹17,000' },
    { label: 'Airport fees',    amt: '₹400' },
    { label: 'Platform fee',    amt: '₹200' },
    { label: 'GST (5%)',        amt: '₹878' },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="Review & pay" />
      <FlowStep steps={['Seats', 'Details', 'Payment']} current={2} />

      <div style={{ flex: 1, overflow: 'hidden', padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Flight summary card */}
        <div style={{ background: 'linear-gradient(132deg, var(--forest) 0%, var(--forest-3) 100%)', borderRadius: 'var(--r-xl)', padding: '16px 18px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <svg style={{ position: 'absolute', right: -10, top: -10, pointerEvents: 'none' }}
               width={120} height={120} viewBox="0 0 120 120" fill="none" aria-hidden>
            <circle cx="100" cy="20" r="70" stroke="white" strokeWidth="0.7" opacity="0.07" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>Sat, Jun 7 · 09:15 AM</div>
            <div style={{ height: 22, padding: '0 10px', borderRadius: 'var(--r-pill)', background: 'rgba(24,181,116,0.2)', border: '1px solid rgba(24,181,116,0.3)', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--emerald)' }}>Seats 2A &amp; 3A</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1 }}>BOM</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>09:15 · Juhu</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>42 min</span>
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
                <I name="plane" size={16} stroke={1.5} style={{ color: 'var(--jade)', flexShrink: 0 }} />
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1 }}>PNQ</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>09:57 · Lohegaon</div>
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 6 }}>
            {['Priya Sharma', 'Arjun Sharma'].map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--r-pill)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <I name="user" size={12} stroke={1.8} style={{ color: 'rgba(255,255,255,0.45)' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fare breakdown */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '16px 18px', border: '1px solid var(--rule)', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 12 }}>Fare breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FARE.map(({ label, amt }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{label}</span>
                <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{amt}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--rule)', margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--emerald)', letterSpacing: '-0.025em', fontFamily: 'var(--font-mono)' }}>₹18,478</span>
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '14px 16px', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 44, height: 30, borderRadius: 6, background: '#1A1F71', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-sans)', letterSpacing: '-0.5px' }}>VISA</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Visa •••• 4242</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>Expires 09/28</div>
          </div>
          <button style={{ height: 30, padding: '0 12px', borderRadius: 'var(--r-pill)', background: 'var(--surface-2)', border: '1px solid var(--rule)', fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Change</button>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ paddingBottom: 36, flexShrink: 0 }}>
          <CTAButton variant="primary" style={{ background: 'var(--forest)', height: 58 }}>
            Confirm &amp; pay ₹18,478 <I name="arrowRight" size={18} stroke={2.2} />
          </CTAButton>
          <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-4)', lineHeight: 1.5 }}>
            By confirming you agree to our <span style={{ color: 'var(--emerald)' }}>Terms</span> &amp; <span style={{ color: 'var(--emerald)' }}>Cancellation policy</span>
          </p>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, {
  DestinationPickerScreen, DateTimeScreen, PassengerCountScreen,
  SearchResultsScreen, SeatMapScreen, PassengerDetailsScreen, BookingSummaryScreen,
});
