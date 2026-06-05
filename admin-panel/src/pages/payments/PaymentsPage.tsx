import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { paymentsService } from '../../services/paymentsService'
import type { PaymentListItem, PaymentKPIs, BookingSearchResult } from '../../services/paymentsService'
import { formatMoney, useFormatMoney, currencySymbol, formatDateTime, formatDate, formatDateTimeCompact } from '../../lib/utils'
import { usePlatformStore } from '../../store/platformStore'


// ── CSV export helper ──────────────────────────────────────────────────────────
function downloadCSV(rows: PaymentListItem[], filename: string) {
  const sym = currencySymbol()
  const headers = ['Transaction ID', 'Date', 'Customer', 'Booking Ref', 'Service', 'Method', 'VPA', `Gross (${sym})`, `Gateway Fee (${sym})`, `Net (${sym})`, 'Status', 'Gateway Ref', 'Currency']
  const escape = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [
    headers.join(','),
    ...rows.map(t => [
      escape(t.id),
      escape(formatDateTime(t.created_at)),
      escape(t.customer_name),
      escape(t.booking_ref),
      escape(t.service),
      escape(t.method),
      escape(t.vpa),
      t.gross_amount,
      t.gateway_fee,
      t.net_amount,
      escape(t.status),
      escape(t.gateway_ref),
      escape(t.currency),
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Status badge ───────────────────────────────────────────────────────────────
function statusBadge(s: string) {
  switch (s) {
    case 'captured':    return <span className="badge ok"><span className="dot ok" />Captured</span>
    case 'invoiced':    return <span className="badge info"><span className="dot info" />Invoiced</span>
    case 'pending':     return <span className="badge"><span className="dot pending" />Pending</span>
    case 'failed':      return <span className="badge danger"><span className="dot danger" />Failed</span>
    case 'refunded':    return <span className="badge warn"><span className="dot warn" />Refunded</span>
    case 'part-refund': return <span className="badge warn"><span className="dot warn" />Partial</span>
    case 'chargeback':  return <span className="badge danger"><span className="dot danger" />Chargeback</span>
    case 'authorized':  return <span className="badge info"><span className="dot info" />Authorized</span>
    case 'disputed':    return <span className="badge danger"><span className="dot danger" />Disputed</span>
    case 'initiated':   return <span className="badge"><span className="dot pending" />Initiated</span>
    default: return <span className="badge">{s}</span>
  }
}

// ── FilterChip — with click-outside close + scrollable dropdown ───────────────
interface FilterChipProps {
  label: string
  value: string
  options: string[]
  selected: string
  onSelect: (v: string) => void
}

function FilterChip({ label, value, options, selected, onSelect }: FilterChipProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        className="btn sm ghost"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{label}:</span>
        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <Icon name={open ? 'chevUp' : 'chevDown'} size={11} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: 'var(--surface)', border: '1px solid var(--rule)',
          borderRadius: 3, zIndex: 200, minWidth: 160,
          boxShadow: 'var(--shadow-pop)',
          maxHeight: 240, overflowY: 'auto',
        }}>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onSelect(opt); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', fontSize: 13, border: 'none',
                background: selected === opt ? 'var(--surface-2)' : 'transparent',
                color: selected === opt ? 'var(--accent)' : 'var(--ink)',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {selected === opt && <span style={{ marginRight: 8, color: 'var(--accent)' }}>✓</span>}
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Manual Entry Modal ─────────────────────────────────────────────────────────
interface ManualEntryModalProps {
  onClose: () => void
  onSaved: () => void
}

function ManualEntryModal({ onClose, onSaved }: ManualEntryModalProps) {
  // Booking search state
  const [bookingQuery, setBookingQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [booking, setBooking] = useState<BookingSearchResult | null>(null)

  // Editable fields (only these can be changed by user)
  const [method, setMethod] = useState('cash')
  const [vpa, setVpa] = useState('')
  const [gatewayFee, setGatewayFee] = useState(0)
  const [status, setStatus] = useState('captured')
  const [gatewayRef, setGatewayRef] = useState('')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Net amount auto-calculated: Gross - Gateway Fee
  const netAmount = booking ? Math.max(0, booking.gross_amount - gatewayFee) : 0

  const handleBookingSearch = async () => {
    const q = bookingQuery.trim()
    if (!q) return
    setSearching(true)
    setSearchError(null)
    setBooking(null)
    try {
      const result = await paymentsService.searchBooking(q)
      setBooking(result)
    } catch {
      setSearchError(`Booking "${q}" not found. Check the booking reference and try again.`)
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async () => {
    if (!booking) { setFormError('Search and select a booking first'); return }
    if (!method) { setFormError('Payment method is required'); return }
    setSaving(true)
    setFormError(null)
    try {
      await paymentsService.createManualEntry({
        customer_name: booking.customer_name,
        customer_id: booking.customer_id,
        booking_ref: booking.booking_ref,
        service: booking.service,
        method,
        vpa: vpa || undefined,
        gross_amount: booking.gross_amount,
        gateway_fee: gatewayFee,
        net_amount: netAmount,
        status,
        gateway_ref: gatewayRef || undefined,
        notes: notes || undefined,
      })
      onSaved()
    } catch {
      setFormError('Failed to create entry. Please try again.')
      setSaving(false)
    }
  }

  const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: 4 }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
  const inputStyle = { height: 34, padding: '0 10px', width: '100%', fontSize: 13 }
  const readOnlyStyle = { ...inputStyle, background: 'var(--surface-2)', color: 'var(--ink-2)', cursor: 'not-allowed' as const }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 4, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow-pop)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Manual entry</div>
            <div className="t-meta" style={{ marginTop: 3 }}>Search a booking — details will auto-fill</div>
          </div>
          <button className="btn icon sm ghost" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── STEP 1: Booking Search ── */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, padding: '16px 18px' }}>
            <div style={{ ...labelStyle, marginBottom: 10 }}>Step 1 — Search booking</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="input" style={{ flex: 1, height: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
                <Icon name="search" size={13} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                <input
                  placeholder="Enter booking ref e.g. BK-RD-88421…"
                  value={bookingQuery}
                  onChange={e => setBookingQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBookingSearch()}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, flex: 1 }}
                />
              </div>
              <button className="btn sm accent" onClick={handleBookingSearch} disabled={searching || !bookingQuery.trim()} style={{ flexShrink: 0 }}>
                {searching ? <><Icon name="refresh" size={13} style={{ animation: 'spin 1s linear infinite' }} />Searching…</> : 'Search'}
              </button>
            </div>
            {searchError && (
              <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--danger)' }}>{searchError}</div>
            )}
            {booking && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dot ok" />
                <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>
                  {booking.booking_ref} · {booking.customer_name} · {booking.service} · {fmt(booking.gross_amount)}
                </span>
              </div>
            )}
          </div>

          {/* ── STEP 2: Auto-filled read-only fields ── */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 10 }}>Step 2 — Booking details (auto-filled, not editable)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Customer name</label>
                <input className="input" style={readOnlyStyle} value={booking?.customer_name ?? '—'} readOnly tabIndex={-1} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Customer ID</label>
                <input className="input" style={readOnlyStyle} value={booking?.customer_id ?? '—'} readOnly tabIndex={-1} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Booking ref</label>
                <input className="input" style={readOnlyStyle} value={booking?.booking_ref ?? '—'} readOnly tabIndex={-1} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Service</label>
                <input className="input" style={readOnlyStyle} value={booking?.service ?? '—'} readOnly tabIndex={-1} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Gross amount ({currencySymbol()})</label>
                <input className="input" style={readOnlyStyle} value={booking ? fmt(booking.gross_amount) : '—'} readOnly tabIndex={-1} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Net amount ({currencySymbol()}) = Gross − Fee</label>
                <input
                  className="input"
                  style={{ ...readOnlyStyle, color: 'var(--accent)', fontWeight: 500 }}
                  value={booking ? fmt(netAmount) : '—'}
                  readOnly
                  tabIndex={-1}
                />
              </div>
            </div>
          </div>

          {/* ── STEP 3: Payment details (editable) ── */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 10 }}>Step 3 — Payment details</div>
            {formError && (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 13, color: 'var(--danger)' }}>
                {formError}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Payment method *</label>
                <select className="input" style={inputStyle} value={method} onChange={e => setMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="wallet">Wallet</option>
                  <option value="netbanking">Netbanking</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>VPA / Reference</label>
                <input className="input" style={inputStyle} placeholder="upi@bank, card last 4…" value={vpa} onChange={e => setVpa(e.target.value)} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Gateway fee ({currencySymbol()})</label>
                <input
                  className="input"
                  style={inputStyle}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={gatewayFee || ''}
                  onChange={e => setGatewayFee(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Status</label>
                <select className="input" style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="captured">Captured</option>
                  <option value="pending">Pending</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Gateway ref</label>
                <input className="input" style={inputStyle} placeholder="Optional" value={gatewayRef} onChange={e => setGatewayRef(e.target.value)} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Notes / reason</label>
                <input className="input" style={inputStyle} placeholder="Reason for manual entry…" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn sm accent" onClick={handleSubmit} disabled={saving || !booking}>
            {saving
              ? <><Icon name="refresh" size={13} style={{ animation: 'spin 1s linear infinite' }} />Saving…</>
              : <><Icon name="plus" size={13} />Create entry</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const fmt = useFormatMoney()
  const settlementCycle = usePlatformStore(s => s.settlement_cycle)
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [items, setItems] = useState<PaymentListItem[]>([])
  const [kpis, setKpis] = useState<PaymentKPIs | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 25

  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [gatewayFilter, setGatewayFilter] = useState('All')
  const [serviceFilter, setServiceFilter] = useState('All')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await paymentsService.listTransactions({
        page,
        page_size: pageSize,
        search: search || undefined,
        method: methodFilter !== 'All' ? methodFilter.toLowerCase() : undefined,
        status: statusFilter !== 'All' ? statusFilter.toLowerCase() : undefined,
        gateway: gatewayFilter !== 'All' ? gatewayFilter : undefined,
        service: serviceFilter !== 'All' ? serviceFilter : undefined,
      })
      setItems(res.items)
      setTotal(res.total)
      setKpis(res.kpis)
    } catch {
      setError('Failed to load transactions. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [page, search, methodFilter, statusFilter, gatewayFilter, serviceFilter])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    setExporting(true)
    setShowExportConfirm(false)
    try {
      // Fetch all pages for export (up to 1000 rows)
      const res = await paymentsService.listTransactions({
        page: 1, page_size: 100,
        search: search || undefined,
        method: methodFilter !== 'All' ? methodFilter.toLowerCase() : undefined,
        status: statusFilter !== 'All' ? statusFilter.toLowerCase() : undefined,
        gateway: gatewayFilter !== 'All' ? gatewayFilter : undefined,
        service: serviceFilter !== 'All' ? serviceFilter : undefined,
      })
      const date = new Date().toISOString().split('T')[0]
      downloadCSV(res.items, `payments-${date}.csv`)
    } catch {
      setError('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)
  const showingStart = (page - 1) * pageSize + 1
  const showingEnd = Math.min(page * pageSize, total)

  const subtitle = total
    ? `${total.toLocaleString('en-IN')} transactions · 30d · settlement ${settlementCycle} · IN`
    : 'Payment ledger'

  const actions = (
    <>
      <button className="btn sm" disabled={exporting} onClick={() => setShowExportConfirm(true)}>
        <Icon name="download" size={13} />{exporting ? 'Exporting…' : 'Export'}
      </button>
      <button className="btn sm" onClick={() => navigate('/payments/reconciliation')}>Reconcile</button>
      <button className="btn sm accent" onClick={() => setShowManualEntry(true)}>
        <Icon name="plus" size={13} />Manual entry
      </button>
    </>
  )

  return (
    <Shell activeId="payments" breadcrumb="Finance · Payments" title="Payments & ledger" subtitle={subtitle} actions={actions}>
      <div style={{ padding: isMobile ? '16px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Error banner */}
        {error && (
          <div style={{ padding: '10px 16px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 13, color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {error}
            <button className="btn icon sm ghost" onClick={() => setError(null)}><Icon name="x" size={13} /></button>
          </div>
        )}

        {/* KPI cards */}
        {kpis && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--rule)',
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
          }}>
            {([
              ['Gross volume · 30d', fmt(kpis.gross_volume), '+12% vs prior', 'var(--accent)'],
              ['Net revenue', fmt(kpis.net_revenue), 'Commission + fees', 'var(--ink-2)'],
              ['Refunds', fmt(kpis.refunds_total), kpis.gross_volume > 0 ? `${((kpis.refunds_total / kpis.gross_volume) * 100).toFixed(1)}% of gross` : '0.0% of gross', 'var(--warn)'],
              ['Chargebacks', fmt(kpis.chargebacks_total), '0.18% · open', 'var(--danger)'],
              ['Success rate', `${kpis.success_rate}%`, 'Auth → capture', 'var(--accent)'],
            ] as [string, string, string, string][]).map(([k, v, m, c], i) => (
              <div key={k} style={{
                padding: '18px 22px',
                borderRight: i < 4 ? '1px solid var(--rule)' : 'none',
                borderBottom: isMobile && i < 3 ? '1px solid var(--rule)' : 'none',
              }}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 20 : 24 }}>{v}</div>
                <div className="t-meta" style={{ marginTop: 8, color: c }}>{m}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="input" style={{ width: isMobile ? '100%' : 280, height: 32, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
            <Icon name="search" size={13} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
            <input
              placeholder="Txn ID, customer, booking, VPA…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, flex: 1 }}
            />
          </div>
          <FilterChip
            label="Method" value={methodFilter}
            options={['All', 'UPI', 'Card', 'Wallet', 'Netbanking', 'Corporate', 'Cash']}
            selected={methodFilter} onSelect={v => { setMethodFilter(v); setPage(1) }}
          />
          <FilterChip
            label="Status" value={statusFilter}
            options={['All', 'Captured', 'Invoiced', 'Pending', 'Failed', 'Refunded', 'Part-refund', 'Chargeback', 'Disputed']}
            selected={statusFilter} onSelect={v => { setStatusFilter(v); setPage(1) }}
          />
          <FilterChip
            label="Gateway" value={gatewayFilter}
            options={['All', 'UPI Switch', 'CardNet', 'Netbanking', 'Wallet & Corp']}
            selected={gatewayFilter} onSelect={v => { setGatewayFilter(v); setPage(1) }}
          />
          <FilterChip
            label="Service" value={serviceFilter}
            options={['All', 'Sedan', 'Sedan XL', 'Heli', 'Bike', 'Auto', 'Charter']}
            selected={serviceFilter} onSelect={v => { setServiceFilter(v); setPage(1) }}
          />
          <div style={{ flex: 1 }} />
          <button className="btn sm">
            <Icon name="clock" size={13} />Last 30d
            <Icon name="chevDown" size={11} />
          </button>
        </div>

        {/* Table / Mobile cards */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          {isMobile ? (
            <div>
              {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>}
              {!loading && items.length === 0 && (
                <div style={{ padding: 36, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No transactions found</div>
              )}
              {items.map(t => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/payments/${t.id}`)}
                  style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{t.id}</span>
                    {statusBadge(t.status)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13 }}>{t.customer_name}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{fmt(t.net_amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="t-meta">{t.booking_ref} · {t.method}</span>
                    <span className="t-meta">{formatDate(t.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Customer</th>
                    <th>Booking</th>
                    <th>Method</th>
                    <th style={{ textAlign: 'right' }}>Gross</th>
                    <th style={{ textAlign: 'right' }}>Gateway fee</th>
                    <th style={{ textAlign: 'right' }}>Net</th>
                    <th>Status</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</td></tr>
                  )}
                  {!loading && items.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 36, color: 'var(--ink-3)', fontSize: 13 }}>No transactions found</td></tr>
                  )}
                  {!loading && items.map(t => (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/payments/${t.id}`)}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span className="t-mono" style={{ fontSize: 12.5, color: 'var(--ink)' }}>{t.id}</span>
                          <span className="t-meta">{formatDateTimeCompact(t.created_at)}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar">{t.customer_name.split(' ').map((x: string) => x[0]).join('').slice(0, 2)}</div>
                          <span style={{ fontSize: 13 }}>{t.customer_name}</span>
                        </div>
                      </td>
                      <td><span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t.booking_ref}</span></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 12.5, textTransform: 'capitalize' }}>{t.method}</span>
                          <span className="t-meta">{t.vpa}</span>
                        </div>
                      </td>
                      <td className="num" style={{ textAlign: 'right', fontSize: 13 }}>{fmt(t.gross_amount)}</td>
                      <td className="num" style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--ink-3)' }}>
                        {t.gateway_fee > 0 ? '−' + fmt(t.gateway_fee) : '—'}
                      </td>
                      <td className="num" style={{ textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{fmt(t.net_amount)}</td>
                      <td>{statusBadge(t.status)}</td>
                      <td>
                        <button className="btn icon sm ghost" onClick={e => { e.stopPropagation(); navigate(`/payments/${t.id}`) }}>
                          <Icon name="chevRight" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
            <span className="t-meta">
              {total > 0 ? `Showing ${showingStart}–${showingEnd} of ${total.toLocaleString('en-IN')}` : 'No results'}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn icon sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <Icon name="chevLeft" size={14} />
              </button>
              <button className="btn icon sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <Icon name="chevRight" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <ManualEntryModal
          onClose={() => setShowManualEntry(false)}
          onSaved={() => { setShowManualEntry(false); load() }}
        />
      )}

      {/* Export confirmation */}
      <ConfirmDialog
        open={showExportConfirm}
        title="Export transactions"
        description={`Export the current filtered view as CSV. ${total > 100 ? 'Only the first 100 rows will be exported.' : `${total} transactions will be included.`}`}
        confirmLabel="Export CSV"
        variant="default"
        onConfirm={handleExport}
        onCancel={() => setShowExportConfirm(false)}
      />
    </Shell>
  )
}
