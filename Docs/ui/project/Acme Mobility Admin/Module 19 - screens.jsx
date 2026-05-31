/* ─────────────────────────────────────────────────────────────
   Module 19 — Branding (Profiles, Theme Editor, Touchpoints)
   Screens 19.1 → 19.3
   ───────────────────────────────────────────────────────────── */

const BRANDS = [
  { id: 'BR-ACME',   name: 'Acme Mobility',     scope: 'Consumer app · all cities', primary: '#0F8A5F', ink: '#1A1814', surf: '#FBF9F4', status: 'live', updated: '14 Apr', current: true },
  { id: 'BR-ACME-AIR', name: 'Acme Air',        scope: 'Air booking flow',          primary: '#3F6FB2', ink: '#15202E', surf: '#F7F9FC', status: 'live', updated: '02 May' },
  { id: 'BR-CORP',   name: 'Acme for Business', scope: 'Corporate portal · 42 orgs',primary: '#1A1814', ink: '#1A1814', surf: '#FFFFFF', status: 'live', updated: '21 Mar' },
  { id: 'BR-WL-MET', name: 'MetroRide (WL)',    scope: 'White-label · Pune',        primary: '#B57228', ink: '#241A10', surf: '#FBF6EE', status: 'review', updated: '28 May' },
  { id: 'BR-WL-HEL', name: 'SkyHop (WL)',       scope: 'White-label · heli charter',primary: '#6E4FB2', ink: '#1C1428', surf: '#F8F6FC', status: 'draft', updated: '27 May' },
];

// ──────────────────────────────────────────────────────────────
// 19.1 — Brand Profiles
// ──────────────────────────────────────────────────────────────
function BrandProfilesScreen() {
  return (
    <Shell
      active="branding"
      breadcrumb="System · Branding"
      title="Brand profiles"
      subtitle="5 profiles · 3 live · 2 white-label partners · last published 28 May"
      actions={
        <>
          <button className="btn sm">Brand guidelines</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New profile</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
        {BRANDS.map(b => (
          <div key={b.id} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderLeft: '3px solid ' + (b.current ? 'var(--accent)' : 'transparent'), cursor: 'pointer' }}>
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 18 }}>
              {/* swatch preview */}
              <div style={{ width: 88, height: 88, borderRadius: 6, border: '1px solid var(--rule)', overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, background: b.surf, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: b.primary }} />
                </div>
                <div style={{ display: 'flex', height: 18 }}>
                  <div style={{ flex: 1, background: b.primary }} />
                  <div style={{ flex: 1, background: b.ink }} />
                  <div style={{ flex: 1, background: b.surf, borderTop: '1px solid var(--rule)' }} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>{b.name}</div>
                  {b.status === 'live'   ? <span className="badge ok"><span className="dot ok" />Live</span> :
                   b.status === 'review' ? <span className="badge warn"><span className="dot warn" />In review</span> :
                   <span className="badge"><span className="dot pending" />Draft</span>}
                </div>
                <div className="t-meta" style={{ marginTop: 5 }}>{b.scope}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  {[b.primary, b.ink, b.surf].map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, background: c, border: '1px solid var(--rule-strong)' }} />
                      <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderTop: '1px solid var(--rule-soft)', background: 'var(--surface-2)' }}>
              <span className="t-meta"><span className="t-mono">{b.id}</span> · updated {b.updated}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn sm ghost"><Icon name="eye" size={13} />Preview</button>
                <button className="btn sm">Edit theme</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 19.2 — Theme Editor
