import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { ProfilePage } from './ProfilePage'

const authSession = vi.hoisted(() => ({
  session: null as { user: { id: number; email: string; fullName: string; roles: string[]; title?: string | null; phone?: string | null } } | null,
  status: 'anonymous',
  error: null as Error | null,
  refreshProfile: vi.fn(),
  updateProfile: vi.fn(),
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
  authSession.updateProfile.mockReset()
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
    expect(screen.getByText('Cán bộ bộ môn')).toBeDefined()
  })

  it('renders title and phone in summary grid when present', () => {
    authSession.session = {
      user: {
        id: 42,
        email: 'staff@example.edu.vn',
        fullName: 'Dr. Nguyen Van A',
        roles: ['LECTURER'],
        title: 'Associate Professor',
        phone: '0901234567',
      },
    }
    authSession.status = 'authenticated'

    render(<ProfilePage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Associate Professor')).toBeDefined()
    expect(screen.getByText('0901234567')).toBeDefined()
  })

  it('prefills title and phone in edit form and submits updated profile', async () => {
    authSession.session = {
      user: {
        id: 42,
        email: 'staff@example.edu.vn',
        fullName: 'Dr. Nguyen Van A',
        roles: ['LECTURER'],
        title: 'Associate Professor',
        phone: '0901234567',
      },
    }
    authSession.status = 'authenticated'
    authSession.updateProfile.mockResolvedValue(undefined)

    render(<ProfilePage />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

    const nameInput = screen.getByLabelText('Họ và tên') as HTMLInputElement
    const phoneInput = screen.getByLabelText('Số điện thoại') as HTMLInputElement
    const titleInput = screen.getByLabelText('Chức danh') as HTMLInputElement

    expect(nameInput.value).toBe('Dr. Nguyen Van A')
    expect(phoneInput.value).toBe('0901234567')
    expect(titleInput.value).toBe('Associate Professor')

    fireEvent.change(phoneInput, { target: { value: '0987654321' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    expect(authSession.updateProfile).toHaveBeenCalledWith({
      fullName: 'Dr. Nguyen Van A',
      phone: '0987654321',
      title: 'Associate Professor',
    })
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
