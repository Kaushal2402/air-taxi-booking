/* ─────────────────────────────────────────────────────────────
   Module 15 — Payments, Ledger & Reconciliation
   Screens 15.1 → 15.3
   ───────────────────────────────────────────────────────────── */

const TXNS = [
  { id: 'TXN-9F3A21', time: '14:38 · 29 May', cust: 'Priya Iyer',   bk: 'BK-RD-88421', svc: 'Sedan',   method: 'UPI',        vpa: 'priya@okhdfc',     gross: 624,    fee: 7,    net: 617,    status: 'captured', current: true },
  { id: 'TXN-9F3A19', time: '14:31 · 29 May', cust: 'Acme Corp',    bk: 'BK-AIR-2210', svc: 'Heli',    method: 'Corporate',  vpa: 'AC · Net-30',      gross: 184500, fee: 0,    net: 184500, status: 'invoiced' },
  { id: 'TXN-9F39F4', time: '14:22 · 29 May', cust: 'Rohan Mehta',  bk: 'BK-RD-88410', svc: 'Bike',    method: 'Wallet',     vpa: 'AM Wallet',        gross: 92,     fee: 0,    net: 92,     status: 'captured' },
  { id: 'TXN-9F39C8', time: '14:09 · 29 May', cust: 'Hema Rao',     bk: 'BK-RD-88401', svc: 'Sedan XL',method: 'Card',       vpa: '•••• 4291 · Visa', gross: 1280,   fee: 23,   net: 1257,   status: 'refunded' },
  { id: 'TXN-9F398A', time: '13:54 · 29 May', cust: 'Aarav Kapoor', bk: 'BK-RD-88388', svc: 'Sedan',   method: 'UPI',        vpa: 'aarav@okaxis',     gross: 410,    fee: 5,    net: 405,    status: 'captured' },
  { id: 'TXN-9F3955', time: '13:41 · 29 May', cust: 'Nikhil Shah',  bk: 'BK-RD-88376', svc: 'Auto',    method: 'Netbanking', vpa: 'HDFC Bank',        gross: 168,    fee: 4,    net: 164,    status: 'pending' },
  { id: 'TXN-9F3912', time: '13:30 · 29 May', cust: 'Sara Khan',    bk: 'BK-RD-88361', svc: 'Sedan',   method: 'Card',       vpa: '•••• 7733 · MC',   gross: 540,    fee: 11,   net: 529,    status: 'failed' },
  { id: 'TXN-9F38D0', time: '13:18 · 29 May', cust: 'Vikram Nair',  bk: 'BK-AIR-2207', svc: 'Charter', method: 'Card',       vpa: '•••• 1188 · Amex', gross: 412000, fee: 8240, net: 403760, status: 'captured' },
  { id: 'TXN-9F388E', time: '13:02 · 29 May', cust: 'Meera Joshi',  bk: 'BK-RD-88344', svc: 'Sedan XL',method: 'UPI',        vpa: 'meera@oksbi',      gross: 1190,   fee: 14,   net: 1176,   status: 'part-refund' },
  { id: 'TXN-9F384C', time: '12:47 · 29 May', cust: 'Dev Patel',    bk: 'BK-RD-88330', svc: 'Bike',    method: 'Card',       vpa: '•••• 9021 · Visa', gross: 110,    fee: 3,    net: 107,    status: 'chargeback' },
  { id: 'TXN-9F380A', time: '12:33 · 29 May', cust: 'Anjali Verma', bk: 'BK-RD-88318', svc: 'Sedan',   method: 'Wallet',     vpa: 'AM Wallet',        gross: 386,    fee: 0,    net: 386,    status: 'captured' },
];

function statusBadge(s) {
  switch (s) {
    case 'captured':    return <span className="badge ok"><span className="dot ok" />Captured</span>;
    case 'invoiced':    return <span className="badge info"><span className="dot info" />Invoiced</span>;
    case 'pending':     return <span className="badge"><span className="dot pending" />Pending</span>;
    case 'failed':      return <span className="badge danger"><span className="dot danger" />Failed</span>;
    case 'refunded':    return <span className="badge warn"><span className="dot warn" />Refunded</span>;
    case 'part-refund': return <span className="badge warn"><span className="dot warn" />Partial</span>;
    case 'chargeback':  return <span className="badge danger"><span className="dot danger" />Chargeback</span>;
    default: return null;
  }
}

const fmt = n => '₹ ' + n.toLocaleString('en-IN');

