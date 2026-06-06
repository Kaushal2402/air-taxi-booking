import { useState, useEffect, useRef } from 'react'
import { usePermission } from '../../hooks/usePermission'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { settingsService } from '../../services/settingsService'
import type { FeatureFlag, FlagMetrics, CreateFlagBody } from '../../services/settingsService'

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

// ── Rollout progress bar ──────────────────────────────────────────────────────

function RolloutBar({ pct }: { pct: number }) {
  const color = pct === 100 ? 'var(--accent)' : pct === 0 ? 'var(--ink-4)' : 'var(--warn)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 5, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <span className="t-mono" style={{ fontSize: 11.5, width: 34, textAlign: 'right', color: 'var(--ink-2)' }}>
        {pct}%
      </span>
    </div>
  )
}

// ── New flag modal ────────────────────────────────────────────────────────────

interface NewFlagModalProps {
  onSave: (body: CreateFlagBody) => Promise<void>
  onCancel: () => void
  saving: boolean
}

function NewFlagModal({ onSave, onCancel, saving }: NewFlagModalProps) {
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [environment, setEnvironment] = useState('prod')
  const [owner, setOwner] = useState('')
  const [rolloutPct, setRolloutPct] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      key,
      name,
      description,
      environment,
      rollout_pct: rolloutPct,
      targeting: 'All users',
      owner,
    })
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
          maxWidth: 460,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
            New feature flag
          </h3>
          <button className="btn icon sm ghost" onClick={onCancel}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <form onSubmit={e => { void handleSubmit(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label className="field-label">Key</label>
            <input
              className="input"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
              placeholder="my-feature-flag"
              value={key}
              onChange={e => setKey(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-label">Name</label>
            <input
              className="input"
              placeholder="My Feature"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-label">Description</label>
            <input
              className="input"
              placeholder="Optional description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Environment</label>
              <select
                className="input"
                value={environment}
                onChange={e => setEnvironment(e.target.value)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
              >
                <option value="prod">Prod</option>
                <option value="staging">Staging</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Owner</label>
              <input
                className="input"
                placeholder="Ops"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Rollout % (0–100)</label>
            <input
              className="input"
              type="number"
              min={0}
              max={100}
              value={rolloutPct}
              onChange={e => setRolloutPct(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn sm" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn sm accent" disabled={saving}>
              {saving ? 'Creating…' : 'Create flag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FeatureFlagsPage() {
  const isMobile = useIsMobile()

  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null)
  const [flagMetrics, setFlagMetrics] = useState<FlagMetrics | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [rolloutPct, setRolloutPct] = useState(0)
  const [savingRollout, setSavingRollout] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [creatingFlag, setCreatingFlag] = useState(false)
  const [noticeMsg, setNoticeMsg] = useState('')

  // Env filter dropdown
  const [envFilter, setEnvFilter] = useState<'All' | 'Prod' | 'Staging'>('All')
  const [showEnvDropdown, setShowEnvDropdown] = useState(false)
  const canManageSettings = usePermission('settings.manage')
  const envDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (envDropdownRef.current && !envDropdownRef.current.contains(e.target as Node)) {
        setShowEnvDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadFlags = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {}
      if (envFilter === 'Prod') params.environment = 'prod'
      if (envFilter === 'Staging') params.environment = 'staging'
      const data = await settingsService.listFlags(params)
      setFlags(data.items)
      setTotal(data.total)
      // Auto-select first if nothing selected
      if (data.items.length > 0 && !selectedFlag) {
        void handleSelectFlag(data.items[0])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { void loadFlags() }, [envFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectFlag = async (flag: FeatureFlag) => {
    setSelectedFlag(flag)
    setRolloutPct(flag.rollout_pct)
    setFlagMetrics(null)
    setLoadingMetrics(true)
    try {
      const m = await settingsService.getFlagMetrics(flag.id)
      setFlagMetrics(m)
    } catch { /* ignore — show dashes */ }
    finally { setLoadingMetrics(false) }
  }

  const handleToggle = async (flag: FeatureFlag) => {
    // Optimistic
    setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f))
    if (selectedFlag?.id === flag.id) {
      setSelectedFlag(prev => prev ? { ...prev, enabled: !prev.enabled } : null)
    }
    try {
      await settingsService.updateFlag(flag.id, { enabled: !flag.enabled })
    } catch {
      // Revert
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: flag.enabled } : f))
      if (selectedFlag?.id === flag.id) {
        setSelectedFlag(prev => prev ? { ...prev, enabled: flag.enabled } : null)
      }
      setNoticeMsg('Failed to update flag.')
    }
  }

  const handleSaveRollout = async () => {
    if (!selectedFlag) return
    setSavingRollout(true)
    try {
      const updated = await settingsService.updateFlag(selectedFlag.id, { rollout_pct: rolloutPct })
      setSelectedFlag(updated)
      setFlags(prev => prev.map(f => f.id === updated.id ? updated : f))
    } catch {
      setNoticeMsg('Failed to update rollout.')
    } finally {
      setSavingRollout(false)
    }
  }

  const handleCreateFlag = async (body: CreateFlagBody) => {
    setCreatingFlag(true)
    try {
      await settingsService.createFlag(body)
      setShowNewModal(false)
      await loadFlags()
    } catch {
      setNoticeMsg('Failed to create flag.')
    } finally {
      setCreatingFlag(false)
    }
  }

  const rolloutColor = (pct: number) =>
    pct === 100 ? 'var(--accent)' : pct === 0 ? 'var(--ink-4)' : 'var(--warn)'

  return (
    <Shell
      activeId="settings"
      breadcrumb="System · Settings · Feature flags"
      title="Feature flags"
      subtitle={`${total} flags · changes propagate in ~30s via config service`}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Env filter dropdown */}
          <div ref={envDropdownRef} style={{ position: 'relative' }}>
            <button
              className="btn sm"
              onClick={() => setShowEnvDropdown(v => !v)}
            >
              <Icon name="filter" size={13} />
              {envFilter}
              <Icon name="chevDown" size={11} />
            </button>
            {showEnvDropdown && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--rule)',
                borderRadius: 4, boxShadow: 'var(--shadow-pop)', zIndex: 50,
                minWidth: 110, padding: '4px 0',
              }}>
                {(['All', 'Prod', 'Staging'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => { setEnvFilter(opt); setShowEnvDropdown(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '7px 14px', fontSize: 13, border: 'none',
                      background: envFilter === opt ? 'var(--accent-soft)' : 'transparent',
                      color: envFilter === opt ? 'var(--accent)' : 'var(--ink)',
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn sm accent" onClick={() => setShowNewModal(true)}>
            <Icon name="plus" size={13} />
            New flag
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

      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Flags table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
          {loading ? (
            <div style={{ padding: 28, color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>
              Loading flags…
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="tbl" style={{ minWidth: isMobile ? 600 : undefined }}>
                <thead>
                  <tr>
                    <th>Flag</th>
                    <th>Environment</th>
                    {!isMobile && <th>Targeting</th>}
                    <th style={{ width: 200 }}>Rollout</th>
                    {!isMobile && <th>Owner</th>}
                    <th>State</th>
                    <th style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {flags.length === 0 ? (
                    <tr>
                      <td colSpan={isMobile ? 4 : 7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                        No flags found.
                      </td>
                    </tr>
                  ) : flags.map(f => (
                    <tr
                      key={f.id}
                      style={{
                        cursor: 'pointer',
                        background: selectedFlag?.id === f.id ? 'var(--surface-2)' : undefined,
                      }}
                      onClick={() => handleSelectFlag(f)}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</span>
                          <span className="t-mono t-meta">{f.key}</span>
                        </div>
                      </td>
                      <td>
                        {f.environment === 'prod'
                          ? <span className="badge ok"><span className="dot ok" />Prod</span>
                          : <span className="badge info"><span className="dot info" />Staging</span>}
                      </td>
                      {!isMobile && <td className="t-meta">{f.targeting}</td>}
                      <td><RolloutBar pct={f.rollout_pct} /></td>
                      {!isMobile && <td><span className="badge">{f.owner}</span></td>}
                      <td onClick={e => { e.stopPropagation(); void handleToggle(f) }}>
                        <Toggle on={f.enabled} />
                      </td>
                      <td>
                        <button
                          className="btn icon sm ghost"
                          onClick={e => { e.stopPropagation(); handleSelectFlag(f) }}
                        >
                          <Icon name="chevRight" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel (shown when a flag is selected) */}
        {selectedFlag && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr',
            gap: 18,
          }}>
            {/* Left: selected flag detail */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div className="t-label">Selected flag</div>
                {selectedFlag.enabled
                  ? <span className="badge ok"><span className="dot ok" />Enabled · {selectedFlag.environment === 'prod' ? 'Prod' : 'Staging'}</span>
                  : <span className="badge warn"><span className="dot warn" />Disabled</span>}
              </div>
              <h3 style={{ margin: '6px 0 2px', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>
                {selectedFlag.name}
              </h3>
              <div className="t-mono t-meta">{selectedFlag.key}</div>
              {selectedFlag.description && (
                <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginTop: 14, marginBottom: 0 }}>
                  {selectedFlag.description}
                </p>
              )}
              <div style={{ marginTop: 20 }}>
                <div className="t-label" style={{ marginBottom: 8 }}>Rollout · {rolloutPct}%</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1, height: 8, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${rolloutPct}%`, height: '100%', background: rolloutColor(rolloutPct), transition: 'width 200ms ease' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[10, 35, 50, 100].map(p => (
                    <button
                      key={p}
                      className="btn sm"
                      onClick={() => setRolloutPct(p)}
                      style={{
                        height: 26,
                        padding: '0 9px',
                        background: rolloutPct === p ? 'var(--accent-soft-2)' : 'var(--surface)',
                        borderColor: rolloutPct === p ? 'var(--accent)' : 'var(--rule-strong)',
                        color: rolloutPct === p ? 'var(--accent-ink)' : 'var(--ink-2)',
                      }}
                    >
                      {p}%
                    </button>
                  ))}
                  <button
                    className="btn sm accent"
                    style={{ height: 26, padding: '0 12px', marginLeft: 4 }}
                    onClick={() => { void handleSaveRollout() }}
                    disabled={savingRollout}
                  >
                    {savingRollout ? 'Saving…' : 'Save rollout'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: live metrics (dynamic per flag) */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '20px 24px' }}>
              <div className="t-label" style={{ marginBottom: 14 }}>
                Live metrics · this flag
              </div>
              {loadingMetrics ? (
                <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading metrics…</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    {
                      k: 'Assign latency',
                      v: flagMetrics?.assign_latency_ms != null ? `${flagMetrics.assign_latency_ms} ms` : '—',
                      m: flagMetrics?.latency_label ?? 'No data',
                      c: flagMetrics?.assign_latency_ms != null ? 'var(--accent)' : 'var(--ink-4)',
                    },
                    {
                      k: 'Match rate',
                      v: flagMetrics?.match_rate_pct != null ? `${flagMetrics.match_rate_pct}%` : '—',
                      m: flagMetrics?.match_rate_label ?? 'No data',
                      c: flagMetrics?.match_rate_pct != null ? 'var(--accent)' : 'var(--ink-4)',
                    },
                    {
                      k: 'Cancellations',
                      v: flagMetrics?.cancellation_rate_pct != null ? `${flagMetrics.cancellation_rate_pct}%` : '—',
                      m: flagMetrics?.cancellation_label ?? 'No data',
                      c: flagMetrics?.cancellation_rate_pct != null ? 'var(--accent)' : 'var(--ink-4)',
                    },
                    {
                      k: 'Rollback armed',
                      v: flagMetrics?.rollback_armed == null ? '—' : flagMetrics.rollback_armed ? 'Yes' : 'No',
                      m: flagMetrics?.rollback_armed != null ? 'Auto-rollback configured' : 'No data',
                      c: flagMetrics?.rollback_armed == null ? 'var(--ink-4)' : 'var(--ink-2)',
                    },
                  ].map(({ k, v, m, c }) => (
                    <div key={k} style={{
                      padding: '13px 15px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--rule)',
                      borderRadius: 3,
                    }}>
                      <div className="t-label" style={{ padding: 0 }}>{k}</div>
                      <div style={{
                        marginTop: 5,
                        fontFamily: v === '—' ? 'var(--font-sans)' : 'var(--font-serif)',
                        fontSize: v === '—' ? 24 : 20,
                        color: v === '—' ? 'var(--ink-4)' : 'var(--ink)',
                      }}>{v}</div>
                      <div className="t-meta" style={{ marginTop: 3, color: c }}>{m}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New flag modal */}
      {showNewModal && (
        <NewFlagModal
          onSave={handleCreateFlag}
          onCancel={() => setShowNewModal(false)}
          saving={creatingFlag}
        />
      )}
    </Shell>
  )
}
