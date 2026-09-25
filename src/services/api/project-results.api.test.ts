import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from './project-results.api'
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
describe('Project result HTTP contract', () => {
  it('uses policy tokens and a fresh preview token for publication', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }); vi.stubGlobal('fetch', fetch); localStorage.setItem('token', 'result-token')
    await api.getResultPolicy(9); await api.configureResultPolicy(9, { passThreshold: 5, assignments: [{ assignmentId: 2, weightPercent: 100 }], concurrencyToken: null }); await api.getResultPreview(9); await api.publishProjectResult(9, 'a'.repeat(64)); await api.getProjectResult(9)
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([['/api/v1/projects/9/result-policy', 'GET'], ['/api/v1/projects/9/result-policy', 'PUT'], ['/api/v1/projects/9/result/preview', 'GET'], ['/api/v1/projects/9/result', 'POST'], ['/api/v1/projects/9/result', 'GET']])
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ assignments: [{ assignmentId: 2, weightPercent: 100 }], concurrencyToken: null })
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ confirmationToken: 'a'.repeat(64) })
  })
})
