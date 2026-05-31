/* ─────────────────────────────────────────────────────────────
   Module 22 — Audit Log (Stream, Event Detail, Security)
   Screens 22.1 → 22.3
   ───────────────────────────────────────────────────────────── */

const EVENTS = [
  { t: '14:42:08', actor: 'Sana Reyes',   role: 'Super Admin',   action: 'payout.approve',  target: 'PR-W22-DRV · ₹38.4 L', cat: 'Finance',  sev: 'high', ip: '103.21.x.x', current: true },
  { t: '14:31:55', actor: 'Arjun Rao',    role: 'Finance Admin', action: 'refund.issue',    target: 'TXN-9F39C8 · ₹200',    cat: 'Finance',  sev: 'med',  ip: '103.21.x.x' },
  { t: '14:18:40', actor: 'Leah Gomez',   role: 'Ops Manager',   action: 'pricing.publish', target: 'PR-BLR-SXL-12 → v12',  cat: 'Pricing',  sev: 'high', ip: '49.36.x.x' },
  { t: '14:02:11', actor: 'System',       role: 'Automation',    action: 'flag.rollback',   target: 'ai-eta · 60%→0%',       cat: 'System',   sev: 'high', ip: 'internal' },
  { t: '13:48:30', actor: 'Dev Malhotra', role: 'Support Lead',  action: 'customer.unban',  target: 'CUS-88213',             cat: 'Support',  sev: 'med',  ip: '152.58.x.x' },
  { t: '13:32:09', actor: 'Priya Nair',   role: 'Catalog Editor',action: 'promo.create',    target: 'WEEKEND25',             cat: 'Growth',   sev: 'low',  ip: '152.58.x.x' },
  { t: '13:20:44', actor: 'Sana Reyes',   role: 'Super Admin',   action: 'admin.suspend',   target: 'Ken Watanabe',          cat: 'Security', sev: 'high', ip: '103.21.x.x' },
  { t: '13:05:18', actor: 'Reema Shah',   role: 'Ops Manager',   action: 'login.failed',    target: '3 attempts · MUM',      cat: 'Security', sev: 'med',  ip: '49.40.x.x' },
  { t: '12:51:02', actor: 'Arjun Rao',    role: 'Finance Admin', action: 'export.download', action2: 'Revenue report · PII', target: 'rev-may.xlsx', cat: 'Finance', sev: 'med', ip: '103.21.x.x' },
];

function sevBadge(s) {
  return s === 'high' ? <span className="badge danger"><span className="dot danger" />High</span>
    : s === 'med' ? <span className="badge warn"><span className="dot warn" />Medium</span>
    : <span className="badge"><span className="dot pending" />Low</span>;
}

