import { useState, useEffect } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { parseApiError } from '../../hooks/useApiError'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { notificationsService } from '../../services/notificationsService'
import type { NotificationTemplate, NotificationStats } from '../../services/notificationsService'
import { usePlatformStore } from '../../store/platformStore'

const CHAN_LABELS: Record<string, string> = {
  push: 'Push', sms: 'SMS', email: 'Email', wa: 'WhatsApp',
}

function ChanChip({ c }: { c: string }) {
  return (
    <span className="badge" style={{ height: 20, padding: '0 7px', fontSize: 10 }}>
      {CHAN_LABELS[c] ?? c}
    </span>
  )
}

const CATEGORIES = ['Transactional', 'Marketing', 'Operational']

const EMPTY_TEMPLATE: {
  name: string; template_code: string; event_trigger: string; channels: string[]; status: string; category: string;
  push_title: string | null; push_body: string | null; sms_body: string | null; email_subject: string | null;
  email_body: string | null; wa_body: string | null; priority: string; quiet_hours_override: boolean;
  sms_fallback_seconds: number; dedup_window_seconds: number;
} = {
  name: '',
  template_code: '',
  event_trigger: '',
  channels: [],
  status: 'draft',
  category: 'Transactional',
  push_title: null,
  push_body: null,
  sms_body: null,
  email_subject: null,
  email_body: null,
  wa_body: null,
  priority: 'normal',
  quiet_hours_override: false,
  sms_fallback_seconds: 30,
  dedup_window_seconds: 120,
}

