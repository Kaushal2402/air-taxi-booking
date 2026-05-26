/* ─────────────────────────────────────────────────────────────
   Module 08 — Vehicle & Fleet Management
   Screens 8.1 → 8.3
   ───────────────────────────────────────────────────────────── */

const VEHICLES = [
  { plate: 'KA 05 MK 4271', mk: 'Toyota Etios',   yr: 2022, cls: 'Sedan XL', owner: 'Owner-driver',     driver: 'Ravi Mahesh',    status: 'active',    docs: 'ok',       expSoon: null,        odo: '84,210 km' },
  { plate: 'KA 03 PA 2210', mk: 'Maruti Dzire',   yr: 2021, cls: 'Sedan',    owner: 'Yellow Wheels',    driver: 'Sumit Joshi',    status: 'active',    docs: 'ok',       expSoon: null,        odo: '1,12,440 km' },
  { plate: 'KA 03 EM 1129', mk: 'TVS Apache 160', yr: 2023, cls: 'Bike',     owner: 'Owner-driver',     driver: 'Mohammed Aslam', status: 'active',    docs: 'ok',       expSoon: null,        odo: '38,810 km' },
  { plate: 'KA 05 EL 9912', mk: 'Honda Amaze',    yr: 2020, cls: 'Sedan',    owner: 'Yellow Wheels',    driver: 'Vinay Kumar',    status: 'active',    docs: 'expiring', expSoon: 'Insurance · 18d', odo: '1,48,221 km' },
  { plate: 'KA 03 PB 4421', mk: 'Toyota Innova',  yr: 2022, cls: 'XL',       owner: 'Premier Cabs',     driver: 'Naveed Khan',    status: 'active',    docs: 'ok',       expSoon: null,        odo: '92,802 km' },
  { plate: 'KA 05 MK 7104', mk: 'Toyota Innova',  yr: 2023, cls: 'XL',       owner: 'Premier Cabs',     driver: 'Hemant Singh',   status: 'active',    docs: 'ok',       expSoon: null,        odo: '46,118 km' },
  { plate: 'KA 03 RV 1820', mk: 'Maruti Dzire',   yr: 2022, cls: 'Sedan',    owner: 'Owner-driver',     driver: 'Sundar Pillai',  status: 'active',    docs: 'ok',       expSoon: null,        odo: '96,442 km' },
  { plate: 'KA 05 EL 0019', mk: 'Honda City',     yr: 2021, cls: 'Sedan',    owner: 'Yellow Wheels',    driver: 'Imran Pasha',    status: 'review',    docs: 'expiring', expSoon: 'Permit · 9d',     odo: '1,21,008 km' },
  { plate: 'KA 05 ET 8810', mk: 'Maruti Ertiga',  yr: 2023, cls: 'XL',       owner: 'Owner-driver',     driver: 'Mahesh Kanna',   status: 'active',    docs: 'ok',       expSoon: null,        odo: '24,118 km' },
  { plate: 'KA 03 QA 1129', mk: 'Hyundai Aura',   yr: 2020, cls: 'Sedan',    owner: 'Premier Cabs',     driver: 'Faisal Ali',     status: 'suspended', docs: 'expired',  expSoon: 'Fitness · −12d',  odo: '1,64,920 km' },
  { plate: 'KA 05 EL 1129', mk: 'Maruti Ertiga',  yr: 2022, cls: 'XL',       owner: 'Yellow Wheels',    driver: 'Praveen R',      status: 'active',    docs: 'ok',       expSoon: null,        odo: '78,402 km' },
  { plate: 'KA 05 LP 7780', mk: 'Bajaj Pulsar',   yr: 2024, cls: 'Bike',     owner: 'Owner-driver',     driver: 'Sanjay Yadav',   status: 'active',    docs: 'ok',       expSoon: null,        odo: '12,488 km' },
];

