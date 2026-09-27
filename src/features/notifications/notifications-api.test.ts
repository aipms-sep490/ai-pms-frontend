import { afterEach, describe, expect, it, vi } from 'vitest'
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead } from './notifications-api'

const response = (body: unknown = {}) => ({ ok: true, status: 200, json: async () => body })

describe('notifications API contract', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses the backend-owned listing and read endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ count: 2 }))
    vi.stubGlobal('fetch', fetchMock)
    await getNotifications(2, false)
    await getUnreadCount()
    await markNotificationRead(8)
    await markAllNotificationsRead()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/notifications?page=2&pageSize=20&isRead=false', expect.objectContaining({ method: 'GET' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/notifications/unread-count', expect.objectContaining({ method: 'GET' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/notifications/8/read', expect.objectContaining({ method: 'PATCH' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/notifications/read-all', expect.objectContaining({ method: 'POST' }))
  })
})
