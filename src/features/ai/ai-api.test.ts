import { afterEach, describe, expect, it, vi } from 'vitest'
import { askProjectAssistant, getProjectProgressAnalysis, getReportAiSummary } from './ai-api'

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
})
