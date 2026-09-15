import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { LoginPage } from './LoginPage'

const authSession = vi.hoisted(() => ({
  login: vi.fn(),
  status: 'unauthenticated',
}))

vi.mock('../context/useAuthSession', () => ({
  useAuthSession: () => authSession,
}))

afterEach(() => {
  cleanup()
  authSession.login.mockReset()
  authSession.status = 'unauthenticated'
})

describe('LoginPage', () => {
  it('blocks an invalid email before invoking the API', () => {
    render(<LoginPage />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invalid' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(screen.getByRole('alert').textContent).toContain('Nhập địa chỉ email hợp lệ')
    expect(authSession.login).not.toHaveBeenCalled()
  })

  it('submits valid credentials through the session adapter', async () => {
    authSession.login.mockResolvedValue({ user: { roles: ['DEPARTMENT_STAFF'] } })
    render(<LoginPage />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'staff@example.edu.vn' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'secret' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Đăng nhập' }))

    await vi.waitFor(() => {
      expect(authSession.login).toHaveBeenCalledWith({ email: 'staff@example.edu.vn', password: 'secret' })
    })
  })

  it('distinguishes an unauthorized response from a network failure', async () => {
    authSession.login.mockRejectedValue(new HttpError('Unauthorized', 401))
    render(<LoginPage />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'staff@example.edu.vn' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'wrong-password' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Đăng nhập' }))

    await vi.waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Email hoặc mật khẩu không chính xác')
    })
  })

  it('distinguishes validation, forbidden, and system errors', async () => {
    authSession.login.mockRejectedValueOnce(new HttpError('Invalid input', 400))
    const { rerender } = render(<LoginPage />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'staff@example.edu.vn' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Đăng nhập' }))
    await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Thông tin đăng nhập chưa hợp lệ'))

    authSession.login.mockRejectedValueOnce(new HttpError('Disabled', 403))
    rerender(<LoginPage />)
    fireEvent.submit(screen.getByRole('button', { name: 'Đăng nhập' }))
    await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Tài khoản chưa hoạt động'))

    authSession.login.mockRejectedValueOnce(new Error('offline'))
    rerender(<LoginPage />)
    fireEvent.submit(screen.getByRole('button', { name: 'Đăng nhập' }))
    await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Không thể kết nối dịch vụ xác thực'))
  })

  it('sends a successful login to the role-specific workspace', async () => {
    authSession.login.mockResolvedValue({ user: { roles: ['STUDENT'] } })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/project/overview" element={<p>student workspace</p>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'staff@example.edu.vn' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'secret' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Đăng nhập' }))

    await vi.waitFor(() => expect(screen.getByText('student workspace')).toBeDefined())
  })
})
