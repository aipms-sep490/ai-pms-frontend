import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthSessionContext, type AuthSessionContextValue } from '../auth/context/auth-session-context'
import { NotificationRow } from './NotificationRow'
import type { NotificationItem } from './notifications-api'

afterEach(cleanup)

describe('NotificationRow (FUNC-10)', () => {
  const auth = {
    session: { user: { id: 1, roles: ['STUDENT'] } },
  } as unknown as AuthSessionContextValue

  const baseItem: NotificationItem = {
    id: 10,
    notificationType: 'TEAM_INVITATION_SENT',
    title: 'Lời mời',
    content: 'Bạn nhận được lời mời',
    relatedEntityType: 'TEAM',
    relatedEntityId: 5,
    createdAt: '2026-10-25T10:00:00Z',
    isRead: false,
    readAt: null,
  }

  it('calls onRead when clicking the deep action link for an unread notification', () => {
    const onRead = vi.fn()
    render(
      <MemoryRouter>
        <AuthSessionContext.Provider value={auth}>
          <ul>
            <NotificationRow item={baseItem} busy={false} onRead={onRead} />
          </ul>
        </AuthSessionContext.Provider>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Xem lời mời nhóm' })
    expect(link.getAttribute('href')).toBe('/team')

    fireEvent.click(link)
    expect(onRead).toHaveBeenCalledTimes(1)
  })

  it('does not call onRead on link click if item is already read', () => {
    const onRead = vi.fn()
    render(
      <MemoryRouter>
        <AuthSessionContext.Provider value={auth}>
          <ul>
            <NotificationRow item={{ ...baseItem, isRead: true }} busy={false} onRead={onRead} />
          </ul>
        </AuthSessionContext.Provider>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Xem lời mời nhóm' })
    fireEvent.click(link)
    expect(onRead).not.toHaveBeenCalled()
  })

  it('resiliently handles onRead errors without crashing the link click', () => {
    const onRead = vi.fn(() => {
      throw new Error('Network error on mark-read')
    })
    render(
      <MemoryRouter>
        <AuthSessionContext.Provider value={auth}>
          <ul>
            <NotificationRow item={baseItem} busy={false} onRead={onRead} />
          </ul>
        </AuthSessionContext.Provider>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Xem lời mời nhóm' })
    expect(() => fireEvent.click(link)).not.toThrow()
    expect(onRead).toHaveBeenCalledTimes(1)
  })
})
