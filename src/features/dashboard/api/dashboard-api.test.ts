import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportPortfolio, exportPortfolioCsv, getPortfolioDashboard } from './dashboard-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('portfolio API', () => {
  it.each(['pdf', 'xlsx'] as const)('exports %s with server filters and without paging', async format => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['fixture']) }); vi.stubGlobal('fetch', fetch)
    await exportPortfolio({ majorId: 3, status: 'COMPLETED', page: 8, pageSize: 20 }, format)
    expect(fetch.mock.calls[0][0]).toBe(`/api/v1/dashboards/portfolio/export?majorId=3&status=COMPLETED&format=${format}`)
  })
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
