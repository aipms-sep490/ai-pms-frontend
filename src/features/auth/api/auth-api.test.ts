import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, login, logout, refresh } from './auth-api'

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
})
