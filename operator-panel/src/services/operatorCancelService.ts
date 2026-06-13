import api from '../lib/axios'

export interface CancellableBooking {
  id: string
  booking_ref: string
  origin_name: string
  destination_name: string
  aircraft_type: string
  aircraft_reg: string
  departure_at: string
  arrival_at: string
  pax_count: number
  status: string
  total_amount: number
  currency: string
}

export interface CancelPreview {
  policy_tier: string
  hours_to_departure: number
  fee_pct: number
  fee_amount: number
  refund_amount: number
  compensation_note: string | null
}

export interface ReschedulePreview {
  policy_tier: string
  hours_to_departure: number
  fee_pct: number
  fee_amount: number
  new_departure_at: string
  new_arrival_at: string
  aircraft_available: boolean
}

export interface ReschedulePayload {
  new_etd: string
  new_eta: string
  aircraft_id: string
  reason: string
}

export const operatorCancelService = {
  list: () =>
    api.get<CancellableBooking[]>('/operator/cancellable-bookings').then(r => r.data),

  getCancelPreview: (id: string) =>
    api.get<CancelPreview>(`/operator/bookings/${id}/cancel-preview`).then(r => r.data),

  cancelBooking: (id: string, reason: string, forceMajeure: boolean, notes: string) =>
    api
      .post(`/operator/bookings/${id}/cancel`, { reason, force_majeure: forceMajeure, notes })
      .then(r => r.data),

  getReschedulePreview: (id: string, newEtd: string, newEta: string) =>
    api
      .get<ReschedulePreview>(`/operator/bookings/${id}/reschedule-preview`, {
        params: { new_etd: newEtd, new_eta: newEta },
      })
      .then(r => r.data),

  rescheduleBooking: (id: string, payload: ReschedulePayload) =>
    api.post(`/operator/bookings/${id}/reschedule`, payload).then(r => r.data),
}
