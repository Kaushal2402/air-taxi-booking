/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 14 — Pricing & Quotes
   14.1a  Pricing rules — base rates, surcharges, multipliers
   14.1b  Corporate agreements — client-specific discounts
   14.2   Quote template editor
   ───────────────────────────────────────────────────────────── */

// ─── Toggle switch ─────────────────────────────────────────────
function Toggle({ on }) {
  return (
    <div style={{ width: 32, height: 18, borderRadius: 9, background: on ? 'var(--accent)' : 'var(--rule-strong)', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: on ? 'flex-end' : 'flex-start', cursor: 'pointer', flexShrink: 0 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
    </div>
  );
}

// ─── Rate card ─────────────────────────────────────────────────
function RateCard({ aircraft, type, baseRate, perUnit, rateType, util, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)', gap: 0 }}>
      <div style={{ width: 100, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '0.05em', color: 'var(--ink)', fontWeight: 600 }}>{aircraft}</span>
      </div>
      <div style={{ width: 100, flexShrink: 0 }}>
        <span className="badge info" style={{ height: 18, fontSize: 9.5 }}>{type}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="t-meta" style={{ fontSize: 11 }}>{rateType}</span>
      </div>
      <div style={{ width: 130, flexShrink: 0, textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ok)', fontWeight: 600, letterSpacing: '0.02em' }}>₹{baseRate}</span>
        <span className="t-meta" style={{ marginLeft: 5, fontSize: 11 }}>{perUnit}</span>
      </div>
      <div style={{ width: 80, flexShrink: 0, textAlign: 'right', paddingRight: 12 }}>
        <span className="t-meta" style={{ fontSize: 11 }}>{util} flights</span>
      </div>
      <button className="btn sm icon" style={{ height: 26, width: 26, flexShrink: 0 }}><Icon name="settings" size={11} /></button>
    </div>
  );
}

// ─── Surcharge row ─────────────────────────────────────────────
function SurchargeRow({ label, value, basis, enabled, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)' }}>
      <Toggle on={enabled} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: enabled ? 'var(--ink)' : 'var(--ink-4)' }}>{label}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>{basis}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: enabled ? 'var(--ink-2)' : 'var(--ink-4)', letterSpacing: '0.03em' }}>{value}</span>
      </div>
      <button className="btn sm icon" style={{ height: 24, width: 24 }}><Icon name="settings" size={11} /></button>
    </div>
  );
}

