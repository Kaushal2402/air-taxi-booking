import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import { supportService } from '../../services/supportService'
import type { TicketDetail, TicketMessage } from '../../services/supportService'
import { formatDateTime } from '../../lib/utils'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'

const RESOLUTION_CODES = [
  { value: 'data_correction', label: 'Data correction' },
  { value: 'refund_issued', label: 'Refund issued' },
  { value: 'goodwill_credit', label: 'Goodwill credit' },
  { value: 'no_action_needed', label: 'No action needed' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'resolved_by_system', label: 'Resolved by system' },
  { value: 'other', label: 'Other' },
]

function priorityBadge(p: string) {
  const cls = p === 'urgent' ? 'badge danger' : p === 'high' ? 'badge warn' : p === 'med' ? 'badge info' : 'badge'
  return <span className={cls}>{p.toUpperCase()}</span>
}

function statusBadge(s: string) {
  const label = s.replace('_', ' ')
  const cls = s === 'open' ? 'badge info' : s === 'in_progress' ? 'badge warn' : s === 'resolved' ? 'badge ok' : 'badge'
  return <span className={cls}>{label}</span>
}

const STATUS_STEPS = ['open', 'in_progress', 'resolved', 'closed']

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

// Which statuses can be clicked to from the current status
const ALLOWED_NEXT: Record<string, string[]> = {
  open:        ['in_progress'],
  in_progress: ['resolved', 'closed'],
  resolved:    ['closed'],
  closed:      [],
}

