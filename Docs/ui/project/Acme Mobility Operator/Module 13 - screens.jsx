/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 13 — Routes & Schedule
   13.1a  Routes list — active routes
   13.1b  Schedule view — weekly calendar
   13.2   Route detail — MUM→DEL pricing, slots, distances
   ───────────────────────────────────────────────────────────── */

// ─── Route status badge ────────────────────────────────────────
function RouteStatus({ s }) {
  const map = { 'Active': 'ok', 'Paused': 'warn', 'Draft': 'pending', 'Archived': 'danger' };
  return (
    <span className={`badge ${map[s] || 'pending'}`} style={{ height: 20, fontSize: 10.5 }}>
      <span className={`dot ${map[s] || 'pending'}`} />{s}
    </span>
  );
}

// ─── Route row ─────────────────────────────────────────────────
function RouteRow({ r, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 24px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)' }}>
      {/* route */}
      <div style={{ width: 240, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>{r.from}</span>
          <Icon name="arrowRight" size={10} style={{ color: 'var(--ink-4)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>{r.to}</span>
        </div>
        <div className="t-meta" style={{ fontSize: 11 }}>{r.fromFull} → {r.toFull}</div>
      </div>
      {/* distance + time */}
      <div style={{ width: 110, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{r.nm} nm</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>{r.estTime}</div>
      </div>
      {/* aircraft */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {r.aircraft.map(a => <span key={a} className="badge" style={{ height: 18, fontSize: 9.5 }}>{a}</span>)}
        </div>
      </div>
      {/* base price */}
      <div style={{ width: 120, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ok)', letterSpacing: '0.02em', fontWeight: 500 }}>₹{r.basePrice}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>from / charter</div>
      </div>
      {/* bookings */}
      <div style={{ width: 80, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)' }}>{r.bookings}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>this month</div>
      </div>
      {/* status */}
      <div style={{ width: 90, flexShrink: 0 }}>
        <RouteStatus s={r.status} />
      </div>
      {/* actions */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0, width: 140, justifyContent: 'flex-end' }}>
        <button className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>
        <button className="btn sm" style={{ height: 26 }}><Icon name="settings" size={11} />Edit</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 13.1a — Routes List
// ─────────────────────────────────────────────────────────────
function RoutesListScreen() {
  const routes = [
    { from: 'MUM',  to: 'DEL',    fromFull: 'Mumbai Juhu',    toFull: 'Delhi Safdarjung', nm: 720, estTime: '~3h 30m', aircraft: ['AW169'], basePrice: '1,85,000', bookings: 4, status: 'Active' },
    { from: 'MUM',  to: 'GOA',    fromFull: 'Mumbai Juhu',    toFull: 'Goa North Helipad', nm: 245, estTime: '~1h 10m', aircraft: ['AS350','EC135'], basePrice: '78,000', bookings: 8, status: 'Active' },
    { from: 'MUM',  to: 'PUNE',   fromFull: 'Mumbai Juhu',    toFull: 'Pune Heliport',   nm: 80,  estTime: '~0h 55m', aircraft: ['EC135','AW169'], basePrice: '38,000', bookings: 12, status: 'Active' },
    { from: 'MUM',  to: 'HYD',    fromFull: 'Mumbai Juhu',    toFull: 'Hyderabad BHEL',   nm: 380, estTime: '~1h 50m', aircraft: ['AW169'], basePrice: '1,10,000', bookings: 5, status: 'Active' },
    { from: 'MUM',  to: 'CHN',    fromFull: 'Mumbai Juhu',    toFull: 'Chennai Helipad',  nm: 620, estTime: '~3h 00m', aircraft: ['AW169'], basePrice: '1,60,000', bookings: 3, status: 'Active' },
    { from: 'MUM',  to: 'SHRDI',  fromFull: 'Mumbai Juhu',    toFull: 'Shirdi Helipad',   nm: 140, estTime: '~0h 45m', aircraft: ['EC135','AS350'], basePrice: '42,000', bookings: 9, status: 'Active' },
    { from: 'MUM',  to: 'NASH',   fromFull: 'Mumbai Juhu',    toFull: 'Nashik Helipad',   nm: 110, estTime: '~0h 40m', aircraft: ['EC135'], basePrice: '35,000', bookings: 4, status: 'Active' },
    { from: 'MUM',  to: 'LONV',   fromFull: 'Mumbai Juhu',    toFull: 'Lonavala Helipad', nm: 60,  estTime: '~0h 30m', aircraft: ['EC135'], basePrice: '24,000', bookings: 2, status: 'Active' },
    { from: 'MUM',  to: 'SUR',    fromFull: 'Mumbai Juhu',    toFull: 'Surat Airport',    nm: 160, estTime: '~0h 50m', aircraft: ['EC135','AW169'], basePrice: '52,000', bookings: 1, status: 'Paused' },
  ];

  return (
    <Shell
      active="routes"
      breadcrumb="Schedule & Pricing"
      title="Routes & Schedule"
      subtitle="Helix Aviation · 9 routes · 8 active · 1 paused"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm accent"><Icon name="plus" size={12} />Add route</button>
        </div>
      }
    >
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', background: 'var(--surface)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <div className="input" style={{ width: 240, height: 32 }}>
          <Icon name="search" size={13} className="icon" />
          <input placeholder="Search routes, destinations…" />
        </div>
        <FilterChip label="Status" value="All" />
        <FilterChip label="Aircraft" value="All types" />
        <FilterChip label="Distance" value="Any" />
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>9 routes</span>
      </div>

      {/* col header */}
      <div style={{ display: 'flex', padding: '8px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        {[['Route',240],['Distance',110],['Aircraft types',0],['Base price',120],['Bookings',80],['Status',90],['',140,'right']].map(([l,w,a]) => (
          <div key={l} className="t-label" style={{ width: w || undefined, flex: !w ? 1 : undefined, flexShrink: w ? 0 : undefined, textAlign: a || 'left' }}>{l}</div>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {routes.map((r, i) => <RouteRow key={r.from+r.to} r={r} last={i === routes.length-1} />)}
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 13.1b — Weekly Schedule View
// ─────────────────────────────────────────────────────────────
function WeekScheduleScreen() {
  const days = ['Mon 2', 'Tue 3', 'Wed 4', 'Thu 5', 'Fri 6', 'Sat 7', 'Sun 8'];
  const today = 3; // index of "Thu 5"

  const events = [
    { day: 0, startH: 9,  endH: 10, label: 'BKG-0570', sub: 'MUM→PUNE', tone: 'ok',   reg: 'VT-HXE' },
    { day: 1, startH: 8,  endH: 12, label: 'BKG-0580', sub: 'MUM→HYD',  tone: 'ok',   reg: 'VT-HXE' },
    { day: 1, startH: 10, endH: 11, label: 'BKG-0581', sub: 'MUM→PUNE', tone: 'ok',   reg: 'VT-HXD' },
    { day: 2, startH: 8,  endH: 10, label: 'BKG-0583', sub: 'MUM→PUNE', tone: 'ok',   reg: 'VT-HXD' },
    { day: 2, startH: 9,  endH: 12, label: 'BKG-0589', sub: 'MUM→HYD',  tone: 'ok',   reg: 'VT-HXE' },
    // today (Thu 5)
    { day: 3, startH: 9,  endH: 11, label: 'BKG-0590', sub: 'MUM→GOA',  tone: 'info', reg: 'VT-HXB' },
    { day: 3, startH: 11, endH: 15, label: 'BKG-0601', sub: 'MUM→DEL',  tone: 'info', reg: 'VT-HXE' },
    { day: 3, startH: 13, endH: 14, label: 'BKG-0594', sub: 'MUM→SHRDI',tone: 'pending', reg: 'VT-HXD' },
    { day: 3, startH: 17, endH: 18, label: 'BKG-0598', sub: 'MUM→PUNE', tone: 'pending', reg: 'VT-HXD' },
    // future
    { day: 4, startH: 9,  endH: 13, label: 'BKG-0605', sub: 'MUM→CHN',  tone: 'pending', reg: 'VT-HXE' },
    { day: 4, startH: 10, endH: 11, label: 'BKG-0606', sub: 'MUM→PUNE', tone: 'pending', reg: 'VT-HXD' },
    { day: 5, startH: 8,  endH: 9,  label: 'BKG-0607', sub: 'MUM→SHRDI',tone: 'pending', reg: 'VT-HXB' },
    { day: 5, startH: 11, endH: 15, label: 'BKG-0588', sub: 'MUM→GOA',  tone: 'pending', reg: 'VT-HXE' },
    { day: 6, startH: 8,  endH: 9,  label: 'BKG-0610', sub: 'MUM→NASH', tone: 'pending', reg: 'VT-HXD' },
  ];

  const hours = [7,8,9,10,11,12,13,14,15,16,17,18,19];
  const cellH = 48;
  const dayW = 160;
  const timeW = 44;

  function evTop(startH)  { return (startH - 7) * cellH; }
  function evHeight(s, e) { return (e - s) * cellH; }

  const bgTones = { ok: 'color-mix(in oklab,var(--ok) 14%,var(--surface))', info: 'color-mix(in oklab,var(--info) 14%,var(--surface))', pending: 'color-mix(in oklab,var(--accent) 10%,var(--surface))' };
  const bdrTones = { ok: 'var(--ok)', info: 'var(--info)', pending: 'var(--accent)' };

  return (
    <Shell
      active="routes"
      breadcrumb="Schedule & Pricing"
      title="Weekly Schedule"
      subtitle="Helix Aviation · Jun 2–8, 2026 · 14 flights scheduled"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm"><Icon name="chevLeft" size={12} />May 26</button>
          <button className="btn sm accent" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em' }}>This week</button>
          <button className="btn sm">Jun 9<Icon name="chevRight" size={12} /></button>
        </div>
      }
    >
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* header row */}
        <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 20, background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ width: timeW, flexShrink: 0 }} />
          {days.map((d, i) => (
            <div key={d} style={{
              width: dayW, flexShrink: 0, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.06em',
              color: i === today ? 'var(--accent)' : 'var(--ink-3)',
              fontWeight: i === today ? 600 : 400,
              borderLeft: '1px solid var(--rule)',
              background: i === today ? 'color-mix(in oklab,var(--accent) 5%,var(--surface-2))' : undefined,
            }}>
              {i === today && <span className="dot info" style={{ marginRight: 6 }} />}{d}
            </div>
          ))}
        </div>

        {/* time grid */}
        <div style={{ display: 'flex' }}>
          {/* time labels */}
          <div style={{ width: timeW, flexShrink: 0 }}>
            {hours.map(h => (
              <div key={h} style={{ height: cellH, display: 'flex', alignItems: 'flex-start', paddingTop: 4, paddingRight: 8, justifyContent: 'flex-end', borderBottom: '1px solid var(--rule-soft)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.04em' }}>{String(h).padStart(2,'0')}:00</span>
              </div>
            ))}
          </div>

          {/* day columns */}
          {days.map((d, di) => (
            <div key={d} style={{ width: dayW, flexShrink: 0, position: 'relative', borderLeft: '1px solid var(--rule)', background: di === today ? 'color-mix(in oklab,var(--accent) 3%,var(--bg))' : 'var(--bg)' }}>
              {hours.map(h => (
                <div key={h} style={{ height: cellH, borderBottom: '1px solid var(--rule-soft)' }} />
              ))}
              {events.filter(e => e.day === di).map(e => (
                <div key={e.label} style={{
                  position: 'absolute',
                  top: evTop(e.startH) + 2,
                  height: evHeight(e.startH, e.endH) - 4,
                  left: 4, right: 4,
                  background: bgTones[e.tone],
                  border: `1px solid ${bdrTones[e.tone]}`,
                  borderRadius: 2, padding: '3px 6px', overflow: 'hidden', cursor: 'pointer',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.label}</div>
                  <div style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 1 }}>{e.sub}</div>
                  <div style={{ fontSize: 9, color: 'var(--ink-4)' }}>{e.reg}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 13.2 — Route Detail (MUM → DEL)
// ─────────────────────────────────────────────────────────────
function RouteDetailScreen() {
  const pricingTiers = [
    { tier: 'Standard charter',   aircraft: 'AW169',    minPax: 1, maxPax: 16, price: '₹1,85,000', per: 'per flight', active: true  },
    { tier: 'Executive charter',  aircraft: 'AW169',    minPax: 1, maxPax: 8,  price: '₹2,20,000', per: 'per flight', active: true  },
    { tier: 'VIP charter',        aircraft: 'AW169',    minPax: 1, maxPax: 8,  price: '₹2,80,000', per: 'per flight', active: true  },
    { tier: 'Cargo',              aircraft: 'AW169',    minPax: 0, maxPax: 0,  price: '₹95/kg',    per: 'per kg',     active: false },
  ];

  const surcharges = [
    { label: 'Fuel surcharge',           rate: '₹95/kg',     basis: 'Fuel consumption est.' },
    { label: 'Landing & parking (DEL)',  rate: '₹12,000',    basis: 'Per landing' },
    { label: 'VIP ground handling',      rate: '₹6,500',     basis: 'If VIP tier selected' },
    { label: 'Night operations',         rate: '+15%',       basis: 'Departure 20:00–06:00' },
    { label: 'Weekend premium',          rate: '+8%',        basis: 'Sat–Sun' },
    { label: 'GST',                      rate: '18%',        basis: 'On applicable components' },
  ];

  return (
    <Shell
      active="routes"
      breadcrumb="Routes & Schedule / MUM → DEL"
      title="Route: MUM → DEL"
      subtitle="Mumbai Juhu → Delhi Safdarjung · 720 nm · ~3h 30m · AW169 only"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" style={{ height: 32, color: 'var(--ink-3)' }}>
            <Icon name="arrowRight" size={12} style={{ transform: 'rotate(180deg)' }} />Back
          </button>
          <button className="btn sm" style={{ height: 32 }}><Icon name="settings" size={12} />Edit route</button>
          <button className="btn sm danger" style={{ height: 32 }}>Pause route</button>
        </div>
      }
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* left */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 20, borderRight: '1px solid var(--rule)' }}>

          {/* route specs */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Route specifications</div>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {[
                  ['Origin',          'MUM Juhu Aerodrome'],
                  ['Destination',     'DEL Safdarjung Airport'],
                  ['Distance',        '720 nm (1,333 km)'],
                  ['Est. block time', '~3 h 30 m'],
                  ['Eligible types',  'AW169 only'],
                  ['IFR capable',     'Yes'],
                  ['Night ops',       'Yes (+15% premium)'],
                  ['Bookings (MTD)',   '4 flights'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <div className="t-label" style={{ marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* pricing tiers */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className="t-label">Pricing tiers</span>
              <div style={{ flex: 1 }} />
              <button className="btn sm accent" style={{ height: 28 }}><Icon name="plus" size={11} />Add tier</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pricingTiers.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--surface)', border: `1.5px solid ${t.active ? 'var(--rule)' : 'var(--rule-soft)'}`, borderRadius: 3, opacity: t.active ? 1 : 0.55 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 2, background: t.active ? 'var(--ok)' : 'var(--surface-sunk)', border: `1.5px solid ${t.active ? 'var(--ok)' : 'var(--rule-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {t.active && <Icon name="check" size={9} style={{ color: '#fff' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>{t.tier}</div>
                    <div className="t-meta" style={{ fontSize: 11 }}>{t.aircraft} · {t.maxPax > 0 ? `1–${t.maxPax} pax` : 'Cargo only'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ok)', letterSpacing: '0.02em', fontWeight: 600 }}>{t.price}</div>
                    <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>{t.per}</div>
                  </div>
                  <button className="btn sm icon" style={{ height: 26, width: 26 }}><Icon name="settings" size={11} /></button>
                </div>
              ))}
            </div>
          </section>

          {/* surcharges */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Surcharges &amp; add-ons</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {surcharges.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 14px', borderBottom: i < surcharges.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>{s.label}</div>
                    <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>{s.basis}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-3)', letterSpacing: '0.03em' }}>{s.rate}</span>
                  <button className="btn sm icon" style={{ height: 24, width: 24 }}><Icon name="settings" size={11} /></button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* right: booking history + sample quote */}
        <div style={{ width: 360, flexShrink: 0, background: 'var(--surface)', overflowY: 'auto', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Route performance</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Bookings MTD',    '4',         undefined],
                ['Revenue MTD',    '₹12,12,884', 'ok'],
                ['Avg booking val', '₹3,03,221', undefined],
                ['On-time %',      '100%',       'ok'],
                ['Avg pax load',   '6.5 pax',    undefined],
                ['Most popular',   'Standard charter', undefined],
              ].map(([k,v,t]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid var(--rule-soft)' }}>
                  <span className="t-meta" style={{ fontSize: 11.5 }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: t ? `var(--${t})` : 'var(--ink)', letterSpacing: '0.02em' }}>{v}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Sample quote — Standard charter</div>
            <div className="card" style={{ padding: '12px 14px' }}>
              {[
                ['Base charter rate',   '₹1,85,000'],
                ['Fuel surcharge',      '₹28,500'],
                ['Landing & parking',   '₹12,000'],
                ['Sub-total',           '₹2,25,500'],
                ['Platform fee (3%)',   '₹6,765'],
                ['GST (18%)',           '₹41,490'],
                ['Total',               '₹2,73,755'],
              ].map(([k,v], i, arr) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i === arr.length-1 ? 'none' : i === 3 ? '1px solid var(--rule)' : '1px solid var(--rule-soft)', marginTop: i === 3 ? 4 : 0 }}>
                  <span style={{ fontSize: 12, color: i === arr.length-1 ? 'var(--ink)' : 'var(--ink-3)', fontWeight: i === arr.length-1 ? 600 : 400 }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: i === arr.length-1 ? 14 : 12, color: i === arr.length-1 ? 'var(--ok)' : 'var(--ink-3)', fontWeight: i === arr.length-1 ? 700 : 400 }}>{v}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Upcoming flights</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { ref: 'BKG-0601', date: '5 Jun 11:10', reg: 'VT-HXE', status: 'In-air'    },
                { ref: 'BKG-0561', date: '28 May 09:00', reg: 'VT-HXE', status: 'Completed' },
              ].map(f => (
                <div key={f.ref} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink)', flex: 1 }}>{f.ref}</span>
                  <span className="t-meta" style={{ fontSize: 11 }}>{f.date}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>{f.reg}</span>
                  <span className={`badge ${f.status === 'In-air' ? 'info' : 'ok'}`} style={{ height: 17, fontSize: 9.5 }}><span className={`dot ${f.status === 'In-air' ? 'info' : 'ok'}`} />{f.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { RoutesListScreen, WeekScheduleScreen, RouteDetailScreen });
