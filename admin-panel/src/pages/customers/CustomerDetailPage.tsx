import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { customerService } from '../../services/customerService'
import type { Customer, CustomerSegment, WalletTransaction } from '../../services/customerService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(minor: number): string {
  const value = minor / 100
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`
  if (value >= 100_000)    return `₹${(value / 100_000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Tab stub ──────────────────────────────────────────────────────────────────

function TabStub({ title, module: mod }: { title: string; module: string }) {
  return (
    <div style={{ padding: '40px 32px', textAlign: 'center', color: 'var(--ink-3)' }}>
      <div style={{ fontSize: 14, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>
        {mod} — will appear here automatically when available
      </div>
    </div>
  )
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────

function TripSparkline({ months }: { months: number[] }) {
  const w = 460, h = 110, padX = 10, padT = 10, padB = 22
  const min = Math.min(...months)
  const max = Math.max(...months)
  const range = max - min || 1

  const xAt = (i: number) => padX + (i / (months.length - 1)) * (w - 2 * padX)
  const yAt = (v: number) => padT + (1 - (v - min) / range) * (h - padT - padB)

  const path = months.map((v, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ')
  const fillPath = `${path} L${xAt(months.length - 1)} ${h - padB} L${xAt(0)} ${h - padB} Z`
  const MONTH_LABELS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 120 }}>
      <path d={fillPath} fill="var(--accent)" opacity="0.10" />
      <path d={path} stroke="var(--accent)" strokeWidth="1.6" fill="none" />
      {months.map((v, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(v)} r="2.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.2" />
          <text x={xAt(i)} y={h - 6} textAnchor="middle" fill="var(--ink-3)" style={{ font: '9px IBM Plex Mono' }}>
            {MONTH_LABELS[i % MONTH_LABELS.length]}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── Wallet Adjust Modal ───────────────────────────────────────────────────────

const WALLET_REASONS = [
  'Driver delay',
  'Service issue',
  'Booking error',
  'Goodwill gesture',
  'Manual adjustment',
  'Other',
]

const AMOUNT_PRESETS = [100, 250, 500, 1000]

interface WalletModalProps {
  customer: Customer
  initialDirection?: 'credit' | 'debit'
  onClose: () => void
  onSuccess: (updated: Customer) => void
}

function WalletAdjustModal({ customer, initialDirection = 'credit', onClose, onSuccess }: WalletModalProps) {
  const isMobile = useIsMobile()

  const [direction, setDirection]       = useState<'credit' | 'debit'>(initialDirection)
  const [amountStr, setAmountStr]       = useState('500')
  const [reason, setReason]             = useState(WALLET_REASONS[0])
  const [auditNote, setAuditNote]       = useState('')
  const [notifyPush, setNotifyPush]     = useState(true)
  const [notifySms, setNotifySms]       = useState(false)
  const [notifyEmail, setNotifyEmail]   = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  const amount = Math.max(0, parseInt(amountStr, 10) || 0)
  const amountMinor = amount * 100
  const balanceMinor = customer.wallet_balance_minor
  const newBalanceMinor = direction === 'credit'
    ? balanceMinor + amountMinor
    : balanceMinor - amountMinor

  const withinCap = direction === 'credit' && amountMinor <= 200_000  // ₹2,000

  const handleConfirm = async () => {
    if (amount <= 0) { setError('Amount must be greater than 0'); return }
    if (direction === 'debit' && amountMinor > balanceMinor) {
      setError('Insufficient wallet balance')
      return
    }
    setLoading(true); setError('')
    try {
      const result = await customerService.adjustWallet(customer.id, {
        direction,
        amount_minor: amountMinor,
        reason,
        audit_note: auditNote.trim() || undefined,
        notify_push: notifyPush,
        notify_sms: notifySms,
        notify_email: notifyEmail,
      })
      onSuccess(result.customer)
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to adjust wallet')
    } finally {
      setLoading(false)
    }
  }

  const modalContent = (
    <>
      {/* Header */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 4, flexShrink: 0,
          background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--rule-strong))',
        }}>
          <Icon name="wallet" size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="t-label">Customer wallet · {customer.name} · {customer.customer_code}</div>
          <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, letterSpacing: '-0.018em' }}>
            {direction === 'credit' ? 'Issue goodwill credit' : 'Debit wallet'}
          </h2>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-3)' }}>
            Current balance{' '}
            <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
              {formatMoney(balanceMinor)}
            </span>
            {' '}· next trip applies wallet first by default
          </div>
        </div>
        <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={14} /></button>
      </div>

      {error && (
        <div style={{ margin: '16px 28px 0', padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>

        {/* Left col */}
        <div>
          <div className="t-label" style={{ marginBottom: 10 }}>Direction</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {(['credit', 'debit'] as const).map(d => {
              const color = d === 'credit' ? 'var(--accent)' : 'var(--danger)'
              const active = direction === d
              return (
                <div
                  key={d}
                  onClick={() => setDirection(d)}
                  style={{
                    flex: 1, padding: '12px 14px',
                    border: `1px solid ${active ? color : 'var(--rule)'}`,
                    background: active ? `color-mix(in oklab, ${color} 8%, var(--surface))` : 'var(--surface)',
                    borderRadius: 3,
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  }}
                >
                  <Icon
                    name={d === 'credit' ? 'plus' : 'x'}
                    size={13}
                    stroke={2.2}
                    style={{ color: active ? color : 'var(--ink-3)' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: active ? 500 : 400, textTransform: 'capitalize' }}>{d}</span>
                </div>
              )
            })}
          </div>

          <div className="t-label" style={{ marginBottom: 10 }}>Amount</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `1px solid ${direction === 'credit' ? 'var(--accent)' : 'var(--danger)'}`, borderRadius: 3, padding: '14px 16px', background: direction === 'credit' ? 'var(--accent-soft-2)' : 'var(--danger-soft)' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 30, color: direction === 'credit' ? 'var(--accent)' : 'var(--danger)', marginRight: 12 }}>₹</span>
            <input
              value={amountStr}
              onChange={e => setAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
              style={{ flex: 1, border: 0, background: 'transparent', outline: 'none', fontFamily: 'var(--font-serif)', fontSize: 34, color: 'var(--ink)', width: 0 }}
            />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {AMOUNT_PRESETS.map(p => (
              <button
                key={p}
                className="btn sm ghost"
                style={{
                  border: '1px dashed var(--rule-strong)',
                  fontFamily: 'var(--font-mono)', fontSize: 11.5,
                  color: amount === p ? 'var(--accent)' : 'var(--ink-2)',
                  background: amount === p ? 'var(--accent-soft-2)' : 'transparent',
                }}
                onClick={() => setAmountStr(String(p))}
              >
                ₹{p}
              </button>
            ))}
            <button
              className="btn sm ghost"
              style={{ border: '1px dashed var(--rule-strong)', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)' }}
              onClick={() => setAmountStr('')}
            >
              Custom
            </button>
          </div>

          <div className="t-label" style={{ marginTop: 22, marginBottom: 10 }}>Reason · required</div>
          <div className="input" style={{ padding: 0, paddingLeft: 12 }}>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', fontSize: 13 }}
            >
              {WALLET_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="t-label" style={{ marginTop: 18, marginBottom: 10 }}>Audit note · internal</div>
          <div className="input">
            <input
              value={auditNote}
              onChange={e => setAuditNote(e.target.value)}
              placeholder="Optional note for the file"
            />
          </div>
        </div>

        {/* Right col */}
        <div>
          <div className="t-label" style={{ marginBottom: 10 }}>Preview</div>
          <div style={{ padding: '18px 20px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
            <table className="tbl" style={{ marginTop: 0 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>Current balance</td>
                  <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: 'var(--ink-2)' }}>{formatMoney(balanceMinor)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>
                    {direction === 'credit' ? 'Goodwill credit' : 'Debit'}
                  </td>
                  <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: direction === 'credit' ? 'var(--accent)' : 'var(--danger)' }}>
                    {direction === 'credit' ? '+' : '-'}{formatMoney(amountMinor)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', border: 0, fontSize: 13, color: 'var(--ink-2)' }}>Tax adjustment</td>
                  <td className="num" style={{ padding: '8px 0', border: 0, textAlign: 'right', color: 'var(--ink-3)' }}>₹0</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--rule-strong)' }}>
                  <td style={{ padding: '14px 0 0', border: 0, fontSize: 14, fontWeight: 500 }}>New balance</td>
                  <td className="num" style={{ padding: '14px 0 0', border: 0, textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: 26, color: newBalanceMinor >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                    {formatMoney(Math.max(0, newBalanceMinor))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {withinCap && (
            <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--info-soft)', border: '1px solid color-mix(in oklab, var(--info) 24%, var(--rule-strong))', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--info)' }}>
                <Icon name="shield" size={13} />
                <span className="t-label" style={{ padding: 0, color: 'var(--info)' }}>Within your goodwill cap</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
                {formatMoney(amountMinor)} is within your per-customer credit cap (₹2,000). You may issue this directly.
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div className="t-label" style={{ marginBottom: 8 }}>Notify customer</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { label: 'Push',  checked: notifyPush,  set: setNotifyPush },
                { label: 'SMS',   checked: notifySms,   set: setNotifySms },
                { label: 'Email', checked: notifyEmail, set: setNotifyEmail },
              ] as const).map(({ label, checked, set }) => (
                <label
                  key={label}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flex: 1, background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3, fontSize: 12.5, cursor: 'pointer' }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: 2,
                    border: `1px solid ${checked ? 'var(--accent)' : 'var(--rule-strong)'}`,
                    background: checked ? 'var(--accent)' : 'var(--surface)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {checked && <Icon name="check" size={9} stroke={2.4} style={{ color: '#fff' }} />}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => set(e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 28px', borderTop: '1px solid var(--rule)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="t-meta">All wallet adjustments are double-entry · audit-logged</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn accent" onClick={handleConfirm} disabled={loading || amount <= 0}>
            {loading ? 'Processing…' : `${direction === 'credit' ? 'Credit' : 'Debit'} ${formatMoney(amountMinor)} →`}
          </button>
        </div>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--surface)', zIndex: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {modalContent}
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'color-mix(in oklab, var(--ink) 35%, transparent)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 400, padding: '60px 16px 24px', overflowY: 'auto' }}>
      <div style={{
        width: '100%', maxWidth: 760,
        background: 'var(--surface)', border: '1px solid var(--rule-strong)',
        boxShadow: 'var(--shadow-pop)',
      }}>
        {modalContent}
      </div>
    </div>
  )
}

// ── Flag reason modal ─────────────────────────────────────────────────────────

interface FlagModalProps {
  title: string
  placeholder: string
  confirmLabel?: string
  variant?: 'danger' | 'accent'
  onConfirm: (reason: string) => void
  onCancel: () => void
}

function FlagReasonModal({ title, placeholder, confirmLabel = 'Confirm', variant = 'accent', onConfirm, onCancel }: FlagModalProps) {
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
          <button className={`btn sm ${variant}`} onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={!reason.trim()}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Wallet & Ledger tab ───────────────────────────────────────────────────────

function WalletTab({ customerId }: { customerId: string }) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    setLoading(true)
    customerService.listWalletTransactions(customerId, { page: 1, per_page: 25 })
      .then(data => { setTransactions(data.items); setTotal(data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [customerId])

  if (loading) {
    return <div style={{ padding: 32, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
  }

  if (transactions.length === 0) {
    return (
      <div style={{ padding: '40px 32px', textAlign: 'center', color: 'var(--ink-3)' }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>No wallet transactions yet</div>
        <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Wallet adjustments will appear here</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--rule)', fontSize: 12.5, color: 'var(--ink-3)' }}>
        {total} transaction{total !== 1 ? 's' : ''}
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Direction</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td className="num" style={{ color: 'var(--ink-3)' }}>{formatDate(tx.created_at)}</td>
                <td>
                  {tx.direction === 'credit'
                    ? <span className="badge ok"><span className="dot ok" />Credit</span>
                    : <span className="badge danger"><span className="dot danger" />Debit</span>
                  }
                </td>
                <td className="num" style={{ fontFamily: 'var(--font-mono)', color: tx.direction === 'credit' ? 'var(--accent)' : 'var(--danger)' }}>
                  {tx.direction === 'credit' ? '+' : '-'}{formatMoney(tx.amount_minor)}
                </td>
                <td style={{ fontSize: 13 }}>
                  <div>{tx.reason}</div>
                  {tx.audit_note && <div className="t-meta" style={{ marginTop: 2, color: 'var(--ink-3)' }}>{tx.audit_note}</div>}
                </td>
                <td className="t-meta" style={{ color: 'var(--ink-3)' }}>{tx.created_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ customer, isMobile }: { customer: Customer; isMobile: boolean }) {
  // Stub: 12 months of zeros until bookings module populates
  const months = Array(12).fill(0) as number[]

  return (
    <div style={{
      padding: '24px 32px',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr',
      gap: 24,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Trips per month */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div className="t-label">Trips per month · last 12</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
                {customer.trips_count > 0 ? 'Trip trend' : 'No trip data yet'}
              </h3>
            </div>
            <div className="t-meta">{customer.trips_count} trips · all-time</div>
          </div>
          <TripSparkline months={months} />
        </div>

        {/* Recent trips stub */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div className="t-label">Recent trips</div>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>Last rides</h3>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>When</th>
                <th>Driver · Vehicle</th>
                <th>Route</th>
                <th>Fare</th>
                <th>Payment</th>
                <th>Rated</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '24px 0', fontSize: 13 }}>
                  Trip history will appear once the bookings module is active
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Service mix */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div className="t-label" style={{ marginBottom: 10 }}>Service mix · last 90d</div>
          <div style={{ display: 'flex', height: 8, borderRadius: 2, overflow: 'hidden', background: 'var(--rule)' }}>
            <div style={{ width: '100%', background: 'var(--rule)' }} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="t-meta" style={{ color: 'var(--ink-4)', fontSize: 12 }}>
              Service mix will appear once the bookings module is active
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Payment methods</div>
          <div className="t-meta" style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>
            Payment methods will appear here
          </div>
        </div>

        {/* Saved places */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div className="t-label" style={{ marginBottom: 12 }}>Saved places</div>
          <div className="t-meta" style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>
            Saved places will appear here
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'trips' | 'payments' | 'wallet' | 'addresses' | 'tickets' | 'risk' | 'audit'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile  = useIsMobile()
  useIsTablet() // reserved for responsive layout adjustments

  const [customer, setCustomer]           = useState<Customer | null>(null)
  const [loading, setLoading]             = useState(true)
  const [activeTab, setActiveTab]         = useState<Tab>('overview')

  const [showWalletModal, setShowWalletModal]         = useState(false)
  const [walletDirection, setWalletDirection]         = useState<'credit' | 'debit'>('credit')
  const [showSuspendDialog, setShowSuspendDialog]     = useState(false)
  const [showFlagModal, setShowFlagModal]             = useState(false)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)
  const [showUnflagDialog, setShowUnflagDialog]       = useState(false)
  const [apiError, setApiError]                       = useState('')

  const loadCustomer = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await customerService.getCustomer(id)
      setCustomer(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadCustomer() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSuspend = async (reason: string) => {
    if (!customer) return
    setApiError('')
    try {
      const updated = await customerService.suspendCustomer(customer.id, reason)
      setCustomer(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to suspend customer')
    }
    setShowSuspendDialog(false)
  }

  const handleReactivate = async () => {
    if (!customer) return
    setApiError('')
    try {
      const updated = await customerService.reactivateCustomer(customer.id)
      setCustomer(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to reactivate customer')
    }
    setShowReactivateDialog(false)
  }

  const handleFlag = async (reason: string) => {
    if (!customer) return
    setApiError('')
    try {
      const updated = await customerService.flagCustomer(customer.id, reason)
      setCustomer(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to flag customer')
    }
    setShowFlagModal(false)
  }

  const handleUnflag = async () => {
    if (!customer) return
    setApiError('')
    try {
      const updated = await customerService.unflagCustomer(customer.id)
      setCustomer(updated)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setApiError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to remove flag')
    }
    setShowUnflagDialog(false)
  }

  const openGoodwillCredit = () => {
    setWalletDirection('credit')
    setShowWalletModal(true)
  }

  if (loading) {
    return (
      <Shell activeId="customers" breadcrumb="People & Fleet · Customers" title="Loading…">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading customer…</div>
      </Shell>
    )
  }

  if (!customer) {
    return (
      <Shell activeId="customers" breadcrumb="People & Fleet · Customers" title="Not found">
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>
          Customer not found.{' '}
          <button className="btn sm ghost" onClick={() => navigate('/customers')}>← Back to customers</button>
        </div>
      </Shell>
    )
  }

  const canSuspend    = customer.status === 'active' || customer.status === 'flagged'
  const canReactivate = customer.status === 'suspended' || customer.status === 'banned'

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'trips',     label: `Trips · ${customer.trips_count}` },
    { key: 'payments',  label: 'Payments' },
    { key: 'wallet',    label: 'Wallet & ledger' },
    { key: 'addresses', label: 'Addresses' },
    { key: 'tickets',   label: 'Tickets' },
    { key: 'risk',      label: 'Risk' },
    { key: 'audit',     label: 'Audit' },
  ]

  return (
    <Shell
      activeId="customers"
      breadcrumb="People & Fleet · Customers"
      title={customer.name}
      subtitle={`${customer.customer_code} · ${segmentLabel(customer.segment)} · ${customer.trips_count} trips · LTV ${formatMoney(customer.ltv_minor)}`}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn sm"
            onClick={() => alert('Messaging coming soon')}
          >
            <Icon name="envelope" size={13} />Message
          </button>
          <button className="btn sm" onClick={openGoodwillCredit}>
            Goodwill credit
          </button>
          {customer.status === 'flagged' ? (
            <button className="btn sm" onClick={() => setShowUnflagDialog(true)}>Unflag</button>
          ) : (
            <button className="btn sm" onClick={() => setShowFlagModal(true)}>Flag</button>
          )}
          {canSuspend && (
            <button className="btn sm danger" style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }} onClick={() => setShowSuspendDialog(true)}>
              Suspend
            </button>
          )}
          {canReactivate && (
            <button className="btn sm accent" onClick={() => setShowReactivateDialog(true)}>
              Reactivate
            </button>
          )}
        </div>
      }
    >
      <div>
        {/* API error banner */}
        {apiError && (
          <div style={{
            margin: '12px 32px 0',
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
            <button
              className="btn ghost icon sm"
              onClick={() => setApiError('')}
              style={{ flexShrink: 0 }}
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        )}

        {/* Hero */}
        <div style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--rule)',
          padding: isMobile ? '20px 16px' : '28px 32px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '420px 1fr',
          gap: 36,
        }}>
          {/* Left: identity */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div
              className="avatar xl"
              style={customer.segment === 'vip_corp' ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
            >
              {getInitials(customer.name)}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                {customer.status === 'active'    && <span className="badge ok"><span className="dot ok" />Active</span>}
                {customer.status === 'flagged'   && <span className="badge warn"><span className="dot warn" />Flagged</span>}
                {customer.status === 'suspended' && <span className="badge danger"><span className="dot danger" />Suspended</span>}
                {customer.status === 'banned'    && <span className="badge danger"><span className="dot danger" />Banned</span>}
                <span className="badge">
                  <Icon name="shield" size={9} />
                  {segmentLabel(customer.segment)}
                </span>
                <span className="badge"><span className="dot ok" />KYC OK</span>
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, letterSpacing: '-0.020em' }}>
                {customer.name}
              </div>
              <div className="t-meta" style={{ marginTop: 6 }}>
                {customer.customer_code} · {customer.phone} · {customer.email}
              </div>
              <div className="t-meta" style={{ marginTop: 2 }}>
                {customer.city ?? 'Unknown city'} · joined {formatDate(customer.joined_at)}
              </div>
            </div>
          </div>

          {/* Right: stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
            gap: 0,
            alignSelf: 'center',
            minWidth: 0,
            overflowX: isMobile ? 'auto' : undefined,
          }}>
            {[
              { k: 'Total trips',    v: String(customer.trips_count),                                    m: '',                                                  c: 'var(--ink)' },
              { k: 'Lifetime spend', v: formatMoney(customer.ltv_minor),                                  m: 'Lifetime value',                                    c: 'var(--ink)' },
              { k: 'Avg fare',       v: customer.avg_fare_minor != null ? formatMoney(customer.avg_fare_minor) : '—', m: 'Per trip',                             c: 'var(--ink-2)' },
              { k: 'Rating · given', v: customer.rating != null ? `${customer.rating.toFixed(2)} ★` : '—', m: 'Avg across drivers',                            c: 'var(--accent)' },
              { k: 'Cancellations',  v: `${(customer.cancellation_rate * 100).toFixed(1)}%`,             m: customer.cancellation_rate < 0.1 ? 'Healthy range' : 'Above average', c: 'var(--ink-2)' },
            ].map(({ k, v, m, c }, i) => (
              <div
                key={k}
                style={{
                  padding: isMobile ? '12px 10px' : '0 18px',
                  borderRight: isMobile ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none') : (i < 4 ? '1px solid var(--rule)' : 'none'),
                  borderBottom: isMobile && i < (isMobile ? 2 : 0) ? '1px solid var(--rule)' : 'none',
                  borderTop: isMobile && i >= 2 ? '1px solid var(--rule)' : 'none',
                }}
              >
                <div className="t-label" style={{ padding: 0 }}>{k}</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 22, color: c }}>{v}</div>
                {m && <div className="t-meta" style={{ marginTop: 6 }}>{m}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          padding: isMobile ? '0 4px' : '0 32px',
          borderBottom: '1px solid var(--rule)',
          background: 'var(--surface)',
          display: 'flex',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          {TABS.map(({ key, label }) => {
            const active = activeTab === key
            return (
              <div
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: isMobile ? '12px 14px' : '14px 18px',
                  fontSize: 13,
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: active ? 500 : 400,
                  borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: -1,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {label}
              </div>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview'  && <OverviewTab customer={customer} isMobile={isMobile} />}
        {activeTab === 'trips'     && <TabStub title="Trip History"     module="Bookings Module" />}
        {activeTab === 'payments'  && <TabStub title="Payment History"  module="Payments Module" />}
        {activeTab === 'wallet'    && <WalletTab customerId={customer.id} />}
        {activeTab === 'addresses' && <TabStub title="Saved Addresses"  module="Coming soon" />}
        {activeTab === 'tickets'   && <TabStub title="Support Tickets"  module="Support Module" />}
        {activeTab === 'risk'      && <TabStub title="Risk Assessment"  module="Risk Module" />}
        {activeTab === 'audit'     && <TabStub title="Audit Log"        module="Audit Module" />}
      </div>

      {/* Wallet Adjust Modal */}
      {showWalletModal && (
        <WalletAdjustModal
          customer={customer}
          initialDirection={walletDirection}
          onClose={() => setShowWalletModal(false)}
          onSuccess={updated => setCustomer(updated)}
        />
      )}

      {/* Suspend — reason required */}
      {showSuspendDialog && (
        <FlagReasonModal
          title={`Suspend ${customer.name}`}
          placeholder="Reason for suspension (required)…"
          confirmLabel="Suspend"
          variant="danger"
          onConfirm={handleSuspend}
          onCancel={() => setShowSuspendDialog(false)}
        />
      )}

      {/* Flag modal */}
      {showFlagModal && (
        <FlagReasonModal
          title={`Flag ${customer.name}`}
          placeholder="Reason for flagging…"
          onConfirm={handleFlag}
          onCancel={() => setShowFlagModal(false)}
        />
      )}

      {/* Reactivate confirm */}
      <ConfirmDialog
        open={showReactivateDialog}
        title="Reactivate customer"
        description={`Restore ${customer.name}'s account. They will be able to make new bookings immediately.`}
        confirmLabel="Reactivate"
        variant="default"
        onConfirm={handleReactivate}
        onCancel={() => setShowReactivateDialog(false)}
      />

      {/* Unflag confirm */}
      <ConfirmDialog
        open={showUnflagDialog}
        title="Remove flag"
        description={`Clear the flag on ${customer.name} and restore their Active status.`}
        confirmLabel="Unflag"
        variant="default"
        onConfirm={handleUnflag}
        onCancel={() => setShowUnflagDialog(false)}
      />
    </Shell>
  )
}
