import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { LoginPage } from './LoginPage'

const authSession = vi.hoisted(() => ({
  login: vi.fn(),
  status: 'anonymous',
}))

vi.mock('../context/useAuthSession', () => ({
  useAuthSession: () => authSession,
}))

afterEach(() => {
  cleanup()
  authSession.login.mockReset()
  authSession.status = 'anonymous'
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
    authSession.login.mockResolvedValue(undefined)
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
})
