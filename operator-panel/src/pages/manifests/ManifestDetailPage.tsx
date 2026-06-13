import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Lock,
  Send,
  Unlock,
  User,
} from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import { fmtDate, fmtDateTime } from '../../lib/format'
import type { ManifestDetail, ManifestPassenger } from '../../services/operatorManifestsService'
import { operatorManifestsService } from '../../services/operatorManifestsService'

const ROLE_TONE: Record<ManifestPassenger['role'], string> = {
  passenger: 'info',
  crew: 'ok',
  infant: 'pending',
  unaccompanied_minor: 'warn',
}

const ROLE_LABEL: Record<ManifestPassenger['role'], string> = {
  passenger: 'Pax',
  crew: 'Crew',
  infant: 'Infant',
  unaccompanied_minor: 'UM',
}

const ID_LABEL: Record<ManifestPassenger['id_type'], string> = {
  passport: 'Passport',
  national_id: 'National ID',
  driving_license: 'Driving Lic.',
  other: 'Other',
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid var(--rule-soft)',
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: done ? 'none' : '1.5px solid var(--rule-strong)',
          background: done ? 'var(--accent)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {done && <Check size={11} color="#fff" />}
      </div>
      <span
        style={{
          fontSize: 12.5,
          color: done ? 'var(--ink)' : 'var(--ink-3)',
          textDecoration: done ? 'none' : 'none',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function HistoryFeed({ history }: { history: ManifestDetail['history'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {history.map((h, i) => (
        <div
          key={h.id}
          style={{
            display: 'flex',
            gap: 12,
            paddingBottom: i < history.length - 1 ? 16 : 0,
            position: 'relative',
          }}
        >
          {i < history.length - 1 && (
            <div
              style={{
                position: 'absolute',
                left: 11,
                top: 22,
                bottom: 0,
                width: 1,
                background: 'var(--rule)',
              }}
            />
          )}
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              border: '1.5px solid var(--rule-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            <Clock size={10} style={{ color: 'var(--ink-3)' }} />
          </div>
          <div style={{ paddingBottom: 4 }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{h.action}</div>
            <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>
              {h.performed_by} · {fmtDateTime(h.performed_at)}
            </div>
            {h.remarks && (
              <div
                style={{
                  marginTop: 5,
                  fontSize: 11.5,
                  color: 'var(--ink-2)',
                  fontStyle: 'italic',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--rule)',
                  borderRadius: 4,
                  padding: '5px 8px',
                }}
              >
                "{h.remarks}"
              </div>
            )}
          </div>
        </div>
      ))}
      {history.length === 0 && (
        <div className="t-meta" style={{ fontSize: 12, textAlign: 'center', padding: 16 }}>
          No history yet.
        </div>
      )}
    </div>
  )
}

export default function ManifestDetailPage() {
  const { id: flightId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [manifest, setManifest] = useState<ManifestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [locking, setLocking] = useState(false)
  const [showSubmitRemarks, setShowSubmitRemarks] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [historyOpen, setHistoryOpen] = useState(true)

  const loadData = () => {
    if (!flightId) return
    operatorManifestsService
      .getDetail(flightId)
      .then(setManifest)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [flightId])

  const handleLock = () => {
    if (!flightId || !manifest) return
    setLocking(true)
    const action = manifest.is_locked
      ? operatorManifestsService.unlock(flightId)
      : operatorManifestsService.lock(flightId)
    action
      .then(() => loadData())
      .catch(console.error)
      .finally(() => setLocking(false))
  }

  const handleSubmit = () => {
    if (!flightId) return
    setSubmitting(true)
    operatorManifestsService
      .submit(flightId, remarks.trim() || undefined)
      .then(() => {
        setShowSubmitRemarks(false)
        setRemarks('')
        loadData()
      })
      .catch(console.error)
      .finally(() => setSubmitting(false))
  }

  const handleExport = () => {
    if (!flightId) return
    operatorManifestsService.exportManifest(flightId).then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `manifest-${flightId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }).catch(console.error)
  }

  const passengers = manifest?.passengers.filter(p => p.role === 'passenger' || p.role === 'infant' || p.role === 'unaccompanied_minor') ?? []
  const crew = manifest?.passengers.filter(p => p.role === 'crew') ?? []
  const unverifiedCount = manifest?.passengers.filter(p => !p.verified).length ?? 0

  const canSubmit = manifest
    && manifest.status === 'draft'
    && !manifest.is_locked
    && unverifiedCount === 0

  const checklistItems: { key: keyof ManifestDetail['checklist']; label: string }[] = [
    { key: 'all_passengers_verified', label: 'All passengers verified' },
    { key: 'ids_collected', label: 'ID documents collected' },
    { key: 'safety_briefing_completed', label: 'Safety briefing completed' },
    { key: 'weight_balance_checked', label: 'Weight & balance checked' },
    { key: 'authority_clearance_obtained', label: 'Authority clearance obtained' },
  ]

  const leftPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {unverifiedCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 20px',
            background: 'var(--warn-soft)',
            borderBottom: '1px solid color-mix(in oklab,var(--warn) 25%,var(--rule))',
          }}
        >
          <AlertTriangle size={14} style={{ color: 'var(--warn)', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: 'var(--warn)', fontWeight: 500 }}>
            {unverifiedCount} passenger{unverifiedCount > 1 ? 's' : ''} not yet verified
          </span>
        </div>
      )}

      <div style={{ padding: '20px 20px 8px' }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            marginBottom: 12,
          }}
        >
          Passenger Manifest ({passengers.length})
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table
            className="tbl"
            style={{ width: '100%', minWidth: 700, fontSize: 12 }}
          >
            <thead>
              <tr>
                <th className="t-label" style={{ width: 48 }}>Seat</th>
                <th className="t-label">Name</th>
                <th className="t-label" style={{ width: 90 }}>DOB</th>
                <th className="t-label" style={{ width: 80 }}>ID Type</th>
                <th className="t-label" style={{ width: 110 }}>ID Number</th>
                <th className="t-label" style={{ width: 90 }}>Nationality</th>
                <th className="t-label" style={{ width: 60 }}>Role</th>
                <th className="t-label" style={{ width: 60, textAlign: 'center' }}>Verified</th>
              </tr>
            </thead>
            <tbody>
              {passengers.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-3)', fontSize: 12 }}>
                    No passengers added yet.
                  </td>
                </tr>
              )}
              {passengers.map(p => (
                <tr key={p.id}>
                  <td
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.06em',
                      color: 'var(--ink-2)',
                    }}
                  >
                    {p.seat_number}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 12.5 }}>
                      {p.first_name} {p.last_name}
                    </div>
                    {p.special_assistance && (
                      <div style={{ fontSize: 10.5, color: 'var(--warn)', marginTop: 1 }}>
                        {p.special_assistance}
                      </div>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                    {p.date_of_birth ? fmtDate(p.date_of_birth) : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--ink-3)' }}>{ID_LABEL[p.id_type]}</td>
                  <td
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.04em',
                      color: 'var(--ink-2)',
                    }}
                  >
                    {p.id_number || '—'}
                  </td>
                  <td style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{p.nationality || '—'}</td>
                  <td>
                    <span className={`badge ${ROLE_TONE[p.role]}`} style={{ height: 17, fontSize: 9 }}>
                      {ROLE_LABEL[p.role]}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {p.verified ? (
                      <CheckCircle size={14} style={{ color: 'var(--accent)' }} />
                    ) : (
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          border: '1.5px solid var(--rule-strong)',
                          margin: '0 auto',
                        }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {crew.length > 0 && (
        <div style={{ padding: '16px 20px 8px' }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 12,
            }}
          >
            Crew ({crew.length})
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="tbl" style={{ width: '100%', minWidth: 500, fontSize: 12 }}>
              <thead>
                <tr>
                  <th className="t-label">Name</th>
                  <th className="t-label" style={{ width: 80 }}>ID Type</th>
                  <th className="t-label" style={{ width: 110 }}>ID Number</th>
                  <th className="t-label" style={{ width: 90 }}>Nationality</th>
                  <th className="t-label" style={{ width: 60, textAlign: 'center' }}>Verified</th>
                </tr>
              </thead>
              <tbody>
                {crew.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <User size={12} style={{ color: 'var(--ink-3)' }} />
                        <span style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 12.5 }}>
                          {c.first_name} {c.last_name}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--ink-3)' }}>{ID_LABEL[c.id_type]}</td>
                    <td
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        letterSpacing: '0.04em',
                        color: 'var(--ink-2)',
                      }}
                    >
                      {c.id_number || '—'}
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{c.nationality || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {c.verified ? (
                        <CheckCircle size={14} style={{ color: 'var(--accent)' }} />
                      ) : (
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            border: '1.5px solid var(--rule-strong)',
                            margin: '0 auto',
                          }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {manifest && (
        <div
          style={{
            margin: '16px 20px 20px',
            background: 'var(--surface-2)',
            border: '1px solid var(--rule)',
            borderRadius: 6,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 12,
            }}
          >
            Flight Summary
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px 24px',
            }}
          >
            {[
              ['Route', `${manifest.origin_code} → ${manifest.destination_code}`],
              ['Aircraft', manifest.aircraft_registration ?? '—'],
              ['Departure', fmtDateTime(manifest.departure_at)],
              ['Arrival', manifest.arrival_at ? fmtDateTime(manifest.arrival_at) : '—'],
              ['Passengers', String(passengers.length)],
              ['Crew', String(crew.length)],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const rightPanel = manifest && (
    <div
      style={{
        width: isMobile ? '100%' : 300,
        flexShrink: 0,
        borderLeft: isMobile ? 'none' : '1px solid var(--rule)',
        borderTop: isMobile ? '1px solid var(--rule)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '20px 20px 16px' }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            marginBottom: 12,
          }}
        >
          Pre-flight Checklist
        </div>
        {checklistItems.map(item => (
          <ChecklistItem
            key={item.key}
            done={manifest.checklist[item.key]}
            label={item.label}
          />
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--rule)', padding: '16px 20px' }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            marginBottom: 12,
          }}
        >
          Submission
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginBottom: 2 }}>Status</div>
            <span
              className={`badge ${manifest.status === 'approved' ? 'ok' : manifest.status === 'submitted' ? 'info' : 'pending'}`}
              style={{ height: 20 }}
            >
              <span className={`dot ${manifest.status === 'approved' ? 'ok' : manifest.status === 'submitted' ? 'info' : 'pending'}`} />
              {manifest.status.charAt(0).toUpperCase() + manifest.status.slice(1)}
            </span>
          </div>
          {manifest.submission_deadline && (
            <div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginBottom: 2 }}>Deadline</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                {fmtDateTime(manifest.submission_deadline)}
              </div>
            </div>
          )}
          {manifest.submitted_at && (
            <div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginBottom: 2 }}>Submitted</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                {fmtDateTime(manifest.submitted_at)}
              </div>
            </div>
          )}
          {manifest.submitted_by && (
            <div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginBottom: 2 }}>By</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{manifest.submitted_by}</div>
            </div>
          )}
          {manifest.submission_remarks && (
            <div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginBottom: 2 }}>Remarks</div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--ink-2)',
                  fontStyle: 'italic',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--rule)',
                  borderRadius: 4,
                  padding: '6px 8px',
                }}
              >
                "{manifest.submission_remarks}"
              </div>
            </div>
          )}
        </div>
      </div>

      {manifest.status === 'draft' && (
        <div style={{ borderTop: '1px solid var(--rule)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn sm"
            style={{ width: '100%', justifyContent: 'center', gap: 8 }}
            onClick={handleLock}
            disabled={locking}
          >
            {manifest.is_locked ? <Unlock size={13} /> : <Lock size={13} />}
            {manifest.is_locked ? 'Unlock Manifest' : 'Lock Manifest'}
          </button>

          {!showSubmitRemarks ? (
            <button
              className="btn sm accent"
              style={{ width: '100%', justifyContent: 'center', gap: 8 }}
              disabled={!canSubmit}
              onClick={() => setShowSubmitRemarks(true)}
            >
              <Send size={13} />
              Submit Manifest
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                className="input"
                style={{ height: 72, width: '100%', resize: 'vertical', padding: '8px 10px', fontSize: 12 }}
                placeholder="Optional remarks for authority…"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { setShowSubmitRemarks(false); setRemarks('') }}
                >
                  Cancel
                </button>
                <button
                  className="btn sm accent"
                  style={{ flex: 1, justifyContent: 'center', gap: 6 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  <Send size={12} />
                  {submitting ? 'Submitting…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}

          {!canSubmit && unverifiedCount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: 'var(--warn)',
                padding: '6px 0',
              }}
            >
              <AlertTriangle size={11} />
              Verify all passengers before submitting.
            </div>
          )}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--rule)', padding: '14px 20px 16px' }}>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginBottom: historyOpen ? 12 : 0,
          }}
          onClick={() => setHistoryOpen(v => !v)}
        >
          <span
            style={{
              flex: 1,
              textAlign: 'left',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
            }}
          >
            History
          </span>
          {historyOpen ? <ChevronUp size={13} style={{ color: 'var(--ink-3)' }} /> : <ChevronDown size={13} style={{ color: 'var(--ink-3)' }} />}
        </button>
        {historyOpen && <HistoryFeed history={manifest.history} />}
      </div>

      <div style={{ borderTop: '1px solid var(--rule)', padding: '14px 20px 16px' }}>
        <button
          className="btn sm"
          style={{ width: '100%', justifyContent: 'center', gap: 8 }}
          onClick={handleExport}
        >
          <Download size={13} />
          Export PDF
        </button>
      </div>
    </div>
  )

  return (
    <Shell
      activeId="manifests"
      breadcrumb="Manifests"
      title={manifest ? `${manifest.booking_ref} — ${manifest.origin_code} → ${manifest.destination_code}` : 'Manifest Detail'}
      subtitle={manifest ? `${passengers.length} pax · ${crew.length} crew · ${manifest.status}` : undefined}
      actions={
        <button
          className="btn sm"
          onClick={() => navigate('/manifests')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={12} />
          Back to Manifests
        </button>
      }
    >
      {loading && (
        <div className="t-meta" style={{ textAlign: 'center', padding: 60 }}>
          Loading manifest…
        </div>
      )}

      {!loading && !manifest && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>Manifest not found.</div>
          <button className="btn sm" style={{ marginTop: 16 }} onClick={() => navigate('/manifests')}>
            <ArrowRight size={12} />
            Back to list
          </button>
        </div>
      )}

      {!loading && manifest && (
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {leftPanel}
          </div>
          {rightPanel}
        </div>
      )}
    </Shell>
  )
}
