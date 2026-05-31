/* ─────────────────────────────────────────────────────────────
   Module 16 — Payouts (Runs, Run Detail, Driver Statement)
   Screens 16.1 → 16.3
   ───────────────────────────────────────────────────────────── */

const fmtR = n => '₹ ' + n.toLocaleString('en-IN');

const RUNS = [
  { id: 'PR-W22-DRV',  type: 'Driver · weekly',     period: '19–25 May', payees: 1184, amount: '₹ 38.4 L', status: 'review',     cta: 'Awaiting Finance approval', current: true },
  { id: 'PR-M05-OPR',  type: 'Operator · charter',  period: 'May settlement', payees: 18, amount: '₹ 2.41 Cr', status: 'review',  cta: '4 operators on hold' },
  { id: 'PR-W22-REF',  type: 'Referral payouts',    period: '19–25 May', payees: 642,  amount: '₹ 1.18 L', status: 'scheduled',  cta: 'Runs 26 May 11:00' },
  { id: 'PR-W21-DRV',  type: 'Driver · weekly',     period: '12–18 May', payees: 1170, amount: '₹ 36.9 L', status: 'paid',       cta: 'Settled · UTR captured' },
  { id: 'PR-M04-OPR',  type: 'Operator · charter',  period: 'Apr settlement', payees: 17, amount: '₹ 2.18 Cr', status: 'paid',    cta: 'Settled 02 May' },
  { id: 'PR-W20-DRV',  type: 'Driver · weekly',     period: '05–11 May', payees: 1162, amount: '₹ 35.2 L', status: 'paid',       cta: 'Settled · UTR captured' },
];

const PAYEES = [
  { name: 'Imran Sheikh',  id: 'DRV-20194', trips: 142, gross: 24820, incent: 2400, ded: 1820, hold: 0,    net: 25400, status: 'ready',  current: true },
  { name: 'Lakshmi Menon', id: 'DRV-20088', trips: 128, gross: 22140, incent: 1800, ded: 1240, hold: 0,    net: 22700, status: 'ready' },
  { name: 'Sandeep Yadav', id: 'DRV-21002', trips: 119, gross: 20910, incent: 1500, ded: 980,  hold: 0,    net: 21430, status: 'ready' },
  { name: 'Faisal Ahmed',  id: 'DRV-20771', trips: 134, gross: 23260, incent: 2100, ded: 1420, hold: 4200, net: 19740, status: 'hold' },
  { name: 'Geeta Pillai',  id: 'DRV-20455', trips: 108, gross: 18640, incent: 1200, ded: 760,  hold: 0,    net: 19080, status: 'ready' },
  { name: 'Manoj Kumar',   id: 'DRV-21188', trips: 96,  gross: 16320, incent: 900,  ded: 640,  hold: 0,    net: 16580, status: 'ready' },
  { name: 'Tariq Ali',     id: 'DRV-20933', trips: 88,  gross: 15080, incent: 700,  ded: 0,    hold: 0,    net: 15780, status: 'bank-fail' },
  { name: 'Divya Nair',    id: 'DRV-20612', trips: 81,  gross: 14210, incent: 600,  ded: 520,  hold: 0,    net: 14290, status: 'ready' },
];

