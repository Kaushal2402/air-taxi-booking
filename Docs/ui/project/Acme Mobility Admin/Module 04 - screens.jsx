/* ─────────────────────────────────────────────────────────────
   Module 04 — Booking Management (Road)
   Screens 4.1 → 4.5
   ───────────────────────────────────────────────────────────── */

// Tone for booking status badges
function bStatusBadge(s) {
  const map = {
    'On trip':    { tone: 'ok',      dot: true },
    'Pickup':     { tone: 'warn',    dot: true },
    'Accepted':   { tone: 'info',    dot: true },
    'Scheduled':  { tone: 'pending', dot: true },
    'Completed':  { tone: 'pending', dot: false },
    'Cancelled':  { tone: 'danger',  dot: true },
    'Disputed':   { tone: 'danger',  dot: true },
    'Requested':  { tone: 'warn',    dot: true },
    'Refunded':   { tone: 'info',    dot: true },
  };
  const cfg = map[s] || { tone: 'pending' };
  return <span className={'badge ' + cfg.tone}>{cfg.dot && <span className={'dot ' + cfg.tone} />}{s}</span>;
}

// Demo bookings dataset
const ROAD_BOOKINGS = [
  { id: 'AC-92F8311', sub: 'Cab · XL',     cust: 'Aarav Kapoor',     drv: 'Ravi Mahesh',    when: '15:34 today',  status: 'On trip',   fare: '₹1,240', pay: 'Card · ●●●● 4421', from: 'Indiranagar', to: 'KIAL T2',    flag: false },
  { id: 'AC-92F8307', sub: 'Cab · Sedan',  cust: 'Meera Sharma',     drv: 'Sumit Joshi',    when: '15:21 today',  status: 'Pickup',    fare: '₹420',   pay: 'UPI',                from: 'HSR · 27',    to: 'Domlur',     flag: false },
  { id: 'AC-92F8304', sub: 'Bike',         cust: 'Ishan Patel',      drv: 'Mohammed Aslam', when: '15:18 today',  status: 'On trip',   fare: '₹160',   pay: 'Cash',               from: 'Koramangala', to: 'Sarjapur',   flag: false },
  { id: 'AC-92F8298', sub: 'Cab · Sedan',  cust: 'Diya Menon',       drv: 'Vinay Kumar',    when: '15:08 today',  status: 'Accepted',  fare: '₹620',   pay: 'Wallet',             from: 'Whitefield',  to: 'MG Road',    flag: true,  flagReason: 'Customer · repeated cancels' },
  { id: 'AC-92F8294', sub: 'Rental · 8h',  cust: 'Vikram Bhatt',     drv: 'Naveed Khan',    when: '14:55 today',  status: 'On trip',   fare: '₹3,200', pay: 'Corporate',          from: 'HSR Layout',  to: '80 km pkg',  flag: false },
  { id: 'AC-92F8291', sub: 'Outstation',   cust: 'Rohan Mehta',      drv: 'Sundar Pillai',  when: '14:42 today',  status: 'On trip',   fare: '₹6,800', pay: 'Card · ●●●● 8810', from: 'Bengaluru',   to: 'Mysuru · OW',flag: false },
  { id: 'AC-92F8284', sub: 'Cab · XL',     cust: 'Anushka Roy',      drv: 'Hemant Singh',   when: '14:31 today',  status: 'Completed', fare: '₹980',   pay: 'UPI',                from: 'Jayanagar',   to: 'MG Road',    flag: false },
  { id: 'AC-92F8281', sub: 'Cab · Sedan',  cust: 'Karthik Reddy',    drv: '—',              when: '14:24 today',  status: 'Cancelled', fare: '₹0',     pay: '—',                  from: 'BTM',         to: 'Electronic City', flag: true, flagReason: 'Driver · no-show' },
  { id: 'AC-92F8274', sub: 'Bike',         cust: 'Priya Iyer',       drv: 'Sanjay Yadav',   when: '14:12 today',  status: 'Completed', fare: '₹120',   pay: 'Wallet',             from: 'Indiranagar', to: 'Domlur',     flag: false },
  { id: 'AC-92F8268', sub: 'Cab · Sedan',  cust: 'Hema Rao',         drv: 'Imran Pasha',    when: '14:02 today',  status: 'Disputed',  fare: '₹2,140', pay: 'Card · ●●●● 0019', from: 'KIAL T1',     to: 'Hebbal',     flag: true, flagReason: 'Customer dispute · route' },
  { id: 'AC-92F8261', sub: 'Cab · XL',     cust: 'Tariq Ahmed',      drv: 'Praveen R',      when: '13:54 today',  status: 'Completed', fare: '₹1,180', pay: 'Card · ●●●● 1129', from: 'Yelahanka',   to: 'MG Road',    flag: false },
  { id: 'AC-92F8254', sub: 'Outstation',   cust: 'Leah Joseph',      drv: 'Mahesh Kanna',   when: 'Tomorrow 06:00',status: 'Scheduled', fare: '₹4,200', pay: 'Card · ●●●● 7702', from: 'Bengaluru',   to: 'Coorg · RT', flag: false },
  { id: 'AC-92F8247', sub: 'Cab · Sedan',  cust: 'Maya Cherian',     drv: 'Faisal Ali',     when: '13:38 today',  status: 'Refunded',  fare: '₹480',   pay: 'Card · ●●●● 4421', from: 'HSR',         to: 'Bellandur',  flag: false },
  { id: 'AC-92F8241', sub: 'Bike',         cust: 'Dev Banerjee',     drv: 'Rajesh Bhat',    when: '13:22 today',  status: 'Completed', fare: '₹95',    pay: 'UPI',                from: 'Madiwala',    to: 'BTM',        flag: false },
  { id: 'AC-92F8234', sub: 'Cab · Sedan',  cust: 'Imran Shaikh',     drv: 'Vikas Anand',    when: '13:14 today',  status: 'Completed', fare: '₹540',   pay: 'Cash',               from: 'MG Road',     to: 'Indiranagar',flag: false },
];

