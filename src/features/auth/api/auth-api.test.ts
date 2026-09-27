import { afterEach, describe, expect, it, vi } from 'vitest'
import { changePassword, getCurrentUser, login, logout, refresh, requestPasswordReset, resetPassword, updateMyProfile } from './auth-api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('auth API', () => {
  it('posts the documented login payload to the backend contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: 'token', user: { id: 1 } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await login({ email: 'staff@example.edu.vn', password: 'secret' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'staff@example.edu.vn', password: 'secret' }),
      }),
    )
  })

  it('sends the access token only as a bearer header when reading the profile', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, email: 'staff@example.edu.vn', fullName: 'Staff', roles: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await getCurrentUser('access-token')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/me',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access-token' }) }),
    )
  })

  it('uses the documented refresh and logout contracts without recursive refresh handling', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: 'fresh' }) })
      .mockResolvedValueOnce({ ok: true, status: 204, json: vi.fn() })
    vi.stubGlobal('fetch', fetchMock)

    await refresh('refresh-token')
    await logout('refresh-token')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/auth/refresh',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ refreshToken: 'refresh-token' }) }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/auth/logout',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ refreshToken: 'refresh-token' }) }),
    )
  })

  it('uses only the documented self-service payloads', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await requestPasswordReset('student@example.edu.vn')
    await resetPassword('reset-token', 'Strong!Pass1')
    await changePassword('Current!Pass1', 'Strong!Pass1')
    await updateMyProfile({ fullName: 'Student Updated', phone: null, title: 'Student' })

    expect(fetchMock.mock.calls.map(call => [call[0], call[1].method, call[1].body])).toEqual([
      ['/api/v1/auth/forgot-password', 'POST', JSON.stringify({ email: 'student@example.edu.vn' })],
      ['/api/v1/auth/reset-password', 'POST', JSON.stringify({ token: 'reset-token', newPassword: 'Strong!Pass1' })],
      ['/api/v1/auth/change-password', 'POST', JSON.stringify({ currentPassword: 'Current!Pass1', newPassword: 'Strong!Pass1' })],
      ['/api/v1/users/me/profile', 'PUT', JSON.stringify({ fullName: 'Student Updated', phone: null, title: 'Student' })],
    ])
  })
})
