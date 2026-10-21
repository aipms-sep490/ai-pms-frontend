import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules() })
describe('Review Gates mock production boundary', () => {
  it.each(['true', 'false', undefined])('always disables mocks in production with flag %s', async flag => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('VITE_USE_MOCK_REVIEW_GATES', flag)
    vi.resetModules()
    expect((await import('./env')).env.reviewGatesMockEnabled).toBe(false)
  })
  it('retains explicit development mocks', async () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('VITE_USE_MOCK_REVIEW_GATES', 'true')
    vi.resetModules()
    expect((await import('./env')).env.reviewGatesMockEnabled).toBe(true)
  })
  it('calls the actual timeline transport in production even with the mock flag true', async () => {
    vi.stubEnv('PROD', true)
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
