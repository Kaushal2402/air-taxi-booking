/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 04 — Booking Requests
   4.1  Requests Inbox — tabbed list, TTL urgency, filter bar
   4.2  Request Detail — context review + quote builder
   Shared globals from components.jsx.
   ───────────────────────────────────────────────────────────── */

// ─── TTL badge (local — components.jsx doesn't export this) ──
function TtlBadge({ label, urgent }) {
  const bg  = urgent === 'danger' ? 'var(--danger-soft)' : urgent === 'warn' ? 'var(--warn-soft)' : 'var(--surface-2)';
  const bdr = urgent === 'danger' ? 'color-mix(in oklab,var(--danger) 28%,var(--rule))' : urgent === 'warn' ? 'color-mix(in oklab,var(--warn) 28%,var(--rule))' : 'var(--rule-strong)';
  const col = urgent === 'danger' ? 'var(--danger)' : urgent === 'warn' ? 'var(--warn)' : 'var(--ink-4)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 8px', background: bg, border: `1px solid ${bdr}`, borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', color: col, flexShrink: 0, whiteSpace: 'nowrap' }}>
      <Icon name="clock" size={10} stroke={1.6} />
      {label}
    </span>
  );
}

// ─── Service type badge ───────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    charter: { label: 'Charter', tone: 'info'    },
    shuttle: { label: 'Shuttle', tone: 'ok'      },
    cargo:   { label: 'Cargo',   tone: 'pending' },
    medevac: { label: 'Medevac', tone: 'danger'  },
    vip:     { label: 'VIP',     tone: 'warn'    },
  };
  const { label, tone } = map[type] || { label: type, tone: 'pending' };
  return <span className={`badge ${tone}`} style={{ height: 19, fontSize: 10 }}>{label}</span>;
}

// ─── Tab bar ──────────────────────────────────────────────────
function ReqTabBar({ tabs, active }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--rule)', padding: '0 28px', background: 'var(--surface)', flexShrink: 0 }}>
      {tabs.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          height: 44, padding: '0 14px', cursor: 'pointer',
          borderBottom: t.id === active ? '2px solid var(--ink)' : '2px solid transparent',
          color: t.id === active ? 'var(--ink)' : 'var(--ink-3)',
          fontSize: 13, fontWeight: t.id === active ? 500 : 400,
          marginBottom: -1,
        }}>
          {t.label}
          {t.count != null && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em',
              padding: '1px 7px', borderRadius: 10,
              background: t.id === active ? 'var(--ink)' : 'var(--surface-sunk)',
              color: t.id === active ? 'var(--bg)' : 'var(--ink-3)',
              border: t.id === active ? 'none' : '1px solid var(--rule-strong)',
            }}>{t.count}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Column header strip ──────────────────────────────────────
