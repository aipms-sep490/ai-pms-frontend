import { afterEach, expect, it, vi } from 'vitest'
import * as api from './result-correction-api'
vi.mock('../../app/config/env', () => ({ env: { apiBaseUrl: '/api/v1' } }))
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
it('uses server paging, explicit result targets and independent revision confirmation', async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })))
  vi.stubGlobal('fetch', fetch)
  await api.getResultCorrectionRequests(9, 3)
  await api.submitResultCorrectionRequest(9, { source: 'STUDENT_APPEAL', policyId: 4, windowId: 5, targetType: 'STUDENT', studentId: 88, resultVersion: 2, componentId: 6, reason: 'Sai tiêu chí' })
  await api.reviewAppeal(9, 7, { concurrencyToken: 'review-token', proposal: 'AMEND', reason: 'Đối chiếu minh chứng', amendments: [{ evaluationId: 42, criterionId: 11, score: 0, reason: 'Không có minh chứng' }] })
  await api.previewAppeal(9, 7)
  await api.decideAppeal(9, 7, { concurrencyToken: 'decision-token', decision: 'ACCEPTED', reason: 'Đã xác minh', confirmationToken: 'preview-token' })
  expect(fetch.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
    ['/api/v1/projects/9/result/correction-requests?page=3&pageSize=20', 'GET'], ['/api/v1/projects/9/result/correction-requests', 'POST'],
    ['/api/v1/projects/9/result/correction-requests/7/review', 'PUT'], ['/api/v1/projects/9/result/correction-requests/7/preview', 'GET'], ['/api/v1/projects/9/result/correction-requests/7/decision', 'POST'],
  ])
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ studentId: 88, resultVersion: 2, componentId: 6, windowId: 5 })
  expect(JSON.parse(fetch.mock.calls[2][1].body).amendments[0].score).toBe(0)
  expect(JSON.parse(fetch.mock.calls[4][1].body)).toMatchObject({ concurrencyToken: 'decision-token', confirmationToken: 'preview-token' })
})
it('uploads with the current request token and keeps frozen/source download boundaries separate', async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}', { status: 200 })))
  vi.stubGlobal('fetch', fetch)
  const file = new File(['evidence'], 'evidence.txt')
  await api.uploadAppealFile(9, 7, 'file-token', file)
  await api.downloadAppealFile(9, 7, 41, true)
  await api.downloadAppealFile(9, 7, 42)
  const form = fetch.mock.calls[0][1].body as FormData
  expect(form.get('ConcurrencyToken')).toBe('file-token'); expect(form.get('File')).toBe(file)
  expect(fetch.mock.calls[1][0]).toBe('/api/v1/projects/9/result/correction-requests/7/evidence/41')
  expect(fetch.mock.calls[2][0]).toBe('/api/v1/projects/9/result/correction-requests/7/files/42')
})
