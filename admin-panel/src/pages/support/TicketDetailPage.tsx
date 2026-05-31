import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import { supportService } from '../../services/supportService'
import type { TicketDetail, TicketMessage } from '../../services/supportService'
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
          {msg.author_name} · {msg.author_role} · {new Date(msg.created_at).toLocaleString()}
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

  const [resolutionCode, setResolutionCode] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [resolveError, setResolveError] = useState('')
  const [resolving, setResolving] = useState(false)

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

  async function handleResolve() {
    if (!ticket) return
    if (!resolutionCode) { setResolveError('Select a resolution code first.'); return }
    setResolveError('')
    setResolving(true)
    try {
      await supportService.resolveTicket(ticket.id, resolutionCode, resolutionNote || undefined)
      const updated = await supportService.getTicket(ticket.id)
      setTicket(updated)
    } catch {
      setResolveError('Failed to resolve ticket.')
    } finally {
      setResolving(false)
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

  return (
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
            onClick={handleResolve}
            disabled={resolving || ticket.status === 'resolved' || ticket.status === 'closed'}
          >
            {resolving ? 'Resolving…' : 'Resolve'}
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
          {/* Status transitions */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 12 }}>STATUS</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {STATUS_STEPS.map((step, idx) => {
                const isActive = ticket.status === step
                const isPast = STATUS_STEPS.indexOf(ticket.status) > idx
                return (
                  <div key={step} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: isActive ? 'var(--accent, #0F8A5F)' : isPast ? 'var(--accent-light, #d1fae5)' : 'var(--border)',
                      color: isActive ? '#fff' : isPast ? 'var(--accent, #0F8A5F)' : 'var(--ink-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      margin: '0 auto 4px',
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: isActive ? 'var(--accent, #0F8A5F)' : 'var(--ink-3)',
                      fontWeight: isActive ? 600 : 400,
                      textTransform: 'capitalize',
                    }}>
                      {step.replace('_', ' ')}
                    </div>
                  </div>
                )
              })}
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
              { label: 'Opened', value: new Date(ticket.created_at).toLocaleString() },
              { label: 'Category', value: ticket.category.replace(/_/g, ' ') },
              { label: 'Priority', value: priorityBadge(ticket.priority) },
              { label: 'Status', value: statusBadge(ticket.status) },
              { label: 'SLA due', value: ticket.sla_due_at ? new Date(ticket.sla_due_at).toLocaleString() : '—' },
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
              onClick={handleResolve}
              disabled={resolving || ticket.status === 'resolved' || ticket.status === 'closed'}
            >
              {resolving ? 'Resolving…' : 'Mark as resolved'}
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
  )
}
