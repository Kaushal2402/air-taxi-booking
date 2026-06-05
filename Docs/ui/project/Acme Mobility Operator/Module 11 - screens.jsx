/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 11 — Aircraft & Fleet
   11.1a  Fleet list — normal
   11.1b  Fleet list — maintenance alert
   11.2   Aircraft detail — VT-HXE AW169
   ───────────────────────────────────────────────────────────── */

// ─── Status badge ──────────────────────────────────────────────
function AircraftStatusBadge({ s }) {
  const map = {
    'Available':    'ok',
    'In-air':       'info',
    'Maintenance':  'warn',
    'Grounded':     'danger',
    'Scheduled':    'pending',
  };
  return (
    <span className={`badge ${map[s] || 'pending'}`} style={{ height: 20, fontSize: 10.5 }}>
      <span className={`dot ${map[s] || 'pending'}`} />{s}
    </span>
  );
}

// ─── Certificate validity pill ────────────────────────────────
function CertPill({ label, expiry, daysLeft }) {
  const tone = daysLeft < 0 ? 'danger' : daysLeft < 30 ? 'warn' : 'ok';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: `color-mix(in oklab,var(--${tone}) 8%,var(--surface))`, border: `1px solid color-mix(in oklab,var(--${tone}) 22%,var(--rule))`, borderRadius: 3 }}>
      <Icon name={tone === 'ok' ? 'check' : 'alert'} size={11} style={{ color: `var(--${tone})`, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</div>
        <div style={{ fontSize: 10.5, color: `var(--${tone})`, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em', marginTop: 1 }}>
          {expiry} {daysLeft >= 0 ? `· ${daysLeft}d left` : '· EXPIRED'}
        </div>
      </div>
    </div>
  );
}

// ─── Maintenance task row ─────────────────────────────────────
function MaintRow({ task, due, status, tone, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '9px 14px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>{task}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>{due}</div>
      </div>
      <span className={`badge ${tone}`} style={{ height: 18, fontSize: 10 }}><span className={`dot ${tone}`} />{status}</span>
    </div>
  );
}

// ─── Fleet card ────────────────────────────────────────────────
function FleetCard({ a, alert }) {
  return (
    <div style={{
      padding: '16px 18px',
      background: alert ? 'color-mix(in oklab,var(--warn-soft) 50%,var(--surface))' : 'var(--surface)',
      border: `1.5px solid ${alert ? 'color-mix(in oklab,var(--warn) 28%,var(--rule))' : 'var(--rule)'}`,
      borderRadius: 4,
      display: 'flex', flexDirection: 'column', gap: 12,
      cursor: 'pointer',
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>{a.reg}</span>
            <AircraftStatusBadge s={a.status} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{a.type}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--rule-strong)' }} />
            <span>{a.pax} pax max</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--rule-strong)' }} />
            <span>{a.range} nm range</span>
          </div>
        </div>
        <button className="btn sm icon" style={{ height: 28, width: 28 }}><Icon name="settings" size={13} /></button>
      </div>

      {/* utilisation bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span className="t-meta" style={{ fontSize: 10.5 }}>Utilisation (May)</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{a.util}%</span>
        </div>
        <div style={{ height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${a.util}%`, height: '100%', background: a.util > 70 ? 'var(--ok)' : 'var(--accent)', borderRadius: 2 }} />
        </div>
      </div>

      {/* stats row */}
      <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--rule-soft)', paddingTop: 10 }}>
        {[
          ['Hours (May)', `${a.hours} h`],
          ['Total hours', `${a.totalHours} h`],
          ['Cycles',      `${a.cycles}`],
        ].map(([k, v], i, arr) => (
          <div key={k} style={{ flex: 1, paddingLeft: i > 0 ? 14 : 0, borderLeft: i > 0 ? '1px solid var(--rule-soft)' : 'none', marginLeft: i > 0 ? 14 : 0 }}>
            <div className="t-label" style={{ marginBottom: 3 }}>{k}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)', letterSpacing: '0.03em' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* cert / maint strip */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--rule-soft)', paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: a.arcOk ? 'var(--ok)' : 'var(--danger)' }}>
          <Icon name={a.arcOk ? 'check' : 'alert'} size={11} />
          <span>ARC {a.arcExpiry}</span>
        </div>
        <div style={{ width: 1, background: 'var(--rule)', height: 14, alignSelf: 'center' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: alert ? 'var(--warn)' : 'var(--ink-4)' }}>
          <Icon name={alert ? 'alert' : 'settings'} size={11} />
          <span>{a.nextMaint}</span>
        </div>
        {a.currentFlight && (
          <>
            <div style={{ width: 1, background: 'var(--rule)', height: 14, alignSelf: 'center' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--info)' }}>
              <Icon name="plane" size={11} />
              <span>{a.currentFlight}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 11.1 — Fleet List
// ─────────────────────────────────────────────────────────────
function FleetListScreen({ variant = 'normal' }) {
  const isMaint = variant === 'maint';

  const aircraft = [
    {
      reg: 'VT-HXE', type: 'AW169',    pax: 16, range: 830,
      status: 'Available', util: 72, hours: 48, totalHours: 4820, cycles: 9640,
      arcOk: true, arcExpiry: 'exp 12 Sep 2026',
      nextMaint: 'Next 100-hr @ 4868 h',
      currentFlight: null,
      alert: false,
    },
    {
      reg: 'VT-HXB', type: 'AS350 B3', pax: 6, range: 320,
      status: 'In-air', util: 58, hours: 39, totalHours: 3210, cycles: 6420,
      arcOk: true, arcExpiry: 'exp 5 Mar 2027',
      nextMaint: 'Next 50-hr @ 3240 h',
      currentFlight: 'BKG-0590 MUM→GOA',
      alert: false,
    },
    {
      reg: 'VT-HXD', type: 'EC135 T2', pax: 7, range: 350,
      status: isMaint ? 'Maintenance' : 'Available',
      util: 81, hours: 54, totalHours: 6120, cycles: 12240,
      arcOk: !isMaint, arcExpiry: isMaint ? 'exp 1 Jun 2026 ⚠' : 'exp 4 Nov 2026',
      nextMaint: isMaint ? 'ARC overdue — grounded' : 'Next 100-hr @ 6150 h',
      currentFlight: null,
      alert: isMaint,
    },
    {
      reg: 'VT-HXA', type: 'EC135',    pax: 7, range: 320,
      status: 'Maintenance', util: 14, hours: 9, totalHours: 8340, cycles: 16680,
      arcOk: true, arcExpiry: 'exp 22 Aug 2026',
      nextMaint: '100-hr check in progress',
      currentFlight: null,
      alert: false,
    },
  ];

  return (
    <Shell
      active="aircraft"
      breadcrumb="Fleet & Crew"
      title="Aircraft & Fleet"
      subtitle={`Helix Aviation · 4 aircraft registered${isMaint ? ' · 1 airworthiness alert' : ''}`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm accent"><Icon name="plus" size={12} />Add aircraft</button>
        </div>
      }
    >
      {isMaint && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 42, background: 'var(--danger-soft)', borderBottom: '1px solid color-mix(in oklab,var(--danger) 24%,var(--rule))', flexShrink: 0 }}>
          <Icon name="alert" size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 500 }}>VT-HXD airworthiness certificate expired</span>
          <span style={{ width: 1, height: 14, background: 'color-mix(in oklab,var(--danger) 28%,var(--rule))' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>ARC expired 1 Jun 2026. Aircraft automatically grounded. Renew before scheduling any flights.</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm danger" style={{ height: 28 }}>Upload new ARC →</button>
        </div>
      )}

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', background: 'var(--surface)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <div className="input" style={{ width: 220, height: 32 }}>
          <Icon name="search" size={13} className="icon" />
          <input placeholder="Search by reg, type…" />
        </div>
        <FilterChip label="Status" value="All" />
        <FilterChip label="Type" value="All" />
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>4 aircraft</span>
      </div>

      {/* grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {aircraft.map(a => <FleetCard key={a.reg} a={a} alert={a.alert} />)}
        </div>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 11.2 — Aircraft Detail (VT-HXE · AW169)
// ─────────────────────────────────────────────────────────────
function AircraftDetailScreen() {
  const tabs = ['Overview', 'Maintenance', 'Documents', 'Assignments'];
  const [tab, setTab] = React.useState('Overview');

  const maintHistory = [
    { task: '100-hr inspection',         due: 'Completed 22 May 2026 @ 4,800 h', status: 'Done',     tone: 'ok'   },
    { task: '50-hr check',               due: 'Completed 10 May 2026 @ 4,750 h', status: 'Done',     tone: 'ok'   },
    { task: 'Engine oil service',         due: 'Completed 3 May 2026',            status: 'Done',     tone: 'ok'   },
    { task: 'Next 100-hr inspection',    due: 'Due @ 4,868 h (est. 12 Jul 2026)', status: 'Upcoming', tone: 'warn' },
    { task: 'Annual inspection',         due: 'Due 15 Aug 2026',                  status: 'Upcoming', tone: 'warn' },
    { task: 'ARC renewal',              due: 'Expires 12 Sep 2026',              status: 'Upcoming', tone: 'info' },
  ];

  const documents = [
    { name: 'Certificate of Airworthiness',  no: 'CA-2024-VT-HXE-001', issued: '14 Mar 2024', expires: '12 Sep 2026', daysLeft: 99, ok: true  },
    { name: 'Certificate of Registration',   no: 'VT-HXE/REG/2019',    issued: '5 Jan 2019',  expires: 'Permanent',   daysLeft: 999, ok: true },
    { name: 'Airworthiness Review Certificate', no: 'ARC-2026-0441',   issued: '22 May 2026', expires: '21 May 2027',  daysLeft: 350, ok: true  },
    { name: 'Radio Station Licence',         no: 'RSL-VT-HXE-2026',    issued: '1 Jan 2026',  expires: '31 Dec 2026',  daysLeft: 209, ok: true  },
    { name: 'Noise Certificate',             no: 'NC-AW169-0021',       issued: '14 Mar 2024', expires: 'Permanent',   daysLeft: 999, ok: true  },
    { name: 'Insurance Certificate',         no: 'HA-INS-2026',         issued: '1 Apr 2026',  expires: '31 Mar 2027',  daysLeft: 299, ok: true  },
  ];

  const recentFlights = [
    { ref: 'BKG-0589', route: 'MUM→HYD', date: '4 Jun', crew: 'Capt. Sharma', status: 'Completed' },
    { ref: 'BKG-0601', route: 'MUM→DEL', date: '5 Jun', crew: 'Capt. Sharma', status: 'In-air' },
    { ref: 'BKG-0583', route: 'MUM→CHN', date: '7 Jun', crew: 'Capt. Pillai', status: 'Scheduled' },
    { ref: 'BKG-0588', route: 'MUM→GOA', date: '8 Jun', crew: 'Capt. Pillai', status: 'Scheduled' },
  ];

  return (
    <Shell
      active="aircraft"
      breadcrumb="Aircraft & Fleet / VT-HXE"
      title="VT-HXE — Leonardo AW169"
      subtitle="AW169 · 16 pax · 830 nm · Registration current · Available"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" style={{ height: 32, color: 'var(--ink-3)' }}>
            <Icon name="arrowRight" size={12} style={{ transform: 'rotate(180deg)' }} />Back
          </button>
          <button className="btn sm" style={{ height: 32 }}><Icon name="settings" size={12} />Edit aircraft</button>
        </div>
      }
    >
      {/* sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--rule)', padding: '0 28px', background: 'var(--surface)', flexShrink: 0 }}>
        {tabs.map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ height: 44, padding: '0 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: tab === t ? '2px solid var(--ink)' : '2px solid transparent', color: tab === t ? 'var(--ink)' : 'var(--ink-3)', fontSize: 13, fontWeight: tab === t ? 500 : 400, marginBottom: -1 }}>{t}</div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {tab === 'Overview' && (
          <>
            {/* specs */}
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Aircraft specifications</div>
              <div className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                  {[
                    ['Registration', 'VT-HXE',        true],
                    ['Type',         'Leonardo AW169', false],
                    ['Serial no.',   'AW169-69106',    true],
                    ['Year of mfr',  '2019',           true],
                    ['MTOW',         '4,600 kg',       false],
                    ['Max pax',      '16',             false],
                    ['Range',        '830 nm',         false],
                    ['Endurance',    '~4 h 30 m',      false],
                  ].map(([k,v,mono]) => (
                    <div key={k}>
                      <div className="t-label" style={{ marginBottom: 4 }}>{k}</div>
                      <span style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: 13, letterSpacing: mono ? '0.05em' : undefined, color: 'var(--ink)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* hours + certs */}
            <div style={{ display: 'flex', gap: 16 }}>
              <section style={{ flex: 1 }}>
                <div className="t-label" style={{ marginBottom: 10 }}>Flight hours & cycles</div>
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    {[
                      ['Total flight hours', '4,820 h'],
                      ['Total cycles',       '9,640'],
                      ['Hours this month',   '48 h'],
                      ['Flights this month', '22'],
                      ['Last flight',        '5 Jun 2026'],
                      ['Avg hrs/month',      '52 h'],
                    ].map(([k,v]) => (
                      <div key={k}>
                        <div className="t-label" style={{ marginBottom: 4 }}>{k}</div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)', letterSpacing: '0.03em' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <section style={{ flex: 1 }}>
                <div className="t-label" style={{ marginBottom: 10 }}>Certificate validity</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <CertPill label="Airworthiness" expiry="12 Sep 2026" daysLeft={99} />
                  <CertPill label="ARC" expiry="21 May 2027" daysLeft={350} />
                  <CertPill label="Radio licence" expiry="31 Dec 2026" daysLeft={209} />
                  <CertPill label="Insurance" expiry="31 Mar 2027" daysLeft={299} />
                </div>
              </section>
            </div>

            {/* recent flights */}
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Recent &amp; upcoming flights</div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {recentFlights.map((f, i) => (
                  <div key={f.ref} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < recentFlights.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.05em', color: 'var(--ink)', width: 90, flexShrink: 0 }}>{f.ref}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)', flex: 1 }}>{f.route}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', width: 60, flexShrink: 0 }}>{f.date}</span>
                    <span className="t-meta" style={{ fontSize: 11, width: 140, flexShrink: 0 }}>{f.crew}</span>
                    <span className={`badge ${f.status === 'Completed' ? 'ok' : f.status === 'In-air' ? 'info' : 'pending'}`} style={{ height: 18, fontSize: 10 }}>
                      <span className={`dot ${f.status === 'Completed' ? 'ok' : f.status === 'In-air' ? 'info' : 'pending'}`} />{f.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'Maintenance' && (
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Maintenance schedule</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {maintHistory.map((m, i) => (
                <MaintRow key={i} {...m} last={i === maintHistory.length-1} />
              ))}
            </div>
          </section>
        )}

        {tab === 'Documents' && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className="t-label">Aircraft documents</span>
              <div style={{ flex: 1 }} />
              <button className="btn sm accent" style={{ height: 28 }}><Icon name="upload" size={11} />Upload document</button>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {documents.map((d, i) => (
                <div key={d.no} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderBottom: i < documents.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <Icon name={d.ok ? 'check' : 'alert'} size={14} style={{ color: d.daysLeft < 30 ? 'var(--warn)' : 'var(--ok)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{d.name}</div>
                    <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>{d.no} · Issued {d.issued}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: d.daysLeft < 30 ? 'var(--warn)' : d.daysLeft > 998 ? 'var(--ink-3)' : 'var(--ok)', letterSpacing: '0.03em' }}>{d.expires}</div>
                    {d.daysLeft < 999 && <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>{d.daysLeft}d remaining</div>}
                  </div>
                  <button className="btn sm icon" style={{ height: 26, width: 26 }}><Icon name="download" size={11} /></button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'Assignments' && (
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Flight assignments — Jun 2026</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {recentFlights.map((f, i) => (
                <div key={f.ref} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < recentFlights.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.05em', color: 'var(--ink)', width: 90, flexShrink: 0 }}>{f.ref}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-2)', flex: 1 }}>{f.route}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', width: 60, flexShrink: 0 }}>{f.date}</span>
                  <span className="t-meta" style={{ fontSize: 11, width: 140, flexShrink: 0 }}>{f.crew}</span>
                  <span className={`badge ${f.status === 'Completed' ? 'ok' : f.status === 'In-air' ? 'info' : 'pending'}`} style={{ height: 18, fontSize: 10 }}>
                    <span className={`dot ${f.status === 'Completed' ? 'ok' : f.status === 'In-air' ? 'info' : 'pending'}`} />{f.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}

Object.assign(window, { FleetListScreen, AircraftDetailScreen });
