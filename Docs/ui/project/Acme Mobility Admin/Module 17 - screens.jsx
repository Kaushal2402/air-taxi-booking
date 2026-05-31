/* ─────────────────────────────────────────────────────────────
   Module 17 — Reports (Library, Revenue Report, Builder)
   Screens 17.1 → 17.3
   ───────────────────────────────────────────────────────────── */

// ──────────────────────────────────────────────────────────────
// 17.1 — Report Library
// ──────────────────────────────────────────────────────────────
function ReportLibraryScreen() {
  const standard = [
    { name: 'Revenue & operations', desc: 'Gross, net, take-rate by service & city', icon: 'pie',     freq: 'Daily',   tag: 'Finance' },
    { name: 'GST filing · GSTR-1',  desc: 'Outward supplies · HSN-coded · per state', icon: 'receipt', freq: 'Monthly', tag: 'Tax' },
    { name: 'Driver payout summary',desc: 'Earnings, deductions, holds per cycle',    icon: 'wallet',  freq: 'Weekly',  tag: 'Payouts' },
    { name: 'Settlement & reconciliation', desc: 'Gateway-wise expected vs settled',  icon: 'archive', freq: 'Daily',   tag: 'Finance' },
    { name: 'Trip & demand analytics', desc: 'Completed trips, cancellations, SLAs',  icon: 'bolt',    freq: 'Daily',   tag: 'Ops' },
    { name: 'Promotion ROI',        desc: 'Spend, redemptions, CPA per campaign',     icon: 'flag',    freq: 'Weekly',  tag: 'Growth' },
  ];
  const scheduled = [
    { name: 'Weekly board pack',     fmt: 'PDF',  next: 'Mon 08:00', to: 'leadership@', status: 'on' },
    { name: 'GSTR-1 · May',          fmt: 'XLSX', next: '10 Jun 00:00', to: 'finance@', status: 'on' },
    { name: 'Daily ops digest',      fmt: 'PDF',  next: 'Today 22:00', to: 'ops-leads@', status: 'on' },
    { name: 'Operator settlement',   fmt: 'CSV',  next: '01 Jun 09:00', to: 'partners@', status: 'paused' },
  ];

  return (
    <Shell
      active="reports"
      breadcrumb="Finance · Reports"
      title="Report library"
      subtitle="6 standard reports · 4 scheduled · 218 exports this month"
      actions={
        <>
          <button className="btn sm"><Icon name="clock" size={13} />Export history</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Build report</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        {/* standard reports */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.014em' }}>Standard reports</h3>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {standard.map(r => (
              <div key={r.name} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ width: 40, height: 40, border: '1px solid var(--rule-strong)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Icon name={r.icon} size={18} />
                  </div>
                  <span className="badge">{r.tag}</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
                  <div className="t-meta" style={{ marginTop: 4, lineHeight: 1.45 }}>{r.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--rule-soft)' }}>
                  <span className="t-meta"><Icon name="refresh" size={11} style={{ verticalAlign: -1, marginRight: 5 }} />{r.freq}</span>
                  <button className="btn sm">Run</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* scheduled */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label">Scheduled deliveries</div>
              <button className="btn sm ghost"><Icon name="plus" size={12} /></button>
            </div>
            <div style={{ padding: '6px 20px 12px' }}>
              {scheduled.map((s, i) => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: i < scheduled.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <span className={'dot ' + (s.status === 'on' ? 'ok' : 'pending')} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{s.name}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{s.fmt} · {s.to} · next {s.next}</div>
                  </div>
                  <div style={{
                    width: 32, height: 18, borderRadius: 9, padding: 2,
                    background: s.status === 'on' ? 'var(--accent)' : 'var(--rule-strong)',
                    display: 'flex', justifyContent: s.status === 'on' ? 'flex-end' : 'flex-start',
                  }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Recent exports</div>
            </div>
            <div style={{ padding: '6px 20px 12px' }}>
              {[
                ['Revenue & operations', 'PDF · 2.4 MB', '14:02 today', 'done'],
                ['Driver payout · W22',  'XLSX · 880 KB', '11:30 today', 'done'],
                ['Settlement · 29 May',  'CSV · 1.1 MB',  '11:05 today', 'done'],
                ['GSTR-1 · Apr',         'XLSX · 3.2 MB', 'Generating…', 'run'],
              ].map(([n, m, t, st], i) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <Icon name={st === 'run' ? 'refresh' : 'download'} size={14} style={{ color: st === 'run' ? 'var(--warn)' : 'var(--ink-3)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{n}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{m} · {t}</div>
                  </div>
                  {st === 'done'
                    ? <button className="btn sm ghost"><Icon name="download" size={13} /></button>
                    : <span className="badge warn"><span className="dot warn" />Running</span>}
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
// 17.2 — Revenue & Operations Report
// ──────────────────────────────────────────────────────────────
function RevenueReportScreen() {
  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const gross = [3.6, 3.9, 4.1, 4.4, 4.6, 4.82];
  const net   = [0.88, 0.95, 1.01, 1.08, 1.13, 1.18];
  const w = 620, h = 240, padX = 44, padT = 14, padB = 30, maxV = 5.5;
  const x = i => padX + i * (w - padX - 16) / (months.length - 1);
  const yG = v => padT + (1 - v / maxV) * (h - padT - padB);
  const path = arr => arr.map((v, i) => (i ? 'L' : 'M') + x(i) + ' ' + yG(v)).join(' ');

  return (
    <Shell
      active="reports"
      breadcrumb="Finance · Reports · Revenue & operations"
      title="Revenue & operations"
      subtitle="Generated 29 May 14:02 · last 6 months · all services · IN"
      actions={
        <>
          <button className="btn sm"><Icon name="filter" size={13} />Last 6 months <Icon name="chevDown" size={11} /></button>
          <button className="btn sm"><Icon name="printer" size={13} />Print</button>
          <button className="btn sm accent"><Icon name="download" size={13} />Export PDF</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* kpis */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            ['Gross volume',  '₹ 4.82 Cr', '+4.8% MoM',     'var(--accent)'],
            ['Net revenue',   '₹ 1.18 Cr', 'Take-rate 24.5%','var(--ink-2)'],
            ['Completed trips','1.42 M',    '+6.1% MoM',     'var(--accent)'],
            ['Avg fare',      '₹ 339',     '+1.2% MoM',     'var(--ink-2)'],
            ['Contribution',  '₹ 46 L',    'After incentives','var(--accent)'],
          ].map(([k, v, m, c], i) => (
            <div key={k} style={{ padding: '18px 22px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 28 }}>{v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: c }}>{m}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
          {/* trend chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="t-label">Gross vs net revenue</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>6-month trend · ₹ crore</h3>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span className="t-meta"><span style={{ display: 'inline-block', width: 10, height: 2, background: 'var(--accent)', verticalAlign: 4, marginRight: 6 }} />Gross</span>
                <span className="t-meta"><span style={{ display: 'inline-block', width: 10, height: 2, background: 'var(--ink-4)', verticalAlign: 4, marginRight: 6 }} />Net</span>
              </div>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 240 }}>
                {[0, 1, 2, 3, 4].map(i => <line key={i} x1={padX} x2={w - 16} y1={padT + i * (h - padT - padB) / 4} y2={padT + i * (h - padT - padB) / 4} stroke="var(--rule-soft)" />)}
                {['5.5', '4.1', '2.8', '1.4'].map((l, i) => (
                  <text key={l} x={padX - 8} y={padT + (i + 1) * (h - padT - padB) / 4 + 3} textAnchor="end" fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono' }}>{l}</text>
                ))}
                <path d={path(gross)} fill="none" stroke="var(--accent)" strokeWidth="2" />
                <path d={path(net)} fill="none" stroke="var(--ink-4)" strokeWidth="2" strokeDasharray="4 3" />
                {gross.map((v, i) => <circle key={i} cx={x(i)} cy={yG(v)} r="3" fill="var(--accent)" />)}
                {months.map((m, i) => <text key={m} x={x(i)} y={h - 10} textAnchor="middle" fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono' }}>{m}</text>)}
              </svg>
            </div>
          </div>

          {/* by service */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Revenue by service</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Share of gross · May</h3>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
              {[
                ['Sedan & XL', 41, '₹ 1.98 Cr'],
                ['Air · charter', 28, '₹ 1.35 Cr'],
                ['Bike & auto', 16, '₹ 0.77 Cr'],
                ['Air · shuttle', 9, '₹ 0.43 Cr'],
                ['Outstation', 6, '₹ 0.29 Cr'],
              ].map(([k, pct, amt]) => (
                <div key={k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5 }}>{k}</span>
                    <span className="t-meta">{amt} · {pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: pct + '%', height: '100%', background: 'var(--accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* city table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">By city</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Top markets · May</h3>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>City</th>
                <th style={{ textAlign: 'right' }}>Gross</th>
                <th style={{ textAlign: 'right' }}>Net</th>
                <th style={{ textAlign: 'right' }}>Trips</th>
                <th style={{ textAlign: 'right' }}>Avg fare</th>
                <th style={{ textAlign: 'right' }}>Take-rate</th>
                <th style={{ textAlign: 'right' }}>MoM</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Bengaluru', '₹ 1.62 Cr', '₹ 41.2 L', '486 K', '₹ 333', '25.4%', '+5.1%', true],
                ['Mumbai',    '₹ 1.18 Cr', '₹ 28.9 L', '342 K', '₹ 345', '24.5%', '+4.2%', true],
                ['Delhi NCR', '₹ 0.94 Cr', '₹ 22.1 L', '281 K', '₹ 334', '23.5%', '+3.8%', true],
                ['Hyderabad', '₹ 0.61 Cr', '₹ 14.8 L', '188 K', '₹ 324', '24.3%', '+6.4%', true],
                ['Chennai',   '₹ 0.47 Cr', '₹ 11.0 L', '146 K', '₹ 322', '23.4%', '−1.2%', false],
              ].map(([c, g, n, t, a, tr, mom, up]) => (
                <tr key={c}>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>{c}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{g}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{n}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{t}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{a}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{tr}</td>
                  <td className="num" style={{ textAlign: 'right', color: up ? 'var(--accent)' : 'var(--danger)' }}>{mom}</td>
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
// 17.3 — Report Builder
// ──────────────────────────────────────────────────────────────
function ReportBuilderScreen() {
  const dims = ['Service', 'City', 'Date', 'Payment method', 'Driver', 'Operator', 'Promo code', 'Vehicle class'];
  const dimsOn = ['Service', 'City', 'Date'];
  const metrics = [
    ['Gross volume', true], ['Net revenue', true], ['Completed trips', true],
    ['Avg fare', true], ['Take-rate %', false], ['Cancellations', false],
    ['Refunds', false], ['Incentive spend', false],
  ];

  return (
    <Shell
      active="reports"
      breadcrumb="Finance · Reports · Builder"
      title="Build report"
      subtitle="Custom · dimensions, metrics, filters & schedule"
      actions={
        <>
          <button className="btn sm">Save as template</button>
          <button className="btn sm">Preview</button>
          <button className="btn sm accent"><Icon name="check" size={13} />Run & schedule</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 24 }}>
        {/* config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Dimensions · group by</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {dims.map(d => {
                const on = dimsOn.includes(d);
                return (
                  <button key={d} className="btn sm" style={{
                    borderStyle: on ? 'solid' : 'dashed',
                    borderColor: on ? 'var(--accent)' : 'var(--rule-strong)',
                    background: on ? 'var(--accent-soft-2)' : 'var(--surface)',
                    color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
                  }}>
                    <Icon name={on ? 'check' : 'plus'} size={11} />{d}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {metrics.map(([m, on]) => (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--rule-strong)'),
                    background: on ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  }}>{on && <Icon name="check" size={11} stroke={3} />}</div>
                  <span style={{ fontSize: 12.5 }}>{m}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <FormSection title="Filters & range">
              <Row cols={2}>
                <Field label="Date range" value="Last 30 days" select />
                <Field label="Compare to" value="Prior period" select />
              </Row>
              <Row cols={2}>
                <Field label="Service" value="All services" select />
                <Field label="City" value="All cities" select />
              </Row>
            </FormSection>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <FormSection title="Schedule & delivery" description="Leave off to run once. Scheduled reports deliver to recipients as the chosen format.">
              <Row cols={2}>
                <Field label="Frequency" value="Weekly · Mon 08:00" select />
                <Field label="Format" value="PDF + XLSX" select />
              </Row>
              <Field label="Recipients" value="leadership@acme, finance@acme" />
            </FormSection>
          </div>
        </div>

        {/* preview */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="t-label">Live preview</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Revenue by service × city × week</h3>
            </div>
            <span className="badge"><Icon name="eye" size={11} />Sample · 30d</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>City</th>
                  <th style={{ textAlign: 'right' }}>Gross</th>
                  <th style={{ textAlign: 'right' }}>Net</th>
                  <th style={{ textAlign: 'right' }}>Trips</th>
                  <th style={{ textAlign: 'right' }}>Avg fare</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Sedan & XL', 'Bengaluru', '₹ 68.4 L', '₹ 17.3 L', '198 K', '₹ 345'],
                  ['Sedan & XL', 'Mumbai',    '₹ 52.1 L', '₹ 12.9 L', '146 K', '₹ 357'],
                  ['Bike & auto','Bengaluru', '₹ 22.8 L', '₹ 4.1 L',  '212 K', '₹ 108'],
                  ['Air · charter','Mumbai',  '₹ 41.2 L', '₹ 9.8 L',  '184',   '₹ 2.24 L'],
                  ['Air · shuttle','Bengaluru','₹ 18.6 L', '₹ 4.3 L', '264',   '₹ 7,045'],
                  ['Outstation', 'Delhi NCR', '₹ 14.2 L', '₹ 3.1 L',  '8.4 K', '₹ 1,690'],
                  ['Sedan & XL', 'Hyderabad', '₹ 31.0 L', '₹ 7.5 L',  '92 K',  '₹ 337'],
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12.5 }}>{row[0]}</td>
                    <td style={{ fontSize: 12.5 }}>{row[1]}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{row[2]}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{row[3]}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{row[4]}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{row[5]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="t-meta">3 dimensions · 4 metrics · 7 of 1,240 rows</span>
            <span className="t-meta t-mono">~ 1,240 rows · est. 2.1 MB</span>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { ReportLibraryScreen, RevenueReportScreen, ReportBuilderScreen });
