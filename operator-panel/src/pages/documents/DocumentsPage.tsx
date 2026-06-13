import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Plane,
  RefreshCw,
  Shield,
  Upload,
  User,
  XCircle,
} from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type {
  ComplianceOverview,
  DocumentItem,
  ExpiryWatchlistItem,
} from '../../services/operatorDocumentsService'
import { operatorDocumentsService } from '../../services/operatorDocumentsService'

type TabId = 'all' | 'watchlist' | 'overview'

type EntityType = 'company' | 'aircraft' | 'crew'

const STATUS_TONE: Record<string, string> = {
  approved: 'ok',
  under_review: 'info',
  expiring_soon: 'warn',
  expired: 'danger',
  rejected: 'danger',
  pending: 'warn',
}

const STATUS_LABEL: Record<string, string> = {
  approved: 'Approved',
  under_review: 'Under Review',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  rejected: 'Rejected',
  pending: 'Pending',
}

const ENTITY_ICONS: Record<EntityType, typeof Building2> = {
  company: Building2,
  aircraft: Plane,
  crew: User,
}

const ENTITY_LABELS: Record<EntityType, string> = {
  company: 'Company',
  aircraft: 'Aircraft',
  crew: 'Crew',
}

function urgencyTone(daysLeft: number | null, status: string): 'danger' | 'warn' | 'ok' {
  if (status === 'expired' || (daysLeft !== null && daysLeft <= 0)) return 'danger'
  if (daysLeft !== null && daysLeft < 7) return 'danger'
  if (daysLeft !== null && daysLeft < 30) return 'warn'
  return 'ok'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ status, daysLeft }: { status: string; daysLeft: number | null }) {
  const tone = STATUS_TONE[status] ?? 'warn'
  const label = STATUS_LABEL[status] ?? status
  const suffix =
    status === 'expiring_soon' && daysLeft !== null
      ? ` · ${daysLeft}d`
      : status === 'expired'
      ? ''
      : ''
  return (
    <span className={`badge ${tone}`} style={{ height: 19, fontSize: 10, whiteSpace: 'nowrap' }}>
      <span className={`dot ${tone}`} />
      {label}
      {suffix}
    </span>
  )
}

function CategoryHeader({
  entityType,
  count,
  alertCount,
  expanded,
  onToggle,
}: {
  entityType: EntityType
  count: number
  alertCount: number
  expanded: boolean
  onToggle: () => void
}) {
  const Icon = ENTITY_ICONS[entityType]
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 24px',
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--rule)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {alertCount > 0 ? (
        <AlertTriangle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
      ) : (
        <CheckCircle2 size={15} style={{ color: 'var(--ok)', flexShrink: 0 }} />
      )}
      <Icon size={14} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.04em' }}>
        {ENTITY_LABELS[entityType]}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          padding: '1px 7px',
          borderRadius: 10,
          background: 'var(--surface-sunk)',
          color: 'var(--ink-3)',
          border: '1px solid var(--rule-strong)',
        }}
      >
        {count}
      </span>
      {alertCount > 0 && (
        <span className="badge danger" style={{ height: 17, fontSize: 10 }}>
          {alertCount} issue{alertCount !== 1 ? 's' : ''}
        </span>
      )}
      <div style={{ flex: 1 }} />
      {expanded ? (
        <ChevronUp size={14} style={{ color: 'var(--ink-4)' }} />
      ) : (
        <ChevronDown size={14} style={{ color: 'var(--ink-4)' }} />
      )}
    </div>
  )
}

