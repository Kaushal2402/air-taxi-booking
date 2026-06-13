import api from '../lib/axios'
import type { AxiosResponse } from 'axios'

export interface OperatorSettings {
  manifest_cutoff_minutes: number
  checklist_template: string[]
  language: string
  timezone: string
  public_operator_name: string
  public_contact_email: string
  public_contact_phone: string
}

export const operatorSettingsService = {
  get: (): Promise<OperatorSettings> =>
    api.get<OperatorSettings>('/operator-settings').then((r: AxiosResponse<OperatorSettings>) => r.data),

  update: (settings: Partial<OperatorSettings>): Promise<OperatorSettings> =>
    api.patch<OperatorSettings>('/operator-settings', settings).then((r: AxiosResponse<OperatorSettings>) => r.data),
}
