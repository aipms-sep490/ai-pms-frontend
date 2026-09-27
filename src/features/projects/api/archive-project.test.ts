import { afterEach, describe, expect, it, vi } from 'vitest'
import { archiveProject, getArchiveView } from './archive-project'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('archive API', () => {
  it('refreshes the authoritative token before archive and reads the archive view history', async () => {
    localStorage.setItem('token', 'staff-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ concurrencyToken: 'MTIzNDU2Nzg=' }) })
    vi.stubGlobal('fetch', fetch)
    await archiveProject(9, null)
    await getArchiveView(9)
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method, options.body])).toEqual([
      ['/api/v1/projects/9', 'GET', undefined],
      ['/api/v1/projects/9/archive', 'POST', JSON.stringify({ concurrencyToken: 'MTIzNDU2Nzg=', reason: null })],
      ['/api/v1/projects/9', 'GET', undefined],
      ['/api/v1/projects/9/history', 'GET', undefined],
    ])
  })
})
