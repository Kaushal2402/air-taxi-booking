/* ─────────────────────────────────────────────────────────────
   Module 24 — Support & Ticketing Console
   Screens 24.1 → 24.3
   24.1 Ticket Queue · 24.2 Ticket Detail · 24.3 SLA & Escalation
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

function prioBadge(p) {
  return p === 'urgent' ? <span className="badge danger"><span className="dot danger" />Urgent</span>
    : p === 'high' ? <span className="badge warn"><span className="dot warn" />High</span>
    : p === 'med' ? <span className="badge info"><span className="dot info" />Medium</span>
    : <span className="badge"><span className="dot pending" />Low</span>;
}

function statusBadge(s) {
  return s === 'open' ? <span className="badge info">Open</span>
    : s === 'in_progress' ? <span className="badge warn">In progress</span>
    : s === 'resolved' ? <span className="badge ok">Resolved</span>
    : <span className="badge">Closed</span>;
}

function reqTypeIcon(t) {
  return t === 'driver' ? 'car' : t === 'operator' ? 'building' : 'user';
}

// ──────────────────────────────────────────────────────────────
// 24.1 — Ticket Queue
// ──────────────────────────────────────────────────────────────
const TICKETS = [
  { id: 'TKT-44821', who: 'Meera Iyer',     type: 'customer', cat: 'Refunds',     prio: 'urgent', status: 'open',        agent: null,            sla: '-12m', breach: true,  created: '14:30' },
  { id: 'TKT-44818', who: 'Rohit Sharma',   type: 'driver',   cat: 'Payouts',     prio: 'high',   status: 'in_progress', agent: 'Dev Malhotra',  sla: '38m',  breach: false, created: '14:02' },
  { id: 'TKT-44815', who: 'Skyline Charter',type: 'operator', cat: 'Booking',     prio: 'high',   status: 'open',        agent: null,            sla: '1h 12m', breach: false, created: '13:48', current: true },
  { id: 'TKT-44810', who: 'Anika Bose',     type: 'customer', cat: 'App issue',   prio: 'med',    status: 'in_progress', agent: 'Reema Shah',    sla: '3h 04m', breach: false, created: '13:20' },
  { id: 'TKT-44807', who: 'Vikram Nair',    type: 'driver',   cat: 'Documents',   prio: 'med',    status: 'open',        agent: null,            sla: '4h 40m', breach: false, created: '12:55' },
  { id: 'TKT-44802', who: 'Lena Park',      type: 'customer', cat: 'Lost & found',prio: 'low',    status: 'in_progress', agent: 'Dev Malhotra',  sla: '7h 10m', breach: false, created: '11:30' },
  { id: 'TKT-44799', who: 'Arjun Rao',      type: 'customer', cat: 'Billing',     prio: 'urgent', status: 'open',        agent: null,            sla: '-4m',  breach: true,  created: '11:02' },
  { id: 'TKT-44790', who: 'BlueJet Air',    type: 'operator', cat: 'Onboarding',  prio: 'low',    status: 'resolved',    agent: 'Sana Reyes',    sla: '—',    breach: false, created: '09:14' },
];

function SlaCell({ sla, breach }) {
  if (sla === '—') return <span className="t-meta">—</span>;
  const col = breach ? 'var(--danger)' : sla.includes('m') && !sla.includes('h') ? 'var(--warn)' : 'var(--ink-2)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Icon name="clock" size={12} style={{ color: col }} />
      <span className="t-mono" style={{ fontSize: 12, color: col, fontWeight: breach ? 600 : 400 }}>{breach ? 'SLA ' + sla : sla}</span>
    </span>
  );
}

function TicketQueueScreen() {
  return (
    <Shell
      active="support"
      breadcrumb="Operations · Support"
      title="Ticket queue"
      subtitle="Auto-routed by category · priority sets the SLA timer · breaches escalate to supervisor"
      actions={
        <>
          <button className="btn sm"><Icon name="filter" size={13} />Views <Icon name="chevDown" size={11} /></button>
          <button className="btn sm"><Icon name="users" size={13} />Bulk assign</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <KpiStrip cols={5} items={[
          ['Open',           '37',     '8 unassigned', 'var(--ink-2)'],
          ['SLA breaching',  '2',      'Refund · billing', 'var(--danger)'],
          ['Due < 1h',       '5',      'Needs a picker', 'var(--warn)'],
          ['Median 1st reply','6m 12s', 'Within target', 'var(--accent)'],
          ['CSAT · 7d',      '4.6 / 5', '312 responses', 'var(--accent)'],
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: 280, height: 32 }}>
            <Icon name="search" size={13} className="icon" />
            <input placeholder="Search ticket, requester, booking…" />
          </div>
          <FilterChip label="Category" value="All" />
          <FilterChip label="Priority" value="Urgent + High" count="2" />
          <FilterChip label="Assignee" value="Any" />
          <FilterChip label="SLA" value="Breaching" count="2" />
          <div style={{ flex: 1 }} />
          <span className="badge ok"><span className="dot ok" />Live queue</span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 34 }}></th>
                <th style={{ width: 110 }}>Ticket</th>
                <th>Requester</th>
                <th style={{ width: 120 }}>Category</th>
                <th style={{ width: 110 }}>Priority</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 150 }}>Assignee</th>
                <th style={{ width: 120 }}>SLA</th>
                <th style={{ width: 70 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {TICKETS.map((t, i) => (
                <tr key={i} className={t.current ? 'selected' : ''} style={{ cursor: 'pointer' }}>
                  <td><span style={{ width: 14, height: 14, border: '1px solid var(--rule-strong)', borderRadius: 3, display: 'inline-block' }} /></td>
                  <td><span className="t-mono" style={{ fontSize: 12, color: 'var(--ink)' }}>{t.id}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ background: 'var(--surface-2)' }}><Icon name={reqTypeIcon(t.type)} size={13} /></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12.5 }}>{t.who}</span>
                        <span className="t-meta" style={{ textTransform: 'capitalize' }}>{t.type}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge">{t.cat}</span></td>
                  <td>{prioBadge(t.prio)}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td>
                    {t.agent
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span className="avatar" style={{ width: 22, height: 22, fontSize: 9.5 }}>{t.agent.split(' ').map(x => x[0]).join('')}</span><span style={{ fontSize: 12.5 }}>{t.agent}</span></span>
                      : <button className="btn sm ghost" style={{ height: 26, color: 'var(--accent)' }}><Icon name="plus" size={12} />Assign</button>}
                  </td>
                  <td><SlaCell sla={t.sla} breach={t.breach} /></td>
                  <td className="t-meta">{t.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
            <span className="t-meta">Showing 8 of 37 open · breached tickets auto-escalate to the on-call supervisor</span>
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
// 24.2 — Ticket Detail
// ──────────────────────────────────────────────────────────────
const THREAD = [
  { kind: 'in', who: 'Skyline Charter', role: 'Operator', t: '13:48', body: 'Passenger manifest for BLR→GOI (BK-AIR-9920) won\'t lock — system says weight exceeds MTOW but our numbers are under. Departure is in 3 hours. Need help urgently.' },
  { kind: 'out', who: 'Dev Malhotra', role: 'Support', t: '13:52', body: 'Thanks for flagging — pulling up the manifest now. Can you confirm the baggage total you entered for seats 4 and 5?' },
  { kind: 'note', who: 'Dev Malhotra', role: 'Support', t: '13:53', body: 'Internal: aircraft AC-204 MTOW shows 2,720kg in catalog but ops sheet says 2,950kg. Possible stale aircraft record — looping in Aircraft team.' },
  { kind: 'in', who: 'Skyline Charter', role: 'Operator', t: '13:58', body: 'Seat 4 = 18kg, seat 5 = 22kg. Total pax+baggage we calculated is 2,680kg.' },
  { kind: 'out', who: 'Dev Malhotra', role: 'Support', t: '14:05', body: 'Confirmed — the aircraft MTOW record was outdated. Corrected to 2,950kg and the manifest now locks. You\'re clear to board. Apologies for the scramble.' },
];

function TicketDetailScreen() {
  const ctx = [
    ['Ticket', 'TKT-44815'],
    ['Opened', '29 May · 13:48 IST'],
    ['Category', 'Booking · Air'],
    ['Channel', 'In-app · Operator'],
    ['SLA due', '15:00 · 1h 12m left'],
  ];
  return (
    <Shell
      active="support"
      breadcrumb="Operations · Support · Ticket"
      title="Manifest won't lock — MTOW mismatch"
      subtitle="TKT-44815 · Skyline Charter · high priority · linked to BK-AIR-9920"
      actions={
        <>
          <button className="btn sm">Escalate</button>
          <button className="btn sm accent"><Icon name="check" size={13} />Resolve</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* conversation */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="t-label">Conversation</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="t-meta">Public reply</span>
              <span style={{ width: 1, height: 12, background: 'var(--rule)' }} />
              <span className="t-meta" style={{ color: 'var(--warn)' }}>● Internal note</span>
            </div>
          </div>
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {THREAD.map((m, i) => {
              if (m.kind === 'note') {
                return (
                  <div key={i} style={{ background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 28%, var(--rule))', borderRadius: 3, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span className="t-label" style={{ color: 'var(--warn)' }}>Internal note · {m.who}</span>
                      <span className="t-meta">{m.t}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>{m.body}</div>
                  </div>
                );
              }
              const out = m.kind === 'out';
              return (
                <div key={i} style={{ display: 'flex', gap: 12, flexDirection: out ? 'row-reverse' : 'row' }}>
                  <div className="avatar" style={{ flexShrink: 0, background: out ? 'var(--ink)' : 'var(--surface-2)', color: out ? 'var(--surface)' : 'var(--ink-2)' }}>{m.who.split(' ').map(x => x[0]).join('')}</div>
                  <div style={{ maxWidth: '78%' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 5, justifyContent: out ? 'flex-end' : 'flex-start' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{m.who}</span>
                      <span className="t-meta">{m.role} · {m.t}</span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, padding: '11px 14px', borderRadius: 3, background: out ? 'var(--surface-2)' : 'var(--surface-sunk)', border: '1px solid var(--rule-soft)', color: 'var(--ink)' }}>{m.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* composer */}
          <div style={{ borderTop: '1px solid var(--rule)', padding: '14px 20px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button className="btn sm" style={{ height: 28, borderBottom: '2px solid var(--ink)' }}>Reply</button>
              <button className="btn sm ghost" style={{ height: 28, color: 'var(--warn)' }}>Internal note</button>
              <div style={{ flex: 1 }} />
              <button className="btn sm ghost" style={{ height: 28 }}><Icon name="bolt" size={12} />Canned response</button>
            </div>
            <div style={{ border: '1px solid var(--rule-strong)', borderRadius: 3, background: 'var(--surface)', padding: '12px 14px', minHeight: 64, color: 'var(--ink-4)', fontSize: 13 }}>Type a reply to Skyline Charter…</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <span className="t-meta">Replies are sent to the requester · notes stay internal</span>
              <button className="btn sm accent" style={{ height: 30 }}>Send reply<Icon name="arrowRight" size={12} /></button>
            </div>
          </div>
        </div>

        {/* context + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* status transition */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {['Open', 'In progress', 'Resolved', 'Closed'].map((s, i) => {
                const active = i === 1;
                const done = i < 1;
                return (
                  <React.Fragment key={s}>
                    <div style={{ flex: 1, textAlign: 'center', padding: '7px 4px', borderRadius: 3, fontSize: 11.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', background: active ? 'var(--warn-soft)' : done ? 'var(--accent-soft-2)' : 'var(--surface-2)', color: active ? 'var(--warn)' : done ? 'var(--accent)' : 'var(--ink-4)', border: '1px solid ' + (active ? 'color-mix(in oklab, var(--warn) 30%, var(--rule))' : 'var(--rule)') }}>{s}</div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* requester / meta */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Ticket details</div>
            {ctx.map(([k, v], i) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: i < ctx.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                <span className="t-meta">{k}</span>
                <span style={{ fontSize: 12.5, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* linked context */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Linked context</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['plane', 'BK-AIR-9920', 'BLR → GOI · 17:00 · Skyline'],
                ['receipt', 'TXN-4471A2', '₹2,84,000 · Captured'],
              ].map(([ic, id, sub]) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface-2)', cursor: 'pointer' }}>
                  <Icon name={ic} size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-mono" style={{ fontSize: 12 }}>{id}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{sub}</div>
                  </div>
                  <Icon name="external" size={13} style={{ color: 'var(--ink-3)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* linked actions */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Resolution actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn sm" style={{ justifyContent: 'flex-start' }}><Icon name="receipt" size={13} />Request refund</button>
              <button className="btn sm" style={{ justifyContent: 'flex-start' }}><Icon name="wallet" size={13} />Goodwill credit</button>
              <button className="btn sm" style={{ justifyContent: 'flex-start' }}><Icon name="arrowUp" size={13} />Escalate</button>
              <button className="btn sm" style={{ justifyContent: 'flex-start' }}><Icon name="user" size={13} />Reassign</button>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rule-soft)' }}>
              <div className="field-label" style={{ marginBottom: 6 }}>Resolution code · required to close</div>
              <div className="input" style={{ height: 36 }}>
                <input placeholder="Select code…" defaultValue="Data correction · catalog" readOnly />
                <Icon name="chevDown" size={14} className="icon" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 24.3 — SLA & Escalation
// ──────────────────────────────────────────────────────────────
const SLA_ROWS = [
  { cat: 'Refunds / Billing', urgent: ['15m', '2h'],  high: ['30m', '4h'],  med: ['2h', '12h'],  low: ['8h', '48h'] },
  { cat: 'Booking · Road',    urgent: ['10m', '1h'],  high: ['30m', '3h'],  med: ['2h', '8h'],   low: ['6h', '24h'] },
  { cat: 'Booking · Air',     urgent: ['10m', '1h'],  high: ['20m', '2h'],  med: ['1h', '6h'],   low: ['4h', '24h'] },
  { cat: 'Payouts',           urgent: ['30m', '4h'],  high: ['1h', '8h'],   med: ['4h', '24h'],  low: ['8h', '48h'] },
  { cat: 'Documents / KYC',   urgent: ['1h', '8h'],   high: ['2h', '12h'],  med: ['8h', '48h'],  low: ['24h', '72h'] },
  { cat: 'App issue',         urgent: ['30m', '4h'],  high: ['2h', '12h'],  med: ['8h', '48h'],  low: ['24h', '72h'] },
];

function EscalStep({ n, title, sub, who, last }) {
  return (
    <div style={{ display: 'flex', gap: 14, paddingBottom: last ? 0 : 18, position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--rule-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--surface)', zIndex: 1 }}>{n}</div>
        {!last && <div style={{ flex: 1, width: 1, background: 'var(--rule)', marginTop: 4 }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        <div className="t-meta" style={{ marginTop: 3 }}>{sub}</div>
        <span className="badge" style={{ marginTop: 8 }}><Icon name="user" size={11} />{who}</span>
      </div>
    </div>
  );
}

function SlaEscalationScreen() {
  return (
    <Shell
      active="support"
      breadcrumb="Operations · Support · SLA & escalation"
      title="SLA & escalation"
      subtitle="Response & resolution targets per category and priority · auto-escalation on breach"
      actions={
        <>
          <button className="btn sm">Breach report</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New policy</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <KpiStrip cols={4} items={[
          ['SLA compliance · 30d', '96.4%', 'Target 95%', 'var(--accent)'],
          ['Breaches · 7d',        '11',    '2 open now', 'var(--warn)'],
          ['Auto-escalations',     '6',     'All acknowledged', 'var(--ink-2)'],
          ['Avg resolution',       '3h 42m', 'Down 18% MoM', 'var(--accent)'],
        ]} />

        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 18, alignItems: 'start' }}>
          {/* policy matrix */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label">SLA policy matrix</div>
              <span className="t-meta">first response / resolution</span>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ width: 110 }}>Urgent</th>
                  <th style={{ width: 110 }}>High</th>
                  <th style={{ width: 110 }}>Medium</th>
                  <th style={{ width: 110 }}>Low</th>
                </tr>
              </thead>
              <tbody>
                {SLA_ROWS.map((r, i) => (
                  <tr key={i}>
                    <td><span style={{ fontSize: 13, fontWeight: 500 }}>{r.cat}</span></td>
                    {['urgent', 'high', 'med', 'low'].map(p => (
                      <td key={p}>
                        <div className="t-mono" style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ color: 'var(--ink)' }}>{r[p][0]}</span>
                          <span style={{ color: 'var(--ink-4)', fontSize: 11 }}>{r[p][1]}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--rule)' }}>
              <span className="t-meta">Timers pause during off-hours where business-hours SLA is configured · clock resumes at queue open</span>
            </div>
          </div>

          {/* escalation chain */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 22px' }}>
              <div className="t-label" style={{ marginBottom: 16 }}>Escalation chain</div>
              <EscalStep n="1" title="Assigned agent" sub="Owns the ticket until first-response SLA" who="Support agent" />
              <EscalStep n="2" title="On breach → Team lead" sub="Notified + reassigned if no response in window" who="Dev Malhotra · Lead" />
              <EscalStep n="3" title="2× breach → Supervisor" sub="Paged · dashboard alert raised" who="Reema Shah · Supervisor" />
              <EscalStep n="4" title="Urgent + financial → Duty manager" sub="Immediate page for refunds above cap" who="Sana Reyes · Super Admin" last />
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 22px' }}>
              <div className="t-label" style={{ marginBottom: 12 }}>Active breaches</div>
              {[
                ['TKT-44821 · Refunds', 'Meera Iyer · -12m', 'urgent'],
                ['TKT-44799 · Billing', 'Arjun Rao · -4m', 'urgent'],
              ].map(([id, who, p], i) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: i < 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div>
                    <div className="t-mono" style={{ fontSize: 12 }}>{id}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{who}</div>
                  </div>
                  <span className="badge danger"><span className="dot danger" />Breached</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, {
  TicketQueueScreen, TicketDetailScreen, SlaEscalationScreen,
  TICKETS, THREAD, SLA_ROWS,
});
