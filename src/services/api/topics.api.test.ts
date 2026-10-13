import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTopicSimilarity } from './topics.api'

const ok = (value: unknown) => ({ ok: true, json: async () => value })
afterEach(() => vi.unstubAllGlobals())

describe('getTopicSimilarity', () => {
  it('serializes the title, keywords, leadDepartmentId and periodWindow into the query string', async () => {
    const fetch = vi.fn().mockResolvedValue(ok({ exactMatch: null, similar: [] }))
    vi.stubGlobal('fetch', fetch)
    await getTopicSimilarity({ title: 'Hệ thống quản lý', keywords: ['AI', 'NLP'], leadDepartmentId: 3, periodWindow: 3 })
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/topics/similarity-check?title=H%E1%BB%87+th%E1%BB%91ng+qu%E1%BA%A3n+l%C3%BD&periodWindow=3&keywords=AI%2CNLP&leadDepartmentId=3',
      expect.anything(),
    )
  })

  it('defaults periodWindow to 3 and omits keywords/leadDepartmentId when absent', async () => {
    const fetch = vi.fn().mockResolvedValue(ok({ exactMatch: null, similar: [] }))
    vi.stubGlobal('fetch', fetch)
    await getTopicSimilarity({ title: 'Đề tài' })
    expect(fetch).toHaveBeenCalledWith('/api/v1/topics/similarity-check?title=%C4%90%E1%BB%81+t%C3%A0i&periodWindow=3', expect.anything())
  })

  it('returns the exact match and similar list from the backend response', async () => {
    const response = { exactMatch: { id: 5, title: 'Trùng tên' }, similar: [{ id: 6, title: 'Gần giống', semesterCode: 'FA25', score: 0.7 }] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(response)))
    expect(await getTopicSimilarity({ title: 'Trùng tên' })).toEqual(response)
  })
})
