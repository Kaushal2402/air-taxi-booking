import api from '../lib/axios'

export type NotificationType = 'request' | 'assignment' | 'expiry' | 'payout' | 'cancel' | 'announcement'

export interface OperatorNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  link_path: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationChannel {
  email: boolean
  sms: boolean
  in_app: boolean
}

export interface NotificationPrefRow {
  event_type: string
  channels: NotificationChannel
}

export interface NotificationPrefs {
  preferences: NotificationPrefRow[]
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

export const operatorNotificationCenterService = {
  list: (unreadOnly?: boolean) => {
    const params = unreadOnly ? { unread: true } : {}
    return api
      .get<OperatorNotification[]>('/operator/notification-center', { params })
      .then(r => r.data)
  },

  markRead: (id: string) =>
    api
      .patch<OperatorNotification>(`/operator/notification-center/${id}/read`)
      .then(r => r.data),

  markAllRead: () =>
    api
      .post<{ updated: number }>('/operator/notification-center/mark-all-read')
      .then(r => r.data),

  getPreferences: () =>
    api
      .get<NotificationPrefs>('/operator/notification-center/preferences')
      .then(r => r.data),

  updatePreferences: (prefs: NotificationPrefs) =>
    api
      .put<NotificationPrefs>('/operator/notification-center/preferences', prefs)
      .then(r => r.data),
}
