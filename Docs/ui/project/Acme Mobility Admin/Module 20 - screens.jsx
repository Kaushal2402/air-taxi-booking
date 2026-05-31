/* ─────────────────────────────────────────────────────────────
   Module 20 — Admin Users (Team, Detail, Invites & Requests)
   Screens 20.1 → 20.3
   ───────────────────────────────────────────────────────────── */

const ADMINS = [
  { name: 'Sana Reyes',     email: 'sana.reyes@acme',    role: 'Super Admin',    scope: 'All regions',     mfa: true,  last: 'Active now',   status: 'active', current: true },
  { name: 'Arjun Rao',      email: 'arjun.rao@acme',     role: 'Finance Admin',  scope: 'IN · Payments',   mfa: true,  last: '12m ago',      status: 'active' },
  { name: 'Leah Gomez',     email: 'leah.gomez@acme',    role: 'Ops Manager',    scope: 'BLR · Dispatch',  mfa: true,  last: '40m ago',      status: 'active' },
  { name: 'Dev Malhotra',   email: 'dev.malhotra@acme',  role: 'Support Lead',   scope: 'All · Tickets',   mfa: true,  last: '1h ago',       status: 'active' },
  { name: 'Priya Nair',     email: 'priya.nair@acme',    role: 'Catalog Editor', scope: 'Pricing · Promos',mfa: false, last: '3h ago',       status: 'active' },
  { name: 'Tom Becker',     email: 'tom.becker@acme',    role: 'Read-only',      scope: 'Analytics',       mfa: true,  last: '2d ago',       status: 'active' },
  { name: 'Reema Shah',     email: 'reema.shah@acme',    role: 'Ops Manager',    scope: 'MUM · Dispatch',  mfa: false, last: '8d ago',       status: 'idle' },
  { name: 'Ken Watanabe',   email: 'ken.w@acme',         role: 'Finance Admin',  scope: 'IN · Payouts',    mfa: true,  last: '31d ago',      status: 'suspended' },
];

function roleBadge(r) {
  const tone = r === 'Super Admin' ? 'solid' : r === 'Read-only' ? 'pending' : '';
  return <span className={'badge ' + tone}>{r}</span>;
}