// ──────────────────────────────────────────────────────────────
// 16.1 — Payout Runs
// ──────────────────────────────────────────────────────────────
function PayoutRunsScreen() {
  return (
    <Shell
      active="payouts"
      breadcrumb="Finance · Payouts"
      title="Payout runs"
      subtitle="2 runs awaiting approval · next driver cycle 26 May 11:00 · escrow ₹ 41.2 L"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Beneficiaries</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New run</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* kpis */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            ['Pending approval', '₹ 2.79 Cr', '2 runs · 1,202 payees', 'var(--warn)'],
            ['In escrow',        '₹ 41.2 L',  'Held until release',    'var(--ink-2)'],
            ['Paid · MTD',       '₹ 4.12 Cr', '4 completed runs',      'var(--accent)'],
            ['On hold',          '₹ 18,400',  '6 payees · KYC / dispute','var(--danger)'],
            ['Bank failures',    '14',        'Awaiting re-verify',    'var(--danger)'],
          ].map(([k, v, m, c], i) => (
            <div key={k} style={{ padding: '18px 22px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 28 }}>{v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: c }}>{m}</div>
            </div>
          ))}
        </div>

        {/* filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: 280, height: 32 }}>
            <Icon name="search" size={13} className="icon" />
            <input placeholder="Run ID, type, period…" />
          </div>
          <FilterChip label="Type" value="All" />
          <FilterChip label="Status" value="Awaiting" count="2" />
          <div style={{ flex: 1 }} />
          <button className="btn sm"><Icon name="filter" size={13} />This month <Icon name="chevDown" size={11} /></button>
        </div>

        {/* runs table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Run</th>
                <th>Period</th>
                <th style={{ textAlign: 'right' }}>Payees</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Status</th>
                <th></th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {RUNS.map(r => (
                <tr key={r.id} className={r.current ? 'selected' : ''} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span className="t-mono" style={{ fontSize: 12.5, color: 'var(--ink)' }}>{r.id}</span>
                      <span className="t-meta">{r.type}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{r.period}</td>
                  <td className="num" style={{ textAlign: 'right', fontSize: 13 }}>{r.payees.toLocaleString('en-IN')}</td>
                  <td className="num" style={{ textAlign: 'right', fontSize: 14, fontWeight: 500 }}>{r.amount}</td>
                  <td>
                    {r.status === 'review'    ? <span className="badge warn"><span className="dot warn" />Review</span> :
                     r.status === 'scheduled' ? <span className="badge info"><span className="dot info" />Scheduled</span> :
                     <span className="badge ok"><span className="dot ok" />Paid</span>}
                  </td>
                  <td className="t-meta">{r.cta}</td>
                  <td style={{ textAlign: 'right' }}>
                    {r.status === 'review'
                      ? <button className="btn sm accent">Approve</button>
                      : <button className="btn sm ghost"><Icon name="chevRight" size={14} /></button>}
                  </td>
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
// 16.2 — Payout Run Detail
// ──────────────────────────────────────────────────────────────
function PayoutRunDetailScreen() {
  return (
    <Shell
      active="payouts"
      breadcrumb="Finance · Payouts · Run detail"
      title="PR-W22-DRV"
      subtitle="Driver weekly · 19–25 May · 1,184 payees · ₹ 38.4 L · awaiting Finance approval"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />NACH file</button>
          <button className="btn sm danger">Reject</button>
          <button className="btn sm accent"><Icon name="check" size={13} />Approve & release</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* summary band */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 1.2fr', gap: 16 }}>
          {[
            ['Gross earnings', '₹ 41.9 L', 'Trip fares + incentives'],
            ['Deductions',     '−₹ 2.8 L', 'Commission already netted'],
            ['Holds',          '−₹ 18,400', '6 payees flagged'],
            ['Net payout',     '₹ 38.4 L', '1,178 ready · 6 held'],
          ].map(([k, v, m], i) => (
            <div key={k} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '16px 18px' }}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 6, fontFamily: 'var(--font-serif)', fontSize: 24, color: i === 3 ? 'var(--accent)' : 'var(--ink)' }}>{v}</div>
              <div className="t-meta" style={{ marginTop: 4 }}>{m}</div>
            </div>
          ))}
          {/* approval card */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--rule-strong)', padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="t-label" style={{ padding: 0 }}>Approval chain</div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[['Ops review', 'ok', 'A. Rao · 25 May'], ['Finance', 'pending', 'You'], ['Bank release', 'pending', 'Auto on approve']].map(([k, st, m]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Icon name={st === 'ok' ? 'check' : 'dot'} size={13} stroke={2.2} style={{ color: st === 'ok' ? 'var(--accent)' : 'var(--ink-4)' }} />
                    <span style={{ fontSize: 12.5, flex: 1 }}>{k}</span>
                    <span className="t-meta">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* payee table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="t-label">Payees</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>1,184 drivers · sorted by net</h3>
            </div>
            <div className="input" style={{ width: 240, height: 30 }}>
              <Icon name="search" size={13} className="icon" />
              <input placeholder="Driver, ID…" />
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Driver</th>
                <th style={{ textAlign: 'right' }}>Trips</th>
                <th style={{ textAlign: 'right' }}>Gross</th>
                <th style={{ textAlign: 'right' }}>Incentive</th>
                <th style={{ textAlign: 'right' }}>Deductions</th>
                <th style={{ textAlign: 'right' }}>Hold</th>
                <th style={{ textAlign: 'right' }}>Net</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {PAYEES.map(p => (
                <tr key={p.id} className={p.current ? 'selected' : ''} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar">{p.name.split(' ').map(x => x[0]).join('')}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13 }}>{p.name}</span>
                        <span className="t-mono t-meta">{p.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right', fontSize: 12.5 }}>{p.trips}</td>
                  <td className="num" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmtR(p.gross)}</td>
                  <td className="num" style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--accent)' }}>+{fmtR(p.incent).replace('₹ ', '₹')}</td>
                  <td className="num" style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--ink-3)' }}>{p.ded ? '−' + fmtR(p.ded).replace('₹ ', '₹') : '—'}</td>
                  <td className="num" style={{ textAlign: 'right', fontSize: 12.5, color: p.hold ? 'var(--danger)' : 'var(--ink-4)' }}>{p.hold ? '−' + fmtR(p.hold).replace('₹ ', '₹') : '—'}</td>
                  <td className="num" style={{ textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{fmtR(p.net)}</td>
                  <td>
                    {p.status === 'ready'     ? <span className="badge ok"><span className="dot ok" />Ready</span> :
                     p.status === 'hold'      ? <span className="badge danger"><span className="dot danger" />Hold</span> :
                     <span className="badge warn"><span className="dot warn" />Bank fail</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
            <span className="t-meta">Showing 8 of 1,184 · 1,178 ready · 4 hold · 2 bank-fail</span>
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
// 16.3 — Driver Earnings Statement
// ──────────────────────────────────────────────────────────────
function DriverStatementScreen() {
  const lines = [
    ['Trip fares · 142 trips',      24820, false],
    ['Surge earnings',              0,     false],
    ['Peak incentive · 40 trips',   1600,  false],
    ['Quest bonus · 130-trip tier', 800,   false],
    ['Acme commission · 18%',       -4468, 'ded'],
    ['Cancellation penalty · 2',    -120,  'ded'],
    ['Fuel advance recovery',       -1700, 'ded'],
    ['Net payable',                 20932, 'net'],
  ];
  const series = [2.1, 3.4, 2.8, 4.1, 3.6, 5.2, 3.8];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const max = 6;

  return (
    <Shell
      active="payouts"
      breadcrumb="Finance · Payouts · Statement"
      title="Imran Sheikh · DRV-20194"
      subtitle="Driver weekly statement · 19–25 May · ₹ 25,400 net · settles 26 May"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Statement PDF</button>
          <button className="btn sm">Adjust</button>
          <button className="btn sm danger">Place hold</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        {/* left — earnings breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label" style={{ padding: 0 }}>Earnings breakdown</div>
              <span className="badge ok"><span className="dot ok" />Ready to pay</span>
            </div>
            <div style={{ padding: '8px 24px 16px' }}>
              {lines.map(([k, v, kind], i) => {
                const isNet = kind === 'net';
                return (
                  <div key={k} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 0',
                    borderBottom: i < lines.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                    borderTop: isNet ? '1px solid var(--rule-strong)' : 'none',
                  }}>
                    <span style={{
                      fontSize: isNet ? 14 : 13,
                      fontWeight: isNet ? 500 : 400,
                      color: kind === 'ded' ? 'var(--ink-3)' : 'var(--ink)',
                      fontFamily: isNet ? 'var(--font-serif)' : 'var(--font-sans)',
                    }}>{k}</span>
                    <span className="t-num" style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: isNet ? 16 : 13,
                      fontWeight: isNet ? 500 : 400,
                      color: isNet ? 'var(--accent)' : v < 0 ? 'var(--ink-3)' : 'var(--ink)',
                    }}>{v === 0 ? '—' : (v < 0 ? '−₹' + Math.abs(v).toLocaleString('en-IN') : '₹' + v.toLocaleString('en-IN'))}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* daily earnings chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div className="t-label" style={{ marginBottom: 4 }}>Daily net · this week</div>
            <h3 style={{ margin: '0 0 18px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>₹ 25.4K · peak Saturday</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 140 }}>
              {series.map((v, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', height: (v / max) * 100 + '%', background: i === 5 ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 40%, var(--surface-2))', borderRadius: '2px 2px 0 0' }} />
                  </div>
                  <span className="t-meta" style={{ fontFamily: 'var(--font-mono)' }}>{days[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right — payee + bank + adjustments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="avatar lg">IS</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>Imran Sheikh</div>
                <div className="t-meta" style={{ marginTop: 3 }}>DRV-20194 · BLR · joined Mar 2024</div>
              </div>
              <span className="badge ok"><span className="dot ok" />Active</span>
            </div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[['Lifetime', '₹ 18.4 L'], ['Rating', '4.92'], ['Acceptance', '94%']].map(([k, v]) => (
                <div key={k} style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 5, fontFamily: 'var(--font-serif)', fontSize: 18 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Beneficiary account</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, border: '1px solid var(--rule-strong)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
                <Icon name="building" size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>HDFC Bank · •••• 6612</div>
                <div className="t-meta" style={{ marginTop: 3 }}>IFSC HDFC0001234 · name match verified</div>
              </div>
              <span className="badge ok"><Icon name="check" size={11} />Verified</span>
            </div>
            <div className="t-meta" style={{ marginTop: 12 }}>Payout method · NACH credit · penny-drop verified 14 Apr.</div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="t-label">Adjustments</div>
              <button className="btn sm ghost"><Icon name="plus" size={12} />Add</button>
            </div>
            {[
              ['Fuel advance recovery', '−₹ 1,700', 'Instalment 2 of 3', 'ded'],
              ['Referral bonus',        '+₹ 100',   'WELCOME20 · 1 convert', 'add'],
            ].map(([k, v, m, t], i) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: i < 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 13 }}>{k}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{m}</div>
                </div>
                <span className="t-mono" style={{ fontSize: 13, color: t === 'add' ? 'var(--accent)' : 'var(--ink-3)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { PayoutRunsScreen, PayoutRunDetailScreen, DriverStatementScreen, RUNS, PAYEES });
