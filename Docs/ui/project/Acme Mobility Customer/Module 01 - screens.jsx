/* ─────────────────────────────────────────────────────────────
   Acme Mobility Customer App · Moreen Theme
   Module 01 — Authentication & Identity
   1.1 Splash · 1.2 Welcome · 1.3 Sign In · 1.4 OTP Verify
   1.5 Sign Up · 1.6 Profile Setup · 1.7 Forgot Password
   1.8 Reset Sent
   ───────────────────────────────────────────────────────────── */

// ── Screen root ───────────────────────────────────────────────
function Screen({ children, bg = 'var(--bg)' }) {
  return (
    <div style={{
      width: 390, height: 844, overflow: 'hidden',
      background: bg, position: 'relative',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-sans)', color: 'var(--ink)',
    }}>
      {children}
    </div>
  );
}

// ── Password strength bar ─────────────────────────────────────
function StrengthBar({ score = 3, max = 4 }) {
  const colors = ['var(--danger)', 'var(--warn)', 'var(--warn)', 'var(--ok)'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < score ? colors[score - 1] : 'var(--rule)',
          }}/>
        ))}
      </div>
      <div style={{ marginTop: 5, fontSize: 12, fontWeight: 500, color: colors[score - 1] }}>
        {labels[score - 1]}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 1.1 — Splash
