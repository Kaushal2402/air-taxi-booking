import { useState, useEffect } from 'react'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { kycService } from '../../services/kycService'
import type { KycQueueItem } from '../../services/kycService'
import { formatDate } from '../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAge(ageSeconds: number | null): string {
  if (ageSeconds == null) return '—'
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m ago`
  if (ageSeconds < 86400) {
    const h = Math.floor(ageSeconds / 3600)
    const m = Math.floor((ageSeconds % 3600) / 60)
    return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`
  }
  return `${Math.floor(ageSeconds / 86400)}d ago`
}

function statusBadge(s: string) {
  if (s === 'in_review' || s === 'pending')
    return <span className="badge warn"><span className="dot warn" />In review</span>
  if (s === 'approved' || s === 'ok')
    return <span className="badge ok"><span className="dot ok" />Approved</span>
  if (s === 'rejected')
    return <span className="badge danger"><span className="dot danger" />Rejected</span>
  if (s === 'expired')
    return <span className="badge danger"><span className="dot danger" />Expired</span>
  return <span className="badge info"><span className="dot info" />Uploaded</span>
}

// ── Striped placeholder ───────────────────────────────────────────────────────

function DocPlaceholder({ label, h = 280 }: { label: string; h?: number }) {
  return (
    <div style={{
      height: h,
      borderRadius: 4,
      border: '1px solid var(--rule)',
      background: 'repeating-linear-gradient(135deg, var(--surface-sunk) 0, var(--surface-sunk) 11px, var(--surface-2) 11px, var(--surface-2) 22px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--surface)', padding: '6px 12px', border: '1px solid var(--rule)', borderRadius: 3 }}>
        {label}
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KycDocumentDetailPage() {
  const { entityType = 'driver', docId } = useParams<{ entityType: string; docId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()

  // Try location state first
  const stateItem = (location.state as { item?: KycQueueItem } | null)?.item ?? null

  const [item, setItem] = useState<KycQueueItem | null>(stateItem)
  const [loading, setLoading] = useState(!stateItem)
  const [notFound, setNotFound] = useState(false)

  const [expiryDate, setExpiryDate] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isForbidden, setIsForbidden] = useState(false)

  useEffect(() => {
    if (stateItem) {
      setExpiryDate(stateItem.expiry_date ?? '')
      return
    }
    // Fallback: load from queue
    setLoading(true)
    kycService.getQueue({ page_size: 100 })
      .then(res => {
        const found = res.items.find(i => i.id === docId)
        if (found) {
          setItem(found)
          setExpiryDate(found.expiry_date ?? '')
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [docId]) // eslint-disable-line react-hooks/exhaustive-deps

  const reviewDoc = async (action: 'approve' | 'reject' | 'request_reupload') => {
    if (!item) return
    if (action === 'approve' && !expiryDate.trim()) { setApiError('Expiry date is required to approve'); return }
    if (action === 'reject' && !rejectReason.trim()) { setApiError('Reject reason is required'); return }

    setSaving(true)
    setApiError('')
    try {
      const body = action === 'approve'
        ? { action: 'approve' as const, expiry_date: expiryDate || null }
        : action === 'reject'
          ? { action: 'reject' as const, reason: rejectReason || null }
          : { action: 'request_reupload' as const }

      if (entityType === 'driver') {
        await kycService.reviewDriverDoc(item.id, body)
      } else if (entityType === 'vehicle') {
        await kycService.reviewVehicleDoc(item.id, body)
      } else {
        await kycService.reviewOperatorDoc(item.id, body)
      }
      navigate('/kyc')
    } catch {
      setApiError('Action failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (isForbidden) return <AccessDeniedPage message={`You don't have permission to access this page.`} />

  if (loading) {
    return (
      <Shell
        activeId="kyc"
        breadcrumb="Compliance · KYC & Documents · Detail"
        title="Loading…"
        subtitle=""
      >
        <div style={{ padding: 32, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      </Shell>
    )
  }

  if (notFound || !item) {
    return (
      <Shell
        activeId="kyc"
        breadcrumb="Compliance · KYC & Documents · Detail"
        title="Document not found"
        subtitle=""
      >
        <div style={{ padding: 32, color: 'var(--ink-3)', fontSize: 13 }}>
          Document not found.{' '}
          <button className="btn sm" onClick={() => navigate('/kyc')}>Back to queue</button>
        </div>
      </Shell>
    )
  }

  const backendBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace('/api/v1', '') || 'http://localhost:8001'
  const fileUrl = item.file_url
    ? (item.file_url.startsWith('http') ? item.file_url : `${backendBase}${item.file_url}`)
    : null

  const extractedFields: [string, React.ReactNode][] = [
    ['Holder', item.entity_name],
    ['Document type', item.doc_type],
    ['Status', statusBadge(item.status)],
    ['Submitted', formatDate(item.created_at)],
    ['Expiry', item.expiry_date ? formatDate(item.expiry_date) : '—'],
    ['Review notes', item.review_notes || '—'],
  ]

  const contentPadding = isMobile ? '14px 16px 24px' : '24px 32px 28px'

  return (
    <Shell
      activeId="kyc"
      breadcrumb="Compliance · KYC & Documents · Detail"
      title={`${item.doc_type} · ${item.entity_name}`}
      subtitle={`${item.entity_type} · ${item.status} · ${formatAge(item.age_seconds)}`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/kyc')}>
            <Icon name="chevLeft" size={13} />Back to queue
          </button>
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="btn sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Icon name="download" size={13} />Download
            </a>
          )}
        </div>
      }
    >
      <div style={{
        padding: contentPadding,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr',
        gap: 24,
        alignItems: 'start',
      }}>

        {/* Left panel — Document preview */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="t-label">Scanned document</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge ok">
                <Icon name="shield" size={11} />Scanned clean
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn icon sm ghost" title="Rotate">
                  <Icon name="refresh" size={13} />
                </button>
                <button className="btn icon sm ghost" title="Zoom">
                  <Icon name="search" size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Main preview */}
          {fileUrl ? (
            <img
              src={fileUrl}
              alt={`${item.doc_type} for ${item.entity_name}`}
              style={{ width: '100%', height: 280, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--rule)' }}
            />
          ) : (
            <DocPlaceholder label={`${item.doc_type} · ${item.entity_name}`} h={280} />
          )}

          {/* Thumbnails */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div style={{ flex: 1 }}><DocPlaceholder label="Front" h={64} /></div>
            <div style={{ flex: 1 }}><DocPlaceholder label="Back" h={64} /></div>
            <div style={{ flex: 1, opacity: 0.5 }}><DocPlaceholder label="Other" h={64} /></div>
          </div>
        </div>

        {/* Right panel — Fields + Decision */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Extracted fields card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label">Extracted fields</div>
            </div>
            <div style={{ padding: '6px 20px 14px' }}>
              {extractedFields.map(([k, v], i) => (
                <div key={k} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1.4fr',
                  gap: 12, alignItems: 'center',
                  padding: '11px 0',
                  borderBottom: i < extractedFields.length - 1 ? '1px solid var(--rule-soft, var(--rule))' : 'none',
                }}>
                  <span className="t-meta">{k}</span>
                  <span style={{ fontSize: 13 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review decision card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
            <div className="t-label" style={{ marginBottom: 14 }}>Review decision</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <div className="field-label" style={{ marginBottom: 6 }}>Set expiry · required to approve</div>
                <div className="input" style={{ height: 38 }}>
                  <Icon name="clock" size={14} className="icon" />
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <div className="field-label" style={{ marginBottom: 6 }}>Reject reason · if rejecting</div>
                <div className="input" style={{ height: 38 }}>
                  <input
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Enter reason…"
                  />
                </div>
              </div>
            </div>

            {/* Warning box if review_notes present */}
            {item.review_notes && (
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--rule)',
                borderRadius: 3, padding: '12px 14px', marginBottom: 14,
                display: 'flex', gap: 10,
              }}>
                <Icon name="alert" size={15} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  {item.review_notes}
                </span>
              </div>
            )}

            {apiError && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
              }}>{apiError}</div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={() => reviewDoc('request_reupload')}
                disabled={saving}
              >
                Request reupload
              </button>
              <button
                className="btn danger"
                style={{ flex: 1, background: saving ? undefined : undefined }}
                onClick={() => reviewDoc('reject')}
                disabled={saving}
              >
                Reject
              </button>
              <button
                className="btn accent"
                style={{ flex: 1.4 }}
                onClick={() => reviewDoc('approve')}
                disabled={saving}
              >
                <Icon name="check" size={14} />
                {saving ? 'Processing…' : 'Approve & set expiry'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
