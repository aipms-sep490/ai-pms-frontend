import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportPortfolioCsv, getPortfolioDashboard } from './dashboard-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('portfolio API', () => {
  it('exports the same filters without a pagination limit and preserves the bearer token', async () => {
    localStorage.setItem('token', 'staff-token')
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ projects: { items: [] } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, blob: async () => new Blob(['code,title']) })
    vi.stubGlobal('fetch', fetch)
    await getPortfolioDashboard('department', { status: 'ACTIVE', search: 'AI', page: 2, pageSize: 20 })
    await exportPortfolioCsv({ status: 'ACTIVE', search: 'AI', page: 2, pageSize: 20 })
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/dashboards/department?status=ACTIVE&search=AI&page=2&pageSize=20')
    expect(fetch.mock.calls[1][0]).toBe('/api/v1/dashboards/portfolio/export?status=ACTIVE&search=AI&format=csv')
    expect(fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer staff-token')).toBe(true)
  })
})
