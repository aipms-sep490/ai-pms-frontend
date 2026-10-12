import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from './evaluations.api'
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
describe('Evaluation HTTP contract', () => {
  it('uses backend-owned assignment, draft, token, and finalize routes', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }); vi.stubGlobal('fetch', fetch); localStorage.setItem('token', 'evaluation-token')
    await api.getMyEvaluationAssignments(); await api.getEvaluationAssignmentDetail(4); await api.getEvaluationAssignmentEvidence(4); await api.getProjectEvaluationAssignments(9, 'ACTIVE'); await api.createEvaluationDraft(4); await api.getEvaluationDraft(5); await api.getProjectEvaluations(9)
    await api.saveEvaluationDraft(5, { concurrencyToken: 'current-token', comments: 'Nhận xét', scores: [{ rubricCriterionId: 2, score: 8, comments: null }] }); await api.finalizeEvaluation(5, 'current-token')
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/evaluation-assignments/my?page=1&pageSize=20', 'GET'], ['/api/v1/evaluation-assignments/4', 'GET'], ['/api/v1/evaluation-assignments/4/evidence', 'GET'], ['/api/v1/projects/9/evaluation-assignments?page=1&pageSize=100&status=ACTIVE', 'GET'], ['/api/v1/evaluation-assignments/4/evaluation', 'POST'], ['/api/v1/evaluations/5', 'GET'], ['/api/v1/projects/9/evaluations?page=1&pageSize=100', 'GET'], ['/api/v1/evaluations/5/draft', 'PUT'], ['/api/v1/evaluations/5/finalize', 'POST'],
    ])
    expect(JSON.parse(fetch.mock.calls[7][1].body)).toMatchObject({ concurrencyToken: 'current-token', scores: [{ score: 8 }] })
    expect(JSON.parse(fetch.mock.calls[8][1].body)).toEqual({ concurrencyToken: 'current-token' })
    expect(fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer evaluation-token')).toBe(true)
  })

  it('uses the token-protected evaluation scheme lifecycle routes', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }); vi.stubGlobal('fetch', fetch); localStorage.setItem('token', 'evaluation-token')
    const draft = { projectId: 9, projectPeriodId: 7, name: 'Final', passThreshold: 5, components: [{ name: 'Common', scope: 'COMMON' as const, majorId: null, rubricId: 4, projectWeightPercent: 100, studentWeightPercent: 100, requiredEvaluators: 1 }] }
    await api.getEvaluationSchemes(9); await api.createEvaluationScheme(draft); await api.updateEvaluationScheme(3, { ...draft, concurrencyToken: 'scheme-token' })
    await api.publishEvaluationScheme(3, 'scheme-token'); await api.createEvaluationSchemeVersion(3, 'scheme-token'); await api.deleteEvaluationScheme(3, 'scheme-token')
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/evaluation-schemes?projectId=9', 'GET'], ['/api/v1/evaluation-schemes', 'POST'], ['/api/v1/evaluation-schemes/3', 'PUT'], ['/api/v1/evaluation-schemes/3/publish', 'POST'], ['/api/v1/evaluation-schemes/3/versions', 'POST'], ['/api/v1/evaluation-schemes/3?concurrencyToken=scheme-token', 'DELETE'],
    ])
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toMatchObject({ concurrencyToken: 'scheme-token', projectId: 9 })
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ concurrencyToken: 'scheme-token' })
  })

  it('forwards additive BE policy, stage and exact evaluator weights without applying FE defaults', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }); vi.stubGlobal('fetch', fetch)
    const body: api.SaveEvaluationSchemeInput = { projectId: 9, projectPeriodId: 7, name: 'Version 2', passThreshold: 6.5, concurrencyToken: 'fresh-token', components: [{ name: 'Defense', scope: 'COMMON', majorId: null, rubricId: 4, projectWeightPercent: 100, studentWeightPercent: 100, requiredEvaluators: 2, stage: 'DEFENSE', evaluatorWeights: [{ evaluatorId: 7, weightPercent: 75.125 }, { evaluatorId: 8, weightPercent: 24.875 }] }], policy: { isDemo: false, approvalStatus: 'APPROVED', approvalReference: 'QD/2026/123', formula: 'COMPONENT_WEIGHTS', calculationVersion: 'DECIMAL_V2', roundingMode: 'AWAY_FROM_ZERO', decimalPlaces: 2 } }
    await api.updateEvaluationScheme(3, body)
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(body)
    const { policy: _policy, ...metadataOnly } = body
    await api.updateEvaluationScheme(3, metadataOnly)
    expect(JSON.parse(fetch.mock.calls[1][1].body)).not.toHaveProperty('policy')
  })
})
