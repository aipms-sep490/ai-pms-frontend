import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../services/http/http-client'
import { NotificationsPage } from './NotificationsPage'

const api = vi.hoisted(() => ({ getNotifications: vi.fn(), getUnreadCount: vi.fn(), markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn() }))
vi.mock('./notifications-api', () => api)

const unread = { id: 5, notificationType: 'PROJECT_UPDATED', title: 'Đồ án đã đổi trạng thái', content: 'Kiểm tra đồ án.', relatedEntityType: 'PROJECT', relatedEntityId: 9, createdAt: '2026-09-27T10:00:00Z', isRead: false, readAt: null }
const page = { items: [unread], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 }

describe('NotificationsPage', () => {
  beforeEach(() => {
    api.getUnreadCount.mockResolvedValue(1)
    api.getNotifications.mockResolvedValue(page)
    api.markNotificationRead.mockResolvedValue(undefined)
    api.markAllNotificationsRead.mockResolvedValue(undefined)
  })
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('renders backend notifications and refreshes after reading one', async () => {
    render(<NotificationsPage />)
    expect(await screen.findByRole('heading', { name: unread.title })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã đọc' }))
    await waitFor(() => expect(api.markNotificationRead).toHaveBeenCalledWith(5))
    expect(api.getNotifications).toHaveBeenCalledWith(1, undefined)
  })

  it('uses the unread filter contract', async () => {
    render(<NotificationsPage />)
    await screen.findByText(unread.content)
    fireEvent.click(screen.getByRole('button', { name: 'Chưa đọc' }))
    await waitFor(() => expect(api.getNotifications).toHaveBeenCalledWith(1, false))
  })

  it('announces access failures from the backend', async () => {
    api.getNotifications.mockRejectedValue(new HttpError('forbidden', 403))
    render(<NotificationsPage />)
    expect((await screen.findByRole('alert')).textContent).toContain('Bạn không có quyền xem hộp thông báo này.')
  })

  it('keeps the unread item visible when marking it fails', async () => {
    api.markNotificationRead.mockRejectedValueOnce(new Error('network'))
    render(<NotificationsPage />)
    await screen.findByRole('heading', { name: unread.title })
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã đọc' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Không thể cập nhật thông báo')
    expect(screen.getByRole('heading', { name: unread.title })).toBeTruthy()
  })

  it('does not show an empty state when loading fails', async () => {
    api.getNotifications.mockRejectedValueOnce(new Error('network'))
    render(<NotificationsPage />)
    await screen.findByRole('alert')
    expect(screen.queryByRole('heading', { name: 'Chưa có thông báo' })).toBeNull()
  })
})