// ─────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <Screen bg="var(--forest)">
      <StatusBar dark/>

      {/* Decorative routes */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
           viewBox="0 0 390 844" fill="none" aria-hidden>
        <circle cx="195" cy="422" r="310" stroke="white" strokeWidth="0.6" opacity="0.04"/>
        <circle cx="195" cy="422" r="210" stroke="white" strokeWidth="0.6" opacity="0.04"/>
        <circle cx="195" cy="422" r="110" stroke="white" strokeWidth="0.6" opacity="0.04"/>
        <path d="M55 700 Q195 300 345 180" stroke="white" strokeWidth="1" strokeDasharray="5 10" opacity="0.08"/>
        <path d="M40 500 Q200 560 355 330" stroke="white" strokeWidth="1" strokeDasharray="5 10" opacity="0.06"/>
        <circle cx="55"  cy="700" r="4" fill="white" opacity="0.18"/>
        <circle cx="345" cy="180" r="4" fill="white" opacity="0.18"/>
        <circle cx="40"  cy="500" r="3" fill="white" opacity="0.12"/>
        <circle cx="355" cy="330" r="3" fill="white" opacity="0.12"/>
        {/* moving aircraft dot */}
        <circle cx="250" cy="305" r="7"  fill="var(--emerald)" opacity="0.9"/>
        <circle cx="250" cy="305" r="14" stroke="var(--emerald)" strokeWidth="1" opacity="0.25"/>
        <circle cx="250" cy="305" r="22" stroke="var(--emerald)" strokeWidth="0.6" opacity="0.10"/>
      </svg>

      {/* Centre lockup */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 40px', position: 'relative', zIndex: 1, gap: 0,
      }}>
        <BrandMark size={80} light/>
        <div style={{ height: 32 }}/>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 52, fontWeight: 300,
          color: '#FFFFFF', lineHeight: 1, letterSpacing: '-0.03em', textAlign: 'center',
        }}>
          Acme
        </div>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 52, fontWeight: 300,
          fontStyle: 'italic', color: 'rgba(255,255,255,0.72)',
          lineHeight: 1, letterSpacing: '-0.03em', marginTop: 4,
        }}>
          Mobility
        </div>
        <div style={{ height: 20 }}/>
        <div style={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          fontSize: 18, color: 'rgba(255,255,255,0.45)',
          textAlign: 'center', lineHeight: 1.4, letterSpacing: '0.01em',
        }}>
          Your journey, elevated.
        </div>
      </div>

      {/* Bottom */}
      <div style={{
        padding: '0 40px 56px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 14, position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: i === 0 ? 28 : 8, height: 8, borderRadius: 4,
              background: i === 0 ? 'var(--emerald)' : 'rgba(255,255,255,0.18)',
            }}/>
          ))}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
        }}>
          Acme Mobility · v1.0
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 1.2 — Welcome / Onboarding
// ─────────────────────────────────────────────────────────────
function WelcomeScreen() {
  return (
    <Screen bg="var(--bg)">
      {/* Forest hero */}
      <div style={{
        height: 460, flexShrink: 0, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, var(--forest) 0%, var(--forest-3) 100%)',
      }}>
        <StatusBar dark/>

        {/* Skip */}
        <div style={{ position: 'absolute', top: 54, right: 20, zIndex: 2 }}>
          <button style={{
            height: 34, padding: '0 16px', borderRadius: 'var(--r-pill)',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500,
          }}>Skip</button>
        </div>

        {/* SVG illustration — city + routes */}
        <svg viewBox="0 0 390 370" fill="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%' }}>
          {/* Building silhouettes */}
          <rect x="18"  y="260" width="28" height="110" rx="2" fill="rgba(255,255,255,0.04)"/>
          <rect x="52"  y="220" width="38" height="150" rx="2" fill="rgba(255,255,255,0.06)"/>
          <rect x="98"  y="240" width="24" height="130" rx="2" fill="rgba(255,255,255,0.04)"/>
          <rect x="130" y="200" width="32" height="170" rx="2" fill="rgba(255,255,255,0.05)"/>
          <rect x="230" y="210" width="36" height="160" rx="2" fill="rgba(255,255,255,0.05)"/>
          <rect x="274" y="235" width="24" height="135" rx="2" fill="rgba(255,255,255,0.04)"/>
          <rect x="306" y="215" width="44" height="155" rx="2" fill="rgba(255,255,255,0.06)"/>
          <rect x="358" y="250" width="32" height="120" rx="2" fill="rgba(255,255,255,0.04)"/>
          {/* Route arcs */}
          <path d="M75 310 Q195 90 328 190"
                stroke="rgba(255,255,255,0.14)" strokeWidth="1.4" strokeDasharray="7 11"/>
          <path d="M50 360 Q195 130 355 250"
                stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="5 9"/>
          {/* Helipad A */}
          <circle cx="75" cy="310" r="10" stroke="var(--emerald)" strokeWidth="1.4" fill="none" opacity="0.85"/>
          <circle cx="75" cy="310" r="4"  fill="var(--emerald)" opacity="0.75"/>
          <line x1="71" y1="310" x2="79" y2="310" stroke="white" strokeWidth="1.5"/>
          <line x1="75" y1="306" x2="75" y2="314" stroke="white" strokeWidth="1.5"/>
          {/* Helipad B */}
          <circle cx="328" cy="190" r="10" stroke="var(--jade)" strokeWidth="1.4" fill="none" opacity="0.85"/>
          <circle cx="328" cy="190" r="4"  fill="var(--jade)" opacity="0.75"/>
          <line x1="324" y1="190" x2="332" y2="190" stroke="white" strokeWidth="1.5"/>
          <line x1="328" y1="186" x2="328" y2="194" stroke="white" strokeWidth="1.5"/>
          {/* Aircraft */}
          <circle cx="200" cy="174" r="7"  fill="white" opacity="0.95"/>
          <circle cx="200" cy="174" r="16" stroke="white" strokeWidth="0.8" fill="none" opacity="0.22"/>
        </svg>

        {/* Service chips */}
        <div style={{
          position: 'absolute', bottom: 62, left: 22,
          display: 'flex', gap: 8, flexWrap: 'nowrap',
        }}>
          {['Helicopter', 'Charter', 'Shuttle', 'VIP'].map((s, i) => (
            <span key={s} style={{
              padding: '7px 13px', borderRadius: 'var(--r-pill)',
              background: 'rgba(255,255,255,0.11)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.17)',
              fontSize: 12.5, color: 'rgba(255,255,255,0.82)', fontWeight: 500,
              whiteSpace: 'nowrap',
            }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Content card */}
      <div style={{
        flex: 1, background: 'var(--surface)',
        borderRadius: '24px 24px 0 0', marginTop: -24,
        padding: '28px 28px 36px',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-hero)',
      }}>
        {/* Slide dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              height: 4, width: i === 0 ? 28 : 10, borderRadius: 2,
              background: i === 0 ? 'var(--emerald)' : 'var(--rule-strong)',
            }}/>
          ))}
        </div>

        <h1 style={{
          margin: 0, fontFamily: 'var(--font-serif)', fontSize: 38,
          fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)', lineHeight: 1.08,
        }}>
          Book your sky.
          <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-3)' }}>
            {' '}Any time.
          </span>
        </h1>

        <p style={{
          margin: '14px 0 0', fontSize: 15.5, lineHeight: 1.65,
          color: 'var(--ink-3)', fontWeight: 400,
        }}>
          Helicopters, private charters, and executive shuttles — booked in minutes.
          Premium air mobility, at your fingertips.
        </p>

        <div style={{ flex: 1, minHeight: 24 }}/>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <CTAButton variant="primary">
            Get started <Icon name="arrowRight" size={18} stroke={2.2}/>
          </CTAButton>
          <CTAButton variant="ghost" style={{ color: 'var(--ink-3)', fontSize: 15 }}>
            I already have an account
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 1.3 — Sign In
// ─────────────────────────────────────────────────────────────
function SignInScreen() {
  return (
    <Screen bg="var(--bg)">
      <StatusBar/>
      <NavBar showBack right={
        <button style={{ color: 'var(--emerald)', fontSize: 15, fontWeight: 600 }}>
          Sign up
        </button>
      }/>

      <div style={{ flex: 1, padding: '8px 28px 40px', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{
          margin: '0 0 6px', fontFamily: 'var(--font-serif)', fontSize: 36,
          fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.08, color: 'var(--ink)',
        }}>
          Welcome back.
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          Sign in to continue your journey.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <MobileInput label="Email address" icon="envelope" value="priya.sharma@gmail.com"/>
          <MobileInput label="Password" type="password" icon="lock" value="••••••••••••"
            rightSlot={<Icon name="eye" size={20} stroke={1.5} style={{ color: 'var(--ink-4)' }}/>}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button style={{ color: 'var(--emerald)', fontSize: 14, fontWeight: 500 }}>
            Forgot password?
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <CTAButton variant="primary">
            Sign in <Icon name="arrowRight" size={18} stroke={2.2}/>
          </CTAButton>
        </div>

        {/* Social divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--rule)' }}/>
          <span style={{ fontSize: 13, color: 'var(--ink-4)', fontWeight: 500, whiteSpace: 'nowrap' }}>
            or continue with
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--rule)' }}/>
        </div>

        {/* Social buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'Google', letter: 'G', bg: '#fff', fg: '#3c4043' },
            { label: 'Apple',  letter: '',  bg: '#131311', fg: '#fff' },
          ].map(({ label, letter, bg, fg }) => (
            <button key={label} style={{
              flex: 1, height: 52, borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--rule-strong)', background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 15, fontWeight: 500, color: fg,
            }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{letter}</span>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 15, color: 'var(--ink-3)' }}>
          New here?{' '}
          <button style={{ color: 'var(--emerald)', fontWeight: 600, fontSize: 15 }}>
            Create an account
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 1.4 — OTP Verification
// ─────────────────────────────────────────────────────────────
function OTPScreen() {
  const otp = ['3', '0', '6', '1', '', ''];
  return (
    <Screen bg="var(--surface)">
      <StatusBar/>
      <NavBar showBack/>

      <div style={{ flex: 1, padding: '20px 28px 48px', display: 'flex', flexDirection: 'column' }}>
        {/* Icon */}
        <div style={{
          width: 76, height: 76, borderRadius: 38,
          background: 'var(--mint)', border: '1.5px solid rgba(24,181,116,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 26,
        }}>
          <Icon name="phone" size={34} stroke={1.5} style={{ color: 'var(--emerald)' }}/>
        </div>

        <h1 style={{
          margin: '0 0 10px', fontFamily: 'var(--font-serif)', fontSize: 34,
          fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.1,
        }}>
          Verify your<br/>number.
        </h1>
        <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.6 }}>
          We sent a 6-digit code to{' '}
          <span style={{
            color: 'var(--ink-2)', fontFamily: 'var(--font-mono)',
            fontSize: 14, fontWeight: 500,
          }}>+91 98765 XXXXX</span>
        </p>

        {/* OTP boxes */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
          {otp.map((d, i) => {
            const isCurrent = i === 4;
            return (
              <div key={i} style={{
                flex: 1, height: 64, borderRadius: 'var(--r-md)',
                border: '2px solid ' + (isCurrent ? 'var(--emerald)' : d ? 'var(--rule-strong)' : 'var(--rule)'),
                background: isCurrent ? 'var(--mint-2)' : 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 500,
                color: d ? 'var(--ink)' : 'var(--ink-4)',
                boxShadow: isCurrent ? 'var(--focus-ring)' : 'none',
              }}>
                {d || (isCurrent && (
                  <div style={{ width: 2, height: 32, background: 'var(--emerald)',
                                borderRadius: 1 }}/>
                ))}
              </div>
            );
          })}
        </div>

        <CTAButton variant="primary">Verify →</CTAButton>

        <div style={{ marginTop: 22, textAlign: 'center' }}>
          <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>Resend code in </span>
          <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)',
                         color: 'var(--ink-2)', fontWeight: 500 }}>00:38</span>
        </div>
        <div style={{ marginTop: 10, textAlign: 'center' }}>
          <button style={{ fontSize: 14, color: 'var(--emerald)', fontWeight: 500 }}>
            Use email instead
          </button>
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{
          padding: '16px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <Icon name="shield" size={18} stroke={1.5}
                style={{ color: 'var(--ink-3)', marginTop: 1, flexShrink: 0 }}/>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            Never share this code with anyone. Acme Mobility will never ask for it.
          </p>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 1.5 — Sign Up
// ─────────────────────────────────────────────────────────────
function SignUpScreen() {
  return (
    <Screen bg="var(--bg)">
      {/* Forest header */}
      <div style={{
        flexShrink: 0, paddingBottom: 36, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(155deg, var(--forest) 0%, var(--forest-3) 100%)',
      }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
             viewBox="0 0 390 180" fill="none" aria-hidden>
          <circle cx="340" cy="20"  r="120" stroke="white" strokeWidth="0.6" opacity="0.05"/>
          <circle cx="340" cy="20"  r="80"  stroke="white" strokeWidth="0.6" opacity="0.05"/>
        </svg>
        <StatusBar dark/>
        <NavBar dark showBack right={
          <button style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: 500 }}>
            Sign in
          </button>
        }/>
        <div style={{ padding: '4px 28px 0', position: 'relative', zIndex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 8,
          }}>New account</div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-serif)', fontSize: 36,
            fontWeight: 400, color: '#FFF', letterSpacing: '-0.025em', lineHeight: 1.1,
          }}>
            Join Acme{' '}
            <span style={{ fontStyle: 'italic', fontWeight: 300, opacity: 0.72 }}>
              Mobility.
            </span>
          </h1>
        </div>
      </div>

      {/* Form card */}
      <div style={{
        flex: 1, background: 'var(--surface)',
        borderRadius: '24px 24px 0 0', marginTop: -24,
        padding: '28px 28px 36px',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-hero)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <MobileInput label="Full name"      icon="user"     value="Priya Sharma"/>
          <MobileInput label="Email address"  icon="envelope" value="priya.sharma@gmail.com"/>
          <MobileInput label="Mobile number"  icon="phone"    value="+91 98765 43210"/>
          <div>
            <MobileInput label="Password" icon="lock" value="••••••••••••"
              rightSlot={<Icon name="eye" size={20} stroke={1.5} style={{ color: 'var(--ink-4)' }}/>}
            />
            <StrengthBar score={3}/>
          </div>
        </div>

        {/* Terms */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          marginTop: 20, cursor: 'pointer',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
            background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="check" size={14} stroke={2.5} style={{ color: '#fff' }}/>
          </div>
          <span style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            I agree to the{' '}
            <span style={{ color: 'var(--emerald)', fontWeight: 500 }}>Terms of Service</span>
            {' '}and{' '}
            <span style={{ color: 'var(--emerald)', fontWeight: 500 }}>Privacy Policy</span>
          </span>
        </label>

        <div style={{ flex: 1, minHeight: 20 }}/>

        <div style={{ marginTop: 20 }}>
          <CTAButton variant="primary">Create account</CTAButton>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 14.5, color: 'var(--ink-3)' }}>
          Already registered?{' '}
          <button style={{ color: 'var(--emerald)', fontWeight: 600, fontSize: 14.5 }}>
            Sign in
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 1.6 — Profile Setup
// ─────────────────────────────────────────────────────────────
function ProfileSetupScreen() {
  return (
    <Screen bg="var(--bg)">
      {/* Forest header with progress */}
      <div style={{
        flexShrink: 0, paddingBottom: 40, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(155deg, var(--forest) 0%, var(--forest-3) 100%)',
      }}>
        <StatusBar dark/>
        <div style={{ padding: '12px 28px 0', position: 'relative', zIndex: 1 }}>
          {/* Step tracker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 22 }}>
            {[1, 2, 3].map((n, idx) => (
              <React.Fragment key={n}>
                <div style={{
                  width: 30, height: 30, borderRadius: 15, flexShrink: 0,
                  background: n < 3 ? 'var(--emerald)' : 'rgba(255,255,255,0.2)',
                  border: n === 3 ? '2px solid rgba(255,255,255,0.4)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, color: '#fff',
                }}>
                  {n < 3
                    ? <Icon name="check" size={15} stroke={2.5} style={{ color: '#fff' }}/>
                    : <span style={{ fontFamily: 'var(--font-mono)' }}>3</span>
                  }
                </div>
                {idx < 2 && (
                  <div style={{
                    flex: 1, height: 2, borderRadius: 1, margin: '0 6px',
                    background: n < 3 ? 'var(--emerald)' : 'rgba(255,255,255,0.15)',
                  }}/>
                )}
              </React.Fragment>
            ))}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 8,
          }}>Step 3 of 3</div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-serif)', fontSize: 32,
            fontWeight: 400, color: '#FFF', letterSpacing: '-0.025em', lineHeight: 1.15,
          }}>
            Your profile.
          </h1>
        </div>
      </div>

      {/* Form card */}
      <div style={{
        flex: 1, background: 'var(--surface)',
        borderRadius: '24px 24px 0 0', marginTop: -24,
        padding: '32px 28px 36px',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-hero)',
      }}>
        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 88, height: 88, borderRadius: 44,
              background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 3px var(--surface), 0 0 0 5px var(--emerald)',
            }}>
              <Icon name="user" size={38} stroke={1.3} style={{ color: 'var(--canopy)' }}/>
            </div>
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 30, height: 30, borderRadius: 15,
              background: 'var(--emerald)', border: '2.5px solid var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="camera" size={15} stroke={1.8} style={{ color: '#fff' }}/>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <button style={{ fontSize: 14, color: 'var(--emerald)', fontWeight: 500 }}>
            Add profile photo
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <MobileInput label="Display name" icon="user"     value="Priya"/>
          <MobileInput label="Home city"    icon="location" value="Mumbai, India"/>
        </div>

        {/* Notifications toggle */}
        <div style={{
          marginTop: 20, padding: '16px 18px', background: 'var(--surface-2)',
          borderRadius: 'var(--r-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
              Booking notifications
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
              Updates on your trips & flights
            </div>
          </div>
          <div style={{ width: 50, height: 30, borderRadius: 15, background: 'var(--emerald)', position: 'relative', flexShrink: 0 }}>
            <div style={{
              position: 'absolute', right: 3, top: 3,
              width: 24, height: 24, borderRadius: 12, background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
            }}/>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 20 }}/>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <CTAButton variant="primary">Complete setup</CTAButton>
          <CTAButton variant="ghost" style={{ color: 'var(--ink-4)', fontSize: 14 }}>
            Skip, I'll do this later
          </CTAButton>
        </div>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 1.7 — Forgot Password
