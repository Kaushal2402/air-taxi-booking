import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import SearchableSelect from '../../components/ui/SearchableSelect'
import type { SelectOption } from '../../components/ui/SearchableSelect'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { driverService } from '../../services/driverService'
import type { OnboardingDriverItem, DocType } from '../../services/driverService'
import { catalogService } from '../../services/catalogService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
}

const DOC_LABELS: Record<DocType, string> = {
  pan: 'PAN',
  license: 'LIC',
  rc: 'RC',
  insurance: 'INS',
  permit: 'PER',
  photo: 'PHO',
}

const STAGES: string[] = ['signup', 'docs', 'review', 'background', 'approved']

// ── Reason modal ──────────────────────────────────────────────────────────────

interface ReasonModalProps {
  title: string
  placeholder: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

function ReasonModal({ title, placeholder, onConfirm, onCancel }: ReasonModalProps) {
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
            onKeyDown={e => { if (e.key === 'Enter' && reason.trim()) onConfirm(reason.trim()) }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn sm" onClick={onCancel}>Cancel</button>
          <button
            className="btn sm danger"
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()) }}
            disabled={!reason.trim()}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Queue card ────────────────────────────────────────────────────────────────

interface QueueCardProps {
  item: OnboardingDriverItem
  index: number
  isMobile: boolean
  onReview: (item: OnboardingDriverItem) => void
  onReject: (item: OnboardingDriverItem) => void
  onReupload: (item: OnboardingDriverItem) => void
}

function QueueCard({ item, index, isMobile, onReview, onReject, onReupload }: QueueCardProps) {
  const navigate = useNavigate()
  const curIdx = STAGES.indexOf(item.stage)

  // Doc status color helpers
  const docBg = (s: string) => {
    if (s === 'ok') return 'var(--accent-soft)'
    if (s === 'pending') return 'var(--warn-soft)'
    if (s === 'rejected' || s === 'expired') return 'var(--danger-soft)'
    return 'var(--surface-2)'
  }
  const docColor = (s: string) => {
    if (s === 'ok') return 'var(--accent)'
    if (s === 'pending') return 'var(--warn)'
    if (s === 'rejected' || s === 'expired') return 'var(--danger)'
    return 'var(--ink-3)'
  }
  const docDot = (s: string) => {
    if (s === 'ok') return 'ok'
    if (s === 'pending') return 'warn'
    return 'danger'
  }

  const docMap: Record<DocType, string> = { pan: 'pending', license: 'pending', rc: 'pending', insurance: 'pending', permit: 'pending', photo: 'pending' }
  item.documents.forEach(d => { docMap[d.doc_type] = d.status })

  const slaBadgeClass = item.sla_status === 'danger' ? 'danger' : item.sla_status === 'warn' ? 'warn' : 'ok'
  const slaLabel = item.sla_status === 'danger' ? 'SLA breach' : item.sla_status === 'warn' ? 'SLA risk' : 'SLA ok'

  if (isMobile) {
    return (
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--rule-soft)',
        background: index === 0 ? 'var(--accent-soft-2)' : 'transparent',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div className="avatar" style={index === 0 ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'var(--surface-sunk)' }}>
            {getInitials(item.name)}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{ fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}
              onClick={() => navigate(`/drivers/${item.id}`)}
            >
              {item.name}
            </div>
            <div className="t-meta" style={{ marginTop: 2 }}>{item.phone}</div>
            <div className="t-meta" style={{ marginTop: 2 }}>
              {item.city}{item.zone_code ? ` · ${item.zone_code}` : ''}{item.vehicle_class ? ` · ${item.vehicle_class}` : ''}
            </div>
          </div>
          <span className={`badge ${slaBadgeClass}`}>
            <span className={`dot ${slaBadgeClass}`} />{slaLabel}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {(Object.keys(docMap) as DocType[]).map(k => (
            <span
              key={k}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 6px',
                background: docBg(docMap[k]),
                border: `1px solid color-mix(in oklab, ${docColor(docMap[k])} 30%, var(--rule))`,
                borderRadius: 2,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                color: docColor(docMap[k]),
              }}
            >
              <span className={`dot ${docDot(docMap[k])}`} style={{ width: 5, height: 5, boxShadow: 'none' }} />
              {DOC_LABELS[k]}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn accent sm" style={{ flex: 1 }} onClick={() => onReview(item)}>Review →</button>
          <button className="btn sm" style={{ flex: 1 }} onClick={() => onReupload(item)}>Re-upload</button>
          <button className="btn sm ghost" style={{ color: 'var(--danger)' }} onClick={() => onReject(item)}>Reject</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      padding: '18px 20px',
      borderBottom: '1px solid var(--rule-soft)',
      display: 'grid',
      gridTemplateColumns: '1.2fr 1.4fr 1fr 1.6fr auto',
      gap: 20,
      alignItems: 'center',
      background: index === 0 ? 'var(--accent-soft-2)' : 'transparent',
    }}>
      {/* Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          className="avatar lg"
          style={index === 0 ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'var(--surface-sunk)' }}
        >
          {getInitials(item.name)}
        </div>
        <div>
          <div
            style={{ fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}
            onClick={() => navigate(`/drivers/${item.id}`)}
          >
            {item.name}
          </div>
          <div className="t-meta" style={{ marginTop: 2 }}>{item.phone}</div>
          <div className="t-meta" style={{ marginTop: 2 }}>
            {item.city}{item.zone_code ? ` · ${item.zone_code}` : ''}{item.vehicle_class ? ` · ${item.vehicle_class}` : ''}
          </div>
        </div>
      </div>

      {/* Doc checklist */}
      <div>
        <div className="t-label" style={{ padding: 0, marginBottom: 8 }}>Documents · {item.doc_progress}%</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(docMap) as DocType[]).map(k => (
            <span
              key={k}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 8px',
                background: docBg(docMap[k]),
                border: `1px solid color-mix(in oklab, ${docColor(docMap[k])} 22%, var(--rule-strong))`,
                borderRadius: 2,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                color: docColor(docMap[k]),
              }}
            >
              <span className={`dot ${docDot(docMap[k])}`} style={{ width: 5, height: 5, boxShadow: 'none' }} />
              {DOC_LABELS[k]}
            </span>
          ))}
        </div>
        {item.flag_reason && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--danger)' }}>{item.flag_reason}</div>
        )}
      </div>

      {/* Stage stepper */}
      <div>
        <div className="t-label" style={{ padding: 0 }}>Stage</div>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {STAGES.map((s, idx) => {
            const passed = idx <= curIdx
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: passed ? 'var(--accent)' : 'var(--rule-strong)',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 11.5,
                  color: idx === curIdx ? 'var(--ink)' : passed ? 'var(--ink-3)' : 'var(--ink-4)',
                  fontWeight: idx === curIdx ? 500 : 400,
                  textTransform: 'capitalize' as const,
                }}>{s}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Submitted + SLA */}
      <div>
        <div className="t-label" style={{ padding: 0 }}>Submitted</div>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
          {new Date(item.submitted_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
        <div style={{ marginTop: 6 }}>
          <span className={`badge ${slaBadgeClass}`}>
            <span className={`dot ${slaBadgeClass}`} />
            {slaLabel}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 140 }}>
        <button className="btn accent sm" onClick={() => onReview(item)}>Review →</button>
        <button className="btn sm" onClick={() => onReupload(item)}>Request re-upload</button>
        <button
          className="btn sm ghost"
          style={{ color: 'var(--danger)' }}
          onClick={() => onReject(item)}
        >
          Reject
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface PendingReject {
  item: OnboardingDriverItem
}

