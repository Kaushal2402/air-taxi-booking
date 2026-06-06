import { create } from 'zustand'
import { settingsService } from '../services/settingsService'

export interface PlatformToggles {
  guest_checkout: boolean
  cash_payments: boolean
  scheduled_rides: boolean
  in_app_tipping: boolean
  carbon_offset: boolean
}

const DEFAULT_TOGGLES: PlatformToggles = {
  guest_checkout: false,
  cash_payments: true,
  scheduled_rides: true,
  in_app_tipping: true,
  carbon_offset: false,
}

interface PlatformState {
  base_currency: string
  timezone: string
  fiscal_year_start: string
  settlement_cycle: string
  driver_payout_day: string
  surge_ceiling: number
  // Localization
  date_format: string
  time_format: string
  week_starts_on: string
  currency_symbol_position: string
  decimal_separator: string
  thousands_separator: string
  // Consent & data sharing
  consent_marketing_opt_in: boolean
  consent_analytics_tracking: boolean
  consent_cookie_banner: boolean
  data_share_authorities: boolean
  toggles: PlatformToggles
  loaded: boolean
  load: () => Promise<void>
  /** Re-fetch settings from backend and update store (bypasses the loaded guard). */
  sync: () => Promise<void>
}

export const usePlatformStore = create<PlatformState>((set, get) => ({
  base_currency: 'INR',
  timezone: '',           // empty until settings load — getUserTimezone() falls back to UTC
  fiscal_year_start: 'April',
  settlement_cycle: 'T+1',
  driver_payout_day: 'Monday',
  surge_ceiling: 2.0,
  date_format: 'DD/MM/YYYY',
  time_format: '24h',
  week_starts_on: 'Monday',
  currency_symbol_position: 'before',
  decimal_separator: '.',
  thousands_separator: ',',
  consent_marketing_opt_in: true,
  consent_analytics_tracking: true,
  consent_cookie_banner: true,
  data_share_authorities: false,
  toggles: { ...DEFAULT_TOGGLES },
  loaded: false,

  load: async () => {
    if (get().loaded) return
    await get().sync()
  },

  sync: async () => {
    try {
      const [s, rawToggles] = await Promise.all([
        settingsService.getSettings(),
        settingsService.listToggles(),
      ])
      const toggles: PlatformToggles = { ...DEFAULT_TOGGLES }
      for (const t of rawToggles) {
        if (t.key in toggles) {
          (toggles as Record<string, boolean>)[t.key] = t.enabled
        }
      }
      set({
        base_currency: s.base_currency || 'INR',
        timezone: s.timezone || 'UTC',
        fiscal_year_start: s.fiscal_year_start || 'April',
        settlement_cycle: s.settlement_cycle || 'T+1',
        driver_payout_day: s.driver_payout_day || 'Monday',
        surge_ceiling: s.surge_ceiling ?? 2.0,
        date_format: s.date_format || 'DD/MM/YYYY',
        time_format: s.time_format || '24h',
        week_starts_on: s.week_starts_on || 'Monday',
        currency_symbol_position: s.currency_symbol_position || 'before',
        decimal_separator: s.decimal_separator || '.',
        thousands_separator: s.thousands_separator || ',',
        consent_marketing_opt_in: s.consent_marketing_opt_in ?? true,
        consent_analytics_tracking: s.consent_analytics_tracking ?? true,
        consent_cookie_banner: s.consent_cookie_banner ?? true,
        data_share_authorities: s.data_share_authorities ?? false,
        toggles,
        loaded: true,
      })
    } catch {
      set({ timezone: 'UTC', loaded: true })
    }
  },
}))
