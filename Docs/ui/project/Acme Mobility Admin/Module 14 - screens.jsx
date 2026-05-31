/* ─────────────────────────────────────────────────────────────
   Module 14 — Promotions, Coupons & Referrals
   Screens 14.1 → 14.3
   ───────────────────────────────────────────────────────────── */

const PROMOS = [
  { code: 'WELCOME20',  type: 'percent', val: '20%',  cap: '₹150', seg: 'First ride',     svc: 'Road',        used: 8420, budget: 78, status: 'active',  ends: '30 Jun', current: true },
  { code: 'MONSOON50',  type: 'flat',    val: '₹50',  cap: '—',    seg: 'All customers',  svc: 'Cab · Bike',  used: 14210,budget: 62, status: 'active',  ends: '15 Jun' },
  { code: 'AIRPORT100', type: 'flat',    val: '₹100', cap: '—',    seg: 'Frequent',       svc: 'Airport',     used: 2180, budget: 41, status: 'active',  ends: '31 Jul' },
  { code: 'HELIFIRST',  type: 'percent', val: '15%',  cap: '₹5,000',seg: 'First air ride',svc: 'Air',         used: 184,  budget: 28, status: 'active',  ends: '31 Dec' },
  { code: 'CORP2026',   type: 'percent', val: '10%',  cap: '—',    seg: 'Corporate',      svc: 'All',         used: 1820, budget: 54, status: 'active',  ends: '31 Dec' },
  { code: 'WEEKEND25',  type: 'percent', val: '25%',  cap: '₹120', seg: 'All customers',  svc: 'Road',        used: 9840, budget: 92, status: 'paused',  ends: 'Paused' },
  { code: 'DIWALI500',  type: 'flat',    val: '₹500', cap: '—',    seg: 'Loyalist',       svc: 'Air',         used: 0,    budget: 0,  status: 'draft',   ends: '01 Nov' },
];

