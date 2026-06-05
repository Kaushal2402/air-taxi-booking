/* ─────────────────────────────────────────────────────────────
   Acme Mobility — Customer App · Moreen Theme
   Module 04 — Payment & Confirmation
   4.1 Payment Methods · 4.2 Add New Card · 4.3 UPI & Wallets
   4.4 Processing · 4.5 Booking Confirmed
   ───────────────────────────────────────────────────────────── */

const EXTRA_M04 = {
  creditCard: 'M2 5h20v14H2ZM2 10h20',
  calendar:   'M3 4h18v18H3V4ZM16 2v4M8 2v4M3 10h18',
  share:      'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6L12 2L8 6M12 2v13',
  download:   'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  sparkle:    'M12 3L13.5 8.5H19L14.5 12L16 17.5L12 14L8 17.5L9.5 12L5 8.5H10.5L12 3Z',
  wallet:     'M2 7h20v14H2ZM16 14h.01M2 7V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2',
  lock:       'M7 11V7a5 5 0 0 1 10 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z',
  plus:       'M12 5v14M5 12h14',
};

function I({ name, size = 24, stroke = 1.6, style: sx, className }) {
  const d = EXTRA_M04[name];
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

function FlowStep({ steps = ['Seats', 'Details', 'Payment'], current = 2 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 24px 12px', flexShrink: 0 }}>
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

// ─────────────────────────────────────────────────────────────
// 4.1 — Payment Methods
// ─────────────────────────────────────────────────────────────
function PaymentMethodsScreen() {
  const CARDS = [
    { brand: 'VISA', last4: '4242', exp: '09/28', color: '#1A1F71', selected: true },
    { brand: 'MC',   last4: '8851', exp: '03/26', color: '#EB001B', selected: false },
  ];
  const UPI_APPS = [
    { name: 'PhonePe', bg: '#5f259f', letter: 'Pe' },
    { name: 'GPay',    bg: '#4285F4', letter: 'G' },
    { name: 'Paytm',   bg: '#002970', letter: 'P' },
    { name: 'BHIM',    bg: '#1a6b3a', letter: 'B' },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="Payment" />
      <FlowStep current={2} />

      <div style={{ flex: 1, overflow: 'hidden', padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Saved cards */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>Saved cards</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CARDS.map(({ brand, last4, exp, color, selected }) => (
              <div key={last4} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                background: 'var(--surface)', borderRadius: 'var(--r-lg)',
                border: '2px solid ' + (selected ? 'var(--emerald)' : 'var(--rule)'),
                boxShadow: selected ? 'var(--focus-ring)' : 'var(--shadow-sm)',
              }}>
                {/* Radio */}
                <div style={{ width: 20, height: 20, borderRadius: 10, border: '2px solid ' + (selected ? 'var(--emerald)' : 'var(--rule-strong)'), background: selected ? 'var(--emerald)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selected && <div style={{ width: 8, height: 8, borderRadius: 4, background: '#fff' }} />}
                </div>
                {/* Card face */}
                <div style={{ width: 42, height: 28, borderRadius: 5, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 900, color: '#fff', letterSpacing: brand === 'MC' ? '0' : '-0.5px' }}>{brand}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                    {brand === 'MC' ? 'Mastercard' : 'Visa'} •••• {last4}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>Expires {exp}</div>
                </div>
                {selected && (
                  <div style={{ height: 22, padding: '0 8px', borderRadius: 'var(--r-pill)', background: 'var(--ok-soft)', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ok)' }}>Default</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', marginTop: 8, borderRadius: 'var(--r-lg)', border: '1.5px dashed var(--rule-strong)', background: 'transparent', color: 'var(--ink-2)', fontSize: 14, fontWeight: 500 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, border: '1.5px dashed var(--rule-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I name="plus" size={15} stroke={2} style={{ color: 'var(--ink-3)' }} />
            </div>
            Add new card
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-4)', fontWeight: 500 }}>or pay with</span>
          <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        </div>

        {/* UPI apps */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '14px 16px', border: '1px solid var(--rule)' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 12 }}>UPI</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            {UPI_APPS.map(({ name, bg, letter }) => (
              <button key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-sans)' }}>{letter}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{name}</span>
              </button>
            ))}
          </div>
          <div style={{ height: 44, borderRadius: 'var(--r-pill)', border: '1.5px solid var(--rule-strong)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--ink-4)' }}>Enter UPI ID</span>
          </div>
        </div>

        {/* Acme Miles */}
        <div style={{ background: 'var(--mint)', borderRadius: 'var(--r-lg)', padding: '12px 16px', border: '1.5px solid rgba(24,181,116,0.22)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <I name="wallet" size={22} stroke={1.6} style={{ color: 'var(--canopy)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--forest)' }}>Apply Acme Miles</div>
            <div style={{ fontSize: 12.5, color: 'var(--canopy)', marginTop: 1 }}>2,450 pts = ₹245 credit</div>
          </div>
          <div style={{ width: 46, height: 26, borderRadius: 13, background: 'var(--emerald)', position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', right: 3, top: 3, width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Total + Pay */}
        <div style={{ paddingBottom: 36, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, padding: '0 2px' }}>
            <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>Total payable</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>₹18,478</span>
          </div>
          <CTAButton variant="primary" style={{ background: 'var(--forest)', height: 56 }}>
            <I name="lock" size={16} stroke={2} /> Pay ₹18,478 securely
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 4.2 — Add New Card
// ─────────────────────────────────────────────────────────────
function AddNewCardScreen() {
  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="Add card" />

      <div style={{ flex: 1, padding: '8px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Card preview */}
        <div style={{
          borderRadius: 20, overflow: 'hidden', height: 188,
          background: 'linear-gradient(135deg, var(--forest) 0%, var(--canopy) 100%)',
          padding: '22px 22px', position: 'relative',
        }}>
          <svg style={{ position: 'absolute', right: -20, top: -20, pointerEvents: 'none' }}
               width={180} height={180} viewBox="0 0 180 180" fill="none" aria-hidden>
            <circle cx="150" cy="30" r="100" stroke="white" strokeWidth="0.8" opacity="0.07" />
            <circle cx="150" cy="30" r="60"  stroke="white" strokeWidth="0.8" opacity="0.07" />
          </svg>
          {/* Chip */}
          <div style={{ width: 38, height: 30, borderRadius: 5, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.18)', marginBottom: 18 }} />
          {/* Card number */}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 19, letterSpacing: '0.18em', color: '#fff', marginBottom: 16, lineHeight: 1 }}>
            •••• &nbsp; •••• &nbsp; •••• &nbsp; ____
          </div>
          {/* Name + expiry */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>CARD HOLDER NAME</span>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>MM / YY</span>
          </div>
          {/* Logo */}
          <div style={{ position: 'absolute', bottom: 18, right: 18, background: '#fff', borderRadius: 4, width: 44, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#1A1F71', fontSize: 11, fontWeight: 900 }}>VISA</span>
          </div>
        </div>

        {/* Card number */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', fontFamily: 'var(--font-sans)' }}>Card number</label>
          <div style={{ height: 56, borderRadius: 'var(--r-md)', border: '1.5px solid var(--rule-strong)', background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
            <I name="creditCard" size={20} stroke={1.5} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 15.5, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>•••• •••• ••••</span>
            <div style={{ width: 2, height: 22, background: 'var(--emerald)', borderRadius: 1 }} />
          </div>
        </div>

        {/* Name */}
        <MobileInput label="Name on card" icon="user" value="PRIYA SHARMA" />

        {/* Expiry + CVV */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <MobileInput label="Expiry date" icon="calendar" placeholder="MM / YY" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)' }}>CVV</label>
              <div style={{ height: 56, borderRadius: 'var(--r-md)', border: '1.5px solid var(--rule-strong)', background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
                <I name="lock" size={18} stroke={1.5} style={{ color: 'var(--ink-4)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--ink-3)', letterSpacing: '0.2em' }}>•••</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--rule)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Save for future payments</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Encrypted &amp; stored securely</div>
          </div>
          <div style={{ width: 46, height: 26, borderRadius: 13, background: 'var(--emerald)', position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', right: 3, top: 3, width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ paddingBottom: 36 }}>
          <CTAButton variant="primary" style={{ background: 'var(--forest)' }}>
            Add card &amp; pay ₹18,478
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 4.3 — UPI & Wallets
// ─────────────────────────────────────────────────────────────
function UPIWalletScreen() {
  const WALLETS = [
    { name: 'Paytm Wallet', bal: '₹1,200', color: '#002970' },
    { name: 'Amazon Pay',   bal: '₹350',   color: '#FF9900' },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="UPI & Wallets" />
      <FlowStep current={2} />

      <div style={{ flex: 1, overflow: 'hidden', padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* UPI ID input */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>UPI ID</div>
          <div style={{
            height: 56, borderRadius: 'var(--r-md)',
            border: '2px solid var(--emerald)', background: 'var(--mint-2)',
            display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
            boxShadow: 'var(--focus-ring)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--ink)', flex: 1 }}>priya.sharma@okaxis</span>
            <div style={{ width: 2, height: 22, background: 'var(--emerald)', borderRadius: 1 }} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <I name="checkCircle" size={14} stroke={2} style={{ color: 'var(--ok)' }} />
            <span style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 500 }}>Priya S. · Axis Bank</span>
          </div>
        </div>

        {/* Quick UPI apps */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '14px 16px', border: '1px solid var(--rule)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Pay with app</div>
          <div style={{ display: 'flex', gap: 0 }}>
            {[{ n: 'PhonePe', bg: '#5f259f', l: 'Pe' }, { n: 'GPay', bg: '#4285F4', l: 'G' }, { n: 'Paytm', bg: '#002970', l: 'P' }, { n: 'BHIM', bg: '#1a6b3a', l: 'B' }].map(({ n, bg, l }) => (
              <button key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 52, height: 52, borderRadius: 26, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{l}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{n}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Wallets */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>Wallets</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {WALLETS.map(({ name, bal, color }) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: 'var(--surface)', borderRadius: 'var(--r-md)', border: '1.5px solid var(--rule)' }}>
                <div style={{ width: 42, height: 42, borderRadius: 'var(--r-sm)', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <I name="wallet" size={20} stroke={1.6} style={{ color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>Balance: {bal}</div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: 10, border: '1.5px solid var(--rule-strong)', background: 'transparent' }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ paddingBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, padding: '0 2px' }}>
            <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>Total payable</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>₹18,478</span>
          </div>
          <CTAButton variant="primary" style={{ background: 'var(--forest)' }}>
            <I name="lock" size={16} stroke={2} /> Pay via UPI
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 4.4 — Processing
// ─────────────────────────────────────────────────────────────
function ProcessingScreen() {
  return (
    <Screen bg="var(--forest)">
      {/* Decorative rings */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
           viewBox="0 0 390 844" fill="none" aria-hidden>
        <circle cx="195" cy="422" r="300" stroke="white" strokeWidth="0.6" opacity="0.04" />
        <circle cx="195" cy="422" r="200" stroke="white" strokeWidth="0.6" opacity="0.04" />
        <circle cx="195" cy="422" r="100" stroke="white" strokeWidth="0.6" opacity="0.04" />
      </svg>

      <StatusBar dark />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 40px', position: 'relative', zIndex: 1,
      }}>
        {/* Spinner ring */}
        <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 36 }}>
          <svg width={120} height={120} viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
            <circle cx="60" cy="60" r="52" stroke="var(--emerald)" strokeWidth="6" fill="none"
                    strokeDasharray="200 130" strokeLinecap="round"
                    style={{ transformOrigin: '60px 60px', transform: 'rotate(-90deg)' }} />
          </svg>
          {/* Plane icon in center */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <I name="plane" size={36} stroke={1.4} style={{ color: '#fff' }} />
          </div>
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 12 }}>
          Please wait
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, color: '#fff', letterSpacing: '-0.025em', textAlign: 'center', lineHeight: 1.1, marginBottom: 8 }}>
          Securing your
          <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'rgba(255,255,255,0.7)' }}> booking.</em>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--jade)', letterSpacing: '-0.01em', marginBottom: 32 }}>
          ₹18,478
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 0.5, 0.25].map((o, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--emerald)', opacity: o }} />
          ))}
        </div>

        {/* Security note */}
        <div style={{ marginTop: 60, display: 'flex', alignItems: 'center', gap: 8 }}>
          <I name="lock" size={14} stroke={1.8} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>256-bit encrypted · PCI-DSS compliant</span>
        </div>
      </div>

      {/* Bottom — bank name */}
      <div style={{ padding: '0 40px 52px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>
          Visa •••• 4242
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 4.5 — Booking Confirmed
// ─────────────────────────────────────────────────────────────
function BookingConfirmedScreen() {
  return (
    <Screen bg="var(--bg)">
      {/* Forest success hero */}
      <div style={{
        background: 'linear-gradient(152deg, var(--forest) 0%, var(--forest-3) 100%)',
        paddingBottom: 52, flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
             viewBox="0 0 390 260" fill="none" aria-hidden>
          <circle cx="195" cy="130" r="200" stroke="white" strokeWidth="0.7" opacity="0.04" />
          <circle cx="195" cy="130" r="130" stroke="white" strokeWidth="0.7" opacity="0.04" />
        </svg>
        <StatusBar dark />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 40px 0', position: 'relative', zIndex: 1 }}>
          {/* Check circle */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(24,181,116,0.2)', border: '2px solid rgba(24,181,116,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I name="checkCircle" size={44} stroke={1.4} style={{ color: 'var(--emerald)' }} />
            </div>
            {/* Sparkle dots */}
            {[['-24px', '-10px'], ['28px', '-14px'], ['-18px', '26px'], ['26px', '22px']].map(([l, t], i) => (
              <div key={i} style={{ position: 'absolute', left: l, top: t, width: 6, height: 6, borderRadius: 3, background: 'var(--jade)', opacity: 0.7 + i * 0.05 }} />
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, color: '#fff', letterSpacing: '-0.025em', textAlign: 'center', lineHeight: 1.1, marginBottom: 6 }}>
            You're booked.
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--jade)', letterSpacing: '0.1em' }}>
            ACM-2026-04821
          </div>
        </div>
      </div>

      {/* E-ticket (overlapping hero) */}
      <div style={{ marginTop: -44, padding: '0 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 20, overflow: 'visible', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--rule)', position: 'relative' }}>
          {/* Top half */}
          <div style={{ padding: '18px 20px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 4 }}>Mumbai · Juhu → Pune · Lohegaon</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 30, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>BOM</span>
                  <svg width={44} height={16} viewBox="0 0 44 16" fill="none">
                    <line x1="2" y1="8" x2="36" y2="8" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M32 4l4 4-4 4" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="40" cy="8" r="2" fill="var(--emerald)" />
                  </svg>
                  <span style={{ fontSize: 30, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>PNQ</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 3 }}>Sat, 7 Jun</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--forest)', letterSpacing: '-0.02em' }}>09:15</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 18 }}>
              {[['Passengers', 'Priya &amp; Arjun'], ['Aircraft', 'Bell 407'], ['Seats', '2A &amp; 3A']].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 2 }} dangerouslySetInnerHTML={{ __html: k }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }} dangerouslySetInnerHTML={{ __html: v }} />
                </div>
              ))}
            </div>
          </div>

          {/* Perforated divider */}
          <div style={{ position: 'relative', margin: '0 -1px' }}>
            <div style={{ borderTop: '2px dashed var(--rule-strong)' }} />
            <div style={{ position: 'absolute', left: -12, top: -12, width: 24, height: 24, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--rule-strong)' }} />
            <div style={{ position: 'absolute', right: -12, top: -12, width: 24, height: 24, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--rule-strong)' }} />
          </div>

          {/* Bottom half — QR + ref */}
          <div style={{ padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* QR code placeholder */}
            <div style={{ width: 68, height: 68, borderRadius: 8, background: 'var(--surface-2)', border: '1.5px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none">
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
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 4 }}>Booking reference</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 700, color: 'var(--forest)', letterSpacing: '0.05em' }}>ACM-2026-04821</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>Show QR code at boarding</div>
            </div>
          </div>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[{ icon: 'download', label: 'E-Ticket', primary: true }, { icon: 'share', label: 'Share', primary: false }, { icon: 'calendar', label: 'Add to cal', primary: false }].map(({ icon, label, primary }) => (
            <button key={label} style={{
              flex: 1, height: 48, borderRadius: 'var(--r-md)',
              background: primary ? 'var(--forest)' : 'var(--surface)',
              border: '1.5px solid ' + (primary ? 'transparent' : 'var(--rule)'),
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              color: primary ? '#fff' : 'var(--ink-2)',
              boxShadow: primary ? 'var(--shadow-sm)' : 'none',
            }}>
              <I name={icon} size={18} stroke={1.8} />
              <span style={{ fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Back to home */}
        <div style={{ textAlign: 'center', paddingBottom: 32 }}>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, color: 'var(--ink-2)', fontWeight: 500 }}>
            <I name="home" size={16} stroke={1.8} /> Back to home
          </button>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, {
  PaymentMethodsScreen, AddNewCardScreen, UPIWalletScreen,
  ProcessingScreen, BookingConfirmedScreen,
});
