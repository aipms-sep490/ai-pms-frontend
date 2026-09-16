import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HttpError,
  configureHttpAuthentication,
  httpGet,
} from './http-client'

const response = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 403 ? 'Forbidden' : 'Unauthorized',
  json: vi.fn().mockResolvedValue(body),
}) as unknown as Response

describe('shared HTTP authentication pipeline', () => {
  let cleanupAuthentication: (() => void) | undefined

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanupAuthentication?.()
    cleanupAuthentication = undefined
    vi.unstubAllGlobals()
  })

  it('sends the stored access token and does not parse a 204 body', async () => {
    localStorage.setItem('token', 'access-token')
    const noContent = response(204)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(noContent))

    await expect(httpGet<void>('/teams/current')).resolves.toBeNull()
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/teams/current',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access-token' }) }),
    )
    expect(noContent.json).not.toHaveBeenCalled()
  })

  it('uses one refresh for concurrent 401 responses and retries each request once', async () => {
    let protectedAttempts = 0
    const refresh = vi.fn().mockResolvedValue('fresh-token')
    cleanupAuthentication = configureHttpAuthentication({ refresh, onSessionExpired: vi.fn() })
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      protectedAttempts += 1
      return Promise.resolve(protectedAttempts <= 3 ? response(401) : response(200, { ok: true }))
    }))

    await expect(Promise.all([
      httpGet('/protected/a'),
      httpGet('/protected/b'),
      httpGet('/protected/c'),
    ])).resolves.toHaveLength(3)

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(6)
  })

  it('does not refresh on a 403 response', async () => {
    const refresh = vi.fn().mockResolvedValue('fresh-token')
    cleanupAuthentication = configureHttpAuthentication({ refresh, onSessionExpired: vi.fn() })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403, { detail: 'Forbidden' })))

    await expect(httpGet('/protected')).rejects.toMatchObject({ status: 403 })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('stops after one failed refresh and does not loop', async () => {
    const refresh = vi.fn().mockRejectedValue(new HttpError('Expired', 401))
    const expired = vi.fn()
    cleanupAuthentication = configureHttpAuthentication({ refresh, onSessionExpired: expired })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, { detail: 'Expired' })))

    await expect(httpGet('/protected')).rejects.toMatchObject({ status: 401 })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(expired).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries an original 401 request only once when the replacement token is rejected', async () => {
    const refresh = vi.fn().mockResolvedValue('fresh-token')
    cleanupAuthentication = configureHttpAuthentication({ refresh, onSessionExpired: vi.fn() })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, { detail: 'Still expired' })))

    await expect(httpGet('/protected')).rejects.toMatchObject({ status: 401 })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
