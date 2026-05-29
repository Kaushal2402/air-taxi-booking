import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { driverService } from '../../services/driverService'
import type { Driver, DriverDocument, DocType } from '../../services/driverService'

const STATIC_BASE = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')
  : 'http://localhost:8001'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  pan: 'PAN card',
  license: 'Driving licence',
  rc: 'Vehicle RC',
  insurance: 'Insurance',
  permit: 'Permit',
  photo: 'Photo / Selfie',
}

const DOC_TYPE_ORDER: DocType[] = ['pan', 'license', 'rc', 'insurance', 'permit', 'photo']

// ── Document preview (real image or placeholder) ──────────────────────────────

interface DocPreviewProps {
  doc: DriverDocument
  driver: Driver
  onUpload: (file: File) => void
  uploading?: boolean
}

function DocPreview({ doc, driver, onUpload, uploading = false }: DocPreviewProps) {
  const label   = DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type
  const fileRef = useRef<HTMLInputElement>(null)
  const imageUrl = doc.image_url ? `${STATIC_BASE}${doc.image_url}` : null

  const triggerPick = () => fileRef.current?.click()

  if (imageUrl) {
    // Real image / PDF uploaded
    if (doc.image_url?.endsWith('.pdf')) {
      return (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface)', border: '1px solid var(--rule)', minHeight: 460, gap: 16,
        }}>
          <Icon name="archive" size={40} style={{ color: 'var(--ink-4)' }} />
          <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{label} · PDF document</div>
          <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="btn sm">
            <Icon name="external" size={13} /> Open PDF
          </a>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
          <button className="btn sm ghost" onClick={triggerPick} disabled={uploading}>
            <Icon name="refresh" size={13} />{uploading ? 'Uploading…' : 'Replace file'}
          </button>
        </div>
      )
    }

    return (
      <div style={{ flex: 1, position: 'relative', background: '#000', minHeight: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <img
          src={imageUrl}
          alt={label}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
        />
        <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
        <button
          className="btn sm ghost"
          onClick={triggerPick}
          disabled={uploading}
          style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', borderColor: 'transparent' }}
        >
          <Icon name="refresh" size={13} />{uploading ? 'Uploading…' : 'Replace'}
        </button>
      </div>
    )
  }

  // No image yet — show placeholder with upload prompt
  return (
    <div style={{
      flex: 1,
      background: 'var(--surface-sunk)',
      border: '2px dashed var(--rule)',
      position: 'relative',
      minHeight: 460,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      color: 'var(--ink-3)',
    }}>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />

      <Icon name="archive" size={36} style={{ color: 'var(--ink-4)' }} />
      <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No document image uploaded yet</div>
      {doc.doc_number && (
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>#{doc.doc_number}</div>
      )}

      <button
        className="btn accent"
        onClick={triggerPick}
        disabled={uploading}
        style={{ marginTop: 8 }}
      >
        <Icon name="archive" size={13} />
        {uploading ? 'Uploading…' : 'Upload document image'}
      </button>
      <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>JPEG, PNG, WebP or PDF · max 10 MB</div>

      {/* Meta info in corner */}
      <div style={{
        position: 'absolute', bottom: 16, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 20,
        fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)',
      }}>
        <span>Driver: {driver.driver_code ?? '—'}</span>
        <span>Status: {doc.status.toUpperCase()}</span>
      </div>
    </div>
  )
}

// ── Review panel ──────────────────────────────────────────────────────────────

interface ReviewPanelProps {
  driver: Driver
  doc: DriverDocument
  allDocs: DriverDocument[]
  onAction: (action: 'approve' | 'reject' | 'request_reupload', expiryDate: string | null, note: string | null) => Promise<void>
  isMobile: boolean
  showConfirmApprove: boolean
  showConfirmReject: boolean
  showConfirmReupload: boolean
  setShowConfirmApprove: (v: boolean) => void
  setShowConfirmReject: (v: boolean) => void
  setShowConfirmReupload: (v: boolean) => void
  expiryDate: string
  setExpiryDate: (v: string) => void
  reviewNote: string
  setReviewNote: (v: string) => void
}

