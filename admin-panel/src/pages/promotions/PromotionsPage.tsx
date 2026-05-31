import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { promotionsService } from '../../services/promotionsService'
import type { Promotion, PromotionAnalytics, CreatePromotionBody, UpdatePromotionBody } from '../../services/promotionsService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMinor = (v: number) => `₹${(v / 100).toLocaleString('en-IN')}`

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function budgetPct(p: Promotion): number {
  if (!p.total_budget_minor) return 0
  return Math.min(100, Math.round((p.budget_spent_minor / p.total_budget_minor) * 100))
}

function budgetColor(pct: number): string {
  if (pct >= 85) return 'var(--danger)'
  if (pct >= 60) return 'var(--warn)'
  return 'var(--accent)'
}

function StatusBadge({ status }: { status: Promotion['status'] }) {
  if (status === 'active') return <span className="badge ok"><span className="dot ok" />Active</span>
  if (status === 'paused') return <span className="badge warn"><span className="dot warn" />Paused</span>
  if (status === 'expired') return <span className="badge danger"><span className="dot danger" />Expired</span>
  if (status === 'depleted') return <span className="badge danger"><span className="dot danger" />Depleted</span>
  return <span className="badge"><span className="dot pending" />Draft</span>
}

function CodeChip({ code, large }: { code: string; large?: boolean }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: large ? 18 : 13,
      fontWeight: 500,
      background: 'var(--ink)',
      color: 'var(--surface)',
      padding: large ? '4px 12px' : '3px 8px',
      borderRadius: 2,
      letterSpacing: '0.05em',
    }}>{code}</span>
  )
}

// ── Static options ────────────────────────────────────────────────────────────

const SERVICE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'cab', label: 'Cab' },
  { value: 'bike', label: 'Bike' },
  { value: 'xl', label: 'XL' },
  { value: 'airport', label: 'Airport' },
  { value: 'air', label: 'Air Taxi' },
  { value: 'all', label: 'All services' },
]

const SEGMENT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '— No restriction' },
  { value: 'first_ride', label: 'First ride' },
  { value: 'all', label: 'All customers' },
  { value: 'frequent', label: 'Frequent' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'loyalist', label: 'Loyalist' },
  { value: 'first_air_ride', label: 'First air ride' },
]

// ── New Promotion Modal ───────────────────────────────────────────────────────

interface NewPromoModalProps {
  onClose: () => void
  onCreated: (p: Promotion) => void
}

