/* ─────────────────────────────────────────────────────────────
   Module 23 — Integrations & API Keys
   Screens 23.1 → 23.4
   23.1 Provider Connections · 23.2 API Keys · 23.3 Webhooks · 23.4 Health & Status
   ───────────────────────────────────────────────────────────── */

// ── shared little bits ───────────────────────────────────────
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

function MaskedSecret({ value, mono = true, copyable = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 6px 0 12px', border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface-sunk)' }}>
      <span className={mono ? 't-mono' : ''} style={{ fontSize: 12, color: 'var(--ink-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      <button className="btn icon sm ghost" title="Reveal"><Icon name="eye" size={13} /></button>
      {copyable && <button className="btn icon sm ghost" title="Copy"><Icon name="copy" size={13} /></button>}
    </div>
  );
}

function connTone(s) {
  return s === 'connected' ? 'ok' : s === 'degraded' ? 'warn' : s === 'error' ? 'danger' : 'pending';
}

// ──────────────────────────────────────────────────────────────
// 23.1 — Provider Connections
// ──────────────────────────────────────────────────────────────
const PROVIDERS = [
  { cat: 'Payments',  icon: 'wallet',   name: 'Razorpay',   alt: 'Stripe · PayU · Cashfree', cred: 'rzp_live_••••••••8Q2c', status: 'connected', last: '2m ago', region: 'IN · INR' },
  { cat: 'Maps & Geo',icon: 'map',      name: 'Google Maps',alt: 'Mapbox · HERE',            cred: 'AIza••••••••••••pVf0', status: 'connected', last: '5m ago', region: 'Directions · Places' },
  { cat: 'SMS',       icon: 'phone',    name: 'MSG91',      alt: 'Twilio · Gupshup',         cred: 'msg91_••••••••3a17', status: 'connected', last: '1m ago', region: 'IN · DLT-approved' },
  { cat: 'Email',     icon: 'envelope', name: 'SendGrid',   alt: 'SES · Postmark',           cred: 'SG.••••••••••••wuT', status: 'degraded',  last: '12m ago', region: '3.1% bounce' },
  { cat: 'WhatsApp',  icon: 'phone',    name: 'Gupshup BSP',alt: 'Twilio · 360dialog',       cred: 'gs_••••••••••df90', status: 'connected', last: '3m ago', region: 'Verified · tier 2' },
  { cat: 'KYC',       icon: 'shield',   name: 'HyperVerge', alt: 'Signzy · IDfy',            cred: 'hv_••••••••••71kc', status: 'connected', last: '8m ago', region: 'Aadhaar · PAN · DL' },
  { cat: 'Telephony', icon: 'phone',    name: 'Exotel',     alt: 'Knowlarity · Twilio',      cred: 'exo_••••••••22ab', status: 'error',     last: 'failed', region: 'Masked calling' },
  { cat: 'Storage',   icon: 'archive',  name: 'AWS S3',     alt: 'GCS · Wasabi',             cred: 'AKIA••••••••••N7QX', status: 'connected', last: '1m ago', region: 'ap-south-1 · WORM' },
  { cat: 'Analytics', icon: 'pie',      name: 'Mixpanel',   alt: 'Amplitude · GA4',          cred: 'mp_••••••••••8c0e', status: 'connected', last: '6m ago', region: 'Events · funnels' },
];

