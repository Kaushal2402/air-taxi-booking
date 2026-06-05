/* ─────────────────────────────────────────────────────────────
   Acme Mobility — Customer App · Moreen Theme
   Module 07 — Support & Help
   7.1 Help Centre · 7.2 Live Chat · 7.3 Call Back Request
   7.4 Raise a Ticket · 7.5 Ticket Status
   ───────────────────────────────────────────────────────────── */

const EXTRA_M07 = {
  message:      'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
  messageCircle:'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z',
  headphones:   'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3ZM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z',
  phone:        'M5 4h3l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  clipboard:    'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9ZM9 12h6M9 16h4',
  checkSquare:  'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  zap:          'M13 2L3 14h9l-1 8 10-12h-9l1-8Z',
  fileText:     'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M16 13H8M16 17H8M10 9H8',
  send:         'M22 2L11 13M22 2L15 22 11 13 2 9l20-7Z',
  smile:        'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
  paperclip:    'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
  clock:        'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 3',
  alertCircle:  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v4M12 16h.01',
  chevDown:     'M6 9L12 15L18 9',
  star:         'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z',
};

function I({ name, size = 24, stroke = 1.6, style: sx, className }) {
  const d = EXTRA_M07[name];
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

// Status pill
function StatusPill({ label, type = 'ok' }) {
  const cfg = {
    ok:     { bg: 'var(--ok-soft)',     border: 'rgba(24,181,116,0.2)',  color: 'var(--ok)',     dot: 'var(--ok)' },
    warn:   { bg: 'var(--warn-soft)',   border: 'rgba(201,123,12,0.2)', color: 'var(--warn)',   dot: 'var(--warn)' },
    info:   { bg: 'var(--info-soft)',   border: 'rgba(23,98,186,0.2)',  color: 'var(--info)',   dot: 'var(--info)' },
    danger: { bg: 'var(--danger-soft)', border: 'rgba(204,43,34,0.2)', color: 'var(--danger)', dot: 'var(--danger)' },
  }[type];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 10px', borderRadius: 'var(--r-pill)', background: cfg.bg, border: '1px solid ' + cfg.border }}>
      <div style={{ width: 6, height: 6, borderRadius: 3, background: cfg.dot }} />
      <span style={{ fontSize: 11.5, fontWeight: 600, color: cfg.color }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 7.1 — Help Centre
// ─────────────────────────────────────────────────────────────
function HelpCentreScreen() {
  const TOPICS = [
    { icon: 'plane',       label: 'Booking & flights',   sub: '12 articles', bg: 'var(--forest)' },
    { icon: 'creditCard',  label: 'Payments & refunds',  sub: '8 articles',  bg: '#2B3A4A' },
    { icon: 'xCircle',     label: 'Cancellations',       sub: '6 articles',  bg: '#5B3A2B' },
    { icon: 'user',        label: 'Account & profile',   sub: '9 articles',  bg: '#3A3A48' },
    { icon: 'award',       label: 'Acme Miles',          sub: '5 articles',  bg: 'var(--canopy)' },
    { icon: 'shield',      label: 'Safety & security',   sub: '4 articles',  bg: '#1762BA' },
  ];

  const FAQS = [
    'How do I cancel my booking?',
    'When will my refund arrive?',
    'Can I change my seat after booking?',
  ];

  return (
    <Screen bg="var(--bg)">
      {/* Forest header */}
      <div style={{ background: 'linear-gradient(152deg, var(--forest) 0%, var(--forest-3) 100%)', paddingBottom: 24, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', right: -16, top: -16, pointerEvents: 'none' }}
             width={160} height={160} viewBox="0 0 160 160" fill="none" aria-hidden>
          <circle cx="140" cy="20" r="100" stroke="white" strokeWidth="0.7" opacity="0.05" />
          <circle cx="140" cy="20" r="58"  stroke="white" strokeWidth="0.7" opacity="0.05" />
        </svg>
        <StatusBar dark />
        <div style={{ padding: '2px 22px 0', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 5 }}>Support</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 16 }}>
            How can we <em style={{ fontStyle: 'italic', fontWeight: 300 }}>help?</em>
          </div>
          {/* Search */}
          <div style={{ height: 48, borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
            <I name="search" size={18} stroke={1.8} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
            <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)' }}>Search help articles…</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { icon: 'messageCircle', label: 'Live Chat',   sub: '~2 min wait', color: 'var(--emerald)', bg: 'var(--mint)' },
            { icon: 'phone',         label: 'Call Back',   sub: 'We call you',  color: 'var(--info)',   bg: 'var(--info-soft)' },
            { icon: 'clipboard',     label: 'Raise Ticket',sub: 'Async help',   color: 'var(--warn)',   bg: 'var(--warn-soft)' },
          ].map(({ icon, label, sub, color, bg }) => (
            <button key={label} style={{ flex: 1, padding: '12px 10px', borderRadius: 'var(--r-lg)', background: bg, border: '1px solid ' + color + '22', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <I name={icon} size={22} stroke={1.6} style={{ color }} />
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', textAlign: 'center' }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>{sub}</div>
            </button>
          ))}
        </div>

        {/* Browse by topic */}
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 10 }}>Browse by topic</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TOPICS.map(({ icon, label, sub, bg }) => (
              <button key={label} style={{ padding: '13px 14px', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <I name={icon} size={18} stroke={1.6} style={{ color: '#fff' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 2 }}>{sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Popular FAQs */}
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 8 }}>Popular questions</div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--rule)' }}>
            {FAQS.map((q, i) => (
              <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < FAQS.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                <I name="helpCircle" size={17} stroke={1.6} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>{q}</span>
                <I name="chevRight" size={16} stroke={1.8} style={{ color: 'var(--ink-5)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 7.2 — Live Chat
// ─────────────────────────────────────────────────────────────
function LiveChatScreen() {
  const MSGS = [
    { from: 'agent', text: 'Hi Priya! 👋 I\'m Aanya from Acme Mobility support. How can I help you today?', time: '10:02 AM' },
    { from: 'user',  text: 'Hi! I booked a flight for Jun 7 (BOM→PNQ) but I need to add another passenger. Is that possible?', time: '10:03 AM' },
    { from: 'agent', text: 'Absolutely! Passenger additions are possible up to 4 hours before departure. Let me pull up your booking — can you share your booking reference?', time: '10:04 AM' },
    { from: 'user',  text: 'Sure, it\'s ACM-2026-04821', time: '10:04 AM' },
    { from: 'agent', text: 'Got it! I can see your booking. There are 2 seats remaining on this flight. Shall I proceed to add one passenger?', time: '10:05 AM', typing: false },
    { from: 'agent', text: '', time: '', typing: true },
  ];

  return (
    <Screen bg="var(--bg)">
      {/* Chat header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <StatusBar />
        <div style={{ padding: '0 8px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
            <I name="chevLeft" size={24} stroke={2} />
          </button>
          {/* Agent avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: 21, background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>A</span>
            </div>
            <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, background: 'var(--ok)', border: '2px solid var(--surface)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Aanya — Support</div>
            <div style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 500 }}>Online · Acme Mobility</div>
          </div>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <I name="phone" size={17} stroke={1.8} style={{ color: 'var(--ink-2)' }} />
          </button>
        </div>
      </div>

      {/* Booking context pill */}
      <div style={{ padding: '10px 18px', flexShrink: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px', borderRadius: 'var(--r-pill)', background: 'var(--mint)', border: '1px solid rgba(24,181,116,0.2)' }}>
          <I name="plane" size={13} stroke={1.8} style={{ color: 'var(--emerald)' }} />
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--forest)' }}>BOM → PNQ · Jun 7 · ACM-2026-04821</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '4px 18px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Date divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>Today</span>
          <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        </div>

        {MSGS.map((m, i) => {
          const isUser = m.from === 'user';
          if (m.typing) {
            return (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ width: 30, height: 30, borderRadius: 15, background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>A</span>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--surface)', border: '1.5px solid var(--rule)', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(d => (
                    <div key={d} style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--ink-4)', opacity: 0.5 + d * 0.2 }} />
                  ))}
                </div>
              </div>
            );
          }
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexDirection: isUser ? 'row-reverse' : 'row' }}>
              {!isUser && (
                <div style={{ width: 30, height: 30, borderRadius: 15, background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>A</span>
                </div>
              )}
              <div style={{ maxWidth: '72%' }}>
                <div style={{
                  padding: '11px 14px', lineHeight: 1.5,
                  borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isUser ? 'var(--forest)' : 'var(--surface)',
                  border: isUser ? 'none' : '1.5px solid var(--rule)',
                  fontSize: 14, color: isUser ? '#fff' : 'var(--ink)',
                }}>
                  {m.text}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4, textAlign: isUser ? 'right' : 'left', fontFamily: 'var(--font-mono)' }}>
                  {m.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 18px 36px', background: 'var(--surface)', borderTop: '1px solid var(--rule)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <I name="paperclip" size={18} stroke={1.8} style={{ color: 'var(--ink-3)' }} />
          </button>
          <div style={{ flex: 1, height: 44, borderRadius: 22, border: '1.5px solid var(--rule-strong)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
            <span style={{ flex: 1, fontSize: 15, color: 'var(--ink-4)' }}>Type a message…</span>
            <I name="smile" size={18} stroke={1.5} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
          </div>
          <button style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <I name="send" size={18} stroke={2} style={{ color: '#fff' }} />
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 7.3 — Call Back Request
// ─────────────────────────────────────────────────────────────
function CallBackScreen() {
  const SLOTS = ['09:00 – 10:00', '11:00 – 12:00', '14:00 – 15:00', '16:00 – 17:00'];
  const TOPICS = ['Booking change', 'Refund enquiry', 'Flight information', 'Account issue', 'Other'];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="Call back" />

      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Illustration card */}
        <div style={{ background: 'linear-gradient(132deg, var(--forest) 0%, var(--forest-3) 100%)', borderRadius: 'var(--r-xl)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <svg style={{ position: 'absolute', right: -12, top: -12, pointerEvents: 'none' }}
               width={120} height={120} viewBox="0 0 120 120" fill="none" aria-hidden>
            <circle cx="100" cy="20" r="70" stroke="white" strokeWidth="0.7" opacity="0.07" />
          </svg>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <I name="headphones" size={28} stroke={1.5} style={{ color: 'var(--jade)' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 4 }}>
              We'll call <em style={{ fontStyle: 'italic', fontWeight: 300 }}>you.</em>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              Pick a time slot and we'll call within the hour.
            </div>
          </div>
        </div>

        {/* Phone number */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>Call me at</div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1.5px solid var(--emerald)', boxShadow: 'var(--focus-ring)' }}>
            <MobileInput icon="phone" value="+91 98765 43210" focused />
          </div>
        </div>

        {/* Topic */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>Topic</div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1.5px solid var(--rule)', overflow: 'hidden' }}>
            <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <I name="clipboard" size={19} stroke={1.5} style={{ color: 'var(--ink-4)' }} />
                <span style={{ fontSize: 16, color: 'var(--ink)' }}>Booking change</span>
              </div>
              <I name="chevDown" size={17} stroke={2} style={{ color: 'var(--ink-4)' }} />
            </div>
          </div>
        </div>

        {/* Time slots */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>
            Preferred slot — <span style={{ color: 'var(--ink-3)' }}>Today, Jun 5</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SLOTS.map((s, i) => (
              <button key={s} style={{ height: 52, borderRadius: 'var(--r-md)', background: i === 1 ? 'var(--forest)' : 'var(--surface)', border: '1.5px solid ' + (i === 1 ? 'transparent' : 'var(--rule)'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: i === 1 ? 700 : 500, color: i === 1 ? '#fff' : 'var(--ink)', letterSpacing: '0.04em' }}>{s}</span>
                <span style={{ fontSize: 11, color: i === 1 ? 'var(--jade)' : 'var(--ink-4)' }}>{i === 0 ? 'Fully booked' : i === 1 ? 'Selected' : 'Available'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Availability notice */}
        <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--mint)', borderRadius: 'var(--r-md)', border: '1px solid rgba(24,181,116,0.2)', flexShrink: 0 }}>
          <I name="clock" size={16} stroke={1.6} style={{ color: 'var(--emerald)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: 'var(--canopy)', lineHeight: 1.5 }}>
            Support is available Mon–Sat, <strong>9 AM – 6 PM IST</strong>. Avg wait time: 11 min.
          </span>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ paddingBottom: 36, flexShrink: 0 }}>
          <CTAButton variant="primary">
            <I name="phone" size={18} stroke={2} /> Confirm call back
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 7.4 — Raise a Ticket
// ─────────────────────────────────────────────────────────────
function RaiseTicketScreen() {
  const CATS = ['Booking issue', 'Refund', 'Flight delay', 'Baggage', 'Other'];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="Raise a ticket" />

      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 18px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Priority notice */}
        <div style={{ display: 'flex', gap: 10, padding: '11px 14px', background: 'var(--info-soft)', borderRadius: 'var(--r-md)', border: '1px solid rgba(23,98,186,0.18)', flexShrink: 0 }}>
          <I name="info" size={16} stroke={1.6} style={{ color: 'var(--info)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: 'var(--info)', lineHeight: 1.5 }}>
            Tickets are typically resolved within <strong>4–8 hours</strong> during business hours.
          </span>
        </div>

        {/* Category */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>Category</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {CATS.map((c, i) => (
              <button key={c} style={{ height: 34, padding: '0 14px', borderRadius: 'var(--r-pill)', background: i === 0 ? 'var(--forest)' : 'var(--surface)', border: '1.5px solid ' + (i === 0 ? 'transparent' : 'var(--rule)'), fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#fff' : 'var(--ink-2)', whiteSpace: 'nowrap' }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Linked booking */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>Linked booking (optional)</div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1.5px solid var(--rule)', overflow: 'hidden' }}>
            <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
              <I name="fileText" size={20} stroke={1.5} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>ACM-2026-04821</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>BOM → PNQ · Sat Jun 7 · 09:15</div>
              </div>
              <button style={{ fontSize: 13, color: 'var(--emerald)', fontWeight: 500, flexShrink: 0 }}>Change</button>
            </div>
          </div>
        </div>

        {/* Subject */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>Subject</div>
          <div style={{ height: 56, borderRadius: 'var(--r-md)', border: '1.5px solid var(--rule-strong)', background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
            <span style={{ fontSize: 15, color: 'var(--ink)' }}>Need to add a passenger to my booking</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>Description</div>
          <div style={{ minHeight: 110, borderRadius: 'var(--r-md)', border: '2px solid var(--emerald)', background: 'var(--mint-2)', padding: '14px 16px', boxShadow: 'var(--focus-ring)' }}>
            <span style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.6 }}>I'd like to add my colleague Arjun Mehta to booking ACM-2026-04821. Please let me know the process and any additional charges.</span>
            <div style={{ display: 'inline-block', width: 2, height: 18, background: 'var(--emerald)', marginLeft: 2, borderRadius: 1, verticalAlign: 'middle' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>148 / 500</span>
          </div>
        </div>

        {/* Attachment */}
        <button style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1.5px dashed var(--rule-strong)', background: 'transparent', color: 'var(--ink-2)', fontSize: 14 }}>
          <I name="paperclip" size={18} stroke={1.8} style={{ color: 'var(--ink-4)' }} />
          Attach screenshot or document
        </button>

        {/* Priority */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>Priority</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Low', 'Medium', 'High'].map((p, i) => {
              const colors = ['var(--ok)', 'var(--warn)', 'var(--danger)'];
              const bgs    = ['var(--ok-soft)', 'var(--warn-soft)', 'var(--danger-soft)'];
              const active = i === 1;
              return (
                <button key={p} style={{ flex: 1, height: 40, borderRadius: 'var(--r-md)', background: active ? bgs[i] : 'var(--surface)', border: '1.5px solid ' + (active ? colors[i] + '44' : 'var(--rule)'), fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? colors[i] : 'var(--ink-2)' }}>{p}</button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ paddingBottom: 36, flexShrink: 0 }}>
          <CTAButton variant="primary">
            <I name="send" size={16} stroke={2} /> Submit ticket
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 7.5 — Ticket Status
// ─────────────────────────────────────────────────────────────
function TicketStatusScreen() {
  const TICKETS = [
    {
      ref: 'TKT-8821',
      subject: 'Add passenger to booking ACM-2026-04821',
      cat: 'Booking issue',
      status: 'In progress',
      st: 'info',
      updated: '10 min ago',
      priority: 'Medium',
      replies: 2,
    },
    {
      ref: 'TKT-8614',
      subject: 'Refund status for cancelled BOM-GOI flight',
      cat: 'Refund',
      status: 'Resolved',
      st: 'ok',
      updated: 'May 30',
      priority: 'High',
      replies: 5,
    },
    {
      ref: 'TKT-8203',
      subject: 'Unable to update email address in profile',
      cat: 'Account issue',
      status: 'Closed',
      st: 'ok',
      updated: 'May 18',
      priority: 'Low',
      replies: 3,
    },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <div style={{ padding: '8px 18px 0', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)', marginBottom: 14 }}>
          My <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-3)' }}>Tickets.</em>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--rule)', marginBottom: 0 }}>
          {['Open', 'Resolved', 'All'].map((t, i) => (
            <button key={t} style={{ height: 40, padding: '0 16px', fontSize: 14, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? 'var(--ink)' : 'var(--ink-3)', borderBottom: i === 0 ? '2.5px solid var(--emerald)' : '2.5px solid transparent', marginBottom: -2, background: 'transparent' }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '14px 18px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {TICKETS.map((t, i) => (
          <div key={t.ref} style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '14px 16px', border: '1.5px solid ' + (i === 0 ? 'rgba(23,98,186,0.28)' : 'var(--rule)'), boxShadow: i === 0 ? '0 0 0 3px rgba(23,98,186,0.08)' : 'var(--shadow-sm)' }}>
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{t.ref}</span>
                <StatusPill label={t.status} type={t.st} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <I name="clock" size={12} stroke={1.8} style={{ color: 'var(--ink-4)' }} />
                <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{t.updated}</span>
              </div>
            </div>

            {/* Subject */}
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.35, marginBottom: 8 }}>{t.subject}</div>

            {/* Meta row */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <I name="clipboard" size={13} stroke={1.8} style={{ color: 'var(--ink-4)' }} />
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{t.cat}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <I name="message" size={13} stroke={1.8} style={{ color: 'var(--ink-4)' }} />
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{t.replies} replies</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <I name="zap" size={13} stroke={1.8} style={{ color: t.priority === 'High' ? 'var(--danger)' : t.priority === 'Medium' ? 'var(--warn)' : 'var(--ok)' }} />
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{t.priority}</span>
              </div>
            </div>

            {/* Agent reply preview — only for open ticket */}
            {i === 0 && (
              <div style={{ marginTop: 10, padding: '9px 12px', background: 'var(--info-soft)', borderRadius: 'var(--r-sm)', borderLeft: '3px solid var(--info)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--info)', marginBottom: 3 }}>Agent reply · Aanya</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>
                  "I've located your booking. Adding a passenger is possible — I'll process this now and…"
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Raise new ticket CTA */}
        <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '13px 16px', borderRadius: 'var(--r-lg)', border: '1.5px dashed var(--rule-strong)', background: 'transparent', color: 'var(--ink-2)', fontSize: 14, fontWeight: 500, marginBottom: 24 }}>
          <I name="plus" size={16} stroke={2} style={{ color: 'var(--emerald)' }} />
          Raise a new ticket
        </button>
      </div>
    </Screen>
  );
}

Object.assign(window, {
  HelpCentreScreen, LiveChatScreen, CallBackScreen,
  RaiseTicketScreen, TicketStatusScreen,
});
