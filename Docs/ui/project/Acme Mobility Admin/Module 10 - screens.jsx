/* ─────────────────────────────────────────────────────────────
   Module 10 — Aircraft & Crew Management
   Screens 10.1 → 10.3
   ───────────────────────────────────────────────────────────── */

const AIRCRAFT = [
  { reg: 'VT-BSE', op: 'BlueSky Heliservices',  type: 'Bell 407',         cat: 'Heli', seats: 6,  mtow: 2722, range: 324, hrs: 4210, status: 'ready',     air: 'ok',       lastFlight: '2h ago',  nextMaint: '142h' },
  { reg: 'VT-BSF', op: 'BlueSky Heliservices',  type: 'Bell 407',         cat: 'Heli', seats: 6,  mtow: 2722, range: 324, hrs: 3892, status: 'ready',     air: 'ok',       lastFlight: 'Today',   nextMaint: '218h' },
  { reg: 'VT-BSG', op: 'BlueSky Heliservices',  type: 'Airbus H125',      cat: 'Heli', seats: 6,  mtow: 2250, range: 339, hrs: 5108, status: 'ready',     air: 'ok',       lastFlight: 'Yesterday', nextMaint: '74h' },
  { reg: 'VT-BSI', op: 'BlueSky Heliservices',  type: 'Bell 412',         cat: 'Heli', seats: 14, mtow: 5397, range: 365, hrs: 7820, status: 'maint',     air: 'ok',       lastFlight: '3d ago',  nextMaint: '— in service' },
  { reg: 'VT-SKE', op: 'Skydeck Aviation',      type: 'Embraer Phenom 300', cat: 'Jet', seats: 8,  mtow: 8150, range:1971, hrs: 2188, status: 'ready',     air: 'ok',       lastFlight: 'Today',   nextMaint: '188h' },
  { reg: 'VT-SKF', op: 'Skydeck Aviation',      type: 'Cessna Citation CJ3', cat: 'Jet', seats: 7, mtow: 6291, range:1820, hrs: 3920, status: 'ready',     air: 'expiring', lastFlight: 'Today',   nextMaint: '92h', note: 'Airworthiness expires in 28d' },
  { reg: 'VT-AMC', op: 'Aerial Mobility',       type: 'Cessna Citation CJ3', cat: 'Jet', seats: 7, mtow: 6291, range:1820, hrs: 4188, status: 'ready',     air: 'ok',       lastFlight: 'Yesterday', nextMaint: '52h' },
  { reg: 'VT-NJB', op: 'NimbusJet',             type: 'Pilatus PC-24',    cat: 'Jet', seats: 8,  mtow: 8005, range:2000, hrs: 1402, status: 'ready',     air: 'ok',       lastFlight: '2 days',  nextMaint: '264h' },
  { reg: 'VT-HHA', op: 'Highland Helicopters',  type: 'Eurocopter EC130', cat: 'Heli', seats: 7,  mtow: 2500, range: 327, hrs: 3214, status: 'grounded',  air: 'expired',  lastFlight: '8 days',  nextMaint: '—', note: 'Airworthiness expired · grounded' },
  { reg: 'VT-CAB', op: 'CoastalAir',            type: 'Bell 407',         cat: 'Heli', seats: 6,  mtow: 2722, range: 324, hrs: 2880, status: 'grounded',  air: 'ok',       lastFlight: 'Paused',  nextMaint: '—', note: 'Operator paused' },
];

