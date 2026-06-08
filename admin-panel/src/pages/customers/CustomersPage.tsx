import { useState, useEffect, useRef } from 'react'
import { usePermission } from '../../hooks/usePermission'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { customerService } from '../../services/customerService'
import type { Customer, CustomerSegment, CustomerStatus } from '../../services/customerService'
import { formatMoney, currencySymbol, formatDate, formatDateShort, formatMonthYear } from '../../lib/utils'

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function segmentLabel(seg: CustomerSegment): string {
  const MAP: Record<CustomerSegment, string> = {
    vip_corp: 'VIP · Corp',
    loyalist: 'Loyalist',
    frequent: 'Frequent',
    new:      'New',
    regular:  'Regular',
  }
  return MAP[seg] ?? seg
}

function SegmentBadge({ segment }: { segment: CustomerSegment }) {
  const styles: Record<CustomerSegment, React.CSSProperties> = {
    vip_corp: {
      background: 'var(--accent-soft)',
      color: 'var(--accent)',
      border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
    },
    loyalist: {
      background: 'var(--surface-sunk)',
      color: 'var(--ink)',
      border: '1px solid var(--rule)',
    },
    frequent: {
      background: 'var(--info-soft)',
      color: 'var(--info)',
      border: '1px solid color-mix(in oklab, var(--info) 22%, var(--rule-strong))',
    },
    new: {
      background: 'var(--surface-2)',
      color: 'var(--ink-3)',
      border: '1px solid var(--rule)',
    },
    regular: {
      background: 'var(--surface-2)',
      color: 'var(--ink-3)',
      border: '1px solid var(--rule)',
    },
  }

  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      padding: '2px 7px',
      borderRadius: 2,
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
      ...styles[segment],
    }}>
      {segmentLabel(segment)}
    </span>
  )
}

// ── Add Customer Modal ────────────────────────────────────────────────────────

interface AddModalProps {
  onClose: () => void
  onCreated: () => void
}

function AddCustomerModal({ onClose, onCreated }: AddModalProps) {
  const [name, setName]             = useState('')
  const [phone, setPhone]           = useState('')
  const [email, setEmail]           = useState('')
  const [city, setCity]             = useState('')
  const [segOverride, setSegOverride] = useState<string>('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const handleSave = async () => {
    if (!name.trim())  { setError('Name is required'); return }
    if (!phone.trim()) { setError('Phone is required'); return }
    if (!email.trim()) { setError('Email is required'); return }
    setSaving(true); setError('')
    try {
      await customerService.createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        city: city.trim() || undefined,
        segment_override: segOverride || null,
      })
      onCreated()
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err?.response?.data?.message || 'Failed to create customer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26,24,20,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--surface)', border: '1px solid var(--rule-strong)',
          boxShadow: 'var(--shadow-pop)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="t-label">New customer</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>Add customer</h3>
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        {/* Form */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          <div className="field">
            <label className="field-label">Name<span style={{ color: 'var(--danger)' }}> *</span></label>
            <div className="input">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Phone<span style={{ color: 'var(--danger)' }}> *</span></label>
            <div className="input">
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98201 00000" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Email<span style={{ color: 'var(--danger)' }}> *</span></label>
            <div className="input">
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" type="email" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">City</label>
            <div className="input">
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Bengaluru" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Segment override</label>
            <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
              <select
                value={segOverride}
                onChange={e => setSegOverride(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%' }}
              >
                <option value="">None (auto-computed)</option>
                <option value="vip_corp">VIP · Corp</option>
                <option value="loyalist">Loyalist</option>
                <option value="frequent">Frequent</option>
                <option value="new">New</option>
                <option value="regular">Regular</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface-2)' }}>
          <button className="btn sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn sm accent" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Row menu ──────────────────────────────────────────────────────────────────

interface RowMenuProps {
  customer: Customer
  onAction: (action: 'suspend' | 'flag' | 'reactivate' | 'credit', customer: Customer) => void
}

function RowMenu({ customer, onAction }: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const canSuspend   = customer.status === 'active' || customer.status === 'flagged'
  const canReactivate = customer.status === 'suspended' || customer.status === 'banned'
  const canFlag      = customer.status !== 'flagged'
  const canUnflag    = customer.status === 'flagged'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn ghost icon sm"
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
      >
        <Icon name="moreVert" size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--rule-strong)',
          boxShadow: 'var(--shadow-pop)',
          minWidth: 160, padding: '4px 0',
        }}>
          <button
            className="btn ghost"
            style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5, borderRadius: 0, justifyContent: 'flex-start' }}
            onClick={e => { e.stopPropagation(); setOpen(false); onAction('credit', customer) }}
          >
            Goodwill credit
          </button>
          {canFlag && (
            <button
              className="btn ghost"
              style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5, borderRadius: 0, justifyContent: 'flex-start' }}
              onClick={e => { e.stopPropagation(); setOpen(false); onAction('flag', customer) }}
            >
              Flag
            </button>
          )}
          {canUnflag && (
            <button
              className="btn ghost"
              style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5, borderRadius: 0, justifyContent: 'flex-start' }}
              onClick={e => { e.stopPropagation(); setOpen(false); onAction('reactivate', customer) }}
            >
              Unflag / Reactivate
            </button>
          )}
          {canSuspend && (
            <button
              className="btn ghost"
              style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5, borderRadius: 0, justifyContent: 'flex-start', color: 'var(--danger)' }}
              onClick={e => { e.stopPropagation(); setOpen(false); onAction('suspend', customer) }}
            >
              Suspend
            </button>
          )}
          {canReactivate && (
            <button
              className="btn ghost"
              style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5, borderRadius: 0, justifyContent: 'flex-start', color: 'var(--accent)' }}
              onClick={e => { e.stopPropagation(); setOpen(false); onAction('reactivate', customer) }}
            >
              Reactivate
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Inline action dialogs ─────────────────────────────────────────────────────

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
          <button className="btn sm accent" onClick={() => { if (reason.trim()) onConfirm(reason.trim()) }} disabled={!reason.trim()}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type SegmentFilter = 'all' | CustomerSegment | 'flagged'