// ──────────────────────────────────────────────────────────────
function ThemeEditorScreen() {
  const palette = [
    ['Primary', '#0F8A5F', 'Buttons, links, active'],
    ['Primary ink', '#0A6849', 'Pressed, on-light text'],
    ['Ink', '#1A1814', 'Headings, body'],
    ['Surface', '#FBF9F4', 'Cards, sheets'],
    ['Background', '#F4F1EA', 'App canvas'],
    ['Success', '#0F8A5F', 'Confirmations'],
  ];
  return (
    <Shell
      active="branding"
      breadcrumb="System · Branding · Theme editor"
      title="Acme Mobility"
      subtitle="BR-ACME · consumer app · live · edits publish to staging first"
      actions={
        <>
          <button className="btn sm">Reset</button>
          <button className="btn sm">Publish to staging</button>
          <button className="btn sm accent"><Icon name="check" size={13} />Publish live</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        {/* controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* logos */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Logo & marks</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              {[['Wordmark', '240 × 64'], ['App icon', '512 × 512'], ['Splash mark', '180 × 180']].map(([label, dim]) => (
                <div key={label}>
                  <div style={{
                    aspectRatio: '1.6', border: '1px dashed var(--rule-strong)', borderRadius: 4,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'repeating-linear-gradient(45deg, var(--surface-2), var(--surface-2) 7px, var(--surface) 7px, var(--surface) 14px)',
                    color: 'var(--ink-3)',
                  }}>
                    <Icon name="upload" size={16} />
                    <span className="t-mono" style={{ fontSize: 10 }}>{dim}</span>
                  </div>
                  <div className="t-meta" style={{ marginTop: 6, textAlign: 'center' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* color tokens */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Color tokens</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {palette.map(([k, c, m]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 5, background: c, border: '1px solid var(--rule-strong)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{k}</div>
                    <div className="t-meta" style={{ marginTop: 1 }}>{m}</div>
                  </div>
                  <span className="t-mono" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{c}</span>
                  <Icon name="chevDown" size={14} style={{ color: 'var(--ink-4)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* typography + radius */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <FormSection title="Type & shape">
              <Row cols={2}>
                <Field label="Display font" value="Newsreader" select />
                <Field label="Text font" value="IBM Plex Sans" select />
              </Row>
              <Row cols={2}>
                <Field label="Corner radius" value="Medium · 8px" select />
                <Field label="Button style" value="Solid · pill" select />
              </Row>
            </FormSection>
          </div>
        </div>

        {/* phone preview */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="t-label">Live preview · rider app</div>
            <span className="badge"><Icon name="device" size={11} />iPhone</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* phone frame */}
            <div style={{ width: 268, borderRadius: 30, border: '8px solid #1A1814', background: '#F4F1EA', overflow: 'hidden', boxShadow: 'var(--shadow-pop)' }}>
              {/* status + header */}
              <div style={{ background: '#FBF9F4', padding: '12px 18px 14px', borderBottom: '1px solid #E2DDD0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--font-mono)', color: '#6E695D', marginBottom: 12 }}>
                  <span>9:41</span><span>5G · 100%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1A1814' }}>
                  <BrandMark size={20} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 15 }}>Acme Mobility</span>
                </div>
              </div>
              {/* body */}
              <div style={{ padding: '16px 18px 20px' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, color: '#1A1814', letterSpacing: '-0.02em', lineHeight: 1.15 }}>Where to,<br />Priya?</div>
                {/* search */}
                <div style={{ marginTop: 14, background: '#FBF9F4', border: '1px solid #CFC9B8', borderRadius: 10, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 9, color: '#6E695D', fontSize: 12.5 }}>
                  <Icon name="search" size={14} />Enter destination
                </div>
                {/* service tiles */}
                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[['car', 'Cab'], ['bolt', 'Bike'], ['helipad', 'Heli'], ['map', 'Rental']].map(([ic, l]) => (
                    <div key={l} style={{ background: '#FBF9F4', border: '1px solid #E2DDD0', borderRadius: 10, padding: '12px', display: 'flex', flexDirection: 'column', gap: 6, color: '#1A1814' }}>
                      <Icon name={ic} size={18} style={{ color: '#0F8A5F' }} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{l}</span>
                    </div>
                  ))}
                </div>
                {/* cta */}
                <div style={{ marginTop: 16, background: '#0F8A5F', color: '#fff', borderRadius: 999, padding: '12px', textAlign: 'center', fontSize: 13.5, fontWeight: 600 }}>Book a ride</div>
              </div>
            </div>
          </div>
          <div className="t-meta" style={{ marginTop: 14, textAlign: 'center' }}>Updates reflect primary, surface & radius tokens in real time.</div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 19.3 — Touchpoints & Assets
// ──────────────────────────────────────────────────────────────
function TouchpointsScreen() {
  const points = [
    { name: 'Rider app', desc: 'iOS + Android · theme tokens', cov: 'Full', status: 'live', icon: 'device' },
    { name: 'Email receipts', desc: 'Transactional + marketing', cov: 'Full', status: 'live', icon: 'envelope' },
    { name: 'SMS sender ID', desc: 'DLT header ACMEMB', cov: 'Header only', status: 'live', icon: 'phone' },
    { name: 'Web booking', desc: 'book.acme.app', cov: 'Full', status: 'live', icon: 'globe' },
    { name: 'Invoices & PDF', desc: 'GST invoices, statements', cov: 'Logo + colors', status: 'live', icon: 'receipt' },
    { name: 'Driver app', desc: 'Partner-facing', cov: 'Logo only', status: 'review', icon: 'users' },
  ];
  return (
    <Shell
      active="branding"
      breadcrumb="System · Branding · Touchpoints"
      title="Brand touchpoints"
      subtitle="Acme Mobility · where the brand renders · 6 surfaces · CDN cache 12 min"
      actions={
        <>
          <button className="btn sm"><Icon name="refresh" size={13} />Purge CDN cache</button>
          <button className="btn sm"><Icon name="download" size={13} />Asset kit</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* touchpoints grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {points.map(p => (
            <div key={p.name} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ width: 40, height: 40, border: '1px solid var(--rule-strong)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <Icon name={p.icon} size={18} />
                </div>
                {p.status === 'live'
                  ? <span className="badge ok"><span className="dot ok" />Live</span>
                  : <span className="badge warn"><span className="dot warn" />Review</span>}
              </div>
              <div style={{ marginTop: 14, fontSize: 14, fontWeight: 500 }}>{p.name}</div>
              <div className="t-meta" style={{ marginTop: 4 }}>{p.desc}</div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--rule-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="t-meta">Coverage</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{p.cov}</span>
              </div>
            </div>
          ))}
        </div>

        {/* asset library */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Asset library</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Published artifacts</h3>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Format</th>
                <th>Used in</th>
                <th>Version</th>
                <th style={{ textAlign: 'right' }}>Size</th>
                <th>Status</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Wordmark · dark',  'SVG', 'App header, web', 'v4', '12 KB', 'live'],
                ['Wordmark · light', 'SVG', 'Splash, footers', 'v4', '12 KB', 'live'],
                ['App icon',         'PNG · 1024', 'Store listing', 'v3', '88 KB', 'live'],
                ['Email header',     'PNG · 1200', 'Receipts', 'v2', '46 KB', 'live'],
                ['Invoice logo',     'SVG', 'GST PDFs', 'v4', '9 KB', 'live'],
                ['Favicon',          'ICO', 'book.acme.app', 'v2', '4 KB', 'stale'],
              ].map(([n, f, u, v, sz, st]) => (
                <tr key={n} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, border: '1px solid var(--rule)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--ink-3)' }}><Icon name="layers" size={15} /></div>
                      <span style={{ fontSize: 13 }}>{n}</span>
                    </div>
                  </td>
                  <td className="t-meta">{f}</td>
                  <td className="t-meta">{u}</td>
                  <td><span className="t-mono" style={{ fontSize: 12 }}>{v}</span></td>
                  <td className="num" style={{ textAlign: 'right', fontSize: 12.5 }}>{sz}</td>
                  <td>
                    {st === 'live'
                      ? <span className="badge ok"><span className="dot ok" />Live</span>
                      : <span className="badge warn"><span className="dot warn" />Stale</span>}
                  </td>
                  <td><button className="btn icon sm ghost"><Icon name="download" size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { BrandProfilesScreen, ThemeEditorScreen, TouchpointsScreen, BRANDS });