const VENDORS = [
  { name: 'Yellow Wheels',  city: 'Bengaluru',  fleet: 84,  drivers: 102, since: 'Jul 2019', share: '8.4%', tone: 'ok' },
  { name: 'Premier Cabs',   city: 'Bengaluru',  fleet: 62,  drivers: 78,  since: 'Apr 2020', share: '5.6%', tone: 'ok' },
  { name: 'CityMove Fleet', city: 'Bengaluru',  fleet: 41,  drivers: 52,  since: 'Nov 2021', share: '3.8%', tone: 'ok' },
  { name: 'Anand Travels',  city: 'Mysuru',     fleet: 22,  drivers: 28,  since: 'Feb 2022', share: '2.1%', tone: 'warn' },
  { name: 'GreenPath Rides',city: 'Bengaluru',  fleet: 18,  drivers: 24,  since: 'Aug 2022', share: '1.6%', tone: 'ok' },
];

// ──────────────────────────────────────────────────────────────
// 8.1 — Vehicle Directory
// ──────────────────────────────────────────────────────────────
function VehicleDirectoryScreen() {
  const docDot = (d) => d === 'ok' ? 'ok' : d === 'expiring' ? 'warn' : 'danger';
  const docLabel = (d) => d === 'ok' ? 'OK' : d === 'expiring' ? 'Expiring' : 'Expired';

  return (
    <Shell
      active="vehicles"
      breadcrumb="People & Fleet · Vehicles"
      title="Vehicle directory"
      subtitle="1,210 active · 38 expiring docs · 12 grounded"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Bulk inspect</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Add vehicle</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* summary tabs */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {[
            { l: 'All vehicles',    n: '1,260', active: true },
            { l: 'Active',          n: '1,210', tone: 'var(--accent)' },
            { l: 'Docs expiring',   n: '38',    tone: 'var(--warn)' },
            { l: 'Docs expired',    n: '8',     tone: 'var(--danger)' },
            { l: 'Grounded',        n: '12',    tone: 'var(--danger)' },
            { l: 'Unlinked',        n: '4',     tone: 'var(--pending)' },
          ].map((v, i) => (
            <div key={v.l} style={{
              padding: '14px 18px',
              borderRight: i < 5 ? '1px solid var(--rule)' : 'none',
              borderBottom: v.active ? '2px solid var(--accent)' : '2px solid transparent',
              background: v.active ? 'var(--surface-2)' : 'transparent', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: v.active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: v.active ? 500 : 400 }}>{v.l}</span>
                {v.tone && !v.active && <span className="dot" style={{ background: v.tone }} />}
              </div>
              <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.018em' }}>{v.n}</div>
            </div>
          ))}
        </div>

        {/* filters */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: 260, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Plate, make/model, owner, driver…" />
          </div>
          <FilterChip label="Class" value="Sedan · XL · Bike" count={3} />
          <FilterChip label="Owner" value="All" />
          <FilterChip label="Year" value="2020+" />
          <FilterChip label="Docs" value="OK · Expiring" count={2} />
          <FilterChip label="Status" value="Active" count={1} />
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost">Sort · Plate ↑</button>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }}><input type="checkbox" /></th>
                <th>Plate · Vehicle</th>
                <th>Class</th>
                <th>Year</th>
                <th>Owner</th>
                <th>Linked driver</th>
                <th>Documents</th>
                <th>Odometer</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {VEHICLES.map((v, i) => (
                <tr key={v.plate} className={i === 0 ? 'selected' : ''}>
                  <td><input type="checkbox" defaultChecked={i === 0} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 24, borderRadius: 2,
                        background: 'var(--ink)', color: 'var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.05em',
                        border: '1px solid var(--ink)',
                      }}>{v.plate.split(' ')[0]}</div>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{v.plate}</div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{v.mk}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge"><Icon name="car" size={10} />{v.cls}</span></td>
                  <td className="num">{v.yr}</td>
                  <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>{v.owner}</td>
                  <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>{v.driver || <span className="t-meta">—</span>}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={'badge ' + (v.docs === 'ok' ? 'ok' : v.docs === 'expiring' ? 'warn' : 'danger')}>
                        <span className={'dot ' + docDot(v.docs)} />
                        {docLabel(v.docs)}
                      </span>
                      {v.expSoon && <span className="t-meta" style={{ color: v.docs === 'expired' ? 'var(--danger)' : 'var(--warn)' }}>· {v.expSoon}</span>}
                    </div>
                  </td>
                  <td className="num" style={{ color: 'var(--ink-2)' }}>{v.odo}</td>
                  <td>
                    {v.status === 'active'    ? <span className="badge ok"><span className="dot ok" />Active</span> :
                     v.status === 'review'    ? <span className="badge warn"><span className="dot warn" />Review</span> :
                     v.status === 'suspended' ? <span className="badge danger"><span className="dot danger" />Grounded</span> :
                     <span className="badge">{v.status}</span>}
                  </td>
                  <td><button className="btn ghost icon sm"><Icon name="moreVert" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)' }}>
            <div className="t-meta">Showing <span style={{ color: 'var(--ink-2)' }}>1–12</span> of <span style={{ color: 'var(--ink-2)' }}>1,260</span></div>
            <div className="t-meta">Expiry job runs daily at 02:00 IST · auto-grounds on expiry</div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 8.2 — Vehicle Detail
// ──────────────────────────────────────────────────────────────
function VehicleDetailScreen() {
  const tabs = ['Overview', 'Documents · 5', 'Maintenance', 'Driver history', 'Trips · 7,184', 'Audit'];
  return (
    <Shell
      active="vehicles"
      breadcrumb="People & Fleet · Vehicles"
      title="KA 05 MK 4271"
      subtitle="Toyota Etios · Sedan XL · 2022 · Linked to Ravi Mahesh"
      actions={
        <>
          <button className="btn sm"><Icon name="refresh" size={13} />Reassign class</button>
          <button className="btn sm">Unlink driver</button>
          <button className="btn sm danger">Ground</button>
          <button className="btn sm">Edit</button>
        </>
      }
    >
      <div style={{ padding: '0' }}>
        {/* hero card */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--rule)', padding: '28px 32px', display: 'grid', gridTemplateColumns: '420px 1fr', gap: 36 }}>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            {/* car silhouette */}
            <div style={{
              width: 120, height: 80, borderRadius: 4,
              background: 'var(--surface-sunk)',
              border: '1px solid var(--rule-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 100 60" width="80" height="48">
                <path d="M10 40 Q15 20 30 18 L65 18 Q78 18 84 30 L88 40 L88 46 L78 46 L78 44 A4 4 0 0 0 70 44 L70 46 L30 46 L30 44 A4 4 0 0 0 22 44 L22 46 L12 46 Z" fill="none" stroke="var(--ink)" strokeWidth="1.2" />
                <circle cx="26" cy="46" r="4" fill="var(--ink)" />
                <circle cx="74" cy="46" r="4" fill="var(--ink)" />
                <line x1="30" y1="20" x2="64" y2="20" stroke="var(--ink-3)" strokeWidth="0.8" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span className="badge ok"><span className="dot ok" />Active</span>
                <span className="badge"><span className="dot ok" />All docs valid</span>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 500,
                background: 'var(--ink)', color: 'var(--surface)',
                padding: '6px 12px', display: 'inline-block', letterSpacing: '0.05em',
              }}>KA 05 MK 4271</div>
              <div className="t-meta" style={{ marginTop: 8 }}>Toyota Etios · Sedan XL · White · 2022 · Petrol</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, alignSelf: 'center' }}>
            {[
              ['Odometer',       '84,210 km',   '+128 km today',  'var(--ink)'],
              ['Trips logged',   '7,184',        'In 2y 11m',       'var(--ink-2)'],
              ['Gross fare',     '₹47.9 L',      'Lifetime',        'var(--accent)'],
              ['Last service',   '18 Apr 2026',  'At 78,800 km',    'var(--ink-2)'],
              ['Next service',   'In 5,790 km',  'At 90,000 km',    'var(--ink-2)'],
            ].map(([k, v, m, c], i) => (
              <div key={k} style={{ padding: '0 18px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: c }}>{v}</div>
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
              fontSize: 13, color: i === 1 ? 'var(--ink)' : 'var(--ink-3)',
              fontWeight: i === 1 ? 500 : 400,
              borderBottom: '2px solid ' + (i === 1 ? 'var(--accent)' : 'transparent'),
              marginBottom: -1, cursor: 'pointer',
            }}>{t}</div>
          ))}
        </div>

        <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
          {/* documents */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div className="t-label">Documents · vehicle</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>5 documents · all valid</h3>
              </div>
              <button className="btn sm"><Icon name="upload" size={12} />Upload</button>
            </div>
            <table className="tbl">
              <thead>
                <tr><th>Document</th><th>Number</th><th>Issued</th><th>Expiry</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {[
                  ['Registration · RC',  'KA0520210084231', '12 Aug 2022', '12 Aug 2037', 720, 'ok'],
                  ['Insurance',           'NIA-2024-882041', '04 Mar 2024', '04 Mar 2027', 318, 'ok'],
                  ['Commercial permit',   'KAP-2022-91018',  '18 Aug 2022', '18 Aug 2026',  88, 'warn'],
                  ['Fitness certificate', 'FC-KA05-7281',    '11 Jun 2024', '11 Jun 2027',  21, 'ok'],
                  ['Pollution · PUC',     'PUC-2025-4421',   '02 Feb 2026', '02 Aug 2026',  72, 'ok'],
                ].map(([k, num, iss, exp, daysLeft, tone], i) => (
                  <tr key={k}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon name="shield" size={14} style={{ color: 'var(--ink-3)' }} />
                        <span style={{ fontSize: 13 }}>{k}</span>
                      </div>
                    </td>
                    <td className="num" style={{ color: 'var(--ink-2)' }}>{num}</td>
                    <td className="num" style={{ color: 'var(--ink-3)' }}>{iss}</td>
                    <td className="num" style={{ color: tone === 'warn' ? 'var(--warn)' : 'var(--ink)' }}>{exp}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: Math.min(100, (daysLeft / 720) * 100) + '%', height: '100%',
                            background: tone === 'warn' ? 'var(--warn)' : 'var(--accent)',
                          }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tone === 'warn' ? 'var(--warn)' : 'var(--ink-2)' }}>
                          {daysLeft}d left
                        </span>
                      </div>
                    </td>
                    <td><button className="btn ghost icon sm"><Icon name="eye" size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* class assignment */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <div className="t-label" style={{ marginBottom: 10 }}>Vehicle class</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--accent)', background: 'var(--accent-soft-2)', borderRadius: 3 }}>
                <Icon name="car" size={16} style={{ color: 'var(--accent)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>Sedan XL</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>4-pax · AC · airport-eligible</div>
                </div>
                <button className="btn sm ghost"><Icon name="refresh" size={11} />Change</button>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-3)' }}>
                Class drives pricing rule, dispatch eligibility, and customer-facing display name. Reassigning is audit-logged.
              </div>
            </div>

            {/* linked driver */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <div className="t-label" style={{ marginBottom: 10 }}>Linked driver</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>RM</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14 }}>Ravi Mahesh</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>D-12047 · linked since 04 Mar 2021</div>
                </div>
                <button className="btn ghost icon sm"><Icon name="external" size={12} /></button>
              </div>
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12, color: 'var(--ink-2)' }}>
                Only one active driver per vehicle at a time. Unlinking ends Ravi's current shift and re-evaluates dispatch eligibility.
              </div>
            </div>

            {/* owner / vendor */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <div className="t-label" style={{ marginBottom: 10 }}>Owner</div>
              <div style={{ padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 3 }}>
                <div style={{ fontSize: 13.5 }}>Owner-driver</div>
                <div className="t-meta" style={{ marginTop: 3 }}>Vehicle owned by Ravi Mahesh personally · no fleet share</div>
              </div>
            </div>

            {/* maintenance */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <div className="t-label" style={{ marginBottom: 10 }}>Service · upcoming</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['90,000 km',  'In ~5,790 km',         'Toyota MASS · Indiranagar',  'pending'],
                  ['100,000 km', 'In ~3 months',          'Major · drivetrain check',   'pending'],
                ].map(([t, w, l, s], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 3, border: '1px solid var(--rule)' }}>
                    <span className={'dot pending'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5 }}>{t}</div>
                      <div className="t-meta" style={{ marginTop: 2 }}>{l}</div>
                    </div>
                    <span className="t-meta" style={{ color: 'var(--ink-2)' }}>{w}</span>
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
// 8.3 — Fleet Owners / Vendors
// ──────────────────────────────────────────────────────────────
function VendorDirectoryScreen() {
  return (
    <Shell
      active="vehicles"
      breadcrumb="People & Fleet · Vehicles · Fleet owners"
      title="Fleet owners & vendors"
      subtitle="5 active vendors · 227 vehicles under management · 21.4% of fleet"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Vendor agreement template</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Onboard vendor</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* hero strip */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { l: 'Active vendors',     v: '5',      m: '+1 in last 90d',          tone: 'var(--ink)' },
            { l: 'Fleet share',        v: '21.4%',  m: '227 vehicles · 284 drv',  tone: 'var(--accent)' },
            { l: 'Top vendor share',   v: '8.4%',   m: 'Yellow Wheels · 84 veh',  tone: 'var(--ink-2)' },
            { l: 'Vendor payouts · MTD','v': '₹12.4 L', m: 'Across 5 partners',   tone: 'var(--ink)' },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: '20px 22px', borderRight: i < 3 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{s.l}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.018em' }}>{s.v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: s.tone }}>{s.m}</div>
            </div>
          ))}
        </div>

        {/* vendor cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {VENDORS.map((v, i) => (
            <div key={v.name} style={{
              background: 'var(--surface)', border: '1px solid var(--rule)',
              padding: '20px 22px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 3,
                  background: 'var(--surface-sunk)',
                  border: '1px solid var(--rule-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink-2)',
                }}>{v.name.split(' ').map(p => p[0]).join('').slice(0, 2)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, letterSpacing: '-0.014em' }}>{v.name}</h3>
                    <span className={'badge ' + (v.tone === 'warn' ? 'warn' : 'ok')}>
                      <span className={'dot ' + (v.tone === 'warn' ? 'warn' : 'ok')} />
                      {v.tone === 'warn' ? 'Review' : 'Active'}
                    </span>
                  </div>
                  <div className="t-meta" style={{ marginTop: 4 }}>{v.city} · partner since {v.since}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, background: 'var(--surface-2)', border: '1px solid var(--rule)' }}>
                {[
                  ['Vehicles', v.fleet],
                  ['Drivers',  v.drivers],
                  ['Share',    v.share],
                ].map(([k, n], j) => (
                  <div key={k} style={{ padding: '12px 14px', borderRight: j < 2 ? '1px solid var(--rule)' : 'none' }}>
                    <div className="t-label" style={{ padding: 0 }}>{k}</div>
                    <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>{n}</div>
                  </div>
                ))}
              </div>

              {/* fleet composition */}
              <div>
                <div className="t-label" style={{ padding: 0, marginBottom: 8 }}>Composition</div>
                <div style={{ display: 'flex', height: 8, borderRadius: 2, overflow: 'hidden', background: 'var(--rule)' }}>
                  <div style={{ width: '52%', background: 'var(--ink-2)' }} title="Sedan" />
                  <div style={{ width: '28%', background: 'var(--accent)' }} title="XL" />
                  <div style={{ width: '20%', background: 'var(--info)' }} title="Bike" />
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 14, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--ink-2)', marginRight: 5 }} />Sedan 52%</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--accent)', marginRight: 5 }} />XL 28%</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--info)', marginRight: 5 }} />Bike 20%</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 12 }}>
                <div>
                  <div className="t-label" style={{ padding: 0 }}>Commission</div>
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>22% · custom</div>
                </div>
                <div>
                  <div className="t-label" style={{ padding: 0 }}>Last payout</div>
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>15 May · ₹3.18 L</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn sm" style={{ flex: 1 }}>Open file</button>
                <button className="btn sm">Statements</button>
                <button className="btn sm">Drivers</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { VehicleDirectoryScreen, VehicleDetailScreen, VendorDirectoryScreen });
