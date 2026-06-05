/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 02 — Onboarding & Company Profile
   2.1 Onboarding Wizard (5 steps) · 2.2 Approval Status · 2.3 Company Profile
   Submission + maintenance only. Approval is admin-controlled (Admin Mod 9);
   admin-owned states are surfaced read-only. Shared globals from components.jsx.
   ───────────────────────────────────────────────────────────── */

// ──────────────────────────────────────────────────────────────
// Wizard step model
// ──────────────────────────────────────────────────────────────
const WIZ_STEPS = [
  { n: 1, key: 'company', title: 'Company details',          desc: 'Legal entity, registration, primary contact' },
  { n: 2, key: 'certs',   title: 'Certifications & insurance', desc: 'AOC and liability cover — gates publishing' },
  { n: 3, key: 'bases',   title: 'Operating bases',           desc: 'Helipads and airports you fly from' },
  { n: 4, key: 'payout',  title: 'Payout details',            desc: 'Settlement account for platform runs' },
  { n: 5, key: 'review',  title: 'Review & submit',           desc: 'Send to platform admin for approval' },
];

// "Locks after approval" annotation
function LockPill() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
      <Icon name="shield" size={10} stroke={1.6} /> Locks at approval
    </span>
  );
}

// Field that can carry a lock marker / verified pill
function LockField({ label, value, locked, verified, select, mono }) {
  return (
    <div className="field">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 14 }}>
        <label className="field-label">{label}</label>
        {locked && <LockPill />}
      </div>
      <div className="input" style={locked ? { background: 'var(--surface-2)' } : null}>
        <input defaultValue={value} readOnly style={{ flex: 1, color: locked ? 'var(--ink-2)' : 'var(--ink)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', fontSize: mono ? 13 : 14 }} />
        {verified && <span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Verified</span>}
        {locked && <Icon name="key" size={13} className="icon" />}
        {select && <Icon name="chevDown" size={14} className="icon" />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Wizard chrome — standalone (pre-app) full-height layout.
// Left: vertical stepper · Right: header + scrollable form + footer nav.
// ──────────────────────────────────────────────────────────────
function WizardChrome({ active, children, footerNote, primaryLabel = 'Continue', primaryAccent }) {
  const activeIdx = WIZ_STEPS.findIndex(s => s.key === active);
  const step = WIZ_STEPS[activeIdx];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', width: '100%', height: '100%', background: 'var(--surface)' }}>
      {/* Left — stepper */}
      <div style={{ background: 'var(--surface-2)', borderRight: '1px solid var(--rule)', padding: '32px 30px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 400 400" style={{ position: 'absolute', bottom: -120, left: -120, width: 460, height: 460, opacity: 0.07, color: 'var(--ink-3)' }} aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth="0.8">
            <circle cx="200" cy="200" r="180" /><circle cx="200" cy="200" r="120" /><circle cx="200" cy="200" r="60" />
          </g>
        </svg>

        <div style={{ position: 'relative', zIndex: 1 }}><BrandLockup /></div>

        <div style={{ marginTop: 28, position: 'relative', zIndex: 1 }}>
          <div className="t-label" style={{ marginBottom: 10 }}>New operator onboarding</div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.12, color: 'var(--ink)' }}>
            Set up Helix Aviation<br />on the platform.
          </h1>
        </div>

        <div style={{ marginTop: 28, flex: 1, position: 'relative', zIndex: 1 }}>
          {WIZ_STEPS.map((s, i) => {
            const done = i < activeIdx, on = i === activeIdx;
            return (
              <div key={s.key} style={{ display: 'flex', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: done ? 'var(--accent)' : on ? 'var(--ink)' : 'var(--surface)',
                    border: '1px solid ' + (done ? 'var(--accent)' : on ? 'var(--ink)' : 'var(--rule-strong)'),
                    color: (done || on) ? '#fff' : 'var(--ink-4)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 11.5,
                  }}>
                    {done ? <Icon name="check" size={13} stroke={2.4} /> : s.n}
                  </span>
                  {i < WIZ_STEPS.length - 1 && <span style={{ width: 1, flex: 1, minHeight: 28, background: done ? 'var(--accent)' : 'var(--rule)', margin: '4px 0' }} />}
                </div>
                <div style={{ paddingTop: 3, paddingBottom: 14 }}>
                  <div style={{ fontSize: 13.5, fontWeight: on ? 500 : 400, color: on ? 'var(--ink)' : done ? 'var(--ink-2)' : 'var(--ink-3)' }}>{s.title}</div>
                  <div className="t-meta" style={{ marginTop: 3, lineHeight: 1.45 }}>{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ position: 'relative', zIndex: 1, paddingTop: 18, borderTop: '1px solid var(--rule)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="shield" size={14} style={{ color: 'var(--ink-3)', marginTop: 2, flexShrink: 0 }} />
            <div className="t-meta" style={{ lineHeight: 1.5 }}>
              Approval, commission, and publishing are <span style={{ color: 'var(--ink-2)' }}>controlled by the platform admin</span> after you submit.
            </div>
          </div>
        </div>
      </div>

      {/* Right — header + content + footer */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
          <div>
            <div className="t-label" style={{ marginBottom: 5 }}>Step {step.n} of {WIZ_STEPS.length}</div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 23, fontWeight: 400, letterSpacing: '-0.018em', color: 'var(--ink)' }}>{step.title}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge"><span className="dot pending" />Draft</span>
            <button className="btn sm"><Icon name="external" size={12} />Save &amp; exit</button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '30px 40px' }}>
          <div style={{ maxWidth: 720 }}>{children}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderTop: '1px solid var(--rule)', background: 'var(--surface)', flexShrink: 0 }}>
          <div className="t-meta">{footerNote || 'Saved as draft · just now'}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" disabled={activeIdx === 0} style={activeIdx === 0 ? { opacity: 0.4 } : null}><Icon name="chevLeft" size={13} />Back</button>
            <button className={'btn ' + (primaryAccent ? 'accent' : 'primary')}>{primaryLabel}{!primaryAccent && <Icon name="arrowRight" size={13} />}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 2.1a — Step 1 · Company details
// ──────────────────────────────────────────────────────────────
function WizCompanyScreen() {
  return (
    <WizardChrome active="company" footerNote="Saved as draft · 2 min ago">
      <FormSection title="Legal entity" description="As registered with your civil-aviation authority. The platform admin verifies these identifiers; they lock once your operator account is approved.">
        <Row>
          <LockField label="Legal name" value="Helix Aviation Pvt Ltd" locked />
          <LockField label="Trade / display name" value="Helix Aviation" />
        </Row>
        <Row>
          <LockField label="Company registration no." value="U62200MH2019PTC334120" locked mono />
          <LockField label="Business type" value="Air charter & helicopter operator" select />
        </Row>
      </FormSection>

      <div style={{ height: 26 }} />

      <FormSection title="Registered office" description="Used on settlement documents and regulatory filings.">
        <div className="field">
          <label className="field-label">Address</label>
          <div className="input"><input defaultValue="Hangar 4, Juhu Aerodrome, Vile Parle West" readOnly style={{ flex: 1 }} /></div>
        </div>
        <Row cols={3}>
          <Field label="City" value="Mumbai" />
          <Field label="State / region" value="Maharashtra" select />
          <Field label="Country" value="India" select />
        </Row>
      </FormSection>

      <div style={{ height: 26 }} />

      <FormSection title="Primary contact" description="Your Operator Admin account is created from this contact when you submit. They receive approval decisions and compliance alerts.">
        <Row>
          <Field label="Contact name" value="Arjun Khanna" />
          <Field label="Designation" value="Accountable Manager" />
        </Row>
        <Row>
          <Field label="Work email" value="arjun.khanna@helixaviation.in" right={<span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Verified</span>} />
          <Field label="Phone (E.164)" value="+91 98201 14477" right={<span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Verified</span>} />
        </Row>
      </FormSection>
    </WizardChrome>
  );
}

// ──────────────────────────────────────────────────────────────
// Document upload row — uploaded file w/ scan status + expiry chip
// ──────────────────────────────────────────────────────────────
function DocUploadRow({ title, required, file, size, issuer, expiry, expiryTone = 'ok', last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)' }}>
      <div style={{ width: 38, height: 46, borderRadius: 3, background: 'var(--surface-sunk)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-3)' }}>
        <Icon name="archive" size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{title}</span>
          {required && <span className="t-meta" style={{ color: 'var(--accent)' }}>Required</span>}
        </div>
        <div className="t-meta" style={{ marginTop: 3 }}>{file} · {size} · {issuer}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="t-label" style={{ padding: 0, marginBottom: 4 }}>Valid until</div>
        <span className={'badge ' + expiryTone} style={{ height: 20 }}><span className={'dot ' + expiryTone} />{expiry}</span>
      </div>
      <div style={{ width: 1, height: 34, background: 'var(--rule)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, minWidth: 104 }}>
        <span className="badge ok" style={{ height: 20 }}><Icon name="shield" size={10} stroke={2} />Scanned · clean</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <a className="t-meta" style={{ color: 'var(--accent)', cursor: 'pointer' }}>Replace</a>
          <a className="t-meta" style={{ color: 'var(--ink-3)', cursor: 'pointer' }}>Preview</a>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 2.1b — Step 2 · Certifications & insurance
// ──────────────────────────────────────────────────────────────
function WizCertsScreen() {
  return (
    <WizardChrome active="certs" footerNote="Saved as draft · just now">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '13px 16px', background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 24%, var(--rule))', borderRadius: 3, marginBottom: 24 }}>
        <Icon name="alert" size={15} style={{ color: 'var(--warn)', marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          Every certificate must carry a <span style={{ color: 'var(--ink)' }}>future expiry date</span>. An expired or missing document blocks submission and, after approval, auto-pauses publishing until renewed.
        </div>
      </div>

      <FormSection title="Air Operator's Certificate" description="Your AOC and operations specification authorise commercial air transport. The admin verifies these against the issuing authority.">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <DocUploadRow title="AOC — Air Operator's Certificate" required file="AOC-IN-2024.pdf" size="2.1 MB" issuer="DGCA India" expiry="31 Aug 2027" expiryTone="ok" />
          <DocUploadRow title="Operations specification (Ops Spec)" required file="OpsSpec-rev6.pdf" size="1.4 MB" issuer="DGCA India" expiry="31 Aug 2027" expiryTone="ok" last />
        </div>
      </FormSection>

      <div style={{ height: 24 }} />

      <FormSection title="Insurance" description="Third-party and passenger liability cover. Coverage limits are recorded for manifest and route eligibility.">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <DocUploadRow title="Passenger & third-party liability" required file="Liability-2026.pdf" size="980 KB" issuer="Tata AIG · ₹50 Cr" expiry="14 Jul 2026" expiryTone="warn" />
          <DocUploadRow title="Hull & war-risk cover" file="Hull-2026.pdf" size="1.1 MB" issuer="ICICI Lombard" expiry="14 Jul 2026" expiryTone="warn" last />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Icon name="clock" size={13} style={{ color: 'var(--warn)' }} />
          <span className="t-meta" style={{ color: 'var(--ink-2)' }}>Liability cover expires in <span style={{ color: 'var(--warn)' }}>42 days</span> — you'll be reminded before it lapses.</span>
        </div>
      </FormSection>

      <div style={{ height: 22 }} />

      <button className="btn" style={{ borderStyle: 'dashed', width: '100%', height: 46, color: 'var(--ink-3)' }}>
        <Icon name="upload" size={14} /> Add another certificate · PDF or JPG, up to 10 MB
      </button>
    </WizardChrome>
  );
}

// ──────────────────────────────────────────────────────────────
// Schematic base map — abstract markers (on-brand with login geometry)
// ──────────────────────────────────────────────────────────────
function BaseMiniMap() {
  return (
    <div style={{ position: 'relative', height: 200, borderRadius: 3, overflow: 'hidden', background: 'var(--surface-sunk)', border: '1px solid var(--rule)' }}>
      <svg viewBox="0 0 720 220" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', color: 'var(--ink-4)' }} aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.4">
          {[60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660].map(x => <line key={'v' + x} x1={x} y1="0" x2={x} y2="220" />)}
          {[40, 90, 140, 190].map(y => <line key={'h' + y} x1="0" y1={y} x2="720" y2={y} />)}
        </g>
        <g fill="none" stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="3 5" opacity="0.55">
          <path d="M190 130 Q360 50 520 95" />
          <path d="M190 130 Q320 195 560 160" />
        </g>
        {[['190', '130'], ['520', '95'], ['560', '160']].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="9" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.2" />
            <circle cx={cx} cy={cy} r="2.6" fill="var(--accent)" />
          </g>
        ))}
      </svg>
      <div style={{ position: 'absolute', left: 12, bottom: 12 }}>
        <span className="badge" style={{ background: 'var(--surface)', height: 22 }}><Icon name="helipad" size={11} />3 bases</span>
      </div>
      <div style={{ position: 'absolute', right: 12, top: 12 }}>
        <span className="t-label" style={{ background: 'var(--surface)', padding: '4px 8px', borderRadius: 2, border: '1px solid var(--rule)' }}>Western region · MH</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 2.1c — Step 3 · Operating bases
// ──────────────────────────────────────────────────────────────
function WizBasesScreen() {
  const bases = [
    { name: 'Juhu Aerodrome', code: 'VAJJ', type: 'Airport', city: 'Mumbai, MH', coord: '19.0976° N, 72.8347° E', primary: true },
    { name: 'Pune Heliport', code: 'VAPO-H', type: 'Helipad', city: 'Pune, MH', coord: '18.5793° N, 73.9089° E', primary: false },
    { name: 'Shirdi Helipad', code: 'VASD-H', type: 'Helipad', city: 'Shirdi, MH', coord: '19.6884° N, 74.3789° E', primary: false },
  ];
  return (
    <WizardChrome active="bases" footerNote="Saved as draft · just now">
      <FormSection title="Operating bases" description="The helipads and airports you operate from. Routes and schedules are built between these points; passengers see them as origins and destinations.">
        <BaseMiniMap />
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr><th>Base</th><th>Type</th><th>ICAO</th><th>Coordinates</th><th style={{ textAlign: 'right' }}>Action</th></tr>
            </thead>
            <tbody>
              {bases.map(b => (
                <tr key={b.code}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Icon name={b.type === 'Airport' ? 'plane' : 'helipad'} size={16} style={{ color: 'var(--ink-3)' }} />
                      <div>
                        <div style={{ fontSize: 13.5 }}>{b.name} {b.primary && <span style={{ marginLeft: 4, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em' }}>· PRIMARY</span>}</div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{b.city}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge">{b.type}</span></td>
                  <td className="num" style={{ color: 'var(--ink-2)' }}>{b.code}</td>
                  <td className="num" style={{ color: 'var(--ink-2)', fontSize: 12 }}>{b.coord}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 12 }}>
                      <a className="t-meta" style={{ color: 'var(--accent)', cursor: 'pointer' }}>Edit</a>
                      {!b.primary && <a className="t-meta" style={{ color: 'var(--ink-3)', cursor: 'pointer' }}>Remove</a>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn" style={{ borderStyle: 'dashed', width: '100%', height: 44, color: 'var(--ink-3)' }}>
          <Icon name="plus" size={13} /> Add operating base
        </button>
      </FormSection>
    </WizardChrome>
  );
}

// ──────────────────────────────────────────────────────────────
// 2.1d — Step 4 · Payout / bank details
// ──────────────────────────────────────────────────────────────
function WizPayoutScreen() {
  return (
    <WizardChrome active="payout" footerNote="Saved as draft · just now">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '13px 16px', background: 'var(--info-soft)', border: '1px solid color-mix(in oklab, var(--info) 24%, var(--rule))', borderRadius: 3, marginBottom: 24 }}>
        <Icon name="wallet" size={15} style={{ color: 'var(--info)', marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          Settlement runs pay into this account. Details are <span style={{ color: 'var(--ink)' }}>write-only</span> — once saved they're masked on read, and only an Operator Admin or Finance user can change them.
        </div>
      </div>

      <FormSection title="Settlement account" description="The bank account the platform remits net payouts to, after commission and fees.">
        <Row>
          <Field label="Account holder name" value="Helix Aviation Pvt Ltd" />
          <Field label="Account type" value="Current · Business" select />
        </Row>
        <Row>
          <div className="field">
            <label className="field-label">Account number</label>
            <div className="input"><input defaultValue="•••• •••• •••• 4471" readOnly style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13 }} /><Icon name="eye" size={13} className="icon" /></div>
          </div>
          <Field label="IFSC code" value="HDFC0000234" right={<span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Valid</span>} />
        </Row>
        <Row>
          <Field label="Bank name" value="HDFC Bank" />
          <Field label="Branch" value="Vile Parle West, Mumbai" />
        </Row>
      </FormSection>

      <div style={{ height: 26 }} />

      <FormSection title="Tax & compliance" description="Used on settlement statements and tax-withholding calculations.">
        <Row>
          <LockField label="GSTIN" value="27AACCH4471P1ZK" mono />
          <LockField label="PAN" value="AACCH4471P" mono />
        </Row>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 16px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
          <span style={{ width: 36, height: 36, borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}><Icon name="archive" size={16} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--ink)' }}>Cancelled cheque · bank-proof.pdf</div>
            <div className="t-meta" style={{ marginTop: 2 }}>740 KB · uploaded for account verification</div>
          </div>
          <span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Penny-drop verified</span>
        </div>
      </FormSection>
    </WizardChrome>
  );
}

// ──────────────────────────────────────────────────────────────
// Review summary block
// ──────────────────────────────────────────────────────────────
function ReviewBlock({ step, title, status = 'ok', rows }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--rule-soft)', background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', color: 'var(--ink-4)' }}>0{step}</span>
          <span style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{title}</span>
          {status === 'ok'
            ? <span className="badge ok" style={{ height: 19 }}><Icon name="check" size={9} stroke={2.6} />Complete</span>
            : <span className="badge warn" style={{ height: 19 }}><span className="dot warn" />Expiring soon</span>}
        </div>
        <a className="t-meta" style={{ color: 'var(--accent)', cursor: 'pointer' }}>Edit step →</a>
      </div>
      <div style={{ padding: '6px 16px 10px' }}>
        {rows.map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, padding: '7px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
            <span className="t-meta" style={{ color: 'var(--ink-3)' }}>{k}</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)', textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 2.1e — Step 5 · Review & submit
// ──────────────────────────────────────────────────────────────
function WizReviewScreen() {
  return (
    <WizardChrome active="review" footerNote="All required steps complete · ready to submit" primaryLabel="Submit for approval" primaryAccent>
      <div style={{ marginBottom: 22 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.014em', color: 'var(--ink)' }}>Review everything before you submit</h3>
        <p style={{ marginTop: 8, marginBottom: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 640 }}>
          On submit, your profile is sent to the platform admin for review. You can't publish inventory or accept bookings until they approve. We'll email you at each status change.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ReviewBlock step={1} title="Company details" rows={[
          ['Legal name', 'Helix Aviation Pvt Ltd'],
          ['Registration no.', 'U62200MH2019PTC334120'],
          ['Primary contact', 'Arjun Khanna · Accountable Manager'],
        ]} />
        <ReviewBlock step={2} title="Certifications & insurance" status="warn" rows={[
          ['AOC + Ops Spec', 'Valid until 31 Aug 2027'],
          ['Liability cover', '₹50 Cr · Tata AIG · expires in 42 days'],
        ]} />
        <ReviewBlock step={3} title="Operating bases" rows={[
          ['Bases', '3 · Juhu (primary), Pune, Shirdi'],
          ['Region', 'Western · Maharashtra'],
        ]} />
        <ReviewBlock step={4} title="Payout details" rows={[
          ['Settlement account', 'HDFC Bank ···· 4471 · penny-drop verified'],
          ['GSTIN / PAN', '27AACCH4471P1ZK · AACCH4471P'],
        ]} />
      </div>

      <div style={{ marginTop: 22, padding: '16px 18px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 11, cursor: 'pointer' }}>
          <span style={{ width: 17, height: 17, borderRadius: 3, marginTop: 1, border: '1px solid var(--accent)', background: 'var(--accent-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="check" size={11} stroke={2.4} style={{ color: 'var(--accent)' }} />
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            I confirm the information above is accurate and that Helix Aviation will comply with the platform's <a style={{ color: 'var(--accent)', cursor: 'pointer' }}>Operator Agreement</a> and <a style={{ color: 'var(--accent)', cursor: 'pointer' }}>safety policy</a>. I understand publishing is gated on admin approval.
          </span>
        </label>
      </div>
    </WizardChrome>
  );
}

// ──────────────────────────────────────────────────────────────
// Approval state machine model
// ──────────────────────────────────────────────────────────────
const APPROVAL_STATES = [
  { key: 'draft',     label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'in_review', label: 'In Review' },
  { key: 'approved',  label: 'Approved' },
];

// ──────────────────────────────────────────────────────────────
// 2.2 — Approval Status (gated standalone page; operator pre-approval)
// ──────────────────────────────────────────────────────────────
function ApprovalStatusScreen() {
  const current = 'in_review';
  const curIdx = APPROVAL_STATES.findIndex(s => s.key === current);
  const timeline = [
    { ev: 'Submitted for approval', who: 'Arjun Khanna', when: '28 May 2026 · 09:24', tone: 'ok', note: 'All five onboarding steps completed.' },
    { ev: 'Returned — changes requested', who: 'Platform Admin · M. Rao', when: '29 May 2026 · 14:10', tone: 'danger', note: 'Liability cover named the trade name, not the legal entity. Re-upload with “Helix Aviation Pvt Ltd” as the insured party.' },
    { ev: 'Re-submitted', who: 'Arjun Khanna', when: '30 May 2026 · 11:02', tone: 'ok', note: 'Replaced liability certificate (Liability-2026.pdf).' },
    { ev: 'Moved to In Review', who: 'Platform Admin', when: '30 May 2026 · 16:45', tone: 'info', note: 'Assigned to compliance reviewer. Typical decision time: 2–3 business days.' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 40px', borderBottom: '1px solid var(--rule)', background: 'var(--surface)', flexShrink: 0 }}>
        <BrandLockup />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="t-meta">Onboarding · Approval status</span>
          <div style={{ width: 1, height: 20, background: 'var(--rule)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div className="avatar">AK</div>
            <Icon name="chevDown" size={13} style={{ color: 'var(--ink-3)' }} />
          </div>
        </div>
      </div>

      {/* admin-controlled banner */}
      <AdminStateBanner
        tone="info" icon="clock" label="In Review"
        message="Your profile is with the platform admin's compliance team. You'll be emailed the moment a decision is made."
        action={<button className="btn sm" style={{ height: 26 }}><Icon name="refresh" size={11} />Refresh status</button>}
      />

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 40px' }}>
          {/* hero status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 28, alignItems: 'start' }}>
            <div>
              <div className="t-label" style={{ marginBottom: 12 }}>Helix Aviation Pvt Ltd · Operator application</div>
              <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 400, letterSpacing: '-0.022em', lineHeight: 1.08, color: 'var(--ink)' }}>
                Your application is<br /><span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--info)' }}>under review.</span>
              </h1>
              <p style={{ marginTop: 16, fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, maxWidth: 460 }}>
                Nothing more is needed from you right now. The platform admin verifies your certifications, insurance, and registration against the issuing authorities before approving. Most decisions land within two to three business days.
              </p>
              <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
                <button className="btn"><Icon name="eye" size={13} />View submitted profile</button>
                <button className="btn"><Icon name="envelope" size={13} />Contact platform support</button>
              </div>
            </div>

            {/* state stepper card */}
            <div className="card" style={{ padding: '22px 24px' }}>
              <div className="t-label" style={{ marginBottom: 18 }}>Application state</div>
              {APPROVAL_STATES.map((s, i) => {
                const done = i < curIdx, on = i === curIdx;
                return (
                  <div key={s.key} style={{ display: 'flex', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        background: done ? 'var(--accent)' : on ? 'var(--info)' : 'var(--surface)',
                        border: '1px solid ' + (done ? 'var(--accent)' : on ? 'var(--info)' : 'var(--rule-strong)'),
                        color: (done || on) ? '#fff' : 'var(--ink-4)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: 10.5,
                      }}>
                        {done ? <Icon name="check" size={12} stroke={2.4} /> : on ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} /> : i + 1}
                      </span>
                      {i < APPROVAL_STATES.length - 1 && <span style={{ width: 1, flex: 1, minHeight: 26, background: done ? 'var(--accent)' : 'var(--rule)', margin: '3px 0' }} />}
                    </div>
                    <div style={{ paddingBottom: 18 }}>
                      <div style={{ fontSize: 13.5, fontWeight: on ? 500 : 400, color: on ? 'var(--ink)' : done ? 'var(--ink-2)' : 'var(--ink-4)' }}>{s.label}</div>
                      <div className="t-meta" style={{ marginTop: 2 }}>{done ? 'Done' : on ? 'In progress · est. 2–3 days' : 'Pending'}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 4, paddingTop: 14, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-meta">Reviewer</span>
                <span className="t-meta" style={{ color: 'var(--ink-2)' }}>Compliance · M. Rao</span>
              </div>
            </div>
          </div>

          {/* activity timeline */}
          <div style={{ marginTop: 38 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.014em', color: 'var(--ink)' }}>Application history</h2>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
              <span className="t-meta">Audit trail · read-only</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {timeline.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span className={'dot ' + t.tone} style={{ marginTop: 6 }} />
                    {i < timeline.length - 1 && <span style={{ width: 1, flex: 1, background: 'var(--rule)', margin: '4px 0' }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{t.ev}</span>
                      <span className="t-meta">{t.when}</span>
                    </div>
                    <div className="t-meta" style={{ marginTop: 3 }}>{t.who}</div>
                    <div style={{
                      marginTop: 8, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5,
                      padding: t.tone === 'danger' ? '12px 14px' : '0',
                      background: t.tone === 'danger' ? 'var(--danger-soft)' : 'transparent',
                      border: t.tone === 'danger' ? '1px solid color-mix(in oklab, var(--danger) 22%, var(--rule))' : 'none',
                      borderRadius: 3,
                    }}>
                      {t.tone === 'danger' && <div className="t-label" style={{ color: 'var(--danger)', marginBottom: 6 }}>Admin reason for changes</div>}
                      {t.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Company-profile sub-nav rail
// ──────────────────────────────────────────────────────────────
function CompanyRail({ active }) {
  const items = [
    { l: 'Company info', i: 'building' },
    { l: 'Certifications', i: 'shield' },
    { l: 'Insurance', i: 'archive' },
    { l: 'Operating bases', i: 'helipad' },
    { l: 'Payout details', i: 'wallet' },
  ];
  return (
    <aside style={{ borderRight: '1px solid var(--rule)', padding: '28px 24px', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 22, borderBottom: '1px solid var(--rule)' }}>
        <div className="avatar lg" style={{ borderRadius: 6, background: 'var(--surface-sunk)' }}><Icon name="helipad" size={24} style={{ color: 'var(--ink-2)' }} /></div>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)' }}>Helix Aviation</div>
          <div className="t-meta" style={{ marginTop: 2 }}>Operator · IN</div>
          <div style={{ marginTop: 8 }}><span className="badge ok"><span className="dot ok" />Approved partner</span></div>
        </div>
      </div>
      <div style={{ paddingTop: 18 }}>
        <div className="t-label" style={{ marginBottom: 8, padding: 0 }}>Company</div>
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
        <div className="t-label" style={{ padding: 0, marginBottom: 10 }}>Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Approved', '14 Mar 2025 · by M. Rao'],
            ['Commission tier', 'Standard · 12%'],
            ['Last reviewed', '02 Apr 2026'],
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
// 2.3 — Company Profile (post-approval maintenance)
// ──────────────────────────────────────────────────────────────
function CompanyProfileScreen() {
  return (
    <Shell
      active="company"
      breadcrumb="Settings · Company Profile"
      title="Company Profile"
      subtitle="Helix Aviation Pvt Ltd · approved partner since 14 Mar 2025"
      actions={<button className="btn sm"><Icon name="download" size={13} />Export profile</button>}
      banner={
        <AdminStateBanner
          tone="warn" icon="alert" label="Re-review pending"
          message="You changed a locked field (legal name). The platform admin must re-approve this change before it takes effect; your current approval stays active meanwhile."
          action={<button className="btn sm" style={{ height: 26 }}>View change</button>}
        />
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: '100%' }}>
        <CompanyRail active="Company info" />

        <div style={{ padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '13px 16px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
            <Icon name="key" size={15} style={{ color: 'var(--ink-3)', marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Fields marked <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}><Icon name="shield" size={10} />locked</span> were verified at approval. Editing one sends the change to the platform admin for re-review before it goes live.
            </div>
          </div>

          <FormSection title="Legal entity" description="Identifiers verified against your civil-aviation authority. Changing these requires admin re-approval.">
            <Row>
              <LockField label="Legal name" value="Helix Aviation Pvt Ltd" locked />
              <LockField label="Trade / display name" value="Helix Aviation" />
            </Row>
            <Row>
              <LockField label="Company registration no." value="U62200MH2019PTC334120" locked mono />
              <LockField label="Business type" value="Air charter & helicopter operator" select />
            </Row>
          </FormSection>

          <FormSection title="Registered office & contact" description="Used on settlement documents, manifests, and regulatory filings.">
            <div className="field">
              <label className="field-label">Address</label>
              <div className="input"><input defaultValue="Hangar 4, Juhu Aerodrome, Vile Parle West, Mumbai 400056" readOnly style={{ flex: 1 }} /></div>
            </div>
            <Row>
              <Field label="Primary contact" value="Arjun Khanna · Accountable Manager" />
              <Field label="Operations desk" value="+91 22 6677 1100" />
            </Row>
            <Row>
              <Field label="Contact email" value="ops@helixaviation.in" right={<span className="badge ok"><Icon name="check" size={10} stroke={2.4} />Verified</span>} />
              <Field label="Website" value="helixaviation.in" />
            </Row>
          </FormSection>

          <FormSection title="Compliance snapshot" description="Live status of the documents that gate publishing. Manage each in its own tab.">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {[
                ['AOC + Operations Spec', 'DGCA India', 'Valid until 31 Aug 2027', 'ok'],
                ['Passenger & third-party liability', 'Tata AIG · ₹50 Cr', 'Expires in 42 days', 'warn'],
                ['Operating bases', '3 active · Juhu, Pune, Shirdi', 'All verified', 'ok'],
                ['Settlement account', 'HDFC Bank ···· 4471', 'Penny-drop verified', 'ok'],
              ].map(([t, d, status, tone], i) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: i < 3 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{t}</div>
                    <div className="t-meta" style={{ marginTop: 3 }}>{d}</div>
                  </div>
                  <span className={'badge ' + tone}><span className={'dot ' + tone} />{status}</span>
                </div>
              ))}
            </div>
          </FormSection>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0 8px', borderTop: '1px solid var(--rule)' }}>
            <div className="t-meta">Changes audit-logged · last saved 02 Apr 2026 by Arjun Khanna</div>
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

Object.assign(window, {
  WizCompanyScreen, WizCertsScreen, WizBasesScreen, WizPayoutScreen, WizReviewScreen,
  ApprovalStatusScreen, CompanyProfileScreen,
});
