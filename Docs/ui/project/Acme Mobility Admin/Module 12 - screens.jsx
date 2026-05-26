/* ─────────────────────────────────────────────────────────────
   Module 12 — Catalog Management (Classes, Zones, Routes)
   Screens 12.1 → 12.4
   ───────────────────────────────────────────────────────────── */

// ──────────────────────────────────────────────────────────────
// 12.1 — Vehicle Classes
// ──────────────────────────────────────────────────────────────
function VehicleClassesScreen() {
  const classes = [
    { code: 'BIKE_STD',   name: 'Bike',           seats: 1, desc: '2-wheeler · single pillion · helmet provided',          fare: '₹4.5 / km',  zones: 12, active: true },
    { code: 'SEDAN_STD',  name: 'Sedan',          seats: 4, desc: 'Compact sedan · AC · airport-eligible',                  fare: '₹15 / km',   zones: 12, active: true },
    { code: 'SEDAN_XL',   name: 'Sedan XL',       seats: 4, desc: 'Larger sedan · extra legroom · airport-eligible',         fare: '₹18 / km',   zones: 12, active: true, current: true },
    { code: 'XL_6',       name: 'XL · 6-seat',    seats: 6, desc: 'SUV · 6 seats · luggage capacity 3 large bags',           fare: '₹22 / km',   zones: 12, active: true },
    { code: 'XL_PREMIUM', name: 'XL Premium',     seats: 6, desc: 'Premium SUV · leather · 6 seats · airport tier',          fare: '₹28 / km',   zones: 8,  active: true },
    { code: 'RENTAL_4H',  name: 'Rental · 4h',    seats: 4, desc: '4 hours / 40 km package · per-hour and per-km excess',    fare: '₹2,400 pkg', zones: 6,  active: true },
    { code: 'RENTAL_8H',  name: 'Rental · 8h',    seats: 4, desc: '8 hours / 80 km package',                                  fare: '₹4,200 pkg', zones: 6,  active: true },
    { code: 'OUTSTN_OW',  name: 'Outstation OW',  seats: 4, desc: 'One-way outstation · per-km slab + driver allowance',     fare: '₹12 / km',   zones: 6,  active: true },
    { code: 'OUTSTN_RT',  name: 'Outstation RT',  seats: 4, desc: 'Round-trip outstation · minimum km guarantee',            fare: '₹13 / km',   zones: 6,  active: true },
    { code: 'BIKE_FAST',  name: 'Bike · Express', seats: 1, desc: 'Higher-priority bike · 1.2× base · helmet provided',      fare: '₹5.5 / km',  zones: 4,  active: false },
  ];

  return (
    <Shell
      active="catalog"
      breadcrumb="Catalog & Pricing · Vehicle classes"
      title="Vehicle classes"
      subtitle="10 classes · 9 active · drives pricing, dispatch eligibility, customer-facing labels"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Aircraft types</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New class</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24 }}>
        {/* left list */}
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label">All classes · 10</div>
              <button className="btn sm ghost icon"><Icon name="filter" size={13} /></button>
            </div>
            {classes.map(c => (
              <div key={c.code} style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--rule-soft)',
                borderLeft: '3px solid ' + (c.current ? 'var(--accent)' : 'transparent'),
                background: c.current ? 'var(--surface-2)' : 'transparent',
                cursor: 'pointer',
                opacity: c.active ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--ink)' }}>{c.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{c.fare}</span>
                </div>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, padding: '2px 6px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 2, color: 'var(--ink-2)' }}>{c.code}</span>
                  <span className="t-meta">{c.seats}-pax · in {c.zones} zones</span>
                  {!c.active && <span className="badge"><span className="dot pending" />Off</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* right editor */}
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="t-label">Editing</div>
                <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.018em' }}>Sedan XL</h2>
                <div className="t-meta" style={{ marginTop: 4 }}>SEDAN_XL · referenced by active pricing in 12 zones · last edited 14 Apr 2026 by Sana Reyes</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn sm">Clone</button>
                <button className="btn sm">Discard</button>
                <button className="btn accent sm">Save</button>
              </div>
            </div>

            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 26 }}>
              <FormSection title="Identity" description="Stable code drives pricing and dispatch eligibility — do not edit once published. Display name is customer-facing.">
                <Row cols={3}>
                  <Field label="Stable code"   value="SEDAN_XL" />
                  <Field label="Display name"  value="Sedan XL" />
                  <Field label="Sort order"    value="030" />
                </Row>
                <Field label="Short description" value="Larger sedan · extra legroom · airport-eligible" />
              </FormSection>

              <FormSection title="Specifications" description="Used by the manifest, dispatch eligibility, and the customer-facing class card.">
                <Row cols={4}>
                  <Field label="Seats"           value="4" />
                  <Field label="Luggage · large" value="2" />
                  <Field label="AC"              value="Required" select />
                  <Field label="Pet-friendly"    value="No" select />
                </Row>
              </FormSection>

              <FormSection title="Eligibility · dispatch" description="Drivers and vehicles must meet all criteria to be eligible for this class.">
                <Row cols={3}>
                  <Field label="Vehicle type"        value="Sedan body · ≥ 4 doors" />
                  <Field label="Min year of make"     value="2018" />
                  <Field label="Min driver rating"   value="4.4 ★" />
                </Row>
                <Row cols={3}>
                  <Field label="Airport-eligible"    value="Yes" select />
                  <Field label="Permit"              value="Commercial · valid" />
                  <Field label="Max acceptable age (vehicle)" value="8 years" />
                </Row>
              </FormSection>

              <FormSection title="Pricing reference">
                <div style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Icon name="tag" size={16} style={{ color: 'var(--ink-3)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>Live pricing rule · v12 · Bengaluru</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>Base ₹100 · per-km ₹18 · per-min ₹2 · min fare ₹120 · surge cap 1.8×</div>
                  </div>
                  <button className="btn sm">Open pricing →</button>
                </div>
              </FormSection>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 12.2 — Service Zones · polygon editor
// ──────────────────────────────────────────────────────────────
function ServiceZonesScreen() {
  // Stylised BLR map with zone polygons
  return (
    <Shell
      active="catalog"
      breadcrumb="Catalog & Pricing · Service zones"
      title="Service zones · Bengaluru"
      subtitle="12 zones · 3 surge active · 2 drafts pending review"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export GeoJSON</button>
          <button className="btn sm">Validate geometry</button>
          <button className="btn sm">Discard draft</button>
          <button className="btn sm accent">Publish v8</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', height: '100%' }}>
        {/* left zone list */}
        <aside style={{ borderRight: '1px solid var(--rule)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Zones · 12</div>
            <h3 style={{ margin: '4px 0 8px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Bengaluru</h3>
            <div className="input" style={{ height: 32 }}>
              <Icon name="search" size={13} className="icon" />
              <input placeholder="Filter zones…" />
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {[
              { id: 'Z-N1', n: 'MG Road',         tax: 'KA · Urban', s: 7,  surge: '1.0×', edit: false },
              { id: 'Z-N3', n: 'Sadashivnagar',   tax: 'KA · Urban', s: 7,  surge: '1.0×' },
              { id: 'Z-N4', n: 'Indiranagar',     tax: 'KA · Urban', s: 7,  surge: '1.2×', edit: true },
              { id: 'Z-N6', n: 'Hebbal · KIAL',   tax: 'KA · Airport', s: 8, surge: '1.3×' },
              { id: 'Z-S1', n: 'HSR Layout',      tax: 'KA · Urban', s: 7,  surge: '1.8×' },
              { id: 'Z-S2', n: 'Koramangala',     tax: 'KA · Urban', s: 7,  surge: '1.3×' },
              { id: 'Z-S3', n: 'Bommanahalli',    tax: 'KA · Urban', s: 7,  surge: '1.1×' },
              { id: 'Z-S4', n: 'Banashankari',    tax: 'KA · Urban', s: 6,  surge: '1.0×' },
              { id: 'Z-E1', n: 'CV Raman Nagar',  tax: 'KA · Urban', s: 6,  surge: '1.1×' },
              { id: 'Z-E2', n: 'Whitefield',      tax: 'KA · Urban', s: 7,  surge: '1.6×' },
              { id: 'Z-W1', n: 'Rajajinagar',     tax: 'KA · Urban', s: 6,  surge: '1.0×' },
              { id: 'Z-W3', n: 'Yeshwantpur',     tax: 'KA · Urban', s: 7,  surge: '1.0×' },
            ].map(z => (
              <div key={z.id} style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--rule-soft)',
                borderLeft: '3px solid ' + (z.edit ? 'var(--accent)' : 'transparent'),
                background: z.edit ? 'var(--surface-2)' : 'transparent',
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' }}>{z.id}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: z.surge === '1.0×' ? 'var(--ink-3)' : z.surge >= '1.6×' ? 'var(--danger)' : 'var(--warn)' }}>{z.surge}</span>
                </div>
                <div style={{ marginTop: 3, fontSize: 13 }}>{z.n}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>{z.tax} · {z.s} services</div>
              </div>
            ))}
          </div>
        </aside>

        {/* center map */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 800 720" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', background: 'var(--surface-sunk)', display: 'block' }}>
            <defs>
              <pattern id="zg" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0 L0 0 0 40" stroke="var(--rule)" strokeWidth="0.5" fill="none" />
              </pattern>
            </defs>
            <rect width="800" height="720" fill="url(#zg)" />

            {/* coastline / arterial */}
            <g stroke="var(--rule-strong)" strokeWidth="1.2" fill="none">
              <path d="M-20 220 Q200 200 380 240 T 820 270" />
              <path d="M-20 460 Q220 480 480 440 T 820 420" />
              <path d="M180 -20 Q220 220 280 380 T 320 740" />
              <path d="M540 -20 Q520 200 580 380 T 620 740" />
            </g>

            {/* zone polygons */}
            {[
              { id: 'Z-N1', pts: '320 160 460 160 460 240 360 260 320 220', c: 'var(--ink-3)',  label: { x: 390, y: 200 } },
              { id: 'Z-N3', pts: '120 120 280 120 280 220 180 240',          c: 'var(--ink-3)',  label: { x: 200, y: 180 } },
              { id: 'Z-N4', pts: '320 270 460 270 460 360 360 380 320 340', c: 'var(--accent)', label: { x: 390, y: 320 }, active: true },
              { id: 'Z-N6', pts: '500 120 660 120 680 220 540 240 500 180', c: 'var(--ink-3)',  label: { x: 580, y: 180 } },
              { id: 'Z-S1', pts: '320 390 460 390 460 490 360 510 320 460', c: 'var(--danger)', label: { x: 390, y: 450 } },
              { id: 'Z-S2', pts: '180 390 300 390 300 490 200 510 180 460', c: 'var(--warn)',   label: { x: 240, y: 440 } },
              { id: 'Z-S3', pts: '320 530 460 530 460 620 360 640 320 600', c: 'var(--ink-3)',  label: { x: 390, y: 580 } },
              { id: 'Z-S4', pts: '180 530 300 530 300 620 200 640 180 600', c: 'var(--ink-3)',  label: { x: 240, y: 580 } },
              { id: 'Z-E1', pts: '500 270 620 270 620 360 540 380 500 340', c: 'var(--ink-3)',  label: { x: 560, y: 320 } },
              { id: 'Z-E2', pts: '540 390 700 390 700 490 620 510 540 460', c: 'var(--warn)',   label: { x: 620, y: 440 } },
              { id: 'Z-W1', pts: '40 270 160 270 160 360 80 380 40 340',     c: 'var(--ink-3)',  label: { x: 100, y: 320 } },
              { id: 'Z-W3', pts: '40 390 160 390 160 490 80 510 40 460',     c: 'var(--ink-3)',  label: { x: 100, y: 440 } },
            ].map(z => (
              <g key={z.id}>
                <polygon points={z.pts}
                  fill={z.active ? 'color-mix(in oklab, var(--accent) 12%, transparent)' : z.c === 'var(--accent)' ? 'color-mix(in oklab, var(--accent) 6%, transparent)' : z.c === 'var(--danger)' ? 'color-mix(in oklab, var(--danger) 8%, transparent)' : z.c === 'var(--warn)' ? 'color-mix(in oklab, var(--warn) 8%, transparent)' : 'color-mix(in oklab, var(--ink) 4%, transparent)'}
                  stroke={z.c}
                  strokeWidth={z.active ? 2 : 1}
                  strokeDasharray={z.active ? '0' : '3 4'}
                />
                <text x={z.label.x} y={z.label.y} textAnchor="middle" fill="var(--ink)" style={{ font: '600 11px IBM Plex Mono', letterSpacing: '0.10em' }}>{z.id}</text>
              </g>
            ))}

            {/* vertex handles on active zone Z-N4 */}
            {[[320,270],[460,270],[460,360],[360,380],[320,340]].map(([x,y], i) => (
              <g key={i}>
                <rect x={x-4} y={y-4} width="8" height="8" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.4" />
              </g>
            ))}
            {/* between-vertex handles (smaller) */}
            {[[390,270],[460,315],[410,370],[340,360],[320,305]].map(([x,y], i) => (
              <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" opacity="0.5" />
            ))}
          </svg>

          {/* toolbar floating */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            background: 'var(--surface)', border: '1px solid var(--rule-strong)',
            boxShadow: 'var(--shadow-2)',
            display: 'flex', alignItems: 'center',
          }}>
            {[
              { i: 'arrowRight', l: 'Move', on: true },
              { i: 'plus', l: 'Add vertex' },
              { i: 'close', l: 'Remove' },
              { i: 'layers', l: 'Draw new' },
              { i: 'refresh', l: 'Undo' },
            ].map((t, i) => (
              <button key={t.l} className="btn ghost" style={{
                height: 36, borderRadius: 0, padding: '0 12px',
                borderRight: i < 4 ? '1px solid var(--rule)' : 'none',
                background: t.on ? 'var(--surface-2)' : 'transparent',
                color: t.on ? 'var(--ink)' : 'var(--ink-2)',
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase',
              }}><Icon name={t.i} size={12} /> {t.l}</button>
            ))}
          </div>

          {/* validation pill */}
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 12, alignItems: 'center',
            background: 'var(--surface)', border: '1px solid var(--rule)',
            padding: '8px 14px', boxShadow: 'var(--shadow-2)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink-3)',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="dot ok" /> Geometry valid</span>
            <span style={{ width: 1, height: 12, background: 'var(--rule)' }} />
            <span>Area · 18.4 km²</span>
            <span style={{ width: 1, height: 12, background: 'var(--rule)' }} />
            <span>5 vertices</span>
          </div>
        </div>

        {/* right editor */}
        <aside style={{ borderLeft: '1px solid var(--rule)', background: 'var(--surface)', padding: '20px 22px' }}>
          <div className="t-label">Editing zone</div>
          <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.018em' }}>Z-N4 · Indiranagar</h3>
          <div className="t-meta" style={{ marginTop: 4 }}>Draft v8 · last saved 12m ago</div>

          <div style={{ height: 1, background: 'var(--rule)', margin: '18px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label className="field-label">Display name</label>
              <div className="input"><input defaultValue="Indiranagar" /></div>
            </div>
            <div className="field">
              <label className="field-label">Tax jurisdiction</label>
              <div className="input"><input defaultValue="KA · Urban · BBMP" readOnly /><Icon name="chevDown" size={14} className="icon" /></div>
            </div>
            <Row cols={2}>
              <div className="field">
                <label className="field-label">Priority</label>
                <div className="input"><input defaultValue="40" /></div>
              </div>
              <div className="field">
                <label className="field-label">Surge cap</label>
                <div className="input"><input defaultValue="1.8×" /></div>
              </div>
            </Row>

            <div>
              <div className="t-label" style={{ marginBottom: 8 }}>Active services</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Bike','Sedan','Sedan XL','XL 6','XL Premium','Rental','Outstation OW'].map((s, i) => (
                  <span key={s} style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.10em', textTransform: 'uppercase',
                    padding: '4px 8px', borderRadius: 2,
                    background: i < 6 ? 'var(--accent-soft)' : 'var(--surface-2)',
                    color: i < 6 ? 'var(--accent)' : 'var(--ink-3)',
                    border: '1px solid ' + (i < 6 ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' : 'var(--rule)'),
                  }}>{i < 6 ? '✓ ' : '+ '}{s}</span>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--accent-soft-2)', border: '1px solid color-mix(in oklab, var(--accent) 18%, var(--rule-strong))', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
                <Icon name="check" size={13} stroke={2.4} />
                <span className="t-label" style={{ padding: 0, color: 'var(--accent-ink)' }}>Geometry valid</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Polygon is closed and non-self-intersecting · no overlap conflicts with adjacent zones · 5 vertices, 18.4 km².
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 12.3 — Aircraft Types
// ──────────────────────────────────────────────────────────────
function AircraftTypesScreen() {
  const types = [
    { code: 'BELL_407',    name: 'Bell 407',           cat: 'Heli', seats: 6,  mtow: 2722, range: 324,  cruise: 133, ops: 2, ac: 3,  active: true },
    { code: 'BELL_412',    name: 'Bell 412',           cat: 'Heli', seats: 14, mtow: 5397, range: 365,  cruise: 122, ops: 1, ac: 1,  active: true },
    { code: 'H125',        name: 'Airbus H125',        cat: 'Heli', seats: 6,  mtow: 2250, range: 339,  cruise: 137, ops: 1, ac: 1,  active: true },
    { code: 'H145',        name: 'Airbus H145',        cat: 'Heli', seats: 9,  mtow: 3800, range: 351,  cruise: 137, ops: 1, ac: 1,  active: true },
    { code: 'EC130',       name: 'Eurocopter EC130',   cat: 'Heli', seats: 7,  mtow: 2500, range: 327,  cruise: 130, ops: 1, ac: 1,  active: true, current: true },
    { code: 'PHENOM_300',  name: 'Embraer Phenom 300', cat: 'Jet',  seats: 8,  mtow: 8150, range: 1971, cruise: 453, ops: 1, ac: 1,  active: true },
    { code: 'CJ3',         name: 'Cessna Citation CJ3',cat: 'Jet',  seats: 7,  mtow: 6291, range: 1820, cruise: 416, ops: 2, ac: 2,  active: true },
    { code: 'PC24',        name: 'Pilatus PC-24',      cat: 'Jet',  seats: 8,  mtow: 8005, range: 2000, cruise: 440, ops: 1, ac: 1,  active: true },
  ];

  return (
    <Shell
      active="catalog"
      breadcrumb="Catalog & Pricing · Aircraft types"
      title="Aircraft types"
      subtitle="8 types · 5 helicopters · 3 jets · 42 aircraft mapped"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Vehicle classes</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New type</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* kpi strip */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            ['Active types',    '8',     '5 heli · 3 jet'],
            ['Aircraft mapped', '42',    'Across 7 operators'],
            ['Heli range · avg','341 nm','Bell 412 longest'],
            ['Jet range · avg', '1,930 nm','PC-24 longest 2,000 nm'],
          ].map(([k, v, m], i) => (
            <div key={k} style={{ padding: '18px 22px', borderRight: i < 3 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 30 }}>{v}</div>
              <div className="t-meta" style={{ marginTop: 6 }}>{m}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Aircraft type</th>
                <th>Code</th>
                <th>Cat</th>
                <th>Seats</th>
                <th>MTOW</th>
                <th>Range · nm</th>
                <th>Cruise · kts</th>
                <th>Operators</th>
                <th>In fleet</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {types.map(t => (
                <tr key={t.code} className={t.current ? 'selected' : ''}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 28, borderRadius: 2,
                        background: t.cat === 'Jet' ? 'var(--ink)' : 'var(--accent)',
                        color: 'var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name={t.cat === 'Jet' ? 'plane' : 'helipad'} size={14} stroke={1.4} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{t.name}</div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{t.cat} · type certified</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 6px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 2, color: 'var(--ink-2)' }}>{t.code}</span>
                  </td>
                  <td><span className="badge">{t.cat}</span></td>
                  <td className="num">{t.seats}</td>
                  <td className="num">{t.mtow.toLocaleString()} kg</td>
                  <td className="num">{t.range.toLocaleString()}</td>
                  <td className="num">{t.cruise}</td>
                  <td className="num">{t.ops}</td>
                  <td className="num">{t.ac}</td>
                  <td>{t.active ? <span className="badge ok"><span className="dot ok" />Active</span> : <span className="badge"><span className="dot pending" />Off</span>}</td>
                  <td><button className="btn ghost icon sm"><Icon name="moreVert" size={14} /></button></td>
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
// 12.4 — Air Routes
// ──────────────────────────────────────────────────────────────
function AirRoutesScreen() {
  const routes = [
    { code: 'BLR-MYS', from: 'BLR-PAD · Bengaluru', to: 'MYS-PAD · Mysuru',  cat: 'Shuttle',    dist: 78,   dur: '42m',  ops: ['BlueSky'],                  active: true, current: true, flightsM: 184 },
    { code: 'BLR-CCJ', from: 'BLR-PAD · Bengaluru', to: 'CCJ · Coorg',       cat: 'On-demand',  dist: 102,  dur: '54m',  ops: ['BlueSky'],                  active: true,                  flightsM: 38  },
    { code: 'BLR-HMP', from: 'BLR-PAD · Bengaluru', to: 'HMP · Hampi',       cat: 'On-demand',  dist: 192,  dur: '1h 24m',ops: ['BlueSky'],                 active: true,                  flightsM: 22  },
    { code: 'BLR-CJB', from: 'BLR-PAD · Bengaluru', to: 'CJB · Coimbatore',  cat: 'On-demand',  dist: 178,  dur: '1h 18m',ops: ['BlueSky','Aerial Mobility'],active: true,                  flightsM: 14  },
    { code: 'BLR-KOC', from: 'BLR · HAL',           to: 'KOC · Kochi',       cat: 'Charter',    dist: 248,  dur: '1h 22m',ops: ['Skydeck','Aerial Mobility'],active: true,                  flightsM: 28  },
    { code: 'BLR-GOI', from: 'BLR · HAL',           to: 'GOI · Goa',         cat: 'Charter',    dist: 318,  dur: '1h 38m',ops: ['Aerial Mobility'],          active: true,                  flightsM: 18  },
    { code: 'BLR-BOM', from: 'BLR · HAL',           to: 'BOM · Mumbai',      cat: 'Charter',    dist: 458,  dur: '2h 10m',ops: ['Skydeck'],                  active: true,                  flightsM: 22  },
    { code: 'BLR-JAI', from: 'BLR · HAL',           to: 'JAI · Jaipur',      cat: 'Charter',    dist: 1180, dur: '2h 24m',ops: ['Skydeck','NimbusJet'],     active: true,                  flightsM: 8   },
    { code: 'BLR-DEL', from: 'BLR · HAL',           to: 'DEL · Delhi',       cat: 'VIP',        dist: 1218, dur: '2h 28m',ops: ['Skydeck'],                  active: true,                  flightsM: 4   },
    { code: 'BLR-CAH', from: 'BLR-PAD · Bengaluru', to: 'CAH · Chikmagalur', cat: 'On-demand',  dist: 132,  dur: '1h 4m', ops: [],                            active: false,                  flightsM: 0   },
  ];

  return (
    <Shell
      active="catalog"
      breadcrumb="Catalog & Pricing · Air routes"
      title="Air routes"
      subtitle="10 routes · 9 active · linked to 4 operators · 338 flights last 30d"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Map view</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New route</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        {/* left list */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="input" style={{ flex: 1, height: 32 }}>
              <Icon name="search" size={13} className="icon" />
              <input placeholder="Code, origin, destination…" />
            </div>
            <FilterChip label="Cat" value="All" />
            <FilterChip label="Operator" value="All" />
          </div>
          <table className="tbl">
            <thead><tr><th>Code</th><th>Origin → Destination</th><th>Category</th><th>Distance</th><th>Duration</th><th>Operators</th><th>30d</th><th>Status</th></tr></thead>
            <tbody>
              {routes.map((r, i) => (
                <tr key={r.code} className={r.current ? 'selected' : ''}>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' }}>{r.code}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      <span style={{ color: 'var(--ink)' }}>{r.from.split(' · ')[0]}</span>
                      <Icon name="arrowRight" size={11} style={{ color: 'var(--ink-4)' }} />
                      <span style={{ color: 'var(--ink-2)' }}>{r.to.split(' · ')[0]}</span>
                    </div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{r.from.split(' · ')[1]} → {r.to.split(' · ')[1]}</div>
                  </td>
                  <td>
                    <span className={'badge ' + (r.cat === 'Shuttle' ? 'ok' : r.cat === 'VIP' ? 'info' : r.cat === 'Charter' ? '' : '')}>
                      {r.cat === 'Shuttle' && <span className="dot ok" />}
                      {r.cat}
                    </span>
                  </td>
                  <td className="num">{r.dist} nm</td>
                  <td className="num">{r.dur}</td>
                  <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{r.ops.length ? r.ops.join(' · ') : '—'}</td>
                  <td className="num">{r.flightsM}</td>
                  <td>{r.active ? <span className="badge ok"><span className="dot ok" />Active</span> : <span className="badge"><span className="dot pending" />Draft</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* right detail */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Editing</div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>BLR-PAD → MYS-PAD</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>BLR-MYS · v4</span>
            </div>
          </div>
          {/* chart */}
          <div style={{ height: 280, borderBottom: '1px solid var(--rule)' }}>
            <FlightChart stops={[
              { x: 600, y: 140, code: 'VOBL', label: 'Bengaluru pad B' },
              { x: 200, y: 220, code: 'VOMY', label: 'Mysuru pad' },
            ]} />
          </div>

          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Row cols={3}>
              <Field label="Origin"      value="BLR-PAD · Bengaluru" />
              <Field label="Destination" value="MYS-PAD · Mysuru" />
              <Field label="Category"    value="Shuttle" select />
            </Row>
            <Row cols={3}>
              <Field label="Distance · nm" value="78" />
              <Field label="Block time"   value="42m" />
              <Field label="Eligible types" value="Bell 407 · H125 · EC130" />
            </Row>

            <div>
              <div className="t-label" style={{ marginBottom: 8 }}>Authorised operators</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { o: 'BlueSky Heliservices', on: true },
                  { o: 'Aerial Mobility',      on: false },
                  { o: 'Highland Helicopters', on: false },
                ].map(({ o, on }) => (
                  <span key={o} style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    background: on ? 'var(--accent-soft)' : 'var(--surface-2)',
                    color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
                    border: '1px solid ' + (on ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' : 'var(--rule)'),
                    borderRadius: 2,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <Icon name={on ? 'check' : 'plus'} size={11} stroke={2.2} />
                    {o}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12, color: 'var(--ink-2)' }}>
              Pricing linked · BLR-MYS · Bell 407 — per-seat ₹68,500 (shuttle) · positioning included · live since 14 Mar 2026.
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn">Discard</button>
              <button className="btn accent" style={{ flex: 1 }}>Save & publish v5</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, {
  VehicleClassesScreen, ServiceZonesScreen, AircraftTypesScreen, AirRoutesScreen,
});
