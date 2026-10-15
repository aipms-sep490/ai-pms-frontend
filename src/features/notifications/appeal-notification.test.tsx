import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AuthSessionContext, type AuthSessionContextValue } from '../auth/context/auth-session-context'
import { NotificationRow } from './NotificationRow'
vi.mock('../../app/config/env', () => ({ env: { resultCorrectionEnabled: true } }))
afterEach(cleanup)
it.each([
  [['STUDENT'], '/project/result'],
  [['DEPARTMENT_STAFF'], '/review/projects/9/corrections'],
  [['LECTURER'], '/review/projects/9/corrections'],
] as const)('routes appeal notifications for %j to the scoped screen', (roles, path) => {
  const auth = { session: { user: { id: 1, roles } } } as unknown as AuthSessionContextValue
  const item = { id: 4, notificationType: 'APPEAL_REVIEWER_ASSIGNED', title: 'Review', content: '', relatedEntityType: 'PROJECT', relatedEntityId: 9, createdAt: '2026-10-15T00:00:00Z', isRead: true, readAt: null }
  render(<MemoryRouter><AuthSessionContext.Provider value={auth}><ul><NotificationRow item={item} busy={false} onRead={() => {}} /></ul></AuthSessionContext.Provider></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Xem yêu cầu phúc khảo' }).getAttribute('href')).toBe(path)
})
