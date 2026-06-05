/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 05 — Assignment
   5.1a  Assignment Board — normal day view
   5.1b  Assignment Board — conflict state
   5.2   Crew Assignment panel
   ───────────────────────────────────────────────────────────── */

const TL_START = 6;
const TL_END = 22;
const TL_PX = 58; // px per hour
const TL_W = (TL_END - TL_START) * TL_PX;

function hx(h, m = 0) { return ((h + m / 60) - TL_START) * TL_PX; }
function hw(h, m = 0) { return (h + m / 60) * TL_PX; }

function GridLines() {
  const hrs = [];
  for (let h = TL_START; h <= TL_END; h++) hrs.push(h);
  return (
    <>
      {hrs.filter(h => h > TL_START).map(h => (
        <div key={h} style={{ position: 'absolute', left: hx(h), top: 0, bottom: 0, width: 1, background: 'var(--rule-soft)', pointerEvents: 'none' }} />
      ))}
    </>
  );
}

function HourRuler() {
  const hrs = [];
  for (let h = TL_START; h <= TL_END; h++) hrs.push(h);
  return (
    <div style={{ position: 'relative', height: 28, borderBottom: '1px solid var(--rule)', background: 'var(--surface-2)', flexShrink: 0, width: TL_W }}>
      {hrs.map(h => (
        <div key={h} style={{ position: 'absolute', left: hx(h), top: 0, height: '100%', display: 'flex', alignItems: 'center', paddingLeft: 5, borderLeft: h > TL_START ? '1px solid var(--rule)' : 'none', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.05em', color: 'var(--ink-4)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {String(h).padStart(2,'0')}:00
        </div>
      ))}
    </div>
  );
}

function NowLine() {
  return (
    <div style={{ position: 'absolute', left: hx(10, 42), top: 0, bottom: 0, width: 1.5, background: 'var(--danger)', zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: -1, left: -18, whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab,var(--danger) 30%,var(--rule))', padding: '1px 5px', borderRadius: 2 }}>10:42</div>
    </div>
  );
}

function FlightBlock({ sh, sm=0, eh, em=0, label, sub, tone, dimmed, conflict }) {
  const x = hx(sh, sm), w = Math.max(hx(eh,em) - x - 4, 20);
  const bgs = { active: 'color-mix(in oklab,var(--accent) 16%,var(--surface))', inair: 'color-mix(in oklab,var(--ok) 16%,var(--surface))', done: 'var(--surface-2)', pending: 'color-mix(in oklab,var(--warn) 14%,var(--surface))' };
  const bdrs = { active: 'var(--accent)', inair: 'var(--ok)', done: 'var(--rule-strong)', pending: 'var(--warn)' };
  const bg = conflict ? 'color-mix(in oklab,var(--danger) 18%,var(--surface))' : (bgs[tone] || 'var(--surface-2)');
  const bdr = conflict ? 'var(--danger)' : (bdrs[tone] || 'var(--rule-strong)');
  return (
    <div style={{ position: 'absolute', left: x+2, width: w, top: 6, bottom: 6, background: bg, border: `1px solid ${bdr}`, borderRadius: 2, overflow: 'hidden', cursor: 'pointer', opacity: dimmed ? 0.5 : 1, boxShadow: conflict ? '0 0 0 2px color-mix(in oklab,var(--danger) 40%,transparent)' : undefined }}>
      {conflict && (
        <div style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, background: 'var(--danger)', borderBottomLeftRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="alert" size={9} style={{ color: '#fff' }} />
        </div>
      )}
      <div style={{ padding: '3px 6px', color: conflict ? 'var(--danger)' : dimmed ? 'var(--ink-4)' : 'var(--ink-2)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 9, color: 'var(--ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function DropHint({ sh, sm=0, eh, em=0, label }) {
  const x = hx(sh,sm), w = Math.max(hx(eh,em)-x-4, 40);
  return (
    <div style={{ position: 'absolute', left: x+2, width: w, top: 6, bottom: 6, background: 'color-mix(in oklab,var(--accent) 8%,transparent)', border: '1.5px dashed var(--accent)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--accent)', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  );
}

function AircraftRow({ reg, type, pax, status, statusTone, maintenance, last, children }) {
  return (
    <div style={{ display: 'flex', borderBottom: last ? 'none' : '1px solid var(--rule-soft)', minHeight: 56 }}>
      <div style={{ width: 220, flexShrink: 0, padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, borderRight: '1px solid var(--rule)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 500 }}>{reg}</span>
          <span className={`badge ${statusTone}`} style={{ height: 17 }}><span className={`dot ${statusTone}`} />{status}</span>
        </div>
        <div className="t-meta" style={{ fontSize: 10.5 }}>{type} · {pax} pax max</div>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg)', minWidth: TL_W }}>
        <GridLines />
        {maintenance && (
          <>
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, color-mix(in oklab,var(--warn) 6%,transparent) 8px, color-mix(in oklab,var(--warn) 6%,transparent) 16px)' }} />
            <div style={{ position: 'absolute', left: 0, top: 8, height: 28, display: 'flex', alignItems: 'center', paddingLeft: 10, gap: 6 }}>
              <Icon name="settings" size={12} style={{ color: 'var(--warn)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--warn)', letterSpacing: '0.06em' }}>{maintenance}</span>
            </div>
          </>
        )}
        {children}
      </div>
    </div>
  );
}

function UnassignedCard({ bookingRef, type, passenger, route, pax, kg, urgent, note }) {
  return (
    <div style={{ padding: '10px 12px', border: `1.5px solid ${urgent ? 'color-mix(in oklab,var(--danger) 30%,var(--rule))' : 'var(--rule)'}`, background: urgent ? 'var(--danger-soft)' : 'var(--surface)', borderRadius: 3, cursor: 'grab', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.05em', color: urgent ? 'var(--danger)' : 'var(--ink)', fontWeight: 500 }}>{bookingRef}</span>
        <span className={`badge ${type === 'charter' ? 'info' : 'ok'}`} style={{ height: 17, fontSize: 9.5 }}>{type === 'charter' ? 'Charter' : 'Shuttle'}</span>
        {urgent && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 17, padding: '0 6px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab,var(--danger) 28%,var(--rule))', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', color: 'var(--danger)', flexShrink: 0 }}>
            <Icon name="clock" size={9} />{urgent}
          </span>
        )}
        <div style={{ marginLeft: 'auto' }}><Icon name="gripV" size={12} style={{ color: 'var(--ink-4)' }} /></div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 2 }}>{passenger}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span className="t-meta" style={{ fontSize: 11 }}>{route}</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--rule-strong)', flexShrink: 0 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>{pax} pax · {kg} kg</span>
      </div>
      {note && <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 5, lineHeight: 1.4 }}>{note}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5.1 — Assignment Board
// ─────────────────────────────────────────────────────────────
function AssignmentBoardScreen({ variant = 'normal' }) {
  const isConflict = variant === 'conflict';
  return (
    <Shell
      active="assignment"
      breadcrumb="Operations"
      title="Assignment Board"
      subtitle="Helix Aviation · 5 Jun 2026 · 3 accepted requests unassigned"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm"><Icon name="chevLeft" size={12} />4 Jun</button>
          <button className="btn sm accent" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em' }}>Today · 5 Jun</button>
          <button className="btn sm">6 Jun<Icon name="chevRight" size={12} /></button>
        </div>
      }
    >
      {isConflict && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 40, background: 'var(--danger-soft)', borderBottom: '1px solid color-mix(in oklab,var(--danger) 24%,var(--rule))', flexShrink: 0 }}>
          <Icon name="alert" size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 500 }}>Scheduling conflict — VT-HXD</span>
          <span style={{ width: 1, height: 14, background: 'color-mix(in oklab,var(--danger) 28%,var(--rule))' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>BKR-0595 overlaps BKG-0594 at 14:00–15:30. Resolve before confirming.</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm danger" style={{ height: 26 }}>Resolve conflict →</button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* unassigned sidebar */}
        <div style={{ width: 268, flexShrink: 0, borderRight: '1px solid var(--rule)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="t-label">Unassigned</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--ink)', color: 'var(--bg)' }}>3</span>
            </div>
            <div className="t-meta" style={{ fontSize: 11, marginTop: 4 }}>Drag onto the timeline to assign</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
            <UnassignedCard bookingRef="BKR-0601" type="charter" passenger="Reliance Industries" route="MUM Juhu → DEL Safdarjung" pax={8} kg={320} urgent="9 min" note="VIP · AW169 required · ASAP departure" />
            <UnassignedCard bookingRef="BKR-0598" type="charter" passenger="Tata Consulting Services" route="MUM Juhu → Pune Heliport" pax={4} kg={120} note="VIP · depart 17:00" />
            <UnassignedCard bookingRef="BKR-0588" type="charter" passenger="Mahindra & Mahindra" route="MUM Juhu → Goa North" pax={4} kg={90} note="8 Jun 11:00 — lower urgency" />
          </div>
        </div>

        {/* gantt */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* ruler header */}
          <div style={{ display: 'flex', flexShrink: 0, position: 'sticky', top: 0, zIndex: 20, background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)' }}>
            <div style={{ width: 220, flexShrink: 0, height: 28, borderRight: '1px solid var(--rule)', display: 'flex', alignItems: 'center', paddingLeft: 16 }}>
              <span className="t-label" style={{ fontSize: 10 }}>Aircraft</span>
            </div>
            <HourRuler />
          </div>

          {/* rows */}
          <AircraftRow reg="VT-HXE" type="AW169" pax="16" status="Available" statusTone="ok">
            <NowLine />
            <FlightBlock sh={8} eh={10} em={45} label="BKG-0589" sub="MUM→HYD · Done" tone="done" dimmed />
            {!isConflict
              ? <FlightBlock sh={11} eh={14} em={30} label="BKR-0601 ← placed" sub="MUM→DEL · VIP charter" tone="active" />
              : <DropHint sh={11} eh={14} em={30} label="Drop BKR-0601 here" />
            }
            <FlightBlock sh={16} eh={17} em={30} label="BKG-0577" sub="MUM→Pune · Confirmed" tone="pending" />
          </AircraftRow>

          <AircraftRow reg="VT-HXD" type="EC135 T2" pax="7" status={isConflict ? 'Conflict' : 'Available'} statusTone={isConflict ? 'danger' : 'ok'}>
            <NowLine />
            <FlightBlock sh={6} sm={30} eh={8} label="BKG-0583" sub="MUM→Pune · Done" tone="done" dimmed />
            <FlightBlock sh={13} eh={15} em={30} label="BKG-0594" sub="MUM→Shirdi · Confirmed" tone="pending" />
            {isConflict && <FlightBlock sh={14} eh={16} label="BKR-0595 ← conflict" sub="MUM→Lonavala" tone="active" conflict />}
            <FlightBlock sh={17} eh={18} em={30} label="BKR-0598 ← placed" sub="MUM→Pune · Charter" tone="active" />
          </AircraftRow>

          <AircraftRow reg="VT-HXA" type="EC135" pax="7" status="Maintenance" statusTone="warn" maintenance="100-hr check · returns 6 Jun 08:00" />

          <AircraftRow reg="VT-HXB" type="AS350 B3" pax="6" status="In-air" statusTone="info" last>
            <NowLine />
            <FlightBlock sh={9} eh={11} label="BKG-0590" sub="MUM→Goa North" tone="inair" />
            <FlightBlock sh={14} sm={30} eh={16} label="BKG-0596" sub="Goa North→MUM" tone="pending" />
          </AircraftRow>

          {/* crew strip */}
          <div style={{ flexShrink: 0, borderTop: '1px solid var(--rule)', background: 'var(--surface-2)', padding: '10px 0' }}>
            <div style={{ display: 'flex' }}>
              <div style={{ width: 220, flexShrink: 0, padding: '0 16px', display: 'flex', alignItems: 'center', borderRight: '1px solid var(--rule)' }}>
                <span className="t-label" style={{ fontSize: 10 }}>Crew</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 12px', alignItems: 'center' }}>
                {[
                  { name: 'Capt. R. Sharma',  role: 'CPT', tone: 'ok',     note: 'Available all day' },
                  { name: 'Capt. A. Pillai',  role: 'CPT', tone: 'ok',     note: 'Available from 12:00' },
                  { name: 'F/O K. Mehta',     role: 'F/O', tone: 'ok',     note: 'Available all day' },
                  { name: 'F/O S. Patil',     role: 'F/O', tone: 'warn',   note: 'FDP limit at 18:00' },
                  { name: 'Capt. D. Iyer',    role: 'CPT', tone: 'warn',   note: 'Standby · returns 14:00' },
                  { name: 'F/O P. Nair',      role: 'F/O', tone: 'danger', note: 'Rest period until 7 Jun' },
                ].map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 11.5 }}>
                    <span className={`dot ${c.tone}`} style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0 }} />
                    <span style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{c.name}</span>
                    <span className="badge" style={{ height: 16, fontSize: 9 }}>{c.role}</span>
                    <span className="t-meta" style={{ fontSize: 10.5 }}>{c.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 5.2 — Crew Assignment
// ─────────────────────────────────────────────────────────────
function CrewAssignmentScreen() {
  const [captIdx, setCaptIdx] = React.useState(0);
  const [foIdx, setFoIdx] = React.useState(0);

  const captains = [
    { name: 'Capt. Rohan Sharma', license: 'ATPL-H', hours: 4820, status: 'Available', tone: 'ok' },
    { name: 'Capt. Anand Pillai', license: 'ATPL-H', hours: 3670, status: 'Avail 12:00+', tone: 'warn' },
    { name: 'Capt. Devraj Iyer',  license: 'ATPL-H', hours: 6100, status: 'Standby',     tone: 'warn' },
  ];
  const fos = [
    { name: 'F/O Kavya Mehta',  license: 'CPL-H', hours: 1240, status: 'Available',     tone: 'ok'   },
    { name: 'F/O Suresh Patil', license: 'CPL-H', hours: 980,  status: 'FDP limit 18:00', tone: 'warn' },
  ];

  function CrewOption({ person, selected, onSelect }) {
    return (
      <div onClick={onSelect} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--rule)'}`, background: selected ? 'var(--accent-soft-2)' : 'var(--bg)', borderRadius: 3, cursor: 'pointer', marginBottom: 6 }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--rule-strong)'}`, background: selected ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {selected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
        </div>
        <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>
          {person.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{person.name}</div>
          <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>{person.license} · {person.hours} hrs on type</div>
        </div>
        <span className={`badge ${person.tone}`} style={{ height: 17 }}><span className={`dot ${person.tone}`} />{person.status}</span>
      </div>
    );
  }

  return (
    <Shell
      active="assignment"
      breadcrumb="Assignment Board / BKR-0601"
      title="Assign Crew — BKR-0601"
      subtitle="AW169 · VT-HXE · MUM Juhu → DEL Safdarjung · 5 Jun 2026, ASAP"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" style={{ height: 32, color: 'var(--ink-3)' }}>
            <Icon name="arrowRight" size={12} style={{ transform: 'rotate(180deg)' }} />Back
          </button>
          <button className="btn sm accent" style={{ height: 32 }}>
            <Icon name="check" size={12} />Confirm Assignment
          </button>
        </div>
      }
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* left: context */}
        <div style={{ flex: 1, padding: '22px 26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, borderRight: '1px solid var(--rule)' }}>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Flight Summary</div>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {[
                  ['Reference', 'BKR-0601', true],
                  ['Aircraft', 'VT-HXE — AW169', false],
                  ['Departure', 'ASAP · 10:42 IST', false],
                ].map(([k,v,mono]) => (
                  <div key={k}>
                    <div className="t-label" style={{ marginBottom: 4 }}>{k}</div>
                    <span style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: 13, letterSpacing: mono ? '0.06em' : undefined, color: 'var(--ink)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: 'var(--rule-soft)', margin: '12px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {[
                  ['Route', 'MUM Juhu → DEL Safdarjung'],
                  ['Payload', '8 pax · 320 kg'],
                  ['Est. block time', '~3 h 30 m'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <div className="t-label" style={{ marginBottom: 4 }}>{k}</div>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Flight Duty Period Check</div>
            <div className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Est. block time (MUM–DEL)',       '3 h 30 m', true],
                ['Est. FDP incl. pre-flight',        '4 h 30 m', true],
                ['Capt. Sharma – duty so far today', '1 h 20 m', true],
                ['Capt. Sharma – projected total',   '5 h 50 m', true],
                ['DGCA max FDP (VFR day, single)',   '10 h',      true],
                ['Rest since last duty',             '12 h 15 m', true],
              ].map(([k,v,ok]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: ok ? 'var(--ok)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon name={ok ? 'check' : 'alert'} size={10} />{v}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 4, padding: '8px 10px', background: 'color-mix(in oklab,var(--ok) 9%,var(--surface))', border: '1px solid color-mix(in oklab,var(--ok) 25%,var(--rule))', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="check" size={13} style={{ color: 'var(--ok)' }} />
                <span style={{ fontSize: 12, color: 'var(--ok)' }}>All FDP checks pass for selected crew</span>
              </div>
            </div>
          </section>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Pre-assignment Checklist</div>
            <div className="card" style={{ padding: '10px 14px' }}>
              {[
                [true,  'Aircraft airworthiness certificate valid (expires 12 Sep 2026)'],
                [true,  'Insurance in force — Helix Aviation policy HA-INS-2026'],
                [true,  'VT-HXE ARC current — last 100-hr check 22 May 2026'],
                [true,  'Route weather briefing — VFR OK, light winds MUM→DEL'],
                [false, 'Ground handling confirmed at DEL Safdarjung'],
                [false, 'Fuel uplift co-ordinated with client travel desk'],
              ].map(([done, item], i, arr) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 0', borderBottom: i < arr.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div style={{ width: 15, height: 15, borderRadius: 2, flexShrink: 0, marginTop: 1, background: done ? 'var(--ok)' : 'var(--surface-sunk)', border: `1.5px solid ${done ? 'var(--ok)' : 'var(--rule-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {done && <Icon name="check" size={9} style={{ color: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 12, color: done ? 'var(--ink-3)' : 'var(--ink)', lineHeight: 1.45 }}>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* right: crew selection */}
        <div style={{ width: 400, flexShrink: 0, background: 'var(--surface)', overflowY: 'auto', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Assign Captain</div>
            {captains.map((c, i) => (
              <CrewOption key={c.name} person={c} selected={captIdx === i} onSelect={() => setCaptIdx(i)} />
            ))}
          </section>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Assign First Officer</div>
            {fos.map((c, i) => (
              <CrewOption key={c.name} person={c} selected={foIdx === i} onSelect={() => setFoIdx(i)} />
            ))}
          </section>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 3, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="t-label">Assignment Summary</div>
            {[
              ['Aircraft',           'VT-HXE — AW169'],
              ['Captain',            captains[captIdx].name],
              ['First Officer',      fos[foIdx].name],
              ['Est. departure',     'ASAP · 10:42 IST'],
              ['Est. arrival',       'DEL Safdarjung ~14:12 IST'],
            ].map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="t-meta" style={{ fontSize: 11.5 }}>{k}</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{v}</span>
              </div>
            ))}
          </div>

          <button className="btn accent" style={{ width: '100%', height: 40, justifyContent: 'center', fontWeight: 500, fontSize: 14 }}>
            <Icon name="check" size={14} />Confirm Assignment
          </button>
          <button className="btn" style={{ width: '100%', height: 32, justifyContent: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
            Save draft
          </button>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { AssignmentBoardScreen, CrewAssignmentScreen });
