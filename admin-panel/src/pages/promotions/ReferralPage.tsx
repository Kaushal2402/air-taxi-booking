import { useState, useEffect } from 'react'
import AccessDeniedPage from '../../components/ui/AccessDeniedPage'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { promotionsService } from '../../services/promotionsService'
import type { ReferralProgram, ReferralStats, UpdateReferralProgramBody } from '../../services/promotionsService'
import { useFormatMoney, useCurrencySymbol, currencySymbol } from '../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────


function exportReferralCsv(stats: ReferralStats) {
  const summaryRows = [
    ['Metric', 'Value'],
    ['Referrals sent', stats.referrals_sent],
    ['Converted', stats.converted],
    ['Conversion rate', `${stats.conversion_rate_pct.toFixed(1)}%`],
    [`Reward paid (${currencySymbol()})`, (stats.reward_paid_minor / 100).toFixed(2)],
    ['New customers', stats.new_customers],
    [`CPA (${currencySymbol()})`, (stats.cpa_minor / 100).toFixed(2)],
    ['Fraud blocked', stats.fraud_blocked],
    [`Fraud saved (${currencySymbol()})`, (stats.fraud_saved_minor / 100).toFixed(2)],
    [],
    ['Top referrers'],
    ['Name', 'Converted', `Reward (${currencySymbol()})`, 'At cap'],
    ...stats.top_referrers.map(r => [r.name, r.converted, (r.reward_minor / 100).toFixed(2), r.at_cap ? 'Yes' : 'No']),
  ]
  const csv = summaryRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `referral-stats-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Toggle Pill ───────────────────────────────────────────────────────────────

function TogglePill({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 36, height: 20, borderRadius: 10, padding: 3,
        background: on ? 'var(--accent)' : 'var(--rule-strong, #ccc)',
        display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start',
        cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        display: 'block', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s',
      }} />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReferralPage() {
  const fmtMinor = useFormatMoney()
  const sym = useCurrencySymbol()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [program, setProgram] = useState<ReferralProgram | null>(null)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [draft, setDraft] = useState<UpdateReferralProgramBody>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggleSaving, setToggleSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isForbidden, setIsForbidden] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [prog, st] = await Promise.all([
        promotionsService.getReferralProgram(),
        promotionsService.getReferralStats(),
      ])
      setProgram(prog)
      setStats(st)
      setDraft({
        is_active: prog.is_active,
        referrer_reward_minor: prog.referrer_reward_minor,
        referee_reward_minor: prog.referee_reward_minor,
        qualifying_event: prog.qualifying_event,
        per_referrer_monthly_cap_minor: prog.per_referrer_monthly_cap_minor,
        monthly_budget_minor: prog.monthly_budget_minor,
        fraud_self_referral: prog.fraud_self_referral,
        fraud_device_collusion: prog.fraud_device_collusion,
        fraud_velocity_limit: prog.fraud_velocity_limit,
        fraud_payment_instrument: prog.fraud_payment_instrument,
        fraud_manual_review_threshold_minor: prog.fraud_manual_review_threshold_minor,
      })
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 403) {
        setIsForbidden(true)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const patchDraft = <K extends keyof UpdateReferralProgramBody>(k: K, v: UpdateReferralProgramBody[K]) =>
    setDraft(d => ({ ...d, [k]: v }))

  const handleSave = async () => {
    setSaving(true); setApiError(''); setSaved(false)
    try {
      await promotionsService.updateReferralProgram(draft)
      await load()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setApiError(err?.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  // Immediately save active/paused toggle — don't require manual "Save changes"
  const handleToggleActive = async () => {
    if (!program) return
    const newVal = !isActive
    setToggleSaving(true); setApiError('')
    try {
      await promotionsService.updateReferralProgram({ is_active: newVal })
      await load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setApiError(err?.response?.data?.detail || 'Failed to update program status')
    } finally { setToggleSaving(false) }
  }

  const isActive = draft.is_active ?? program?.is_active ?? false
  const referrerReward = draft.referrer_reward_minor ?? program?.referrer_reward_minor ?? 0
  const refereeReward = draft.referee_reward_minor ?? program?.referee_reward_minor ?? 0

  const fraudGuards: { label: string; meta: string; key: keyof UpdateReferralProgramBody }[] = [
    { label: 'Self-referral detection', meta: 'Same device / payment instrument', key: 'fraud_self_referral' },
    { label: 'Device fingerprint collusion', meta: 'Block clustered signups', key: 'fraud_device_collusion' },
    { label: 'Velocity limit', meta: 'Max 3 referrals / referrer / day', key: 'fraud_velocity_limit' },
    { label: 'Payment-instrument reuse', meta: 'Block shared card across accounts', key: 'fraud_payment_instrument' },
  ]

  const manualReviewOn = draft.fraud_manual_review_threshold_minor != null
    ? draft.fraud_manual_review_threshold_minor !== null
    : program?.fraud_manual_review_threshold_minor != null

  if (isForbidden) return <AccessDeniedPage message="You don't have permission to manage the referral program." />

  return (
    <Shell
      activeId="promotions"
      breadcrumb="Catalog & Pricing · Growth · Referrals"
      title="Referral program"
      subtitle={`${isActive ? 'Active' : 'Paused'} · referrer + referee rewards`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/promotions')}>
            <Icon name="chevLeft" size={13} />Promotions
          </button>
          <button
            className="btn sm"
            onClick={() => stats && exportReferralCsv(stats)}
            disabled={!stats}
          >
            <Icon name="download" size={13} />Export
          </button>
          <button
            className="btn sm"
            onClick={handleToggleActive}
            disabled={toggleSaving || loading}
          >
            {toggleSaving ? 'Saving…' : isActive ? 'Pause program' : 'Resume program'}
          </button>
          <button className="btn accent sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
        </div>
      }
    >
      {apiError && (
        <div style={{ margin: '14px 32px 0', padding: '9px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))', borderRadius: 3, fontSize: 12.5, color: 'var(--danger)' }}>
          {apiError}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{
          padding: isMobile ? '16px' : '24px 32px 28px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr',
          gap: 24,
          alignItems: 'start',
        }}>
          {/* Left column: config */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Program status banner */}
            <div style={{
              padding: '12px 18px',
              background: isActive ? 'color-mix(in oklab, var(--accent) 10%, var(--surface))' : 'var(--surface-2)',
              border: `1px solid ${isActive ? 'color-mix(in oklab, var(--accent) 30%, var(--rule))' : 'var(--rule)'}`,
              borderRadius: 3,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span className={`badge ${isActive ? 'ok' : 'warn'}`}>
                <span className={`dot ${isActive ? 'ok' : 'warn'}`} />
                {isActive ? 'Program is active' : 'Program is paused'}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                {isActive
                  ? 'Referral rewards are being paid out. Changes below require "Save changes".'
                  : 'No new referral rewards will be paid until you resume.'}
              </span>
            </div>

            {/* Reward flow diagram */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '24px 26px' }}>
              <div className="t-label" style={{ marginBottom: 16 }}>Reward flow</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Referrer */}
                <div style={{
                  flex: 1, padding: 18,
                  border: '1px solid var(--rule)', borderRadius: 3,
                  textAlign: 'center', background: 'var(--surface-2)',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'color-mix(in oklab, var(--accent) 15%, var(--surface))',
                    color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600,
                    margin: '0 auto',
                  }}>R</div>
                  <div style={{ marginTop: 10, fontSize: 13, fontWeight: 500 }}>Referrer</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>shares code</div>
                  <div style={{ marginTop: 10, fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--accent)' }}>
                    {fmtMinor(referrerReward)}
                  </div>
                  <div className="t-meta">wallet credit</div>
                </div>

                {/* Arrow */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--ink-3)', flexShrink: 0 }}>
                  <Icon name="arrowRight" size={18} />
                  <span className="t-meta" style={{ whiteSpace: 'nowrap', fontSize: 10 }}>after 1st ride</span>
                </div>

                {/* Referee */}
                <div style={{
                  flex: 1, padding: 18,
                  border: '1px solid var(--accent)', borderRadius: 3,
                  textAlign: 'center',
                  background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--surface-sunk)',
                    color: 'var(--ink-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600,
                    margin: '0 auto',
                  }}>N</div>
                  <div style={{ marginTop: 10, fontSize: 13, fontWeight: 500 }}>New customer</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>signs up + rides</div>
                  <div style={{ marginTop: 10, fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--accent)' }}>
                    {fmtMinor(refereeReward)}
                  </div>
                  <div className="t-meta">off first ride</div>
                </div>
              </div>
            </div>

            {/* Reward configuration form */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 400 }}>Reward configuration</span>
                <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label className="field-label">Referrer reward (paise)</label>
                  <div className="input">
                    <input type="number" min={0}
                      value={referrerReward}
                      onChange={e => patchDraft('referrer_reward_minor', Number(e.target.value))}
                      placeholder={`10000 = ${sym}100`} />
                  </div>
                  <div className="t-meta" style={{ marginTop: 4 }}>= {fmtMinor(referrerReward)} wallet credit</div>
                </div>
                <div className="field">
                  <label className="field-label">Referee reward (paise)</label>
                  <div className="input">
                    <input type="number" min={0}
                      value={refereeReward}
                      onChange={e => patchDraft('referee_reward_minor', Number(e.target.value))}
                      placeholder={`7500 = ${sym}75`} />
                  </div>
                  <div className="t-meta" style={{ marginTop: 4 }}>= {fmtMinor(refereeReward)} off first ride</div>
                </div>
                <div className="field">
                  <label className="field-label">Qualifying event</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                    <select
                      value={draft.qualifying_event ?? program?.qualifying_event ?? 'first_ride_complete'}
                      onChange={e => patchDraft('qualifying_event', e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%' }}>
                      <option value="first_ride_complete">Referee's first completed ride</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Reward timing</label>
                  <div className="input" style={{ padding: 0, paddingLeft: 10, opacity: 0.7 }}>
                    <select disabled style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', height: '100%' }}>
                      <option>On trip completion</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Per-referrer cap / month (paise)</label>
                  <div className="input">
                    <input type="number" min={0}
                      value={draft.per_referrer_monthly_cap_minor ?? program?.per_referrer_monthly_cap_minor ?? 0}
                      onChange={e => patchDraft('per_referrer_monthly_cap_minor', Number(e.target.value))} />
                  </div>
                  <div className="t-meta" style={{ marginTop: 4 }}>= {fmtMinor(draft.per_referrer_monthly_cap_minor ?? program?.per_referrer_monthly_cap_minor ?? 0)}</div>
                </div>
                <div className="field">
                  <label className="field-label">Monthly program budget (paise)</label>
                  <div className="input">
                    <input type="number" min={0}
                      value={draft.monthly_budget_minor ?? program?.monthly_budget_minor ?? 0}
                      onChange={e => patchDraft('monthly_budget_minor', Number(e.target.value))} />
                  </div>
                  <div className="t-meta" style={{ marginTop: 4 }}>= {fmtMinor(draft.monthly_budget_minor ?? program?.monthly_budget_minor ?? 0)}</div>
                </div>
              </div>
            </div>

            {/* Fraud guards */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="t-label">Fraud guards</div>
                <span className="badge ok" style={{ fontSize: 11 }}>
                  <Icon name="shield" size={11} />
                  {fraudGuards.filter(({ key }) => (draft[key] as boolean | undefined) ?? (program?.[key as keyof ReferralProgram] as boolean | undefined) ?? false).length} / {fraudGuards.length} active
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fraudGuards.map(({ label, meta, key }) => {
                  const on = (draft[key] as boolean | undefined) ?? (program?.[key as keyof ReferralProgram] as boolean | undefined) ?? false
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      background: on ? 'color-mix(in oklab, var(--accent) 6%, var(--surface-2))' : 'var(--surface-2)',
                      border: `1px solid ${on ? 'color-mix(in oklab, var(--accent) 25%, var(--rule))' : 'var(--rule)'}`,
                      borderRadius: 3,
                      transition: 'background 0.15s, border-color 0.15s',
                    }}>
                      <Icon
                        name={on ? 'shield' : 'alert'}
                        size={14}
                        style={{ color: on ? 'var(--accent)' : 'var(--ink-4)', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{meta}</div>
                      </div>
                      <TogglePill on={on} onChange={v => patchDraft(key, v as UpdateReferralProgramBody[typeof key])} />
                    </div>
                  )
                })}

                {/* Manual review row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: manualReviewOn ? 'color-mix(in oklab, var(--accent) 6%, var(--surface-2))' : 'var(--surface-2)',
                  border: `1px solid ${manualReviewOn ? 'color-mix(in oklab, var(--accent) 25%, var(--rule))' : 'var(--rule)'}`,
                  borderRadius: 3,
                  transition: 'background 0.15s, border-color 0.15s',
                }}>
                  <Icon
                    name="search"
                    size={14}
                    style={{ color: manualReviewOn ? 'var(--accent)' : 'var(--ink-4)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>Manual review threshold</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>Flag accounts earning ≥ {sym}5,000 cumulative</div>
                  </div>
                  <TogglePill
                    on={manualReviewOn}
                    onChange={v => patchDraft('fraud_manual_review_threshold_minor', v ? 500000 : null)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right column: metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Performance stats grid */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
              <div className="t-label" style={{ marginBottom: 14 }}>Program performance · 30d</div>
              {!stats ? (
                <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No data available</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Referrals sent', value: stats.referrals_sent.toLocaleString('en-IN') },
                    { label: 'Converted', value: stats.converted.toLocaleString('en-IN'), highlight: true },
                    { label: 'Conversion rate', value: `${stats.conversion_rate_pct.toFixed(1)}%` },
                    { label: 'Reward paid', value: fmtMinor(stats.reward_paid_minor) },
                    { label: 'New customers', value: stats.new_customers.toLocaleString('en-IN'), highlight: true },
                    { label: 'CPA', value: fmtMinor(stats.cpa_minor) },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--rule)', borderRadius: 3 }}>
                      <div className="t-label" style={{ padding: 0 }}>{label}</div>
                      <div style={{ marginTop: 6, fontFamily: 'var(--font-serif)', fontSize: 22, color: highlight ? 'var(--accent)' : 'var(--ink)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top referrers */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '22px 24px' }}>
              <div className="t-label" style={{ marginBottom: 14 }}>Top referrers · 30d</div>
              {!stats || stats.top_referrers.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  <Icon name="users" size={28} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
                  No referral data yet
                </div>
              ) : (
                stats.top_referrers.map((ref, i) => {
                  const initials = ref.name.split(' ').map((x: string) => x[0]).join('').toUpperCase()
                  return (
                    <div key={ref.customer_id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0',
                      borderBottom: i < stats.top_referrers.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                    }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--ink-3)', width: 20, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--surface-2)', border: '1px solid var(--rule)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: 11, flexShrink: 0,
                      }}>{initials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{ref.name}</div>
                        <div className="t-meta" style={{ marginTop: 2 }}>{ref.converted} converted</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{fmtMinor(ref.reward_minor)}</div>
                        {ref.at_cap && <div className="t-meta" style={{ color: 'var(--warn)' }}>at cap</div>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Fraud flags */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="t-label">Fraud flags · 30d</div>
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-serif)', fontSize: 22 }}>
                    {stats ? stats.fraud_blocked.toLocaleString('en-IN') : '—'} blocked
                  </div>
                </div>
                {stats && stats.fraud_blocked > 0 ? (
                  <span className="badge danger"><span className="dot danger" />{fmtMinor(stats.fraud_saved_minor)} saved</span>
                ) : (
                  <span className="badge ok"><span className="dot ok" />No flags</span>
                )}
              </div>
              <div className="t-meta" style={{ marginTop: 8 }}>
                {stats
                  ? stats.fraud_blocked > 0
                    ? `${stats.fraud_blocked} accounts auto-blocked before payout.`
                    : 'All referrals passed fraud checks.'
                  : 'No fraud data available.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