// ─────────────────────────────────────────────────────────────
function ForgotPasswordScreen() {
  return (
    <Screen bg="var(--surface)">
      <StatusBar/>
      <NavBar showBack/>

      <div style={{ flex: 1, padding: '16px 28px 48px', display: 'flex', flexDirection: 'column' }}>
        {/* Lock icon */}
        <div style={{
          width: 80, height: 80, borderRadius: 40,
          background: 'var(--mint)', border: '1.5px solid rgba(24,181,116,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
        }}>
          <Icon name="lock" size={36} stroke={1.4} style={{ color: 'var(--emerald)' }}/>
        </div>

        <h1 style={{
          margin: '0 0 12px', fontFamily: 'var(--font-serif)', fontSize: 34,
          fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.1,
        }}>
          Forgot your<br/>password?
        </h1>
        <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.65 }}>
          No worries. Enter your email address and we'll send a secure reset link
          valid for 15 minutes.
        </p>

        <MobileInput label="Email address" icon="envelope" value="priya.sharma@gmail.com" focused/>

        <div style={{ marginTop: 24 }}>
          <CTAButton variant="primary">Send reset link</CTAButton>
        </div>

        <div style={{ flex: 1 }}/>

        <button style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 15, color: 'var(--ink-2)', fontWeight: 500, marginTop: 24,
        }}>
          <Icon name="arrowLeft" size={16} stroke={2.2}/> Back to sign in
        </button>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// 1.8 — Reset Link Sent
