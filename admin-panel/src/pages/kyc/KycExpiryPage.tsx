import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { kycService } from '../../services/kycService'
import type { KycExpiryItem } from '../../services/kycService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysBadge(days: number) {
  if (days < 0)
    return <span className="badge danger"><span className="dot danger" />Expired {Math.abs(days)}d</span>
  if (days <= 3)
    return <span className="badge warn"><span className="dot warn" />{days}d left</span>
  return <span className="badge"><span className="dot" style={{ background: 'var(--ink-3)' }} />{days}d left</span>
}

function entityIcon(t: string): string {
  if (t === 'driver') return 'car'
  if (t === 'operator') return 'building'
  if (t === 'pilot') return 'plane'
  if (t === 'aircraft') return 'layers'
  if (t === 'vehicle') return 'car'
  return 'car'
}

function groupLabel(t: string): string {
  if (t === 'driver') return 'Drivers'
  if (t === 'operator') return 'Operators'
  if (t === 'vehicle') return 'Vehicles & Fleet'
  if (t === 'pilot') return 'Pilots & Crew'
  if (t === 'aircraft') return 'Aircraft'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string
  onClose: () => void
}

function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 400,
      background: 'var(--ink)', color: 'var(--surface)',
      padding: '10px 18px', borderRadius: 4, fontSize: 13,
      boxShadow: 'var(--shadow-pop)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <Icon name="check" size={14} />
      {message}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KycExpiryPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [items, setItems] = useState<KycExpiryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await kycService.getExpiryWatchlist(14)
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // KPI counts
  const expiredCount = items.filter(i => i.days_until_expiry < 0).length
  const urgentCount  = items.filter(i => i.days_until_expiry >= 0 && i.days_until_expiry <= 3).length

  // Group by entity_type
  const groups: Record<string, KycExpiryItem[]> = {}
  items.forEach(item => {
    if (!groups[item.entity_type]) groups[item.entity_type] = []
    groups[item.entity_type].push(item)
  })

  const handleRemind = (entityName: string) => {
    setToast(`Reminder sent to ${entityName}`)
  }

  const handleSendAll = () => {
    setToast('Reminders sent to all expiring holders')
  }

  const handleRemindGroup = (entityType: string) => {
    setToast(`Reminders sent to all ${groupLabel(entityType)}`)
  }

  const renderGroupTable = (entityType: string, groupItems: KycExpiryItem[]) => (
    <div key={entityType} style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
      {/* Group header */}
      <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon name={entityIcon(entityType)} size={16} style={{ color: 'var(--ink-3)' }} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>{groupLabel(entityType)}</span>
        <span className="t-meta">{groupItems.length} expiring</span>
        <div style={{ flex: 1 }} />
        <button
          className="btn sm ghost"
          style={{ height: 28 }}
          onClick={() => handleRemindGroup(entityType)}
        >
          <Icon name="envelope" size={12} />Remind group
        </button>
      </div>

      {/* Table */}
      {isMobile ? (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groupItems.map(item => (
            <div key={item.id} style={{
              background: 'var(--surface-2)', border: '1px solid var(--rule)',
              borderRadius: 3, padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{item.entity_name}</span>
                {daysBadge(item.days_until_expiry)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="badge">{item.doc_type}</span>
                <span className="t-meta" style={{ color: item.days_until_expiry < 0 ? 'var(--danger)' : 'var(--ink-2)' }}>
                  {item.impact}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn sm" style={{ height: 28 }} onClick={() => handleRemind(item.entity_name)}>
                  <Icon name="envelope" size={12} />Remind
                </button>
                <button className="btn sm" style={{ height: 28 }} onClick={() => navigate(`/kyc/${item.entity_type}-documents/${item.id}`)}>
                  Re-verify
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Holder</th>
                <th style={{ width: 200 }}>Document</th>
                <th style={{ width: 150 }}>Expiry</th>
                <th style={{ width: 200 }}>On expiry</th>
                <th style={{ width: 200 }}></th>
              </tr>
            </thead>
            <tbody>
              {groupItems.map(item => (
                <tr key={item.id}>
                  <td>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{item.entity_name}</span>
                  </td>
                  <td>
                    <span className="badge">{item.doc_type}</span>
                  </td>
                  <td>{daysBadge(item.days_until_expiry)}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <Icon
                        name="bolt"
                        size={12}
                        style={{ color: item.days_until_expiry < 0 ? 'var(--danger)' : 'var(--ink-3)' }}
                      />
                      <span className="t-meta" style={{ color: item.days_until_expiry < 0 ? 'var(--danger)' : 'var(--ink-2)' }}>
                        {item.impact}
                      </span>
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="btn sm"
                        style={{ height: 28 }}
                        onClick={() => handleRemind(item.entity_name)}
                      >
                        <Icon name="envelope" size={12} />Remind
                      </button>
                      <button
                        className="btn sm"
                        style={{ height: 28 }}
                        onClick={() => navigate(`/kyc/${item.entity_type}-documents/${item.id}`)}
                      >
                        Re-verify
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <Shell
      activeId="kyc"
      breadcrumb="Compliance · KYC & Documents · Expiry"
      title="Expiry watchlist"
      subtitle="Documents expiring within 14 days"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/kyc')}>
            <Icon name="chevLeft" size={13} />Back to queue
          </button>
          <button className="btn sm accent" onClick={handleSendAll}>
            <Icon name="envelope" size={13} />Send all reminders
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* KPI Strip */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        }}>
          {[
            ['Expiring · 14d', String(items.length), 'Across all entity groups', 'var(--ink-2)'],
            ['Already expired', String(expiredCount), 'Immediate action required', 'var(--danger)'],
            ['≤ 3 days', String(urgentCount), 'Urgent action', 'var(--warn)'],
            ['Reminders sent', '—', 'Last batch unknown', 'var(--ink-2)'],
          ].map(([k, v, m, c], i) => (
            <div key={k} style={{
              padding: isMobile ? '12px 14px' : '18px 22px',
              borderRight: isMobile
                ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                : (i < 3 ? '1px solid var(--rule)' : 'none'),
              borderBottom: isMobile && i < 2 ? '1px solid var(--rule)' : 'none',
            }}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 22 : 28 }}>{v}</div>
              <div className="t-meta" style={{ marginTop: 8, color: c as string }}>{m}</div>
            </div>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            No documents expiring within 14 days.
          </div>
        )}

        {/* Groups */}
        {!loading && items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(groups).map(([entityType, groupItems]) =>
              renderGroupTable(entityType, groupItems)
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Shell>
  )
}
