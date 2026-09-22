import { afterEach, describe, expect, it, vi } from 'vitest'
import * as reports from './progress-reports.api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
describe('Progress report HTTP contract', () => {
  it('uses exact BE routes, verbs, auth and payloads for the complete lifecycle', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch); localStorage.setItem('token', 'test-token')
    const body = { reportType: 'WEEKLY' as const, periodStart: '2026-09-14', periodEnd: '2026-09-20', summary: 'Tiến độ', completedWork: null, plannedWork: null, issuesAndRisks: null }
    await reports.getProgressReports(9, { status: 'SUBMITTED', reportType: 'WEEKLY', page: 2 })
    await reports.getProgressReport(17)
    await reports.createProgressReport(9, body)
    const { summary, completedWork, plannedWork, issuesAndRisks } = body
    await reports.updateProgressReport(17, { summary, completedWork, plannedWork, issuesAndRisks })
    await reports.submitProgressReport(17)
    await reports.addProgressReportFeedback(17, 'Đã xem')
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/projects/9/progress-reports?page=2&pageSize=10&status=SUBMITTED&reportType=WEEKLY', 'GET'],
      ['/api/v1/progress-reports/17', 'GET'], ['/api/v1/projects/9/progress-reports', 'POST'],
      ['/api/v1/progress-reports/17', 'PUT'], ['/api/v1/progress-reports/17/submit', 'POST'], ['/api/v1/progress-reports/17/feedback', 'POST'],
    ])
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual(body)
    expect(JSON.parse(fetch.mock.calls[3][1].body)).not.toHaveProperty('periodStart')
    expect(fetch.mock.calls[4][1].body).toBeUndefined()
    expect(JSON.parse(fetch.mock.calls[5][1].body)).toEqual({ feedbackText: 'Đã xem' })
    expect(fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer test-token')).toBe(true)
  })
})
