import { useState, useEffect } from 'react'
import { usePermission } from '../../hooks/usePermission'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { settingsService } from '../../services/settingsService'
import type { KillSwitch, MaintenanceWindow, CreateMaintenanceWindowBody } from '../../services/settingsService'
import { catalogService } from '../../services/catalogService'
import type { ServiceZone } from '../../services/catalogService'
import { formatDateTimeCompact, formatTimeHM, getUserTimezone } from '../../lib/utils'

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({ on, onClick }: { on: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        padding: 2,
        flexShrink: 0,
        background: on ? 'var(--accent)' : 'var(--rule-strong)',
        display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'background 180ms ease',
      }}
    >
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', display: 'block' }} />
    </div>
  )
}

// ── Add maintenance window form ───────────────────────────────────────────────

interface AddWindowFormProps {
  onSave: (body: CreateMaintenanceWindowBody) => Promise<void>
  onCancel: () => void
  saving: boolean
}

function AddWindowForm({ onSave, onCancel, saving }: AddWindowFormProps) {
  const [regionName, setRegionName] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({ region_name: regionName, description, starts_at: startsAt, ends_at: endsAt })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,24,20,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          boxShadow: 'var(--shadow-pop)',
          padding: '24px 28px',
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
            Schedule maintenance window
          </h3>
          <button className="btn icon sm ghost" onClick={onCancel}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <form onSubmit={e => { void handleSubmit(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label className="field-label">Region name</label>
            <input
              className="input"
              placeholder="e.g. Pune (WL)"
              value={regionName}
              onChange={e => setRegionName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-label">Description</label>
            <input
              className="input"
              placeholder="e.g. Config migration"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-label">Starts at</label>
            <input
              className="input"
              type="datetime-local"
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
              required
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
            />
          </div>
          <div className="field">
            <label className="field-label">Ends at</label>
            <input
              className="input"
              type="datetime-local"
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
              required
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn sm" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn sm accent" disabled={saving}>
              {saving ? 'Scheduling…' : 'Schedule window'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Region status badge ───────────────────────────────────────────────────────

function RegionStatusBadge({ status }: { status: string }) {
  if (status === 'operational') {
    return <span className="badge ok"><span className="dot ok" />Live</span>
  }
  if (status === 'degraded') {
    return <span className="badge warn"><span className="dot warn" />Degraded</span>
  }
  return <span className="badge"><span className="dot pending" />Maintenance</span>
}

// ── Time remaining helper ─────────────────────────────────────────────────────

function timeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `In ${h}h ${m}m`
  return `In ${m}m`
}

function formatWindow(w: MaintenanceWindow): string {
  const tz = getUserTimezone()
  return `${formatDateTimeCompact(w.starts_at, tz)} → ${formatTimeHM(w.ends_at, tz)}`
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const isMobile = useIsMobile()

  const [killSwitches, setKillSwitches] = useState<KillSwitch[]>([])
  const [regions, setRegions] = useState<ServiceZone[]>([])
  const [windows, setWindows] = useState<MaintenanceWindow[]>([])
  const [noticeMsg, setNoticeMsg] = useState('')

  // Kill switch confirm dialog state
  const [confirmKs, setConfirmKs] = useState<KillSwitch | null>(null)
  const [confirmingKs, setConfirmingKs] = useState(false)

  // Add window modal
  const [showAddWindow, setShowAddWindow] = useState(false)
  const [savingWindow, setSavingWindow] = useState(false)
  const canManageSettings = usePermission('settings.manage')

  const loadData = async () => {
    try {
      const [ks, r, w] = await Promise.all([
        settingsService.listKillSwitches(),
        catalogService.listServiceZones(true),
        settingsService.listMaintenanceWindows(),
      ])
      setKillSwitches(ks)
      setRegions(r)
      setWindows(w.items)
    } catch { /* ignore */ }
  }

  useEffect(() => { void loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKillSwitchToggleRequest = (ks: KillSwitch) => {
    setConfirmKs(ks)
  }

  const handleKillSwitchConfirm = async () => {
    if (!confirmKs) return
    setConfirmingKs(true)
    try {
      await settingsService.updateKillSwitch(confirmKs.key, !confirmKs.enabled)
      await loadData()
      setConfirmKs(null)
    } catch {
      setNoticeMsg('Failed to update kill switch.')
      setConfirmKs(null)
    } finally {
      setConfirmingKs(false)
    }
  }

  const handleAddWindow = async (body: CreateMaintenanceWindowBody) => {
    setSavingWindow(true)
    try {
      await settingsService.createMaintenanceWindow(body)
      setShowAddWindow(false)
      await loadData()
    } catch {
      setNoticeMsg('Failed to schedule maintenance window.')
    } finally {
      setSavingWindow(false)
    }
  }

  const handleDeleteWindow = async (id: string) => {
    try {
      await settingsService.deleteMaintenanceWindow(id)
      await loadData()
    } catch {
      setNoticeMsg('Failed to delete maintenance window.')
    }
  }

  // Build confirm dialog content
  const confirmDialogProps = confirmKs
    ? confirmKs.enabled
      ? {
          title: `Kill switch: ${confirmKs.name}`,
          description: `This will immediately ${confirmKs.description.toLowerCase()} for all users. This action is audit-logged.`,
          confirmLabel: 'Activate kill switch',
          variant: 'danger' as const,
        }
      : {
          title: `Re-enable: ${confirmKs.name}`,
          description: `This will restore ${confirmKs.description.toLowerCase()}.`,
          confirmLabel: 'Re-enable',
          variant: 'default' as const,
        }
    : null

  return (
    <Shell
      activeId="settings"
      breadcrumb="System · Settings · Maintenance"
      title="Maintenance & kill switches"
      subtitle="Use with extreme care — actions are immediate · each toggle requires confirmation"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn sm" onClick={() => setShowAddWindow(true)} style={{ display: canManageSettings ? undefined : 'none' }}>
            <Icon name="clock" size={13} />
            Schedule window
          </button>
          <button
            className="btn sm"
            onClick={() => setNoticeMsg('Status page — external link not configured.')}
          >
            Status page
          </button>
        </div>
      }
    >
      {/* Notice banner */}
      {noticeMsg && (
        <div style={{
          padding: '10px 20px', fontSize: 12.5,
          background: 'var(--accent-soft)',
          borderBottom: '1px solid color-mix(in oklab, var(--accent) 28%, var(--rule))',
          color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {noticeMsg}
          <button
            onClick={() => setNoticeMsg('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 4px' }}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <div style={{
        padding: isMobile ? '12px 16px 24px' : '20px 32px 28px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 24,
      }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Danger warning banner */}
          <div style={{
            padding: '16px 20px',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule))',
            borderRadius: 3,
            display: 'flex',
            gap: 12,
          }}>
            <Icon name="alert" size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Kill switches take effect immediately across all clients. Each toggle requires a second admin confirmation and is written to the audit log with your name.
            </div>
          </div>

          {/* Kill switches card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Global kill switches</div>
            </div>
            {killSwitches.length === 0 ? (
              <div style={{ padding: '20px', color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>
                Loading kill switches…
              </div>
            ) : killSwitches.map((ks, i) => {
              // dot color: ok if enabled (running), danger/warn if killed
              const dotClass = ks.enabled ? 'ok' : ks.tone
              return (
                <div
                  key={ks.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '15px 20px',
                    borderBottom: i < killSwitches.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                  }}
                >
                  <span className={`dot ${dotClass}`} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{ks.name}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>{ks.description}</div>
                  </div>
                  {!ks.enabled && (
                    <span className="badge warn" style={{ marginRight: 4 }}>Disabled</span>
                  )}
                  <Toggle on={ks.enabled} onClick={() => handleKillSwitchToggleRequest(ks)} />
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Regional status card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label">Regional service status</div>
            </div>
            {regions.length === 0 ? (
              <div style={{ padding: '20px', color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>
                Loading regions…
              </div>
            ) : regions.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 20px',
                  borderBottom: i < regions.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                }}
              >
                <span className="badge info" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, flexShrink: 0 }}>{r.code}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>
                    {r.operational_status === 'operational' ? 'Operational' : r.operational_status === 'degraded' ? `Degraded${r.status_note ? ` · ${r.status_note}` : ''}` : `Maintenance${r.status_note ? ` · ${r.status_note}` : ''}`}
                  </div>
                </div>
                <RegionStatusBadge status={r.operational_status} />
              </div>
            ))}
          </div>

          {/* Scheduled maintenance card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="t-label">Scheduled maintenance</div>
              <button className="btn sm ghost" onClick={() => setShowAddWindow(true)}>
                <Icon name="plus" size={12} />
              </button>
            </div>
            {windows.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                No maintenance windows scheduled.
              </div>
            ) : windows.map(w => (
              <div
                key={w.id}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '14px 16px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--rule)',
                  borderRadius: 3,
                  marginBottom: 10,
                }}
              >
                <Icon name="clock" size={16} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {w.region_name} · {w.description}
                  </div>
                  <div className="t-meta" style={{ marginTop: 3 }}>
                    {formatWindow(w)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <span className="badge warn"><span className="dot warn" />{timeRemaining(w.ends_at)}</span>
                  <button
                    className="btn icon sm ghost"
                    onClick={() => { void handleDeleteWindow(w.id) }}
                    title="Remove window"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kill switch confirm dialog */}
      {confirmKs && confirmDialogProps && (
        <ConfirmDialog
          open
          title={confirmDialogProps.title}
          description={confirmDialogProps.description}
          confirmLabel={confirmDialogProps.confirmLabel}
          variant={confirmDialogProps.variant}
          loading={confirmingKs}
          onConfirm={() => { void handleKillSwitchConfirm() }}
          onCancel={() => { if (!confirmingKs) setConfirmKs(null) }}
        />
      )}

      {/* Add maintenance window modal */}
      {showAddWindow && (
        <AddWindowForm
          onSave={handleAddWindow}
          onCancel={() => setShowAddWindow(false)}
          saving={savingWindow}
        />
      )}
    </Shell>
  )
}
