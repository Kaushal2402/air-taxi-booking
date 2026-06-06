import { useState, useEffect } from 'react'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { notificationsService } from '../../services/notificationsService'
import type { NotificationTemplate } from '../../services/notificationsService'
import { useCurrencySymbol } from '../../lib/utils'

const CHAN_LABELS: Record<string, string> = {
  push: 'Push', sms: 'SMS', email: 'Email', wa: 'WhatsApp',
}

const TEMPLATE_VARS = ['{{customer_name}}', '{{driver_name}}', '{{vehicle}}', '{{eta}}', '{{plate}}', '{{otp}}', '{{fare}}']

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const sym = useCurrencySymbol()

  const [template, setTemplate] = useState<NotificationTemplate | null>(null)
  const [draft, setDraft] = useState<Partial<NotificationTemplate>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isForbidden, setIsForbidden] = useState(false)
  const [activePreview, setActivePreview] = useState<'push' | 'sms'>('push')

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const t = await notificationsService.getTemplate(id)
      setTemplate(t)
      setDraft({ ...t })
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const patch = <K extends keyof NotificationTemplate>(k: K, v: NotificationTemplate[K]) =>
    setDraft(d => ({ ...d, [k]: v }))

  const save = async () => {
    if (!id) return
    setSaving(true); setApiError('')
    try {
      await notificationsService.updateTemplate(id, draft as Parameters<typeof notificationsService.updateTemplate>[1])
      await load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setApiError(err?.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  const toggleChannel = (ch: string) => {
    const channels = draft.channels ?? []
    patch('channels', channels.includes(ch) ? channels.filter(c => c !== ch) : [...channels, ch])
  }

  const insertVar = (v: string) => {
    const body = draft.push_body ?? ''
    patch('push_body', body + v)
  }

  const previewBody = (draft.push_body ?? '')
    .replace('{{customer_name}}', 'Priya')
    .replace('{{driver_name}}', 'Rajesh')
    .replace('{{vehicle}}', 'White Swift Dzire')
    .replace('{{eta}}', '2 min')
    .replace('{{plate}}', 'KA 01 AB 4521')
    .replace('{{otp}}', '4821')
    .replace('{{fare}}', `${sym} 142`)

  const previewTitle = (draft.push_title ?? '')
    .replace('{{customer_name}}', 'Priya')
    .replace('{{driver_name}}', 'Rajesh')
    .replace('{{vehicle}}', 'White Swift Dzire')
    .replace('{{eta}}', '2 min')
    .replace('{{plate}}', 'KA 01 AB 4521')
    .replace('{{otp}}', '4821')
    .replace('{{fare}}', `${sym} 142`)

  if (isForbidden) return <AccessDeniedPage message={`You don't have permission to access this page.`} />

  if (loading) {
    return (
      <Shell activeId="notifications" breadcrumb="System · Notifications · Editor" title="Loading…" subtitle="">
        <div style={{ padding: 32, color: 'var(--ink-3)' }}>Loading template…</div>
      </Shell>
    )
  }

  if (!template) {
    return (
      <Shell activeId="notifications" breadcrumb="System · Notifications" title="Not found" subtitle="">
        <div style={{ padding: 32, color: 'var(--ink-3)' }}>Template not found.</div>
      </Shell>
    )
  }

  return (
    <Shell
      activeId="notifications"
      breadcrumb="System · Notifications · Editor"
      title={template.name}
      subtitle={`${template.template_code} · ${template.category} · ${template.status}`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/notifications')}>← Templates</button>
          <button className="btn sm" onClick={() => patch('status', 'paused')}>Pause</button>
          <button className="btn accent sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save & publish'}
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '24px 32px 28px' }}>
        {apiError && (
          <div style={{ marginBottom: 16, padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
            {apiError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : '1.4fr 1fr', gap: 24 }}>
          {/* Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Basic info */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 14 }}>Template details</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Name</label>
                  <div className="input"><input value={draft.name ?? ''} onChange={e => patch('name', e.target.value)} /></div>
                </div>
                <div className="field">
                  <label className="field-label">Event trigger</label>
                  <div className="input"><input value={draft.event_trigger ?? ''} onChange={e => patch('event_trigger', e.target.value)} /></div>
                </div>
                <div className="field">
                  <label className="field-label">Category</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                    <select value={draft.category ?? 'Transactional'} onChange={e => patch('category', e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', height: '100%' }}>
                      <option value="Transactional">Transactional</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Operational">Operational</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Status</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                    <select value={draft.status ?? 'draft'} onChange={e => patch('status', e.target.value as NotificationTemplate['status'])} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', height: '100%' }}>
                      <option value="draft">Draft</option>
                      <option value="live">Live</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Channels */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 14 }}>Channels</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(['push', 'sms', 'email', 'wa'] as const).map(ch => {
                  const on = (draft.channels ?? []).includes(ch)
                  const meta: Record<string, string> = {
                    push: 'Primary · in-app + system',
                    sms: 'Fallback if push undelivered in 30s',
                    wa: 'Requires approved template',
                    email: 'For receipts and summaries',
                  }
                  return (
                    <div
                      key={ch}
                      onClick={() => toggleChannel(ch)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                        background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ width: 34, height: 34, border: '1px solid var(--rule-strong)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: on ? 'var(--accent)' : 'var(--ink-4)' }}>
                        <Icon name={ch === 'push' ? 'bell' : ch === 'sms' ? 'device' : ch === 'wa' ? 'phone' : 'envelope'} size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{CHAN_LABELS[ch]}</div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{meta[ch]}</div>
                      </div>
                      <div style={{ width: 32, height: 18, borderRadius: 9, padding: 2, background: on ? 'var(--accent)' : 'var(--rule-strong)', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Push content */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 14 }}>Push content</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Title</label>
                  <div className="input"><input value={draft.push_title ?? ''} onChange={e => patch('push_title', e.target.value || null)} placeholder="{{driver_name}} is arriving" /></div>
                </div>
                <div className="field">
                  <label className="field-label">Body</label>
                  <textarea
                    value={draft.push_body ?? ''}
                    onChange={e => patch('push_body', e.target.value || null)}
                    placeholder="Your {{vehicle}} is {{eta}} away. Look for {{plate}}."
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule-strong)', borderRadius: 3, background: 'var(--surface)', fontSize: 13.5, resize: 'vertical', fontFamily: 'var(--font-sans)', lineHeight: 1.55 }}
                  />
                </div>
                <div>
                  <div className="t-label" style={{ marginBottom: 8 }}>Insert variable</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {TEMPLATE_VARS.map(v => (
                      <button
                        key={v}
                        className="btn sm"
                        onClick={() => insertVar(v)}
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--accent-ink)', borderStyle: 'dashed' }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SMS body */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 14 }}>SMS fallback content</div>
              <div className="field">
                <label className="field-label">SMS body</label>
                <textarea
                  value={draft.sms_body ?? ''}
                  onChange={e => patch('sms_body', e.target.value || null)}
                  placeholder="Acme: {{driver_name}} ({{vehicle}}, {{plate}}) is {{eta}} away."
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule-strong)', borderRadius: 3, background: 'var(--surface)', fontSize: 13.5, resize: 'vertical', fontFamily: 'var(--font-sans)' }}
                />
              </div>
            </div>

            {/* Delivery rules */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 14 }}>Delivery rules</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Priority</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                    <select value={draft.priority ?? 'normal'} onChange={e => patch('priority', e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', height: '100%' }}>
                      <option value="normal">Normal</option>
                      <option value="high">High · time-sensitive</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">SMS fallback after (s)</label>
                  <div className="input">
                    <input type="number" min={0} value={draft.sms_fallback_seconds ?? 30} onChange={e => patch('sms_fallback_seconds', parseInt(e.target.value) || 30)} />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Dedup window (s)</label>
                  <div className="input">
                    <input type="number" min={0} value={draft.dedup_window_seconds ?? 120} onChange={e => patch('dedup_window_seconds', parseInt(e.target.value) || 120)} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draft.quiet_hours_override ?? false}
                      onChange={e => patch('quiet_hours_override', e.target.checked)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    Override quiet hours
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div className="t-label">Live preview</div>
                <div style={{ display: 'flex', border: '1px solid var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                  {(['push', 'sms'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setActivePreview(p)}
                      style={{
                        padding: '4px 10px', fontSize: 11.5, border: 'none', cursor: 'pointer',
                        background: activePreview === p ? 'var(--accent)' : 'transparent',
                        color: activePreview === p ? '#fff' : 'var(--ink-3)',
                      }}
                    >
                      {p === 'push' ? 'Push' : 'SMS'}
                    </button>
                  ))}
                </div>
              </div>

              {activePreview === 'push' && (
                <div style={{ background: 'var(--surface-sunk)', borderRadius: 14, padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 200, justifyContent: 'center' }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-pop)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--ink)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>A</div>
                      <span style={{ fontSize: 11.5, fontWeight: 600 }}>Acme Mobility</span>
                      <span className="t-meta" style={{ marginLeft: 'auto' }}>now</span>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{previewTitle || '(No title)'}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>{previewBody || '(No body)'}</div>
                  </div>
                </div>
              )}

              {activePreview === 'sms' && (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.5 }}>
                  {(draft.sms_body ?? '')
                    .replace('{{customer_name}}', 'Priya')
                    .replace('{{driver_name}}', 'Rajesh')
                    .replace('{{vehicle}}', 'White Swift Dzire')
                    .replace('{{eta}}', '2 min')
                    .replace('{{plate}}', 'KA01AB4521')
                    .replace('{{otp}}', '4821')
                    .replace('{{fare}}', `${sym} 142`) || '(No SMS body)'}
                </div>
              )}

              <div className="t-meta" style={{ marginTop: 12 }}>Rendered with sample values · variables resolve at send time.</div>
            </div>

            {/* Stats */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 22px' }}>
              <div className="t-label" style={{ marginBottom: 12 }}>Performance · 30d</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Sent', template.sent_30d ? template.sent_30d.toLocaleString() : '—'],
                  ['Open rate', template.open_rate ?? '—'],
                  ['Status', template.status],
                  ['Version', `v${template.updated_at.slice(0, 10)}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding: '8px 10px', border: '1px solid var(--rule)', background: 'var(--surface-2)' }}>
                    <div className="t-meta">{k}</div>
                    <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 13 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
