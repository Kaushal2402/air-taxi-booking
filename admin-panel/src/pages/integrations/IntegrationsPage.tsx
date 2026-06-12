import { useState, useEffect, useCallback, useRef } from 'react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/axios'

// ── API types ─────────────────────────────────────────────────────────────────

interface ConfigValue { key: string; value: string; is_set: boolean; is_secret: boolean }
interface ConfigResponse { values: Record<string, ConfigValue> }

// ── Static integration definitions ───────────────────────────────────────────

type Status = 'connected' | 'missing' | 'partial' | 'stub'

interface EnvField {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'password' | 'number'
}

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  iconColor: string
  iconBg: string
  warning?: string
  isStub?: boolean
  fields: EnvField[]
}

const INTEGRATIONS: Record<string, Integration[]> = {
  Notifications: [
    {
      id: 'fcm', name: 'Firebase Cloud Messaging',
      description: 'Push notifications to customer and driver mobile apps via FCM v1 API (service account).',
      icon: 'bell', iconColor: '#ff6d00', iconBg: '#fff3e0',
      fields: [
        {
          key: 'FCM_SERVICE_ACCOUNT_JSON',
          label: 'Service Account JSON',
          placeholder: '{"type":"service_account","project_id":"…","private_key":"…"}',
          type: 'password',
        },
      ],
    },
    {
      id: 'smtp', name: 'SMTP Email',
      description: 'Transactional emails — OTP, booking confirmations, password reset.',
      icon: 'envelope', iconColor: '#1565c0', iconBg: '#e3f2fd',
      fields: [
        { key: 'SMTP_HOST',     label: 'Host',     placeholder: 'smtp.example.com' },
        { key: 'SMTP_PORT',     label: 'Port',     placeholder: '587', type: 'number' },
        { key: 'SMTP_USER',     label: 'Username', placeholder: 'user@example.com' },
        { key: 'SMTP_PASSWORD', label: 'Password', type: 'password' },
        { key: 'SMTP_FROM',     label: 'From Address', placeholder: 'noreply@example.com' },
        { key: 'SMTP_TLS',      label: 'TLS',      placeholder: 'true' },
      ],
    },
    {
      id: 'sms', name: 'SMS Gateway',
      description: 'OTP and booking alerts. Works with Twilio, MSG91, Fast2SMS or any REST gateway.',
      icon: 'phone', iconColor: '#2e7d32', iconBg: '#e8f5e9',
      fields: [
        { key: 'SMS_ENDPOINT',  label: 'API Endpoint', placeholder: 'https://…' },
        { key: 'SMS_API_KEY',   label: 'API Key', type: 'password' },
        { key: 'SMS_SENDER_ID', label: 'Sender ID', placeholder: 'AIRTXI' },
      ],
    },
    {
      id: 'whatsapp', name: 'WhatsApp (Meta Cloud API)',
      description: 'WhatsApp messages and template notifications to customers.',
      icon: 'globe', iconColor: '#00695c', iconBg: '#e0f2f1',
      fields: [
        { key: 'WHATSAPP_ENDPOINT', label: 'Endpoint', placeholder: 'https://graph.facebook.com/…' },
        { key: 'WHATSAPP_TOKEN',    label: 'Bearer Token', type: 'password' },
        { key: 'WHATSAPP_FROM',     label: 'From Number', placeholder: '+1234567890' },
      ],
    },
  ],
  Payments: [
    {
      id: 'razorpay', name: 'Razorpay',
      description: 'Booking payments, refunds, and payouts to drivers and operators.',
      icon: 'wallet', iconColor: '#6a1b9a', iconBg: '#f3e5f5',
      fields: [
        { key: 'RAZORPAY_KEY_ID',         label: 'Key ID',         placeholder: 'rzp_live_…' },
        { key: 'RAZORPAY_KEY_SECRET',      label: 'Key Secret',     type: 'password' },
        { key: 'RAZORPAY_WEBHOOK_SECRET',  label: 'Webhook Secret', type: 'password' },
      ],
    },
  ],
  Maps: [
    {
      id: 'google_maps', name: 'Google Maps',
      description: 'Geocoding, route distance calculation, and fare estimation.',
      icon: 'map', iconColor: '#c62828', iconBg: '#ffebee',
      fields: [
        { key: 'GOOGLE_MAPS_API_KEY', label: 'API Key', type: 'password', placeholder: 'AIza…' },
      ],
    },
  ],
  Storage: [
    {
      id: 'aws_s3', name: 'AWS S3',
      description: 'File storage for KYC documents, operator certificates, and profile photos.',
      icon: 'archive', iconColor: '#e65100', iconBg: '#fff3e0',
      fields: [
        { key: 'AWS_ACCESS_KEY_ID',     label: 'Access Key ID' },
        { key: 'AWS_SECRET_ACCESS_KEY', label: 'Secret Access Key', type: 'password' },
        { key: 'AWS_REGION',            label: 'Region', placeholder: 'ap-south-1' },
        { key: 'AWS_BUCKET',            label: 'Bucket Name' },
      ],
    },
  ],
  Infrastructure: [
    {
      id: 'redis', name: 'Redis',
      description: 'Real-time message broker for Socket.IO dispatch events and session caching.',
      icon: 'bolt', iconColor: '#b71c1c', iconBg: '#ffebee',
      fields: [
        { key: 'REDIS_HOST', label: 'Host', placeholder: '127.0.0.1' },
        { key: 'REDIS_PORT', label: 'Port', placeholder: '6379', type: 'number' },
        { key: 'REDIS_DB',   label: 'DB Index', placeholder: '0', type: 'number' },
      ],
    },
    {
      id: 'socketio', name: 'Socket.IO',
      description: 'WebSocket server for live dispatch, driver location, and booking status events.',
      icon: 'bolt', iconColor: '#0277bd', iconBg: '#e1f5fe',
      isStub: true,
      fields: [],
    },
  ],
  'KYC & Compliance': [
    {
      id: 'kyc', name: 'KYC Verification',
      description: 'Automated identity and document verification for drivers and operators.',
      icon: 'shield', iconColor: '#546e7a', iconBg: '#eceff1',
      isStub: true,
      fields: [],
    },
    {
      id: 'call_masking', name: 'Call Masking',
      description: 'Hides driver and customer phone numbers during calls (Exotel, Twilio Proxy).',
      icon: 'phone', iconColor: '#546e7a', iconBg: '#eceff1',
      isStub: true,
      fields: [],
    },
  ],
}

