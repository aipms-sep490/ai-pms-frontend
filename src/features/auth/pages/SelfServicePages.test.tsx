import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { ForgotPasswordPage, ProfileSecurityPage, ResetPasswordPage } from './SelfServicePages'

const authApi = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  changePassword: vi.fn(),
}))
const authSession = vi.hoisted(() => ({
  session: { accessToken: 'access-token', user: { id: 1, roles: ['STUDENT'] } },
  logout: vi.fn(),
}))

vi.mock('../api/auth-api', () => authApi)
vi.mock('../context/useAuthSession', () => ({ useAuthSession: () => authSession }))

beforeEach(() => {
  authApi.requestPasswordReset.mockReset()
  authApi.resetPassword.mockReset()
  authApi.changePassword.mockReset()
  authSession.logout.mockReset()
  authSession.logout.mockResolvedValue(undefined)
})
afterEach(cleanup)

describe('password self-service pages', () => {
  it('accepts a recovery request without claiming that an email was delivered', async () => {
    authApi.requestPasswordReset.mockResolvedValue({ message: 'Accepted' })
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' student@example.edu.vn ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }))

    await waitFor(() => expect(authApi.requestPasswordReset).toHaveBeenCalledWith('student@example.edu.vn'))
    expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringContaining('Yêu cầu đã được tiếp nhận'))
    expect(screen.queryByRole('button', { name: 'Gửi liên kết đặt lại' })).toBeNull()
  })

  it('reports an email service outage without presenting success', async () => {
    authApi.requestPasswordReset.mockRejectedValue(new HttpError('Unavailable', 503))
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@example.edu.vn' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Dịch vụ email hiện chưa sẵn sàng')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('rejects a missing reset token and offers a fresh link', () => {
    render(<MemoryRouter initialEntries={['/reset-password']}><ResetPasswordPage /></MemoryRouter>)

    expect(screen.queryByRole('button', { name: 'Đặt lại mật khẩu' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Yêu cầu liên kết mới' }).getAttribute('href')).toBe('/forgot-password')
  })

  it('submits a valid reset token once and directs the user to sign in', async () => {
    authApi.resetPassword.mockResolvedValue(undefined)
    render(<MemoryRouter initialEntries={['/reset-password?token=one-time-token']}><ResetPasswordPage /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'NewPassword@123' } })
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'NewPassword@123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))

    await waitFor(() => expect(authApi.resetPassword).toHaveBeenCalledWith('one-time-token', 'NewPassword@123'))
    expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringContaining('Mật khẩu đã được đặt lại'))
    expect(screen.queryByRole('button', { name: 'Đặt lại mật khẩu' })).toBeNull()
  })

  it('clears the revoked session and returns to login after a password change', async () => {
    authApi.changePassword.mockResolvedValue(undefined)
    render(<MemoryRouter initialEntries={['/profile/security']}><Routes>
      <Route path="/profile/security" element={<ProfileSecurityPage />} />
      <Route path="/login" element={<p>Trang đăng nhập</p>} />
    </Routes></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('Mật khẩu hiện tại'), { target: { value: 'OldPassword@123' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'NewPassword@123' } })
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'NewPassword@123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }))

    await waitFor(() => expect(authApi.changePassword).toHaveBeenCalledWith('OldPassword@123', 'NewPassword@123'))
    expect(authSession.logout).toHaveBeenCalledOnce()
    expect(await screen.findByText('Trang đăng nhập')).toBeDefined()
  })
})
