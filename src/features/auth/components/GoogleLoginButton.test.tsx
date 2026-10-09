import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { GoogleLoginButton } from './GoogleLoginButton'
import { HttpError } from '../../../services/http/http-client'

const mocks = vi.hoisted(() => ({ challenge: vi.fn(), login: vi.fn(), link: vi.fn(), accept: vi.fn(), navigate: vi.fn() }))
vi.mock('../api/auth-api', () => ({ getGoogleChallenge: mocks.challenge, loginWithGoogle: mocks.login, linkGoogle: mocks.link }))
vi.mock('../context/useAuthSession', () => ({ useAuthSession: () => ({ acceptExternalLogin: mocks.accept }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('../utils/role-access', () => ({ getHomePath: () => '/home' }))
let callback: (response: { credential?: string }) => Promise<void>

beforeEach(() => {
  mocks.challenge.mockResolvedValue({ challengeId: 'first', clientId: 'client', nonce: 'nonce', expiresAtUtc: new Date(Date.now() + 300000).toISOString() })
  window.google = { accounts: { id: {
    initialize: vi.fn(config => { callback = config.callback as typeof callback }),
    renderButton: vi.fn(),
  } } }
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); delete window.google })

it('completes the existing application session after Google verification', async () => {
  const session = { user: { id: 1 } }
  mocks.login.mockResolvedValue(session); mocks.accept.mockResolvedValue(session)
  render(<GoogleLoginButton />)
  await waitFor(() => expect(window.google!.accounts.id.renderButton).toHaveBeenCalled())
  await act(() => callback({ credential: 'test-credential' }))
  expect(mocks.login).toHaveBeenCalledWith('first', 'test-credential')
  expect(mocks.accept).toHaveBeenCalledWith(session)
  expect(mocks.navigate).toHaveBeenCalledWith('/home', { replace: true })
})

it('gets a fresh challenge after a rejected login and explains account linking', async () => {
  mocks.login.mockRejectedValue(new HttpError('Unauthorized', 401))
  render(<GoogleLoginButton />)
  await waitFor(() => expect(window.google!.accounts.id.renderButton).toHaveBeenCalled())
  await act(() => callback({ credential: 'test-credential' }))
  expect(screen.getByRole('status').textContent).toContain('liên kết Google')
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  await waitFor(() => expect(mocks.challenge).toHaveBeenCalledTimes(2))
})

it('expires an idle challenge and prevents submission with the expired nonce', async () => {
  vi.useFakeTimers()
  render(<GoogleLoginButton />)
  await act(async () => { await Promise.resolve(); await Promise.resolve() })
  await act(async () => { vi.advanceTimersByTime(300001) })
  expect(screen.getByRole('status').textContent).toContain('hết hạn')
  await act(() => callback({ credential: 'test-credential' }))
  expect(mocks.login).not.toHaveBeenCalled()
})

it('links Google with the supplied password without starting a new login', async () => {
  const linked = vi.fn(); mocks.link.mockResolvedValue(undefined)
  render(<GoogleLoginButton purpose="LINK" currentPassword="test-password" onLinked={linked} />)
  await waitFor(() => expect(window.google!.accounts.id.renderButton).toHaveBeenCalled())
  await act(() => callback({ credential: 'test-credential' }))
  expect(mocks.link).toHaveBeenCalledWith('first', 'test-credential', 'test-password')
  expect(linked).toHaveBeenCalledOnce()
  expect(mocks.login).not.toHaveBeenCalled()
})

it('shows a retry when the challenge endpoint rejects the browser origin', async () => {
  mocks.challenge.mockRejectedValueOnce(new HttpError('Forbidden', 403))
  render(<GoogleLoginButton />)
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('chưa được phép'))
  expect(window.google!.accounts.id.renderButton).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy()
})
