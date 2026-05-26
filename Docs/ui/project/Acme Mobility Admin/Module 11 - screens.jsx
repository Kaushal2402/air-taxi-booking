/* ─────────────────────────────────────────────────────────────
   Module 11 — Customer Management
   Screens 11.1 → 11.3
   ───────────────────────────────────────────────────────────── */

const CUSTOMERS = [
  { id: 'C-08-2210', n: 'Aarav Kapoor',     ph: '+91 98201 17542', em: 'aarav.k@gmail.com',     city: 'Bengaluru', joined: 'Apr 2021', trips: 412, ltv: '₹ 3.84 L', rating: 4.96, segment: 'Loyalist',     status: 'active',   wallet: '₹ 1,180', last: '2h ago',     flag: null },
  { id: 'C-08-2209', n: 'Vikram Bhatt',     ph: '+91 98455 02711', em: 'vbhatt@acmecorp.io',     city: 'Bengaluru', joined: 'Oct 2020', trips: 184, ltv: '₹ 28.4 L', rating: 4.92, segment: 'VIP · Corp',   status: 'active',   wallet: '₹ 0',     last: '4h ago',     flag: null },
  { id: 'C-08-2208', n: 'Meera Sharma',     ph: '+91 88455 38421', em: 'meera.s@gmail.com',      city: 'Bengaluru', joined: 'Jun 2022', trips: 218, ltv: '₹ 1.42 L', rating: 4.84, segment: 'Frequent',     status: 'active',   wallet: '₹ 410',   last: '12m ago',    flag: null },
  { id: 'C-08-2207', n: 'Diya Menon',       ph: '+91 99020 17542', em: 'diya.menon@gmail.com',   city: 'Bengaluru', joined: 'Sep 2022', trips: 168, ltv: '₹ 88,420', rating: 4.84, segment: 'Frequent',     status: 'active',   wallet: '₹ 240',   last: '38m ago',    flag: 'Repeated cancellations · 4 in 7d' },
  { id: 'C-08-2206', n: 'Ishan Patel',      ph: '+91 96412 88002', em: 'ishan.p@gmail.com',      city: 'Bengaluru', joined: 'Jan 2024', trips: 64,  ltv: '₹ 22,180', rating: 4.66, segment: 'New',          status: 'active',   wallet: '₹ 80',    last: '1h ago',     flag: null },
  { id: 'C-08-2205', n: 'Karthik Reddy',    ph: '+91 70422 10018', em: 'karthik.r@gmail.com',    city: 'Bengaluru', joined: 'Feb 2023', trips: 92,  ltv: '₹ 42,180', rating: 4.42, segment: 'Frequent',     status: 'flagged',  wallet: '₹ 0',     last: 'Yesterday',  flag: 'Driver no-show dispute · 11 May' },
  { id: 'C-08-2204', n: 'Anushka Roy',      ph: '+91 80710 22019', em: 'anushka.roy@gmail.com',  city: 'Bengaluru', joined: 'Mar 2024', trips: 38,  ltv: '₹ 14,820', rating: 4.92, segment: 'New',          status: 'active',   wallet: '₹ 50',    last: '6h ago',     flag: null },
  { id: 'C-08-2203', n: 'Priya Iyer',       ph: '+91 99022 18002', em: 'priya.i@gmail.com',      city: 'Bengaluru', joined: 'Aug 2020', trips: 488, ltv: '₹ 4.12 L', rating: 4.94, segment: 'Loyalist',     status: 'active',   wallet: '₹ 2,840', last: '8h ago',     flag: null },
  { id: 'C-08-2202', n: 'Rohan Mehta',      ph: '+91 88475 91229', em: 'rohan.m@acmecorp.io',     city: 'Mumbai',    joined: 'May 2022', trips: 142, ltv: '₹ 12.4 L', rating: 4.84, segment: 'VIP · Corp',   status: 'active',   wallet: '₹ 0',     last: 'Today',      flag: null },
  { id: 'C-08-2201', n: 'Tariq Ahmed',      ph: '+91 96448 02710', em: 'tariq.a@gmail.com',      city: 'Bengaluru', joined: 'Nov 2023', trips: 81,  ltv: '₹ 38,180', rating: 4.61, segment: 'Frequent',     status: 'active',   wallet: '₹ 180',   last: '12h ago',    flag: null },
  { id: 'C-08-2200', n: 'Hema Rao',         ph: '+91 88455 71229', em: 'hema.rao@gmail.com',     city: 'Bengaluru', joined: 'Jul 2023', trips: 128, ltv: '₹ 92,440', rating: 4.78, segment: 'Frequent',     status: 'flagged',  wallet: '₹ 0',     last: 'Today',      flag: 'Open dispute · D-2806' },
  { id: 'C-08-2199', n: 'Imran Shaikh',     ph: '+91 70410 22019', em: 'imran.s@gmail.com',      city: 'Bengaluru', joined: 'Aug 2024', trips: 22,  ltv: '₹ 8,420',  rating: 4.50, segment: 'New',          status: 'active',   wallet: '₹ 40',    last: '2 days ago', flag: null },
];

