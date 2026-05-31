import api from '../lib/axios'

export interface Promotion {
  id: string
  code: string
  type: 'flat' | 'percent'
  value: number
  cap_minor: number | null
  min_trip_value_minor: number | null
  validity_from: string
  validity_to: string
  per_customer_limit: number
  total_redemption_cap: number | null
  total_budget_minor: number
  budget_spent_minor: number
  redemption_count: number
  segment: string | null
  service_types: string[]
  zones: string[]
  new_customers_only: boolean
  notes: string | null
  status: 'draft' | 'active' | 'paused' | 'expired' | 'depleted'
  created_at: string
  updated_at: string
}

export interface CreatePromotionBody {
  code: string
  type: 'flat' | 'percent'
  value: number
  cap_minor?: number | null
  min_trip_value_minor?: number | null
  validity_from: string
  validity_to: string
  per_customer_limit?: number
  total_redemption_cap?: number | null
  total_budget_minor: number
  segment?: string | null
  service_types?: string[]
  zones?: string[]
  new_customers_only?: boolean
  notes?: string | null
}

export type UpdatePromotionBody = Partial<Omit<CreatePromotionBody, 'code'>>

export interface PromotionAnalytics {
  total_redemptions: number
  total_budget_spent_minor: number
  avg_discount_minor: number
  new_customers: number
  blended_cpa_minor: number
  daily_series: { date: string; count: number; spent_minor: number }[]
  by_promo: { code: string; redemptions: number; spent_minor: number; pct: number }[]
}

export interface ReferralProgram {
  id: string
  is_active: boolean
  referrer_reward_minor: number
  referee_reward_minor: number
  qualifying_event: string
  per_referrer_monthly_cap_minor: number
  monthly_budget_minor: number
  fraud_self_referral: boolean
  fraud_device_collusion: boolean
  fraud_velocity_limit: boolean
  fraud_payment_instrument: boolean
  fraud_manual_review_threshold_minor: number | null
  created_at: string
  updated_at: string
}

export type UpdateReferralProgramBody = Partial<Omit<ReferralProgram, 'id' | 'created_at' | 'updated_at'>>

export interface ReferralStats {
  referrals_sent: number
  converted: number
  conversion_rate_pct: number
  reward_paid_minor: number
  new_customers: number
  cpa_minor: number
  fraud_blocked: number
  fraud_saved_minor: number
  top_referrers: { customer_id: string; name: string; converted: number; reward_minor: number; at_cap: boolean }[]
}

export const promotionsService = {
  listPromotions: (params?: { page?: number; page_size?: number; search?: string; status?: string }) =>
    api.get<{ items: Promotion[]; total: number; page: number; pages: number }>('/promotions', { params }).then(r => r.data),

  createPromotion: (body: CreatePromotionBody) =>
    api.post<Promotion>('/promotions', body).then(r => r.data),

  getPromotion: (id: string) =>
    api.get<Promotion>(`/promotions/${id}`).then(r => r.data),

  updatePromotion: (id: string, body: UpdatePromotionBody) =>
    api.patch<Promotion>(`/promotions/${id}`, body).then(r => r.data),

  activatePromotion: (id: string) =>
    api.post<Promotion>(`/promotions/${id}/activate`).then(r => r.data),

  pausePromotion: (id: string) =>
    api.post<Promotion>(`/promotions/${id}/pause`).then(r => r.data),

  deletePromotion: (id: string) =>
    api.delete(`/promotions/${id}`).then(r => r.data),

  getAnalytics: (days?: number) =>
    api.get<PromotionAnalytics>('/promotions/analytics', { params: { days } }).then(r => r.data),

  getReferralProgram: () =>
    api.get<ReferralProgram>('/referrals/program').then(r => r.data),

  updateReferralProgram: (body: UpdateReferralProgramBody) =>
    api.patch<ReferralProgram>('/referrals/program', body).then(r => r.data),

  getReferralStats: () =>
    api.get<ReferralStats>('/referrals/stats').then(r => r.data),
}
