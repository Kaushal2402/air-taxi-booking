import api from '../lib/axios'

export interface PricingRule {
  id: string
  operator_id: string
  route_id: string | null
  aircraft_type_name: string
  rate_type: string
  per_seat_minor: number | null
  hourly_rate_minor: number | null
  positioning_minor: number | null
  baggage_minor: number | null
  night_halt_minor: number | null
  fuel_surcharge_minor: number | null
  currency: string
  effective_from: string
  effective_to: string | null
  version: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Surcharge {
  id: string
  operator_id: string
  label: string
  value_text: string
  basis: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CorporateAgreement {
  id: string
  operator_id: string
  client_name: string
  discount_percent: number
  routes_json: string | null
  bookings_ytd: number
  agreement_since: string | null
  expires_at: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface CharterQuote {
  id: string
  operator_id: string
  booking_id: string | null
  version: number
  line_items_json: string | null
  total_minor: number
  currency: string
  validity_hours: number
  payment_terms: string | null
  note_to_requestor: string | null
  status: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

export const operatorPricingService = {
  listRules: () => api.get<PricingRule[]>('/operator/pricing/rules').then(r => r.data),
  createRule: (body: Partial<PricingRule>) =>
    api.post<PricingRule>('/operator/pricing/rules', body).then(r => r.data),
  updateRule: (id: string, body: Partial<PricingRule>) =>
    api.patch<PricingRule>(`/operator/pricing/rules/${id}`, body).then(r => r.data),

  listSurcharges: () => api.get<Surcharge[]>('/operator/pricing/surcharges').then(r => r.data),
  createSurcharge: (body: Partial<Surcharge>) =>
    api.post<Surcharge>('/operator/pricing/surcharges', body).then(r => r.data),
  updateSurcharge: (id: string, body: Partial<Surcharge>) =>
    api.patch<Surcharge>(`/operator/pricing/surcharges/${id}`, body).then(r => r.data),

  listAgreements: () =>
    api.get<CorporateAgreement[]>('/operator/pricing/corporate-agreements').then(r => r.data),
  createAgreement: (body: Partial<CorporateAgreement>) =>
    api.post<CorporateAgreement>('/operator/pricing/corporate-agreements', body).then(r => r.data),
  updateAgreement: (id: string, body: Partial<CorporateAgreement>) =>
    api.patch<CorporateAgreement>(`/operator/pricing/corporate-agreements/${id}`, body).then(r => r.data),

  listQuotes: () => api.get<CharterQuote[]>('/operator/pricing/quotes').then(r => r.data),
  createQuote: (body: Partial<CharterQuote>) =>
    api.post<CharterQuote>('/operator/pricing/quotes', body).then(r => r.data),
  updateQuote: (id: string, body: Partial<CharterQuote>) =>
    api.patch<CharterQuote>(`/operator/pricing/quotes/${id}`, body).then(r => r.data),
  sendQuote: (id: string) =>
    api.post<CharterQuote>(`/operator/pricing/quotes/${id}/send`).then(r => r.data),
}
