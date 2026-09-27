import { afterEach, describe, expect, it, vi } from 'vitest'
import { getContributions, getContributionEvidence, rebuildContributionSnapshot } from './contributions-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('contribution project scope', () => {
  it('reads current and stored evidence with project IDs and uses a separate staff mutation', async () => {
    localStorage.setItem('token', 'scope-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [], members: [] }) })
    vi.stubGlobal('fetch', fetch)
    await getContributions(9, 2, true)
    await getContributionEvidence(9, 4, 3, 'MEETING')
    await rebuildContributionSnapshot(9)
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/projects/9/contributions?page=2&pageSize=20&snapshot=true', 'GET'],
      ['/api/v1/projects/9/contributions/4/evidence?page=3&pageSize=20&sourceType=MEETING', 'GET'],
      ['/api/v1/projects/9/contributions/snapshot', 'POST'],
    ])
  })
})
