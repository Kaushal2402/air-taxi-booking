/* ─────────────────────────────────────────────────────────────
   Module 02 — Dashboard & Live Operations
   Screens 2.1 → 2.2
   ───────────────────────────────────────────────────────────── */

// ──────────────────────────────────────────────────────────────
// Sparkline — tiny inline SVG
// ──────────────────────────────────────────────────────────────
function Sparkline({ data, color = 'var(--ink-2)', height = 28, fill }) {
  const w = 100, h = height;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 2 - ((v - min) / range) * (h - 4),
  ]);
  const d = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2)).join(' ');
  const fillD = d + ` L${w} ${h} L0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      {fill && <path d={fillD} fill={fill} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({ kicker, value, delta, deltaTone = 'ok', sparkline, sparkColor, footer, hero }) {
  return (
    <div style={{
      padding: hero ? '22px 24px' : '18px 18px 16px',
      borderRight: '1px solid var(--rule)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="t-label" style={{ padding: 0 }}>{kicker}</span>
        {delta && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: deltaTone === 'ok' ? 'var(--accent)' : deltaTone === 'warn' ? 'var(--warn)' : deltaTone === 'danger' ? 'var(--danger)' : 'var(--ink-3)',
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            <Icon name={deltaTone === 'warn' || deltaTone === 'danger' ? 'arrowDown' : 'arrowUp'} size={10} stroke={2} />
            {delta}
          </span>
        )}
      </div>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: hero ? 44 : 30,
        fontWeight: 400,
        letterSpacing: '-0.020em',
        color: 'var(--ink)',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {sparkline && (
        <div style={{ marginTop: 4 }}>
          <Sparkline data={sparkline} color={sparkColor || 'var(--ink-3)'} height={hero ? 36 : 24} />
        </div>
      )}
      {footer && <div className="t-meta" style={{ marginTop: 4 }}>{footer}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Stylized map — SVG city grid + routes + driver markers
// ──────────────────────────────────────────────────────────────
function CityMap({ markers = [], routes = [], zones = [], showLegend = true, density = 1 }) {
  return (
    <svg viewBox="0 0 800 480" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block', background: 'var(--surface-sunk)' }}>
      <defs>
        <pattern id="cityGrid" width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill="var(--surface-sunk)" />
          <path d="M48 0 L0 0 0 48" stroke="var(--rule)" strokeWidth="0.5" fill="none" opacity="0.7" />
        </pattern>
        <pattern id="cityGridFine" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0 L0 0 0 12" stroke="var(--rule-soft)" strokeWidth="0.3" fill="none" />
        </pattern>
        <radialGradient id="cityVignette" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="var(--bg)" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      <rect width="800" height="480" fill="url(#cityGridFine)" />
      <rect width="800" height="480" fill="url(#cityGrid)" opacity="0.7" />

      {/* major arteries — diagonal + a couple curves to feel like a real city */}
      <g stroke="var(--rule-strong)" strokeWidth="1.4" fill="none" opacity="0.85">
        <path d="M-20 120 Q200 100 420 160 T 820 200" />
        <path d="M-20 320 Q220 360 480 320 T 820 280" />
        <path d="M120 -20 Q160 200 280 280 T 360 520" />
        <path d="M560 -20 Q540 160 600 280 T 640 520" />
      </g>
      {/* secondary streets */}
      <g stroke="var(--rule)" strokeWidth="0.7" fill="none" opacity="0.6">
        <path d="M-20 60 Q300 80 800 100" />
        <path d="M-20 420 Q300 440 800 400" />
        <path d="M280 -20 Q300 240 320 520" />
        <path d="M440 -20 Q460 200 480 520" />
        <path d="M-20 240 L820 240" />
        <path d="M-20 180 Q300 220 820 160" />
      </g>

      {/* river/park */}
      <path d="M-20 380 Q220 330 380 380 Q540 430 800 360"
            fill="none" stroke="var(--info)" strokeWidth="6" opacity="0.18" strokeLinecap="round" />
      <path d="M620 80 Q700 100 720 200 Q700 270 640 280 Q600 250 620 80 Z"
            fill="var(--accent)" opacity="0.07" stroke="var(--accent)" strokeOpacity="0.18" strokeWidth="0.8" />

      {/* zone polygons */}
      {zones.map((z, i) => (
        <polygon key={i} points={z.points} fill={z.fill || 'transparent'}
                 stroke={z.stroke || 'var(--accent)'} strokeWidth="1" strokeDasharray="2 3" opacity="0.55" />
      ))}

      {/* active trip route polylines */}
      {routes.map((r, i) => (
        <g key={i}>
          <path d={r.path} fill="none" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx={r.start[0]} cy={r.start[1]} r="3" fill="var(--ink)" />
          <circle cx={r.end[0]} cy={r.end[1]} r="3" fill="none" stroke="var(--ink)" strokeWidth="1.4" />
        </g>
      ))}

      <rect width="800" height="480" fill="url(#cityVignette)" />

      {/* markers */}
      {markers.map((m, i) => {
        const color = m.kind === 'on-trip' ? 'var(--accent)' :
                      m.kind === 'idle'    ? 'var(--info)' :
                      m.kind === 'pickup'  ? 'var(--warn)' :
                      m.kind === 'air'     ? 'var(--ink)' : 'var(--ink-3)';
        if (m.kind === 'air') {
          return (
            <g key={i} transform={`translate(${m.x} ${m.y}) rotate(${m.rot || 35})`}>
              <path d="M0 -7 L4 4 L0 2 L-4 4 Z" fill={color} stroke="var(--surface)" strokeWidth="0.8" />
            </g>
          );
        }
        return (
          <g key={i}>
            <circle cx={m.x} cy={m.y} r="6" fill={color} opacity="0.18" />
            <circle cx={m.x} cy={m.y} r="3" fill={color} stroke="var(--surface)" strokeWidth="1" />
          </g>
        );
      })}

      {/* legend */}
      {showLegend && (
        <g transform="translate(20 440)">
          <rect width="280" height="28" rx="3" fill="var(--surface)" stroke="var(--rule)" />
          {[
            { c: 'var(--accent)', l: 'On trip', x: 12 },
            { c: 'var(--info)',   l: 'Idle',    x: 88 },
            { c: 'var(--warn)',   l: 'Pickup',  x: 152 },
            { c: 'var(--ink)',    l: 'Air',     x: 222 },
          ].map((it, i) => (
            <g key={i} transform={`translate(${it.x} 14)`}>
              <circle r="3.5" fill={it.c} />
              <text x="9" y="3.5" fill="var(--ink-2)" style={{ font: '10px IBM Plex Mono', letterSpacing: '0.06em' }}>{it.l.toUpperCase()}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// 2.1 — Dashboard Home
// ──────────────────────────────────────────────────────────────
function DashboardScreen() {
  const spark1 = [4,6,5,7,6,9,8,10,9,12,11,14,13,15,14,17];
  const spark2 = [12,13,11,14,12,13,15,14,16,15,17,16,18,17,19,18];
  const spark3 = [5,4,6,5,7,6,8,7,9,8,10,9,11,10,12,11];
  const spark4 = [8,9,8,10,9,11,10,12,11,13,12,14,13,15,14,16];
  const spark5 = [6,5,7,8,7,6,7,8,9,8,7,9,10,9,8,7];
  const spark6 = [3,4,3,5,4,6,5,4,6,7,5,4,3,5,4,3];

  const markers = [
    { x: 130, y: 140, kind: 'on-trip' }, { x: 180, y: 230, kind: 'idle' },
    { x: 240, y: 320, kind: 'pickup' }, { x: 310, y: 180, kind: 'on-trip' },
    { x: 380, y: 260, kind: 'on-trip' }, { x: 420, y: 360, kind: 'idle' },
    { x: 510, y: 200, kind: 'on-trip' }, { x: 560, y: 140, kind: 'pickup' },
    { x: 600, y: 300, kind: 'on-trip' }, { x: 660, y: 240, kind: 'idle' },
    { x: 700, y: 380, kind: 'on-trip' }, { x: 470, y: 100, kind: 'air', rot: 40 },
    { x: 280, y: 60,  kind: 'air', rot: -20 }, { x: 90,  y: 350, kind: 'on-trip' },
    { x: 720, y: 80,  kind: 'idle' }, { x: 150, y: 280, kind: 'on-trip' },
    { x: 340, y: 380, kind: 'on-trip' }, { x: 520, y: 360, kind: 'pickup' },
  ];
  const routes = [
    { path: 'M130 140 Q200 180 310 180',           start: [130,140], end: [310,180] },
    { path: 'M240 320 Q300 280 380 260',           start: [240,320], end: [380,260] },
    { path: 'M510 200 Q580 250 600 300',           start: [510,200], end: [600,300] },
    { path: 'M700 380 Q620 360 560 320',           start: [700,380], end: [560,320] },
  ];

  const alerts = [
    { sev: 'danger', t: 'Dispatch failure', m: 'No drivers available · BLR Whitefield · 3 stuck requests', age: '2m', module: 'Dispatch' },
    { sev: 'warn',   t: 'Doc expiry spike',  m: '14 driver licenses expiring in next 7 days · review queue +9', age: '14m', module: 'KYC' },
    { sev: 'warn',   t: 'Surge cap reached', m: 'Surge 1.8× capped in HSR · demand still rising',           age: '22m', module: 'Pricing' },
    { sev: 'info',   t: 'Payout run ready',  m: 'Driver weekly · ₹38.4L · 1,184 payees · awaiting Finance', age: '1h',  module: 'Payouts' },
    { sev: 'danger', t: 'Operator paused',   m: 'BlueSky Heliservices · insurance lapsed · publish-blocked', age: '2h',  module: 'Operators' },
    { sev: 'info',   t: 'SLA breach',        m: '4 tickets > 2h response · routing to backups',             age: '3h',  module: 'Support' },
  ];

  const liveBookings = [
    { id: 'AC-92F8311', svc: 'Cab · XL',    route: 'Indiranagar → KIAL T2',     status: 'on-trip', eta: '12m', fare: '₹1,240' },
    { id: 'AC-92F8307', svc: 'Heli',        route: 'BLR Pad → Mysore Pad',      status: 'departed', eta: '24m', fare: '₹68,500' },
    { id: 'AC-92F8304', svc: 'Bike',        route: 'Koramangala → Sarjapur',    status: 'on-trip', eta: '8m',  fare: '₹160' },
    { id: 'AC-92F8298', svc: 'Cab · Sedan', route: 'Whitefield → MG Road',      status: 'pickup',  eta: '3m',  fare: '₹620' },
    { id: 'AC-92F8291', svc: 'Rental · 8h', route: 'HSR Layout · 80km pkg',     status: 'on-trip', eta: '4h',  fare: '₹3,200' },
    { id: 'AC-92F8284', svc: 'Charter',     route: 'Bengaluru → Kochi · Pvt',   status: 'boarding',eta: '32m', fare: '₹4,80,000' },
  ];

  return (
    <Shell
      active="dashboard"
      breadcrumb="Operations · Live"
      title="Operations"
      subtitle="Wednesday · 21 May 2026 · 15:42 IST"
      actions={
        <>
          <div style={{
            display: 'inline-flex',
            border: '1px solid var(--rule-strong)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            {['Today', '7d', '30d', '90d'].map(w => (
              <button key={w} className="btn sm ghost" style={{
                height: 28,
                borderRadius: 0,
                borderRight: w !== '90d' ? '1px solid var(--rule)' : 'none',
                background: w === 'Today' ? 'var(--surface-sunk)' : 'transparent',
                color: w === 'Today' ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: w === 'Today' ? 500 : 400,
                padding: '0 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>{w}</button>
            ))}
          </div>
          <button className="btn sm"><Icon name="filter" size={13} />Zone · All</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New booking</button>
        </>
      }
    >
      <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* KPI strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          overflow: 'hidden',
        }}>
          <KpiCard kicker="Live trips"        value="247"      delta="+12"   deltaTone="ok"   sparkline={spark1} sparkColor="var(--accent)" footer="On road · 232 · Air · 15" />
          <KpiCard kicker="Online drivers"    value={<>1,184<span style={{ fontSize: 18, color: 'var(--ink-3)' }}> / 1,520</span></>} delta="78%" deltaTone="ok"   sparkline={spark2} sparkColor="var(--ink-3)" footer="Idle 412 · On-trip 232" />
          <KpiCard kicker="Today's bookings"  value="8,206"    delta="+6.4%" deltaTone="ok"   sparkline={spark4} sparkColor="var(--ink-3)" footer="vs. last Wed" />
          <KpiCard kicker="Today's GBV"       value="₹14.2 L"  delta="+8.1%" deltaTone="ok"   sparkline={spark2} sparkColor="var(--accent)" footer="Net ₹11.6 L after commission" />
          <KpiCard kicker="Completed"         value="7,138"    delta="87.0%" deltaTone="ok"   sparkline={spark3} sparkColor="var(--ink-3)" footer="of all booked today" />
          <KpiCard kicker="Cancel rate"       value="4.8%"     delta="+0.6"  deltaTone="warn" sparkline={spark5} sparkColor="var(--warn)" footer="Customer 3.2 · Driver 1.6" />
          <KpiCard kicker="Pickup ETA"        value="4:12"     delta="−0:08" deltaTone="ok"   sparkline={spark6} sparkColor="var(--ink-3)" footer="Median · all classes" />
          <KpiCard kicker="Active operators"  value="18 / 22"  delta="−1"    deltaTone="danger" sparkline={spark3} sparkColor="var(--danger)" footer="BlueSky · paused" />
        </div>

        {/* Map + Alerts */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1fr', gap: 16, minHeight: 0 }}>
          {/* Map */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div className="t-label">Live operations · Bengaluru</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  Drivers and active trips
                  <span style={{ marginLeft: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                    · streaming
                  </span>
                  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', marginLeft: 6, boxShadow: '0 0 0 3px var(--accent-soft)' }} />
                </h3>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn sm ghost"><Icon name="refresh" size={12} />Refresh</button>
                <button className="btn sm"><Icon name="external" size={12} />Open full map</button>
              </div>
            </div>
            <div style={{ flex: 1, position: 'relative', minHeight: 340 }}>
              <CityMap markers={markers} routes={routes} showLegend={true} />
              {/* corner stats */}
              <div style={{
                position: 'absolute', top: 14, right: 14,
                background: 'var(--surface)',
                border: '1px solid var(--rule)',
                padding: '10px 14px',
                display: 'flex',
                gap: 18,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
              }}>
                <div><div className="t-label" style={{ padding: 0 }}>Online</div><div style={{ color: 'var(--ink)', marginTop: 3 }}>1,184</div></div>
                <div><div className="t-label" style={{ padding: 0 }}>On trip</div><div style={{ color: 'var(--accent)', marginTop: 3 }}>232</div></div>
                <div><div className="t-label" style={{ padding: 0 }}>Pickup</div><div style={{ color: 'var(--warn)', marginTop: 3 }}>61</div></div>
                <div><div className="t-label" style={{ padding: 0 }}>Air</div><div style={{ color: 'var(--ink)', marginTop: 3 }}>15</div></div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div className="t-label">Exceptions · last 4h</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                  Needs your attention <span style={{ color: 'var(--danger)' }}>· 2</span>
                </h3>
              </div>
              <button className="btn sm ghost">View all</button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {alerts.map((a, i) => (
                <div key={i} style={{
                  padding: '14px 18px',
                  borderBottom: i < alerts.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                }}>
                  <span className={'dot ' + a.sev} style={{ marginTop: 6 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{a.t}</div>
                      <div className="t-meta" style={{ flexShrink: 0 }}>{a.age}</div>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.4 }}>{a.m}</div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="t-meta" style={{ color: 'var(--ink-2)' }}>{a.module} →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trends + Live bookings */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1fr', gap: 16 }}>
          {/* Trends */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div className="t-label">Bookings & revenue · last 14 days</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>The rolling fortnight</h3>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 2, background: 'var(--ink)' }} /> Bookings</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 2, background: 'var(--accent)', borderTop: '1px dashed var(--accent)' }} /> Revenue</span>
              </div>
            </div>
            <div style={{ padding: '12px 18px 16px', height: 220 }}>
              <TrendChart />
            </div>
          </div>

          {/* Live bookings list */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div className="t-label">In progress · now</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Live bookings</h3>
              </div>
              <button className="btn sm ghost">All →</button>
            </div>
            <div>
              {liveBookings.map((b, i) => (
                <div key={b.id} style={{
                  padding: '12px 18px',
                  borderBottom: i < liveBookings.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)' }}>{b.id}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>· {b.svc}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.route}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.10em', textTransform: 'uppercase',
                      color: b.status === 'on-trip' ? 'var(--accent)' :
                             b.status === 'pickup' ? 'var(--warn)' :
                             b.status === 'boarding' ? 'var(--info)' :
                             b.status === 'departed' ? 'var(--ink-2)' : 'var(--ink-3)',
                    }}>{b.status}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)', marginTop: 3 }}>ETA {b.eta} · {b.fare}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// Trend chart — bookings (solid) + revenue (dashed)
function TrendChart() {
  const days = 14;
  const bookings = [6200,6800,7100,6900,7400,8100,7800,8000,8300,7900,8200,8800,8500,8206];
  const revenue  = [10.8,11.5,12.0,11.4,12.8,13.6,13.1,13.5,13.9,13.4,13.8,14.6,14.0,14.2];

  const w = 880, h = 200, padX = 36, padT = 14, padB = 30;

  const bMin = 5800, bMax = 9000;
  const rMin = 10,   rMax = 15;

  const xAt = i => padX + (i / (days - 1)) * (w - padX - 20);
  const bY = v => padT + (1 - (v - bMin) / (bMax - bMin)) * (h - padT - padB);
  const rY = v => padT + (1 - (v - rMin) / (rMax - rMin)) * (h - padT - padB);

  const bPath = bookings.map((v, i) => (i ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + bY(v).toFixed(1)).join(' ');
  const rPath = revenue.map((v, i)  => (i ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + rY(v).toFixed(1)).join(' ');
  const bFill = bPath + ` L${xAt(days-1)} ${h-padB} L${padX} ${h-padB} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      {/* y-grid */}
      {[0, 1, 2, 3, 4].map(i => {
        const y = padT + (i / 4) * (h - padT - padB);
        return <line key={i} x1={padX} x2={w - 20} y1={y} y2={y} stroke="var(--rule-soft)" strokeWidth="1" />;
      })}
      {/* x ticks */}
      {bookings.map((_, i) => i % 2 === 0 && (
        <text key={i} x={xAt(i)} y={h - 10} textAnchor="middle"
              fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono', letterSpacing: '0.06em' }}>
          {['08','10','12','14','16','18','20','21'][i / 2] || ''}M
        </text>
      ))}
      {/* y labels left */}
      {['9.0K','8.0K','7.0K','6.0K'].map((l, i) => (
        <text key={l} x={padX - 8} y={padT + (i+1) * ((h - padT - padB) / 4) + 3} textAnchor="end"
              fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono' }}>{l}</text>
      ))}
      {/* y labels right (revenue ₹L) */}
      {['15','13','12','10'].map((l, i) => (
        <text key={l} x={w - 12} y={padT + i * ((h - padT - padB) / 3) + 3} textAnchor="start"
              fill="var(--accent)" style={{ font: '10px IBM Plex Mono' }}>₹{l}L</text>
      ))}
      {/* bookings */}
      <path d={bFill} fill="var(--ink)" opacity="0.05" />
      <path d={bPath} fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* revenue */}
      <path d={rPath} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />
      {/* end markers */}
      <circle cx={xAt(days-1)} cy={bY(bookings[days-1])} r="4" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.6" />
      <circle cx={xAt(days-1)} cy={rY(revenue[days-1])} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.6" />
      {/* today label */}
      <line x1={xAt(days-1)} x2={xAt(days-1)} y1={padT} y2={h - padB} stroke="var(--rule-strong)" strokeWidth="0.8" strokeDasharray="2 3" />
      <text x={xAt(days-1)} y={padT - 4} textAnchor="end" fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono', letterSpacing: '0.10em' }}>TODAY</text>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// 2.2 — Live Operations Map (full screen)
