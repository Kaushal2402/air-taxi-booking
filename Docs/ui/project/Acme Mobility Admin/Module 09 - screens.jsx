/* ─────────────────────────────────────────────────────────────
   Module 09 — Operator Management (Air)
   Screens 9.1 → 9.3
   ───────────────────────────────────────────────────────────── */

const OPERATORS = [
  { id: 'OP-04', name: 'BlueSky Heliservices',  hq: 'Bengaluru',  fleet: 12, pilots: 18, routes: 14, otp: 94.2, load: 78, status: 'active',  cert: 'NSOP', commission: '12%', sinceY: 2022, payoutsMtd: '₹ 48.2 L', alert: null },
  { id: 'OP-07', name: 'Skydeck Aviation',      hq: 'Mumbai',     fleet: 8,  pilots: 14, routes: 9,  otp: 96.4, load: 82, status: 'active',  cert: 'NSOP', commission: '11%', sinceY: 2021, payoutsMtd: '₹ 62.8 L', alert: null },
  { id: 'OP-11', name: 'Aerial Mobility',       hq: 'Hyderabad',  fleet: 6,  pilots: 9,  routes: 6,  otp: 88.1, load: 67, status: 'active',  cert: 'NSOP', commission: '13%', sinceY: 2023, payoutsMtd: '₹ 21.4 L', alert: null },
  { id: 'OP-14', name: 'NimbusJet',             hq: 'Delhi',      fleet: 4,  pilots: 6,  routes: 5,  otp: 92.0, load: 71, status: 'active',  cert: 'NSOP', commission: '14%', sinceY: 2024, payoutsMtd: '₹ 12.6 L', alert: null },
  { id: 'OP-09', name: 'CoastalAir',            hq: 'Kochi',      fleet: 3,  pilots: 5,  routes: 4,  otp: 89.4, load: 64, status: 'paused',  cert: 'NSOP', commission: '13%', sinceY: 2023, payoutsMtd: '₹ 4.8 L',  alert: 'Insurance lapsed · publish-blocked' },
  { id: 'OP-18', name: 'Highland Helicopters',  hq: 'Shimla',     fleet: 4,  pilots: 7,  routes: 6,  otp: 91.8, load: 69, status: 'active',  cert: 'NSOP', commission: '13%', sinceY: 2024, payoutsMtd: '₹ 14.2 L', alert: null },
  { id: 'OP-22', name: 'IndiCharter',           hq: 'Pune',       fleet: 5,  pilots: 8,  routes: 7,  otp: 90.6, load: 73, status: 'review',  cert: 'Pending', commission: '—', sinceY: 2026, payoutsMtd: '—',     alert: 'Onboarding · 4 docs pending' },
];

