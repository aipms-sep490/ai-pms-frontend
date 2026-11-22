import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HttpError,
  configureHttpAuthentication,
  httpGet,
  httpPutBlob,
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
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
        credentials: 'include',
      }),
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

  it('refreshes a chunk request once while preserving its raw body and content type', async () => {
    const refresh = vi.fn().mockResolvedValue('fresh-token')
    cleanupAuthentication = configureHttpAuthentication({ refresh, onSessionExpired: vi.fn() })
    const fetch = vi.fn().mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200, { nextOffset: 3 }))
    vi.stubGlobal('fetch', fetch)
    const body = new Blob(['abc'])
    await expect(httpPutBlob('/files/upload-sessions/abc/chunks?offset=0', body)).resolves.toEqual({ nextOffset: 3 })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'PUT', body, headers: { Authorization: 'Bearer fresh-token', 'Content-Type': 'application/octet-stream' } })
  })

  it('parses additive V4 ProblemDetails fields while preserving legacy aliases', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(422, {
      status: 422,
      title: 'A business rule was violated.',
      detail: 'Missing required criteria.',
      message: 'Thiếu tiêu chí bắt buộc.',
      code: 'INCOMPLETE_SCORES',
      correlationId: 'corr-422-1',
      fieldErrors: { scores: ['Required'] },
      blockingRequirements: [{ code: 'CRITERION_MISSING', message: 'C1 missing', target: 'c1' }],
      currentState: 'DRAFT',
      expectedState: 'FINALIZED',
      policyVersion: 'POL-2026-V4',
      retryable: false,
    })))

    try {
      await httpGet('/evaluations/1/finalize')
      throw new Error('Expected HttpError')
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      const httpError = error as HttpError
      expect(httpError.message).toBe('Thiếu tiêu chí bắt buộc.')
      expect(httpError.problem).toMatchObject({
        code: 'INCOMPLETE_SCORES',
        errorCode: 'INCOMPLETE_SCORES',
        traceId: 'corr-422-1',
        correlationId: 'corr-422-1',
        errors: { scores: ['Required'] },
        fieldErrors: { scores: ['Required'] },
        currentState: 'DRAFT',
        expectedState: 'FINALIZED',
        policyVersion: 'POL-2026-V4',
        retryable: false,
      })
      expect(httpError.problem?.blockingRequirements).toHaveLength(1)
    }
  })
})