// ─────────────────────────────────────────────────────────────
function ResetSentScreen() {
  return (
    <Screen bg="var(--surface)">
      <StatusBar/>
      <NavBar showBack={false}/>

      <div style={{
        flex: 1, padding: '24px 28px 56px', display: 'flex',
        flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      }}>
        {/* Success ring */}
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <div style={{
            width: 100, height: 100, borderRadius: 50,
            background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid rgba(24,181,116,0.2)',
          }}>
            <Icon name="checkCircle" size={52} stroke={1.4} style={{ color: 'var(--emerald)' }}/>
          </div>
          <div style={{
            position: 'absolute', inset: -8, borderRadius: '50%',
            border: '1.5px solid rgba(24,181,116,0.12)',
          }}/>
        </div>

        <h1 style={{
          margin: '0 0 12px', fontFamily: 'var(--font-serif)', fontSize: 36,
          fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.1,
        }}>
          Check your inbox.
        </h1>
        <p style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.6 }}>
          A reset link has been sent to
        </p>
        <p style={{
          margin: '0 0 40px', fontSize: 15, color: 'var(--ink-2)',
          fontFamily: 'var(--font-mono)', fontWeight: 500,
        }}>
          priya.sharma@gmail.com
        </p>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <CTAButton variant="primary">Open email app</CTAButton>
          <CTAButton variant="subtle" style={{ fontSize: 14, color: 'var(--ink-3)' }}>
            Resend in 00:48
          </CTAButton>
        </div>

        <div style={{ flex: 1 }}/>

        {/* Tip */}
        <div style={{
          width: '100%', padding: '16px 18px', background: 'var(--surface-2)',
          borderRadius: 'var(--r-md)', display: 'flex', gap: 12, alignItems: 'flex-start',
          marginBottom: 20, textAlign: 'left',
        }}>
          <Icon name="info" size={18} stroke={1.5}
                style={{ color: 'var(--ink-3)', marginTop: 1, flexShrink: 0 }}/>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            Check your spam folder if you don't see it.
            The link expires in{' '}
            <strong style={{ color: 'var(--ink-2)' }}>15 minutes</strong>.
          </p>
        </div>

        <button style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 15, color: 'var(--ink-2)', fontWeight: 500,
        }}>
          <Icon name="arrowLeft" size={16} stroke={2.2}/> Back to sign in
        </button>
      </div>
    </Screen>
  );
}

Object.assign(window, {
  SplashScreen, WelcomeScreen, SignInScreen, OTPScreen,
  SignUpScreen, ProfileSetupScreen, ForgotPasswordScreen, ResetSentScreen,
});
