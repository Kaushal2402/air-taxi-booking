/* ─────────────────────────────────────────────────────────────
   Module 25 — KYC & Document Verification
   Screens 25.1 → 25.3
   25.1 Verification Queue · 25.2 Document Detail · 25.3 Expiry Watchlist
   ───────────────────────────────────────────────────────────── */

function KpiStrip({ items, cols }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: `repeat(${cols || items.length}, 1fr)` }}>
      {items.map(([k, v, m, c], i) => (
        <div key={k} style={{ padding: '18px 22px', borderRight: i < items.length - 1 ? '1px solid var(--rule)' : 'none' }}>
          <div className="t-label" style={{ padding: 0 }}>{k}</div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 28 }}>{v}</div>
          <div className="t-meta" style={{ marginTop: 8, color: c || 'var(--ink-2)' }}>{m}</div>
        </div>
      ))}
    </div>
  );
}

function entityIcon(t) {
  return t === 'driver' ? 'car' : t === 'operator' ? 'building' : t === 'aircraft' ? 'helipad' : t === 'pilot' ? 'plane' : 'car';
}

function docStatusBadge(s) {
  return s === 'in_review' ? <span className="badge warn"><span className="dot warn" />In review</span>
    : s === 'approved' ? <span className="badge ok"><span className="dot ok" />Approved</span>
    : s === 'rejected' ? <span className="badge danger"><span className="dot danger" />Rejected</span>
    : s === 'expired' ? <span className="badge danger"><span className="dot danger" />Expired</span>
    : <span className="badge info"><span className="dot info" />Uploaded</span>;
}

