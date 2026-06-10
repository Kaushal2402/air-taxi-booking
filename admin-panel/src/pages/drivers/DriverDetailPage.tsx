import { useState, useEffect } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import SearchableSelect from '../../components/ui/SearchableSelect'
import type { SelectOption } from '../../components/ui/SearchableSelect'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { driverService } from '../../services/driverService'
import type { Driver, DriverDocument, DriverWalletTransaction, DocType } from '../../services/driverService'
import { catalogService } from '../../services/catalogService'
import { kycService } from '../../services/kycService'
import type { DocTypeItem } from '../../services/kycService'
import { vehicleService } from '../../services/vehicleService'
import type { Vehicle } from '../../services/vehicleService'
import { auditService } from '../../services/auditService'
import type { AuditEventSummary } from '../../services/auditService'
import { supportService } from '../../services/supportService'
import type { Ticket } from '../../services/supportService'
import { formatMoney, currencySymbol, formatDate } from '../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
}


function tenure(joinedAt: string): string {
  const diff = Date.now() - new Date(joinedAt).getTime()
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000))
  if (years >= 1) return `${years}y`
  const months = Math.floor(diff / (30.44 * 24 * 3600 * 1000))
  return `${months}mo`
}

// ── Reason modal ──────────────────────────────────────────────────────────────

interface ReasonModalProps {
  title: string
  placeholder: string
  confirmLabel?: string
  variant?: 'danger' | 'accent'
  onConfirm: (reason: string) => void
  onCancel: () => void
}

function ReasonModal({ title, placeholder, confirmLabel = 'Confirm', variant = 'accent', onConfirm, onCancel }: ReasonModalProps) {
  const [reason, setReason] = useState('')
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)', padding: '24px 24px 20px' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>{title}</h3>
        <div className="input">
          <input
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={placeholder}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button
            className={`btn sm ${variant}`}
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}


// ── Documents tab ─────────────────────────────────────────────────────────────

interface DocActionState {
  doc: DriverDocument
  action: 'approve' | 'reject' | 'reupload'
}

