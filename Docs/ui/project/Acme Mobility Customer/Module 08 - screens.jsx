/* ─────────────────────────────────────────────────────────────
   Acme Mobility — Customer App · Moreen Theme
   Module 08 — Rating & Reviews
   8.1 Post-flight Prompt · 8.2 Star Rating · 8.3 Written Review
   8.4 Photo Upload · 8.5 Review History
   ───────────────────────────────────────────────────────────── */

const EXTRA_M08 = {
  star:       'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z',
  camera:     'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4L9 3h6l2 3h4a2 2 0 0 1 2 2ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  image:      'M21 19H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2ZM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM21 15l-5-5L5 19',
  thumbsUp:   'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3ZM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3',
  thumbsDown: 'M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3ZM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17',
  smile:      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
  meh:        'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 15h8M9 9h.01M15 9h.01',
  frown:      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 16s1.5-2 4-2 4 2 4 2M9 9h.01M15 9h.01',
  award:      'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM8.21 13.89L7 23l5-3 5 3-1.21-9.12',
  trending:   'M22 7L13 16L9 12L2 19M16 7h6v6',
  filter:     'M22 3H2l8 9.46V19l4 2v-8.54L22 3Z',
  plus:       'M12 5v14M5 12h14',
  check:      'M5 13L9 17L19 7',
};