// ──────────────────────────────────────────────────────────────
// 9.1 — Operator Onboarding Queue
// ──────────────────────────────────────────────────────────────
function OperatorOnboardingScreen() {
  const queue = [
    { name: 'IndiCharter',  hq: 'Pune',     when: '2d ago', stage: 'site-visit', sla: 'ok',     docs: { incorporation: 'ok', dgca: 'ok',    insurance: 'ok',    asecert: 'ok',    aoa: 'ok',     bank: 'pending' }, prog: 92, manager: 'Karthik Nair' },
    { name: 'SkyMonk',      hq: 'Goa',      when: '4d ago', stage: 'compliance', sla: 'warn',   docs: { incorporation: 'ok', dgca: 'ok',    insurance: 'pending', asecert: 'ok', aoa: 'pending', bank: 'ok' },      prog: 68, manager: 'Sana Reyes' },
    { name: 'KalingaAir',   hq: 'Bhubaneswar', when: '6d ago', stage: 'docs',    sla: 'warn',   docs: { incorporation: 'ok', dgca: 'pending', insurance: 'ok',  asecert: 'reject', aoa: 'pending', bank: 'pending' }, prog: 50, manager: 'Karthik Nair' },
    { name: 'EastWestAir',  hq: 'Kolkata',  when: '9d ago', stage: 'docs',      sla: 'danger', docs: { incorporation: 'ok', dgca: 'ok',    insurance: 'expired',asecert: 'pending', aoa: 'pending', bank: 'pending' }, prog: 42, manager: 'Sana Reyes', flag: 'Insurance expired · awaiting renewal proof' },
  ];

  const docDot = (s) => s === 'ok' ? 'ok' : s === 'pending' ? 'warn' : s === 'expired' || s === 'reject' ? 'danger' : 'pending';
  const docColor = (s) => s === 'ok' ? 'var(--accent)' : s === 'pending' ? 'var(--warn)' : s === 'expired' || s === 'reject' ? 'var(--danger)' : 'var(--ink-3)';

  return (
    <Shell
      active="operators"
      breadcrumb="People & Fleet · Operators"
      title="Operator onboarding queue"
      subtitle="4 in pipeline · 1 SLA breach · 2 site-visits scheduled"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Calendar · site visits</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Invite operator</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* summary */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            { l: 'In pipeline',         v: '4',    m: '1 ready for approval',         tone: 'var(--ink-3)' },
            { l: 'Avg time to onboard', v: '12d',  m: 'Target ≤ 14d',                  tone: 'var(--accent)' },
            { l: 'Site visits this wk', v: '2',    m: 'IndiCharter Mon · SkyMonk Thu', tone: 'var(--info)' },
            { l: 'Missing certifications', v: '6', m: 'DGCA · 2 · ASECert · 1',        tone: 'var(--warn)' },
            { l: 'SLA breach',          v: '1',    m: 'EastWestAir · 9d',              tone: 'var(--danger)' },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: '18px 22px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{s.l}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.018em' }}>{s.v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: s.tone }}>{s.m}</div>
            </div>
          ))}
        </div>

        {/* queue cards */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          {queue.map((c, i) => (
            <div key={c.name} style={{
              padding: '22px 26px',
              borderBottom: i < queue.length - 1 ? '1px solid var(--rule-soft)' : 'none',
              display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 1fr 160px', gap: 24, alignItems: 'flex-start',
              background: i === 0 ? 'var(--accent-soft-2)' : 'transparent',
            }}>
              {/* identity */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 3,
                    background: 'var(--surface-sunk)',
                    border: '1px solid var(--rule-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--ink-2)',
                  }}><Icon name="helipad" size={24} /></div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.014em' }}>{c.name}</div>
                    <div className="t-meta" style={{ marginTop: 4 }}>{c.hq} · submitted {c.when}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                      <span className={'badge ' + (c.sla === 'danger' ? 'danger' : c.sla === 'warn' ? 'warn' : 'ok')}>
                        <span className={'dot ' + (c.sla === 'danger' ? 'danger' : c.sla === 'warn' ? 'warn' : 'ok')} />
                        SLA {c.sla === 'danger' ? 'breach' : c.sla === 'warn' ? 'risk' : 'ok'}
                      </span>
                      <span className="badge">{c.prog}% complete</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* docs */}
              <div>
                <div className="t-label" style={{ marginBottom: 10 }}>Documents · 6 required</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {Object.entries(c.docs).map(([k, v]) => (
                    <div key={k} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px',
                      background: v === 'ok' ? 'var(--accent-soft)' : v === 'pending' ? 'var(--warn-soft)' : 'var(--danger-soft)',
                      border: '1px solid ' + (v === 'ok' ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' : v === 'pending' ? 'color-mix(in oklab, var(--warn) 28%, var(--rule-strong))' : 'color-mix(in oklab, var(--danger) 30%, var(--rule-strong))'),
                      borderRadius: 2,
                    }}>
                      <span className={'dot ' + docDot(v)} style={{ width: 6, height: 6, boxShadow: 'none' }} />
                      <span style={{ flex: 1, fontSize: 11.5, color: 'var(--ink-2)' }}>{({ incorporation: 'Incorp.', dgca: 'DGCA', insurance: 'Insurance', asecert: 'ASECert', aoa: 'AOA', bank: 'Bank' })[k]}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.10em', color: docColor(v), textTransform: 'uppercase' }}>{v}</span>
                    </div>
                  ))}
                </div>
                {c.flag && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--danger)' }}>{c.flag}</div>}
              </div>

              {/* stage + manager */}
              <div>
                <div className="t-label" style={{ padding: 0 }}>Stage</div>
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['signup', 'docs', 'compliance', 'site-visit', 'approved'].map((s, idx) => {
                    const stages = ['signup', 'docs', 'compliance', 'site-visit', 'approved'];
                    const curIdx = stages.indexOf(c.stage);
                    const passed = idx <= curIdx;
                    return (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: passed ? 'var(--accent)' : 'var(--rule-strong)',
                        }} />
                        <span style={{
                          fontSize: 11.5, color: idx === curIdx ? 'var(--ink)' : passed ? 'var(--ink-3)' : 'var(--ink-4)',
                          fontWeight: idx === curIdx ? 500 : 400, textTransform: 'capitalize',
                        }}>{s.replace('-', ' ')}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="t-label" style={{ padding: 0, marginTop: 12 }}>Manager</div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-2)' }}>{c.manager}</div>
              </div>

              {/* actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn accent sm">Review →</button>
                <button className="btn sm">Schedule site-visit</button>
                <button className="btn sm">Request docs</button>
                <button className="btn sm ghost danger">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 9.2 — Operator Directory
// ──────────────────────────────────────────────────────────────
function OperatorDirectoryScreen() {
  return (
    <Shell
      active="operators"
      breadcrumb="People & Fleet · Operators"
      title="Air operators"
      subtitle="7 onboarded · 5 active · 1 paused · 1 in review · 42 aircraft"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Onboarding queue</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Invite operator</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* segmented */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            { l: 'All operators',  n: '7',  active: true },
            { l: 'Active',         n: '5',  tone: 'var(--accent)' },
            { l: 'Paused',         n: '1',  tone: 'var(--warn)' },
            { l: 'Pending',        n: '1',  tone: 'var(--info)' },
            { l: 'Cert expiring',  n: '2',  tone: 'var(--warn)' },
          ].map((v, i) => (
            <div key={v.l} style={{
              padding: '16px 20px',
              borderRight: i < 4 ? '1px solid var(--rule)' : 'none',
              borderBottom: v.active ? '2px solid var(--accent)' : '2px solid transparent',
              background: v.active ? 'var(--surface-2)' : 'transparent', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: v.active ? 'var(--ink)' : 'var(--ink-2)' }}>{v.l}</span>
                {v.tone && !v.active && <span className="dot" style={{ background: v.tone }} />}
              </div>
              <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.018em' }}>{v.n}</div>
            </div>
          ))}
        </div>

        {/* filter */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="input" style={{ width: 260, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Name, HQ, route, registration mark…" />
          </div>
          <FilterChip label="Status" value="Active" count={1} />
          <FilterChip label="HQ" value="All" />
          <FilterChip label="Fleet size" value="Any" />
          <FilterChip label="Certification" value="NSOP" count={1} />
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost">Sort · OTP ↓</button>
        </div>

        {/* table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }}><input type="checkbox" /></th>
                <th>Operator</th>
                <th>HQ</th>
                <th>Fleet</th>
                <th>Crew</th>
                <th>Routes</th>
                <th>OTP · 30d</th>
                <th>Load · 30d</th>
                <th>Payouts MTD</th>
                <th>Commission</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {OPERATORS.map((o, i) => (
                <tr key={o.id} className={i === 0 ? 'selected' : ''}>
                  <td><input type="checkbox" defaultChecked={i === 0} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 3,
                        background: i === 0 ? 'var(--accent-soft)' : 'var(--surface-sunk)',
                        color: i === 0 ? 'var(--accent)' : 'var(--ink-2)',
                        border: '1px solid ' + (i === 0 ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' : 'var(--rule)'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><Icon name="helipad" size={15} /></div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{o.name}</span>
                          {o.alert && <span title={o.alert}><Icon name="alert" size={11} stroke={1.6} style={{ color: o.status === 'paused' ? 'var(--danger)' : 'var(--warn)' }} /></span>}
                        </div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{o.id} · since {o.sinceY}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>{o.hq}</td>
                  <td className="num">{o.fleet}</td>
                  <td className="num">{o.pilots}</td>
                  <td className="num">{o.routes}</td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', color: o.otp >= 95 ? 'var(--accent)' : o.otp >= 90 ? 'var(--ink-2)' : 'var(--warn)' }}>
                      {o.otp}%
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: o.load + '%', height: '100%', background: o.load >= 75 ? 'var(--accent)' : 'var(--ink-3)' }} />
                      </div>
                      <span className="num" style={{ color: 'var(--ink-2)' }}>{o.load}%</span>
                    </div>
                  </td>
                  <td className="num">{o.payoutsMtd}</td>
                  <td className="num">{o.commission}</td>
                  <td>
                    {o.status === 'active'  ? <span className="badge ok"><span className="dot ok" />Active</span> :
                     o.status === 'paused'  ? <span className="badge danger"><span className="dot danger" />Paused</span> :
                     o.status === 'review'  ? <span className="badge warn"><span className="dot warn" />Review</span> :
                     <span className="badge">{o.status}</span>}
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
// 9.3 — Operator Detail
// ──────────────────────────────────────────────────────────────
function OperatorDetailScreen() {
  const tabs = ['Company', 'Fleet · 12', 'Crew · 18', 'Routes · 14', 'Performance', 'Payouts', 'Compliance', 'Audit'];

  return (
    <Shell
      active="operators"
      breadcrumb="People & Fleet · Operators"
      title="BlueSky Heliservices"
      subtitle="OP-04 · Bengaluru · NSOP · 12 aircraft · 18 crew · partner since Mar 2022"
      actions={
        <>
          <button className="btn sm"><Icon name="envelope" size={13} />Message ops</button>
          <button className="btn sm">Pause publishing</button>
          <button className="btn sm">Configure commission</button>
          <button className="btn sm">Edit</button>
        </>
      }
    >
      <div>
        {/* hero */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--rule)', padding: '28px 32px', display: 'grid', gridTemplateColumns: '430px 1fr', gap: 36 }}>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 4,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
            }}>
              <Icon name="helipad" size={36} stroke={1.2} />
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span className="badge ok"><span className="dot ok" />Active</span>
                <span className="badge">NSOP · DGCA</span>
                <span className="badge"><Icon name="shield" size={9} /> Vetted · A</span>
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.020em', lineHeight: 1.05 }}>BlueSky Heliservices</div>
              <div className="t-meta" style={{ marginTop: 6 }}>HQ Bengaluru · OP-04 · NSOP Cert KA-DGCA-NS-2018-114 · ops@blueskyheli.in</div>
              <div className="t-meta" style={{ marginTop: 2 }}>Contact · Capt. Renu Bhandari · +91 98455 17422</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, alignSelf: 'center' }}>
            {[
              ['Aircraft',        '12',     '2 grounded · 10 ready',     'var(--ink)'],
              ['OTP · 30d',       '94.2%',  '+1.4 vs. last 30d',         'var(--accent)'],
              ['Load factor',     '78%',    'Target ≥ 75%',              'var(--accent)'],
              ['Flights · 30d',   '184',    '+12% vs. last 30d',         'var(--ink-2)'],
              ['Payouts MTD',     '₹48.2 L','Next run Fri 29 May',       'var(--ink)'],
            ].map(([k, v, m, c], i) => (
              <div key={k} style={{ padding: '0 18px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: c }}>{v}</div>
                <div className="t-meta" style={{ marginTop: 6 }}>{m}</div>
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
          {/* left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* compliance docs */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="t-label">Compliance · company-level</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>5 active certifications</h3>
                </div>
                <button className="btn sm"><Icon name="upload" size={12} />Upload</button>
              </div>
              <table className="tbl">
                <thead><tr><th>Certification</th><th>Reference</th><th>Issued</th><th>Expiry</th><th>Status</th></tr></thead>
                <tbody>
                  {[
                    ['Non-Scheduled Operator Permit',  'KA-DGCA-NS-2018-114',  '14 Mar 2018', '14 Mar 2028', 660, 'ok'],
                    ['Air Operator Certificate',       'AOC-DGCA-NS-2018-114', '14 Mar 2018', '14 Mar 2028', 660, 'ok'],
                    ['Aviation Security · ASECert',    'BCAS-2024-882',        '02 Feb 2024', '02 Feb 2027', 252, 'ok'],
                    ['Hull & liability insurance',     'NIAC-AV-2025-4421',    '01 Apr 2025', '31 Mar 2027', 310, 'ok'],
                    ['Public liability insurance',     'BAJAJ-PL-2025-1188',   '12 Apr 2025', '11 Apr 2027', 320, 'ok'],
                  ].map(([k, r, iss, exp, days, tone], i) => (
                    <tr key={k}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Icon name="shield" size={14} style={{ color: 'var(--accent)' }} />
                          <span style={{ fontSize: 13 }}>{k}</span>
                        </div>
                      </td>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{r}</td>
                      <td className="num" style={{ color: 'var(--ink-3)' }}>{iss}</td>
                      <td className="num">{exp}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: Math.min(100, (days / 720) * 100) + '%', height: '100%', background: 'var(--accent)' }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>{days}d</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* fleet preview */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="t-label">Fleet · 12 aircraft</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>10 ready · 2 maintenance</h3>
                </div>
                <button className="btn sm">Open fleet →</button>
              </div>
              <table className="tbl">
                <thead><tr><th>Registration</th><th>Type</th><th>Seats</th><th>MTOW</th><th>Last flight</th><th>Status</th></tr></thead>
                <tbody>
                  {[
                    ['VT-BSE', 'Bell 407',          6, '2,722 kg', '2h ago',         'ok'],
                    ['VT-BSF', 'Bell 407',          6, '2,722 kg', 'Today',          'ok'],
                    ['VT-BSG', 'Airbus H125',       6, '2,250 kg', 'Yesterday',      'ok'],
                    ['VT-BSH', 'Airbus H125',       6, '2,250 kg', '11h ago',        'ok'],
                    ['VT-BSI', 'Bell 412',          14,'5,397 kg', '3d ago · maint', 'warn'],
                    ['VT-BSJ', 'Airbus H145',       9, '3,800 kg', '5h ago',         'ok'],
                  ].map(([r, t, s, m, l, tn]) => (
                    <tr key={r}>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>{r}</span></td>
                      <td style={{ fontSize: 13 }}>{t}</td>
                      <td className="num">{s}</td>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{m}</td>
                      <td className="num" style={{ color: 'var(--ink-3)' }}>{l}</td>
                      <td>{tn === 'ok' ? <span className="badge ok"><span className="dot ok" />Ready</span> : <span className="badge warn"><span className="dot warn" />Maint.</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* commission card */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 10 }}>Commission configuration</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, letterSpacing: '-0.018em' }}>12%</span>
                <span className="t-meta">platform commission · custom</span>
              </div>
              <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Heli shuttle · default</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>12%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Heli on-demand</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>14%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0' }}>
                  <span style={{ color: 'var(--ink-2)' }}>BLR → MYS route override</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>10%</span>
                </div>
              </div>
              <button className="btn sm" style={{ marginTop: 14, width: '100%' }}><Icon name="cog" size={12} />Edit commission</button>
            </div>

            {/* performance */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 14 }}>Performance · 30d</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['On-time performance',  '94.2%', 94.2, 'var(--accent)'],
                  ['Load factor',          '78%',   78,   'var(--ink)'],
                  ['Cancellation rate',    '3.1%',  85,   'var(--accent)'],
                  ['Customer rating',      '4.84',  88,   'var(--accent)'],
                  ['Quote response time',  '8 min', 75,   'var(--ink-2)'],
                ].map(([k, v, p, c]) => (
                  <div key={k}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{k}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: c }}>{v}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: p + '%', height: '100%', background: c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* payouts */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 10 }}>Settlement · next run</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 28 }}>₹ 12.4 L</span>
                <span className="t-meta">net · 31 flights</span>
              </div>
              <div className="t-meta" style={{ marginTop: 4, color: 'var(--ink-3)' }}>Run Fri 29 May · awaiting Finance approval</div>
              <button className="btn sm ghost" style={{ marginTop: 12, width: '100%' }}><Icon name="external" size={11} />Open in Payouts</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { OperatorOnboardingScreen, OperatorDirectoryScreen, OperatorDetailScreen });
