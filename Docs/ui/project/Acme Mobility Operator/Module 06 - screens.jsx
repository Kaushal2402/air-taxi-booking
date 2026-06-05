/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 06 — Day-of-Flight
   6.1a  Live operations overview — 4 active flights, event log
   6.1b  Delay state — BKG-0590 flagged, notification workflow
   6.2   Flight detail — BKG-0590 in-air, crew comms, manifest
   ───────────────────────────────────────────────────────────── */

// ─── Tiny route arrow ─────────────────────────────────────────
function RouteLabel({ from, to, style: s }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, ...s }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.06em', color: 'var(--ink-2)' }}>{from}</span>
      <Icon name="arrowRight" size={9} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.06em', color: 'var(--ink-2)' }}>{to}</span>
    </div>
  );
}

// ─── Flight status pill ───────────────────────────────────────
function FlightStatus({ status }) {
  const map = {
    'In-air':    'info',
    'Boarding':  'warn',
    'Landed':    'ok',
    'Delayed':   'danger',
    'Scheduled': 'pending',
    'Diverted':  'danger',
  };
  const tone = map[status] || 'pending';
  return (
    <span className={`badge ${tone}`} style={{ height: 20, fontSize: 10.5, flexShrink: 0 }}>
      <span className={`dot ${tone}`} />{status}
    </span>
  );
}

// ─── Progress bar (flight path) ───────────────────────────────
function FlightProgress({ pct, tone = 'info' }) {
  const colors = { info: 'var(--info)', ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)' };
  return (
    <div style={{ position: 'relative', height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'visible' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: colors[tone], borderRadius: 2 }} />
      <div style={{
        position: 'absolute', top: -5, left: `${pct}%`, transform: 'translateX(-50%)',
        width: 14, height: 14, borderRadius: '50%',
        background: colors[tone], border: '2px solid var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="plane" size={7} style={{ color: '#fff' }} />
      </div>
    </div>
  );
}

// ─── Active flight card ───────────────────────────────────────
function ActiveFlightCard({ f, wide }) {
  return (
    <div style={{
      flex: wide ? '0 0 340px' : '1',
      minWidth: 260,
      padding: '14px 16px',
      background: f.tone === 'danger' ? 'color-mix(in oklab,var(--danger) 6%,var(--surface))' : 'var(--surface)',
      border: `1.5px solid ${f.tone === 'danger' ? 'color-mix(in oklab,var(--danger) 30%,var(--rule))' : 'var(--rule)'}`,
      borderRadius: 4,
      display: 'flex', flexDirection: 'column', gap: 10,
      cursor: 'pointer',
    }}>
      {/* header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>{f.ref}</span>
        <span className="t-meta" style={{ fontSize: 10.5 }}>{f.reg} · {f.type}</span>
        <div style={{ flex: 1 }} />
        <FlightStatus status={f.status} />
      </div>
      {/* route */}
      <RouteLabel from={f.from} to={f.to} />
      {/* progress */}
      <FlightProgress pct={f.pct} tone={f.tone === 'danger' ? 'danger' : f.status === 'In-air' ? 'info' : f.status === 'Landed' ? 'ok' : 'warn'} />
      {/* times */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="t-meta" style={{ fontSize: 10 }}>Departed</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)', marginTop: 2 }}>{f.dep}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="t-meta" style={{ fontSize: 10 }}>{f.status === 'Landed' ? 'Landed' : f.tone === 'danger' ? 'New ETA' : 'ETA'}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: f.tone === 'danger' ? 'var(--danger)' : 'var(--ink-2)', marginTop: 2 }}>{f.eta}</div>
        </div>
      </div>
      {/* crew */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6, borderTop: '1px solid var(--rule-soft)' }}>
        <Icon name="user" size={11} style={{ color: 'var(--ink-4)' }} />
        <span className="t-meta" style={{ fontSize: 11 }}>{f.crew}</span>
        <div style={{ flex: 1 }} />
        <button className="btn sm icon" style={{ height: 24, width: 24 }}><Icon name="phone" size={11} /></button>
        <button className="btn sm icon" style={{ height: 24, width: 24 }}><Icon name="envelope" size={11} /></button>
      </div>
      {f.alert && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '7px 9px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab,var(--danger) 25%,var(--rule))', borderRadius: 2 }}>
          <Icon name="alert" size={12} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11.5, color: 'var(--danger)', lineHeight: 1.4 }}>{f.alert}</span>
        </div>
      )}
    </div>
  );
}

