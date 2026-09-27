import { httpGet, httpPatch, httpPost } from '../../services/http/http-client'

export interface NotificationItem {
  id: number
  notificationType: string
  title: string
  content: string
  relatedEntityType: string | null
  relatedEntityId: number | null
  createdAt: string
  isRead: boolean
  readAt: string | null
}

export interface NotificationPage {
  items: NotificationItem[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

const base = '/v1/notifications'

export function getNotifications(page = 1, isRead?: boolean): Promise<NotificationPage> {
  const query = new URLSearchParams({ page: String(page), pageSize: '20' })
  if (isRead !== undefined) query.set('isRead', String(isRead))
  return httpGet<NotificationPage>(`${base}?${query}`)
}

export async function getUnreadCount(): Promise<number> {
  return (await httpGet<{ count: number }>(`${base}/unread-count`)).count
}

export function markNotificationRead(id: number): Promise<void> {
  return httpPatch<void>(`${base}/${id}/read`)
}

export function markAllNotificationsRead(): Promise<void> {
  return httpPost<void>(`${base}/read-all`)
}
