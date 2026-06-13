import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Shell from '../../components/layout/Shell'
import { operatorSettingsService } from '../../services/operatorSettingsService'
import type { OperatorSettings } from '../../services/operatorSettingsService'

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic (العربية)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'hi', label: 'Hindi (हिन्दी)' },
]

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'Europe/Moscow', label: 'Europe/Moscow (MSK)' },
  { value: 'Africa/Cairo', label: 'Africa/Cairo (EET)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (KST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST/NZDT)' },
]

const DEFAULTS: OperatorSettings = {
  manifest_cutoff_minutes: 60,
  checklist_template: [],
  language: 'en',
  timezone: 'UTC',
  public_operator_name: '',
  public_contact_email: '',
  public_contact_phone: '',
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>{description}</div>
    </div>
  )
}

function SaveFeedback({ saved, error }: { saved: boolean; error: string | null }) {
  if (error) {
    return (
      <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', border: '1px solid color-mix(in oklab, var(--danger) 30%, var(--rule-strong))', borderRadius: 3, fontSize: 13, color: 'var(--danger)' }}>
        {error}
      </div>
    )
  }
  if (saved) {
    return (
      <div style={{ fontSize: 13, color: 'var(--ok)' }}>Settings saved</div>
    )
  }
  return null
}

