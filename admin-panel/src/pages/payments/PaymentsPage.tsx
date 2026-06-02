import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { paymentsService } from '../../services/paymentsService'
import type { PaymentListItem, PaymentKPIs } from '../../services/paymentsService'

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

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

interface FilterChipProps {
  label: string
  value: string
  options: string[]
  selected: string
  onSelect: (v: string) => void
}

function FilterChip({ label, value, options, selected, onSelect }: FilterChipProps) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn sm ghost"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{label}:</span>
        <span>{value}</span>
        <Icon name="chevDown" size={11} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: 'var(--surface)', border: '1px solid var(--rule)',
          borderRadius: 3, zIndex: 50, minWidth: 140,
          boxShadow: 'var(--shadow-pop)',
        }}>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onSelect(opt); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 14px', fontSize: 12.5, border: 'none',
                background: selected === opt ? 'var(--surface-2)' : 'transparent',
                color: 'var(--ink)', cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PaymentsPage() {
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

  const load = useCallback(async () => {
    setLoading(true)
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
    } catch (_) {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [page, search, methodFilter, statusFilter, gatewayFilter, serviceFilter])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / pageSize)
  const showingStart = (page - 1) * pageSize + 1
  const showingEnd = Math.min(page * pageSize, total)

  const subtitle = total
    ? `${total.toLocaleString('en-IN')} transactions · 30d · settlement T+1 · IN`
    : 'Payment ledger'

  const actions = (
    <>
      <button className="btn sm"><Icon name="download" size={13} />Export</button>
      <button className="btn sm" onClick={() => navigate('/payments/reconciliation')}>Reconcile</button>
      <button className="btn sm accent"><Icon name="plus" size={13} />Manual entry</button>
    </>
  )

  return (
    <Shell activeId="payments" breadcrumb="Finance · Payments" title="Payments & ledger" subtitle={subtitle} actions={actions}>
      <div style={{ padding: isMobile ? '16px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* KPI cards */}
        {kpis && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--rule)',
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
          }}>
            {[
              ['Gross volume · 30d', fmt(kpis.gross_volume), '+12% vs prior', 'var(--accent)'],
              ['Net revenue', fmt(kpis.net_revenue), 'Commission + fees', 'var(--ink-2)'],
              ['Refunds', fmt(kpis.refunds_total), kpis.gross_volume > 0 ? `${((kpis.refunds_total / kpis.gross_volume) * 100).toFixed(1)}% of gross` : '0.0% of gross', 'var(--warn)'],
              ['Chargebacks', fmt(kpis.chargebacks_total), '0.18% · open', 'var(--danger)'],
              ['Success rate', `${kpis.success_rate}%`, 'Auth → capture', 'var(--accent)'],
            ].map(([k, v, m, c], i) => (
              <div key={k} style={{
                padding: '18px 22px',
                borderRight: i < 4 ? '1px solid var(--rule)' : 'none',
                borderBottom: isMobile && i < 3 ? '1px solid var(--rule)' : 'none',
              }}>
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 24 }}>{v}</div>
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
            options={['All', 'Captured', 'Invoiced', 'Pending', 'Failed', 'Refunded', 'Part-refund', 'Chargeback']}
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
            /* Mobile card list */
            <div>
              {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>}
              {items.map(t => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/payments/${t.id}`)}
                  style={{
                    padding: '14px 16px', borderBottom: '1px solid var(--rule)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8,
                  }}
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
                    <span className="t-meta">{new Date(t.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop table */
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
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && items.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 36, color: 'var(--ink-3)', fontSize: 13 }}>
                        No transactions found
                      </td>
                    </tr>
                  )}
                  {!loading && items.map(t => (
                    <tr
                      key={t.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/payments/${t.id}`)}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span className="t-mono" style={{ fontSize: 12.5, color: 'var(--ink)' }}>{t.id}</span>
                          <span className="t-meta">{new Date(t.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
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
                          <span style={{ fontSize: 12.5 }}>{t.method}</span>
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
                        <button className="btn icon sm ghost">
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
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid var(--rule)',
          }}>
            <span className="t-meta">
              {total > 0 ? `Showing ${showingStart}–${showingEnd} of ${total.toLocaleString('en-IN')}` : 'No results'}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn icon sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <Icon name="chevLeft" size={14} />
              </button>
              <button
                className="btn icon sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <Icon name="chevRight" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