function UploadModal({
  doc,
  onClose,
  onDone,
}: {
  doc: DocumentItem | ExpiryWatchlistItem
  onClose: () => void
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [expiry, setExpiry] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    if (!file) { setError('Please select a file.'); return }
    setSaving(true)
    setError('')
    operatorDocumentsService
      .uploadDocument({
        entity_type: doc.entity_type,
        entity_id: doc.id,
        doc_type: doc.doc_type,
        expiry_date: expiry || undefined,
        file,
      })
      .then(() => { onDone() })
      .catch(() => { setError('Upload failed. Please try again.'); setSaving(false) })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 10,
          padding: 28,
          width: 420,
          maxWidth: 'calc(100vw - 32px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
          Upload / Renew Document
        </div>
        <div>
          <div className="t-label" style={{ marginBottom: 4 }}>Document type</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{doc.doc_type}</div>
        </div>
        <div>
          <div className="t-label" style={{ marginBottom: 4 }}>Entity</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{doc.entity_name}</div>
        </div>
        <div className="field">
          <label className="field-label">Expiry date (optional)</label>
          <input
            type="date"
            className="input"
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div className="field">
          <label className="field-label">File</label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            style={{ display: 'none' }}
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            className="btn sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={13} />
            {file ? file.name : 'Choose file…'}
          </button>
        </div>
        {error && (
          <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn sm ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn sm accent" onClick={handleSubmit} disabled={saving || !file}>
            {saving ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [watchlist, setWatchlist] = useState<ExpiryWatchlistItem[]>([])
  const [overview, setOverview] = useState<ComplianceOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadTarget, setUploadTarget] = useState<DocumentItem | ExpiryWatchlistItem | null>(null)
  const [collapsed, setCollapsed] = useState<Record<EntityType, boolean>>({
    company: false,
    aircraft: false,
    crew: false,
  })

  const loadAll = () => {
    setLoading(true)
    Promise.all([
      operatorDocumentsService.list(),
      operatorDocumentsService.getExpiryWatchlist(),
      operatorDocumentsService.getComplianceOverview(),
    ])
      .then(([docs, wl, ov]) => {
        setDocuments(docs)
        setWatchlist(wl)
        setOverview(ov)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])

  const grouped = useMemo(() => {
    const g: Record<EntityType, DocumentItem[]> = { company: [], aircraft: [], crew: [] }
    for (const d of documents) {
      if (g[d.entity_type]) g[d.entity_type].push(d)
    }
    return g
  }, [documents])

  const alertCounts = useMemo(() => {
    const c: Record<EntityType, number> = { company: 0, aircraft: 0, crew: 0 }
    for (const d of documents) {
      if (['expired', 'rejected', 'expiring_soon'].includes(d.status)) c[d.entity_type]++
    }
    return c
  }, [documents])

  const watchlistSorted = useMemo(() => {
    return [...watchlist].sort((a, b) => {
      const toneOrder = { danger: 0, warn: 1, ok: 2 }
      const ta = toneOrder[urgencyTone(a.days_left, a.status)]
      const tb = toneOrder[urgencyTone(b.days_left, b.status)]
      if (ta !== tb) return ta - tb
      const da = a.days_left ?? 9999
      const db = b.days_left ?? 9999
      return da - db
    })
  }, [watchlist])

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'all', label: 'All Documents', count: documents.length },
    { id: 'watchlist', label: 'Expiry Watchlist', count: watchlist.length },
    { id: 'overview', label: 'Compliance Overview' },
  ]

  const toggleCollapse = (et: EntityType) => {
    setCollapsed(prev => ({ ...prev, [et]: !prev[et] }))
  }

  const renderDocRow = (doc: DocumentItem, i: number, total: number) => {
    const tone = STATUS_TONE[doc.status] ?? 'warn'
    const rowBg =
      doc.status === 'expired' || doc.status === 'rejected'
        ? 'color-mix(in oklab, var(--danger-soft) 50%, transparent)'
        : doc.status === 'expiring_soon'
        ? 'color-mix(in oklab, var(--warn-soft) 40%, transparent)'
        : 'transparent'

    return (
      <div
        key={doc.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: isMobile ? '12px 16px' : '10px 24px',
          borderBottom: i === total - 1 ? 'none' : '1px solid var(--rule-soft)',
          background: rowBg,
          minWidth: isMobile ? undefined : 700,
          flexWrap: isMobile ? 'wrap' : undefined,
          gap: isMobile ? 8 : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <FileText size={14} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {doc.doc_type}
            </div>
            <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>
              {doc.entity_name}
            </div>
          </div>
        </div>

        <div style={{ flexShrink: 0, marginLeft: isMobile ? 0 : 16 }}>
          <StatusBadge status={doc.status} daysLeft={doc.days_left} />
        </div>

        <div
          style={{
            flexShrink: 0,
            width: isMobile ? undefined : 110,
            marginLeft: isMobile ? 0 : 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
          }}
        >
          {fmtDate(doc.expiry_date)}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 6,
            flexShrink: 0,
            marginLeft: isMobile ? 0 : 16,
            width: isMobile ? '100%' : 148,
            justifyContent: isMobile ? 'flex-end' : 'flex-end',
          }}
        >
          {doc.file_url && (
            <a
              href={doc.file_url}
              target="_blank"
              rel="noreferrer"
              className="btn sm ghost"
              style={{ height: 26, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <FileText size={11} />
              View
            </a>
          )}
          <button
            className="btn sm accent"
            style={{ height: 26 }}
            onClick={() => setUploadTarget(doc)}
          >
            <Upload size={11} />
            {doc.status === 'expired' || doc.status === 'expiring_soon' ? 'Renew' : 'Upload'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <Shell
      activeId="documents"
      breadcrumb="Compliance"
      title="Documents & Compliance"
      subtitle={`${documents.length} documents`}
      actions={
        <button className="btn sm" onClick={loadAll} disabled={loading}>
          <RefreshCw size={12} />
          Refresh
        </button>
      }
    >
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--rule)',
          padding: '0 28px',
          background: 'var(--surface)',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {tabs.map(t => (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              height: 44,
              padding: '0 14px',
              cursor: 'pointer',
              borderBottom: t.id === activeTab ? '2px solid var(--ink)' : '2px solid transparent',
              color: t.id === activeTab ? 'var(--ink)' : 'var(--ink-3)',
              fontSize: 13,
              fontWeight: t.id === activeTab ? 500 : 400,
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  padding: '1px 7px',
                  borderRadius: 10,
                  background: t.id === activeTab ? 'var(--ink)' : 'var(--surface-sunk)',
                  color: t.id === activeTab ? 'var(--bg)' : 'var(--ink-3)',
                  border: t.id === activeTab ? 'none' : '1px solid var(--rule-strong)',
                }}
              >
                {t.count}
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
            Loading…
          </div>
        )}

        {!loading && activeTab === 'all' && (
          <div>
            {(['company', 'aircraft', 'crew'] as EntityType[]).map(et => {
              const docs = grouped[et]
              const isExpanded = !collapsed[et]
              return (
                <div key={et} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <CategoryHeader
                    entityType={et}
                    count={docs.length}
                    alertCount={alertCounts[et]}
                    expanded={isExpanded}
                    onToggle={() => toggleCollapse(et)}
                  />
                  {isExpanded && docs.length === 0 && (
                    <div className="t-meta" style={{ padding: '20px 24px', fontSize: 12 }}>
                      No documents in this category.
                    </div>
                  )}
                  {isExpanded && docs.length > 0 && (
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      {!isMobile && (
                        <div
                          style={{
                            display: 'flex',
                            padding: '7px 24px',
                            background: 'var(--surface-sunk)',
                            borderBottom: '1px solid var(--rule)',
                            minWidth: 700,
                          }}
                        >
                          <div className="t-label" style={{ flex: 1 }}>Document / Entity</div>
                          <div className="t-label" style={{ flexShrink: 0, marginLeft: 16 }}>Status</div>
                          <div className="t-label" style={{ flexShrink: 0, width: 110, marginLeft: 16 }}>Expiry</div>
                          <div className="t-label" style={{ flexShrink: 0, width: 148, marginLeft: 16, textAlign: 'right' }}>Actions</div>
                        </div>
                      )}
                      {docs.map((d, i) => renderDocRow(d, i, docs.length))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!loading && activeTab === 'watchlist' && (
          <div>
            {watchlist.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <CheckCircle2 size={36} style={{ color: 'var(--ok)', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>
                  No documents expiring within 60 days
                </div>
                <div className="t-meta" style={{ marginTop: 6, fontSize: 12 }}>
                  All your documents are current.
                </div>
              </div>
            )}
            {watchlistSorted.length > 0 && (
              <div>
                <div
                  style={{
                    padding: '10px 24px',
                    background: 'var(--surface-2)',
                    borderBottom: '1px solid var(--rule)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={13} style={{ color: 'var(--warn)' }} />
                  <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                    Documents expiring within 60 days, sorted by urgency
                  </span>
                </div>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  {!isMobile && (
                    <div
                      style={{
                        display: 'flex',
                        padding: '7px 24px',
                        background: 'var(--surface-sunk)',
                        borderBottom: '1px solid var(--rule)',
                        minWidth: 700,
                      }}
                    >
                      <div className="t-label" style={{ width: 14, flexShrink: 0, marginRight: 12 }} />
                      <div className="t-label" style={{ flex: 1 }}>Document / Entity</div>
                      <div className="t-label" style={{ flexShrink: 0, marginLeft: 16 }}>Status</div>
                      <div className="t-label" style={{ flexShrink: 0, width: 110, marginLeft: 16 }}>Expiry</div>
                      <div className="t-label" style={{ flexShrink: 0, width: 100, marginLeft: 16, textAlign: 'right' }}>Action</div>
                    </div>
                  )}
                  {watchlistSorted.map((w, i) => {
                    const tone = urgencyTone(w.days_left, w.status)
                    const rowBg =
                      tone === 'danger'
                        ? 'color-mix(in oklab, var(--danger-soft) 55%, transparent)'
                        : tone === 'warn'
                        ? 'color-mix(in oklab, var(--warn-soft) 45%, transparent)'
                        : 'transparent'

                    return (
                      <div
                        key={w.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: isMobile ? '12px 16px' : '10px 24px',
                          borderBottom:
                            i === watchlistSorted.length - 1
                              ? 'none'
                              : '1px solid var(--rule-soft)',
                          background: rowBg,
                          minWidth: isMobile ? undefined : 700,
                          flexWrap: isMobile ? 'wrap' : undefined,
                          gap: isMobile ? 8 : undefined,
                        }}
                      >
                        {!isMobile && (
                          <div style={{ width: 14, flexShrink: 0, marginRight: 12 }}>
                            {tone === 'danger' && (
                              <XCircle size={13} style={{ color: 'var(--danger)' }} />
                            )}
                            {tone === 'warn' && (
                              <AlertTriangle size={13} style={{ color: 'var(--warn)' }} />
                            )}
                            {tone === 'ok' && (
                              <CheckCircle2 size={13} style={{ color: 'var(--ok)' }} />
                            )}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--ink)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {w.doc_type}
                          </div>
                          <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>
                            {ENTITY_LABELS[w.entity_type]} · {w.entity_name}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, marginLeft: isMobile ? 0 : 16 }}>
                          <StatusBadge status={w.status} daysLeft={w.days_left} />
                        </div>
                        <div
                          style={{
                            flexShrink: 0,
                            width: isMobile ? undefined : 110,
                            marginLeft: isMobile ? 0 : 16,
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: tone === 'danger' ? 'var(--danger)' : 'var(--ink-3)',
                            fontWeight: tone === 'danger' ? 600 : 400,
                          }}
                        >
                          {fmtDate(w.expiry_date)}
                        </div>
                        <div
                          style={{
                            flexShrink: 0,
                            marginLeft: isMobile ? 0 : 16,
                            width: isMobile ? '100%' : 100,
                            display: 'flex',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            className="btn sm accent"
                            style={{ height: 26 }}
                            onClick={() => setUploadTarget(w as DocumentItem)}
                          >
                            <RefreshCw size={11} />
                            Renew
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'overview' && overview && (
          <div style={{ padding: isMobile ? 16 : 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 20,
                background: overview.ready ? 'color-mix(in oklab, var(--ok) 10%, var(--surface))' : 'color-mix(in oklab, var(--danger) 8%, var(--surface))',
                border: `1px solid ${overview.ready ? 'color-mix(in oklab,var(--ok) 30%,var(--rule))' : 'color-mix(in oklab,var(--danger) 25%,var(--rule))'}`,
                borderRadius: 10,
              }}
            >
              {overview.ready ? (
                <CheckCircle2 size={32} style={{ color: 'var(--ok)', flexShrink: 0 }} />
              ) : (
                <XCircle size={32} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                  {overview.ready ? 'Compliance Ready' : 'Compliance Incomplete'}
                </div>
                <div className="t-meta" style={{ marginTop: 4, fontSize: 12 }}>
                  Readiness score: {overview.readiness_score}%
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: `4px solid ${overview.ready ? 'var(--ok)' : 'var(--danger)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: overview.ready ? 'var(--ok)' : 'var(--danger)' }}>
                  {overview.readiness_score}%
                </span>
              </div>
            </div>

            {overview.blockers.length > 0 && (
              <div
                style={{
                  border: '1px solid color-mix(in oklab,var(--danger) 25%,var(--rule))',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    background: 'color-mix(in oklab,var(--danger) 8%,var(--surface-2))',
                    borderBottom: '1px solid color-mix(in oklab,var(--danger) 20%,var(--rule))',
                  }}
                >
                  <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--danger)' }}>
                    Blockers ({overview.blockers.length})
                  </span>
                </div>
                {overview.blockers.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 16px',
                      borderBottom: i === overview.blockers.length - 1 ? 'none' : '1px solid var(--rule-soft)',
                      fontSize: 13,
                      color: 'var(--ink-2)',
                    }}
                  >
                    <XCircle size={13} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
                    {b}
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: 16,
              }}
            >
              {[
                { key: 'aircraft_status', label: 'Aircraft', icon: Plane, data: overview.aircraft_status },
                { key: 'crew_status', label: 'Crew', icon: User, data: overview.crew_status },
                { key: 'doc_status', label: 'Documents', icon: Shield, data: overview.doc_status },
              ].map(({ key, icon: Icon, data }) => (
                <div
                  key={key}
                  style={{
                    border: '1px solid var(--rule)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      background: 'var(--surface-2)',
                      borderBottom: '1px solid var(--rule)',
                    }}
                  >
                    <Icon size={14} style={{ color: 'var(--ink-3)' }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                      {data.label}
                    </span>
                    <div style={{ flex: 1 }} />
                    <span className="t-meta" style={{ fontSize: 11 }}>
                      {data.approved}/{data.total}
                    </span>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: 'var(--surface-sunk)',
                        overflow: 'hidden',
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: data.total > 0 ? `${(data.approved / data.total) * 100}%` : '0%',
                          background: data.approved === data.total ? 'var(--ok)' : 'var(--warn)',
                          borderRadius: 3,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    {data.issues.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={12} style={{ color: 'var(--ok)' }} />
                        <span className="t-meta" style={{ fontSize: 11 }}>All clear</span>
                      </div>
                    )}
                    {data.issues.map((iss, ii) => (
                      <div
                        key={ii}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                          marginTop: 6,
                        }}
                      >
                        <AlertTriangle size={11} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{iss}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && activeTab === 'overview' && !overview && (
          <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
            Unable to load compliance overview.
          </div>
        )}
      </div>

      {uploadTarget && (
        <UploadModal
          doc={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onDone={() => { setUploadTarget(null); loadAll() }}
        />
      )}
    </Shell>
  )
}
