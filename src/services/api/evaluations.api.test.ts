import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from './evaluations.api'
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
describe('Evaluation HTTP contract', () => {
  it('uses backend-owned assignment, draft, token, and finalize routes', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }); vi.stubGlobal('fetch', fetch); localStorage.setItem('token', 'evaluation-token')
    await api.getMyEvaluationAssignments(); await api.getProjectEvaluationAssignments(9, 'ACTIVE'); await api.createEvaluationDraft(4); await api.getEvaluationDraft(5); await api.getProjectEvaluations(9)
    await api.saveEvaluationDraft(5, { concurrencyToken: 'current-token', comments: 'Nhận xét', scores: [{ rubricCriterionId: 2, score: 8, comments: null }] }); await api.finalizeEvaluation(5, 'current-token')
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/evaluation-assignments/my?page=1&pageSize=20', 'GET'], ['/api/v1/projects/9/evaluation-assignments?page=1&pageSize=100&status=ACTIVE', 'GET'], ['/api/v1/evaluation-assignments/4/evaluation', 'POST'], ['/api/v1/evaluations/5', 'GET'], ['/api/v1/projects/9/evaluations?page=1&pageSize=100', 'GET'], ['/api/v1/evaluations/5/draft', 'PUT'], ['/api/v1/evaluations/5/finalize', 'POST'],
    ])
    expect(JSON.parse(fetch.mock.calls[5][1].body)).toMatchObject({ concurrencyToken: 'current-token', scores: [{ score: 8 }] })
    expect(JSON.parse(fetch.mock.calls[6][1].body)).toEqual({ concurrencyToken: 'current-token' })
    expect(fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer evaluation-token')).toBe(true)
  })
})