function ReqColHead({ cols }) {
  return (
    <div style={{ display: 'flex', padding: '8px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
      {cols.map(([lbl, w, align]) => (
        <div key={lbl + w} className="t-label" style={{
          width: w || undefined, flex: !w ? 1 : undefined,
          flexShrink: w ? 0 : undefined, textAlign: align || 'left',
        }}>{lbl}</div>
      ))}
    </div>
  );
}

// ─── Request list row ─────────────────────────────────────────
function ReqRow({ r, last }) {
  const rowBg =
    r.rowTone === 'danger' ? 'color-mix(in oklab, var(--danger-soft) 70%, transparent)' :
    r.rowTone === 'warn'   ? 'color-mix(in oklab, var(--warn-soft)   45%, transparent)' :
    'transparent';
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '11px 24px',
      borderBottom: last ? 'none' : '1px solid var(--rule-soft)',
      background: rowBg,
    }}>
      {/* ref + type */}
      <div style={{ width: 120, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em', color: 'var(--ink)' }}>{r.ref}</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <TypeBadge type={r.type} />
          {r.vip && <TypeBadge type="vip" />}
        </div>
      </div>
      {/* passenger + route */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.passenger}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span className="t-meta" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>{r.from}</span>
          <Icon name="arrowRight" size={10} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
          <span className="t-meta" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>{r.to}</span>
        </div>
      </div>
      {/* load */}
      <div style={{ width: 78, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name="users" size={11} style={{ color: 'var(--ink-4)' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{r.pax} pax</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <Icon name="weight" size={11} style={{ color: 'var(--ink-4)' }} />
          <span className="t-meta" style={{ fontSize: 11 }}>{r.kg} kg</span>
        </div>
      </div>
      {/* flight date */}
      <div style={{ width: 96, flexShrink: 0 }}>
        <div style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.02em', color: 'var(--ink-2)' }}>{r.flightDate}</div>
        <div className="t-meta" style={{ fontSize: 11, marginTop: 3 }}>{r.flightTime}</div>
      </div>
      {/* submitted */}
      <div style={{ width: 90, flexShrink: 0 }}>
        <div className="t-meta" style={{ fontSize: 11 }}>{r.submitted}</div>
      </div>
      {/* TTL */}
      <div style={{ width: 116, flexShrink: 0 }}>
        {r.ttl && <TtlBadge label={r.ttl} urgent={r.ttlTone} />}
      </div>
      {/* status */}
      <div style={{ width: 96, flexShrink: 0 }}>
        <span className={`badge ${r.statusTone}`} style={{ height: 19 }}>
          <span className={`dot ${r.statusTone}`} />{r.status}
        </span>
      </div>
      {/* actions */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0, width: 150, justifyContent: 'flex-end' }}>
        {r.actions}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4.1 — Requests Inbox
// variant: 'pending' | 'quoted'
// ─────────────────────────────────────────────────────────────
function RequestsListScreen({ variant = 'pending' }) {
  const isPending = variant === 'pending';

  const tabs = [
    { id: 'all',      label: 'All',      count: 14 },
    { id: 'pending',  label: 'Pending',  count: 6  },
    { id: 'quoted',   label: 'Quoted',   count: 3  },
    { id: 'accepted', label: 'Accepted', count: 3  },
    { id: 'expired',  label: 'Expired',  count: 1  },
    { id: 'rejected', label: 'Rejected', count: 1  },
  ];

  const pendingRows = [
    {
      ref: 'BKR-0601', type: 'charter', vip: true,
      passenger: 'Reliance Industries — Nita Mehta (Travel Desk)',
      from: 'MUM Juhu', to: 'DEL Safdarjung',
      pax: 8, kg: 320, flightDate: '4 Jun', flightTime: 'ASAP',
      submitted: '13:22 today', ttl: '11 min left', ttlTone: 'danger',
      status: 'Pending', statusTone: 'warn', rowTone: 'danger',
      actions: [
        <button key="q" className="btn sm accent" style={{ height: 26 }}><Icon name="tag" size={11} />Quote</button>,
        <button key="r" className="btn sm danger" style={{ height: 26 }}>Reject</button>,
      ],
    },
    {
      ref: 'BKR-0598', type: 'charter', vip: true,
      passenger: 'Tata Consulting Services · Ratan Iyer',
      from: 'MUM Juhu', to: 'Pune Heliport',
      pax: 4, kg: 120, flightDate: '4 Jun', flightTime: '17:00',
      submitted: '10:15 today', ttl: '43 min left', ttlTone: 'warn',
      status: 'Pending', statusTone: 'warn', rowTone: 'warn',
      actions: [
        <button key="q" className="btn sm accent" style={{ height: 26 }}><Icon name="tag" size={11} />Quote</button>,
        <button key="r" className="btn sm danger" style={{ height: 26 }}>Reject</button>,
      ],
    },
    {
      ref: 'BKR-0594', type: 'shuttle',
      passenger: 'B. Patel (Leisure)',
      from: 'MUM Juhu', to: 'Shirdi Helipad',
      pax: 3, kg: 45, flightDate: '5 Jun', flightTime: '09:00',
      submitted: '08:42 today', ttl: '4h 05m left', ttlTone: null,
      status: 'Pending', statusTone: 'warn', rowTone: null,
      actions: [
        <button key="a" className="btn sm primary" style={{ height: 26 }}><Icon name="check" size={11} />Accept</button>,
        <button key="r" className="btn sm" style={{ height: 26 }}>Reject</button>,
      ],
    },
    {
      ref: 'BKR-0591', type: 'charter',
      passenger: 'Adani Group · Corporate Travel',
      from: 'MUM Juhu', to: 'Surat Airport',
      pax: 6, kg: 180, flightDate: '6 Jun', flightTime: '10:30',
      submitted: '3 Jun 14:11', ttl: '1d 8h left', ttlTone: null,
      status: 'Pending', statusTone: 'warn', rowTone: null,
      actions: [
        <button key="q" className="btn sm accent" style={{ height: 26 }}><Icon name="tag" size={11} />Quote</button>,
        <button key="r" className="btn sm danger" style={{ height: 26 }}>Reject</button>,
      ],
    },
    {
      ref: 'BKR-0588', type: 'charter',
      passenger: 'Mahindra & Mahindra · Executive Travel',
      from: 'MUM Juhu', to: 'Goa (North) Helipad',
      pax: 4, kg: 90, flightDate: '8 Jun', flightTime: '11:00',
      submitted: '3 Jun 09:30', ttl: '2d 1h left', ttlTone: null,
      status: 'Pending', statusTone: 'warn', rowTone: null,
      actions: [
        <button key="q" className="btn sm accent" style={{ height: 26 }}><Icon name="tag" size={11} />Quote</button>,
        <button key="r" className="btn sm danger" style={{ height: 26 }}>Reject</button>,
      ],
    },
    {
      ref: 'BKR-0585', type: 'shuttle',
      passenger: 'Godrej Industries · M. Shah',
      from: 'MUM Juhu', to: 'Nashik Helipad',
      pax: 2, kg: 30, flightDate: '9 Jun', flightTime: '08:00',
      submitted: '2 Jun 16:45', ttl: '3d 6h left', ttlTone: null,
      status: 'Pending', statusTone: 'warn', rowTone: null,
      actions: [
        <button key="q" className="btn sm accent" style={{ height: 26 }}><Icon name="tag" size={11} />Quote</button>,
        <button key="r" className="btn sm danger" style={{ height: 26 }}>Reject</button>,
      ],
    },
  ];

  const quotedRows = [
    {
      ref: 'BKR-0582', type: 'charter', vip: true,
      passenger: 'HDFC Bank · Deepak Parekh Office',
      from: 'MUM Juhu', to: 'Hyderabad BHEL Helipad',
      pax: 4, kg: 100, flightDate: '6 Jun', flightTime: '09:00',
      submitted: '1 Jun 14:22', ttl: '14h left', ttlTone: 'warn',
      status: 'Awaiting', statusTone: 'info', rowTone: null,
      actions: [
        <button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>,
        <button key="rv" className="btn sm" style={{ height: 26 }}>Revise</button>,
      ],
    },
    {
      ref: 'BKR-0580', type: 'charter', vip: true,
      passenger: 'L&T Infrastructure · Subramanian K.',
      from: 'MUM Juhu', to: 'Chennai Helipad',
      pax: 3, kg: 75, flightDate: '7 Jun', flightTime: '14:00',
      submitted: '31 May 10:18', ttl: '1d 20h left', ttlTone: null,
      status: 'Awaiting', statusTone: 'info', rowTone: null,
      actions: [
        <button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>,
        <button key="rv" className="btn sm" style={{ height: 26 }}>Revise</button>,
      ],
    },
    {
      ref: 'BKR-0574', type: 'shuttle',
      passenger: 'K. Sharma (Leisure)',
      from: 'MUM Juhu', to: 'Lonavala Helipad',
      pax: 2, kg: 20, flightDate: '10 Jun', flightTime: '07:30',
      submitted: '29 May 17:05', ttl: '4d 8h left', ttlTone: null,
      status: 'Awaiting', statusTone: 'info', rowTone: null,
      actions: [
        <button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>,
        <button key="rv" className="btn sm" style={{ height: 26 }}>Revise</button>,
      ],
    },
  ];

  const rows = isPending ? pendingRows : quotedRows;
  const activeTab = isPending ? 'pending' : 'quoted';

  return (
    <Shell
      active="requests"
      breadcrumb="Operations"
      title="Booking Requests"
      subtitle={isPending
        ? 'Helix Aviation · 6 pending — 2 urgent · 4 Jun 2026  10:42 IST'
        : 'Helix Aviation · 3 quoted — awaiting acceptance · 4 Jun 2026  10:42 IST'}
      actions={<button className="btn sm"><Icon name="download" size={12} />Export</button>}
    >
      {/* tab bar */}
      <ReqTabBar tabs={tabs} active={activeTab} />

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', background: 'var(--surface)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <div className="input" style={{ width: 260, height: 32 }}>
          <Icon name="search" size={13} className="icon" />
          <input placeholder="Search passengers, refs, routes…" />
        </div>
        <FilterChip label="Service" value="All types" />
        <FilterChip label="Route" value="Any" />
        <FilterChip label="Date" value="Any" />
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>Sorted: Deadline ↑</span>
        <div style={{ width: 1, height: 14, background: 'var(--rule)' }} />
        <span className="t-meta" style={{ fontSize: 11 }}>{rows.length} results</span>
      </div>

      {/* urgency strip — pending only */}
      {isPending && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 40,
          background: 'var(--danger-soft)', borderBottom: '1px solid color-mix(in oklab, var(--danger) 20%, var(--rule))',
          flexShrink: 0,
        }}>
          <Icon name="alert" size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 500 }}>2 expiring within the hour</span>
          <span style={{ width: 1, height: 14, background: 'color-mix(in oklab, var(--danger) 28%, var(--rule))' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>BKR-0601 in <b style={{ color: 'var(--danger)' }}>11 min</b> · BKR-0598 in <b style={{ color: 'var(--warn)' }}>43 min</b> · Unanswered requests auto-reject at deadline.</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm danger" style={{ height: 26 }}>Open BKR-0601 →</button>
        </div>
      )}

      {/* info strip — quoted only */}
      {!isPending && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 38,
          background: 'var(--info-soft)', borderBottom: '1px solid color-mix(in oklab, var(--info) 18%, var(--rule))',
          flexShrink: 0,
        }}>
          <Icon name="clock" size={13} style={{ color: 'var(--info)', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>3 quotes awaiting passenger acceptance · BKR-0582 acceptance window closes in <b style={{ color: 'var(--warn)' }}>14 hours</b></span>
        </div>
      )}

      {/* table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <ReqColHead cols={[
          ['Ref / Type',        120, 'left'],
          ['Passenger · Route',   0, 'left'],
          ['Load',               78, 'left'],
          ['Flight Date',        96, 'left'],
          ['Submitted',          90, 'left'],
          ['Deadline',          116, 'left'],
          ['Status',             96, 'left'],
          ['',                  150, 'right'],
        ]} />
        <div>
          {rows.map((r, i) => (
            <ReqRow key={r.ref} r={r} last={i === rows.length - 1} />
          ))}
        </div>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 4.2 — Request Detail + Quote Builder  (BKR-0601, urgent)
// ─────────────────────────────────────────────────────────────

function DetField({ label, value, mono, tone, sub }) {
  return (
    <div>
      <div className="t-label" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{
        fontSize: 13.5, lineHeight: 1.3,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        letterSpacing: mono ? '0.04em' : undefined,
        color: tone ? `var(--${tone})` : 'var(--ink)',
      }}>{value}</div>
      {sub && <div className="t-meta" style={{ marginTop: 3, fontSize: 11 }}>{sub}</div>}
    </div>
  );
}

function QuoteLine({ label, amount, sub, bold, separator }) {
  return (
    <>
      {separator && <div style={{ height: 1, background: 'var(--rule)', margin: '8px 0' }} />}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '3px 0' }}>
        <span style={{ fontSize: bold ? 13.5 : 12.5, color: bold ? 'var(--ink)' : 'var(--ink-2)', fontWeight: bold ? 600 : 400 }}>
          {label}
          {sub && <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 7 }}>{sub}</span>}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: bold ? 14 : 12.5,
          color: bold ? 'var(--ok)' : 'var(--ink-3)', letterSpacing: '0.04em',
          fontWeight: bold ? 600 : 400,
        }}>{amount}</span>
      </div>
    </>
  );
}

function RequestDetailScreen() {
  return (
    <Shell
      active="requests"
      breadcrumb="Booking Requests / BKR-0601"
      title="BKR-0601 — Charter Request"
      subtitle="Reliance Industries · MUM Juhu → DEL Safdarjung · 4 Jun 2026 · Received 13:22"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" style={{ color: 'var(--ink-3)', height: 32 }}>
            <Icon name="arrowRight" size={12} style={{ transform: 'rotate(180deg)' }} />Back to inbox
          </button>
          <button className="btn sm danger" style={{ height: 32 }}><Icon name="close" size={12} />Reject</button>
          <button className="btn sm accent" style={{ height: 32 }}><Icon name="tag" size={12} />Send Quote</button>
        </div>
      }
    >
      {/* urgency bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 40,
        background: 'var(--danger-soft)', borderBottom: '1px solid color-mix(in oklab, var(--danger) 24%, var(--rule))',
        flexShrink: 0,
      }}>
        <Icon name="clock" size={13} style={{ color: 'var(--danger)', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 500 }}>Response deadline: 13:44 IST · 11 min remaining</span>
        <span style={{ width: 1, height: 14, background: 'color-mix(in oklab, var(--danger) 30%, var(--rule))' }} />
        <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Request auto-rejects if not responded to before deadline.</span>
      </div>

      {/* two-column body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>

        {/* ── LEFT — request context ─────────────────────── */}
        <div style={{ flex: 1, padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 18, borderRight: '1px solid var(--rule)', overflowY: 'auto' }}>

          {/* Requestor card */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Requestor</div>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 15, flexShrink: 0 }}>RI</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>Reliance Industries Ltd.</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>Travel Desk · Nita Mehta · nita.mehta@ril.com · +91-22-2278-5000</div>
                </div>
                <button className="btn sm icon"><Icon name="envelope" size={13} /></button>
                <button className="btn sm icon"><Icon name="phone" size={13} /></button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rule-soft)' }}>
                <TypeBadge type="charter" />
                <TypeBadge type="vip" />
                <span className="badge info" style={{ height: 19 }}>Verified org</span>
                <span className="badge ok" style={{ height: 19 }}>3 prior bookings</span>
              </div>
            </div>
          </section>

          {/* Flight details */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Flight Details</div>
            <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <DetField label="Origin"       value="MUM Juhu Aerodrome" />
                <DetField label="Destination"  value="DEL Safdarjung Airport" />
                <DetField label="Service type" value="Full charter" />
              </div>
              <div style={{ height: 1, background: 'var(--rule-soft)' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <DetField label="Departure"   value="4 Jun 2026 · ASAP" mono />
                <DetField label="Return?"     value="No · one-way" />
                <DetField label="Flexibility" value="±2 hours acceptable" />
              </div>
              <div style={{ height: 1, background: 'var(--rule-soft)' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <DetField label="Passengers"   value="8 adults" />
                <DetField label="Baggage"      value="320 kg total" />
                <DetField label="Est. payload" value="~1,040 kg" tone="warn" sub="Near MTOW for smaller types" />
              </div>
            </div>
          </section>

          {/* Passenger notes */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Passenger Notes &amp; Requirements</div>
            <div className="card" style={{ padding: '12px 16px' }}>
              {[
                { icon: 'shield',    note: 'VIP handling required — direct tarmac access, no public terminal' },
                { icon: 'users',     note: '2 CISF-cleared security personnel travelling (armed)' },
                { icon: 'briefcase', note: 'Catering: continental + beverages for 8, vegetarian / kosher options required' },
                { icon: 'flag',      note: 'Priority slots at DEL Safdarjung — client travel desk co-ordinating ATF supply' },
              ].map((n, i, arr) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <Icon name={n.icon} size={13} style={{ color: 'var(--ink-3)', marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{n.note}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Payload warning */}
          <div style={{ display: 'flex', gap: 10, padding: '11px 14px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 30%, var(--rule))', borderRadius: 3 }}>
            <Icon name="alert" size={14} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--warn)' }}>Payload approaches MTOW — verify aircraft selection</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.45 }}>Est. payload ~1,040 kg is within 15% of MTOW for EC135 / AS350 types. AW169 (VT-HXE) is the only aircraft with adequate MTOW margin for this route. Confirm fuel load, altitude, and configuration before accepting.</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT — quote builder ──────────────────────── */}
        <div style={{ width: 372, flexShrink: 0, background: 'var(--surface)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Aircraft selection */}
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Assign Aircraft</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { reg: 'VT-HXE', type: 'AW169',   pax: '16 max', range: '830 nm', note: 'Best match · sufficient MTOW margin', selected: true,  tone: 'ok'   },
                  { reg: 'VT-HXD', type: 'EC135 T2', pax: '7 max',  range: '350 nm', note: 'Payload near limit at 8 pax + 320 kg', selected: false, tone: 'warn' },
                  { reg: 'VT-HXA', type: 'EC135',    pax: '7 max',  range: '320 nm', note: 'Range marginal MUM→DEL direct',        selected: false, tone: 'warn' },
                ].map(a => (
                  <div key={a.reg} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    border: `1.5px solid ${a.selected ? 'var(--accent)' : 'var(--rule)'}`,
                    background: a.selected ? 'var(--accent-soft-2)' : 'var(--bg)',
                    borderRadius: 3, cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      border: `1.5px solid ${a.selected ? 'var(--accent)' : 'var(--rule-strong)'}`,
                      background: a.selected ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {a.selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.05em', color: 'var(--ink)' }}>{a.reg}</span>
                        <span className="t-meta" style={{ fontSize: 11 }}>{a.type} · {a.pax} · {a.range}</span>
                      </div>
                      {a.note && <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2, color: a.tone === 'warn' ? 'var(--warn)' : 'var(--ink-3)' }}>{a.note}</div>}
                    </div>
                    <span className={`badge ${a.tone}`} style={{ height: 19 }}><span className={`dot ${a.tone}`} />{a.tone === 'ok' ? 'Available' : 'Note'}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Fare breakdown */}
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Fare Breakdown</div>
              <div className="card" style={{ padding: '12px 14px' }}>
                <QuoteLine label="Base charter rate"    amount="₹1,85,000" sub="AW169 · MUM→DEL 720 nm" />
                <QuoteLine label="Fuel surcharge"       amount="₹28,500"   sub="@ ₹95/kg est." />
                <QuoteLine label="Landing & parking"    amount="₹12,000"   sub="DEL Safdarjung" />
                <QuoteLine label="Crew positioning"     amount="₹8,000"    sub="deadhead MUM" />
                <QuoteLine label="VIP ground handling"  amount="₹6,500"    sub="tarmac, marshalling" />
                <QuoteLine label="Catering"             amount="₹9,500"    sub="continental · 8 pax" />
                <QuoteLine label="Sub-total"            amount="₹2,49,500" separator />
                <QuoteLine label="Platform service fee" amount="₹7,485"    sub="3% via Acme Mobility" />
                <QuoteLine label="GST"                  amount="₹45,899"   sub="18% on applicable" />
                <QuoteLine label="Total"                amount="₹3,02,884" bold separator />
              </div>
            </section>

            {/* Quote settings */}
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Quote Settings</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="field">
                  <label className="field-label">Quote validity</label>
                  <div className="input">
                    <input defaultValue="4 hours from sending" readOnly style={{ flex: 1 }} />
                    <Icon name="chevDown" size={14} className="icon" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Payment terms</label>
                  <div className="input">
                    <input defaultValue="50% advance · 50% on departure" readOnly style={{ flex: 1 }} />
                    <Icon name="chevDown" size={14} className="icon" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Note to requestor <span style={{ textTransform: 'none', letterSpacing: 0, fontStyle: 'italic', fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--ink-4)' }}>optional</span></label>
                  <div style={{ border: '1px solid var(--rule-strong)', background: 'var(--surface-sunk)', borderRadius: 2, padding: '8px 10px', minHeight: 52, fontSize: 12.5, color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
                    Message to include with the quote…
                  </div>
                </div>
              </div>
            </section>

            {/* CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 2 }}>
              <button className="btn accent" style={{ width: '100%', height: 40, justifyContent: 'center', fontWeight: 500, fontSize: 14 }}>
                <Icon name="tag" size={14} />Send Quote · ₹3,02,884
              </button>
              <button className="btn" style={{ width: '100%', height: 32, justifyContent: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
                Save draft
              </button>
            </div>

          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { RequestsListScreen, RequestDetailScreen });
