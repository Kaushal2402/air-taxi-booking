/* ─────────────────────────────────────────────────────────────
   Module 03 — Role & Permission Management
   ───────────────────────────────────────────────────────────── */

// Color helper for role tone
const roleTone = (name) => {
  if (/super/i.test(name))    return 'ok';
  if (/finance/i.test(name))  return 'info';
  if (/dispatch/i.test(name)) return 'warn';
  if (/support/i.test(name))  return 'ok';
  if (/devops/i.test(name))   return 'pending';
  if (/compliance/i.test(name))return 'info';
  if (/marketing/i.test(name))return 'pending';
  return 'pending';
};

// ──────────────────────────────────────────────────────────────
// 3.1 — Roles List
// ──────────────────────────────────────────────────────────────
function RolesListScreen() {
  const roles = [
    { id: 'r-001', name: 'Super Admin',          desc: 'Full system control · cannot be deleted',                  members: 2,  system: true,  scope: 'Global',                        perms: '143 / 143', version: 'v4 · 12 Sep 2024' },
    { id: 'r-002', name: 'Sub-Admin · BLR Ops',  desc: 'Bengaluru operations across road bookings and dispatch',   members: 3,  system: false, scope: '8 zones · BLR',                 perms: '74 / 143',  version: 'v9 · 14 May 2026' },
    { id: 'r-003', name: 'Finance Manager',      desc: 'Payments, refunds, payouts, reconciliation',               members: 4,  system: true,  scope: 'Global · finance',              perms: '38 / 143',  version: 'v3 · 02 Apr 2026' },
    { id: 'r-004', name: 'Dispatcher · Lead',    desc: 'Manage dispatch console with surge override authority',    members: 2,  system: false, scope: 'BLR · MUM · HYD',               perms: '24 / 143',  version: 'v5 · 21 Apr 2026' },
    { id: 'r-005', name: 'Dispatcher',           desc: 'Live dispatch · manual assign · exceptions',               members: 14, system: true,  scope: 'Per-zone',                      perms: '18 / 143',  version: 'v2 · 18 Feb 2025' },
    { id: 'r-006', name: 'Support · Lead',       desc: 'All-ticket queue oversight, refund requests, escalation',  members: 2,  system: false, scope: 'IN · Global',                   perms: '32 / 143',  version: 'v6 · 11 May 2026' },
    { id: 'r-007', name: 'Support Agent',        desc: 'Customer tickets and assisted booking',                    members: 11, system: true,  scope: 'IN · Global',                   perms: '21 / 143',  version: 'v1 · 12 Sep 2024' },
    { id: 'r-008', name: 'Compliance',           desc: 'KYC review, doc expiry, privacy requests',                 members: 2,  system: false, scope: 'IN · Global',                   perms: '17 / 143',  version: 'v3 · 18 Feb 2025' },
    { id: 'r-009', name: 'Marketing',            desc: 'Promotions, broadcast notifications, referrals',           members: 3,  system: false, scope: 'IN · Global',                   perms: '14 / 143',  version: 'v4 · 22 Apr 2026' },
    { id: 'r-010', name: 'DevOps',               desc: 'Integration credentials, API keys, webhooks',              members: 2,  system: false, scope: 'Global',                        perms: '11 / 143',  version: 'v2 · 30 Jan 2026' },
    { id: 'r-011', name: 'Finance · Reviewer',   desc: 'Second-approver for high-value refunds and payouts',       members: 2,  system: false, scope: 'Global',                        perms: '12 / 143',  version: 'v1 · 22 Apr 2025' },
    { id: 'r-012', name: 'Sub-Admin · Air ops',  desc: 'Air bookings, operators, aircraft, crew',                  members: 1,  system: false, scope: 'Air · Global',                  perms: '46 / 143',  version: 'v3 · 04 Mar 2025' },
  ];

  return (
    <Shell
      active="rbac"
      breadcrumb="System · Identity & Access"
      title="Roles & Access"
      subtitle="12 roles · 5 system · 7 custom · 143 permissions in registry"
      actions={
        <>
          <button className="btn sm"><Icon name="archive" size={13} />Permission catalog</button>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />New role</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* summary strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
        }}>
          {[
            { k: 'Total roles',         v: '12',     m: '5 system · 7 custom',          tone: 'ink' },
            { k: 'Admins assigned',     v: '48',     m: 'Spread across 9 active roles', tone: 'ok' },
            { k: 'Permissions in use',  v: '143',    m: 'Canonical registry · v2.4',    tone: 'info' },
            { k: 'Pending role review', v: '2',      m: 'BlueSky audit · 17 Apr 2026',  tone: 'warn' },
          ].map((s, i) => (
            <div key={s.k} style={{ padding: '20px 22px', borderRight: i < 3 ? '1px solid var(--rule)' : 'none' }}>
              <div className="t-label" style={{ padding: 0 }}>{s.k}</div>
              <div style={{
                marginTop: 8,
                fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400,
                letterSpacing: '-0.018em', color: 'var(--ink)', lineHeight: 1,
              }}>{s.v}</div>
              <div className="t-meta" style={{
                marginTop: 8,
                color: s.tone === 'ok' ? 'var(--accent)' :
                       s.tone === 'warn' ? 'var(--warn)' :
                       s.tone === 'info' ? 'var(--info)' : 'var(--ink-3)',
              }}>{s.m}</div>
            </div>
          ))}
        </div>

        {/* filter bar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0,
          padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div className="input" style={{ width: 280, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Name, permission, scope…" />
          </div>
          <FilterChip label="Kind" value="All" />
          <FilterChip label="Domain" value="All" />
          <FilterChip label="Members" value="≥ 1" count={1} />
          <div style={{ flex: 1 }} />
          <span className="t-meta">Sorted by · <span style={{ color: 'var(--ink-2)' }}>Members ↓</span></span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 32 }}><input type="checkbox" /></th>
                <th>Role</th>
                <th>Members</th>
                <th>Kind</th>
                <th>Scope</th>
                <th>Permissions</th>
                <th>Last edited</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r, i) => (
                <tr key={r.id} className={i === 3 ? 'selected' : ''}>
                  <td><input type="checkbox" /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--surface-sunk)',
                        border: '1px solid var(--rule)',
                        color: 'var(--ink-2)',
                      }}>
                        <Icon name={r.system ? 'shield' : 'key'} size={13} />
                      </span>
                      <div>
                        <div style={{ fontSize: 13.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {r.name}
                          {i === 3 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.14em' }}>· EDITING</span>}
                        </div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{r.desc}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)',
                        fontVariantNumeric: 'tabular-nums', minWidth: 22, textAlign: 'right',
                      }}>{r.members}</span>
                      <span className="t-meta">admins</span>
                    </div>
                  </td>
                  <td>
                    {r.system
                      ? <span className="badge"><Icon name="shield" size={10} stroke={2} /> System</span>
                      : <span className="badge ok"><span className="dot ok" /> Custom</span>}
                  </td>
                  <td className="num" style={{ color: 'var(--ink-2)' }}>{r.scope}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 60, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: (parseInt(r.perms) / 143) * 100 + '%',
                          height: '100%',
                          background: parseInt(r.perms) === 143 ? 'var(--accent)' : 'var(--ink-3)',
                        }} />
                      </div>
                      <span className="num" style={{ color: 'var(--ink-2)' }}>{r.perms}</span>
                    </div>
                  </td>
                  <td className="num" style={{ color: 'var(--ink-3)' }}>{r.version}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn ghost icon sm"><Icon name="moreVert" size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{
            padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid var(--rule)', background: 'var(--surface-2)',
          }}>
            <div className="t-meta">
              Showing <span style={{ color: 'var(--ink-2)' }}>1–12</span> of <span style={{ color: 'var(--ink-2)' }}>12</span>
            </div>
            <div className="t-meta">All role changes are versioned and audit-logged · last change 4h ago</div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 3.2 — Role Editor (Permission Matrix)
// ──────────────────────────────────────────────────────────────
function RoleEditorScreen() {
  // Each permission has state: 'granted' | 'scoped' | 'none'
  const groups = [
    { id: 'dashboard', label: 'Dashboard',            count: 4,  granted: 4,  active: false },
    { id: 'dispatch',  label: 'Dispatch',             count: 4,  granted: 4,  active: true },
    { id: 'roadbook',  label: 'Bookings · Road',      count: 8,  granted: 6 },
    { id: 'airbook',   label: 'Bookings · Air',       count: 7,  granted: 0 },
    { id: 'drivers',   label: 'Drivers & Vehicles',   count: 12, granted: 5 },
    { id: 'operators', label: 'Operators & Aircraft', count: 10, granted: 0 },
    { id: 'customers', label: 'Customers',            count: 7,  granted: 2 },
    { id: 'catalog',   label: 'Catalog & Pricing',    count: 9,  granted: 0 },
    { id: 'promos',    label: 'Promotions',           count: 6,  granted: 0 },
    { id: 'payments',  label: 'Payments & Payouts',   count: 12, granted: 0 },
    { id: 'support',   label: 'Support',              count: 7,  granted: 0 },
    { id: 'kyc',       label: 'KYC & Compliance',     count: 5,  granted: 0 },
    { id: 'notifs',    label: 'Notifications',        count: 6,  granted: 0 },
    { id: 'system',    label: 'Branding & Settings',  count: 11, granted: 0 },
    { id: 'audit',     label: 'Audit & Integrations', count: 9,  granted: 0 },
  ];
  const perms = [
    { key: 'dispatch.console.view',     desc: 'Open the dispatch console and view the live queue and map',           state: 'scoped', scope: 'BLR · MUM · HYD' },
    { key: 'dispatch.manual_assign',    desc: 'Pick a specific driver from the eligible list and force-assign',       state: 'scoped', scope: 'BLR · MUM · HYD' },
    { key: 'dispatch.surge.override',   desc: 'Manually set a surge multiplier (capped at regulatory maximum)',       state: 'granted' },
    { key: 'dispatch.exception.resolve',desc: 'Resolve dispatch exceptions: expand radius, manual assign, cancel',    state: 'scoped', scope: 'BLR · MUM · HYD' },
  ];

  const TriState = ({ state }) => (
    <div style={{ display: 'inline-flex', border: '1px solid var(--rule-strong)', borderRadius: 3, overflow: 'hidden' }}>
      {['none', 'scoped', 'granted'].map((s, i) => {
        const on = state === s;
        const label = s === 'none' ? 'Off' : s === 'scoped' ? 'Scoped' : 'Granted';
        return (
          <span key={s} style={{
            height: 26, padding: '0 10px',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.10em', textTransform: 'uppercase',
            borderRight: i < 2 ? '1px solid var(--rule)' : 'none',
            color: on ? (s === 'granted' ? '#fff' : 'var(--ink)') : 'var(--ink-3)',
            background: on
              ? (s === 'granted' ? 'var(--accent)' : s === 'scoped' ? 'var(--surface-sunk)' : 'var(--surface-sunk)')
              : 'var(--surface)',
            fontWeight: on ? 500 : 400,
          }}>
            <span style={{
              width: 7, height: 7,
              background: s === 'granted' ? (on ? '#fff' : 'var(--accent)') :
                          s === 'scoped'  ? 'var(--warn)' : 'var(--ink-4)',
              borderRadius: s === 'scoped' ? 0 : '50%',
              transform: s === 'scoped' ? 'rotate(45deg)' : 'none',
            }} />
            {label}
          </span>
        );
      })}
    </div>
  );

  return (
    <Shell
      active="rbac"
      breadcrumb="System · Identity & Access · Roles"
      title="Dispatcher · Lead"
      subtitle="Custom role · v5 · 2 admins assigned · last edited 4h ago"
      actions={
        <>
          <button className="btn sm"><Icon name="copy" size={13} />Clone</button>
          <button className="btn sm"><Icon name="archive" size={13} />Version history</button>
          <button className="btn sm danger">Delete</button>
          <button className="btn sm">Discard</button>
          <button className="btn sm accent">Publish · v6</button>
        </>
      }
    >
      {/* role header */}
      <div style={{
        padding: '20px 32px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--rule)',
        display: 'flex',
        gap: 28,
        alignItems: 'flex-end',
      }}>
        <div style={{ flex: 1, maxWidth: 600 }}>
          <div className="t-label">Role name</div>
          <div style={{
            marginTop: 6,
            display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: '1px dashed var(--rule-strong)', paddingBottom: 8,
          }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.018em' }}>Dispatcher · Lead</span>
            <span className="badge"><Icon name="key" size={10} /> Custom</span>
            <span className="badge ok"><span className="dot ok" /> Active</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>v5 → draft v6</span>
          </div>
          <div className="t-label" style={{ marginTop: 14 }}>Description</div>
          <div style={{ marginTop: 6, fontSize: 13.5, color: 'var(--ink-2)', maxWidth: 560 }}>
            Manage dispatch console with the authority to override surge within configured caps, force-assign across zones, and resolve exceptions. Used by lead dispatchers in BLR, MUM, HYD.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', paddingBottom: 4 }}>
          {[
            ['Permissions granted', '24', '/ 143 · 16.8%'],
            ['Admins on this role', '2', 'Priya I · Karthik N'],
            ['Scope dimensions',    '2', 'Zone · Service'],
          ].map(([k, v, m]) => (
            <div key={k}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{
                marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8,
                fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400,
                letterSpacing: '-0.018em',
              }}>{v}</div>
              <div className="t-meta" style={{ marginTop: 4 }}>{m}</div>
            </div>
          ))}
        </div>
      </div>

      {/* matrix layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '244px 1fr 340px', minHeight: 'calc(100% - 200px)' }}>
        {/* domain rail */}
        <aside style={{
          background: 'var(--surface)',
          borderRight: '1px solid var(--rule)',
          padding: '18px 0',
        }}>
          <div className="t-label" style={{ padding: '0 18px 8px' }}>Domains</div>
          {groups.map(g => (
            <div key={g.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 18px', cursor: 'pointer',
              borderLeft: '2px solid ' + (g.active ? 'var(--accent)' : 'transparent'),
              background: g.active ? 'var(--surface-2)' : 'transparent',
              color: g.active ? 'var(--ink)' : 'var(--ink-2)',
              fontWeight: g.active ? 500 : 400,
            }}>
              <span style={{ flex: 1, fontSize: 13 }}>{g.label}</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10.5,
                color: g.granted > 0 ? 'var(--accent)' : 'var(--ink-4)',
              }}>{g.granted}/{g.count}</span>
            </div>
          ))}
        </aside>

        {/* matrix table */}
        <div style={{ padding: '20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="t-label">Permissions in domain</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>
                Dispatch <span style={{ color: 'var(--ink-3)' }}>· 4 of 4 granted</span>
              </h3>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sm ghost"><Icon name="check" size={12} stroke={2.2} />Grant all</button>
              <button className="btn sm ghost"><Icon name="close" size={12} />Clear all</button>
            </div>
          </div>

          {/* header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.5fr 270px 1fr',
            padding: '10px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            borderBottom: 0,
          }}>
            <div className="t-label" style={{ padding: 0 }}>Permission</div>
            <div className="t-label" style={{ padding: 0 }}>State</div>
            <div className="t-label" style={{ padding: 0 }}>Scope</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            {perms.map((p, i) => (
              <div key={p.key} style={{
                display: 'grid', gridTemplateColumns: '1.5fr 270px 1fr',
                padding: '16px 14px',
                borderBottom: i < perms.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>{p.key}</div>
                  <div className="t-meta" style={{ marginTop: 4, color: 'var(--ink-3)' }}>{p.desc}</div>
                </div>
                <div><TriState state={p.state} /></div>
                <div>
                  {p.scope ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '3px 8px',
                        border: '1px dashed color-mix(in oklab, var(--warn) 30%, var(--rule-strong))',
                        background: 'var(--warn-soft)',
                        color: 'var(--warn)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10.5,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        borderRadius: 2,
                      }}>
                        Zones · {p.scope.split('·').length}
                      </span>
                      <span className="t-meta" style={{ color: 'var(--ink-2)' }}>{p.scope}</span>
                      <Icon name="chevDown" size={12} style={{ color: 'var(--ink-3)' }} />
                    </div>
                  ) : (
                    p.state === 'granted'
                      ? <span className="t-meta" style={{ color: 'var(--ink-2)' }}>Global · all zones</span>
                      : <span className="t-meta">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* extra context block */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span className="t-label">Scope · Zones</span>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { z: 'Z-N4 · Indiranagar',  on: true },
                { z: 'Z-S1 · HSR',          on: true },
                { z: 'Z-E2 · Whitefield',   on: true },
                { z: 'Z-S2 · Bommanahalli', on: false },
                { z: 'Z-N1 · MG Road',      on: true },
                { z: 'Z-W3 · Yeshwantpur',  on: false },
                { z: 'MUM · All zones',     on: true, sticky: true },
                { z: 'HYD · All zones',     on: true, sticky: true },
                { z: '+ 12 more',           on: false, more: true },
              ].map((c, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  height: 30, padding: '0 12px',
                  borderRadius: 3,
                  fontSize: 12,
                  border: '1px solid ' + (c.on ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' : 'var(--rule)'),
                  background: c.on ? 'var(--accent-soft)' : 'var(--surface)',
                  color: c.on ? 'var(--accent-ink)' : (c.more ? 'var(--ink-3)' : 'var(--ink-2)'),
                  fontFamily: c.more ? 'var(--font-mono)' : 'var(--font-sans)',
                }}>
                  {!c.more && <Icon name={c.on ? 'check' : 'plus'} size={11} stroke={2.2} />}
                  {c.z}
                </span>
              ))}
            </div>
            <div className="t-meta" style={{ marginTop: 12, color: 'var(--ink-3)' }}>
              These permissions only apply within the selected zones. Outside scope, the role behaves as if the permission is not granted.
            </div>
          </div>
        </div>

        {/* side rail */}
        <aside style={{
          background: 'var(--surface)',
          borderLeft: '1px solid var(--rule)',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}>
          {/* effective access */}
          <div>
            <div className="t-label" style={{ marginBottom: 10 }}>Effective access · draft</div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            }}>
              {[
                { d: 'Dashboard',  v: '4 / 4',   tone: 'ok' },
                { d: 'Dispatch',   v: '4 / 4',   tone: 'ok' },
                { d: 'Road book',  v: '6 / 8',   tone: 'warn' },
                { d: 'Air book',   v: '0 / 7',   tone: 'pending' },
                { d: 'Drivers',    v: '5 / 12',  tone: 'warn' },
                { d: 'Operators',  v: '0 / 10',  tone: 'pending' },
                { d: 'Customers',  v: '2 / 7',   tone: 'warn' },
                { d: 'Pricing',    v: '0 / 9',   tone: 'pending' },
                { d: 'Payments',   v: '0 / 12',  tone: 'pending' },
                { d: 'Audit',      v: '3 / 9',   tone: 'warn' },
              ].map(s => (
                <div key={s.d} style={{
                  padding: '8px 10px',
                  border: '1px solid var(--rule)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: s.tone === 'ok' ? 'var(--accent-soft-2)' : 'var(--surface-2)',
                }}>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{s.d}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: s.tone === 'ok' ? 'var(--accent)' :
                           s.tone === 'warn' ? 'var(--warn)' : 'var(--ink-3)',
                  }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* members */}
          <div>
            <div className="t-label" style={{ marginBottom: 10 }}>Members · 2</div>
            {[
              { n: 'Priya Iyer',   e: 'priya.iyer@acmemobility.io',  meta: 'Lead · BLR' },
              { n: 'Karthik Nair', e: 'karthik.nair@acmemobility.io',meta: 'Acting · HYD' },
            ].map(m => (
              <div key={m.e} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0',
                borderBottom: '1px solid var(--rule-soft)',
              }}>
                <div className="avatar">{m.n.split(' ').map(p=>p[0]).join('')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5 }}>{m.n}</div>
                  <div className="t-meta" style={{ marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.e}</div>
                </div>
                <button className="btn ghost icon sm"><Icon name="external" size={11} /></button>
              </div>
            ))}
            <button className="btn sm ghost" style={{ marginTop: 8, width: '100%' }}><Icon name="plus" size={12} />Assign admin</button>
          </div>

          {/* versions */}
          <div>
            <div className="t-label" style={{ marginBottom: 10 }}>Version history</div>
            {[
              { v: 'v6 · draft',  who: 'Sana Reyes',  when: 'In progress', tone: 'warn' },
              { v: 'v5',          who: 'Sana Reyes',  when: '21 Apr 2026', tone: 'ok' },
              { v: 'v4',          who: 'V. Bhatt',    when: '18 Feb 2025', tone: 'pending' },
              { v: 'v3',          who: 'Sana Reyes',  when: '08 Jan 2025', tone: 'pending' },
            ].map((v, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0',
                borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none',
              }}>
                <span className={'dot ' + v.tone} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5 }}>{v.v}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{v.who} · {v.when}</div>
                </div>
                {v.tone !== 'warn' && <button className="btn ghost icon sm"><Icon name="external" size={11} /></button>}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 3.3 — Permissions Catalog
