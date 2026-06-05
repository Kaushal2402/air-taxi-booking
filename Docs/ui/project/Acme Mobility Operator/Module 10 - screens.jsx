/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 10 — Reports
   10.1  Revenue report — monthly summary, booking breakdown
   10.2  Operational report — fleet utilisation, crew hours
   ───────────────────────────────────────────────────────────── */

// ─── Bar chart (pure CSS/SVG) ──────────────────────────────────
function BarChart({ data, height = 120, color = 'var(--accent)', labelKey = 'label', valueKey = 'value', formatValue }) {
  const max = Math.max(...data.map(d => d[valueKey]));
  const fmt = formatValue || (v => v);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: height + 32, paddingTop: 8 }}>
      {data.map((d, i) => {
        const pct = max > 0 ? d[valueKey] / max : 0;
        const barH = Math.max(pct * height, 2);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', letterSpacing: '0.03em', whiteSpace: 'nowrap', opacity: d[valueKey] > 0 ? 1 : 0 }}>{fmt(d[valueKey])}</div>
            <div style={{ width: '100%', height: height, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '100%', height: barH, background: d.highlight ? 'var(--ok)' : color, borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }} />
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sparkline ─────────────────────────────────────────────────
function Sparkline({ values, color = 'var(--accent)', height = 36, width = 120 }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* last dot */}
      <circle cx={pts[pts.length-1].split(',')[0]} cy={pts[pts.length-1].split(',')[1]} r="3" fill={color} />
    </svg>
  );
}

// ─── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, tone, spark, delta, deltaUp }) {
  return (
    <div style={{ flex: 1, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 130 }}>
      <div className="t-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: tone ? `var(--${tone})` : 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1 }}>{value}</div>
        {spark && <Sparkline values={spark} color={tone ? `var(--${tone})` : 'var(--accent)'} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {sub && <span className="t-meta" style={{ fontSize: 11 }}>{sub}</span>}
        {delta && (
          <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: deltaUp ? 'var(--ok)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Icon name={deltaUp ? 'trendUp' : 'trendDown'} size={10} />
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Table row ─────────────────────────────────────────────────
function ReportRow({ cells, head, last }) {
  return (
    <div style={{ display: 'flex', padding: head ? '7px 16px' : '9px 16px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)', background: head ? 'var(--surface-2)' : 'transparent', gap: 0 }}>
      {cells.map(([v, w, align, tone, mono], i) => (
        <div key={i} style={{ width: w || undefined, flex: !w ? 1 : undefined, flexShrink: w ? 0 : undefined, textAlign: align || 'left', fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: head ? undefined : 12.5, color: head ? undefined : tone ? `var(--${tone})` : 'var(--ink-2)', letterSpacing: mono ? '0.03em' : undefined }}>
          {head ? <span className="t-label" style={{ fontSize: 10 }}>{v}</span> : v}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 10.1 — Revenue Report
// ─────────────────────────────────────────────────────────────
function RevenueReportScreen() {
  const monthly = [
    { label: 'Jan', value: 32.4 }, { label: 'Feb', value: 28.8 },
    { label: 'Mar', value: 41.2 }, { label: 'Apr', value: 38.6 },
    { label: 'May', value: 48.5 }, { label: 'Jun', value: 22.1, highlight: true },
  ];

  const byType = [
    { label: 'Charter',  value: 74, color: 'var(--accent)' },
    { label: 'Shuttle',  value: 18, color: 'var(--ok)' },
    { label: 'VIP',      value: 8,  color: 'var(--warn)' },
  ];

  const bookingRows = [
    [['BKG-0601','Reliance Industries','MUM→DEL','5 Jun','₹3,02,884','Charter','VIP'], false],
    [['BKG-0583','L&T Infrastructure','MUM→CHN','7 Jun','₹2,10,000','Charter',''], false],
    [['BKG-0588','Mahindra & Mahindra','MUM→GOA','8 Jun','₹1,84,000','Charter',''], false],
    [['BKG-0598','Tata Consulting','MUM→Pune','5 Jun','₹92,000','Charter','VIP'], false],
    [['BKG-0590','Sharma Family','MUM→GOA','5 Jun','₹98,500','Charter',''], false],
    [['BKG-0594','B. Patel','MUM→Shirdi','5 Jun','₹48,500','Shuttle',''], false],
    [['BKG-0577','Godrej Industries','MUM→Nashik','9 Jun','₹68,000','Charter',''], false],
  ];

  return (
    <Shell
      active="reports"
      breadcrumb="Finance"
      title="Revenue Report"
      subtitle="Helix Aviation · Jun 2026 (MTD) + YTD summary"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <FilterChip label="Period" value="Jun 2026 MTD" />
          <button className="btn sm"><Icon name="download" size={12} />Export</button>
        </div>
      }
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* KPI strip */}
        <div style={{ display: 'flex', gap: 12 }}>
          <StatCard label="Gross revenue (Jun MTD)" value="₹10.0L"  sub="7 bookings"    delta="+12% vs May" deltaUp  spark={[6.2,7.8,5.5,9.1,10.0]} />
          <StatCard label="Net payout (Jun MTD)"    value="₹9.14L"  sub="after 3% fee"  delta="+11% vs May" deltaUp  tone="ok" spark={[5.9,7.5,5.3,8.8,9.14]} />
          <StatCard label="Avg booking value"       value="₹1.43L"  sub="per booking"   delta="+4% vs May"  deltaUp  spark={[1.1,1.2,1.3,1.35,1.43]} />
          <StatCard label="YTD gross"               value="₹48.5L"  sub="Jan–Jun 2026"                               spark={[32,29,41,39,48,22]} />
          <StatCard label="Platform fees YTD"       value="₹1.45L"  sub="~3% of gross"  tone="warn" />
        </div>

        {/* monthly bar + type donut side-by-side */}
        <div style={{ display: 'flex', gap: 20 }}>

          {/* monthly bar chart */}
          <div className="card" style={{ flex: 2, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="t-label">Monthly gross revenue (₹ Lakhs)</span>
              <span className="t-meta" style={{ fontSize: 11 }}>Jan–Jun 2026</span>
            </div>
            <BarChart
              data={monthly}
              height={120}
              labelKey="label"
              valueKey="value"
              color="var(--accent)"
              formatValue={v => `${v}L`}
            />
          </div>

          {/* by service type */}
          <div className="card" style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span className="t-label">Revenue by service type (Jun)</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
              {byType.map(t => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--ink-2)', flex: 1 }}>{t.label}</span>
                  <div style={{ flex: 2, height: 6, background: 'var(--surface-sunk)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${t.value}%`, height: '100%', background: t.color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', width: 30, textAlign: 'right' }}>{t.value}%</span>
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: 'var(--rule-soft)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[['Top client', 'Reliance Industries', '₹3,02,884'], ['Top route', 'MUM → DEL', '₹3,02,884']].map(([k,v,a]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="t-meta" style={{ fontSize: 11 }}>{k}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500 }}>{v}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* booking table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="t-label">Booking breakdown — Jun 2026</span>
            <div style={{ flex: 1 }} />
            <span className="t-meta" style={{ fontSize: 11 }}>7 bookings · ₹10,03,884 gross</span>
          </div>
          <ReportRow head cells={[['Booking',0],['Client',0],['Route',0],['Date',80],['Revenue',110,'right'],['Type',80],['Flag',60]]} />
          {bookingRows.map(([cells], i) => (
            <ReportRow key={i} last={i === bookingRows.length-1} cells={[
              [cells[0], 0, 'left', undefined, true],
              [cells[1], 0],
              [cells[2], 0],
              [cells[3], 80, 'left', undefined, true],
              [cells[4], 110, 'right', 'ok', true],
              [cells[5], 80],
              [cells[6] ? <span key={cells[0]} className="badge warn" style={{ height: 17, fontSize: 9 }}>{cells[6]}</span> : '', 60],
            ]} />
          ))}
        </div>

      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 10.2 — Operational Report
// ─────────────────────────────────────────────────────────────
function OperationalReportScreen() {
  const utilizationData = [
    { label: 'VT-HXE', value: 72 }, { label: 'VT-HXB', value: 58 },
    { label: 'VT-HXD', value: 81 }, { label: 'VT-HXA', value: 14 },
  ];

  const crewHours = [
    { name: 'Capt. R. Sharma',  role: 'CPT', hours: 48.5, limit: 100, onType: 4820 },
    { name: 'Capt. A. Pillai',  role: 'CPT', hours: 52.0, limit: 100, onType: 3670 },
    { name: 'Capt. D. Iyer',    role: 'CPT', hours: 61.5, limit: 100, onType: 6100 },
    { name: 'F/O K. Mehta',     role: 'F/O', hours: 44.0, limit: 100, onType: 1240 },
    { name: 'F/O S. Patil',     role: 'F/O', hours: 79.5, limit: 100, onType: 980  },
    { name: 'F/O P. Nair',      role: 'F/O', hours: 38.0, limit: 100, onType: 740  },
  ];

  const fleetSummary = [
    { reg: 'VT-HXE', type: 'AW169',    hours: 48, flights: 22, onTime: '96%', cycles: 44, maint: 'Next: 52 hrs' },
    { reg: 'VT-HXB', type: 'AS350 B3', hours: 39, flights: 18, onTime: '94%', cycles: 36, maint: 'Next: 61 hrs' },
    { reg: 'VT-HXD', type: 'EC135 T2', hours: 54, flights: 26, onTime: '88%', cycles: 52, maint: 'Overdue — 1 hr' },
    { reg: 'VT-HXA', type: 'EC135',    hours: 9,  flights: 4,  onTime: '100%',cycles: 8,  maint: '100-hr check' },
  ];

  return (
    <Shell
      active="reports"
      breadcrumb="Finance"
      title="Operational Report"
      subtitle="Helix Aviation · May 2026 · Fleet utilisation, crew hours, on-time performance"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <FilterChip label="Period" value="May 2026" />
          <button className="btn sm"><Icon name="download" size={12} />Export</button>
        </div>
      }
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* KPI strip */}
        <div style={{ display: 'flex', gap: 12 }}>
          <StatCard label="Total flight hours (May)" value="150 h"   sub="4 aircraft"       delta="+8% vs Apr"  deltaUp  spark={[120,135,128,140,150]} />
          <StatCard label="Total flights"             value="70"      sub="May 2026"          delta="+5 vs Apr"   deltaUp  spark={[58,62,55,65,70]} />
          <StatCard label="On-time performance"       value="93%"     sub="target: 90%"       tone="ok"           spark={[88,90,92,91,93]} />
          <StatCard label="Avg utilisation"           value="56%"     sub="fleet average"     delta="+4pp vs Apr" deltaUp  spark={[48,50,52,54,56]} />
          <StatCard label="Incidents"                 value="0"       sub="May 2026"          tone="ok" />
        </div>

        {/* fleet utilisation + crew hours */}
        <div style={{ display: 'flex', gap: 20 }}>

          {/* fleet bar */}
          <div className="card" style={{ flex: 1, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="t-label">Fleet utilisation — May 2026 (%)</span>
              <span className="t-meta" style={{ fontSize: 11 }}>Available hours basis</span>
            </div>
            <BarChart data={utilizationData} height={100} labelKey="label" valueKey="value" color="var(--info)" formatValue={v => `${v}%`} />
          </div>

          {/* crew hours */}
          <div className="card" style={{ flex: 1.2, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="t-label">Crew duty hours — May 2026</span>
              <span className="t-meta" style={{ fontSize: 11 }}>DGCA limit: 100 hrs/month</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {crewHours.map(c => {
                const pct = (c.hours / c.limit) * 100;
                const warn = pct > 75;
                return (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="badge" style={{ height: 17, fontSize: 9, flexShrink: 0 }}>{c.role}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', width: 140, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--surface-sunk)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: warn ? 'var(--warn)' : 'var(--ok)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: warn ? 'var(--warn)' : 'var(--ink-3)', width: 52, textAlign: 'right', flexShrink: 0 }}>{c.hours} h</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* fleet detail table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="t-label">Fleet summary — May 2026</span>
          </div>
          <ReportRow head cells={[['Aircraft',100],['Type',100],['Flight hrs',80,'right'],['Flights',70,'right'],['On-time',80,'right'],['Cycles',70,'right'],['Next maintenance',0]]} />
          {fleetSummary.map((f, i) => (
            <ReportRow key={f.reg} last={i === fleetSummary.length-1} cells={[
              [f.reg, 100, 'left', undefined, true],
              [f.type, 100],
              [f.hours, 80, 'right', undefined, true],
              [f.flights, 70, 'right', undefined, true],
              [f.onTime, 80, 'right', parseFloat(f.onTime) >= 90 ? 'ok' : 'warn'],
              [f.cycles, 70, 'right', undefined, true],
              [<span key={f.reg} style={{ fontSize: 12.5, color: f.maint.includes('Overdue') ? 'var(--danger)' : f.maint.includes('check') ? 'var(--warn)' : 'var(--ink-3)' }}>{f.maint}</span>, 0],
            ]} />
          ))}
        </div>

        {/* on-time trend */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="t-label">On-time performance trend (Jan–May 2026)</span>
            <span className="badge ok" style={{ height: 19 }}><span className="dot ok" />93% in May</span>
          </div>
          <BarChart
            data={[
              { label: 'Jan', value: 88 }, { label: 'Feb', value: 90 },
              { label: 'Mar', value: 85 }, { label: 'Apr', value: 91 },
              { label: 'May', value: 93, highlight: true },
            ]}
            height={80}
            labelKey="label"
            valueKey="value"
            color="var(--info)"
            formatValue={v => `${v}%`}
          />
        </div>

      </div>
    </Shell>
  );
}

Object.assign(window, { RevenueReportScreen, OperationalReportScreen });