interface PendingAction {
  type: 'suspend' | 'flag' | 'reactivate' | 'credit'
  customer: Customer
}

export default function CustomersPage() {
  const navigate   = useNavigate()
  const isMobile   = useIsMobile()
  useIsTablet() // reserved for responsive layout adjustments

  const [customers, setCustomers]         = useState<Customer[]>([])
  const [total, setTotal]                 = useState(0)
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({})
  const [loading, setLoading]             = useState(true)

  const [search, setSearch]               = useState('')
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('all')
  const [statusFilter, setStatusFilter]   = useState<CustomerStatus | ''>('')
  const [page, setPage]                   = useState(1)

  const [showAddModal, setShowAddModal]   = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [apiError, setApiError]           = useState('')
  const [sortField, setSortField]   = useState<'ltv' | 'trips' | 'rating' | 'wallet' | 'last_active' | 'joined' | 'name'>('ltv')
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const canEditCustomer = usePermission('customers.edit')
  const sortRef = useRef<HTMLDivElement>(null)

  const loadCustomers = async (opts?: { seg?: SegmentFilter; status?: CustomerStatus | ''; q?: string; p?: number }) => {
    setLoading(true)
    try {
      const seg    = opts?.seg    ?? segmentFilter
      const status = opts?.status ?? statusFilter
      const q      = opts?.q      ?? search
      const pg     = opts?.p      ?? page

      const params: Record<string, string | number> = { page: pg, per_page: 25 }
      if (q)                          params.search  = q
      if (seg === 'flagged')          params.status  = 'flagged'
      else if (seg !== 'all')         params.segment = seg
      if (status)                     params.status  = status

      const data = await customerService.listCustomers(params)
      setCustomers(data.items)
      setTotal(data.total)
      setSegmentCounts(data.segment_counts)
      setApiError('')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to load customers')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadCustomers() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => loadCustomers({ q: search, p: 1 }), 350)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showSortMenu) return
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSortMenu])

  const handleSegment = (seg: SegmentFilter) => {
    setSegmentFilter(seg)
    setPage(1)
    loadCustomers({ seg, p: 1 })
  }

  const handleStatus = (s: CustomerStatus | '') => {
    setStatusFilter(s)
    setPage(1)
    loadCustomers({ status: s, p: 1 })
  }

  const handleAction = (action: 'suspend' | 'flag' | 'reactivate' | 'credit', customer: Customer) => {
    if (action === 'credit') {
      navigate(`/customers/${customer.id}`)
      return
    }
    setPendingAction({ type: action, customer })
  }

  const executeAction = async (reason?: string) => {
    if (!pendingAction) return
    const { type, customer } = pendingAction
    try {
      if (type === 'suspend')    await customerService.suspendCustomer(customer.id, reason ?? '')
      if (type === 'flag')       await customerService.flagCustomer(customer.id, reason ?? '')
      if (type === 'reactivate') await customerService.reactivateCustomer(customer.id)
      await loadCustomers()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || `Failed to ${type} customer`)
    }
    setPendingAction(null)
  }

  const handleExport = () => {
    const sym = currencySymbol()
    const headers = ['Customer Code', 'Name', 'Phone', 'Segment', 'Trips', `LTV (${sym})`, 'Rating', `Wallet (${sym})`, 'Last Active', 'Joined', 'Status']
    const rows = customers.map(c => [
      c.customer_code ?? '',
      c.name,
      c.phone,
      c.segment,
      c.trips_count,
      (c.ltv_minor / 100).toFixed(2),
      c.rating?.toFixed(2) ?? '',
      (c.wallet_balance_minor / 100).toFixed(2),
      c.last_active_at ? formatDate(c.last_active_at) : '',
      formatDate(c.joined_at),
      c.status,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const CUSTOMER_SORT_OPTIONS: { key: 'ltv' | 'trips' | 'rating' | 'wallet' | 'last_active' | 'joined' | 'name'; label: string }[] = [
    { key: 'ltv',         label: 'LTV' },
    { key: 'trips',       label: 'Trips' },
    { key: 'rating',      label: 'Rating' },
    { key: 'wallet',      label: 'Wallet' },
    { key: 'last_active', label: 'Last active' },
    { key: 'joined',      label: 'Joined' },
    { key: 'name',        label: 'Name' },
  ]

  const sortedCustomers = [...customers].sort((a, b) => {
    let cmp = 0
    if (sortField === 'name')             cmp = a.name.localeCompare(b.name)
    else if (sortField === 'trips')       cmp = a.trips_count - b.trips_count
    else if (sortField === 'ltv')         cmp = a.ltv_minor - b.ltv_minor
    else if (sortField === 'rating')      cmp = (a.rating ?? 0) - (b.rating ?? 0)
    else if (sortField === 'wallet')      cmp = a.wallet_balance_minor - b.wallet_balance_minor
    else if (sortField === 'last_active') cmp = (a.last_active_at ? new Date(a.last_active_at).getTime() : 0) - (b.last_active_at ? new Date(b.last_active_at).getTime() : 0)
    else if (sortField === 'joined')      cmp = new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
    return sortDir === 'desc' ? -cmp : cmp
  })

  const SEGMENT_TILES: { l: string; key: SegmentFilter; tone?: string }[] = [
    { l: 'All',        key: 'all' },
    { l: 'VIP · Corp', key: 'vip_corp',  tone: 'var(--accent)' },
    { l: 'Loyalists',  key: 'loyalist',  tone: 'var(--ink-2)' },
    { l: 'Frequent',   key: 'frequent',  tone: 'var(--info)' },
    { l: 'New · 30d',  key: 'new',       tone: 'var(--info)' },
    { l: 'Flagged',    key: 'flagged',   tone: 'var(--danger)' },
  ]

  const countFor = (key: SegmentFilter): number => {
    if (key === 'all')     return segmentCounts['all'] ?? total
    if (key === 'flagged') return segmentCounts['flagged'] ?? 0
    return segmentCounts[key] ?? 0
  }

  return (
    <Shell
      activeId="customers"
      breadcrumb="People & Fleet · Customers"
      title="Customers"
      subtitle={`${total.toLocaleString()} customers`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={handleExport}><Icon name="download" size={13} />Export</button>
          <button className="btn sm">Cohorts</button>
          <button className="btn sm accent" onClick={() => setShowAddModal(true)}><Icon name="plus" size={13} />Add customer</button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* API error banner */}
        {apiError && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3,
            fontSize: 12.5,
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <span>{apiError}</span>
            <button className="btn ghost icon sm" onClick={() => setApiError('')}>
              <Icon name="x" size={12} />
            </button>
          </div>
        )}

        {/* Segment bar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
        }}>
          {SEGMENT_TILES.map((v, i) => {
            const active = segmentFilter === v.key
            return (
              <div
                key={v.key}
                onClick={() => handleSegment(v.key)}
                style={{
                  padding: isMobile ? '12px 12px' : '16px 18px',
                  borderRight: isMobile ? (i % 3 !== 2 ? '1px solid var(--rule)' : 'none') : (i < 5 ? '1px solid var(--rule)' : 'none'),
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  borderTop: isMobile && i >= 3 ? '1px solid var(--rule)' : 'none',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5, color: active ? 'var(--ink)' : 'var(--ink-2)' }}>{v.l}</span>
                  {v.tone && !active && <span className="dot" style={{ background: v.tone }} />}
                </div>
                <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 18 : 22 }}>
                  {countFor(v.key).toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Filter bar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          borderBottom: 0, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <div className="input" style={{ width: isMobile ? '100%' : 280, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input
              placeholder="Name, phone, email, customer ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10, minWidth: 130 }}>
            <select
              value={statusFilter}
              onChange={e => handleStatus(e.target.value as CustomerStatus | '')}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="flagged">Flagged</option>
              <option value="banned">Banned</option>
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <div ref={sortRef} style={{ position: 'relative' }}>
            <button
              className="btn sm ghost"
              onClick={() => setShowSortMenu(v => !v)}
            >
              Sort · {CUSTOMER_SORT_OPTIONS.find(o => o.key === sortField)?.label} {sortDir === 'desc' ? '↓' : '↑'}
            </button>
            {showSortMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 200,
                background: 'var(--surface)', border: '1px solid var(--rule-strong)',
                boxShadow: 'var(--shadow-pop)', minWidth: 170, padding: '4px 0',
              }}>
                {CUSTOMER_SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className="btn ghost"
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12.5,
                      borderRadius: 0, justifyContent: 'space-between',
                      color: sortField === opt.key ? 'var(--accent)' : undefined,
                    }}
                    onClick={() => {
                      if (sortField === opt.key) {
                        setSortDir(d => d === 'desc' ? 'asc' : 'desc')
                      } else {
                        setSortField(opt.key)
                        setSortDir('desc')
                      }
                      setShowSortMenu(false)
                    }}
                  >
                    <span>{opt.label}</span>
                    {sortField === opt.key && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: 0, minWidth: 0 }}>
          {loading && (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          )}
          {!loading && (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl" style={{ minWidth: isMobile ? 720 : undefined }}>
                <thead>
                  <tr>
                    <th style={{ width: 30 }}><input type="checkbox" /></th>
                    <th>Customer</th>
                    <th>Segment</th>
                    <th>Trips</th>
                    <th>LTV</th>
                    <th>Rating</th>
                    <th>Wallet</th>
                    <th>Last active</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                        {search || segmentFilter !== 'all' || statusFilter ? 'No customers match your filter.' : 'No customers yet.'}
                      </td>
                    </tr>
                  ) : sortedCustomers.map(c => (
                    <tr
                      key={c.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/customers/${c.id}`)}
                    >
                      <td onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            className="avatar"
                            style={c.segment === 'vip_corp' ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
                          >
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{c.name}</span>
                              {c.flag_reason && (
                                <span title={c.flag_reason}>
                                  <Icon name="flag" size={11} stroke={1.6} style={{ color: 'var(--danger)' }} />
                                </span>
                              )}
                            </div>
                            <div className="t-meta" style={{ marginTop: 2 }}>{c.customer_code} · {c.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td><SegmentBadge segment={c.segment} /></td>
                      <td className="num">{c.trips_count}</td>
                      <td className="num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                        {formatMoney(c.ltv_minor)}
                      </td>
                      <td>
                        {c.rating != null ? (
                          <>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              color: c.rating >= 4.8 ? 'var(--accent)' : c.rating >= 4.5 ? 'var(--ink-2)' : 'var(--warn)',
                            }}>
                              {c.rating.toFixed(2)}
                            </span>
                            <span style={{ color: 'var(--ink-4)', marginLeft: 3 }}>★</span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--ink-4)' }}>—</span>
                        )}
                      </td>
                      <td className="num" style={{ color: 'var(--ink-2)' }}>
                        {formatMoney(c.wallet_balance_minor)}
                      </td>
                      <td className="num" style={{ color: 'var(--ink-3)' }}>
                        {c.last_active_at ? formatDateShort(c.last_active_at) : '—'}
                      </td>
                      <td className="num" style={{ color: 'var(--ink-3)' }}>
                        {formatMonthYear(c.joined_at)}
                      </td>
                      <td>
                        {c.status === 'active'    && <span className="badge ok"><span className="dot ok" />Active</span>}
                        {c.status === 'flagged'   && <span className="badge warn"><span className="dot warn" />Flagged</span>}
                        {c.status === 'suspended' && <span className="badge danger"><span className="dot danger" />Suspended</span>}
                        {c.status === 'banned'    && <span className="badge danger"><span className="dot danger" />Banned</span>}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <RowMenu customer={c} onAction={handleAction} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && total > 25 && (
            <div style={{
              padding: '12px 16px', borderTop: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 12.5, color: 'var(--ink-3)',
            }}>
              <span>Page {page} of {Math.ceil(total / 25)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn sm ghost"
                  disabled={page <= 1}
                  onClick={() => { setPage(p => p - 1); loadCustomers({ p: page - 1 }) }}
                >
                  ← Prev
                </button>
                <button
                  className="btn sm ghost"
                  disabled={page >= Math.ceil(total / 25)}
                  onClick={() => { setPage(p => p + 1); loadCustomers({ p: page + 1 }) }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => loadCustomers()}
        />
      )}

      {/* Action modals */}
      {pendingAction?.type === 'suspend' && (
        <ReasonModal
          title={`Suspend ${pendingAction.customer.name}`}
          placeholder="Reason for suspension…"
          onConfirm={reason => executeAction(reason)}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction?.type === 'flag' && (
        <ReasonModal
          title={`Flag ${pendingAction.customer.name}`}
          placeholder="Reason for flagging…"
          onConfirm={reason => executeAction(reason)}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction?.type === 'reactivate' && (
        <ReasonModal
          title={`Reactivate ${pendingAction.customer.name}`}
          placeholder="Optional note…"
          onConfirm={() => executeAction()}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </Shell>
  )
}