function I({ name, size = 24, stroke = 1.6, style: sx, className }) {
  const d = EXTRA_M08[name];
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

// Star row component
function StarRow({ rating = 5, size = 32, interactive = false }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1,2,3,4,5].map(n => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"
            fill={n <= rating ? '#F5A623' : 'none'}
            stroke={n <= rating ? '#F5A623' : 'var(--rule-strong)'}
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

// Aspect chip
function AspectChip({ label, active = false, icon }) {
  return (
    <button style={{
      height: 38, padding: '0 14px', borderRadius: 'var(--r-pill)',
      background: active ? 'var(--forest)' : 'var(--surface)',
      border: '1.5px solid ' + (active ? 'transparent' : 'var(--rule)'),
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 13.5, fontWeight: active ? 600 : 400,
      color: active ? '#fff' : 'var(--ink-2)', whiteSpace: 'nowrap',
    }}>
      {active && <I name="check" size={13} stroke={2.5} style={{ color: 'var(--jade)' }} />}
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// 8.1 — Post-flight Prompt
// ─────────────────────────────────────────────────────────────
function PostFlightPromptScreen() {
  return (
    <Screen bg="var(--bg)">
      {/* Forest hero */}
      <div style={{
        background: 'linear-gradient(152deg, var(--forest) 0%, var(--forest-3) 100%)',
        paddingBottom: 44, flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
             viewBox="0 0 390 280" fill="none" aria-hidden>
          <circle cx="195" cy="140" r="200" stroke="white" strokeWidth="0.6" opacity="0.04"/>
          <circle cx="195" cy="140" r="130" stroke="white" strokeWidth="0.6" opacity="0.04"/>
          <path d="M70 230 Q195 70 330 170"
                stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeDasharray="8 12" fill="none"/>
          <circle cx="70"  cy="230" r="5" fill="var(--emerald)" opacity="0.7"/>
          <circle cx="330" cy="170" r="5" fill="var(--jade)"    opacity="0.7"/>
          <circle cx="196" cy="120" r="8"  fill="white" opacity="0.9"/>
          <circle cx="196" cy="120" r="18" stroke="white" strokeWidth="0.8" fill="none" opacity="0.18"/>
        </svg>
        <StatusBar dark/>
        <div style={{ padding: '4px 22px 0', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>
            Flight completed
          </div>
          {/* Big check */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 76, height: 76, borderRadius: 38, background: 'rgba(24,181,116,0.18)', border: '2px solid rgba(24,181,116,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <I name="checkCircle" size={40} stroke={1.4} style={{ color: 'var(--emerald)' }} />
              </div>
              {/* sparkle dots */}
              {[[-28, -8],[30, -12],[-22, 28],[28, 24]].map(([x, y], i) => (
                <div key={i} style={{ position: 'absolute', left: 38 + x, top: 38 + y, width: 6, height: 6, borderRadius: 3, background: 'var(--jade)', opacity: 0.65 + i * 0.08 }} />
              ))}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 6 }}>
            You've landed!
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            BOM → PNQ · Sat Jun 7 · Bell 407
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{
        flex: 1, marginTop: -28,
        background: 'var(--surface)', borderRadius: '24px 24px 0 0',
        boxShadow: 'var(--shadow-hero)', padding: '28px 28px 0',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)', lineHeight: 1.1, marginBottom: 8 }}>
          How was your<br/>
          <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-3)' }}>experience?</em>
        </div>
        <div style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: 28 }}>
          Your feedback helps us improve every flight and reward our best pilots.
        </div>

        {/* Quick emoji rating */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
          {[
            { icon: 'frown',   label: 'Poor',      color: 'var(--danger)' },
            { icon: 'meh',     label: 'Average',   color: 'var(--warn)' },
            { icon: 'smile',   label: 'Great',     color: 'var(--ok)',     active: true },
          ].map(({ icon, label, color, active }) => (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 32,
                background: active ? color + '18' : 'var(--surface-2)',
                border: '2.5px solid ' + (active ? color : 'transparent'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                <I name={icon} size={32} stroke={1.5} style={{ color: active ? color : 'var(--ink-4)' }} />
              </div>
              <span style={{ fontSize: 12.5, color: active ? 'var(--ink)' : 'var(--ink-4)', fontWeight: active ? 600 : 400 }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CTAButton variant="primary">Rate this flight</CTAButton>
          <CTAButton variant="ghost" style={{ color: 'var(--ink-4)', fontSize: 14.5 }}>
            Maybe later
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 8.2 — Star Rating
// ─────────────────────────────────────────────────────────────
function StarRatingScreen() {
  const ASPECTS = [
    { label: 'Punctuality',   rating: 5 },
    { label: 'Comfort',       rating: 4 },
    { label: 'Pilot',         rating: 5 },
    { label: 'Check-in',      rating: 4 },
    { label: 'Safety brief',  rating: 5 },
    { label: 'Ground crew',   rating: 4 },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar/>
      <NavBar showBack title="Rate your flight"/>

      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 22px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Overall */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '20px 20px', border: '1px solid var(--rule)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>Overall experience</div>
          <StarRow rating={5} size={40}/>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Excellent
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>Tap a star to adjust your rating</div>
        </div>

        {/* Per-aspect ratings */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 12 }}>Rate each aspect</div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', overflow: 'hidden', border: '1px solid var(--rule)', boxShadow: 'var(--shadow-sm)' }}>
            {ASPECTS.map(({ label, rating }, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: i < ASPECTS.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                <span style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 500 }}>{label}</span>
                <StarRow rating={rating} size={22}/>
              </div>
            ))}
          </div>
        </div>

        {/* Pilot tip */}
        <div style={{ background: 'var(--mint)', borderRadius: 'var(--r-lg)', padding: '13px 16px', border: '1.5px solid rgba(24,181,116,0.22)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 21, background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>R</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--forest)' }}>Capt. Rajesh Kumar</div>
            <div style={{ fontSize: 12.5, color: 'var(--canopy)', marginTop: 1 }}>Your pilot today · Bell 407 GXi</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <I name="thumbsUp" size={22} stroke={1.6} style={{ color: 'var(--emerald)' }} />
          </div>
        </div>

        <div style={{ flex: 1 }}/>
        <div style={{ paddingBottom: 36, flexShrink: 0 }}>
          <CTAButton variant="primary">
            Continue to review <I name="arrowRight" size={18} stroke={2.2}/>
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 8.3 — Written Review
// ─────────────────────────────────────────────────────────────
function WrittenReviewScreen() {
  const HIGHLIGHTS = [
    { label: 'Smooth takeoff', active: true },
    { label: 'On time', active: true },
    { label: 'Clean cabin', active: true },
    { label: 'Great views', active: false },
    { label: 'Friendly crew', active: false },
    { label: 'Comfortable', active: false },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar/>
      <NavBar showBack title="Write a review"/>

      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Flight summary strip */}
        <div style={{ background: 'var(--forest)', borderRadius: 'var(--r-lg)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <I name="plane" size={18} stroke={1.6} style={{ color: 'var(--jade)', flexShrink: 0 }}/>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>BOM → PNQ · Sat Jun 7 · Bell 407</span>
          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <StarRow rating={5} size={16}/>
          </div>
        </div>

        {/* Highlights */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 10 }}>
            What stood out?
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {HIGHLIGHTS.map(({ label, active }) => (
              <AspectChip key={label} label={label} active={active}/>
            ))}
          </div>
        </div>

        {/* Text review */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Your review</div>
          <div style={{
            minHeight: 130, borderRadius: 'var(--r-lg)',
            border: '2px solid var(--emerald)', background: 'var(--mint-2)',
            padding: '14px 16px', boxShadow: 'var(--focus-ring)',
          }}>
            <span style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.65 }}>
              Absolutely seamless experience from start to finish. Captain Rajesh handled a slight turbulence patch with complete calm. The Bell 407 was spotless and the views over the Western Ghats were incredible.
            </span>
            <div style={{ display: 'inline-block', width: 2, height: 18, background: 'var(--emerald)', marginLeft: 3, borderRadius: 1, verticalAlign: 'middle' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>Be specific and helpful for others.</span>
            <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>182 / 500</span>
          </div>
        </div>

        {/* Recommend toggle */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '14px 16px', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <I name="thumbsUp" size={22} stroke={1.6} style={{ color: 'var(--emerald)', flexShrink: 0 }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--ink)' }}>Would you recommend this route?</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>Shown to other passengers searching this route</div>
          </div>
          {/* Toggle on */}
          <div style={{ width: 46, height: 26, borderRadius: 13, background: 'var(--emerald)', position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', right: 3, top: 3, width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}/>
          </div>
        </div>

        {/* Anonymous */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--rule-soft)', flexShrink: 0 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--surface)', border: '1.5px solid var(--rule-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          </div>
          <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>Post anonymously (your name won't be shown)</span>
        </div>

        <div style={{ flex: 1 }}/>
        <div style={{ paddingBottom: 36, flexShrink: 0 }}>
          <CTAButton variant="primary">
            Next — add photos <I name="camera" size={17} stroke={2}/>
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 8.4 — Photo Upload
// ─────────────────────────────────────────────────────────────
function PhotoUploadScreen() {
  // Mock photo placeholders with hues
  const PHOTOS = [
    { hue: 'var(--forest-3)',  label: '↙ In-flight view',  added: true },
    { hue: 'var(--canopy)',    label: '↙ Landing approach', added: true },
    { hue: null,               label: null,                 added: false },
    { hue: null,               label: null,                 added: false },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar/>
      <NavBar showBack title="Add photos"/>

      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 18px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Header */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)', lineHeight: 1.1, marginBottom: 6 }}>
            Show your<br/>
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-3)' }}>journey.</em>
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            Share up to 5 photos from your flight. These help other passengers know what to expect.
          </div>
        </div>

        {/* Photo grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flexShrink: 0 }}>
          {PHOTOS.map((p, i) => (
            p.added ? (
              <div key={i} style={{ height: 160, borderRadius: 'var(--r-lg)', background: p.hue, position: 'relative', overflow: 'hidden' }}>
                {/* Simulated photo content */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 180 160" fill="none" aria-hidden>
                  <circle cx="140" cy="40"  r="70" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none"/>
                  <circle cx="140" cy="40"  r="40" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none"/>
                  <path d="M0 120 Q60 80 120 100 Q150 112 180 90" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none"/>
                  <path d="M0 140 Q80 110 180 130" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none"/>
                </svg>
                {/* Remove button */}
                <div style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <I name="close" size={12} stroke={2.5} style={{ color: '#fff' }}/>
                </div>
                {/* Label */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 10px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.45))' }}>
                  <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-mono)' }}>{p.label}</span>
                </div>
              </div>
            ) : (
              <button key={i} style={{ height: 160, borderRadius: 'var(--r-lg)', border: '2px dashed var(--rule-strong)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <I name="plus" size={22} stroke={2} style={{ color: 'var(--ink-3)' }}/>
                </div>
                <span style={{ fontSize: 13, color: 'var(--ink-4)', fontWeight: 500 }}>Add photo</span>
              </button>
            )
          ))}
        </div>

        {/* Tips */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--rule)', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--rule-soft)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <I name="camera" size={16} stroke={1.6} style={{ color: 'var(--ink-3)', flexShrink: 0, marginTop: 1 }}/>
            <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>Photos from the cabin, aerial views, or the boarding experience are great.</span>
          </div>
          <div style={{ padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <I name="shield" size={16} stroke={1.6} style={{ color: 'var(--ink-3)', flexShrink: 0, marginTop: 1 }}/>
            <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>Don't include other passengers' faces without consent. All photos are reviewed before publishing.</span>
          </div>
        </div>

        <div style={{ flex: 1 }}/>
        <div style={{ paddingBottom: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CTAButton variant="primary">
            Submit review
          </CTAButton>
          <CTAButton variant="ghost" style={{ color: 'var(--ink-4)', fontSize: 14.5 }}>
            Skip photos
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 8.5 — Review History
// ─────────────────────────────────────────────────────────────
function ReviewHistoryScreen() {
  const REVIEWS = [
    {
      route: 'BOM → PNQ',
      date: 'Sat, Jun 7',
      aircraft: 'Bell 407',
      rating: 5,
      text: 'Absolutely seamless experience from start to finish. Captain Rajesh handled a slight turbulence patch with complete calm.',
      likes: 12,
      highlights: ['Smooth takeoff', 'On time', 'Clean cabin'],
      photos: 2,
      status: 'Published',
      st: 'ok',
    },
    {
      route: 'BOM → GOI',
      date: 'Mon, Jun 2',
      aircraft: 'AS350-B3',
      rating: 4,
      text: 'Lovely flight, stunning coastline views. Slight delay at boarding but crew were communicative and professional.',
      likes: 7,
      highlights: ['Great views', 'Friendly crew'],
      photos: 3,
      status: 'Published',
      st: 'ok',
    },
    {
      route: 'DEL → AGR',
      date: 'Thu, May 15',
      aircraft: 'Bell 407',
      rating: 3,
      text: 'Average experience. Flight was delayed 20 min and cabin felt a bit cramped.',
      likes: 2,
      highlights: [],
      photos: 0,
      status: 'Under review',
      st: 'warn',
    },
  ];

  return (
    <Screen bg="var(--bg)">
      <StatusBar/>
      {/* Header */}
      <div style={{ padding: '8px 18px 14px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)', lineHeight: 1.1 }}>
            My <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-3)' }}>Reviews.</em>
          </div>
        </div>
        {/* Stats chips */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 11px', borderRadius: 'var(--r-pill)', background: 'var(--forest)' }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="#F5A623" stroke="#F5A623" strokeWidth="1.5" aria-hidden>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/>
            </svg>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>4.0</span>
          </div>
          <div style={{ height: 28, padding: '0 11px', borderRadius: 'var(--r-pill)', background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)' }}>3 reviews</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: '0 18px 12px', flexShrink: 0, display: 'flex', gap: 8 }}>
        {['All', '5 ★', '4 ★', '3 ★'].map((f, i) => (
          <button key={f} style={{ height: 32, padding: '0 13px', borderRadius: 'var(--r-pill)', background: i === 0 ? 'var(--forest)' : 'var(--surface)', border: '1.5px solid ' + (i === 0 ? 'transparent' : 'var(--rule)'), fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#fff' : 'var(--ink-2)' }}>{f}</button>
        ))}
      </div>

      {/* Review cards */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {REVIEWS.map((r, idx) => (
          <div key={idx} style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '14px 16px', border: '1px solid var(--rule)', boxShadow: 'var(--shadow-sm)' }}>
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{r.route}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{r.date} · {r.aircraft}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                <StarRow rating={r.rating} size={16}/>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 20, padding: '0 8px', borderRadius: 'var(--r-pill)', background: r.st === 'ok' ? 'var(--ok-soft)' : 'var(--warn-soft)', border: '1px solid ' + (r.st === 'ok' ? 'rgba(24,181,116,0.2)' : 'rgba(201,123,12,0.2)') }}>
                  <div style={{ width: 5, height: 5, borderRadius: 3, background: r.st === 'ok' ? 'var(--ok)' : 'var(--warn)' }}/>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: r.st === 'ok' ? 'var(--ok)' : 'var(--warn)' }}>{r.status}</span>
                </div>
              </div>
            </div>

            {/* Review text */}
            <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 8 }}>{r.text}</div>

            {/* Highlights */}
            {r.highlights.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {r.highlights.map(h => (
                  <span key={h} style={{ height: 24, padding: '0 10px', borderRadius: 'var(--r-pill)', background: 'var(--mint)', border: '1px solid rgba(24,181,116,0.18)', fontSize: 11.5, color: 'var(--canopy)', fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}>{h}</span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 8, borderTop: '1px solid var(--rule-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <I name="thumbsUp" size={14} stroke={1.8} style={{ color: 'var(--ink-4)' }}/>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{r.likes} helpful</span>
              </div>
              {r.photos > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <I name="image" size={14} stroke={1.8} style={{ color: 'var(--ink-4)' }}/>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{r.photos} photos</span>
                </div>
              )}
              <div style={{ flex: 1 }}/>
              <button style={{ fontSize: 13, color: 'var(--emerald)', fontWeight: 500 }}>Edit</button>
            </div>
          </div>
        ))}

        <div style={{ paddingBottom: 24 }}/>
      </div>
    </Screen>
  );
}

Object.assign(window, {
  PostFlightPromptScreen, StarRatingScreen, WrittenReviewScreen,
  PhotoUploadScreen, ReviewHistoryScreen,
});