// ──────────────────────────────────────────────────────────────
// 15.1 — Payment Ledger
// ──────────────────────────────────────────────────────────────
function PaymentLedgerScreen() {
  return (
    <Shell
      active="payments"
      breadcrumb="Finance · Payments"
      title="Payments & ledger"
      subtitle="38,210 transactions · 30d · ₹ 4.82 Cr gross · settlement T+1 · IN"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Reconcile</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Manual entry</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* kpis */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            ['Gross volume · 30d', '₹ 4.82 Cr', '+12% vs prior',      'var(--accent)'],
            ['Net revenue',        '₹ 1.18 Cr', 'Commission + fees',  'var(--ink-2)'],
            ['Refunds',            '₹ 6.4 L',   '1.3% of gross',      'var(--warn)'],
            ['Chargebacks',        '₹ 84,200',  '0.18% · 11 open',    'var(--danger)'],
            ['Success rate',       '96.4%',     'Auth → capture',     'var(--accent)'],
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
            <input placeholder="Txn ID, customer, booking, VPA…" />
          </div>
          <FilterChip label="Method" value="All" />
          <FilterChip label="Status" value="3 selected" count="3" />
          <FilterChip label="Gateway" value="All" />
          <FilterChip label="Service" value="All" />
          <div style={{ flex: 1 }} />
          <button className="btn sm"><Icon name="clock" size={13} />Last 24h <Icon name="chevDown" size={11} /></button>
        </div>

        {/* ledger table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Customer</th>
                <th>Booking</th>
                <th>Method</th>
                <th style={{ textAlign: 'right' }}>Gross</th>
                <th style={{ textAlign: 'right' }}>Gateway fee</th>
                <th style={{ textAlign: 'right' }}>Net</th>
                <th>Status</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {TXNS.map(t => (
                <tr key={t.id} className={t.current ? 'selected' : ''} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span className="t-mono" style={{ fontSize: 12.5, color: 'var(--ink)' }}>{t.id}</span>
                      <span className="t-meta">{t.time}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar">{t.cust.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
                      <span style={{ fontSize: 13 }}>{t.cust}</span>
                    </div>
                  </td>
                  <td><span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t.bk}</span></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 12.5 }}>{t.method}</span>
                      <span className="t-meta">{t.vpa}</span>
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right', fontSize: 13 }}>{fmt(t.gross)}</td>
                  <td className="num" style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--ink-3)' }}>{t.fee ? '−' + fmt(t.fee).replace('₹ ', '₹') : '—'}</td>
                  <td className="num" style={{ textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{fmt(t.net)}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td><button className="btn icon sm ghost"><Icon name="chevRight" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
            <span className="t-meta">Showing 11 of 38,210 · settlement window 29 May 00:00 – 23:59 IST</span>
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
// 15.2 — Transaction Detail & Refund
// ──────────────────────────────────────────────────────────────
function TransactionDetailScreen() {
  const breakdown = [
    ['Base fare',        624,  false],
    ['Distance · 8.2 km', 0,   false],
    ['Surge · 1.0×',     0,    false],
    ['Discount · WELCOME20', -124, false],
    ['GST · 5%',         25,   false],
    ['Amount charged',   624,  'total'],
    ['Gateway fee · UPI', -7,  'fee'],
    ['Acme commission · 18%', -112, 'fee'],
    ['Net to driver',    505,  'net'],
  ];
  const timeline = [
    ['Authorized',  '14:38:02', 'UPI collect request approved · priya@okhdfc', 'ok'],
    ['Captured',    '14:38:04', 'Funds captured · gateway ref RZP-8821x', 'ok'],
    ['Booking settled', '15:12:40', 'Driver payout queued · weekly cycle', 'ok'],
    ['Settlement', 'T+1 · pending', 'Expected in 30 May 11:00 batch', 'pending'],
  ];

  return (
    <Shell
      active="payments"
      breadcrumb="Finance · Payments · Transaction"
      title="TXN-9F3A21"
      subtitle="Captured · UPI · ₹ 624 · 29 May 14:38 IST"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Receipt</button>
          <button className="btn sm">Issue refund</button>
          <button className="btn sm danger"><Icon name="alert" size={13} />Flag dispute</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        {/* left — breakdown + method */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label" style={{ padding: 0 }}>Amount breakdown</div>
              <span className="badge ok"><span className="dot ok" />Captured</span>
            </div>
            <div style={{ padding: '8px 24px 16px' }}>
              {breakdown.map(([k, v, kind], i) => {
                const isTotal = kind === 'total';
                const isNet = kind === 'net';
                return (
                  <div key={k} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 0',
                    borderBottom: i < breakdown.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                    borderTop: isTotal ? '1px solid var(--rule-strong)' : 'none',
                  }}>
                    <span style={{
                      fontSize: isTotal || isNet ? 14 : 13,
                      fontWeight: isTotal || isNet ? 500 : 400,
                      color: kind === 'fee' ? 'var(--ink-3)' : 'var(--ink)',
                      fontFamily: isTotal || isNet ? 'var(--font-serif)' : 'var(--font-sans)',
                    }}>{k}</span>
                    <span className="t-num" style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: isTotal || isNet ? 16 : 13,
                      fontWeight: isTotal || isNet ? 500 : 400,
                      color: isNet ? 'var(--accent)' : v < 0 ? 'var(--ink-3)' : 'var(--ink)',
                    }}>{v === 0 ? '—' : (v < 0 ? '−₹' + Math.abs(v).toLocaleString('en-IN') : '₹' + v.toLocaleString('en-IN'))}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* payment method */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Payment instrument</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, border: '1px solid var(--rule-strong)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <Icon name="wallet" size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>UPI · priya@okhdfc</div>
                <div className="t-meta" style={{ marginTop: 3 }}>HDFC Bank · collect · verified instrument</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="t-label" style={{ padding: 0 }}>Gateway ref</div>
                <div className="t-mono" style={{ fontSize: 12.5, marginTop: 4 }}>RZP-8821x4F</div>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[['Risk score', '12 / 100', 'Low'], ['AVS', 'Pass', 'Match'], ['3DS', 'N/A', 'UPI']].map(([k, v, m]) => (
                <div key={k} style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 5, fontSize: 14, fontWeight: 500 }}>{v}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{m}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right — timeline + refund */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div className="t-label" style={{ marginBottom: 16 }}>Lifecycle</div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 1, background: 'var(--rule)' }} />
              {timeline.map(([t, ts, m, st], i) => (
                <div key={t} style={{ display: 'flex', gap: 14, paddingBottom: i < timeline.length - 1 ? 18 : 0, position: 'relative' }}>
                  <span className={'dot ' + (st === 'ok' ? 'ok' : 'pending')} style={{ marginTop: 4, position: 'relative', zIndex: 1, background: st === 'ok' ? 'var(--accent)' : 'var(--surface)', border: st === 'pending' ? '1.5px solid var(--ink-4)' : 'none', boxShadow: st === 'ok' ? '0 0 0 3px var(--accent-soft)' : 'none' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: st === 'pending' ? 'var(--ink-3)' : 'var(--ink)' }}>{t}</span>
                      <span className="t-meta">{ts}</span>
                    </div>
                    <div className="t-meta" style={{ marginTop: 3 }}>{m}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* refund panel */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <FormSection title="Issue refund" description="Refunds return to the original instrument. UPI refunds settle in 1–3 business days; gateway fee is non-recoverable.">
              <Row cols={2}>
                <Field label="Refund type" value="Partial" select />
                <Field label="Amount" value="₹ 200" />
              </Row>
              <Field label="Reason" value="Trip cancelled mid-route · service issue" select />
            </FormSection>
            <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule))', borderRadius: 3, display: 'flex', gap: 12 }}>
              <Icon name="alert" size={16} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                ₹200 of ₹624 will be refunded to <span className="t-mono">priya@okhdfc</span>. Driver payout adjusts to ₹343. Gateway fee (₹7) is not returned.
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn sm">Cancel</button>
              <button className="btn sm accent">Confirm refund · ₹200</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 15.3 — Gateway Reconciliation
// ──────────────────────────────────────────────────────────────
function ReconciliationScreen() {
  const gateways = [
    { name: 'UPI Switch',   ref: 'NPCI · T+1', expected: '₹ 1.84 Cr', settled: '₹ 1.84 Cr', variance: 0,     match: 100,  status: 'matched' },
    { name: 'CardNet',      ref: 'Visa/MC · T+2', expected: '₹ 1.62 Cr', settled: '₹ 1.61 Cr', variance: -84200, match: 99.5, status: 'variance' },
    { name: 'Netbanking',   ref: 'PG · T+1', expected: '₹ 0.71 Cr', settled: '₹ 0.71 Cr', variance: 0,     match: 100,  status: 'matched' },
    { name: 'Wallet & Corp',ref: 'Internal',  expected: '₹ 0.65 Cr', settled: '₹ 0.63 Cr', variance: -210000, match: 96.8, status: 'pending' },
  ];
  const batches = [
    { id: 'STL-29M-UPI-01', gw: 'UPI Switch', date: '29 May 11:00', count: 8420,  amount: '₹ 92.1 L', matched: 8420, status: 'matched' },
    { id: 'STL-29M-CRD-01', gw: 'CardNet',    date: '29 May 09:00', count: 3110,  amount: '₹ 81.4 L', matched: 3104, status: 'variance' },
    { id: 'STL-28M-UPI-02', gw: 'UPI Switch', date: '28 May 23:00', count: 9210,  amount: '₹ 88.6 L', matched: 9210, status: 'matched' },
    { id: 'STL-28M-NB-01',  gw: 'Netbanking', date: '28 May 11:00', count: 1840,  amount: '₹ 34.2 L', matched: 1840, status: 'matched' },
    { id: 'STL-28M-CRD-01', gw: 'CardNet',    date: '28 May 09:00', count: 2980,  amount: '₹ 79.8 L', matched: 2980, status: 'matched' },
  ];

  return (
    <Shell
      active="payments"
      breadcrumb="Finance · Payments · Reconciliation"
      title="Settlement reconciliation"
      subtitle="29 May cycle · 4 gateways · 6 unmatched items · ₹ 2.94 L variance open"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Statement</button>
          <button className="btn sm"><Icon name="refresh" size={13} />Re-run match</button>
          <button className="btn sm accent">Resolve all</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* gateway cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {gateways.map(g => (
            <div key={g.name} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{g.name}</div>
                {g.status === 'matched' ? <span className="badge ok"><span className="dot ok" />Matched</span> :
                 g.status === 'variance' ? <span className="badge danger"><span className="dot danger" />Variance</span> :
                 <span className="badge warn"><span className="dot warn" />Pending</span>}
              </div>
              <div className="t-meta" style={{ marginTop: 4 }}>{g.ref}</div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="t-meta">Expected</span>
                  <span className="t-mono" style={{ fontSize: 12.5 }}>{g.expected}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="t-meta">Settled</span>
                  <span className="t-mono" style={{ fontSize: 12.5 }}>{g.settled}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--rule-soft)' }}>
                  <span className="t-meta">Variance</span>
                  <span className="t-mono" style={{ fontSize: 12.5, color: g.variance < 0 ? 'var(--danger)' : 'var(--accent)' }}>
                    {g.variance === 0 ? '₹ 0' : '−' + fmt(Math.abs(g.variance)).replace('₹ ', '₹')}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: g.match + '%', height: '100%', background: g.match >= 100 ? 'var(--accent)' : g.match >= 99 ? 'var(--warn)' : 'var(--danger)' }} />
                </div>
                <span className="t-meta" style={{ fontFamily: 'var(--font-mono)' }}>{g.match}%</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 18 }}>
          {/* settlement batches */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Settlement batches</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Last 48 hours</h3>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Gateway</th>
                  <th style={{ textAlign: 'right' }}>Txns</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Match</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b.id} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span className="t-mono" style={{ fontSize: 12 }}>{b.id}</span>
                        <span className="t-meta">{b.date}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{b.gw}</td>
                    <td className="num" style={{ textAlign: 'right', fontSize: 12.5 }}>{b.count.toLocaleString('en-IN')}</td>
                    <td className="num" style={{ textAlign: 'right', fontSize: 13 }}>{b.amount}</td>
                    <td>
                      <span className="t-mono" style={{ fontSize: 12, color: b.matched === b.count ? 'var(--accent)' : 'var(--danger)' }}>
                        {b.matched.toLocaleString('en-IN')}{b.matched !== b.count && ' / ' + b.count.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      {b.status === 'matched'
                        ? <span className="badge ok"><span className="dot ok" />Matched</span>
                        : <span className="badge danger"><span className="dot danger" />6 unmatched</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* unmatched queue */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Needs attention</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Unmatched items</h3>
            </div>
            <div style={{ padding: '8px 18px 16px' }}>
              {[
                ['Missing in bank file', '4 txns', '₹ 62,100', 'Captured at gateway, not in settlement', 'danger'],
                ['Amount mismatch',      '2 txns', '₹ 22,100', 'Settled less gateway commission', 'warn'],
                ['Duplicate credit',     '1 txn',  '₹ 8,400',  'Two settlement lines, one capture', 'warn'],
                ['Late settlement',      'Wallet', '₹ 2.1 L',  'Corp invoices pending T+1', 'pending'],
              ].map(([k, c, amt, m, tone], i) => (
                <div key={k} style={{ padding: '13px 0', borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span className={'dot ' + tone} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{k}</span>
                    </div>
                    <span className="t-mono" style={{ fontSize: 12.5 }}>{amt}</span>
                  </div>
                  <div className="t-meta" style={{ marginTop: 5, marginLeft: 16 }}>{c} · {m}</div>
                </div>
              ))}
              <button className="btn sm" style={{ width: '100%', marginTop: 14 }}>Open resolution queue</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { PaymentLedgerScreen, TransactionDetailScreen, ReconciliationScreen, TXNS });