const TABS = Object.keys(INTEGRATIONS)

const SECRET_KEYS = new Set([
  'FCM_SERVICE_ACCOUNT_JSON','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET',
  'SMTP_PASSWORD','SMS_API_KEY','WHATSAPP_TOKEN','AWS_SECRET_ACCESS_KEY',
])

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveStatus(integration: Integration, config: Record<string, ConfigValue>): Status {
  if (integration.isStub) return 'stub'
  if (integration.fields.length === 0) return 'connected'
  const required = integration.fields.filter(f => !f.key.includes('TLS'))
  const setCount = required.filter(f => config[f.key]?.is_set).length
  if (setCount === 0) return 'missing'
  if (setCount === required.length) return 'connected'
  return 'partial'
}

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string; dot: string }> = {
  connected: { label: 'Connected',  color: '#2e7d32', bg: '#e8f5e9', dot: '#43a047' },
  missing:   { label: 'Not Set',    color: '#b71c1c', bg: '#ffebee', dot: '#e53935' },
  partial:   { label: 'Partial',    color: '#e65100', bg: '#fff3e0', dot: '#fb8c00' },
  stub:      { label: 'Stub / N/A', color: '#546e7a', bg: '#eceff1', dot: '#90a4ae' },
}

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_CFG[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20,
      background: c.bg, color: c.color,
      fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />
      {c.label}
    </span>
  )
}

// ── Integration card ──────────────────────────────────────────────────────────

