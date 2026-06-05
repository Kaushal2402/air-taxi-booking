/* ─────────────────────────────────────────────────────────────
   Acme Mobility — Customer App · Moreen Theme
   Module 06 — Profile & Settings
   6.1 Profile Overview · 6.2 Edit Profile · 6.3 Acme Miles
   6.4 Notifications Settings · 6.5 App Settings
   ───────────────────────────────────────────────────────────── */

const EXTRA_M06 = {
  clock:      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 3',
  bell:       'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  gift:       'M20 12v10H4V12M22 7H2v5h20V7ZM12 22V7M12 7h-4.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z',
  trending:   'M22 7L13 16L9 12L2 19M16 7h6v6',
  moon:       'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
  globe:      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.6 9h16.8M3.6 15h16.8M12 3c-2.5 3-4 6.5-4 9s1.5 6 4 9M12 3c2.5 3 4 6.5 4 9s-1.5 6-4 9',
  creditCard: 'M2 5h20v14H2ZM2 10h20',
  trash:      'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  helpCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  logOut:     'M15 17l5-5-5-5M20 12H9M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7',
  award:      'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM8.21 13.89L7 23l5-3 5 3-1.21-9.12',
  zap:        'M13 2L3 14h9l-1 8 10-12h-9l1-8Z',
  percent:    'M19 5L5 19M6.5 6.5h.01M17.5 17.5h.01',
};