const PILOTS = [
  { id: 'PL-018', n: 'Capt. Renu Bhandari', op: 'BlueSky',        rating: ['Bell 407','Bell 412'],     hrs: 4210, lic: 'CPL-H',  med: '14 Aug 2026', sta: 'active', age: 38 },
  { id: 'PL-022', n: 'Capt. Vikram Singh',  op: 'BlueSky',        rating: ['Bell 407','H125'],         hrs: 5180, lic: 'ATPL-H', med: '18 Sep 2026', sta: 'active', age: 44 },
  { id: 'PL-031', n: 'Vikas Singh',         op: 'BlueSky',        rating: ['Bell 407'],                 hrs: 1820, lic: 'CPL-H',  med: '02 Nov 2026', sta: 'active', age: 31 },
  { id: 'PL-014', n: 'Capt. Naina Iyer',    op: 'Skydeck',        rating: ['Phenom 300','CJ3'],         hrs: 6480, lic: 'ATPL-A', med: '11 Dec 2026', sta: 'active', age: 42 },
  { id: 'PL-029', n: 'Anand Kashyap',       op: 'Skydeck',        rating: ['CJ3'],                       hrs: 2710, lic: 'CPL-A',  med: '04 Aug 2026', sta: 'active', age: 35 },
  { id: 'PL-041', n: 'Capt. Hari Menon',    op: 'Aerial Mobility',rating: ['CJ3','Phenom 300'],         hrs: 5410, lic: 'ATPL-A', med: '22 Jul 2026', sta: 'active', age: 47 },
  { id: 'PL-047', n: 'Capt. Saira Ahmed',   op: 'NimbusJet',      rating: ['PC-24','CJ3'],              hrs: 3840, lic: 'ATPL-A', med: '18 Jun 2026', sta: 'active', age: 39 },
  { id: 'PL-051', n: 'Karthik Suresh',      op: 'Highland Heli',  rating: ['EC130'],                     hrs: 1640, lic: 'CPL-H',  med: '11 Jun 2026', sta: 'grounded', age: 33, note: 'Medical expiring in 16d' },
];

