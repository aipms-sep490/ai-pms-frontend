import { describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ httpGet: vi.fn() }))
vi.mock('../../../services/http/http-client', () => ({
  httpGet: http.httpGet, httpDelete: vi.fn(), httpPatch: vi.fn(), httpPost: vi.fn(), httpPut: vi.fn(),
}))

import { getAccessEvents } from './admin-api'

describe('access events API contract', () => {
  it('passes server-side filters and page to the Admin-only endpoint', async () => {
    http.httpGet.mockResolvedValue({ items: [], page: 2, pageSize: 20, totalCount: 0 })
    const signal = new AbortController().signal
    await getAccessEvents('admin-token', { search: 'Minh', eventType: 'LOGIN', outcome: 'FAILURE', page: 2 }, signal)
    const [url, options] = http.httpGet.mock.calls[0]
    expect(url.split('?')[0]).toBe('/v1/security/access-events')
    expect(new URLSearchParams(url.split('?')[1]).get('search')).toBe('Minh')
    expect(new URLSearchParams(url.split('?')[1]).get('page')).toBe('2')
    expect(options).toEqual({ accessToken: 'admin-token', signal })
  })
})