export default function OperatorSettingsPage() {
  const qc = useQueryClient()

  const [cutoff, setCutoff] = useState(DEFAULTS.manifest_cutoff_minutes)
  const [cutoffErr, setCutoffErr] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<string[]>(DEFAULTS.checklist_template)
  const [newItem, setNewItem] = useState('')
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [prefsErr, setPrefsErr] = useState<string | null>(null)

  const [language, setLanguage] = useState(DEFAULTS.language)
  const [timezone, setTimezone] = useState(DEFAULTS.timezone)
  const [localeSaved, setLocaleSaved] = useState(false)
  const [localeErr, setLocaleErr] = useState<string | null>(null)

  const [publicName, setPublicName] = useState(DEFAULTS.public_operator_name)
  const [contactEmail, setContactEmail] = useState(DEFAULTS.public_contact_email)
  const [contactPhone, setContactPhone] = useState(DEFAULTS.public_contact_phone)
  const [contactSaved, setContactSaved] = useState(false)
  const [contactErr, setContactErr] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['operator-settings'],
    queryFn: operatorSettingsService.get,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!data) return
    setCutoff(data.manifest_cutoff_minutes)
    setChecklist(data.checklist_template ?? [])
    setLanguage(data.language ?? 'en')
    setTimezone(data.timezone ?? 'UTC')
    setPublicName(data.public_operator_name ?? '')
    setContactEmail(data.public_contact_email ?? '')
    setContactPhone(data.public_contact_phone ?? '')
  }, [data])

  const prefsMutation = useMutation({
    mutationFn: () => operatorSettingsService.update({
      manifest_cutoff_minutes: cutoff,
      checklist_template: checklist,
    }),
    onSuccess: (updated) => {
      qc.setQueryData(['operator-settings'], (prev: OperatorSettings | undefined) => ({ ...(prev ?? DEFAULTS), ...updated }))
      setPrefsSaved(true)
      setPrefsErr(null)
      setTimeout(() => setPrefsSaved(false), 3000)
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setPrefsErr(detail ?? 'Failed to save. Please try again.')
    },
  })

  const localeMutation = useMutation({
    mutationFn: () => operatorSettingsService.update({ language, timezone }),
    onSuccess: (updated) => {
      qc.setQueryData(['operator-settings'], (prev: OperatorSettings | undefined) => ({ ...(prev ?? DEFAULTS), ...updated }))
      setLocaleSaved(true)
      setLocaleErr(null)
      setTimeout(() => setLocaleSaved(false), 3000)
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setLocaleErr(detail ?? 'Failed to save. Please try again.')
    },
  })

  const contactMutation = useMutation({
    mutationFn: () => operatorSettingsService.update({
      public_operator_name: publicName,
      public_contact_email: contactEmail,
      public_contact_phone: contactPhone,
    }),
    onSuccess: (updated) => {
      qc.setQueryData(['operator-settings'], (prev: OperatorSettings | undefined) => ({ ...(prev ?? DEFAULTS), ...updated }))
      setContactSaved(true)
      setContactErr(null)
      setTimeout(() => setContactSaved(false), 3000)
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setContactErr(detail ?? 'Failed to save. Please try again.')
    },
  })

  const handleCutoffChange = (val: string) => {
    const n = parseInt(val, 10)
    setCutoff(isNaN(n) ? 0 : n)
    if (isNaN(n) || n < 30) {
      setCutoffErr('Manifest cutoff must be at least 30 minutes.')
    } else {
      setCutoffErr(null)
    }
  }

  const handleAddItem = () => {
    const trimmed = newItem.trim()
    if (!trimmed) return
    setChecklist(prev => [...prev, trimmed])
    setNewItem('')
  }

  const handleRemoveItem = (index: number) => {
    setChecklist(prev => prev.filter((_, i) => i !== index))
  }

  const handlePrefsSubmit = () => {
    if (cutoff < 30) {
      setCutoffErr('Manifest cutoff must be at least 30 minutes.')
      return
    }
    prefsMutation.mutate()
  }

  return (
    <Shell
      activeId="settings"
      breadcrumb="Settings"
      title="Operator Settings"
      subtitle="Configure operating preferences, locale, and public-facing contact details."
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 40 }}>

        <div style={{ paddingBottom: 32, borderBottom: '1px solid var(--rule)' }}>
          <SectionTitle
            title="Operating Preferences"
            description="Default behaviors for manifest generation and pre-flight checklists."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="field">
              <label className="field-label" htmlFor="cutoff">Default manifest cutoff (minutes)</label>
              <input
                id="cutoff"
                type="number"
                className="input"
                value={cutoff}
                min={30}
                onChange={e => handleCutoffChange(e.target.value)}
                style={{ maxWidth: 200 }}
              />
              {cutoffErr && (
                <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--danger)' }}>{cutoffErr}</div>
              )}
              <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-3)' }}>
                Minimum 30 minutes before departure.
              </div>
            </div>

            <div className="field">
              <label className="field-label">Pre-flight checklist template</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {checklist.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="input" style={{ flex: 1, display: 'flex', alignItems: 'center', color: 'var(--ink)' }}>
                      <span style={{ flex: 1 }}>{item}</span>
                    </div>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => handleRemoveItem(i)}
                      style={{ flexShrink: 0, color: 'var(--danger)' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: checklist.length > 0 ? 4 : 0 }}>
                  <input
                    type="text"
                    className="input"
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem() } }}
                    placeholder="Add checklist item…"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn sm accent"
                    onClick={handleAddItem}
                    disabled={!newItem.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <SaveFeedback saved={prefsSaved} error={prefsErr} />
              <button
                className="btn accent sm"
                onClick={handlePrefsSubmit}
                disabled={prefsMutation.isPending || !!cutoffErr}
                style={{ marginLeft: 'auto' }}
              >
                {prefsMutation.isPending ? 'Saving…' : 'Save preferences'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ paddingBottom: 32, borderBottom: '1px solid var(--rule)' }}>
          <SectionTitle
            title="Locale & Timezone"
            description="Language and timezone used across your operator panel and outbound communications."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label className="field-label" htmlFor="language">Language</label>
                <select
                  id="language"
                  className="input"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="timezone">Timezone</label>
                <select
                  id="timezone"
                  className="input"
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {TIMEZONES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <SaveFeedback saved={localeSaved} error={localeErr} />
              <button
                className="btn accent sm"
                onClick={() => localeMutation.mutate()}
                disabled={localeMutation.isPending}
                style={{ marginLeft: 'auto' }}
              >
                {localeMutation.isPending ? 'Saving…' : 'Save locale'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ paddingBottom: 32 }}>
          <SectionTitle
            title="Public Contact Display"
            description="Information shown to customers on booking confirmations and the operator directory."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label className="field-label" htmlFor="public-name">Operator name (shown to customers)</label>
              <input
                id="public-name"
                type="text"
                className="input"
                value={publicName}
                onChange={e => setPublicName(e.target.value)}
                placeholder="e.g. Skyline Air Charter"
                maxLength={120}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label className="field-label" htmlFor="contact-email">Contact email</label>
                <input
                  id="contact-email"
                  type="email"
                  className="input"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="contact@example.com"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="contact-phone">Contact phone</label>
                <input
                  id="contact-phone"
                  type="tel"
                  className="input"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="+1 800 555 0100"
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <SaveFeedback saved={contactSaved} error={contactErr} />
              <button
                className="btn accent sm"
                onClick={() => contactMutation.mutate()}
                disabled={contactMutation.isPending}
                style={{ marginLeft: 'auto' }}
              >
                {contactMutation.isPending ? 'Saving…' : 'Save contact details'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </Shell>
  )
}
