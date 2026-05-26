/* ─────────────────────────────────────────────────────────────
   Module 13 — Pricing & Fare Rules
   Screens 13.1 → 13.4
   ───────────────────────────────────────────────────────────── */

// ──────────────────────────────────────────────────────────────
// 13.1 — Road Fare Rules (Rule library + editor)
// ──────────────────────────────────────────────────────────────
function RoadFareRulesScreen() {
  const rules = [
    { id: 'PR-BLR-SXL-12', zone: 'BLR · 12 zones',    cls: 'Sedan XL',  base: 100, perKm: 18.0, perMin: 2.0, min: 120, surgeCap: 1.8, version: 'v12', current: true,  pub: '14 Apr 2026' },
    { id: 'PR-BLR-SED-09', zone: 'BLR · 12 zones',    cls: 'Sedan',     base: 70,  perKm: 15.0, perMin: 2.0, min: 90,  surgeCap: 1.8, version: 'v9',  pub: '02 Apr 2026' },
    { id: 'PR-BLR-XL6-08', zone: 'BLR · 12 zones',    cls: 'XL 6-seat', base: 140, perKm: 22.0, perMin: 2.5, min: 160, surgeCap: 1.8, version: 'v8',  pub: '11 Mar 2026' },
    { id: 'PR-BLR-BIK-11', zone: 'BLR · 12 zones',    cls: 'Bike',      base: 25,  perKm: 4.5,  perMin: 1.0, min: 30,  surgeCap: 1.6, version: 'v11', pub: '22 Mar 2026' },
    { id: 'PR-BLR-XLP-04', zone: 'BLR · 8 zones',     cls: 'XL Premium',base: 200, perKm: 28.0, perMin: 3.0, min: 240, surgeCap: 1.6, version: 'v4',  pub: '02 Feb 2026' },
    { id: 'PR-MUM-SED-06', zone: 'MUM · 9 zones',     cls: 'Sedan',     base: 80,  perKm: 17.0, perMin: 2.2, min: 100, surgeCap: 1.8, version: 'v6',  pub: '18 Feb 2026' },
    { id: 'PR-BLR-SXL-13', zone: 'BLR · 12 zones',    cls: 'Sedan XL',  base: 110, perKm: 19.0, perMin: 2.0, min: 130, surgeCap: 1.8, version: 'v13 · draft',  pub: '—', draft: true },
  ];

  return (
    <Shell
      active="pricing"
      breadcrumb="Catalog & Pricing · Pricing"
      title="Road fare rules"
      subtitle="38 active rules · 4 drafts · pricing engine v2.4"
      actions={
        <>
          <button className="btn sm"><Icon name="bolt" size={13} />Fare simulator</button>
          <button className="btn sm"><Icon name="archive" size={13} />Versions</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Draft rule</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '440px 1fr', minHeight: '100%' }}>
        {/* left: rule list */}
        <aside style={{ borderRight: '1px solid var(--rule)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 8 }}>
            <div className="input" style={{ flex: 1, height: 32 }}>
              <Icon name="search" size={13} className="icon" />
              <input placeholder="Filter rules…" />
            </div>
            <button className="btn ghost icon sm"><Icon name="filter" size={13} /></button>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {rules.map(r => (
              <div key={r.id} style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--rule-soft)',
                borderLeft: '3px solid ' + (r.current ? 'var(--accent)' : 'transparent'),
                background: r.current ? 'var(--surface-2)' : 'transparent',
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)' }}>{r.id}</span>
                  <span className={'badge ' + (r.draft ? 'warn' : r.current ? 'ok' : '')}>
                    {r.current && <span className="dot ok" />}
                    {r.draft ? 'Draft' : r.current ? 'Live' : 'Past'}
                  </span>
                </div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>{r.cls}</span>
                  <span className="t-meta">{r.version}</span>
                </div>
                <div className="t-meta" style={{ marginTop: 4, color: 'var(--ink-3)' }}>{r.zone}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                  <span>₹{r.base}</span>
                  <span>· ₹{r.perKm}/km</span>
                  <span>· {r.surgeCap}× cap</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* right: rule editor */}
        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div className="t-label">Editing rule · v12 · live</div>
              <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.018em' }}>
                Sedan XL · Bengaluru
              </h2>
              <div className="t-meta" style={{ marginTop: 4 }}>PR-BLR-SXL-12 · published 14 Apr 2026 by Sana Reyes · used by 8,210 trips this month</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sm"><Icon name="bolt" size={12} />Simulate</button>
              <button className="btn sm"><Icon name="copy" size={12} />Clone</button>
              <button className="btn sm">Cancel</button>
              <button className="btn accent sm">Save · v13 draft</button>
            </div>
          </div>

          {/* scope */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Scope · effective dating</div>
            </div>
            <div style={{ padding: '18px 22px' }}>
              <Row cols={4}>
                <Field label="Vehicle class" value="Sedan XL" select />
                <Field label="Service area"   value="BLR · 12 zones" select />
                <Field label="Effective from" value="14 Apr 2026 · 00:00" />
                <Field label="Effective to"   value="—" placeholder="Open-ended" />
              </Row>
            </div>
          </div>

          {/* base components */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Base components</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Fare = Base + Distance + Time + Waiting + Surge − Discounts + Taxes</h3>
            </div>
            <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { l: 'Base fare',         k: 'base',    v: '100',  unit: '₹',     m: 'Applied once per trip' },
                { l: 'Per km',            k: 'perkm',   v: '18.00',unit: '₹/km',  m: 'Live, after free km' },
                { l: 'Per minute',        k: 'permin',  v: '2.00', unit: '₹/min', m: 'Live, after free time' },
                { l: 'Minimum fare',      k: 'min',     v: '120',  unit: '₹',     m: 'Floor regardless of trip' },
                { l: 'Free km',           k: 'freekm',  v: '0',    unit: 'km',    m: 'Included in base' },
                { l: 'Free time',         k: 'freemin', v: '5',    unit: 'min',   m: 'Boarding allowance' },
                { l: 'Waiting · per min', k: 'wait',    v: '3.00', unit: '₹/min', m: 'After free time' },
                { l: 'Cancel fee',        k: 'cxl',     v: '50',   unit: '₹',     m: 'Post grace period' },
              ].map(c => (
                <div key={c.k}>
                  <div className="t-label" style={{ padding: 0 }}>{c.l}</div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <input defaultValue={c.v} style={{
                      width: '100%', padding: '8px 10px',
                      border: '1px solid var(--rule-strong)', borderRadius: 3,
                      background: 'var(--surface)', color: 'var(--ink)',
                      fontFamily: 'var(--font-mono)', fontSize: 16,
                    }} />
                    <span className="t-meta" style={{ whiteSpace: 'nowrap', color: 'var(--ink-3)' }}>{c.unit}</span>
                  </div>
                  <div className="t-meta" style={{ marginTop: 4, color: 'var(--ink-3)' }}>{c.m}</div>
                </div>
              ))}
            </div>
          </div>

          {/* surge + night */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                <div className="t-label">Surge configuration</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Demand-to-supply multiplier · capped at 1.8×</h3>
              </div>
              <div style={{ padding: '20px 22px' }}>
                {/* tier ladder */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, marginBottom: 16, height: 120, paddingTop: 12 }}>
                  {[
                    { ratio: '< 1.0', m: '1.0×', h: 30 },
                    { ratio: '1.0–1.2', m: '1.1×', h: 40 },
                    { ratio: '1.2–1.4', m: '1.3×', h: 56 },
                    { ratio: '1.4–1.6', m: '1.5×', h: 72 },
                    { ratio: '1.6–1.8', m: '1.7×', h: 92 },
                    { ratio: '> 1.8', m: '1.8×', h: 100, cap: true },
                  ].map((t, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                      <div style={{
                        height: t.h, margin: '0 4px',
                        background: t.cap ? 'var(--danger-soft)' : i === 0 ? 'var(--surface-2)' : 'color-mix(in oklab, var(--accent) ' + (i * 14) + '%, var(--surface-2))',
                        border: '1px solid ' + (t.cap ? 'var(--danger)' : 'var(--rule-strong)'),
                        borderRadius: '3px 3px 0 0',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                        paddingTop: 6,
                      }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: t.cap ? 'var(--danger)' : 'var(--ink-2)' }}>{t.m}</span>
                      </div>
                      <div className="t-meta" style={{ textAlign: 'center', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{t.ratio}</div>
                    </div>
                  ))}
                </div>
                <div className="t-meta" style={{ color: 'var(--ink-3)' }}>
                  Multiplier ladder applies live demand-to-supply ratio per zone. Hard cap is enforced by the pricing engine and the regulator setting in System Settings (Module 22).
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
                <div className="t-label">Time-of-day modifiers</div>
              </div>
              <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['Peak · morning',  '07:30 – 10:00',  '+15%'],
                  ['Peak · evening',  '17:00 – 20:30',  '+15%'],
                  ['Night',           '23:00 – 05:00',  '+25%'],
                  ['Airport surcharge','KIAL pickup/drop','+₹120 flat'],
                ].map(([k, w, v], i) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                    <span className="dot ok" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5 }}>{k}</div>
                      <div className="t-meta" style={{ marginTop: 2, fontFamily: 'var(--font-mono)' }}>{w}</div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 13.2 — Fare Simulator
// ──────────────────────────────────────────────────────────────
function FareSimulatorScreen() {
  return (
    <Shell
      active="pricing"
      breadcrumb="Catalog & Pricing · Pricing · Simulator"
      title="Fare simulator"
      subtitle="Run a hypothetical trip against any draft or live rule set · production engine"
      actions={
        <>
          <button className="btn sm">Reset</button>
          <button className="btn sm"><Icon name="copy" size={13} />Compare drafts</button>
          <button className="btn accent sm"><Icon name="bolt" size={13} />Run simulation</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '440px 1fr', gap: 24 }}>
        {/* left: inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Scenario</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Trip inputs</h3>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Row cols={2}>
                <Field label="Pickup zone" value="Z-N4 · Indiranagar" select />
                <Field label="Drop zone"   value="Z-N6 · KIAL" select />
              </Row>
              <Row cols={2}>
                <Field label="Distance · km"  value="38.4" />
                <Field label="Duration · min" value="34" />
              </Row>
              <Row cols={2}>
                <Field label="Waiting · min" value="3" />
                <Field label="Toll · ₹"      value="85" />
              </Row>
              <Row cols={2}>
                <Field label="Time of day" value="Evening peak · 17:42" select />
                <Field label="Day"         value="Weekday" select />
              </Row>
              <Row cols={2}>
                <Field label="Demand/Supply · pickup zone" value="1.3 (zone surge tier 3)" select />
                <Field label="Vehicle class"               value="Sedan XL" select />
              </Row>
              <Row cols={2}>
                <Field label="Promo code"  value="WELCOME20" />
                <Field label="Payment"     value="Card · pre-auth" select />
              </Row>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Rule set</div>
            </div>
            <div style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { l: 'Current · v12 (live)',          on: true,  meta: 'PR-BLR-SXL-12 · since 14 Apr 2026' },
                  { l: 'Draft · v13',                   on: false, meta: 'Higher base + per-km' },
                  { l: 'Prior · v11',                   on: false, meta: 'For regression check' },
                ].map(r => (
                  <div key={r.l} style={{
                    padding: '10px 12px',
                    border: '1px solid ' + (r.on ? 'var(--accent)' : 'var(--rule)'),
                    background: r.on ? 'var(--accent-soft-2)' : 'var(--surface)',
                    borderRadius: 3,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: '1px solid ' + (r.on ? 'var(--accent)' : 'var(--rule-strong)'),
                      background: r.on ? 'var(--accent)' : 'var(--surface)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>{r.on && <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{r.l}</div>
                      <div className="t-meta" style={{ marginTop: 2 }}>{r.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* right: result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* big total */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--accent)',
            boxShadow: '0 0 0 1px var(--accent)',
            padding: '24px 28px',
          }}>
            <div className="t-label">Computed fare · v12 (live)</div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 64, color: 'var(--ink)', letterSpacing: '-0.020em', lineHeight: 1 }}>₹ 1,276</span>
              <div>
                <div className="t-meta" style={{ color: 'var(--accent)' }}>+₹ 36 vs. estimate ₹1,240</div>
                <div className="t-meta" style={{ marginTop: 3 }}>v13 draft would charge ₹1,386 · +₹110</div>
              </div>
            </div>
          </div>

          {/* breakdown */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Breakdown</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Line items · with rule references</h3>
            </div>
            <table className="tbl">
              <thead><tr><th>Component</th><th>Rule</th><th>Inputs</th><th style={{ textAlign: 'right' }}>v12 · live</th><th style={{ textAlign: 'right' }}>v13 · draft</th></tr></thead>
              <tbody>
                {[
                  ['Base fare',           'PR-BLR-SXL-12 · base',          '—',                        '₹ 100',   '₹ 110'],
                  ['Distance · 38.4 km',  '₹18 / km',                       '38.4 × 18',                '₹ 691',   '₹ 730'],
                  ['Time · 34 min',       '₹2 / min',                       '34 × 2',                   '₹ 68',    '₹ 68'],
                  ['Waiting · 3 min',     '₹3 / min (after 5 free)',        '0 × 3',                    '₹ 0',     '₹ 0'],
                  ['Evening peak',        '+15% time window',               'Applied · 17:00–20:30',    '+₹ 116',  '+₹ 122'],
                  ['Surge · 1.3×',        'Zone tier 3 · capped at 1.8×',   '1.3× on 855',               '+₹ 257',  '+₹ 270'],
                  ['Airport surcharge',   '+₹120 · KIAL drop',              'KIAL T2 drop detected',     '+₹ 120',  '+₹ 120'],
                  ['Toll',                'Auto · electronic toll',         'KIAL approach',             '+₹ 85',   '+₹ 85'],
                  ['Promo · WELCOME20',   'PROMO-WELCOME20 · 20% cap ₹150', 'Eligible · capped',         '−₹ 150',  '−₹ 150'],
                  ['Tax · GST 5%',        'IN · ride hailing',              'On taxable amount',         '+₹ 60',   '+₹ 65'],
                ].map(([k, rule, inp, v12, v13], i) => (
                  <tr key={i}>
                    <td>{k}</td>
                    <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{rule}</td>
                    <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{inp}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{v12}</td>
                    <td className="num" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>{v13}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--surface-2)' }}>
                  <td colSpan="3" style={{ fontWeight: 500 }}>Total</td>
                  <td className="num" style={{ textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 22 }}>₹ 1,276</td>
                  <td className="num" style={{ textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink-3)' }}>₹ 1,386</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 13.3 — Air Fare Rules
// ──────────────────────────────────────────────────────────────
function AirFareRulesScreen() {
  const rules = [
    { id: 'PR-AIR-BLR-MYS-S', route: 'BLR-PAD → MYS-PAD',  type: 'Bell 407',       cat: 'Shuttle', perSeat: '₹ 68,500', hourly: '—',          surcharge: '—', current: true,  version: 'v6' },
    { id: 'PR-AIR-BLR-CCJ',   route: 'BLR-PAD → Coorg',    type: 'Bell 407',       cat: 'On-demand',perSeat: '—',         hourly: '₹ 1,84,000', surcharge: 'Fuel · 4%', version: 'v3' },
    { id: 'PR-AIR-BLR-KOC',   route: 'BLR · HAL → KOC',    type: 'CJ3',            cat: 'Charter', perSeat: '—',         hourly: '₹ 4,80,000', surcharge: 'Posit. ₹90K', version: 'v4' },
    { id: 'PR-AIR-BLR-JAI',   route: 'BLR · HAL → JAI',    type: 'Phenom 300',     cat: 'VIP',     perSeat: '—',         hourly: '₹ 12,80,000',surcharge: 'Night ₹60K', version: 'v2' },
  ];

  return (
    <Shell
      active="pricing"
      breadcrumb="Catalog & Pricing · Pricing · Air"
      title="Air fare rules"
      subtitle="14 air rules · per-route per-type · supports shuttle, charter, VIP"
      actions={
        <>
          <button className="btn sm"><Icon name="bolt" size={13} />Simulate flight</button>
          <button className="btn sm">Surge config</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New air rule</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Air fare rules</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Per route · per aircraft type</h3>
          </div>
          <table className="tbl">
            <thead><tr><th>Route</th><th>Type</th><th>Category</th><th>Per seat</th><th>Hourly</th><th>Surcharges</th><th>Version</th></tr></thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} className={r.current ? 'selected' : ''}>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{r.route}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{r.id}</div>
                  </td>
                  <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{r.type}</td>
                  <td><span className={'badge ' + (r.cat === 'Shuttle' ? 'ok' : r.cat === 'VIP' ? 'info' : '')}>{r.cat}</span></td>
                  <td className="num">{r.perSeat}</td>
                  <td className="num">{r.hourly}</td>
                  <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{r.surcharge}</td>
                  <td><span className="t-meta">{r.version}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* editor */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="t-label">Editing</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>BLR-PAD → MYS-PAD · Bell 407 · Shuttle</h3>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sm">Discard</button>
              <button className="btn accent sm">Publish v7</button>
            </div>
          </div>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Row cols={2}>
              <Field label="Per-seat base"          value="68,500"  right={<span className="t-meta">₹</span>} />
              <Field label="Minimum pax for departure" value="2" />
            </Row>
            <Row cols={2}>
              <Field label="Baggage · per kg"   value="40"     right={<span className="t-meta">₹/kg</span>} />
              <Field label="Excess baggage cap" value="20"     right={<span className="t-meta">kg</span>} />
            </Row>
            <Row cols={2}>
              <Field label="Positioning charge"  value="Included" select />
              <Field label="Night-halt charge"   value="₹ 60,000 · flat" />
            </Row>
            <Row cols={2}>
              <Field label="Fuel surcharge"      value="4% of base · adaptive" />
              <Field label="Tax · GST"           value="5%" />
            </Row>

            <div style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12.5, color: 'var(--ink-2)' }}>
              Live computed example · 4 pax, 24 kg baggage, no night halt, surcharge applied:
              <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                4 × ₹68,500 + 24 × ₹40 + 4% fuel + 5% GST = <span style={{ color: 'var(--accent)' }}>₹ 2,98,200</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 13.4 — Taxes
// ──────────────────────────────────────────────────────────────
function TaxesScreen() {
  const taxes = [
    { name: 'GST · Ride hailing',     rate: 5.0, hsn: '9964',  jur: 'IN · Central',     incl: 'Exclusive',  active: true, used: '38,210 trips this month' },
    { name: 'GST · Air transport',    rate: 5.0, hsn: '9964',  jur: 'IN · Central',     incl: 'Exclusive',  active: true, used: '184 flights this month' },
    { name: 'GST · Rental package',   rate: 12.0,hsn: '9966',  jur: 'IN · Central',     incl: 'Exclusive',  active: true, used: '1,218 rentals' },
    { name: 'KA · Toll · KIAL access',rate: 0,   hsn: 'TOLL',  jur: 'KA · Airport',     incl: 'Pass-through',active: true, used: '8,420 KIAL trips' },
    { name: 'Maharashtra CGST',       rate: 2.5, hsn: '9964',  jur: 'MH · State',       incl: 'Exclusive',  active: true, used: 'Active in MUM' },
    { name: 'Maharashtra SGST',       rate: 2.5, hsn: '9964',  jur: 'MH · State',       incl: 'Exclusive',  active: true, used: 'Active in MUM' },
    { name: 'IGST · Inter-state',     rate: 5.0, hsn: '9964',  jur: 'IN · Inter-state', incl: 'Exclusive',  active: false, used: 'Reserved' },
  ];

  return (
    <Shell
      active="pricing"
      breadcrumb="Catalog & Pricing · Pricing · Taxes"
      title="Tax rules"
      subtitle="7 rules · GST/HSN-coded · per jurisdiction"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Tax statement export</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New tax rule</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* hero */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            ['Active rules',       '6',          'Of 7 configured'],
            ['Tax collected · MTD','₹ 4.18 L',   'Across 9 jurisdictions'],
            ['Rentals · 12% GST',  '₹ 1.42 L',   'Higher slab'],
            ['Pass-through',       '₹ 0.62 L',   'Tolls only · not Acme revenue'],
          ].map(([k, v, m], i) => (
            <div key={k} style={{ padding: '18px 22px', borderRight: i < 3 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 26 }}>{v}</div>
              <div className="t-meta" style={{ marginTop: 6 }}>{m}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead><tr><th>Tax</th><th>HSN/SAC</th><th>Rate</th><th>Jurisdiction</th><th>Inclusive / Exclusive</th><th>In use</th><th>Status</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {taxes.map((t, i) => (
                <tr key={t.name} className={i === 0 ? 'selected' : ''}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon name="tag" size={14} style={{ color: 'var(--ink-3)' }} />
                      <span style={{ fontSize: 13 }}>{t.name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 6px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 2 }}>{t.hsn}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: t.rate >= 10 ? 'var(--warn)' : 'var(--ink)' }}>
                      {t.rate === 0 ? 'Pass-through' : t.rate + '%'}
                    </span>
                  </td>
                  <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{t.jur}</td>
                  <td><span className="badge">{t.incl}</span></td>
                  <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{t.used}</td>
                  <td>{t.active ? <span className="badge ok"><span className="dot ok" />Active</span> : <span className="badge"><span className="dot pending" />Reserved</span>}</td>
                  <td><button className="btn ghost icon sm"><Icon name="moreVert" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* compliance callout */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div className="t-label" style={{ marginBottom: 8 }}>Compliance</div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Invoices auto-generated · GSTN-ready</h3>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              Each completed trip produces a tax-compliant customer invoice and a tax-compliant driver statement. Inter-state trips automatically apply IGST. Pass-through items (tolls) are itemised separately for transparency.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="check" size={13} stroke={2.4} style={{ color: 'var(--accent)' }} />
              <div style={{ flex: 1, fontSize: 12.5 }}>Invoices issued · April</div>
              <span className="num" style={{ color: 'var(--ink-2)' }}>1,84,210</span>
            </div>
            <div style={{ padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="check" size={13} stroke={2.4} style={{ color: 'var(--accent)' }} />
              <div style={{ flex: 1, fontSize: 12.5 }}>Driver tax statements · April</div>
              <span className="num" style={{ color: 'var(--ink-2)' }}>1,520</span>
            </div>
            <div style={{ padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="alert" size={13} style={{ color: 'var(--warn)' }} />
              <div style={{ flex: 1, fontSize: 12.5 }}>HSN review queue</div>
              <span className="num" style={{ color: 'var(--warn)' }}>3 pending</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, {
  RoadFareRulesScreen, FareSimulatorScreen, AirFareRulesScreen, TaxesScreen,
});