export default function NotificationTemplatesPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const marketingAllowed = usePlatformStore(s => s.consent_marketing_opt_in)
  useIsTablet()

  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showMobileNew, setShowMobileNew] = useState(false)
  const [draft, setDraft] = useState({ ...EMPTY_TEMPLATE })
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isForbidden, setIsForbidden] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<NotificationTemplate | null>(null)
  const canBroadcast = usePermission('notifications.broadcast.send')
  const canManageTemplates = usePermission('notifications.templates.manage')

  const load = async () => {
    setLoading(true)
    try {
      const [tmplData, statsData] = await Promise.all([
        notificationsService.listTemplates({ search: search || undefined, channel: channelFilter || undefined, status: statusFilter || undefined }),
        notificationsService.getStats(),
      ])
      setTemplates(tmplData.items)
      setStats(statsData)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, channelFilter, statusFilter])

  const grouped = CATEGORIES.map(cat => ({
    cat,
    rows: templates.filter(t => t.category === cat),
  })).filter(g => g.rows.length > 0)

  const saveNew = async () => {
    if (!draft.name.trim()) { setApiError('Name is required'); return }
    if (!draft.template_code.trim()) { setApiError('Template code is required'); return }
    setSaving(true); setApiError('')
    try {
      await notificationsService.createTemplate(draft)
      await load()
      setShowNew(false); setShowMobileNew(false)
      setDraft({ ...EMPTY_TEMPLATE })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setApiError(err?.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  const deleteTemplate = async (t: NotificationTemplate) => {
    try {
      await notificationsService.deleteTemplate(t.id)
      await load()
    } catch { /* ignore */ }
    setConfirmDelete(null)
  }

  const sentFormatted = stats ? (stats.sent_30d >= 1_000_000
    ? `${(stats.sent_30d / 1_000_000).toFixed(2)} M`
    : stats.sent_30d >= 1000 ? `${Math.round(stats.sent_30d / 1000)} K` : String(stats.sent_30d)) : '—'

  const KPIS = [
    { k: 'Sent · 30d',       v: sentFormatted,                         m: 'Across channels', c: 'var(--ink-2)' },
    { k: 'Delivery rate',    v: stats ? `${stats.delivery_rate}%` : '—', m: 'Overall',       c: 'var(--accent)' },
    { k: 'Push opt-in',      v: stats ? `${stats.push_opt_in}%` : '—', m: 'Of active users', c: 'var(--ink-2)' },
    { k: 'Avg open · mktg',  v: stats ? `${stats.avg_open_marketing}%` : '—', m: '30d',      c: 'var(--accent)' },
    { k: 'Live templates',   v: stats ? String(stats.live_templates) : '—', m: `of ${stats?.total_templates ?? '—'} total`, c: 'var(--ink-2)' },
  ]

  return (
    <Shell
      activeId="notifications"
      breadcrumb="System · Notifications"
      title="Notification templates"
      subtitle={stats ? `${stats.total_templates} templates · 4 channels · ${sentFormatted} sent · 30d` : 'Loading…'}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/notifications/delivery')}>Delivery log</button>
          <button className="btn sm accent" onClick={() => {
            setDraft({ ...EMPTY_TEMPLATE }); setApiError('')
            setShowNew(true)
            if (isMobile) setShowMobileNew(true)
          }}>
            <Icon name="plus" size={13} />New template
          </button>
        </div>
      }
    >
      {!marketingAllowed && (
        <div style={{
          margin: '12px 32px 0',
          padding: '10px 16px',
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: 4,
          fontSize: 13,
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span>⚠</span>
          <span>
            <strong>Marketing communications are disabled.</strong> Broadcasting to the Marketing
            category will be blocked. Enable <em>Marketing communications opt-in</em> in{' '}
            <strong>Settings → Data &amp; Privacy → Consent</strong> to send marketing notifications.
          </span>
        </div>
      )}
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 18 }}>

        {/* KPIs */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        }}>
          {KPIS.map((k, i) => (
            <div key={k.k} style={{
              padding: isMobile ? '12px 14px' : '18px 22px',
              borderRight: isMobile
                ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                : (i < 4 ? '1px solid var(--rule)' : 'none'),
              borderBottom: isMobile && i < 4 ? '1px solid var(--rule)' : 'none',
            }}>
              <div className="t-label" style={{ padding: 0 }}>{k.k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 20 : 28, fontWeight: 400 }}>{k.v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: k.c }}>{k.m}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: isMobile ? '100%' : 280, height: 32 }}>
            <Icon name="search" size={13} className="icon" />
            <input
              placeholder="Template, event, channel…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
            style={{ height: 32, padding: '0 10px', border: '1px solid var(--rule-strong)', borderRadius: 3, background: 'var(--surface)', fontSize: 12.5 }}
          >
            <option value="">All channels</option>
            <option value="push">Push</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="wa">WhatsApp</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ height: 32, padding: '0 10px', border: '1px solid var(--rule-strong)', borderRadius: 3, background: 'var(--surface)', fontSize: 12.5 }}
          >
            <option value="">All statuses</option>
            <option value="live">Live</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* New template form */}
        {showNew && (!isMobile || showMobileNew) && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            {isMobile && (
              <button
                onClick={() => { setShowMobileNew(false); setShowNew(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                  width: '100%', fontSize: 13, color: 'var(--accent)',
                  background: 'var(--surface-2)', border: 'none', borderBottom: '1px solid var(--rule)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                <Icon name="chevLeft" size={14} stroke={2} />
                Back to templates
              </button>
            )}
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>New template</h3>
            </div>
            {apiError && (
              <div style={{ margin: '12px 20px 0', padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
                {apiError}
              </div>
            )}
            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div className="input"><input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Booking confirmed" /></div>
              </div>
              <div className="field">
                <label className="field-label">Template code <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div className="input"><input value={draft.template_code} onChange={e => setDraft(d => ({ ...d, template_code: e.target.value.toUpperCase() }))} placeholder="NT-BK-CONF" style={{ fontFamily: 'var(--font-mono)' }} /></div>
              </div>
              <div className="field">
                <label className="field-label">Event trigger</label>
                <div className="input"><input value={draft.event_trigger} onChange={e => setDraft(d => ({ ...d, event_trigger: e.target.value }))} placeholder="Booking · confirmed" /></div>
              </div>
              <div className="field">
                <label className="field-label">Category</label>
                <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
                  <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', height: '100%' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="field" style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
                <label className="field-label">Channels</label>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {(['push', 'sms', 'email', 'wa'] as const).map(ch => (
                    <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={draft.channels.includes(ch)}
                        onChange={e => setDraft(d => ({
                          ...d,
                          channels: e.target.checked ? [...d.channels, ch] : d.channels.filter(c => c !== ch),
                        }))}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      {CHAN_LABELS[ch]}
                    </label>
                  ))}
                </div>
              </div>
              <div className="field" style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
                <label className="field-label">Push body</label>
                <div className="input"><input value={draft.push_body ?? ''} onChange={e => setDraft(d => ({ ...d, push_body: e.target.value || null }))} placeholder="Your {{vehicle}} is {{eta}} away…" /></div>
              </div>
            </div>
            <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn sm" onClick={() => { setShowNew(false); setShowMobileNew(false) }}>Cancel</button>
              <button className="btn accent sm" onClick={saveNew} disabled={saving}>
                {saving ? 'Creating…' : 'Create template'}
              </button>
            </div>
          </div>
        )}

        {/* Grouped tables */}
        {loading ? (
          <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
        ) : grouped.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            No templates match your filter.
          </div>
        ) : grouped.map(({ cat, rows }) => (
          <div key={cat} style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="t-label" style={{ padding: 0 }}>{cat}</span>
              <span className="t-meta">{rows.length} templates</span>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl" style={{ minWidth: isMobile ? 600 : undefined }}>
                <thead>
                  <tr>
                    <th>Template</th>
                    <th>Trigger event</th>
                    <th>Channels</th>
                    {!isMobile && <th style={{ textAlign: 'right' }}>Sent · 30d</th>}
                    {!isMobile && <th style={{ textAlign: 'right' }}>Open</th>}
                    <th>Status</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(t => (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/notifications/${t.id}/edit`)}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>{t.template_code}</span>
                        </div>
                      </td>
                      <td className="t-meta">{t.event_trigger}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {t.channels.map(c => <ChanChip key={c} c={c} />)}
                        </div>
                      </td>
                      {!isMobile && <td className="num" style={{ textAlign: 'right', fontSize: 13 }}>{t.sent_30d ? t.sent_30d.toLocaleString() : '—'}</td>}
                      {!isMobile && (
                        <td className="num" style={{ textAlign: 'right', fontSize: 12.5, color: t.open_rate ? 'var(--ink-2)' : 'var(--ink-4)' }}>
                          {t.open_rate ?? '—'}
                        </td>
                      )}
                      <td>
                        {t.status === 'live'
                          ? <span className="badge ok"><span className="dot ok" />Live</span>
                          : t.status === 'paused'
                          ? <span className="badge warn"><span className="dot warn" />Paused</span>
                          : <span className="badge"><span className="dot pending" />Draft</span>}
                      </td>
                      <td>
                        <button
                          className="btn ghost icon sm"
                          onClick={e => { e.stopPropagation(); setConfirmDelete(t) }}
                        >
                          <Icon name="trash" size={13} style={{ color: 'var(--danger)' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete template"
          description={`"${confirmDelete.name}" will be permanently deleted.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => deleteTemplate(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </Shell>
  )
}
