import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthSessionProvider } from './AuthSessionProvider'
import { useAuthSession } from './useAuthSession'
import * as authApi from '../api/auth-api'
import { HttpError } from '../../../services/http/http-client'

vi.mock('../api/auth-api', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
}))

function SessionProbe() {
  const { status, session, logout } = useAuthSession()
  return <>
    <p data-testid="status">{status}</p>
    <p data-testid="user">{session?.user.fullName ?? 'none'}</p>
    <button type="button" onClick={() => void logout()}>logout</button>
  </>
}

const storedSession = {
  accessToken: 'old-access',
  tokenType: 'Bearer',
  expiresAtUtc: '2026-09-15T00:00:00Z',
  refreshToken: 'refresh-token',
  refreshTokenExpiresAtUtc: '2026-09-20T00:00:00Z',
  user: { id: 1, email: 'old@example.edu.vn', fullName: 'Old', roles: [] },
}

describe('AuthSessionProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it('restores a valid persisted session only after backend profile validation', async () => {
    localStorage.setItem('ai-pms.auth-session', JSON.stringify(storedSession))
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({ id: 1, email: 'user@example.edu.vn', fullName: 'User', roles: ['STUDENT'] })

    render(<AuthSessionProvider><SessionProbe /></AuthSessionProvider>)

    expect(screen.getByTestId('status').textContent).toBe('restoring')
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'))
    expect(screen.getByTestId('user').textContent).toBe('User')
    expect(authApi.getCurrentUser).toHaveBeenCalledWith('old-access', undefined, true)
  })

  it('becomes unauthenticated when no persisted session exists', async () => {
    render(<AuthSessionProvider><SessionProbe /></AuthSessionProvider>)
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'))
    expect(authApi.getCurrentUser).not.toHaveBeenCalled()
  })

  it('refreshes an expired access token during restoration', async () => {
    localStorage.setItem('ai-pms.auth-session', JSON.stringify(storedSession))
    vi.mocked(authApi.getCurrentUser)
      .mockRejectedValueOnce(new HttpError('Expired', 401))
      .mockResolvedValueOnce({ id: 1, email: 'user@example.edu.vn', fullName: 'Refreshed', roles: ['STUDENT'] })
    vi.mocked(authApi.refresh).mockResolvedValue({
      ...storedSession,
      accessToken: 'fresh-access',
      refreshToken: 'fresh-refresh',
      user: storedSession.user,
    })

    render(<AuthSessionProvider><SessionProbe /></AuthSessionProvider>)

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'))
    expect(authApi.refresh).toHaveBeenCalledWith('refresh-token')
    expect(authApi.getCurrentUser).toHaveBeenLastCalledWith('fresh-access', undefined, true)
    expect(localStorage.getItem('token')).toBe('fresh-access')
  })

  it('clears storage and reports session expiry when refresh fails', async () => {
    localStorage.setItem('ai-pms.auth-session', JSON.stringify(storedSession))
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new HttpError('Expired', 401))
    vi.mocked(authApi.refresh).mockRejectedValue(new HttpError('Refresh expired', 401))

    render(<AuthSessionProvider><SessionProbe /></AuthSessionProvider>)

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('session_expired'))
    expect(localStorage.getItem('ai-pms.auth-session')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('calls backend logout then clears local authentication state', async () => {
    localStorage.setItem('ai-pms.auth-session', JSON.stringify(storedSession))
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(storedSession.user)
    vi.mocked(authApi.logout).mockResolvedValue(undefined)

    render(<AuthSessionProvider><SessionProbe /></AuthSessionProvider>)
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'))
    screen.getByRole('button', { name: 'logout' }).click()

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'))
    expect(authApi.logout).toHaveBeenCalledWith('refresh-token')
    expect(localStorage.getItem('ai-pms.auth-session')).toBeNull()
  })
})
