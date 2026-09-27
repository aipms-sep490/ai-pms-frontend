import { afterEach, describe, expect, it, vi } from 'vitest'
import { cloneRubric, createRubric, deleteRubric, publishRubric, updateRubric } from './rubrics-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('rubric write contract', () => {
  it('sends Backend tokens for each versioned operation', async () => {
    localStorage.setItem('token', 'staff-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 8 }) })
    vi.stubGlobal('fetch', fetch)
    const criteria = [{ name: 'Quality', description: null, weightPercent: 100, maxScore: 10, sortOrder: 0, isRequired: true, children: [] }]

    await createRubric({ departmentId: 2, academicSemesterId: 4, code: 'RB-1', name: 'Final', description: null, criteria })
    await updateRubric(8, { name: 'Final v1', description: null, criteria }, 'old-token')
    await publishRubric(8, 'new-token')
    await cloneRubric(8, 'RB-2', 'published-token')
    await deleteRubric(9, 'draft-token')

    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/rubrics', 'POST'],
      ['/api/v1/rubrics/8', 'PUT'],
      ['/api/v1/rubrics/8/publish', 'POST'],
      ['/api/v1/rubrics/8/versions', 'POST'],
      ['/api/v1/rubrics/9?concurrencyToken=draft-token', 'DELETE'],
    ])
    expect(JSON.parse(fetch.mock.calls[1][1].body).concurrencyToken).toBe('old-token')
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ concurrencyToken: 'new-token' })
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ code: 'RB-2', concurrencyToken: 'published-token' })
    expect(fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer staff-token')).toBe(true)
  })
})