function IntegrationCard({
  item, config, onSave,
}: {
  item: Integration
  config: Record<string, ConfigValue>
  onSave: (updates: Record<string, string>) => Promise<void>
}) {
  const status = deriveStatus(item, config)
  const cardRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const startEdit = () => {
    const initial: Record<string, string> = {}
    item.fields.forEach(f => {
      const cv = config[f.key]
      initial[f.key] = (cv?.is_secret && cv?.is_set) ? '' : (cv?.value ?? '')
    })
    setDraft(initial)
    setEditing(true)
    setSaved(false)
    // Give React one frame to render the expanded fields, then scroll into view
    setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Only send keys that have a value (don't clear secrets left blank)
      const updates: Record<string, string> = {}
      item.fields.forEach(f => {
        const val = draft[f.key]
        const wasSecret = config[f.key]?.is_secret && config[f.key]?.is_set
        if (val !== '' || !wasSecret) updates[f.key] = val ?? ''
      })
      await onSave(updates)
      setSaved(true)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={cardRef} style={{
      background: 'var(--surface)',
      border: `1px solid ${editing ? 'var(--accent)' : 'var(--rule)'}`,
      borderRadius: 8,
      transition: 'border-color 150ms',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8, flexShrink: 0,
          background: item.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={item.icon as never} size={18} style={{ color: item.iconColor }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{item.name}</span>
            <StatusBadge status={status} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.5 }}>
            {item.description}
          </div>
        </div>
        {!item.isStub && item.fields.length > 0 && !editing && (
          <button className="btn ghost sm" onClick={startEdit} style={{ flexShrink: 0, fontSize: 12 }}>
            <Icon name="pencil" size={13} /> Configure
          </button>
        )}
        {editing && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button className="btn ghost sm" onClick={() => setEditing(false)} style={{ fontSize: 12 }}>
              Cancel
            </button>
            <button className="btn accent sm" onClick={handleSave} disabled={saving} style={{ fontSize: 12 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Warning */}
      {item.warning && (
        <div style={{
          margin: '0 16px 10px',
          padding: '7px 10px',
          background: '#fff8e1', border: '1px solid #ffe082',
          borderRadius: 5, fontSize: 11.5, color: '#e65100',
          display: 'flex', gap: 7,
        }}>
          <Icon name="alert" size={13} style={{ color: '#fb8c00', flexShrink: 0, marginTop: 1 }} />
          {item.warning}
        </div>
      )}

      {/* Stub notice */}
      {item.isStub && (
        <div style={{
          margin: '0 16px 12px',
          padding: '7px 10px',
          background: 'var(--surface-2)', border: '1px solid var(--rule)',
          borderRadius: 5, fontSize: 11.5, color: 'var(--ink-3)',
        }}>
          No configuration required — built-in to the platform in v1.
        </div>
      )}

      {/* Saved banner */}
      {saved && (
        <div style={{
          margin: '0 16px 10px', padding: '7px 10px',
          background: '#e8f5e9', border: '1px solid #a5d6a7',
          borderRadius: 5, fontSize: 12, color: '#2e7d32',
          display: 'flex', gap: 7, alignItems: 'center',
        }}>
          <Icon name="check" size={13} style={{ color: '#43a047' }} /> Saved and applied — no restart needed.
        </div>
      )}

      {/* Fields — view mode */}
      {!editing && !item.isStub && item.fields.length > 0 && (
        <div style={{ borderTop: '1px solid var(--rule)', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {item.fields.map(f => {
            const cv = config[f.key]
            return (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: cv?.is_set ? '#43a047' : '#e53935',
                }} />
                <code style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', flex: 1 }}>
                  {f.key}
                </code>
                <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: cv?.is_set ? '#2e7d32' : '#b71c1c' }}>
                  {cv?.is_set
                    ? (cv.is_secret ? '••••••' : cv.value)
                    : 'not set'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Fields — edit mode */}
      {editing && (
        <div style={{ borderTop: '1px solid var(--rule)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {item.fields.map(f => {
            const isSecret = SECRET_KEYS.has(f.key)
            const showPlain = showSecrets[f.key]
            const inputType = isSecret && !showPlain ? 'password' : (f.type === 'number' ? 'number' : 'text')
            return (
              <div key={f.key} className="field">
                <label className="field-label">{f.label}</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="input"
                    type={inputType}
                    placeholder={
                      isSecret && config[f.key]?.is_set
                        ? '(leave blank to keep existing)'
                        : (f.placeholder ?? '')
                    }
                    value={draft[f.key] ?? ''}
                    onChange={e => setDraft(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ flex: 1, paddingRight: isSecret ? 36 : undefined, fontSize: 13 }}
                  />
                  {isSecret && (
                    <button
                      type="button"
                      onClick={() => setShowSecrets(p => ({ ...p, [f.key]: !showPlain }))}
                      style={{
                        position: 'absolute', right: 8,
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 0, color: 'var(--ink-3)',
                      }}
                    >
                      <Icon name={showPlain ? 'eyeOff' : 'eye'} size={15} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Summary strip ─────────────────────────────────────────────────────────────

function SummaryStrip({ config }: { config: Record<string, ConfigValue> }) {
  const all = Object.values(INTEGRATIONS).flat()
  const counts = { connected: 0, partial: 0, missing: 0, stub: 0 }
  all.forEach(i => { counts[deriveStatus(i, config)]++ })
  return (
    <div style={{
      display: 'flex', gap: 16, flexWrap: 'wrap',
      padding: '9px 14px',
      background: 'var(--surface-2)',
      border: '1px solid var(--rule)',
      borderRadius: 6, marginBottom: 16, flexShrink: 0,
    }}>
      {([
        ['connected', 'Connected',  '#43a047'],
        ['partial',   'Partial',    '#fb8c00'],
        ['missing',   'Not Set',    '#e53935'],
        ['stub',      'Stub / N/A', '#90a4ae'],
      ] as const).map(([k, label, color]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
            <strong style={{ color: 'var(--ink)' }}>{counts[k]}</strong> {label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [config, setConfig] = useState<Record<string, ConfigValue>>({})
  const [loading, setLoading] = useState(true)

  const loadConfig = useCallback(async () => {
    try {
      const res = await api.get<ConfigResponse>('/integrations')
      setConfig(res.data.values)
    } catch {
      /* ignore — will show empty */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const handleSave = useCallback(async (updates: Record<string, string>) => {
    const res = await api.patch<ConfigResponse>('/integrations', { updates })
    setConfig(res.data.values)
  }, [])

  const tabItems = INTEGRATIONS[activeTab] ?? []

  return (
    <Shell
      activeId="integrations"
      breadcrumb="Platform"
      title="Integrations"
      subtitle="Third-party services and provider configuration"
    >
      <div style={{ padding: isMobile ? '12px' : '20px 28px' }}>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)' }}>
            Loading configuration…
          </div>
        ) : (
          <>
            <SummaryStrip config={config} />

            {/* Tabs — sticky so they stay visible while cards scroll */}
            <div style={{
              position: 'sticky', top: 0, zIndex: 10,
              background: 'var(--bg)',
              display: 'flex', gap: 2,
              borderBottom: '2px solid var(--rule)',
              marginBottom: 16,
              overflowX: 'auto', overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
            }}>
              {TABS.map(tab => {
                const items = INTEGRATIONS[tab]
                const hasIssue = items.some(i => {
                  const s = deriveStatus(i, config)
                  return s === 'missing' || s === 'partial'
                })
                const active = activeTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '8px 14px',
                      border: 'none',
                      borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                      marginBottom: -2,
                      background: 'transparent', cursor: 'pointer',
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      color: active ? 'var(--accent)' : 'var(--ink-2)',
                      display: 'flex', alignItems: 'center', gap: 6,
                      whiteSpace: 'nowrap', transition: 'color 120ms',
                      flexShrink: 0,
                    }}
                  >
                    {tab}
                    {hasIssue && !active && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e53935' }} />
                    )}
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)',
                      background: active ? 'var(--accent)' : 'var(--surface-3)',
                      color: active ? '#fff' : 'var(--ink-3)',
                      borderRadius: 10, padding: '1px 5px',
                    }}>
                      {items.length}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Cards — natural page scroll via Shell's <main> */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 32 }}>
              {tabItems.map(item => (
                <IntegrationCard
                  key={item.id}
                  item={item}
                  config={config}
                  onSave={handleSave}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}
