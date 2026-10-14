import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { IndustryEnrollmentPage } from './IndustryEnrollmentPage'
import { HttpError } from '../../services/http/http-client'

const mocks = vi.hoisted(() => ({ challenge: vi.fn(), enroll: vi.fn(), accept: vi.fn(), navigate: vi.fn() }))
vi.mock('./industry-api', () => ({ getIndustryGoogleChallenge: mocks.challenge, enrollIndustryGoogle: mocks.enroll }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ acceptExternalLogin: mocks.accept }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('../auth/utils/role-access', () => ({ getHomePath: () => '/industry/workspace' }))

const TOKEN = 'a'.repeat(64)
let callback: (response: { credential?: string }) => Promise<void>

function setHash(token: string | null) {
  window.location.hash = token ? `#invitation=${token}` : ''
}

beforeEach(() => {
  mocks.challenge.mockResolvedValue({ challengeId: 'first', clientId: 'client', nonce: 'nonce', expiresAtUtc: new Date(Date.now() + 300000).toISOString() })
  window.google = { accounts: { id: {
    initialize: vi.fn(config => { callback = config.callback as typeof callback }),
    renderButton: vi.fn(),
  } } }
  setHash(TOKEN)
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); delete window.google; window.history.replaceState(null, '', '/') })

it('reads the invitation token from the URL fragment and clears it immediately', async () => {
  render(<IndustryEnrollmentPage />)
  await waitFor(() => expect(window.google!.accounts.id.renderButton).toHaveBeenCalled())
  expect(window.location.hash).toBe('')
})

it('shows a non-retryable error when there is no invitation fragment', async () => {
  setHash(null)
  render(<IndustryEnrollmentPage />)
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByText(/Liên kết lời mời không hợp lệ/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull()
  expect(mocks.challenge).not.toHaveBeenCalled()
})

it('rejects a malformed (wrong-length) invitation token the same way', async () => {
  setHash('too-short')
  render(<IndustryEnrollmentPage />)
  expect(await screen.findByText(/Liên kết lời mời không hợp lệ/)).toBeTruthy()
  expect(mocks.challenge).not.toHaveBeenCalled()
})

it('enrolls with the Google credential plus the fragment invitation token, then signs in', async () => {
  const session = { user: { id: 9, roles: [] } }
  mocks.enroll.mockResolvedValue(session); mocks.accept.mockResolvedValue(session)
  render(<IndustryEnrollmentPage />)
  await waitFor(() => expect(window.google!.accounts.id.renderButton).toHaveBeenCalled())
  await act(() => callback({ credential: 'google-id-token' }))
  expect(mocks.enroll).toHaveBeenCalledWith('first', 'google-id-token', TOKEN)
  expect(mocks.accept).toHaveBeenCalledWith(session)
  expect(mocks.navigate).toHaveBeenCalledWith('/industry/workspace', { replace: true })
})

it('shows a clear message and allows retry when the invitation is already consumed/expired (401)', async () => {
  mocks.enroll.mockRejectedValue(new HttpError('Unauthorized', 401))
  render(<IndustryEnrollmentPage />)
  await waitFor(() => expect(window.google!.accounts.id.renderButton).toHaveBeenCalled())
  await act(() => callback({ credential: 'google-id-token' }))
  expect(screen.getByRole('alert').textContent).toContain('đã hết hạn hoặc đã được sử dụng')
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  await waitFor(() => expect(mocks.challenge).toHaveBeenCalledTimes(2))
})

it('expires an idle challenge and refuses a late credential', async () => {
  vi.useFakeTimers()
  render(<IndustryEnrollmentPage />)
  await act(async () => { await Promise.resolve(); await Promise.resolve() })
  await act(async () => { vi.advanceTimersByTime(300001) })
  expect(screen.getByRole('alert').textContent).toContain('hết hạn')
  await act(() => callback({ credential: 'google-id-token' }))
  expect(mocks.enroll).not.toHaveBeenCalled()
})
