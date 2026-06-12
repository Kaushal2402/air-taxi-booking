import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmtDate } from '../../lib/format'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import { operatorProfileService } from '../../services/operatorProfileService'
import type { OperatorProfile, OperatorDocument } from '../../services/operatorProfileService'

const ONBOARDING_STEPS = ['Company Details', 'Certifications', 'Payout Details', 'Review & Submit']

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--ink-3)',
  submitted: 'var(--info)',
  in_review: 'var(--warn)',
  approved: 'var(--ok)',
  rejected: 'var(--danger)',
  re_review: 'var(--warn)',
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
  const color = STATUS_COLORS[status] ?? 'var(--ink-3)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em',
      textTransform: 'uppercase', padding: '3px 10px', borderRadius: 4,
      background: `color-mix(in oklab, ${color} 12%, var(--surface))`,
      color, border: `1px solid color-mix(in oklab, ${color} 25%, var(--rule))`,
    }}>
      {label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--rule)',
      borderRadius: 8,
      padding: '24px',
      marginBottom: 20,
    }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 18 }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}

export default function CompanyProfilePage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<OperatorProfile | null>(null)
  const [docs, setDocs] = useState<OperatorDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Wizard state (for onboarding)
  const [step, setStep] = useState(0)
  const isOnboarding = !profile || (profile.onboarding_status === 'draft' || profile.onboarding_status === 'rejected')

  // Form state
  const [legalName, setLegalName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [regNo, setRegNo] = useState('')
  const [certType, setCertType] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [hqCity, setHqCity] = useState('')
  const [payoutRef, setPayoutRef] = useState('')

  // Doc upload form
  const [certDocType, setCertDocType] = useState('nsop_cert')
  const [certFileUrl, setCertFileUrl] = useState('')
  const [certExpiry, setCertExpiry] = useState('')
  const [insuranceFileUrl, setInsuranceFileUrl] = useState('')
  const [insuranceExpiry, setInsuranceExpiry] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [p, d] = await Promise.all([
        operatorProfileService.getProfile(),
        operatorProfileService.listDocuments(),
      ])
      setProfile(p)
      setDocs(d)
      setLegalName(p.name || '')
      setTradeName(p.trade_name || '')
      setRegNo(p.company_registration_no || '')
      setCertType(p.cert_type || '')
      setContactEmail(p.contact_email || '')
      setContactPhone(p.contact_phone || '')
      setHqCity(p.hq_city || '')
      setPayoutRef(p.payout_account_ref || '')
    } catch {
      setError('Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleProfileSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await operatorProfileService.updateProfile({
        trade_name: tradeName || undefined,
        contact_email: contactEmail || undefined,
        contact_phone: contactPhone || undefined,
        hq_city: hqCity || undefined,
      })
      setSaveSuccess(true)
      await load()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSaveError(detail ?? 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitOnboarding = async () => {
    if (!legalName || !regNo || !contactEmail || !contactPhone) {
      setSaveError('Please fill in all required fields.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await operatorProfileService.submitOnboarding({
        name: legalName,
        company_registration_no: regNo,
        trade_name: tradeName || undefined,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        hq_city: hqCity || undefined,
        cert_type: certType || undefined,
      })
      await load()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSaveError(detail ?? 'Failed to submit onboarding.')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadCert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!certFileUrl) return
    setSaving(true)
    try {
      await operatorProfileService.uploadCertification({
        doc_type: certDocType,
        file_url: certFileUrl,
        expires_at: certExpiry || undefined,
      })
      setCertFileUrl('')
      setCertExpiry('')
      await load()
    } catch {
      setSaveError('Failed to upload certification.')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadInsurance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!insuranceFileUrl) return
    setSaving(true)
    try {
      await operatorProfileService.uploadInsurance({
        file_url: insuranceFileUrl,
        expires_at: insuranceExpiry || undefined,
      })
      setInsuranceFileUrl('')
      setInsuranceExpiry('')
      await load()
    } catch {
      setSaveError('Failed to upload insurance.')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePayoutDetails = async () => {
    if (!payoutRef) return
    setSaving(true)
    try {
      await operatorProfileService.updatePayoutDetails(payoutRef)
      await load()
      setSaveSuccess(true)
    } catch {
      setSaveError('Failed to save payout details.')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = fmtDate

  const onboardingStatusValue = profile?.onboarding_status || 'draft'
  const isApproved = onboardingStatusValue === 'approved'
  const isSubmitted = ['submitted', 'in_review'].includes(onboardingStatusValue)

  if (loading) {
    return (
      <Shell activeId="onboarding" breadcrumb="Company Profile" title="Company Profile" subtitle="Loading…">
        <div style={{ padding: 32 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading profile…</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      activeId="onboarding"
      breadcrumb="Company Profile"
      title="Company Profile"
      subtitle={isApproved ? 'Your profile is approved' : 'Complete your profile to start operations'}
      actions={isApproved ? (
        <button className="btn accent sm" onClick={handleProfileSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      ) : undefined}
    >
      <div style={{ padding: isMobile ? '20px 16px' : '32px 32px', maxWidth: 760 }}>

        {error && (
          <div style={{
            background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
            borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 20,
          }}>{error}</div>
        )}

        {/* Onboarding status banner */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
          background: 'var(--surface)', border: '1px solid var(--rule)',
          borderRadius: 8, padding: '16px 20px', marginBottom: 24,
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Onboarding Status</div>
            <StatusBadge status={onboardingStatusValue} />
          </div>
          {profile?.rejection_reason && (
            <div style={{ fontSize: 13, color: 'var(--danger)', maxWidth: 400 }}>
              <strong>Rejection reason:</strong> {profile.rejection_reason}
            </div>
          )}
        </div>

        {/* Wizard steps (only when onboarding) */}
        {!isApproved && !isSubmitted && (
          <div style={{
            display: 'flex', gap: 0, marginBottom: 28,
            background: 'var(--surface)', border: '1px solid var(--rule)',
            borderRadius: 8, overflow: 'hidden',
          }}>
            {ONBOARDING_STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i)}
                style={{
                  flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
                  background: step === i ? 'var(--accent-soft)' : 'transparent',
                  borderRight: i < ONBOARDING_STEPS.length - 1 ? '1px solid var(--rule)' : 'none',
                  color: step === i ? 'var(--accent)' : i < step ? 'var(--ok)' : 'var(--ink-3)',
                  fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: step === i ? 600 : 400,
                  textAlign: 'center',
                }}
              >
                <span style={{ display: 'block', fontSize: 10, marginBottom: 2, opacity: 0.6 }}>Step {i + 1}</span>
                {s}
              </button>
            ))}
          </div>
        )}

        {saveError && (
          <div style={{
            background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))',
            borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16,
          }}>{saveError}</div>
        )}

        {saveSuccess && (
          <div style={{
            background: 'var(--ok-soft)', border: '1px solid color-mix(in oklab, var(--ok) 30%, var(--rule))',
            borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--ok)', marginBottom: 16,
          }}>Changes saved successfully.</div>
        )}

        {/* Step 0 or approved: Company Details */}
        {(step === 0 || isApproved || isSubmitted) && (
          <Section title="Company Details">
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              <Field label="Legal Name *">
                <input
                  className="input"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  disabled={isApproved || isSubmitted}
                  placeholder="Company Legal Name"
                />
              </Field>
              <Field label="Trade Name / DBA">
                <input
                  className="input"
                  value={tradeName}
                  onChange={e => setTradeName(e.target.value)}
                  placeholder="Trading as…"
                />
              </Field>
              <Field label="Company Registration No. *">
                <input
                  className="input"
                  value={regNo}
                  onChange={e => setRegNo(e.target.value)}
                  disabled={isApproved || isSubmitted}
                  placeholder="e.g. CIN / MCA / NSOP No."
                />
              </Field>
              <Field label="Certificate Type">
                <input
                  className="input"
                  value={certType}
                  onChange={e => setCertType(e.target.value)}
                  placeholder="e.g. NSOP, AOC"
                />
              </Field>
              <Field label="Contact Email *">
                <input
                  type="email"
                  className="input"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="ops@company.com"
                />
              </Field>
              <Field label="Contact Phone *">
                <input
                  type="tel"
                  className="input"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </Field>
              <Field label="HQ City">
                <input
                  className="input"
                  value={hqCity}
                  onChange={e => setHqCity(e.target.value)}
                  placeholder="Mumbai"
                />
              </Field>
            </div>
            {!isApproved && !isSubmitted && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn accent sm" onClick={() => setStep(1)}>
                  Next: Certifications →
                </button>
              </div>
            )}
          </Section>
        )}

        {/* Step 1: Certifications */}
        {(step === 1 || isApproved || isSubmitted) && (
          <Section title="Certifications & Insurance">
            {/* Existing docs */}
            {docs.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="t-label" style={{ marginBottom: 10 }}>Uploaded Documents</div>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ width: '100%', minWidth: 500 }}>
                    <thead>
                      <tr>
                        <th className="t-label">Type</th>
                        <th className="t-label">Status</th>
                        <th className="t-label">Expiry</th>
                        <th className="t-label">File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map(d => (
                        <tr key={d.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{d.doc_type}</td>
                          <td>
                            <span className={`badge ${d.status === 'approved' ? 'ok' : d.status === 'rejected' ? 'danger' : 'info'}`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="t-meta">{formatDate(d.expires_at)}</td>
                          <td>
                            <a href={d.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>
                              View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Upload certification */}
            <form onSubmit={handleUploadCert} style={{ marginBottom: 20 }}>
              <div className="t-label" style={{ marginBottom: 10 }}>Upload Certification</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, alignItems: 'end' }}>
                <Field label="Document Type">
                  <select className="input" value={certDocType} onChange={e => setCertDocType(e.target.value)}>
                    <option value="nsop_cert">NSOP Certificate</option>
                    <option value="company_registration">Company Registration</option>
                    <option value="aoc">AOC</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="File URL *">
                  <input
                    required
                    className="input"
                    value={certFileUrl}
                    onChange={e => setCertFileUrl(e.target.value)}
                    placeholder="https://storage.example.com/cert.pdf"
                  />
                </Field>
                <Field label="Expiry Date">
                  <input
                    type="date"
                    className="input"
                    value={certExpiry}
                    onChange={e => setCertExpiry(e.target.value)}
                  />
                </Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <button type="submit" className="btn sm accent" disabled={saving}>
                  {saving ? 'Uploading…' : 'Upload Certification'}
                </button>
              </div>
            </form>

            {/* Upload insurance */}
            <form onSubmit={handleUploadInsurance}>
              <div className="t-label" style={{ marginBottom: 10 }}>Upload Insurance</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, alignItems: 'end' }}>
                <Field label="Insurance Document URL *">
                  <input
                    required
                    className="input"
                    value={insuranceFileUrl}
                    onChange={e => setInsuranceFileUrl(e.target.value)}
                    placeholder="https://storage.example.com/insurance.pdf"
                  />
                </Field>
                <Field label="Expiry Date">
                  <input
                    type="date"
                    className="input"
                    value={insuranceExpiry}
                    onChange={e => setInsuranceExpiry(e.target.value)}
                  />
                </Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <button type="submit" className="btn sm accent" disabled={saving}>
                  {saving ? 'Uploading…' : 'Upload Insurance'}
                </button>
              </div>
            </form>

            {!isApproved && !isSubmitted && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button className="btn sm ghost" onClick={() => setStep(0)}>← Back</button>
                <button className="btn accent sm" onClick={() => setStep(2)}>Next: Payout →</button>
              </div>
            )}
          </Section>
        )}

        {/* Step 2: Payout Details */}
        {(step === 2 || isApproved || isSubmitted) && (
          <Section title="Payout / Bank Details">
            <Field label="Bank Account Reference">
              <input
                className="input"
                value={payoutRef}
                onChange={e => setPayoutRef(e.target.value)}
                placeholder="Account number or payout reference"
              />
            </Field>
            {!isApproved && !isSubmitted ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <button className="btn sm ghost" onClick={() => setStep(1)}>← Back</button>
                <button className="btn accent sm" onClick={() => { void handleSavePayoutDetails(); setStep(3) }}>
                  Next: Review →
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <button className="btn sm accent" onClick={handleSavePayoutDetails} disabled={saving}>
                  {saving ? 'Saving…' : 'Update Payout Details'}
                </button>
              </div>
            )}
          </Section>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && !isApproved && !isSubmitted && (
          <Section title="Review & Submit">
            <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
              {[
                { label: 'Legal Name', value: legalName },
                { label: 'Registration No.', value: regNo },
                { label: 'Contact Email', value: contactEmail },
                { label: 'Contact Phone', value: contactPhone },
                { label: 'Cert Type', value: certType },
                { label: 'Documents', value: `${docs.length} uploaded` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  <span style={{ color: 'var(--ink-3)', minWidth: 140 }}>{label}</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{value || '—'}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn sm ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn accent sm" onClick={handleSubmitOnboarding} disabled={saving}>
                {saving ? 'Submitting…' : 'Submit for Review'}
              </button>
            </div>
          </Section>
        )}

        {/* Submitted state info */}
        {isSubmitted && (
          <div style={{
            background: 'var(--info-soft, color-mix(in oklab, var(--info) 10%, var(--surface)))',
            border: '1px solid color-mix(in oklab, var(--info) 25%, var(--rule))',
            borderRadius: 8, padding: '20px 24px', marginTop: 8,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--info)' }}>
              Submission Under Review
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
              Your onboarding has been submitted and is being reviewed by the platform admin.
              You will be notified once a decision is made. You cannot accept bookings until approved.
            </div>
          </div>
        )}

      </div>
    </Shell>
  )
}