// ──────────────────────────────────────────────────────────────
// 20.1 — Admin Team
// ──────────────────────────────────────────────────────────────
function AdminTeamScreen() {
  return (
    <Shell
      active="admins"
      breadcrumb="System · Admin users"
      title="Admin users"
      subtitle="8 admins · 6 active · 1 idle · 1 suspended · 2 MFA gaps · SSO enforced"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Access requests <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--warn)', color: '#fff', padding: '1px 6px', borderRadius: 8 }}>3</span></button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Invite admin</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* kpis */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            ['Total admins',  '8',  'Across 6 roles',     'var(--ink-2)'],
            ['Active · 7d',   '6',  '75% of team',        'var(--accent)'],
            ['MFA enabled',   '6 / 8','2 gaps · enforce', 'var(--warn)'],
            ['Pending invites','2', 'Awaiting accept',    'var(--ink-2)'],
            ['Access requests','3', 'Need approval',      'var(--danger)'],
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
            <input placeholder="Name, email, role…" />
          </div>
          <FilterChip label="Role" value="All" />
          <FilterChip label="Status" value="Active" count="1" />
          <FilterChip label="MFA" value="Any" />
        </div>

        {/* team table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Admin</th>
                <th>Role</th>
                <th>Scope</th>
                <th>MFA</th>
                <th>Last active</th>
                <th>Status</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {ADMINS.map(a => (
                <tr key={a.email} className={a.current ? 'selected' : ''} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div className="avatar">{a.name.split(' ').map(x => x[0]).join('')}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</span>
                        <span className="t-meta">{a.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{roleBadge(a.role)}</td>
                  <td className="t-meta">{a.scope}</td>
                  <td>
                    {a.mfa
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)' }}><Icon name="shield" size={13} />On</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--danger)' }}><Icon name="alert" size={13} />Off</span>}
                  </td>
                  <td className="t-meta">{a.last}</td>
                  <td>
                    {a.status === 'active'    ? <span className="badge ok"><span className="dot ok" />Active</span> :
                     a.status === 'idle'      ? <span className="badge warn"><span className="dot warn" />Idle</span> :
                     <span className="badge danger"><span className="dot danger" />Suspended</span>}
                  </td>
                  <td><button className="btn icon sm ghost"><Icon name="moreVert" size={15} /></button></td>
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
// 20.2 — Admin Detail
// ──────────────────────────────────────────────────────────────
function AdminDetailScreen() {
  const perms = [
    ['Bookings', 'Full', true], ['Dispatch', 'Full', true], ['Drivers & fleet', 'Full', true],
    ['Payments', 'View', true], ['Payouts', 'Approve', true], ['Pricing', 'Edit', true],
    ['RBAC & admins', 'Full', true], ['Settings', 'Full', true],
  ];
  const sessions = [
    ['MacBook Pro · Chrome', 'Bengaluru, IN', '103.21.x.x', 'Current', true],
    ['iPhone 15 · App',      'Bengaluru, IN', '103.21.x.x', '2h ago', false],
    ['Windows · Edge',       'Mumbai, IN',    '49.36.x.x',  '3d ago', false],
  ];
  const activity = [
    ['Approved payout run', 'PR-W22-DRV · ₹38.4 L', '11:20 today', 'ok'],
    ['Changed pricing rule','PR-BLR-SXL-12 → v12',  'Yesterday 16:40', 'info'],
    ['Suspended admin',     'Ken Watanabe',          '2d ago', 'warn'],
    ['Updated role scope',  'Leah Gomez → BLR only', '4d ago', 'info'],
  ];

  return (
    <Shell
      active="admins"
      breadcrumb="System · Admin users · Profile"
      title="Sana Reyes"
      subtitle="Super Admin · all regions · MFA on · joined Jan 2023"
      actions={
        <>
          <button className="btn sm">Reset password</button>
          <button className="btn sm">Change role</button>
          <button className="btn sm danger"><Icon name="logout" size={13} />Revoke sessions</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24 }}>
        {/* left — profile + permissions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="avatar xl">SR</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>Sana Reyes</div>
                <div className="t-meta" style={{ marginTop: 4 }}>sana.reyes@acme</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <span className="badge solid">Super Admin</span>
                  <span className="badge ok"><span className="dot ok" />Active</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[['MFA', 'TOTP + key'], ['SSO', 'Okta · linked'], ['Last login', 'Active now'], ['Created', 'Jan 2023']].map(([k, v]) => (
                <div key={k} style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 5, fontSize: 13, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="t-label">Effective permissions</div>
              <span className="t-meta">via Super Admin role</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {perms.map(([k, lvl]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <span style={{ fontSize: 12.5 }}>{k}</span>
                  <span className="t-mono" style={{ fontSize: 11, color: lvl === 'Full' || lvl === 'Approve' ? 'var(--accent)' : 'var(--ink-3)' }}>{lvl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right — sessions + activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label">Active sessions</div>
              <button className="btn sm danger ghost">Revoke all others</button>
            </div>
            <div style={{ padding: '4px 22px 12px' }}>
              {sessions.map(([dev, loc, ip, t, cur], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: i < sessions.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <Icon name={dev.includes('iPhone') ? 'device' : dev.includes('Mac') ? 'device' : 'device'} size={16} style={{ color: 'var(--ink-3)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{dev}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{loc} · {ip}</div>
                  </div>
                  {cur
                    ? <span className="badge ok"><span className="dot ok" />Current</span>
                    : <span className="t-meta">{t}</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label">Recent activity</div>
              <button className="btn sm ghost">View audit log</button>
            </div>
            <div style={{ padding: '4px 22px 12px' }}>
              {activity.map(([t, m, ts, sev], i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '13px 0', borderBottom: i < activity.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <span className={'dot ' + (sev === 'ok' ? 'ok' : sev === 'warn' ? 'warn' : 'info')} style={{ marginTop: 6 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{t} · <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{m}</span></div>
                    <div className="t-meta" style={{ marginTop: 3 }}>{ts}</div>
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

// ──────────────────────────────────────────────────────────────
// 20.3 — Invites & Access Requests
// ──────────────────────────────────────────────────────────────
function InvitesScreen() {
  const requests = [
    { who: 'Maya Krishnan', email: 'maya.k@acme', ask: 'Finance Admin · Payouts approve', by: 'Self-request', reason: 'Covering Ken during leave', age: '2h' },
    { who: 'Raj Bhatia',    email: 'raj.b@acme',  ask: 'Ops Manager · DEL dispatch',      by: 'L. Gomez',     reason: 'New Delhi ops hire', age: '5h' },
    { who: 'Nina Costa',    email: 'nina.c@acme', ask: 'Read-only · Analytics',           by: 'Self-request', reason: 'Quarterly board reporting', age: '1d' },
  ];
  const invites = [
    ['Karan Singh', 'karan.s@acme', 'Support Agent', 'Sent 2d ago', 'pending'],
    ['Ella Fowler', 'ella.f@acme',  'Catalog Editor','Sent 4d ago', 'pending'],
    ['Omar Aziz',   'omar.a@acme',  'Read-only',     'Expired',     'expired'],
  ];

  return (
    <Shell
      active="admins"
      breadcrumb="System · Admin users · Access"
      title="Invites & access requests"
      subtitle="3 requests awaiting approval · 2 invites pending · approvals logged to audit"
      actions={
        <>
          <button className="btn sm">Approval policy</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Invite admin</button>
        </>
      }
    >
      <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        {/* access requests */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>Access requests</h3>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            <span className="t-meta">3 pending</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {requests.map(r => (
              <div key={r.email} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div className="avatar lg">{r.who.split(' ').map(x => x[0]).join('')}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{r.who}</div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{r.email}</div>
                      </div>
                      <span className="t-meta">{r.age} ago</span>
                    </div>
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="key" size={13} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{r.ask}</span>
                      </div>
                      <div className="t-meta" style={{ marginTop: 6 }}>Requested by {r.by} · "{r.reason}"</div>
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button className="btn sm danger">Deny</button>
                      <button className="btn sm">Modify scope</button>
                      <button className="btn sm accent"><Icon name="check" size={13} />Approve</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* pending invites */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>Pending invites</h3>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            {invites.map(([n, e, role, t, st], i) => (
              <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 20px', borderBottom: i < invites.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                <div className="avatar" style={{ background: 'var(--surface-sunk)', color: 'var(--ink-4)' }}>{n.split(' ').map(x => x[0]).join('')}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{n}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{e} · {role}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {st === 'pending'
                    ? <span className="badge warn"><span className="dot warn" />Pending</span>
                    : <span className="badge danger"><span className="dot danger" />Expired</span>}
                  <div className="t-meta" style={{ marginTop: 4 }}>{t}</div>
                </div>
              </div>
            ))}
            <div style={{ padding: '14px 20px', display: 'flex', gap: 8 }}>
              <button className="btn sm" style={{ flex: 1 }}><Icon name="refresh" size={13} />Resend all</button>
              <button className="btn sm accent" style={{ flex: 1 }}><Icon name="plus" size={13} />New invite</button>
            </div>
          </div>

          <div style={{ marginTop: 18, padding: '16px 20px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <Icon name="shield" size={15} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Approval policy</span>
            </div>
            <div className="t-meta" style={{ lineHeight: 1.5 }}>Finance & Super Admin grants need two approvers. Invites expire in 7 days. All grants are written to the audit log.</div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { AdminTeamScreen, AdminDetailScreen, InvitesScreen, ADMINS });
