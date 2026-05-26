/* ─────────────────────────────────────────────────────────────
   Module 07 — Driver Management
   Screens 7.1 → 7.4
   ───────────────────────────────────────────────────────────── */

const DRIVERS = [
  { id: 'D-12047', n: 'Ravi Mahesh',      ph: '+91 96114 28805', city: 'BLR · Z-N4',  vehicle: 'KA 05 MK 4271 · Sedan',  status: 'active',    online: true,  trips: 7184, rating: 4.92, accept: '94%', cancel: '2.1%', kyc: 'approved', joined: '04 Mar 2021' },
  { id: 'D-12046', n: 'Sumit Joshi',      ph: '+91 98455 19223', city: 'BLR · Z-S2',  vehicle: 'KA 03 PA 2210 · Sedan',  status: 'active',    online: true,  trips: 5421, rating: 4.88, accept: '91%', cancel: '2.4%', kyc: 'approved', joined: '12 Jun 2021' },
  { id: 'D-12045', n: 'Mohammed Aslam',   ph: '+91 99022 41108', city: 'BLR · Z-S2',  vehicle: 'KA 03 EM 1129 · Bike',   status: 'active',    online: true,  trips: 4882, rating: 4.84, accept: '90%', cancel: '2.6%', kyc: 'approved', joined: '21 Aug 2021' },
  { id: 'D-12044', n: 'Vinay Kumar',      ph: '+91 89712 84551', city: 'BLR · Z-N1',  vehicle: 'KA 05 EL 9912 · Sedan',  status: 'active',    online: false, trips: 6210, rating: 4.84, accept: '89%', cancel: '2.9%', kyc: 'approved', joined: '14 Sep 2021' },
  { id: 'D-12043', n: 'Naveed Khan',      ph: '+91 73494 71112', city: 'BLR · Z-S1',  vehicle: 'KA 03 PB 4421 · XL',     status: 'active',    online: true,  trips: 3711, rating: 4.79, accept: '86%', cancel: '3.1%', kyc: 'expiring', joined: '02 Feb 2022' },
  { id: 'D-12042', n: 'Hemant Singh',     ph: '+91 88475 22019', city: 'BLR · Z-N1',  vehicle: 'KA 05 MK 7104 · XL',     status: 'active',    online: true,  trips: 5302, rating: 4.81, accept: '90%', cancel: '2.5%', kyc: 'approved', joined: '08 Mar 2022' },
  { id: 'D-12041', n: 'Sundar Pillai',    ph: '+91 80190 11422', city: 'BLR · Z-S4',  vehicle: 'KA 03 RV 1820 · Sedan',  status: 'active',    online: true,  trips: 7942, rating: 4.92, accept: '93%', cancel: '1.8%', kyc: 'approved', joined: '18 May 2020' },
  { id: 'D-12040', n: 'Imran Pasha',      ph: '+91 96322 00118', city: 'BLR · Z-E2',  vehicle: 'KA 05 EL 0019 · Sedan',  status: 'review',    online: false, trips: 2210, rating: 4.42, accept: '78%', cancel: '5.8%', kyc: 'approved', joined: '14 Nov 2022', flag: 'Low rating · review' },
  { id: 'D-12039', n: 'Mahesh Kanna',     ph: '+91 78001 41982', city: 'BLR · Z-N6',  vehicle: 'KA 05 ET 8810 · XL',     status: 'active',    online: true,  trips: 1188, rating: 4.92, accept: '74%', cancel: '6.4%', kyc: 'approved', joined: '02 Feb 2025', flag: 'Low acceptance' },
  { id: 'D-12038', n: 'Faisal Ali',       ph: '+91 96448 70210', city: 'BLR · Z-S3',  vehicle: 'KA 03 QA 1129 · Sedan',  status: 'suspended', online: false, trips: 3402, rating: 3.92, accept: '70%', cancel: '8.1%', kyc: 'rejected', joined: '11 Mar 2023', flag: 'Doc rejected · 12 May' },
  { id: 'D-12037', n: 'Praveen R',        ph: '+91 70411 18840', city: 'BLR · Z-N1',  vehicle: 'KA 05 EL 1129 · XL',     status: 'active',    online: true,  trips: 4870, rating: 4.71, accept: '88%', cancel: '2.8%', kyc: 'approved', joined: '06 Jul 2022' },
  { id: 'D-12036', n: 'Sanjay Yadav',     ph: '+91 96412 33019', city: 'BLR · Z-N4',  vehicle: 'KA 05 LP 7780 · Bike',   status: 'active',    online: true,  trips: 8918, rating: 4.88, accept: '92%', cancel: '2.2%', kyc: 'approved', joined: '22 Aug 2020' },
];

