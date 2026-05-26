/* ─────────────────────────────────────────────────────────────
   Module 06 — Live Dispatch & Exception Console
   Screens 6.1 → 6.3
   ───────────────────────────────────────────────────────────── */

// ──────────────────────────────────────────────────────────────
// 6.1 — Dispatch Console (split view)
// ──────────────────────────────────────────────────────────────
function DispatchConsoleScreen() {
  const queue = [
    { id: 'REQ-44210', sub: 'XL',    cust: 'Aarav Kapoor',   from: 'Indiranagar',     to: 'KIAL T2',        fare: '₹1,240', age: 14, attempts: 0, radius: 1.5, eligible: 12, zone: 'Z-N4', sla: 'ok',     selected: true },
    { id: 'REQ-44209', sub: 'Sedan', cust: 'Meera Sharma',   from: 'HSR · 27',         to: 'Domlur',         fare: '₹420',   age: 28, attempts: 1, radius: 2.0, eligible: 5,  zone: 'Z-S1', sla: 'warn' },
    { id: 'REQ-44208', sub: 'Bike',  cust: 'Ishan Patel',    from: 'Koramangala',      to: 'Sarjapur',       fare: '₹160',   age: 8,  attempts: 0, radius: 1.0, eligible: 22, zone: 'Z-S2', sla: 'ok' },
    { id: 'REQ-44207', sub: 'Sedan', cust: 'Diya Menon',     from: 'Whitefield',       to: 'MG Road',        fare: '₹620',   age: 102,attempts: 3, radius: 4.5, eligible: 0,  zone: 'Z-E2', sla: 'danger', exception: 'No drivers' },
    { id: 'REQ-44206', sub: 'XL',    cust: 'Vikram Bhatt',   from: 'KIAL T1',          to: 'HSR Layout',     fare: '₹1,420', age: 11, attempts: 0, radius: 2.5, eligible: 8,  zone: 'Z-N6', sla: 'ok' },
    { id: 'REQ-44205', sub: 'Sedan', cust: 'Karthik Reddy',  from: 'BTM Layout',       to: 'Electronic City',fare: '₹540',   age: 42, attempts: 2, radius: 3.0, eligible: 2,  zone: 'Z-S3', sla: 'warn' },
    { id: 'REQ-44204', sub: 'Bike',  cust: 'Priya Iyer',     from: 'Jayanagar',        to: 'Banashankari',   fare: '₹95',    age: 5,  attempts: 0, radius: 0.8, eligible: 31, zone: 'Z-S4', sla: 'ok' },
    { id: 'REQ-44203', sub: 'Sedan', cust: 'Hema Rao',       from: 'Yeshwantpur',      to: 'Hebbal',         fare: '₹440',   age: 64, attempts: 2, radius: 3.5, eligible: 1,  zone: 'Z-W3', sla: 'warn' },
    { id: 'REQ-44202', sub: 'Outstn',cust: 'Rohan Mehta',    from: 'Bengaluru',        to: 'Mysuru · OW',    fare: '₹4,200', age: 22, attempts: 1, radius: 6.0, eligible: 3,  zone: 'Z-S1', sla: 'ok' },
    { id: 'REQ-44201', sub: 'Sedan', cust: 'Tariq Ahmed',    from: 'MG Road',          to: 'Indiranagar',    fare: '₹260',   age: 3,  attempts: 0, radius: 1.0, eligible: 18, zone: 'Z-N1', sla: 'ok' },
    { id: 'REQ-44200', sub: 'XL',    cust: 'Maya Cherian',   from: 'Bellandur',        to: 'KIAL T2',        fare: '₹1,180', age: 87, attempts: 3, radius: 4.0, eligible: 0,  zone: 'Z-E2', sla: 'danger', exception: 'No drivers' },
    { id: 'REQ-44199', sub: 'Sedan', cust: 'Imran Shaikh',   from: 'Hosur Rd',         to: 'KIAL T1',        fare: '₹880',   age: 18, attempts: 0, radius: 2.0, eligible: 7,  zone: 'Z-S3', sla: 'ok' },
  ];
  const eligibleDrivers = [
    { rank: 1, name: 'Ravi Mahesh',     vehicle: 'KA 05 MK 4271', dist: '0.6 km', eta: '3m',  rating: 4.92, accept: '94%', recommended: true },
    { rank: 2, name: 'Sumit Joshi',     vehicle: 'KA 03 PA 2210', dist: '0.8 km', eta: '4m',  rating: 4.88, accept: '91%' },
    { rank: 3, name: 'Vinay Kumar',     vehicle: 'KA 05 EL 9912', dist: '0.9 km', eta: '4m',  rating: 4.84, accept: '89%' },
    { rank: 4, name: 'Hemant Singh',    vehicle: 'KA 05 MK 7104', dist: '1.1 km', eta: '5m',  rating: 4.81, accept: '90%' },
    { rank: 5, name: 'Naveed Khan',     vehicle: 'KA 03 PB 4421', dist: '1.2 km', eta: '5m',  rating: 4.79, accept: '86%' },
    { rank: 6, name: 'Mahesh Kanna',    vehicle: 'KA 05 ET 8810', dist: '1.3 km', eta: '6m',  rating: 4.92, accept: '74%' },
    { rank: 7, name: 'Praveen R',       vehicle: 'KA 05 EL 0019', dist: '1.4 km', eta: '6m',  rating: 4.71, accept: '88%' },
    { rank: 8, name: 'Faisal Ali',      vehicle: 'KA 03 QA 1129', dist: '1.5 km', eta: '7m',  rating: 4.66, accept: '82%' },
  ];

  const slaDot = (s) => s === 'danger' ? 'danger' : s === 'warn' ? 'warn' : 'ok';

  return (
    <Shell
      active="dispatch"
      breadcrumb="Operations · Live"
      title="Dispatch console"
      subtitle="247 in queue · 2 exceptions · 1,184 drivers online · BLR"
      actions={
        <>
          <div style={{ display: 'inline-flex', border: '1px solid var(--rule-strong)', borderRadius: 3 }}>
            <button className="btn sm ghost" style={{ height: 28, borderRadius: 0, borderRight: '1px solid var(--rule)', background: 'var(--surface-sunk)', color: 'var(--ink)', padding: '0 12px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>All</button>
            <button className="btn sm ghost" style={{ height: 28, borderRadius: 0, borderRight: '1px solid var(--rule)', padding: '0 12px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>SLA</button>
            <button className="btn sm ghost" style={{ height: 28, borderRadius: 0, padding: '0 12px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Exceptions</button>
          </div>
          <button className="btn sm"><Icon name="bolt" size={13} />Supply monitor</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '440px 1fr 360px', height: '100%', overflow: 'hidden' }}>

        {/* LEFT — queue */}
        <aside style={{ borderRight: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--surface)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label">Live request queue</div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                <span className="dot ok" /> STREAMING
              </span>
            </div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.018em' }}>247 in queue</h3>
              <span className="t-meta">· sorted by time-in-state</span>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
              <FilterChip label="Zone" value="All 12" />
              <FilterChip label="Service" value="Road" count={1} />
              <FilterChip label="SLA" value="≤ 60s" />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {queue.map(q => (
              <div key={q.id} style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--rule-soft)',
                borderLeft: '3px solid ' + (q.selected ? 'var(--accent)' : 'transparent'),
                background: q.selected ? 'var(--surface-2)' : 'transparent',
                cursor: 'pointer',
                display: 'grid',
                gridTemplateColumns: '52px 1fr auto',
                gap: 12,
                alignItems: 'flex-start',
              }}>
                {/* big timer */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 19, fontWeight: 500,
                    lineHeight: 1,
                    color: q.sla === 'danger' ? 'var(--danger)' : q.sla === 'warn' ? 'var(--warn)' : 'var(--ink)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {q.age >= 60 ? `${Math.floor(q.age/60)}:${String(q.age%60).padStart(2,'0')}` : `${q.age}s`}
                  </div>
                  <div className="t-meta" style={{ marginTop: 4, color: 'var(--ink-3)' }}>{q.zone}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)' }}>{q.id}</span>
                    <span className="t-meta" style={{ color: 'var(--ink-3)' }}>· {q.sub}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 3 }}>{q.cust}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span>{q.from}</span>
                    <Icon name="arrowRight" size={10} style={{ color: 'var(--ink-4)' }} />
                    <span>{q.to}</span>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    {q.exception ? (
                      <span className="badge danger"><span className="dot danger" />{q.exception}</span>
                    ) : (
                      <>
                        <span style={{ color: 'var(--ink-3)' }}>{q.attempts} attempts</span>
                        <span style={{ color: 'var(--ink-4)' }}>·</span>
                        <span style={{ color: 'var(--ink-3)' }}>r {q.radius} km</span>
                        <span style={{ color: 'var(--ink-4)' }}>·</span>
                        <span style={{ color: q.eligible === 0 ? 'var(--danger)' : q.eligible <= 3 ? 'var(--warn)' : 'var(--accent)' }}>
                          {q.eligible} eligible
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)', textAlign: 'right' }}>{q.fare}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER — map */}
        <div style={{ position: 'relative', minHeight: 0, overflow: 'hidden', background: 'var(--surface-sunk)' }}>
          <CityMap
            markers={[
              { x: 320, y: 220, kind: 'pickup' },         // selected request
              { x: 280, y: 200, kind: 'idle' },           // ranked driver 1 (closest)
              { x: 340, y: 250, kind: 'idle' },
              { x: 360, y: 210, kind: 'idle' },
              { x: 380, y: 260, kind: 'idle' },
              { x: 290, y: 250, kind: 'idle' },
              { x: 400, y: 230, kind: 'idle' },
              { x: 250, y: 270, kind: 'idle' },
              { x: 410, y: 200, kind: 'idle' },
              { x: 720, y: 100, kind: 'on-trip' },        // destination
              { x: 180, y: 130, kind: 'on-trip' },
              { x: 480, y: 380, kind: 'on-trip' },
              { x: 590, y: 320, kind: 'on-trip' },
              { x: 660, y: 240, kind: 'pickup' },
              { x: 120, y: 360, kind: 'pickup' },
            ]}
            routes={[
              { path: 'M320 220 Q500 140 720 100', start: [320,220], end: [720,100] },
            ]}
            showLegend={false}
          />

          {/* radius rings around selected pickup */}
          <svg viewBox="0 0 1440 920" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} preserveAspectRatio="xMidYMid slice">
            <g transform="translate(575 400)" stroke="var(--accent)" fill="none">
              <circle r="60" strokeWidth="1.2" strokeDasharray="3 4" opacity="0.5" />
              <circle r="110" strokeWidth="1" strokeDasharray="3 4" opacity="0.3" />
              <circle r="170" strokeWidth="0.8" strokeDasharray="3 4" opacity="0.2" />
              <text x="0" y="-66" textAnchor="middle" fill="var(--accent-ink)" style={{ font: '10px IBM Plex Mono', letterSpacing: '0.10em' }}>1.5 km</text>
              <text x="0" y="-116" textAnchor="middle" fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono', letterSpacing: '0.10em' }}>3.0 km</text>
            </g>
          </svg>

          {/* selected request callout */}
          <div style={{
            position: 'absolute',
            top: 20, left: 20,
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            padding: '14px 18px',
            boxShadow: 'var(--shadow-2)',
            minWidth: 280,
          }}>
            <div className="t-label">Selected · REQ-44210</div>
            <div style={{ marginTop: 6, fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>Aarav Kapoor · Cab XL</div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink)' }} />
              Indiranagar · 100 Ft Rd
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--ink)' }} />
              KIAL T2 · 38.4 km
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)' }}>14s</span>
              <span className="t-meta">in queue · auto-dispatching</span>
            </div>
          </div>

          {/* zone label */}
          <div style={{
            position: 'absolute', top: 280, left: 380,
            background: 'var(--surface)',
            padding: '4px 8px',
            border: '1px solid color-mix(in oklab, var(--accent) 24%, var(--rule-strong))',
            fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.10em', textTransform: 'uppercase',
            color: 'var(--accent-ink)',
          }}>Z-N4 · Indiranagar · 12 idle</div>

          {/* bottom stat bar */}
          <div style={{
            position: 'absolute',
            bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface)', border: '1px solid var(--rule)',
            padding: '10px 18px',
            display: 'flex', gap: 26, alignItems: 'center',
            boxShadow: 'var(--shadow-2)',
          }}>
            <div>
              <div className="t-label" style={{ padding: 0 }}>Avg pickup ETA</div>
              <div style={{ marginTop: 2, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>4:12 · −8s</div>
            </div>
            <span style={{ width: 1, height: 26, background: 'var(--rule)' }} />
            <div>
              <div className="t-label" style={{ padding: 0 }}>Auto-dispatch rate</div>
              <div style={{ marginTop: 2, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>94.6%</div>
            </div>
            <span style={{ width: 1, height: 26, background: 'var(--rule)' }} />
            <div>
              <div className="t-label" style={{ padding: 0 }}>Stuck &gt; 60s</div>
              <div style={{ marginTop: 2, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--warn)' }}>11</div>
            </div>
            <span style={{ width: 1, height: 26, background: 'var(--rule)' }} />
            <div>
              <div className="t-label" style={{ padding: 0 }}>No-driver</div>
              <div style={{ marginTop: 2, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)' }}>2</div>
            </div>
          </div>
        </div>

        {/* RIGHT — eligible drivers */}
        <aside style={{ borderLeft: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--surface)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Eligible drivers · REQ-44210</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>12 ranked candidates</h3>
            <div className="t-meta" style={{ marginTop: 4 }}>Online · docs valid · class match · within 1.5 km</div>
            <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
              <div className="t-label" style={{ padding: 0, marginBottom: 6 }}>Ranking · weights</div>
              <div style={{ display: 'flex', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
                <span style={{ flex: 1, padding: '3px 6px', background: 'var(--ink)', color: 'var(--surface)' }}>Distance · 60</span>
                <span style={{ flex: 1, padding: '3px 6px', background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>Rating · 25</span>
                <span style={{ flex: 1, padding: '3px 6px', background: 'var(--surface-sunk)', color: 'var(--ink-2)' }}>Accept · 15</span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {eligibleDrivers.map((d, i) => (
              <div key={d.rank} style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--rule-soft)',
                background: d.recommended ? 'var(--accent-soft-2)' : 'transparent',
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                {d.recommended && (
                  <span style={{
                    position: 'absolute', top: 6, right: 12,
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                    color: 'var(--accent)', textTransform: 'uppercase',
                  }}>● Recommended</span>
                )}
                <div style={{
                  fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400,
                  color: d.recommended ? 'var(--accent)' : 'var(--ink-3)',
                  width: 28, textAlign: 'right',
                }}>{d.rank}</div>
                <div className="avatar" style={d.recommended ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' } : null}>
                  {d.name.split(' ').map(p => p[0]).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: d.recommended ? 500 : 400 }}>{d.name}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{d.vehicle}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                    <span>{d.dist}</span>
                    <span>· {d.eta}</span>
                    <span>· ★ {d.rating}</span>
                    <span>· {d.accept}</span>
                  </div>
                </div>
                {d.recommended && <button className="btn sm accent">Assign</button>}
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn accent" style={{ width: '100%' }}><Icon name="bolt" size={13} />Assign to Ravi Mahesh</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sm" style={{ flex: 1 }}>Expand radius +1km</button>
              <button className="btn sm" style={{ flex: 1 }}>Notify customer</button>
            </div>
            <button className="btn sm ghost danger" style={{ width: '100%' }}>Cancel & refund</button>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 6.2 — Exceptions
// ──────────────────────────────────────────────────────────────
function DispatchExceptionsScreen() {
  const exceptions = [
    { id: 'EX-9821', kind: 'no-driver',     req: 'REQ-44207', cust: 'Diya Menon',     zone: 'Z-E2 · Whitefield',  sub: 'Sedan', age: '1m 42s', attempts: 3, action: 'Expand radius', sev: 'danger' },
    { id: 'EX-9820', kind: 'no-driver',     req: 'REQ-44200', cust: 'Maya Cherian',   zone: 'Z-E2 · Bellandur',   sub: 'XL',    age: '1m 27s', attempts: 3, action: 'Manual assign', sev: 'danger' },
    { id: 'EX-9819', kind: 'rejected ×4',   req: 'REQ-44196', cust: 'Imran Shaikh',   zone: 'Z-S3 · Hosur Rd',    sub: 'Sedan', age: '58s',    attempts: 4, action: 'Manual assign', sev: 'warn' },
    { id: 'EX-9818', kind: 'stuck pickup',  req: 'REQ-44192', cust: 'Sumit Mehta',    zone: 'Z-N1 · MG Road',     sub: 'Bike',  age: '52s',    attempts: 1, action: 'Contact driver',sev: 'warn' },
    { id: 'EX-9817', kind: 'sla breach',    req: 'REQ-44188', cust: 'Anushka Roy',    zone: 'Z-W3 · Yeshwantpur', sub: 'Sedan', age: '47s',    attempts: 2, action: 'Notify customer', sev: 'warn' },
    { id: 'EX-9816', kind: 'no-driver',     req: 'REQ-44182', cust: 'Karan Joshi',    zone: 'Z-E2 · Whitefield',  sub: 'Sedan', age: '38s',    attempts: 2, action: 'Expand radius', sev: 'warn' },
    { id: 'EX-9815', kind: 'route blocked', req: 'REQ-44178', cust: 'Anita Pillai',   zone: 'Z-N4 · 100 Ft Rd',   sub: 'XL',    age: '35s',    attempts: 1, action: 'Reroute',       sev: 'info' },
  ];

  return (
    <Shell
      active="dispatch"
      breadcrumb="Operations · Live · Exceptions"
      title="Dispatch exceptions"
      subtitle="7 active · 2 critical · 4 SLA-breach risk"
      actions={
        <>
          <button className="btn sm"><Icon name="external" size={13} />Open console</button>
          <button className="btn sm"><Icon name="filter" size={13} />Zone · BLR</button>
          <button className="btn sm accent">Bulk · expand radius</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* summary strip */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            { l: 'Active exceptions',  v: '7',     m: '+2 last 5 min',           tone: 'var(--danger)' },
            { l: 'No-driver',          v: '3',     m: 'All in Z-E2 Whitefield', tone: 'var(--danger)' },
            { l: 'SLA breach risk',    v: '4',     m: '< 30s to threshold',     tone: 'var(--warn)' },
            { l: 'Resolved · last hr', v: '24',    m: '92% before customer',    tone: 'var(--accent)' },
            { l: 'Avg time to resolve',v: '0:42',  m: 'Target 0:60',            tone: 'var(--accent)' },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: '18px 22px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{s.l}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.018em', color: 'var(--ink)' }}>{s.v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: s.tone }}>{s.m}</div>
            </div>
          ))}
        </div>

        {/* exception cards */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Exception</th>
                <th>Request</th>
                <th>Customer</th>
                <th>Zone · Service</th>
                <th>Attempts</th>
                <th>Time-in-state</th>
                <th>Recommended action</th>
                <th style={{ textAlign: 'right' }}>Resolve</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((e, i) => (
                <tr key={e.id} className={i === 0 ? 'selected' : ''}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={'dot ' + e.sev} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)' }}>{e.id}</div>
                        <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 3, textTransform: 'capitalize' }}>{e.kind}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num" style={{ color: 'var(--ink-2)' }}>{e.req}</td>
                  <td>{e.cust}</td>
                  <td>
                    <div className="t-meta" style={{ color: 'var(--ink-2)', fontSize: 12 }}>{e.zone}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{e.sub}</div>
                  </td>
                  <td className="num">{e.attempts}</td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 13,
                      color: e.sev === 'danger' ? 'var(--danger)' : e.sev === 'warn' ? 'var(--warn)' : 'var(--ink-2)',
                    }}>{e.age}</span>
                  </td>
                  <td>
                    <span className="t-meta" style={{ color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontSize: 12.5, textTransform: 'none', letterSpacing: 0 }}>{e.action}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn sm">Resolve →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* root cause clue */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="t-label" style={{ marginBottom: 8 }}>Pattern · last 15 min</div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>3 of 7 exceptions cluster in Z-E2 Whitefield</h3>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              Driver supply is down ~32% versus baseline for this hour. Shift change at 16:00 IST overlaps with airport demand spike. The two no-driver exceptions and three rejections all originate inside Z-E2.
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <button className="btn sm accent"><Icon name="bolt" size={12} />Trigger Z-E2 incentive</button>
              <button className="btn sm"><Icon name="envelope" size={12} />Broadcast nearby drivers</button>
            </div>
          </div>
          <div>
            <div className="t-label" style={{ marginBottom: 10 }}>Z-E2 · supply</div>
            <div style={{ height: 1, background: 'var(--rule)', marginBottom: 12 }} />
            {[
              ['Drivers online · 15:00', 142,  170],
              ['Drivers online · now',   97,   170],
              ['Demand · now',           58,   170],
              ['Demand · 15:00',         42,   170],
            ].map(([k, v, max], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                <span style={{ flex: '0 0 160px', fontSize: 12 }}>{k}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: (v/max)*100 + '%', height: '100%',
                    background: i < 2 ? 'var(--ink-2)' : 'var(--warn)',
                  }} />
                </div>
                <span style={{ width: 36, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 6.3 — Supply & Surge Monitor
// ──────────────────────────────────────────────────────────────
function SupplySurgeScreen() {
  const zones = [
    { z: 'Z-N1 · MG Road',       online: 78,  demand: 62,  ratio: 0.79, surge: 1.0, capped: false, tone: 'ok' },
    { z: 'Z-N4 · Indiranagar',   online: 124, demand: 142, ratio: 1.15, surge: 1.2, capped: false, tone: 'ok' },
    { z: 'Z-S1 · HSR',           online: 96,  demand: 168, ratio: 1.75, surge: 1.8, capped: true,  tone: 'danger' },
    { z: 'Z-S2 · Koramangala',   online: 102, demand: 130, ratio: 1.27, surge: 1.3, capped: false, tone: 'warn' },
    { z: 'Z-S3 · Bommanahalli',  online: 88,  demand: 92,  ratio: 1.05, surge: 1.1, capped: false, tone: 'ok' },
    { z: 'Z-S4 · Banashankari',  online: 64,  demand: 58,  ratio: 0.91, surge: 1.0, capped: false, tone: 'ok' },
    { z: 'Z-E2 · Whitefield',    online: 97,  demand: 150, ratio: 1.55, surge: 1.6, capped: false, tone: 'warn' },
    { z: 'Z-W3 · Yeshwantpur',   online: 71,  demand: 68,  ratio: 0.96, surge: 1.0, capped: false, tone: 'ok' },
    { z: 'Z-N6 · Hebbal · KIAL', online: 142, demand: 178, ratio: 1.25, surge: 1.3, capped: false, tone: 'warn' },
    { z: 'Z-W1 · Rajajinagar',   online: 54,  demand: 48,  ratio: 0.89, surge: 1.0, capped: false, tone: 'ok' },
    { z: 'Z-E1 · CV Raman',      online: 62,  demand: 64,  ratio: 1.03, surge: 1.1, capped: false, tone: 'ok' },
    { z: 'Z-N3 · Sadashivnagar', online: 38,  demand: 30,  ratio: 0.79, surge: 1.0, capped: false, tone: 'ok' },
  ];

  const heatColor = (r) => {
    if (r >= 1.6) return 'color-mix(in oklab, var(--danger) 28%, var(--surface))';
    if (r >= 1.3) return 'color-mix(in oklab, var(--warn) 26%, var(--surface))';
    if (r >= 1.05) return 'color-mix(in oklab, var(--warn) 12%, var(--surface))';
    if (r >= 0.9)  return 'var(--surface-2)';
    return 'color-mix(in oklab, var(--info) 10%, var(--surface))';
  };

  return (
    <Shell
      active="dispatch"
      breadcrumb="Operations · Live · Supply"
      title="Supply & surge monitor"
      subtitle="Live · refreshing every 30s · 1 zone capped"
      actions={
        <>
          <button className="btn sm"><Icon name="refresh" size={13} />Refresh</button>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm accent"><Icon name="bolt" size={13} />Override surge</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* hero KPI strip */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            { l: 'Online drivers',  v: '1,184', m: 'Of 1,520 approved · 77.9%',     tone: 'var(--accent)' },
            { l: 'Live demand',     v: '1,128', m: '+18% vs. same hour last week',  tone: 'var(--ink-2)' },
            { l: 'D / S ratio',     v: '1.13×', m: 'Above 1.30 in 4 zones',         tone: 'var(--warn)' },
            { l: 'Active surge',    v: '7 / 12', m: 'Average 1.24×',                tone: 'var(--ink)' },
            { l: 'Capped',          v: '1',     m: 'Z-S1 HSR · 1.8× cap reached',   tone: 'var(--danger)' },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: '18px 22px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{s.l}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.018em' }}>{s.v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: s.tone }}>{s.m}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
          {/* heat map */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="t-label">Zone heatmap</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Demand-to-supply ratio · now</h3>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--ink-3)' }}>
                {[
                  ['< 0.9',  heatColor(0.8)],
                  ['0.9–1.0',heatColor(0.95)],
                  ['1.0–1.3',heatColor(1.15)],
                  ['1.3–1.6',heatColor(1.4)],
                  ['> 1.6',  heatColor(1.8)],
                ].map(([l, c]) => (
                  <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 12, height: 12, background: c, border: '1px solid var(--rule-strong)' }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {zones.map((z, i) => (
                <div key={z.z} style={{
                  padding: '14px 14px',
                  border: '1px solid ' + (z.capped ? 'var(--danger)' : 'var(--rule)'),
                  background: heatColor(z.ratio),
                  position: 'relative',
                  borderRadius: 3,
                  cursor: 'pointer',
                }}>
                  {z.capped && (
                    <span style={{
                      position: 'absolute', top: -8, right: 8,
                      background: 'var(--danger)', color: '#fff',
                      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                      padding: '2px 6px', borderRadius: 2,
                    }}>Capped</span>
                  )}
                  <div className="t-label" style={{ padding: 0, color: 'var(--ink-2)' }}>{z.z}</div>
                  <div style={{
                    marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6,
                    fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, color: 'var(--ink)',
                  }}>
                    {z.ratio.toFixed(2)}<span style={{ fontSize: 13, color: 'var(--ink-3)' }}>×</span>
                  </div>
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                    {z.demand} req · {z.online} drv
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    <span style={{ color: 'var(--ink-3)' }}>Surge</span>
                    <span style={{ color: z.surge >= 1.5 ? 'var(--danger)' : z.surge >= 1.2 ? 'var(--warn)' : 'var(--accent)', fontWeight: 500 }}>{z.surge.toFixed(1)}×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* surge override card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Manual override</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Set surge for Z-S1 HSR</h3>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
              {/* slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span className="t-label" style={{ padding: 0 }}>Multiplier</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 36, color: 'var(--warn)' }}>1.6×</span>
                </div>
                <div style={{ position: 'relative', height: 32 }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, top: 14, height: 4, background: 'var(--rule)', borderRadius: 2 }} />
                  <div style={{ position: 'absolute', left: 0, top: 14, width: '60%', height: 4, background: 'linear-gradient(to right, var(--accent), var(--warn))', borderRadius: 2 }} />
                  <div style={{
                    position: 'absolute', left: '60%', top: 8, width: 16, height: 16,
                    borderRadius: '50%', background: 'var(--surface)',
                    border: '2px solid var(--warn)', marginLeft: -8,
                    boxShadow: 'var(--shadow-2)',
                  }} />
                  <div style={{
                    position: 'absolute', left: 'calc(80% - 1px)', top: 0, width: 1, height: 30,
                    background: 'var(--danger)',
                  }} />
                  <div style={{ position: 'absolute', right: -8, top: -16, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--danger)', letterSpacing: '0.12em' }}>CAP 1.8×</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
                  <span>1.0×</span><span>1.2</span><span>1.4</span><span>1.6</span><span>1.8</span><span>2.0</span>
                </div>
              </div>

              <div className="field">
                <label className="field-label">Reason · required</label>
                <div className="input">
                  <input defaultValue="Driver shift change · evening peak demand" />
                </div>
              </div>

              <Row cols={2}>
                <div className="field">
                  <label className="field-label">Auto-expire</label>
                  <div className="input">
                    <input defaultValue="In 45 minutes · 16:30" readOnly />
                    <Icon name="clock" size={14} className="icon" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Applies to</label>
                  <div className="input">
                    <input defaultValue="All vehicle classes" readOnly />
                    <Icon name="chevDown" size={14} className="icon" />
                  </div>
                </div>
              </Row>

              <div style={{ padding: '12px 14px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule-strong))', borderRadius: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warn)' }}>
                  <Icon name="alert" size={13} />
                  <span className="t-label" style={{ padding: 0, color: 'var(--warn)' }}>Audit · surge override</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  Override will affect ~480 in-flight estimates in this zone. Customers booked at the new multiplier will see the change reflected immediately. Action is audit-logged.
                </div>
              </div>

              <div style={{ flex: 1 }} />

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ flex: 1 }}>Cancel</button>
                <button className="btn accent" style={{ flex: 2 }}>Apply override · 1.6× for 45m</button>
              </div>
            </div>
          </div>
        </div>

        {/* recent overrides */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Recent overrides · last 24h</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Override history</h3>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>When</th>
                <th>Zone</th>
                <th>Multiplier</th>
                <th>Duration</th>
                <th>By</th>
                <th>Reason</th>
                <th>Bookings affected</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Today · 14:22', 'Z-E2 · Whitefield',  '1.4×', '90m',  'Priya Iyer',    'Airport surge · arrivals spike', '312'],
                ['Today · 11:40', 'Z-N6 · Hebbal',      '1.3×', '60m',  'Rohan Mehta',   'Maintenance · 1 toll closed',    '188'],
                ['Today · 09:08', 'Z-S2 · Koramangala', '1.2×', '45m',  'Priya Iyer',    'School rush',                   '241'],
                ['Yesterday · 21:14', 'Z-N1 · MG Road', '1.5×', '120m', 'Sana Reyes',    'Concert at Palace Grounds',     '624'],
                ['Yesterday · 18:30', 'Z-S1 · HSR',     '1.4×', '90m',  'Priya Iyer',    'Tech park exodus',              '418'],
              ].map((r, i) => (
                <tr key={i}>
                  <td className="num" style={{ color: 'var(--ink-2)' }}>{r[0]}</td>
                  <td>{r[1]}</td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warn)' }}>{r[2]}</span></td>
                  <td className="num">{r[3]}</td>
                  <td>{r[4]}</td>
                  <td style={{ color: 'var(--ink-2)' }}>{r[5]}</td>
                  <td className="num">{r[6]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { DispatchConsoleScreen, DispatchExceptionsScreen, SupplySurgeScreen });
