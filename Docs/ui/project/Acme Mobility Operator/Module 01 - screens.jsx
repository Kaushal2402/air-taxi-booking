/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 01 — Authentication & Identity
   Screens 1.1 → 1.5
   1.1 Sign In · 1.2 Two-Factor · 1.3 Reset Password
   1.4 User Profile · 1.5 Security & Sessions
   Uses shared globals from components.jsx (Shell, Icon, FormSection, …)
   ───────────────────────────────────────────────────────────── */

// ──────────────────────────────────────────────────────────────
// Small local helper — labelled checkbox row
// ──────────────────────────────────────────────────────────────
function CheckRow({ children, checked }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)' }}>
      <span style={{
        width: 16, height: 16, borderRadius: 2,
        border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--rule-strong)'),
        background: checked ? 'var(--accent-soft)' : 'var(--surface)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {checked && <Icon name="check" size={11} stroke={2.4} style={{ color: 'var(--accent)' }} />}
      </span>
      {children}
    </label>
  );
}

// ──────────────────────────────────────────────────────────────
// 1.1 — Sign In
// ──────────────────────────────────────────────────────────────
function LoginScreen() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.08fr 1fr',
      width: '100%', height: '100%',
      background: 'var(--bg)',
    }}>
      {/* Left — editorial panel */}
      <div style={{
        background: 'var(--surface-2)',
        borderRight: '1px solid var(--rule)',
        padding: '52px 60px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* faint route geometry */}
        <svg viewBox="0 0 600 600" style={{
          position: 'absolute', top: -120, right: -160, width: 720, height: 720,
          opacity: 0.10, color: 'var(--ink-3)',
        }} aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth="0.8">
            <circle cx="300" cy="300" r="260" />
            <circle cx="300" cy="300" r="190" />
            <circle cx="300" cy="300" r="120" />
            <line x1="40" y1="300" x2="560" y2="300" />
            <line x1="300" y1="40" x2="300" y2="560" />
          </g>
          <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2 5">
            <path d="M120 410 Q300 110 470 230" />
            <path d="M90 230 Q300 470 500 360" />
          </g>
          <g fill="currentColor">
            <circle cx="120" cy="410" r="2.5" /><circle cx="470" cy="230" r="2.5" />
            <circle cx="90" cy="230" r="2.5" /><circle cx="500" cy="360" r="2.5" />
          </g>
        </svg>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <BrandLockup size="lg" />
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 520 }}>
            <div className="t-label" style={{ marginBottom: 26 }}>
              <span style={{ color: 'var(--accent)' }}>●</span>&nbsp;&nbsp;Operator Console · v1.0
            </div>
            <h1 style={{
              margin: 0, fontFamily: 'var(--font-serif)', fontSize: 46, fontWeight: 400,
              lineHeight: 1.08, letterSpacing: '-0.022em', color: 'var(--ink)',
            }}>
              Your fleet, crew, and flights —<br />
              <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-2)' }}>
                one operator workspace.
              </span>
            </h1>
            <p style={{ marginTop: 22, maxWidth: 440, fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-3)' }}>
              Accept booking requests, dispatch aircraft and crew, lock manifests, and track
              payouts. Scoped to Helix Aviation — your data, your flights, nothing else.
            </p>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ height: 1, background: 'var(--rule)', marginBottom: 18 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
            {[
              ['Operator', 'Helix Aviation'],
              ['Status', 'Approved partner'],
              ['Base', 'Asia / Kolkata'],
              ['Platform', 'Acme Mobility'],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="t-label" style={{ marginBottom: 6 }}>{k}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        background: 'var(--surface)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '52px', position: 'relative',
      }}>
        <div style={{ width: 384, maxWidth: '100%' }}>
          <div className="t-label" style={{ marginBottom: 14 }}>Operator sign in</div>
          <h2 style={{
            margin: 0, fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400,
            letterSpacing: '-0.020em', color: 'var(--ink)', lineHeight: 1.08,
          }}>Welcome back, Arjun.</h2>
          <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-3)' }}>
            Sign in with your operator credentials. Two-factor is required for your role.
          </p>

          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label className="field-label">Email</label>
              <div className="input lg">
                <input defaultValue="arjun.khanna@helixaviation.in" readOnly />
                <Icon name="envelope" size={15} className="icon" />
              </div>
            </div>

            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label className="field-label">Password</label>
                <a className="t-meta" style={{ color: 'var(--accent)', cursor: 'pointer' }}>Forgot password?</a>
              </div>
              <div className="input lg">
                <input type="password" defaultValue="••••••••••••" readOnly />
                <Icon name="eye" size={15} className="icon" />
              </div>
            </div>

            <CheckRow checked={false}>Remember this device for 30 days</CheckRow>

            <button className="btn primary lg" style={{ marginTop: 8, width: '100%' }}>
              Continue &nbsp;<Icon name="arrowRight" size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '26px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            <span className="t-label" style={{ padding: 0 }}>Or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>

          <button className="btn lg" style={{ width: '100%' }}>
            <Icon name="key" size={14} /> Continue with Single Sign-On
          </button>

          <div style={{
            marginTop: 24, padding: '12px 14px', background: 'var(--surface-2)',
            border: '1px solid var(--rule)', borderRadius: 3,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <Icon name="building" size={14} style={{ color: 'var(--ink-3)', marginTop: 2, flexShrink: 0 }} />
            <div className="t-meta" style={{ lineHeight: 1.5 }}>
              New air operator? <a style={{ color: 'var(--accent)', cursor: 'pointer' }}>Request onboarding</a> — the
              platform admin reviews and approves your company before publishing.
            </div>
          </div>

          <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="t-meta">© 2026 · Acme Mobility</div>
            <div style={{ display: 'flex', gap: 16 }} className="t-meta">
              <a style={{ cursor: 'pointer' }}>Terms</a>
              <a style={{ cursor: 'pointer' }}>Privacy</a>
              <a style={{ cursor: 'pointer' }}>Status<span style={{ color: 'var(--ok)', marginLeft: 5 }}>●</span></a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 1.2 — Two-Factor Challenge
// ──────────────────────────────────────────────────────────────
function TwoFAScreen() {
  const otp = ['3', '0', '6', '1', '', ''];
  return (
    <div style={{
      width: '100%', height: '100%', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '28px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--rule-soft)',
      }}>
        <BrandLockup />
        <div className="t-meta">Step 2 of 2 · Verify identity</div>
      </div>

      <div style={{ position: 'absolute', top: 96, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)' }} className="t-label">
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={11} stroke={2.2} />
            </span>
            Credentials
          </span>
          <span style={{ width: 32, height: 1, background: 'var(--rule)' }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="t-label">
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--ink)', color: 'var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10 }}>2</span>
            <span style={{ color: 'var(--ink)' }}>Two-factor</span>
          </span>
        </div>
      </div>

      <div className="card" style={{ width: 520, padding: '44px 48px', background: 'var(--surface)', boxShadow: 'var(--shadow-2)', marginTop: 60 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 4, background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22,
          border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--rule-strong))',
        }}>
          <Icon name="shield" size={20} />
        </div>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.018em', lineHeight: 1.1 }}>
          Two-factor verification
        </h2>
        <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          Open your authenticator app and enter the six-digit code for{' '}
          <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>arjun.khanna@helixaviation.in</span>.
          2FA is mandatory for the Operator Admin role.
        </p>

        <div style={{ marginTop: 28 }}>
          <label className="field-label" style={{ marginBottom: 10, display: 'block' }}>Verification code</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {otp.map((d, i) => (
              <div key={i} style={{
                width: 56, height: 64,
                border: '1px solid ' + (i === 4 ? 'var(--accent)' : 'var(--rule-strong)'),
                boxShadow: i === 4 ? 'var(--focus-ring)' : 'none',
                borderRadius: 3, background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 400,
                color: d ? 'var(--ink)' : 'var(--ink-4)', position: 'relative',
              }}>
                {d || (i === 4 && <span style={{ width: 1, height: 30, background: 'var(--ink-2)' }} />)}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <CheckRow checked>Trust this device for 30 days</CheckRow>
        </div>

        <button className="btn primary lg" style={{ marginTop: 22, width: '100%' }}>
          Verify and sign in
        </button>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="t-meta">Resend code in <span style={{ color: 'var(--ink-2)' }}>00:38</span></span>
          <a className="t-meta" style={{ color: 'var(--accent)', cursor: 'pointer' }}>Email me a code instead →</a>
        </div>

        <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--rule)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="key" size={14} style={{ color: 'var(--ink-3)', marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Lost your authenticator?</div>
              <div className="t-meta" style={{ marginTop: 3 }}>
                Use a recovery code, or ask your Operator Admin to reset 2FA from Team &amp; Roles.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 1.3 — Reset Password
// ──────────────────────────────────────────────────────────────
function ResetPasswordScreen() {
  const pwStrength = 3;
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '420px 1fr' }}>
      <div style={{ background: 'var(--surface-2)', borderRight: '1px solid var(--rule)', padding: '40px 36px', display: 'flex', flexDirection: 'column' }}>
        <BrandLockup />
        <div style={{ marginTop: 44 }}>
          <div className="t-label" style={{ marginBottom: 10 }}>Account recovery</div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.018em', lineHeight: 1.1, color: 'var(--ink)' }}>
            Set a new password.
          </h2>
          <p style={{ marginTop: 14, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            Your reset link is valid for the next forty minutes. Once you save, every active
            session on your account is signed out.
          </p>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ marginTop: 32 }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Steps</div>
          {[
            { l: 'Email requested', done: true, time: 'Today · 09:24' },
            { l: 'Link verified', done: true, time: 'Today · 09:27' },
            { l: 'Set new password', done: false, time: 'In progress' },
            { l: 'Sign back in', done: false, time: '—' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none' }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: s.done ? 'var(--accent)' : 'var(--surface)',
                border: '1px solid ' + (s.done ? 'var(--accent)' : 'var(--rule-strong)'),
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, color: '#fff',
              }}>
                {s.done && <Icon name="check" size={11} stroke={2.4} />}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: s.done ? 'var(--ink)' : 'var(--ink-2)', fontWeight: s.done ? 400 : 500 }}>{s.l}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>{s.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--rule)' }}>
          <div className="t-meta">
            Requested from <span style={{ color: 'var(--ink-2)' }}>103.27.9.14</span>
            <br />Mumbai · Chrome 124 · Windows
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: 460 }}>
          <div className="t-label" style={{ marginBottom: 14 }}>New password</div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.018em', color: 'var(--ink)' }}>
            Choose something memorable, but unguessable.
          </h2>

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="field">
              <label className="field-label">New password</label>
              <div className="input lg">
                <input type="password" defaultValue="••••••••••••••••" readOnly />
                <Icon name="eye" size={15} className="icon" />
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {[0, 1, 2, 3].map(i => (
                  <span key={i} style={{ flex: 1, height: 3, background: i < pwStrength ? (pwStrength >= 3 ? 'var(--accent)' : 'var(--warn)') : 'var(--rule)', borderRadius: 2 }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span className="t-meta" style={{ color: 'var(--accent)' }}>Strong</span>
                <span className="t-meta">Est. 4 centuries to crack</span>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Confirm new password</label>
              <div className="input lg">
                <input type="password" defaultValue="••••••••••••••••" readOnly />
                <Icon name="check" size={15} style={{ color: 'var(--accent)' }} />
              </div>
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Password policy</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  ['At least 12 characters', true],
                  ['One uppercase letter', true],
                  ['One number', true],
                  ['One symbol', true],
                  ['Not a previous password', true],
                  ['Not a dictionary word', false],
                ].map(([t, ok], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: ok ? 'var(--ink-2)' : 'var(--ink-3)' }}>
                    <Icon name={ok ? 'check' : 'dot'} size={12} stroke={ok ? 2.2 : 0} style={{ color: ok ? 'var(--accent)' : 'var(--ink-4)' }} />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn lg" style={{ flex: 1 }}>Cancel</button>
              <button className="btn primary lg" style={{ flex: 2 }}>Save and sign out other sessions</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Shared profile sub-nav rail (used by 1.4 + 1.5)
// ──────────────────────────────────────────────────────────────
function ProfileRail({ active }) {
  const items = [
    { l: 'Profile', i: 'user' },
    { l: 'Security', i: 'shield' },
    { l: 'Sessions', i: 'device' },
    { l: 'Notifications', i: 'bell' },
    { l: 'Activity log', i: 'archive' },
  ];
  return (
    <aside style={{ borderRight: '1px solid var(--rule)', padding: '28px 24px', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 22, borderBottom: '1px solid var(--rule)' }}>
        <div className="avatar lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' }}>AK</div>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)' }}>Arjun Khanna</div>
          <div className="t-meta" style={{ marginTop: 2 }}>he/him · Mumbai</div>
          <div style={{ marginTop: 8 }}><span className="badge ok"><span className="dot ok" />Operator Admin</span></div>
        </div>
      </div>
      <div style={{ paddingTop: 18 }}>
        <div className="t-label" style={{ marginBottom: 8, padding: 0 }}>Account</div>
        {items.map(s => {
          const on = s.l === active;
          return (
            <div key={s.l} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', margin: '2px -12px',
              fontSize: 13, color: on ? 'var(--ink)' : 'var(--ink-2)',
              background: on ? 'var(--surface-2)' : 'transparent', borderRadius: 3,
              borderLeft: '2px solid ' + (on ? 'var(--accent)' : 'transparent'),
              fontWeight: on ? 500 : 400, cursor: 'pointer',
            }}>
              <Icon name={s.i} size={14} stroke={1.4} style={{ color: 'var(--ink-3)' }} />
              {s.l}
              {on && <Icon name="chevRight" size={12} style={{ marginLeft: 'auto', color: 'var(--ink-3)' }} />}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, padding: '14px 0 0', borderTop: '1px solid var(--rule)' }}>
        <div className="t-label" style={{ padding: 0, marginBottom: 10 }}>Organisation</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Operator', 'Helix Aviation Pvt Ltd'],
            ['Your role', 'Operator Admin'],
            ['Approval', 'Approved · 14 Mar 2025'],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="t-meta" style={{ color: 'var(--ink-3)' }}>{k}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────
// 1.4 — User Profile
// ──────────────────────────────────────────────────────────────
function ProfileScreen() {
  return (
    <Shell
      active=""
      breadcrumb="Account · My Profile"
      title="Arjun Khanna"
      subtitle="Operator Admin · Helix Aviation · Member since 14 Mar 2025"
      actions={<button className="btn sm"><Icon name="external" size={13} /> View activity</button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: '100%' }}>
        <ProfileRail active="Profile" />

        <div style={{ padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <FormSection title="Personal details" description="Visible to your teammates when assigning flights, dispatching crew, and resolving day-of-flight exceptions.">
            <Row>
              <Field label="Full name" value="Arjun Khanna" />
              <Field label="Display name" value="Arjun" />
            </Row>
            <Row>
              <Field label="Work email" value="arjun.khanna@helixaviation.in" right={<span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Verified</span>} />
              <Field label="Phone (E.164)" value="+91 98201 14477" right={<span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Verified</span>} />
            </Row>
          </FormSection>

          <FormSection title="Preferences" description="How the console renders dates, numbers, and times for you. Times across flights and rosters follow your timezone.">
            <Row>
              <Field label="Language" value="English (India)" select />
              <Field label="Timezone" value="Asia / Kolkata · IST · UTC+5:30" select />
            </Row>
            <Row>
              <Field label="Date format" value="30 May 2026" select />
              <Field label="Time format" value="24-hour · 14:30" select />
            </Row>
          </FormSection>

          <FormSection title="Notification preferences" description="Channels for operational alerts. Booking-request TTLs and day-of-flight events always push in real time regardless of these settings.">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {[
                ['New booking requests', 'Inbound requests routed to Helix Aviation', ['Email', 'Push', 'SMS']],
                ['Assignment & crew', 'Crew assigned, reassigned, or notified', ['Email', 'Push']],
                ['Compliance & documents', 'Certifications and airworthiness nearing expiry', ['Email', 'Push']],
                ['Payouts & settlements', 'Settlement runs and payout status changes', ['Email']],
              ].map(([t, d, chans], i) => (
                <div key={t} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{t}</div>
                    <div className="t-meta" style={{ marginTop: 3 }}>{d}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['Email', 'Push', 'SMS'].map(c => {
                      const on = chans.includes(c);
                      return (
                        <span key={c} className={'badge' + (on ? ' ok' : '')} style={!on ? { color: 'var(--ink-4)' } : null}>
                          {on && <Icon name="check" size={10} stroke={2.4} />}{c}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection
            title="Role & organisation"
            description={<>You hold the <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>operator_admin</span> role at Helix Aviation. Role, scope, and approval status are read-only here — they're managed in Team &amp; Roles and by the platform admin.</>}
          >
            <div style={{ border: '1px solid var(--rule)', borderRadius: 3, background: 'var(--surface)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--rule)' }}>
                {[
                  ['Operations', '14 / 14'],
                  ['Fleet & Crew', '9 / 9'],
                  ['Finance', '6 / 6'],
                ].map(([k, v], i) => (
                  <div key={k} style={{ padding: '14px 18px', borderRight: i < 2 ? '1px solid var(--rule)' : 'none' }}>
                    <div className="t-label" style={{ padding: 0 }}>{k}</div>
                    <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink)' }}>{v}</div>
                    <div className="t-meta" style={{ marginTop: 2, color: 'var(--accent)' }}>All permissions granted</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="t-meta">Scope · <span style={{ color: 'var(--ink-2)' }}>Helix Aviation · all bases · all aircraft</span></div>
                <a className="t-meta" style={{ color: 'var(--accent)', cursor: 'pointer' }}>Open in Team &amp; Roles →</a>
              </div>
            </div>
          </FormSection>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0 8px', borderTop: '1px solid var(--rule)' }}>
            <div className="t-meta">Changes audit-logged · last saved 3d ago by Arjun Khanna</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn">Discard</button>
              <button className="btn accent">Save changes</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ──────────────────────────────────────────────────────────────
// 1.5 — Security & Sessions
// ──────────────────────────────────────────────────────────────
function SecurityScreen() {
  const sessions = [
    { id: 'S-7A21', device: 'MacBook Air · 13"', os: 'macOS 14.5 · Chrome 124', ip: '103.27.9.14', loc: 'Mumbai, IN', when: 'Active now', current: true, twofa: 'TOTP' },
    { id: 'S-7B08', device: 'iPhone 14 Pro', os: 'iOS 17.5 · Helix Crew 1.2', ip: '49.36.220.71', loc: 'Mumbai, IN', when: '40 min ago', current: false, twofa: 'TOTP' },
    { id: 'S-79F4', device: 'Ops desk · Pune base', os: 'Windows 11 · Edge 124', ip: '14.139.5.20', loc: 'Pune, IN', when: 'Yesterday · 17:02', current: false, twofa: 'TOTP' },
  ];
  const history = [
    { t: 'Today · 09:24', ev: 'Signed in', ip: '103.27.9.14', loc: 'Mumbai, IN', result: 'ok' },
    { t: 'Today · 09:24', ev: '2FA verified', ip: '103.27.9.14', loc: 'Mumbai, IN', result: 'ok' },
    { t: 'Yesterday · 17:02', ev: 'Signed in', ip: '14.139.5.20', loc: 'Pune, IN', result: 'ok' },
    { t: 'Yesterday · 16:58', ev: 'Failed password', ip: '14.139.5.20', loc: 'Pune, IN', result: 'fail' },
    { t: '27 May · 08:11', ev: 'Signed in', ip: '49.36.220.71', loc: 'Mumbai, IN', result: 'ok' },
    { t: '24 May · 21:40', ev: 'Password changed', ip: '103.27.9.14', loc: 'Mumbai, IN', result: 'ok' },
  ];

  return (
    <Shell
      active=""
      breadcrumb="Account · Security"
      title="Arjun Khanna"
      subtitle="Security · Sessions · Sign-in history"
      actions={<button className="btn sm danger"><Icon name="logout" size={13} />Sign out of all sessions</button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: '100%' }}>
        <ProfileRail active="Security" />

        <div style={{ padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <FormSection title="Password & two-factor" description="Operator Admin and Finance roles cannot disable 2FA on themselves. Ask another Operator Admin to override from Team & Roles.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="t-label" style={{ padding: 0 }}>Password</div>
                  <span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Healthy</span>
                </div>
                <div style={{ marginTop: 14, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>••••••••••••</div>
                <div className="t-meta" style={{ marginTop: 6 }}>Last changed 24 May 2026 · 6 days ago</div>
                <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
                  <button className="btn sm"><Icon name="refresh" size={12} />Change password</button>
                </div>
              </div>

              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="t-label" style={{ padding: 0 }}>Two-factor authentication</div>
                  <span className="badge ok"><Icon name="shield" size={10} stroke={2.2} />Enrolled · Required</span>
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 4, background: 'var(--surface-sunk)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="device" size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--ink)' }}>TOTP · Authenticator app</div>
                    <div className="t-meta" style={{ marginTop: 4 }}>iPhone 14 Pro · enrolled 14 Mar 2025</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  <button className="btn sm">View recovery codes</button>
                  <button className="btn sm ghost">Re-enroll device</button>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="Active sessions" description="Each row is a signed-in device. Revoking ends the session and rotates the refresh token immediately.">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Device</th><th>Session</th><th>Location</th><th>2FA</th><th>Last activity</th><th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Icon name={s.device.includes('iPhone') ? 'phone' : 'device'} size={16} style={{ color: 'var(--ink-3)' }} />
                          <div>
                            <div style={{ fontSize: 13.5 }}>{s.device} {s.current && <span style={{ marginLeft: 6, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em' }}>· THIS DEVICE</span>}</div>
                            <div className="t-meta" style={{ marginTop: 2 }}>{s.os}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{s.id}</td>
                      <td>
                        <div>{s.loc}</div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{s.ip}</div>
                      </td>
                      <td><span className="badge ok"><span className="dot ok" />{s.twofa}</span></td>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{s.current ? <span style={{ color: 'var(--accent)' }}>{s.when}</span> : s.when}</td>
                      <td style={{ textAlign: 'right' }}>{s.current ? <span className="t-meta">—</span> : <button className="btn sm danger">Revoke</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormSection>

          <FormSection title="Sign-in history" description="The last seven days. Failed and out-of-region attempts are highlighted.">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr><th>When</th><th>Event</th><th>IP</th><th>Location</th><th>Result</th></tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i}>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{h.t}</td>
                      <td>{h.ev}</td>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>{h.ip}</td>
                      <td>{h.loc}</td>
                      <td>{h.result === 'ok'
                        ? <span className="badge ok"><span className="dot ok" />Success</span>
                        : <span className="badge danger"><span className="dot danger" />Failed</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormSection>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, {
  LoginScreen, TwoFAScreen, ResetPasswordScreen, ProfileScreen, SecurityScreen,
});
