import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { payoutsService } from '../../services/payoutsService'
import type { PayoutPayee } from '../../services/payoutsService'

const fmtINR = (n: number) => '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })

export default function DriverStatementPage() {
  const { payeeId } = useParams<{ payeeId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [payee, setPayee] = useState<PayoutPayee | null>(null)
  const [loading, setLoading] = useState(true)
  const [placeHold, setPlaceHold] = useState(false)
  const [showAdjustDialog, setShowAdjustDialog] = useState(false)
  const [adjDesc, setAdjDesc] = useState('')
  const [adjAmount, setAdjAmount] = useState('')
  const [adjType, setAdjType] = useState<'deduction' | 'addition'>('deduction')

  const load = useCallback(async () => {
    if (!payeeId) return
    setLoading(true)
    try {
      const data = await payoutsService.getPayee(payeeId)
      setPayee(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [payeeId])

  useEffect(() => { load() }, [load])

  async function handlePlaceHold() {
    if (!payeeId) return
    try {
      await payoutsService.updatePayee(payeeId, { status: 'hold' })
      setPlaceHold(false)
      await load()
    } catch {
      // ignore
    }
  }

  async function handleAddAdjustment() {
    if (!payeeId || !adjDesc.trim() || !adjAmount) return
    try {
      await payoutsService.addAdjustment(payeeId, {
        adjustment_type: adjType,
        description: adjDesc,
        amount: parseFloat(adjAmount),
      })
      setShowAdjustDialog(false)
      setAdjDesc('')
      setAdjAmount('')
      await load()
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <Shell activeId="payouts" title="Loading…">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--ink-4)' }}>
          Loading statement…
        </div>
      </Shell>
    )
  }

  if (!payee) return null

  const rawLines: Array<[string, number, string]> = [
    ['Trip fares', payee.gross_amount, 'fare'],
    ['Incentives', payee.incentive_amount, 'add'],
    ...payee.adjustments.map((a): [string, number, string] => [
      a.description,
      a.adjustment_type === 'addition' ? a.amount : -a.amount,
      a.adjustment_type === 'addition' ? 'add' : 'ded',
    ]),
    ['Deductions', -payee.deduction_amount, 'ded'],
    ['Holds', -payee.hold_amount, 'hold'],
    ['Net payable', payee.net_amount, 'net'],
  ]
  const lines = rawLines.filter(([, v]) => v !== 0)

  return (
    <Shell
      activeId="payouts"
      breadcrumb="Finance · Payouts · Statement"
      title={`${payee.entity_name} · ${payee.entity_ref ?? ''}`}
      subtitle={`${payee.entity_type} statement · ${fmtINR(payee.net_amount)} net`}
      actions={
        <>
          <button className="btn sm"><Icon name="download" size={13} />Statement PDF</button>
          <button className="btn sm" onClick={() => setShowAdjustDialog(true)}>Adjust</button>
          {payee.status !== 'hold' && (
            <button className="btn sm danger" onClick={() => setPlaceHold(true)}>Place hold</button>
          )}
          {payee.status === 'hold' && (
            <button className="btn sm accent" onClick={async () => {
              await payoutsService.updatePayee(payee.id, { status: 'ready' })
              await load()
            }}>Release hold</button>
          )}
        </>
      }
    >
      <div style={{
        padding: isMobile ? '16px' : '24px 32px 28px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
        gap: 24,
      }}>
        {/* Left — earnings breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-label" style={{ padding: 0 }}>Earnings breakdown</div>
              {payee.status === 'ready'    ? <span className="badge ok"><span className="dot ok" />Ready to pay</span> :
               payee.status === 'hold'    ? <span className="badge danger"><span className="dot danger" />On hold</span> :
               payee.status === 'paid'    ? <span className="badge ok"><span className="dot ok" />Paid</span> :
               payee.status === 'bank_fail' ? <span className="badge warn"><span className="dot warn" />Bank fail</span> :
               <span className="badge"><span className="dot pending" />{payee.status}</span>}
            </div>
            <div style={{ padding: '8px 24px 16px' }}>
              {lines.map(([k, v, kind], i) => {
                const isNet = kind === 'net'
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 0',
                    borderBottom: i < lines.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                    borderTop: isNet ? '1px solid var(--rule-strong)' : 'none',
                  }}>
                    <span style={{
                      fontSize: isNet ? 14 : 13,
                      fontWeight: isNet ? 500 : 400,
                      color: kind === 'ded' || kind === 'hold' ? 'var(--ink-3)' : 'var(--ink)',
                      fontFamily: isNet ? 'var(--font-serif)' : 'var(--font-sans)',
                    }}>{k}</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: isNet ? 16 : 13,
                      fontWeight: isNet ? 500 : 400,
                      color: isNet ? 'var(--accent)' : v < 0 ? 'var(--ink-3)' : 'var(--ink)',
                    }}>
                      {v === 0 ? '—' : v < 0 ? '−' + fmtINR(v) : fmtINR(v)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Adjustments panel */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="t-label">Adjustments</div>
              <button className="btn sm ghost" onClick={() => setShowAdjustDialog(true)}>
                <Icon name="plus" size={12} />Add
              </button>
            </div>
            {payee.adjustments.length === 0 ? (
              <div className="t-meta">No adjustments for this payee.</div>
            ) : payee.adjustments.map((adj, i) => (
              <div key={adj.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: i < payee.adjustments.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 13 }}>{adj.description}</div>
                  {adj.reference && <div className="t-meta" style={{ marginTop: 2 }}>{adj.reference}</div>}
                </div>
                <span className="t-mono" style={{ fontSize: 13, color: adj.adjustment_type === 'addition' ? 'var(--accent)' : 'var(--ink-3)' }}>
                  {adj.adjustment_type === 'addition' ? '+' : '−'}{fmtINR(adj.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — payee info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="avatar lg">{payee.entity_name.split(' ').map((x: string) => x[0]).join('').slice(0, 2)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{payee.entity_name}</div>
                <div className="t-meta" style={{ marginTop: 3 }}>{payee.entity_ref} · {payee.entity_type}</div>
              </div>
              {payee.status === 'ready' ? <span className="badge ok"><span className="dot ok" />Ready</span> :
               payee.status === 'hold' ? <span className="badge danger"><span className="dot danger" />Hold</span> :
               payee.status === 'paid' ? <span className="badge ok"><span className="dot ok" />Paid</span> :
               <span className="badge warn"><span className="dot warn" />Bank fail</span>}
            </div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                ['Trips', payee.trip_count.toString()],
                ['Gross', fmtINR(payee.gross_amount)],
                ['Net', fmtINR(payee.net_amount)],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                  <div className="t-label" style={{ padding: 0 }}>{k}</div>
                  <div style={{ marginTop: 5, fontFamily: 'var(--font-serif)', fontSize: 18 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {payee.bank_account_ref && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
              <div className="t-label" style={{ marginBottom: 14 }}>Beneficiary account</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, border: '1px solid var(--rule-strong)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
                  <Icon name="building" size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{payee.bank_account_ref}</div>
                  <div className="t-meta" style={{ marginTop: 3 }}>Payout method · NACH credit</div>
                </div>
                <span className="badge ok"><Icon name="check" size={11} />Verified</span>
              </div>
            </div>
          )}

          {payee.utr_number && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Settlement</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13 }}>UTR Number</span>
                <span className="t-mono" style={{ fontSize: 13 }}>{payee.utr_number}</span>
              </div>
              {payee.paid_at && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 13 }}>Settled at</span>
                  <span className="t-meta">{new Date(payee.paid_at).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          )}

          <button className="btn sm ghost" onClick={() => navigate(-1)}>← Back to run</button>
        </div>
      </div>

      <ConfirmDialog
        open={placeHold}
        title="Place hold"
        description={`Place hold on ${payee.entity_name}'s payout of ${fmtINR(payee.net_amount)}? They will not be paid in this run.`}
        confirmLabel="Place hold"
        variant="danger"
        onConfirm={handlePlaceHold}
        onCancel={() => setPlaceHold(false)}
      />

      {showAdjustDialog && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(15,13,10,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={() => setShowAdjustDialog(false)}>
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: 24, width: '100%', maxWidth: 420, borderRadius: 4 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Add adjustment</div>
            <div className="field" style={{ marginBottom: 12 }}>
              <div className="field-label">Type</div>
              <select className="input" value={adjType} onChange={e => setAdjType(e.target.value as 'deduction' | 'addition')} style={{ width: '100%', height: 36, padding: '0 10px' }}>
                <option value="deduction">Deduction</option>
                <option value="addition">Addition / Bonus</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <div className="field-label">Description</div>
              <input className="input" style={{ width: '100%', height: 36, padding: '0 10px' }} placeholder="e.g. Fuel advance recovery" value={adjDesc} onChange={e => setAdjDesc(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <div className="field-label">Amount (₹)</div>
              <input className="input" type="number" min="0" style={{ width: '100%', height: 36, padding: '0 10px' }} placeholder="0" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn sm ghost" onClick={() => setShowAdjustDialog(false)}>Cancel</button>
              <button className="btn sm accent" disabled={!adjDesc.trim() || !adjAmount} onClick={handleAddAdjustment}>Add adjustment</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
