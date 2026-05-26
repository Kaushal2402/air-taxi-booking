/* ─────────────────────────────────────────────────────────────
   Module 01 — Authentication & Admin Identity
   Screens 1.1 → 1.6
   ───────────────────────────────────────────────────────────── */

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
        padding: '56px 64px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* faint route geometry, top-right */}
        <svg viewBox="0 0 600 600" style={{
          position: 'absolute',
          top: -120, right: -160,
          width: 720, height: 720,
          opacity: 0.10,
          color: 'var(--ink-3)',
        }} aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth="0.8">
            <circle cx="300" cy="300" r="260" />
            <circle cx="300" cy="300" r="200" />
            <circle cx="300" cy="300" r="140" />
            <circle cx="300" cy="300" r="80" />
            <line x1="40"  y1="300" x2="560" y2="300" />
            <line x1="300" y1="40"  x2="300" y2="560" />
            <line x1="118" y1="118" x2="482" y2="482" />
            <line x1="482" y1="118" x2="118" y2="482" />
          </g>
          {/* a couple of route arcs */}
          <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2 4">
            <path d="M120 380 Q300 80 480 220" />
            <path d="M80 200 Q260 460 520 380" />
          </g>
          <g fill="currentColor">
            <circle cx="120" cy="380" r="2.5" />
            <circle cx="480" cy="220" r="2.5" />
            <circle cx="80"  cy="200" r="2.5" />
            <circle cx="520" cy="380" r="2.5" />
          </g>
        </svg>

        {/* top brand */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <BrandLockup size="lg" />
        </div>

        {/* middle */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 520 }}>
            <div className="t-label" style={{ marginBottom: 28 }}>
              <span style={{ color: 'var(--accent)' }}>●</span>&nbsp;&nbsp;Operations Console · v1.4.2
            </div>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontSize: 48,
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: '-0.022em',
              color: 'var(--ink)',
            }}>
              A single console for moving people,<br />
              <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-2)' }}>
                on the ground and in the air.
              </span>
            </h1>
            <p style={{
              marginTop: 22,
              maxWidth: 440,
              fontSize: 14.5,
              lineHeight: 1.6,
              color: 'var(--ink-3)',
            }}>
              Dispatch, fleet, fares, payouts, and compliance — all in one place.
              Built around the way operators actually work: by exception, by zone, by the hour.
            </p>
          </div>
        </div>

        {/* bottom meta strip */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ height: 1, background: 'var(--rule)', marginBottom: 18 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {[
              ['Build', '24.05.21 · 9F23'],
              ['Region', 'Asia / Kolkata'],
              ['Licensed', 'Acme Mobility Pvt Ltd'],
              ['Channel', 'Stable · Prod'],
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
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px',
        position: 'relative',
      }}>
        <div style={{ width: 384, maxWidth: '100%' }}>
          <div className="t-label" style={{ marginBottom: 14 }}>Sign in</div>
          <h2 style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 32,
            fontWeight: 400,
            letterSpacing: '-0.020em',
            color: 'var(--ink)',
            lineHeight: 1.08,
          }}>Welcome back, Sana.</h2>
          <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-3)' }}>
            Use your administrator credentials. Two-factor authentication is required for your role.
          </p>

          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label className="field-label">Email</label>
              <div className="input lg">
                <input defaultValue="sana.reyes@acmemobility.io" readOnly />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>@acmemobility.io</span>
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

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)' }}>
              <span style={{
                width: 16, height: 16, borderRadius: 2,
                border: '1px solid var(--rule-strong)',
                background: 'var(--surface)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ width: 8, height: 8, background: 'var(--ink-4)', borderRadius: 1 }} />
              </span>
              Keep me signed in on this device
            </label>

            <button className="btn primary lg" style={{ marginTop: 8, width: '100%' }}>
              Continue &nbsp;<Icon name="arrowRight" size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            <span className="t-label" style={{ padding: 0 }}>Or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>

          <button className="btn lg" style={{ width: '100%' }}>
            <Icon name="key" size={14} /> Continue with Single Sign-On
          </button>

          <div style={{ marginTop: 36, paddingTop: 18, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
  const otp = ['4', '7', '9', '2', '1', ''];
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      {/* top brand bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '28px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--rule-soft)',
      }}>
        <BrandLockup />
        <div className="t-meta">Step 2 of 2 · Verify identity</div>
      </div>

      {/* progress crumbs top */}
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

      <div className="card" style={{
        width: 520,
        padding: '44px 48px',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-2)',
        marginTop: 60,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 4,
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 22,
          border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--rule-strong))',
        }}>
          <Icon name="shield" size={20} />
        </div>
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--font-serif)',
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: '-0.018em',
          lineHeight: 1.1,
        }}>Two-factor verification</h2>
        <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          Open your authenticator app and enter the six-digit code for{' '}
          <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>sana.reyes@acmemobility.io</span>.
        </p>

        <div style={{ marginTop: 28 }}>
          <label className="field-label" style={{ marginBottom: 10, display: 'block' }}>Verification code</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {otp.map((d, i) => (
              <div key={i} style={{
                width: 56, height: 64,
                border: '1px solid ' + (i === 5 ? 'var(--accent)' : 'var(--rule-strong)'),
                boxShadow: i === 5 ? 'var(--focus-ring)' : 'none',
                borderRadius: 3,
                background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 26,
                fontWeight: 400,
                color: d ? 'var(--ink)' : 'var(--ink-4)',
                position: 'relative',
              }}>
                {d || (i === 5 && <span style={{
                  width: 1, height: 30, background: 'var(--ink-2)',
                  animation: 'none',
                }} />)}
              </div>
            ))}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22, cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)' }}>
          <span style={{
            width: 16, height: 16, borderRadius: 2,
            border: '1px solid var(--rule-strong)',
            background: 'var(--surface)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="check" size={11} stroke={2.4} style={{ color: 'var(--accent)' }} />
          </span>
          Trust this device for 30 days
        </label>

        <button className="btn primary lg" style={{ marginTop: 22, width: '100%' }}>
          Verify and sign in
        </button>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="t-meta">Resend code in <span style={{ color: 'var(--ink-2)' }}>00:42</span></span>
          <a className="t-meta" style={{ color: 'var(--accent)', cursor: 'pointer' }}>Use a different method →</a>
        </div>

        <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--rule)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="key" size={14} style={{ color: 'var(--ink-3)', marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Lost your authenticator?</div>
              <div className="t-meta" style={{ marginTop: 3 }}>
                Use one of your recovery codes, or contact a workspace administrator to reset 2FA.
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
  const pwStrength = 3; // 0..4
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg)',
      display: 'grid',
      gridTemplateColumns: '420px 1fr',
    }}>
      {/* left rail — context */}
      <div style={{
        background: 'var(--surface-2)',
        borderRight: '1px solid var(--rule)',
        padding: '40px 36px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <BrandLockup />
        <div style={{ marginTop: 44 }}>
          <div className="t-label" style={{ marginBottom: 10 }}>Account recovery</div>
          <h2 style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 30,
            fontWeight: 400,
            letterSpacing: '-0.018em',
            lineHeight: 1.1,
            color: 'var(--ink)',
          }}>Set a new password.</h2>
          <p style={{ marginTop: 14, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            Your link is valid for the next forty minutes. Once you save, all your active sessions will be signed out.
          </p>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ marginTop: 32 }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Steps</div>
          {[
            { l: 'Email requested',  done: true,  time: 'Today · 14:08' },
            { l: 'Link verified',    done: true,  time: 'Today · 14:12' },
            { l: 'Set new password', done: false, time: 'In progress' },
            { l: 'Sign back in',     done: false, time: '—' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none' }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: s.done ? 'var(--accent)' : 'var(--surface)',
                border: '1px solid ' + (s.done ? 'var(--accent)' : 'var(--rule-strong)'),
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
                color: '#fff',
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
            Requested from <span style={{ color: 'var(--ink-2)' }}>122.171.18.224</span>
            <br />Bengaluru · Chrome 124 · macOS
          </div>
        </div>
      </div>

      {/* right pane — form */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}>
        <div style={{ width: 460 }}>
          <div className="t-label" style={{ marginBottom: 14 }}>New password</div>
          <h2 style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: '-0.018em',
            color: 'var(--ink)',
          }}>Choose something memorable, but unguessable.</h2>

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="field">
              <label className="field-label">New password</label>
              <div className="input lg">
                <input type="password" defaultValue="••••••••••••••••" readOnly />
                <Icon name="eye" size={15} className="icon" />
              </div>
              {/* strength meter */}
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {[0, 1, 2, 3].map(i => (
                  <span key={i} style={{
                    flex: 1, height: 3,
                    background: i < pwStrength ? (pwStrength >= 3 ? 'var(--accent)' : 'var(--warn)') : 'var(--rule)',
                    borderRadius: 2,
                  }} />
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

            <div style={{
              padding: '14px 16px',
              background: 'var(--surface-2)',
              border: '1px solid var(--rule)',
              borderRadius: 3,
            }}>
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
              <button className="btn primary lg" style={{ flex: 2 }}>
                Save and sign out other sessions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 1.4 — Admin Profile
// ──────────────────────────────────────────────────────────────
function ProfileScreen() {
  return (
    <Shell
      active="admins"
      breadcrumb="System · Admin Users · My Profile"
      title="Sana Reyes"
      subtitle="Super Administrator · Joined 12 Sep 2024"
      actions={
        <>
          <button className="btn sm"><Icon name="external" size={13} /> View activity</button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: '100%' }}>
        {/* sub-nav rail */}
        <aside style={{
          borderRight: '1px solid var(--rule)',
          padding: '28px 24px',
          background: 'var(--surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 22, borderBottom: '1px solid var(--rule)' }}>
            <div className="avatar lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' }}>SR</div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)' }}>Sana Reyes</div>
              <div className="t-meta" style={{ marginTop: 2 }}>she/her · Bengaluru</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <span className="badge ok"><span className="dot ok" />Super Admin</span>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 18 }}>
            <div className="t-label" style={{ marginBottom: 8, padding: 0 }}>Settings</div>
            {[
              { l: 'Profile',       i: 'user',     active: true },
              { l: 'Security',      i: 'shield' },
              { l: 'Sessions',      i: 'device' },
              { l: 'Notifications', i: 'bell' },
              { l: 'Activity log',  i: 'archive' },
              { l: 'API tokens',    i: 'key' },
            ].map(s => (
              <div key={s.l} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                margin: '2px -12px',
                fontSize: 13,
                color: s.active ? 'var(--ink)' : 'var(--ink-2)',
                background: s.active ? 'var(--surface-2)' : 'transparent',
                borderRadius: 3,
                borderLeft: '2px solid ' + (s.active ? 'var(--accent)' : 'transparent'),
                fontWeight: s.active ? 500 : 400,
                cursor: 'pointer',
              }}>
                <Icon name={s.i} size={14} stroke={1.4} style={{ color: 'var(--ink-3)' }} />
                {s.l}
                {s.active && <Icon name="chevRight" size={12} style={{ marginLeft: 'auto', color: 'var(--ink-3)' }} />}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: '14px 0 0', borderTop: '1px solid var(--rule)' }}>
            <div className="t-label" style={{ padding: 0, marginBottom: 10 }}>Quick facts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Last sign-in', '2h ago · 122.171.18.224'],
                ['Active sessions', '3 devices'],
                ['Two-factor', 'TOTP · Authenticator app'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="t-meta" style={{ color: 'var(--ink-3)' }}>{k}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* main */}
        <div style={{ padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <FormSection
            title="Personal details"
            description="Visible to other administrators when assigning work and resolving incidents."
          >
            <Row>
              <Field label="Full name" value="Sana Reyes" />
              <Field label="Display name" value="Sana" />
            </Row>
            <Row>
              <Field label="Work email" value="sana.reyes@acmemobility.io" right={<span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Verified</span>} />
              <Field label="Phone (E.164)" value="+91 98455 02711" right={<span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Verified</span>} />
            </Row>
          </FormSection>

          <FormSection
            title="Preferences"
            description="How the console renders dates, numbers, and notifications for you."
          >
            <Row>
              <Field label="Language" value="English (India)" select />
              <Field label="Timezone" value="Asia / Kolkata · IST · UTC+5:30" select />
            </Row>
            <Row>
              <Field label="Date format" value="21 May 2026" select />
              <Field label="Number format" value="1,23,45,678.90" select />
            </Row>
          </FormSection>

          <FormSection
            title="Role & access summary"
            description={<>You hold the <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>super_admin</span> role. The list below is read-only — to change, ask another Super Admin to update Roles & Access.</>}
          >
            <div style={{
              border: '1px solid var(--rule)',
              borderRadius: 3,
              background: 'var(--surface)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--rule)' }}>
                {[
                  ['Operations',  '24 / 24'],
                  ['Finance',     '18 / 18'],
                  ['System',      '21 / 21'],
                ].map(([k, v], i) => (
                  <div key={k} style={{ padding: '14px 18px', borderRight: i < 2 ? '1px solid var(--rule)' : 'none' }}>
                    <div className="t-label" style={{ padding: 0 }}>{k}</div>
                    <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink)' }}>{v}</div>
                    <div className="t-meta" style={{ marginTop: 2, color: 'var(--accent)' }}>All permissions granted</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="t-meta">
                  Scope · <span style={{ color: 'var(--ink-2)' }}>Global · all zones · all services</span>
                </div>
                <a className="t-meta" style={{ color: 'var(--accent)', cursor: 'pointer' }}>Open in Roles & Access →</a>
              </div>
            </div>
          </FormSection>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 0 8px',
            borderTop: '1px solid var(--rule)',
          }}>
            <div className="t-meta">Changes audit-logged · last saved 2h ago by Sana Reyes</div>
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

// helper: a labeled section
function FormSection({ title, description, children }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.014em', color: 'var(--ink)' }}>{title}</h3>
        <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
      </div>
      {description && <p style={{ marginTop: 0, marginBottom: 16, fontSize: 13, color: 'var(--ink-3)', maxWidth: 720, lineHeight: 1.55 }}>{description}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </section>
  );
}
function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>;
}
function Field({ label, value, right, select }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="input">
        <input defaultValue={value} readOnly style={{ flex: 1 }} />
        {right}
        {select && <Icon name="chevDown" size={14} className="icon" />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 1.5 — Security & Sessions
// ──────────────────────────────────────────────────────────────
function SecurityScreen() {
  const sessions = [
    { id: 'S-9F12', device: 'MacBook Pro · 14"',  os: 'macOS 14.5 · Chrome 124', ip: '122.171.18.224', loc: 'Bengaluru, IN', when: 'Active now',      current: true,  twofa: 'TOTP' },
    { id: 'S-9C7A', device: 'iPhone 15 Pro',       os: 'iOS 17.5 · Acme App 2.1',  ip: '49.205.220.12',  loc: 'Bengaluru, IN', when: '2 hours ago',    current: false, twofa: 'TOTP' },
    { id: 'S-9B40', device: 'Windows PC',          os: 'Windows 11 · Edge 124',    ip: '152.59.10.88',   loc: 'Delhi, IN',     when: 'Yesterday · 18:42', current: false, twofa: 'SMS'  },
  ];
  const history = [
    { t: 'Today · 14:08',     ev: 'Signed in',          ip: '122.171.18.224', loc: 'Bengaluru, IN', result: 'ok' },
    { t: 'Today · 12:01',     ev: '2FA verified',       ip: '122.171.18.224', loc: 'Bengaluru, IN', result: 'ok' },
    { t: 'Yesterday · 18:42', ev: 'Signed in',          ip: '152.59.10.88',   loc: 'Delhi, IN',     result: 'ok' },
    { t: 'Yesterday · 18:40', ev: 'Failed password',    ip: '152.59.10.88',   loc: 'Delhi, IN',     result: 'fail' },
    { t: '19 May · 09:14',    ev: 'Signed in',          ip: '49.205.220.12',  loc: 'Bengaluru, IN', result: 'ok' },
    { t: '18 May · 22:55',    ev: 'Password changed',   ip: '122.171.18.224', loc: 'Bengaluru, IN', result: 'ok' },
  ];

  return (
    <Shell
      active="admins"
      breadcrumb="System · Admin Users · My Profile"
      title="Sana Reyes"
      subtitle="Security · Sessions · Sign-in history"
      actions={<button className="btn sm danger"><Icon name="logout" size={13} />Sign out of all sessions</button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: '100%' }}>
        {/* sub-nav (reusing the visual from profile) */}
        <aside style={{ borderRight: '1px solid var(--rule)', padding: '28px 24px', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 22, borderBottom: '1px solid var(--rule)' }}>
            <div className="avatar lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' }}>SR</div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>Sana Reyes</div>
              <div className="t-meta" style={{ marginTop: 2 }}>she/her · Bengaluru</div>
              <div style={{ marginTop: 8 }}><span className="badge ok"><span className="dot ok" />Super Admin</span></div>
            </div>
          </div>
          <div style={{ paddingTop: 18 }}>
            <div className="t-label" style={{ marginBottom: 8, padding: 0 }}>Settings</div>
            {[
              { l: 'Profile',       i: 'user' },
              { l: 'Security',      i: 'shield', active: true },
              { l: 'Sessions',      i: 'device' },
              { l: 'Notifications', i: 'bell' },
              { l: 'Activity log',  i: 'archive' },
              { l: 'API tokens',    i: 'key' },
            ].map(s => (
              <div key={s.l} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', margin: '2px -12px',
                fontSize: 13,
                color: s.active ? 'var(--ink)' : 'var(--ink-2)',
                background: s.active ? 'var(--surface-2)' : 'transparent',
                borderRadius: 3,
                borderLeft: '2px solid ' + (s.active ? 'var(--accent)' : 'transparent'),
                fontWeight: s.active ? 500 : 400,
              }}>
                <Icon name={s.i} size={14} stroke={1.4} style={{ color: 'var(--ink-3)' }} />
                {s.l}
                {s.active && <Icon name="chevRight" size={12} style={{ marginLeft: 'auto', color: 'var(--ink-3)' }} />}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: '14px 14px', background: 'var(--accent-soft-2)', border: '1px solid color-mix(in oklab, var(--accent) 18%, var(--rule-strong))', borderRadius: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon name="shield" size={14} style={{ color: 'var(--accent)' }} />
              <span className="t-label" style={{ padding: 0, color: 'var(--accent-ink)' }}>Account healthy</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              2FA enabled, password rotated 3 days ago, no failed sign-ins from new locations.
            </div>
          </div>
        </aside>

        <div style={{ padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* password + 2FA */}
          <FormSection title="Password & two-factor" description="Privileged roles cannot disable 2FA on themselves; ask another Super Admin to override.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="t-label" style={{ padding: 0 }}>Password</div>
                  <span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Healthy</span>
                </div>
                <div style={{ marginTop: 14, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>••••••••••••</div>
                <div className="t-meta" style={{ marginTop: 6 }}>Last changed 18 May 2026 · 3 days ago</div>
                <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
                  <button className="btn sm"><Icon name="refresh" size={12} />Change password</button>
                </div>
              </div>

              <div className="card" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="t-label" style={{ padding: 0 }}>Two-factor authentication</div>
                  <span className="badge ok"><Icon name="shield" size={10} stroke={2.2} />Enrolled</span>
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 4,
                    background: 'var(--surface-sunk)',
                    border: '1px solid var(--rule)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Icon name="device" size={18} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--ink)' }}>TOTP · Authenticator app</div>
                    <div className="t-meta" style={{ marginTop: 4 }}>Pixel 8 Pro · enrolled 12 Sep 2024</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  <button className="btn sm">View recovery codes</button>
                  <button className="btn sm ghost">Re-enroll device</button>
                </div>
              </div>
            </div>
          </FormSection>

          {/* sessions */}
          <FormSection title="Active sessions" description="Each row is a logged-in device. Revoking ends the session and rotates the refresh token immediately.">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Session</th>
                    <th>Location</th>
                    <th>2FA</th>
                    <th>Last activity</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => (
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
                      <td>
                        <span className="badge ok"><span className="dot ok" />{s.twofa}</span>
                      </td>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>
                        {s.current ? <span style={{ color: 'var(--accent)' }}>{s.when}</span> : s.when}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {s.current ? (
                          <span className="t-meta">—</span>
                        ) : (
                          <button className="btn sm danger">Revoke</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormSection>

          {/* recent sign-in history */}
          <FormSection title="Sign-in history" description="The last seven days. Failed and out-of-region attempts are highlighted.">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Event</th>
                    <th>IP</th>
                    <th>Location</th>
                    <th>Result</th>
                  </tr>
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

// ──────────────────────────────────────────────────────────────
// 1.6 — Admin User Directory
// ──────────────────────────────────────────────────────────────
function DirectoryScreen() {
  const admins = [
    { n: 'Sana Reyes',       e: 'sana.reyes@acmemobility.io',    r: 'Super Admin',          s: 'active',    twofa: 'TOTP', last: '2h ago', created: '12 Sep 2024', scope: 'Global', flag: 'You' },
    { n: 'Vikram Bhatt',     e: 'vikram.bhatt@acmemobility.io',  r: 'Finance Manager',      s: 'active',    twofa: 'TOTP', last: '38m ago',created: '02 Oct 2024', scope: 'Global' },
    { n: 'Priya Iyer',       e: 'priya.iyer@acmemobility.io',    r: 'Dispatcher · Lead',    s: 'active',    twofa: 'TOTP', last: 'Now',    created: '14 Nov 2024', scope: 'BLR · MUM · HYD' },
    { n: 'Anjali Krishnan',  e: 'anjali.k@acmemobility.io',      r: 'Support · Lead',       s: 'active',    twofa: 'TOTP', last: '14m ago',created: '21 Jan 2025', scope: 'IN · Global' },
    { n: 'Rohan Mehta',      e: 'rohan.mehta@acmemobility.io',   r: 'Dispatcher',           s: 'active',    twofa: 'SMS',  last: '5m ago', created: '03 Feb 2025', scope: 'BLR South' },
    { n: 'Leah Joseph',      e: 'leah.j@acmemobility.io',        r: 'Compliance',           s: 'active',    twofa: 'TOTP', last: '1h ago', created: '18 Feb 2025', scope: 'IN · Global' },
    { n: 'Karthik Nair',     e: 'karthik.nair@acmemobility.io',  r: 'Sub-Admin · Air ops',  s: 'active',    twofa: 'TOTP', last: '6h ago', created: '04 Mar 2025', scope: 'Air · Global' },
    { n: 'Imran Shaikh',     e: 'imran.shaikh@acmemobility.io',  r: 'Support',              s: 'invited',   twofa: '—',    last: '—',      created: '20 May 2026', scope: 'IN · Global' },
    { n: 'Maya Cherian',     e: 'maya.cherian@acmemobility.io',  r: 'Marketing',            s: 'active',    twofa: 'TOTP', last: 'Yesterday', created: '11 Apr 2025', scope: 'IN · Global' },
    { n: 'Dev Banerjee',     e: 'dev.banerjee@acmemobility.io',  r: 'Dispatcher',           s: 'suspended', twofa: 'TOTP', last: '8 days ago', created: '08 Apr 2025', scope: 'KOL East' },
    { n: 'Hema Rao',         e: 'hema.rao@acmemobility.io',      r: 'Finance · Reviewer',   s: 'active',    twofa: 'TOTP', last: '3h ago', created: '22 Apr 2025', scope: 'Global' },
    { n: 'Tariq Ahmed',      e: 'tariq.ahmed@acmemobility.io',   r: 'DevOps (custom)',      s: 'active',    twofa: 'TOTP', last: '12m ago',created: '01 May 2025', scope: 'Global' },
  ];

  const statusBadge = (s) => {
    if (s === 'active')    return <StatusBadge tone="ok">Active</StatusBadge>;
    if (s === 'invited')   return <StatusBadge tone="info">Invited</StatusBadge>;
    if (s === 'suspended') return <StatusBadge tone="warn">Suspended</StatusBadge>;
    return <StatusBadge tone="pending">{s}</StatusBadge>;
  };

  return (
    <Shell
      active="admins"
      breadcrumb="System · Identity & Access"
      title="Administrators"
      subtitle="12 total · 10 active · 1 invited · 1 suspended"
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm accent"><Icon name="plus" size={13} />Invite admin</button>
        </>
      }
    >
      <div style={{ padding: '20px 32px 28px' }}>
        {/* summary strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          marginBottom: 20,
        }}>
          {[
            { k: 'Total admins',  v: '12',  m: '+2 in last 30 days', tone: 'ink' },
            { k: 'Active now',    v: '4',   m: 'In console right now', tone: 'ok' },
            { k: 'Awaiting invite', v: '1', m: 'Imran Shaikh · 12h left', tone: 'info' },
            { k: '2FA enrolled',  v: '11 / 12', m: '1 on SMS fallback',  tone: 'warn' },
          ].map((s, i) => (
            <div key={s.k} style={{
              padding: '20px 22px',
              borderRight: i < 3 ? '1px solid var(--rule)' : 'none',
            }}>
              <div className="t-label" style={{ padding: 0 }}>{s.k}</div>
              <div style={{
                marginTop: 8,
                fontFamily: 'var(--font-serif)',
                fontSize: 30,
                fontWeight: 400,
                letterSpacing: '-0.018em',
                color: 'var(--ink)',
                lineHeight: 1,
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
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderBottom: 0,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div className="input" style={{ width: 260, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input placeholder="Name, email, role…" />
          </div>
          <FilterChip label="Role" value="All" />
          <FilterChip label="Status" value="Active · Invited" count={2} />
          <FilterChip label="2FA" value="All" />
          <FilterChip label="Scope" value="All" />
          <FilterChip label="Created" value="Last 90d" />
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm"><Icon name="filter" size={13} />Saved view · <span style={{ color: 'var(--ink)' }}>All admins</span> <Icon name="chevDown" size={12} /></button>
          <button className="btn ghost sm" title="Columns"><Icon name="more" size={14} /></button>
        </div>

        {/* table */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          overflow: 'hidden',
        }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" />
                </th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Scope</th>
                <th>2FA</th>
                <th>Last sign-in</th>
                <th>Member since</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a, i) => (
                <tr key={a.e} className={i === 0 ? 'selected' : ''}>
                  <td><input type="checkbox" defaultChecked={i === 0} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar" style={i === 0 ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'color-mix(in oklab, var(--accent) 20%, var(--rule-strong))' } : null}>
                        {a.n.split(' ').map(p => p[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>
                          {a.n}
                          {a.flag && <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.14em' }}>· {a.flag.toUpperCase()}</span>}
                        </div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{a.e}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{a.r}</td>
                  <td>{statusBadge(a.s)}</td>
                  <td className="num" style={{ color: 'var(--ink-2)' }}>{a.scope}</td>
                  <td>
                    {a.twofa === '—' ? (
                      <span className="t-meta">—</span>
                    ) : a.twofa === 'SMS' ? (
                      <span className="badge warn"><span className="dot warn" />{a.twofa}</span>
                    ) : (
                      <span className="badge ok"><span className="dot ok" />{a.twofa}</span>
                    )}
                  </td>
                  <td className="num" style={{ color: 'var(--ink-2)' }}>{a.last}</td>
                  <td className="num" style={{ color: 'var(--ink-3)' }}>{a.created}</td>
                  <td><button className="btn ghost icon sm"><Icon name="moreVert" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* footer */}
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--rule)',
            background: 'var(--surface-2)',
          }}>
            <div className="t-meta">
              Showing <span style={{ color: 'var(--ink-2)' }}>1–12</span> of <span style={{ color: 'var(--ink-2)' }}>12</span> · 1 selected
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button className="btn ghost sm" disabled style={{ opacity: 0.4 }}><Icon name="chevLeft" size={13} /></button>
              <span style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, background: 'var(--ink)', color: 'var(--surface)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>1</span>
              <button className="btn ghost sm" disabled style={{ opacity: 0.4 }}><Icon name="chevRight" size={13} /></button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function FilterChip({ label, value, count }) {
  return (
    <button className="btn sm" style={{
      borderStyle: 'dashed',
      borderColor: count ? 'var(--accent)' : 'var(--rule-strong)',
      background: count ? 'var(--accent-soft-2)' : 'var(--surface)',
    }}>
      <Icon name="plus" size={11} style={{ color: count ? 'var(--accent)' : 'var(--ink-3)' }} />
      <span style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span style={{ width: 1, height: 12, background: 'var(--rule)' }} />
      <span style={{ color: 'var(--ink)' }}>{value}</span>
      {count && <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        background: 'var(--accent)', color: '#fff',
        padding: '1px 6px', borderRadius: 8,
      }}>{count}</span>}
    </button>
  );
}

Object.assign(window, {
  LoginScreen, TwoFAScreen, ResetPasswordScreen,
  ProfileScreen, SecurityScreen, DirectoryScreen,
  FormSection, Row, Field, FilterChip,
});
