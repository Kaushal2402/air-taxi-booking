/* ─────────────────────────────────────────────────────────────
   Operator Web Panel · Module 15 — Compliance Documents
   15.1a  Documents list — all compliant
   15.1b  Documents list — 2 expiry alerts
   15.2   Document detail + renewal upload flow
   ───────────────────────────────────────────────────────────── */

// ─── Document status badge ─────────────────────────────────────
function DocStatus({ s, daysLeft }) {
  const tone = s === 'Expired' ? 'danger' : s === 'Expiring soon' ? 'warn' : s === 'Under review' ? 'info' : 'ok';
  return (
    <span className={`badge ${tone}`} style={{ height: 20, fontSize: 10.5 }}>
      <span className={`dot ${tone}`} />{s}
      {daysLeft != null && daysLeft < 60 && daysLeft >= 0 && <span style={{ marginLeft: 4, opacity: 0.75 }}>· {daysLeft}d</span>}
    </span>
  );
}

// ─── Category section header ────────────────────────────────────
function CatHeader({ label, count, allOk }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px 6px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', borderTop: '1px solid var(--rule)', marginTop: 8 }}>
      <Icon name={allOk ? 'check' : 'alert'} size={12} style={{ color: allOk ? 'var(--ok)' : 'var(--danger)', flexShrink: 0 }} />
      <span className="t-label">{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--ink)', color: 'var(--bg)' }}>{count}</span>
    </div>
  );
}