function ProviderConnectionsScreen() {
  return (
    <Shell
      active="integrations"
      breadcrumb="System · Integrations"
      title="Provider connections"
      subtitle="Swappable adapters · credentials vaulted & masked · server-validated before save"
      actions={
        <>
          <button className="btn sm"><Icon name="refresh" size={13} />Test all</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Connect provider</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <KpiStrip cols={4} items={[
          ['Connected',      '7 / 9', 'Across 9 categories', 'var(--accent)'],
          ['Degraded',       '1',     'SendGrid · bounce rate', 'var(--warn)'],
          ['Errored',        '1',     'Exotel · auth failed', 'var(--danger)'],
          ['Last full test', '14:38', 'All categories probed', 'var(--ink-2)'],
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: 280, height: 32 }}>
            <Icon name="search" size={13} className="icon" />
            <input placeholder="Search providers, categories…" />
          </div>
          <FilterChip label="Status" value="All" />
          <FilterChip label="Category" value="All" />
          <div style={{ flex: 1 }} />
          <span className="t-meta">Credentials are write-only · reveal-once on creation</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {PROVIDERS.map(p => {
            const tone = connTone(p.status);
            return (
              <div key={p.cat} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px 12px' }}>
                  <div style={{ width: 38, height: 38, border: '1px solid var(--rule)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--ink-2)', flexShrink: 0 }}>
                    <Icon name={p.icon} size={18} stroke={1.4} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-label" style={{ padding: 0 }}>{p.cat}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '-0.01em' }}>{p.name}</span>
                    </div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{p.region}</div>
                  </div>
                  <span className={'badge ' + tone}><span className={'dot ' + tone} />{p.status}</span>
                </div>

                <div style={{ padding: '0 18px 12px' }}>
                  <MaskedSecret value={p.cred} />
                </div>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--rule-soft)', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="t-meta">{p.status === 'error' ? <span style={{ color: 'var(--danger)' }}>Last test failed</span> : <>Last test · {p.last}</>}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn sm" style={{ height: 28 }}>Test</button>
                    <button className="btn sm" style={{ height: 28 }}>Manage<Icon name="chevRight" size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 23.2 — API Keys
// ──────────────────────────────────────────────────────────────
const API_KEYS = [
  { name: 'Mobile App · Production',  prefix: 'pk_live_8f21…', env: 'live', scopes: ['bookings:read', 'bookings:write', 'pricing:read'], created: '12 Jan 2026', used: '8s ago', status: 'active' },
  { name: 'Partner Portal',           prefix: 'pk_live_a4c2…', env: 'live', scopes: ['bookings:read', 'customers:read'], created: '04 Mar 2026', used: '2m ago', status: 'active' },
  { name: 'Analytics Pipeline (ETL)', prefix: 'sk_live_b102…', env: 'live', scopes: ['reports:read', 'payments:read'], created: '21 Feb 2026', used: '1h ago', status: 'active' },
  { name: 'Staging Sandbox',          prefix: 'pk_test_9f4a…', env: 'test', scopes: ['*'], created: '02 May 2026', used: '5m ago', status: 'active' },
  { name: 'Legacy Webhook Consumer',  prefix: 'sk_live_7e30…', env: 'live', scopes: ['webhooks:read'], created: '18 Aug 2025', used: '34 days ago', status: 'stale' },
  { name: 'Ops Tooling (deprecated)', prefix: 'sk_live_2210…', env: 'live', scopes: ['drivers:read', 'dispatch:write'], created: '09 Nov 2025', used: 'revoked', status: 'revoked' },
];

function keyStatusBadge(s) {
  return s === 'active' ? <span className="badge ok"><span className="dot ok" />Active</span>
    : s === 'stale' ? <span className="badge warn"><span className="dot warn" />Stale</span>
    : <span className="badge"><span className="dot pending" />Revoked</span>;
}

function ApiKeysScreen() {
  return (
    <Shell
      active="integrations"
      breadcrumb="System · Integrations · API keys"
      title="API keys"
      subtitle="Developer & partner credentials · scoped · reveal-once · rotation with grace window"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Usage log</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Create key</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <KpiStrip cols={4} items={[
          ['Active keys',   '5',      '4 live · 1 test', 'var(--ink-2)'],
          ['Calls · 24h',   '1.84 M', '99.97% success', 'var(--accent)'],
          ['Rate-limited',  '212',    '1 key · partner portal', 'var(--warn)'],
          ['Oldest secret', '286 d',  'Rotation due', 'var(--warn)'],
        ]} />

        {/* reveal-once banner */}
        <div style={{ background: 'var(--accent-soft)', border: '1px solid color-mix(in oklab, var(--accent) 30%, var(--rule-strong))', borderRadius: 3, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Icon name="key" size={16} style={{ color: 'var(--accent-ink)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>New key generated · <span className="t-mono">pk_live_8f21d4c2e90a…b7Q2c</span></div>
            <div className="t-meta" style={{ marginTop: 3 }}>Copy it now — this is the only time the full secret is shown. It cannot be retrieved later.</div>
          </div>
          <button className="btn sm" style={{ height: 30 }}><Icon name="copy" size={13} />Copy</button>
          <button className="btn icon sm ghost"><Icon name="close" size={14} /></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: 280, height: 32 }}>
            <Icon name="search" size={13} className="icon" />
            <input placeholder="Search keys by name, prefix, scope…" />
          </div>
          <FilterChip label="Environment" value="Live" count="1" />
          <FilterChip label="Status" value="All" />
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Key</th>
                <th>Scopes</th>
                <th style={{ width: 80 }}>Env</th>
                <th style={{ width: 120 }}>Created</th>
                <th style={{ width: 120 }}>Last used</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 150 }}></th>
              </tr>
            </thead>
            <tbody>
              {API_KEYS.map((k, i) => (
                <tr key={i} style={{ opacity: k.status === 'revoked' ? 0.55 : 1 }}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{k.name}</span>
                      <span className="t-mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{k.prefix}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {k.scopes.map(s => (
                        <span key={s} className="t-mono" style={{ fontSize: 10.5, padding: '2px 7px', border: '1px solid var(--rule)', borderRadius: 2, background: 'var(--surface-2)', color: s === '*' ? 'var(--warn)' : 'var(--ink-2)' }}>{s}</span>
                      ))}
                    </div>
                  </td>
                  <td><span className={'badge ' + (k.env === 'live' ? 'info' : '')}>{k.env}</span></td>
                  <td className="t-meta">{k.created}</td>
                  <td className="t-meta">{k.used}</td>
                  <td>{keyStatusBadge(k.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {k.status !== 'revoked' && <button className="btn sm" style={{ height: 28 }}><Icon name="refresh" size={12} />Rotate</button>}
                      {k.status !== 'revoked' && <button className="btn sm danger" style={{ height: 28 }}>Revoke</button>}
                      {k.status === 'revoked' && <span className="t-meta">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
            <span className="t-meta">6 keys · secret values are hashed at rest & never returned by the API</span>
            <span className="t-meta">Rotation invalidates the old secret after a 24h grace window</span>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 23.3 — Webhooks
// ──────────────────────────────────────────────────────────────
const WEBHOOKS = [
  { url: 'https://hooks.partner.io/acme', label: 'Partner settlement sync', events: 8, rate: '100%', status: 'connected', current: true },
  { url: 'https://erp.acme-corp.in/wh',   label: 'ERP booking ingest',      events: 5, rate: '99.4%', status: 'connected' },
  { url: 'https://ops.slack.webhook/x',   label: 'Ops alerts → Slack',      events: 3, rate: '100%', status: 'connected' },
  { url: 'https://legacy.crm.net/hook',   label: 'CRM (legacy)',            events: 2, rate: '71.2%', status: 'degraded' },
];

const EVENT_SUBS = [
  ['booking.completed', true], ['booking.cancelled', true], ['payment.captured', true],
  ['payment.refunded', true], ['payout.paid', true], ['driver.suspended', false],
  ['kyc.approved', true], ['dispute.opened', true], ['promo.redeemed', false],
];

const DELIVERIES = [
  { t: '14:42:11', evt: 'payout.paid',        code: 200, ms: '142ms', try: 1, ok: true },
  { t: '14:39:50', evt: 'payment.captured',   code: 200, ms: '98ms',  try: 1, ok: true },
  { t: '14:31:02', evt: 'booking.completed',  code: 200, ms: '116ms', try: 1, ok: true },
  { t: '14:18:44', evt: 'payment.refunded',   code: 503, ms: '—',     try: 3, ok: false },
  { t: '14:18:39', evt: 'payment.refunded',   code: 503, ms: '—',     try: 2, ok: false },
  { t: '14:02:10', evt: 'booking.cancelled',  code: 200, ms: '131ms', try: 1, ok: true },
  { t: '13:48:33', evt: 'kyc.approved',       code: 200, ms: '104ms', try: 1, ok: true },
];

function WebhooksScreen() {
  return (
    <Shell
      active="integrations"
      breadcrumb="System · Integrations · Webhooks"
      title="Webhooks"
      subtitle="Signed outbound deliveries · HMAC-SHA256 · retried with exponential backoff"
      actions={
        <>
          <button className="btn sm"><Icon name="external" size={13} />Event catalog</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Add endpoint</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18, alignItems: 'start' }}>
        {/* endpoint list */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Endpoints · 4</div>
          </div>
          {WEBHOOKS.map((w, i) => {
            const tone = connTone(w.status);
            return (
              <div key={i} style={{ padding: '14px 18px', borderBottom: i < WEBHOOKS.length - 1 ? '1px solid var(--rule-soft)' : 'none', cursor: 'pointer', borderLeft: w.current ? '2px solid var(--accent)' : '2px solid transparent', background: w.current ? 'var(--surface-2)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{w.label}</span>
                  <span className={'dot ' + tone} />
                </div>
                <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.url}</div>
                <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                  <span className="t-meta">{w.events} events</span>
                  <span className="t-meta" style={{ color: w.status === 'degraded' ? 'var(--warn)' : 'var(--ink-3)' }}>{w.rate} delivered</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="t-label" style={{ padding: 0 }}>Endpoint</div>
                <h3 style={{ margin: '6px 0 4px', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20 }}>Partner settlement sync</h3>
                <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>https://hooks.partner.io/acme</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn sm" style={{ height: 30 }}><Icon name="bolt" size={12} />Send test</button>
                <button className="btn sm" style={{ height: 30 }}>Disable</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div className="field-label" style={{ marginBottom: 6 }}>Signing secret</div>
                <MaskedSecret value="whsec_8f21d4c2e90ab7Q2c…" />
              </div>
              <div>
                <div className="field-label" style={{ marginBottom: 6 }}>Retry policy</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32 }}>
                  <span className="badge">5 attempts</span>
                  <span className="t-meta">exponential · max 6h</span>
                </div>
              </div>
            </div>
          </div>

          {/* event subscriptions */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label">Subscribed events · 8 of 9</div>
              <button className="btn sm ghost" style={{ height: 26 }}>Edit subscriptions</button>
            </div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 22px' }}>
              {EVENT_SUBS.map(([e, on]) => (
                <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 3, border: '1px solid ' + (on ? 'var(--accent)' : 'var(--rule-strong)'), background: on ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {on && <Icon name="check" size={11} stroke={2.6} style={{ color: '#fff' }} />}
                  </span>
                  <span className="t-mono" style={{ fontSize: 12, color: on ? 'var(--ink)' : 'var(--ink-4)' }}>{e}</span>
                </div>
              ))}
            </div>
          </div>

          {/* recent deliveries */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Recent deliveries</div>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Time</th>
                  <th>Event</th>
                  <th style={{ width: 90 }}>Status</th>
                  <th style={{ width: 90 }}>Latency</th>
                  <th style={{ width: 80 }}>Attempt</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {DELIVERIES.map((d, i) => (
                  <tr key={i}>
                    <td className="t-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{d.t}</td>
                    <td><span className="t-mono" style={{ fontSize: 12 }}>{d.evt}</span></td>
                    <td><span className={'badge ' + (d.ok ? 'ok' : 'danger')}>{d.code}</span></td>
                    <td className="t-mono t-meta">{d.ms}</td>
                    <td className="t-meta">#{d.try}</td>
                    <td>{!d.ok && <button className="btn sm" style={{ height: 26 }}><Icon name="refresh" size={11} />Retry</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 23.4 — Health & Status
// ──────────────────────────────────────────────────────────────
const HEALTH = [
  { cat: 'Payments',   prov: 'Razorpay',    status: 'operational', success: '14:42', err: '0.02%', lat: '180ms', spark: [4,5,4,6,5,4,5,6,5,4,5,4] },
  { cat: 'Maps & Geo', prov: 'Google Maps', status: 'operational', success: '14:42', err: '0.00%', lat: '92ms',  spark: [3,3,4,3,3,4,3,3,4,3,3,3] },
  { cat: 'SMS',        prov: 'MSG91',       status: 'operational', success: '14:41', err: '0.11%', lat: '240ms', spark: [5,4,5,6,5,5,4,5,6,5,5,5] },
  { cat: 'Email',      prov: 'SendGrid',    status: 'degraded',    success: '14:30', err: '3.10%', lat: '410ms', spark: [4,5,6,8,12,14,11,9,13,12,10,11] },
  { cat: 'WhatsApp',   prov: 'Gupshup BSP', status: 'operational', success: '14:42', err: '0.30%', lat: '300ms', spark: [6,5,6,5,6,7,6,5,6,6,5,6] },
  { cat: 'KYC',        prov: 'HyperVerge',  status: 'operational', success: '14:39', err: '0.50%', lat: '1.2s',  spark: [7,8,7,9,8,7,8,9,8,7,8,8] },
  { cat: 'Telephony',  prov: 'Exotel',      status: 'down',        success: '13:51', err: '100%',  lat: '—',     spark: [5,6,5,7,6,18,22,24,23,22,24,23] },
  { cat: 'Storage',    prov: 'AWS S3',      status: 'operational', success: '14:42', err: '0.00%', lat: '64ms',  spark: [3,3,3,4,3,3,3,4,3,3,3,3] },
  { cat: 'Analytics',  prov: 'Mixpanel',    status: 'operational', success: '14:42', err: '0.08%', lat: '120ms', spark: [4,4,5,4,4,5,4,4,5,4,4,4] },
];

function healthTone(s) {
  return s === 'operational' ? 'ok' : s === 'degraded' ? 'warn' : 'danger';
}

function Spark({ data, tone }) {
  const w = 120, h = 26, max = Math.max(...data, 1);
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(' ');
  const col = tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'var(--warn)' : 'var(--accent)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function HealthStatusScreen() {
  return (
    <Shell
      active="integrations"
      breadcrumb="System · Integrations · Health"
      title="Health & status"
      subtitle="Live probes per integration · error-rate thresholds raise dashboard alerts"
      actions={
        <>
          <button className="btn sm"><Icon name="refresh" size={13} />Refresh probes</button>
          <button className="btn sm">Alert rules</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <KpiStrip cols={4} items={[
          ['Uptime · 30d',   '99.94%', '8 of 9 operational', 'var(--accent)'],
          ['Avg error rate', '0.46%',  'Weighted by volume', 'var(--ink-2)'],
          ['Active incident','1',      'Telephony · Exotel', 'var(--danger)'],
          ['Open alerts',    '2',      '1 critical · 1 warn', 'var(--warn)'],
        ]} />

        {/* active incident banner */}
        <div style={{ background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))', borderRadius: 3, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Icon name="alert" size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Telephony provider down · Exotel returning 401 since 13:51 IST</div>
            <div className="t-meta" style={{ marginTop: 3 }}>Masked-calling unavailable · driver↔customer calls failing over to in-app chat · credentials likely expired</div>
          </div>
          <button className="btn sm" style={{ height: 30 }}>Acknowledge</button>
          <button className="btn sm accent" style={{ height: 30 }}>Rotate credentials</button>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Integration</th>
                <th style={{ width: 130 }}>Status</th>
                <th style={{ width: 160 }}>Throughput · 12h</th>
                <th style={{ width: 110 }}>Error rate</th>
                <th style={{ width: 100 }}>Latency</th>
                <th style={{ width: 120 }}>Last success</th>
              </tr>
            </thead>
            <tbody>
              {HEALTH.map((row, i) => {
                const tone = healthTone(row.status);
                return (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{row.cat}</span>
                        <span className="t-meta">{row.prov}</span>
                      </div>
                    </td>
                    <td><span className={'badge ' + tone}><span className={'dot ' + tone} />{row.status}</span></td>
                    <td><Spark data={row.spark} tone={tone} /></td>
                    <td><span className="t-mono" style={{ fontSize: 12.5, color: row.status === 'operational' ? 'var(--ink-2)' : tone === 'warn' ? 'var(--warn)' : 'var(--danger)' }}>{row.err}</span></td>
                    <td className="t-mono t-meta">{row.lat}</td>
                    <td className="t-meta">{row.success}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* secret rotation schedule */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[
            ['Secrets rotation', 'On schedule', '3 due within 30 days', 'check'],
            ['SIEM streaming',   'Connected', 'Splunk · 0 lag', 'check'],
            ['Vault status',     'Sealed · healthy', 'HSM-backed', 'shield'],
            ['Adapter registry', '9 / 9 loaded', 'No version drift', 'layers'],
          ].map(([k, v, m, ic]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Icon name={ic} size={16} stroke={2.2} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
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

// ──────────────────────────────────────────────────────────────
// 23.5 — Secrets Rotation
// ──────────────────────────────────────────────────────────────
const SECRETS = [
  { name: 'Razorpay · live key',       type: 'Provider credential', policy: 'Auto · 90d',  age: '12 d',  next: 'in 78 d', status: 'healthy' },
  { name: 'AWS S3 · access key',       type: 'Provider credential', policy: 'Auto · 90d',  age: '71 d',  next: 'in 19 d', status: 'due' },
  { name: 'pk_live · Mobile App',      type: 'API key',             policy: 'Auto · 180d', age: '138 d', next: 'in 42 d', status: 'healthy' },
  { name: 'whsec · Partner sync',      type: 'Webhook signing',     policy: 'Manual',      age: '286 d', next: 'overdue', status: 'overdue' },
  { name: 'SendGrid · API key',        type: 'Provider credential', policy: 'Auto · 90d',  age: '5 d',   next: 'in 85 d', status: 'rotating' },
  { name: 'HyperVerge · KYC token',    type: 'Provider credential', policy: 'Auto · 60d',  age: '52 d',  next: 'in 8 d',  status: 'due' },
  { name: 'sk_live · Analytics ETL',   type: 'API key',             policy: 'Manual',      age: '98 d',  next: 'in 82 d', status: 'healthy' },
];

function secretStatusBadge(s) {
  return s === 'healthy' ? <span className="badge ok"><span className="dot ok" />Healthy</span>
    : s === 'due' ? <span className="badge warn"><span className="dot warn" />Due soon</span>
    : s === 'rotating' ? <span className="badge info"><span className="dot info" />In grace</span>
    : <span className="badge danger"><span className="dot danger" />Overdue</span>;
}

function SecretsRotationScreen() {
  return (
    <Shell
      active="integrations"
      breadcrumb="System · Integrations · Secrets rotation"
      title="Secrets rotation"
      subtitle="Vault-managed lifecycle · automatic cadence with dual-key grace window · zero-downtime cutover"
      actions={
        <>
          <button className="btn sm"><Icon name="clock" size={13} />Rotation history</button>
          <button className="btn sm accent"><Icon name="refresh" size={13} />Rotate now</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <KpiStrip cols={4} items={[
          ['Managed secrets', '23',   '17 auto · 6 manual', 'var(--ink-2)'],
          ['Due ≤ 30 days',   '3',    'S3 · KYC · webhook', 'var(--warn)'],
          ['Overdue',         '1',    'Partner signing secret', 'var(--danger)'],
          ['Auto coverage',   '74%',  'Target 100%', 'var(--warn)'],
        ]} />

        {/* in-progress rotation — dual-key grace window */}
        <div style={{ background: 'var(--info-soft)', border: '1px solid color-mix(in oklab, var(--info) 30%, var(--rule-strong))', borderRadius: 3, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Icon name="refresh" size={16} style={{ color: 'var(--info)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Rotation in progress · SendGrid API key</div>
              <div className="t-meta" style={{ marginTop: 3 }}>Both keys valid during the grace window · old key auto-revoked when timer expires</div>
            </div>
            <span className="badge info"><span className="dot info" />Grace · 18h 22m left</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>Previous secret · revoking</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px', border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface-sunk)' }}>
                <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-3)', textDecoration: 'line-through', flex: 1 }}>SG.••••••••••••wuT</span>
                <span className="t-meta" style={{ color: 'var(--danger)' }}>revokes 09:04</span>
              </div>
            </div>
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>New secret · active</div>
              <MaskedSecret value="SG.••••••••••••k2Lp" />
            </div>
          </div>
          {/* grace progress bar */}
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-sunk)', overflow: 'hidden' }}>
              <div style={{ width: '24%', height: '100%', background: 'var(--info)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span className="t-meta">Rotated 14:42 · 29 May</span>
              <span className="t-meta">Auto-revoke 09:04 · 30 May</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: 280, height: 32 }}>
            <Icon name="search" size={13} className="icon" />
            <input placeholder="Search secrets by name, type…" />
          </div>
          <FilterChip label="Type" value="All" />
          <FilterChip label="Policy" value="All" />
          <FilterChip label="Status" value="Due + Overdue" count="4" />
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Secret</th>
                <th style={{ width: 180 }}>Type</th>
                <th style={{ width: 130 }}>Policy</th>
                <th style={{ width: 90 }}>Age</th>
                <th style={{ width: 110 }}>Next rotation</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 110 }}></th>
              </tr>
            </thead>
            <tbody>
              {SECRETS.map((s, i) => (
                <tr key={i}>
                  <td><span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span></td>
                  <td className="t-meta">{s.type}</td>
                  <td>
                    <span className="t-mono" style={{ fontSize: 11.5, color: s.policy === 'Manual' ? 'var(--ink-3)' : 'var(--ink-2)' }}>{s.policy}</span>
                  </td>
                  <td className="t-mono t-meta">{s.age}</td>
                  <td><span className="t-mono" style={{ fontSize: 12, color: s.next === 'overdue' ? 'var(--danger)' : s.status === 'due' ? 'var(--warn)' : 'var(--ink-2)' }}>{s.next}</span></td>
                  <td>{secretStatusBadge(s.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {s.status === 'rotating'
                        ? <button className="btn sm" style={{ height: 28 }}>Cancel</button>
                        : <button className="btn sm" style={{ height: 28 }}><Icon name="refresh" size={12} />Rotate</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
            <span className="t-meta">Rotations are audited (Module 22) · secret values are never written to the audit payload</span>
            <span className="t-meta">Showing 7 of 23</span>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, {
  ProviderConnectionsScreen, ApiKeysScreen, WebhooksScreen, HealthStatusScreen, SecretsRotationScreen,
  PROVIDERS, API_KEYS, WEBHOOKS, HEALTH, SECRETS,
});
