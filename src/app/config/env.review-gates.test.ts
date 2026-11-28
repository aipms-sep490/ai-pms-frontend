import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules() })
describe('Review Gates data-source boundary (TK-W2-08)', () => {
  it('completely removes reviewGatesMockEnabled from runtime env config', async () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('VITE_USE_MOCK_REVIEW_GATES', 'true')
    vi.resetModules()
    const { env } = await import('./env')
    expect('reviewGatesMockEnabled' in env).toBe(false)
  })

  it.each([false, true])('always calls the live backend API regardless of PROD=%s or VITE_USE_MOCK_REVIEW_GATES', async (isProd) => {
    vi.stubEnv('PROD', isProd)
    vi.stubEnv('VITE_USE_MOCK_REVIEW_GATES', 'true')
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ projectId: 'server-project', gates: [] }))
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()
    const api = await import('../../features/review-gates/api/review-gates-api')
    expect(await api.getStudentReviewTimeline()).toMatchObject({ projectId: 'server-project' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('/students/me/review-gates/timeline')
  })
})