function DocumentsTab({ driverId, navigate }: { driverId: string; navigate: ReturnType<typeof useNavigate> }) {
  const canReviewKyc = usePermission('drivers.kyc.review')
  const [docs, setDocs]           = useState<DriverDocument[]>([])
  const [loading, setLoading]     = useState(true)
  const [pending, setPending]     = useState<DocActionState | null>(null)
  const [apiError, setApiError]   = useState('')
  const [docTypeOptions, setDocTypeOptions] = useState<DocTypeItem[]>([])

  // Add document form
  const [showAddForm, setShowAddForm]   = useState(false)
  const [addForm, setAddForm]           = useState({ doc_type: '', doc_number: '', expiry_date: '' })
  const [addError, setAddError]         = useState('')
  const [addSaving, setAddSaving]       = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      driverService.getDocuments(driverId),
      kycService.getDocTypes(),
    ])
      .then(([docsData, types]) => {
        setDocs(docsData.items)
        setDocTypeOptions(types.driver)
        setAddForm(f => ({ ...f, doc_type: types.driver[0]?.key ?? '' }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [driverId])

  const handleAddDocument = async () => {
    setAddError('')
    setAddSaving(true)
    try {
      const created = await driverService.createDocument(driverId, {
        doc_type:    addForm.doc_type as DocType,
        doc_number:  addForm.doc_number.trim()  || undefined,
        expiry_date: addForm.expiry_date.trim() || undefined,
      })
      // Optimistic update — show the new doc immediately without waiting for reload
      setDocs(prev => [...prev, created])
      setShowAddForm(false)
      setAddForm({ doc_type: docTypeOptions[0]?.key ?? '', doc_number: '', expiry_date: '' })
      // Background reload to sync server state (fire-and-forget; optimistic update stays on failure)
      driverService.getDocuments(driverId)
        .then(data => setDocs(data.items))
        .catch(() => {})
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setAddError(err?.response?.data?.detail || 'Failed to add document')
    } finally {
      setAddSaving(false)
    }
  }

  const handleAction = async (action: 'approve' | 'reject' | 'reupload') => {
    if (!pending) return
    setApiError('')
    try {
      await driverService.reviewDocument(driverId, pending.doc.id, {
        action: action === 'reupload' ? 'request_reupload' : action,
      })
      const data = await driverService.getDocuments(driverId)
      setDocs(data.items)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Action failed')
    }
    setPending(null)
  }

  const statusDot = (s: string) => {
    if (s === 'ok') return 'ok'
    if (s === 'pending') return 'warn'
    return 'danger'
  }

  const statusLabel = (s: string) => {
    if (s === 'ok') return <span className="badge ok"><span className="dot ok" />OK</span>
    if (s === 'pending') return <span className="badge warn"><span className="dot warn" />Pending</span>
    if (s === 'rejected') return <span className="badge danger"><span className="dot danger" />Rejected</span>
    if (s === 'expired') return <span className="badge danger"><span className="dot danger" />Expired</span>
    return <span className="badge">{s}</span>
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="t-label" style={{ padding: 0 }}>Documents · {docs.length}</div>
        <button className="btn sm accent" onClick={() => { setShowAddForm(v => !v); setAddError('') }}>
          <Icon name="plus" size={13} />{showAddForm ? 'Cancel' : 'Add document'}
        </button>
      </div>

      {/* Add document inline form */}
      {showAddForm && (
        <div style={{ marginBottom: 16, padding: '18px 20px', background: 'var(--surface-2)', border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {addError && (
            <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', fontSize: 12.5, color: 'var(--danger)' }}>
              {addError}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Document type<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
              <select
                value={addForm.doc_type}
                onChange={e => setAddForm(f => ({ ...f, doc_type: e.target.value }))}
                style={{
                  width: '100%', height: 34, border: '1px solid var(--rule)',
                  background: 'var(--surface)', borderRadius: 3,
                  padding: '0 10px', fontSize: 13, color: 'var(--ink)', cursor: 'pointer', outline: 'none',
                }}
              >
                {docTypeOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Document number</label>
              <div className="input">
                <input placeholder="e.g. KA 5520210018421" value={addForm.doc_number} onChange={e => setAddForm(f => ({ ...f, doc_number: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Expiry date</label>
              <div className="input">
                <input type="date" value={addForm.expiry_date} onChange={e => setAddForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn sm ghost" onClick={() => setShowAddForm(false)} disabled={addSaving}>Cancel</button>
            <button className="btn sm accent" onClick={handleAddDocument} disabled={addSaving}>
              {addSaving ? 'Adding…' : 'Add document'}
            </button>
          </div>
        </div>
      )}

      {apiError && (
        <div style={{ marginBottom: 16, padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
          {apiError}
        </div>
      )}
      {docs.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No documents uploaded yet. Use "Add document" to create one.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          {docs.map((doc, i) => (
            <div key={doc.id} style={{
              padding: '16px 20px', borderBottom: i < docs.length - 1 ? '1px solid var(--rule-soft)' : 'none',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <span className={`dot ${statusDot(doc.status)}`} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{(docTypeOptions.find(o => o.key === doc.doc_type)?.label ?? doc.doc_type)}</div>
                <div className="t-meta" style={{ marginTop: 3 }}>
                  {doc.doc_number ?? '—'}
                  {doc.expiry_date ? ` · Expires ${formatDate(doc.expiry_date)}` : ''}
                </div>
                {doc.review_note && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>{doc.review_note}</div>
                )}
              </div>
              {statusLabel(doc.status)}
              <button
                className="btn sm ghost"
                onClick={() => navigate(`/drivers/${driverId}/documents/${doc.id}`)}
              >
                Review
              </button>
              {doc.status === 'pending' && (
                <>
                  <button className="btn sm accent" onClick={() => setPending({ doc, action: 'approve' })} style={{ display: canReviewKyc ? undefined : 'none' }}>Approve</button>
                  <button className="btn sm" onClick={() => setPending({ doc, action: 'reupload' })} style={{ display: canReviewKyc ? undefined : 'none' }}>Re-upload</button>
                  <button className="btn sm ghost" style={{ color: 'var(--danger)', display: canReviewKyc ? undefined : 'none' }} onClick={() => setPending({ doc, action: 'reject' })}>Reject</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {pending && (
        <ConfirmDialog
          open
          title={pending.action === 'approve' ? 'Approve document' : pending.action === 'reject' ? 'Reject document' : 'Request re-upload'}
          description={
            pending.action === 'approve'
              ? `Approve the ${(docTypeOptions.find(o => o.key === pending.doc.doc_type)?.label ?? pending.doc.doc_type)} document.`
              : pending.action === 'reject'
              ? `Reject the ${(docTypeOptions.find(o => o.key === pending.doc.doc_type)?.label ?? pending.doc.doc_type)} document. The driver will be notified.`
              : `Ask the driver to re-upload the ${(docTypeOptions.find(o => o.key === pending.doc.doc_type)?.label ?? pending.doc.doc_type)}.`
          }
          confirmLabel={pending.action === 'approve' ? 'Approve' : pending.action === 'reject' ? 'Reject' : 'Send request'}
          variant={pending.action === 'reject' ? 'danger' : 'default'}
          onConfirm={() => handleAction(pending.action)}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}

// ── Wallet tab ────────────────────────────────────────────────────────────────

interface WalletAdjustModalProps {
  driverId: string
  driverBalance: number
  onClose: () => void
  onSuccess: (updated: Driver) => void
}

function WalletAdjustModal({ driverId, driverBalance, onClose, onSuccess }: WalletAdjustModalProps) {
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [amountStr, setAmountStr] = useState('500')
  const [reason, setReason]       = useState('')
  const [auditNote, setAuditNote] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const amount = Math.max(0, parseInt(amountStr, 10) || 0)
  const amountMinor = amount * 100

  const handleConfirm = async () => {
    if (amount <= 0) { setError('Amount must be greater than 0'); return }
    if (!reason.trim()) { setError('Reason is required'); return }
    setLoading(true); setError('')
    try {
      const result = await driverService.adjustWallet(driverId, {
        direction,
        amount_minor: amountMinor,
        reason: reason.trim(),
        audit_note: auditNote.trim() || undefined,
      })
      onSuccess(result.driver)
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to adjust wallet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="t-label">Driver wallet</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>Adjust wallet</h3>
            <div className="t-meta" style={{ marginTop: 4 }}>Current balance: {formatMoney(driverBalance)}</div>
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          <div>
            <div className="t-label" style={{ marginBottom: 8 }}>Direction</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['credit', 'debit'] as const).map(d => (
                <div
                  key={d}
                  onClick={() => setDirection(d)}
                  style={{
                    flex: 1, padding: '10px 14px',
                    border: `1px solid ${direction === d ? (d === 'credit' ? 'var(--accent)' : 'var(--danger)') : 'var(--rule)'}`,
                    background: direction === d ? `color-mix(in oklab, ${d === 'credit' ? 'var(--accent)' : 'var(--danger)'} 8%, var(--surface))` : 'var(--surface)',
                    borderRadius: 3, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="field-label">Amount ({currencySymbol()})<span style={{ color: 'var(--danger)' }}> *</span></label>
            <div className="input">
              <input
                type="number"
                min={1}
                value={amountStr}
                onChange={e => setAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="500"
              />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Reason<span style={{ color: 'var(--danger)' }}> *</span></label>
            <div className="input">
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Trip earnings adjustment…" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Audit note</label>
            <div className="input">
              <input value={auditNote} onChange={e => setAuditNote(e.target.value)} placeholder="Optional note for the file" />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface-2)' }}>
          <button className="btn sm" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn sm accent" onClick={handleConfirm} disabled={loading || amount <= 0}>
            {loading ? 'Processing…' : `${direction === 'credit' ? 'Credit' : 'Debit'} ${formatMoney(amountMinor)} →`}
          </button>
        </div>
      </div>
    </div>
  )
}

function WalletTab({ driver, onDriverUpdate }: { driver: Driver; onDriverUpdate: (d: Driver) => void }) {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<DriverWalletTransaction[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [showAdjust, setShowAdjust]     = useState(false)

  useEffect(() => {
    setLoading(true)
    driverService.getWalletTransactions(driver.id, { page: 1, per_page: 25 })
      .then(data => { setTransactions(data.items); setTotal(data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [driver.id])

  const reloadTx = () => {
    driverService.getWalletTransactions(driver.id, { page: 1, per_page: 25 })
      .then(data => { setTransactions(data.items); setTotal(data.total) })
      .catch(() => {})
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Balance card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px', marginBottom: 24 }}>
        <div className="t-label" style={{ marginBottom: 8 }}>Driver wallet balance</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, letterSpacing: '-0.018em' }}>
            {formatMoney(driver.wallet_balance_minor)}
          </span>
          <span className="t-meta">current balance</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => setShowAdjust(true)}>Adjust wallet</button>
          <button className="btn sm ghost" onClick={() => navigate(`/payouts/payees/${driver.id}`)}>Payout history</button>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <div className="t-label" style={{ marginBottom: 12 }}>Transaction history · {total}</div>
        {loading && <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>}
        {!loading && transactions.length === 0 && (
          <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No wallet transactions yet.</div>
        )}
        {!loading && transactions.length > 0 && (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Direction</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="num" style={{ color: 'var(--ink-3)' }}>{formatDate(tx.created_at)}</td>
                    <td>
                      {tx.direction === 'credit'
                        ? <span className="badge ok"><span className="dot ok" />Credit</span>
                        : <span className="badge danger"><span className="dot danger" />Debit</span>
                      }
                    </td>
                    <td className="num" style={{ fontFamily: 'var(--font-mono)', color: tx.direction === 'credit' ? 'var(--accent)' : 'var(--danger)' }}>
                      {tx.direction === 'credit' ? '+' : '-'}{formatMoney(tx.amount_minor)}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      <div>{tx.reason}</div>
                      {tx.audit_note && <div className="t-meta" style={{ marginTop: 2 }}>{tx.audit_note}</div>}
                    </td>
                    <td className="t-meta" style={{ color: 'var(--ink-3)' }}>{tx.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdjust && (
        <WalletAdjustModal
          driverId={driver.id}
          driverBalance={driver.wallet_balance_minor}
          onClose={() => setShowAdjust(false)}
          onSuccess={updated => { onDriverUpdate(updated); reloadTx() }}
        />
      )}
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ driver, isMobile, onAdjustWallet }: { driver: Driver; isMobile: boolean; onAdjustWallet: () => void }) {
  const navigate = useNavigate()
  const isTablet  = useIsTablet()
  const [docs, setDocs] = useState<DriverDocument[]>([])
  const [docTypeOptions, setDocTypeOptions] = useState<DocTypeItem[]>([])

  useEffect(() => {
    Promise.all([
      driverService.getDocuments(driver.id),
      kycService.getDocTypes(),
    ])
      .then(([docsData, types]) => {
        setDocs(docsData.items)
        setDocTypeOptions(types.driver)
      })
      .catch(() => {})
  }, [driver.id])

  return (
    <div style={{
      padding: isMobile ? '16px' : '24px 32px',
      display: 'grid',
      gridTemplateColumns: isMobile || isTablet ? '1fr' : '1.5fr 1fr',
      gap: 24,
    }}>
      {/* Left column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Performance chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Performance</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Rating & acceptance · last 8 weeks</h3>
          </div>
          <div style={{ height: 200, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500 }}>No data yet</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6 }}>
                Weekly rating & acceptance chart will appear once the Bookings module is connected.
              </div>
            </div>
          </div>
        </div>

        {/* Recent trips stub */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Recent trips</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Last 6 trips</h3>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>When</th><th>Customer</th><th>Route</th><th>Fare</th><th>Earn</th><th>Rated</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '24px 0', fontSize: 13 }}>
                  Trips will be available after the bookings module is integrated
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Right column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Linked vehicle */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="t-label">Linked vehicle</div>
            <button className="btn sm ghost"><Icon name="external" size={11} />Vehicle file</button>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 56, height: 40, background: 'var(--surface-sunk)', border: '1px solid var(--rule-strong)',
              borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="car" size={20} style={{ color: 'var(--ink-3)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>
                {driver.vehicle_class ?? 'Unknown class'}
              </div>
              <div className="t-meta" style={{ marginTop: 3 }}>{driver.vehicle_plate ?? '—'}</div>
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['RC', '—'], ['Insurance', '—'], ['Permit', '—'], ['Fitness', '—']].map(([k, v]) => (
              <div key={k}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div className="t-meta" style={{ marginTop: 3, color: 'var(--ink-2)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Documents quick view */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Documents</div>
          {docs.length === 0 && (
            <div className="t-meta" style={{ color: 'var(--ink-3)' }}>No documents uploaded.</div>
          )}
          {docs.map((doc, i) => (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 0', borderBottom: i < docs.length - 1 ? '1px solid var(--rule-soft)' : 'none',
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 3, background: 'var(--surface-sunk)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--rule)', flexShrink: 0,
              }}>
                <Icon name="shield" size={13} style={{ color: 'var(--accent)' }} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>{(docTypeOptions.find(o => o.key === doc.doc_type)?.label ?? doc.doc_type)}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>
                  {doc.doc_number ?? '—'}
                  {doc.expiry_date ? ` · until ${formatDate(doc.expiry_date)}` : ''}
                </div>
              </div>
              {doc.status === 'ok' && <span className="badge ok"><span className="dot ok" />OK</span>}
              {doc.status === 'pending' && <span className="badge warn"><span className="dot warn" />Pending</span>}
              {doc.status === 'rejected' && <span className="badge danger"><span className="dot danger" />Rejected</span>}
              {doc.status === 'expired' && <span className="badge danger"><span className="dot danger" />Expired</span>}
            </div>
          ))}
          {docs.length > 0 && (
            <button
              className="btn sm ghost"
              style={{ marginTop: 12 }}
              onClick={() => navigate(`/drivers/${driver.id}/documents/${docs[0].id}`)}
            >
              View all documents
            </button>
          )}
        </div>

        {/* Wallet card */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="t-label" style={{ marginBottom: 8 }}>Driver wallet</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, letterSpacing: '-0.018em' }}>
              {formatMoney(driver.wallet_balance_minor)}
            </span>
            <span className="t-meta">current balance</span>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button className="btn sm" onClick={onAdjustWallet}>Adjust wallet</button>
            <button className="btn sm ghost" onClick={() => navigate(`/payouts/payees/${driver.id}`)}>Payout history</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Vehicle tab ───────────────────────────────────────────────────────────────

function VehicleTab({ driver, navigate }: { driver: Driver; navigate: (p: string) => void }) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!driver.vehicle_plate) return
    setLoading(true)
    vehicleService.listVehicles({ search: driver.vehicle_plate, per_page: 5 })
      .then(res => setVehicle(res.items.find((v: Vehicle) => v.plate_no === driver.vehicle_plate) ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [driver.vehicle_plate])

  if (!driver.vehicle_plate && !driver.vehicle_class) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '32px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          No vehicle linked to this driver.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="t-label">Linked vehicle</span>
          {vehicle && (
            <button className="btn sm ghost" onClick={() => navigate(`/vehicles/${vehicle.id}`)}>
              <Icon name="external" size={11} /> Open vehicle file
            </button>
          )}
        </div>
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {([
            { label: 'Plate number',   value: driver.vehicle_plate ?? '—', mono: true },
            { label: 'Vehicle class',  value: driver.vehicle_class ?? '—', mono: false },
            { label: 'Make / model',   value: vehicle ? `${vehicle.make} ${vehicle.model}` : (loading ? 'Loading…' : '—'), mono: false },
            { label: 'Year',           value: vehicle ? String(vehicle.year) : '—', mono: false },
            { label: 'Color',          value: vehicle?.color ?? '—', mono: false },
            { label: 'Vehicle status', value: vehicle?.status ?? '—', mono: false },
            { label: 'Doc status',     value: vehicle?.doc_status ?? '—', mono: false },
            { label: 'Odometer',       value: vehicle ? `${vehicle.odometer_km.toLocaleString('en-IN')} km` : '—', mono: false },
          ] as { label: string; value: string; mono: boolean }[]).map(({ label, value, mono }) => (
            <div key={label}>
              <div className="t-label" style={{ padding: 0 }}>{label}</div>
              <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value}</div>
            </div>
          ))}
        </div>
        {vehicle && (
          <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {vehicle.status === 'active'    && <span className="badge ok"><span className="dot ok" />Active</span>}
            {vehicle.status === 'suspended' && <span className="badge danger"><span className="dot danger" />Grounded</span>}
            {vehicle.status === 'pending'   && <span className="badge info"><span className="dot info" />Pending</span>}
            {vehicle.doc_status === 'ok'       && <span className="badge ok"><span className="dot ok" />Docs valid</span>}
            {vehicle.doc_status === 'expiring' && <span className="badge warn"><span className="dot warn" />Docs expiring</span>}
            {vehicle.doc_status === 'expired'  && <span className="badge danger"><span className="dot danger" />Docs expired</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Performance tab ───────────────────────────────────────────────────────────

function PerformanceTab({ driver }: { driver: Driver }) {
  const metrics = [
    { label: 'Total trips',       value: driver.trips_count.toLocaleString('en-IN'), sub: 'all time', color: 'var(--ink)' },
    { label: 'Rating',            value: driver.rating != null ? driver.rating.toFixed(2) : '—', sub: 'avg passenger rating', color: driver.rating != null && driver.rating >= 4.5 ? 'var(--accent)' : driver.rating != null && driver.rating < 4.0 ? 'var(--danger)' : 'var(--ink)' },
    { label: 'Acceptance rate',   value: driver.acceptance_rate != null ? `${(driver.acceptance_rate * 100).toFixed(1)}%` : '—', sub: 'requests accepted', color: driver.acceptance_rate != null && driver.acceptance_rate < 0.7 ? 'var(--danger)' : 'var(--ink-2)' },
    { label: 'Cancellation rate', value: `${(driver.cancellation_rate * 100).toFixed(1)}%`, sub: 'cancelled after accept', color: driver.cancellation_rate > 0.1 ? 'var(--danger)' : 'var(--ink-2)' },
  ]

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {metrics.map((m, i) => (
          <div key={m.label} style={{ padding: '20px 24px', borderRight: i < metrics.length - 1 ? '1px solid var(--rule)' : 'none' }}>
            <div className="t-label" style={{ padding: 0 }}>{m.label}</div>
            <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: m.color }}>{m.value}</div>
            <div className="t-meta" style={{ marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)' }}>
          <span className="t-label">Auto-suspension threshold check</span>
        </div>
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {([
            { label: 'Cancellation rate', value: `${(driver.cancellation_rate * 100).toFixed(1)}%`, bad: driver.cancellation_rate > 0.1, note: '>10% triggers review' },
            { label: 'Acceptance rate',   value: driver.acceptance_rate != null ? `${(driver.acceptance_rate * 100).toFixed(1)}%` : '—', bad: driver.acceptance_rate != null && driver.acceptance_rate < 0.7, note: '<70% triggers review' },
            { label: 'Rating',            value: driver.rating != null ? driver.rating.toFixed(2) : '—', bad: driver.rating != null && driver.rating < 4.0, note: '<4.0 triggers review' },
          ] as { label: string; value: string; bad: boolean; note: string }[]).map(({ label, value, bad, note }) => (
            <div key={label} style={{
              padding: '12px 16px', borderRadius: 3,
              background: bad ? 'color-mix(in oklab, var(--danger) 6%, var(--surface))' : 'var(--surface-2)',
              border: `1px solid ${bad ? 'color-mix(in oklab, var(--danger) 30%, var(--rule))' : 'var(--rule)'}`,
            }}>
              <div className="t-label" style={{ padding: 0 }}>{label}</div>
              <div style={{ marginTop: 6, fontSize: 20, fontFamily: 'var(--font-serif)', color: bad ? 'var(--danger)' : 'var(--ink)' }}>{value}</div>
              <div style={{ marginTop: 4, fontSize: 11.5, color: bad ? 'var(--danger)' : 'var(--ink-3)' }}>
                {bad ? `⚠ Below threshold — ${note}` : note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Trips tab ─────────────────────────────────────────────────────────────────

function TripsTab({ driver }: { driver: Driver }) {
  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {[
          { label: 'Total trips', value: driver.trips_count.toLocaleString('en-IN'), sub: 'all time' },
          { label: 'Rating',      value: driver.rating != null ? driver.rating.toFixed(2) : '—', sub: 'avg passenger rating' },
        ].map((m, i) => (
          <div key={m.label} style={{ padding: '20px 24px', borderRight: i === 0 ? '1px solid var(--rule)' : 'none' }}>
            <div className="t-label" style={{ padding: 0 }}>{m.label}</div>
            <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400 }}>{m.value}</div>
            <div className="t-meta" style={{ marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>Detailed trip history</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
          Per-trip records will appear here once the Bookings module links completed rides to this driver.
        </div>
      </div>
    </div>
  )
}

// ── Earnings tab ──────────────────────────────────────────────────────────────

function EarningsTab({ driver }: { driver: Driver }) {
  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {[
          { label: 'Wallet balance', value: formatMoney(driver.wallet_balance_minor), sub: 'current balance', color: 'var(--accent)' },
          { label: 'Total trips',    value: driver.trips_count.toLocaleString('en-IN'), sub: 'completed rides', color: 'var(--ink)' },
        ].map((m, i) => (
          <div key={m.label} style={{ padding: '20px 24px', borderRight: i === 0 ? '1px solid var(--rule)' : 'none' }}>
            <div className="t-label" style={{ padding: 0 }}>{m.label}</div>
            <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: m.color }}>{m.value}</div>
            <div className="t-meta" style={{ marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>Earnings breakdown</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
          Per-trip earnings and payout history will appear here once the Payouts module is connected.
          Use the Wallet tab to view manual wallet adjustments.
        </div>
      </div>
    </div>
  )
}

// ── Disciplinary tab ──────────────────────────────────────────────────────────

function DisciplinaryTab({ driverId, driver }: { driverId: string; driver: Driver }) {
  const [events, setEvents]   = useState<AuditEventSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auditService.listEvents({ target: `driver:${driverId}`, per_page: 100, time_window: 'all' })
      .then(res => setEvents(
        res.items.filter((e: AuditEventSummary) =>
          e.action.includes('suspend') || e.action.includes('deactivate') ||
          e.action.includes('reject')  || e.action.includes('reactivate') ||
          e.action.includes('force_offline')
        )
      ))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [driverId])

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {driver.flag_reason && (
        <div style={{ padding: '12px 16px', background: 'color-mix(in oklab, var(--danger) 7%, var(--surface))', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 13, color: 'var(--danger)' }}>
          <strong>Current flag reason:</strong> {driver.flag_reason}
        </div>
      )}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="t-label">Suspension &amp; action history</span>
          {!loading && <span className="badge info">{events.length} events</span>}
        </div>
        {loading ? (
          <div style={{ padding: '24px 20px', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
        ) : events.length === 0 ? (
          <div style={{ padding: '24px 20px', color: 'var(--ink-3)', fontSize: 13 }}>No disciplinary actions recorded for this driver.</div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="tbl">
              <thead><tr><th>Action</th><th>By</th><th>When</th><th>IP</th></tr></thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 7px', borderRadius: 2,
                        background: ev.action.includes('suspend') || ev.action.includes('deactivate') || ev.action.includes('reject') ? 'color-mix(in oklab, var(--danger) 10%, var(--surface))' : 'var(--accent-soft)',
                        color: ev.action.includes('suspend') || ev.action.includes('deactivate') || ev.action.includes('reject') ? 'var(--danger)' : 'var(--accent)',
                        border: `1px solid ${ev.action.includes('suspend') || ev.action.includes('deactivate') || ev.action.includes('reject') ? 'color-mix(in oklab, var(--danger) 28%, var(--rule))' : 'color-mix(in oklab, var(--accent) 28%, var(--rule))'}`,
                      }}>{ev.action}</span>
                    </td>
                    <td style={{ fontSize: 13 }}>{ev.actor_name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                      {new Date(ev.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{ev.source_ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Audit tab ─────────────────────────────────────────────────────────────────

function AuditTab({ driverId }: { driverId: string }) {
  const [events, setEvents]   = useState<AuditEventSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auditService.listEvents({ target: `driver:${driverId}`, per_page: 100, time_window: 'all' })
      .then(res => setEvents(res.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [driverId])

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="t-label">All admin actions on this driver</span>
          {!loading && events.length > 0 && <span className="badge info">{events.length} events</span>}
        </div>
        {loading ? (
          <div style={{ padding: '24px 20px', color: 'var(--ink-3)', fontSize: 13 }}>Loading audit events…</div>
        ) : events.length === 0 ? (
          <div style={{ padding: '24px 20px', color: 'var(--ink-3)', fontSize: 13 }}>No audit events recorded for this driver yet.</div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="tbl" style={{ minWidth: 600 }}>
              <thead><tr><th>Action</th><th>Actor</th><th>Severity</th><th>When</th><th>IP</th></tr></thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>{ev.action}</span></td>
                    <td style={{ fontSize: 13 }}>{ev.actor_name}</td>
                    <td>
                      {ev.severity === 'high' && <span className="badge danger"><span className="dot danger" />High</span>}
                      {ev.severity === 'med'  && <span className="badge warn"><span className="dot warn" />Med</span>}
                      {ev.severity === 'low'  && <span className="badge"><span className="dot" />Low</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                      {new Date(ev.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{ev.source_ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Support tickets tab ───────────────────────────────────────────────────────

function DriverTicketsTab({ driverId }: { driverId: string }) {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supportService.listTickets({ requester_id: driverId, page: 1, page_size: 50 })
      .then(r => { setTickets(r.items); setTotal(r.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [driverId])

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>Loading tickets…</div>
  if (tickets.length === 0) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>No support tickets raised by this driver.</div>

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ padding: '12px 0 8px', fontSize: 13, color: 'var(--ink-2)' }}>
        {total} ticket{total !== 1 ? 's' : ''}
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="tbl" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Subject</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>SLA</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/support/${t.id}`)}>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{t.ticket_ref}</span></td>
                <td style={{ maxWidth: 220 }}><span style={{ fontSize: 13 }}>{t.subject}</span></td>
                <td><span className="badge">{t.category.replace(/_/g, ' ')}</span></td>
                <td>
                  <span className={t.priority === 'urgent' ? 'badge danger' : t.priority === 'high' ? 'badge warn' : t.priority === 'med' ? 'badge info' : 'badge'}>
                    {t.priority.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className={t.status === 'open' ? 'badge info' : t.status === 'in_progress' ? 'badge warn' : t.status === 'resolved' ? 'badge ok' : 'badge'}>
                    {t.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  {t.sla_due_at
                    ? <span style={{ fontSize: 12, color: t.sla_breached ? 'var(--danger,#e53e3e)' : 'var(--ink-3)' }}>
                        {t.sla_breached ? 'Breached' : new Date(t.sla_due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    : <span style={{ color: 'var(--ink-4)' }}>—</span>}
                </td>
                <td><span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{new Date(t.created_at).toLocaleDateString()}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'documents' | 'vehicle' | 'performance' | 'earnings' | 'trips' | 'wallet' | 'disciplinary' | 'audit' | 'tickets'

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const isTablet  = useIsTablet()

  const [driver, setDriver]   = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const [showSuspendModal, setShowSuspendModal]             = useState(false)
  const [showRejectModal, setShowRejectModal]               = useState(false)
  const [showForceOfflineDialog, setShowForceOfflineDialog] = useState(false)
  const [showReactivateDialog, setShowReactivateDialog]     = useState(false)
  const [showApproveDialog, setShowApproveDialog]           = useState(false)
  const [showDeactivateModal, setShowDeactivateModal]       = useState(false)
  const [showEditModal, setShowEditModal]                   = useState(false)
  const [showWalletAdjust, setShowWalletAdjust]             = useState(false)
  const [apiError, setApiError]                             = useState('')
  const [docCount, setDocCount]                             = useState(0)

  // Catalog dropdown options (loaded once when edit modal first opens)
  const [zoneOptions, setZoneOptions]       = useState<SelectOption[]>([])
  const [vehicleOptions, setVehicleOptions] = useState<SelectOption[]>([])
  const [optionsLoaded, setOptionsLoaded]   = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', city: '', zone_code: '', vehicle_class: '', vehicle_plate: '' })
  const [editError, setEditError]   = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const canReviewKyc = usePermission('drivers.kyc.review')
  const canSuspendDriver = usePermission('drivers.suspend')
  const canApproveDriver = usePermission('drivers.approve')

  const loadDriver = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await driverService.getDriver(id)
      setDriver(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadDriver() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load catalog options for zone / vehicle-class dropdowns (once per page load)
  useEffect(() => {
    if (!showEditModal || optionsLoaded) return
    Promise.all([
      catalogService.listServiceZones(),
      catalogService.listVehicleClasses(),
    ]).then(([zones, classes]) => {
      setZoneOptions(zones.filter(z => z.is_active).map(z => ({ value: z.code, label: `${z.code} — ${z.name}` })))
      setVehicleOptions(classes.filter(c => c.is_active).map(c => ({ value: c.name, label: c.name })))
      setOptionsLoaded(true)
    }).catch(() => {})
  }, [showEditModal, optionsLoaded])

  useEffect(() => {
    if (!id) return
    driverService.getDocuments(id)
      .then(data => setDocCount(data.items.length))
      .catch(() => {})
  }, [id])

  const handleSuspend = async (reason: string) => {
    if (!driver) return
    setApiError('')
    try {
      const updated = await driverService.suspendDriver(driver.id, reason)
      setDriver(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to suspend driver')
    }
    setShowSuspendModal(false)
  }

  const handleForceOffline = async () => {
    if (!driver) return
    setApiError('')
    try {
      const updated = await driverService.forceOffline(driver.id)
      setDriver(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to force offline')
    }
    setShowForceOfflineDialog(false)
  }

  const handleReactivate = async () => {
    if (!driver) return
    setApiError('')
    try {
      const updated = await driverService.reactivateDriver(driver.id)
      setDriver(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to reactivate driver')
    }
    setShowReactivateDialog(false)
  }

  const handleApprove = async () => {
    if (!driver) return
    setApiError('')
    try {
      await driverService.approveDriver(driver.id)
      await loadDriver()          // Force fresh state so Approve button vanishes immediately
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to approve driver')
    }
    setShowApproveDialog(false)
  }

  const handleReject = async (reason: string) => {
    if (!driver) return
    setApiError('')
    try {
      await driverService.rejectDriver(driver.id, reason)
      await loadDriver()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to reject driver')
    }
    setShowRejectModal(false)
  }

  const handleDeactivate = async (reason: string) => {
    if (!driver) return
    setApiError('')
    try {
      const updated = await driverService.deactivateDriver(driver.id, reason)
      setDriver(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to deactivate driver')
    }
    setShowDeactivateModal(false)
  }

  const handleEditOpen = () => {
    if (!driver) return
    setEditForm({
      name:          driver.name,
      phone:         driver.phone,
      email:         driver.email         ?? '',
      city:          driver.city          ?? '',
      zone_code:     driver.zone_code     ?? '',
      vehicle_class: driver.vehicle_class ?? '',
      vehicle_plate: driver.vehicle_plate ?? '',
    })
    setEditError('')
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    if (!driver) return
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      setEditError('Name and phone are required')
      return
    }
    setEditSaving(true); setEditError('')
    try {
      const updated = await driverService.updateDriver(driver.id, {
        name:          editForm.name.trim(),
        phone:         editForm.phone.trim(),
        email:         editForm.email.trim()         || undefined,
        city:          editForm.city.trim()          || undefined,
        zone_code:     editForm.zone_code.trim()     || undefined,
        vehicle_class: editForm.vehicle_class.trim() || undefined,
        vehicle_plate: editForm.vehicle_plate.trim() || undefined,
      })
      setDriver(updated)
      setShowEditModal(false)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setEditError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to save changes')
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return (
      <Shell activeId="drivers" breadcrumb="People & Fleet · Drivers" title="Loading…">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading driver…</div>
      </Shell>
    )
  }

  if (!driver) {
    return (
      <Shell activeId="drivers" breadcrumb="People & Fleet · Drivers" title="Not found">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>
          Driver not found.{' '}
          <button className="btn sm ghost" onClick={() => navigate('/drivers')}>← Back to drivers</button>
        </div>
      </Shell>
    )
  }

  // Only show Approve when the driver is genuinely awaiting activation
  const canApprove    = driver.status === 'pending' || driver.status === 'in_review'
  // Suspend makes sense for live / onboarding drivers, not already-suspended or deactivated
  const canSuspend    = driver.status === 'active' || driver.status === 'in_review' || driver.status === 'approved'
  const canReactivate = driver.status === 'suspended'
  // Deactivate only when suspended (permanent step)
  const canDeactivate = driver.status === 'suspended'
  // Reject for pending / in_review drivers
  const canReject     = driver.status === 'pending' || driver.status === 'in_review'

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview',      label: 'Overview' },
    { key: 'documents',     label: `Documents · ${docCount}` },
    { key: 'vehicle',       label: 'Vehicle' },
    { key: 'performance',   label: 'Performance' },
    { key: 'earnings',      label: 'Earnings' },
    { key: 'trips',         label: 'Trips' },
    { key: 'wallet',        label: 'Wallet' },
    { key: 'disciplinary',  label: 'Disciplinary' },
    { key: 'audit',         label: 'Audit' },
    { key: 'tickets',       label: 'Support tickets' },
  ]

  return (
    <Shell
      activeId="drivers"
      breadcrumb="People & Fleet · Drivers"
      title={driver.name}
      subtitle={`${driver.driver_code ?? '—'} · ${driver.vehicle_class ?? '—'} · ${driver.city ?? '—'} · ${driver.zone_code ?? '—'} · ${tenure(driver.joined_at)} · ${driver.trips_count.toLocaleString()} trips${driver.rating != null ? ` · ${driver.rating.toFixed(2)} ★` : ''}`}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Approve — only when pending / in_review, disappears once active */}
          {canApprove && (
            <button className="btn sm accent" onClick={() => setShowApproveDialog(true)}>
              <Icon name="check" size={13} />Approve
            </button>
          )}

          {/* Reject — alongside Approve for pending / in_review */}
          {canReject && (
            <button
              className="btn sm"
              style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 40%, var(--rule))' }}
              onClick={() => setShowRejectModal(true)}
            >
              Reject
            </button>
          )}

          {/* Active-driver actions */}
          {driver.online_status === 'online' && (
            <button className="btn sm" onClick={() => setShowForceOfflineDialog(true)}>Force offline</button>
          )}
          {canSuspend && (
            <button
              className="btn sm"
              style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 40%, var(--rule))' }}
              onClick={() => setShowSuspendModal(true)}
            >
              Suspend
            </button>
          )}

          {/* Suspended-driver actions */}
          {canReactivate && (
            <button className="btn sm accent" onClick={() => setShowReactivateDialog(true)}>Reactivate</button>
          )}
          {canDeactivate && (
            <button className="btn sm ghost" style={{ color: 'var(--ink-3)' }} onClick={() => setShowDeactivateModal(true)}>Deactivate</button>
          )}

          <button className="btn sm" onClick={handleEditOpen}>Edit</button>
        </div>
      }
    >
      <div>
        {/* API error */}
        {apiError && (
          <div style={{
            margin: '12px 32px 0', padding: '10px 14px', background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span>{apiError}</span>
            <button className="btn ghost icon sm" onClick={() => setApiError('')}><Icon name="x" size={12} /></button>
          </div>
        )}

        {/* Hero card */}
        <div style={{
          background: 'var(--surface)', borderBottom: '1px solid var(--rule)',
          padding: isMobile ? '20px 16px' : '28px 32px',
          display: 'grid',
          gridTemplateColumns: isMobile || isTablet ? '1fr' : '380px 1fr',
          gap: 36,
        }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div
              className="avatar xl"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))' }}
            >
              {getInitials(driver.name)}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                {driver.online_status === 'online'
                  ? <span className="badge ok"><span className="dot ok" />Online</span>
                  : <span className="badge"><span className="dot pending" />Offline</span>
                }
                {driver.kyc_status === 'approved' && <span className="badge"><span className="dot ok" />KYC OK</span>}
                {driver.kyc_status === 'expiring' && <span className="badge warn"><span className="dot warn" />KYC Expiring</span>}
                {driver.kyc_status === 'rejected' && <span className="badge danger"><span className="dot danger" />KYC Rejected</span>}
                {(driver.rating ?? 0) >= 4.8 && <span className="badge"><Icon name="shield" size={9} /> Top 5%</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.020em', lineHeight: 1.05 }}>
                {driver.name}
              </div>
              <div className="t-meta" style={{ marginTop: 6 }}>
                {driver.driver_code} · {driver.phone}{driver.email ? ` · ${driver.email}` : ''}
              </div>
              <div className="t-meta" style={{ marginTop: 2 }}>
                Onboarded {formatDate(driver.joined_at)}{driver.city ? ` · ${driver.city}` : ''}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
            gap: 0, alignSelf: 'center',
          }}>
            {[
              { k: 'Total trips',   v: driver.trips_count.toLocaleString(), m: 'All time',                   c: 'var(--ink)' },
              { k: 'Rating',        v: driver.rating != null ? `${driver.rating.toFixed(2)} ★` : '—',        m: 'Driver avg',                 c: 'var(--accent)' },
              { k: 'Acceptance',    v: driver.acceptance_rate != null ? `${driver.acceptance_rate.toFixed(0)}%` : '—', m: 'Last 30 days',        c: 'var(--accent)' },
              { k: 'Cancellation',  v: `${driver.cancellation_rate.toFixed(1)}%`,                            m: driver.cancellation_rate < 3 ? 'Below floor' : 'Monitor', c: 'var(--ink-2)' },
              { k: 'Wallet balance', v: formatMoney(driver.wallet_balance_minor),                             m: 'Current balance',            c: 'var(--ink)' },
            ].map(({ k, v, m, c }, i) => (
              <div key={k} style={{
                padding: isMobile ? '12px 10px' : '0 18px',
                borderRight: isMobile ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none') : (i < 4 ? '1px solid var(--rule)' : 'none'),
                borderTop: isMobile && i >= 2 ? '1px solid var(--rule)' : 'none',
              }}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: c }}>{v}</div>
                <div className="t-meta" style={{ marginTop: 6 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          padding: isMobile ? '0 4px' : '0 32px',
          borderBottom: '1px solid var(--rule)',
          background: 'var(--surface)',
          display: 'flex',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          {TABS.map(({ key, label }) => {
            const active = activeTab === key
            return (
              <div
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: isMobile ? '12px 14px' : '14px 18px',
                  fontSize: 13,
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: active ? 500 : 400,
                  borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: -1,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {label}
              </div>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview'     && (
          <OverviewTab
            driver={driver}
            isMobile={isMobile}
            onAdjustWallet={() => setShowWalletAdjust(true)}
          />
        )}
        {activeTab === 'documents'    && id && <DocumentsTab driverId={id} navigate={navigate} />}
        {activeTab === 'wallet'       && <WalletTab driver={driver} onDriverUpdate={setDriver} />}
        {activeTab === 'vehicle'      && <VehicleTab driver={driver} navigate={navigate} />}
        {activeTab === 'performance'  && <PerformanceTab driver={driver} />}
        {activeTab === 'earnings'     && <EarningsTab driver={driver} />}
        {activeTab === 'trips'        && <TripsTab driver={driver} />}
        {activeTab === 'disciplinary' && id && <DisciplinaryTab driverId={id} driver={driver} />}
        {activeTab === 'audit'        && id && <AuditTab driverId={id} />}
        {activeTab === 'tickets'      && id && <DriverTicketsTab driverId={id} />}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <ReasonModal
          title={`Reject ${driver.name}`}
          placeholder="Reason for rejection (required)…"
          confirmLabel="Reject driver"
          variant="danger"
          onConfirm={handleReject}
          onCancel={() => setShowRejectModal(false)}
        />
      )}

      {/* Suspend modal */}
      {showSuspendModal && (
        <ReasonModal
          title={`Suspend ${driver.name}`}
          placeholder="Reason for suspension (required)…"
          confirmLabel="Suspend"
          variant="danger"
          onConfirm={handleSuspend}
          onCancel={() => setShowSuspendModal(false)}
        />
      )}

      {/* Force offline confirm */}
      <ConfirmDialog
        open={showForceOfflineDialog}
        title="Force offline"
        description={`Force ${driver.name} to go offline immediately. Their current trip (if any) will not be interrupted.`}
        confirmLabel="Force offline"
        variant="danger"
        onConfirm={handleForceOffline}
        onCancel={() => setShowForceOfflineDialog(false)}
      />

      {/* Reactivate confirm */}
      <ConfirmDialog
        open={showReactivateDialog}
        title="Reactivate driver"
        description={`Restore ${driver.name}'s account. They will be able to go online immediately.`}
        confirmLabel="Reactivate"
        variant="default"
        onConfirm={handleReactivate}
        onCancel={() => setShowReactivateDialog(false)}
      />

      {/* Approve driver */}
      <ConfirmDialog
        open={showApproveDialog}
        title="Approve driver"
        description={`Approve ${driver.name} as an active driver. All required documents must be verified. They will receive a driver code and can go online immediately.`}
        confirmLabel="Approve driver"
        variant="default"
        onConfirm={handleApprove}
        onCancel={() => setShowApproveDialog(false)}
      />

      {/* Deactivate modal */}
      {showDeactivateModal && (
        <ReasonModal
          title={`Deactivate ${driver.name}`}
          placeholder="Reason for deactivation (required)…"
          confirmLabel="Deactivate permanently"
          variant="danger"
          onConfirm={handleDeactivate}
          onCancel={() => setShowDeactivateModal(false)}
        />
      )}

      {/* Edit driver modal */}
      {showEditModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--rule-strong)', boxShadow: 'var(--shadow-pop)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>Edit driver</h3>
              <button className="btn ghost icon sm" onClick={() => setShowEditModal(false)}><Icon name="x" size={14} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {editError && (
                <div style={{ padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
                  {editError}
                </div>
              )}
              <div className="field">
                <label className="field-label">Full name<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
                <div className="input"><input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
              </div>
              <div className="field">
                <label className="field-label">Phone<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
                <div className="input"><input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div className="field">
                <label className="field-label">Email</label>
                <div className="input"><input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <div className="field">
                <label className="field-label">City</label>
                <div className="input"><input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} /></div>
              </div>
              <div className="field">
                <label className="field-label">Zone</label>
                <SearchableSelect
                  value={editForm.zone_code}
                  onChange={v => setEditForm(f => ({ ...f, zone_code: v }))}
                  options={zoneOptions}
                  loading={showEditModal && !optionsLoaded}
                  placeholder="Search zone…"
                />
              </div>
              <div className="field">
                <label className="field-label">Vehicle class</label>
                <SearchableSelect
                  value={editForm.vehicle_class}
                  onChange={v => setEditForm(f => ({ ...f, vehicle_class: v }))}
                  options={vehicleOptions}
                  loading={showEditModal && !optionsLoaded}
                  placeholder="Search vehicle class…"
                />
              </div>
              <div className="field">
                <label className="field-label">Vehicle plate</label>
                <div className="input"><input value={editForm.vehicle_plate} onChange={e => setEditForm(f => ({ ...f, vehicle_plate: e.target.value }))} /></div>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface-2)' }}>
              <button className="btn sm" onClick={() => setShowEditModal(false)} disabled={editSaving}>Cancel</button>
              <button className="btn sm accent" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet adjust from overview */}
      {showWalletAdjust && id && (
        <WalletAdjustModal
          driverId={id}
          driverBalance={driver.wallet_balance_minor}
          onClose={() => setShowWalletAdjust(false)}
          onSuccess={updated => setDriver(updated)}
        />
      )}
    </Shell>
  )
}
