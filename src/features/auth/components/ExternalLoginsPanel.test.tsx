import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ExternalLoginsPanel } from './ExternalLoginsPanel'
const api = vi.hoisted(() => ({ getExternalLogins: vi.fn(), unlinkGoogle: vi.fn() }))
vi.mock('../api/auth-api', () => api)
vi.mock('./GoogleLoginButton', () => ({ GoogleLoginButton: () => <span>Google xác nhận liên kết</span> }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('does not assume an account is unlinked when loading fails', async () => {
  api.getExternalLogins.mockRejectedValue(new Error('network'))
  render(<ExternalLoginsPanel />)
  await screen.findByRole('alert')
  expect(screen.queryByRole('button', { name: 'Liên kết Google' })).toBeNull()
  expect(screen.queryByLabelText('Mật khẩu hiện tại')).toBeNull()
})
it('requires password and confirmation before unlinking', async () => {
  api.getExternalLogins.mockResolvedValue([{ provider: 'Google', email: 'an@example.test' }]); api.unlinkGoogle.mockResolvedValue(undefined)
  render(<ExternalLoginsPanel />)
  const button = await screen.findByRole('button', { name: 'Gỡ liên kết Google' })
  expect((button as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('Mật khẩu hiện tại'), { target: { value: 'test-password' } })
  fireEvent.click(button)
  expect(api.unlinkGoogle).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Gỡ liên kết' }))
  await waitFor(() => expect(api.unlinkGoogle).toHaveBeenCalledWith('test-password'))
})
