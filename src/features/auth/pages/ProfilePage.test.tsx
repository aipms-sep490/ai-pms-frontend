import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { ProfilePage } from './ProfilePage'
import type { AuthUser } from '../types/auth.types'

const authSession = vi.hoisted(() => ({
  session: null as { user: AuthUser } | null,
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

  it('renders only server-returned user identity and roles, including title and phone', () => {
    authSession.session = {
      user: {
        id: 42,
        email: 'staff@example.edu.vn',
        fullName: 'Department Staff',
        roles: ['DEPARTMENT_STAFF'],
        title: 'Trưởng bộ môn',
        phone: '0901234567',
      },
    }
    authSession.status = 'authenticated'

    render(<ProfilePage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Department Staff')).toBeDefined()
    expect(screen.getByText('#42')).toBeDefined()
    expect(screen.getByText('Cán bộ bộ môn')).toBeDefined()
    expect(screen.getAllByText('Trưởng bộ môn').length).toBeGreaterThan(0)
    expect(screen.getByText('0901234567')).toBeDefined()
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

  it('prefills phone and title in edit form from session', () => {
    authSession.session = {
      user: {
        id: 42,
        email: 'staff@example.edu.vn',
        fullName: 'Department Staff',
        roles: ['LECTURER'],
        title: 'Giảng viên chính',
        phone: '0988776655',
      },
    }
    authSession.status = 'authenticated'

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

    const nameInput = screen.getByLabelText('Họ và tên') as HTMLInputElement
    const phoneInput = screen.getByLabelText('Số điện thoại') as HTMLInputElement
    const titleInput = screen.getByLabelText('Chức danh') as HTMLInputElement

    expect(nameInput.value).toBe('Department Staff')
    expect(phoneInput.value).toBe('0988776655')
    expect(titleInput.value).toBe('Giảng viên chính')
  })

  it('preserves unedited title and phone when user only updates fullName', async () => {
    authSession.session = {
      user: {
        id: 42,
        email: 'staff@example.edu.vn',
        fullName: 'Old Name',
        roles: ['LECTURER'],
        title: 'Giảng viên',
        phone: '0912345678',
      },
    }
    authSession.status = 'authenticated'
    authSession.updateProfile.mockResolvedValueOnce(undefined)

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

    const nameInput = screen.getByLabelText('Họ và tên')
    fireEvent.change(nameInput, { target: { value: 'New Name' } })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    expect(authSession.updateProfile).toHaveBeenCalledWith({
      fullName: 'New Name',
      title: 'Giảng viên',
      phone: '0912345678',
    })
  })

  it('omits title and phone when session did not have them and user did not edit them', async () => {
    authSession.session = {
      user: {
        id: 42,
        email: 'student@example.edu.vn',
        fullName: 'Nguyễn Văn A',
        roles: ['STUDENT'],
      },
    }
    authSession.status = 'authenticated'
    authSession.updateProfile.mockResolvedValueOnce(undefined)

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

    const nameInput = screen.getByLabelText('Họ và tên')
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn B' } })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    expect(authSession.updateProfile).toHaveBeenCalledWith({
      fullName: 'Nguyễn Văn B',
    })
  })

  it('sends explicit null when user intentionally clears title and phone', async () => {
    authSession.session = {
      user: {
        id: 42,
        email: 'staff@example.edu.vn',
        fullName: 'Lecturer',
        roles: ['LECTURER'],
        title: 'Thạc sĩ',
        phone: '0900000000',
      },
    }
    authSession.status = 'authenticated'
    authSession.updateProfile.mockResolvedValueOnce(undefined)

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

    const titleInput = screen.getByLabelText('Chức danh')
    const phoneInput = screen.getByLabelText('Số điện thoại')

    fireEvent.change(titleInput, { target: { value: '   ' } })
    fireEvent.change(phoneInput, { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    expect(authSession.updateProfile).toHaveBeenCalledWith({
      fullName: 'Lecturer',
      title: null,
      phone: null,
    })
  })

  it('preserves user input and shows error alert when update fails', async () => {
    authSession.session = {
      user: {
        id: 42,
        email: 'staff@example.edu.vn',
        fullName: 'Current Name',
        roles: ['LECTURER'],
        title: 'Giảng viên',
      },
    }
    authSession.status = 'authenticated'
    authSession.updateProfile.mockRejectedValueOnce(new HttpError('Forbidden', 403))

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

    const titleInput = screen.getByLabelText('Chức danh') as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Phó giáo sư' } })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    // Error alert is rendered
    expect(await screen.findByRole('alert')).toBeDefined()
    expect(screen.getByRole('alert').textContent).toContain('không có quyền')

    // Form remains open and user-typed input is not lost
    expect((screen.getByLabelText('Chức danh') as HTMLInputElement).value).toBe('Phó giáo sư')
  })

  it('validates empty fullName with an alert and prevents submission', () => {
    authSession.session = {
      user: {
        id: 42,
        email: 'staff@example.edu.vn',
        fullName: 'Valid Name',
        roles: ['STUDENT'],
      },
    }
    authSession.status = 'authenticated'

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

    const nameInput = screen.getByLabelText('Họ và tên')
    fireEvent.change(nameInput, { target: { value: '   ' } })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    expect(screen.getByRole('alert').textContent).toContain('Họ và tên không được để trống')
    expect(authSession.updateProfile).not.toHaveBeenCalled()
  })
})
