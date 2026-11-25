import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthSessionContext, type AuthSessionContextValue } from '../auth/context/auth-session-context'
import { NotificationLiveProvider, useNotificationLive } from './NotificationLiveContext'

const api = vi.hoisted(() => ({
  getUnreadCount: vi.fn(),
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}))

vi.mock('./notifications-api', () => api)

function Probe() {
  const live = useNotificationLive()
  return (
    <div>
      <output aria-label="unread">{live?.unreadCount ?? 'none'}</output>
      <output aria-label="sync">{live?.syncVersion ?? 0}</output>
    </div>
  )
}

function renderLive() {
  const auth: AuthSessionContextValue = {
    session: {
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAtUtc: '',
      refreshToken: '',
      refreshTokenExpiresAtUtc: '',
      user: { id: 12, fullName: 'Lê Hoàng Long', email: 'long@fpt.edu.vn', roles: ['STUDENT'] },
    },
    status: 'authenticated',
    error: null,
    login: async () => { throw new Error('unused') },
    logout: async () => {},
    refreshProfile: async () => {},
    restoreSession: async () => {},
  }
  return render(
    <AuthSessionContext.Provider value={auth}>
      <MemoryRouter>
        <NotificationLiveProvider>
          <Probe />
        </NotificationLiveProvider>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  )
}

beforeEach(() => {
  api.getUnreadCount.mockReset()
  api.getNotifications.mockReset()
  api.markNotificationRead.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('NotificationLiveProvider', () => {
  it('syncs unread count on window focus without reloading and shows a live toast when new notifications arrive', async () => {
    api.getUnreadCount.mockResolvedValueOnce(2).mockResolvedValueOnce(3)
    api.getNotifications.mockResolvedValueOnce({
      items: [{
        id: 99,
        notificationType: 'PROJECT_APPROVED',
        title: 'Đề cương đồ án đã được phê duyệt',
        content: 'Nhóm có thể tiến hành bước tiếp theo.',
        relatedEntityType: 'PROJECT',
        relatedEntityId: 40,
        createdAt: new Date().toISOString(),
        isRead: false,
        readAt: null,
      }],
      page: 1,
      pageSize: 1,
      totalCount: 1,
      totalPages: 1,
    })

    renderLive()
    await waitFor(() => expect(screen.getByLabelText('unread').textContent).toBe('2'))
    expect(screen.queryByLabelText('Thông báo mới đến')).toBeNull()

    fireEvent(window, new Event('focus'))
    await waitFor(() => expect(screen.getByLabelText('unread').textContent).toBe('3'))
    expect(screen.getByLabelText('sync').textContent).toBe('1')
    expect(await screen.findByLabelText('Thông báo mới đến')).toBeTruthy()
    expect(screen.getByText('Đề cương đồ án đã được phê duyệt')).toBeTruthy()
  })

  it('polls automatically while visible so unread count updates live without manual reload', async () => {
    vi.useFakeTimers()
    api.getUnreadCount.mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    api.getNotifications.mockResolvedValue({ items: [], page: 1, pageSize: 1, totalCount: 0, totalPages: 1 })

    renderLive()
    await act(async () => { await Promise.resolve() })
    expect(screen.getByLabelText('unread').textContent).toBe('1')

    await act(async () => {
      vi.advanceTimersByTime(10_500)
      await Promise.resolve()
    })
    expect(screen.getByLabelText('unread').textContent).toBe('2')
  })
})
