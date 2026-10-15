import { afterEach, describe, expect, it, vi } from 'vitest'
import * as agreement from '../working-agreement/working-agreement-api'
import * as peer from '../peer-eval/peer-eval-api'
import { HttpError } from '../../services/http/http-client'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('FE1 HTTP contracts aligned with staging OpenAPI', () => {
  it('uses versioned agreement and round routes with exact tokens and bounded paging', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch); localStorage.setItem('token', 'synthetic-token')
    const signal = new AbortController().signal
    await agreement.saveWorkingAgreement(9, { expectedLatestVersion: 2, concurrencyToken: 'draft-2', sections: [{ title: 'Agreement', body: 'Weekly meeting' }] })
    await agreement.publishWorkingAgreement(9, 21, 'draft-2')
    await agreement.acceptWorkingAgreement(9, 21, 'published-2')
    await agreement.getWorkingAgreementHistory(9, 2, 10, signal)
    await peer.createPeerRound(9, { title: 'Review', opensAt: '2026-10-15T00:00:00Z', closesAt: '2026-10-22T00:00:00Z' })
    await peer.closePeerRound(9, 31, 'round-31')
    await peer.getPeerSubmissions(9, 31, 2, 10, signal)
    expect(fetch.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ['/api/v1/projects/9/working-agreement/draft', 'PUT'],
      ['/api/v1/projects/9/working-agreement/publish', 'POST'],
      ['/api/v1/projects/9/working-agreement/acceptances', 'POST'],
      ['/api/v1/projects/9/working-agreement/history?page=2&pageSize=10', 'GET'],
      ['/api/v1/projects/9/peer-evaluations/rounds', 'POST'],
      ['/api/v1/projects/9/peer-evaluations/rounds/31/close', 'POST'],
      ['/api/v1/projects/9/peer-evaluations?roundId=31&page=2&pageSize=10', 'GET'],
    ])
    expect(JSON.parse(fetch.mock.calls[0][1].body).concurrencyToken).toBe('draft-2')
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ agreementId: 21, concurrencyToken: 'draft-2' })
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ agreementId: 21, concurrencyToken: 'published-2' })
    expect(JSON.parse(fetch.mock.calls[5][1].body)).toEqual({ concurrencyToken: 'round-31' })
    expect(fetch.mock.calls[6][1].signal).toBe(signal)
    expect(fetch.mock.calls.every(([, init]) => init.headers.Authorization === 'Bearer synthetic-token')).toBe(true)
  })
  it('handles an absent agreement and does not replay a conflicting publish', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, status: 204 })
      .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ title: 'Conflict' }) })
    vi.stubGlobal('fetch', fetch)
    expect(await agreement.getWorkingAgreement(9)).toBeNull()
    await expect(agreement.publishWorkingAgreement(9, 21, 'old')).rejects.toBeInstanceOf(HttpError)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
