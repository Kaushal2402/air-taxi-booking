import { useEffect, useState } from 'react'
import { Clock, Eye, Plus, Search, Settings } from 'lucide-react'
import Shell from '../../components/layout/Shell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { CorporateAgreement } from '../../services/operatorPricingService'
import { operatorPricingService } from '../../services/operatorPricingService'
import { fmtDate } from '../../lib/format'

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function AgreementRow({
  agreement,
  last,
}: {
  agreement: CorporateAgreement
  last: boolean
}) {
  const days = daysUntil(agreement.expires_at)
  const expiring = days !== null && days <= 30
  const routes: string[] = agreement.routes_json ? JSON.parse(agreement.routes_json) : []

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '11px 24px',
        borderBottom: last ? 'none' : '1px solid var(--rule-soft)',
      }}
    >
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>
          {agreement.client_name}
        </div>
        <div className="t-meta" style={{ fontSize: 10.5 }}>
          {agreement.agreement_since ? `Since ${fmtDate(agreement.agreement_since)}` : ''}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {routes.map(r => (
            <span key={r} className="badge" style={{ height: 17, fontSize: 9.5 }}>
              {r}
            </span>
          ))}
          {routes.length === 0 && <span className="t-meta">No routes</span>}
        </div>
      </div>
      <div style={{ width: 120, flexShrink: 0, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            color: 'var(--ok)',
            fontWeight: 600,
          }}
        >
          {agreement.discount_percent}%
        </div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>
          off standard
        </div>
      </div>
      <div style={{ width: 80, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
          {agreement.bookings_ytd}
        </div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>
          bookings YTD
        </div>
      </div>
      <div style={{ width: 110, flexShrink: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: expiring ? 'var(--warn)' : 'var(--ink-3)',
          }}
        >
          {fmtDate(agreement.expires_at)}
        </div>
        <div className="t-meta" style={{ fontSize: 10.5, marginTop: 1 }}>
          Agreement expires
        </div>
      </div>
      <div style={{ width: 80, flexShrink: 0 }}>
        <span className={`badge ${expiring ? 'warn' : 'ok'}`} style={{ height: 18 }}>
          <span className={`dot ${expiring ? 'warn' : 'ok'}`} />
          {expiring ? 'Expiring' : 'Active'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0, width: 110, justifyContent: 'flex-end' }}>
        <button className="btn sm" style={{ height: 26 }}>
          <Eye size={11} />
          View
        </button>
        <button className="btn sm" style={{ height: 26 }}>
          <Settings size={11} />
        </button>
      </div>
    </div>
  )
}

export default function CorporateAgreementsPage() {
  const isMobile = useIsMobile()
  const [agreements, setAgreements] = useState<CorporateAgreement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    operatorPricingService
      .listAgreements()
      .then(setAgreements)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const expiring = agreements.filter(a => {
    const d = daysUntil(a.expires_at)
    return d !== null && d <= 30
  })

  const filtered = agreements.filter(a =>
    a.client_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Shell
      activeId="pricing"
      breadcrumb="Schedule & Pricing"
      title="Corporate Agreements"
      subtitle={`${agreements.length} agreements · ${expiring.length} expiring soon`}
      actions={
        <button className="btn sm accent">
          <Plus size={12} />
          New agreement
        </button>
      }
    >
      {/* Expiring banner */}
      {expiring.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 28px',
            height: 40,
            background: 'var(--warn-soft)',
            borderBottom: '1px solid color-mix(in oklab,var(--warn) 24%,var(--rule))',
            flexShrink: 0,
          }}
        >
          <Clock size={13} style={{ color: 'var(--warn)', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
            {expiring[0].client_name} agreement expires{' '}
            <b style={{ color: 'var(--warn)' }}>{fmtDate(expiring[0].expires_at)}</b> —{' '}
            {daysUntil(expiring[0].expires_at)} days remaining. Renew to retain preferred pricing.
          </span>
          <div style={{ flex: 1 }} />
          <button className="btn sm" style={{ height: 28 }}>
            Renew →
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 28px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--rule)',
          flexShrink: 0,
        }}
      >
        <div className="input" style={{ width: 240, height: 32 }}>
          <Search size={13} className="icon" />
          <input
            placeholder="Search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>
          {filtered.length} agreements
        </span>
      </div>

      {/* Column header */}
      <div
        style={{
          display: 'flex',
          padding: '8px 24px',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--rule)',
          flexShrink: 0,
        }}
      >
        {[
          ['Client', 220],
          ['Routes covered', 0],
          ['Discount', 120],
          ['Bookings YTD', 80],
          ['Expires', 110],
          ['Status', 80],
          ['', 110],
        ].map(([l, w]) => (
          <div
            key={String(l)}
            className="t-label"
            style={{
              width: (w as number) || undefined,
              flex: !(w as number) ? 1 : undefined,
              flexShrink: (w as number) ? 0 : undefined,
            }}
          >
            {l}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading && (
          <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
            Loading…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="t-meta" style={{ textAlign: 'center', padding: 40 }}>
            No agreements found.
          </div>
        )}
        {!loading &&
          filtered.map((a, i) => (
            <AgreementRow key={a.id} agreement={a} last={i === filtered.length - 1} />
          ))}
      </div>
    </Shell>
  )
}
