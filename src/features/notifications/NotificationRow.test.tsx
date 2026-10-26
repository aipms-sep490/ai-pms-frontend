import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthSessionContext, type AuthSessionContextValue } from '../auth/context/auth-session-context'
import type { NotificationItem } from './notifications-api'
import { NotificationRow } from './NotificationRow'

const invitation: NotificationItem = { id: 7, notificationType: 'TEAM_INVITATION_SENT', title: 'Invitation', content: '',
  relatedEntityType: 'TEAM_INVITATION', relatedEntityId: 13, createdAt: '2026-10-27T00:00:00Z', isRead: false, readAt: null }
const auth = { session: { user: { id: 1, roles: ['STUDENT'] } } } as unknown as AuthSessionContextValue
function Location() { return <output aria-label="Đường dẫn hiện tại">{useLocation().pathname}</output> }
function row(onRead: () => void | Promise<void>, item = invitation, onNavigate = vi.fn()) {
  render(<MemoryRouter initialEntries={['/notifications']}><AuthSessionContext.Provider value={auth}>
    <ul><NotificationRow item={item} busy={false} onRead={onRead} onNavigate={onNavigate} /></ul><Location />
  </AuthSessionContext.Provider></MemoryRouter>)
  return onNavigate
}
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('opening a notification destination', () => {
  it('awaits mark-read before navigation and does not send the same read twice while pending', async () => {
    let finish!: () => void
    const onRead = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
    const onNavigate = row(onRead)
    const link = screen.getByRole('link', { name: 'Mở nhóm và lời mời' })
    fireEvent.click(link); fireEvent.click(link)
    expect(onRead).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Đường dẫn hiện tại').textContent).toBe('/notifications')
    finish()
    await waitFor(() => expect(screen.getByLabelText('Đường dẫn hiện tại').textContent).toBe('/team'))
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
  it('still navigates after a failed read and logs no server/private data', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    row(vi.fn().mockRejectedValue(new Error('PRIVATE_SERVER_DETAIL')))
    fireEvent.click(screen.getByRole('link', { name: 'Mở nhóm và lời mời' }))
    await waitFor(() => expect(screen.getByLabelText('Đường dẫn hiện tại').textContent).toBe('/team'))
    expect(warn).toHaveBeenCalledExactlyOnceWith('[notifications] Could not mark notification as read.')
  })
  it('does not write again for an already-read notification', async () => {
    const onRead = vi.fn()
    row(onRead, { ...invitation, isRead: true })
    fireEvent.click(screen.getByRole('link', { name: 'Mở nhóm và lời mời' }))
    await waitFor(() => expect(screen.getByLabelText('Đường dẫn hiện tại').textContent).toBe('/team'))
    expect(onRead).not.toHaveBeenCalled()
  })
  it('retains the separate mark-read action and keeps a missing destination as plain text', async () => {
    const onRead = vi.fn()
    row(onRead, { ...invitation, notificationType: 'FUTURE_EVENT' })
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByRole('heading').tagName).toBe('H2')
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã đọc' }))
    await waitFor(() => expect(onRead).toHaveBeenCalledTimes(1))
    expect(screen.getByLabelText('Đường dẫn hiện tại').textContent).toBe('/notifications')
  })
})