// ─── Document row ──────────────────────────────────────────────
function DocRow({ d, last }) {
  const isExpired = d.daysLeft < 0;
  const isWarn    = d.daysLeft >= 0 && d.daysLeft < 30;
  const rowBg     = isExpired ? 'color-mix(in oklab,var(--danger-soft) 55%,transparent)' : isWarn ? 'color-mix(in oklab,var(--warn-soft) 40%,transparent)' : 'transparent';
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 24px', borderBottom: last ? 'none' : '1px solid var(--rule-soft)', background: rowBg }}>
      {/* icon + name */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
          <Icon name="shield" size={13} style={{ color: isExpired ? 'var(--danger)' : isWarn ? 'var(--warn)' : 'var(--ok)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
        </div>
        <div className="t-meta" style={{ fontSize: 10.5, paddingLeft: 22 }}>{d.docNo} · Issued {d.issued}</div>
      </div>
      {/* scope */}
      <div style={{ width: 120, flexShrink: 0 }}>
        <div className="t-meta" style={{ fontSize: 11 }}>{d.scope}</div>
      </div>
      {/* expiry */}
      <div style={{ width: 130, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: isExpired ? 'var(--danger)' : isWarn ? 'var(--warn)' : 'var(--ink-3)', letterSpacing: '0.03em' }}>{d.expires}</div>
        {d.daysLeft != null && d.daysLeft < 999 && (
          <div className="t-meta" style={{ fontSize: 10.5, marginTop: 2, color: isExpired ? 'var(--danger)' : isWarn ? 'var(--warn)' : undefined }}>{isExpired ? 'EXPIRED' : `${d.daysLeft}d remaining`}</div>
        )}
      </div>
      {/* status */}
      <div style={{ width: 120, flexShrink: 0 }}>
        <DocStatus s={d.status} daysLeft={d.daysLeft} />
      </div>
      {/* actions */}
      <div style={{ display: 'flex', gap: 5, width: 160, flexShrink: 0, justifyContent: 'flex-end' }}>
        {d.actions}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Build document list (shared between variants)
// ─────────────────────────────────────────────────────────────
function buildDocs(isAlert) {
  return {
    operator: [
      {
        name: 'Air Operator Certificate', docNo: 'DGCA-AOC-HX-2022-001',
        issued: '14 Mar 2022', expires: '13 Mar 2027', daysLeft: 281, scope: 'All ops',
        status: 'Valid',
        actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="d" className="btn sm" style={{ height: 26 }}><Icon name="download" size={11} /></button>],
      },
      {
        name: 'DGCA Operator Approval', docNo: 'OPR-2022-0441',
        issued: '14 Mar 2022', expires: '13 Mar 2027', daysLeft: 281, scope: 'Non-scheduled',
        status: 'Valid',
        actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="d" className="btn sm" style={{ height: 26 }}><Icon name="download" size={11} /></button>],
      },
      {
        name: 'Safety Management System (SMS)', docNo: 'SMS-HA-2024-v3',
        issued: '1 Jan 2024', expires: 'Permanent', daysLeft: 999, scope: 'Operations',
        status: 'Valid',
        actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="d" className="btn sm" style={{ height: 26 }}><Icon name="download" size={11} /></button>],
      },
    ],
    insurance: [
      {
        name: 'Aviation Hull & Liability Insurance', docNo: 'HA-INS-2026',
        issued: '1 Apr 2026', expires: isAlert ? '30 May 2026' : '31 Mar 2027', daysLeft: isAlert ? -6 : 299, scope: 'Fleet-wide',
        status: isAlert ? 'Expired' : 'Valid',
        actions: isAlert
          ? [<button key="u" className="btn sm danger" style={{ height: 26 }}><Icon name="upload" size={11} />Renew now</button>]
          : [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="d" className="btn sm" style={{ height: 26 }}><Icon name="download" size={11} /></button>],
      },
      {
        name: 'Passenger Liability Insurance', docNo: 'HA-PAX-INS-2026',
        issued: '1 Apr 2026', expires: '31 Mar 2027', daysLeft: 299, scope: 'Per flight',
        status: 'Valid',
        actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="d" className="btn sm" style={{ height: 26 }}><Icon name="download" size={11} /></button>],
      },
    ],
    aircraft: [
      {
        name: 'C of A — VT-HXE (AW169)', docNo: 'CA-2024-VT-HXE-001',
        issued: '14 Mar 2024', expires: '12 Sep 2026', daysLeft: 99, scope: 'VT-HXE',
        status: isAlert ? 'Expiring soon' : 'Valid',
        actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="u" className={`btn sm${isAlert ? ' warn' : ''}`} style={{ height: 26 }}><Icon name="upload" size={11} />Renew</button>],
      },
      {
        name: 'C of A — VT-HXB (AS350)', docNo: 'CA-2024-VT-HXB-001',
        issued: '5 Mar 2024', expires: '5 Mar 2027', daysLeft: 273, scope: 'VT-HXB',
        status: 'Valid',
        actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="d" className="btn sm" style={{ height: 26 }}><Icon name="download" size={11} /></button>],
      },
      {
        name: 'C of A — VT-HXD (EC135 T2)', docNo: 'CA-2024-VT-HXD-001',
        issued: '4 Nov 2024', expires: '4 Nov 2026', daysLeft: 152, scope: 'VT-HXD',
        status: 'Valid',
        actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="d" className="btn sm" style={{ height: 26 }}><Icon name="download" size={11} /></button>],
      },
      {
        name: 'C of A — VT-HXA (EC135)', docNo: 'CA-2023-VT-HXA-001',
        issued: '22 Aug 2023', expires: '22 Aug 2026', daysLeft: 78, scope: 'VT-HXA',
        status: 'Valid',
        actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>, <button key="d" className="btn sm" style={{ height: 26 }}><Icon name="download" size={11} /></button>],
      },
    ],
    helipad: [
      {
        name: 'MUM Juhu Aerodrome approval', docNo: 'AAI-MUM-JUHU-2025',
        issued: '1 Jan 2025', expires: '31 Dec 2026', daysLeft: 209, scope: 'MUM Juhu',
        status: 'Valid',
        actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>],
      },
      {
        name: 'DEL Safdarjung clearance', docNo: 'AAI-DEL-SFJ-2025',
        issued: '1 Jan 2025', expires: '31 Dec 2026', daysLeft: 209, scope: 'DEL Safdarjung',
        status: 'Valid',
        actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>],
      },
      {
        name: 'GOA North Helipad clearance', docNo: 'AAI-GOA-NTH-2025',
        issued: '1 Mar 2025', expires: '28 Feb 2027', daysLeft: 268, scope: 'GOA North',
        status: 'Valid',
        actions: [<button key="v" className="btn sm" style={{ height: 26 }}><Icon name="eye" size={11} />View</button>],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// 15.1 — Documents list
// ─────────────────────────────────────────────────────────────
function DocumentsListScreen({ variant = 'normal' }) {
  const isAlert = variant === 'alert';
  const docs = buildDocs(isAlert);

  const totalDocs   = Object.values(docs).flat().length;
  const expiredDocs = Object.values(docs).flat().filter(d => d.daysLeft < 0).length;
  const warningDocs = Object.values(docs).flat().filter(d => d.daysLeft >= 0 && d.daysLeft < 60).length;

  return (
    <Shell
      active="documents"
      breadcrumb="Compliance"
      title="Documents"
      subtitle={`Helix Aviation · ${totalDocs} documents${isAlert ? ` · ${expiredDocs} expired · ${warningDocs} expiring soon` : ' · all current'}`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm"><Icon name="download" size={12} />Export all</button>
          <button className="btn sm accent"><Icon name="upload" size={12} />Upload document</button>
        </div>
      }
    >
      {/* alert banner */}
      {isAlert && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 42, background: 'var(--danger-soft)', borderBottom: '1px solid color-mix(in oklab,var(--danger) 24%,var(--rule))', flexShrink: 0 }}>
          <Icon name="alert" size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 500 }}>1 expired · 1 expiring within 100 days</span>
          <span style={{ width: 1, height: 14, background: 'color-mix(in oklab,var(--danger) 28%,var(--rule))' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Hull insurance expired 30 May. VT-HXE C of A expires 12 Sep 2026 (99 days). New bookings may be blocked.</span>
          <div style={{ flex: 1 }} />
          <button className="btn sm danger" style={{ height: 28 }}>Resolve now →</button>
        </div>
      )}

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', background: 'var(--surface)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <div className="input" style={{ width: 240, height: 32 }}>
          <Icon name="search" size={13} className="icon" />
          <input placeholder="Search documents…" />
        </div>
        <FilterChip label="Category" value="All" />
        <FilterChip label="Status" value="All" />
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>{totalDocs} documents</span>
      </div>

      {/* col header — sticky */}
      <div style={{ display: 'flex', padding: '8px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        {[['Document · Reference', 0],['Scope',120],['Expires',130],['Status',120],['',160,'right']].map(([l,w,a]) => (
          <div key={l} className="t-label" style={{ width: w||undefined, flex: !w?1:undefined, flexShrink: w?0:undefined, textAlign: a||'left' }}>{l}</div>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Operator */}
        <CatHeader label="Operator Certificates" count={docs.operator.length} allOk />
        {docs.operator.map((d, i) => <DocRow key={d.docNo} d={d} last={i === docs.operator.length-1} />)}

        {/* Insurance */}
        <CatHeader label="Insurance" count={docs.insurance.length} allOk={!isAlert} />
        {docs.insurance.map((d, i) => <DocRow key={d.docNo} d={d} last={i === docs.insurance.length-1} />)}

        {/* Aircraft */}
        <CatHeader label="Aircraft Airworthiness" count={docs.aircraft.length} allOk={!isAlert} />
        {docs.aircraft.map((d, i) => <DocRow key={d.docNo} d={d} last={i === docs.aircraft.length-1} />)}

        {/* Helipad */}
        <CatHeader label="Helipad & Airport Clearances" count={docs.helipad.length} allOk />
        {docs.helipad.map((d, i) => <DocRow key={d.docNo} d={d} last={i === docs.helipad.length-1} />)}
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 15.2 — Document detail + renewal upload
// ─────────────────────────────────────────────────────────────
function DocumentRenewalScreen() {
  const [step, setStep] = React.useState(1); // 1 = upload, 2 = review

  return (
    <Shell
      active="documents"
      breadcrumb="Documents / HA-INS-2026"
      title="Renew — Hull & Liability Insurance"
      subtitle="Helix Aviation · Current policy expired 30 May 2026 · Upload new certificate"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm ghost" style={{ height: 32, color: 'var(--ink-3)' }}>
            <Icon name="arrowRight" size={12} style={{ transform: 'rotate(180deg)' }} />Back
          </button>
          {step === 2 && (
            <button className="btn sm accent" style={{ height: 32 }}>
              <Icon name="check" size={12} />Submit for review
            </button>
          )}
        </div>
      }
    >
      {/* expired alert */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 40, background: 'var(--danger-soft)', borderBottom: '1px solid color-mix(in oklab,var(--danger) 24%,var(--rule))', flexShrink: 0 }}>
        <Icon name="alert" size={13} style={{ color: 'var(--danger)', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 500 }}>Insurance expired — new bookings blocked</span>
        <span style={{ width: 1, height: 14, background: 'color-mix(in oklab,var(--danger) 28%,var(--rule))' }} />
        <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Acme Mobility has temporarily paused your listing. Upload renewed insurance to restore immediately.</span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left: steps + details ──────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 20, borderRight: '1px solid var(--rule)' }}>

          {/* step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {[
              { n: 1, label: 'Upload document' },
              { n: 2, label: 'Review & verify' },
              { n: 3, label: 'Confirmation' },
            ].map((s, i, arr) => (
              <React.Fragment key={s.n}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: step >= s.n ? 'var(--accent)' : 'var(--surface-sunk)', border: `2px solid ${step >= s.n ? 'var(--accent)' : 'var(--rule-strong)'}`, flexShrink: 0 }}>
                    {step > s.n
                      ? <Icon name="check" size={12} style={{ color: '#fff' }} />
                      : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: step === s.n ? '#fff' : 'var(--ink-4)', fontWeight: 500 }}>{s.n}</span>
                    }
                  </div>
                  <span style={{ fontSize: 12.5, color: step === s.n ? 'var(--ink)' : 'var(--ink-4)', fontWeight: step === s.n ? 500 : 400 }}>{s.label}</span>
                </div>
                {i < arr.length-1 && <div style={{ flex: 1, height: 1.5, background: step > s.n ? 'var(--accent)' : 'var(--rule)', margin: '0 12px' }} />}
              </React.Fragment>
            ))}
          </div>

          {/* current policy */}
          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Expired policy</div>
            <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: 'color-mix(in oklab,var(--danger-soft) 50%,var(--surface))' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {[
                  ['Policy ref',   'HA-INS-2026'],
                  ['Insurer',      'New India Assurance Co.'],
                  ['Coverage',     'Hull + Liability — All aircraft'],
                  ['Sum insured',  '₹24,00,00,000'],
                  ['Issued',       '1 Apr 2026'],
                  ['Expired',      '30 May 2026 ⚠'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <div className="t-label" style={{ marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 12.5, color: k === 'Expired' ? 'var(--danger)' : 'var(--ink-2)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* upload zone */}
          {step === 1 && (
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Upload renewed certificate</div>
              <div
                onClick={() => setStep(2)}
                style={{
                  border: '2px dashed var(--accent)', borderRadius: 4, padding: '40px 24px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 12, cursor: 'pointer', background: 'color-mix(in oklab,var(--accent) 4%,var(--bg))',
                  textAlign: 'center',
                }}
              >
                <Icon name="upload" size={28} style={{ color: 'var(--accent)', opacity: 0.6 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Drop PDF or image here</div>
                  <div className="t-meta" style={{ fontSize: 12, marginTop: 4 }}>or click to browse files · PDF, JPG, PNG up to 20 MB</div>
                </div>
                <button className="btn sm accent" style={{ height: 34, padding: '0 20px' }}><Icon name="upload" size={12} />Choose file</button>
              </div>
              <div className="t-meta" style={{ fontSize: 11, marginTop: 8 }}>The document will be sent to Acme Mobility for verification. Processing time: 1–2 business hours. Your listing will be re-activated automatically upon approval.</div>
            </section>
          )}

          {/* review step — shown after "upload" */}
          {step === 2 && (
            <section>
              <div className="t-label" style={{ marginBottom: 10 }}>Review uploaded document</div>

              {/* mock uploaded file */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 3, marginBottom: 14 }}>
                <Icon name="shield" size={18} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>HA-INS-2026-renewed.pdf</div>
                  <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>2.4 MB · Uploaded just now</div>
                </div>
                <button className="btn sm danger" style={{ height: 26 }}><Icon name="close" size={11} />Remove</button>
              </div>

              {/* verification fields */}
              <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label className="field-label">New policy ref</label>
                    <div className="input" style={{ height: 34 }}><input defaultValue="HA-INS-2026-R" style={{ flex: 1 }} /></div>
                  </div>
                  <div className="field">
                    <label className="field-label">Insurer</label>
                    <div className="input" style={{ height: 34 }}><input defaultValue="New India Assurance Co." style={{ flex: 1 }} /></div>
                  </div>
                  <div className="field">
                    <label className="field-label">New issue date</label>
                    <div className="input" style={{ height: 34 }}><input defaultValue="5 Jun 2026" style={{ flex: 1 }} /></div>
                  </div>
                  <div className="field">
                    <label className="field-label">New expiry date</label>
                    <div className="input" style={{ height: 34 }}><input defaultValue="4 Jun 2027" style={{ flex: 1 }} /></div>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Coverage notes <span style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)', fontWeight: 400, fontStyle: 'italic', color: 'var(--ink-4)' }}>optional</span></label>
                  <div style={{ border: '1px solid var(--rule-strong)', background: 'var(--surface-sunk)', borderRadius: 2, padding: '8px 10px', minHeight: 44, fontSize: 12.5, color: 'var(--ink-4)', lineHeight: 1.5 }}>Hull + 3rd party liability · All 4 registered aircraft · ₹24 Cr sum insured</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn accent" style={{ flex: 1, height: 40, justifyContent: 'center', fontWeight: 500 }}>
                  <Icon name="upload" size={13} />Submit for review
                </button>
                <button className="btn" style={{ height: 40 }}>Back</button>
              </div>
            </section>
          )}
        </div>

        {/* ── Right: checklist + info ────────────────── */}
        <div style={{ width: 340, flexShrink: 0, background: 'var(--surface)', overflowY: 'auto', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Required document details</div>
            <div className="card" style={{ padding: '10px 14px' }}>
              {[
                [true,  'Valid insurance certificate (PDF or image)'],
                [true,  'Policy number visible on document'],
                [true,  'Insurer name and contact details'],
                [true,  'Coverage period (start and end dates)'],
                [true,  'Sum insured — hull and liability'],
                [false, 'List of insured aircraft (reg nos.)'],
                [false, 'DGCA-approved insurer confirmed'],
              ].map(([ok, item], i, arr) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 0', borderBottom: i < arr.length-1 ? '1px solid var(--rule-soft)' : 'none' }}>
                  <div style={{ width: 15, height: 15, borderRadius: 2, flexShrink: 0, marginTop: 1, background: ok ? 'var(--ok)' : 'var(--surface-sunk)', border: `1.5px solid ${ok ? 'var(--ok)' : 'var(--rule-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {ok && <Icon name="check" size={9} style={{ color: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.45 }}>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="t-label" style={{ marginBottom: 10 }}>Review timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Document uploaded',       sub: 'Now',               done: step >= 2 },
                { label: 'Acme Mobility review',    sub: '1–2 business hours', done: false, active: step === 2 },
                { label: 'Approval & reactivation', sub: 'Automatic',          done: false },
              ].map((s, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: i < arr.length-1 ? 14 : 0, position: 'relative' }}>
                  {i < arr.length-1 && (
                    <div style={{ position: 'absolute', left: 10, top: 22, bottom: 0, width: 1.5, background: s.done ? 'var(--ok)' : 'var(--rule)', zIndex: 0 }} />
                  )}
                  <div style={{ width: 21, height: 21, borderRadius: '50%', flexShrink: 0, zIndex: 1, background: s.done ? 'var(--ok)' : s.active ? 'var(--accent)' : 'var(--surface-sunk)', border: `2px solid ${s.done ? 'var(--ok)' : s.active ? 'var(--accent)' : 'var(--rule-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.done && <Icon name="check" size={10} style={{ color: '#fff' }} />}
                    {s.active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <div style={{ paddingTop: 1 }}>
                    <div style={{ fontSize: 13, color: s.done || s.active ? 'var(--ink)' : 'var(--ink-4)', fontWeight: s.active ? 500 : 400 }}>{s.label}</div>
                    <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div style={{ padding: '10px 12px', background: 'color-mix(in oklab,var(--info) 8%,var(--surface))', border: '1px solid color-mix(in oklab,var(--info) 20%,var(--rule))', borderRadius: 3 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--info)', marginBottom: 4 }}>Need help?</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>Contact your Acme Mobility account manager at <b>compliance@acmemobility.in</b> or call +91-22-6200-1234.</div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { DocumentsListScreen, DocumentRenewalScreen });
