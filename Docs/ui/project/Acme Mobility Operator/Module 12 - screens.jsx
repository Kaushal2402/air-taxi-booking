/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 12 — Crew
   12.1a  Crew roster — normal
   12.1b  Crew roster — FDP/rest alert state
   12.2   Crew member detail — Capt. Rohan Sharma
   ───────────────────────────────────────────────────────────── */

// ─── Availability dot+label ────────────────────────────────────
function AvailPill({ status }) {
  const map = {
    'Available':    'ok',
    'On duty':      'info',
    'Rest period':  'warn',
    'Off duty':     'pending',
    'FDP exceeded': 'danger',
    'Leave':        'pending',
  };
  const tone = map[status] || 'pending';
  return (
    <span className={`badge ${tone}`} style={{ height: 20, fontSize: 10.5 }}>
      <span className={`dot ${tone}`} />{status}
    </span>
  );
}

// ─── License/rating chip ──────────────────────────────────────
function LicChip({ label, expiry, warn }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 8px', background: warn ? 'var(--warn-soft)' : 'var(--surface-2)', border: `1px solid ${warn ? 'color-mix(in oklab,var(--warn) 28%,var(--rule))' : 'var(--rule-strong)'}`, borderRadius: 2, fontSize: 10.5, color: warn ? 'var(--warn)' : 'var(--ink-3)' }}>
      {warn && <Icon name="alert" size={10} />}
      <span style={{ fontWeight: 500, color: warn ? 'var(--warn)' : 'var(--ink-2)' }}>{label}</span>
      {expiry && <span style={{ color: warn ? 'var(--warn)' : 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.04em' }}>· {expiry}</span>}
    </div>
  );
}

// ─── Crew card ─────────────────────────────────────────────────
function CrewCard({ c, alert }) {
  return (
    <div style={{
      padding: '16px 18px',
      background: alert ? 'color-mix(in oklab,var(--danger-soft) 45%,var(--surface))' : 'var(--surface)',
      border: `1.5px solid ${alert ? 'color-mix(in oklab,var(--danger) 28%,var(--rule))' : 'var(--rule)'}`,
      borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer',
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div className="avatar" style={{ width: 44, height: 44, fontSize: 15, flexShrink: 0 }}>
          {c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{c.name}</span>
            <AvailPill status={c.availability} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{c.role}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--rule-strong)', flexShrink: 0 }} />
            <span>{c.license}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--rule-strong)', flexShrink: 0 }} />
            <span>{c.hoursOnType} hrs on type</span>
          </div>
        </div>
        <button className="btn sm icon" style={{ height: 28, width: 28 }}><Icon name="settings" size={13} /></button>
      </div>

      {/* FDP bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span className="t-meta" style={{ fontSize: 10.5 }}>Duty hours (this month)</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: c.dutyPct > 80 ? 'var(--danger)' : c.dutyPct > 70 ? 'var(--warn)' : 'var(--ink-3)' }}>{c.dutyHours} / 100 h</span>
        </div>
        <div style={{ height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${c.dutyPct}%`, height: '100%', background: c.dutyPct > 80 ? 'var(--danger)' : c.dutyPct > 70 ? 'var(--warn)' : 'var(--ok)', borderRadius: 2 }} />
        </div>
      </div>

      {/* ratings */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {c.ratings.map(r => <LicChip key={r.label} {...r} />)}
      </div>

      {/* footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: '1px solid var(--rule-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-4)' }}>
          <Icon name="calendar" size={11} />
          <span>{c.nextFlight || 'No upcoming flights'}</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn sm icon" style={{ height: 24, width: 24 }}><Icon name="phone" size={11} /></button>
        <button className="btn sm icon" style={{ height: 24, width: 24 }}><Icon name="envelope" size={11} /></button>
      </div>

      {alert && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '7px 10px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab,var(--danger) 25%,var(--rule))', borderRadius: 2 }}>
          <Icon name="alert" size={12} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11.5, color: 'var(--danger)', lineHeight: 1.4 }}>{alert}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 12.1 — Crew Roster
// ─────────────────────────────────────────────────────────────
function CrewRosterScreen({ variant = 'normal' }) {
  const isAlert = variant === 'alert';

  const crew = [
    {
      name: 'Capt. Rohan Sharma',   role: 'Captain (PIC)',  license: 'ATPL-H · DGP-0421',
      hoursOnType: '4,820', availability: 'On duty',
      dutyHours: 52, dutyPct: 52,
      ratings: [
        { label: 'AW169',    expiry: 'Rating current' },
        { label: 'EC135',    expiry: 'Rating current' },
        { label: 'ATPL-H',   expiry: 'exp 14 Jan 2027' },
        { label: 'Class 1',  expiry: 'exp 15 Jan 2027' },
      ],
      nextFlight: 'BKG-0601 · 5 Jun 11:10',
      alert: null,
    },
    {
      name: 'Capt. Anand Pillai',   role: 'Captain (PIC)',  license: 'ATPL-H · DGP-0512',
      hoursOnType: '3,670', availability: isAlert ? 'FDP exceeded' : 'Available',
      dutyHours: isAlert ? 98 : 52, dutyPct: isAlert ? 98 : 52,
      ratings: [
        { label: 'EC135 T2', expiry: 'Rating current' },
        { label: 'AS350',    expiry: 'Rating current' },
        { label: 'ATPL-H',   expiry: 'exp 8 Jun 2026', warn: isAlert },
        { label: 'Class 1',  expiry: 'exp 3 Aug 2026' },
      ],
      nextFlight: 'BKG-0594 · 5 Jun 13:00',
      alert: isAlert ? 'Monthly FDP at 98 h — cannot be assigned until 1 Jul. License renewal overdue.' : null,
    },
    {
      name: 'Capt. Devraj Iyer',    role: 'Captain (PIC)',  license: 'ATPL-H · DGP-0388',
      hoursOnType: '6,100', availability: 'Available',
      dutyHours: 62, dutyPct: 62,
      ratings: [
        { label: 'AS350 B3', expiry: 'Rating current' },
        { label: 'AW169',    expiry: 'Rating current' },
        { label: 'ATPL-H',   expiry: 'exp 22 Mar 2027' },
        { label: 'Class 1',  expiry: 'exp 9 Sep 2026' },
      ],
      nextFlight: 'BKG-0590 · 5 Jun 09:10',
      alert: null,
    },
    {
      name: 'F/O Kavya Mehta',      role: 'First Officer',  license: 'CPL-H · DGP-0812',
      hoursOnType: '1,240', availability: 'On duty',
      dutyHours: 44, dutyPct: 44,
      ratings: [
        { label: 'AW169',    expiry: 'Rating current' },
        { label: 'CPL-H',    expiry: 'exp 20 Aug 2026' },
        { label: 'Class 1',  expiry: 'exp 5 Oct 2026' },
      ],
      nextFlight: 'BKG-0601 · 5 Jun 11:10',
      alert: null,
    },
    {
      name: 'F/O Suresh Patil',     role: 'First Officer',  license: 'CPL-H · DGP-0934',
      hoursOnType: '980', availability: 'Rest period',
      dutyHours: 80, dutyPct: 80,
      ratings: [
        { label: 'EC135 T2', expiry: 'Rating current' },
        { label: 'CPL-H',    expiry: 'exp 12 Dec 2026' },
        { label: 'Class 1',  expiry: 'exp 18 Jul 2026' },
      ],
      nextFlight: 'Rest until 7 Jun 08:00',
      alert: null,
    },
    {
      name: 'F/O Priya Nair',       role: 'First Officer',  license: 'CPL-H · DGP-1021',
      hoursOnType: '740', availability: 'Available',
      dutyHours: 38, dutyPct: 38,
      ratings: [
        { label: 'AS350 B3', expiry: 'Rating current' },
        { label: 'CPL-H',    expiry: 'exp 3 Feb 2027' },
        { label: 'Class 1',  expiry: 'exp 11 Apr 2027' },
      ],
      nextFlight: 'BKG-0590 · 5 Jun 09:10',
      alert: null,
    },
  ];

  return (
    <Shell
      active="crew"
      breadcrumb="Fleet & Crew"
      title="Crew Roster"
      subtitle={`Helix Aviation · 6 crew members${isAlert ? ' · 1 FDP alert · 1 license renewal overdue' : ''}`}
      actions={
        <button className="btn sm accent"><Icon name="plus" size={12} />Add crew member</button>
      }
    >
      {isAlert && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 42, background: 'var(--danger-soft)', borderBottom: '1px solid color-mix(in oklab,var(--danger) 24%,var(--rule))', flexShrink: 0 }}>
          <Icon name="alert" size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 500 }}>Capt. Pillai — FDP exceeded + license overdue</span>
          <span style={{ width: 1, height: 14, background: 'color-mix(in oklab,var(--danger) 28%,var(--rule))' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Monthly FDP at 98 h. ATPL-H renewal overdue (expired 8 Jun). Cannot be assigned until resolved.</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm danger" style={{ height: 28 }}>View Capt. Pillai →</button>
        </div>
      )}

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', background: 'var(--surface)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <div className="input" style={{ width: 220, height: 32 }}>
          <Icon name="search" size={13} className="icon" />
          <input placeholder="Search crew…" />
        </div>
        <FilterChip label="Role" value="All" />
        <FilterChip label="Availability" value="All" />
        <FilterChip label="Rating" value="All types" />
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>6 crew members</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {crew.map(c => <CrewCard key={c.name} c={c} alert={c.alert} />)}
        </div>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 12.2 — Crew Member Detail (Capt. Rohan Sharma)
// ─────────────────────────────────────────────────────────────
function CrewDetailScreen() {
  const [tab, setTab] = React.useState('Overview');
  const tabs = ['Overview', 'Licenses & Ratings', 'Flight log', 'Schedule'];

  const licenses = [
    { name: 'ATPL-H (Airline Transport Pilot — Helicopter)', no: 'DGP-CPL-H-0421', issued: '14 Jan 2022', expires: '14 Jan 2027', daysLeft: 223, ok: true },
    { name: 'Class 1 Medical Certificate',                   no: 'MED-2026-0441',  issued: '15 Jan 2026', expires: '15 Jan 2027', daysLeft: 224, ok: true },
    { name: 'AW169 Type Rating',                             no: 'TR-AW169-0421',  issued: '3 Mar 2021',  expires: 'Permanent',   daysLeft: 999, ok: true },
    { name: 'EC135 Type Rating',                             no: 'TR-EC135-0421',  issued: '12 Jun 2020', expires: 'Permanent',   daysLeft: 999, ok: true },
    { name: 'Instrument Rating (IR-H)',                      no: 'IR-H-0421',      issued: '14 Jan 2022', expires: '14 Jan 2027', daysLeft: 223, ok: true },
    { name: 'Night VFR Rating',                              no: 'NVFR-0421',      issued: '14 Jan 2022', expires: 'Permanent',   daysLeft: 999, ok: true },
  ];

  const flightLog = [
    { ref: 'BKG-0589', route: 'MUM→HYD', date: '4 Jun', aircraft: 'VT-HXE', blockTime: '1h 45m', role: 'PIC' },
    { ref: 'BKG-0570', route: 'MUM→Pune', date: '2 Jun', aircraft: 'VT-HXE', blockTime: '0h 55m', role: 'PIC' },
    { ref: 'BKG-0561', route: 'MUM→DEL', date: '28 May', aircraft: 'VT-HXE', blockTime: '3h 30m', role: 'PIC' },
    { ref: 'BKG-0554', route: 'MUM→GOA', date: '25 May', aircraft: 'VT-HXE', blockTime: '1h 05m', role: 'PIC' },
    { ref: 'BKG-0547', route: 'MUM→Nashik', date: '22 May', aircraft: 'VT-HXE', blockTime: '0h 40m', role: 'PIC' },
  ];

  const schedule = [
    { date: '5 Jun', ref: 'BKG-0601', route: 'MUM→DEL', dep: '11:10', eta: '14:35', status: 'In-air'    },
    { date: '7 Jun', ref: 'BKG-0612', route: 'MUM→Pune', dep: '09:00', eta: '10:00', status: 'Scheduled' },
    { date: '9 Jun', ref: 'BKG-0619', route: 'MUM→Shirdi', dep: '08:30', eta: '09:50', status: 'Scheduled' },
  ];

  return (
    <Shell
      active="crew"
      breadcrumb="Crew Roster / Capt. Rohan Sharma"
      title="Capt. Rohan Sharma"
      subtitle="Captain (PIC) · ATPL-H · AW169 / EC135 rated · 4,820 hrs on type"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" style={{ height: 32, color: 'var(--ink-3)' }}>
            <Icon name="arrowRight" size={12} style={{ transform: 'rotate(180deg)' }} />Back
          </button>
          <button className="btn sm" style={{ height: 32 }}><Icon name="phone" size={12} />Contact</button>
          <button className="btn sm" style={{ height: 32 }}><Icon name="settings" size={12} />Edit</button>
        </div>
      }
    >
      {/* sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--rule)', padding: '0 28px', background: 'var(--surface)', flexShrink: 0 }}>
        {tabs.map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ height: 44, padding: '0 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: tab === t ? '2px solid var(--ink)' : '2px solid transparent', color: tab === t ? 'var(--ink)' : 'var(--ink-3)', fontSize: 13, fontWeight: tab === t ? 500 : 400, marginBottom: -1 }}>{t}</div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Main content ──────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 20, borderRight: '1px solid var(--rule)' }}>

          {tab === 'Overview' && (
            <>
              {/* profile card */}
              <section>
                <div className="card" style={{ padding: '16px 18px', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                  <div className="avatar" style={{ width: 56, height: 56, fontSize: 20, flexShrink: 0 }}>RS</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Capt. Rohan Sharma</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 10 }}>Captain (PIC) · Employee ID HA-CPT-001 · Joined 14 Mar 2019</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <LicChip label="ATPL-H" expiry="exp 14 Jan 2027" />
                      <LicChip label="AW169 Type Rating" />
                      <LicChip label="EC135 Type Rating" />
                      <LicChip label="IR-H" expiry="exp 14 Jan 2027" />
                      <LicChip label="NVFR" />
                    </div>
                  </div>
                  <AvailPill status="On duty" />
                </div>
              </section>

              {/* stats grid */}
              <section>
                <div className="t-label" style={{ marginBottom: 10 }}>Flight statistics</div>
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                    {[
                      ['Total flight hours', '4,820 h'],
                      ['Hours on AW169',     '2,940 h'],
                      ['Hours this month',   '52 h'],
                      ['Flights this month', '24'],
                      ['Total PIC hours',    '4,820 h'],
                      ['Night hours',        '320 h'],
                      ['IFR hours',          '680 h'],
                      ['Last flight',        '4 Jun 2026'],
                    ].map(([k,v]) => (
                      <div key={k}>
                        <div className="t-label" style={{ marginBottom: 3 }}>{k}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)', letterSpacing: '0.03em' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* FDP */}
              <section>
                <div className="t-label" style={{ marginBottom: 10 }}>Flight Duty Period (June 2026)</div>
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="t-meta" style={{ fontSize: 11.5 }}>Monthly duty hours</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ok)' }}>52 / 100 h · 48 h remaining</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--rule)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ width: '52%', height: '100%', background: 'var(--ok)', borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      ['Last duty end',  '4 Jun 2026 · 17:45'],
                      ['Minimum rest',   '12 hrs (ends 5 Jun 05:45)'],
                      ['Next available', '5 Jun 05:45 — ✓ cleared'],
                    ].map(([k,v]) => (
                      <div key={k}>
                        <div className="t-label" style={{ marginBottom: 3 }}>{k}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === 'Licenses & Ratings' && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="t-label">Licenses, ratings &amp; medicals</span>
                <div style={{ flex: 1 }} />
                <button className="btn sm accent" style={{ height: 28 }}><Icon name="upload" size={11} />Upload document</button>
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {licenses.map((l, i) => (
                  <div key={l.no} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderBottom: i < licenses.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
                    <Icon name={l.ok ? 'check' : 'alert'} size={14} style={{ color: l.daysLeft < 60 ? 'var(--warn)' : 'var(--ok)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{l.name}</div>
                      <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>{l.no} · Issued {l.issued}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: l.daysLeft < 60 ? 'var(--warn)' : l.daysLeft > 998 ? 'var(--ink-3)' : 'var(--ok)' }}>{l.expires}</div>
                      {l.daysLeft < 999 && <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>{l.daysLeft}d remaining</div>}
                    </div>
                    <button className="btn sm icon" style={{ height: 26, width: 26 }}><Icon name="download" size={11} /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === 'Flight log' && (
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Recent flight log</div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', padding: '7px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)' }}>
                  {[['Booking',90],['Route',0],['Date',70],['Aircraft',90],['Block time',90],['Role',60]].map(([l,w]) => (
                    <div key={l} className="t-label" style={{ width: w || undefined, flex: !w ? 1 : undefined, flexShrink: w ? 0 : undefined, fontSize: 10 }}>{l}</div>
                  ))}
                </div>
                {flightLog.map((f, i) => (
                  <div key={f.ref} style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', borderBottom: i < flightLog.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)', width: 90, flexShrink: 0 }}>{f.ref}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)', flex: 1 }}>{f.route}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', width: 70, flexShrink: 0 }}>{f.date}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', width: 90, flexShrink: 0 }}>{f.aircraft}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)', width: 90, flexShrink: 0 }}>{f.blockTime}</span>
                    <span className="badge ok" style={{ height: 17, fontSize: 9.5, width: 60, flexShrink: 0 }}>{f.role}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === 'Schedule' && (
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Upcoming schedule</div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {schedule.map((s, i) => (
                  <div key={s.ref} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderBottom: i < schedule.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', width: 52, flexShrink: 0 }}>{s.date}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)', width: 90, flexShrink: 0 }}>{s.ref}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)', flex: 1 }}>{s.route}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', width: 110, flexShrink: 0 }}>{s.dep} → {s.eta}</span>
                    <span className={`badge ${s.status === 'In-air' ? 'info' : 'pending'}`} style={{ height: 18, fontSize: 10 }}>
                      <span className={`dot ${s.status === 'In-air' ? 'info' : 'pending'}`} />{s.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Right sidebar: quick stats ────────────────── */}
        <div style={{ width: 280, flexShrink: 0, background: 'var(--surface)', overflowY: 'auto', padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Contact</div>
            <div className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Mobile',   '+91-98200-12345'],
                ['Email',    'r.sharma@helixaviation.in'],
                ['Base',     'MUM Juhu FBO'],
                ['Employee', 'HA-CPT-001'],
              ].map(([k,v]) => (
                <div key={k}>
                  <div className="t-label" style={{ marginBottom: 2, fontSize: 9.5 }}>{k}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', wordBreak: 'break-all' }}>{v}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Monthly summary (Jun)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Duty hours',    '52 h', 'ok'],
                ['Flights (PIC)', '24',   undefined],
                ['Block time',    '46 h', undefined],
                ['Night flights', '2',    undefined],
              ].map(([k,v,t]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid var(--rule-soft)' }}>
                  <span className="t-meta" style={{ fontSize: 11.5 }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: t ? `var(--${t})` : 'var(--ink)' }}>{v}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Next license renewal</div>
            <div style={{ padding: '10px 12px', background: 'color-mix(in oklab,var(--ok) 8%,var(--surface))', border: '1px solid color-mix(in oklab,var(--ok) 20%,var(--rule))', borderRadius: 3 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ok)' }}>ATPL-H renewal due</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)', marginTop: 4, letterSpacing: '0.03em' }}>14 Jan 2027</div>
              <div className="t-meta" style={{ fontSize: 11, marginTop: 3 }}>223 days · all checks current</div>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { CrewRosterScreen, CrewDetailScreen });
