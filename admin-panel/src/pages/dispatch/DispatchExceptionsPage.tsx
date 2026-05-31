import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { dispatchService } from '../../services/dispatchService'
import type { DispatchException, ExceptionsResponse, SupplyZone } from '../../services/dispatchService'

function severityDotColor(severity: 'danger' | 'warn' | 'info'): string {
  if (severity === 'danger') return '#d32f2f'
  if (severity === 'warn') return '#e65100'
  return '#1565c0'
}

function ResolveModal({
  exception,
  onConfirm,
  onCancel,
}: {
  exception: DispatchException
  onConfirm: (actionTaken: string) => void
  onCancel: () => void
}) {
  const [action, setAction] = useState(exception.recommended_action)
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 10, padding: 24, width: 400, maxWidth: '95vw',
        boxShadow: 'var(--shadow-pop)',
      }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Resolve Exception</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 16 }}>
          {exception.exception_ref} · {exception.kind} · {exception.booking_ref}
        </div>
        <div className="field">
          <label className="field-label">Action taken</label>
          <input
            className="input"
            value={action}
            onChange={e => setAction(e.target.value)}
            placeholder="Describe the action taken…"
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn ghost sm" onClick={onCancel}>Cancel</button>
          <button className="btn accent sm" onClick={() => onConfirm(action)}>Resolve</button>
        </div>
      </div>
    </div>
  )
}

export default function DispatchExceptionsPage() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const navigate = useNavigate()

  const [data, setData] = useState<ExceptionsResponse | null>(null)
  const [hotZoneSupply, setHotZoneSupply] = useState<SupplyZone | null>(null)
  const [zoneFilter] = useState<string>('')
  const [resolvingException, setResolvingException] = useState<DispatchException | null>(null)
  const [resolving, setResolving] = useState(false)

  void isTablet // used for responsive awareness

  const loadData = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (zoneFilter) params.zone_id = zoneFilter
      const [res, supplyRes] = await Promise.all([
        dispatchService.getExceptions(params),
        dispatchService.getSupply(),
      ])
      setData(res)
      // Find supply data for the hot zone
      if (res.pattern?.hot_zone_id) {
        const zone = supplyRes.zones.find(z => z.zone_id === res.pattern.hot_zone_id) ?? null
        setHotZoneSupply(zone)
      }
    } catch {
      // silent
    }
  }, [zoneFilter])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const interval = setInterval(() => { loadData() }, 10000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleResolve = async (actionTaken: string) => {
    if (!resolvingException) return
    setResolving(true)
    try {
      await dispatchService.resolveException(resolvingException.id, { action_taken: actionTaken })
      setResolvingException(null)
      await loadData()
    } catch {
      // silent
    } finally {
      setResolving(false)
    }
  }

  const stats = data?.stats
  const exceptions = data?.exceptions ?? []
  const pattern = data?.pattern

  return (
    <Shell
      activeId="dispatch"
      breadcrumb="Operations · Live · Exceptions"
      title="Dispatch exceptions"
      subtitle="Active exceptions requiring manual intervention"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost sm" onClick={() => navigate('/dispatch/console')}>
            Open console
          </button>
          <button className="btn accent sm" style={{ fontSize: 12 }}>
            Bulk · expand radius
          </button>
        </div>
      }
    >
      {/* KPI strip */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
          gap: 12, marginBottom: 20,
        }}>
          {[
            { label: 'Active exceptions', value: stats.active_count, accent: stats.active_count > 5 },
            { label: 'No-driver', value: stats.no_driver_count, accent: stats.no_driver_count > 0 },
            { label: 'SLA breach risk', value: stats.sla_breach_risk_count, accent: stats.sla_breach_risk_count > 0 },
            { label: 'Resolved last hr', value: stats.resolved_last_hour, accent: false },
            { label: 'Avg time to resolve', value: `${stats.avg_resolve_seconds}s`, accent: false },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{
              background: 'var(--surface)',
              border: '1px solid var(--rule)',
              borderRadius: 8,
              padding: '14px 16px',
            }}>
              <div className="t-meta" style={{ fontSize: 11, marginBottom: 4 }}>{label}</div>
              <div style={{
                fontSize: 22, fontWeight: 700,
                color: accent ? 'var(--danger, #d32f2f)' : 'var(--ink)',
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Exception table */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        marginBottom: 20,
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', fontWeight: 600, fontSize: 13 }}>
          Active exceptions
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="tbl" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th className="t-label">Exception</th>
                <th className="t-label">Request</th>
                <th className="t-label">Customer</th>
                <th className="t-label">Zone · Service</th>
                <th className="t-label">Attempts</th>
                <th className="t-label">Time in state</th>
                <th className="t-label">Recommended action</th>
                <th className="t-label"></th>
              </tr>
            </thead>
            <tbody>
              {exceptions.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24, fontSize: 13 }}>
                    No active exceptions
                  </td>
                </tr>
              )}
              {exceptions.map(ex => (
                <tr key={ex.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: severityDotColor(ex.severity),
                      }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{ex.exception_ref}</div>
                        <div className="t-meta" style={{ fontSize: 10 }}>{ex.kind}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{ex.booking_ref ?? '—'}</td>
                  <td style={{ fontSize: 12 }}>{ex.customer_name ?? '—'}</td>
                  <td>
                    <div style={{ fontSize: 12 }}>{ex.zone_name}</div>
                    <div className="t-meta" style={{ fontSize: 10 }}>{ex.vehicle_class}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{ex.dispatch_attempts}</td>
                  <td style={{ fontSize: 12 }}>{ex.age_display}</td>
                  <td style={{ fontSize: 12 }}>{ex.recommended_action}</td>
                  <td>
                    <button
                      className="btn sm accent"
                      style={{ fontSize: 11 }}
                      onClick={() => setResolvingException(ex)}
                    >
                      Resolve →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pattern analysis */}
      {pattern && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 8,
          padding: 20,
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Pattern analysis</div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>{pattern.description}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 16 }}>{pattern.detail}</div>
          {/* Supply bar for hot zone — live data */}
          {hotZoneSupply && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                Supply · {pattern.hot_zone_name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(() => {
                  const maxVal = Math.max(hotZoneSupply.online_drivers, hotZoneSupply.demand, 1)
                  return [
                    { label: `Online drivers · now`, val: hotZoneSupply.online_drivers, color: '#ef5350' },
                    { label: `Active demand · now`, val: hotZoneSupply.demand, color: '#e65100' },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span>{label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{val}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--rule)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round((val / maxVal) * 100)}%`, height: '100%', background: color, borderRadius: 4 }} />
                      </div>
                    </div>
                  ))
                })()}
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                  D/S ratio: <strong>{hotZoneSupply.ds_ratio.toFixed(2)}×</strong>
                  {hotZoneSupply.surge_multiplier > 1 && (
                    <span style={{ marginLeft: 8, color: '#e65100' }}>surge {hotZoneSupply.surge_multiplier.toFixed(1)}×</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Resolve modal */}
      {resolvingException && (
        <ResolveModal
          exception={resolvingException}
          onConfirm={resolving ? () => undefined : handleResolve}
          onCancel={() => setResolvingException(null)}
        />
      )}
    </Shell>
  )
}