// ──────────────────────────────────────────────────────────────
// 10.1 — Aircraft Directory
// ──────────────────────────────────────────────────────────────
function AircraftDirectoryScreen() {
  return (
    <Shell
      active="aircraft"
      breadcrumb="People & Fleet · Aircraft"
      title="Aircraft directory"
      subtitle="42 aircraft across 7 operators · 36 ready · 4 maintenance · 2 grounded"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Maintenance schedule</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Add aircraft</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* tabs */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {[
            { l: 'All aircraft', n: '42', active: true },
            { l: 'Ready',       n: '36', tone: 'var(--accent)' },
            { l: 'Maintenance', n: '4',  tone: 'var(--warn)' },
            { l: 'Grounded',    n: '2',  tone: 'var(--danger)' },
            { l: 'Airworthy expiring', n: '3', tone: 'var(--warn)' },
            { l: 'Out of service · 7d',n: '1', tone: 'var(--pending)' },
          ].map((v, i) => (
            <div key={v.l} style={{
              padding: '14px 18px',
              borderRight: i < 5 ? '1px solid var(--rule)' : 'none',
              borderBottom: v.active ? '2px solid var(--accent)' : '2px solid transparent',
              background: v.active ? 'var(--surface-2)' : 'transparent', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: v.active ? 'var(--ink)' : 'var(--ink-2)' }}>{v.l}</span>
                {v.tone && !v.active && <span className="dot" style={{ background: v.tone }} />}
              </div>
              <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 22 }}>{v.n}</div>
            </div>
          ))}
        </div>

        {/* filters */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="input" style={{ width: 260, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Registration mark, type, operator…" />
          </div>
          <FilterChip label="Category" value="Heli · Jet" count={2} />
          <FilterChip label="Operator" value="All" />
          <FilterChip label="Seats"    value="Any" />
          <FilterChip label="Range"    value="Any" />
          <FilterChip label="Status"   value="Ready" count={1} />
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost">Sort · Registration ↑</button>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }}><input type="checkbox" /></th>
                <th>Registration · Type</th>
                <th>Cat</th>
                <th>Operator</th>
                <th>Seats</th>
                <th>MTOW</th>
                <th>Range · nm</th>
                <th>Hours</th>
                <th>Last flight</th>
                <th>Next maintenance</th>
                <th>Airworthy</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {AIRCRAFT.map((a, i) => (
                <tr key={a.reg} className={i === 0 ? 'selected' : ''}>
                  <td><input type="checkbox" defaultChecked={i === 0} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 28, borderRadius: 2,
                        background: a.cat === 'Jet' ? 'var(--ink)' : 'var(--accent)',
                        color: 'var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name={a.cat === 'Jet' ? 'plane' : 'helipad'} size={14} stroke={1.4} />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{a.reg}</div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{a.type}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge">{a.cat}</span></td>
                  <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{a.op}</td>
                  <td className="num">{a.seats}</td>
                  <td className="num">{a.mtow.toLocaleString()} kg</td>
                  <td className="num">{a.range}</td>
                  <td className="num">{a.hrs.toLocaleString()}</td>
                  <td className="num" style={{ color: 'var(--ink-3)' }}>{a.lastFlight}</td>
                  <td className="num" style={{ color: 'var(--ink-2)' }}>{a.nextMaint}</td>
                  <td>
                    {a.air === 'ok'       ? <span className="badge ok"><span className="dot ok" />OK</span> :
                     a.air === 'expiring' ? <span className="badge warn"><span className="dot warn" />Expiring</span> :
                                            <span className="badge danger"><span className="dot danger" />Expired</span>}
                  </td>
                  <td>
                    {a.status === 'ready'    ? <span className="badge ok"><span className="dot ok" />Ready</span> :
                     a.status === 'maint'    ? <span className="badge warn"><span className="dot warn" />Maint.</span> :
                                               <span className="badge danger"><span className="dot danger" />Grounded</span>}
                  </td>
                  <td><button className="btn ghost icon sm"><Icon name="moreVert" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 10.2 — Aircraft Detail
// ──────────────────────────────────────────────────────────────
function AircraftDetailScreen() {
  const tabs = ['Overview', 'Airworthiness', 'Maintenance', 'Crew rated', 'Flights · 184', 'Audit'];

  return (
    <Shell
      active="aircraft"
      breadcrumb="People & Fleet · Aircraft"
      title="VT-BSE · Bell 407"
      subtitle="BlueSky Heliservices · 6 seats · MTOW 2,722 kg · 4,210 hrs"
      actions={
        <>
          <button className="btn sm">Schedule maintenance</button>
          <button className="btn sm danger">Ground</button>
          <button className="btn sm">Edit specs</button>
        </>
      }
    >
      <div>
        {/* hero */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--rule)', padding: '28px 32px', display: 'grid', gridTemplateColumns: '460px 1fr', gap: 36 }}>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            <div style={{
              width: 140, height: 90,
              background: 'var(--surface-sunk)',
              border: '1px solid var(--rule-strong)',
              borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* helicopter silhouette */}
              <svg viewBox="0 0 130 80" width="120" height="74">
                <path d="M10 50 L20 50 L25 35 L80 35 Q100 35 110 45 L110 50 L115 50 L115 55 L20 55 Z" fill="none" stroke="var(--ink)" strokeWidth="1.4" />
                <line x1="65" y1="35" x2="65" y2="22" stroke="var(--ink)" strokeWidth="1.4" />
                <line x1="35" y1="22" x2="95" y2="22" stroke="var(--ink)" strokeWidth="1.4" />
                <line x1="40" y1="20" x2="40" y2="24" stroke="var(--ink)" strokeWidth="1.4" />
                <line x1="90" y1="20" x2="90" y2="24" stroke="var(--ink)" strokeWidth="1.4" />
                <circle cx="32" cy="55" r="3" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.2" />
                <circle cx="95" cy="55" r="3" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.2" />
                <path d="M110 45 L122 40 L122 48 L114 48 Z" fill="none" stroke="var(--ink)" strokeWidth="1.2" />
                <circle cx="32" cy="42" r="3" fill="var(--accent)" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span className="badge ok"><span className="dot ok" />Ready</span>
                <span className="badge">Heli · single-engine</span>
                <span className="badge"><span className="dot ok" />Airworthy</span>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 24,
                background: 'var(--ink)', color: 'var(--surface)',
                padding: '6px 14px', display: 'inline-block', letterSpacing: '0.06em',
              }}>VT-BSE</div>
              <div className="t-meta" style={{ marginTop: 8 }}>Bell 407 · 2020 · operated by BlueSky Heliservices</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0, alignSelf: 'center' }}>
            {[
              ['Seats',           '6',          'Standard 5+1'],
              ['MTOW',            '2,722 kg',   'Type-certified'],
              ['Range',           '324 nm',     'No reserve'],
              ['Cruise',          '133 kts',    'IAS · sea level'],
              ['Total hours',     '4,210',      '+88 last 30d'],
              ['Until next mx',   '142h',       '300-hr cycle'],
            ].map(([k, v, m], i) => (
              <div key={k} style={{ padding: '0 16px', borderRight: i < 5 ? '1px solid var(--rule)' : 'none' }}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>{v}</div>
                <div className="t-meta" style={{ marginTop: 4 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>

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

        <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
          {/* airworthiness + maintenance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                <div className="t-label">Airworthiness · DGCA</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Certificate of airworthiness</h3>
              </div>
              <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  ['Certificate #', 'DGCA-CofA-2020-BSE-114'],
                  ['Type cert',     'IS/T-3/1996 · Bell 407'],
                  ['Issued',        '11 Aug 2020'],
                  ['Last renewal',  '04 Aug 2024'],
                  ['Valid until',   '04 Aug 2027'],
                  ['Days remaining','427'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="t-label" style={{ padding: 0 }}>{k}</div>
                    <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 18px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="t-meta">427 / 720 days into the renewal cycle</div>
                <div style={{ flex: 1, height: 4, margin: '0 14px', background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: '59%', height: '100%', background: 'var(--accent)' }} />
                </div>
                <button className="btn sm ghost"><Icon name="eye" size={11} />View document</button>
              </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="t-label">Maintenance windows · upcoming</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Blocked from scheduling</h3>
                </div>
                <button className="btn sm">Schedule new →</button>
              </div>
              <table className="tbl">
                <thead><tr><th>Window</th><th>Type</th><th>Hangar</th><th>Engineer</th><th>Status</th></tr></thead>
                <tbody>
                  {[
                    ['28 May · 06:00 – 31 May · 18:00', '300-hr inspection · A-check', 'Hangar B-2 · KIAL',   'B. Krishnan',  'scheduled'],
                    ['12 Jun · 09:00 – 12 Jun · 17:00', 'Tail rotor pitch link replace','Hangar B-2 · KIAL',  'Pending crew', 'pending'],
                    ['04 Aug · 06:00 – 06 Aug · 18:00', 'Annual renewal inspection',    'Bell AS · Mumbai',   'TBA',          'pending'],
                  ].map(([w, t, h, e, s], i) => (
                    <tr key={i}>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{w}</td>
                      <td style={{ fontSize: 13 }}>{t}</td>
                      <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{h}</td>
                      <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{e}</td>
                      <td>{s === 'scheduled' ? <span className="badge info"><span className="dot info" />Scheduled</span> : <span className="badge"><span className="dot pending" />Pending</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card" style={{ padding: '0' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                <div className="t-label">Crew rated on this aircraft</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>4 pilots type-rated · Bell 407</h3>
              </div>
              {PILOTS.slice(0, 3).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--rule-soft)' }}>
                  <div className="avatar">{p.n.replace('Capt. ','').split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{p.n}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{p.id} · {p.lic} · {p.hrs.toLocaleString()} hrs · medical {p.med}</div>
                  </div>
                  <span className="badge ok"><span className="dot ok" />Eligible</span>
                </div>
              ))}
            </div>
          </div>

          {/* right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 12 }}>Hours-to-next-maintenance</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400 }}>142</span>
                <span className="t-meta">hours until A-check</span>
              </div>
              <div style={{ marginTop: 14, height: 6, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: (158/300)*100 + '%', height: '100%', background: 'var(--accent)' }} />
              </div>
              <div className="t-meta" style={{ marginTop: 8, color: 'var(--ink-3)' }}>158 hrs flown of 300-hr cycle · roughly 21 days at current pace</div>
            </div>

            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 12 }}>Lifetime · utilisation</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  ['Total hours',  '4,210'],
                  ['Total cycles', '6,920'],
                  ['Flights · 30d','24'],
                  ['Hours · 30d',  '88'],
                  ['Load · 30d',   '74%'],
                  ['Revenue · 30d','₹ 18.4 L'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="t-label" style={{ padding: 0 }}>{k}</div>
                    <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 12 }}>Authorised routes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['BLR-PAD → MYS-PAD',  'Heli shuttle · daily'],
                  ['BLR-PAD → Coorg',    'On-demand · seasonal'],
                  ['BLR-PAD → Hampi',    'On-demand'],
                  ['BLR-PAD → CJB',      'On-demand · NOTAM-aware'],
                ].map(([r, m], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                    <Icon name="map" size={13} style={{ color: 'var(--ink-3)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>{r}</div>
                      <div className="t-meta" style={{ marginTop: 2 }}>{m}</div>
                    </div>
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

// ──────────────────────────────────────────────────────────────
// 10.3 — Pilots & Crew Directory
// ──────────────────────────────────────────────────────────────
function PilotsCrewScreen() {
  return (
    <Shell
      active="aircraft"
      breadcrumb="People & Fleet · Aircraft · Crew"
      title="Pilots & crew"
      subtitle="68 crew across 7 operators · 64 active · 3 grounded · 7 medicals expiring"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Type-rating matrix</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Onboard pilot</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* kpis */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            { l: 'Total crew',     v: '68',   m: '52 pilots · 16 co-pilots', tone: 'var(--ink)' },
            { l: 'Active',         v: '64',   m: 'Eligible to be rostered',  tone: 'var(--accent)' },
            { l: 'Grounded',       v: '3',    m: '1 medical · 2 doc',         tone: 'var(--danger)' },
            { l: 'Medicals expiring · 30d', v: '7', m: 'Auto-ground on expiry', tone: 'var(--warn)' },
            { l: 'Avg hours',      v: '3,820',m: 'Across active pilots',      tone: 'var(--ink-2)' },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: '18px 22px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{s.l}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.018em' }}>{s.v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: s.tone }}>{s.m}</div>
            </div>
          ))}
        </div>

        {/* filter */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="input" style={{ width: 260, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Name, license, type rating, operator…" />
          </div>
          <FilterChip label="License" value="ATPL · CPL" count={2} />
          <FilterChip label="Operator" value="All" />
          <FilterChip label="Type rating" value="Any" />
          <FilterChip label="Medical" value="Valid" count={1} />
          <FilterChip label="Hours"  value="Any" />
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost">Sort · Hours ↓</button>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }}><input type="checkbox" /></th>
                <th>Pilot</th>
                <th>Operator</th>
                <th>License</th>
                <th>Type ratings</th>
                <th>Hours</th>
                <th>Medical</th>
                <th>Age</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {PILOTS.map((p, i) => (
                <tr key={p.id} className={i === 0 ? 'selected' : ''}>
                  <td><input type="checkbox" defaultChecked={i === 0} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar" style={i === 0 ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : null}>
                        {p.n.replace('Capt. ','').split(' ').map(x => x[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{p.n}</span>
                          {p.note && <span title={p.note}><Icon name="alert" size={11} stroke={1.6} style={{ color: 'var(--warn)' }} /></span>}
                        </div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{p.op}</td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      padding: '2px 6px',
                      background: p.lic.startsWith('ATPL') ? 'var(--accent-soft)' : 'var(--surface-2)',
                      color: p.lic.startsWith('ATPL') ? 'var(--accent)' : 'var(--ink-2)',
                      border: '1px solid ' + (p.lic.startsWith('ATPL') ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' : 'var(--rule)'),
                      borderRadius: 2,
                      letterSpacing: '0.10em',
                    }}>{p.lic}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.rating.map(r => (
                        <span key={r} style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10.5,
                          padding: '2px 6px',
                          background: 'var(--surface-2)', border: '1px solid var(--rule)',
                          borderRadius: 2, color: 'var(--ink-2)',
                        }}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="num">{p.hrs.toLocaleString()}</td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: p.note ? 'var(--warn)' : 'var(--ink-2)' }}>{p.med}</span>
                  </td>
                  <td className="num">{p.age}</td>
                  <td>
                    {p.sta === 'active'   ? <span className="badge ok"><span className="dot ok" />Active</span> :
                     p.sta === 'grounded' ? <span className="badge danger"><span className="dot danger" />Grounded</span> :
                                            <span className="badge">{p.sta}</span>}
                  </td>
                  <td><button className="btn ghost icon sm"><Icon name="moreVert" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* type-rating coverage */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div className="t-label">Type-rating coverage</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Pilots rated per aircraft type</h3>
            </div>
            <div className="t-meta">Coverage drives roster eligibility · minimum 2 pilots per type</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              ['Bell 407',          14, 24, 'ok'],
              ['Bell 412',          4,  10, 'ok'],
              ['Airbus H125',       8,  16, 'ok'],
              ['Airbus H145',       3,  10, 'ok'],
              ['Eurocopter EC130',  1,  10, 'warn'],
              ['Embraer Phenom 300',6,  12, 'ok'],
              ['Cessna CJ3',        9,  18, 'ok'],
              ['Pilatus PC-24',     2,  10, 'warn'],
            ].map(([t, n, max, tone]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ flex: '0 0 180px', fontSize: 12.5 }}>{t}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: (n/max)*100 + '%', height: '100%', background: tone === 'warn' ? 'var(--warn)' : 'var(--accent)' }} />
                </div>
                <span style={{ flex: '0 0 56px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: tone === 'warn' ? 'var(--warn)' : 'var(--ink-2)' }}>{n} rated</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { AircraftDirectoryScreen, AircraftDetailScreen, PilotsCrewScreen });