// striped placeholder for a scanned document image (no hand-drawn imagery)
function DocPlaceholder({ label, h = 300 }) {
  return (
    <div style={{
      height: h,
      borderRadius: 4,
      border: '1px solid var(--rule-strong)',
      background: 'repeating-linear-gradient(135deg, var(--surface-sunk) 0, var(--surface-sunk) 11px, var(--surface-2) 11px, var(--surface-2) 22px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <span className="t-mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', background: 'var(--surface)', padding: '6px 12px', border: '1px solid var(--rule)', borderRadius: 3 }}>{label}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 25.1 — Verification Queue
// ──────────────────────────────────────────────────────────────
const KYC_QUEUE = [
  { id: 'DOC-77412', who: 'Rohit Sharma',   entity: 'driver',   doc: 'Driving Licence', vendor: 'Match · 0.97', vtone: 'ok',   age: '8m',  status: 'in_review', current: true },
  { id: 'DOC-77409', who: 'Skyline Charter',entity: 'operator', doc: 'AOC Certificate', vendor: 'Review · 0.71',vtone: 'warn', age: '22m', status: 'in_review' },
  { id: 'DOC-77405', who: 'AC-204 · VT-SKY',entity: 'aircraft', doc: 'Airworthiness',   vendor: '—',           vtone: '',     age: '41m', status: 'in_review' },
  { id: 'DOC-77401', who: 'Vikram Nair',    entity: 'driver',   doc: 'Vehicle RC',      vendor: 'Match · 0.94', vtone: 'ok',   age: '1h 04m', status: 'in_review' },
  { id: 'DOC-77398', who: 'Capt. L. Mehta', entity: 'pilot',    doc: 'Pilot Licence',   vendor: 'Match · 0.99', vtone: 'ok',   age: '1h 30m', status: 'in_review' },
  { id: 'DOC-77392', who: 'Aman Gupta',     entity: 'driver',   doc: 'PAN Card',        vendor: 'Mismatch · name', vtone: 'danger', age: '2h 11m', status: 'in_review' },
  { id: 'DOC-77388', who: 'BlueJet Air',    entity: 'operator', doc: 'Insurance',       vendor: 'Match · 0.96', vtone: 'ok',   age: '3h 02m', status: 'in_review' },
];

function VerificationQueueScreen() {
  return (
    <Shell
      active="kyc"
      breadcrumb="People & Fleet · KYC"
      title="Verification queue"
      subtitle="Documents across drivers, operators, aircraft & crew · vendor-assisted extraction confirmed by a reviewer"
      actions={
        <>
          <button className="btn sm"><Icon name="filter" size={13} />Entity type <Icon name="chevDown" size={11} /></button>
          <button className="btn sm"><Icon name="check" size={13} />Bulk approve</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <KpiStrip cols={5} items={[
          ['In queue',      '9',     'Across 4 entity types', 'var(--ink-2)'],
          ['Oldest',        '3h 02m', 'Within 8h SLA', 'var(--warn)'],
          ['Vendor matched','6',     'High confidence', 'var(--accent)'],
          ['Needs review',  '2',     'Low score / mismatch', 'var(--danger)'],
          ['Approved today','148',   '4 rejected', 'var(--ink-2)'],
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: 280, height: 32 }}>
            <Icon name="search" size={13} className="icon" />
            <input placeholder="Search by name, doc ID, type…" />
          </div>
          <FilterChip label="Entity" value="All" />
          <FilterChip label="Doc type" value="All" />
          <FilterChip label="Vendor" value="Needs review" count="2" />
          <div style={{ flex: 1 }} />
          <span className="t-meta">Approval sets the expiry & recomputes eligibility</span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 34 }}></th>
                <th style={{ width: 110 }}>Document</th>
                <th>Submitter</th>
                <th style={{ width: 150 }}>Doc type</th>
                <th style={{ width: 160 }}>Vendor result</th>
                <th style={{ width: 90 }}>In queue</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 190 }}></th>
              </tr>
            </thead>
            <tbody>
              {KYC_QUEUE.map((d, i) => (
                <tr key={i} className={d.current ? 'selected' : ''} style={{ cursor: 'pointer' }}>
                  <td><span style={{ width: 14, height: 14, border: '1px solid var(--rule-strong)', borderRadius: 3, display: 'inline-block' }} /></td>
                  <td><span className="t-mono" style={{ fontSize: 12 }}>{d.id}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ background: 'var(--surface-2)' }}><Icon name={entityIcon(d.entity)} size={13} /></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12.5 }}>{d.who}</span>
                        <span className="t-meta" style={{ textTransform: 'capitalize' }}>{d.entity}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge">{d.doc}</span></td>
                  <td>
                    {d.vendor === '—'
                      ? <span className="t-meta">No vendor</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span className={'dot ' + d.vtone} /><span className="t-mono" style={{ fontSize: 12, color: d.vtone === 'danger' ? 'var(--danger)' : d.vtone === 'warn' ? 'var(--warn)' : 'var(--ink-2)' }}>{d.vendor}</span></span>}
                  </td>
                  <td className="t-meta">{d.age}</td>
                  <td>{docStatusBadge(d.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn sm" style={{ height: 28 }}>Reupload</button>
                      <button className="btn sm danger" style={{ height: 28 }}>Reject</button>
                      <button className="btn sm accent" style={{ height: 28 }}>Approve</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
            <span className="t-meta">Showing 7 of 9 · expired documents auto force-offline drivers, pause operators & ground aircraft</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn icon sm"><Icon name="chevLeft" size={14} /></button>
              <button className="btn icon sm"><Icon name="chevRight" size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 25.2 — Document Detail
// ──────────────────────────────────────────────────────────────
function DocumentDetailScreen() {
  const extracted = [
    ['Name',          'Rohit Sharma',       'match', '0.99'],
    ['Licence no.',   'KA01-2019-0084471',  'match', '0.97'],
    ['Class',         'LMV · TRANS',        'match', '0.95'],
    ['Date of birth', '14 Aug 1991',        'match', '0.98'],
    ['Valid till',    '23 Oct 2027',        'match', '0.96'],
    ['Issuing RTO',   'KA01 · Koramangala', 'review','0.78'],
  ];
  return (
    <Shell
      active="kyc"
      breadcrumb="People & Fleet · KYC · Document"
      title="Driving Licence · Rohit Sharma"
      subtitle="DOC-77412 · driver · in review · submitted 8m ago · vendor: HyperVerge"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Download</button>
          <button className="btn sm"><Icon name="external" size={13} />Driver profile</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* preview */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="t-label">Scanned document</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge ok"><Icon name="shield" size={11} />Scanned clean</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn icon sm ghost" title="Rotate"><Icon name="refresh" size={13} /></button>
                <button className="btn icon sm ghost" title="Zoom"><Icon name="search" size={13} /></button>
              </div>
            </div>
          </div>
          <DocPlaceholder label="Driving licence · front · 1.2 MB JPG" h={300} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div style={{ flex: 1 }}><DocPlaceholder label="Front" h={64} /></div>
            <div style={{ flex: 1 }}><DocPlaceholder label="Back" h={64} /></div>
            <div style={{ flex: 1, opacity: 0.5 }}><DocPlaceholder label="Selfie" h={64} /></div>
          </div>
        </div>

        {/* extracted fields + decision */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label">Vendor-extracted fields</div>
              <span className="badge ok">Overall 0.94</span>
            </div>
            <div style={{ padding: '6px 20px 14px' }}>
              {extracted.map(([k, v, m, conf], i) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto', gap: 12, alignItems: 'center', padding: '11px 0', borderBottom: i < extracted.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <span className="t-meta">{k}</span>
                  <span style={{ fontSize: 13 }}>{v}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span className={'dot ' + (m === 'match' ? 'ok' : 'warn')} />
                    <span className="t-mono" style={{ fontSize: 11, color: m === 'match' ? 'var(--ink-3)' : 'var(--warn)' }}>{conf}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* decision */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Review decision</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <div className="field-label" style={{ marginBottom: 6 }}>Set expiry · required to approve</div>
                <div className="input" style={{ height: 38 }}>
                  <Icon name="clock" size={14} className="icon" />
                  <input defaultValue="23 Oct 2027" readOnly />
                </div>
              </div>
              <div>
                <div className="field-label" style={{ marginBottom: 6 }}>Reject reason · if rejecting</div>
                <div className="input" style={{ height: 38 }}>
                  <input placeholder="Select reason…" readOnly />
                  <Icon name="chevDown" size={14} className="icon" />
                </div>
              </div>
            </div>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, padding: '12px 14px', marginBottom: 14, display: 'flex', gap: 10 }}>
              <Icon name="alert" size={15} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>Issuing RTO field scored 0.78 — below the 0.85 auto-confirm threshold. Verify against the scan before approving.</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1 }}>Request reupload</button>
              <button className="btn danger" style={{ flex: 1 }}>Reject</button>
              <button className="btn accent" style={{ flex: 1.4 }}><Icon name="check" size={14} />Approve & set expiry</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 25.3 — Expiry Watchlist
// ──────────────────────────────────────────────────────────────
const WATCH_GROUPS = [
  {
    entity: 'Drivers', icon: 'car', count: 5,
    rows: [
      { who: 'Sunil Yadav',   doc: 'Driving Licence', days: -2,  impact: 'Force-offline' },
      { who: 'Imran Q.',      doc: 'Insurance',       days: 3,   impact: 'Online-eligible' },
      { who: 'Ramesh K.',     doc: 'Vehicle RC',      days: 9,   impact: 'Online-eligible' },
    ],
  },
  {
    entity: 'Operators & Aircraft', icon: 'building', count: 3,
    rows: [
      { who: 'Skyline · VT-SKY',  doc: 'Airworthiness', days: 1,  impact: 'Ground aircraft' },
      { who: 'BlueJet Air',       doc: 'AOC',           days: 6,  impact: 'Pause publishing' },
    ],
  },
  {
    entity: 'Crew', icon: 'plane', count: 1,
    rows: [
      { who: 'Capt. L. Mehta',  doc: 'Medical Cert.', days: 12, impact: 'Ground pilot' },
    ],
  },
];

function daysBadge(d) {
  if (d < 0) return <span className="badge danger"><span className="dot danger" />Expired {Math.abs(d)}d</span>;
  if (d <= 3) return <span className="badge warn"><span className="dot warn" />{d}d left</span>;
  return <span className="badge"><span className="dot pending" />{d}d left</span>;
}

function ExpiryWatchlistScreen() {
  return (
    <Shell
      active="kyc"
      breadcrumb="People & Fleet · KYC · Expiry"
      title="Expiry watchlist"
      subtitle="Documents expiring within 14 days · expiry recomputes eligibility & notifies the holder"
      actions={
        <>
          <button className="btn sm"><Icon name="filter" size={13} />Within 14d <Icon name="chevDown" size={11} /></button>
          <button className="btn sm accent"><Icon name="envelope" size={13} />Send all reminders</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <KpiStrip cols={4} items={[
          ['Expiring · 14d', '9',  'Across 3 entity groups', 'var(--ink-2)'],
          ['Already expired','1',  'Driver licence · -2d', 'var(--danger)'],
          ['≤ 3 days',       '3',  'Immediate action', 'var(--warn)'],
          ['Reminders sent', '24', 'Last batch 09:00', 'var(--ink-2)'],
        ]} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {WATCH_GROUPS.map(g => (
            <div key={g.entity} style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon name={g.icon} size={16} style={{ color: 'var(--ink-3)' }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{g.entity}</span>
                <span className="t-meta">{g.count} expiring</span>
                <div style={{ flex: 1 }} />
                <button className="btn sm ghost" style={{ height: 28 }}><Icon name="envelope" size={12} />Remind group</button>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Holder</th>
                    <th style={{ width: 200 }}>Document</th>
                    <th style={{ width: 150 }}>Expiry</th>
                    <th style={{ width: 200 }}>On expiry</th>
                    <th style={{ width: 200 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r, i) => (
                    <tr key={i}>
                      <td><span style={{ fontSize: 13, fontWeight: 500 }}>{r.who}</span></td>
                      <td><span className="badge">{r.doc}</span></td>
                      <td>{daysBadge(r.days)}</td>
                      <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="bolt" size={12} style={{ color: r.days < 0 ? 'var(--danger)' : 'var(--ink-3)' }} /><span className="t-meta" style={{ color: r.days < 0 ? 'var(--danger)' : 'var(--ink-2)' }}>{r.impact}</span></span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn sm" style={{ height: 28 }}><Icon name="envelope" size={12} />Remind</button>
                          <button className="btn sm" style={{ height: 28 }}>Re-verify</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, {
  VerificationQueueScreen, DocumentDetailScreen, ExpiryWatchlistScreen,
  KYC_QUEUE, WATCH_GROUPS,
});