// ──────────────────────────────────────────────────────────────
// 14.1 — Promotions List & Editor
// ──────────────────────────────────────────────────────────────
function PromotionsScreen() {
  return (
    <Shell
      active="promotions"
      breadcrumb="Catalog & Pricing · Growth"
      title="Promotions & coupons"
      subtitle="7 promos · 5 active · 1 paused · ₹6.2 L budget consumed this month"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Redemption analytics</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New promotion</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', minHeight: '100%' }}>
        {/* left list */}
        <div style={{ borderRight: '1px solid var(--rule)', overflow: 'auto' }}>
          <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* kpi strip */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {[
                ['Budget consumed', '₹ 6.2 L', '62% of ₹10L cap'],
                ['Redemptions',     '36,654',  'This month'],
                ['Blended CPA',     '₹ 84',    'Cost per new ride'],
              ].map(([k, v, m], i) => (
                <div key={k} style={{ padding: '16px 18px', borderRight: i < 2 ? '1px solid var(--rule)' : 'none' }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-serif)', fontSize: 22 }}>{v}</div>
                  <div className="t-meta" style={{ marginTop: 4 }}>{m}</div>
                </div>
              ))}
            </div>

            <div className="input" style={{ height: 32 }}>
              <Icon name="search" size={13} className="icon" />
              <input placeholder="Code, segment, service…" />
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              {PROMOS.map(p => (
                <div key={p.code} style={{
                  padding: '16px 18px',
                  borderBottom: '1px solid var(--rule-soft)',
                  borderLeft: '3px solid ' + (p.current ? 'var(--accent)' : 'transparent'),
                  background: p.current ? 'var(--surface-2)' : 'transparent',
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
                        background: 'var(--ink)', color: 'var(--surface)',
                        padding: '3px 8px', borderRadius: 2, letterSpacing: '0.05em',
                      }}>{p.code}</span>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{p.val}</span>
                      {p.cap !== '—' && <span className="t-meta">cap {p.cap}</span>}
                    </div>
                    {p.status === 'active' ? <span className="badge ok"><span className="dot ok" />Active</span> :
                     p.status === 'paused' ? <span className="badge warn"><span className="dot warn" />Paused</span> :
                     <span className="badge"><span className="dot pending" />Draft</span>}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 12, color: 'var(--ink-3)' }}>
                    <span>{p.seg}</span><span>·</span><span>{p.svc}</span><span>·</span><span>ends {p.ends}</span>
                  </div>
                  {/* budget meter */}
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: p.budget + '%', height: '100%', background: p.budget >= 85 ? 'var(--danger)' : p.budget >= 60 ? 'var(--warn)' : 'var(--accent)' }} />
                    </div>
                    <span className="t-meta" style={{ fontFamily: 'var(--font-mono)' }}>{p.budget}% · {p.used.toLocaleString()} used</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right editor */}
        <div style={{ overflow: 'auto', background: 'var(--surface)' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div className="t-label">Editing</div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500,
                  background: 'var(--ink)', color: 'var(--surface)',
                  padding: '4px 12px', borderRadius: 2, letterSpacing: '0.05em',
                }}>WELCOME20</span>
                <span className="badge ok"><span className="dot ok" />Active</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sm">Pause</button>
              <button className="btn accent sm">Save</button>
            </div>
          </div>

          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <FormSection title="Discount" description="First-ride incentive for new customers. Non-stackable with other promos.">
              <Row cols={2}>
                <Field label="Type" value="Percentage off" select />
                <Field label="Value" value="20%" />
              </Row>
              <Row cols={2}>
                <Field label="Max discount cap" value="₹ 150" />
                <Field label="Min trip value" value="₹ 100" />
              </Row>
            </FormSection>

            <FormSection title="Eligibility">
              <Row cols={2}>
                <Field label="Customer segment" value="First ride only" select />
                <Field label="Services" value="Cab · Bike · XL" select />
              </Row>
              <Row cols={2}>
                <Field label="Zones / routes" value="All BLR zones" select />
                <Field label="New customers only" value="Yes" select />
              </Row>
            </FormSection>

            <FormSection title="Limits & budget">
              <Row cols={3}>
                <Field label="Per-customer limit" value="1" />
                <Field label="Total redemptions cap" value="50,000" />
                <Field label="Validity" value="01 Apr – 30 Jun" />
              </Row>
              <div>
                <div className="t-label" style={{ marginBottom: 8 }}>Budget · ₹ 5,00,000</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 8, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: '78%', height: '100%', background: 'var(--warn)' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--warn)' }}>₹ 3.9 L · 78%</span>
                </div>
                <div className="t-meta" style={{ marginTop: 6 }}>Hard stop at budget — promo auto-pauses at ₹5L. Atomic decrement prevents overspend under concurrency.</div>
              </div>
            </FormSection>

            <div style={{ padding: '16px 18px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Live eligibility preview</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                A new customer booking a ₹620 Sedan ride in BLR would pay <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>₹496</span> (−₹124, under the ₹150 cap). Returning customers see "Not eligible · first ride only".
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 14.2 — Referral Program
// ──────────────────────────────────────────────────────────────
function ReferralScreen() {
  return (
    <Shell
      active="promotions"
      breadcrumb="Catalog & Pricing · Growth · Referrals"
      title="Referral program"
      subtitle="Active · referrer + referee rewards · fraud guards on"
      actions={
        <>
          <button className="btn sm">Fraud log</button>
          <button className="btn sm">Pause program</button>
          <button className="btn accent sm">Save changes</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24 }}>
        {/* config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* reward flow diagram */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '24px 26px' }}>
            <div className="t-label" style={{ marginBottom: 16 }}>Reward flow</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* referrer */}
              <div style={{ flex: 1, padding: '18px', border: '1px solid var(--rule)', borderRadius: 3, textAlign: 'center', background: 'var(--surface-2)' }}>
                <div className="avatar lg" style={{ margin: '0 auto', background: 'var(--accent-soft)', color: 'var(--accent)' }}>R</div>
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 500 }}>Referrer</div>
                <div className="t-meta" style={{ marginTop: 2 }}>shares code</div>
                <div style={{ marginTop: 10, fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--accent)' }}>₹ 100</div>
                <div className="t-meta">wallet credit</div>
              </div>
              {/* arrow */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--ink-3)' }}>
                <Icon name="arrowRight" size={18} />
                <span className="t-meta" style={{ whiteSpace: 'nowrap' }}>after 1st ride</span>
              </div>
              {/* referee */}
              <div style={{ flex: 1, padding: '18px', border: '1px solid var(--accent)', borderRadius: 3, textAlign: 'center', background: 'var(--accent-soft-2)' }}>
                <div className="avatar lg" style={{ margin: '0 auto', background: 'var(--surface-sunk)' }}>N</div>
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 500 }}>New customer</div>
                <div className="t-meta" style={{ marginTop: 2 }}>signs up + rides</div>
                <div style={{ marginTop: 10, fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--accent)' }}>₹ 75</div>
                <div className="t-meta">off first ride</div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <FormSection title="Reward configuration">
              <Row cols={2}>
                <Field label="Referrer reward" value="₹ 100 · wallet credit" />
                <Field label="Referee reward"  value="₹ 75 · first-ride discount" />
              </Row>
              <Row cols={2}>
                <Field label="Qualifying event" value="Referee's first completed ride" select />
                <Field label="Reward delay"     value="On trip completion" select />
              </Row>
              <Row cols={2}>
                <Field label="Per-referrer cap · month" value="₹ 1,000 (10 referrals)" />
                <Field label="Program budget · month"   value="₹ 4,00,000" />
              </Row>
            </FormSection>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Fraud guards</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Self-referral detection',        'Same device / payment instrument', true],
                ['Device fingerprint collusion',   'Block clustered signups',          true],
                ['Velocity limit',                 'Max 3 referrals / referrer / day', true],
                ['Payment-instrument reuse',       'Block shared card across accounts',true],
                ['Manual review above',            '₹ 5,000 cumulative reward',        false],
              ].map(([k, m, on]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <Icon name={on ? 'check' : 'dot'} size={13} stroke={2.2} style={{ color: on ? 'var(--accent)' : 'var(--ink-4)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5 }}>{k}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{m}</div>
                  </div>
                  <div style={{
                    width: 32, height: 18, borderRadius: 9, padding: 2,
                    background: on ? 'var(--accent)' : 'var(--rule-strong)',
                    display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start',
                  }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Program performance · 30d</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                ['Referrals sent',    '4,820',   'var(--ink)'],
                ['Converted',         '1,842',   'var(--accent)'],
                ['Conversion rate',   '38.2%',   'var(--ink)'],
                ['Reward paid',       '₹ 2.84 L','var(--ink)'],
                ['New customers',     '1,842',   'var(--accent)'],
                ['CPA',               '₹ 154',   'var(--ink-2)'],
              ].map(([k, v, c]) => (
                <div key={k} style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-serif)', fontSize: 24, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Top referrers · 30d</div>
            {[
              ['Priya Iyer',   '12 converted', '₹ 1,000', true],
              ['Aarav Kapoor', '9 converted',  '₹ 900'],
              ['Hema Rao',     '7 converted',  '₹ 700'],
              ['Rohan Mehta',  '6 converted',  '₹ 600'],
            ].map(([n, c, r, cap], i) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--ink-3)', width: 20 }}>{i + 1}</span>
                <div className="avatar">{n.split(' ').map(x => x[0]).join('')}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{n}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{c}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{r}</div>
                  {cap && <div className="t-meta" style={{ color: 'var(--warn)' }}>at cap</div>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="t-label">Fraud flags · 30d</div>
                <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 22 }}>14 blocked</div>
              </div>
              <span className="badge danger"><span className="dot danger" />₹ 4,200 saved</span>
            </div>
            <div className="t-meta" style={{ marginTop: 8 }}>11 self-referral · 3 device collusion · all auto-blocked before payout.</div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 14.3 — Redemption Analytics
// ──────────────────────────────────────────────────────────────
function RedemptionAnalyticsScreen() {
  const series = [820, 1100, 980, 1240, 1180, 1420, 1680, 1520, 1840, 1720, 2010, 1980, 2210, 2080];
  const w = 880, h = 220, padX = 40, padT = 16, padB = 28;
  const max = 2400;
  const bw = (w - padX - 20) / series.length;

  return (
    <Shell
      active="promotions"
      breadcrumb="Catalog & Pricing · Growth · Analytics"
      title="Redemption analytics"
      subtitle="All promotions · last 14 days · ₹6.2 L spent"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm"><Icon name="filter" size={13} />All promos <Icon name="chevDown" size={11} /></button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* kpis */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            ['Redemptions · 14d', '23,180', '+18% vs prior',     'var(--accent)'],
            ['Budget consumed',   '₹ 6.2 L', '62% of ₹10L cap',  'var(--warn)'],
            ['Avg discount',      '₹ 27',    'Per redemption',     'var(--ink-2)'],
            ['New customers',     '8,420',   'From first-ride codes','var(--accent)'],
            ['Blended CPA',       '₹ 84',    'Target ≤ ₹100',      'var(--accent)'],
          ].map(([k, v, m, c], i) => (
            <div key={k} style={{ padding: '18px 22px', borderRight: i < 4 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 28 }}>{v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: c }}>{m}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>
          {/* chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Redemptions per day</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Rolling 14 days · trending up</h3>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 220 }}>
                {[0,1,2,3,4].map(i => <line key={i} x1={padX} x2={w-20} y1={padT + i*(h-padT-padB)/4} y2={padT + i*(h-padT-padB)/4} stroke="var(--rule-soft)" />)}
                {['2.4K','1.8K','1.2K','0.6K'].map((l, i) => (
                  <text key={l} x={padX-6} y={padT + (i+1)*(h-padT-padB)/4 + 3} textAnchor="end" fill="var(--ink-3)" style={{ font: '10px IBM Plex Mono' }}>{l}</text>
                ))}
                {series.map((v, i) => {
                  const bh = (v / max) * (h - padT - padB);
                  return (
                    <g key={i}>
                      <rect x={padX + i * bw + 3} y={h - padB - bh} width={bw - 6} height={bh}
                        fill={i === series.length - 2 ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 45%, var(--surface-2))'} />
                      {i % 2 === 0 && <text x={padX + i * bw + bw/2} y={h - 10} textAnchor="middle" fill="var(--ink-3)" style={{ font: '9px IBM Plex Mono' }}>{15 + Math.floor(i/2)}</text>}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* by promo */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">By promo · spend share</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Where the budget goes</h3>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['MONSOON50',  38, '₹ 2.36 L'],
                ['WEEKEND25',  24, '₹ 1.49 L'],
                ['WELCOME20',  18, '₹ 1.12 L'],
                ['AIRPORT100', 11, '₹ 0.68 L'],
                ['CORP2026',   6,  '₹ 0.37 L'],
                ['HELIFIRST',  3,  '₹ 0.18 L'],
              ].map(([code, pct, amt]) => (
                <div key={code}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{code}</span>
                    <span className="t-meta">{amt} · {pct}%</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: pct + '%', height: '100%', background: 'var(--accent)' }} />
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

Object.assign(window, { PromotionsScreen, ReferralScreen, RedemptionAnalyticsScreen, PROMOS });
