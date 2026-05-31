import { useState, useEffect } from 'react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { operatorService } from '../../services/operatorService'
import type { Operator, OperatorDocument, CreateOperatorBody } from '../../services/operatorService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === 'pending')  return <span className="badge info"><span className="dot info" />Pending</span>
  if (status === 'review')   return <span className="badge warn"><span className="dot warn" />In Review</span>
  if (status === 'approved') return <span className="badge ok"><span className="dot ok" />Approved</span>
  if (status === 'rejected') return <span className="badge danger"><span className="dot danger" />Rejected</span>
  return <span className="badge">{status}</span>
}

function docStatusBadge(status: string) {
  if (status === 'approved') return <span className="badge ok"><span className="dot ok" />Approved</span>
  if (status === 'rejected') return <span className="badge danger"><span className="dot danger" />Rejected</span>
  if (status === 'expired')  return <span className="badge danger"><span className="dot danger" />Expired</span>
  return <span className="badge info"><span className="dot info" />Pending</span>
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewState {
  operator: Operator
  docs: OperatorDocument[]
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OperatorOnboardingPage() {
  const isMobile  = useIsMobile()
  const isTablet  = useIsTablet()

  const [operators, setOperators]       = useState<Operator[]>([])
  const [loading, setLoading]           = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [review, setReview]             = useState<ReviewState | null>(null)
  const [showMobileReview, setShowMobileReview] = useState(false)

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<Operator | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [apiError, setApiError]         = useState('')

  // Invite operator modal
  const EMPTY_INVITE: CreateOperatorBody = { name: '', hq_city: '', cert_type: '', company_registration_no: '', notes: '' }
  const [showInvite, setShowInvite]     = useState(false)
  const [inviteForm, setInviteForm]     = useState<CreateOperatorBody>({ ...EMPTY_INVITE })
  const [inviting, setInviting]         = useState(false)
  const [inviteError, setInviteError]   = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await operatorService.listOperators({ status: 'pending,review', page_size: 50 })
      setOperators(res.items)
    } catch {
      // silently fall back to empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = operators.filter(o => {
    if (statusFilter === 'all') return true
    return o.status === statusFilter
  })

  const openReview = async (op: Operator) => {
    setApiError('')
    try {
      const detail = await operatorService.getOperator(op.id)
      setReview({ operator: detail, docs: detail.docs })
      if (isMobile) setShowMobileReview(true)
    } catch {
      setApiError('Failed to load operator details')
    }
  }

  const handleApproveDoc = async (doc: OperatorDocument) => {
    if (!review) return
    try {
      const updated = await operatorService.updateDocument(review.operator.id, doc.id, { status: 'approved' })
      setReview(r => r ? { ...r, docs: r.docs.map(d => d.id === updated.id ? updated : d) } : r)
    } catch {
      setApiError('Failed to approve document')
    }
  }

  const handleRejectDoc = async (doc: OperatorDocument) => {
    if (!review) return
    try {
      const updated = await operatorService.updateDocument(review.operator.id, doc.id, { status: 'rejected' })
      setReview(r => r ? { ...r, docs: r.docs.map(d => d.id === updated.id ? updated : d) } : r)
    } catch {
      setApiError('Failed to reject document')
    }
  }

  const handleApproveOperator = async () => {
    if (!review) return
    setActionLoading(true)
    try {
      await operatorService.approveOperator(review.operator.id)
      setReview(null)
      setShowMobileReview(false)
      await load()
    } catch {
      setApiError('Failed to approve operator')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectOperator = async () => {
    if (!review || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      await operatorService.rejectOperator(review.operator.id, { reason: rejectReason })
      setRejectTarget(null)
      setRejectReason('')
      setReview(null)
      setShowMobileReview(false)
      await load()
    } catch {
      setApiError('Failed to reject operator')
    } finally {
      setActionLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteForm.name.trim()) { setInviteError('Operator name is required'); return }
    setInviting(true); setInviteError('')
    try {
      await operatorService.createOperator(inviteForm)
      setShowInvite(false)
      setInviteForm({ ...EMPTY_INVITE })
      await load()
    } catch {
      setInviteError('Failed to create operator')
    } finally {
      setInviting(false)
    }
  }

  const pendingCount  = operators.filter(o => o.status === 'pending').length
  const reviewCount   = operators.filter(o => o.status === 'review').length

  // ── Mobile card layout ─────────────────────────────────────────────────────
  const renderMobileCard = (op: Operator) => (
    <div
      key={op.id}
      style={{
        background: 'var(--surface)', border: '1px solid var(--rule)',
        borderRadius: 4, padding: '16px', marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>{op.name}</div>
          <div className="t-meta" style={{ marginTop: 4 }}>{op.hq_city || '—'} · {op.cert_type || 'Cert pending'}</div>
          <div style={{ marginTop: 8 }}>{statusBadge(op.status)}</div>
        </div>
        <button className="btn accent sm" onClick={() => openReview(op)}>Review →</button>
      </div>
    </div>
  )

  // ── Review panel ──────────────────────────────────────────────────────────
  const renderReviewPanel = () => {
    if (!review) return null
    const op = review.operator
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--rule)',
        minWidth: 0,
      }}>
        {isMobile && (
          <button
            onClick={() => { setShowMobileReview(false); setReview(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              width: '100%', fontSize: 13, color: 'var(--accent)',
              background: 'var(--surface-2)', border: 'none', borderBottom: '1px solid var(--rule)',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            <Icon name="chevLeft" size={14} stroke={2} />
            Back to queue
          </button>
        )}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)' }}>
          <div className="t-label">Reviewing operator</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, marginTop: 4 }}>{op.name}</div>
          <div className="t-meta" style={{ marginTop: 4 }}>{op.hq_city || '—'} · {op.cert_type || 'No cert type'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            {[
              ['Reg. no.',         op.company_registration_no],
              ['Commission',       op.commission_pct != null ? `${op.commission_pct}%` : '—'],
              ['Insurance expiry', op.insurance_expiry],
              ['Cert expiry',      op.cert_expiry],
              ['Site visit',       op.site_visit_status],
            ].map(([k, v]) => (
              <div key={k as string}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>{k}</div>
                <div style={{ fontSize: 12.5, color: v ? 'var(--ink)' : 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{v || '—'}</div>
              </div>
            ))}
          </div>
          {op.notes && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-2)', fontStyle: 'italic' }}>
              Notes: {op.notes}
            </div>
          )}
        </div>

        {apiError && (
          <div style={{
            margin: '12px 20px 0', padding: '9px 12px',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
          }}>{apiError}</div>
        )}

        {/* Documents */}
        <div style={{ padding: '16px 20px' }}>
          <div className="t-label" style={{ marginBottom: 10 }}>Documents</div>
          {review.docs.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No documents uploaded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {review.docs.map(doc => {
                const backendBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace('/api/v1', '') || 'http://localhost:8001'
                const fileUrl = doc.file_url.startsWith('http') ? doc.file_url : `${backendBase}${doc.file_url}`
                return (
                  <div key={doc.id} style={{
                    padding: '10px 12px',
                    background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink)', textTransform: 'capitalize' }}>
                          {doc.doc_type.replace(/_/g, ' ')}
                        </div>
                        {doc.expires_at && (
                          <div className="t-meta" style={{ marginTop: 2 }}>Expires {doc.expires_at}</div>
                        )}
                      </div>
                      {docStatusBadge(doc.status)}
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn sm ghost"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                      >
                        <Icon name="eye" size={11} />View
                      </a>
                    </div>
                    {doc.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button className="btn sm accent" onClick={() => handleApproveDoc(doc)}>Approve</button>
                        <button className="btn sm ghost" style={{ color: 'var(--danger)' }} onClick={() => handleRejectDoc(doc)}>Reject</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Overall actions */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--rule)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn accent sm"
            onClick={handleApproveOperator}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing…' : 'Approve operator'}
          </button>
          <button
            className="btn sm ghost"
            style={{ color: 'var(--danger)' }}
            onClick={() => { setRejectTarget(op); setRejectReason('') }}
          >
            Reject operator
          </button>
        </div>
      </div>
    )
  }

  return (
    <Shell
      activeId="operators"
      breadcrumb="Operations · Air Operators · Onboarding"
      title="Operator onboarding queue"
      subtitle={`${pendingCount} pending · ${reviewCount} in review`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm accent" onClick={() => { setInviteForm({ ...EMPTY_INVITE }); setInviteError(''); setShowInvite(true) }}>
            <Icon name="plus" size={13} />Invite operator
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Filter bar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Status:</span>
          {(['all', 'pending', 'review'] as const).map(s => (
            <button
              key={s}
              className={`btn sm ${statusFilter === s ? 'accent' : 'ghost'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s === 'pending' ? 'Pending' : 'In Review'}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{filtered.length} shown</span>
        </div>

        {/* Mobile: single-panel flow */}
        {isMobile && showMobileReview ? (
          renderReviewPanel()
        ) : isMobile ? (
          loading ? (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>
              No operators in this filter.
            </div>
          ) : (
            filtered.map(renderMobileCard)
          )
        ) : (
          /* Desktop/tablet: table + side panel */
          <div style={{
            display: 'grid',
            gridTemplateColumns: (!isTablet && review) ? '1fr 380px' : '1fr',
            gap: 18, alignItems: 'start',
          }}>
            {/* Table */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              {loading ? (
                <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ minWidth: 700 }}>
                    <thead>
                      <tr>
                        <th>Operator</th>
                        <th>HQ</th>
                        <th>Cert type</th>
                        <th>Status</th>
                        <th>Insurance expiry</th>
                        <th>Site visit</th>
                        <th style={{ width: 100 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                            No operators in queue.
                          </td>
                        </tr>
                      ) : filtered.map(op => (
                        <tr
                          key={op.id}
                          className={review?.operator.id === op.id ? 'selected' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => openReview(op)}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 3, flexShrink: 0,
                                background: 'var(--surface-sunk)',
                                border: '1px solid var(--rule)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--ink-3)',
                              }}>
                                <Icon name="building" size={15} />
                              </div>
                              <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{op.name}</div>
                            </div>
                          </td>
                          <td style={{ color: 'var(--ink-2)', fontSize: 13 }}>{op.hq_city || '—'}</td>
                          <td style={{ color: 'var(--ink-2)', fontSize: 13 }}>{op.cert_type || '—'}</td>
                          <td>{statusBadge(op.status)}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                            {op.insurance_expiry || '—'}
                          </td>
                          <td style={{ color: 'var(--ink-2)', fontSize: 13 }}>
                            {op.site_visit_status || '—'}
                          </td>
                          <td>
                            <button
                              className="btn accent sm"
                              onClick={e => { e.stopPropagation(); openReview(op) }}
                            >
                              Open review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Side panel */}
            {review && renderReviewPanel()}

            {/* Tablet: review below table */}
            {isTablet && review && (
              <div style={{ gridColumn: '1 / -1' }}>
                {renderReviewPanel()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite operator modal */}
      {showInvite && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 440, background: 'var(--surface)',
            border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)', padding: '28px',
          }}>
            <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              Invite operator
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-3)' }}>
              Create a pending operator record. They can be approved once documents are submitted.
            </p>
            {inviteError && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
              }}>{inviteError}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label className="field-label">Operator name *</label>
                <div className="input">
                  <input
                    value={inviteForm.name}
                    onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="BlueSky Heliservices"
                    autoFocus
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">HQ City</label>
                <div className="input">
                  <input
                    value={inviteForm.hq_city ?? ''}
                    onChange={e => setInviteForm(f => ({ ...f, hq_city: e.target.value }))}
                    placeholder="Bengaluru"
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Cert type</label>
                <div className="input">
                  <input
                    value={inviteForm.cert_type ?? ''}
                    onChange={e => setInviteForm(f => ({ ...f, cert_type: e.target.value }))}
                    placeholder="NSOP"
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Company registration no.</label>
                <div className="input">
                  <input
                    value={inviteForm.company_registration_no ?? ''}
                    onChange={e => setInviteForm(f => ({ ...f, company_registration_no: e.target.value }))}
                    placeholder="CIN / Registration number"
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="btn sm" onClick={() => { setShowInvite(false); setInviteError('') }}>Cancel</button>
              <button className="btn sm accent" onClick={handleInvite} disabled={inviting}>
                {inviting ? 'Creating…' : 'Create & invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject confirm dialog */}
      {rejectTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 420, background: 'var(--surface)',
            border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)', padding: '28px',
          }}>
            <h3 style={{ margin: '0 0 12px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              Reject {rejectTarget.name}?
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-3)' }}>
              This will reject the operator application. Please provide a reason:
            </p>
            <div className="input" style={{ marginBottom: 20 }}>
              <input
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection…"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn sm" onClick={() => { setRejectTarget(null); setRejectReason('') }}>Cancel</button>
              <button
                className="btn sm danger"
                style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
                onClick={handleRejectOperator}
                disabled={actionLoading}
              >
                {actionLoading ? 'Rejecting…' : 'Reject operator'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
