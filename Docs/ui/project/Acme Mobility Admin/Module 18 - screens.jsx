/* ─────────────────────────────────────────────────────────────
   Module 18 — Notifications (Templates, Editor, Delivery)
   Screens 18.1 → 18.3
   ───────────────────────────────────────────────────────────── */

const CHAN = { sms: 'SMS', push: 'Push', email: 'Email', wa: 'WhatsApp' };

const TEMPLATES = [
  { id: 'NT-BK-CONF',  name: 'Booking confirmed',     ev: 'Booking · confirmed',  chans: ['push', 'sms', 'wa'], sent: '184 K', open: '—',    status: 'live', cat: 'Transactional', current: true },
  { id: 'NT-DRV-ARR',  name: 'Driver arriving',       ev: 'Trip · driver near',   chans: ['push', 'sms'],        sent: '162 K', open: '—',    status: 'live', cat: 'Transactional' },
  { id: 'NT-OTP',      name: 'Trip OTP',              ev: 'Trip · start verify',  chans: ['sms'],                sent: '178 K', open: '—',    status: 'live', cat: 'Transactional' },
  { id: 'NT-PAY-RCPT', name: 'Payment receipt',       ev: 'Payment · captured',   chans: ['push', 'email', 'wa'],sent: '171 K', open: '62%',  status: 'live', cat: 'Transactional' },
  { id: 'NT-AIR-CONF', name: 'Charter confirmed',     ev: 'Air booking · confirm',chans: ['email', 'wa'],        sent: '1.8 K', open: '88%',  status: 'live', cat: 'Transactional' },
  { id: 'NT-PROMO-W',  name: 'Weekend promo',         ev: 'Marketing · campaign', chans: ['push', 'wa'],         sent: '420 K', open: '14%',  status: 'live', cat: 'Marketing' },
  { id: 'NT-WINBACK',  name: 'We miss you · 30d',     ev: 'Lifecycle · dormant',  chans: ['push', 'email'],      sent: '38 K',  open: '9%',   status: 'paused', cat: 'Marketing' },
  { id: 'NT-DRV-DOC',  name: 'Document expiring',     ev: 'Driver · KYC expiry',  chans: ['sms', 'push'],        sent: '2.1 K', open: '—',    status: 'live', cat: 'Operational' },
  { id: 'NT-SURGE',    name: 'Surge active near you', ev: 'Driver · demand',      chans: ['push'],               sent: '54 K',  open: '—',    status: 'draft', cat: 'Operational' },
];

function chanChip(c) {
  return <span key={c} className="badge" style={{ height: 20, padding: '0 7px', fontSize: 10 }}>{CHAN[c]}</span>;
}

