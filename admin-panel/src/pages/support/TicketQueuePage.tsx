import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import { supportService } from '../../services/supportService'
import type { Ticket } from '../../services/supportService'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { useDebounce } from '../../hooks/useDebounce'
import { customerService } from '../../services/customerService'
import type { Customer } from '../../services/customerService'
import { driverService } from '../../services/driverService'
import type { Driver } from '../../services/driverService'
import { bookingsService } from '../../services/bookingsService'
import type { RoadBookingListItem } from '../../services/bookingsService'
import { airBookingsService } from '../../services/airBookingsService'
import type { AirBookingListItem } from '../../services/airBookingsService'

const CATEGORY_OPTIONS = [
  'refunds_billing', 'booking_road', 'booking_air', 'payouts',
  'documents_kyc', 'app_issue', 'lost_found', 'onboarding', 'other',
]
const PRIORITY_OPTIONS = ['urgent', 'high', 'med', 'low']
const STATUS_OPTIONS   = ['open', 'in_progress', 'resolved', 'closed']

function formatCategory(c: string) {
  return c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatSlaTime(sla_due_at: string | null, sla_breached: boolean): React.ReactNode {
  if (!sla_due_at) return <span style={{ color: 'var(--ink-3)' }}>—</span>
  const due     = new Date(sla_due_at)
  const diffMs  = due.getTime() - Date.now()
  const diffMins = Math.round(diffMs / 60000)

  const style: React.CSSProperties = sla_breached
    ? { color: 'var(--danger,#e53e3e)', fontWeight: 700 }
    : diffMins < 60
    ? { color: 'var(--warn,#d69e2e)', fontWeight: 600 }
    : { color: 'var(--ink-2)' }

  let label = ''
  if (sla_breached || diffMins < 0) {
    const absMins = Math.abs(diffMins)
    label = absMins < 60 ? `Breached ${absMins}m ago` : `Breached ${Math.floor(absMins / 60)}h ago`
  } else if (diffMins < 60) {
    label = `${diffMins}m left`
  } else {
    const h = Math.floor(diffMins / 60), m = diffMins % 60
    label = m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return <span style={{ display: 'flex', alignItems: 'center', gap: 4, ...style }}>🕐 {label}</span>
}

function priorityBadge(p: string) {
  const cls = p === 'urgent' ? 'badge danger' : p === 'high' ? 'badge warn' : p === 'med' ? 'badge info' : 'badge'
  return <span className={cls}>{p.toUpperCase()}</span>
}

function statusBadge(s: string) {
  const cls = s === 'open' ? 'badge info' : s === 'in_progress' ? 'badge warn' : s === 'resolved' ? 'badge ok' : 'badge'
  return <span className={cls}>{s.replace('_', ' ')}</span>
}

function requesterIcon(type: string) {
  return type === 'customer' ? '👤' : type === 'driver' ? '🚗' : '🏢'
}

// ── Requester Search Combobox ─────────────────────────────────────────────────
type RequesterOption = { id: string; name: string; phone: string; label: string }

function RequesterSearch({ requesterType, value, onSelect }: {
  requesterType: string
  value: RequesterOption | null
  onSelect: (opt: RequesterOption | null) => void
}) {
  const [query,   setQuery]   = useState(value?.name ?? '')
  const [results, setResults] = useState<RequesterOption[]>([])
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reset query when a value is cleared externally
  useEffect(() => {
    if (!value) setQuery('')
  }, [value])

  useEffect(() => {
    if (requesterType === 'operator' || !debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([]); return
    }
    setLoading(true)
    const search = debouncedQuery.trim()

    const promise = requesterType === 'customer'
      ? customerService.listCustomers({ search, per_page: 8 }).then(r =>
          r.items.map((c: Customer): RequesterOption => ({
            id: c.id, name: c.name, phone: c.phone,
            label: `${c.name} · ${c.phone}`,
          })))
      : driverService.listDrivers({ search, per_page: 8 }).then(r =>
          r.items.map((d: Driver): RequesterOption => ({
            id: d.id, name: d.name, phone: d.phone,
            label: `${d.name} · ${d.phone}`,
          })))

    promise
      .then(opts => { setResults(opts); setOpen(opts.length > 0) })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery, requesterType])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    // If user types after a selection, clear it
    if (value && e.target.value !== value.name) onSelect(null)
  }

  function handleSelect(opt: RequesterOption) {
    onSelect(opt)
    setQuery(opt.name)
    setOpen(false)
    setResults([])
  }

  if (requesterType === 'operator') {
    return (
      <input
        className="input"
        placeholder="Operator name"
        value={query}
        onChange={e => { setQuery(e.target.value); onSelect({ id: 'manual', name: e.target.value, phone: '', label: e.target.value }) }}
      />
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          placeholder={`Search ${requesterType} by name or phone…`}
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          style={{ paddingRight: 32 }}
          autoComplete="off"
        />
        {loading && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ink-3)' }}>…</span>
        )}
        {value && (
          <button
            type="button"
            onClick={() => { onSelect(null); setQuery('') }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 14, padding: '0 2px' }}
          >✕</button>
        )}
      </div>

      {value && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))', border: '1px solid color-mix(in oklab, var(--accent) 30%, var(--rule))', borderRadius: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>✓ {value.name}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{value.phone}</span>
          <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'monospace', marginLeft: 'auto' }}>{value.id.slice(0, 8)}…</span>
        </div>
      )}

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--rule-strong)',
          borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          marginTop: 4, maxHeight: 220, overflowY: 'auto',
        }}>
          {results.map(opt => (
            <div
              key={opt.id}
              onMouseDown={() => handleSelect(opt)}
              style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--rule-soft)', display: 'flex', alignItems: 'center', gap: 10 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{opt.phone}</div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'monospace', flexShrink: 0 }}>{opt.id.slice(0, 8)}…</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Booking Search Combobox ───────────────────────────────────────────────────
type BookingOption = { id: string; ref: string; label: string; type: 'road' | 'air'; status: string }

function BookingSearch({ requesterName, value, onSelect }: {
  requesterName: string
  value: BookingOption | null
  onSelect: (opt: BookingOption | null) => void
}) {
  const [query,   setQuery]   = useState(value?.ref ?? '')
  const [results, setResults] = useState<BookingOption[]>([])
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const containerRef = useRef<HTMLDivElement>(null)

  // Pre-seed with requester name when they get selected
  useEffect(() => {
    if (requesterName && !value && !query) setQuery(requesterName)
  }, [requesterName]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!value) setQuery('')
  }, [value])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) { setResults([]); return }
    setLoading(true)
    const search = debouncedQuery.trim()

    Promise.allSettled([
      bookingsService.listBookings({ search, page_size: 6 }),
      airBookingsService.listAirBookings({ search, page_size: 4 }),
    ]).then(([roadRes, airRes]) => {
      const road: BookingOption[] = roadRes.status === 'fulfilled'
        ? roadRes.value.items.map((b: RoadBookingListItem): BookingOption => ({
            id: b.id, ref: b.booking_ref, type: 'road', status: b.status,
            label: `${b.booking_ref} · ${b.pickup_address?.slice(0, 20)} → ${b.drop_address?.slice(0, 20)}`,
          }))
        : []
      const air: BookingOption[] = airRes.status === 'fulfilled'
        ? airRes.value.items.map((b: AirBookingListItem): BookingOption => ({
            id: b.id, ref: b.booking_ref, type: 'air', status: b.status,
            label: `${b.booking_ref} · ${b.route_from} → ${b.route_to}`,
          }))
        : []
      const merged = [...road, ...air]
      setResults(merged)
      setOpen(merged.length > 0)
    }).finally(() => setLoading(false))
  }, [debouncedQuery])

  function handleSelect(opt: BookingOption) {
    onSelect(opt)
    setQuery(opt.ref)
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          placeholder="Search booking ref, customer name…"
          value={query}
          onChange={e => { setQuery(e.target.value); if (value && e.target.value !== value.ref) onSelect(null) }}
          onFocus={() => results.length > 0 && setOpen(true)}
          style={{ paddingRight: 32 }}
          autoComplete="off"
        />
        {loading && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ink-3)' }}>…</span>
        )}
        {value && (
          <button type="button" onClick={() => { onSelect(null); setQuery('') }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 14, padding: '0 2px' }}>
            ✕
          </button>
        )}
      </div>

      {value && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))', border: '1px solid color-mix(in oklab, var(--accent) 30%, var(--rule))', borderRadius: 6 }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', padding: '2px 6px', background: value.type === 'air' ? 'var(--info-soft,#ebf8ff)' : 'var(--surface-2)', borderRadius: 4, color: 'var(--ink-2)' }}>
            {value.type === 'air' ? '✈ AIR' : '🚗 ROAD'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>{value.ref}</span>
          <span className={`badge ${value.status === 'completed' ? 'ok' : value.status === 'cancelled' ? 'danger' : 'info'}`} style={{ fontSize: 10 }}>{value.status}</span>
        </div>
      )}

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--rule-strong)',
          borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          marginTop: 4, maxHeight: 220, overflowY: 'auto',
        }}>
          {results.map(opt => (
            <div key={opt.id} onMouseDown={() => handleSelect(opt)}
              style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--rule-soft)', display: 'flex', alignItems: 'center', gap: 10 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 10, fontFamily: 'monospace', padding: '2px 5px', background: opt.type === 'air' ? 'var(--info-soft,#ebf8ff)' : 'var(--surface-2)', borderRadius: 4, flexShrink: 0 }}>
                {opt.type === 'air' ? '✈' : '🚗'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 500 }}>{opt.ref}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label.split('·').slice(1).join('·').trim()}</div>
              </div>
              <span className={`badge ${opt.status === 'completed' ? 'ok' : opt.status === 'cancelled' ? 'danger' : 'info'}`} style={{ fontSize: 10, flexShrink: 0 }}>{opt.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── New Ticket Modal ───────────────────────────────────────────────────────────
function NewTicketModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: () => void
}) {
  const [requesterType, setRequesterType]   = useState('customer')
  const [requester,     setRequester]       = useState<RequesterOption | null>(null)
  const [linkedBooking, setLinkedBooking]   = useState<BookingOption | null>(null)
  const [category,      setCategory]        = useState('refunds_billing')
  const [priority,      setPriority]        = useState('med')
  const [subject,       setSubject]         = useState('')
  const [body,          setBody]            = useState('')
  const [txnId,         setTxnId]           = useState('')
  const [saving,        setSaving]          = useState(false)
  const [error,         setError]           = useState('')

  // Reset requester when type changes
  function handleTypeChange(t: string) {
    setRequesterType(t)
    setRequester(null)
    setLinkedBooking(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!requester?.name.trim()) { setError('Select or enter a requester.'); return }
    if (!subject.trim())         { setError('Subject is required.'); return }
    if (!body.trim())            { setError('Description is required.'); return }
    setSaving(true); setError('')
    try {
      await supportService.createTicket({
        requester_type:        requesterType,
        requester_id:          requester.id,
        requester_name:        requester.name,
        category,
        priority,
        subject:               subject.trim(),
        body:                  body.trim(),
        linked_booking_id:     linkedBooking?.id  || undefined,
        linked_transaction_id: txnId.trim()       || undefined,
      })
      onCreated()
      onClose()
    } catch {
      setError('Failed to create ticket. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 10, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>New support ticket</span>
          <button className="btn sm ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Requester type + search */}
          <div className="field">
            <label className="field-label">Requester type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['customer', 'driver', 'operator'].map(t => (
                <button
                  key={t} type="button"
                  className={requesterType === t ? 'btn sm accent' : 'btn sm ghost'}
                  style={{ flex: 1, textTransform: 'capitalize' }}
                  onClick={() => handleTypeChange(t)}
                >
                  {t === 'customer' ? '👤' : t === 'driver' ? '🚗' : '🏢'} {t}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">
              {requesterType === 'operator' ? 'Operator name *' : `Search ${requesterType} *`}
              {requesterType !== 'operator' && <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 11, marginLeft: 6 }}>type 2+ chars to search</span>}
            </label>
            <RequesterSearch
              requesterType={requesterType}
              value={requester}
              onSelect={setRequester}
            />
          </div>

          {/* Category + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Category</label>
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Priority</label>
              <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Subject *</label>
            <input className="input" placeholder="Brief description of the issue" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          <div className="field">
            <label className="field-label">Description *</label>
            <textarea className="input" rows={4} placeholder="Full details of the issue…" value={body} onChange={e => setBody(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          {/* Linked booking search */}
          <div className="field">
            <label className="field-label">
              Linked booking <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span>
              {requester && requesterType !== 'operator' && (
                <span style={{ color: 'var(--accent)', fontSize: 11, marginLeft: 6 }}>pre-seeded with requester name</span>
              )}
            </label>
            <BookingSearch
              requesterName={requester?.name ?? ''}
              value={linkedBooking}
              onSelect={setLinkedBooking}
            />
          </div>

          <div className="field">
            <label className="field-label">Transaction ID <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span></label>
            <input className="input" placeholder="TXN-..." value={txnId} onChange={e => setTxnId(e.target.value)} />
          </div>

          <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--surface-2)', fontSize: 12, color: 'var(--ink-3)' }}>
            ℹ️ Tickets created here are on behalf of the requester. SLA timer starts immediately based on category and priority.
          </div>

          {error && (
            <div style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--danger-soft,#fff5f5)', border: '1px solid var(--danger,#e53e3e)', color: 'var(--danger,#e53e3e)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" className="btn sm ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn sm accent" disabled={saving}>
              {saving ? 'Creating…' : 'Create ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TicketQueuePage() {
  const navigate = useNavigate()
  const isMobile  = useIsMobile()
  const isTablet  = useIsTablet()

  const [tickets, setTickets]           = useState<Ticket[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const [loading, setLoading]           = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)

  const [search,          setSearch]          = useState('')
  const [filterCategory,  setFilterCategory]  = useState('')
  const [filterPriority,  setFilterPriority]  = useState('')
  const [filterStatus,    setFilterStatus]    = useState('')
  const [filterBreached,  setFilterBreached]  = useState(false)

  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await supportService.listTickets({
        page,
        page_size: pageSize,
        search:    search    || undefined,
        category:  filterCategory  || undefined,
        priority:  filterPriority  || undefined,
        status:    filterStatus    || undefined,
        sla_breach: filterBreached || undefined,
      })
      setTickets(res.items)
      setTotal(res.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [page, search, filterCategory, filterPriority, filterStatus, filterBreached])

  useEffect(() => { load() }, [load])

  const openCount     = tickets.filter(t => t.status === 'open').length
  const breachingCount = tickets.filter(t => t.sla_breached).length
  const dueIn1h       = tickets.filter(t => {
    if (!t.sla_due_at || t.sla_breached) return false
    const mins = (new Date(t.sla_due_at).getTime() - Date.now()) / 60000
    return mins >= 0 && mins < 60
  }).length
  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      {showNewModal && (
        <NewTicketModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => { load(); setShowNewModal(false) }}
        />
      )}

      <Shell
        activeId="support"
        breadcrumb="Operations · Support"
        title="Ticket queue"
        subtitle="All support requests — auto-routed by category and priority."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" onClick={() => navigate('/support/sla')}>
              SLA &amp; Escalation
            </button>
            <button className="btn sm accent" onClick={() => setShowNewModal(true)}>
              + New ticket
            </button>
          </div>
        }
      >
        <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap: 12 }}>
            {[
              { label: 'Open tickets',      value: String(openCount),     sub: 'total open' },
              { label: 'SLA breaching',     value: String(breachingCount),sub: 'breached now',    warn: breachingCount > 0 },
              { label: 'Due < 1h',          value: String(dueIn1h),       sub: 'about to breach', warn: dueIn1h > 0 },
              { label: 'Median 1st reply',  value: '—',                   sub: 'response time' },
              { label: 'CSAT',              value: '—',                   sub: 'satisfaction' },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: kpi.warn ? 'var(--danger,#e53e3e)' : 'var(--ink)' }}>{kpi.value}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <input
              className="input"
              placeholder="Search ticket, requester, booking…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ width: isMobile ? '100%' : 240 }}
            />
            <select className="input" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1) }} style={{ width: 160 }}>
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
            </select>
            <select className="input" value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1) }} style={{ width: 130 }}>
              <option value="">All priorities</option>
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
            <select className="input" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} style={{ width: 130 }}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <button
              className={filterBreached ? 'btn sm danger' : 'btn sm ghost'}
              onClick={() => { setFilterBreached(v => !v); setPage(1) }}
            >
              {filterBreached ? '✕ SLA Breached' : 'SLA Breached'}
            </button>
          </div>

          {/* Table / Mobile cards */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>Loading…</div>
              ) : tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>
                  No tickets found.{' '}
                  <button className="btn sm accent" style={{ marginTop: 8 }} onClick={() => setShowNewModal(true)}>
                    Create first ticket
                  </button>
                </div>
              ) : tickets.map(t => (
                <div key={t.id} onClick={() => navigate(`/support/${t.id}`)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: 14, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-2)' }}>{t.ticket_ref}</span>
                    <div style={{ display: 'flex', gap: 4 }}>{priorityBadge(t.priority)}{statusBadge(t.status)}</div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{requesterIcon(t.requester_type)} {t.requester_name}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{formatSlaTime(t.sla_due_at, t.sla_breached)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Ticket</th>
                    <th>Requester</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    {!isTablet && <th>Assignee</th>}
                    <th>SLA</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>Loading…</td></tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 40 }}>
                        <div style={{ color: 'var(--ink-3)', marginBottom: 12 }}>No tickets found.</div>
                        <button className="btn sm accent" onClick={() => setShowNewModal(true)}>+ Create first ticket</button>
                      </td>
                    </tr>
                  ) : tickets.map(t => (
                    <tr key={t.id} onClick={() => navigate(`/support/${t.id}`)} style={{ cursor: 'pointer' }}>
                      <td onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                      <td>
                        <span className="t-mono" style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.ticket_ref}</span>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{t.subject}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 16 }}>{requesterIcon(t.requester_type)}</span>
                          <div>
                            <div style={{ fontSize: 13 }}>{t.requester_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'capitalize' }}>{t.requester_type}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge">{formatCategory(t.category)}</span></td>
                      <td>{priorityBadge(t.priority)}</td>
                      <td>{statusBadge(t.status)}</td>
                      {!isTablet && (
                        <td>
                          {t.assignee_name
                            ? <span style={{ fontSize: 13 }}>{t.assignee_name}</span>
                            : <button className="btn sm ghost" onClick={e => e.stopPropagation()}>Assign</button>}
                        </td>
                      )}
                      <td>{formatSlaTime(t.sla_due_at, t.sla_breached)}</td>
                      <td><span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{new Date(t.created_at).toLocaleDateString()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
              <button className="btn sm ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ padding: '4px 12px', fontSize: 13, color: 'var(--ink-2)' }}>
                Page {page} of {totalPages} · {total} tickets
              </span>
              <button className="btn sm ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      </Shell>
    </>
  )
}
