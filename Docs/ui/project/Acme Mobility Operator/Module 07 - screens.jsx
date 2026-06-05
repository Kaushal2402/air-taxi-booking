/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 07 — Manifests
   7.1a  Manifests list — normal
   7.1b  Manifests list — overdue state
   7.2   Manifest detail + DGCA submission (BKG-0601)
   ───────────────────────────────────────────────────────────── */

// ─── Status badge for manifest ────────────────────────────────
function ManifestStatus({ s }) {
  const map = {
    'Draft':     'pending',
    'Submitted': 'info',
    'Approved':  'ok',
    'Overdue':   'danger',
    'Rejected':  'danger',
  };
  return (
    <span className={`badge ${map[s] || 'pending'}`} style={{ height: 20, fontSize: 10.5 }}>
      <span className={`dot ${map[s] || 'pending'}`} />{s}
    </span>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────
function ManTabBar({ tabs, active }) {
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

// ─── Column header ─────────────────────────────────────────────
function ColHead({ cols }) {
  return (
    <div style={{ display: 'flex', padding: '8px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
      {cols.map(([lbl, w, align]) => (
        <div key={lbl + w} className="t-label" style={{ width: w || undefined, flex: !w ? 1 : undefined, flexShrink: w ? 0 : undefined, textAlign: align || 'left' }}>{lbl}</div>
      ))}
    </div>
  );
}

// ─── Manifest list row ─────────────────────────────────────────
function ManRow({ m, last }) {
  const rowBg = m.status === 'Overdue' ? 'color-mix(in oklab,var(--danger-soft) 70%,transparent)' : 'transparent';
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 24px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)', background: rowBg }}>
      {/* ref */}
      <div style={{ width: 120, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.05em', color: 'var(--ink)', fontWeight: 500 }}>{m.ref}</span>
      </div>
      {/* route + date */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{m.from}</span>
          <Icon name="arrowRight" size={10} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{m.to}</span>
        </div>
        <div className="t-meta" style={{ fontSize: 11 }}>{m.date} · {m.time} · {m.reg} {m.type}</div>
      </div>
      {/* pax */}
      <div style={{ width: 80, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name="users" size={11} style={{ color: 'var(--ink-4)' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{m.pax} pax</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <Icon name="user" size={11} style={{ color: 'var(--ink-4)' }} />
          <span className="t-meta" style={{ fontSize: 11 }}>{m.crew} crew</span>
        </div>
      </div>
      {/* deadline */}
      <div style={{ width: 130, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: m.status === 'Overdue' ? 'var(--danger)' : 'var(--ink-3)', letterSpacing: '0.03em' }}>{m.deadline}</div>
        {m.deadlineSub && <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2, color: m.status === 'Overdue' ? 'var(--danger)' : undefined }}>{m.deadlineSub}</div>}
      </div>
      {/* status */}
      <div style={{ width: 110, flexShrink: 0 }}><ManifestStatus s={m.status} /></div>
      {/* actions */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0, width: 160, justifyContent: 'flex-end' }}>
        {m.actions}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 7.1 — Manifests List
// ─────────────────────────────────────────────────────────────
function ManifestsListScreen({ variant = 'normal' }) {
  const isOverdue = variant === 'overdue';

  const tabs = [
    { id: 'all',       label: 'All',       count: 8 },
    { id: 'draft',     label: 'Draft',     count: 3 },
    { id: 'submitted', label: 'Submitted', count: 2 },
    { id: 'approved',  label: 'Approved',  count: 2 },
    { id: 'overdue',   label: 'Overdue',   count: isOverdue ? 1 : 0 },
  ];

  const rows = [
    {
      ref: 'BKG-0601', from: 'MUM Juhu', to: 'DEL Safdarjung',
      date: '5 Jun 2026', time: '11:10', reg: 'VT-HXE', type: 'AW169',
      pax: 8, crew: 2,
      deadline: isOverdue ? 'Overdue' : '5 Jun · 10:10',
      deadlineSub: isOverdue ? '1 hr past deadline' : '1 hr before departure',
      status: isOverdue ? 'Overdue' : 'Draft',
      actions: isOverdue
        ? [<button key="s" className="btn sm danger" style={{ height: 26 }}><Icon name="alert" size={11} />Submit now</button>]
        : [<button key="s" className="btn sm accent" style={{ height: 26 }}><Icon name="upload" size={11} />Submit</button>, <button key="e" className="btn sm" style={{ height: 26 }}>Edit</button>],
    },
    {
      ref: 'BKG-0594', from: 'MUM Juhu', to: 'Shirdi Helipad',
      date: '5 Jun 2026', time: '13:00', reg: 'VT-HXD', type: 'EC135 T2',
      pax: 3, crew: 2,
      deadline: '5 Jun · 12:00', deadlineSub: '1 hr before departure',
      status: 'Draft',
      actions: [<button key="s" className="btn sm accent" style={{ height: 26 }}><Icon name="upload" size={11} />Submit</button>, <button key="e" className="btn sm" style={{ height: 26 }}>Edit</button>],
    },
    {
      ref: 'BKG-0598', from: 'MUM Juhu', to: 'Pune Heliport',
      date: '5 Jun 2026', time: '17:00', reg: 'VT-HXD', type: 'EC135 T2',
      pax: 4, crew: 2,
      deadline: '5 Jun · 16:00', deadlineSub: '1 hr before departure',
      status: 'Draft',
      actions: [<button key="s" className="btn sm accent" style={{ height: 26 }}><Icon name="upload" size={11} />Submit</button>, <button key="e" className="btn sm" style={{ height: 26 }}>Edit</button>],
    },
    {
      ref: 'BKG-0590', from: 'MUM Juhu', to: 'GOA North',
      date: '5 Jun 2026', time: '09:10', reg: 'VT-HXB', type: 'AS350 B3',
      pax: 4, crew: 2,
      deadline: '5 Jun · 08:10', deadlineSub: 'Submitted on time',
      status: 'Approved',
      actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>],
    },
    {
      ref: 'BKG-0588', from: 'MUM Juhu', to: 'GOA North',
      date: '8 Jun 2026', time: '11:00', reg: 'VT-HXE', type: 'AW169',
      pax: 4, crew: 2,
      deadline: '8 Jun · 10:00', deadlineSub: '3 days away',
      status: 'Submitted',
      actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="r" className="btn sm" style={{ height: 26 }}>Revise</button>],
    },
    {
      ref: 'BKG-0583', from: 'MUM Juhu', to: 'Pune Heliport',
      date: '5 Jun 2026', time: '06:30', reg: 'VT-HXD', type: 'EC135 T2',
      pax: 2, crew: 2,
      deadline: '5 Jun · 05:30', deadlineSub: 'Submitted on time',
      status: 'Approved',
      actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>],
    },
    {
      ref: 'BKG-0577', from: 'MUM Juhu', to: 'Pune Heliport',
      date: '5 Jun 2026', time: '16:00', reg: 'VT-HXE', type: 'AW169',
      pax: 3, crew: 2,
      deadline: '5 Jun · 15:00', deadlineSub: '4 hrs away',
      status: 'Submitted',
      actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="r" className="btn sm" style={{ height: 26 }}>Revise</button>],
    },
  ];

  return (
    <Shell
      active="manifest"
      breadcrumb="Operations"
      title="Manifests"
      subtitle={`Helix Aviation · 5 Jun 2026 · ${isOverdue ? '1 overdue · ' : ''}3 drafts pending submission`}
      actions={<button className="btn sm"><Icon name="download" size={12} />Export</button>}
    >
      <ManTabBar tabs={tabs} active={isOverdue ? 'overdue' : 'all'} />

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', background: 'var(--surface)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <div className="input" style={{ width: 240, height: 32 }}>
          <Icon name="search" size={13} className="icon" />
          <input placeholder="Search manifests, routes, refs…" />
        </div>
        <FilterChip label="Date" value="5 Jun 2026" />
        <FilterChip label="Aircraft" value="All" />
        <FilterChip label="Status" value="All" />
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>{rows.length} manifests</span>
      </div>

      {/* overdue strip */}
      {isOverdue && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 40, background: 'var(--danger-soft)', borderBottom: '1px solid color-mix(in oklab,var(--danger) 24%,var(--rule))', flexShrink: 0 }}>
          <Icon name="alert" size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 500 }}>BKG-0601 manifest overdue</span>
          <span style={{ width: 1, height: 14, background: 'color-mix(in oklab,var(--danger) 28%,var(--rule))' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Submission deadline was 10:10 — 1 hour past. DGCA compliance at risk. Submit immediately.</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm danger" style={{ height: 26 }}>Submit BKG-0601 →</button>
        </div>
      )}

      {/* table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <ColHead cols={[
          ['Ref',             120, 'left'],
          ['Route · Aircraft',  0, 'left'],
          ['Load',             80, 'left'],
          ['Submission deadline', 130, 'left'],
          ['Status',          110, 'left'],
          ['',                160, 'right'],
        ]} />
        <div>
          {rows.map((m, i) => (
            <ManRow key={m.ref} m={m} last={i === rows.length - 1} />
          ))}
        </div>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 7.2 — Manifest Detail + Submission (BKG-0601)
// ─────────────────────────────────────────────────────────────
function ManifestDetailScreen() {
  const pax = [
    { seat: 'P1', name: 'Nita Mehta',       dob: '12 Mar 1972', id: 'Passport · Z1234567', nat: 'Indian',  role: 'Lead', verified: true },
    { seat: 'P2', name: 'Anil Mehta',        dob: '3 Aug 1969',  id: 'Passport · Z1234568', nat: 'Indian',  role: '',     verified: true },
    { seat: 'P3', name: 'Priya Mehta',       dob: '5 Jan 1995',  id: 'Aadhaar · 9876 5432 1012', nat: 'Indian', role: '',  verified: true },
    { seat: 'P4', name: 'Rahul Mehta',       dob: '14 Jul 1997', id: 'Aadhaar · 8765 4321 0123', nat: 'Indian', role: '',  verified: true },
    { seat: 'P5', name: 'Suresh Kumar',      dob: '22 Sep 1980', id: 'Passport · M9876543', nat: 'Indian',  role: 'Security', verified: true },
    { seat: 'P6', name: 'Kavita Sharma',     dob: '8 Feb 1985',  id: 'Passport · M8765432', nat: 'Indian',  role: 'Security', verified: true },
    { seat: 'P7', name: 'James Whitmore',    dob: '30 Oct 1975', id: 'Passport · GB234567', nat: 'British', role: 'Guest', verified: true },
    { seat: 'P8', name: 'Preethi Narayanan', dob: '17 Dec 1990', id: 'Aadhaar · 7654 3210 9876', nat: 'Indian', role: 'Guest', verified: false },
  ];

  const crew = [
    { role: 'Captain',       name: 'Capt. Rohan Sharma',  license: 'ATPL-H · DGP-CPL-H-0421', medical: 'Class 1 · exp 15 Jan 2027', hours: '4,820 hrs on type' },
    { role: 'First Officer', name: 'F/O Kavya Mehta',     license: 'CPL-H · DGP-CPL-H-0812',  medical: 'Class 1 · exp 3 Aug 2026',  hours: '1,240 hrs on type' },
  ];

  const checklist = [
    { done: true,  item: 'All passenger IDs verified and on file' },
    { done: true,  item: 'Crew licenses and medicals current' },
    { done: true,  item: 'ATC flight plan filed (MUM–DEL · IFR)' },
    { done: true,  item: 'Aircraft ARC and certificate of registration attached' },
    { done: false, item: 'Ground handling confirmation at DEL Safdarjung' },
    { done: false, item: 'Security clearance for 2 armed escorts (Form CA-77)' },
  ];

  return (
    <Shell
      active="manifest"
      breadcrumb="Manifests / BKG-0601"
      title="Manifest — BKG-0601"
      subtitle="AW169 · VT-HXE · MUM Juhu → DEL Safdarjung · 5 Jun 2026 · 11:10 IST"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" style={{ height: 32, color: 'var(--ink-3)' }}>
            <Icon name="arrowRight" size={12} style={{ transform: 'rotate(180deg)' }} />Back
          </button>
          <button className="btn sm" style={{ height: 32 }}><Icon name="download" size={12} />Export PDF</button>
          <button className="btn sm accent" style={{ height: 32 }}><Icon name="upload" size={12} />Submit to DGCA</button>
        </div>
      }
    >
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', minHeight: 0 }}>

        {/* ── Left: pax + crew ──────────────────────────── */}
        <div style={{ flex: 1, padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 20, borderRight: '1px solid var(--rule)', overflowY: 'auto' }}>

          {/* flight summary */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Flight Summary</div>
            <div className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {[
                  ['Booking ref',  'BKG-0601',                  true],
                  ['Aircraft',     'VT-HXE — AW169',            false],
                  ['Route',        'MUM Juhu → DEL Safdarjung', false],
                  ['Departure',    '5 Jun 2026 · 11:10 IST',    false],
                ].map(([k,v,mono]) => (
                  <div key={k}>
                    <div className="t-label" style={{ marginBottom: 4 }}>{k}</div>
                    <span style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: 12.5, letterSpacing: mono ? '0.06em' : undefined, color: 'var(--ink)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* passenger manifest */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className="t-label">Passenger Manifest</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--ink)', color: 'var(--bg)' }}>8 PAX</span>
              <div style={{ flex: 1 }} />
              <button className="btn sm" style={{ height: 26 }}><Icon name="plus" size={11} />Add passenger</button>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* header */}
              <div style={{ display: 'flex', padding: '7px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)' }}>
                {[['Seat',42],['Name / DOB',0],['ID',0],['Nat.',70],['Role',80],['',32]].map(([l,w]) => (
                  <div key={l} className="t-label" style={{ width: w || undefined, flex: !w ? 1 : undefined, flexShrink: w ? 0 : undefined, fontSize: 10 }}>{l}</div>
                ))}
              </div>
              {pax.map((p, i) => (
                <div key={p.seat} style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', borderBottom: i < pax.length-1 ? '1px solid var(--rule-soft)' : 'none', background: !p.verified ? 'color-mix(in oklab,var(--warn-soft) 50%,transparent)' : 'transparent' }}>
                  <div style={{ width: 42, flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: '0.05em' }}>{p.seat}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>DOB {p.dob}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.id}</div>
                  </div>
                  <div style={{ width: 70, flexShrink: 0 }}>
                    <span className="t-meta" style={{ fontSize: 11 }}>{p.nat}</span>
                  </div>
                  <div style={{ width: 80, flexShrink: 0 }}>
                    {p.role && <span className="badge pending" style={{ height: 17, fontSize: 9.5 }}>{p.role}</span>}
                  </div>
                  <div style={{ width: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.verified
                      ? <Icon name="check" size={13} style={{ color: 'var(--ok)' }} />
                      : <Icon name="alert" size={13} style={{ color: 'var(--warn)' }} />
                    }
                  </div>
                </div>
              ))}
            </div>
            {/* unverified warning */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8, padding: '8px 12px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab,var(--warn) 25%,var(--rule))', borderRadius: 3 }}>
              <Icon name="alert" size={13} style={{ color: 'var(--warn)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--warn)' }}>P8 Preethi Narayanan — ID not yet verified. Upload Aadhaar copy before submitting.</span>
              <div style={{ flex: 1 }} />
              <button className="btn sm warn" style={{ height: 24, fontSize: 11 }}><Icon name="upload" size={10} />Upload</button>
            </div>
          </section>

          {/* crew manifest */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className="t-label">Crew Manifest</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--ink)', color: 'var(--bg)' }}>2</span>
            </div>
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              {crew.map((c, i) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderBottom: i < crew.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div className="avatar" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>{c.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{c.name}</span>
                      <span className="badge ok" style={{ height: 18, fontSize: 9.5 }}>{c.role}</span>
                    </div>
                    <div className="t-meta" style={{ fontSize: 10.5 }}>{c.license} · {c.medical}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="t-meta" style={{ fontSize: 10.5 }}>{c.hours}</div>
                  </div>
                  <Icon name="check" size={14} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Right: checklist + submit ──────────────────── */}
        <div style={{ width: 380, flexShrink: 0, background: 'var(--surface)', overflowY: 'auto', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* DGCA checklist */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>DGCA Submission Checklist</div>
            <div className="card" style={{ padding: '10px 14px' }}>
              {checklist.map((c, i, arr) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 0', borderBottom: i < arr.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div style={{ width: 16, height: 16, borderRadius: 2, flexShrink: 0, marginTop: 0, background: c.done ? 'var(--ok)' : 'var(--surface-sunk)', border: `1.5px solid ${c.done ? 'var(--ok)' : 'var(--rule-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.done && <Icon name="check" size={9} style={{ color: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 12, color: c.done ? 'var(--ink-3)' : 'var(--ink)', lineHeight: 1.45 }}>{c.item}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 10px', background: 'color-mix(in oklab,var(--warn) 8%,var(--surface))', border: '1px solid color-mix(in oklab,var(--warn) 22%,var(--rule))', borderRadius: 3 }}>
              <Icon name="alert" size={13} style={{ color: 'var(--warn)' }} />
              <span style={{ fontSize: 11.5, color: 'var(--warn)' }}>2 items incomplete — resolve before submitting</span>
            </div>
          </section>

          {/* submission settings */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Submission Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="field">
                <label className="field-label">Submit to</label>
                <div className="input">
                  <input defaultValue="DGCA + ATC Mumbai FIR" readOnly style={{ flex: 1 }} />
                  <Icon name="chevDown" size={14} className="icon" />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Submission method</label>
                <div className="input">
                  <input defaultValue="e-Filing portal (DGCA)" readOnly style={{ flex: 1 }} />
                  <Icon name="chevDown" size={14} className="icon" />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Remarks <span style={{ textTransform: 'none', letterSpacing: 0, fontStyle: 'italic', fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--ink-4)' }}>optional</span></label>
                <div style={{ border: '1px solid var(--rule-strong)', background: 'var(--surface-sunk)', borderRadius: 2, padding: '8px 10px', minHeight: 52, fontSize: 12.5, color: 'var(--ink-4)', lineHeight: 1.5 }}>2 CISF-cleared security personnel (armed) — CA-77 attached.</div>
              </div>
            </div>
          </section>

          {/* submission history */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { time: '10:42', who: 'You', action: 'Manifest created' },
                { time: '10:45', who: 'You', action: 'P1–P7 IDs uploaded and verified' },
                { time: '10:52', who: 'System', action: 'Deadline alert triggered (T–20 min)' },
              ].map((h, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: i < arr.length-1 ? '1px solid var(--rule-soft)' : 'none', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', width: 38, flexShrink: 0, marginTop: 2 }}>{h.time}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', flex: 1 }}><b style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{h.who}</b> · {h.action}</span>
                </div>
              ))}
            </div>
          </section>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 2 }}>
            <button className="btn accent" style={{ width: '100%', height: 40, justifyContent: 'center', fontWeight: 500, fontSize: 14 }}>
              <Icon name="upload" size={14} />Submit to DGCA
            </button>
            <button className="btn" style={{ width: '100%', height: 32, justifyContent: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
              <Icon name="download" size={12} />Export as PDF
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { ManifestsListScreen, ManifestDetailScreen });