// ── Resolve Modal ─────────────────────────────────────────────────────────────
function ResolveModal({ onConfirm, onClose, resolving }: {
  onConfirm: (code: string, note: string) => void
  onClose: () => void
  resolving: boolean
}) {
  const [code, setCode] = useState('')
  const [note, setNote] = useState('')
  const [err,  setErr]  = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code) { setErr('Please select a resolution code.'); return }
    onConfirm(code, note)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 10, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Mark ticket as resolved</span>
          <button className="btn sm ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label className="field-label">Resolution code <span style={{ color: 'var(--danger,#e53e3e)' }}>*</span></label>
            <select className="input" value={code} onChange={e => { setCode(e.target.value); setErr('') }} style={{ width: '100%' }}>
              <option value="">Select code…</option>
              {RESOLUTION_CODES.map(rc => <option key={rc.value} value={rc.value}>{rc.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Resolution note <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span></label>
            <textarea className="input" rows={2} placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
          </div>
          {err && <div style={{ color: 'var(--danger,#e53e3e)', fontSize: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" className="btn sm ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn sm accent" disabled={resolving}>
              {resolving ? 'Resolving…' : 'Confirm resolve'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: TicketMessage }) {
  const isNote = msg.kind === 'internal_note'
  const isAdmin = msg.author_role === 'admin' || msg.author_role === 'agent'

  if (isNote) {
    return (
      <div style={{
        background: 'var(--warn-bg, #fffbeb)',
        border: '1px solid var(--warn-border, #f6e05e)',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, color: 'var(--warn-text, #744210)', marginBottom: 6, fontWeight: 600 }}>
          🔒 Internal note · {msg.author_name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{msg.body}</div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isAdmin ? 'row-reverse' : 'row',
      gap: 10,
      marginBottom: 16,
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: isAdmin ? 'var(--ink)' : 'var(--border)',
        color: isAdmin ? '#fff' : 'var(--ink-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}>
        {msg.author_name.charAt(0).toUpperCase()}
      </div>
      <div style={{ maxWidth: '75%' }}>
        <div style={{
          fontSize: 11,
          color: 'var(--ink-3)',
          marginBottom: 4,
          textAlign: isAdmin ? 'right' : 'left',
        }}>
          {msg.author_name} · {msg.author_role} · {formatDateTime(msg.created_at)}
        </div>
        <div style={{
          background: isAdmin ? 'var(--accent, #0F8A5F)' : 'var(--surface)',
          color: isAdmin ? '#fff' : 'var(--ink)',
          border: isAdmin ? 'none' : '1px solid var(--border)',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
          whiteSpace: 'pre-wrap',
        }}>
          {msg.body}
        </div>
      </div>
    </div>
  )
}

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [replyTab, setReplyTab] = useState<'reply' | 'internal_note'>('reply')
  const [replyBody, setReplyBody] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  // panel-level resolution code (used by the inline panel button)
  const [resolutionCode, setResolutionCode] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [resolveError, setResolveError] = useState('')

  const [escalateOpen, setEscalateOpen] = useState(false)
  const [escalateReason, setEscalateReason] = useState('')
  const [escalating, setEscalating] = useState(false)

  useEffect(() => {
    if (!ticketId) return
    setLoading(true)
    supportService.getTicket(ticketId)
      .then(setTicket)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ticketId])

  async function handleSendReply() {
    if (!ticket || !replyBody.trim()) return
    setSendingReply(true)
    try {
      await supportService.addMessage(ticket.id, replyTab, replyBody.trim())
      const updated = await supportService.getTicket(ticket.id)
      setTicket(updated)
      setReplyBody('')
    } catch {
      // ignore
    } finally {
      setSendingReply(false)
    }
  }

  async function handleResolve(code?: string, note?: string) {
    if (!ticket) return
    const rc = code ?? resolutionCode
    const rn = note ?? resolutionNote
    if (!rc) { setResolveError('Select a resolution code first.'); return }
    setResolveError('')
    setResolving(true)
    try {
      await supportService.resolveTicket(ticket.id, rc, rn || undefined)
      const updated = await supportService.getTicket(ticket.id)
      setTicket(updated)
      setShowResolveModal(false)
      setResolutionCode('')
      setResolutionNote('')
    } catch {
      setResolveError('Failed to resolve ticket.')
    } finally {
      setResolving(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!ticket) return
    // "resolved" must go through the Resolve modal (needs resolution_code)
    if (newStatus === 'resolved') { setShowResolveModal(true); return }
    setUpdatingStatus(true)
    try {
      await supportService.updateTicketStatus(ticket.id, newStatus)
      const updated = await supportService.getTicket(ticket.id)
      setTicket(updated)
    } catch {
      // error silently — ticket state unchanged
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleEscalate() {
    if (!ticket || !escalateReason.trim()) return
    setEscalating(true)
    try {
      await supportService.escalateTicket(ticket.id, escalateReason.trim())
      const updated = await supportService.getTicket(ticket.id)
      setTicket(updated)
      setEscalateOpen(false)
      setEscalateReason('')
    } catch {
      // ignore
    } finally {
      setEscalating(false)
    }
  }

  if (loading) {
    return (
      <Shell activeId="support" breadcrumb="Operations · Support · Ticket" title="Loading…">
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)' }}>Loading ticket…</div>
      </Shell>
    )
  }

  if (!ticket) {
    return (
      <Shell activeId="support" breadcrumb="Operations · Support · Ticket" title="Not found">
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'var(--ink-3)', marginBottom: 16 }}>Ticket not found.</p>
          <button className="btn ghost" onClick={() => navigate('/support')}>← Back to queue</button>
        </div>
      </Shell>
    )
  }

  const subtitle = `${ticket.ticket_ref} · ${ticket.requester_name} · ${ticket.priority.toUpperCase()}${ticket.linked_booking_id ? ` · Booking #${ticket.linked_booking_id.slice(0, 8)}` : ''}`
  const isResolvable = ticket.status !== 'resolved' && ticket.status !== 'closed'

  return (
    <>
    {showResolveModal && (
      <ResolveModal
        resolving={resolving}
        onClose={() => setShowResolveModal(false)}
        onConfirm={(code, note) => handleResolve(code, note)}
      />
    )}
    <Shell
      activeId="support"
      breadcrumb="Operations · Support · Ticket"
      title={ticket.subject}
      subtitle={subtitle}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm ghost" onClick={() => setEscalateOpen(true)}>Escalate</button>
          <button
            className="btn sm accent"
            onClick={() => setShowResolveModal(true)}
            disabled={ticket.status === 'resolved' || ticket.status === 'closed'}
            title={ticket.status === 'resolved' || ticket.status === 'closed' ? 'Ticket is already ' + ticket.status : 'Mark this ticket as resolved'}
          >
            ✓ Resolve
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 28px 32px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile || isTablet ? '1fr' : '1.55fr 1fr',
        gap: 20,
        alignItems: 'start',
      }}>
        {/* Left: Conversation */}
        <div>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Conversation</span>
              <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--ink-3)' }}>
                <span>{replyTab === 'reply' ? 'Public reply' : 'Internal note'}</span>
              </div>
            </div>

            {/* Thread */}
            <div style={{ padding: 16, maxHeight: 480, overflowY: 'auto' }}>
              {ticket.messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 40 }}>No messages yet.</div>
              ) : ticket.messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
            </div>

            {/* Composer */}
            <div style={{
              borderTop: '1px solid var(--border)',
              padding: 16,
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button
                  className={replyTab === 'reply' ? 'btn sm accent' : 'btn sm ghost'}
                  onClick={() => setReplyTab('reply')}
                >
                  Reply
                </button>
                <button
                  className={replyTab === 'internal_note' ? 'btn sm' : 'btn sm ghost'}
                  style={replyTab === 'internal_note' ? { background: 'var(--warn, #d69e2e)', color: '#fff', borderColor: 'var(--warn)' } : {}}
                  onClick={() => setReplyTab('internal_note')}
                >
                  Internal note
                </button>
              </div>
              <textarea
                className="input"
                placeholder={replyTab === 'reply' ? 'Type your reply…' : 'Add an internal note (not visible to requester)…'}
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                rows={4}
                style={{ width: '100%', resize: 'vertical', marginBottom: 10 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn sm ghost">Canned response</button>
                <button
                  className="btn sm accent"
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyBody.trim()}
                >
                  {sendingReply ? 'Sending…' : 'Send reply →'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Context panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Status transitions — clickable stepper */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>STATUS</span>
              {updatingStatus && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Updating…</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {STATUS_STEPS.map((step, idx) => {
                const currentIdx = STATUS_STEPS.indexOf(ticket.status)
                const isActive   = ticket.status === step
                const isPast     = currentIdx > idx
                const isNext     = ALLOWED_NEXT[ticket.status]?.includes(step)
                const isClickable = isNext && !updatingStatus

                return (
                  <div key={step} style={{ flex: 1, textAlign: 'center' }}>
                    <button
                      type="button"
                      disabled={!isClickable}
                      onClick={() => isClickable && handleStatusChange(step)}
                      title={
                        isActive     ? `Current status: ${STATUS_LABELS[step]}` :
                        isPast       ? `Completed: ${STATUS_LABELS[step]}` :
                        isClickable  ? `Click to mark as ${STATUS_LABELS[step]}` :
                                       STATUS_LABELS[step]
                      }
                      style={{
                        width: '100%',
                        padding: '6px 4px',
                        border: isActive
                          ? '2px solid var(--accent,#0F8A5F)'
                          : isClickable
                          ? '2px dashed var(--accent,#0F8A5F)'
                          : '1px solid var(--rule)',
                        borderRadius: 6,
                        background: isActive
                          ? 'color-mix(in oklab, var(--accent,#0F8A5F) 12%, var(--surface))'
                          : isPast
                          ? 'color-mix(in oklab, var(--accent,#0F8A5F) 6%, var(--surface))'
                          : 'var(--surface-2)',
                        cursor: isClickable ? 'pointer' : 'default',
                        opacity: !isActive && !isPast && !isClickable ? 0.45 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        fontSize: 11,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--accent,#0F8A5F)' : isPast ? 'var(--accent,#0F8A5F)' : isClickable ? 'var(--ink-2)' : 'var(--ink-4)',
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                      }}>
                        {isPast ? '✓ ' : isActive ? '● ' : ''}{STATUS_LABELS[step]}
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-4)' }}>
              {ALLOWED_NEXT[ticket.status]?.length
                ? `Click ${ALLOWED_NEXT[ticket.status].map(s => STATUS_LABELS[s]).join(' or ')} to advance this ticket`
                : 'This ticket is closed — no further transitions'}
            </div>
          </div>

          {/* Ticket details */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 12 }}>TICKET DETAILS</div>
            {[
              { label: 'Ticket ref', value: ticket.ticket_ref },
              { label: 'Opened', value: formatDateTime(ticket.created_at) },
              { label: 'Category', value: ticket.category.replace(/_/g, ' ') },
              { label: 'Priority', value: priorityBadge(ticket.priority) },
              { label: 'Status', value: statusBadge(ticket.status) },
              { label: 'SLA due', value: ticket.sla_due_at ? formatDateTime(ticket.sla_due_at) : '—' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: 13,
              }}>
                <span style={{ color: 'var(--ink-3)' }}>{item.label}</span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Linked context */}
          {(ticket.linked_booking_id || ticket.linked_transaction_id) && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 12 }}>LINKED CONTEXT</div>
              {ticket.linked_booking_id && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    marginBottom: 8,
                  }}
                  onClick={() => navigate(`/bookings/road/${ticket.linked_booking_id}`)}
                >
                  <span style={{ fontSize: 18 }}>📋</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Booking</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'monospace' }}>
                      #{ticket.linked_booking_id.slice(0, 8)}
                    </div>
                  </div>
                </div>
              )}
              {ticket.linked_transaction_id && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 18 }}>💳</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Transaction</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'monospace' }}>
                      {ticket.linked_transaction_id}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resolution actions */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 12 }}>RESOLUTION ACTIONS</div>

            {/* Quick action buttons 2×2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <button className="btn sm ghost" style={{ fontSize: 12 }}>Request refund</button>
              <button className="btn sm ghost" style={{ fontSize: 12 }}>Goodwill credit</button>
              <button className="btn sm ghost" style={{ fontSize: 12 }} onClick={() => setEscalateOpen(true)}>Escalate</button>
              <button className="btn sm ghost" style={{ fontSize: 12 }}>Reassign</button>
            </div>

            {/* Resolution code */}
            <div className="field" style={{ marginBottom: 10 }}>
              <label className="field-label">Resolution code</label>
              <select
                className="input"
                value={resolutionCode}
                onChange={e => { setResolutionCode(e.target.value); setResolveError('') }}
                style={{ width: '100%' }}
              >
                <option value="">Select code…</option>
                {RESOLUTION_CODES.map(rc => (
                  <option key={rc.value} value={rc.value}>{rc.label}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label className="field-label">Resolution note (optional)</label>
              <textarea
                className="input"
                placeholder="Add a note about resolution…"
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            {resolveError && (
              <div style={{ color: 'var(--danger, #e53e3e)', fontSize: 12, marginBottom: 8 }}>{resolveError}</div>
            )}
            <button
              className="btn sm accent"
              style={{ width: '100%' }}
              onClick={() => {
                if (!resolutionCode) { setResolveError('Select a resolution code first.'); return }
                handleResolve(resolutionCode, resolutionNote)
              }}
              disabled={resolving || !isResolvable}
              title={!isResolvable ? `Ticket is already ${ticket.status}` : !resolutionCode ? 'Select a resolution code above' : ''}
            >
              {resolving ? 'Resolving…' : isResolvable ? 'Mark as resolved' : `Already ${ticket.status}`}
            </button>
          </div>
        </div>
      </div>

      {/* Escalate dialog */}
      {escalateOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 400,
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Escalate ticket</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
              Provide a reason for escalation. The ticket will be bumped to urgent and assigned to a supervisor.
            </p>
            <textarea
              className="input"
              placeholder="Reason for escalation…"
              value={escalateReason}
              onChange={e => setEscalateReason(e.target.value)}
              rows={3}
              style={{ width: '100%', marginBottom: 16, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => { setEscalateOpen(false); setEscalateReason('') }}>
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={handleEscalate}
                disabled={escalating || !escalateReason.trim()}
              >
                {escalating ? 'Escalating…' : 'Confirm escalate'}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </Shell>
    </>
  )
}
