import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { ProfilePage } from './ProfilePage'

const authSession = vi.hoisted(() => ({
  session: null as { user: { id: number; email: string; fullName: string; roles: string[] } } | null,
  status: 'anonymous',
  error: null as Error | null,
  refreshProfile: vi.fn(),
}))

vi.mock('../context/useAuthSession', () => ({
  useAuthSession: () => authSession,
}))

afterEach(() => {
  cleanup()
  authSession.session = null
  authSession.status = 'anonymous'
  authSession.error = null
  authSession.refreshProfile.mockReset()
})

describe('ProfilePage', () => {
  it('shows an explicit sign-in state without a session', () => {
    render(<ProfilePage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Cần đăng nhập để xem hồ sơ')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Mở trang đăng nhập' })).toBeDefined()
  })

  it('renders only server-returned user identity and roles', () => {
    authSession.session = {
      user: { id: 42, email: 'staff@example.edu.vn', fullName: 'Department Staff', roles: ['DEPARTMENT_STAFF'] },
    }
    authSession.status = 'authenticated'

    render(<ProfilePage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Department Staff')).toBeDefined()
    expect(screen.getByText('#42')).toBeDefined()
    expect(screen.getByText('DEPARTMENT_STAFF')).toBeDefined()
  })

  it('keeps a recoverable error distinct from the signed-out state', () => {
    authSession.session = {
      user: { id: 42, email: 'staff@example.edu.vn', fullName: 'Department Staff', roles: [] },
    }
    authSession.status = 'authenticated'
    authSession.error = new HttpError('Forbidden', 403)

    render(<ProfilePage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Department Staff')).toBeDefined()
    expect(screen.getByRole('alert').textContent).toContain('không có quyền xem hồ sơ')
    expect(screen.getByRole('button', { name: 'Làm mới hồ sơ' })).toBeDefined()
  })
})