// ──────────────────────────────────────────────────────────────
// 22.1 — Audit Stream
// ──────────────────────────────────────────────────────────────
function AuditStreamScreen() {
  return (
    <Shell
      active="audit"
      breadcrumb="System · Audit log"
      title="Audit log"
      subtitle="Immutable · 1.2 M events · 90-day hot retention · streaming to SIEM"
      actions={
        <>
          <button className="btn sm"><Icon name="filter" size={13} />Last 24h <Icon name="chevDown" size={11} /></button>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* kpis */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            ['Events · 24h',     '4,182',  'Across 6 categories', 'var(--ink-2)'],
            ['Admin actions',    '318',    '12 active admins',    'var(--ink-2)'],
            ['High severity',    '41',     'Sensitive operations','var(--danger)'],
            ['Failed logins',    '9',      '2 IPs · rate-limited','var(--warn)'],
            ['Integrity',        'Verified','Hash chain intact',  'var(--accent)'],
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
          <div className="input" style={{ width: 300, height: 32 }}>
            <Icon name="search" size={13} className="icon" />
            <input placeholder="Actor, action, target, IP…" />
          </div>
          <FilterChip label="Category" value="All" />
          <FilterChip label="Severity" value="High" count="1" />
          <FilterChip label="Actor" value="Any" />
          <div style={{ flex: 1 }} />
          <span className="badge ok"><span className="dot ok" />Live tail</span>
        </div>

        {/* event table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Source IP</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {EVENTS.map((e, i) => (
                <tr key={i} className={e.current ? 'selected' : ''} style={{ cursor: 'pointer' }}>
                  <td className="t-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{e.t}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={e.actor === 'System' ? { background: 'var(--ink)', color: 'var(--surface)' } : {}}>
                        {e.actor === 'System' ? <Icon name="cog" size={14} /> : e.actor.split(' ').map(x => x[0]).join('')}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12.5 }}>{e.actor}</span>
                        <span className="t-meta">{e.role}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="t-mono" style={{ fontSize: 12, color: 'var(--ink)' }}>{e.action}</span></td>
                  <td className="t-meta">{e.target}</td>
                  <td><span className="badge">{e.cat}</span></td>
                  <td>{sevBadge(e.sev)}</td>
                  <td className="t-mono t-meta">{e.ip}</td>
                  <td><button className="btn icon sm ghost"><Icon name="chevRight" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
            <span className="t-meta">Showing 9 of 4,182 · 24h window · events are append-only & cryptographically chained</span>
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
// 22.2 — Event Detail
// ──────────────────────────────────────────────────────────────
function AuditEventScreen() {
  const meta = [
    ['Event ID', 'EVT-9F4A21C8'],
    ['Timestamp', '29 May 2026 · 14:42:08.412 IST'],
    ['Actor', 'Sana Reyes · Super Admin'],
    ['Action', 'payout.approve'],
    ['Target', 'PR-W22-DRV'],
    ['Source IP', '103.21.x.x · Bengaluru, IN'],
    ['Session', 'sess_8821x · MacBook · Chrome'],
    ['Request ID', 'req_9F4A21c8e2'],
  ];
  const diff = [
    ['status',        'pending_finance', 'approved', 'change'],
    ['approved_by',   '—',               'sana.reyes@acme', 'add'],
    ['approved_at',   'null',            '2026-05-29T14:42:08Z', 'add'],
    ['released_to_bank', 'false',        'true', 'change'],
    ['payee_count',   '1184',            '1184', 'same'],
    ['net_amount',    '3840218.00',      '3840218.00', 'same'],
  ];

  return (
    <Shell
      active="audit"
      breadcrumb="System · Audit log · Event"
      title="payout.approve"
      subtitle="EVT-9F4A21C8 · high severity · 29 May 14:42 · Sana Reyes"
      actions={
        <>
          <button className="btn sm"><Icon name="copy" size={13} />Copy JSON</button>
          <button className="btn sm">Related events</button>
          <button className="btn sm">View target</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 24 }}>
        {/* metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="t-label">Event metadata</div>
              <span className="badge danger"><span className="dot danger" />High</span>
            </div>
            <div>
              {meta.map(([k, v], i) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '11px 0', borderBottom: i < meta.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <span className="t-meta" style={{ flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 12.5, textAlign: 'right', fontFamily: k === 'Action' || k.includes('ID') || k === 'Session' ? 'var(--font-mono)' : 'var(--font-sans)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Integrity</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Icon name="shield" size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13 }}>Hash verified · chain intact</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['prev', '0x8f21…a4c2'], ['this', '0x9f4a…21c8'], ['next', '0xb102…7e30']].map(([k, h]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <span className="t-meta">{k} hash</span>
                  <span className="t-mono" style={{ fontSize: 11.5 }}>{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* diff + context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">State change · before → after</div>
            </div>
            <div style={{ padding: '6px 22px 16px', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
              {diff.map(([k, before, after, kind], i) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: i < diff.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <span style={{ color: 'var(--ink-3)' }}>{k}</span>
                  <span style={{ color: kind === 'same' ? 'var(--ink-4)' : 'var(--danger)', textDecoration: kind === 'change' ? 'line-through' : 'none', background: kind === 'change' ? 'var(--danger-soft)' : 'transparent', padding: '2px 6px', borderRadius: 3 }}>{before}</span>
                  <span style={{ color: kind === 'same' ? 'var(--ink-4)' : 'var(--accent)', background: kind !== 'same' ? 'var(--accent-soft)' : 'transparent', padding: '2px 6px', borderRadius: 3 }}>{after}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Surrounding events · same session</div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 1, background: 'var(--rule)' }} />
              {[
                ['14:41:50', 'payout.review.open', 'Opened PR-W22-DRV', false],
                ['14:42:08', 'payout.approve', 'This event', true],
                ['14:42:09', 'bank.release.queue', 'NACH file generated', false],
                ['14:43:12', 'notification.send', '1,178 drivers notified', false],
              ].map(([t, a, m, cur], i, arr) => (
                <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < arr.length - 1 ? 16 : 0, position: 'relative' }}>
                  <span className={'dot ' + (cur ? 'danger' : 'pending')} style={{ marginTop: 4, zIndex: 1, boxShadow: cur ? '0 0 0 3px var(--danger-soft)' : 'none' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="t-mono" style={{ fontSize: 12, fontWeight: cur ? 600 : 400, color: cur ? 'var(--ink)' : 'var(--ink-2)' }}>{a}</span>
                      <span className="t-meta">{t}</span>
                    </div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{m}</div>
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
// 22.3 — Security & Compliance
// ──────────────────────────────────────────────────────────────
function SecurityComplianceScreen() {
  const series = [12, 18, 9, 24, 15, 41, 22, 19, 33, 28, 17, 26, 14, 31];
  const w = 880, h = 200, padX = 36, padT = 12, padB = 26, max = 48;
  const bw = (w - padX - 16) / series.length;

  return (
    <Shell
      active="audit"
      breadcrumb="System · Audit log · Security"
      title="Security & compliance"
      subtitle="Anomaly monitoring · retention policy · regulatory export · SOC2 / ISO 27001"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Compliance export</button>
          <button className="btn sm">Retention policy</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* kpis */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            ['Anomalies · 7d',  '6',      '2 open · 4 cleared', 'var(--warn)'],
            ['PII exports',     '14',     'All justified + logged', 'var(--ink-2)'],
            ['MFA coverage',    '94%',    'Target 100%',        'var(--warn)'],
            ['Retention',       '7 yrs',  'Finance · WORM store','var(--accent)'],
          ].map(([k, v, m, c], i) => (
            <div key={k} style={{ padding: '18px 22px', borderRight: i < 3 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 28 }}>{v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: c }}>{m}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>
          {/* event volume chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">High-severity events · 14 days</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Spike on 20 May · flag rollback incident</h3>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 200 }}>
                {[0,1,2,3].map(i => <line key={i} x1={padX} x2={w-16} y1={padT + i*(h-padT-padB)/3} y2={padT + i*(h-padT-padB)/3} stroke="var(--rule-soft)" />)}
                {series.map((v, i) => {
                  const bh = (v / max) * (h - padT - padB);
                  const hi = v >= 40;
                  return (
                    <g key={i}>
                      <rect x={padX + i * bw + 3} y={h - padB - bh} width={bw - 6} height={bh}
                        fill={hi ? 'var(--danger)' : 'color-mix(in oklab, var(--danger) 35%, var(--surface-2))'} />
                      {i % 2 === 0 && <text x={padX + i * bw + bw/2} y={h - 9} textAnchor="middle" fill="var(--ink-3)" style={{ font: '9px IBM Plex Mono' }}>{16 + Math.floor(i/2)}</text>}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* open anomalies */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Open anomalies</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Needs review</h3>
            </div>
            <div style={{ padding: '6px 18px 14px' }}>
              {[
                ['Off-hours export', 'Arjun Rao · 02:14 IST', 'PII revenue file', 'high'],
                ['New device login', 'Reema Shah · Mumbai', 'Unrecognized device', 'med'],
              ].map(([k, who, m, sev], i) => (
                <div key={k} style={{ padding: '14px 0', borderBottom: i < 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{k}</span>
                    {sevBadge(sev)}
                  </div>
                  <div className="t-meta" style={{ marginTop: 5 }}>{who} · {m}</div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="btn sm" style={{ flex: 1, height: 28 }}>Dismiss</button>
                    <button className="btn sm accent" style={{ flex: 1, height: 28 }}>Investigate</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* compliance posture */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[
            ['Hash-chain integrity', 'Verified', 'Last check 2m ago'],
            ['SIEM streaming',       'Connected', 'Splunk · 0 lag'],
            ['Log retention',        'Compliant', '7yr finance · 90d hot'],
            ['Access reviews',       'Q2 due', '12 admins · 18 Jun'],
          ].map(([k, v, m]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Icon name="check" size={16} stroke={2.4} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{k}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{v}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>{m}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { AuditStreamScreen, AuditEventScreen, SecurityComplianceScreen, EVENTS });
