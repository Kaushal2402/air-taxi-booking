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
  toggles: PlatformToggles
  loaded: boolean
  load: () => Promise<void>
}

export const usePlatformStore = create<PlatformState>((set, get) => ({
  base_currency: 'INR',
  timezone: '',           // empty until settings load — getUserTimezone() falls back to UTC
  fiscal_year_start: 'April',
  settlement_cycle: 'T+1',
  driver_payout_day: 'Monday',
  surge_ceiling: 2.0,
  toggles: { ...DEFAULT_TOGGLES },
  loaded: false,

  load: async () => {
    if (get().loaded) return
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
        toggles,
        loaded: true,
      })
    } catch {
      // Keep defaults; use UTC so timestamps are deterministic on error
      set({ timezone: 'UTC', loaded: true })
    }
  },
}))