// ──────────────────────────────────────────────────────────────
// 4.1 — Bookings List
// ──────────────────────────────────────────────────────────────
function RoadBookingsListScreen() {
  return (
    <Shell
      active="bookings-r"
      breadcrumb="Operations · Bookings"
      title="Road bookings"
      subtitle="8,206 today · live · ₹14.2 L gross"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm"><Icon name="external" size={13} />Open map view</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Assisted booking</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* saved view + status strip */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
        }}>
          {[
            { l: 'All bookings',       n: '8,206', active: false },
            { l: 'Live · now',         n: '247',   active: true, tone: 'var(--accent)' },
            { l: 'Scheduled',          n: '184',   active: false, tone: 'var(--info)' },
            { l: 'Cancelled today',    n: '392',   active: false, tone: 'var(--warn)' },
            { l: 'Disputed',           n: '7',     active: false, tone: 'var(--danger)' },
            { l: 'Refund pending',     n: '12',    active: false, tone: 'var(--info)' },
          ].map((v, i) => (
            <div key={v.l} style={{
              padding: '16px 18px',
              borderRight: i < 5 ? '1px solid var(--rule)' : 'none',
              borderBottom: v.active ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              background: v.active ? 'var(--surface-2)' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 12.5,
                  color: v.active ? 'var(--ink)' : 'var(--ink-2)',
                  fontWeight: v.active ? 500 : 400,
                }}>{v.l}</span>
                {v.tone && !v.active && <span className="dot" style={{ background: v.tone }} />}
              </div>
              <div style={{
                marginTop: 4,
                fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400,
                letterSpacing: '-0.018em', color: 'var(--ink)',
              }}>{v.n}</div>
            </div>
          ))}
        </div>

        {/* filter bar */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0,
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <div className="input" style={{ width: 260, height: 32 }}>
              <Icon name="search" size={14} className="icon" />
              <input placeholder="Ref, customer, driver, plate…" />
            </div>
            <FilterChip label="Status" value="Live · Pickup · Accepted" count={3} />
            <FilterChip label="Service" value="Cab · Bike · Rental · Outstation" />
            <FilterChip label="Zone" value="All" />
            <FilterChip label="Date" value="Today" count={1} />
            <FilterChip label="Payment" value="All" />
            <FilterChip label="Fare" value="₹0 – ₹∞" />
            <FilterChip label="Rating" value="All" />
            <FilterChip label="Flagged" value="Either" />
            <div style={{ flex: 1 }} />
            <button className="btn sm ghost"><Icon name="filter" size={13} />Saved view · Live now <Icon name="chevDown" size={11} /></button>
            <button className="btn sm ghost icon"><Icon name="more" size={14} /></button>
          </div>

          {/* bulk action bar */}
          <div style={{
            background: 'var(--accent-soft-2)',
            border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
            borderTop: 0, borderBottom: 0,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 500 }}>2 selected</span> · across this page
            </span>
            <span style={{ width: 1, height: 16, background: 'var(--rule-strong)' }} />
            <button className="btn sm ghost"><Icon name="download" size={12} />Export selection</button>
            <button className="btn sm ghost"><Icon name="envelope" size={12} />Message customers</button>
            <button className="btn sm ghost"><Icon name="flag" size={12} />Flag</button>
            <div style={{ flex: 1 }} />
            <button className="btn sm ghost" style={{ color: 'var(--ink-3)' }}>Clear</button>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 32 }}><input type="checkbox" /></th>
                  <th>Ref</th>
                  <th>Customer · Service</th>
                  <th>Route</th>
                  <th>Driver</th>
                  <th>When</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Fare</th>
                  <th>Payment</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {ROAD_BOOKINGS.map((b, i) => (
                  <tr key={b.id} className={i === 0 || i === 9 ? 'selected' : ''}>
                    <td><input type="checkbox" defaultChecked={i === 0 || i === 9} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{b.id}</span>
                        {b.flag && (
                          <span title={b.flagReason}>
                            <Icon name="flag" size={12} stroke={1.6} style={{ color: 'var(--danger)' }} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: 'var(--ink)' }}>{b.cust}</div>
                      <div className="t-meta" style={{ marginTop: 2 }}>{b.sub}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                        <span style={{ color: 'var(--ink)' }}>{b.from}</span>
                        <Icon name="arrowRight" size={11} style={{ color: 'var(--ink-4)' }} />
                        <span style={{ color: 'var(--ink-2)' }}>{b.to}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: b.drv === '—' ? 'var(--ink-4)' : 'var(--ink-2)' }}>{b.drv}</td>
                    <td className="num" style={{ color: 'var(--ink-2)' }}>{b.when}</td>
                    <td>{bStatusBadge(b.status)}</td>
                    <td className="num" style={{ textAlign: 'right', color: 'var(--ink)' }}>{b.fare}</td>
                    <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{b.pay}</td>
                    <td><button className="btn ghost icon sm"><Icon name="moreVert" size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderTop: '1px solid var(--rule)', background: 'var(--surface-2)',
            }}>
              <div className="t-meta">Showing <span style={{ color: 'var(--ink-2)' }}>1–15</span> of <span style={{ color: 'var(--ink-2)' }}>247</span> live bookings · 2 selected</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="btn ghost sm" disabled style={{ opacity: 0.4 }}><Icon name="chevLeft" size={13} /></button>
                {['1','2','3','…','17'].map((p, i) => (
                  <span key={i} style={{
                    width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 3,
                    background: i === 0 ? 'var(--ink)' : 'transparent',
                    color: i === 0 ? 'var(--surface)' : 'var(--ink-3)',
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    cursor: 'pointer',
                  }}>{p}</span>
                ))}
                <button className="btn ghost sm"><Icon name="chevRight" size={13} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 4.2 — Booking Detail