// ─── Event log row ────────────────────────────────────────────
function EventRow({ time, flightRef: r, type, msg, tone, last }) {
  const toneMap = { info: 'var(--info)', ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)', neutral: 'var(--ink-4)' };
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: last ? 'none' : '1px solid var(--rule-soft)', alignItems: 'flex-start' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.04em', whiteSpace: 'nowrap', marginTop: 1, width: 42, flexShrink: 0 }}>{time}</span>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: toneMap[tone] || 'var(--ink-4)', flexShrink: 0, marginTop: 4 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.05em', color: 'var(--ink-3)', fontWeight: 500 }}>{r}</span>
          <span style={{ fontSize: 10, color: 'var(--ink-4)', background: 'var(--surface-2)', border: '1px solid var(--rule)', padding: '0 5px', borderRadius: 2, height: 16, display: 'flex', alignItems: 'center' }}>{type}</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{msg}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6.1 — Day-of-Flight Overview
// ─────────────────────────────────────────────────────────────
function DayOfFlightScreen({ variant = 'normal' }) {
  const isDelay = variant === 'delay';

  const flights = [
    {
      ref: 'BKG-0590', reg: 'VT-HXB', type: 'AS350 B3',
      from: 'MUM Juhu', to: 'GOA North',
      status: isDelay ? 'Delayed' : 'In-air',
      pct: isDelay ? 38 : 62, dep: '09:10', eta: isDelay ? '12:45 (+40m)' : '11:52',
      crew: 'Capt. D. Iyer · F/O P. Nair',
      tone: isDelay ? 'danger' : 'ok',
      alert: isDelay ? 'ATC holding over Pen VOR — 40 min delay. Passengers notified?' : null,
    },
    {
      ref: 'BKG-0601', reg: 'VT-HXE', type: 'AW169',
      from: 'MUM Juhu', to: 'DEL Safdarjung',
      status: 'In-air', pct: 28, dep: '11:10', eta: '14:35',
      crew: 'Capt. R. Sharma · F/O K. Mehta',
      tone: 'ok', alert: null,
    },
    {
      ref: 'BKG-0594', reg: 'VT-HXD', type: 'EC135 T2',
      from: 'MUM Juhu', to: 'Shirdi',
      status: 'Boarding', pct: 0, dep: 'ETD 13:00', eta: 'ETA 14:20',
      crew: 'Capt. A. Pillai · F/O S. Patil',
      tone: 'ok', alert: null,
    },
    {
      ref: 'BKG-0583', reg: 'VT-HXD', type: 'EC135 T2',
      from: 'MUM Juhu', to: 'Pune',
      status: 'Landed', pct: 100, dep: '06:30', eta: '07:55',
      crew: 'Capt. A. Pillai · F/O S. Patil',
      tone: 'ok', alert: null,
    },
  ];

  const events = isDelay ? [
    { time: '10:48', ref: 'BKG-0590', type: 'ATC', msg: 'Holding instruction issued by Mumbai Approach over Pen VOR. ETA revised to 12:45.', tone: 'danger' },
    { time: '10:45', ref: 'BKG-0590', type: 'ACARS', msg: 'Crew reports smooth flight; ATC hold due to inbound traffic congestion at Goa North.', tone: 'warn' },
    { time: '10:42', ref: 'BKG-0601', type: 'ACARS', msg: 'Departed MUM Juhu 11:10. Cruise FL045, ETA DEL Safdarjung 14:35.', tone: 'info' },
    { time: '10:30', ref: 'BKG-0594', type: 'OPS', msg: 'Ground handling confirmed at Shirdi. Passengers checking in at Juhu FBO.', tone: 'neutral' },
    { time: '09:10', ref: 'BKG-0590', type: 'OPS', msg: 'BKG-0590 departed MUM Juhu on schedule.', tone: 'ok' },
    { time: '08:02', ref: 'BKG-0583', type: 'OPS', msg: 'BKG-0583 landed Pune on schedule. Passengers disembarked.', tone: 'ok' },
    { time: '06:30', ref: 'BKG-0583', type: 'OPS', msg: 'BKG-0583 departed MUM Juhu on schedule.', tone: 'ok' },
  ] : [
    { time: '10:42', ref: 'BKG-0601', type: 'ACARS', msg: 'Departed MUM Juhu 11:10. Cruise FL045, ETA DEL Safdarjung 14:35.', tone: 'info' },
    { time: '10:30', ref: 'BKG-0594', type: 'OPS', msg: 'Ground handling confirmed at Shirdi. Passengers checking in at Juhu FBO.', tone: 'neutral' },
    { time: '10:12', ref: 'BKG-0590', type: 'ACARS', msg: 'En route MUM→GOA, FL030. All nominal.', tone: 'info' },
    { time: '09:10', ref: 'BKG-0590', type: 'OPS', msg: 'BKG-0590 departed MUM Juhu on schedule.', tone: 'ok' },
    { time: '08:02', ref: 'BKG-0583', type: 'OPS', msg: 'BKG-0583 landed Pune on schedule. Passengers disembarked.', tone: 'ok' },
    { time: '06:30', ref: 'BKG-0583', type: 'OPS', msg: 'BKG-0583 departed MUM Juhu on schedule.', tone: 'ok' },
  ];

  return (
    <Shell
      active="dayof"
      breadcrumb="Operations"
      title="Day-of-Flight"
      subtitle={`Helix Aviation · 5 Jun 2026 · ${isDelay ? '1 delay · ' : ''}4 flights scheduled · 10:42 IST`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm"><Icon name="refresh" size={12} />Refresh</button>
          <button className="btn sm"><Icon name="download" size={12} />Export log</button>
        </div>
      }
    >
      {/* delay banner */}
      {isDelay && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 42, background: 'var(--danger-soft)', borderBottom: '1px solid color-mix(in oklab,var(--danger) 24%,var(--rule))', flexShrink: 0 }}>
          <Icon name="alert" size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 500 }}>BKG-0590 delayed 40 min</span>
          <span style={{ width: 1, height: 14, background: 'color-mix(in oklab,var(--danger) 28%,var(--rule))' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>ATC hold over Pen VOR. New ETA Goa 12:45. Passenger notification pending.</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm accent" style={{ height: 28 }}><Icon name="envelope" size={12} />Notify passengers</button>
          <button className="btn sm danger" style={{ height: 28 }}>Log delay →</button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

        {/* active flight cards */}
        <div style={{ flexShrink: 0, padding: '16px 24px', borderBottom: '1px solid var(--rule)', background: 'var(--surface-2)' }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Active flights today</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
            {flights.map(f => <ActiveFlightCard key={f.ref} f={f} wide />)}
          </div>
        </div>

        {/* bottom: map placeholder + event log */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* map area */}
          <div style={{ flex: 1, borderRight: '1px solid var(--rule)', position: 'relative', background: 'var(--surface-sunk)', overflow: 'hidden' }}>
            {/* India outline SVG (simplified) */}
            <svg viewBox="0 0 520 600" style={{ width: '100%', height: '100%', opacity: 0.18 }}>
              <path d="M180,20 L320,15 L400,80 L430,160 L410,260 L370,320 L300,420 L260,500 L230,520 L200,460 L160,360 L120,280 L100,180 L130,80 Z" fill="none" stroke="var(--ink)" strokeWidth="2" />
            </svg>
            {/* flight paths */}
            <svg viewBox="0 0 520 600" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              {/* MUM→GOA */}
              <line x1="178" y1="280" x2="160" y2="360" stroke={isDelay ? 'var(--danger)' : 'var(--info)'} strokeWidth="1.5" strokeDasharray="5,3" />
              {/* aircraft dot MUM→GOA */}
              <circle cx={isDelay ? 170 : 165} cy={isDelay ? 310 : 328} r="5" fill={isDelay ? 'var(--danger)' : 'var(--info)'} />
              {/* MUM→DEL */}
              <line x1="178" y1="280" x2="240" y2="60" stroke="var(--ok)" strokeWidth="1.5" strokeDasharray="5,3" />
              {/* aircraft dot MUM→DEL (28% along) */}
              <circle cx="195" cy="219" r="5" fill="var(--ok)" />
              {/* city dots */}
              {[
                [178,280,'MUM'],[165,345,'GOA'],[240,60,'DEL'],
                [250,190,'AGR'],[230,310,'HYD'],[310,260,'BLR'],
              ].map(([x,y,label]) => (
                <g key={label}>
                  <circle cx={x} cy={y} r="3.5" fill="none" stroke="var(--ink-3)" strokeWidth="1" />
                  <text x={x+7} y={y+4} fontFamily="monospace" fontSize="9" fill="var(--ink-4)" letterSpacing="0.06em">{label}</text>
                </g>
              ))}
            </svg>
            {/* map label */}
            <div style={{ position: 'absolute', top: 12, left: 12 }}>
              <span className="t-label" style={{ fontSize: 10 }}>Route map — 5 Jun 2026</span>
            </div>
            {/* legend */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 5, background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 3, padding: '8px 10px' }}>
              {[
                { color: isDelay ? 'var(--danger)' : 'var(--info)', label: 'BKG-0590 · In-air' + (isDelay ? ' (delayed)' : '') },
                { color: 'var(--ok)',   label: 'BKG-0601 · In-air' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 18, height: 2, background: l.color, borderRadius: 1 }} />
                  <span style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* event log */}
          <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', background: 'var(--surface)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="t-label">Event log</span>
              <div style={{ flex: 1 }} />
              <button className="btn sm icon"><Icon name="filter" size={11} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px' }}>
              {events.map((e, i) => (
                <EventRow key={i} flightRef={e.ref} time={e.time} type={e.type} msg={e.msg} tone={e.tone} last={i === events.length - 1} />
              ))}
            </div>
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--rule)', background: 'var(--surface)', flexShrink: 0 }}>
              <div className="input" style={{ height: 32 }}>
                <input placeholder="Add ops note…" style={{ flex: 1 }} />
                <button className="btn sm accent" style={{ height: 24, borderRadius: 2 }}>Log</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 6.2 — Flight Detail (BKG-0590 · AS350 · MUM→GOA)
// ─────────────────────────────────────────────────────────────
function FlightDetailScreen() {
  const flight = {
    ref: 'BKG-0590', reg: 'VT-HXB', type: 'AS350 B3',
    from: 'MUM Juhu', to: 'GOA North Helipad',
    status: 'In-air', dep: '09:10 IST', eta: '11:52 IST',
    captain: 'Capt. Devraj Iyer', fo: 'F/O P. Nair',
    pax: 4, kg: 95, altitude: 'FL032', speed: '225 km/h', heading: '187°',
    lastAcars: '10:12',
  };

  return (
    <Shell
      active="dayof"
      breadcrumb="Day-of-Flight / BKG-0590"
      title="BKG-0590 — AS350 B3 · MUM → GOA"
      subtitle={`VT-HXB · Capt. D. Iyer · Departed 09:10 · ETA 11:52 IST`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" style={{ height: 32, color: 'var(--ink-3)' }}>
            <Icon name="arrowRight" size={12} style={{ transform: 'rotate(180deg)' }} />Back
          </button>
          <button className="btn sm danger" style={{ height: 32 }}><Icon name="alert" size={12} />Log incident</button>
          <button className="btn sm" style={{ height: 32 }}><Icon name="phone" size={12} />Call crew</button>
        </div>
      }
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left: map + flight data ───────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--rule)', overflow: 'hidden' }}>

          {/* map */}
          <div style={{ flex: 1, position: 'relative', background: 'var(--surface-sunk)', overflow: 'hidden' }}>
            <svg viewBox="0 0 460 420" style={{ width: '100%', height: '100%', opacity: 0.15 }}>
              <path d="M80,30 L280,20 L340,100 L360,200 L330,310 L260,390 L200,400 L160,340 L100,250 L70,150 Z" fill="none" stroke="var(--ink)" strokeWidth="2" />
            </svg>
            <svg viewBox="0 0 460 420" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              {/* route line */}
              <line x1="155" y1="220" x2="120" y2="310" stroke="var(--info)" strokeWidth="2" strokeDasharray="6,4" />
              {/* completed segment */}
              <line x1="155" y1="220" x2="140" y2="270" stroke="var(--info)" strokeWidth="2.5" />
              {/* aircraft */}
              <circle cx="140" cy="270" r="7" fill="var(--info)" />
              <text x="150" y="268" fontFamily="monospace" fontSize="10" fill="var(--info)" fontWeight="600">VT-HXB</text>
              {/* origin / dest */}
              <circle cx="155" cy="220" r="4" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" />
              <text x="163" y="224" fontFamily="monospace" fontSize="9" fill="var(--ink-4)" letterSpacing="0.04em">MUM</text>
              <circle cx="120" cy="310" r="4" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" />
              <text x="128" y="314" fontFamily="monospace" fontSize="9" fill="var(--ink-4)" letterSpacing="0.04em">GOA</text>
              {/* distance marker */}
              <text x="126" y="252" fontFamily="monospace" fontSize="8" fill="var(--ink-4)">62%</text>
            </svg>
            <div style={{ position: 'absolute', top: 12, left: 14 }}>
              <FlightStatus status="In-air" />
            </div>
          </div>

          {/* telemetry strip */}
          <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)', display: 'flex', gap: 0 }}>
            {[
              { label: 'Altitude',   value: 'FL032',    sub: '~975 m' },
              { label: 'Speed',      value: '225 km/h', sub: 'GS' },
              { label: 'Heading',    value: '187°',     sub: 'South-SW' },
              { label: 'Last ACARS', value: '10:12 IST', sub: '30 min ago' },
              { label: 'ETA',        value: '11:52 IST', sub: '~70 min' },
            ].map((t, i, arr) => (
              <div key={t.label} style={{ flex: 1, paddingLeft: i > 0 ? 16 : 0, borderLeft: i > 0 ? '1px solid var(--rule)' : 'none', marginLeft: i > 0 ? 16 : 0 }}>
                <div className="t-label" style={{ marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)', letterSpacing: '0.04em' }}>{t.value}</div>
                <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>{t.sub}</div>
              </div>
            ))}
          </div>

          {/* progress bar */}
          <div style={{ padding: '12px 20px 14px', borderTop: '1px solid var(--rule)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="t-meta" style={{ fontSize: 11 }}>MUM Juhu</span>
              <span className="t-meta" style={{ fontSize: 11 }}>GOA North Helipad</span>
            </div>
            <FlightProgress pct={62} tone="info" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span className="t-meta" style={{ fontSize: 10.5 }}>Departed 09:10</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>62% complete · ~70 min remaining</span>
              <span className="t-meta" style={{ fontSize: 10.5 }}>ETA 11:52</span>
            </div>
          </div>
        </div>

        {/* ── Right: manifest + comms ───────────────────── */}
        <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* manifest */}
          <div style={{ flexShrink: 0, padding: '16px 16px 12px', borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
            <div className="t-label" style={{ marginBottom: 10 }}>Passenger manifest</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { name: 'Mrs. Preeti Sharma',    seat: 'P1', note: 'Lead passenger', verified: true },
                { name: 'Mr. Rahul Sharma',      seat: 'P2', note: '',               verified: true },
                { name: 'Ms. Ananya Sharma',     seat: 'P3', note: 'Minor (16)',      verified: true },
                { name: 'Mr. Vijay Menon',       seat: 'P4', note: 'Security escort', verified: true },
              ].map((p, i, arr) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < arr.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', width: 24, flexShrink: 0 }}>{p.seat}</span>
                  <div className="avatar" style={{ width: 26, height: 26, fontSize: 10, flexShrink: 0 }}>{p.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    {p.note && <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>{p.note}</div>}
                  </div>
                  {p.verified && <Icon name="check" size={12} style={{ color: 'var(--ok)', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--rule-soft)' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--ink)', fontWeight: 600 }}>4</div>
                <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>Passengers</div>
              </div>
              <div style={{ width: 1, background: 'var(--rule)' }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--ink)', fontWeight: 600 }}>95 kg</div>
                <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>Baggage</div>
              </div>
              <div style={{ width: 1, background: 'var(--rule)' }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--ok)', fontWeight: 600 }}>✓</div>
                <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>All checked</div>
              </div>
            </div>
          </div>

          {/* crew comms */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--rule)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="t-label">Crew communications</span>
              <div style={{ flex: 1 }} />
              <span className="t-meta" style={{ fontSize: 10.5 }}>Capt. D. Iyer · F/O P. Nair</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { from: 'OPS',         time: '09:05', msg: 'VT-HXB, all clear for departure. Have a good flight.', mine: true },
                { from: 'Capt. Iyer',  time: '09:06', msg: 'Roger, departing MUM Juhu. Manifest complete, 4 PAX aboard.', mine: false },
                { from: 'Capt. Iyer',  time: '10:12', msg: 'En route FL030, all nominal. ETA GOA 11:52.', mine: false },
                { from: 'OPS',         time: '10:14', msg: 'Acknowledged. Weather at GOA: VFR, light breeze. Ground handling standing by.', mine: true },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--ink-3)' }}>{m.from}</span>
                    <span className="t-meta" style={{ fontSize: 10 }}>{m.time}</span>
                  </div>
                  <div style={{ maxWidth: '85%', padding: '8px 11px', background: m.mine ? 'var(--accent-soft-2)' : 'var(--surface-2)', border: `1px solid ${m.mine ? 'color-mix(in oklab,var(--accent) 25%,var(--rule))' : 'var(--rule)'}`, borderRadius: 3, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                    {m.msg}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--rule)', background: 'var(--surface)', flexShrink: 0 }}>
              <div className="input" style={{ height: 32 }}>
                <input placeholder="Message crew…" style={{ flex: 1 }} />
                <button className="btn sm accent" style={{ height: 24, borderRadius: 2 }}>Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { DayOfFlightScreen, FlightDetailScreen });
