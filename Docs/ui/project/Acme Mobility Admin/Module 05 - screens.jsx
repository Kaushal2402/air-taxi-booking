/* ─────────────────────────────────────────────────────────────
   Module 05 — Booking Management (Air)
   Screens 5.1 → 5.4
   ───────────────────────────────────────────────────────────── */

const AIR_BOOKINGS = [
  { id: 'AC-A4-21809', sub: 'Heli · Shuttle',  cust: 'Vikram Bhatt',      op: 'BlueSky Heli',    route: 'BLR-PAD → MYS-PAD',  pax: 4, when: 'Today 17:30', etd: '17:30', status: 'Confirmed',     fare: '₹2,74,000', pay: 'Card · Corp', flag: false },
  { id: 'AC-A4-21807', sub: 'Charter',         cust: 'Anushka Roy',       op: 'Skydeck Aviation',route: 'BLR · HAL → KOC',    pax: 6, when: 'Today 19:00', etd: '19:00', status: 'Boarding',      fare: '₹4,80,000', pay: 'Wire',        flag: false },
  { id: 'AC-A4-21803', sub: 'Heli · On-demand',cust: 'Aarav Kapoor',      op: 'BlueSky Heli',    route: 'BLR-PAD → Coorg',    pax: 2, when: 'Today 14:00', etd: '14:00', status: 'Departed',      fare: '₹1,84,000', pay: 'Card',        flag: false },
  { id: 'AC-A4-21798', sub: 'VIP',             cust: 'Priya Iyer',        op: 'Skydeck Aviation',route: 'BLR → JAI · Custom', pax: 4, when: 'Tomorrow 06:30', etd: '06:30', status: 'Quote shared', fare: '₹12,80,000',pay: 'Corp · PO',   flag: true,  flagReason: 'High-value · quote pending acceptance' },
  { id: 'AC-A4-21791', sub: 'Heli · Shuttle',  cust: 'Diya Menon',        op: 'BlueSky Heli',    route: 'BLR-PAD → MYS-PAD',  pax: 2, when: 'Tomorrow 09:00', etd: '09:00', status: 'Confirmed',    fare: '₹1,37,000', pay: 'Card',        flag: false },
  { id: 'AC-A4-21788', sub: 'Charter',         cust: 'Tariq Ahmed',       op: 'Aerial Mobility', route: 'BLR · HAL → GOI',    pax: 8, when: 'Fri · 23 May',   etd: '08:00', status: 'Manifest locked', fare: '₹6,10,000', pay: 'Wire',     flag: false },
  { id: 'AC-A4-21785', sub: 'Heli · On-demand',cust: 'Karthik Reddy',     op: 'Aerial Mobility', route: 'BLR-PAD → CJB',      pax: 3, when: 'Fri · 23 May',   etd: '11:30', status: 'Requested',    fare: '₹3,42,000', pay: '—',           flag: false },
  { id: 'AC-A4-21782', sub: 'Heli · Shuttle',  cust: 'Hema Rao',          op: 'BlueSky Heli',    route: 'MYS-PAD → BLR-PAD',  pax: 1, when: 'Yesterday',       etd: '18:00', status: 'Completed',    fare: '₹68,500',   pay: 'Card',        flag: false },
  { id: 'AC-A4-21778', sub: 'Charter',         cust: 'Rohan Mehta',       op: 'Skydeck Aviation',route: 'BLR → BOM',          pax: 6, when: 'Yesterday',       etd: '14:00', status: 'Cancelled',    fare: '₹0',        pay: '—',           flag: true,  flagReason: 'Weather · force majeure' },
  { id: 'AC-A4-21772', sub: 'VIP',             cust: 'Maya Cherian',      op: 'Skydeck Aviation',route: 'BLR → DEL · Custom', pax: 3, when: '19 May',          etd: '07:00', status: 'Completed',    fare: '₹14,20,000',pay: 'Corp · PO',   flag: false },
  { id: 'AC-A4-21766', sub: 'Heli · On-demand',cust: 'Imran Shaikh',      op: 'BlueSky Heli',    route: 'BLR-PAD → Hampi',    pax: 4, when: '18 May',          etd: '06:00', status: 'Completed',    fare: '₹2,84,000', pay: 'Card',        flag: false },
  { id: 'AC-A4-21762', sub: 'Heli · Shuttle',  cust: 'Leah Joseph',       op: 'BlueSky Heli',    route: 'BLR-PAD → MYS-PAD',  pax: 2, when: '17 May',          etd: '08:30', status: 'Refunded',     fare: '₹68,500',   pay: 'Card',        flag: true,  flagReason: 'Customer · operator delay > 90 min' },
];

