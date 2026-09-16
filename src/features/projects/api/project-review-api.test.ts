import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  decideDepartment,
  decideProjectReview,
  getProjectForReview,
  getReviewActions,
  getReviewDetail,
  getReviewHistory,
  getReviewQueue,
  startReview,
} from './project-review-api'

afterEach(() => vi.unstubAllGlobals())
const ok = (value: unknown) => ({ ok: true, json: async () => value })

describe('project review API contract', () => {
  it('serializes only the supported queue search and paging parameters', async () => {
    const fetch = vi.fn().mockResolvedValue(ok({ items: [] }))
    vi.stubGlobal('fetch', fetch)
    await getReviewQueue({ page: 3, pageSize: 10, search: ' capstone ' }, 'token')
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/review-queue?page=3&pageSize=10&search=capstone', expect.anything())
  })

  it('uses the authoritative project review, project, history, and actions routes', async () => {
    const fetch = vi.fn().mockResolvedValue(ok({}))
    vi.stubGlobal('fetch', fetch)
    await getProjectForReview(4, 'token')
    await getReviewDetail(4, 'token')
    await getReviewHistory(4, 'token')
    await getReviewActions(4, 'token')
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/4', expect.anything())
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/4/academic-review', expect.anything())
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/4/history', expect.anything())
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/4/actions', expect.anything())
  })

  it('sends backend concurrency and snapshot fields without a client-derived approval decision', async () => {
    const fetch = vi.fn().mockResolvedValue(ok({}))
    vi.stubGlobal('fetch', fetch)
    await startReview(4, 'server-token', 'token')
    await decideProjectReview(4, 'approve', 'server-token', undefined, 'token')
    await decideProjectReview(4, 'revision', 'server-token', 'Need scope evidence', 'token')
    await decideDepartment(4, { snapshotId: 8, concurrencyToken: 'server-token', decision: 'REJECTED', reason: 'Missing consent' }, 'token')
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/4/start-review', expect.objectContaining({ body: JSON.stringify({ concurrencyToken: 'server-token' }) }))
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/4/approve', expect.objectContaining({ body: JSON.stringify({ concurrencyToken: 'server-token' }) }))
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/4/revision', expect.objectContaining({ body: JSON.stringify({ concurrencyToken: 'server-token', reason: 'Need scope evidence' }) }))
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/4/department-decisions', expect.objectContaining({ body: JSON.stringify({ snapshotId: 8, concurrencyToken: 'server-token', decision: 'REJECTED', reason: 'Missing consent' }) }))
  })
})
