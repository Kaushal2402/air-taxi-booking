/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 08 — Cancel & Reschedule
   8.1a  Bookings list with cancel/reschedule actions
   8.1b  Cancel confirmation modal (within page)
   8.2   Reschedule flow — new slot, aircraft, crew, notify
   ───────────────────────────────────────────────────────────── */

// ─── Booking status badge ──────────────────────────────────────
function BookingStatus({ s }) {
  const map = {
    'Confirmed':   'ok',
    'In-air':      'info',
    'Completed':   'pending',
    'Cancelled':   'danger',
    'Rescheduled': 'warn',
  };
  return (
    <span className={`badge ${map[s] || 'pending'}`} style={{ height: 20, fontSize: 10.5 }}>
      <span className={`dot ${map[s] || 'pending'}`} />{s}
    </span>
  );
}

// ─── Section label ─────────────────────────────────────────────
function SectionLabel({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span className="t-label">{children}</span>
      {action && <div style={{ flex: 1 }} />}
      {action}
    </div>
  );
}

// ─── Detail field ──────────────────────────────────────────────
function Field({ label, value, mono, tone, sub }) {
  return (
    <div>
      <div className="t-label" style={{ marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: tone ? `var(--${tone})` : 'var(--ink)', fontFamily: mono ? 'var(--font-mono)' : undefined, letterSpacing: mono ? '0.04em' : undefined, lineHeight: 1.35 }}>{value}</div>
      {sub && <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Policy row ────────────────────────────────────────────────
function PolicyRow({ hours, policy, fee, applicable, last }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 100px', gap: 12, padding: '8px 0', borderBottom: last ? 'none' : '1px solid var(--rule-soft)', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{hours}</span>
      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{policy}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: applicable ? 'var(--danger)' : 'var(--ink-4)', fontWeight: applicable ? 600 : 400, textAlign: 'right' }}>{fee}</span>
    </div>
  );
}

