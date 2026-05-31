/* ─────────────────────────────────────────────────────────────
   Module 21 — Settings & Flags (Platform, Feature Flags, Maintenance)
   Screens 21.1 → 21.3
   ───────────────────────────────────────────────────────────── */

function Toggle({ on }) {
  return (
    <div style={{ width: 36, height: 20, borderRadius: 10, padding: 2, flexShrink: 0, background: on ? 'var(--accent)' : 'var(--rule-strong)', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 21.1 — Platform Settings
// ──────────────────────────────────────────────────────────────
function PlatformSettingsScreen() {
  const nav = [
    ['General', true], ['Regions & zones', false], ['Booking rules', false],
    ['Safety & SOS', false], ['Localization', false], ['Data & privacy', false],
  ];
  return (
    <Shell
      active="settings"
      breadcrumb="System · Settings"
      title="Settings & flags"
      subtitle="Platform configuration · changes versioned & audit-logged · last edit 28 May"
      actions={
        <>
          <button className="btn sm">Change history</button>
          <button className="btn sm accent"><Icon name="check" size={13} />Save changes</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', minHeight: '100%' }}>
        {/* settings sub-nav */}
        <div style={{ borderRight: '1px solid var(--rule)', background: 'var(--surface)', padding: '20px 0' }}>
          <div className="nav-section-label">Configuration</div>
          {nav.map(([label, on]) => (
            <div key={label} className={'nav-item' + (on ? ' active' : '')}>
              <span>{label}</span>
            </div>
          ))}
          <div className="nav-section-label" style={{ marginTop: 12 }}>Advanced</div>
          {[['Feature flags'], ['Maintenance'], ['API & webhooks']].map(([label]) => (
            <div key={label} className="nav-item"><span>{label}</span></div>
          ))}
        </div>

        {/* form */}
        <div style={{ overflow: 'auto', padding: '24px 32px 40px', display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 880 }}>
          <FormSection title="Organization" description="Identity and operating defaults applied across the platform.">
            <Row cols={2}>
              <Field label="Legal entity" value="Acme Mobility Pvt Ltd" />
              <Field label="GSTIN" value="29ABCDE1234F1Z5" />
            </Row>
            <Row cols={2}>
              <Field label="Primary region" value="India" select />
              <Field label="Base currency" value="INR · ₹" select />
            </Row>
            <Row cols={2}>
              <Field label="Timezone" value="Asia/Kolkata · IST" select />
              <Field label="Fiscal year start" value="April" select />
            </Row>
          </FormSection>

          <FormSection title="Operating defaults">
            <Row cols={3}>
              <Field label="Settlement cycle" value="T+1" select />
              <Field label="Driver payout day" value="Monday" select />
              <Field label="Surge ceiling" value="2.0×" select />
            </Row>
          </FormSection>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>Platform toggles</h3>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              {[
                ['Allow guest checkout', 'Book without an account · OTP at confirm', false],
                ['Cash payments', 'Accept cash for road trips (not air)', true],
                ['Scheduled rides', 'Book up to 7 days ahead', true],
                ['In-app tipping', 'Riders can tip drivers post-trip', true],
                ['Carbon offset', 'Optional ₹5 offset per trip', false],
              ].map(([k, m, on], i) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: i < 4 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{k}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{m}</div>
                  </div>
                  <Toggle on={on} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 21.2 — Feature Flags
// ──────────────────────────────────────────────────────────────
function FeatureFlagsScreen() {
  const flags = [
    { key: 'new-dispatch-engine', name: 'New dispatch engine v3', env: 'Prod', rollout: 35, target: 'BLR, MUM · gradual', status: 'on', owner: 'Ops', current: true },
    { key: 'instant-refunds',     name: 'Instant UPI refunds',    env: 'Prod', rollout: 100,target: 'All users',         status: 'on', owner: 'Finance' },
    { key: 'heli-pooling',        name: 'Heli seat pooling',      env: 'Staging', rollout: 0, target: 'Internal only',     status: 'off', owner: 'Air' },
    { key: 'ai-eta',              name: 'ML-based ETA model',      env: 'Prod', rollout: 60, target: '60% holdout test',   status: 'on', owner: 'Data' },
    { key: 'rider-sos-v2',        name: 'SOS flow v2',            env: 'Prod', rollout: 100,target: 'All · safety',       status: 'on', owner: 'Trust' },
    { key: 'corp-wallet',         name: 'Corporate wallet beta',  env: 'Prod', rollout: 12, target: '42 orgs · allowlist',status: 'on', owner: 'B2B' },
    { key: 'surge-transparency',  name: 'Surge breakdown UI',     env: 'Staging', rollout: 0, target: 'QA',                status: 'off', owner: 'Growth' },
  ];
  return (
    <Shell
      active="settings"
      breadcrumb="System · Settings · Feature flags"
      title="Feature flags"
      subtitle="7 flags · 5 in prod · 2 staged · changes propagate in ~30s via config service"
      actions={
        <>
          <button className="btn sm"><Icon name="filter" size={13} />Prod <Icon name="chevDown" size={11} /></button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New flag</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Flag</th>
                <th>Environment</th>
                <th>Targeting</th>
                <th style={{ width: 200 }}>Rollout</th>
                <th>Owner</th>
                <th>State</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {flags.map(f => (
                <tr key={f.key} className={f.current ? 'selected' : ''} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</span>
                      <span className="t-mono t-meta">{f.key}</span>
                    </div>
                  </td>
                  <td>
                    {f.env === 'Prod'
                      ? <span className="badge ok"><span className="dot ok" />Prod</span>
                      : <span className="badge info"><span className="dot info" />Staging</span>}
                  </td>
                  <td className="t-meta">{f.target}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 5, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: f.rollout + '%', height: '100%', background: f.rollout === 100 ? 'var(--accent)' : f.rollout === 0 ? 'var(--ink-4)' : 'var(--warn)' }} />
                      </div>
                      <span className="t-mono" style={{ fontSize: 11.5, width: 34, textAlign: 'right', color: 'var(--ink-2)' }}>{f.rollout}%</span>
                    </div>
                  </td>
                  <td><span className="badge">{f.owner}</span></td>
                  <td><Toggle on={f.status === 'on'} /></td>
                  <td><button className="btn icon sm ghost"><Icon name="chevRight" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* selected flag detail */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div className="t-label">Selected flag</div>
              <span className="badge ok"><span className="dot ok" />Enabled · Prod</span>
            </div>
            <h3 style={{ margin: '6px 0 2px', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>New dispatch engine v3</h3>
            <div className="t-mono t-meta">new-dispatch-engine</div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginTop: 14 }}>Graph-based matching replacing the legacy nearest-driver loop. Currently 35% in Bengaluru & Mumbai with automatic rollback if assignment latency exceeds 800ms p95.</p>
            <div style={{ marginTop: 16 }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Rollout · 35%</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 8, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: '35%', height: '100%', background: 'var(--warn)' }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['10%', '35%', '50%', '100%'].map(p => (
                    <button key={p} className="btn sm" style={{ height: 26, padding: '0 9px', background: p === '35%' ? 'var(--accent-soft-2)' : 'var(--surface)', borderColor: p === '35%' ? 'var(--accent)' : 'var(--rule-strong)', color: p === '35%' ? 'var(--accent-ink)' : 'var(--ink-2)' }}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Live metrics · this flag</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Assign latency', '612 ms', 'p95 · under cap', 'var(--accent)'],
                ['Match rate', '94.8%', '+2.1pt vs control', 'var(--accent)'],
                ['Cancellations', '4.2%', '−0.6pt', 'var(--accent)'],
                ['Rollback armed', 'Yes', 'At 800ms p95', 'var(--ink-2)'],
              ].map(([k, v, m, c]) => (
                <div key={k} style={{ padding: '13px 15px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 5, fontFamily: 'var(--font-serif)', fontSize: 20 }}>{v}</div>
                  <div className="t-meta" style={{ marginTop: 3, color: c }}>{m}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 21.3 — Maintenance & Kill Switches
// ──────────────────────────────────────────────────────────────
function MaintenanceScreen() {
  const regions = [
    ['Bengaluru', 'road', 'Operational', 'ok'],
    ['Mumbai',    'road', 'Operational', 'ok'],
    ['Delhi NCR', 'road', 'Operational', 'ok'],
    ['Hyderabad', 'road', 'Degraded · weather', 'warn'],
    ['Air · all', 'air',  'Operational', 'ok'],
    ['Pune (WL)', 'road', 'Maintenance window', 'pending'],
  ];
  return (
    <Shell
      active="settings"
      breadcrumb="System · Settings · Maintenance"
      title="Maintenance & kill switches"
      subtitle="All systems operational · 1 region degraded · use with extreme care — actions are immediate"
      actions={
        <>
          <button className="btn sm"><Icon name="clock" size={13} />Schedule window</button>
          <button className="btn sm">Status page</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* kill switches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ padding: '16px 20px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule))', borderRadius: 3, display: 'flex', gap: 12 }}>
            <Icon name="alert" size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Kill switches take effect immediately across all clients. Each toggle requires a second admin confirmation and is written to the audit log with your name.
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Global kill switches</div>
            </div>
            {[
              ['New bookings', 'Stop accepting all new ride requests', false, 'danger'],
              ['Surge pricing', 'Force surge to 1.0× everywhere', false, 'warn'],
              ['Promotions engine', 'Disable all promo redemptions', true, 'warn'],
              ['Heli / air booking', 'Pause air reservations', false, 'danger'],
              ['Driver onboarding', 'Pause new driver signups', false, 'warn'],
            ].map(([k, m, on, tone], i) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: i < 4 ? '1px solid var(--rule-soft)' : 'none' }}>
                <span className={'dot ' + (on ? tone : 'ok')} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{k}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{m}</div>
                </div>
                {on && <span className="badge warn" style={{ marginRight: 4 }}>Disabled</span>}
                <Toggle on={on} />
              </div>
            ))}
          </div>
        </div>

        {/* regional status + scheduled */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Regional service status</div>
            </div>
            {regions.map(([r, svc, st, tone], i) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < regions.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                <Icon name={svc === 'air' ? 'plane' : 'car'} size={16} style={{ color: 'var(--ink-3)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{st}</div>
                </div>
                {tone === 'ok'      ? <span className="badge ok"><span className="dot ok" />Live</span> :
                 tone === 'warn'    ? <span className="badge warn"><span className="dot warn" />Degraded</span> :
                 <span className="badge"><span className="dot pending" />Maintenance</span>}
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="t-label">Scheduled maintenance</div>
              <button className="btn sm ghost"><Icon name="plus" size={12} /></button>
            </div>
            <div style={{ display: 'flex', gap: 14, padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
              <Icon name="clock" size={16} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Pune (WL) · config migration</div>
                <div className="t-meta" style={{ marginTop: 3 }}>Tonight 02:00–03:30 IST · road bookings paused · riders notified 1h prior</div>
              </div>
              <span className="badge warn"><span className="dot warn" />In 6h</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { PlatformSettingsScreen, FeatureFlagsScreen, MaintenanceScreen });