export default function DriverOnboardingPage() {
  const navigate = useNavigate()
  const isMobile  = useIsMobile()
  const isTablet  = useIsTablet()

  const [queueItems, setQueueItems]   = useState<OnboardingDriverItem[]>([])
  const [stats, setStats]             = useState<Record<string, number>>({})
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [apiError, setApiError]       = useState('')

  const [search, setSearch]           = useState('')
  const [stageFilter, setStageFilter] = useState('')

  const [pendingReject, setPendingReject] = useState<PendingReject | null>(null)
  const [reuploadConfirm, setReuploadConfirm] = useState<OnboardingDriverItem | null>(null)

  // ── Manual onboard modal ──
  const [showOnboardModal, setShowOnboardModal] = useState(false)
  const [onboardForm, setOnboardForm] = useState({ name: '', phone: '', email: '', city: '', zone_code: '', vehicle_class: '', vehicle_plate: '' })
  const [onboardError, setOnboardError] = useState('')
  const [onboardSaving, setOnboardSaving] = useState(false)

  // Catalog dropdown options (loaded once when modal first opens)
  const [zoneOptions, setZoneOptions]       = useState<SelectOption[]>([])
  const [vehicleOptions, setVehicleOptions] = useState<SelectOption[]>([])
  const [optionsLoaded, setOptionsLoaded]   = useState(false)

  const handleOnboardSubmit = async () => {
    if (!onboardForm.name.trim() || !onboardForm.phone.trim()) {
      setOnboardError('Name and phone are required')
      return
    }
    setOnboardSaving(true)
    setOnboardError('')
    try {
      await driverService.createDriver({
        name: onboardForm.name.trim(),
        phone: onboardForm.phone.trim(),
        email: onboardForm.email.trim() || undefined,
        city: onboardForm.city.trim() || undefined,
        zone_code: onboardForm.zone_code.trim() || undefined,
        vehicle_class: onboardForm.vehicle_class.trim() || undefined,
        vehicle_plate: onboardForm.vehicle_plate.trim() || undefined,
      })
      setShowOnboardModal(false)
      setOnboardForm({ name: '', phone: '', email: '', city: '', zone_code: '', vehicle_class: '', vehicle_plate: '' })
      await loadQueue()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setOnboardError(err?.response?.data?.detail || 'Failed to create driver')
    } finally {
      setOnboardSaving(false)
    }
  }

  const loadQueue = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (stageFilter) params.stage = stageFilter
      const data = await driverService.getOnboardingQueue(params)
      setQueueItems(data.items)
      setTotal(data.total)
      setStats(data.stats)
      setApiError('')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to load onboarding queue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadQueue() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => loadQueue(), 350)
    return () => clearTimeout(t)
  }, [search, stageFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load catalog options for zone / vehicle-class dropdowns (once per page load)
  useEffect(() => {
    if (!showOnboardModal || optionsLoaded) return
    Promise.all([
      catalogService.listServiceZones(),
      catalogService.listVehicleClasses(),
    ]).then(([zones, classes]) => {
      setZoneOptions(zones.filter(z => z.is_active).map(z => ({ value: z.code, label: `${z.code} — ${z.name}` })))
      setVehicleOptions(classes.filter(c => c.is_active).map(c => ({ value: c.name, label: c.name })))
      setOptionsLoaded(true)
    }).catch(() => {})
  }, [showOnboardModal, optionsLoaded])

  const handleReview = (item: OnboardingDriverItem) => {
    const firstPending = item.documents.find(d => d.status === 'pending' || d.status === 'rejected')
    if (firstPending) {
      navigate(`/drivers/${item.id}/documents/${firstPending.id}`)
    } else if (item.documents.length > 0) {
      navigate(`/drivers/${item.id}/documents/${item.documents[0].id}`)
    } else {
      navigate(`/drivers/${item.id}`)
    }
  }

  const handleReject = async (reason: string) => {
    if (!pendingReject) return
    try {
      await driverService.rejectDriver(pendingReject.item.id, reason)
      await loadQueue()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to reject driver')
    }
    setPendingReject(null)
  }

  const handleReuploadConfirm = async () => {
    if (!reuploadConfirm) return
    // Request re-upload for the first pending doc
    const pendingDoc = reuploadConfirm.documents.find(d => d.status === 'pending' || d.status === 'rejected')
    if (pendingDoc) {
      try {
        await driverService.reviewDocument(reuploadConfirm.id, pendingDoc.id, { action: 'request_reupload' })
        await loadQueue()
      } catch (e: unknown) {
        const err = e as { response?: { data?: { detail?: string; message?: string } } }
        setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to request re-upload')
      }
    }
    setReuploadConfirm(null)
  }

  const inQueue       = stats['in_queue'] ?? total
  const readyToApprove = stats['ready_to_approve'] ?? 0
  const missingDocs   = stats['missing_docs'] ?? 0
  const slaBreachRisk = stats['sla_breach_risk'] ?? 0

  return (
    <Shell
      activeId="drivers"
      breadcrumb="People & Fleet · Drivers"
      title="Driver onboarding queue"
      subtitle={`Pending approval · ${inQueue} in queue · ${slaBreachRisk} SLA at risk`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm"><Icon name="download" size={13} />Export</button>
          <button className="btn sm"><Icon name="filter" size={13} />Saved view</button>
          <button className="btn sm accent" onClick={() => setShowOnboardModal(true)}>
            <Icon name="plus" size={13} />Manual onboard
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* API error */}
        {apiError && (
          <div style={{
            padding: '10px 14px', background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span>{apiError}</span>
            <button className="btn ghost icon sm" onClick={() => setApiError('')}><Icon name="x" size={12} /></button>
          </div>
        )}

        {/* Summary stats bar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
        }}>
          {[
            { l: 'In queue',          v: String(inQueue),       m: `${Math.max(0, inQueue - readyToApprove)} awaiting review`, tone: 'var(--ink-3)' },
            { l: 'Ready to approve',  v: String(readyToApprove), m: 'All docs OK',                                             tone: 'var(--accent)' },
            { l: 'Missing docs',      v: String(missingDocs),   m: 'Expired or pending',                                      tone: 'var(--warn)' },
            { l: 'SLA breach risk',   v: String(slaBreachRisk), m: '> 48h in queue',                                          tone: 'var(--danger)' },
            { l: 'Avg approval time', v: '14h',                 m: 'Target ≤ 24h',                                            tone: 'var(--accent)' },
          ].map((s, i) => (
            <div key={s.l} style={{
              padding: isMobile ? '12px 14px' : '18px 22px',
              borderRight: isMobile
                ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                : (i < 4 ? '1px solid var(--rule)' : 'none'),
              borderBottom: isMobile && i < 2 ? '1px solid var(--rule)' : (isMobile && i < 4 ? '1px solid var(--rule)' : 'none'),
            }}>
              <div className="t-label" style={{ padding: 0 }}>{s.l}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 22 : 30, fontWeight: 400, letterSpacing: '-0.018em' }}>{s.v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: s.tone }}>{s.m}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)', borderBottom: 0,
          padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <div className="input" style={{ width: isMobile ? '100%' : 260, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input
              placeholder="Name, phone, vehicle…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10, minWidth: 130 }}>
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
            >
              <option value="">All stages</option>
              <option value="signup">Signup</option>
              <option value="docs">Docs</option>
              <option value="review">Review</option>
              <option value="background">Background</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost">Sort · Age in queue ↓</button>
        </div>

        {/* Queue cards */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0 }}>
          {loading && (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          )}
          {!loading && queueItems.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              {search || stageFilter ? 'No drivers match your filter.' : 'No drivers in the onboarding queue.'}
            </div>
          )}
          {!loading && queueItems.map((item, i) => (
            <QueueCard
              key={item.id}
              item={item}
              index={i}
              isMobile={isMobile}
              onReview={handleReview}
              onReject={itm => setPendingReject({ item: itm })}
              onReupload={itm => setReuploadConfirm(itm)}
            />
          ))}
        </div>
      </div>

      {/* Reject modal */}
      {pendingReject && (
        <ReasonModal
          title={`Reject ${pendingReject.item.name}`}
          placeholder="Reason for rejection…"
          onConfirm={handleReject}
          onCancel={() => setPendingReject(null)}
        />
      )}

      {/* Manual onboard modal */}
      {showOnboardModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowOnboardModal(false)}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--rule)',
            width: '100%', maxWidth: 480, padding: '28px 28px 24px',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>Manual onboard driver</div>
              <div className="t-meta" style={{ marginTop: 4 }}>Driver will be created in Pending status and appear in this queue.</div>
            </div>

            {onboardError && (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule))', fontSize: 12.5, color: 'var(--danger)' }}>
                {onboardError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label className="field-label">Full name<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
                <div className="input">
                  <input placeholder="Ravi Mahesh" value={onboardForm.name} onChange={e => setOnboardForm(f => ({ ...f, name: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Phone<span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span></label>
                <div className="input">
                  <input placeholder="+91 98765 43210" value={onboardForm.phone} onChange={e => setOnboardForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Email</label>
                <div className="input">
                  <input placeholder="ravi@email.com" value={onboardForm.email} onChange={e => setOnboardForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">City</label>
                <div className="input">
                  <input placeholder="Bengaluru" value={onboardForm.city} onChange={e => setOnboardForm(f => ({ ...f, city: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Zone</label>
                <SearchableSelect
                  value={onboardForm.zone_code}
                  onChange={v => setOnboardForm(f => ({ ...f, zone_code: v }))}
                  options={zoneOptions}
                  loading={showOnboardModal && !optionsLoaded}
                  placeholder="Search zone…"
                />
              </div>
              <div className="field">
                <label className="field-label">Vehicle class</label>
                <SearchableSelect
                  value={onboardForm.vehicle_class}
                  onChange={v => setOnboardForm(f => ({ ...f, vehicle_class: v }))}
                  options={vehicleOptions}
                  loading={showOnboardModal && !optionsLoaded}
                  placeholder="Search vehicle class…"
                />
              </div>
              <div className="field">
                <label className="field-label">Vehicle plate</label>
                <div className="input">
                  <input placeholder="KA 05 MK 4271" value={onboardForm.vehicle_plate} onChange={e => setOnboardForm(f => ({ ...f, vehicle_plate: e.target.value }))} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn sm ghost" onClick={() => { setShowOnboardModal(false); setOnboardError('') }}>Cancel</button>
              <button className="btn sm accent" onClick={handleOnboardSubmit} disabled={onboardSaving}>
                {onboardSaving ? 'Creating…' : 'Create driver'}
              </button>
            </div>
          </div>
        </div>
      )}

            {/* Re-upload confirm */}
      <ConfirmDialog
        open={reuploadConfirm !== null}
        title="Request re-upload"
        description={`Ask ${reuploadConfirm?.name ?? ''} to re-upload their document. They will receive a notification.`}
        confirmLabel="Send request"
        variant="default"
        onConfirm={handleReuploadConfirm}
        onCancel={() => setReuploadConfirm(null)}
      />
    </Shell>
  )
}