// ─── Booking row ───────────────────────────────────────────────
function BookingRow({ b, last }) {
  const rowBg = b.status === 'Cancelled' ? 'color-mix(in oklab,var(--danger-soft) 40%,transparent)' : b.status === 'Rescheduled' ? 'color-mix(in oklab,var(--warn-soft) 30%,transparent)' : 'transparent';
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 24px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)', background: rowBg, opacity: b.status === 'Cancelled' ? 0.75 : 1 }}>
      {/* ref */}
      <div style={{ width: 116, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.05em', color: 'var(--ink)', fontWeight: 500 }}>{b.ref}</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          <span className={`badge ${b.type === 'charter' ? 'info' : 'ok'}`} style={{ height: 17, fontSize: 9.5 }}>{b.type === 'charter' ? 'Charter' : 'Shuttle'}</span>
          {b.vip && <span className="badge warn" style={{ height: 17, fontSize: 9.5 }}>VIP</span>}
        </div>
      </div>
      {/* route + client */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.client}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span className="t-meta" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{b.from}</span>
          <Icon name="arrowRight" size={9} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
          <span className="t-meta" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{b.to}</span>
        </div>
      </div>
      {/* date */}
      <div style={{ width: 100, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)', letterSpacing: '0.03em' }}>{b.date}</div>
        <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>{b.time}</div>
      </div>
      {/* aircraft */}
      <div style={{ width: 90, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)', letterSpacing: '0.05em' }}>{b.reg}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>{b.aircraft}</div>
      </div>
      {/* value */}
      <div style={{ width: 100, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{b.value}</div>
      </div>
      {/* status */}
      <div style={{ width: 110, flexShrink: 0 }}>
        <BookingStatus s={b.status} />
      </div>
      {/* actions */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0, width: 170, justifyContent: 'flex-end' }}>
        {b.actions}
      </div>
    </div>
  );
}

// ─── Inline modal overlay ──────────────────────────────────────
function ModalOverlay({ children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in oklab,var(--bg) 60%,transparent)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ width: 540, background: 'var(--surface)', border: '1px solid var(--rule-strong)', borderRadius: 4, boxShadow: 'var(--shadow-pop)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 8.1 — Bookings list (cancel / reschedule CTAs)
// variant: 'list' | 'cancel-modal'
// ─────────────────────────────────────────────────────────────
function BookingsManageScreen({ variant = 'list' }) {
  const showModal = variant === 'cancel-modal';

  const rows = [
    {
      ref: 'BKG-0601', type: 'charter', vip: true,
      client: 'Reliance Industries — Nita Mehta',
      from: 'MUM Juhu', to: 'DEL Safdarjung',
      date: '5 Jun', time: '11:10', reg: 'VT-HXE', aircraft: 'AW169',
      value: '₹3,02,884', status: 'In-air',
      actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>],
    },
    {
      ref: 'BKG-0594', type: 'charter', vip: false,
      client: 'B. Patel (Leisure)',
      from: 'MUM Juhu', to: 'Shirdi Helipad',
      date: '5 Jun', time: '13:00', reg: 'VT-HXD', aircraft: 'EC135 T2',
      value: '₹48,500', status: 'Confirmed',
      actions: [
        <button key="rs" className="btn sm" style={{ height: 26 }}><Icon name="calendar" size={11} />Reschedule</button>,
        <button key="cn" className="btn sm danger" style={{ height: 26 }}>Cancel</button>,
      ],
    },
    {
      ref: 'BKG-0598', type: 'charter', vip: true,
      client: 'Tata Consulting Services · Ratan Iyer',
      from: 'MUM Juhu', to: 'Pune Heliport',
      date: '5 Jun', time: '17:00', reg: 'VT-HXD', aircraft: 'EC135 T2',
      value: '₹92,000', status: 'Confirmed',
      actions: [
        <button key="rs" className="btn sm" style={{ height: 26 }}><Icon name="calendar" size={11} />Reschedule</button>,
        <button key="cn" className="btn sm danger" style={{ height: 26 }}>Cancel</button>,
      ],
    },
    {
      ref: 'BKG-0588', type: 'charter', vip: false,
      client: 'Mahindra & Mahindra · Corporate Travel',
      from: 'MUM Juhu', to: 'Goa North',
      date: '8 Jun', time: '11:00', reg: 'VT-HXE', aircraft: 'AW169',
      value: '₹1,84,000', status: showModal ? 'Cancelled' : 'Confirmed',
      actions: showModal
        ? [<span key="c" className="t-meta" style={{ fontSize: 11 }}>Cancelled</span>]
        : [
            <button key="rs" className="btn sm" style={{ height: 26 }}><Icon name="calendar" size={11} />Reschedule</button>,
            <button key="cn" className="btn sm danger" style={{ height: 26 }}>Cancel</button>,
          ],
    },
    {
      ref: 'BKG-0577', type: 'charter', vip: false,
      client: 'Godrej Industries · M. Shah',
      from: 'MUM Juhu', to: 'Nashik Helipad',
      date: '9 Jun', time: '08:00', reg: 'VT-HXE', aircraft: 'AW169',
      value: '₹68,000', status: 'Confirmed',
      actions: [
        <button key="rs" className="btn sm" style={{ height: 26 }}><Icon name="calendar" size={11} />Reschedule</button>,
        <button key="cn" className="btn sm danger" style={{ height: 26 }}>Cancel</button>,
      ],
    },
    {
      ref: 'BKG-0583', type: 'charter', vip: false,
      client: 'L&T Infrastructure · Subramanian K.',
      from: 'MUM Juhu', to: 'Chennai Helipad',
      date: '7 Jun', time: '14:00', reg: 'VT-HXE', aircraft: 'AW169',
      value: '₹2,10,000', status: 'Rescheduled',
      actions: [
        <button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>,
        <button key="rs" className="btn sm" style={{ height: 26 }}><Icon name="calendar" size={11} />Re-reschedule</button>,
      ],
    },
  ];

  return (
    <Shell
      active="bookings"
      breadcrumb="Operations"
      title="Manage Bookings"
      subtitle="Helix Aviation · 5 Jun 2026 · 5 upcoming, 1 in-air"
      actions={<button className="btn sm"><Icon name="download" size={12} />Export</button>}
    >
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', background: 'var(--surface)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <div className="input" style={{ width: 260, height: 32 }}>
          <Icon name="search" size={13} className="icon" />
          <input placeholder="Search clients, refs, routes…" />
        </div>
        <FilterChip label="Date" value="All upcoming" />
        <FilterChip label="Aircraft" value="All" />
        <FilterChip label="Status" value="All" />
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>{rows.length} bookings</span>
      </div>

      {/* col header */}
      <div style={{ display: 'flex', padding: '8px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        {[['Ref / Type',116],['Client · Route',0],['Date',100],['Aircraft',90],['Value',100],['Status',110],['',170]].map(([l,w]) => (
          <div key={l} className="t-label" style={{ width: w || undefined, flex: !w ? 1 : undefined, flexShrink: w ? 0 : undefined, textAlign: w === 170 ? 'right' : 'left' }}>{l}</div>
        ))}
      </div>

      {/* rows */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {rows.map((b, i) => <BookingRow key={b.ref} b={b} last={i === rows.length-1} />)}

        {/* ── cancel confirmation modal ── */}
        {showModal && (
          <ModalOverlay>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--rule)', background: 'color-mix(in oklab,var(--danger-soft) 60%,var(--surface))' }}>
              <Icon name="alert" size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Cancel Booking — BKG-0588</div>
                <div className="t-meta" style={{ fontSize: 11.5, marginTop: 2 }}>Mahindra & Mahindra · MUM → GOA · 8 Jun 2026 11:00</div>
              </div>
              <div style={{ flex: 1 }} />
              <button className="btn sm icon"><Icon name="close" size={13} /></button>
            </div>

            {/* body */}
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* booking summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 14px', background: 'var(--surface-sunk)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                <Field label="Booking ref"   value="BKG-0588"                  mono />
                <Field label="Total paid"    value="₹1,84,000"                 mono />
                <Field label="Departure"     value="8 Jun 2026 · 11:00 IST"    />
                <Field label="Aircraft"      value="VT-HXE — AW169"            />
              </div>

              {/* cancellation policy */}
              <div>
                <div className="t-label" style={{ marginBottom: 8 }}>Cancellation Policy</div>
                <div className="card" style={{ padding: '10px 14px' }}>
                  <PolicyRow hours="> 72 hrs before departure" policy="Full refund" fee="No charge" />
                  <PolicyRow hours="48–72 hrs" policy="50% refund" fee="₹92,000" />
                  <PolicyRow hours="24–48 hrs" policy="25% refund" fee="₹1,38,000" applicable />
                  <PolicyRow hours="< 24 hrs" policy="No refund" fee="₹1,84,000" last />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 12px', background: 'color-mix(in oklab,var(--warn) 8%,var(--surface))', border: '1px solid color-mix(in oklab,var(--warn) 22%,var(--rule))', borderRadius: 3 }}>
                  <Icon name="clock" size={13} style={{ color: 'var(--warn)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--warn)' }}>Cancellation in 24–48 hr window — <b>₹1,38,000 penalty applies</b>. Refund: ₹46,000.</span>
                </div>
              </div>

              {/* reason */}
              <div className="field">
                <label className="field-label">Cancellation reason <span style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--ink-4)', fontStyle: 'italic' }}>required</span></label>
                <div className="input" style={{ height: 36 }}>
                  <input defaultValue="Client request — schedule change" style={{ flex: 1 }} />
                  <Icon name="chevDown" size={14} className="icon" />
                </div>
              </div>

              {/* notify toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 18, borderRadius: 9, background: 'var(--accent)', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Notify client by email</span>
                <span className="t-meta" style={{ fontSize: 11 }}>· nita.travel@mahindra.com</span>
              </div>
            </div>

            {/* footer */}
            <div style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ height: 34 }}>Keep booking</button>
              <button className="btn sm accent" style={{ height: 34, background: 'var(--danger)', borderColor: 'var(--danger)' }}>
                <Icon name="close" size={12} />Confirm cancellation
              </button>
            </div>
          </ModalOverlay>
        )}
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 8.2 — Reschedule flow (BKG-0583 · L&T · MUM→CHN)
// ─────────────────────────────────────────────────────────────

// ── Mini calendar for date picking ──────────────────────────
function MiniCal({ selected }) {
  const days = ['M','T','W','T','F','S','S'];
  const dates = [
    [null, null, null, null, null, null, 1],
    [2, 3, 4, 5, 6, 7, 8],
    [9, 10, 11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20, 21, 22],
    [23, 24, 25, 26, 27, 28, 29],
    [30, null, null, null, null, null, null],
  ];
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 3, overflow: 'hidden', background: 'var(--bg)', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)' }}>
        <button className="btn sm icon" style={{ height: 24, width: 24 }}><Icon name="chevLeft" size={12} /></button>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 500 }}>June 2026</div>
        <button className="btn sm icon" style={{ height: 24, width: 24 }}><Icon name="chevRight" size={12} /></button>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
          {days.map((d, i) => (
            <div key={d + i} className="t-label" style={{ textAlign: 'center', fontSize: 9.5, padding: '2px 0' }}>{d}</div>
          ))}
        </div>
        {dates.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {week.map((d, di) => {
              const isSelected = d === selected;
              const isPast = d !== null && d < 5;
              const isToday = d === 5;
              return (
                <div key={di} style={{
                  height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 2, fontSize: 11.5, cursor: d && !isPast ? 'pointer' : 'default',
                  background: isSelected ? 'var(--accent)' : isToday ? 'var(--surface-2)' : 'transparent',
                  color: isSelected ? '#fff' : isPast ? 'var(--ink-4)' : d ? 'var(--ink-2)' : 'transparent',
                  border: isToday && !isSelected ? '1px solid var(--rule-strong)' : '1px solid transparent',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: isSelected ? 500 : 400,
                }}>{d || ''}</div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function RescheduleScreen() {
  const [selectedDate, setSelectedDate] = React.useState(10);
  const [selectedTime, setSelectedTime] = React.useState('10:00');
  const [selectedAircraft, setSelectedAircraft] = React.useState(0);

  const aircraft = [
    { reg: 'VT-HXE', type: 'AW169',   status: 'Available', tone: 'ok',   note: 'Best match · sufficient range' },
    { reg: 'VT-HXB', type: 'AS350 B3', status: 'Available', tone: 'ok',   note: 'Available from 10 Jun 09:00' },
    { reg: 'VT-HXD', type: 'EC135 T2', status: 'Occupied',  tone: 'warn', note: 'BKG-0598 assigned until 18:30' },
  ];

  const times = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];

  return (
    <Shell
      active="bookings"
      breadcrumb="Manage Bookings / BKG-0583"
      title="Reschedule — BKG-0583"
      subtitle="L&T Infrastructure · MUM Juhu → Chennai Helipad · Original: 7 Jun 2026 14:00"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" style={{ height: 32, color: 'var(--ink-3)' }}>
            <Icon name="arrowRight" size={12} style={{ transform: 'rotate(180deg)' }} />Back
          </button>
          <button className="btn sm accent" style={{ height: 32 }}>
            <Icon name="check" size={12} />Confirm reschedule
          </button>
        </div>
      }
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left: original + change summary ──────────────── */}
        <div style={{ flex: 1, padding: '22px 26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, borderRight: '1px solid var(--rule)' }}>

          {/* original booking */}
          <section>
            <SectionLabel>Original Booking</SectionLabel>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <Field label="Ref"        value="BKG-0583"                    mono />
                <Field label="Client"     value="L&T Infrastructure" />
                <Field label="Aircraft"   value="VT-HXE — AW169" />
                <Field label="Route"      value="MUM Juhu → Chennai Helipad" />
                <Field label="Date"       value="7 Jun 2026 · 14:00 IST"      mono tone="warn" />
                <Field label="Passengers" value="3 pax · 75 kg" />
              </div>
            </div>
          </section>

          {/* change summary */}
          <section>
            <SectionLabel>Proposed Change</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
              {[
                { field: 'Date',     from: '7 Jun 2026',  to: `${selectedDate} Jun 2026`, changed: selectedDate !== 7 },
                { field: 'Time',     from: '14:00 IST',   to: `${selectedTime} IST`,      changed: selectedTime !== '14:00' },
                { field: 'Aircraft', from: 'VT-HXE',      to: aircraft[selectedAircraft].reg, changed: selectedAircraft !== 0 },
              ].map((c, i, arr) => (
                <div key={c.field} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 24px 1fr', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < arr.length-1 ? '1px solid var(--rule-soft)' : 'none', background: c.changed ? 'color-mix(in oklab,var(--accent) 5%,var(--surface))' : 'var(--surface)' }}>
                  <span className="t-label" style={{ fontSize: 10.5 }}>{c.field}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: c.changed ? 'var(--ink-4)' : 'var(--ink-2)', textDecoration: c.changed ? 'line-through' : 'none' }}>{c.from}</span>
                  <Icon name="arrowRight" size={10} style={{ color: 'var(--ink-4)', justifySelf: 'center' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: c.changed ? 'var(--accent)' : 'var(--ink-2)', fontWeight: c.changed ? 500 : 400 }}>{c.to}</span>
                </div>
              ))}
            </div>
          </section>

          {/* notification */}
          <section>
            <SectionLabel>Client Notification</SectionLabel>
            <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 18, borderRadius: 9, background: 'var(--accent)', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Notify client by email</span>
              </div>
              <div className="field">
                <label className="field-label">Notify to</label>
                <div className="input" style={{ height: 32 }}>
                  <input defaultValue="travel@larsentoubro.com; subramanian.k@larsentoubro.com" style={{ flex: 1 }} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Message to client</label>
                <div style={{ border: '1px solid var(--rule-strong)', background: 'var(--surface-sunk)', borderRadius: 2, padding: '8px 10px', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, minHeight: 60 }}>
                  Dear Mr. Subramanian, your flight BKG-0583 (MUM→Chennai) has been rescheduled from 7 Jun 14:00 to {selectedDate} Jun {selectedTime} IST. Your aircraft and crew remain the same. Please confirm by replying to this email.
                </div>
              </div>
            </div>
          </section>

          {/* policy */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'color-mix(in oklab,var(--ok) 8%,var(--surface))', border: '1px solid color-mix(in oklab,var(--ok) 20%,var(--rule))', borderRadius: 3 }}>
            <Icon name="check" size={14} style={{ color: 'var(--ok)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ok)' }}>No penalty — rescheduling > 48 hrs before departure</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.45 }}>Original departure was 7 Jun 14:00. This change is within free-reschedule window. Client retains full booking value.</div>
            </div>
          </div>
        </div>

        {/* ── Right: date/time picker + aircraft ───────────── */}
        <div style={{ width: 400, flexShrink: 0, background: 'var(--surface)', overflowY: 'auto', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* date picker */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>New Date</div>
            <MiniCal selected={selectedDate} />
          </section>

          {/* time selector */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Departure Time</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {times.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTime(t)}
                  style={{
                    height: 32, borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.04em',
                    background: selectedTime === t ? 'var(--accent)' : 'var(--bg)',
                    color: selectedTime === t ? '#fff' : 'var(--ink-2)',
                    border: `1px solid ${selectedTime === t ? 'var(--accent)' : 'var(--rule-strong)'}`,
                    cursor: 'pointer', fontWeight: selectedTime === t ? 500 : 400,
                  }}
                >{t}</button>
              ))}
            </div>
          </section>

          {/* aircraft */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Aircraft</div>
            {aircraft.map((a, i) => (
              <div
                key={a.reg}
                onClick={() => setSelectedAircraft(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6,
                  border: `1.5px solid ${selectedAircraft === i ? 'var(--accent)' : 'var(--rule)'}`,
                  background: selectedAircraft === i ? 'var(--accent-soft-2)' : 'var(--bg)',
                  borderRadius: 3, cursor: 'pointer',
                }}
              >
                <div style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, border: `1.5px solid ${selectedAircraft === i ? 'var(--accent)' : 'var(--rule-strong)'}`, background: selectedAircraft === i ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedAircraft === i && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.05em', color: 'var(--ink)', fontWeight: 500 }}>{a.reg}</span>
                    <span className="t-meta" style={{ fontSize: 11 }}>{a.type}</span>
                  </div>
                  <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2, color: a.tone === 'warn' ? 'var(--warn)' : undefined }}>{a.note}</div>
                </div>
                <span className={`badge ${a.tone}`} style={{ height: 18 }}><span className={`dot ${a.tone}`} />{a.status}</span>
              </div>
            ))}
          </section>

          {/* summary */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 3, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="t-label">New Schedule</div>
            {[
              ['Date',     `${selectedDate} Jun 2026`],
              ['Time',     `${selectedTime} IST`],
              ['Aircraft', aircraft[selectedAircraft].reg + ' — ' + aircraft[selectedAircraft].type],
              ['Route',    'MUM Juhu → Chennai Helipad'],
              ['Penalty',  'None — free window'],
            ].map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="t-meta" style={{ fontSize: 11.5 }}>{k}</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: k === 'Penalty' ? 'var(--ok)' : 'var(--ink)' }}>{v}</span>
              </div>
            ))}
          </div>

          <button className="btn accent" style={{ width: '100%', height: 40, justifyContent: 'center', fontWeight: 500, fontSize: 14 }}>
            <Icon name="check" size={14} />Confirm Reschedule
          </button>
          <button className="btn" style={{ width: '100%', height: 32, justifyContent: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
            Discard changes
          </button>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { BookingsManageScreen, RescheduleScreen });
