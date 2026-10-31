import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { ProfilePage } from './ProfilePage'
import type { AuthUser } from '../types/auth.types'
import * as authApi from '../api/auth-api'

vi.mock('../api/auth-api', () => ({ getMyProfile: vi.fn() }))

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

beforeEach(() => {
  vi.mocked(authApi.getMyProfile).mockImplementation(async () => ({
    phone: authSession.session?.user.phone ?? null,
    title: authSession.session?.user.title ?? null,
  }))
  authSession.updateProfile.mockImplementation(async (payload: { fullName: string; phone?: string | null; title?: string | null }) => ({
    ...authSession.session!.user,
    fullName: payload.fullName,
    phone: payload.phone === undefined ? authSession.session!.user.phone ?? null : payload.phone,
    title: payload.title === undefined ? authSession.session!.user.title ?? null : payload.title,
  }))
})

afterEach(() => {
  cleanup()
  authSession.session = null
  authSession.status = 'anonymous'
  authSession.error = null
  authSession.refreshProfile.mockReset()
  authSession.updateProfile.mockReset()
  vi.mocked(authApi.getMyProfile).mockReset()
})

describe('ProfilePage', () => {
  it.each([['Họ và tên', 256, 'Họ và tên tối đa 255 ký tự.'], ['Số điện thoại', 31, 'Số điện thoại tối đa 30 ký tự.'], ['Chức danh', 101, 'Chức danh tối đa 100 ký tự.']])('rejects an oversized %s without saving or discarding the input', async (label, size, message) => {
    authSession.session = { user: { id: 42, email: 'qa@example.edu.vn', fullName: 'QA Student', roles: ['STUDENT'] } }
    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))
    const input = screen.getByLabelText(String(label)) as HTMLInputElement
    fireEvent.change(input, { target: { value: '1'.repeat(Number(size)) } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
    expect(screen.getByRole('alert').textContent).toContain(message)
    expect(input.value).toHaveLength(Number(size))
    expect(authSession.updateProfile).not.toHaveBeenCalled()
  })

  it.each([400, 422])('explains a server validation response %s without blaming connectivity', async status => {
    authSession.session = { user: { id: 42, email: 'qa@example.edu.vn', fullName: 'QA Student', roles: ['STUDENT'] } }
    authSession.updateProfile.mockRejectedValueOnce(new HttpError('Validation failed', status))
    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Thông tin hồ sơ chưa hợp lệ')
    expect(screen.getByLabelText('Họ và tên')).toBeTruthy()
  })
  it('loads stored phone and title when auth session omits both fields', async () => {
    authSession.session = { user: { id: 42, email: 'staff@example.edu.vn', fullName: 'Giảng viên', roles: ['LECTURER'] } }
    vi.mocked(authApi.getMyProfile).mockResolvedValue({ phone: '0912345678', title: 'Tiến sĩ' })

    render(<ProfilePage />, { wrapper: MemoryRouter })

    expect(await screen.findByText('0912345678')).toBeDefined()
    expect(screen.getAllByText('Tiến sĩ').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }))
    expect((screen.getByLabelText('Số điện thoại') as HTMLInputElement).value).toBe('0912345678')
    expect((screen.getByLabelText('Chức danh') as HTMLInputElement).value).toBe('Tiến sĩ')
  })

  it('waits for a late profile response before mounting the edit form', async () => {
    authSession.session = { user: { id: 42, email: 'staff@example.edu.vn', fullName: 'Giảng viên', roles: ['LECTURER'] } }
    let resolveProfile!: (value: { phone: string; title: string }) => void
    vi.mocked(authApi.getMyProfile).mockReturnValue(new Promise(resolve => { resolveProfile = resolve }))

    render(<ProfilePage />, { wrapper: MemoryRouter })
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa hồ sơ' })).toBeNull()
    resolveProfile({ phone: '0900000000', title: 'Giảng viên chính' })
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))
    expect((screen.getByLabelText('Số điện thoại') as HTMLInputElement).value).toBe('0900000000')
    expect((screen.getByLabelText('Chức danh') as HTMLInputElement).value).toBe('Giảng viên chính')
  })

  it('shows a recoverable profile read error instead of empty fields', async () => {
    authSession.session = { user: { id: 42, email: 'staff@example.edu.vn', fullName: 'Giảng viên', roles: ['LECTURER'] } }
    vi.mocked(authApi.getMyProfile)
      .mockRejectedValueOnce(new HttpError('Forbidden', 403))
      .mockResolvedValueOnce({ phone: '0900000000', title: 'Tiến sĩ' })

    render(<ProfilePage />, { wrapper: MemoryRouter })
    expect((await screen.findByRole('alert')).textContent).toContain('không có quyền')
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa hồ sơ' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại tải hồ sơ' }))
    expect(await screen.findByText('0900000000')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' })).toBeDefined()
  })

  it('retains edited input when a profile refresh fails and is retried', async () => {
    authSession.session = { user: { id: 42, email: 'staff@example.edu.vn', fullName: 'Giảng viên', roles: ['LECTURER'] } }
    vi.mocked(authApi.getMyProfile)
      .mockResolvedValueOnce({ phone: '0900000000', title: 'Tiến sĩ' })
      .mockRejectedValueOnce(new HttpError('Unavailable', 503))
      .mockResolvedValueOnce({ phone: '0900000000', title: 'Tiến sĩ' })

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))
    const phone = screen.getByLabelText('Số điện thoại') as HTMLInputElement
    fireEvent.change(phone, { target: { value: '0988888888' } })
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới hồ sơ' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Không thể kết nối dịch vụ hồ sơ')
    expect(phone.value).toBe('0988888888')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại tải hồ sơ' }))
    await waitFor(() => expect(authApi.getMyProfile).toHaveBeenCalledTimes(3))
    expect(phone.value).toBe('0988888888')
  })

  it('keeps stored fields visible after clicking Refresh even when auth session lacks them', async () => {
    authSession.session = { user: { id: 42, email: 'staff@example.edu.vn', fullName: 'Giảng viên', roles: ['LECTURER'] } }
    vi.mocked(authApi.getMyProfile).mockResolvedValue({ phone: '0900000000', title: 'Tiến sĩ' })

    render(<ProfilePage />, { wrapper: MemoryRouter })
    expect(await screen.findByText('0900000000')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới hồ sơ' }))
    await waitFor(() => expect(authApi.getMyProfile).toHaveBeenCalledTimes(2))
    expect(screen.getByText('0900000000')).toBeDefined()
    expect(screen.getAllByText('Tiến sĩ').length).toBeGreaterThan(0)
  })

  it('uses the returned server fields after saving rather than the submitted title', async () => {
    authSession.session = { user: { id: 42, email: 'staff@example.edu.vn', fullName: 'Giảng viên', roles: ['LECTURER'] } }
    vi.mocked(authApi.getMyProfile).mockResolvedValue({ phone: '0900000000', title: 'Giảng viên' })
    authSession.updateProfile.mockResolvedValueOnce({ ...authSession.session.user, phone: '0911111111', title: 'Tiến sĩ' })

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))
    fireEvent.change(screen.getByLabelText('Chức danh'), { target: { value: 'Giá trị nhập' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    expect(await screen.findByText('0911111111')).toBeDefined()
    expect(screen.getAllByText('Tiến sĩ').length).toBeGreaterThan(0)
    expect(screen.queryByText('Giá trị nhập')).toBeNull()
  })

  it('does not let an older in-flight profile read overwrite a successful save', async () => {
    authSession.session = { user: { id: 42, email: 'staff@example.edu.vn', fullName: 'Giảng viên', roles: ['LECTURER'] } }
    let resolveStale!: (value: { phone: string; title: string }) => void
    vi.mocked(authApi.getMyProfile)
      .mockResolvedValueOnce({ phone: '0900000000', title: 'Giảng viên' })
      .mockReturnValueOnce(new Promise(resolve => { resolveStale = resolve }))
    authSession.updateProfile.mockResolvedValueOnce({ ...authSession.session.user, phone: '0911111111', title: 'Tiến sĩ' })

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới hồ sơ' }))
    await waitFor(() => expect(authApi.getMyProfile).toHaveBeenCalledTimes(2))
    fireEvent.change(screen.getByLabelText('Chức danh'), { target: { value: 'Tiến sĩ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
    expect(await screen.findByText('0911111111')).toBeDefined()
    resolveStale({ phone: '0900000000', title: 'Giảng viên' })
    await waitFor(() => expect(screen.getByText('0911111111')).toBeDefined())
    expect(screen.queryByText('0900000000')).toBeNull()
  })

  it('keeps an explicitly cleared title empty after a fresh server read', async () => {
    authSession.session = { user: { id: 42, email: 'staff@example.edu.vn', fullName: 'Giảng viên', roles: ['LECTURER'] } }
    vi.mocked(authApi.getMyProfile)
      .mockResolvedValueOnce({ phone: '0900000000', title: 'Tiến sĩ' })
      .mockResolvedValueOnce({ phone: '0900000000', title: null })
    authSession.updateProfile.mockResolvedValueOnce({ ...authSession.session.user, phone: '0900000000', title: null })

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))
    fireEvent.change(screen.getByLabelText('Chức danh'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
    await screen.findByText('Đã cập nhật hồ sơ của bạn.')
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới hồ sơ' }))
    await waitFor(() => expect(authApi.getMyProfile).toHaveBeenCalledTimes(2))
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))
    expect((screen.getByLabelText('Chức danh') as HTMLInputElement).value).toBe('')
    expect(screen.queryByText('Tiến sĩ')).toBeNull()
  })

  it('shows blank optional fields for a profile that is genuinely empty', async () => {
    authSession.session = { user: { id: 42, email: 'staff@example.edu.vn', fullName: 'Sinh viên', roles: ['STUDENT'] } }
    vi.mocked(authApi.getMyProfile).mockResolvedValue({ phone: null, title: null })

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))
    expect((screen.getByLabelText('Số điện thoại') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Chức danh') as HTMLInputElement).value).toBe('')
    expect(screen.queryByText('undefined')).toBeNull()
  })
  it('shows an explicit sign-in state without a session', () => {
    render(<ProfilePage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Cần đăng nhập để xem hồ sơ')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Mở trang đăng nhập' })).toBeDefined()
  })

  it('renders only server-returned user identity and roles, including title and phone', async () => {
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
    expect((await screen.findAllByText('Trưởng bộ môn')).length).toBeGreaterThan(0)
    expect(screen.getByText('0901234567')).toBeDefined()
  })

  it('keeps a recoverable error distinct from the signed-out state', async () => {
    authSession.session = {
      user: { id: 42, email: 'staff@example.edu.vn', fullName: 'Department Staff', roles: [] },
    }
    authSession.status = 'authenticated'
    authSession.error = new HttpError('Forbidden', 403)

    render(<ProfilePage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Department Staff')).toBeDefined()
    expect(screen.getByRole('alert').textContent).toContain('không có quyền xem hồ sơ')
    expect(await screen.findByRole('button', { name: 'Làm mới hồ sơ' })).toBeDefined()
  })

  it('prefills phone and title in edit form from the profile read', async () => {
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
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

    const nameInput = screen.getByLabelText('Họ và tên') as HTMLInputElement
    const phoneInput = screen.getByLabelText('Số điện thoại') as HTMLInputElement
    const titleInput = screen.getByLabelText('Chức danh') as HTMLInputElement

    expect(nameInput.value).toBe('Department Staff')
    expect(phoneInput.value).toBe('0988776655')
    expect(titleInput.value).toBe('Giảng viên chính')
  })

  it('omits cached title and phone when user only updates fullName', async () => {
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

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

    const nameInput = screen.getByLabelText('Họ và tên')
    fireEvent.change(nameInput, { target: { value: 'New Name' } })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    expect(authSession.updateProfile).toHaveBeenCalledWith({
      fullName: 'New Name',
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

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

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

    render(<ProfilePage />, { wrapper: MemoryRouter })
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

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
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

    const titleInput = screen.getByLabelText('Chức danh') as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Phó giáo sư' } })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    // Error alert is rendered
    expect(await screen.findByRole('alert')).toBeDefined()
    expect(screen.getByRole('alert').textContent).toContain('không có quyền')

    // Form remains open and user-typed input is not lost
    expect((screen.getByLabelText('Chức danh') as HTMLInputElement).value).toBe('Phó giáo sư')
  })

  it('validates empty fullName with an alert and prevents submission', async () => {
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
    fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }))

    const nameInput = screen.getByLabelText('Họ và tên')
    fireEvent.change(nameInput, { target: { value: '   ' } })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    expect(screen.getByRole('alert').textContent).toContain('Họ và tên không được để trống')
    expect(authSession.updateProfile).not.toHaveBeenCalled()
  })
})
