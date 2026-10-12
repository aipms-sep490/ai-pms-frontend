import { afterEach, describe, expect, it, vi } from 'vitest'
import { askProjectAssistant, getAiRun, getProjectAiRuns, getProjectProgressAnalysis, getReportAiSummary, recordProjectProgressAnalysis } from './ai-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('AI advisory API contract', () => {
  it('uses the exact project-scoped backend routes and bodies', async () => {
    localStorage.setItem('token', 'advisor-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch)
    await getProjectProgressAnalysis(9)
    await getReportAiSummary(9, 17)
    await askProjectAssistant(9, 'Việc nào cần ưu tiên?')
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method, options.body])).toEqual([
      ['/api/v1/projects/9/progress-analysis', 'GET', undefined],
      ['/api/v1/projects/9/reports/17/summary', 'GET', undefined],
      ['/api/v1/projects/9/ai/assistant/ask', 'POST', JSON.stringify({ query: 'Việc nào cần ưu tiên?' })],
    ])
    expect(fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer advisor-token')).toBe(true)
  })

  it('records a progress analysis via the explicit POST action, distinct from the transient GET', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch)
    await recordProjectProgressAnalysis(9)
    expect(fetch.mock.calls[0]).toEqual(['/api/v1/projects/9/ai/progress-analysis', expect.objectContaining({ method: 'POST', body: undefined })])
  })

  it('reads the paged, project-scoped AI run history and a single scoped run', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch)
    await getProjectAiRuns(9)
    await getProjectAiRuns(9, 2, 10)
    await getAiRun(9, 3)
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/projects/9/ai/runs?page=1&pageSize=20', 'GET'],
      ['/api/v1/projects/9/ai/runs?page=2&pageSize=10', 'GET'],
      ['/api/v1/projects/9/ai/runs/3', 'GET'],
    ])
  })
})