// ──────────────────────────────────────────────────────────────
function LiveMapScreen() {
  const markers = [
    { x: 130, y: 140, kind: 'on-trip' }, { x: 180, y: 230, kind: 'idle' },
    { x: 240, y: 320, kind: 'pickup' }, { x: 310, y: 180, kind: 'on-trip' },
    { x: 380, y: 260, kind: 'on-trip' }, { x: 420, y: 360, kind: 'idle' },
    { x: 510, y: 200, kind: 'on-trip' }, { x: 560, y: 140, kind: 'pickup' },
    { x: 600, y: 300, kind: 'on-trip' }, { x: 660, y: 240, kind: 'idle' },
    { x: 700, y: 380, kind: 'on-trip' }, { x: 470, y: 100, kind: 'air', rot: 40 },
    { x: 280, y: 60,  kind: 'air', rot: -20 }, { x: 90,  y: 350, kind: 'on-trip' },
    { x: 720, y: 80,  kind: 'idle' }, { x: 150, y: 280, kind: 'on-trip' },
    { x: 340, y: 380, kind: 'on-trip' }, { x: 520, y: 360, kind: 'pickup' },
    { x: 220, y: 120, kind: 'idle' }, { x: 410, y: 220, kind: 'on-trip' },
    { x: 580, y: 250, kind: 'idle' }, { x: 650, y: 160, kind: 'pickup' },
    { x: 100, y: 200, kind: 'on-trip' }, { x: 200, y: 380, kind: 'idle' },
    { x: 330, y: 130, kind: 'on-trip' }, { x: 450, y: 320, kind: 'idle' },
    { x: 570, y: 80,  kind: 'on-trip' }, { x: 670, y: 320, kind: 'on-trip' },
  ];
  const routes = [
    { path: 'M130 140 Q200 180 310 180', start: [130,140], end: [310,180] },
    { path: 'M240 320 Q300 280 380 260', start: [240,320], end: [380,260] },
    { path: 'M510 200 Q580 250 600 300', start: [510,200], end: [600,300] },
    { path: 'M700 380 Q620 360 560 320', start: [700,380], end: [560,320] },
    { path: 'M90 350 Q150 320 200 380',  start: [90,350],  end: [200,380] },
    { path: 'M340 380 Q400 330 450 320', start: [340,380], end: [450,320] },
    { path: 'M280 60  Q360 80 470 100',  start: [280,60],  end: [470,100] },
  ];
  const zones = [
    { points: '60 60 240 50 280 200 100 240', stroke: 'var(--accent)' },
    { points: '420 80 600 70 640 200 460 220', stroke: 'var(--info)' },
    { points: '180 280 380 300 380 440 180 440', stroke: 'var(--warn)' },
  ];

  return (
    <Shell
      active="dashboard"
      breadcrumb="Operations · Live · Full map"
      title="Live operations · map"
      subtitle="Bengaluru · streaming · 1,184 drivers online"
      actions={
        <>
          <button className="btn sm ghost"><Icon name="filter" size={13} />Filters</button>
          <button className="btn sm"><Icon name="external" size={13} />Open in dispatch</button>
        </>
      }
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <CityMap markers={markers} routes={routes} zones={zones} showLegend={false} />
        </div>

        {/* top filter floating bar */}
        <div style={{
          position: 'absolute',
          top: 16, left: 16, right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          boxShadow: 'var(--shadow-2)',
        }}>
          <span className="t-label" style={{ padding: 0 }}>Filter</span>
          <span style={{ width: 1, height: 18, background: 'var(--rule)' }} />
          <FilterChip label="Service" value="Road · Air" count={2} />
          <FilterChip label="Zone" value="All 12 zones" />
          <FilterChip label="Vehicle class" value="All" />
          <FilterChip label="Status" value="Online · Idle · On trip" count={3} />
          <div style={{ flex: 1 }} />
          <div className="input" style={{ width: 220, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Find driver, booking, plate…" />
          </div>
          <div style={{ display: 'inline-flex', border: '1px solid var(--rule-strong)', borderRadius: 3 }}>
            <button className="btn sm ghost" style={{ height: 28, borderRadius: 0, borderRight: '1px solid var(--rule)', background: 'var(--surface-sunk)', padding: '0 10px', color: 'var(--ink)' }}>Heat</button>
            <button className="btn sm ghost" style={{ height: 28, borderRadius: 0, borderRight: '1px solid var(--rule)', padding: '0 10px' }}>Cluster</button>
            <button className="btn sm ghost" style={{ height: 28, borderRadius: 0, padding: '0 10px' }}>Routes</button>
          </div>
        </div>

        {/* zone label tags on map */}
        <div style={{ position: 'absolute', top: 130, left: 180, color: 'var(--accent-ink)' }} className="t-label">
          <span style={{ background: 'var(--surface)', padding: '4px 8px', border: '1px solid color-mix(in oklab, var(--accent) 24%, var(--rule-strong))' }}>Z-N4 · Indiranagar</span>
        </div>
        <div style={{ position: 'absolute', top: 140, left: 920, color: 'var(--info)' }} className="t-label">
          <span style={{ background: 'var(--surface)', padding: '4px 8px', border: '1px solid color-mix(in oklab, var(--info) 24%, var(--rule-strong))' }}>Z-E2 · Whitefield</span>
        </div>
        <div style={{ position: 'absolute', top: 480, left: 450, color: 'var(--warn)' }} className="t-label">
          <span style={{ background: 'var(--surface)', padding: '4px 8px', border: '1px solid color-mix(in oklab, var(--warn) 24%, var(--rule-strong))' }}>Z-S1 · HSR · surge 1.6×</span>
        </div>

        {/* left side stats column */}
        <div style={{
          position: 'absolute',
          left: 16,
          top: 84,
          bottom: 16,
          width: 280,
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          boxShadow: 'var(--shadow-2)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Live state · Bengaluru</div>
            <div style={{
              marginTop: 8,
              fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em',
            }}>1,184 <span style={{ fontSize: 16, color: 'var(--ink-3)' }}>online</span></div>
            <div className="t-meta" style={{ marginTop: 4 }}>Of <span style={{ color: 'var(--ink-2)' }}>1,520</span> approved · 77.9%</div>
          </div>
          <div style={{ padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
            {[
              ['On trip',  '232', 'var(--accent)'],
              ['Idle',     '892', 'var(--info)'],
              ['Pickup',   '61',  'var(--warn)'],
              ['Air · flying',  '15',  'var(--ink)'],
              ['Air · ground',  '7',   'var(--ink-3)'],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px' }}>
                <span className="dot" style={{ background: c, boxShadow: `0 0 0 3px color-mix(in oklab, ${c} 14%, transparent)` }} />
                <span style={{ flex: 1, fontSize: 13 }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Demand vs supply · last 5m</div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Indiranagar', 1.0, 'var(--accent)'],
                ['HSR Layout',  1.6, 'var(--warn)'],
                ['Whitefield',  1.1, 'var(--info)'],
                ['Koramangala', 1.3, 'var(--warn)'],
                ['Bommanahalli',0.9, 'var(--ink-3)'],
              ].map(([z, m, c]) => (
                <div key={z} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: '0 0 96px', fontSize: 12 }}>{z}</span>
                  <div style={{ flex: 1, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: (m / 2) * 100 + '%', height: '100%', background: c }} />
                  </div>
                  <span style={{ flex: '0 0 36px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: c }}>{m.toFixed(1)}×</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div className="t-label" style={{ padding: '12px 16px 6px' }}>Recent exceptions</div>
            {[
              { sev: 'danger', t: 'Dispatch failure', m: 'Whitefield · 3 stuck',  age: '2m' },
              { sev: 'warn',   t: 'Surge cap hit',    m: 'HSR · 1.8×',            age: '22m' },
              { sev: 'info',   t: 'Air slot delayed', m: 'BLR→MYS · 14m',         age: '38m' },
            ].map((a, i) => (
              <div key={i} style={{ padding: '8px 16px', display: 'flex', gap: 10, borderBottom: '1px solid var(--rule-soft)' }}>
                <span className={'dot ' + a.sev} style={{ marginTop: 5 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.t}</span><span className="t-meta">{a.age}</span>
                  </div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{a.m}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* right side — selected trip detail */}
        <div style={{
          position: 'absolute',
          right: 16,
          top: 84,
          width: 320,
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          boxShadow: 'var(--shadow-2)',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div className="t-label">Booking · live</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)', marginTop: 4 }}>AC-92F8311</div>
            </div>
            <span className="badge ok"><span className="dot ok" />On trip</span>
          </div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ marginTop: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink)' }} />
                <div style={{ width: 1, height: 24, background: 'var(--rule-strong)', margin: '4px 4px' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--ink)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>100 Ft Rd, Indiranagar</div>
                <div className="t-meta" style={{ marginTop: 2 }}>Pickup · 15:34</div>
                <div style={{ marginTop: 14, fontSize: 13, color: 'var(--ink)' }}>Kempegowda Intl · T2 Departures</div>
                <div className="t-meta" style={{ marginTop: 2 }}>Drop · ETA 16:08 · 38.4 km</div>
              </div>
            </div>
          </div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar lg" style={{ background: 'var(--surface-sunk)' }}>RM</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>Ravi Mahesh · 4.92<span style={{ color: 'var(--ink-3)' }}> ★ </span></div>
                <div className="t-meta" style={{ marginTop: 2 }}>Sedan · KA 05 MK 4271</div>
              </div>
              <button className="btn icon sm" title="Call"><Icon name="phone" size={13} /></button>
            </div>
          </div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Estimate', '₹1,240'],
              ['Distance', '38.4 km'],
              ['Duration', '34 min'],
              ['Surge',    '1.1×'],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
            <button className="btn sm" style={{ flex: 1 }}>Reassign</button>
            <button className="btn sm" style={{ flex: 1 }}>Message</button>
            <button className="btn sm danger" style={{ flex: 1 }}>Cancel</button>
          </div>
        </div>

        {/* bottom legend bar */}
        <div style={{
          position: 'absolute',
          bottom: 16, left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          padding: '8px 14px',
          display: 'flex', gap: 18,
          boxShadow: 'var(--shadow-2)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}>
          {[
            { c: 'var(--accent)', l: 'On trip · 232' },
            { c: 'var(--info)',   l: 'Idle · 892' },
            { c: 'var(--warn)',   l: 'Pickup · 61' },
            { c: 'var(--ink)',    l: 'Air · 22' },
          ].map((it, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span className="dot" style={{ background: it.c }} />
              <span>{it.l}</span>
            </span>
          ))}
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, {
  DashboardScreen, LiveMapScreen,
  Sparkline, KpiCard, CityMap, TrendChart,
});
