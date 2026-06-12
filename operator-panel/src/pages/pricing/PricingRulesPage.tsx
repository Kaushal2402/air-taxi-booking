import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Download,
  Plus,
  Settings,
  Shield,
} from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { PricingRule, Surcharge } from '../../services/operatorPricingService'
import { operatorPricingService } from '../../services/operatorPricingService'

type Tab = 'rates' | 'surcharges' | 'corporate' | 'templates'

function Toggle({ on, onChange }: { on: boolean; onChange?: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        background: on ? 'var(--accent)' : 'var(--rule-strong)',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: on ? 'flex-end' : 'flex-start',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        }}
      />
    </div>
  )
}

function RateRow({ rule }: { rule: PricingRule }) {
  const price = rule.per_seat_minor ?? rule.hourly_rate_minor ?? 0
  const unit = rule.per_seat_minor != null ? '/ seat' : '/ hr'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--rule-soft)',
        gap: 0,
      }}
    >
      <div style={{ width: 100, flexShrink: 0 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            letterSpacing: '0.05em',
            color: 'var(--ink)',
            fontWeight: 600,
          }}
        >
          {rule.aircraft_type_name}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="t-meta" style={{ fontSize: 11 }}>
          {rule.rate_type}
        </span>
      </div>
      <div style={{ width: 130, flexShrink: 0, textAlign: 'right' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            color: 'var(--ok)',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          ₹{price.toLocaleString('en-IN')}
        </span>
        <span className="t-meta" style={{ marginLeft: 5, fontSize: 11 }}>
          {unit}
        </span>
      </div>
      <div style={{ width: 80, flexShrink: 0, textAlign: 'right', paddingRight: 12 }}>
        <span className="t-meta" style={{ fontSize: 11 }}>
          v{rule.version}
        </span>
      </div>
      <button className="btn sm icon" style={{ height: 26, width: 26, flexShrink: 0 }}>
        <Settings size={11} />
      </button>
    </div>
  )
}

function SurchargeRow({
  surcharge,
  onToggle,
}: {
  surcharge: Surcharge
  onToggle: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 16px',
        borderBottom: '1px solid var(--rule-soft)',
      }}
    >
      <Toggle on={surcharge.enabled} onChange={onToggle} />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: surcharge.enabled ? 'var(--ink)' : 'var(--ink-4)',
          }}
        >
          {surcharge.label}
        </div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>
          {surcharge.basis}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: surcharge.enabled ? 'var(--ink-2)' : 'var(--ink-4)',
            letterSpacing: '0.03em',
          }}
        >
          {surcharge.value_text}
        </span>
      </div>
      <button className="btn sm icon" style={{ height: 24, width: 24 }}>
        <Settings size={11} />
      </button>
    </div>
  )
}

export default function PricingRulesPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [tab, setTab] = useState<Tab>('rates')
  const [rules, setRules] = useState<PricingRule[]>([])
  const [surcharges, setSurcharges] = useState<Surcharge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      operatorPricingService.listRules(),
      operatorPricingService.listSurcharges(),
    ])
      .then(([r, s]) => {
        setRules(r)
        setSurcharges(s)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleToggleSurcharge = (s: Surcharge) => {
    operatorPricingService
      .updateSurcharge(s.id, { enabled: !s.enabled })
      .then(updated => setSurcharges(prev => prev.map(x => (x.id === updated.id ? updated : x))))
      .catch(console.error)
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'rates', label: 'Base rates' },
    { id: 'surcharges', label: 'Surcharges' },
    { id: 'corporate', label: 'Corporate agreements' },
    { id: 'templates', label: 'Quote templates' },
  ]

  return (
    <Shell
      activeId="pricing"
      breadcrumb="Schedule & Pricing"
      title="Pricing & Quotes"
      subtitle={`${rules.length} rate rules · ${surcharges.filter(s => s.enabled).length} active surcharges`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm">
            <Download size={12} />
            Export
          </button>
          <button className="btn sm accent">
            <Plus size={12} />
            Add rule
          </button>
        </div>
      }
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--rule)',
          padding: '0 28px',
          background: 'var(--surface)',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {tabs.map(t => (
          <div
            key={t.id}
            onClick={() => {
              if (t.id === 'corporate') navigate('/pricing/corporate')
              else if (t.id === 'templates') navigate('/pricing/templates')
              else setTab(t.id)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              height: 44,
              padding: '0 14px',
              cursor: 'pointer',
              borderBottom: t.id === tab ? '2px solid var(--ink)' : '2px solid transparent',
              color: t.id === tab ? 'var(--ink)' : 'var(--ink-3)',
              fontSize: 13,
              fontWeight: t.id === tab ? 500 : 400,
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {loading && (
          <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
            Loading…
          </div>
        )}

        {!loading && tab === 'rates' && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="t-label">Base charter rates</span>
              <div style={{ flex: 1 }} />
              <button className="btn sm" style={{ height: 28 }}>
                <Settings size={11} />
                Edit all
              </button>
            </div>
            <div
              className="card"
              style={{ padding: 0, overflow: 'hidden' }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '7px 16px',
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--rule)',
                }}
              >
                {[
                  ['Aircraft', 100],
                  ['Rate description', 0],
                  ['Base price', 130],
                  ['Version', 80],
                  ['', 26],
                ].map(([l, w]) => (
                  <div
                    key={String(l)}
                    className="t-label"
                    style={{
                      width: (w as number) || undefined,
                      flex: !(w as number) ? 1 : undefined,
                      flexShrink: (w as number) ? 0 : undefined,
                      fontSize: 10,
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
              {rules.length === 0 ? (
                <div className="t-meta" style={{ padding: '24px 16px', textAlign: 'center' }}>
                  No pricing rules yet.{' '}
                  <button className="btn sm accent" style={{ height: 26 }}>
                    <Plus size={11} />
                    Add first rule
                  </button>
                </div>
              ) : (
                rules.map(r => <RateRow key={r.id} rule={r} />)
              )}
            </div>
          </section>
        )}

        {!loading && tab === 'surcharges' && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="t-label">Surcharges &amp; multipliers</span>
              <div style={{ flex: 1 }} />
              <button className="btn sm accent" style={{ height: 28 }}>
                <Plus size={11} />
                Add surcharge
              </button>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {surcharges.length === 0 ? (
                <div className="t-meta" style={{ padding: '24px 16px', textAlign: 'center' }}>
                  No surcharges defined.
                </div>
              ) : (
                surcharges.map(s => (
                  <SurchargeRow
                    key={s.id}
                    surcharge={s}
                    onToggle={() => handleToggleSurcharge(s)}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {/* Notice */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '11px 14px',
            background: 'var(--surface-2)',
            border: '1px solid var(--rule)',
            borderRadius: 3,
          }}
        >
          <Shield size={14} style={{ color: 'var(--ink-4)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            Rate changes take effect on new bookings only. In-flight and accepted bookings retain
            the rate at time of quote. Platform commission is deducted from net payout and is not
            configurable here.
          </span>
        </div>
      </div>
    </Shell>
  )
}
