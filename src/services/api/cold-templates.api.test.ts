import { afterEach, expect, it, vi } from 'vitest'
import { createColdTemplate, getColdTemplates } from './cold-templates.api'

vi.mock('../../app/config/env', () => ({ env: { apiBaseUrl: '/api/v1' } }))
afterEach(() => vi.unstubAllGlobals())

it('omits majorId for a COMMON template query and sends null on creation', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => Response.json({ items: [], page: 1, pageSize: 20, totalCount: 0 }))
  vi.stubGlobal('fetch', fetch)
  await getColdTemplates(null, 34)
  expect(fetch.mock.calls[0][0]).toBe('/api/v1/cold-report-templates?projectPeriodId=34&page=1&pageSize=20')
  await createColdTemplate({ majorId: null, scope: 'COMMON', projectPeriodId: 34, name: 'Bộ chung', reports: [{ code: 'OVERVIEW', name: 'Tổng quan', required: true }] })
  expect(JSON.parse(fetch.mock.calls[1][1]?.body as string)).toMatchObject({ majorId: null, scope: 'COMMON', projectPeriodId: 34 })
})