// ──────────────────────────────────────────────────────────────
function BookingDetailScreen() {
  const tabs = ['Overview', 'Map & telemetry', 'Fare breakdown', 'Payments', 'Communications', 'Audit'];
  const timeline = [
    { t: '15:42', e: 'Driver at airport drop',   m: 'Trip ending · final fare computing', tone: 'pending', current: true },
    { t: '15:34', e: 'Trip started',             m: 'OTP 4271 verified by Ravi Mahesh',  tone: 'ok' },
    { t: '15:32', e: 'Driver arrived',           m: '100 Ft Rd, Indiranagar · waited 1m', tone: 'ok' },
    { t: '15:21', e: 'Driver accepted',          m: 'Ravi M · 1.4 km away · 8m ETA',     tone: 'ok' },
    { t: '15:19', e: 'Dispatched to 3 drivers',  m: '2 declined · auto-expanded radius',  tone: 'info' },
    { t: '15:18', e: 'Booking requested',        m: 'Aarav K · Cab XL · ₹1,240 estimate', tone: 'pending' },
  ];

  return (
    <Shell
      active="bookings-r"
      breadcrumb="Operations · Road bookings"
      title="AC-92F8311 · Indiranagar → KIAL T2"
      subtitle="Cab · XL · ₹1,240 estimate · on trip"
      actions={
        <>
          <button className="btn sm"><Icon name="refresh" size={13} />Reassign</button>
          <button className="btn sm"><Icon name="envelope" size={13} />Message</button>
          <button className="btn sm danger">Cancel booking</button>
          <button className="btn sm"><Icon name="external" size={13} />Open audit</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', minHeight: '100%' }}>
        {/* main */}
        <div style={{ padding: '0' }}>
          {/* tab bar */}
          <div style={{ padding: '0 32px', borderBottom: '1px solid var(--rule)', background: 'var(--surface)', display: 'flex', gap: 0 }}>
            {tabs.map((t, i) => (
              <div key={t} style={{
                padding: '14px 18px',
                cursor: 'pointer',
                fontSize: 13,
                color: i === 0 ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: i === 0 ? 500 : 400,
                borderBottom: '2px solid ' + (i === 0 ? 'var(--accent)' : 'transparent'),
                marginBottom: -1,
              }}>{t}</div>
            ))}
          </div>

          <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* hero strip — KPIs */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--rule)',
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
            }}>
              {[
                ['State',     <span className="badge ok" key="x"><span className="dot ok" />On trip</span>],
                ['Estimate',  '₹1,240'],
                ['Distance',  '38.4 km · 12.4 done'],
                ['Duration',  '34 min · ETA 16:08'],
                ['Surge',     '1.1×'],
              ].map(([k, v], i) => (
                <div key={k} style={{ padding: '16px 18px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--ink)' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* map + timeline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
              {/* trip map */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="t-label">Live route</div>
                    <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Indiranagar → KIAL T2</h3>
                  </div>
                  <button className="btn sm ghost"><Icon name="external" size={12} />Full map</button>
                </div>
                <div style={{ height: 320 }}>
                  <CityMap
                    markers={[
                      { x: 220, y: 180, kind: 'pickup' },
                      { x: 520, y: 80,  kind: 'on-trip' },
                    ]}
                    routes={[
                      { path: 'M220 180 Q340 130 460 110 Q500 96 540 80', start: [220,180], end: [540,80] },
                    ]}
                    showLegend={false}
                  />
                </div>
                <div style={{ padding: '12px 18px', borderTop: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[['Started','15:34'],['Progress','32% · 12.4 / 38.4 km'],['Avg speed','41 km/h']].map(([k,v]) => (
                    <div key={k}>
                      <div className="t-label" style={{ padding: 0 }}>{k}</div>
                      <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* timeline */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                  <div className="t-label">State timeline</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Step-by-step</h3>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  {timeline.map((e, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < timeline.length - 1 ? 14 : 0, position: 'relative' }}>
                      <div style={{ position: 'relative', width: 12, flexShrink: 0 }}>
                        <span className={'dot ' + e.tone} style={{
                          width: e.current ? 10 : 8, height: e.current ? 10 : 8,
                          position: 'absolute', top: 4, left: 1,
                          boxShadow: e.current ? '0 0 0 4px var(--accent-soft)' : undefined,
                        }} />
                        {i < timeline.length - 1 && <span style={{
                          position: 'absolute', left: 5, top: 16, bottom: -14,
                          width: 1, background: 'var(--rule-strong)',
                        }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{e.e}</span>
                          <span className="t-meta">{e.t}</span>
                        </div>
                        <div className="t-meta" style={{ marginTop: 2, color: 'var(--ink-3)' }}>{e.m}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* fare breakdown preview */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="t-label">Fare breakdown · estimate vs. live</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Cab · XL · Indiranagar zone</h3>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn sm ghost"><Icon name="external" size={12} />Open rule</button>
                  <button className="btn sm">Adjust fare</button>
                </div>
              </div>
              <div style={{ padding: '16px 18px' }}>
                <table className="tbl" style={{ marginTop: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 280 }}>Component</th>
                      <th>Rule reference</th>
                      <th style={{ textAlign: 'right' }}>Estimate</th>
                      <th style={{ textAlign: 'right' }}>Live</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Base fare',        'BLR · Cab XL · v12',    '₹100',  '₹100'],
                      ['Distance · 38.4 km', '₹22.5 / km',          '₹864',  '₹864'],
                      ['Duration · 34 min',  '₹2.0 / min',          '₹68',   '₹68'],
                      ['Surge · 1.1×',     'BLR-N4 · evening',      '+₹103', '+₹103'],
                      ['Toll · KIAL',      'Auto-detected',          '+₹85',  '+₹85'],
                      ['Tax · 5% GST',     'IN · ride hailing',      '+₹56',  '+₹56'],
                    ].map(([k, r, e, l], i) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{r}</td>
                        <td className="num" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>{e}</td>
                        <td className="num" style={{ textAlign: 'right', color: 'var(--ink)' }}>{l}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <td colSpan="2" style={{ fontWeight: 500 }}>Total · so far</td>
                      <td className="num" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>₹1,240</td>
                      <td className="num" style={{ textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 18 }}>₹1,276</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* right rail */}
        <aside style={{ background: 'var(--surface)', borderLeft: '1px solid var(--rule)', padding: '24px' }}>
          {/* customer */}
          <div className="t-label" style={{ marginBottom: 12 }}>Customer</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="avatar lg" style={{ background: 'var(--surface-sunk)' }}>AK</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: 'var(--ink)' }}>Aarav Kapoor</div>
              <div className="t-meta" style={{ marginTop: 2 }}>5y · 412 rides · 4.96 ★</div>
              <div className="t-meta" style={{ marginTop: 2 }}>+91 98201 17542</div>
            </div>
            <button className="btn icon sm"><Icon name="phone" size={12} /></button>
          </div>
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 3, fontSize: 12.5, color: 'var(--ink-2)' }}>
            Frequent flyer · last 8 rides all to KIAL. Wallet balance ₹1,180.
          </div>

          <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

          {/* driver */}
          <div className="t-label" style={{ marginBottom: 12 }}>Driver · Vehicle</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="avatar lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>RM</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: 'var(--ink)' }}>Ravi Mahesh</div>
              <div className="t-meta" style={{ marginTop: 2 }}>3y · 7,184 trips · 4.92 ★</div>
              <div className="t-meta" style={{ marginTop: 2 }}>+91 96114 28805</div>
            </div>
            <button className="btn icon sm"><Icon name="phone" size={12} /></button>
          </div>
          <div style={{ marginTop: 12, padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--ink)' }}>Toyota Etios · Sedan XL</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)' }}>KA 05 MK 4271</span>
            </div>
            <div className="t-meta" style={{ marginTop: 6 }}>White · 2022 · Permit valid until 18 Aug 2026</div>
          </div>

          <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

          {/* payment */}
          <div className="t-label" style={{ marginBottom: 12 }}>Payment</div>
          <div style={{
            padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 24, borderRadius: 2,
              background: 'var(--ink)', color: 'var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em',
            }}>VISA</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>●●●● ●●●● ●●●● 4421</div>
              <div className="t-meta" style={{ marginTop: 2 }}>Expires 09/27 · Visa Premier</div>
            </div>
            <span className="badge ok"><span className="dot ok" />Pre-auth</span>
          </div>

          <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

          {/* admin notes */}
          <div className="t-label" style={{ marginBottom: 12 }}>Admin notes · internal</div>
          <div style={{
            padding: '12px 14px', border: '1px dashed var(--rule-strong)', borderRadius: 3,
            background: 'var(--surface-2)',
            fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5,
          }}>
            Customer requested silent ride · driver notified at booking.
          </div>
          <button className="btn sm" style={{ marginTop: 10, width: '100%' }}><Icon name="plus" size={12} />Add note</button>
        </aside>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 4.3 — Assisted Booking (Create on behalf)
// ──────────────────────────────────────────────────────────────
function AssistedBookingScreen() {
  return (
    <Shell
      active="bookings-r"
      breadcrumb="Operations · Road bookings · New"
      title="Assisted booking"
      subtitle="Create a booking on behalf of a customer · started 14:42 by Anjali K"
      actions={
        <>
          <button className="btn sm">Save as draft</button>
          <button className="btn sm">Cancel</button>
          <button className="btn sm accent">Confirm booking · ₹620</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', minHeight: '100%' }}>
        {/* form */}
        <div style={{ padding: '28px 36px' }}>
          {/* step pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            {[
              ['Customer',    true,  true],
              ['Route',       true,  true],
              ['Class & fare',true,  true],
              ['Payment',     true,  false],
              ['Confirm',     false, false],
            ].map(([l, done, on], i) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: done ? (on ? 'var(--ink)' : 'var(--accent)') : 'var(--surface)',
                  color: done ? 'var(--surface)' : 'var(--ink-3)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 10.5,
                  border: '1px solid ' + (done ? (on ? 'var(--ink)' : 'var(--accent)') : 'var(--rule-strong)'),
                }}>
                  {done && !on ? <Icon name="check" size={11} stroke={2.4} /> : (i + 1)}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: on ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: on ? 500 : 400,
                }}>{l}</span>
                {i < 4 && <span style={{ width: 36, height: 1, background: 'var(--rule-strong)', marginLeft: 8 }} />}
              </div>
            ))}
          </div>

          {/* customer */}
          <FormSection title="Customer" description="Search by phone or email. If the customer doesn't exist, you'll be prompted to onboard them after confirmation.">
            <div style={{
              padding: '14px 16px',
              border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
              borderRadius: 3, background: 'var(--accent-soft-2)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div className="avatar lg" style={{ background: 'var(--surface-sunk)' }}>DM</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: 'var(--ink)' }}>Diya Menon · <span className="t-meta">she/her</span></div>
                <div className="t-meta" style={{ marginTop: 3 }}>+91 98455 02711 · diya.menon@gmail.com · 3y · 168 rides · 4.84 ★</div>
              </div>
              <span className="badge"><Icon name="check" size={10} stroke={2.4} />Loaded</span>
              <button className="btn sm ghost"><Icon name="close" size={12} />Change</button>
            </div>
          </FormSection>

          <div style={{ height: 24 }} />

          {/* route */}
          <FormSection title="Route" description="Pickup and drop are validated against the active service zones. Multi-stop is available on Sedan and XL classes.">
            <Row cols={2}>
              <Field label="Pickup" value="Whitefield · Hope Farm Junction" right={<Icon name="map" size={14} className="icon" />} />
              <Field label="Drop"   value="MG Road · 47 Brigade Square"     right={<Icon name="map" size={14} className="icon" />} />
            </Row>
            <Row cols={3}>
              <Field label="When"      value="Now · ASAP" select />
              <Field label="Pax"       value="2 adults" select />
              <Field label="Add stop"  value="None" select />
            </Row>
            <div style={{
              padding: '12px 14px',
              background: 'var(--surface-2)',
              border: '1px solid var(--rule)',
              borderRadius: 3,
              display: 'flex', alignItems: 'center', gap: 16,
              fontSize: 12.5, color: 'var(--ink-2)',
            }}>
              <span className="t-label">Route</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>18.6 km · est. 42 min</span>
              <span style={{ width: 1, height: 16, background: 'var(--rule)' }} />
              <span>Zones · <span style={{ color: 'var(--accent)' }}>Z-E2 → Z-N1</span> · both active</span>
              <span style={{ width: 1, height: 16, background: 'var(--rule)' }} />
              <span>Surge · <span style={{ color: 'var(--warn)' }}>1.2×</span> (eve. peak)</span>
            </div>
          </FormSection>

          <div style={{ height: 24 }} />

          {/* class & fare */}
          <FormSection title="Vehicle class · estimate" description="Eligibility is recomputed against live driver supply in pickup zone.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { l: 'Bike',   p: '₹180',  eta: '4m',  d: '1 pax',     on: false },
                { l: 'Sedan',  p: '₹620',  eta: '6m',  d: '4 pax · AC', on: true },
                { l: 'XL',     p: '₹880',  eta: '12m', d: '6 pax · AC', on: false },
                { l: 'Rental', p: '₹2,400',eta: 'Plan',d: '4h / 40km', on: false },
              ].map(c => (
                <div key={c.l} style={{
                  padding: '16px 16px',
                  border: '1px solid ' + (c.on ? 'var(--accent)' : 'var(--rule)'),
                  borderRadius: 3,
                  background: c.on ? 'var(--accent-soft-2)' : 'var(--surface)',
                  cursor: 'pointer',
                  position: 'relative',
                }}>
                  {c.on && <span style={{
                    position: 'absolute', top: -8, right: 12,
                    background: 'var(--accent)', color: '#fff',
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 2,
                  }}>Selected</span>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{c.l}</span>
                    <Icon name="car" size={15} style={{ color: 'var(--ink-3)' }} />
                  </div>
                  <div style={{
                    marginTop: 12,
                    fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400,
                    color: 'var(--ink)',
                  }}>{c.p}</div>
                  <div className="t-meta" style={{ marginTop: 4 }}>{c.eta} · {c.d}</div>
                </div>
              ))}
            </div>
          </FormSection>

          <div style={{ height: 24 }} />

          {/* payment */}
          <FormSection title="Payment" description="Choose how the customer will be billed. Cash collected by driver is tracked against the driver wallet.">
            <Row cols={4}>
              {['Wallet · ₹240', 'Card · ●●●● 4421', 'UPI · BHIM', 'Cash'].map((p, i) => (
                <div key={p} style={{
                  padding: '14px',
                  border: '1px solid ' + (i === 1 ? 'var(--accent)' : 'var(--rule)'),
                  background: i === 1 ? 'var(--accent-soft-2)' : 'var(--surface)',
                  borderRadius: 3,
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                }}>
                  <Icon name={i === 1 ? 'check' : 'dot'} size={i === 1 ? 12 : 0} stroke={2.4} style={{ color: i === 1 ? 'var(--accent)' : 'transparent' }} />
                  <span style={{ fontSize: 13, color: 'var(--ink)' }}>{p}</span>
                </div>
              ))}
            </Row>
            <Row cols={2}>
              <Field label="Promo code" value="WELCOME20 · −₹124 applied" right={<span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Applied</span>} />
              <Field label="Internal reason · required for assisted bookings" value="Customer called support — app login locked" />
            </Row>
          </FormSection>
        </div>

        {/* right rail — summary */}
        <aside style={{ background: 'var(--surface)', borderLeft: '1px solid var(--rule)', padding: '28px 28px' }}>
          <div className="t-label" style={{ marginBottom: 10 }}>Summary</div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>Confirm booking</h3>

          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ marginTop: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink)' }} />
                <div style={{ width: 1, height: 22, background: 'var(--rule-strong)', margin: '4px 4px' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--ink)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5 }}>Whitefield · Hope Farm</div>
                <div className="t-meta" style={{ marginTop: 2 }}>Pickup · ASAP · 15:42</div>
                <div style={{ marginTop: 14, fontSize: 13.5 }}>MG Road · 47 Brigade Sq</div>
                <div className="t-meta" style={{ marginTop: 2 }}>Drop · ETA 16:24 · 18.6 km</div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

          <div className="t-label" style={{ marginBottom: 10 }}>Fare estimate · Sedan</div>
          <table className="tbl" style={{ marginTop: 0 }}>
            <tbody>
              {[
                ['Base fare',     '₹70'],
                ['Distance · 18.6 km', '₹372'],
                ['Time · 42 min', '₹84'],
                ['Surge · 1.2×',  '+₹105'],
                ['Tax · GST 5%',  '+₹31'],
                ['Promo · WELCOME20', '−₹124'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '6px 0', border: 0, fontSize: 12.5, color: 'var(--ink-2)' }}>{k}</td>
                  <td className="num" style={{ padding: '6px 0', border: 0, textAlign: 'right', color: 'var(--ink-2)' }}>{v}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid var(--rule)' }}>
                <td style={{ padding: '12px 0 0', border: 0, fontWeight: 500, fontSize: 13.5 }}>Total</td>
                <td className="num" style={{ padding: '12px 0 0', border: 0, textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 26 }}>₹620</td>
              </tr>
            </tbody>
          </table>

          <div style={{ height: 1, background: 'var(--rule)', margin: '24px 0' }} />

          <div className="t-label" style={{ marginBottom: 8 }}>Charged to</div>
          <div style={{ padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12.5 }}>
            <div style={{ fontFamily: 'var(--font-mono)' }}>●●●● 4421 · Diya Menon</div>
            <div className="t-meta" style={{ marginTop: 3 }}>Visa Premier · pre-auth on confirm</div>
          </div>

          <div style={{ marginTop: 24, padding: '12px 14px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule-strong))', borderRadius: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warn)' }}>
              <Icon name="alert" size={13} />
              <span className="t-label" style={{ padding: 0, color: 'var(--warn)' }}>Audit · assisted booking</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              You're acting on behalf of Diya Menon. Internal reason is mandatory and will be recorded against your admin user.
            </div>
          </div>

          <button className="btn accent lg" style={{ width: '100%', marginTop: 18 }}>
            Confirm booking · ₹620 →
          </button>
        </aside>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 4.4 — Cancellation & Refund (modal-style overlay on list)
// ──────────────────────────────────────────────────────────────
function CancellationRefundScreen() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* dimmed background — show list underneath */}
      <div style={{ filter: 'blur(2px) saturate(0.5)', opacity: 0.6, height: '100%', overflow: 'hidden' }}>
        <RoadBookingsListScreen />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in oklab, var(--ink) 35%, transparent)' }} />

      {/* modal */}
      <div style={{
        position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)',
        width: 720,
        background: 'var(--surface)',
        border: '1px solid var(--rule-strong)',
        boxShadow: 'var(--shadow-pop)',
      }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 4, flexShrink: 0,
            background: 'var(--danger-soft)', color: 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid color-mix(in oklab, var(--danger) 24%, var(--rule-strong))',
          }}><Icon name="close" size={20} /></div>
          <div style={{ flex: 1 }}>
            <div className="t-label">Cancel booking · AC-92F8298</div>
            <h2 style={{
              margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, letterSpacing: '-0.018em',
            }}>Cancel this booking?</h2>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-3)' }}>
              Whitefield → MG Road · Diya Menon · Driver accepted 4 min ago. Cancellation fees apply per the configured policy.
            </div>
          </div>
          <button className="btn ghost icon sm"><Icon name="close" size={14} /></button>
        </div>

        <div style={{ padding: '20px 28px' }}>
          {/* reason */}
          <div className="t-label" style={{ marginBottom: 10 }}>Reason · required</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { l: 'Customer no-show',     on: false },
              { l: 'Driver couldn\'t find', on: false },
              { l: 'Vehicle breakdown',     on: false },
              { l: 'Customer requested',    on: true },
              { l: 'Safety incident',       on: false },
              { l: 'Other · specify',       on: false },
            ].map(r => (
              <div key={r.l} style={{
                padding: '10px 12px',
                border: '1px solid ' + (r.on ? 'var(--accent)' : 'var(--rule)'),
                background: r.on ? 'var(--accent-soft-2)' : 'var(--surface)',
                borderRadius: 3,
                fontSize: 13, color: 'var(--ink-2)',
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              }}>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '1px solid ' + (r.on ? 'var(--accent)' : 'var(--rule-strong)'),
                  background: r.on ? 'var(--accent)' : 'var(--surface)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {r.on && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                </span>
                {r.l}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="input">
              <input placeholder="Add a note for the audit log (optional)" defaultValue="Customer requested cancel — change of plans." />
            </div>
          </div>

          {/* fee/refund preview */}
          <div style={{ marginTop: 20, padding: '18px 20px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Refund preview · per cancellation policy v3</div>
            <table className="tbl" style={{ marginTop: 0 }}>
              <tbody>
                {[
                  ['Original fare estimate',         '₹620',  'var(--ink-2)'],
                  ['Pre-auth captured',              '₹620',  'var(--ink-2)'],
                  ['Cancellation fee · post-accept', '−₹50',  'var(--warn)'],
                  ['Driver penalty (paid out)',      '₹35',   'var(--ink-3)'],
                ].map(([k, v, c]) => (
                  <tr key={k}>
                    <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>{k}</td>
                    <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: c }}>{v}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '1px solid var(--rule-strong)' }}>
                  <td style={{ padding: '14px 0 0', border: 0, fontSize: 14, fontWeight: 500 }}>Net refund to customer</td>
                  <td className="num" style={{ padding: '14px 0 0', border: 0, textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--accent)' }}>₹570</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* refund destination */}
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label className="field-label">Refund destination</label>
              <div className="input">
                <input defaultValue="Original payment instrument · Visa ●●●● 4421" readOnly />
                <Icon name="chevDown" size={14} className="icon" />
              </div>
              <div className="field-help">Wallet credit would be instant. Original instrument takes 3–5 business days.</div>
            </div>
            <div className="field">
              <label className="field-label">Override cancellation fee</label>
              <div className="input" style={{ background: 'var(--surface-2)' }}>
                <input defaultValue="No override (₹50)" readOnly />
                <Icon name="chevDown" size={14} className="icon" />
              </div>
              <div className="field-help" style={{ color: 'var(--warn)' }}>Requires Finance Manager permission to waive.</div>
            </div>
          </div>

          {/* threshold gate */}
          <div style={{ marginTop: 20, padding: '14px 16px', border: '1px solid color-mix(in oklab, var(--info) 24%, var(--rule-strong))', background: 'var(--info-soft)', borderRadius: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--info)' }}>
              <Icon name="shield" size={13} />
              <span className="t-label" style={{ padding: 0, color: 'var(--info)' }}>Two-person rule · refund under threshold</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
              ₹570 is below the ₹2,000 second-approver threshold. You can process this refund directly.
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="t-meta">All cancellations are audit-logged · acting as Sana Reyes</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn">Keep booking</button>
            <button className="btn danger">Cancel & refund ₹570</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 4.5 — Disputes
// ──────────────────────────────────────────────────────────────
function DisputesScreen() {
  const disputes = [
    { id: 'D-2806', ref: 'AC-92F8268', cust: 'Hema Rao',      reason: 'Route deviation · longer than necessary', amt: '₹2,140', age: '2h',  pri: 'high',   stage: 'In review' },
    { id: 'D-2805', ref: 'AC-92F8121', cust: 'Maya Cherian',  reason: 'Charged after cancellation',              amt: '₹480',   age: '6h',  pri: 'high',   stage: 'Awaiting driver' },
    { id: 'D-2804', ref: 'AC-92F8083', cust: 'Karthik Reddy', reason: 'Driver no-show · still billed',           amt: '₹0',     age: 'Yesterday', pri: 'med', stage: 'Awaiting Finance' },
    { id: 'D-2803', ref: 'AC-92F7942', cust: 'Vikram Bhatt',  reason: 'Surge applied during non-peak window',    amt: '₹208',   age: '2 days', pri: 'low',   stage: 'In review' },
  ];

  return (
    <Shell
      active="bookings-r"
      breadcrumb="Operations · Road bookings · Disputes"
      title="Disputed bookings"
      subtitle="7 open · 3 awaiting evidence · 2 awaiting Finance"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm"><Icon name="filter" size={13} />Saved view</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', minHeight: '100%' }}>
        {/* left list */}
        <aside style={{ borderRight: '1px solid var(--rule)', background: 'var(--surface)', overflow: 'auto' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 8 }}>
            <div className="input" style={{ flex: 1, height: 32 }}>
              <Icon name="search" size={14} className="icon" />
              <input placeholder="Search disputes…" />
            </div>
            <button className="btn ghost icon sm"><Icon name="filter" size={13} /></button>
          </div>
          {disputes.map((d, i) => (
            <div key={d.id} style={{
              padding: '16px 18px',
              borderBottom: '1px solid var(--rule-soft)',
              borderLeft: '3px solid ' + (i === 0 ? 'var(--accent)' : 'transparent'),
              background: i === 0 ? 'var(--surface-2)' : 'transparent',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' }}>{d.id}</span>
                <span className="t-meta">{d.age}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink)' }}>{d.cust}</div>
              <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--ink-3)' }}>{d.reason}</div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={'badge ' + (d.pri === 'high' ? 'danger' : d.pri === 'med' ? 'warn' : 'pending')}>
                  <span className={'dot ' + (d.pri === 'high' ? 'danger' : d.pri === 'med' ? 'warn' : 'pending')} />
                  {d.pri === 'high' ? 'High' : d.pri === 'med' ? 'Medium' : 'Low'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>· {d.stage}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{d.amt}</span>
              </div>
            </div>
          ))}
        </aside>

        {/* right pane — selected dispute */}
        <div style={{ padding: 0, overflow: 'auto' }}>
          {/* heading */}
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
              <div>
                <div className="t-label">Dispute · D-2806 · linked to AC-92F8268</div>
                <h2 style={{
                  margin: '6px 0 0', fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.018em',
                }}>"My driver took the long route from the airport."</h2>
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)' }}>
                  Filed by Hema Rao · 2h ago · waiting on driver evidence (12h remaining)
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn sm">Escalate</button>
                <button className="btn sm">Request more info</button>
                <button className="btn sm danger">Reject</button>
                <button className="btn sm accent">Resolve →</button>
              </div>
            </div>
            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: 'var(--surface-2)', border: '1px solid var(--rule)' }}>
              {[
                ['Disputed amount', '₹2,140'],
                ['SLA · remaining', '11h 42m'],
                ['Customer rating', '4.86 · trusted'],
                ['Driver risk',     'Low · 0 prior'],
              ].map(([k, v], i) => (
                <div key={k} style={{ padding: '14px 18px', borderRight: i < 3 ? '1px solid var(--rule)' : 'none' }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* body */}
          <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
            {/* evidence */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card" style={{ padding: '18px 20px' }}>
                <div className="t-label" style={{ marginBottom: 10 }}>Telemetry · evidence</div>
                <div style={{ height: 220, marginBottom: 14, border: '1px solid var(--rule)', overflow: 'hidden' }}>
                  <CityMap
                    markers={[
                      { x: 100, y: 100, kind: 'pickup' },
                      { x: 600, y: 380, kind: 'on-trip' },
                    ]}
                    routes={[
                      { path: 'M100 100 Q220 80 320 140 Q420 220 460 280 Q540 360 600 380', start: [100,100], end: [600,380] },
                    ]}
                    showLegend={false}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[
                    ['Expected', '24.8 km'],
                    ['Actual',   '31.4 km'],
                    ['Delta',    '+6.6 km'],
                    ['Variance', '+26.6%'],
                  ].map(([k, v], i) => (
                    <div key={k}>
                      <div className="t-label" style={{ padding: 0 }}>{k}</div>
                      <div style={{
                        marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 13,
                        color: i >= 2 ? 'var(--warn)' : 'var(--ink-2)',
                      }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* conversation */}
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                  <div className="t-label">Communication</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 400 }}>Customer thread</h3>
                </div>
                <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { who: 'Hema Rao',     side: 'l', t: '14:38', m: 'My driver took a route I\'ve never seen before from the airport. Charged ₹2,140 — it should have been ₹1,580 like always.' },
                    { who: 'Anjali · Acme',side: 'r', t: '14:52', m: 'Thanks for flagging Hema. I\'ve opened a dispute and asked the driver for his side. We\'ll get back within 12 hours.' },
                    { who: 'Hema Rao',     side: 'l', t: '14:54', m: 'Thank you.' },
                  ].map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: c.side === 'r' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: 3,
                        background: c.side === 'r' ? 'var(--accent-soft)' : 'var(--surface-2)',
                        border: '1px solid ' + (c.side === 'r' ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' : 'var(--rule)'),
                      }}>
                        <div className="t-meta" style={{ marginBottom: 4, color: c.side === 'r' ? 'var(--accent-ink)' : 'var(--ink-3)' }}>{c.who} · {c.t}</div>
                        <div style={{ fontSize: 13, color: 'var(--ink)' }}>{c.m}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '14px 18px', borderTop: '1px solid var(--rule)' }}>
                  <div className="input">
                    <input placeholder="Reply to customer…" />
                    <button className="btn sm accent" style={{ height: 28 }}>Send</button>
                  </div>
                </div>
              </div>
            </div>

            {/* resolution preview */}
            <div>
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                  <div className="t-label">Resolution</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 400 }}>Proposed outcome</h3>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  <div className="t-label" style={{ marginBottom: 10 }}>Action</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      ['Uphold fare · close dispute', false],
                      ['Partial refund · ₹420 to customer', true],
                      ['Full refund · ₹2,140 to customer', false],
                      ['Goodwill credit · wallet only', false],
                    ].map(([l, on]) => (
                      <div key={l} style={{
                        padding: '10px 12px',
                        border: '1px solid ' + (on ? 'var(--accent)' : 'var(--rule)'),
                        background: on ? 'var(--accent-soft-2)' : 'var(--surface)',
                        borderRadius: 3,
                        display: 'flex', alignItems: 'center', gap: 10,
                        fontSize: 13,
                      }}>
                        <span style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: '1px solid ' + (on ? 'var(--accent)' : 'var(--rule-strong)'),
                          background: on ? 'var(--accent)' : 'var(--surface)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {on && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                        </span>
                        {l}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div className="t-label" style={{ marginBottom: 10 }}>Driver impact</div>
                    <div style={{ padding: '10px 12px', border: '1px solid var(--rule)', background: 'var(--surface-2)', borderRadius: 3, fontSize: 13, color: 'var(--ink-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Clawback from next payout</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>₹294</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span>Warning issued · score −2</span>
                        <span className="t-meta">No suspension</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div className="input">
                      <input placeholder="Resolution note (visible in audit)" defaultValue="GPS trace confirms 6.6 km deviation outside acceptable variance." />
                    </div>
                  </div>

                  <div style={{ marginTop: 18, padding: '12px 14px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule-strong))', borderRadius: 3, fontSize: 12.5, color: 'var(--ink-2)' }}>
                    <span style={{ color: 'var(--warn)' }}>Finance approval required.</span> Refund of ₹420 is below threshold; clawback of ₹294 needs Finance sign-off.
                  </div>

                  <button className="btn accent lg" style={{ width: '100%', marginTop: 14 }}>
                    Request Finance approval →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, {
  RoadBookingsListScreen, BookingDetailScreen, AssistedBookingScreen,
  CancellationRefundScreen, DisputesScreen,
  ROAD_BOOKINGS, bStatusBadge,
});
