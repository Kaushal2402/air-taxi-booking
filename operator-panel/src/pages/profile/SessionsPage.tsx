import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Monitor, Smartphone, Tablet, Globe } from 'lucide-react'
import { fmtDateTime, fmtDate } from '../../lib/format'
import Shell from '../../components/layout/Shell'
import ProfileRail from '../../components/layout/ProfileRail'
import { operatorAuthService } from '../../services/operatorAuthService'
import { useOperatorAuthStore } from '../../stores/authStore'
import type { OperatorSession } from '../../services/operatorAuthService'

// ── device_info parser ───────────────────────────────────────
// Backend format: "{kind} · {OS} · {Browser}" e.g. "Desktop · macOS · Chrome 124"
// kind: "Desktop" | "Mobile" | "Tablet"
function parseDevice(info: string | null): { kind: string; os: string; browser: string } {
  if (!info) return { kind: 'Desktop', os: '', browser: '' }
  const parts = info.split(' · ')
  return {
    kind:    parts[0] ?? 'Desktop',
    os:      parts[1] ?? '',
    browser: parts[2] ?? '',
  }
}

function DeviceIcon({ kind, size = 18 }: { kind: string; size?: number }) {
  const cls = { color: 'var(--ink-3)' }
  if (kind.toLowerCase().includes('mobile')) return <Smartphone size={size} style={cls} />
  if (kind.toLowerCase().includes('tablet')) return <Tablet size={size} style={cls} />
  if (kind.toLowerCase().includes('desktop')) return <Monitor size={size} style={cls} />
  return <Globe size={size} style={cls} />
}

export default function SessionsPage() {
  const qc = useQueryClient()
  const clearAuth = useOperatorAuthStore(s => s.clearAuth)
  const storeUser = useOperatorAuthStore(s => s.user)

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['operator-sessions'],
    queryFn: operatorAuthService.listSessions,
    staleTime: 30_000,
  })

  const revokeSession = useMutation({
    mutationFn: (id: string) => operatorAuthService.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operator-sessions'] }),
  })

  const handleSignOutAll = async () => {
    try {
      await operatorAuthService.signOutAllSessions()
      clearAuth()
    } catch { /* ignore */ }
  }

  return (
    <Shell
      activeId="security"
      breadcrumb="Account · Sessions"
      title={storeUser?.name ?? 'Sessions'}
      subtitle="Active signed-in devices"
      actions={
        <button
          className="btn sm danger"
          onClick={handleSignOutAll}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 17l5-5-5-5M20 12H9M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
          </svg>
          Sign out all sessions
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: '100%' }}>
        <ProfileRail active="Sessions" />

        <div style={{ padding: '28px 40px', overflowY: 'auto' }}>

          {/* Section header — vertical stack */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Active sessions</div>
            <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 600 }}>
              Each card represents a signed-in device or browser. Revoking a session ends it immediately and rotates the refresh token.
              Sessions expire after 7 days; trusted devices are kept for 30 days.
            </div>
          </div>

          {/* Session cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--rule)', paddingTop: 20 }}>
            {isLoading ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading sessions…</div>
            ) : !sessions?.length ? (
              <div className="card" style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                No active sessions found.
              </div>
            ) : (
              sessions.map((s: OperatorSession) => {
                const { kind, os, browser } = parseDevice(s.device_info)
                const hasInfo = !!s.device_info
                return (
                  <div key={s.id} className="card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    {/* Icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 4,
                      background: 'var(--surface-2)', border: '1px solid var(--rule)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <DeviceIcon kind={kind} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          {/* Device name row */}
                          <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
                            {hasInfo ? `${kind} · ${os}` : 'Unknown device'}
                          </div>
                          {/* Browser row */}
                          {hasInfo && browser && (
                            <div className="t-meta" style={{ marginTop: 2 }}>{browser}</div>
                          )}
                          {/* Meta row */}
                          <div className="t-meta" style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <span>
                              IP:{' '}
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                                {s.ip_address ?? '—'}
                              </span>
                            </span>
                            <span>Started: {fmtDateTime(s.created_at)}</span>
                            <span>Expires: {fmtDate(s.expires_at)}</span>
                          </div>
                        </div>

                        {/* Revoke */}
                        <button
                          className="btn sm danger"
                          disabled={revokeSession.isPending}
                          onClick={() => revokeSession.mutate(s.id)}
                          style={{ flexShrink: 0 }}
                        >
                          Revoke
                        </button>
                      </div>

                      {/* Session ID chip */}
                      <div style={{ marginTop: 10 }}>
                        <span className="badge" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.06em' }}>
                          {s.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

        </div>
      </div>
    </Shell>
  )
}
