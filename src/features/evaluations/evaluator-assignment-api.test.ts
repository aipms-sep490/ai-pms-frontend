import { afterEach, describe, expect, it, vi } from 'vitest'
import { assignEvaluator, getAllMyEvaluationAssignments, revokeEvaluator } from '../../services/api/evaluations.api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('evaluator assignment contract', () => {
  it('loads every assignment page before a direct-route guard makes an authority decision', async () => {
    localStorage.setItem('token', 'lecturer-token')
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ items: [{ id: 1 }], page: 1, pageSize: 100, totalCount: 101 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ items: [{ id: 101 }], page: 2, pageSize: 100, totalCount: 101 }) })
    vi.stubGlobal('fetch', fetch)

    expect(await getAllMyEvaluationAssignments()).toEqual([{ id: 1 }, { id: 101 }])
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/evaluation-assignments/my?page=1&pageSize=100',
      '/api/v1/evaluation-assignments/my?page=2&pageSize=100',
    ])
  })

  it('sends published component scope and target, then revokes with the loaded token', async () => {
    localStorage.setItem('token', 'department-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 12 }) })
    vi.stubGlobal('fetch', fetch)

    await assignEvaluator(7, { evaluatorId: 3, projectPeriodId: 9, evaluationType: 'LECTURER', componentId: 42, scope: 'MAJOR_SPECIFIC', majorId: 5, studentId: null })
    await revokeEvaluator(12, 'loaded-token', 'Reassigned')

    expect(fetch.mock.calls.map(([url, options]) => [url, options.method, JSON.parse(options.body)])).toEqual([
      ['/api/v1/projects/7/evaluation-assignments', 'POST', { evaluatorId: 3, projectPeriodId: 9, evaluationType: 'LECTURER', componentId: 42, scope: 'MAJOR_SPECIFIC', majorId: 5, studentId: null }],
      ['/api/v1/evaluation-assignments/12/revoke', 'POST', { concurrencyToken: 'loaded-token', reason: 'Reassigned' }],
    ])
  })
})