// ──────────────────────────────────────────────────────────────
// 11.1 — Customer Directory
// ──────────────────────────────────────────────────────────────
function CustomerDirectoryScreen() {
  return (
    <Shell
      active="customers"
      breadcrumb="People & Fleet · Customers"
      title="Customers"
      subtitle="42,184 lifetime · 8,210 active · 184 flagged · 22 corporate"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Cohorts</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Add customer</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* segments */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {[
            { l: 'All',         n: '42,184', active: true },
            { l: 'VIP · Corp',  n: '22',     tone: 'var(--accent)' },
            { l: 'Loyalists',   n: '1,420',  tone: 'var(--ink-2)' },
            { l: 'Frequent',    n: '6,820',  tone: 'var(--info)' },
            { l: 'New · 30d',   n: '2,184',  tone: 'var(--info)' },
            { l: 'Flagged',     n: '184',    tone: 'var(--danger)' },
          ].map((v, i) => (
            <div key={v.l} style={{
              padding: '16px 18px',
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

        {/* filter */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="input" style={{ width: 280, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Name, phone, email, customer ID…" />
          </div>
          <FilterChip label="Segment" value="All" />
          <FilterChip label="City" value="Bengaluru" count={1} />
          <FilterChip label="Status" value="Active" count={1} />
          <FilterChip label="LTV" value="Any" />
          <FilterChip label="Joined" value="Anytime" />
          <FilterChip label="Flag" value="Any" />
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost">Sort · LTV ↓</button>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }}><input type="checkbox" /></th>
                <th>Customer</th>
                <th>Segment</th>
                <th>Trips</th>
                <th>LTV</th>
                <th>Rating</th>
                <th>Wallet</th>
                <th>Last active</th>
                <th>Joined</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {CUSTOMERS.map((c, i) => (
                <tr key={c.id} className={i === 0 ? 'selected' : ''}>
                  <td><input type="checkbox" defaultChecked={i === 0} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar" style={c.segment.includes('VIP') ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : null}>
                        {c.n.split(' ').map(p => p[0]).join('')}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{c.n}</span>
                          {c.flag && <span title={c.flag}><Icon name="flag" size={11} stroke={1.6} style={{ color: 'var(--danger)' }} /></span>}
                        </div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{c.id} · {c.ph}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10.5,
                      padding: '2px 7px', borderRadius: 2, letterSpacing: '0.10em', textTransform: 'uppercase',
                      background: c.segment.includes('VIP') ? 'var(--accent-soft)' :
                                  c.segment === 'Loyalist' ? 'var(--surface-sunk)' :
                                  c.segment === 'Frequent' ? 'var(--info-soft)' :
                                  'var(--surface-2)',
                      color: c.segment.includes('VIP') ? 'var(--accent)' :
                             c.segment === 'Loyalist' ? 'var(--ink)' :
                             c.segment === 'Frequent' ? 'var(--info)' :
                             'var(--ink-3)',
                      border: '1px solid ' + (c.segment.includes('VIP') ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' :
                                              c.segment === 'Frequent' ? 'color-mix(in oklab, var(--info) 22%, var(--rule-strong))' :
                                              'var(--rule)'),
                    }}>{c.segment}</span>
                  </td>
                  <td className="num">{c.trips}</td>
                  <td className="num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{c.ltv}</td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', color: c.rating >= 4.8 ? 'var(--accent)' : c.rating >= 4.5 ? 'var(--ink-2)' : 'var(--warn)' }}>{c.rating.toFixed(2)}</span>
                    <span style={{ color: 'var(--ink-4)', marginLeft: 3 }}>★</span>
                  </td>
                  <td className="num" style={{ color: 'var(--ink-2)' }}>{c.wallet}</td>
                  <td className="num" style={{ color: 'var(--ink-3)' }}>{c.last}</td>
                  <td className="num" style={{ color: 'var(--ink-3)' }}>{c.joined}</td>
                  <td>
                    {c.status === 'active'  ? <span className="badge ok"><span className="dot ok" />Active</span> :
                     c.status === 'flagged' ? <span className="badge warn"><span className="dot warn" />Flagged</span> :
                                              <span className="badge danger"><span className="dot danger" />Banned</span>}
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
// 11.2 — Customer Detail
// ──────────────────────────────────────────────────────────────
function CustomerDetailScreen() {
  const tabs = ['Overview', 'Trips · 412', 'Payments', 'Wallet & ledger', 'Addresses', 'Tickets · 3', 'Risk · 0', 'Audit'];

  // 12-month trips spark
  const months = [22, 28, 24, 31, 36, 38, 41, 39, 44, 42, 38, 49];
  const w = 460, h = 110, padX = 10, padT = 10, padB = 22;
  const min = Math.min(...months), max = Math.max(...months);
  const xAt = i => padX + (i / (months.length - 1)) * (w - 2 * padX);
  const yAt = v => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);
  const path = months.map((v, i) => (i ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + yAt(v).toFixed(1)).join(' ');
  const fillPath = path + ` L${xAt(months.length-1)} ${h-padB} L${xAt(0)} ${h-padB} Z`;

  return (
    <Shell
      active="customers"
      breadcrumb="People & Fleet · Customers"
      title="Aarav Kapoor"
      subtitle="C-08-2210 · Loyalist · 412 trips · 5y member · LTV ₹3.84L"
      actions={
        <>
          <button className="btn sm"><Icon name="envelope" size={13} />Message</button>
          <button className="btn sm">Goodwill credit</button>
          <button className="btn sm">Flag</button>
          <button className="btn sm danger">Suspend</button>
        </>
      }
    >
      <div>
        {/* hero */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--rule)', padding: '28px 32px', display: 'grid', gridTemplateColumns: '420px 1fr', gap: 36 }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div className="avatar xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>AK</div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span className="badge ok"><span className="dot ok" />Active</span>
                <span className="badge"><Icon name="shield" size={9} />Loyalist · 5y</span>
                <span className="badge"><span className="dot ok" />KYC OK</span>
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.020em' }}>Aarav Kapoor</div>
              <div className="t-meta" style={{ marginTop: 6 }}>C-08-2210 · +91 98201 17542 · aarav.k@gmail.com</div>
              <div className="t-meta" style={{ marginTop: 2 }}>Bengaluru · joined 04 Apr 2021 · referred by Priya Iyer</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, alignSelf: 'center' }}>
            {[
              ['Total trips',     '412',     '8 in last 7d',           'var(--ink)'],
              ['Lifetime spend',  '₹ 3.84 L','+₹ 18.4K last 30d',      'var(--ink)'],
              ['Avg fare',        '₹ 932',   'Last 30d',               'var(--ink-2)'],
              ['Rating · given',  '4.92 ★',  'Across all drivers',     'var(--accent)'],
              ['Cancellations',   '2.1%',    'Within healthy range',   'var(--ink-2)'],
            ].map(([k, v, m, c], i) => (
              <div key={k} style={{ padding: '0 18px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 22, color: c }}>{v}</div>
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

        <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
          {/* left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* trips per month */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div className="t-label">Trips per month · last 12</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Sustained heavy user · trending up</h3>
                </div>
                <div className="t-meta">432 trips · all-time</div>
              </div>
              <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 120 }}>
                <path d={fillPath} fill="var(--accent)" opacity="0.10" />
                <path d={path} stroke="var(--accent)" strokeWidth="1.6" fill="none" />
                {months.map((v, i) => (
                  <g key={i}>
                    <circle cx={xAt(i)} cy={yAt(v)} r="2.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.2" />
                    <text x={xAt(i)} y={h - 6} textAnchor="middle" fill="var(--ink-3)" style={{ font: '9px IBM Plex Mono' }}>
                      {['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'][i]}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* recent trips */}
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                <div className="t-label">Recent trips</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Last 8 rides</h3>
              </div>
              <table className="tbl">
                <thead><tr><th>When</th><th>Driver · Vehicle</th><th>Route</th><th>Fare</th><th>Payment</th><th>Rated</th></tr></thead>
                <tbody>
                  {[
                    ['Now',           'Ravi M · Sedan',     'Indiranagar → KIAL T2',         '₹1,240', 'Card ●● 4421', '—'],
                    ['Today 09:42',   'Sumit J · Sedan',    'KIAL T1 → Indiranagar',          '₹1,180', 'Card ●● 4421', '★ 5'],
                    ['Yesterday',     'Hemant S · XL',      'Indiranagar → HSR',              '₹520',   'UPI',          '★ 5'],
                    ['Sat · 18 May',  'Praveen R · XL',     'Indiranagar → MG Road',          '₹260',   'Wallet',       '★ 5'],
                    ['Fri · 17 May',  'Sundar P · Sedan',   'MG Road → Whitefield',           '₹920',   'Card ●● 4421', '★ 5'],
                    ['Thu · 16 May',  'Vinay K · Sedan',    'Indiranagar → KIAL T2',          '₹1,240', 'Card ●● 4421', '★ 5'],
                    ['Tue · 14 May',  'Mahesh K · XL',      'KIAL T2 → Indiranagar',          '₹1,290', 'Card ●● 4421', '★ 4'],
                    ['Sun · 12 May',  'Naveed K · XL',      'Indiranagar → Bommanahalli',     '₹680',   'UPI',          '★ 5'],
                  ].map((r, i) => (
                    <tr key={i}>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{r[0]}</td>
                      <td style={{ fontSize: 13 }}>{r[1]}</td>
                      <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{r[2]}</td>
                      <td className="num">{r[3]}</td>
                      <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{r[4]}</td>
                      <td className="num" style={{ color: 'var(--accent)' }}>{r[5]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* habit */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 10 }}>Service mix · last 90d</div>
              <div style={{ display: 'flex', height: 8, borderRadius: 2, overflow: 'hidden', background: 'var(--rule)' }}>
                <div style={{ width: '64%', background: 'var(--ink)' }} />
                <div style={{ width: '24%', background: 'var(--accent)' }} />
                <div style={{ width: '8%',  background: 'var(--info)' }} />
                <div style={{ width: '4%',  background: 'var(--warn)' }} />
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['Sedan',    '64%', 'var(--ink)'],
                  ['XL',       '24%', 'var(--accent)'],
                  ['Bike',     '8%',  'var(--info)'],
                  ['Heli',     '4%',  'var(--warn)'],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, background: c }} />
                    <span style={{ flex: 1, fontSize: 12.5 }}>{k}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="t-meta" style={{ marginTop: 14, color: 'var(--ink-3)' }}>Favours airport runs · 28% of trips end at KIAL T2.</div>
            </div>

            {/* payment methods */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 12 }}>Payment methods · 3</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { brand: 'VISA', mask: '●●●● 4421', sub: 'Visa Premier · default · Exp 09/27', primary: true },
                  { brand: 'BHIM', mask: 'aarav@upi',  sub: 'UPI · BHIM',  primary: false },
                  { brand: 'WAL',  mask: '₹ 1,180',   sub: 'Wallet balance', primary: false },
                ].map((p, i) => (
                  <div key={i} style={{
                    padding: '10px 12px',
                    border: '1px solid ' + (p.primary ? 'var(--accent)' : 'var(--rule)'),
                    background: p.primary ? 'var(--accent-soft-2)' : 'var(--surface)',
                    borderRadius: 3,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 36, height: 24, borderRadius: 2,
                      background: p.brand === 'VISA' ? 'var(--ink)' : p.brand === 'BHIM' ? 'var(--info)' : 'var(--accent)',
                      color: 'var(--surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
                    }}>{p.brand}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{p.mask}</div>
                      <div className="t-meta" style={{ marginTop: 2 }}>{p.sub}</div>
                    </div>
                    {p.primary && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.12em', color: 'var(--accent)' }}>● DEFAULT</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* favorite addresses */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 12 }}>Saved places · 4</div>
              {[
                ['Home',  '100 Ft Rd · Indiranagar',           '128 trips · most-used pickup'],
                ['Work',  '47 Brigade Sq · MG Road',           '88 trips'],
                ['KIAL',  'Kempegowda Intl Airport · T2',      '94 trips · airport runs'],
                ['Mom',   'Jayanagar 4 block · 2nd cross',     '22 trips'],
              ].map(([k, v, m], i) => (
                <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <Icon name="map" size={13} style={{ color: 'var(--ink-3)', marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>{k} · <span className="t-meta" style={{ color: 'var(--ink-2)' }}>{v}</span></div>
                    <div className="t-meta" style={{ marginTop: 2, color: 'var(--ink-3)' }}>{m}</div>
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

// ──────────────────────────────────────────────────────────────
// 11.3 — Wallet Adjust (modal-style overlay)
// ──────────────────────────────────────────────────────────────
function CustomerWalletAdjustScreen() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ filter: 'blur(2px) saturate(0.5)', opacity: 0.5, height: '100%', overflow: 'hidden' }}>
        <CustomerDirectoryScreen />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in oklab, var(--ink) 35%, transparent)' }} />

      <div style={{
        position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
        width: 760,
        background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)',
      }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 4, flexShrink: 0,
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
          }}><Icon name="wallet" size={20} /></div>
          <div style={{ flex: 1 }}>
            <div className="t-label">Customer wallet · Aarav Kapoor · C-08-2210</div>
            <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, letterSpacing: '-0.018em' }}>Issue goodwill credit</h2>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-3)' }}>
              Current balance <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>₹1,180</span> · next trip applies wallet first by default
            </div>
          </div>
          <button className="btn ghost icon sm"><Icon name="close" size={14} /></button>
        </div>

        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="t-label" style={{ marginBottom: 10 }}>Direction</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {[
                ['Credit',  true,  'var(--accent)'],
                ['Debit',   false, 'var(--danger)'],
              ].map(([l, on, c]) => (
                <div key={l} style={{
                  flex: 1, padding: '12px 14px',
                  border: '1px solid ' + (on ? c : 'var(--rule)'),
                  background: on ? 'color-mix(in oklab, ' + c + ' 8%, var(--surface))' : 'var(--surface)',
                  borderRadius: 3,
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                }}>
                  <Icon name={l === 'Credit' ? 'plus' : 'close'} size={13} stroke={2.2} style={{ color: on ? c : 'var(--ink-3)' }} />
                  <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: on ? 500 : 400 }}>{l}</span>
                </div>
              ))}
            </div>

            <div className="t-label" style={{ marginBottom: 10 }}>Amount</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--accent)', borderRadius: 3, padding: '14px 16px', background: 'var(--accent-soft-2)' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 30, color: 'var(--accent)', marginRight: 12 }}>₹</span>
              <input defaultValue="500" style={{ flex: 1, border: 0, background: 'transparent', outline: 'none', fontFamily: 'var(--font-serif)', fontSize: 34, color: 'var(--ink)' }} />
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              {[100, 250, 500, 1000, 'Custom'].map(p => (
                <button key={p} className="btn sm ghost" style={{
                  border: '1px dashed var(--rule-strong)',
                  fontFamily: 'var(--font-mono)', fontSize: 11.5,
                  color: p === 500 ? 'var(--accent)' : 'var(--ink-2)',
                  background: p === 500 ? 'var(--accent-soft-2)' : 'transparent',
                }}>{typeof p === 'number' ? `₹${p}` : p}</button>
              ))}
            </div>

            <div className="t-label" style={{ marginTop: 22, marginBottom: 10 }}>Reason · required</div>
            <div className="input">
              <input defaultValue="Driver delay on KIAL run · 18 May" />
              <Icon name="chevDown" size={14} className="icon" />
            </div>

            <div className="t-label" style={{ marginTop: 18, marginBottom: 10 }}>Audit note · internal</div>
            <div className="input">
              <input placeholder="Optional note for the file" defaultValue="Customer wrote in to support · ticket T-23104" />
            </div>
          </div>

          <div>
            <div className="t-label" style={{ marginBottom: 10 }}>Preview</div>
            <div style={{ padding: '18px 20px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
              <table className="tbl" style={{ marginTop: 0 }}>
                <tbody>
                  {[
                    ['Current balance',  '₹ 1,180', 'var(--ink-2)'],
                    ['Goodwill credit',  '+₹ 500',  'var(--accent)'],
                    ['Tax adjustment',   '₹ 0',     'var(--ink-3)'],
                  ].map(([k, v, c]) => (
                    <tr key={k}>
                      <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>{k}</td>
                      <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: c }}>{v}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid var(--rule-strong)' }}>
                    <td style={{ padding: '14px 0 0', border: 0, fontSize: 14, fontWeight: 500 }}>New balance</td>
                    <td className="num" style={{ padding: '14px 0 0', border: 0, textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--accent)' }}>₹ 1,680</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--info-soft)', border: '1px solid color-mix(in oklab, var(--info) 24%, var(--rule-strong))', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--info)' }}>
                <Icon name="shield" size={13} />
                <span className="t-label" style={{ padding: 0, color: 'var(--info)' }}>Within your goodwill cap</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
                ₹500 is within your per-customer credit cap (₹2,000) and below the ₹1,000 single-action threshold that would need Finance approval. You may issue this directly.
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Notify customer</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Push', 'SMS', 'Email'].map(c => (
                  <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flex: 1, background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12.5, cursor: 'pointer' }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: 2,
                      border: '1px solid ' + (c === 'Push' ? 'var(--accent)' : 'var(--rule-strong)'),
                      background: c === 'Push' ? 'var(--accent)' : 'var(--surface)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {c === 'Push' && <Icon name="check" size={9} stroke={2.4} style={{ color: '#fff' }} />}
                    </span>
                    {c}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between' }}>
          <div className="t-meta">All wallet adjustments are double-entry · audit-logged as Sana Reyes</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn">Cancel</button>
            <button className="btn accent">Credit ₹500 →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  CustomerDirectoryScreen, CustomerDetailScreen, CustomerWalletAdjustScreen,
  CUSTOMERS,
});
