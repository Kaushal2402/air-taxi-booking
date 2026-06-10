import api from '../lib/axios'

export interface NotificationTemplate {
  id: string
  name: string
  template_code: string
  event_trigger: string
  channels: string[]
  status: 'draft' | 'live' | 'paused'
  category: string
  push_title: string | null
  push_body: string | null
  sms_body: string | null
  email_subject: string | null
  email_body: string | null
  wa_body: string | null
  priority: string
  quiet_hours_override: boolean
  sms_fallback_seconds: number
  dedup_window_seconds: number
  sent_30d: number
  open_rate: string | null
  created_at: string
  updated_at: string
}

export interface NotificationTemplateListResponse {
  items: NotificationTemplate[]
  total: number
}

export interface NotificationLog {
  id: string
  template_id: string | null
  template_name: string
  channel: string
  recipient: string
  status: string
  reference: string | null
  created_at: string
}

export interface NotificationLogListResponse {
  items: NotificationLog[]
  total: number
}

export interface NotificationStats {
  sent_30d: number
  delivery_rate: number
  push_opt_in: number
  avg_open_marketing: number
  total_templates: number
  live_templates: number
}

export interface BroadcastCreate {
  audience_description: string
  channel: string
  message: string
  scheduled_at?: string | null
}

export interface NotificationTemplateCreate {
  name: string
  template_code: string
  event_trigger: string
  channels: string[]
  status: string
  category: string
  push_title?: string | null
  push_body?: string | null
  sms_body?: string | null
  email_subject?: string | null
  email_body?: string | null
  wa_body?: string | null
  priority: string
  quiet_hours_override: boolean
  sms_fallback_seconds: number
  dedup_window_seconds: number
}

export interface NotificationTemplateUpdate {
  name?: string
  event_trigger?: string
  channels?: string[]
  status?: string
  category?: string
  push_title?: string | null
  push_body?: string | null
  sms_body?: string | null
  email_subject?: string | null
  email_body?: string | null
  wa_body?: string | null
  priority?: string
  quiet_hours_override?: boolean
  sms_fallback_seconds?: number
  dedup_window_seconds?: number
}

export const notificationsService = {
  getStats: () =>
    api.get<NotificationStats>('/notifications/stats').then(r => r.data),

  listTemplates: (params?: { search?: string; channel?: string; status?: string; category?: string }) =>
    api.get<NotificationTemplateListResponse>('/notifications/templates', { params }).then(r => r.data),

  getTemplate: (id: string) =>
    api.get<NotificationTemplate>(`/notifications/templates/${id}`).then(r => r.data),

  createTemplate: (body: NotificationTemplateCreate) =>
    api.post<NotificationTemplate>('/notifications/templates', body).then(r => r.data),

  updateTemplate: (id: string, body: NotificationTemplateUpdate) =>
    api.patch<NotificationTemplate>(`/notifications/templates/${id}`, body).then(r => r.data),

  deleteTemplate: (id: string) =>
    api.delete(`/notifications/templates/${id}`).then(r => r.data),

  getDeliveryLog: (page = 1, page_size = 50, reference?: string) =>
    api.get<NotificationLogListResponse>('/notifications/delivery-log', { params: { page, page_size, reference } }).then(r => r.data),

  createBroadcast: (body: BroadcastCreate) =>
    api.post('/notifications/broadcast', body).then(r => r.data),
}