// ─── Corp agreement row ────────────────────────────────────────
function CorpRow({ c, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 24px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)' }}>
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{c.client}</div>
        <div className="t-meta" style={{ fontSize: 10.5 }}>Since {c.since}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {c.routes.map(r => <span key={r} className="badge" style={{ height: 17, fontSize: 9.5 }}>{r}</span>)}
        </div>
      </div>
      <div style={{ width: 120, flexShrink: 0, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ok)', fontWeight: 600 }}>{c.discount}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>off standard</div>
      </div>
      <div style={{ width: 80, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{c.bookings}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>bookings YTD</div>
      </div>
      <div style={{ width: 110, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{c.expires}</div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>Agreement expires</div>
      </div>
      <div style={{ width: 80, flexShrink: 0 }}>
        <span className={`badge ${c.active ? 'ok' : 'warn'}`} style={{ height: 18 }}>
          <span className={`dot ${c.active ? 'ok' : 'warn'}`} />{c.active ? 'Active' : 'Expiring'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0, width: 110, justifyContent: 'flex-end' }}>
        <button className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>
        <button className="btn sm" style={{ height: 26 }}><Icon name="settings" size={11} /></button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 14.1a — Pricing Rules
// ─────────────────────────────────────────────────────────────
function PricingRulesScreen() {
  return (
    <Shell
      active="pricing"
      breadcrumb="Schedule & Pricing"
      title="Pricing & Quotes"
      subtitle="Helix Aviation · Base rates, surcharges, multipliers"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm"><Icon name="download" size={12} />Export</button>
          <button className="btn sm accent"><Icon name="plus" size={12} />Add rule</button>
        </div>
      }
    >
      {/* sub-nav tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--rule)', padding: '0 28px', background: 'var(--surface)', flexShrink: 0 }}>
        {[
          { id: 'rates',        label: 'Base rates' },
          { id: 'surcharges',   label: 'Surcharges' },
          { id: 'corporate',    label: 'Corporate agreements', count: 5 },
          { id: 'templates',    label: 'Quote templates', count: 3 },
        ].map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 14px', cursor: 'pointer', borderBottom: (t.id === 'rates' || t.id === 'surcharges') && t.id === 'rates' ? '2px solid var(--ink)' : '2px solid transparent', color: t.id === 'rates' ? 'var(--ink)' : 'var(--ink-3)', fontSize: 13, fontWeight: t.id === 'rates' ? 500 : 400, marginBottom: -1 }}>
            {t.label}
            {t.count && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--surface-sunk)', color: 'var(--ink-3)', border: '1px solid var(--rule-strong)' }}>{t.count}</span>}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* base rates */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="t-label">Base charter rates</span>
            <div style={{ flex: 1 }} />
            <span className="t-meta" style={{ fontSize: 11 }}>Last updated 1 Apr 2026</span>
            <button className="btn sm" style={{ height: 28 }}><Icon name="settings" size={11} />Edit all</button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', padding: '7px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)' }}>
              {[['Aircraft',100],['Type',100],['Rate description',0],['Base price',130,'right'],['Used (MTD)',80,'right'],['',26]].map(([l,w,a]) => (
                <div key={l} className="t-label" style={{ width: w||undefined, flex: !w?1:undefined, flexShrink: w?0:undefined, textAlign: a||'left', fontSize: 10 }}>{l}</div>
              ))}
            </div>
            <RateCard aircraft="AW169"    type="Heavy"   rateType="Full charter — up to 16 pax"  baseRate="1,85,000" perUnit="/ flight" util={4} />
            <RateCard aircraft="AW169"    type="Heavy"   rateType="Executive charter — up to 8 pax" baseRate="2,20,000" perUnit="/ flight" util={2} />
            <RateCard aircraft="AW169"    type="Heavy"   rateType="VIP charter — up to 8 pax"    baseRate="2,80,000" perUnit="/ flight" util={6} />
            <RateCard aircraft="EC135 T2" type="Medium"  rateType="Full charter — up to 7 pax"  baseRate="48,000"   perUnit="/ flight" util={12}/>
            <RateCard aircraft="EC135 T2" type="Medium"  rateType="Shuttle seat"                 baseRate="6,500"    perUnit="/ seat"   util={3} />
            <RateCard aircraft="AS350 B3" type="Light"   rateType="Full charter — up to 6 pax"  baseRate="38,000"   perUnit="/ flight" util={9} />
            <RateCard aircraft="AS350 B3" type="Light"   rateType="Aerial work — per hour"       baseRate="28,000"   perUnit="/ hr"     util={0}  last />
          </div>
        </section>

        {/* surcharges */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="t-label">Surcharges &amp; multipliers</span>
            <div style={{ flex: 1 }} />
            <button className="btn sm accent" style={{ height: 28 }}><Icon name="plus" size={11} />Add surcharge</button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <SurchargeRow label="Fuel surcharge"          value="₹95 / kg"   basis="Applied on estimated fuel burn per flight" enabled />
            <SurchargeRow label="Landing & parking — DEL" value="₹12,000"    basis="Safdarjung Airport · per landing" enabled />
            <SurchargeRow label="Landing & parking — HYD" value="₹9,500"     basis="BHEL Helipad · per landing" enabled />
            <SurchargeRow label="VIP ground handling"     value="₹6,500"     basis="Tarmac access, marshalling · when VIP tier selected" enabled />
            <SurchargeRow label="Night operations"        value="+15%"        basis="Applied on base rate · departures 20:00–06:00 IST" enabled />
            <SurchargeRow label="Weekend premium"         value="+8%"         basis="Applied on base rate · Saturday & Sunday" enabled />
            <SurchargeRow label="Remote helipad fee"      value="₹4,000"      basis="Per landing at non-ATC helipads" enabled />
            <SurchargeRow label="Cancellation (24–48 hr)" value="25% of fare" basis="Refund 75% if cancelled 24–48 hrs before departure" enabled />
            <SurchargeRow label="Cancellation (< 24 hr)"  value="No refund"   basis="Forfeit full booking value" enabled />
            <SurchargeRow label="GST"                     value="18%"         basis="Applied on applicable components per Indian tax law" enabled />
            <SurchargeRow label="Seasonal peak (Dec–Jan)" value="+20%"        basis="Holiday season multiplier — currently inactive" enabled={false} last />
          </div>
        </section>

        {/* info notice */}
        <div style={{ display: 'flex', gap: 10, padding: '11px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
          <Icon name="shield" size={14} style={{ color: 'var(--ink-4)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55 }}>Rate changes take effect on new bookings only. In-flight and accepted bookings retain the rate at time of quote. Acme Mobility platform fee (3%) is deducted from net payout and is not configurable here.</span>
        </div>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 14.1b — Corporate Agreements
// ─────────────────────────────────────────────────────────────
function CorporateAgreementsScreen() {
  const corps = [
    { client: 'Reliance Industries Ltd.',        since: 'Jan 2024', routes: ['MUM→DEL','MUM→HYD','MUM→PUNE'], discount: '12%',  bookings: 28, expires: '31 Dec 2026', active: true  },
    { client: 'Tata Consulting Services',         since: 'Mar 2024', routes: ['MUM→PUNE','MUM→HYD'],            discount: '8%',   bookings: 14, expires: '28 Feb 2027', active: true  },
    { client: 'Adani Group',                      since: 'Jun 2023', routes: ['MUM→DEL','MUM→GOA'],             discount: '10%',  bookings: 19, expires: '30 Jun 2026', active: false },
    { client: 'Mahindra & Mahindra',              since: 'Oct 2024', routes: ['MUM→GOA','MUM→PUNE'],            discount: '7%',   bookings: 8,  expires: '31 Oct 2026', active: true  },
    { client: 'HDFC Bank Executive Travel',       since: 'Apr 2025', routes: ['MUM→DEL','MUM→CHN','MUM→HYD'],  discount: '15%',  bookings: 11, expires: '31 Mar 2027', active: true  },
  ];

  return (
    <Shell
      active="pricing"
      breadcrumb="Schedule & Pricing"
      title="Corporate Agreements"
      subtitle="Helix Aviation · 5 agreements · 1 expiring soon"
      actions={
        <button className="btn sm accent"><Icon name="plus" size={12} />New agreement</button>
      }
    >
      {/* expiring banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 40, background: 'var(--warn-soft)', borderBottom: '1px solid color-mix(in oklab,var(--warn) 24%,var(--rule))', flexShrink: 0 }}>
        <Icon name="clock" size={13} style={{ color: 'var(--warn)', flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Adani Group agreement expires <b style={{ color: 'var(--warn)' }}>30 Jun 2026</b> — 25 days remaining. Renew to retain preferred pricing.</span>
        <div style={{ flex: 1 }} />
        <button className="btn sm" style={{ height: 28 }}>Renew →</button>
      </div>

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', background: 'var(--surface)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <div className="input" style={{ width: 240, height: 32 }}>
          <Icon name="search" size={13} className="icon" />
          <input placeholder="Search clients…" />
        </div>
        <FilterChip label="Status" value="All" />
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>5 agreements</span>
      </div>

      {/* col header */}
      <div style={{ display: 'flex', padding: '8px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        {[['Client',220],['Routes covered',0],['Discount',120,'center'],['Bookings YTD',80],['Expires',110],['Status',80],['',110,'right']].map(([l,w,a]) => (
          <div key={l} className="t-label" style={{ width: w||undefined, flex: !w?1:undefined, flexShrink: w?0:undefined, textAlign: a||'left' }}>{l}</div>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {corps.map((c, i) => <CorpRow key={c.client} c={c} last={i === corps.length-1} />)}
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 14.2 — Quote Template Editor
// ─────────────────────────────────────────────────────────────
function QuoteTemplateScreen() {
  const [tier, setTier] = React.useState('vip');

  const tiers = [
    { id: 'standard',  label: 'Standard charter' },
    { id: 'executive', label: 'Executive charter' },
    { id: 'vip',       label: 'VIP charter' },
  ];

  const lines = {
    standard:  [['Base charter rate','AW169 · standard',          185000],['Fuel surcharge','est. fuel burn',  28500],['Landing & parking','DEL Safdarjung', 12000],['Sub-total','',225500],['Platform fee','3%',6765],['GST','18%',40590],['Total','',272855]],
    executive: [['Base charter rate','AW169 · executive up to 8 pax', 220000],['Fuel surcharge','est. fuel burn',28500],['Landing & parking','DEL Safdarjung', 12000],['VIP ground handling','tarmac access',6500],['Sub-total','',267000],['Platform fee','3%',8010],['GST','18%',48060],['Total','',323070]],
    vip:       [['Base charter rate','AW169 · VIP up to 8 pax',   280000],['Fuel surcharge','est. fuel burn',  28500],['Landing & parking','DEL Safdarjung', 12000],['VIP ground handling','tarmac + escort',6500],['Catering','continental · 8 pax',9500],['Sub-total','',336500],['Platform fee','3%',10095],['GST','18%',60570],['Total','',407165]],
  };

  const fmt = v => v === '' ? '' : `₹${Number(v).toLocaleString('en-IN')}`;

  const rows = lines[tier];
  const totalIdx = rows.length - 1;

  return (
    <Shell
      active="pricing"
      breadcrumb="Schedule & Pricing / Quote Templates"
      title="Quote Template — MUM → DEL"
      subtitle="Edit default line items, rates and terms for new quotes on this route"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" style={{ height: 32, color: 'var(--ink-3)' }}>
            <Icon name="arrowRight" size={12} style={{ transform: 'rotate(180deg)' }} />Back
          </button>
          <button className="btn sm" style={{ height: 32 }}><Icon name="download" size={12} />Preview PDF</button>
          <button className="btn sm accent" style={{ height: 32 }}><Icon name="check" size={12} />Save template</button>
        </div>
      }
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left: template config ─────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 20, borderRight: '1px solid var(--rule)' }}>

          {/* tier selector */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Charter tier</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {tiers.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTier(t.id)}
                  style={{
                    height: 34, padding: '0 16px', borderRadius: 3, fontSize: 13, cursor: 'pointer',
                    background: tier === t.id ? 'var(--ink)' : 'var(--surface)',
                    color: tier === t.id ? 'var(--bg)' : 'var(--ink-3)',
                    border: `1px solid ${tier === t.id ? 'var(--ink)' : 'var(--rule-strong)'}`,
                    fontWeight: tier === t.id ? 500 : 400,
                  }}
                >{t.label}</button>
              ))}
            </div>
          </section>

          {/* line items editor */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className="t-label">Line items</span>
              <div style={{ flex: 1 }} />
              <button className="btn sm accent" style={{ height: 28 }}><Icon name="plus" size={11} />Add line</button>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* col head */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 28px', gap: 12, padding: '7px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)' }}>
                {['Description','Notes','Amount',''].map(l => <div key={l} className="t-label" style={{ fontSize: 10 }}>{l}</div>)}
              </div>
              {rows.map(([label, sub, val], i) => {
                const isTotal = i === totalIdx;
                const isSep   = label === 'Sub-total';
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 28px', gap: 12, padding: '9px 14px', borderBottom: i < rows.length-1 ? '1px solid var(--rule-soft)' : 'none', background: isTotal ? 'var(--surface-2)' : isSep ? 'color-mix(in oklab,var(--ok) 4%,var(--surface))' : 'transparent', alignItems: 'center', borderTop: isSep ? '1px solid var(--rule)' : undefined }}>
                    <div style={{ fontSize: isTotal ? 13.5 : 12.5, fontWeight: isTotal ? 600 : 400, color: 'var(--ink)' }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', fontStyle: sub ? undefined : 'italic' }}>{sub || '—'}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: isTotal ? 15 : 12.5, color: isTotal ? 'var(--ok)' : isSep ? 'var(--ink-2)' : 'var(--ink-3)', fontWeight: isTotal ? 700 : 400, letterSpacing: '0.02em' }}>{val === '' ? '' : fmt(val)}</div>
                    {!isTotal && !isSep
                      ? <button className="btn sm icon" style={{ height: 22, width: 22 }}><Icon name="close" size={9} /></button>
                      : <div />
                    }
                  </div>
                );
              })}
            </div>
          </section>

          {/* quote settings */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Default quote settings</div>
            <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Default validity</label>
                  <div className="input" style={{ height: 34 }}>
                    <input defaultValue="4 hours from sending" style={{ flex: 1 }} />
                    <Icon name="chevDown" size={13} className="icon" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Payment terms</label>
                  <div className="input" style={{ height: 34 }}>
                    <input defaultValue="50% advance · 50% on departure" style={{ flex: 1 }} />
                    <Icon name="chevDown" size={13} className="icon" />
                  </div>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Default boilerplate note</label>
                <div style={{ border: '1px solid var(--rule-strong)', background: 'var(--surface-sunk)', borderRadius: 2, padding: '8px 10px', minHeight: 52, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  This quote is valid for the specified period. Fare is inclusive of fuel surcharge and applicable taxes. Catering and ground handling as described above.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Toggle on={true} />
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Auto-attach aircraft specs to quote PDF</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Toggle on={false} />
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Include crew bios in quote PDF</span>
              </div>
            </div>
          </section>
        </div>

        {/* ── Right: live preview ───────────────────── */}
        <div style={{ width: 360, flexShrink: 0, background: 'var(--surface)', overflowY: 'auto', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="t-label">Quote preview</div>

          {/* mock quote PDF */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
            {/* header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', background: 'var(--ink)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', opacity: 0.7 }}>HELIX AVIATION</div>
                <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2, fontFamily: 'var(--font-mono)' }}>QUOTE TEMPLATE</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.7 }}>MUM → DEL</div>
                <div style={{ fontSize: 10, opacity: 0.5, fontFamily: 'var(--font-mono)', marginTop: 1 }}>{tiers.find(t => t.id === tier).label.toUpperCase()}</div>
              </div>
            </div>

            {/* body */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rows.map(([label, sub, val], i) => {
                const isTotal = i === totalIdx;
                const isSep   = label === 'Sub-total';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: isSep ? '1px solid var(--rule)' : undefined, paddingTop: isSep ? 6 : undefined, marginTop: isSep ? 4 : undefined }}>
                    <span style={{ fontSize: isTotal ? 13 : 11.5, color: isTotal ? 'var(--ink)' : 'var(--ink-3)', fontWeight: isTotal ? 600 : 400 }}>
                      {label}
                      {sub && !isTotal && !isSep && <span style={{ fontSize: 10, color: 'var(--ink-4)', marginLeft: 5 }}>{sub}</span>}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: isTotal ? 14 : 11.5, color: isTotal ? 'var(--ok)' : isSep ? 'var(--ink-2)' : 'var(--ink-4)', fontWeight: isTotal ? 700 : 400 }}>{val === '' ? '' : fmt(val)}</span>
                  </div>
                );
              })}
            </div>

            {/* footer */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)' }}>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', lineHeight: 1.5 }}>Valid 4 hours from sending · 50% advance, 50% on departure · Subject to aircraft availability</div>
            </div>
          </div>

          {/* tier summary */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 3, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div className="t-label">Template summary — {tiers.find(t=>t.id===tier).label}</div>
            {[
              ['Route',    'MUM Juhu → DEL Safdarjung'],
              ['Aircraft', 'VT-HXE — AW169'],
              ['Tier',      tiers.find(t=>t.id===tier).label],
              ['Total',    fmt(rows[totalIdx][2])],
            ].map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="t-meta" style={{ fontSize: 11.5 }}>{k}</span>
                <span style={{ fontFamily: k === 'Total' ? 'var(--font-mono)' : undefined, fontSize: k === 'Total' ? 14 : 12.5, fontWeight: k === 'Total' ? 600 : 500, color: k === 'Total' ? 'var(--ok)' : 'var(--ink)' }}>{v}</span>
              </div>
            ))}
          </div>

          <button className="btn accent" style={{ width: '100%', height: 38, justifyContent: 'center', fontWeight: 500 }}>
            <Icon name="check" size={13} />Save template
          </button>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { PricingRulesScreen, CorporateAgreementsScreen, QuoteTemplateScreen });
