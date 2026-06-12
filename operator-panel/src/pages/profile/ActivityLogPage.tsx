import { useQuery } from '@tanstack/react-query'
import { fmtDateTime } from '../../lib/format'
import Shell from '../../components/layout/Shell'
import ProfileRail from '../../components/layout/ProfileRail'
import { operatorAuthService } from '../../services/operatorAuthService'
import { useOperatorAuthStore } from '../../stores/authStore'
import type { OperatorLoginHistory } from '../../services/operatorAuthService'

// ── event metadata ────────────────────────────────────────────
interface EventMeta { label: string; tone: 'ok' | 'danger' | 'warn' | 'info' }

const EVENT_META: Record<string, EventMeta> = {
  sign_in:             { label: 'Signed in',            tone: 'ok' },
  sign_in_failed:      { label: 'Failed sign-in',       tone: 'danger' },
  '2fa_verified':      { label: '2FA verified',         tone: 'ok' },
  '2fa_failed':        { label: '2FA code failed',      tone: 'danger' },
  '2fa_enrolled':      { label: '2FA enrolled',         tone: 'ok' },
  '2fa_disabled':      { label: '2FA disabled',         tone: 'warn' },
  password_changed:    { label: 'Password changed',     tone: 'ok' },
  recovery_code_used:  { label: 'Recovery code used',   tone: 'warn' },
  email_code_verified: { label: 'Email code verified',  tone: 'ok' },
}

function getEventMeta(h: OperatorLoginHistory): EventMeta {
  const meta = EVENT_META[h.event_type]
  if (meta) return meta
  // Fallback for legacy rows without event_type
  return h.success
    ? { label: 'Signed in', tone: 'ok' }
    : { label: 'Failed sign-in', tone: 'danger' }
}

function EventIcon({ tone }: { tone: EventMeta['tone'] }) {
  const colors: Record<string, string> = {
    ok:     'var(--ok)',
    danger: 'var(--danger)',
    warn:   'var(--warn)',
    info:   'var(--info)',
  }
  const bg: Record<string, string> = {
    ok:     'var(--ok-soft)',
    danger: 'var(--danger-soft)',
    warn:   'color-mix(in oklab, var(--warn) 12%, var(--surface))',
    info:   'color-mix(in oklab, var(--info) 12%, var(--surface))',
  }
  return (
    <span style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: bg[tone],
      border: `1px solid color-mix(in oklab, ${colors[tone]} 25%, var(--rule-strong))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: colors[tone],
    }}>
      {tone === 'danger' ? (
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      ) : tone === 'warn' ? (
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 2 21h20L12 3Zm0 6v6m0 3v.01" />
        </svg>
      ) : (
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 13 4 4L19 7" />
        </svg>
      )}
    </span>
  )
}

const RESULT_BADGE: Record<EventMeta['tone'], React.ReactNode> = {
  ok:     <span className="badge ok"><span className="dot ok" />Success</span>,
  danger: <span className="badge danger"><span className="dot danger" />Failed</span>,
  warn:   <span className="badge warn"><span className="dot warn" />Warning</span>,
  info:   <span className="badge info">Info</span>,
}

export default function ActivityLogPage() {
  const storeUser = useOperatorAuthStore(s => s.user)

  const { data: history, isLoading } = useQuery({
    queryKey: ['operator-sign-in-history'],
    queryFn: operatorAuthService.getSignInHistory,
    staleTime: 60_000,
  })

  return (
    <Shell
      activeId="security"
      breadcrumb="Account · Activity"
      title={storeUser?.name ?? 'Activity Log'}
      subtitle="Security events · last 7 days"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: '100%' }}>
        <ProfileRail active="Activity log" />

        <div style={{ padding: '28px 40px', overflowY: 'auto' }}>

          {/* Section header — vertical stack */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Activity log</div>
            <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 600 }}>
              Authentication and security events for your account over the last 7 days. Failed attempts and warnings are highlighted.
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 20 }}>
            {isLoading ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading activity…</div>
            ) : !history?.length ? (
              <div className="card" style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                No activity in the last 7 days.
              </div>
            ) : (
              <>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="tbl" style={{ minWidth: 520 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 36 }} />
                          <th>When</th>
                          <th>Event</th>
                          <th>IP address</th>
                          <th>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(history as OperatorLoginHistory[]).map(h => {
                          const meta = getEventMeta(h)
                          return (
                            <tr
                              key={h.id}
                              style={meta.tone === 'danger'
                                ? { background: 'color-mix(in oklab, var(--danger) 4%, transparent)' }
                                : meta.tone === 'warn'
                                  ? { background: 'color-mix(in oklab, var(--warn) 4%, transparent)' }
                                  : undefined
                              }
                            >
                              <td style={{ paddingRight: 0 }}>
                                <EventIcon tone={meta.tone} />
                              </td>
                              <td className="num" style={{ color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                                {fmtDateTime(h.attempted_at)}
                              </td>
                              <td style={{ color: 'var(--ink)', fontWeight: 500 }}>
                                {meta.label}
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                                {h.ip_address ?? '—'}
                              </td>
                              <td>
                                {RESULT_BADGE[meta.tone]}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="t-meta">
                    {history.length} event{history.length !== 1 ? 's' : ''} in the last 7 days
                  </div>
                  <div className="t-meta">Logs retained for 7 days</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Shell>
  )
}
