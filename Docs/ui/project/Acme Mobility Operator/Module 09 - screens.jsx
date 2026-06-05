/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 09 — Payouts & Settlements
   9.1a  Payouts list — normal (recent + upcoming settlements)
   9.1b  Payouts list — disputed state
   9.2   Settlement detail — breakdown, line items, bank transfer
   ───────────────────────────────────────────────────────────── */

// ─── Payout status badge ───────────────────────────────────────
function PayoutStatus({ s }) {
  const map = {
    'Paid':       'ok',
    'Pending':    'warn',
    'Processing': 'info',
    'Disputed':   'danger',
    'On hold':    'danger',
  };
  return (
    <span className={`badge ${map[s] || 'pending'}`} style={{ height: 20, fontSize: 10.5 }}>
      <span className={`dot ${map[s] || 'pending'}`} />{s}
    </span>
  );
}

// ─── KPI card ──────────────────────────────────────────────────
function KpiCard({ label, value, sub, tone, icon }) {
  return (
    <div style={{ flex: 1, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-label">{label}</span>
        {icon && <Icon name={icon} size={14} style={{ color: 'var(--ink-4)' }} />}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, letterSpacing: '-0.01em', fontWeight: 600, color: tone ? `var(--${tone})` : 'var(--ink)', lineHeight: 1 }}>{value}</div>
      {sub && <div className="t-meta" style={{ fontSize: 11 }}>{sub}</div>}
    </div>
  );
}