function aStatusBadge(s) {
  const map = {
    'Confirmed':        { tone: 'ok' },
    'Boarding':         { tone: 'info' },
    'Departed':         { tone: 'ok' },
    'Arrived':          { tone: 'pending' },
    'Completed':        { tone: 'pending' },
    'Quote shared':     { tone: 'warn' },
    'Manifest locked':  { tone: 'info' },
    'Requested':        { tone: 'warn' },
    'Cancelled':        { tone: 'danger' },
    'Refunded':         { tone: 'info' },
    'Rescheduled':      { tone: 'info' },
  };
  const cfg = map[s] || { tone: 'pending' };
  return <span className={'badge ' + cfg.tone}><span className={'dot ' + cfg.tone} />{s}</span>;
}

// ──────────────────────────────────────────────────────────────
// 5.1 — Air Bookings List
// ──────────────────────────────────────────────────────────────
function AirBookingsListScreen() {
  return (
    <Shell
      active="bookings-a"
      breadcrumb="Operations · Bookings"
      title="Air bookings"
      subtitle="38 today · 12 in air · ₹62.4 L gross · Wed 21 May"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm"><Icon name="external" size={13} />Open ops board</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Assisted booking</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* tab strip */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
        }}>
          {[
            { l: 'All bookings',  n: '38', tone: '' },
            { l: 'In air',        n: '12', active: true,  tone: 'var(--accent)' },
            { l: 'Quote pending', n: '5',  tone: 'var(--warn)' },
            { l: 'Manifest open', n: '7',  tone: 'var(--info)' },
            { l: 'Cancelled · 7d',n: '4',  tone: 'var(--danger)' },
            { l: 'Refund queue',  n: '2',  tone: 'var(--info)' },
          ].map((v, i) => (
            <div key={v.l} style={{
              padding: '16px 18px',
              borderRight: i < 5 ? '1px solid var(--rule)' : 'none',
              borderBottom: v.active ? '2px solid var(--accent)' : '2px solid transparent',
              background: v.active ? 'var(--surface-2)' : 'transparent', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: v.active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: v.active ? 500 : 400 }}>{v.l}</span>
                {v.tone && !v.active && <span className="dot" style={{ background: v.tone }} />}
              </div>
              <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.018em', color: 'var(--ink)' }}>{v.n}</div>
            </div>
          ))}
        </div>

        {/* filter bar */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: 260, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Ref, customer, route, registration…" />
          </div>
          <FilterChip label="Sub-type" value="Heli · Charter · Shuttle · VIP" count={4} />
          <FilterChip label="Operator" value="All · 4" />
          <FilterChip label="Route"    value="Any" />
          <FilterChip label="Date"     value="Today + Tomorrow" count={1} />
          <FilterChip label="Pax"      value="≥ 1" />
          <FilterChip label="Fare"     value="₹0 – ₹∞" />
          <FilterChip label="Tier"     value="Standard · VIP" />
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost"><Icon name="filter" size={13} />Saved view · In air <Icon name="chevDown" size={11} /></button>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 32 }}><input type="checkbox" /></th>
                <th>Ref</th>
                <th>Customer · Service</th>
                <th>Itinerary</th>
                <th>Operator</th>
                <th>Pax</th>
                <th>ETD</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Fare</th>
                <th>Payment</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {AIR_BOOKINGS.map((b, i) => (
                <tr key={b.id} className={i === 0 ? 'selected' : ''}>
                  <td><input type="checkbox" defaultChecked={i === 0} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{b.id}</span>
                      {b.flag && <span title={b.flagReason}><Icon name="flag" size={12} stroke={1.6} style={{ color: 'var(--danger)' }} /></span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>{b.cust}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{b.sub}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      <span style={{ color: 'var(--ink)' }}>{b.route.split('→')[0].trim()}</span>
                      <Icon name="arrowRight" size={11} style={{ color: 'var(--ink-4)' }} />
                      <span style={{ color: 'var(--ink-2)' }}>{b.route.split('→')[1]?.trim()}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>{b.op}</td>
                  <td className="num">{b.pax}</td>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>{b.etd}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{b.when}</div>
                  </td>
                  <td>{aStatusBadge(b.status)}</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--ink)' }}>{b.fare}</td>
                  <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{b.pay}</td>
                  <td><button className="btn ghost icon sm"><Icon name="moreVert" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)' }}>
            <div className="t-meta">Showing <span style={{ color: 'var(--ink-2)' }}>1–12</span> of <span style={{ color: 'var(--ink-2)' }}>38</span> bookings · 4 operators</div>
            <div className="t-meta">All air bookings respect operator pause state · audit-logged</div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// SVG · stylized regional sectional with the route drawn
// ──────────────────────────────────────────────────────────────
function FlightChart({ stops = [], showSectors = true }) {
  return (
    <svg viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block', background: 'var(--surface-sunk)' }}>
      <defs>
        <pattern id="acGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0 L0 0 0 40" stroke="var(--rule)" strokeWidth="0.5" fill="none" />
        </pattern>
        <pattern id="acDots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.6" fill="var(--rule-strong)" />
        </pattern>
      </defs>
      <rect width="800" height="360" fill="url(#acGrid)" />
      <rect width="800" height="360" fill="url(#acDots)" opacity="0.6" />

      {/* topography — soft shapes */}
      <g fill="var(--accent)" opacity="0.06" stroke="var(--accent)" strokeOpacity="0.18" strokeWidth="0.7">
        <path d="M40 220 Q140 180 220 210 Q300 250 280 290 Q220 320 140 300 Q60 280 40 220 Z" />
        <path d="M520 60 Q620 70 680 130 Q700 200 660 250 Q580 240 560 180 Q540 110 520 60 Z" />
      </g>
      {/* coastline / water */}
      <path d="M-20 320 Q220 290 420 320 Q600 350 820 310 L820 360 L-20 360 Z" fill="var(--info)" opacity="0.08" />

      {/* airspace sectors */}
      {showSectors && (
        <g stroke="var(--rule-strong)" strokeDasharray="3 4" strokeWidth="0.8" fill="none">
          <path d="M120 80 L320 60 L380 180 L240 240 L80 200 Z" />
          <path d="M420 60 L640 80 L660 220 L500 260 L380 180 Z" />
        </g>
      )}

      {/* great-circle route */}
      {stops.length >= 2 && (
        <g>
          <path d={`M${stops[0].x} ${stops[0].y} Q${(stops[0].x + stops[1].x)/2} ${Math.min(stops[0].y, stops[1].y) - 80} ${stops[1].x} ${stops[1].y}`}
                fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeDasharray="6 4" />
          {/* aircraft mid-flight */}
          <g transform={`translate(${(stops[0].x + stops[1].x)/2 - 8} ${Math.min(stops[0].y, stops[1].y) - 70})`}>
            <g transform="rotate(60)">
              <path d="M0 -8 L4 5 L0 3 L-4 5 Z" fill="var(--accent)" stroke="var(--surface)" strokeWidth="0.6" />
            </g>
          </g>
        </g>
      )}

      {/* nav fixes */}
      <g fill="var(--ink-3)" opacity="0.7">
        {[[160,140],[260,90],[440,120],[560,180],[330,260]].map(([x,y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M0 -4 L4 4 L-4 4 Z" fill="none" stroke="currentColor" strokeWidth="0.7" />
            <text x="6" y="5" style={{ font: '9px IBM Plex Mono', letterSpacing: '0.06em' }}>{['ABULA','VOMAK','TUTLO','GIPLO','OBNAV'][i]}</text>
          </g>
        ))}
      </g>

      {/* stops */}
      {stops.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y})`}>
          <circle r="9" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.4" />
          <circle r="3" fill="var(--ink)" />
          <text x="0" y="-16" textAnchor="middle" fill="var(--ink)"
                style={{ font: '600 12px IBM Plex Mono', letterSpacing: '0.08em' }}>{s.code}</text>
          <text x="0" y="24" textAnchor="middle" fill="var(--ink-3)"
                style={{ font: '10px IBM Plex Mono', letterSpacing: '0.06em' }}>{s.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// 5.2 — Air Booking Detail
// ──────────────────────────────────────────────────────────────
function AirBookingDetailScreen() {
  const tabs = ['Overview', 'Itinerary', 'Manifest', 'Quote', 'Payments', 'Communications', 'Audit'];
  const timeline = [
    { t: '17:14', e: 'Boarding called',          m: 'Pad gate B · 4 pax checked in',     tone: 'info', current: true },
    { t: '16:58', e: 'Manifest locked',          m: 'Pilot acknowledged · pax weight OK', tone: 'ok' },
    { t: '16:42', e: 'Pilot assigned',           m: 'Capt. Renu Bhandari · co-pilot Vikas',tone: 'ok' },
    { t: '16:20', e: 'Aircraft assigned',        m: 'Bell 407 · VT-BSE · seats 6',        tone: 'ok' },
    { t: '15:38', e: 'Operator confirmed',       m: 'BlueSky Heli accepted · ETA 17:30',  tone: 'ok' },
    { t: '15:32', e: 'Booking requested',        m: 'V. Bhatt · 4 pax · ₹2.74L estimate', tone: 'pending' },
  ];
  const manifest = [
    { n: 1, name: 'Vikram Bhatt',  age: 39, id: 'AADHR ●●●● 2871', wt: 84,  bg: 12, special: 'Lead pax' },
    { n: 2, name: 'Priya Bhatt',   age: 36, id: 'AADHR ●●●● 5219', wt: 62,  bg: 14, special: '—' },
    { n: 3, name: 'Veer Bhatt',    age: 11, id: 'AADHR ●●●● 7102', wt: 38,  bg: 8,  special: 'Minor · accompanied' },
    { n: 4, name: 'Aanya Bhatt',   age: 8,  id: 'AADHR ●●●● 7103', wt: 28,  bg: 6,  special: 'Minor · accompanied' },
  ];
  const paxWt = manifest.reduce((s, p) => s + p.wt, 0);
  const bgWt  = manifest.reduce((s, p) => s + p.bg, 0);
  const fuelWt = 540;
  const baseWt = 1860;
  const totalWt = paxWt + bgWt + fuelWt + baseWt;
  const mtow = 2722;
  const utilization = (totalWt / mtow);

  return (
    <Shell
      active="bookings-a"
      breadcrumb="Operations · Air bookings"
      title="AC-A4-21809 · BLR-PAD → MYS-PAD"
      subtitle="Heli · Shuttle · BlueSky · ETD 17:30 IST · 4 pax · ₹2,74,000"
      actions={
        <>
          <button className="btn sm"><Icon name="refresh" size={13} />Reassign operator</button>
          <button className="btn sm"><Icon name="envelope" size={13} />Notify pax</button>
          <button className="btn sm">Reschedule</button>
          <button className="btn sm danger">Cancel</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', minHeight: '100%' }}>
        {/* main */}
        <div>
          {/* tabs */}
          <div style={{ padding: '0 32px', borderBottom: '1px solid var(--rule)', background: 'var(--surface)', display: 'flex' }}>
            {tabs.map((t, i) => (
              <div key={t} style={{
                padding: '14px 18px',
                fontSize: 13, color: i === 0 ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: i === 0 ? 500 : 400,
                borderBottom: '2px solid ' + (i === 0 ? 'var(--accent)' : 'transparent'),
                marginBottom: -1, cursor: 'pointer',
              }}>{t}</div>
            ))}
          </div>

          <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* hero strip */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}>
              {[
                ['State',          <span className="badge info" key="x"><span className="dot info" />Boarding</span>],
                ['Distance',       '124 nm'],
                ['Flight time',    '42 min · est'],
                ['Block fuel',     '540 kg'],
                ['MTOW · 4 PAX',   '2,510 / 2,722 kg'],
                ['Weather · pad',  'CAVOK · 14 kt'],
              ].map(([k, v], i) => (
                <div key={k} style={{ padding: '14px 18px', borderRight: i < 5 ? '1px solid var(--rule)' : 'none' }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* chart + timeline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="t-label">Sectional chart · live</div>
                    <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>BLR-PAD → MYS-PAD</h3>
                  </div>
                  <span className="badge"><Icon name="clock" size={10} />T-16 min</span>
                </div>
                <div style={{ height: 280 }}>
                  <FlightChart stops={[
                    { x: 600, y: 140, code: 'VOBL', label: 'Bengaluru pad B' },
                    { x: 200, y: 240, code: 'VOMY', label: 'Mysuru pad' },
                  ]} />
                </div>
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                  <div className="t-label">State timeline</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Pre-flight progress</h3>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  {timeline.map((e, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < timeline.length - 1 ? 14 : 0, position: 'relative' }}>
                      <div style={{ position: 'relative', width: 12, flexShrink: 0 }}>
                        <span className={'dot ' + e.tone} style={{
                          width: e.current ? 10 : 8, height: e.current ? 10 : 8,
                          position: 'absolute', top: 4, left: 1,
                          boxShadow: e.current ? '0 0 0 4px var(--info-soft)' : undefined,
                        }} />
                        {i < timeline.length - 1 && <span style={{ position: 'absolute', left: 5, top: 16, bottom: -14, width: 1, background: 'var(--rule-strong)' }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{e.e}</span>
                          <span className="t-meta">{e.t}</span>
                        </div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{e.m}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* manifest */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="t-label">Manifest · locked at 16:58</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>4 passengers · 212 kg pax + 40 kg baggage</h3>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn sm ghost"><Icon name="printer" size={12} />Print manifest</button>
                  <button className="btn sm">Edit (gate-side)</button>
                </div>
              </div>

              {/* MTOW utilization */}
              <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--rule)', background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10 }}>
                  <span className="t-label" style={{ padding: 0 }}>Weight & balance · MTOW</span>
                  <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                    Bell 407 · VT-BSE · seats 6 · max gross {mtow.toLocaleString()} kg
                  </span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink)' }}>
                    {totalWt.toLocaleString()} / {mtow.toLocaleString()} kg
                  </span>
                  <span className="badge ok"><span className="dot ok" />{(utilization * 100).toFixed(1)}% · within limits</span>
                </div>
                <div style={{ display: 'flex', height: 18, borderRadius: 2, overflow: 'hidden', border: '1px solid var(--rule-strong)' }}>
                  {[
                    { l: 'Empty', v: baseWt, c: 'var(--ink-2)' },
                    { l: 'Fuel',  v: fuelWt, c: 'var(--info)' },
                    { l: 'Pax',   v: paxWt,  c: 'var(--accent)' },
                    { l: 'Bags',  v: bgWt,   c: 'var(--warn)' },
                    { l: 'Margin',v: mtow - totalWt, c: 'var(--surface-sunk)' },
                  ].map((s, i) => (
                    <div key={s.l} style={{
                      width: (s.v / mtow) * 100 + '%',
                      background: s.c,
                      borderRight: i < 4 ? '1px solid var(--surface)' : 'none',
                    }} title={`${s.l}: ${s.v} kg`} />
                  ))}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  {[
                    ['Empty', baseWt, 'var(--ink-2)'],
                    ['Fuel',  fuelWt, 'var(--info)'],
                    ['Pax',   paxWt,  'var(--accent)'],
                    ['Bags',  bgWt,   'var(--warn)'],
                    ['Margin',mtow - totalWt, 'var(--ink-3)'],
                  ].map(([l, v, c]) => (
                    <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                      <span style={{ width: 8, height: 8, background: c }} />
                      {l} · {v} kg
                    </span>
                  ))}
                </div>
              </div>

              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Passenger</th>
                    <th>Age</th>
                    <th>ID</th>
                    <th style={{ textAlign: 'right' }}>Body wt.</th>
                    <th style={{ textAlign: 'right' }}>Baggage</th>
                    <th>Notes</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {manifest.map(p => (
                    <tr key={p.n}>
                      <td className="num" style={{ color: 'var(--ink-3)' }}>{String(p.n).padStart(2, '0')}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>
                            {p.name.split(' ').map(x => x[0]).join('')}
                          </div>
                          <span style={{ fontSize: 13 }}>{p.name}</span>
                        </div>
                      </td>
                      <td>{p.age}</td>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{p.id}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{p.wt} kg</td>
                      <td className="num" style={{ textAlign: 'right' }}>{p.bg} kg</td>
                      <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{p.special}</td>
                      <td><button className="btn ghost icon sm"><Icon name="moreVert" size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* right rail */}
        <aside style={{ background: 'var(--surface)', borderLeft: '1px solid var(--rule)', padding: '24px' }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Customer</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="avatar lg" style={{ background: 'var(--surface-sunk)' }}>VB</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14 }}>Vikram Bhatt</div>
              <div className="t-meta" style={{ marginTop: 2 }}>Corporate · Acme Mobility · 11 flights</div>
              <div className="t-meta" style={{ marginTop: 2 }}>+91 98455 02711</div>
            </div>
            <button className="btn icon sm"><Icon name="phone" size={12} /></button>
          </div>

          <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

          <div className="t-label" style={{ marginBottom: 12 }}>Operator</div>
          <div style={{ padding: '14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 3,
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
              }}><Icon name="helipad" size={18} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14 }}>BlueSky Heliservices</div>
                <div className="t-meta" style={{ marginTop: 2 }}>Bengaluru · DGCA NSOP · 12 aircraft</div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="t-label" style={{ padding: 0 }}>OTP · 30d</div>
                <div style={{ marginTop: 3, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>94.2%</div>
              </div>
              <div>
                <div className="t-label" style={{ padding: 0 }}>Load · 30d</div>
                <div style={{ marginTop: 3, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>78%</div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

          <div className="t-label" style={{ marginBottom: 12 }}>Aircraft · Crew</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13 }}>Bell 407 · single-engine</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>VT-BSE</span>
              </div>
              <div className="t-meta" style={{ marginTop: 4 }}>6 seats · MTOW 2,722 kg · airworthy until 18 Aug 2026</div>
            </div>
            <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar">RB</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>Capt. Renu Bhandari · PIC</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>CPL-H · type rating Bell 407 · 4,210 hrs</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar">VS</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>Vikas Singh · co-pilot</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>CPL-H · medical valid · 1,820 hrs</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 5.3 — Quote Oversight (Charter / VIP)
// ──────────────────────────────────────────────────────────────
function QuoteOversightScreen() {
  const quotes = [
    {
      op: 'Skydeck Aviation', rec: true,
      ac: 'Embraer Phenom 300 · VT-SKE',
      pax: 4, range: '1,180 nm',
      depart: 'BLR · HAL', arrive: 'JAI',
      etd: '06:30', eta: '08:54', block: '2h 24m',
      base: 1080000, positioning: 90000, nightHalt: 60000, catering: 35000, surcharge: 22000, taxes: 65000,
      score: 92, otp: '96.4%', vetted: '12 flights', conditions: 'No fuel-stop · 30 kg pax baggage',
    },
    {
      op: 'Aerial Mobility', rec: false,
      ac: 'Cessna Citation CJ3 · VT-AMC',
      pax: 4, range: '1,650 nm',
      depart: 'BLR · HAL', arrive: 'JAI',
      etd: '06:45', eta: '09:18', block: '2h 33m',
      base: 1020000, positioning: 140000, nightHalt: 60000, catering: 28000, surcharge: 18000, taxes: 64000,
      score: 81, otp: '88.1%', vetted: '6 flights', conditions: 'Positioning fee high · live aircraft in PUN',
    },
    {
      op: 'NimbusJet', rec: false,
      ac: 'Pilatus PC-24 · VT-NJB',
      pax: 4, range: '2,000 nm',
      depart: 'BLR · KIAL', arrive: 'JAI',
      etd: '06:30', eta: '09:02', block: '2h 32m',
      base: 1180000, positioning: 80000, nightHalt: 60000, catering: 42000, surcharge: 26000, taxes: 72000,
      score: 76, otp: '92.0%', vetted: '2 flights', conditions: 'Premium catering · longer taxi at JAI',
    },
  ];
  const fmt = (n) => '₹' + (n / 100000).toFixed(2) + ' L';
  const total = (q) => q.base + q.positioning + q.nightHalt + q.catering + q.surcharge + q.taxes;

  return (
    <Shell
      active="bookings-a"
      breadcrumb="Operations · Air bookings · Quotes"
      title="Quote oversight · AC-A4-21798"
      subtitle="Priya Iyer · VIP · BLR → JAI · 4 pax · Tomorrow 06:30"
      actions={
        <>
          <button className="btn sm">Request more quotes</button>
          <button className="btn sm">Customer view</button>
          <button className="btn sm accent">Push Skydeck quote →</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* req summary */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          padding: '20px 24px',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 0,
        }}>
          {[
            ['Itinerary',   'BLR · HAL → JAI'],
            ['Pax',         '4 · VIP'],
            ['Depart',      'Thu 22 May · 06:30'],
            ['Return',      'One-way'],
            ['Notes',       'CEO + 3 staff · light catering'],
          ].map(([k, v], i) => (
            <div key={k} style={{ borderRight: i < 4 ? '1px solid var(--rule)' : 'none', paddingRight: 18 }}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 8, fontSize: 14, color: 'var(--ink)' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* quote tabs strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="t-label">3 quotes received · 1 declined</span>
          <span style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          <span className="t-meta">Sort by · <span style={{ color: 'var(--ink-2)' }}>Recommended ↓</span></span>
        </div>

        {/* quote cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {quotes.map((q, i) => (
            <div key={q.op} style={{
              background: 'var(--surface)',
              border: '1px solid ' + (q.rec ? 'var(--accent)' : 'var(--rule)'),
              boxShadow: q.rec ? '0 0 0 1px var(--accent)' : 'none',
              position: 'relative',
              display: 'flex', flexDirection: 'column',
            }}>
              {q.rec && (
                <div style={{
                  position: 'absolute', top: -1, left: -1, right: -1,
                  background: 'var(--accent)', color: '#fff',
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                  padding: '4px 14px', textAlign: 'center',
                }}>Recommended · best fit</div>
              )}
              <div style={{ padding: q.rec ? '32px 22px 18px' : '20px 22px 18px', borderBottom: '1px solid var(--rule)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="t-label">Operator</div>
                    <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>{q.op}</h3>
                  </div>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    border: '1px solid var(--rule-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: q.rec ? 'var(--accent-soft)' : 'var(--surface-2)',
                    fontFamily: 'var(--font-serif)', fontSize: 20, color: q.rec ? 'var(--accent)' : 'var(--ink-2)',
                  }}>{q.score}</div>
                </div>
                <div style={{ marginTop: 12, fontSize: 13.5, color: 'var(--ink-2)' }}>{q.ac}</div>
                <div className="t-meta" style={{ marginTop: 4 }}>{q.pax} pax · range {q.range}</div>
              </div>

              <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                <div>
                  <div className="t-label" style={{ padding: 0 }}>Depart</div>
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{q.etd} · {q.depart}</div>
                </div>
                <div>
                  <div className="t-label" style={{ padding: 0 }}>Arrive</div>
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{q.eta} · {q.arrive}</div>
                </div>
                <div>
                  <div className="t-label" style={{ padding: 0 }}>Block</div>
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)' }}>{q.block}</div>
                </div>
                <div>
                  <div className="t-label" style={{ padding: 0 }}>OTP · 30d</div>
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)' }}>{q.otp}</div>
                </div>
              </div>

              <div style={{ padding: '14px 22px' }}>
                <div className="t-label" style={{ marginBottom: 10 }}>Pricing breakdown</div>
                {[
                  ['Base · hourly',    q.base],
                  ['Positioning',      q.positioning],
                  ['Night halt',       q.nightHalt],
                  ['Catering',         q.catering],
                  ['Fuel surcharge',   q.surcharge],
                  ['Taxes · GST 5%',   q.taxes],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--ink-2)' }}>{k}</span>
                    <span className="num">{fmt(v)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 500 }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, color: q.rec ? 'var(--accent)' : 'var(--ink)' }}>{fmt(total(q))}</span>
                </div>
              </div>

              <div style={{ padding: '12px 22px 16px', background: 'var(--surface-2)', borderTop: '1px solid var(--rule)' }}>
                <div className="t-label" style={{ marginBottom: 6 }}>Vetting</div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.45 }}>
                  Done <span style={{ color: 'var(--ink)' }}>{q.vetted}</span> with this operator. {q.conditions}
                </div>
              </div>

              <div style={{ padding: '14px 22px', borderTop: '1px solid var(--rule)', display: 'flex', gap: 8 }}>
                <button className="btn sm" style={{ flex: 1 }}>Decline</button>
                <button className={'btn sm ' + (q.rec ? 'accent' : '')} style={{ flex: 2 }}>{q.rec ? 'Push to customer' : 'Push this'}</button>
              </div>
            </div>
          ))}
        </div>

        {/* comparison strip */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '16px 24px', display: 'grid', gridTemplateColumns: '180px repeat(3, 1fr)', gap: 12 }}>
          <div className="t-label">Spread</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, height: 6, background: 'var(--rule)', borderRadius: 3, position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0%', top: -3, width: 12, height: 12, borderRadius: '50%', background: 'var(--ink-2)' }} />
              <span style={{ position: 'absolute', left: '46%', top: -3, width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)' }} />
              <span style={{ position: 'absolute', right: '0%', top: -3, width: 12, height: 12, borderRadius: '50%', background: 'var(--ink-2)' }} />
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>Δ ₹2.1 L (16%)</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>min ₹13.30 L · max ₹15.78 L · avg ₹14.20 L</div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 5.4 — Cancellation & Reschedule (modal-style overlay on list)
// ──────────────────────────────────────────────────────────────
function AirCancelRescheduleScreen() {
  const tiers = [
    { l: '> 48h before',           pct: 0,   on: false },
    { l: '24–48h before',          pct: 25,  on: false },
    { l: '4–24h before',           pct: 50,  on: true },
    { l: '< 4h before / no-show',  pct: 100, on: false },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ filter: 'blur(2px) saturate(0.5)', opacity: 0.5, height: '100%', overflow: 'hidden' }}>
        <AirBookingsListScreen />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in oklab, var(--ink) 35%, transparent)' }} />

      <div style={{
        position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
        width: 920, background: 'var(--surface)', border: '1px solid var(--rule-strong)',
        boxShadow: 'var(--shadow-pop)',
      }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 4, flexShrink: 0,
            background: 'var(--warn-soft)', color: 'var(--warn)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid color-mix(in oklab, var(--warn) 24%, var(--rule-strong))',
          }}><Icon name="clock" size={20} /></div>
          <div style={{ flex: 1 }}>
            <div className="t-label">Air booking · AC-A4-21788 · Charter · 8 pax</div>
            <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, letterSpacing: '-0.018em' }}>Cancel or reschedule?</h2>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-3)' }}>
              BLR · HAL → GOI · Tariq Ahmed · Aerial Mobility · ETD <span style={{ color: 'var(--ink-2)' }}>Fri 23 May · 08:00</span> · in <span style={{ color: 'var(--warn)' }}>18h 14m</span>
            </div>
          </div>
          <button className="btn ghost icon sm"><Icon name="close" size={14} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--rule)' }}>
          {[
            { l: 'Cancel booking',     desc: 'Apply cancellation tier and refund per policy.',       on: true },
            { l: 'Reschedule',         desc: 'Pick a new slot · manifest re-locks · fee may apply.', on: false },
          ].map((o, i) => (
            <div key={o.l} style={{
              padding: '20px 28px',
              borderRight: i < 1 ? '1px solid var(--rule)' : 'none',
              borderBottom: '2px solid ' + (o.on ? 'var(--accent)' : 'transparent'),
              background: o.on ? 'var(--accent-soft-2)' : 'transparent',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '1px solid ' + (o.on ? 'var(--accent)' : 'var(--rule-strong)'),
                  background: o.on ? 'var(--accent)' : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {o.on && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                </span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)' }}>{o.l}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--ink-3)' }}>{o.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
          {/* tiers */}
          <div>
            <div className="t-label" style={{ marginBottom: 12 }}>Cancellation policy · Aerial Mobility · v2</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tiers.map(t => (
                <div key={t.l} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 14px',
                  border: '1px solid ' + (t.on ? 'var(--accent)' : 'var(--rule)'),
                  background: t.on ? 'var(--accent-soft-2)' : 'var(--surface)',
                  borderRadius: 3,
                }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '1px solid ' + (t.on ? 'var(--accent)' : 'var(--rule-strong)'),
                    background: t.on ? 'var(--accent)' : 'var(--surface)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{t.on && <span style={{ width: 5, height: 5, background: '#fff', borderRadius: '50%' }} />}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: t.on ? 500 : 400, color: t.on ? 'var(--ink)' : 'var(--ink-2)' }}>{t.l}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 13,
                    color: t.pct === 0 ? 'var(--accent)' : t.pct === 100 ? 'var(--danger)' : t.pct === 50 ? 'var(--warn)' : 'var(--ink-2)',
                  }}>{t.pct}% fee</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Reason · required</div>
              <div className="input">
                <input defaultValue="Customer · trip purpose cancelled" />
                <Icon name="chevDown" size={14} className="icon" />
              </div>
            </div>

            <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Icon name="shield" size={14} style={{ color: 'var(--accent)', marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>Force-majeure waiver</div>
                <div className="t-meta" style={{ marginTop: 3, lineHeight: 1.5 }}>
                  Toggle to waive cancellation fee for weather, regulator hold, or operator-side failure. Reason will be required and audit-logged.
                </div>
                <button className="btn sm ghost" style={{ marginTop: 8 }}><Icon name="check" size={11} stroke={2.4} />Apply waiver…</button>
              </div>
            </div>
          </div>

          {/* refund preview */}
          <div>
            <div className="t-label" style={{ marginBottom: 12 }}>Refund preview · 4–24h tier</div>
            <div style={{ padding: '18px 20px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
              <table className="tbl" style={{ marginTop: 0 }}>
                <tbody>
                  {[
                    ['Booking fare',              '₹6,10,000',  'var(--ink-2)'],
                    ['Cancellation fee · 50%',    '−₹3,05,000', 'var(--warn)'],
                    ['Operator clawback',         '₹2,44,000',  'var(--ink-3)'],
                    ['Acme commission · retained','₹61,000',    'var(--ink-3)'],
                  ].map(([k, v, c]) => (
                    <tr key={k}>
                      <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>{k}</td>
                      <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: c }}>{v}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid var(--rule-strong)' }}>
                    <td style={{ padding: '14px 0 0', border: 0, fontWeight: 500, fontSize: 14 }}>Net refund to customer</td>
                    <td className="num" style={{ padding: '14px 0 0', border: 0, textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--accent)' }}>₹3,05,000</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="field">
                <label className="field-label">Refund destination</label>
                <div className="input">
                  <input defaultValue="Original instrument · Wire to corporate AC" readOnly />
                  <Icon name="chevDown" size={14} className="icon" />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--info-soft)', border: '1px solid color-mix(in oklab, var(--info) 24%, var(--rule-strong))', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--info)' }}>
                <Icon name="shield" size={13} />
                <span className="t-label" style={{ padding: 0, color: 'var(--info)' }}>Two-person rule · refund above ₹2 L</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
                ₹3,05,000 exceeds the second-approver threshold (₹2,00,000). Finance Manager must approve before disbursement.
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="t-meta">All air cancellations audit-logged · acting as Sana Reyes</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn">Keep booking</button>
            <button className="btn accent">Request Finance approval · ₹3.05L</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  AirBookingsListScreen, AirBookingDetailScreen, QuoteOversightScreen, AirCancelRescheduleScreen,
  AIR_BOOKINGS, aStatusBadge, FlightChart,
});
