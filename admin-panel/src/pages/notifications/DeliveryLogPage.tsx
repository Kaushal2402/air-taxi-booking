import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { notificationsService } from '../../services/notificationsService'
import type { NotificationLog, NotificationStats } from '../../services/notificationsService'
import { formatTime } from '../../lib/utils'

const CHAN_LABELS: Record<string, string> = {
  push: 'Push', sms: 'SMS', email: 'Email', wa: 'WhatsApp',
}

const CHANNEL_RATES = [
  { c: 'Push',      pct: 99.2 },
  { c: 'SMS',       pct: 97.8 },
  { c: 'WhatsApp',  pct: 98.9 },
  { c: 'Email',     pct: 96.1 },
]

export default function DeliveryLogPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<NotificationStats | null>(null)

  // Broadcast form
  const [audience, setAudience] = useState('')
  const [channel, setChannel] = useState('push')
  const [message, setMessage] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [sendError, setSendError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [logData, statsData] = await Promise.all([
        notificationsService.getDeliveryLog(1, 50),
        notificationsService.getStats(),
      ])
      setLogs(logData.items)
      setTotal(logData.total)
      setStats(statsData)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const sendBroadcast = async () => {
    if (!audience.trim()) { setSendError('Audience is required'); return }
    if (!message.trim()) { setSendError('Message is required'); return }
    setSending(true); setSendError('')
    try {
      await notificationsService.createBroadcast({
        audience_description: audience,
        channel,
        message,
        scheduled_at: scheduleTime || null,
      })
      setSendSuccess(true)
      setAudience(''); setChannel('push'); setMessage(''); setScheduleTime('')
      setTimeout(() => setSendSuccess(false), 3000)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setSendError(err?.response?.data?.detail || 'Send failed')
    } finally { setSending(false) }
  }

  const sentFormatted = stats ? (stats.sent_30d >= 1_000_000
    ? `${(stats.sent_30d / 1_000_000).toFixed(2)} M`
    : stats.sent_30d >= 1000 ? `${Math.round(stats.sent_30d / 1000)} K` : String(stats.sent_30d)) : '—'

  return (
    <Shell
      activeId="notifications"
      breadcrumb="System · Notifications · Delivery"
      title="Delivery & broadcast"
      subtitle={`Live stream · ${sentFormatted} sent · 30d · 4 channels`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/notifications')}>← Templates</button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : '1.5fr 1fr', gap: 18 }}>

          {/* Left — rates + log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Delivery rates */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 22px' }}>
              <div className="t-label" style={{ marginBottom: 16 }}>Delivery rate by channel · 30d</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {CHANNEL_RATES.map(s => (
                  <div key={s.c}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12.5 }}>{s.c}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: s.pct >= 98 ? 'var(--accent)' : 'var(--warn)' }}>{s.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: s.pct + '%', height: '100%', background: s.pct >= 98 ? 'var(--accent)' : 'var(--warn)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live log */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="t-label">Live delivery log</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                    {total} events total
                  </h3>
                </div>
                <span className="badge ok"><span className="dot ok" />Streaming</span>
              </div>

              {loading ? (
                <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
              ) : logs.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  No delivery events yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ minWidth: isMobile ? 500 : undefined }}>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Template</th>
                        <th>Channel</th>
                        {!isMobile && <th>Recipient</th>}
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(l => (
                        <tr key={l.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                            {formatTime(l.created_at)}
                          </td>
                          <td style={{ fontSize: 12.5 }}>{l.template_name}</td>
                          <td>
                            <span className="badge" style={{ height: 20, padding: '0 7px', fontSize: 10 }}>
                              {CHAN_LABELS[l.channel] ?? l.channel}
                            </span>
                          </td>
                          {!isMobile && <td className="t-meta">{l.recipient}</td>}
                          <td>
                            {l.status === 'delivered'  ? <span className="badge ok"><span className="dot ok" />Delivered</span> :
                             l.status === 'read'        ? <span className="badge info"><span className="dot info" />Read</span> :
                             l.status === 'failed'      ? <span className="badge danger"><span className="dot danger" />Failed</span> :
                             <span className="badge"><span className="dot pending" />Suppressed</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right — broadcast composer */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
            <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>New broadcast</h3>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              One-off message to a customer segment. Marketing sends respect opt-out & quiet hours.
            </p>

            {sendSuccess && (
              <div style={{ marginBottom: 14, padding: '9px 12px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 3, fontSize: 12.5, color: 'var(--accent)' }}>
                Broadcast scheduled successfully.
              </div>
            )}
            {sendError && (
              <div style={{ marginBottom: 14, padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
                {sendError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label className="field-label">Audience <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div className="input"><input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Active · BLR · last 30d" /></div>
              </div>
              <div className="field">
                <label className="field-label">Channel</label>
                <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                  <select value={channel} onChange={e => setChannel(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', height: '100%' }}>
                    <option value="push">Push</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="wa">WhatsApp</option>
                    <option value="push,wa">Push + WhatsApp</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Message <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Your message here…"
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule-strong)', borderRadius: 3, background: 'var(--surface)', fontSize: 13.5, resize: 'vertical', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}
                />
              </div>
              <div className="field">
                <label className="field-label">Schedule (optional)</label>
                <div className="input">
                  <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18, padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
              <div className="t-label" style={{ marginBottom: 10 }}>Estimated reach</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[['Audience', '—'], ['Reachable', '—'], ['Est. cost', '—']].map(([k, v]) => (
                  <div key={k}>
                    <div className="t-meta">{k}</div>
                    <div style={{ marginTop: 3, fontFamily: 'var(--font-serif)', fontSize: 20 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn sm accent" onClick={sendBroadcast} disabled={sending}>
                {sending ? 'Scheduling…' : scheduleTime ? 'Schedule broadcast' : 'Send now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
