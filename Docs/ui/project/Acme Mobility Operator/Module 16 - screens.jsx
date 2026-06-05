/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 16 — Settings
   16.1  Notifications — per-event email/SMS/in-app toggles
   16.2  Team & Roles — member list, roles, invite flow
   ───────────────────────────────────────────────────────────── */

// ─── Toggle ────────────────────────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{ width: 30, height: 17, borderRadius: 9, background: on ? 'var(--accent)' : 'var(--rule-strong)', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: on ? 'flex-end' : 'flex-start', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
    >
      <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
    </div>
  );
}

// ─── Notification row ──────────────────────────────────────────
function NotifRow({ label, sub, email, sms, app, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '11px 16px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)' }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{label}</div>
        {sub && <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ width: 80, display: 'flex', justifyContent: 'center' }}>
        <Toggle on={email} />
      </div>
      <div style={{ width: 80, display: 'flex', justifyContent: 'center' }}>
        <Toggle on={sms} />
      </div>
      <div style={{ width: 80, display: 'flex', justifyContent: 'center' }}>
        <Toggle on={app} />
      </div>
    </div>
  );
}

// ─── Notif category block ──────────────────────────────────────
function NotifBlock({ title, rows }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', borderTop: '1px solid var(--rule)' }}>
        <span className="t-label">{title}</span>
      </div>
      {rows.map((r, i) => <NotifRow key={r.label} {...r} last={i === rows.length-1} />)}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// 16.1 — Notifications
// ─────────────────────────────────────────────────────────────
function NotificationsScreen() {
  return (
    <Shell
      active="notifications"
      breadcrumb="Settings"
      title="Notifications"
      subtitle="Helix Aviation · Configure how and when you're notified"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm">Reset to defaults</button>
          <button className="btn sm accent"><Icon name="check" size={12} />Save changes</button>
        </div>
      }
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left: notification rules ──────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid var(--rule)' }}>

          {/* channel header */}
          <div style={{ display: 'flex', padding: '10px 16px', borderBottom: '1px solid var(--rule)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ flex: 1 }} />
            {['Email', 'SMS', 'In-app'].map(ch => (
              <div key={ch} style={{ width: 80, textAlign: 'center' }}>
                <span className="t-label" style={{ fontSize: 10 }}>{ch}</span>
              </div>
            ))}
          </div>

          <NotifBlock title="Booking requests" rows={[
            { label: 'New booking request',        sub: 'When a passenger submits a new request',           email: true,  sms: true,  app: true  },
            { label: 'Request deadline warning',   sub: 'TTL < 30 min remaining',                          email: true,  sms: true,  app: true  },
            { label: 'Request auto-rejected',      sub: 'Unanswered request expired',                      email: true,  sms: false, app: true  },
            { label: 'Quote accepted by passenger',sub: 'Passenger accepted your quote',                   email: true,  sms: true,  app: true  },
            { label: 'Quote declined',             sub: 'Passenger rejected your quote',                   email: true,  sms: false, app: true  },
          ]} />

          <NotifBlock title="Operations" rows={[
            { label: 'Flight assigned',            sub: 'Aircraft & crew confirmed for a booking',         email: true,  sms: false, app: true  },
            { label: 'Scheduling conflict',        sub: 'Overlapping assignment detected',                 email: true,  sms: true,  app: true  },
            { label: 'Manifest due soon',          sub: '2 hrs before DGCA submission deadline',           email: true,  sms: true,  app: true  },
            { label: 'Manifest submitted',         sub: 'DGCA submission confirmed',                       email: false, sms: false, app: true  },
            { label: 'Flight departed',            sub: 'Crew reports departure',                          email: false, sms: false, app: true  },
            { label: 'Flight landed',              sub: 'Crew reports arrival',                            email: true,  sms: false, app: true  },
            { label: 'Flight delay / ATC hold',    sub: 'ACARS or crew reports delay',                     email: true,  sms: true,  app: true  },
          ]} />

          <NotifBlock title="Finance" rows={[
            { label: 'Payout processed',           sub: 'Settlement transferred to bank',                  email: true,  sms: false, app: true  },
            { label: 'Dispute opened',             sub: 'Acme Mobility opens a settlement dispute',        email: true,  sms: true,  app: true  },
            { label: 'Invoice issued',             sub: 'New platform invoice available',                  email: true,  sms: false, app: false },
          ]} />

          <NotifBlock title="Compliance & fleet" rows={[
            { label: 'Document expiring (30 days)',sub: 'Insurance, ARC, C of A nearing expiry',           email: true,  sms: false, app: true  },
            { label: 'Document expiring (7 days)', sub: 'Urgent — requires immediate action',              email: true,  sms: true,  app: true  },
            { label: 'Document expired',           sub: 'Listing may be paused',                           email: true,  sms: true,  app: true  },
            { label: 'Maintenance due',            sub: 'Aircraft approaching scheduled check',            email: true,  sms: false, app: true  },
            { label: 'FDP limit warning',          sub: 'Crew member approaching monthly limit',           email: true,  sms: false, app: true  },
          ]} />

          <NotifBlock title="Team" rows={[
            { label: 'New team member joined',     sub: 'Invite accepted',                                 email: true,  sms: false, app: true  },
            { label: 'Role changed',               sub: 'Admin changes a team member\'s permissions',      email: true,  sms: false, app: true  },
            { label: 'Team member removed',        sub: '',                                                email: true,  sms: false, app: false },
          ]} />
        </div>

        {/* ── Right: channel settings ───────────────── */}
        <div style={{ width: 320, flexShrink: 0, background: 'var(--surface)', overflowY: 'auto', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Email</div>
            <div className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="field">
                <label className="field-label">Primary address</label>
                <div className="input" style={{ height: 32 }}><input defaultValue="ops@helixaviation.in" style={{ flex: 1 }} /></div>
              </div>
              <div className="field">
                <label className="field-label">CC address <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-sans)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-4)' }}>optional</span></label>
                <div className="input" style={{ height: 32 }}><input defaultValue="ceo@helixaviation.in" style={{ flex: 1 }} /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Toggle on={true} />
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Daily digest at 07:00 IST</span>
              </div>
            </div>
          </section>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>SMS</div>
            <div className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="field">
                <label className="field-label">Mobile number</label>
                <div className="input" style={{ height: 32 }}><input defaultValue="+91-98200-12345" style={{ flex: 1 }} /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Toggle on={true} />
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Enable SMS alerts</span>
              </div>
              <div className="t-meta" style={{ fontSize: 11 }}>SMS is reserved for urgent alerts only (deadline warnings, delays, expired docs).</div>
            </div>
          </section>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Quiet hours</div>
            <div className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <Toggle on={true} />
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Enable quiet hours</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label className="field-label">From</label>
                  <div className="input" style={{ height: 32 }}>
                    <input defaultValue="22:00" style={{ flex: 1, fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">To</label>
                  <div className="input" style={{ height: 32 }}>
                    <input defaultValue="07:00" style={{ flex: 1, fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>
              </div>
              <div className="t-meta" style={{ fontSize: 11 }}>Critical alerts (expired docs, scheduling conflicts) override quiet hours.</div>
            </div>
          </section>

          <button className="btn accent" style={{ width: '100%', height: 38, justifyContent: 'center', fontWeight: 500 }}>
            <Icon name="check" size={13} />Save notification settings
          </button>
        </div>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 16.2 — Team & Roles
// ─────────────────────────────────────────────────────────────

// ─── Role badge ────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    'Admin':       'danger',
    'Operations':  'info',
    'Finance':     'ok',
    'Crew':        'warn',
    'Read-only':   'pending',
  };
  return <span className={`badge ${map[role] || 'pending'}`} style={{ height: 19, fontSize: 10.5 }}>{role}</span>;
}

// ─── Permission grid ────────────────────────────────────────────
function PermGrid({ perms }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {perms.map(([label, allowed], i, arr) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < arr.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</span>
          <Icon name={allowed ? 'check' : 'close'} size={13} style={{ color: allowed ? 'var(--ok)' : 'var(--rule-strong)' }} />
        </div>
      ))}
    </div>
  );
}

function TeamRolesScreen() {
  const [showInvite, setShowInvite] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState('Operations');

  const members = [
    { name: 'Arjun Kapoor',      email: 'arjun@helixaviation.in',  role: 'Admin',      joined: '14 Mar 2019', you: true,  active: true  },
    { name: 'Meera Joshi',       email: 'meera@helixaviation.in',  role: 'Operations', joined: '1 Jan 2022',  you: false, active: true  },
    { name: 'Sanjay Nair',       email: 'sanjay@helixaviation.in', role: 'Operations', joined: '15 Jun 2023', you: false, active: true  },
    { name: 'Priya Banerjee',    email: 'priya@helixaviation.in',  role: 'Finance',    joined: '3 Mar 2024',  you: false, active: true  },
    { name: 'Rahul Desai',       email: 'rahul@helixaviation.in',  role: 'Crew',       joined: '10 Sep 2023', you: false, active: true  },
    { name: 'Kavitha Sundaram',  email: 'kavitha@helixaviation.in',role: 'Read-only',  joined: '20 Apr 2025', you: false, active: false },
  ];

  const rolePerms = {
    'Admin':       [['All permissions','Full access'],['Manage team & roles',true],['Edit pricing & routes',true],['View finance',true],['Accept/reject bookings',true],['Day-of-flight ops',true]],
    'Operations':  [['Manage team & roles',false],['Edit pricing & routes',false],['View finance',false],['Accept/reject bookings',true],['Day-of-flight ops',true],['Manifests',true]],
    'Finance':     [['Manage team & roles',false],['Edit pricing & routes',false],['View finance',true],['Accept/reject bookings',false],['Day-of-flight ops',false],['Payouts & reports',true]],
    'Crew':        [['Manage team & roles',false],['Edit pricing & routes',false],['View finance',false],['Accept/reject bookings',false],['Day-of-flight ops',true],['Own schedule only',true]],
    'Read-only':   [['Manage team & roles',false],['Edit pricing & routes',false],['View finance',false],['Accept/reject bookings',false],['Day-of-flight ops',false],['View all (no edit)',true]],
  };

  return (
    <Shell
      active="team"
      breadcrumb="Settings"
      title="Team & Roles"
      subtitle="Helix Aviation · 6 members · 5 active"
      actions={
        <button className="btn sm accent" onClick={() => setShowInvite(true)}>
          <Icon name="plus" size={12} />Invite member
        </button>
      }
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left: member list ─────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid var(--rule)', position: 'relative' }}>

          {/* col header */}
          <div style={{ display: 'flex', padding: '8px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', position: 'sticky', top: 0, zIndex: 10 }}>
            {[['Member',0],['Role',120],['Joined',110],['Status',90],['',120,'right']].map(([l,w,a]) => (
              <div key={l} className="t-label" style={{ width: w||undefined, flex: !w?1:undefined, flexShrink: w?0:undefined, textAlign: a||'left' }}>{l}</div>
            ))}
          </div>

          {/* rows */}
          {members.map((m, i) => (
            <div key={m.email} style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: i < members.length-1 ? '1px solid var(--rule-soft)' : 'none', opacity: m.active ? 1 : 0.55 }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0 }}>
                  {m.name.split(' ').map(w => w[0]).join('').slice(0,2)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{m.name}</span>
                    {m.you && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', background: 'var(--surface-2)', border: '1px solid var(--rule-strong)', padding: '1px 6px', borderRadius: 2 }}>YOU</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 2 }}>{m.email}</div>
                </div>
              </div>
              <div style={{ width: 120, flexShrink: 0 }}>
                <RoleBadge role={m.role} />
              </div>
              <div style={{ width: 110, flexShrink: 0 }}>
                <span className="t-meta" style={{ fontSize: 11 }}>{m.joined}</span>
              </div>
              <div style={{ width: 90, flexShrink: 0 }}>
                <span className={`badge ${m.active ? 'ok' : 'pending'}`} style={{ height: 18 }}>
                  <span className={`dot ${m.active ? 'ok' : 'pending'}`} />{m.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ width: 120, flexShrink: 0, display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                {!m.you && (
                  <>
                    <button className="btn sm icon" style={{ height: 26, width: 26 }}><Icon name="settings" size={11} /></button>
                    <button className="btn sm danger" style={{ height: 26 }}><Icon name="close" size={11} /></button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* invite modal */}
          {showInvite && (
            <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in oklab,var(--bg) 60%,transparent)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div style={{ width: 480, background: 'var(--surface)', border: '1px solid var(--rule-strong)', borderRadius: 4, boxShadow: 'var(--shadow-pop)', overflow: 'hidden' }}>
                {/* modal header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--rule)' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Invite team member</div>
                  <button className="btn sm icon" onClick={() => setShowInvite(false)}><Icon name="close" size={13} /></button>
                </div>
                {/* modal body */}
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Email address</label>
                    <div className="input" style={{ height: 36 }}><input placeholder="colleague@helixaviation.in" style={{ flex: 1 }} /></div>
                  </div>
                  <div className="field">
                    <label className="field-label">Full name</label>
                    <div className="input" style={{ height: 36 }}><input placeholder="Name" style={{ flex: 1 }} /></div>
                  </div>
                  <div className="field">
                    <label className="field-label">Role</label>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 2 }}>
                      {['Admin','Operations','Finance','Crew','Read-only'].map(r => (
                        <button
                          key={r}
                          onClick={() => setSelectedRole(r)}
                          style={{
                            height: 30, padding: '0 12px', borderRadius: 3, fontSize: 12.5, cursor: 'pointer',
                            background: selectedRole === r ? 'var(--ink)' : 'var(--surface)',
                            color: selectedRole === r ? 'var(--bg)' : 'var(--ink-3)',
                            border: `1px solid ${selectedRole === r ? 'var(--ink)' : 'var(--rule-strong)'}`,
                          }}
                        >{r}</button>
                      ))}
                    </div>
                  </div>
                  {/* permission preview */}
                  <div style={{ padding: '10px 12px', background: 'var(--surface-sunk)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                    <div className="t-label" style={{ marginBottom: 8 }}>{selectedRole} permissions</div>
                    <PermGrid perms={(rolePerms[selectedRole] || []).filter(([,v]) => typeof v === 'boolean').map(([l,v]) => [l,v])} />
                  </div>
                </div>
                {/* modal footer */}
                <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--rule)', justifyContent: 'flex-end' }}>
                  <button className="btn" style={{ height: 34 }} onClick={() => setShowInvite(false)}>Cancel</button>
                  <button className="btn sm accent" style={{ height: 34 }}><Icon name="envelope" size={12} />Send invite</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: roles reference ────────────────── */}
        <div style={{ width: 320, flexShrink: 0, background: 'var(--surface)', overflowY: 'auto', padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          <section>
            <div className="t-label" style={{ marginBottom: 12 }}>Role permissions reference</div>
            {Object.entries(rolePerms).map(([role, perms]) => (
              <div key={role} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <RoleBadge role={role} />
                  <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                    {members.filter(m => m.role === role).length} member{members.filter(m => m.role === role).length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ paddingLeft: 4 }}>
                  <PermGrid perms={perms.filter(([,v]) => typeof v === 'boolean').map(([l,v]) => [l,v])} />
                </div>
                <div style={{ height: 1, background: 'var(--rule-soft)', marginTop: 12 }} />
              </div>
            ))}
          </section>

          <div style={{ padding: '10px 12px', background: 'color-mix(in oklab,var(--info) 8%,var(--surface))', border: '1px solid color-mix(in oklab,var(--info) 20%,var(--rule))', borderRadius: 3 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55 }}>Only <b>Admin</b> members can change roles, invite or remove team members. There must always be at least one Admin.</div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { NotificationsScreen, TeamRolesScreen });