// ──────────────────────────────────────────────────────────────
// 18.1 — Notification Templates
// ──────────────────────────────────────────────────────────────
function NotificationTemplatesScreen() {
  const cats = ['Transactional', 'Marketing', 'Operational'];
  return (
    <Shell
      active="notifications"
      breadcrumb="System · Notifications"
      title="Notification templates"
      subtitle="9 templates · 4 channels · 1.39 M sent · 30d · delivery 98.7%"
      actions={
        <>
          <button className="btn sm">Delivery log</button>
          <button className="btn sm">Broadcast</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New template</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* kpis */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            ['Sent · 30d',     '1.39 M',  'Across 4 channels', 'var(--ink-2)'],
            ['Delivery rate',  '98.7%',   '18 K soft-bounced', 'var(--accent)'],
            ['Push opt-in',    '74%',     'Of active users',   'var(--ink-2)'],
            ['Avg open · mktg','12.4%',   '+1.8pt vs prior',   'var(--accent)'],
            ['Send cost',      '₹ 2.1 L', 'SMS + WhatsApp',    'var(--warn)'],
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
          <div className="input" style={{ width: 280, height: 32 }}>
            <Icon name="search" size={13} className="icon" />
            <input placeholder="Template, event, channel…" />
          </div>
          <FilterChip label="Channel" value="All" />
          <FilterChip label="Status" value="Live" count="6" />
        </div>

        {/* grouped tables */}
        {cats.map(cat => {
          const rows = TEMPLATES.filter(t => t.cat === cat);
          return (
            <div key={cat} style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="t-label" style={{ padding: 0 }}>{cat}</span>
                <span className="t-meta">{rows.length} templates</span>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Template</th>
                    <th>Trigger event</th>
                    <th>Channels</th>
                    <th style={{ textAlign: 'right' }}>Sent · 30d</th>
                    <th style={{ textAlign: 'right' }}>Open</th>
                    <th>Status</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(t => (
                    <tr key={t.id} className={t.current ? 'selected' : ''} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</span>
                          <span className="t-mono t-meta">{t.id}</span>
                        </div>
                      </td>
                      <td className="t-meta">{t.ev}</td>
                      <td><div style={{ display: 'flex', gap: 5 }}>{t.chans.map(chanChip)}</div></td>
                      <td className="num" style={{ textAlign: 'right', fontSize: 13 }}>{t.sent}</td>
                      <td className="num" style={{ textAlign: 'right', fontSize: 12.5, color: t.open === '—' ? 'var(--ink-4)' : 'var(--ink-2)' }}>{t.open}</td>
                      <td>
                        {t.status === 'live'   ? <span className="badge ok"><span className="dot ok" />Live</span> :
                         t.status === 'paused' ? <span className="badge warn"><span className="dot warn" />Paused</span> :
                         <span className="badge"><span className="dot pending" />Draft</span>}
                      </td>
                      <td><button className="btn icon sm ghost"><Icon name="chevRight" size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 18.2 — Template Editor
// ──────────────────────────────────────────────────────────────
function TemplateEditorScreen() {
  const vars = ['{{customer_name}}', '{{driver_name}}', '{{vehicle}}', '{{eta}}', '{{plate}}', '{{otp}}', '{{fare}}'];
  return (
    <Shell
      active="notifications"
      breadcrumb="System · Notifications · Editor"
      title="Driver arriving"
      subtitle="NT-DRV-ARR · Transactional · live · push + SMS"
      actions={
        <>
          <button className="btn sm">Send test</button>
          <button className="btn sm">Pause</button>
          <button className="btn sm accent"><Icon name="check" size={13} />Save & publish</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        {/* editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Channels</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Push', 'push', true, 'Primary · in-app + system'],
                ['SMS', 'sms', true, 'Fallback if push undelivered in 30s'],
                ['WhatsApp', 'wa', false, 'Requires approved template'],
                ['Email', 'email', false, 'Not used for this event'],
              ].map(([label, ic, on, m]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div style={{ width: 34, height: 34, border: '1px solid var(--rule-strong)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: on ? 'var(--accent)' : 'var(--ink-4)' }}>
                    <Icon name={ic === 'push' ? 'bell' : ic === 'sms' ? 'device' : ic === 'wa' ? 'phone' : 'envelope'} size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{m}</div>
                  </div>
                  <div style={{ width: 32, height: 18, borderRadius: 9, padding: 2, background: on ? 'var(--accent)' : 'var(--rule-strong)', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <FormSection title="Push content">
              <Field label="Title" value="{{driver_name}} is arriving" />
              <div className="field">
                <label className="field-label">Body</label>
                <div style={{ border: '1px solid var(--rule-strong)', borderRadius: 3, background: 'var(--surface)', padding: '12px 14px', fontSize: 14, lineHeight: 1.55, minHeight: 76 }}>
                  Your <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{'{{vehicle}}'}</span> is <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{'{{eta}}'}</span> away. Look for <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{'{{plate}}'}</span>.
                </div>
              </div>
              <div>
                <div className="t-label" style={{ marginBottom: 8 }}>Insert variable</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {vars.map(v => (
                    <button key={v} className="btn sm" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--accent-ink)', borderStyle: 'dashed' }}>{v}</button>
                  ))}
                </div>
              </div>
            </FormSection>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <FormSection title="Delivery rules" description="Throttling and quiet-hours protect users from notification fatigue.">
              <Row cols={2}>
                <Field label="Priority" value="High · time-sensitive" select />
                <Field label="Quiet hours" value="Override (transactional)" select />
              </Row>
              <Row cols={2}>
                <Field label="SMS fallback after" value="30 seconds" select />
                <Field label="Dedup window" value="2 minutes" select />
              </Row>
            </FormSection>
          </div>
        </div>

        {/* phone preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 16 }}>Live preview · push</div>
            <div style={{ background: 'var(--surface-sunk)', borderRadius: 14, padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 240, justifyContent: 'center', backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 9px, rgba(0,0,0,0.018) 9px, rgba(0,0,0,0.018) 10px)' }}>
              {/* lock-screen notif card */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-pop)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--ink)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BrandMark size={13} /></div>
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>Acme Mobility</span>
                  <span className="t-meta" style={{ marginLeft: 'auto' }}>now</span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>Rajesh is arriving</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>Your White Swift Dzire is 2 min away. Look for KA 01 AB 4521.</div>
              </div>
            </div>
            <div className="t-meta" style={{ marginTop: 12 }}>Rendered with sample values · variables resolve at send time.</div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 12 }}>SMS fallback</div>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.5 }}>
              Acme: Rajesh (White Dzire, KA01AB4521) is 2 min away. Track: acme.app/t/9F3A
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <span className="t-meta">112 / 160 chars · 1 segment</span>
              <span className="t-meta">DLT-approved · header ACMEMB</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 18.3 — Delivery Log & Broadcast
// ──────────────────────────────────────────────────────────────
function DeliveryLogScreen() {
  const series = [
    { c: 'Push',     pct: 99.2, color: 'var(--accent)' },
    { c: 'SMS',      pct: 97.8, color: 'var(--accent)' },
    { c: 'WhatsApp', pct: 98.9, color: 'var(--accent)' },
    { c: 'Email',    pct: 96.1, color: 'var(--warn)' },
  ];
  const log = [
    { t: '14:38:42', tmpl: 'Booking confirmed', chan: 'push', to: 'Priya I.',    status: 'delivered' },
    { t: '14:38:12', tmpl: 'Trip OTP',           chan: 'sms',  to: '+91 ••• 4521', status: 'delivered' },
    { t: '14:37:55', tmpl: 'Payment receipt',    chan: 'wa',   to: 'Rohan M.',     status: 'read' },
    { t: '14:37:40', tmpl: 'Weekend promo',      chan: 'push', to: 'Hema R.',      status: 'delivered' },
    { t: '14:37:02', tmpl: 'Driver arriving',    chan: 'sms',  to: '+91 ••• 7733', status: 'failed' },
    { t: '14:36:48', tmpl: 'Charter confirmed',  chan: 'email',to: 'acme corp',    status: 'delivered' },
    { t: '14:36:20', tmpl: 'We miss you · 30d',  chan: 'push', to: 'Dev P.',       status: 'suppressed' },
  ];

  return (
    <Shell
      active="notifications"
      breadcrumb="System · Notifications · Delivery"
      title="Delivery & broadcast"
      subtitle="Live stream · 1.39 M sent · 30d · 18 K bounced · 4 channels"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export log</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New broadcast</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
        {/* left — delivery rates + log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 22px' }}>
            <div className="t-label" style={{ marginBottom: 16 }}>Delivery rate by channel · 30d</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {series.map(s => (
                <div key={s.c}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5 }}>{s.c}</span>
                    <span className="t-mono" style={{ fontSize: 12.5, color: s.color }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: s.pct + '%', height: '100%', background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="t-label">Live delivery log</div>
                <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Last events</h3>
              </div>
              <span className="badge ok"><span className="dot ok" />Streaming</span>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Template</th>
                  <th>Channel</th>
                  <th>Recipient</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l, i) => (
                  <tr key={i}>
                    <td className="t-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{l.t}</td>
                    <td style={{ fontSize: 12.5 }}>{l.tmpl}</td>
                    <td>{chanChip(l.chan)}</td>
                    <td className="t-meta">{l.to}</td>
                    <td>
                      {l.status === 'delivered' ? <span className="badge ok"><span className="dot ok" />Delivered</span> :
                       l.status === 'read'      ? <span className="badge info"><span className="dot info" />Read</span> :
                       l.status === 'failed'    ? <span className="badge danger"><span className="dot danger" />Failed</span> :
                       <span className="badge"><span className="dot pending" />Suppressed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* right — broadcast composer */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>New broadcast</h3>
          </div>
          <p style={{ marginTop: 0, marginBottom: 18, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>One-off message to a customer segment. Marketing sends respect opt-out & quiet hours.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Audience" value="Active · BLR · last 30d" select />
            <Field label="Channel" value="Push + WhatsApp" select />
            <div className="field">
              <label className="field-label">Message</label>
              <div style={{ border: '1px solid var(--rule-strong)', borderRadius: 3, padding: '12px 14px', fontSize: 13.5, lineHeight: 1.5, minHeight: 64 }}>
                Monsoon's here ☔ Flat ₹50 off your next 3 rides with MONSOON50. Tap to ride.
              </div>
            </div>
            <Row cols={2}>
              <Field label="Send" value="Schedule" select />
              <Field label="When" value="Today 18:00" />
            </Row>
          </div>

          <div style={{ marginTop: 18, padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
            <div className="t-label" style={{ marginBottom: 10 }}>Estimated reach</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {[['Audience', '184 K'], ['Reachable', '171 K'], ['Est. cost', '₹ 48 K']].map(([k, v]) => (
                <div key={k}>
                  <div className="t-meta">{k}</div>
                  <div style={{ marginTop: 3, fontFamily: 'var(--font-serif)', fontSize: 20 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn sm">Save draft</button>
            <button className="btn sm accent">Schedule broadcast</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { NotificationTemplatesScreen, TemplateEditorScreen, DeliveryLogScreen, TEMPLATES });
