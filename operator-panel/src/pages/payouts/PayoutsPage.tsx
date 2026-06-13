import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarDays, CircleDollarSign, Clock, AlertCircle } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import { fmtCurrency, fmtDate } from '../../lib/format'
import type { SettlementSummary, SettlementsKPI } from '../../services/operatorSettlementsService'
import { operatorSettlementsService } from '../../services/operatorSettlementsService'

type TabId = 'all' | 'pending' | 'processing' | 'paid' | 'disputed'

const STATUS_TONE: Record<string, string> = {
  paid: 'ok',
  pending: 'warn',
  processing: 'info',
  disputed: 'danger',
  on_hold: 'danger',
}

function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'info'
  const label = status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span className={`badge ${tone}`} style={{ height: 20 }}>
      <span className={`dot ${tone}`} />
      {label}
    </span>
  )
}

interface KPICardProps {
  icon: React.ReactNode
  label: string
  value: string
  tone?: 'default' | 'warn' | 'danger' | 'ok'
}

function KPICard({ icon, label, value, tone = 'default' }: KPICardProps) {
  const toneColor =
    tone === 'warn'
      ? 'var(--warn)'
      : tone === 'danger'
      ? 'var(--danger)'
      : tone === 'ok'
      ? 'var(--accent)'
      : 'var(--ink)'

  return (
    <div
      style={{
        flex: 1,
        minWidth: 160,
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)' }}>
        {icon}
        <span className="t-label" style={{ fontSize: 11 }}>
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: toneColor,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

export default function PayoutsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [kpi, setKpi] = useState<SettlementsKPI | null>(null)
  const [settlements, setSettlements] = useState<SettlementSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('all')

  useEffect(() => {
    operatorSettlementsService
      .list()
      .then(data => {
        setKpi(data.kpi)
        setSettlements(data.settlements)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const tabs: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'processing', label: 'Processing' },
    { id: 'paid', label: 'Paid' },
    { id: 'disputed', label: 'Disputed' },
  ]

  const tabCounts = useMemo(() => ({
    all: settlements.length,
    pending: settlements.filter(s => s.status === 'pending').length,
    processing: settlements.filter(s => s.status === 'processing').length,
    paid: settlements.filter(s => s.status === 'paid').length,
    disputed: settlements.filter(s => s.status === 'disputed').length,
  }), [settlements])

  const filtered = useMemo(() => {
    if (activeTab === 'all') return settlements
    return settlements.filter(s => s.status === activeTab)
  }, [settlements, activeTab])

  const cols = [
    ['Period', 160],
    ['Gross', 120],
    ['Commission', 120],
    ['Deductions', 120],
    ['Net', 120],
    ['Status', 120],
    ['', 80],
  ] as [string, number][]

  return (
    <Shell
      activeId="payouts"
      breadcrumb="Finance"
      title="Payouts & Settlements"
      subtitle="Track your earnings and settlement history"
    >
      {/* KPI Cards */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '20px 28px 0',
          flexWrap: 'wrap',
        }}
      >
        <KPICard
          icon={<CircleDollarSign size={14} />}
          label="Total Earned"
          value={kpi ? fmtCurrency(kpi.total_earned) : '—'}
          tone="ok"
        />
        <KPICard
          icon={<Clock size={14} />}
          label="Pending Payout"
          value={kpi ? fmtCurrency(kpi.pending_payout) : '—'}
          tone="warn"
        />
        <KPICard
          icon={<AlertCircle size={14} />}
          label="Disputed"
          value={kpi ? fmtCurrency(kpi.disputed) : '—'}
          tone="danger"
        />
        <KPICard
          icon={<CalendarDays size={14} />}
          label="Next Payout Date"
          value={kpi?.next_payout_date ? fmtDate(kpi.next_payout_date) : '—'}
        />
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--rule)',
          padding: '0 28px',
          background: 'var(--surface)',
          flexShrink: 0,
          overflowX: 'auto',
          marginTop: 20,
        }}
      >
        {tabs.map(t => (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              height: 44,
              padding: '0 14px',
              cursor: 'pointer',
              borderBottom: t.id === activeTab ? '2px solid var(--ink)' : '2px solid transparent',
              color: t.id === activeTab ? 'var(--ink)' : 'var(--ink-3)',
              fontSize: 13,
              fontWeight: t.id === activeTab ? 500 : 400,
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                padding: '1px 7px',
                borderRadius: 10,
                background: t.id === activeTab ? 'var(--ink)' : 'var(--surface-sunk)',
                color: t.id === activeTab ? 'var(--bg)' : 'var(--ink-3)',
                border: t.id === activeTab ? 'none' : '1px solid var(--rule-strong)',
              }}
            >
              {tabCounts[t.id]}
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      {isMobile ? (
        /* Mobile: stacked cards */
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
              Loading…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
              No settlements found.
            </div>
          )}
          {!loading && filtered.map(s => (
            <div
              key={s.id}
              onClick={() => navigate(`/payouts/${s.id}`)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--rule)',
                borderRadius: 8,
                padding: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>{s.period_label}</span>
                <StatusBadge status={s.status} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div className="t-label" style={{ fontSize: 10, marginBottom: 2 }}>Gross</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmtCurrency(s.gross_amount)}</div>
                </div>
                <div>
                  <div className="t-label" style={{ fontSize: 10, marginBottom: 2 }}>Commission</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)' }}>-{fmtCurrency(s.commission_amount)}</div>
                </div>
                <div>
                  <div className="t-label" style={{ fontSize: 10, marginBottom: 2 }}>Deductions</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)' }}>-{fmtCurrency(s.deduction_amount)}</div>
                </div>
                <div>
                  <div className="t-label" style={{ fontSize: 10, marginBottom: 2 }}>Net</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{fmtCurrency(s.net_amount)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ArrowRight size={14} style={{ color: 'var(--ink-3)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: table */
        <div style={{ flex: 1, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Col headers */}
          <div
            style={{
              display: 'flex',
              padding: '8px 24px',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--rule)',
              minWidth: 840,
            }}
          >
            {cols.map(([label, width]) => (
              <div
                key={label}
                className="t-label"
                style={{
                  width: width || undefined,
                  flex: !width ? 1 : undefined,
                  flexShrink: width ? 0 : undefined,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {loading && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
              Loading…
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
              No settlements found.
            </div>
          )}

          {!loading &&
            filtered.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 24px',
                  borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--rule-soft)',
                  minWidth: 840,
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/payouts/${s.id}`)}
              >
                {/* Period */}
                <div style={{ width: 160, flexShrink: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{s.period_label}</div>
                  {s.payout_date && (
                    <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>
                      Paid {fmtDate(s.payout_date)}
                    </div>
                  )}
                </div>

                {/* Gross */}
                <div style={{ width: 120, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)' }}>
                    {fmtCurrency(s.gross_amount)}
                  </span>
                </div>

                {/* Commission */}
                <div style={{ width: 120, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)' }}>
                    -{fmtCurrency(s.commission_amount)}
                  </span>
                </div>

                {/* Deductions */}
                <div style={{ width: 120, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)' }}>
                    -{fmtCurrency(s.deduction_amount)}
                  </span>
                </div>

                {/* Net */}
                <div style={{ width: 120, flexShrink: 0 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: 'var(--accent)',
                    }}
                  >
                    {fmtCurrency(s.net_amount)}
                  </span>
                </div>

                {/* Status */}
                <div style={{ width: 120, flexShrink: 0 }}>
                  <StatusBadge status={s.status} />
                </div>

                {/* View */}
                <div style={{ width: 80, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn sm"
                    style={{ height: 26 }}
                    onClick={e => { e.stopPropagation(); navigate(`/payouts/${s.id}`) }}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </Shell>
  )
}
