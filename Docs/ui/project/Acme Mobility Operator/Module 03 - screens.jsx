/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 03 — Operator Dashboard
   3.1  Dashboard Home — KPIs · action queue · upcoming flights
        fleet / crew availability · revenue trend
   Shared globals from components.jsx.
   ───────────────────────────────────────────────────────────── */

// ─── Gradient ID counter (stable per render) ─────────────────
let _gidSeq = 0;

// ─── Inline sparkline ─────────────────────────────────────────
function Sparkline({ data, color = '#0F8A5F', w = 68, h = 26 }) {
  const [gid] = React.useState(() => 'sk' + (_gidSeq++));
  if (!data || data.length < 2) return null;
  const lo = Math.min(...data), hi = Math.max(...data), rng = hi - lo || 1;
  const pts = data.map((v, i) => [
    +(i / (data.length - 1) * w).toFixed(1),
    +(h - 2 - (v - lo) / rng * (h - 6)).toFixed(1),
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

// ─── Full-width area chart (responsive, uses viewBox + non-scaling-stroke) ──
function AreaChart({ data, labels, color = '#0F8A5F', h = 64 }) {
  const [gid] = React.useState(() => 'ac' + (_gidSeq++));
  if (!data || data.length < 2) return null;
  const W = 1000;
  const lo = Math.min(...data) * 0.9, hi = Math.max(...data) * 1.06, rng = hi - lo || 1;
  const pts = data.map((v, i) => [
    +(i / (data.length - 1) * W).toFixed(1),
    +(h - (v - lo) / rng * (h - 6)).toFixed(1),
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const area = `${line} L${W} ${h} L0 ${h} Z`;
  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.20" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {labels && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          {labels.map((l, i) => (
            <span key={i} className="t-meta" style={{ fontSize: 9.5, color: i === labels.length - 1 ? 'var(--ink-2)' : 'var(--ink-4)' }}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── KPI stat card ────────────────────────────────────────────
const SPARK_COLORS = { ok: '#0F8A5F', warn: '#B57228', danger: '#B23A3A', info: '#3F6FB2' };
function StatCard({ label, value, sub, trend, tone, icon, spark, live }) {
  const sc = SPARK_COLORS[tone] || '#A39D8E';
  const tUp = trend && trend.charAt(0) === '+';
  const tDn = trend && trend.charAt(0) === '-';
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '14px 16px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {icon && <Icon name={icon} size={11} stroke={1.5} />}
          {label}
        </div>
        {live && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--info)' }}>
            <span className="dot info" style={{ width: 5, height: 5 }} />Live
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.022em', lineHeight: 1, color: tone ? `var(--${tone})` : 'var(--ink)' }}>{value}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            {trend && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', color: tUp ? 'var(--ok)' : tDn ? 'var(--danger)' : 'var(--ink-3)' }}>{trend}</span>}
            {sub && <span className="t-meta" style={{ fontSize: 10.5 }}>{sub}</span>}
          </div>
        </div>
        {spark && <Sparkline data={spark} color={sc} w={66} h={26} />}
      </div>
    </div>
  );
}

// ─── TTL countdown badge ──────────────────────────────────────
function TtlBadge({ label, urgent }) {
  const bg = urgent === 'danger' ? 'var(--danger-soft)' : urgent === 'warn' ? 'var(--warn-soft)' : 'var(--surface-2)';
  const bdr = urgent === 'danger' ? 'color-mix(in oklab,var(--danger) 28%,var(--rule))' : urgent === 'warn' ? 'color-mix(in oklab,var(--warn) 28%,var(--rule))' : 'var(--rule-strong)';
  const col = urgent === 'danger' ? 'var(--danger)' : urgent === 'warn' ? 'var(--warn)' : 'var(--ink-4)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 8px', background: bg, border: `1px solid ${bdr}`, borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', color: col, flexShrink: 0, whiteSpace: 'nowrap' }}>
      <Icon name="clock" size={10} stroke={1.6} />
      {label}
    </span>
  );
}

// ─── Action queue row ─────────────────────────────────────────
function ActionQueueItem({ icon, title, meta, ttl, ttlUrgent, actions, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)' }}>
      <div style={{ width: 30, height: 30, borderRadius: 3, background: 'var(--surface-sunk)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-3)' }}>
        <Icon name={icon} size={14} stroke={1.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div className="t-meta" style={{ marginTop: 2, fontSize: 10.5 }}>{meta}</div>
      </div>
      <TtlBadge label={ttl} urgent={ttlUrgent} />
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{actions}</div>
    </div>
  );
}

// ─── Upcoming flight row ──────────────────────────────────────
function FlightRow({ ref_, route, aircraft, etd, pax, status, tone, inAir, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)', background: inAir ? 'var(--info-soft)' : 'transparent' }}>
      <div style={{ width: 70, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--ink)' }}>{ref_}</div>
        {inAir && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><span className="dot info" style={{ width: 5, height: 5 }} /><span className="t-meta" style={{ color: 'var(--info)', fontSize: 9.5 }}>In air</span></div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)' }}>{route}</div>
        <div className="t-meta" style={{ marginTop: 1, fontSize: 10.5 }}>{aircraft}</div>
      </div>
      <div style={{ width: 66, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)', flexShrink: 0 }}>{etd}</div>
      <div style={{ width: 36, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', flexShrink: 0 }}>{pax}p</div>
      <div style={{ width: 116, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        <span className={'badge ' + tone} style={{ height: 20 }}><span className={'dot ' + tone} />{status}</span>
      </div>
    </div>
  );
}

// ─── Aircraft availability row ────────────────────────────────
function AircraftRow({ reg, type, status, tone, note, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)' }}>
      <Icon name="helipad" size={13} stroke={1.4} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.05em', color: 'var(--ink)' }}>{reg}</span>
          <span className="t-meta" style={{ fontSize: 10.5 }}>{type}</span>
        </div>
        {note && <div className="t-meta" style={{ marginTop: 1, fontSize: 10 }}>{note}</div>}
      </div>
      <span className={'badge ' + tone} style={{ height: 19 }}><span className={'dot ' + tone} />{status}</span>
    </div>
  );
}

// ─── Crew roster row ──────────────────────────────────────────
function CrewRow({ name, role, rating, status, tone, last }) {
  const initials = name.split(' ').filter(w => /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join('');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)' }}>
      <div className="avatar" style={{ width: 24, height: 24, fontSize: 10, flexShrink: 0 }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)' }}>{name}</div>
        <div className="t-meta" style={{ marginTop: 1, fontSize: 10 }}>{role} · {rating}</div>
      </div>
      <span className={'badge ' + tone} style={{ height: 19 }}><span className={'dot ' + tone} />{status}</span>
    </div>
  );
}

// ─── Panel section header ─────────────────────────────────────
function PanelHead({ title, kicker, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 11 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        {kicker && <span className="t-label">{kicker}</span>}
        <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 400, letterSpacing: '-0.012em', color: 'var(--ink)' }}>{title}</h3>
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3.1 — Dashboard Home
// variant: 'normal' | 'alert'
// ─────────────────────────────────────────────────────────────
function DashboardScreen({ variant = 'normal' }) {
  const isAlert = variant === 'alert';

  const revSpark  = [165, 220, 190, 310, 255, 290, 420];
  const loadSpark = [68,  72,  64,  80,  76,  82,  76 ];
  const reqSpark  = isAlert ? [4, 6, 3, 8, 9, 11, 8] : [4, 6, 3, 8, 5, 4, 6];
  const otpSpark  = [88, 100, 92, 100, 83, 100, 100];

  const pendingCount = isAlert ? '9' : '6';
  const pendingTrend = isAlert ? '+5 today' : '+2 today';

  return (
    <Shell
      active="dashboard"
      breadcrumb="Operations"
      title="Dashboard"
      subtitle={`Helix Aviation · ${isAlert ? 'Wed 4 Jun' : 'Tue 3 Jun'} 2026 · ${isAlert ? '14:08' : '10:42'} IST`}
      actions={
        <div style={{ display: 'flex', gap: 5 }}>
          {['Today', '7d', '30d'].map((w, i) => (
            <button key={w} className={'btn sm' + (i === 0 ? ' primary' : '')}
              style={i !== 0 ? { borderColor: 'transparent', background: 'transparent', color: 'var(--ink-3)' } : {}}>
              {w}
            </button>
          ))}
        </div>
      }
      banner={
        <AdminStateBanner
          tone={isAlert ? 'danger' : 'warn'}
          icon="alert"
          label={isAlert ? 'Publishing paused' : 'Compliance alert'}
          message={isAlert
            ? 'Admin paused your inventory. Insurance renewal is overdue (1 day past expiry). Resolve immediately to resume accepting bookings.'
            : 'Passenger & third-party liability cover (Tata AIG) expires in 8 days. Renew before 11 Jun to avoid a publishing pause.'}
          action={<button className="btn sm" style={{ height: 26 }}><Icon name="archive" size={11} />Manage documents</button>}
        />
      }
    >
      <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── KPI grid (4 cards × 2 rows) ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          <StatCard label="Pending Requests" value={pendingCount}  trend={pendingTrend} tone={isAlert ? 'danger' : 'warn'} icon="inbox"  spark={reqSpark} />
          <StatCard label="Today's Flights"  value="4"  sub="3 upcoming · 1 in air"         icon="plane"  live />
          <StatCard label="In-Air Now"        value="1"  sub="HA-181 · MUM → Shirdi"  tone="info"  icon="bolt"   live />
          <StatCard label="Available Aircraft" value={isAlert ? '2' : '3'} sub="of 5 active"          icon="helipad" />
          <StatCard label="On-Duty Crew"      value="8"  sub="of 12 rostered"                icon="users" />
          <StatCard label="Load Factor"       value="76%" trend="+4pp vs last week"   tone="ok"    icon="pie"    spark={loadSpark} />
          <StatCard label="Period Revenue"    value="₹4.2L" sub="last 7 days" trend="+12%" tone="ok" icon="wallet" spark={revSpark} />
          <StatCard label="On-Time"           value="94%" trend="-2pp vs last week"           icon="clock"  spark={otpSpark} />
        </div>

        {/* ── Main two-column layout ──────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* LEFT — action queue + upcoming flights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Action Queue */}
            <div>
              <PanelHead
                kicker="Action required"
                title={isAlert ? 'Queue · 5 items' : 'Queue · 3 items'}
                action={<span className={'badge ' + (isAlert ? 'danger' : 'warn')} style={{ height: 19 }}><span className={'dot ' + (isAlert ? 'danger' : 'warn')} />{isAlert ? '2 critical' : '1 urgent'}</span>}
              />
              <div className="card" style={{ overflow: 'hidden' }}>
                <ActionQueueItem
                  icon="inbox"
                  title={isAlert ? 'Charter request — RELIANCE · MUM → DEL (VIP)' : 'Charter request — Tata Consulting Services · MUM → PUNE'}
                  meta={isAlert ? '8 pax · 320 kg · executive VIP · submitted 13:22' : '4 pax · 120 kg baggage · VIP transfer · submitted 09:58'}
                  ttl={isAlert ? '11 min left' : '43 min left'}
                  ttlUrgent="danger"
                  actions={[
                    <button key="q" className="btn sm accent" style={{ height: 26 }}><Icon name="tag" size={11} />Quote</button>,
                    <button key="r" className="btn sm danger" style={{ height: 26 }}>Reject</button>,
                  ]}
                />
                <ActionQueueItem
                  icon="inbox"
                  title="Shuttle booking — MUM Juhu → Shirdi Helipad"
                  meta="3 pax · 45 kg baggage · shuttle / per-seat · submitted 10:15"
                  ttl={isAlert ? '22 min left' : '2h 11m left'}
                  ttlUrgent={isAlert ? 'danger' : 'warn'}
                  actions={[
                    <button key="a" className="btn sm primary" style={{ height: 26 }}><Icon name="check" size={11} />Accept</button>,
                    <button key="r" className="btn sm" style={{ height: 26 }}>Reject</button>,
                  ]}
                />
                <ActionQueueItem
                  icon="users"
                  title={isAlert ? 'Manifest lock overdue — HA-183 · PUNE → MUM · ETD 14:30' : 'Manifest lock due — HA-182 · MUM → Shirdi · ETD 14:00'}
                  meta={isAlert ? '5 pax · lock window passed · departure imminent' : '6 pax · weight 94% MTOW · lock window opens 12:00'}
                  ttl={isAlert ? '22 min to ETD' : '1h 18m to window'}
                  ttlUrgent={isAlert ? 'danger' : null}
                  last={!isAlert}
                  actions={[
                    <button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>,
                  ]}
                />
                {isAlert && (
                  <>
                    <ActionQueueItem
                      icon="shield"
                      title="Insurance lapsed — publishing blocked by admin"
                      meta="Tata AIG · passenger liability · expired 3 Jun · upload renewed certificate"
                      ttl="1 day overdue"
                      ttlUrgent="danger"
                      actions={[
                        <button key="u" className="btn sm" style={{ height: 26 }}><Icon name="upload" size={11} />Upload</button>,
                      ]}
                    />
                    <ActionQueueItem
                      icon="inbox"
                      title="Helicopter booking — MUM Juhu → Pune Heliport"
                      meta="2 pax · 20 kg · VFR leisure · submitted 13:55"
                      ttl="4h 05m left"
                      ttlUrgent={null}
                      last
                      actions={[
                        <button key="a" className="btn sm primary" style={{ height: 26 }}><Icon name="check" size={11} />Accept</button>,
                        <button key="r" className="btn sm" style={{ height: 26 }}>Reject</button>,
                      ]}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Upcoming Flights */}
            <div>
              <PanelHead
                kicker="Next 24h"
                title="Upcoming Flights"
                action={<button className="btn sm" style={{ borderColor: 'transparent', background: 'transparent', color: 'var(--accent)' }}><Icon name="arrowRight" size={12} />All flights</button>}
              />
              <div className="card" style={{ overflow: 'hidden' }}>
                {/* table column heads */}
                <div style={{ display: 'flex', padding: '7px 16px', borderBottom: '1px solid var(--rule)', background: 'var(--surface-2)' }}>
                  {[['Flight', 70], ['Route · Aircraft', 0], ['ETD', 66], ['Pax', 36], ['Status', 116]].map(([l, w]) => (
                    <div key={l} className="t-label" style={{ width: w || undefined, flex: w === 0 ? 1 : undefined, textAlign: w && w > 50 && l !== 'Flight' ? 'right' : 'left', flexShrink: w > 0 ? 0 : undefined }}>{l}</div>
                  ))}
                </div>
                <FlightRow ref_="HA-180" route="MUM Juhu → Pune" aircraft="VT-HXA · EC135" etd="09:30" pax={4} status="Completed" tone="ok" />
                <FlightRow ref_="HA-181" route="MUM Juhu → Shirdi" aircraft="VT-HXB · AS350 B3" etd="10:15" pax={2} status="In Air" tone="info" inAir />
                <FlightRow ref_="HA-182" route="MUM Juhu → Shirdi" aircraft="VT-HXA · EC135" etd="14:00" pax={6} status={isAlert ? 'Manifest overdue' : 'Manifest pending'} tone={isAlert ? 'danger' : 'warn'} />
                <FlightRow ref_="HA-183" route="Pune → MUM Juhu" aircraft="VT-HXC · Bell 407" etd="17:30" pax={3} status="Assigned" tone="pending" last />
              </div>
            </div>
          </div>

          {/* RIGHT — fleet · crew · revenue trend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Fleet availability */}
            <div>
              <PanelHead kicker="Fleet" title="Aircraft Availability" />
              <div className="card" style={{ overflow: 'hidden' }}>
                <AircraftRow reg="VT-HXA" type="EC135" status="Available" tone="ok" />
                <AircraftRow reg="VT-HXB" type="AS350 B3" status="In Air" tone="info" note="HA-181 · est. return 11:40" />
                <AircraftRow reg="VT-HXC" type="Bell 407" status="Maintenance" tone="warn" note="Scheduled until 16:00" />
                <AircraftRow reg="VT-HXD" type="EC135 T2" status="Available" tone="ok" />
                <AircraftRow reg="VT-HXE" type="AW169" status={isAlert ? 'Grounded' : 'Available'} tone={isAlert ? 'danger' : 'ok'} note={isAlert ? 'Airworthiness doc expired' : undefined} last />
              </div>
            </div>

            {/* Crew roster */}
            <div>
              <PanelHead kicker="Crew" title="On-Duty Roster" action={<a className="t-meta" style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: 11 }}>Full roster →</a>} />
              <div className="card" style={{ overflow: 'hidden' }}>
                <CrewRow name="Capt. R. Mehta"  role="PIC" rating="EC135 · AW169"  status="Available" tone="ok" />
                <CrewRow name="FO. P. Singh"     role="SIC" rating="AS350 · EC135"  status="In Air"    tone="info" />
                <CrewRow name="Capt. S. Rao"     role="PIC" rating="Bell 407 · EC135" status="Available" tone="ok" />
                <CrewRow name="Capt. D. Patil"   role="PIC" rating="EC135 T2"        status="Off duty"  tone="pending" last />
              </div>
            </div>

            {/* Revenue trend */}
            <div>
              <PanelHead
                kicker="Revenue · last 7 days"
                title="₹4.2L"
                action={<span className="badge ok" style={{ height: 18 }}><span className="dot ok" />+12%</span>}
              />
              <div className="card" style={{ padding: '14px 16px 12px' }}>
                <AreaChart
                  data={[165000, 220000, 190000, 310000, 255000, 290000, 420000]}
                  labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                  color="#0F8A5F"
                  h={60}
                />
                <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rule-soft)' }}>
                  <div style={{ flex: 1 }}>
                    <div className="t-label" style={{ marginBottom: 5 }}>On-Time</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '-0.016em', color: 'var(--ink)' }}>94%</span>
                      <Sparkline data={otpSpark} color="#3F6FB2" w={50} h={16} />
                    </div>
                  </div>
                  <div style={{ width: 1, background: 'var(--rule)' }} />
                  <div style={{ flex: 1 }}>
                    <div className="t-label" style={{ marginBottom: 5 }}>Load Factor</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '-0.016em', color: 'var(--ink)' }}>76%</span>
                      <Sparkline data={loadSpark} color="#0F8A5F" w={50} h={16} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { DashboardScreen });