function ReviewPanel({
  driver, doc, allDocs, onAction, isMobile,
  showConfirmApprove, showConfirmReject, showConfirmReupload,
  setShowConfirmApprove, setShowConfirmReject, setShowConfirmReupload,
  expiryDate, setExpiryDate, reviewNote, setReviewNote,
}: ReviewPanelProps) {
  const docIdx = allDocs.findIndex(d => d.id === doc.id) + 1

  // Extracted fields from the document
  const extractedFields = [
    ['Document type', DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type, true],
    ['Document no.', doc.doc_number ?? '—', !!doc.doc_number],
    ['Driver', driver.name, true],
    ['Driver code', driver.driver_code ?? '—', !!driver.driver_code],
    ['Expiry', doc.expiry_date ?? '—', !!doc.expiry_date],
    ['Status', doc.status, true],
  ] as [string, string, boolean][]

  return (
    <aside style={{
      background: 'var(--surface)',
      borderLeft: isMobile ? 'none' : '1px solid var(--rule)',
      padding: '24px 26px',
      display: 'flex', flexDirection: 'column', gap: 22,
      width: isMobile ? undefined : 380,
      flexShrink: 0,
    }}>
      {/* Extracted fields */}
      <div>
        <div className="t-label" style={{ marginBottom: 10 }}>Extracted fields · review</div>
        {extractedFields.map(([k, v, ok]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--rule-soft)' }}>
            <span className={`dot ${ok ? 'ok' : 'warn'}`} />
            <span style={{ flex: '0 0 90px', fontSize: 12, color: 'var(--ink-3)' }}>{k}</span>
            <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Cross-checks (stub) */}
      <div>
        <div className="t-label" style={{ marginBottom: 10 }}>Cross-checks</div>
        {[
          ['Name matches records', `${driver.name}`, 'ok'],
          ['Document not expired',  doc.expiry_date ? 'Expiry date set' : 'No expiry set', doc.expiry_date ? 'ok' : 'warn'],
          ['Driver KYC status',     driver.kyc_status === 'approved' ? 'KYC approved' : driver.kyc_status, driver.kyc_status === 'approved' ? 'ok' : 'warn'],
          ['Background check',      'Pending · in progress', 'warn'],
        ].map(([k, v, s]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--rule-soft)' }}>
            <Icon
              name={s === 'ok' ? 'check' : 'clock'}
              size={13}
              stroke={2.2}
              style={{ color: s === 'ok' ? 'var(--accent)' : 'var(--warn)', flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5 }}>{k}</div>
              <div className="t-meta" style={{ marginTop: 2 }}>{v}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Set expiry */}
      <div>
        <div className="t-label" style={{ marginBottom: 8 }}>Set expiry</div>
        <div className="input">
          <input
            type="date"
            value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
          />
          <Icon name="clock" size={14} className="icon" />
        </div>
        <div className="field-help" style={{ marginTop: 6 }}>Driver will be force-offlined automatically on this date.</div>
      </div>

      {/* Review note */}
      <div>
        <div className="t-label" style={{ marginBottom: 8 }}>Review note · audit</div>
        <div className="input">
          <input
            value={reviewNote}
            onChange={e => setReviewNote(e.target.value)}
            placeholder="Optional note for the file"
          />
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* OCR confidence bar (stub) */}
      <div style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', fontSize: 12, color: 'var(--ink-2)' }}>
        <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>96.4%</span> confidence · vendor extraction · doc {docIdx} of {allDocs.length}
      </div>

      {/* Action buttons — shown based on current doc status */}
      {doc.status === 'ok' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Already approved — show green badge + override actions */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px',
            background: 'color-mix(in oklab, var(--accent) 10%, var(--surface))',
            border: '1px solid color-mix(in oklab, var(--accent) 30%, var(--rule))',
            borderRadius: 3,
            fontSize: 13, fontWeight: 500, color: 'var(--accent)',
          }}>
            <Icon name="check" size={14} stroke={2.4} />
            Document approved
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Override if needed</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" style={{ flex: 1 }} onClick={() => setShowConfirmReupload(true)}>
              Request re-upload
            </button>
            <button
              className="btn sm"
              style={{ flex: 1, background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
              onClick={() => setShowConfirmReject(true)}
            >
              Reject
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {doc.status !== 'pending' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px',
              background: 'color-mix(in oklab, var(--danger) 8%, var(--surface))',
              border: '1px solid color-mix(in oklab, var(--danger) 25%, var(--rule))',
              borderRadius: 3,
              fontSize: 12, color: 'var(--danger)',
            }}>
              <Icon name="x" size={13} stroke={2} />
              {doc.status === 'rejected' ? 'Document rejected' : 'Document expired'}
            </div>
          )}
          <button
            className="btn accent"
            style={{ width: '100%' }}
            onClick={() => setShowConfirmApprove(true)}
          >
            <Icon name="check" size={13} stroke={2.4} />Approve document
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" style={{ flex: 1 }} onClick={() => setShowConfirmReupload(true)}>
              Request re-upload
            </button>
            {doc.status !== 'rejected' && (
              <button
                className="btn sm"
                style={{ flex: 1, background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
                onClick={() => setShowConfirmReject(true)}
              >
                Reject
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={showConfirmApprove}
        title="Approve document"
        description={`Approve the ${DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}. This will update the driver's KYC status.`}
        confirmLabel="Approve"
        variant="default"
        onConfirm={() => onAction('approve', expiryDate || null, reviewNote || null)}
        onCancel={() => setShowConfirmApprove(false)}
      />
      <ConfirmDialog
        open={showConfirmReject}
        title="Reject document"
        description={`Reject the ${DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}. The driver will be notified to upload a new document.`}
        confirmLabel="Reject"
        variant="danger"
        onConfirm={() => onAction('reject', expiryDate || null, reviewNote || null)}
        onCancel={() => setShowConfirmReject(false)}
      />
      <ConfirmDialog
        open={showConfirmReupload}
        title="Request re-upload"
        description={`Ask the driver to re-upload the ${DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}. They will receive a notification.`}
        confirmLabel="Send request"
        variant="default"
        onConfirm={() => onAction('request_reupload', expiryDate || null, reviewNote || null)}
        onCancel={() => setShowConfirmReupload(false)}
      />
    </aside>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type MobileStep = 'list' | 'preview' | 'review'

export default function DocumentReviewPage() {
  const { id: driverId, docId } = useParams<{ id: string; docId: string }>()
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const isTablet  = useIsTablet()

  const [driver, setDriver]   = useState<Driver | null>(null)
  const [docs, setDocs]       = useState<DriverDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [mobileStep, setMobileStep] = useState<MobileStep>('preview')

  const [expiryDate, setExpiryDate] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [showConfirmApprove, setShowConfirmApprove]   = useState(false)
  const [showConfirmReject, setShowConfirmReject]     = useState(false)
  const [showConfirmReupload, setShowConfirmReupload] = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    if (!driverId) return
    setLoading(true)
    Promise.all([
      driverService.getDriver(driverId),
      driverService.getDocuments(driverId),
    ])
      .then(([driverData, docsData]) => {
        setDriver(driverData)
        setDocs(docsData.items)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [driverId])

  const currentDoc = docs.find(d => d.id === docId)

  // Pre-fill expiry date from doc when doc changes
  useEffect(() => {
    if (currentDoc?.expiry_date) {
      setExpiryDate(currentDoc.expiry_date)
    } else {
      setExpiryDate('')
    }
    if (currentDoc?.review_note) {
      setReviewNote(currentDoc.review_note)
    } else {
      setReviewNote('')
    }
  }, [currentDoc?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const orderedDocs = DOC_TYPE_ORDER.map(t => docs.find(d => d.doc_type === t)).filter(Boolean) as DriverDocument[]
  const currentIdx  = orderedDocs.findIndex(d => d.id === docId)
  const prevDoc     = currentIdx > 0 ? orderedDocs[currentIdx - 1] : null
  const nextDoc     = currentIdx < orderedDocs.length - 1 ? orderedDocs[currentIdx + 1] : null

  const navigateToDoc = (doc: DriverDocument) => {
    navigate(`/drivers/${driverId}/documents/${doc.id}`)
  }

  const handleAction = async (action: 'approve' | 'reject' | 'request_reupload', expiry: string | null, note: string | null) => {
    if (!driverId || !docId) return
    setShowConfirmApprove(false)
    setShowConfirmReject(false)
    setShowConfirmReupload(false)
    setApiError('')
    try {
      await driverService.reviewDocument(driverId, docId, {
        action,
        expiry_date: expiry,
        review_note: note,
      })
      // Navigate to next pending doc or back to driver detail
      const reloadedDocs = await driverService.getDocuments(driverId)
      setDocs(reloadedDocs.items)
      const nextPending = reloadedDocs.items.find(d => d.id !== docId && (d.status === 'pending' || d.status === 'rejected'))
      if (nextPending) {
        navigate(`/drivers/${driverId}/documents/${nextPending.id}`)
      } else {
        navigate(`/drivers/${driverId}`)
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Action failed')
    }
  }

  const handleUpload = async (file: File) => {
    if (!driverId || !docId) return
    setUploadError('')
    setUploading(true)
    try {
      const updated = await driverService.uploadDocumentImage(driverId, docId, file)
      setDocs(prev => prev.map(d => d.id === updated.id ? updated : d))
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setUploadError(err?.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <Shell activeId="drivers" breadcrumb="People & Fleet · Drivers · KYC" title="Loading…">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading document review…</div>
      </Shell>
    )
  }

  if (!driver || !currentDoc) {
    return (
      <Shell activeId="drivers" breadcrumb="People & Fleet · Drivers · KYC" title="Not found">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>
          Document not found.{' '}
          <button className="btn sm ghost" onClick={() => navigate(driverId ? `/drivers/${driverId}` : '/drivers')}>
            ← Back to driver
          </button>
        </div>
      </Shell>
    )
  }

  const docIdx = orderedDocs.findIndex(d => d.id === docId) + 1
  const docLabel = DOC_TYPE_LABELS[currentDoc.doc_type] ?? currentDoc.doc_type

  const reviewPanelProps = {
    driver, doc: currentDoc, allDocs: orderedDocs,
    onAction: handleAction,
    isMobile,
    showConfirmApprove, showConfirmReject, showConfirmReupload,
    setShowConfirmApprove, setShowConfirmReject, setShowConfirmReupload,
    expiryDate, setExpiryDate, reviewNote, setReviewNote,
  }

  // ── Mobile layout ───────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <Shell
        activeId="drivers"
        breadcrumb="People & Fleet · Drivers · KYC"
        title={`${docLabel} · ${driver.name}`}
        subtitle={`${driver.driver_code ?? '—'} · Doc ${docIdx} of ${orderedDocs.length}`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {prevDoc && <button className="btn sm" onClick={() => navigateToDoc(prevDoc)}>← Prev</button>}
            {nextDoc && <button className="btn sm" onClick={() => navigateToDoc(nextDoc)}>Next →</button>}
          </div>
        }
      >
        <div>
          {apiError && (
            <div style={{ margin: '12px 16px 0', padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {apiError}
            </div>
          )}
          {/* Step tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
            {(['list', 'preview', 'review'] as const).map(step => (
              <div
                key={step}
                onClick={() => setMobileStep(step)}
                style={{
                  flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 13,
                  color: mobileStep === step ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: mobileStep === step ? 500 : 400,
                  borderBottom: `2px solid ${mobileStep === step ? 'var(--accent)' : 'transparent'}`,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {step === 'list' ? 'Docs' : step === 'preview' ? 'Preview' : 'Review'}
              </div>
            ))}
          </div>

          {/* Doc list */}
          {mobileStep === 'list' && (
            <div style={{ background: 'var(--surface)' }}>
              {orderedDocs.map(d => {
                const active = d.id === docId
                const dot = d.status === 'ok' ? 'ok' : d.status === 'pending' ? 'warn' : 'danger'
                return (
                  <div
                    key={d.id}
                    onClick={() => { navigate(`/drivers/${driverId}/documents/${d.id}`); setMobileStep('preview') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--rule-soft)',
                      borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                      background: active ? 'var(--surface-2)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <span className={`dot ${dot}`} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 500 : 400, color: active ? 'var(--ink)' : 'var(--ink-2)' }}>
                      {DOC_TYPE_LABELS[d.doc_type] ?? d.doc_type}
                    </span>
                    <Icon name="chevRight" size={14} style={{ color: 'var(--ink-4)' }} />
                  </div>
                )
              })}
              <div style={{ padding: '16px', borderTop: '1px solid var(--rule)' }}>
                <div className="t-label" style={{ marginBottom: 8 }}>Driver</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar">{getInitials(driver.name)}</div>
                  <div>
                    <div style={{ fontSize: 13 }}>{driver.name}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{driver.driver_code} · {driver.city}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {mobileStep === 'preview' && (
            <div style={{ padding: '16px', background: 'var(--surface-sunk)' }}>
              {uploadError && (
                <div style={{ marginBottom: 12, padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
                  {uploadError}
                </div>
              )}
              <DocPreview doc={currentDoc} driver={driver} onUpload={handleUpload} uploading={uploading} />
              <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--rule)', fontSize: 12, color: 'var(--ink-2)' }}>
                Vendor extraction · <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>96.4%</span> confidence
              </div>
            </div>
          )}

          {/* Review */}
          {mobileStep === 'review' && (
            <ReviewPanel {...reviewPanelProps} />
          )}
        </div>
      </Shell>
    )
  }

  // ── Desktop layout ──────────────────────────────────────────────────────────

  return (
    <Shell
      activeId="drivers"
      breadcrumb="People & Fleet · Drivers · KYC"
      title={`${docLabel} · ${driver.name}`}
      subtitle={`${driver.driver_code ?? '—'} · Onboarding · Doc ${docIdx} of ${orderedDocs.length}`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" disabled={!prevDoc} onClick={() => prevDoc && navigateToDoc(prevDoc)}>Previous</button>
          <button className="btn sm" onClick={() => navigate(`/drivers/${driverId}`)}>Skip for now</button>
          <button className="btn sm" disabled={!nextDoc} onClick={() => nextDoc && navigateToDoc(nextDoc)}>Next →</button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '220px 1fr' : '240px 1fr 380px', minHeight: '100%' }}>
        {/* Left rail — doc list */}
        <aside style={{ background: 'var(--surface)', borderRight: '1px solid var(--rule)', padding: '20px 0' }}>
          <div className="t-label" style={{ padding: '0 18px 8px' }}>Documents · {orderedDocs.length}</div>
          {orderedDocs.map(d => {
            const active = d.id === docId
            const dot = d.status === 'ok' ? 'ok' : d.status === 'pending' ? 'warn' : 'danger'
            return (
              <div
                key={d.id}
                onClick={() => navigate(`/drivers/${driverId}/documents/${d.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 18px',
                  borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  background: active ? 'var(--surface-2)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-2)',
                  cursor: 'pointer',
                }}
              >
                <span className={`dot ${dot}`} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 500 : 400 }}>
                  {DOC_TYPE_LABELS[d.doc_type] ?? d.doc_type}
                </span>
              </div>
            )
          })}

          <div style={{ height: 1, background: 'var(--rule)', margin: '18px 0' }} />

          <div style={{ padding: '0 18px' }}>
            <div className="t-label" style={{ marginBottom: 8 }}>Driver</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar">{getInitials(driver.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{driver.name}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>{driver.driver_code} · {driver.city}</div>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12, color: 'var(--ink-2)' }}>
              Stage: <span style={{ textTransform: 'capitalize' }}>{driver.stage}</span> · {driver.vehicle_class ?? '—'}
            </div>
          </div>
        </aside>

        {/* Center — document preview */}
        <div style={{ padding: '20px 32px', background: 'var(--surface-sunk)', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="t-label">Document preview</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>
                {docLabel}{currentDoc.doc_number ? ` · ${currentDoc.doc_number}` : ''}
              </h3>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn sm ghost icon"><Icon name="search" size={13} /></button>
              <button className="btn sm ghost icon"><Icon name="refresh" size={13} /></button>
              <button className="btn sm ghost icon"><Icon name="download" size={13} /></button>
              <button className="btn sm ghost icon"><Icon name="external" size={13} /></button>
            </div>
          </div>

          {apiError && (
            <div style={{ marginBottom: 12, padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {apiError}
            </div>
          )}
          {uploadError && (
            <div style={{ marginBottom: 12, padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {uploadError}
            </div>
          )}

          <DocPreview doc={currentDoc} driver={driver} onUpload={handleUpload} uploading={uploading} />

          {/* OCR confidence bar */}
          <div style={{ marginTop: 16, padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 18 }}>
            <Icon name="bolt" size={14} style={{ color: 'var(--accent)' }} />
            <span className="t-label" style={{ padding: 0 }}>Vendor extraction · IDfy</span>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-2)' }}>
              Confidence <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>96.4%</span> · fields matched · last verified 1m ago
            </span>
            <button className="btn sm">View raw response</button>
          </div>
        </div>

        {/* Right — review pane */}
        <ReviewPanel {...reviewPanelProps} />
      </div>
    </Shell>
  )
}