// ─── Payout row ────────────────────────────────────────────────
function PayoutRow({ p, last }) {
  const rowBg =
    p.status === 'Disputed' ? 'color-mix(in oklab,var(--danger-soft) 55%,transparent)' :
    p.status === 'On hold'  ? 'color-mix(in oklab,var(--danger-soft) 40%,transparent)' :
    'transparent';
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 24px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)', background: rowBg }}>
      {/* ref */}
      <div style={{ width: 130, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.05em', color: 'var(--ink)', fontWeight: 500 }}>{p.ref}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 3 }}>{p.period}</div>
      </div>
      {/* description */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.description}</div>
        <div className="t-meta" style={{ fontSize: 11, marginTop: 3 }}>{p.flights} flights · {p.bookings} bookings</div>
      </div>
      {/* gross */}
      <div style={{ width: 110, flexShrink: 0, textAlign: 'right', paddingRight: 16 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)', letterSpacing: '0.03em' }}>{p.gross}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>Gross</div>
      </div>
      {/* platform fee */}
      <div style={{ width: 100, flexShrink: 0, textAlign: 'right', paddingRight: 16 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--danger)', letterSpacing: '0.03em' }}>−{p.fee}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>Platform fee</div>
      </div>
      {/* net */}
      <div style={{ width: 120, flexShrink: 0, textAlign: 'right', paddingRight: 16 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--ok)', letterSpacing: '0.02em', fontWeight: 600 }}>{p.net}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>Net payout</div>
      </div>
      {/* date */}
      <div style={{ width: 100, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.03em' }}>{p.payDate}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>{p.payDateSub}</div>
      </div>
      {/* status */}
      <div style={{ width: 100, flexShrink: 0 }}>
        <PayoutStatus s={p.status} />
      </div>
      {/* actions */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0, width: 130, justifyContent: 'flex-end' }}>
        {p.actions}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 9.1 — Payouts list
// ─────────────────────────────────────────────────────────────
function PayoutsListScreen({ variant = 'normal' }) {
  const isDisputed = variant === 'disputed';

  const tabs = [
    { id: 'all',        label: 'All',        count: 9 },
    { id: 'pending',    label: 'Pending',    count: 2 },
    { id: 'processing', label: 'Processing', count: 1 },
    { id: 'paid',       label: 'Paid',       count: 5 },
    { id: 'disputed',   label: 'Disputed',   count: isDisputed ? 1 : 0 },
  ];

  const rows = [
    {
      ref: 'PAY-2026-24', period: 'Jun 1–7, 2026',
      description: 'Weekly settlement — 7 completed flights',
      flights: 7, bookings: 7,
      gross: '₹9,42,500', fee: '₹28,275', net: '₹9,14,225',
      payDate: '9 Jun 2026', payDateSub: 'Scheduled',
      status: 'Pending',
      actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>],
    },
    {
      ref: 'PAY-2026-23', period: 'May 25–31, 2026',
      description: 'Weekly settlement — 5 completed flights',
      flights: 5, bookings: 5,
      gross: '₹7,18,000', fee: '₹21,540', net: '₹6,96,460',
      payDate: '2 Jun 2026', payDateSub: 'Processing',
      status: 'Processing',
      actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>],
    },
    {
      ref: 'PAY-2026-22', period: 'May 18–24, 2026',
      description: 'Weekly settlement — 6 completed flights',
      flights: 6, bookings: 6,
      gross: '₹8,55,000', fee: '₹25,650', net: '₹8,29,350',
      payDate: '26 May 2026', payDateSub: 'Paid on time',
      status: 'Paid',
      actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="d" className="btn sm" style={{ height: 26 }}><Icon name="download" size={11} /></button>],
    },
    ...(isDisputed ? [{
      ref: 'PAY-2026-21', period: 'May 11–17, 2026',
      description: 'Weekly settlement — dispute on BKG-0541 cancellation fee',
      flights: 4, bookings: 5,
      gross: '₹5,20,000', fee: '₹15,600', net: '₹5,04,400',
      payDate: 'On hold', payDateSub: 'Dispute open',
      status: 'Disputed',
      actions: [<button key="v" className="btn sm danger" style={{ height: 26 }}><Icon name="alert" size={11} />Dispute</button>, <button key="d" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>],
    }] : []),
    {
      ref: 'PAY-2026-20', period: 'May 4–10, 2026',
      description: 'Weekly settlement — 8 completed flights',
      flights: 8, bookings: 8,
      gross: '₹11,30,000', fee: '₹33,900', net: '₹10,96,100',
      payDate: '12 May 2026', payDateSub: 'Paid on time',
      status: 'Paid',
      actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="d" className="btn sm" style={{ height: 26 }}><Icon name="download" size={11} /></button>],
    },
    {
      ref: 'PAY-2026-19', period: 'Apr 27–May 3, 2026',
      description: 'Weekly settlement — 5 completed flights',
      flights: 5, bookings: 5,
      gross: '₹6,80,000', fee: '₹20,400', net: '₹6,59,600',
      payDate: '5 May 2026', payDateSub: 'Paid on time',
      status: 'Paid',
      actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="d" className="btn sm" style={{ height: 26 }}><Icon name="download" size={11} /></button>],
    },
  ];

  return (
    <Shell
      active="payouts"
      breadcrumb="Finance"
      title="Payouts & Settlements"
      subtitle={`Helix Aviation · ${isDisputed ? '1 dispute open · ' : ''}Next payout 9 Jun 2026`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm"><Icon name="download" size={12} />Export CSV</button>
        </div>
      }
    >
      {/* disputed banner */}
      {isDisputed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 42, background: 'var(--danger-soft)', borderBottom: '1px solid color-mix(in oklab,var(--danger) 24%,var(--rule))', flexShrink: 0 }}>
          <Icon name="alert" size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 500 }}>PAY-2026-21 payment on hold</span>
          <span style={{ width: 1, height: 14, background: 'color-mix(in oklab,var(--danger) 28%,var(--rule))' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Dispute raised on BKG-0541 cancellation fee (₹92,000). Acme Mobility support reviewing. Est. resolution 5–7 days.</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm accent" style={{ height: 28 }}>View dispute →</button>
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, padding: '16px 24px', borderBottom: '1px solid var(--rule)', flexShrink: 0, background: 'var(--surface-2)' }}>
        <KpiCard label="Next payout"         value="₹9,14,225" sub="Due 9 Jun · PAY-2026-24"   tone="ok"   icon="calendar" />
        <KpiCard label="Processing"           value="₹6,96,460" sub="PAY-2026-23 · 2 Jun"                   icon="clock" />
        <KpiCard label="Paid this month"      value="₹8,29,350" sub="PAY-2026-22 · 1 settlement"            icon="wallet" />
        <KpiCard label="YTD gross"            value="₹48,45,500" sub="Jan–Jun 2026"                          icon="archive" />
        <KpiCard label="Platform fees YTD"    value="₹1,45,365" sub="~3% avg commission"       tone="warn" icon="tag" />
        {isDisputed && <KpiCard label="On hold"  value="₹5,04,400" sub="PAY-2026-21 · disputed"   tone="danger" icon="alert" />}
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--rule)', padding: '0 28px', background: 'var(--surface)', flexShrink: 0 }}>
        {tabs.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            height: 44, padding: '0 14px', cursor: 'pointer',
            borderBottom: t.id === 'all' ? '2px solid var(--ink)' : '2px solid transparent',
            color: t.id === 'all' ? 'var(--ink)' : 'var(--ink-3)',
            fontSize: 13, fontWeight: t.id === 'all' ? 500 : 400, marginBottom: -1,
          }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 7px', borderRadius: 10, background: t.id === 'all' ? 'var(--ink)' : 'var(--surface-sunk)', color: t.id === 'all' ? 'var(--bg)' : 'var(--ink-3)', border: t.id === 'all' ? 'none' : '1px solid var(--rule-strong)' }}>{t.count}</span>
            )}
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', background: 'var(--surface)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <FilterChip label="Period" value="All time" />
        <FilterChip label="Amount" value="Any" />
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>{rows.length} settlements</span>
      </div>

      {/* col header */}
      <div style={{ display: 'flex', padding: '8px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        {[['Ref / Period',130],['Description',0],['Gross',110,'right'],['Fee',100,'right'],['Net payout',120,'right'],['Pay date',100],['Status',100],['',130,'right']].map(([l,w,align]) => (
          <div key={l} className="t-label" style={{ width: w || undefined, flex: !w ? 1 : undefined, flexShrink: w ? 0 : undefined, textAlign: align || 'left' }}>{l}</div>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {rows.map((p, i) => <PayoutRow key={p.ref} p={p} last={i === rows.length-1} />)}
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 9.2 — Settlement Detail (PAY-2026-24)
// ─────────────────────────────────────────────────────────────
function SettlementDetailScreen() {

  function LineItem({ label, sub, gross, fee, net, head, separator, bold }) {
    const textColor = bold ? 'var(--ink)' : 'var(--ink-2)';
    const monoColor = bold ? 'var(--ok)' : 'var(--ink-3)';
    return (
      <>
        {separator && <div style={{ height: 1, background: 'var(--rule)', margin: '6px 0' }} />}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 120px', gap: 12, padding: head ? '6px 0 4px' : '5px 0', borderBottom: head ? '1px solid var(--rule)' : 'none', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: bold ? 13.5 : 12.5, color: textColor, fontWeight: bold ? 600 : 400 }}>{label}</div>
            {sub && <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>{sub}</div>}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: bold ? 13 : 12, color: head ? 'var(--ink-4)' : textColor, textAlign: 'right', fontWeight: head ? 400 : bold ? 600 : 400 }}>{gross}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: bold ? 13 : 12, color: head ? 'var(--ink-4)' : 'var(--danger)', textAlign: 'right' }}>{fee}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: bold ? 14 : 12, color: head ? 'var(--ink-4)' : bold ? 'var(--ok)' : monoColor, textAlign: 'right', fontWeight: bold ? 700 : 400 }}>{net}</div>
        </div>
      </>
    );
  }

  const lineItems = [
    { label: 'BKG-0601 · Reliance Industries',     sub: 'MUM→DEL · 5 Jun · AW169 · VIP charter',     gross: '₹3,02,884', fee: '₹9,087',  net: '₹2,93,797' },
    { label: 'BKG-0590 · Sharma Family',            sub: 'MUM→GOA · 5 Jun · AS350 B3 · Charter',       gross: '₹98,500',  fee: '₹2,955',  net: '₹95,545'  },
    { label: 'BKG-0594 · B. Patel (Leisure)',       sub: 'MUM→Shirdi · 5 Jun · EC135 T2 · Shuttle',    gross: '₹48,500',  fee: '₹1,455',  net: '₹47,045'  },
    { label: 'BKG-0598 · Tata Consulting',          sub: 'MUM→Pune · 5 Jun · EC135 T2 · Charter',      gross: '₹92,000',  fee: '₹2,760',  net: '₹89,240'  },
    { label: 'BKG-0583 · L&T Infrastructure',       sub: 'MUM→Chennai · 7 Jun · AW169 · Charter',      gross: '₹2,10,000', fee: '₹6,300', net: '₹2,03,700' },
    { label: 'BKG-0588 · Mahindra & Mahindra',      sub: 'MUM→GOA · 8 Jun · AW169 · Charter',          gross: '₹1,84,000', fee: '₹5,520', net: '₹1,78,480' },
    { label: 'BKG-0577 · Godrej Industries',        sub: 'MUM→Nashik · 9 Jun · AW169 · Charter',       gross: '₹68,000',  fee: '₹2,040',  net: '₹65,960'  },
  ];

  return (
    <Shell
      active="payouts"
      breadcrumb="Payouts & Settlements / PAY-2026-24"
      title="Settlement PAY-2026-24"
      subtitle="Jun 1–7, 2026 · 7 flights · Net ₹9,14,225 · Due 9 Jun 2026"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" style={{ height: 32, color: 'var(--ink-3)' }}>
            <Icon name="arrowRight" size={12} style={{ transform: 'rotate(180deg)' }} />Back
          </button>
          <button className="btn sm" style={{ height: 32 }}><Icon name="download" size={12} />Export PDF</button>
          <button className="btn sm accent" style={{ height: 32 }}><Icon name="alert" size={12} />Raise dispute</button>
        </div>
      }
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left: line items ──────────────────────────── */}
        <div style={{ flex: 1, padding: '22px 26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, borderRight: '1px solid var(--rule)' }}>

          {/* summary cards */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Gross revenue',  value: '₹10,03,884', sub: '7 bookings',    tone: undefined },
              { label: 'Platform fees',  value: '−₹30,117',   sub: '~3% avg',       tone: 'danger'  },
              { label: 'GST (collected)', value: '₹0',        sub: 'Client-billed', tone: undefined },
              { label: 'Net payout',     value: '₹9,14,225',  sub: 'Due 9 Jun',     tone: 'ok'      },
            ].map(k => (
              <div key={k.label} style={{ flex: 1, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                <div className="t-label" style={{ marginBottom: 5 }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: k.tone ? `var(--${k.tone})` : 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1 }}>{k.value}</div>
                <div className="t-meta" style={{ fontSize: 11, marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* line items table */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Booking line items</div>
            <div className="card" style={{ padding: '10px 16px' }}>
              <LineItem label="Booking" sub="" gross="Gross" fee="Platform fee" net="Net to operator" head />
              {lineItems.map((item, i) => (
                <LineItem key={i} {...item} />
              ))}
              <LineItem label="Total" gross="₹10,03,884" fee="−₹30,117" net="₹9,14,225" bold separator />
            </div>
          </section>

          {/* fee breakdown */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Platform fee breakdown</div>
            <div className="card" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Booking facilitation fee',  '3% on gross revenue',    '₹30,117'],
                ['Payment processing',        '0% (waived — direct)',   '₹0'],
                ['Manifest filing fee',       'Flat ₹0 (included)',     '₹0'],
                ['Insurance commission',      '0% — operator policy',   '₹0'],
              ].map(([label, desc, amt], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{label}</span>
                    <span className="t-meta" style={{ fontSize: 11, marginLeft: 8 }}>{desc}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{amt}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Right: bank + status ──────────────────────── */}
        <div style={{ width: 360, flexShrink: 0, background: 'var(--surface)', overflowY: 'auto', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* status tracker */}
          <section>
            <div className="t-label" style={{ marginBottom: 12 }}>Settlement Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Period closed',            date: '7 Jun 2026',  done: true  },
                { label: 'Revenue reconciled',       date: '8 Jun 2026',  done: true  },
                { label: 'Settlement calculated',    date: '8 Jun 2026',  done: true  },
                { label: 'Bank transfer initiated',  date: '9 Jun 2026',  done: false, active: true },
                { label: 'Funds received',           date: 'Est. 10 Jun', done: false },
              ].map((s, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < arr.length-1 ? 14 : 0, position: 'relative' }}>
                  {/* line */}
                  {i < arr.length-1 && (
                    <div style={{ position: 'absolute', left: 10, top: 22, bottom: 0, width: 1.5, background: s.done ? 'var(--ok)' : 'var(--rule)', zIndex: 0 }} />
                  )}
                  {/* dot */}
                  <div style={{ width: 21, height: 21, borderRadius: '50%', flexShrink: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.done ? 'var(--ok)' : s.active ? 'var(--accent)' : 'var(--surface-sunk)', border: `2px solid ${s.done ? 'var(--ok)' : s.active ? 'var(--accent)' : 'var(--rule-strong)'}` }}>
                    {s.done && <Icon name="check" size={10} style={{ color: '#fff' }} />}
                    {s.active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <div style={{ paddingTop: 1 }}>
                    <div style={{ fontSize: 13, color: s.done || s.active ? 'var(--ink)' : 'var(--ink-4)', fontWeight: s.active ? 500 : 400 }}>{s.label}</div>
                    <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>{s.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* bank account */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Payment destination</div>
            <div className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 3, background: 'var(--surface-2)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="wallet" size={16} style={{ color: 'var(--ink-3)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>HDFC Bank — Current Account</div>
                  <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>Helix Aviation Pvt. Ltd. · ••••  4829</div>
                </div>
              </div>
              <div style={{ height: 1, background: 'var(--rule-soft)' }} />
              {[
                ['Account holder', 'Helix Aviation Pvt. Ltd.'],
                ['IFSC',           'HDFC0001234'],
                ['Account no.',    '••••  ••••  4829'],
                ['Transfer type',  'NEFT — T+1 settlement'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="t-meta" style={{ fontSize: 11.5 }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)', letterSpacing: '0.03em' }}>{v}</span>
                </div>
              ))}
              <button className="btn sm" style={{ marginTop: 4, height: 28, alignSelf: 'flex-start', fontSize: 11 }}><Icon name="settings" size={11} />Update bank details</button>
            </div>
          </section>

          {/* settlement summary */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 3, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="t-label">Summary</div>
            {[
              ['Period',        'Jun 1–7, 2026'],
              ['Flights',       '7 completed'],
              ['Gross revenue', '₹10,03,884'],
              ['Platform fees', '−₹30,117'],
              ['Net payout',    '₹9,14,225'],
              ['Due date',      '9 Jun 2026'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="t-meta" style={{ fontSize: 11.5 }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: k === 'Net payout' ? 14 : 12, fontWeight: k === 'Net payout' ? 600 : 400, color: k === 'Net payout' ? 'var(--ok)' : 'var(--ink)', letterSpacing: '0.02em' }}>{v}</span>
              </div>
            ))}
          </div>

          <button className="btn" style={{ width: '100%', height: 34, justifyContent: 'center', fontSize: 12.5, color: 'var(--danger)' }}>
            <Icon name="alert" size={12} />Raise dispute on this settlement
          </button>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { PayoutsListScreen, SettlementDetailScreen });
