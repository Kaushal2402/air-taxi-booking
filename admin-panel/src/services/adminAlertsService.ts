import api from '../lib/axios'

export interface AlertItem {
  id: string
  category: 'booking' | 'driver' | 'operator' | 'dispute' | 'sos' | 'system'
  title: string
  body?: string
  href?: string
  is_read: boolean
  created_at: string
}

export interface AlertListResponse {
  items: AlertItem[]
  total: number
  unread: number
}

export const adminAlertsService = {
  list: (page: number, pageSize = 20) =>
    api.get<AlertListResponse>('/admin-alerts', { params: { page, page_size: pageSize } }).then(r => r.data),

  unreadCount: () =>
    api.get<{ unread: number }>('/admin-alerts/unread-count').then(r => r.data.unread),

  markRead: (id: string) =>
    api.post<AlertItem>(`/admin-alerts/${id}/read`).then(r => r.data),

  markAllRead: () =>
    api.post('/admin-alerts/read-all'),
}