// ──────────────────────────────────────────────────────────────
function PermissionsCatalogScreen() {
  const catalog = [
    { domain: 'Dashboard',         keys: [
      ['dashboard.view',                'See the operations dashboard',                                'Dashboard',   '12 roles'],
      ['dashboard.revenue.view',        'See revenue KPIs and trends',                                 'Dashboard',   '4 roles'],
      ['dashboard.livemap.view',        'Access the live operations map',                              'Dashboard',   '8 roles'],
      ['dashboard.quickactions.use',    'Use quick-create and broadcast actions',                      'Dashboard',   '3 roles'],
    ]},
    { domain: 'Dispatch',          keys: [
      ['dispatch.console.view',         'Open the dispatch console and live queue',                    'Dispatch',    '5 roles'],
      ['dispatch.manual_assign',        'Force-assign a driver from the eligible list',                'Dispatch',    '4 roles'],
      ['dispatch.surge.override',       'Manually set a surge multiplier within cap',                  'Dispatch',    '2 roles'],
      ['dispatch.exception.resolve',    'Resolve dispatch exceptions and stuck states',                'Dispatch',    '4 roles'],
    ]},
    { domain: 'Bookings · Road',   keys: [
      ['bookings.road.view',            'List and inspect road bookings',                              'Road book.',  '9 roles'],
      ['bookings.road.create_assisted', 'Create a booking on behalf of a customer',                    'Road book.',  '5 roles'],
      ['bookings.road.reassign',        'Reassign an accepted ride to another driver',                 'Road book.',  '4 roles'],
      ['bookings.road.force_assign',    'Bypass auto-dispatch and assign manually',                    'Road book.',  '3 roles'],
      ['bookings.road.cancel',          'Cancel a road booking with reason',                           'Road book.',  '6 roles'],
      ['bookings.road.adjust_fare',     'Post a corrective fare adjustment',                           'Road book.',  '2 roles'],
      ['bookings.road.refund',          'Initiate or approve a refund on a road booking',              'Payments',    '3 roles'],
      ['bookings.road.dispute.resolve', 'Close a disputed booking with refund / clawback',             'Disputes',    '3 roles'],
    ]},
  ];

  return (
    <Shell
      active="rbac"
      breadcrumb="System · Identity & Access · Roles"
      title="Permission catalog"
      subtitle="Canonical registry · 143 permissions across 17 domains · v2.4"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export · CSV</button>
          <button className="btn sm"><Icon name="external" size={13} />Open in roles</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        {/* left domain index */}
        <aside>
          <div className="input" style={{ height: 32, marginBottom: 14 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Search permission key…" />
          </div>
          <div className="t-label" style={{ marginBottom: 8 }}>Domains</div>
          {[
            ['Dashboard',         4],
            ['Dispatch',          4, true],
            ['Bookings · Road',   8],
            ['Bookings · Air',    7],
            ['Drivers & Fleet',  12],
            ['Operators · Air',  10],
            ['Customers',         7],
            ['Catalog',           9],
            ['Pricing',           9],
            ['Promotions',        6],
            ['Payments',         12],
            ['Payouts',           7],
            ['Support',           7],
            ['KYC',               5],
            ['Notifications',     6],
            ['Branding · System',11],
            ['Audit · Integrations', 9],
          ].map(([d, n, active]) => (
            <div key={d} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 12px',
              margin: '0 -12px',
              borderLeft: '2px solid ' + (active ? 'var(--accent)' : 'transparent'),
              background: active ? 'var(--surface-2)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-2)',
              fontSize: 13,
              fontWeight: active ? 500 : 400,
            }}>
              <span style={{ flex: 1 }}>{d}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>{n}</span>
            </div>
          ))}
        </aside>

        {/* right — domain content */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div className="t-label">Domain</div>
              <h2 style={{
                margin: '4px 0 0',
                fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.018em',
              }}>Dispatch <span style={{ color: 'var(--ink-3)' }}>· 4 permissions</span></h2>
              <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-3)', maxWidth: 720 }}>
                Operational permissions for the dispatch console — live queue, manual assignment, surge override, and exception resolution.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sm ghost">Previous: Dashboard</button>
              <button className="btn sm">Next: Road bookings →</button>
            </div>
          </div>

          {catalog.map(group => (
            <div key={group.domain} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className="t-label" style={{ padding: 0, color: group.domain === 'Dispatch' ? 'var(--accent)' : 'var(--ink-3)' }}>{group.domain}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
                <span className="t-meta">{group.keys.length} keys</span>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Permission key</th>
                      <th>Description</th>
                      <th>Consumed by</th>
                      <th>Held by</th>
                      <th style={{ textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.keys.map(([k, d, c, h], i) => (
                      <tr key={k}>
                        <td>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 12.5,
                            background: 'var(--surface-2)',
                            border: '1px solid var(--rule)',
                            padding: '3px 8px', borderRadius: 2,
                            color: 'var(--ink)',
                          }}>{k}</span>
                        </td>
                        <td style={{ color: 'var(--ink-2)' }}>{d}</td>
                        <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{c}</td>
                        <td>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 11.5,
                            color: 'var(--accent)',
                          }}>{h}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn ghost icon sm"><Icon name="copy" size={12} /></button>
                          <button className="btn ghost icon sm"><Icon name="external" size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, {
  RolesListScreen, RoleEditorScreen, PermissionsCatalogScreen,
});