function I({ name, size = 24, stroke = 1.6, style: sx, className }) {
  const d = EXTRA_M06[name];
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

function BottomBar({ active = 'profile' }) {
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

// Settings row item
function SettingsRow({ icon, iconBg, label, sub, right, danger = false, last = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 13,
      padding: '13px 16px',
      borderBottom: last ? 'none' : '1px solid var(--rule-soft)',
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg || 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <I name={icon} size={19} stroke={1.7} style={{ color: danger ? 'var(--danger)' : iconBg ? '#fff' : 'var(--ink-3)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: danger ? 'var(--danger)' : 'var(--ink)', letterSpacing: '-0.01em' }}>{label}</div>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>}
      </div>
      {right || <I name="chevRight" size={17} stroke={1.8} style={{ color: 'var(--ink-5)', flexShrink: 0 }} />}
    </div>
  );
}

// Toggle switch
function Toggle({ on = false }) {
  return (
    <div style={{ width: 46, height: 26, borderRadius: 13, background: on ? 'var(--emerald)' : 'var(--rule-strong)', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, [on ? 'right' : 'left']: 3, width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6.1 — Profile Overview
// ─────────────────────────────────────────────────────────────
function ProfileOverviewScreen() {
  const MENU_GROUPS = [
    {
      items: [
        { icon: 'user',       iconBg: 'var(--forest)', label: 'Edit profile',        sub: 'Name, photo, contact info' },
        { icon: 'shield',     iconBg: '#1762BA',       label: 'Security',            sub: 'Password, 2FA, sessions' },
        { icon: 'creditCard', iconBg: '#2B3A4A',       label: 'Payment methods',     sub: 'Visa ••4242 · 1 saved' },
      ],
    },
    {
      items: [
        { icon: 'bell',       iconBg: 'var(--canopy)', label: 'Notifications',       sub: 'Push, email, SMS' },
        { icon: 'globe',      iconBg: '#3B5E40',       label: 'Language & region',   sub: 'English · India' },
        { icon: 'moon',       iconBg: '#3A3A48',       label: 'Appearance',          sub: 'System default' },
      ],
    },
    {
      items: [
        { icon: 'helpCircle', iconBg: null, label: 'Help & support',    sub: 'FAQs, chat, call us' },
        { icon: 'info',       iconBg: null, label: 'About Acme',        sub: 'v1.0.0 · Terms · Privacy' },
        { icon: 'logOut',     iconBg: null, label: 'Sign out',          sub: null, danger: true },
      ],
    },
  ];

  return (
    <Screen bg="var(--bg)">
      {/* Forest profile hero */}
      <div style={{ background: 'linear-gradient(152deg, var(--forest) 0%, var(--forest-3) 100%)', paddingBottom: 48, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', right: -16, top: -16, pointerEvents: 'none' }}
             width={180} height={180} viewBox="0 0 180 180" fill="none" aria-hidden>
          <circle cx="150" cy="30" r="110" stroke="white" strokeWidth="0.7" opacity="0.05" />
          <circle cx="150" cy="30" r="65"  stroke="white" strokeWidth="0.7" opacity="0.05" />
        </svg>
        <StatusBar dark />
        <div style={{ padding: '8px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, color: '#fff', letterSpacing: '-0.025em' }}>
            Profile
          </div>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <I name="settings" size={18} stroke={1.7} style={{ color: '#fff' }} />
          </button>
        </div>
        {/* Avatar + info */}
        <div style={{ padding: '16px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 68, height: 68, borderRadius: 34, background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.2)' }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-sans)' }}>P</span>
            </div>
            <div style={{ position: 'absolute', bottom: 1, right: 1, width: 18, height: 18, borderRadius: 9, background: 'var(--emerald)', border: '2px solid var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I name="check" size={10} stroke={2.5} style={{ color: '#fff' }} />
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: '#fff', letterSpacing: '-0.015em' }}>Priya Sharma</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>priya.sharma@gmail.com</div>
            <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 10px', borderRadius: 'var(--r-pill)', background: 'rgba(24,181,116,0.2)', border: '1px solid rgba(24,181,116,0.3)' }}>
              <I name="award" size={12} stroke={1.8} style={{ color: 'var(--jade)' }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--jade)' }}>Gold member</span>
            </div>
          </div>
        </div>
      </div>

      {/* Acme Miles card (overlapping) */}
      <div style={{ marginTop: -28, padding: '0 18px', position: 'relative', zIndex: 2, flexShrink: 0 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '14px 18px', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <I name="award" size={22} stroke={1.6} style={{ color: 'var(--emerald)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Acme Miles</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <div style={{ height: 5, flex: 1, borderRadius: 3, background: 'var(--rule)', overflow: 'hidden' }}>
                <div style={{ width: '62%', height: '100%', borderRadius: 3, background: 'var(--emerald)' }} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>2,450 pts</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>550 pts to Platinum · ₹245 credit available</div>
          </div>
          <I name="chevRight" size={18} stroke={1.8} style={{ color: 'var(--ink-5)', flexShrink: 0 }} />
        </div>
      </div>

      {/* Settings groups */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '14px 18px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MENU_GROUPS.map((group, gi) => (
          <div key={gi} style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--rule)' }}>
            {group.items.map((item, ii) => (
              <SettingsRow key={item.label} {...item} last={ii === group.items.length - 1} />
            ))}
          </div>
        ))}
      </div>

      <BottomBar active="profile" />
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 6.2 — Edit Profile
// ─────────────────────────────────────────────────────────────
function EditProfileScreen() {
  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="Edit profile" right={
        <button style={{ color: 'var(--emerald)', fontSize: 15, fontWeight: 600 }}>Save</button>
      } />

      <div style={{ flex: 1, overflow: 'hidden', padding: '12px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Avatar edit */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 88, height: 88, borderRadius: 44, background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px var(--bg), 0 0 0 5px var(--emerald)' }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>P</span>
            </div>
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 30, height: 30, borderRadius: 15, background: 'var(--forest)', border: '2.5px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I name="camera" size={15} stroke={1.8} style={{ color: '#fff' }} />
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: -6, marginBottom: 6 }}>
          <button style={{ fontSize: 14, color: 'var(--emerald)', fontWeight: 500 }}>Change photo</button>
        </div>

        {/* Form fields */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', overflow: 'hidden', border: '1px solid var(--rule)' }}>
          <div style={{ borderBottom: '1px solid var(--rule-soft)' }}>
            <MobileInput label="Full name" icon="user" value="Priya Sharma" />
          </div>
          <div style={{ borderBottom: '1px solid var(--rule-soft)' }}>
            <MobileInput label="Display name" icon="user" value="Priya" />
          </div>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', overflow: 'hidden', border: '1px solid var(--rule)' }}>
          <div style={{ borderBottom: '1px solid var(--rule-soft)' }}>
            <MobileInput label="Email address" icon="envelope" value="priya.sharma@gmail.com" />
          </div>
          <MobileInput label="Mobile number" icon="phone" value="+91 98765 43210" />
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', overflow: 'hidden', border: '1px solid var(--rule)' }}>
          <MobileInput label="Home city" icon="location" value="Mumbai, India" />
        </div>

        {/* Gender + DOB row */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 'var(--r-xl)', border: '1px solid var(--rule)', overflow: 'hidden' }}>
            <MobileInput label="Date of birth" icon="calendar" value="15 Mar 1992" />
          </div>
          <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 'var(--r-xl)', border: '1px solid var(--rule)', overflow: 'hidden' }}>
            <div style={{ padding: '6px 0 0', display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', padding: '0 16px' }}>Gender</label>
              <div style={{ height: 50, display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, color: 'var(--ink)' }}>Female</span>
                <I name="chevDown" size={16} stroke={2} style={{ color: 'var(--ink-4)' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ paddingBottom: 36 }}>
          <CTAButton variant="primary">Save changes</CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 6.3 — Acme Miles
// ─────────────────────────────────────────────────────────────
function AcmeMilesScreen() {
  const HISTORY = [
    { icon: 'plane',   label: 'BOM → PNQ flight',    pts: '+850',  date: 'Jun 5',  color: 'var(--ok)' },
    { icon: 'gift',    label: 'Referral bonus',        pts: '+500',  date: 'May 28', color: 'var(--ok)' },
    { icon: 'plane',   label: 'BOM → GOI flight',      pts: '+1,100',date: 'Jun 2',  color: 'var(--ok)' },
    { icon: 'percent', label: 'Miles redeemed',         pts: '−200',  date: 'May 20', color: 'var(--danger)' },
  ];

  return (
    <Screen bg="var(--bg)">
      {/* Forest hero */}
      <div style={{ background: 'linear-gradient(152deg, var(--forest) 0%, var(--forest-3) 100%)', paddingBottom: 44, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
             viewBox="0 0 390 230" fill="none" aria-hidden>
          <circle cx="340" cy="20"  r="130" stroke="white" strokeWidth="0.7" opacity="0.05" />
          <circle cx="340" cy="20"  r="80"  stroke="white" strokeWidth="0.7" opacity="0.05" />
        </svg>
        <StatusBar dark />
        <NavBar dark showBack title="" />
        <div style={{ padding: '0 22px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8, height: 26, padding: '0 12px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <I name="award" size={14} stroke={1.8} style={{ color: 'var(--jade)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em' }}>GOLD MEMBER</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>2,450</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Acme Miles
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--jade)', fontFamily: 'var(--font-mono)' }}>₹245</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Credit</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-mono)' }}>550</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>To Platinum</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-mono)' }}>3</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Flights</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress to platinum */}
      <div style={{ margin: '-20px 18px 0', position: 'relative', zIndex: 2, flexShrink: 0 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '16px 18px', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Progress to Platinum</span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>2,450 / 3,000</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--rule)', overflow: 'hidden' }}>
            <div style={{ width: '81.7%', height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--forest), var(--emerald))' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>550 miles more to unlock Platinum benefits</div>
        </div>
      </div>

      {/* Earn options + history */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '14px 18px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Ways to earn */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[{ icon: 'plane', label: 'Fly & earn', sub: '1 pt per ₹10', bg: 'var(--forest)' }, { icon: 'gift', label: 'Refer friends', sub: '500 pts each', bg: 'var(--canopy)' }, { icon: 'zap', label: 'Bonus offers', sub: '2× this week', bg: '#B87F28' }].map(({ icon, label, sub, bg }) => (
            <div key={label} style={{ flex: 1, background: bg, borderRadius: 'var(--r-lg)', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <I name={icon} size={20} stroke={1.6} style={{ color: 'var(--jade)' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{label}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Transaction history */}
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>Transaction history</div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--rule)' }}>
            {HISTORY.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < HISTORY.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: h.pts.startsWith('+') ? 'var(--ok-soft)' : 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <I name={h.icon} size={17} stroke={1.6} style={{ color: h.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{h.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{h.date}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: h.color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}>{h.pts}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomBar active="profile" />
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 6.4 — Notification Settings
// ─────────────────────────────────────────────────────────────
function NotificationSettingsScreen() {
  const GROUPS = [
    { title: 'Booking alerts', items: [
      { label: 'Booking confirmed',    sub: 'When a booking is placed',         on: true },
      { label: 'Departure reminder',   sub: '2 hours before your flight',       on: true },
      { label: 'Flight status updates',sub: 'Delays, cancellations, gate info', on: true },
      { label: 'Boarding pass ready',  sub: 'When your e-ticket is issued',     on: true },
    ]},
    { title: 'Promotions & offers', items: [
      { label: 'Exclusive offers',     sub: 'Personalised deals for you',       on: true },
      { label: 'New routes',           sub: 'Launches and availability alerts', on: false },
      { label: 'Price alerts',         sub: 'Fare drops on saved routes',       on: true },
    ]},
    { title: 'Channels', items: [
      { label: 'Push notifications',   sub: null, on: true },
      { label: 'Email',                sub: 'priya.sharma@gmail.com',           on: true },
      { label: 'SMS',                  sub: '+91 98765 43210',                  on: false },
    ]},
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="Notifications" />

      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {GROUPS.map(({ title, items }) => (
          <div key={title}>
            <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>{title}</div>
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--rule)' }}>
              {items.map(({ label, sub, on }, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{label}</div>
                    {sub && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>}
                  </div>
                  <Toggle on={on} />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ flex: 1 }} />
        <div style={{ paddingBottom: 36 }}>
          <CTAButton variant="subtle" style={{ color: 'var(--ink-3)' }}>
            Pause all notifications for 1 week
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 6.5 — App Settings
// ─────────────────────────────────────────────────────────────
function AppSettingsScreen() {
  const GENERAL = [
    { label: 'Language',         val: 'English',       icon: 'globe',      iconBg: '#3B5E40' },
    { label: 'Currency',         val: 'INR (₹)',        icon: 'creditCard', iconBg: '#2B3A4A' },
    { label: 'Country / region', val: 'India',          icon: 'location',   iconBg: '#5B3A2B' },
    { label: 'Date format',      val: 'DD / MM / YYYY', icon: 'calendar',   iconBg: '#3A3A48' },
  ];
  const PRIVACY = [
    { label: 'Location access',      sub: 'Used for helipad search',   on: true },
    { label: 'Analytics',            sub: 'Help us improve the app',   on: false },
    { label: 'Personalised ads',     sub: 'Tailored to your activity', on: false },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar />
      <NavBar showBack title="App settings" />

      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Appearance */}
        <div>
          <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>Appearance</div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '12px 14px', border: '1px solid var(--rule)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>Theme</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ label: 'Light', icon: 'sun', on: true }, { label: 'Dark', icon: 'moon', on: false }, { label: 'System', icon: 'settings', on: false }].map(({ label, icon, on }) => (
                <button key={label} style={{ flex: 1, height: 56, borderRadius: 'var(--r-md)', background: on ? 'var(--forest)' : 'var(--surface-2)', border: '1.5px solid ' + (on ? 'transparent' : 'var(--rule)'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, color: on ? '#fff' : 'var(--ink-2)' }}>
                  <I name={icon} size={18} stroke={1.6} />
                  <span style={{ fontSize: 12, fontWeight: on ? 600 : 400 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* General */}
        <div>
          <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>General</div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--rule)' }}>
            {GENERAL.map(({ label, val, icon, iconBg }, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < GENERAL.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <I name={icon} size={17} stroke={1.7} style={{ color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{val}</span>
                  <I name="chevRight" size={15} stroke={1.8} style={{ color: 'var(--ink-5)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div>
          <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>Privacy</div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--rule)' }}>
            {PRIVACY.map(({ label, sub, on }, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < PRIVACY.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>
                </div>
                <Toggle on={on} />
              </div>
            ))}
          </div>
        </div>

        {/* Version */}
        <div style={{ textAlign: 'center', padding: '4px 0 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>Acme Mobility · v1.0.0 (build 2026.06.05)</div>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, {
  ProfileOverviewScreen, EditProfileScreen, AcmeMilesScreen,
  NotificationSettingsScreen, AppSettingsScreen,
});