function dStatus(s) {
  if (s === 'active')    return <span className="badge ok"><span className="dot ok" />Active</span>;
  if (s === 'review')    return <span className="badge warn"><span className="dot warn" />Review</span>;
  if (s === 'suspended') return <span className="badge danger"><span className="dot danger" />Suspended</span>;
  if (s === 'pending')   return <span className="badge info"><span className="dot info" />Pending</span>;
  if (s === 'rejected')  return <span className="badge danger"><span className="dot danger" />Rejected</span>;
  return <span className="badge">{s}</span>;
}

// ──────────────────────────────────────────────────────────────
// 7.1 — Onboarding Queue
// ──────────────────────────────────────────────────────────────
function DriverOnboardingScreen() {
  const queue = [
    { n: 'Tejas Naik',       ph: '+91 99020 41892', city: 'BLR · Z-S1', class: 'Sedan', when: '12m ago', stage: 'docs',    docs: { pan: 'ok', license: 'ok', rc: 'ok', insurance: 'ok', permit: 'ok', photo: 'ok' }, prog: 100, sla: 'ok' },
    { n: 'Karan Bhat',       ph: '+91 88475 19023', city: 'BLR · Z-N4', class: 'Bike',  when: '32m ago', stage: 'review',  docs: { pan: 'ok', license: 'ok', rc: 'ok', insurance: 'ok', permit: 'ok', photo: 'ok' }, prog: 100, sla: 'ok' },
    { n: 'Vinod Reddy',      ph: '+91 97412 88811', city: 'BLR · Z-E2', class: 'XL',    when: '1h ago',  stage: 'docs',    docs: { pan: 'ok', license: 'ok', rc: 'ok', insurance: 'pending', permit: 'ok', photo: 'ok' }, prog: 83,  sla: 'ok' },
    { n: 'Suresh Pillai',    ph: '+91 70410 32200', city: 'BLR · Z-S3', class: 'Sedan', when: '3h ago',  stage: 'docs',    docs: { pan: 'ok', license: 'ok', rc: 'ok', insurance: 'reject', permit: 'ok', photo: 'ok' }, prog: 83, sla: 'warn', flag: 'Insurance expired 10 days ago' },
    { n: 'Arif Pasha',       ph: '+91 96402 11829', city: 'BLR · Z-N1', class: 'Sedan', when: '5h ago',  stage: 'review',  docs: { pan: 'ok', license: 'ok', rc: 'ok', insurance: 'ok', permit: 'ok', photo: 'ok' }, prog: 100, sla: 'ok' },
    { n: 'Manjunath G',      ph: '+91 80710 92002', city: 'BLR · Z-S2', class: 'Bike',  when: 'Yesterday',stage: 'background', docs: { pan: 'ok', license: 'ok', rc: 'ok', insurance: 'ok', permit: 'ok', photo: 'ok' }, prog: 100, sla: 'ok' },
    { n: 'Deepak Rao',       ph: '+91 89412 70019', city: 'BLR · Z-N6', class: 'XL',    when: 'Yesterday',stage: 'docs',    docs: { pan: 'ok', license: 'expired', rc: 'ok', insurance: 'ok', permit: 'ok', photo: 'ok' }, prog: 83, sla: 'danger', flag: 'License expired' },
    { n: 'Rohit Khanna',     ph: '+91 88475 41193', city: 'BLR · Z-W3', class: 'Sedan', when: '2 days ago',stage: 'review',  docs: { pan: 'ok', license: 'ok', rc: 'ok', insurance: 'ok', permit: 'ok', photo: 'pending' }, prog: 83, sla: 'warn', flag: 'Selfie verification pending' },
  ];
  const dotFor = (s) => s === 'ok' ? 'ok' : s === 'pending' ? 'warn' : s === 'expired' ? 'danger' : s === 'reject' ? 'danger' : 'pending';

  return (
    <Shell
      active="drivers"
      breadcrumb="People & Fleet · Drivers"
      title="Driver onboarding queue"
      subtitle="Pending approval · 8 in queue · 2 SLA at risk"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm"><Icon name="filter" size={13} />Saved view</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Manual onboard</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* summary */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            { l: 'In queue',          v: '8',     m: '4 awaiting review',         tone: 'var(--ink-3)' },
            { l: 'Ready to approve',  v: '3',     m: 'All docs OK',               tone: 'var(--accent)' },
            { l: 'Missing docs',      v: '4',     m: '2 expired · 2 pending',     tone: 'var(--warn)' },
            { l: 'SLA breach risk',   v: '2',     m: '> 48h in queue',            tone: 'var(--danger)' },
            { l: 'Avg approval time', v: '14h',   m: 'Target ≤ 24h',              tone: 'var(--accent)' },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: '18px 22px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{s.l}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.018em' }}>{s.v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: s.tone }}>{s.m}</div>
            </div>
          ))}
        </div>

        {/* filters */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="input" style={{ width: 260, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Name, phone, vehicle…" />
          </div>
          <FilterChip label="Stage" value="Docs · Review" count={2} />
          <FilterChip label="Vehicle class" value="All" />
          <FilterChip label="Zone" value="All BLR" />
          <FilterChip label="Missing doc" value="Any" />
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost">Sort · Age in queue ↓</button>
        </div>

        {/* queue cards */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          {queue.map((c, i) => (
            <div key={c.n} style={{
              padding: '18px 20px',
              borderBottom: i < queue.length - 1 ? '1px solid var(--rule-soft)' : 'none',
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.4fr 1fr 1.6fr auto',
              gap: 20, alignItems: 'center',
              background: i === 0 ? 'var(--accent-soft-2)' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="avatar lg" style={i === 0 ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'var(--surface-sunk)' }}>
                  {c.n.split(' ').map(p => p[0]).join('')}
                </div>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--ink)' }}>{c.n}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{c.ph}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{c.city} · {c.class}</div>
                </div>
              </div>

              {/* doc checklist */}
              <div>
                <div className="t-label" style={{ padding: 0, marginBottom: 8 }}>Documents · {c.prog}%</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(c.docs).map(([k, v]) => (
                    <span key={k} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 8px',
                      background: v === 'ok' ? 'var(--accent-soft)' : v === 'pending' ? 'var(--warn-soft)' : v === 'expired' || v === 'reject' ? 'var(--danger-soft)' : 'var(--surface-2)',
                      border: '1px solid ' + (v === 'ok' ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' : v === 'pending' ? 'color-mix(in oklab, var(--warn) 30%, var(--rule-strong))' : v === 'expired' || v === 'reject' ? 'color-mix(in oklab, var(--danger) 30%, var(--rule-strong))' : 'var(--rule)'),
                      borderRadius: 2,
                      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: v === 'ok' ? 'var(--accent)' : v === 'pending' ? 'var(--warn)' : v === 'expired' || v === 'reject' ? 'var(--danger)' : 'var(--ink-3)',
                    }}>
                      <span className={'dot ' + dotFor(v)} style={{ width: 5, height: 5, boxShadow: 'none' }} />
                      {k.toUpperCase()}
                    </span>
                  ))}
                </div>
                {c.flag && <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--danger)' }}>{c.flag}</div>}
              </div>

              <div>
                <div className="t-label" style={{ padding: 0 }}>Stage</div>
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {['signup', 'docs', 'review', 'background', 'approved'].map((s, idx) => {
                    const stages = ['signup', 'docs', 'review', 'background', 'approved'];
                    const curIdx = stages.indexOf(c.stage);
                    const passed = idx <= curIdx;
                    return (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: passed ? 'var(--accent)' : 'var(--rule-strong)',
                        }} />
                        <span style={{
                          fontSize: 11.5,
                          color: idx === curIdx ? 'var(--ink)' : passed ? 'var(--ink-3)' : 'var(--ink-4)',
                          fontWeight: idx === curIdx ? 500 : 400,
                          textTransform: 'capitalize',
                        }}>{s}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="t-label" style={{ padding: 0 }}>Submitted</div>
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>{c.when}</div>
                <div style={{ marginTop: 6 }}>
                  <span className={'badge ' + (c.sla === 'danger' ? 'danger' : c.sla === 'warn' ? 'warn' : 'ok')}>
                    <span className={'dot ' + (c.sla === 'danger' ? 'danger' : c.sla === 'warn' ? 'warn' : 'ok')} />
                    SLA {c.sla === 'danger' ? 'breach' : c.sla === 'warn' ? 'risk' : 'ok'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 140 }}>
                <button className="btn accent sm">Review →</button>
                <button className="btn sm">Request re-upload</button>
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
// 7.2 — Driver Directory
// ──────────────────────────────────────────────────────────────
function DriverDirectoryScreen() {
  return (
    <Shell
      active="drivers"
      breadcrumb="People & Fleet · Drivers"
      title="Driver directory"
      subtitle="1,520 approved · 1,184 online · 12 in review · 4 suspended"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Bulk message</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Onboard driver</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* segmented view tabs */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {[
            { l: 'All',           n: '1,520',  active: true },
            { l: 'Online',        n: '1,184',  tone: 'var(--accent)' },
            { l: 'Review queue',  n: '12',     tone: 'var(--warn)' },
            { l: 'Suspended',     n: '4',      tone: 'var(--danger)' },
            { l: 'Docs expiring', n: '38',     tone: 'var(--warn)' },
            { l: 'Top performers',n: '24',     tone: 'var(--accent)' },
          ].map((v, i) => (
            <div key={v.l} style={{
              padding: '14px 18px',
              borderRight: i < 5 ? '1px solid var(--rule)' : 'none',
              borderBottom: v.active ? '2px solid var(--accent)' : '2px solid transparent',
              background: v.active ? 'var(--surface-2)' : 'transparent',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: v.active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: v.active ? 500 : 400 }}>{v.l}</span>
                {v.tone && !v.active && <span className="dot" style={{ background: v.tone }} />}
              </div>
              <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.018em' }}>{v.n}</div>
            </div>
          ))}
        </div>

        {/* filter bar */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: 260, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Name, phone, plate, driver ID…" />
          </div>
          <FilterChip label="Status" value="Active" count={1} />
          <FilterChip label="Vehicle class" value="All" />
          <FilterChip label="Zone" value="All BLR" />
          <FilterChip label="Rating" value="≥ 4.5" count={1} />
          <FilterChip label="Tenure" value="Any" />
          <FilterChip label="KYC" value="Approved" count={1} />
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost">Sort · Trips ↓</button>
          <button className="btn sm ghost icon"><Icon name="more" size={14} /></button>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }}><input type="checkbox" /></th>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Zone</th>
                <th>Online</th>
                <th>Trips</th>
                <th>Rating</th>
                <th>Accept</th>
                <th>Cancel</th>
                <th>KYC</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {DRIVERS.map((d, i) => (
                <tr key={d.id} className={i === 0 ? 'selected' : ''}>
                  <td><input type="checkbox" defaultChecked={i === 0} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar" style={i === 0 ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : null}>
                        {d.n.split(' ').map(p => p[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>
                          {d.n}
                          {d.flag && <span style={{ marginLeft: 8 }}><Icon name="flag" size={11} stroke={1.6} style={{ color: 'var(--warn)' }} /></span>}
                        </div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{d.id} · {d.ph}</div>
                      </div>
                    </div>
                  </td>
                  <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{d.vehicle}</td>
                  <td className="num" style={{ color: 'var(--ink-2)' }}>{d.city}</td>
                  <td>{d.online ? <span className="badge ok"><span className="dot ok" />Online</span> : <span className="t-meta">Offline</span>}</td>
                  <td className="num">{d.trips.toLocaleString()}</td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', color: d.rating >= 4.7 ? 'var(--accent)' : d.rating >= 4.5 ? 'var(--ink-2)' : 'var(--warn)' }}>{d.rating.toFixed(2)}</span>
                    <span style={{ color: 'var(--ink-4)', marginLeft: 3 }}>★</span>
                  </td>
                  <td className="num">{d.accept}</td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', color: parseFloat(d.cancel) >= 5 ? 'var(--warn)' : 'var(--ink-2)' }}>{d.cancel}</span>
                  </td>
                  <td>
                    {d.kyc === 'approved' ? <span className="badge ok"><span className="dot ok" />OK</span> :
                     d.kyc === 'expiring' ? <span className="badge warn"><span className="dot warn" />Expiring</span> :
                     d.kyc === 'rejected' ? <span className="badge danger"><span className="dot danger" />Rejected</span> :
                     <span className="badge">{d.kyc}</span>}
                  </td>
                  <td>{dStatus(d.status)}</td>
                  <td><button className="btn ghost icon sm"><Icon name="moreVert" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)' }}>
            <div className="t-meta">Showing <span style={{ color: 'var(--ink-2)' }}>1–12</span> of <span style={{ color: 'var(--ink-2)' }}>1,520</span></div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn ghost sm" disabled style={{ opacity: 0.4 }}><Icon name="chevLeft" size={13} /></button>
              {['1','2','3','…','127'].map((p, i) => (
                <span key={i} style={{
                  width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3,
                  background: i === 0 ? 'var(--ink)' : 'transparent', color: i === 0 ? 'var(--surface)' : 'var(--ink-3)',
                  fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
                }}>{p}</span>
              ))}
              <button className="btn ghost sm"><Icon name="chevRight" size={13} /></button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 7.3 — Driver Detail
// ──────────────────────────────────────────────────────────────
function DriverDetailScreen() {
  const tabs = ['Overview', 'Documents · 6', 'Vehicle', 'Performance', 'Earnings', 'Trips', 'Wallet', 'Disciplinary', 'Audit'];
  return (
    <Shell
      active="drivers"
      breadcrumb="People & Fleet · Drivers"
      title="Ravi Mahesh"
      subtitle="D-12047 · Sedan · BLR · Z-N4 · 5y · 7,184 trips · 4.92 ★"
      actions={
        <>
          <button className="btn sm"><Icon name="envelope" size={13} />Message</button>
          <button className="btn sm">Force offline</button>
          <button className="btn sm danger">Suspend</button>
          <button className="btn sm">Edit</button>
        </>
      }
    >
      <div style={{ padding: '0' }}>
        {/* hero card */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--rule)', padding: '28px 32px', display: 'grid', gridTemplateColumns: '380px 1fr', gap: 36 }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div className="avatar xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' }}>RM</div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span className="badge ok"><span className="dot ok" />Online</span>
                <span className="badge"><span className="dot ok" />KYC OK</span>
                <span className="badge"><Icon name="shield" size={9} /> Top 5%</span>
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.020em', lineHeight: 1.05 }}>Ravi Mahesh</div>
              <div className="t-meta" style={{ marginTop: 6 }}>D-12047 · +91 96114 28805 · ravi.m@drivers.acmemobility.io</div>
              <div className="t-meta" style={{ marginTop: 2 }}>Onboarded 04 Mar 2021 · Bengaluru · Sarjapur</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, alignSelf: 'center' }}>
            {[
              ['Total trips',    '7,184',  '128 in last 7d',     'var(--ink)'],
              ['Rating',         '4.92 ★', 'Top 5% in BLR',      'var(--accent)'],
              ['Acceptance',     '94%',    'Last 30 days',       'var(--accent)'],
              ['Cancellation',   '2.1%',   'Below 3% floor',     'var(--ink-2)'],
              ['Lifetime earn',  '₹38.4 L','₹14.2K this week',   'var(--ink)'],
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
            {/* performance chart */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="t-label">Performance</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Rating & acceptance · last 8 weeks</h3>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 2, background: 'var(--ink)' }} />Rating</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 2, background: 'var(--accent)', borderTop: '1px dashed' }} />Acceptance</span>
                </div>
              </div>
              <div style={{ height: 200, padding: '14px 18px' }}>
                <PerformanceChart />
              </div>
            </div>

            {/* recent trips */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                <div className="t-label">Recent trips</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Last 6 trips</h3>
              </div>
              <table className="tbl">
                <thead><tr><th>When</th><th>Customer</th><th>Route</th><th>Fare</th><th>Earn</th><th>Rated</th></tr></thead>
                <tbody>
                  {[
                    ['Now',         'Aarav Kapoor',  'Indiranagar → KIAL T2',   '₹1,240', '₹996',  '—'],
                    ['Today 13:14', 'Imran Shaikh',  'MG Road → Indiranagar',   '₹260',   '₹208',  '★ 5'],
                    ['Today 11:42', 'Anushka Roy',   'Jayanagar → MG Road',     '₹980',   '₹784',  '★ 5'],
                    ['Today 10:18', 'Tariq Ahmed',   'Yelahanka → MG Road',     '₹1,180', '₹944',  '★ 5'],
                    ['Today 08:54', 'Hema Rao',      'KIAL T1 → Hebbal',        '₹2,140', '₹1,712','★ 4'],
                    ['Yesterday',   'Vikram Bhatt',  'HSR Layout · 80km pkg',   '₹3,200', '₹2,560','★ 5'],
                  ].map((r, i) => (
                    <tr key={i}>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{r[0]}</td>
                      <td>{r[1]}</td>
                      <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{r[2]}</td>
                      <td className="num">{r[3]}</td>
                      <td className="num" style={{ color: 'var(--accent)' }}>{r[4]}</td>
                      <td className="num">{r[5]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* vehicle */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="t-label">Linked vehicle</div>
                <button className="btn sm ghost"><Icon name="external" size={11} />Vehicle file</button>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 56, height: 40, background: 'var(--surface-sunk)', border: '1px solid var(--rule-strong)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="car" size={20} style={{ color: 'var(--ink-3)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>Toyota Etios · Sedan XL</div>
                  <div className="t-meta" style={{ marginTop: 3 }}>White · 2022 · KA 05 MK 4271</div>
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['RC',         'Valid until 12 Aug 2027'],
                  ['Insurance',  'Valid until 04 Mar 2027'],
                  ['Permit',     'Valid until 18 Aug 2026'],
                  ['Fitness',    'Valid until 11 Jun 2026'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="t-label" style={{ padding: 0 }}>{k}</div>
                    <div className="t-meta" style={{ marginTop: 3, color: 'var(--ink-2)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* documents quick */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <div className="t-label" style={{ marginBottom: 12 }}>Documents</div>
              {[
                ['License',     'KA 5520210018421', 'Valid until 11 Sep 2027', 'ok'],
                ['PAN',         'BJYPS****L',       'Verified',                 'ok'],
                ['Police verification', 'Cleared',  'Verified 22 Mar 2024',      'ok'],
                ['Aadhaar',     '●●●● ●●●● 2871',   'Verified · masked',        'ok'],
              ].map(([k, v, m, s]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--rule-soft)' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 3, background: 'var(--surface-sunk)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--rule)' }}>
                    <Icon name="shield" size={13} style={{ color: 'var(--accent)' }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{k}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{v} · {m}</div>
                  </div>
                  <span className="badge ok"><span className="dot ok" />OK</span>
                </div>
              ))}
            </div>

            {/* wallet */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Driver wallet</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, letterSpacing: '-0.018em' }}>₹14,284</span>
                <span className="t-meta">credit · next payout Fri</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--accent)' }}>+₹1,840 today · 8 trips</div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button className="btn sm">Adjust wallet</button>
                <button className="btn sm ghost">Payout history</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function PerformanceChart() {
  const weeks = 8;
  const rating  = [4.78, 4.82, 4.85, 4.88, 4.89, 4.90, 4.91, 4.92];
  const accept  = [88, 89, 90, 91, 93, 94, 94, 94];
  const w = 720, h = 180, padL = 36, padR = 36, padT = 16, padB = 26;
  const x = i => padL + (i / (weeks - 1)) * (w - padL - padR);
  const yR = v => padT + (1 - (v - 4.7) / 0.3) * (h - padT - padB);
  const yA = v => padT + (1 - (v - 80) / 20) * (h - padT - padB);
  const pR = rating.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + yR(v).toFixed(1)).join(' ');
  const pA = accept.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + yA(v).toFixed(1)).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      {[0,1,2,3,4].map(i => <line key={i} x1={padL} x2={w-padR} y1={padT + i*(h-padT-padB)/4} y2={padT + i*(h-padT-padB)/4} stroke="var(--rule-soft)" />)}
      {rating.map((_, i) => (
        <text key={i} x={x(i)} y={h - 10} textAnchor="middle" fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono' }}>
          W{i+1}
        </text>
      ))}
      {[4.7, 4.8, 4.9, 5.0].map((l, i) => (
        <text key={l} x={padL - 6} y={yR(l) + 3} textAnchor="end" fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono' }}>{l.toFixed(1)}</text>
      ))}
      {[80, 90, 100].map((l, i) => (
        <text key={l} x={w - padR + 6} y={yA(l) + 3} textAnchor="start" fill="var(--accent)" style={{ font: '10px IBM Plex Mono' }}>{l}%</text>
      ))}
      <path d={pR} fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={pA} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(weeks-1)} cy={yR(rating[weeks-1])} r="4" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.6" />
      <circle cx={x(weeks-1)} cy={yA(accept[weeks-1])} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.6" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// 7.4 — Document Review
// ──────────────────────────────────────────────────────────────
function DocumentReviewScreen() {
  return (
    <Shell
      active="drivers"
      breadcrumb="People & Fleet · Drivers · KYC"
      title="Driver license · Tejas Naik"
      subtitle="D-12060 · Onboarding · Doc 4 of 6 · uploaded 12 min ago"
      actions={
        <>
          <button className="btn sm">Previous</button>
          <button className="btn sm">Skip for now</button>
          <button className="btn sm">Next →</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 380px', minHeight: '100%' }}>
        {/* doc rail */}
        <aside style={{ background: 'var(--surface)', borderRight: '1px solid var(--rule)', padding: '20px 0' }}>
          <div className="t-label" style={{ padding: '0 18px 8px' }}>Documents · 6</div>
          {[
            { l: 'PAN card',          s: 'ok' },
            { l: 'Aadhaar',           s: 'ok' },
            { l: 'Driving license',   s: 'review', active: true },
            { l: 'Vehicle RC',        s: 'ok' },
            { l: 'Insurance',         s: 'ok' },
            { l: 'Permit',            s: 'pending' },
          ].map(d => (
            <div key={d.l} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 18px',
              borderLeft: '2px solid ' + (d.active ? 'var(--accent)' : 'transparent'),
              background: d.active ? 'var(--surface-2)' : 'transparent',
              color: d.active ? 'var(--ink)' : 'var(--ink-2)',
              cursor: 'pointer',
            }}>
              <span className={'dot ' + (d.s === 'ok' ? 'ok' : d.s === 'review' ? 'warn' : 'pending')} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: d.active ? 500 : 400 }}>{d.l}</span>
            </div>
          ))}

          <div style={{ height: 1, background: 'var(--rule)', margin: '18px 0' }} />

          <div style={{ padding: '0 18px' }}>
            <div className="t-label" style={{ marginBottom: 8 }}>Driver</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar">TN</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>Tejas Naik</div>
                <div className="t-meta" style={{ marginTop: 2 }}>D-12060 · BLR · Z-S1</div>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12, color: 'var(--ink-2)' }}>
              First-time onboard · Sedan class · referred by Sundar Pillai
            </div>
          </div>
        </aside>

        {/* document preview */}
        <div style={{ padding: '20px 32px', background: 'var(--surface-sunk)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="t-label">Document preview</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>Driving licence · KA 5520210018421</h3>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn sm ghost icon"><Icon name="search" size={13} /></button>
              <button className="btn sm ghost icon"><Icon name="refresh" size={13} /></button>
              <button className="btn sm ghost icon"><Icon name="download" size={13} /></button>
              <button className="btn sm ghost icon"><Icon name="external" size={13} /></button>
            </div>
          </div>

          {/* stylized doc mock */}
          <div style={{
            flex: 1,
            background: 'linear-gradient(135deg, #F4ECD8 0%, #ECDCB8 100%)',
            border: '1px solid var(--rule-strong)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: 460,
            padding: 36,
            color: '#1F1812',
            fontFamily: 'Georgia, serif',
          }}>
            {/* watermark */}
            <svg viewBox="0 0 200 200" style={{ position: 'absolute', right: 36, top: 36, width: 140, height: 140, opacity: 0.15 }}>
              <circle cx="100" cy="100" r="60" fill="none" stroke="#1F1812" strokeWidth="2" />
              <text x="100" y="105" textAnchor="middle" style={{ font: 'bold 14px sans-serif', fill: '#1F1812' }}>SARATHI</text>
            </svg>

            <div style={{ fontSize: 11, fontFamily: 'sans-serif', letterSpacing: '0.14em', color: '#5A3D1F' }}>GOVERNMENT OF KARNATAKA · TRANSPORT DEPARTMENT</div>
            <div style={{ marginTop: 4, fontSize: 26, fontWeight: 700 }}>Driving Licence</div>
            <div style={{ marginTop: 2, fontSize: 11, fontFamily: 'sans-serif' }}>Issued under MV Act 1988</div>

            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '110px 1fr', gap: 28 }}>
              <div style={{
                width: 110, height: 130,
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(31, 24, 18, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(31,24,18,0.4)', fontSize: 36,
                fontFamily: 'sans-serif',
              }}>TN</div>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13 }}>
                {[
                  ['DL No.',     'KA 5520210018421'],
                  ['Name',       'TEJAS NAIK'],
                  ['S/W/D of',   'GIRISH NAIK'],
                  ['DOB',        '14/08/1992'],
                  ['Address',    'No. 14, 7th Cross, HSR Layout, Bengaluru 560102'],
                  ['Issued',     '11/09/2017'],
                  ['Valid till', '10/09/2037'],
                  ['Class',      'LMV · TR · MCWG'],
                  ['Blood',      'O+'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', padding: '3px 0' }}>
                    <span style={{ width: 90, color: '#5A3D1F' }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: 24, right: 36, fontFamily: 'sans-serif', fontSize: 10, color: '#5A3D1F' }}>
              Signature of holder: <i style={{ marginLeft: 12, fontFamily: 'cursive' }}>Tejas Naik</i>
            </div>
          </div>

          {/* OCR confidence */}
          <div style={{ marginTop: 16, padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 18 }}>
            <Icon name="bolt" size={14} style={{ color: 'var(--accent)' }} />
            <span className="t-label" style={{ padding: 0 }}>Vendor extraction · IDfy</span>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-2)' }}>
              Confidence <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>96.4%</span> · 9/9 fields matched · doc found in DGCT registry · last verified 1m ago
            </span>
            <button className="btn sm">View raw response</button>
          </div>
        </div>

        {/* review pane */}
        <aside style={{ background: 'var(--surface)', borderLeft: '1px solid var(--rule)', padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <div className="t-label" style={{ marginBottom: 10 }}>Extracted fields · review</div>
            {[
              ['DL number',  'KA 5520210018421',  true],
              ['Name',       'Tejas Naik',         true],
              ['DOB',        '14 Aug 1992',         true],
              ['Issue date', '11 Sep 2017',         true],
              ['Expiry',     '10 Sep 2037',         true],
              ['Class',      'LMV · TR · MCWG',    true],
              ['Blood group','O+',                  false],
            ].map(([k, v, ok]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--rule-soft)' }}>
                <span className={'dot ' + (ok ? 'ok' : 'warn')} />
                <span style={{ flex: '0 0 90px', fontSize: 12, color: 'var(--ink-3)' }}>{k}</span>
                <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>{v}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="t-label" style={{ marginBottom: 10 }}>Cross-checks</div>
            {[
              ['Name matches PAN',         'Tejas Naik = TEJAS NAIK',           'ok'],
              ['Name matches Aadhaar',     'Tejas Naik = Tejas Naik',           'ok'],
              ['Photo matches selfie',     'Face confidence 94.1%',             'ok'],
              ['DL not expired',           '11+ years remaining',                'ok'],
              ['DL in DGCT registry',      'Found · status active',              'ok'],
              ['No criminal record (BG)',  'Pending · CV completes in 24h',     'warn'],
            ].map(([k, v, s]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--rule-soft)' }}>
                <Icon name={s === 'ok' ? 'check' : 'clock'} size={13} stroke={2.2} style={{ color: s === 'ok' ? 'var(--accent)' : 'var(--warn)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5 }}>{k}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{v}</div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="t-label" style={{ marginBottom: 8 }}>Set expiry</div>
            <div className="input">
              <input defaultValue="10 Sep 2037" readOnly />
              <Icon name="clock" size={14} className="icon" />
            </div>
            <div className="field-help" style={{ marginTop: 6 }}>Driver will be force-offlined automatically on this date.</div>
          </div>

          <div>
            <div className="t-label" style={{ marginBottom: 8 }}>Review note · audit</div>
            <div className="input">
              <input placeholder="Optional note for the file" defaultValue="All fields match · clean registry hit." />
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn accent lg" style={{ width: '100%' }}>
              <Icon name="check" size={13} stroke={2.4} />Approve document
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sm" style={{ flex: 1 }}>Request re-upload</button>
              <button className="btn sm danger" style={{ flex: 1 }}>Reject</button>
            </div>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

Object.assign(window, {
  DriverOnboardingScreen, DriverDirectoryScreen, DriverDetailScreen, DocumentReviewScreen,
  DRIVERS, dStatus, PerformanceChart,
});
