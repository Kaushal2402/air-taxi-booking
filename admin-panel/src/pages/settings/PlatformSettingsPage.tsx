import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile } from '../../hooks/useIsMobile'
import { settingsService } from '../../services/settingsService'
import type { PlatformSettings, PlatformToggle } from '../../services/settingsService'
import { catalogService } from '../../services/catalogService'
import type { ServiceZone } from '../../services/catalogService'
import { WORLD_COUNTRIES, WORLD_CURRENCIES, FISCAL_MONTHS, getWorldTimezones } from '../../data/worldData'
import { formatDateTime, currencySymbolFor } from '../../lib/utils'
import { usePlatformStore } from '../../store/platformStore'

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

// ── Searchable select ─────────────────────────────────────────────────────────

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Search…',
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; group?: string }[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
  }, [options, query])

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div
        className="input"
        onClick={() => setOpen(p => !p)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          paddingRight: 10,
        }}
      >
        <span style={{ color: selected ? 'var(--ink)' : 'var(--ink-3)' }}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={13} style={{ flexShrink: 0, marginLeft: 6, color: 'var(--ink-3)' }} />
      </div>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 200,
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 260,
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--rule-soft)', flexShrink: 0 }}>
            <input
              className="input"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              style={{ width: '100%', fontSize: 12.5, padding: '5px 8px' }}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--ink-3)' }}>
                No results for "{query}"
              </div>
            )}
            {filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  padding: '7px 12px',
                  fontSize: 13,
                  cursor: 'pointer',
                  background: opt.value === value ? 'var(--accent-soft)' : 'transparent',
                  color: opt.value === value ? 'var(--accent)' : 'var(--ink)',
                  borderBottom: '1px solid var(--rule-soft)',
                }}
                onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'var(--bg)' }}
                onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {opt.label}
              </div>
            ))}
          </div>
          {filtered.length > 0 && (
            <div style={{ padding: '5px 12px', borderTop: '1px solid var(--rule-soft)', fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-nav items ─────────────────────────────────────────────────────────────

type NavTab = 'general' | 'regions' | 'booking' | 'safety' | 'localization' | 'data'
  | 'flags' | 'maintenance' | 'api'

interface NavItem {
  id: NavTab
  label: string
  section: 'config' | 'advanced'
  externalPath?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'general',      label: 'General',         section: 'config' },
  { id: 'regions',      label: 'Regions & zones',  section: 'config' },
  { id: 'booking',      label: 'Booking rules',    section: 'config' },
  { id: 'safety',       label: 'Safety & SOS',     section: 'config' },
  { id: 'localization', label: 'Localization',      section: 'config' },
  { id: 'data',         label: 'Data & privacy',   section: 'config' },
  { id: 'flags',        label: 'Feature flags',    section: 'advanced', externalPath: '/settings/flags' },
  { id: 'maintenance',  label: 'Maintenance',      section: 'advanced', externalPath: '/settings/maintenance' },
  { id: 'api',          label: 'API & webhooks',   section: 'advanced' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--rule)',
      padding: '22px 24px 24px',
    }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{
          margin: 0,
          fontFamily: 'var(--font-serif)',
          fontSize: 18,
          fontWeight: 400,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
        }}>
          {title}
        </h3>
        {description && (
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlatformSettingsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const syncPlatformStore = usePlatformStore((s) => s.sync)

  // World data memos — computed once
  const countryOptions = useMemo(() =>
    WORLD_COUNTRIES.map(c => ({ value: c.name, label: c.name })),
  [])
  const currencyOptions = useMemo(() =>
    WORLD_CURRENCIES.map(c => ({ value: c.code, label: `${c.code} — ${c.name} (${c.symbol})` })),
  [])
  const timezoneOptions = useMemo(() =>
    getWorldTimezones().map(tz => ({ value: tz.value, label: tz.label, group: tz.region })),
  [])

  const [activeTab, setActiveTab] = useState<NavTab>('general')
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [toggles, setToggles] = useState<PlatformToggle[]>([])
  const [saving, setSaving] = useState(false)
  const [noticeMsg, setNoticeMsg] = useState('')

  // Booking rules state
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('7')
  const [minAdvanceMinutes, setMinAdvanceMinutes] = useState('15')
  const [cancellationFreeWindow, setCancellationFreeWindow] = useState('5')
  const [cancellationFeePct, setCancellationFeePct] = useState('10')
  const [maxCancellationsPerDay, setMaxCancellationsPerDay] = useState('3')
  const [noShowWaitMinutes, setNoShowWaitMinutes] = useState('5')
  const [noShowFeePct, setNoShowFeePct] = useState('25')
  const [driverAcceptanceTimeout, setDriverAcceptanceTimeout] = useState('30')
  const [maxDispatchRetries, setMaxDispatchRetries] = useState('3')
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true)
  const [dispatchInitialRadius, setDispatchInitialRadius] = useState('2000')
  const [dispatchRadiusStep, setDispatchRadiusStep] = useState('1000')
  const [dispatchMaxRadius, setDispatchMaxRadius] = useState('8000')
  const [rankWeightDistance, setRankWeightDistance] = useState('50')
  const [rankWeightRating, setRankWeightRating] = useState('30')
  const [rankWeightAcceptance, setRankWeightAcceptance] = useState('20')
  const [freeWaitingMinutes, setFreeWaitingMinutes] = useState('3')
  const [waitingChargePerMin, setWaitingChargePerMin] = useState('1.5')
  const [maxActiveBookings, setMaxActiveBookings] = useState('2')
  const [defaultCommissionPct, setDefaultCommissionPct] = useState('20')
  const [refundDestination, setRefundDestination] = useState('original')
  const [airMinAdvanceHours, setAirMinAdvanceHours] = useState('4')
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false)
  const [quietHoursStart, setQuietHoursStart] = useState('23:00')
  const [quietHoursEnd, setQuietHoursEnd] = useState('05:00')
  const [quietHoursAction, setQuietHoursAction] = useState('cap_surge')

  // Data & Privacy state
  const [dataRetentionTripDays, setDataRetentionTripDays] = useState('2555')
  const [dataRetentionPiiDays, setDataRetentionPiiDays] = useState('1095')
  const [dataRetentionFinancialYears, setDataRetentionFinancialYears] = useState('7')
  const [dataRetentionAuditYears, setDataRetentionAuditYears] = useState('7')
  const [privacyExportSlaHours, setPrivacyExportSlaHours] = useState('72')
  const [privacyDeletionSlaDays, setPrivacyDeletionSlaDays] = useState('30')
  const [privacyAutoAnonymize, setPrivacyAutoAnonymize] = useState(false)
  const [consentMarketingOptIn, setConsentMarketingOptIn] = useState(true)
  const [consentAnalyticsTracking, setConsentAnalyticsTracking] = useState(true)
  const [consentCookieBanner, setConsentCookieBanner] = useState(true)
  const [dataShareAuthorities, setDataShareAuthorities] = useState(false)

  // Localization state
  const [defaultLanguage, setDefaultLanguage] = useState('en')
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(['en', 'hi'])
  const [rtlEnabled, setRtlEnabled] = useState(false)
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [timeFormat, setTimeFormat] = useState('24h')
  const [weekStartsOn, setWeekStartsOn] = useState('Monday')
  const [currencySymbolPosition, setCurrencySymbolPosition] = useState('before')
  const [decimalSeparator, setDecimalSeparator] = useState('.')
  const [thousandsSeparator, setThousandsSeparator] = useState(',')

  // Safety & SOS state
  const [sosEnabled, setSosEnabled] = useState(true)
  const [sosContactNumber, setSosContactNumber] = useState('112')
  const [sosShareLocation, setSosShareLocation] = useState(true)
  const [sosAlertAdmin, setSosAlertAdmin] = useState(true)
  const [driverGracePeriodEnabled, setDriverGracePeriodEnabled] = useState(false)
  const [driverGracePeriodDays, setDriverGracePeriodDays] = useState('7')
  const [operatorSiteVisitRequired, setOperatorSiteVisitRequired] = useState(false)
  const [driverMinRating, setDriverMinRating] = useState('3.5')
  const [driverMaxCancellationRate, setDriverMaxCancellationRate] = useState('30')
  const [driverMinAcceptanceRate, setDriverMinAcceptanceRate] = useState('60')
  const [driverThresholdWindowDays, setDriverThresholdWindowDays] = useState('30')
  const [slaDispatchAlertMin, setSlaDispatchAlertMin] = useState('3')
  const [slaPickupAlertMin, setSlaPickupAlertMin] = useState('10')
  const [slaTripOverrunAlertMin, setSlaTripOverrunAlertMin] = useState('120')

  // Regions & zones state
  const [regions, setRegions] = useState<ServiceZone[]>([])
  const [regionsLoading, setRegionsLoading] = useState(false)
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null)
  const [editRegionData, setEditRegionData] = useState<{ operational_status: string; status_note: string }>({ operational_status: 'operational', status_note: '' })
  const [regionSaving, setRegionSaving] = useState(false)

  // Form state
  const [legalEntity, setLegalEntity] = useState('')
  const [gstin, setGstin] = useState('')
  const [primaryRegion, setPrimaryRegion] = useState('India')
  const [baseCurrency, setBaseCurrency] = useState('INR')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [fiscalYearStart, setFiscalYearStart] = useState('April')
  const [settlementCycle, setSettlementCycle] = useState('T+1')
  const [driverPayoutDay, setDriverPayoutDay] = useState('Monday')
  const [surgeCeiling, setSurgeCeiling] = useState('2.0')

  const loadData = async () => {
    try {
      const [s, t] = await Promise.all([
        settingsService.getSettings(),
        settingsService.listToggles(),
      ])
      setSettings(s)
      setToggles(t)
      setLegalEntity(s.legal_entity)
      setGstin(s.gstin)
      setPrimaryRegion(s.primary_region)
      setBaseCurrency(s.base_currency)
      setTimezone(s.timezone)
      setFiscalYearStart(s.fiscal_year_start)
      setSettlementCycle(s.settlement_cycle)
      setDriverPayoutDay(s.driver_payout_day)
      setSurgeCeiling(String(s.surge_ceiling))
      // Booking rules
      if (s.max_advance_days != null) setMaxAdvanceDays(String(s.max_advance_days))
      if (s.min_advance_minutes != null) setMinAdvanceMinutes(String(s.min_advance_minutes))
      if (s.cancellation_free_window_min != null) setCancellationFreeWindow(String(s.cancellation_free_window_min))
      if (s.cancellation_fee_pct != null) setCancellationFeePct(String(s.cancellation_fee_pct))
      if (s.max_cancellations_per_day != null) setMaxCancellationsPerDay(String(s.max_cancellations_per_day))
      if (s.driver_acceptance_timeout_sec != null) setDriverAcceptanceTimeout(String(s.driver_acceptance_timeout_sec))
      if (s.max_dispatch_retries != null) setMaxDispatchRetries(String(s.max_dispatch_retries))
      if (s.auto_assign_enabled != null) setAutoAssignEnabled(s.auto_assign_enabled)
      if (s.free_waiting_minutes != null) setFreeWaitingMinutes(String(s.free_waiting_minutes))
      if (s.waiting_charge_per_min != null) setWaitingChargePerMin(String(s.waiting_charge_per_min))
      if (s.max_active_bookings_per_rider != null) setMaxActiveBookings(String(s.max_active_bookings_per_rider))
      if (s.no_show_wait_minutes != null) setNoShowWaitMinutes(String(s.no_show_wait_minutes))
      if (s.no_show_fee_pct != null) setNoShowFeePct(String(s.no_show_fee_pct))
      if (s.dispatch_initial_radius_m != null) setDispatchInitialRadius(String(s.dispatch_initial_radius_m))
      if (s.dispatch_radius_step_m != null) setDispatchRadiusStep(String(s.dispatch_radius_step_m))
      if (s.dispatch_max_radius_m != null) setDispatchMaxRadius(String(s.dispatch_max_radius_m))
      if (s.rank_weight_distance != null) setRankWeightDistance(String(s.rank_weight_distance))
      if (s.rank_weight_rating != null) setRankWeightRating(String(s.rank_weight_rating))
      if (s.rank_weight_acceptance != null) setRankWeightAcceptance(String(s.rank_weight_acceptance))
      if (s.default_commission_pct != null) setDefaultCommissionPct(String(s.default_commission_pct))
      if (s.refund_destination_default != null) setRefundDestination(s.refund_destination_default)
      if (s.air_min_advance_hours != null) setAirMinAdvanceHours(String(s.air_min_advance_hours))
      if (s.quiet_hours_enabled != null) setQuietHoursEnabled(s.quiet_hours_enabled)
      if (s.quiet_hours_start) setQuietHoursStart(s.quiet_hours_start)
      if (s.quiet_hours_end) setQuietHoursEnd(s.quiet_hours_end)
      if (s.quiet_hours_action) setQuietHoursAction(s.quiet_hours_action)
      // Data & Privacy
      if (s.data_retention_trip_days != null) setDataRetentionTripDays(String(s.data_retention_trip_days))
      if (s.data_retention_pii_days != null) setDataRetentionPiiDays(String(s.data_retention_pii_days))
      if (s.data_retention_financial_years != null) setDataRetentionFinancialYears(String(s.data_retention_financial_years))
      if (s.data_retention_audit_years != null) setDataRetentionAuditYears(String(s.data_retention_audit_years))
      if (s.privacy_export_sla_hours != null) setPrivacyExportSlaHours(String(s.privacy_export_sla_hours))
      if (s.privacy_deletion_sla_days != null) setPrivacyDeletionSlaDays(String(s.privacy_deletion_sla_days))
      if (s.privacy_auto_anonymize != null) setPrivacyAutoAnonymize(s.privacy_auto_anonymize)
      if (s.consent_marketing_opt_in != null) setConsentMarketingOptIn(s.consent_marketing_opt_in)
      if (s.consent_analytics_tracking != null) setConsentAnalyticsTracking(s.consent_analytics_tracking)
      if (s.consent_cookie_banner != null) setConsentCookieBanner(s.consent_cookie_banner)
      if (s.data_share_authorities != null) setDataShareAuthorities(s.data_share_authorities)
      // Localization
      if (s.default_language) setDefaultLanguage(s.default_language)
      if (s.supported_languages?.length) setSupportedLanguages(s.supported_languages)
      if (s.rtl_enabled != null) setRtlEnabled(s.rtl_enabled)
      if (s.date_format) setDateFormat(s.date_format)
      if (s.time_format) setTimeFormat(s.time_format)
      if (s.week_starts_on) setWeekStartsOn(s.week_starts_on)
      if (s.currency_symbol_position) setCurrencySymbolPosition(s.currency_symbol_position)
      if (s.decimal_separator) setDecimalSeparator(s.decimal_separator)
      if (s.thousands_separator) setThousandsSeparator(s.thousands_separator)
      // Safety & SOS
      if (s.sos_enabled != null) setSosEnabled(s.sos_enabled)
      if (s.sos_contact_number) setSosContactNumber(s.sos_contact_number)
      if (s.sos_share_location != null) setSosShareLocation(s.sos_share_location)
      if (s.sos_alert_admin != null) setSosAlertAdmin(s.sos_alert_admin)
      if (s.driver_grace_period_enabled != null) setDriverGracePeriodEnabled(s.driver_grace_period_enabled)
      if (s.driver_grace_period_days != null) setDriverGracePeriodDays(String(s.driver_grace_period_days))
      if (s.operator_site_visit_required != null) setOperatorSiteVisitRequired(s.operator_site_visit_required)
      if (s.driver_min_rating != null) setDriverMinRating(String(s.driver_min_rating))
      if (s.driver_max_cancellation_rate_pct != null) setDriverMaxCancellationRate(String(s.driver_max_cancellation_rate_pct))
      if (s.driver_min_acceptance_rate_pct != null) setDriverMinAcceptanceRate(String(s.driver_min_acceptance_rate_pct))
      if (s.driver_threshold_window_days != null) setDriverThresholdWindowDays(String(s.driver_threshold_window_days))
      if (s.sla_dispatch_alert_min != null) setSlaDispatchAlertMin(String(s.sla_dispatch_alert_min))
      if (s.sla_pickup_alert_min != null) setSlaPickupAlertMin(String(s.sla_pickup_alert_min))
      if (s.sla_trip_overrun_alert_min != null) setSlaTripOverrunAlertMin(String(s.sla_trip_overrun_alert_min))
    } catch { /* ignore */ }
  }

  const loadRegions = async () => {
    setRegionsLoading(true)
    try {
      const list = await catalogService.listServiceZones(true) // include inactive
      setRegions(list)
    } catch { /* ignore */ } finally {
      setRegionsLoading(false)
    }
  }

  useEffect(() => { void loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'regions' && regions.length === 0) {
      void loadRegions()
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true)
    try {
      if (activeTab === 'general') {
        await settingsService.updateSettings({
          legal_entity: legalEntity,
          gstin,
          primary_region: primaryRegion,
          base_currency: baseCurrency,
          timezone,
          fiscal_year_start: fiscalYearStart,
          settlement_cycle: settlementCycle,
          driver_payout_day: driverPayoutDay,
          surge_ceiling: parseFloat(surgeCeiling),
        })
      } else if (activeTab === 'booking') {
        await settingsService.updateSettings({
          max_advance_days: parseInt(maxAdvanceDays, 10),
          min_advance_minutes: parseInt(minAdvanceMinutes, 10),
          cancellation_free_window_min: parseInt(cancellationFreeWindow, 10),
          cancellation_fee_pct: parseFloat(cancellationFeePct),
          max_cancellations_per_day: parseInt(maxCancellationsPerDay, 10),
          no_show_wait_minutes: parseInt(noShowWaitMinutes, 10),
          no_show_fee_pct: parseFloat(noShowFeePct),
          driver_acceptance_timeout_sec: parseInt(driverAcceptanceTimeout, 10),
          max_dispatch_retries: parseInt(maxDispatchRetries, 10),
          auto_assign_enabled: autoAssignEnabled,
          dispatch_initial_radius_m: parseInt(dispatchInitialRadius, 10),
          dispatch_radius_step_m: parseInt(dispatchRadiusStep, 10),
          dispatch_max_radius_m: parseInt(dispatchMaxRadius, 10),
          rank_weight_distance: parseInt(rankWeightDistance, 10),
          rank_weight_rating: parseInt(rankWeightRating, 10),
          rank_weight_acceptance: parseInt(rankWeightAcceptance, 10),
          free_waiting_minutes: parseInt(freeWaitingMinutes, 10),
          waiting_charge_per_min: parseFloat(waitingChargePerMin),
          max_active_bookings_per_rider: parseInt(maxActiveBookings, 10),
          default_commission_pct: parseFloat(defaultCommissionPct),
          refund_destination_default: refundDestination,
          air_min_advance_hours: parseInt(airMinAdvanceHours, 10),
          quiet_hours_enabled: quietHoursEnabled,
          quiet_hours_start: quietHoursStart,
          quiet_hours_end: quietHoursEnd,
          quiet_hours_action: quietHoursAction,
        })
      } else if (activeTab === 'data') {
        await settingsService.updateSettings({
          data_retention_trip_days: parseInt(dataRetentionTripDays, 10),
          data_retention_pii_days: parseInt(dataRetentionPiiDays, 10),
          data_retention_financial_years: parseInt(dataRetentionFinancialYears, 10),
          data_retention_audit_years: parseInt(dataRetentionAuditYears, 10),
          privacy_export_sla_hours: parseInt(privacyExportSlaHours, 10),
          privacy_deletion_sla_days: parseInt(privacyDeletionSlaDays, 10),
          privacy_auto_anonymize: privacyAutoAnonymize,
          consent_marketing_opt_in: consentMarketingOptIn,
          consent_analytics_tracking: consentAnalyticsTracking,
          consent_cookie_banner: consentCookieBanner,
          data_share_authorities: dataShareAuthorities,
        })
      } else if (activeTab === 'localization') {
        await settingsService.updateSettings({
          default_language: defaultLanguage,
          supported_languages: supportedLanguages,
          rtl_enabled: rtlEnabled,
          date_format: dateFormat,
          time_format: timeFormat,
          week_starts_on: weekStartsOn,
          currency_symbol_position: currencySymbolPosition,
          decimal_separator: decimalSeparator,
          thousands_separator: thousandsSeparator,
        })
      } else if (activeTab === 'safety') {
        await settingsService.updateSettings({
          sos_enabled: sosEnabled,
          sos_contact_number: sosContactNumber,
          sos_share_location: sosShareLocation,
          sos_alert_admin: sosAlertAdmin,
          driver_grace_period_enabled: driverGracePeriodEnabled,
          driver_grace_period_days: parseInt(driverGracePeriodDays, 10),
          operator_site_visit_required: operatorSiteVisitRequired,
          driver_min_rating: parseFloat(driverMinRating),
          driver_max_cancellation_rate_pct: parseFloat(driverMaxCancellationRate),
          driver_min_acceptance_rate_pct: parseFloat(driverMinAcceptanceRate),
          driver_threshold_window_days: parseInt(driverThresholdWindowDays, 10),
          sla_dispatch_alert_min: parseInt(slaDispatchAlertMin, 10),
          sla_pickup_alert_min: parseInt(slaPickupAlertMin, 10),
          sla_trip_overrun_alert_min: parseInt(slaTripOverrunAlertMin, 10),
        })
      }
      await loadData()
      await syncPlatformStore()
      setNoticeMsg('Settings saved successfully.')
    } catch {
      setNoticeMsg('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (toggle: PlatformToggle) => {
    // Optimistic update
    setToggles(prev => prev.map(t => t.key === toggle.key ? { ...t, enabled: !t.enabled } : t))
    try {
      await settingsService.updateToggle(toggle.key, !toggle.enabled)
    } catch {
      // Revert on failure
      setToggles(prev => prev.map(t => t.key === toggle.key ? { ...t, enabled: toggle.enabled } : t))
      setNoticeMsg('Failed to update toggle.')
    }
  }

  const handleNavClick = (item: NavItem) => {
    if (item.externalPath) {
      navigate(item.externalPath)
      return
    }
    if (item.id === 'api') {
      setNoticeMsg('API & webhooks — coming soon.')
      return
    }
    setActiveTab(item.id)
  }

  // ── Region handlers ────────────────────────────────────────────────────────

  const startEditRegion = (r: ServiceZone) => {
    setEditingRegionId(r.id)
    setEditRegionData({ operational_status: r.operational_status, status_note: r.status_note ?? '' })
  }

  const cancelEditRegion = () => {
    setEditingRegionId(null)
  }

  const saveRegion = async () => {
    if (!editingRegionId) return
    setRegionSaving(true)
    try {
      const updated = await catalogService.updateServiceZone(editingRegionId, {
        operational_status: editRegionData.operational_status as ServiceZone['operational_status'],
        status_note: editRegionData.status_note || undefined,
      })
      setRegions(prev => prev.map(r => r.id === updated.id ? updated : r))
      setEditingRegionId(null)
    } catch {
      setNoticeMsg('Failed to save zone status.')
    } finally {
      setRegionSaving(false)
    }
  }

  // ── Booking rules tab ─────────────────────────────────────────────────────

  // Computed ranking weight total for live validation
  const rankTotal = parseInt(rankWeightDistance || '0', 10)
    + parseInt(rankWeightRating || '0', 10)
    + parseInt(rankWeightAcceptance || '0', 10)

  const renderBookingRulesTab = () => (
    <div style={{ overflow: 'auto', padding: isMobile ? '16px' : '24px 32px 40px', display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 880 }}>

      {/* ── Commission & refunds ── */}
      <SectionCard
        title="Commission & refunds"
        description="Default platform commission applied to all bookings and refund routing preference."
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px 20px' }}>
          <div className="field">
            <label className="field-label">Default platform commission</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={defaultCommissionPct}
                onChange={e => setDefaultCommissionPct(e.target.value)}
                style={{ maxWidth: 90 }}
              />
              <span className="t-meta">% of fare (excl. tax)</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Applied to all trips. Overridable per operator in Module 16.</p>
          </div>
          <div className="field">
            <label className="field-label">Default refund destination</label>
            <select
              className="input"
              value={refundDestination}
              onChange={e => setRefundDestination(e.target.value)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
            >
              <option value="original">Original payment method</option>
              <option value="wallet">Customer wallet</option>
            </select>
            <p className="t-meta" style={{ marginTop: 4 }}>Where refunds are routed unless overridden by the support agent.</p>
          </div>
        </div>
      </SectionCard>

      {/* ── Scheduling ── */}
      <SectionCard
        title="Scheduling"
        description="Controls how far ahead riders can book. Air bookings have a separate minimum lead time."
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px 20px' }}>
          <div className="field">
            <label className="field-label">Max advance booking</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={1}
                max={30}
                value={maxAdvanceDays}
                onChange={e => setMaxAdvanceDays(e.target.value)}
                style={{ maxWidth: 90 }}
              />
              <span className="t-meta">days ahead</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Road & air schedules up to this far in advance.</p>
          </div>
          <div className="field">
            <label className="field-label">Road min advance notice</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={5}
                max={240}
                value={minAdvanceMinutes}
                onChange={e => setMinAdvanceMinutes(e.target.value)}
                style={{ maxWidth: 90 }}
              />
              <span className="t-meta">min before pickup</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Minimum lead time for road scheduled rides.</p>
          </div>
          <div className="field">
            <label className="field-label">Air min advance notice</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={1}
                max={72}
                value={airMinAdvanceHours}
                onChange={e => setAirMinAdvanceHours(e.target.value)}
                style={{ maxWidth: 90 }}
              />
              <span className="t-meta">hours before flight</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Heli / charter bookings require this lead time for crew prep.</p>
          </div>
        </div>
      </SectionCard>

      {/* ── Cancellation policy ── */}
      <SectionCard
        title="Cancellation & no-show"
        description="Fee structure for customer-initiated cancellations and driver no-show handling."
      >
        <div style={{ marginBottom: 14, fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Cancellation
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px 20px', marginBottom: 20 }}>
          <div className="field">
            <label className="field-label">Free cancellation window</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={0}
                max={60}
                value={cancellationFreeWindow}
                onChange={e => setCancellationFreeWindow(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">min after booking</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>No fee if cancelled within this window.</p>
          </div>
          <div className="field">
            <label className="field-label">Cancellation fee</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={cancellationFeePct}
                onChange={e => setCancellationFeePct(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">% of estimated fare</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Charged after free window expires.</p>
          </div>
          <div className="field">
            <label className="field-label">Max cancellations per day</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={1}
                max={20}
                value={maxCancellationsPerDay}
                onChange={e => setMaxCancellationsPerDay(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">per rider</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Riders exceeding this are queued for review.</p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 18 }}>
          <div style={{ marginBottom: 14, fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            No-show
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px 20px' }}>
            <div className="field">
              <label className="field-label">Driver wait time before no-show</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={15}
                  value={noShowWaitMinutes}
                  onChange={e => setNoShowWaitMinutes(e.target.value)}
                  style={{ maxWidth: 80 }}
                />
                <span className="t-meta">minutes at pickup</span>
              </div>
              <p className="t-meta" style={{ marginTop: 4 }}>Driver can mark no-show and leave after this wait.</p>
            </div>
            <div className="field">
              <label className="field-label">No-show fee</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={noShowFeePct}
                  onChange={e => setNoShowFeePct(e.target.value)}
                  style={{ maxWidth: 80 }}
                />
                <span className="t-meta">% of estimated fare</span>
              </div>
              <p className="t-meta" style={{ marginTop: 4 }}>Charged to the rider when driver marks them as a no-show.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Dispatch parameters ── */}
      <SectionCard
        title="Dispatch parameters"
        description="How the platform assigns drivers to incoming requests — ping timing, search radius, and ranking."
      >
        {/* Ping & retries */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px 20px' }}>
          <div className="field">
            <label className="field-label">Driver acceptance timeout (ping TTL)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={10}
                max={120}
                value={driverAcceptanceTimeout}
                onChange={e => setDriverAcceptanceTimeout(e.target.value)}
                style={{ maxWidth: 90 }}
              />
              <span className="t-meta">seconds</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Offer moves to next driver after this window.</p>
          </div>
          <div className="field">
            <label className="field-label">Max dispatch retries</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={1}
                max={10}
                value={maxDispatchRetries}
                onChange={e => setMaxDispatchRetries(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">drivers attempted</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Booking fails if no driver accepts within this count.</p>
          </div>
        </div>

        {/* Auto-assign toggle */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rule-soft)' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
            onClick={() => setAutoAssignEnabled(p => !p)}
          >
            <Toggle on={autoAssignEnabled} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>Auto-assign dispatch</div>
              <div className="t-meta" style={{ marginTop: 2 }}>
                {autoAssignEnabled
                  ? 'System automatically offers rides to nearest eligible driver.'
                  : 'Manual dispatch only — dispatcher must assign each ride.'}
              </div>
            </div>
          </div>
        </div>

        {/* Search radius */}
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--rule-soft)' }}>
          <div style={{ marginBottom: 14, fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Search radius
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px 20px' }}>
            <div className="field">
              <label className="field-label">Initial radius</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={500}
                  max={10000}
                  step={500}
                  value={dispatchInitialRadius}
                  onChange={e => setDispatchInitialRadius(e.target.value)}
                  style={{ maxWidth: 90 }}
                />
                <span className="t-meta">m</span>
              </div>
              <p className="t-meta" style={{ marginTop: 4 }}>First search ring from pickup point.</p>
            </div>
            <div className="field">
              <label className="field-label">Expand step</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={500}
                  max={5000}
                  step={500}
                  value={dispatchRadiusStep}
                  onChange={e => setDispatchRadiusStep(e.target.value)}
                  style={{ maxWidth: 90 }}
                />
                <span className="t-meta">m per retry</span>
              </div>
              <p className="t-meta" style={{ marginTop: 4 }}>Radius grows by this after each failed ping.</p>
            </div>
            <div className="field">
              <label className="field-label">Max radius</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={2000}
                  max={30000}
                  step={1000}
                  value={dispatchMaxRadius}
                  onChange={e => setDispatchMaxRadius(e.target.value)}
                  style={{ maxWidth: 90 }}
                />
                <span className="t-meta">m</span>
              </div>
              <p className="t-meta" style={{ marginTop: 4 }}>Search stops expanding beyond this radius.</p>
            </div>
          </div>
        </div>

        {/* Ranking weights */}
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--rule-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Driver ranking weights
            </div>
            <span
              className={'badge' + (rankTotal === 100 ? ' ok' : ' warn')}
              style={{ fontSize: 11.5 }}
            >
              {rankTotal === 100 ? `Total: 100% ✓` : `Total: ${rankTotal}% — must equal 100`}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px 20px' }}>
            <div className="field">
              <label className="field-label">Proximity</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={rankWeightDistance}
                  onChange={e => setRankWeightDistance(e.target.value)}
                  style={{ maxWidth: 80, borderColor: rankTotal !== 100 ? 'var(--warn)' : undefined }}
                />
                <span className="t-meta">%</span>
              </div>
              <p className="t-meta" style={{ marginTop: 4 }}>Weight given to driver distance from pickup.</p>
            </div>
            <div className="field">
              <label className="field-label">Driver rating</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={rankWeightRating}
                  onChange={e => setRankWeightRating(e.target.value)}
                  style={{ maxWidth: 80, borderColor: rankTotal !== 100 ? 'var(--warn)' : undefined }}
                />
                <span className="t-meta">%</span>
              </div>
              <p className="t-meta" style={{ marginTop: 4 }}>Weight given to driver's average star rating.</p>
            </div>
            <div className="field">
              <label className="field-label">Acceptance rate</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={rankWeightAcceptance}
                  onChange={e => setRankWeightAcceptance(e.target.value)}
                  style={{ maxWidth: 80, borderColor: rankTotal !== 100 ? 'var(--warn)' : undefined }}
                />
                <span className="t-meta">%</span>
              </div>
              <p className="t-meta" style={{ marginTop: 4 }}>Weight given to driver's historical acceptance rate.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Waiting time ── */}
      <SectionCard
        title="Waiting time"
        description="Free waiting allowance at pickup and the per-minute charge once it expires."
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px 20px' }}>
          <div className="field">
            <label className="field-label">Free waiting time</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={0}
                max={15}
                value={freeWaitingMinutes}
                onChange={e => setFreeWaitingMinutes(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">minutes at pickup</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>No charge while driver waits within this window.</p>
          </div>
          <div className="field">
            <label className="field-label">Waiting charge</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="t-meta">{currencySymbolFor(baseCurrency)}</span>
              <input
                className="input"
                type="number"
                min={0}
                step={0.5}
                value={waitingChargePerMin}
                onChange={e => setWaitingChargePerMin(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">per minute after free window</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Added to fare for each minute beyond the free allowance.</p>
          </div>
        </div>
      </SectionCard>

      {/* ── Rider limits ── */}
      <SectionCard
        title="Rider limits"
        description="Per-customer operational caps to prevent abuse and manage capacity."
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px 20px' }}>
          <div className="field">
            <label className="field-label">Max simultaneous active rides</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={1}
                max={5}
                value={maxActiveBookings}
                onChange={e => setMaxActiveBookings(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">per customer</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Additional bookings are rejected until existing trips complete.</p>
          </div>
        </div>
      </SectionCard>

      {/* ── Quiet hours ── */}
      <SectionCard
        title="Quiet hours"
        description="Define a nightly window during which surge pricing is capped or new bookings are paused entirely."
      >
        {/* Enable toggle */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, cursor: 'pointer' }}
          onClick={() => setQuietHoursEnabled(p => !p)}
        >
          <Toggle on={quietHoursEnabled} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>Enable quiet hours</div>
            <div className="t-meta" style={{ marginTop: 2 }}>
              {quietHoursEnabled
                ? 'Restrictions are active during the window below.'
                : 'No time-based restrictions applied — platform runs normally 24 h.'}
            </div>
          </div>
        </div>

        {/* Window + action — only show fields when enabled */}
        <div style={{
          opacity: quietHoursEnabled ? 1 : 0.4,
          pointerEvents: quietHoursEnabled ? 'auto' : 'none',
          transition: 'opacity 180ms ease',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px 20px' }}>
            <div className="field">
              <label className="field-label">Start time</label>
              <input
                className="input"
                type="time"
                value={quietHoursStart}
                onChange={e => setQuietHoursStart(e.target.value)}
              />
              <p className="t-meta" style={{ marginTop: 4 }}>Restrictions begin at this time (platform timezone).</p>
            </div>
            <div className="field">
              <label className="field-label">End time</label>
              <input
                className="input"
                type="time"
                value={quietHoursEnd}
                onChange={e => setQuietHoursEnd(e.target.value)}
              />
              <p className="t-meta" style={{ marginTop: 4 }}>Restrictions lift at this time. Can cross midnight.</p>
            </div>
            <div className="field">
              <label className="field-label">Action during window</label>
              <select
                className="input"
                value={quietHoursAction}
                onChange={e => setQuietHoursAction(e.target.value)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
              >
                <option value="cap_surge">Cap surge to 1.0× (no surge)</option>
                <option value="pause_bookings">Pause all new bookings</option>
              </select>
              <p className="t-meta" style={{ marginTop: 4 }}>
                {quietHoursAction === 'cap_surge'
                  ? 'Rides still accepted but surge multiplier is forced to 1.0×.'
                  : 'New ride requests are rejected. Existing trips continue unaffected.'}
              </p>
            </div>
          </div>

          {/* Visual summary strip */}
          {quietHoursEnabled && (
            <div style={{
              marginTop: 18,
              padding: '11px 16px',
              background: 'var(--accent-soft)',
              border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--rule))',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 12.5,
              color: 'var(--accent)',
            }}>
              <Icon name="clock" size={14} style={{ flexShrink: 0 }} />
              <span>
                Every night <strong>{quietHoursStart}</strong> → <strong>{quietHoursEnd}</strong>
                {' · '}
                {quietHoursAction === 'cap_surge' ? 'surge capped at 1.0×' : 'new bookings paused'}
                {' · '}uses platform timezone ({timezone || 'Asia/Kolkata'})
              </span>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )

  // ── Regions & zones tab ────────────────────────────────────────────────────

  const OP_STATUS_META: Record<string, { label: string; dot: string }> = {
    operational: { label: 'Operational', dot: 'var(--ok, #16a34a)' },
    degraded:    { label: 'Degraded',    dot: '#f59e0b' },
    maintenance: { label: 'Maintenance', dot: 'var(--ink-3)' },
  }

  const renderRegionsTab = () => (
    <div style={{ overflow: 'auto', padding: isMobile ? '16px' : '24px 32px 40px', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 920 }}>
      {/* Header */}
      <div>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>Regions & zones</h3>
        <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
          Operational status for service zones. Zone geometry and vehicle codes are managed in
          <strong style={{ color: 'var(--ink-2)' }}> Catalog → Service zones</strong>.
          Status changes here take effect immediately across the platform.
        </p>
      </div>

      {/* Zones table */}
      {regionsLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          Loading zones…
        </div>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th className="t-label">Zone</th>
                <th className="t-label">Code</th>
                <th className="t-label">Active</th>
                <th className="t-label">Operational status</th>
                <th className="t-label">Status note</th>
                <th className="t-label" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {regions.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '32px 0' }}>
                    No service zones found. Add zones in <strong>Catalog → Service zones</strong>.
                  </td>
                </tr>
              )}
              {regions.map(zone => {
                const isEditing = editingRegionId === zone.id
                const opMeta = OP_STATUS_META[zone.operational_status] ?? OP_STATUS_META['operational']
                return (
                  <tr key={zone.id}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{zone.name}</td>
                    <td><span className="badge info" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11 }}>{zone.code}</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: zone.is_active ? 'var(--ok, #16a34a)' : 'var(--ink-3)', flexShrink: 0 }} />
                        {zone.is_active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    {isEditing ? (
                      <>
                        <td>
                          <select
                            className="input"
                            style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, padding: '5px 8px' }}
                            value={editRegionData.operational_status}
                            onChange={e => setEditRegionData(p => ({ ...p, operational_status: e.target.value }))}
                          >
                            <option value="operational">Operational</option>
                            <option value="degraded">Degraded</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </td>
                        <td>
                          <input
                            className="input"
                            style={{ fontSize: 13, padding: '5px 8px', width: '100%', minWidth: 140 }}
                            placeholder="e.g. weather, maintenance…"
                            value={editRegionData.status_note}
                            onChange={e => setEditRegionData(p => ({ ...p, status_note: e.target.value }))}
                          />
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              className="btn sm accent"
                              onClick={() => { void saveRegion() }}
                              disabled={regionSaving}
                            >
                              {regionSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button className="btn sm ghost" onClick={cancelEditRegion}>Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: opMeta.dot, flexShrink: 0 }} />
                            {opMeta.label}
                          </span>
                        </td>
                        <td className="t-meta">{zone.status_note || '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn sm ghost" onClick={() => startEditRegion(zone)}>
                            Set status
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  // ── Data & Privacy tab ────────────────────────────────────────────────────

  // Helper: days → human label
  const daysLabel = (days: string) => {
    const n = parseInt(days, 10)
    if (isNaN(n) || n <= 0) return ''
    if (n % 365 === 0) return `${n / 365} year${n / 365 !== 1 ? 's' : ''}`
    if (n % 30 === 0) return `${n / 30} month${n / 30 !== 1 ? 's' : ''}`
    return `${n} day${n !== 1 ? 's' : ''}`
  }

  const renderDataPrivacyTab = () => (
    <div style={{ overflow: 'auto', padding: isMobile ? '16px' : '24px 32px 40px', display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 880 }}>

      {/* ── Data retention ── */}
      <SectionCard
        title="Data retention"
        description="How long records in each category are retained before automatic anonymisation or deletion. Financial records follow regulatory minimums."
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '18px 24px' }}>

          {/* Trip & booking records */}
          <div className="field">
            <label className="field-label">Trip & booking records</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={365}
                max={3650}
                step={30}
                value={dataRetentionTripDays}
                onChange={e => setDataRetentionTripDays(e.target.value)}
                style={{ maxWidth: 90 }}
              />
              <span className="t-meta">days</span>
              {daysLabel(dataRetentionTripDays) && (
                <span className="badge info" style={{ fontSize: 11 }}>{daysLabel(dataRetentionTripDays)}</span>
              )}
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Booking details, route, timestamps. After expiry, records are anonymised (rider/driver PII stripped).</p>
          </div>

          {/* Customer PII */}
          <div className="field">
            <label className="field-label">Customer PII</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={90}
                max={2555}
                step={30}
                value={dataRetentionPiiDays}
                onChange={e => setDataRetentionPiiDays(e.target.value)}
                style={{ maxWidth: 90 }}
              />
              <span className="t-meta">days after last activity</span>
              {daysLabel(dataRetentionPiiDays) && (
                <span className="badge info" style={{ fontSize: 11 }}>{daysLabel(dataRetentionPiiDays)}</span>
              )}
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Name, phone, email, addresses. Clock starts from last booking or login.</p>
          </div>

          {/* Financial records */}
          <div className="field">
            <label className="field-label">Financial records</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={5}
                max={10}
                value={dataRetentionFinancialYears}
                onChange={e => setDataRetentionFinancialYears(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">years</span>
              <span className="badge warn" style={{ fontSize: 11 }}>Regulatory minimum</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Invoices, ledger entries, payout records. GSTIN compliance requires ≥7 years.</p>
          </div>

          {/* Audit logs */}
          <div className="field">
            <label className="field-label">Audit logs</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={3}
                max={10}
                value={dataRetentionAuditYears}
                onChange={e => setDataRetentionAuditYears(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">years</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Admin action log and security events. Decreasing below 7 years is not recommended.</p>
          </div>
        </div>
      </SectionCard>

      {/* ── Privacy request handling ── */}
      <SectionCard
        title="Privacy request handling"
        description="SLA and automation settings for DPDP-compliant customer data export and deletion requests."
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '18px 24px', marginBottom: 20 }}>
          <div className="field">
            <label className="field-label">Data export SLA</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={24}
                max={720}
                step={24}
                value={privacyExportSlaHours}
                onChange={e => setPrivacyExportSlaHours(e.target.value)}
                style={{ maxWidth: 90 }}
              />
              <span className="t-meta">hours to fulfil</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>
              A machine-readable archive of the customer's data must be delivered within this window.
              Requests exceeding SLA are escalated in the Audit module.
            </p>
          </div>
          <div className="field">
            <label className="field-label">Deletion request SLA</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={1}
                max={90}
                value={privacyDeletionSlaDays}
                onChange={e => setPrivacyDeletionSlaDays(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">days to fulfil</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>
              PII anonymisation must complete within this window. Financial records are retained regardless.
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 16 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
            onClick={() => setPrivacyAutoAnonymize(p => !p)}
          >
            <Toggle on={privacyAutoAnonymize} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>Auto-process deletion requests</div>
              <div className="t-meta" style={{ marginTop: 2 }}>
                {privacyAutoAnonymize
                  ? 'Deletions are anonymised automatically once SLA window opens. No manual review step.'
                  : 'Every deletion request requires manual review and approval by a Super Admin before anonymisation.'}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Consent & tracking ── */}
      <SectionCard
        title="Consent & data sharing"
        description="Controls for user consent notices and anonymised data sharing. Affects the rider and driver apps."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {([
            [consentMarketingOptIn,     setConsentMarketingOptIn,     'Marketing communications opt-in',  'Riders must explicitly opt in to receive promotional emails, push notifications, and SMS. Off = opt-out model.'],
            [consentAnalyticsTracking,  setConsentAnalyticsTracking,  'In-app analytics tracking',        'Collect anonymous usage events (screen views, funnel steps) to improve the product. No PII is sent to analytics.'],
            [consentCookieBanner,       setConsentCookieBanner,       'Privacy & cookie notice',          'Show a consent/cookie notice banner in the rider and driver apps on first launch. Required in most jurisdictions.'],
            [dataShareAuthorities,      setDataShareAuthorities,      'Share anonymised trip data with transport authorities', 'Provide aggregate, de-identified trip statistics to city transport regulators when formally requested. No individual records are shared.'],
          ] as [boolean, React.Dispatch<React.SetStateAction<boolean>>, string, string][]).map(([val, setter, label, desc]) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                cursor: 'pointer',
                padding: '12px 0',
                borderBottom: '1px solid var(--rule-soft)',
              }}
              onClick={() => setter(p => !p)}
            >
              <div style={{ paddingTop: 2 }}>
                <Toggle on={val} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
                <div className="t-meta" style={{ marginTop: 3, lineHeight: 1.55 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )

  // ── Localization tab ──────────────────────────────────────────────────────

  const ALL_LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi (हिन्दी)' },
    { code: 'ar', label: 'Arabic (العربية)' },
    { code: 'ta', label: 'Tamil (தமிழ்)' },
    { code: 'te', label: 'Telugu (తెలుగు)' },
    { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
    { code: 'fr', label: 'French (Français)' },
  ]

  const toggleLanguage = (code: string) => {
    setSupportedLanguages(prev =>
      prev.includes(code)
        ? prev.filter(l => l !== code)
        : [...prev, code]
    )
  }

  // Build a live preview number for the number formatting card
  const previewNumber = () => {
    const sym = currencySymbolFor(baseCurrency)
    const dec = decimalSeparator
    const tho = thousandsSeparator
    const formatted = `1${tho}23${tho}456${dec}78`
    return currencySymbolPosition === 'before' ? `${sym}${formatted}` : `${formatted} ${sym}`
  }

  const renderLocalizationTab = () => (
    <div style={{ overflow: 'auto', padding: isMobile ? '16px' : '24px 32px 40px', display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 880 }}>

      {/* ── Language ── */}
      <SectionCard
        title="Language"
        description="Which languages are available in the rider and driver apps. At least one language must be active."
      >
        {/* Default language */}
        <div style={{ marginBottom: 20 }}>
          <div className="field" style={{ maxWidth: 300 }}>
            <label className="field-label">Default / fallback language</label>
            <select
              className="input"
              value={defaultLanguage}
              onChange={e => setDefaultLanguage(e.target.value)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
            >
              {ALL_LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <p className="t-meta" style={{ marginTop: 4 }}>
              Used when a user's preferred language is not available.
            </p>
          </div>
        </div>

        {/* Supported languages multi-select */}
        <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 16 }}>
          <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Available in apps
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ALL_LANGUAGES.map(l => {
              const active = supportedLanguages.includes(l.code)
              return (
                <button
                  key={l.code}
                  onClick={() => toggleLanguage(l.code)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: '1px solid',
                    borderColor: active ? 'var(--accent)' : 'var(--rule)',
                    background: active ? 'var(--accent-soft)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--ink-2)',
                    fontSize: 12.5,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    transition: 'all 120ms ease',
                  }}
                >
                  {l.label}
                </button>
              )
            })}
          </div>
          <p className="t-meta" style={{ marginTop: 10 }}>
            Only enabled languages appear in the app language selector. English is recommended to always be active.
          </p>
        </div>

        {/* RTL toggle */}
        <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 16, marginTop: 16 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
            onClick={() => setRtlEnabled(p => !p)}
          >
            <Toggle on={rtlEnabled} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>Enable RTL layout</div>
              <div className="t-meta" style={{ marginTop: 2 }}>
                {rtlEnabled
                  ? 'App layout mirrors right-to-left for Arabic or Urdu users.'
                  : 'All layouts are left-to-right only.'}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Date & time formatting ── */}
      <SectionCard
        title="Date & time formatting"
        description="How dates and times are displayed throughout the admin panel and customer-facing apps."
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px 20px' }}>
          <div className="field">
            <label className="field-label">Date format</label>
            <select
              className="input"
              value={dateFormat}
              onChange={e => setDateFormat(e.target.value)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY · 28/05/2026</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY · 05/28/2026</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD · 2026-05-28</option>
              <option value="D MMM YYYY">D MMM YYYY · 28 May 2026</option>
            </select>
            <p className="t-meta" style={{ marginTop: 4 }}>Applied to receipts, booking confirmations, and reports.</p>
          </div>
          <div className="field">
            <label className="field-label">Time format</label>
            <select
              className="input"
              value={timeFormat}
              onChange={e => setTimeFormat(e.target.value)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
            >
              <option value="24h">24-hour · 14:30</option>
              <option value="12h">12-hour AM/PM · 2:30 PM</option>
            </select>
            <p className="t-meta" style={{ marginTop: 4 }}>Used on trip timelines and schedules.</p>
          </div>
          <div className="field">
            <label className="field-label">First day of week</label>
            <select
              className="input"
              value={weekStartsOn}
              onChange={e => setWeekStartsOn(e.target.value)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
            >
              <option value="Monday">Monday</option>
              <option value="Sunday">Sunday</option>
              <option value="Saturday">Saturday</option>
            </select>
            <p className="t-meta" style={{ marginTop: 4 }}>Affects calendar pickers and weekly report views.</p>
          </div>
        </div>
      </SectionCard>

      {/* ── Number & currency formatting ── */}
      <SectionCard
        title="Number & currency formatting"
        description="How amounts are displayed in the apps, receipts, and invoices."
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px 20px', marginBottom: 20 }}>
          <div className="field">
            <label className="field-label">Currency symbol position</label>
            <select
              className="input"
              value={currencySymbolPosition}
              onChange={e => setCurrencySymbolPosition(e.target.value)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
            >
              <option value="before">Before amount · {currencySymbolFor(baseCurrency)}500</option>
              <option value="after">After amount · 500 {currencySymbolFor(baseCurrency)}</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">Decimal separator</label>
            <select
              className="input"
              value={decimalSeparator}
              onChange={e => setDecimalSeparator(e.target.value)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
            >
              <option value=".">Period · 1,234.56</option>
              <option value=",">Comma · 1.234,56</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">Thousands separator</label>
            <select
              className="input"
              value={thousandsSeparator}
              onChange={e => setThousandsSeparator(e.target.value)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
            >
              <option value=",">Comma · 1,23,456</option>
              <option value=".">Period · 1.23.456</option>
              <option value=" ">Space · 1 23 456</option>
              <option value="">None · 123456</option>
            </select>
          </div>
        </div>

        {/* Live preview */}
        <div style={{
          padding: '14px 18px',
          background: 'var(--bg)',
          border: '1px solid var(--rule-soft)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <span className="t-meta" style={{ flexShrink: 0 }}>Preview:</span>
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.01em' }}>
            {previewNumber()}
          </span>
          <span className="t-meta">· a sample fare amount</span>
        </div>
      </SectionCard>
    </div>
  )

  // ── Safety & SOS tab ──────────────────────────────────────────────────────

  const renderSafetyTab = () => (
    <div style={{ overflow: 'auto', padding: isMobile ? '16px' : '24px 32px 40px', display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 880 }}>

      {/* ── SOS & Emergency ── */}
      <SectionCard
        title="SOS & emergency"
        description="In-trip emergency button behaviour and admin alert routing."
      >
        {/* SOS master toggle */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, cursor: 'pointer' }}
          onClick={() => setSosEnabled(p => !p)}
        >
          <Toggle on={sosEnabled} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>Enable SOS button</div>
            <div className="t-meta" style={{ marginTop: 2 }}>
              {sosEnabled
                ? 'SOS button is visible in rider and driver apps during active trips.'
                : 'SOS button is hidden. Emergency contacts are not notified.'}
            </div>
          </div>
        </div>

        <div style={{
          opacity: sosEnabled ? 1 : 0.4,
          pointerEvents: sosEnabled ? 'auto' : 'none',
          transition: 'opacity 180ms ease',
        }}>
          {/* Contact number */}
          <div style={{ marginBottom: 16 }}>
            <div className="field" style={{ maxWidth: 320 }}>
              <label className="field-label">Emergency contact number</label>
              <input
                className="input"
                type="tel"
                value={sosContactNumber}
                onChange={e => setSosContactNumber(e.target.value)}
                placeholder="e.g. 112"
              />
              <p className="t-meta" style={{ marginTop: 4 }}>
                Dialled automatically when rider presses SOS. Use national emergency number or a dedicated ops line.
              </p>
            </div>
          </div>

          {/* Share location + alert admin toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
              onClick={() => setSosShareLocation(p => !p)}
            >
              <Toggle on={sosShareLocation} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Share live location</div>
                <div className="t-meta" style={{ marginTop: 1 }}>
                  Broadcasts rider and driver GPS to emergency responders on SOS trigger.
                </div>
              </div>
            </div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
              onClick={() => setSosAlertAdmin(p => !p)}
            >
              <Toggle on={sosAlertAdmin} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Alert ops team</div>
                <div className="t-meta" style={{ marginTop: 1 }}>
                  Sends an immediate push notification to all online admin users when SOS is activated.
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Driver onboarding policy ── */}
      <SectionCard
        title="Driver onboarding policy"
        description="Document verification requirements and grace period before a new driver can accept trips."
      >
        {/* Grace period toggle + days */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, cursor: 'pointer' }}
            onClick={() => setDriverGracePeriodEnabled(p => !p)}
          >
            <Toggle on={driverGracePeriodEnabled} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>Enable document grace period</div>
              <div className="t-meta" style={{ marginTop: 2 }}>
                {driverGracePeriodEnabled
                  ? 'New drivers may complete trips while documents are under review.'
                  : 'All documents must be verified before a driver can accept any trip.'}
              </div>
            </div>
          </div>
          <div style={{
            opacity: driverGracePeriodEnabled ? 1 : 0.4,
            pointerEvents: driverGracePeriodEnabled ? 'auto' : 'none',
            transition: 'opacity 180ms ease',
            paddingLeft: 50,
          }}>
            <div className="field" style={{ maxWidth: 240 }}>
              <label className="field-label">Grace period length</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={30}
                  value={driverGracePeriodDays}
                  onChange={e => setDriverGracePeriodDays(e.target.value)}
                  style={{ maxWidth: 80 }}
                />
                <span className="t-meta">days from signup</span>
              </div>
              <p className="t-meta" style={{ marginTop: 4 }}>
                Driver is suspended after this period if documents are still outstanding.
              </p>
            </div>
          </div>
        </div>

        {/* Operator site visit */}
        <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 16 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
            onClick={() => setOperatorSiteVisitRequired(p => !p)}
          >
            <Toggle on={operatorSiteVisitRequired} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>Require operator site visit</div>
              <div className="t-meta" style={{ marginTop: 2 }}>
                {operatorSiteVisitRequired
                  ? 'An Acme Mobility inspector must physically verify the operator premises before activation.'
                  : 'Operators can be activated remotely via document upload alone.'}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Auto-suspension thresholds ── */}
      <SectionCard
        title="Auto-suspension thresholds"
        description="Drivers whose metrics fall below these limits are automatically flagged for suspension review."
      >
        {/* Evaluation window */}
        <div style={{ marginBottom: 18 }}>
          <div className="field" style={{ maxWidth: 280 }}>
            <label className="field-label">Evaluation window</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={7}
                max={90}
                value={driverThresholdWindowDays}
                onChange={e => setDriverThresholdWindowDays(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">days of trip history</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>
              Metrics are calculated over this rolling window before triggering suspension.
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px 20px' }}>
            <div className="field">
              <label className="field-label">Minimum star rating</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={driverMinRating}
                  onChange={e => setDriverMinRating(e.target.value)}
                  style={{ maxWidth: 80 }}
                />
                <span className="t-meta">/ 5.0</span>
              </div>
              <p className="t-meta" style={{ marginTop: 4 }}>Drivers below this average are suspended.</p>
            </div>
            <div className="field">
              <label className="field-label">Max cancellation rate</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={driverMaxCancellationRate}
                  onChange={e => setDriverMaxCancellationRate(e.target.value)}
                  style={{ maxWidth: 80 }}
                />
                <span className="t-meta">%</span>
              </div>
              <p className="t-meta" style={{ marginTop: 4 }}>Drivers above this cancellation rate are flagged.</p>
            </div>
            <div className="field">
              <label className="field-label">Min acceptance rate</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={driverMinAcceptanceRate}
                  onChange={e => setDriverMinAcceptanceRate(e.target.value)}
                  style={{ maxWidth: 80 }}
                />
                <span className="t-meta">%</span>
              </div>
              <p className="t-meta" style={{ marginTop: 4 }}>Drivers below this acceptance rate are flagged.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── SLA timers ── */}
      <SectionCard
        title="SLA alert timers"
        description="Thresholds that trigger ops-team alerts when a trip stage runs longer than expected."
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px 20px' }}>
          <div className="field">
            <label className="field-label">Dispatch alert</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={1}
                max={30}
                value={slaDispatchAlertMin}
                onChange={e => setSlaDispatchAlertMin(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">min to find driver</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Alert if no driver assigned after this time.</p>
          </div>
          <div className="field">
            <label className="field-label">Pickup alert</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={1}
                max={60}
                value={slaPickupAlertMin}
                onChange={e => setSlaPickupAlertMin(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <span className="t-meta">min to reach rider</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Alert if driver hasn't arrived at pickup after this time.</p>
          </div>
          <div className="field">
            <label className="field-label">Trip overrun alert</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                type="number"
                min={10}
                max={480}
                step={10}
                value={slaTripOverrunAlertMin}
                onChange={e => setSlaTripOverrunAlertMin(e.target.value)}
                style={{ maxWidth: 90 }}
              />
              <span className="t-meta">min max trip duration</span>
            </div>
            <p className="t-meta" style={{ marginTop: 4 }}>Alert if a trip runs beyond this duration (possible GPS loss / incident).</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )

  const renderForm = () => {
    if (activeTab === 'booking') {
      return renderBookingRulesTab()
    }
    if (activeTab === 'regions') {
      return renderRegionsTab()
    }
    if (activeTab === 'safety') {
      return renderSafetyTab()
    }
    if (activeTab === 'localization') {
      return renderLocalizationTab()
    }
    if (activeTab === 'data') {
      return renderDataPrivacyTab()
    }
    if (activeTab !== 'general') {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 200,
          color: 'var(--ink-3)',
          fontSize: 13,
        }}>
          Coming soon · this section is under development.
        </div>
      )
    }

    return (
      <div style={{ overflow: 'auto', padding: isMobile ? '16px' : '24px 32px 40px', display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 880 }}>
        {/* Organization */}
        <SectionCard title="Organization" description="Identity and operating defaults applied across the platform.">
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px 20px' }}>
            <div className="field">
              <label className="field-label">Legal entity</label>
              <input
                className="input"
                value={legalEntity}
                onChange={e => setLegalEntity(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">GSTIN</label>
              <input
                className="input"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">Primary region</label>
              <SearchableSelect
                value={primaryRegion}
                onChange={setPrimaryRegion}
                options={countryOptions}
                placeholder="Search country…"
              />
              <p className="t-meta" style={{ marginTop: 4 }}>Country where the platform primarily operates.</p>
            </div>
            <div className="field">
              <label className="field-label">Base currency</label>
              <SearchableSelect
                value={baseCurrency}
                onChange={setBaseCurrency}
                options={currencyOptions}
                placeholder="Search currency…"
              />
              <p className="t-meta" style={{ marginTop: 4 }}>ISO 4217 currency for all fares, payouts and invoices.</p>
            </div>
            <div className="field">
              <label className="field-label">Timezone</label>
              <SearchableSelect
                value={timezone}
                onChange={setTimezone}
                options={timezoneOptions}
                placeholder="Search timezone…"
              />
              <p className="t-meta" style={{ marginTop: 4 }}>IANA timezone used for quiet hours, payouts and reports.</p>
            </div>
            <div className="field">
              <label className="field-label">Fiscal year start</label>
              <select
                className="input"
                value={fiscalYearStart}
                onChange={e => setFiscalYearStart(e.target.value)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
              >
                {FISCAL_MONTHS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <p className="t-meta" style={{ marginTop: 4 }}>Month the financial year begins (e.g. April = Apr 1 – Mar 31).</p>
            </div>
          </div>
        </SectionCard>

        {/* Operating defaults */}
        <SectionCard title="Operating defaults">
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px 20px' }}>
            <div className="field">
              <label className="field-label">Settlement cycle</label>
              <select
                className="input"
                value={settlementCycle}
                onChange={e => setSettlementCycle(e.target.value)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
              >
                <option value="T+1">T+1</option>
                <option value="T+2">T+2</option>
                <option value="T+3">T+3</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Driver payout day</label>
              <select
                className="input"
                value={driverPayoutDay}
                onChange={e => setDriverPayoutDay(e.target.value)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Surge ceiling</label>
              <select
                className="input"
                value={surgeCeiling}
                onChange={e => setSurgeCeiling(e.target.value)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
              >
                <option value="1.5">1.5×</option>
                <option value="2.0">2.0×</option>
                <option value="2.5">2.5×</option>
                <option value="3.0">3.0×</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Platform toggles */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>
              Platform toggles
            </h3>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            {toggles.length === 0 ? (
              <div style={{ padding: '20px', color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>
                Loading toggles…
              </div>
            ) : toggles.map((t, i) => (
              <div
                key={t.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '15px 20px',
                  borderBottom: i < toggles.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t.name}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{t.description?.replace('₹', currencySymbolFor(baseCurrency))}</div>
                </div>
                <Toggle on={t.enabled} onClick={() => handleToggle(t)} />
              </div>
            ))}
          </div>
        </div>

        {/* Last edited */}
        {settings?.last_edited_at && (
          <p className="t-meta" style={{ margin: 0 }}>
            Last edited {formatDateTime(settings.last_edited_at)} by {settings.last_edited_by}
          </p>
        )}
      </div>
    )
  }

  return (
    <Shell
      activeId="settings"
      breadcrumb="System · Settings"
      title="Settings & flags"
      subtitle="Platform configuration · changes versioned & audit-logged"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn sm"
            onClick={() => setNoticeMsg('Change history — audit log available in the Audit module.')}
          >
            Change history
          </button>
          {(activeTab === 'general' || activeTab === 'booking' || activeTab === 'safety' || activeTab === 'localization' || activeTab === 'data') && (
            <button
              className="btn sm accent"
              onClick={() => { void handleSave() }}
              disabled={saving}
            >
              <Icon name="check" size={13} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>
      }
    >
      {/* Notice banner */}
      {noticeMsg && (
        <div style={{
          margin: '0',
          padding: '10px 20px',
          fontSize: 12.5,
          background: 'var(--accent-soft)',
          border: '0',
          borderBottom: '1px solid color-mix(in oklab, var(--accent) 28%, var(--rule))',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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

      {isMobile ? (
        // Mobile: horizontal chip row + form below
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            gap: 6,
            padding: '10px 16px',
            borderBottom: '1px solid var(--rule)',
            background: 'var(--surface)',
          }}>
            {NAV_ITEMS.filter(n => n.section === 'config').map(item => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: '1px solid',
                  borderColor: activeTab === item.id ? 'var(--accent)' : 'var(--rule)',
                  background: activeTab === item.id ? 'var(--accent-soft)' : 'transparent',
                  color: activeTab === item.id ? 'var(--accent)' : 'var(--ink-2)',
                  fontSize: 12,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          {renderForm()}
        </div>
      ) : (
        // Desktop: 232px left sub-nav + form content
        <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', minHeight: '100%' }}>
          {/* Sub-nav */}
          <div style={{
            borderRight: '1px solid var(--rule)',
            background: 'var(--surface)',
            padding: '20px 0',
            overflowY: 'auto',
          }}>
            <div className="nav-section-label">Configuration</div>
            {NAV_ITEMS.filter(n => n.section === 'config').map(item => (
              <div
                key={item.id}
                className={'nav-item' + (activeTab === item.id ? ' active' : '')}
                onClick={() => handleNavClick(item)}
                style={{ cursor: 'pointer' }}
              >
                <span>{item.label}</span>
              </div>
            ))}
            <div className="nav-section-label" style={{ marginTop: 12 }}>Advanced</div>
            {NAV_ITEMS.filter(n => n.section === 'advanced').map(item => (
              <div
                key={item.id}
                className="nav-item"
                onClick={() => handleNavClick(item)}
                style={{ cursor: 'pointer' }}
              >
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Form content */}
          {renderForm()}
        </div>
      )}
    </Shell>
  )
}