function NewPromoModal({ onClose, onCreated }: NewPromoModalProps) {
  const [form, setForm] = useState<CreatePromotionBody>({
    code: '',
    type: 'percent',
    value: 10,
    validity_from: '',
    validity_to: '',
    total_budget_minor: 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const patch = <K extends keyof CreatePromotionBody>(k: K, v: CreatePromotionBody[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.code.trim()) { setError('Code is required'); return }
    if (!form.validity_from) { setError('Validity from is required'); return }
    if (!form.validity_to) { setError('Validity to is required'); return }
    setSaving(true); setError('')
    try {
      const created = await promotionsService.createPromotion(form)
      onCreated(created)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Failed to create promotion')
    } finally { setSaving(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(15,13,10,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--rule)',
        borderRadius: 4, width: '100%', maxWidth: 480,
      }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>New promotion</span>
          <button className="btn ghost sm" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          <div className="field">
            <label className="field-label">Promo code <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input">
              <input
                value={form.code}
                onChange={e => patch('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="WELCOME20"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Type</label>
              <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                <select value={form.type} onChange={e => patch('type', e.target.value as 'flat' | 'percent')}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%' }}>
                  <option value="percent">Percentage off</option>
                  <option value="flat">Flat amount</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Value {form.type === 'percent' ? '(%)' : '(₹ in paise)'}</label>
              <div className="input">
                <input type="number" min={0} value={form.value} onChange={e => patch('value', Number(e.target.value))} />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Validity from <span style={{ color: 'var(--danger)' }}>*</span></label>
              <div className="input">
                <input type="datetime-local" value={form.validity_from} onChange={e => patch('validity_from', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Validity to <span style={{ color: 'var(--danger)' }}>*</span></label>
              <div className="input">
                <input type="datetime-local" value={form.validity_to} onChange={e => patch('validity_to', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Total budget (paise) <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="input">
              <input type="number" min={0} value={form.total_budget_minor} onChange={e => patch('total_budget_minor', Number(e.target.value))} placeholder="e.g. 50000000 = ₹5 Lakh" />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn accent sm" onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create draft'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Eligibility Preview ───────────────────────────────────────────────────────

function EligibilityPreview({ draft }: { draft: UpdatePromotionBody & { code?: string } }) {
  const { type, value, cap_minor, new_customers_only, segment } = draft
  const who = new_customers_only ? 'A new customer' : 'A customer'
  const discount = type === 'percent'
    ? `${value}% off`
    : value != null ? `₹${(value / 100).toLocaleString('en-IN')} off` : 'a discount'
  const cap = cap_minor ? `, up to ₹${(cap_minor / 100).toLocaleString('en-IN')}` : ', no cap'
  const segLabel = SEGMENT_OPTIONS.find(s => s.value === (segment ?? ''))?.label ?? 'all customers'

  return (
    <div style={{ padding: '16px 18px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
      <div className="t-label" style={{ marginBottom: 8 }}>Live eligibility preview</div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
        {who} booking a qualifying ride would get{' '}
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{discount}</span>
        {cap}. Eligible segment: <span style={{ color: 'var(--ink)' }}>{segLabel}</span>.
        {new_customers_only && ' Returning customers see "Not eligible · new customers only".'}
      </div>
    </div>
  )
}

// ── Editor Panel (extracted to avoid focus-loss on re-render) ─────────────────

interface EditorPanelProps {
  selected: Promotion | null
  draft: UpdatePromotionBody
  saving: boolean
  statusPending: boolean
  apiError: string
  isMobile: boolean
  patchDraft: <K extends keyof UpdatePromotionBody>(k: K, v: UpdatePromotionBody[K]) => void
  onSave: () => void
  onActivate: () => void
  onPause: () => void
  onRequestDelete: (p: Promotion) => void
  onBack: () => void
}

function EditorPanel({
  selected, draft, saving, statusPending, apiError, isMobile,
  patchDraft, onSave, onActivate, onPause, onRequestDelete, onBack,
}: EditorPanelProps) {
  if (!selected) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: 'var(--ink-3)', fontSize: 13 }}>
        Select a promotion to edit
      </div>
    )
  }

  const pct = budgetPct(selected)
  const isEditable = selected.status === 'draft' || selected.status === 'paused'

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--surface)' }}>
      {/* Mobile back */}
      {isMobile && (
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            width: '100%', fontSize: 13, color: 'var(--accent)',
            background: 'var(--surface-2)', border: 'none',
            borderBottom: '1px solid var(--rule)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <Icon name="chevLeft" size={14} stroke={2} />
          Back to promotions
        </button>
      )}

      {/* Header */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="t-label">Editing</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
            <CodeChip code={selected.code} large />
            <StatusBadge status={selected.status} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {selected.status === 'active' && (
            <button className="btn sm" onClick={onPause} disabled={statusPending}>Pause</button>
          )}
          {(selected.status === 'draft' || selected.status === 'paused') && (
            <button className="btn sm" onClick={onActivate} disabled={statusPending}>Activate</button>
          )}
          {selected.status === 'draft' && (
            <button className="btn sm ghost" onClick={() => onRequestDelete(selected)} style={{ color: 'var(--danger)' }}>Delete</button>
          )}
          <button className="btn accent sm" onClick={onSave} disabled={saving || !isEditable}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {apiError && (
        <div style={{ margin: '14px 28px 0', padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
          {apiError}
        </div>
      )}

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Discount section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 400 }}>Discount</span>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Type</label>
              <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                <select value={draft.type ?? selected.type} onChange={e => patchDraft('type', e.target.value as 'flat' | 'percent')}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%' }}>
                  <option value="percent">Percentage off</option>
                  <option value="flat">Flat amount</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Value {draft.type === 'percent' ? '(%)' : '(₹ paise)'}</label>
              <div className="input">
                <input type="number" min={0} value={draft.value ?? selected.value} onChange={e => patchDraft('value', Number(e.target.value))} />
              </div>
            </div>
          </div>
          {(draft.type ?? selected.type) === 'percent' && (
            <div className="field" style={{ marginTop: 12 }}>
              <label className="field-label">Max discount cap (paise)</label>
              <div className="input">
                <input type="number" min={0}
                  value={draft.cap_minor != null ? draft.cap_minor : (selected.cap_minor ?? '')}
                  onChange={e => patchDraft('cap_minor', e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 15000 = ₹150" />
              </div>
            </div>
          )}
          <div className="field" style={{ marginTop: 12 }}>
            <label className="field-label">Min trip value (paise)</label>
            <div className="input">
              <input type="number" min={0}
                value={draft.min_trip_value_minor != null ? draft.min_trip_value_minor : (selected.min_trip_value_minor ?? '')}
                onChange={e => patchDraft('min_trip_value_minor', e.target.value ? Number(e.target.value) : null)}
                placeholder="e.g. 10000 = ₹100" />
            </div>
          </div>
        </div>

        {/* Eligibility section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 400 }}>Eligibility</span>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Customer segment</label>
              <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                <select value={draft.segment ?? (selected.segment ?? '')} onChange={e => patchDraft('segment', e.target.value || null)}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%' }}>
                  {SEGMENT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="field-label">Services</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              {SERVICE_TYPE_OPTIONS.map(svc => {
                const current = draft.service_types ?? (selected.service_types ?? [])
                const checked = current.includes(svc.value)
                return (
                  <label key={svc.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', padding: '5px 10px', border: `1px solid ${checked ? 'var(--accent)' : 'var(--rule)'}`, borderRadius: 3, background: checked ? 'var(--accent-soft, color-mix(in oklab, var(--accent) 12%, var(--surface)))' : 'transparent' }}>
                    <input type="checkbox" checked={checked}
                      onChange={e => {
                        const next = e.target.checked ? [...current, svc.value] : current.filter(x => x !== svc.value)
                        patchDraft('service_types', next)
                      }}
                      style={{ accentColor: 'var(--accent)' }} />
                    {svc.label}
                  </label>
                )
              })}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', marginTop: 12 }}>
            <input type="checkbox"
              checked={draft.new_customers_only ?? selected.new_customers_only}
              onChange={e => patchDraft('new_customers_only', e.target.checked)}
              style={{ accentColor: 'var(--accent)' }} />
            New customers only
          </label>
        </div>

        {/* Limits & budget section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 400 }}>Limits &amp; budget</span>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Per-customer limit</label>
              <div className="input">
                <input type="number" min={1}
                  value={draft.per_customer_limit ?? selected.per_customer_limit}
                  onChange={e => patchDraft('per_customer_limit', Number(e.target.value))} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Total redemption cap</label>
              <div className="input">
                <input type="number" min={0}
                  value={draft.total_redemption_cap != null ? draft.total_redemption_cap : (selected.total_redemption_cap ?? '')}
                  onChange={e => patchDraft('total_redemption_cap', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Unlimited" />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Validity from</label>
              <div className="input">
                <input type="datetime-local"
                  value={(draft.validity_from ?? selected.validity_from).slice(0, 16)}
                  onChange={e => patchDraft('validity_from', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Validity to</label>
              <div className="input">
                <input type="datetime-local"
                  value={(draft.validity_to ?? selected.validity_to).slice(0, 16)}
                  onChange={e => patchDraft('validity_to', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label className="field-label">Total budget (paise)</label>
            <div className="input">
              <input type="number" min={0}
                value={draft.total_budget_minor ?? selected.total_budget_minor}
                onChange={e => patchDraft('total_budget_minor', Number(e.target.value))} />
            </div>
          </div>
          {/* Budget meter (read-only) */}
          <div style={{ marginTop: 14 }}>
            <div className="t-label" style={{ marginBottom: 8 }}>Budget · {fmtMinor(selected.total_budget_minor)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 8, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: budgetColor(pct) }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: budgetColor(pct) }}>
                {fmtMinor(selected.budget_spent_minor)} · {pct}%
              </span>
            </div>
            <div className="t-meta" style={{ marginTop: 6 }}>
              {selected.redemption_count.toLocaleString('en-IN')} redemptions · Hard stop at budget.
            </div>
          </div>
        </div>

        {/* Eligibility preview */}
        <EligibilityPreview draft={{ ...draft, code: selected.code }} />

        {/* Notes */}
        <div className="field">
          <label className="field-label">Notes</label>
          <div className="input">
            <input value={draft.notes ?? (selected.notes ?? '')}
              onChange={e => patchDraft('notes', e.target.value || null)}
              placeholder="Internal notes…" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportPromotionsCsv(promos: Promotion[]) {
  const headers = ['Code', 'Type', 'Value', 'Cap (₹)', 'Status', 'Segment', 'Services', 'New Customers Only', 'Valid From', 'Valid To', 'Per-Customer Limit', 'Total Redemption Cap', 'Budget (₹)', 'Spent (₹)', 'Redemptions']
  const rows = promos.map(p => [
    p.code,
    p.type,
    p.type === 'percent' ? `${p.value}%` : `₹${(p.value / 100).toFixed(2)}`,
    p.cap_minor != null ? (p.cap_minor / 100).toFixed(2) : '',
    p.status,
    p.segment ?? '',
    (p.service_types ?? []).join(' | '),
    p.new_customers_only ? 'Yes' : 'No',
    p.validity_from.slice(0, 10),
    p.validity_to.slice(0, 10),
    p.per_customer_limit,
    p.total_redemption_cap ?? 'Unlimited',
    (p.total_budget_minor / 100).toFixed(2),
    (p.budget_spent_minor / 100).toFixed(2),
    p.redemption_count,
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `promotions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PromotionsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [promos, setPromos] = useState<Promotion[]>([])
  const [total, setTotal] = useState(0)
  const [analytics, setAnalytics] = useState<PromotionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState<Promotion | null>(null)
  const [draft, setDraft] = useState<UpdatePromotionBody>({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [showMobileEditor, setShowMobileEditor] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Promotion | null>(null)
  const [statusPending, setStatusPending] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [list, anal] = await Promise.all([
        promotionsService.listPromotions({ page_size: 100 }),
        promotionsService.getAnalytics(14),
      ])
      setPromos(list.items)
      setTotal(list.total)
      setAnalytics(anal)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const filtered = promos.filter(p =>
    !search || p.code.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = promos.filter(p => p.status === 'active').length
  const pausedCount = promos.filter(p => p.status === 'paused').length

  const selectPromo = (p: Promotion) => {
    setSelected(p)
    setDraft({
      type: p.type,
      value: p.value,
      cap_minor: p.cap_minor,
      min_trip_value_minor: p.min_trip_value_minor,
      segment: p.segment,
      service_types: [...(p.service_types ?? [])],
      zones: [...(p.zones ?? [])],
      new_customers_only: p.new_customers_only,
      per_customer_limit: p.per_customer_limit,
      total_redemption_cap: p.total_redemption_cap,
      validity_from: p.validity_from.slice(0, 16),
      validity_to: p.validity_to.slice(0, 16),
      total_budget_minor: p.total_budget_minor,
      notes: p.notes,
    })
    setApiError('')
    if (isMobile) setShowMobileEditor(true)
  }

  const patchDraft = <K extends keyof UpdatePromotionBody>(k: K, v: UpdatePromotionBody[K]) =>
    setDraft(d => ({ ...d, [k]: v }))

  const handleSave = async () => {
    if (!selected) return
    setSaving(true); setApiError('')
    try {
      await promotionsService.updatePromotion(selected.id, draft)
      await loadData()
      setSelected(null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setApiError(err?.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  const handleActivate = async () => {
    if (!selected) return
    setStatusPending(true)
    try {
      await promotionsService.activatePromotion(selected.id)
      await loadData()
      setSelected(null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setApiError(err?.response?.data?.detail || 'Activate failed')
    } finally { setStatusPending(false) }
  }

  const handlePause = async () => {
    if (!selected) return
    setStatusPending(true)
    try {
      await promotionsService.pausePromotion(selected.id)
      await loadData()
      setSelected(null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setApiError(err?.response?.data?.detail || 'Pause failed')
    } finally { setStatusPending(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await promotionsService.deletePromotion(confirmDelete.id)
      await loadData()
      if (selected?.id === confirmDelete.id) setSelected(null)
    } catch { /* ignore */ }
    setConfirmDelete(null)
  }

  const handleNewCreated = (p: Promotion) => {
    setShowNewModal(false)
    loadData().then(() => selectPromo(p))
  }

  // KPI display values
  const kpiBudget = analytics ? fmtMinor(analytics.total_budget_spent_minor) : '—'
  const kpiRedemptions = analytics ? analytics.total_redemptions.toLocaleString('en-IN') : '—'
  const kpiCPA = analytics ? fmtMinor(analytics.blended_cpa_minor) : '—'

  return (
    <Shell
      activeId="promotions"
      breadcrumb="Catalog & Pricing · Growth"
      title="Promotions & coupons"
      subtitle={`${total} promos · ${activeCount} active · ${pausedCount} paused`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => exportPromotionsCsv(promos)}>
            <Icon name="download" size={13} />Export
          </button>
          <button className="btn sm" onClick={() => navigate('/promotions/referrals')}>
            <Icon name="users" size={13} />Referral program
          </button>
          <button className="btn sm" onClick={() => navigate('/promotions/analytics')}>
            Redemption analytics
          </button>
          <button className="btn sm accent" onClick={() => setShowNewModal(true)}>
            <Icon name="plus" size={13} />New promotion
          </button>
        </div>
      }
    >
      {/* Desktop: split-panel layout */}
      {!isMobile ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', height: 'calc(100vh - 56px)' }}>
          {/* Left list */}
          <div style={{ borderRight: '1px solid var(--rule)', overflow: 'auto' }}>
            <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* KPI strip */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {[
                  ['Budget consumed', kpiBudget, 'This period'],
                  ['Redemptions', kpiRedemptions, 'This period'],
                  ['Blended CPA', kpiCPA, 'Cost per new ride'],
                ].map(([k, v, m], i) => (
                  <div key={k} style={{ padding: '16px 18px', borderRight: i < 2 ? '1px solid var(--rule)' : 'none' }}>
                    <div className="t-label" style={{ padding: 0 }}>{k}</div>
                    <div style={{ marginTop: 6, fontFamily: 'var(--font-serif)', fontSize: 22 }}>{v}</div>
                    <div className="t-meta" style={{ marginTop: 4 }}>{m}</div>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="input" style={{ height: 32 }}>
                <Icon name="search" size={13} className="icon" />
                <input placeholder="Code, segment, service…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {/* Promo list */}
              {loading ? (
                <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
              ) : (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                  {filtered.length === 0 && (
                    <div style={{ padding: '24px 18px', color: 'var(--ink-3)', fontSize: 13 }}>
                      {search ? 'No promos match your search.' : 'No promotions yet. Create one →'}
                    </div>
                  )}
                  {filtered.map(p => {
                    const pct = budgetPct(p)
                    const isSel = selected?.id === p.id
                    const serviceLabels = (p.service_types ?? []).map(v => SERVICE_TYPE_OPTIONS.find(o => o.value === v)?.label ?? v)
                    return (
                      <div key={p.id}
                        onClick={() => selectPromo(p)}
                        style={{
                          padding: '16px 18px',
                          borderBottom: '1px solid var(--rule-soft)',
                          borderLeft: `3px solid ${isSel ? 'var(--accent)' : 'transparent'}`,
                          background: isSel ? 'var(--surface-2)' : 'transparent',
                          cursor: 'pointer',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <CodeChip code={p.code} />
                            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>
                              {p.type === 'percent' ? `${p.value}%` : fmtMinor(p.value)}
                            </span>
                            {p.cap_minor != null && (
                              <span className="t-meta">cap {fmtMinor(p.cap_minor)}</span>
                            )}
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, fontSize: 12, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
                          {p.segment && <span>{SEGMENT_OPTIONS.find(s => s.value === p.segment)?.label ?? p.segment}</span>}
                          {serviceLabels.length > 0 && <><span>·</span><span>{serviceLabels.join(' · ')}</span></>}
                          <span>·</span><span>ends {formatDate(p.validity_to)}</span>
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: budgetColor(pct) }} />
                          </div>
                          <span className="t-meta" style={{ fontFamily: 'var(--font-mono)' }}>
                            {pct}% · {p.redemption_count.toLocaleString('en-IN')} used
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right editor — stable component reference, no focus loss */}
          <EditorPanel
            selected={selected}
            draft={draft}
            saving={saving}
            statusPending={statusPending}
            apiError={apiError}
            isMobile={isMobile}
            patchDraft={patchDraft}
            onSave={handleSave}
            onActivate={handleActivate}
            onPause={handlePause}
            onRequestDelete={setConfirmDelete}
            onBack={() => { setShowMobileEditor(false); setSelected(null) }}
          />
        </div>
      ) : (
        /* Mobile: single panel */
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {showMobileEditor ? (
            <EditorPanel
              selected={selected}
              draft={draft}
              saving={saving}
              statusPending={statusPending}
              apiError={apiError}
              isMobile={isMobile}
              patchDraft={patchDraft}
              onSave={handleSave}
              onActivate={handleActivate}
              onPause={handlePause}
              onRequestDelete={setConfirmDelete}
              onBack={() => { setShowMobileEditor(false); setSelected(null) }}
            />
          ) : (
            <>
              {/* Mobile KPI strip */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {[
                  ['Budget', kpiBudget],
                  ['Redemptions', kpiRedemptions],
                ].map(([k, v], i) => (
                  <div key={k} style={{ padding: '12px 14px', borderRight: i === 0 ? '1px solid var(--rule)' : 'none' }}>
                    <div className="t-label" style={{ padding: 0 }}>{k}</div>
                    <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 18 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="input" style={{ height: 32 }}>
                <Icon name="search" size={13} className="icon" />
                <input placeholder="Search code…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {loading ? (
                  <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
                ) : (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                    {filtered.map(p => {
                      const pct = budgetPct(p)
                      return (
                        <div key={p.id} onClick={() => selectPromo(p)}
                          style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule-soft)', cursor: 'pointer', borderLeft: '3px solid transparent' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <CodeChip code={p.code} />
                            <StatusBadge status={p.status} />
                          </div>
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: budgetColor(pct) }} />
                            </div>
                            <span className="t-meta">{pct}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {showNewModal && <NewPromoModal onClose={() => setShowNewModal(false)} onCreated={handleNewCreated} />}

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete promotion"
          description="This will permanently delete the draft promotion. This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </Shell>
  )
}
