import { afterEach, describe, expect, it, vi } from 'vitest'
import { assignEvaluator, revokeEvaluator } from '../../services/api/evaluations.api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('evaluator assignment contract', () => {
  it('sends period and evaluation type, then revokes with the loaded token', async () => {
    localStorage.setItem('token', 'department-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 12 }) })
    vi.stubGlobal('fetch', fetch)

    await assignEvaluator(7, { evaluatorId: 3, projectPeriodId: 9, evaluationType: 'LECTURER' })
    await revokeEvaluator(12, 'loaded-token', 'Reassigned')

    expect(fetch.mock.calls.map(([url, options]) => [url, options.method, JSON.parse(options.body)])).toEqual([
      ['/api/v1/projects/7/evaluation-assignments', 'POST', { evaluatorId: 3, projectPeriodId: 9, evaluationType: 'LECTURER' }],
      ['/api/v1/evaluation-assignments/12/revoke', 'POST', { concurrencyToken: 'loaded-token', reason: 'Reassigned' }],
    ])
  })
})
