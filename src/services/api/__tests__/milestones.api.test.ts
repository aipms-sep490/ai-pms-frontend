import { afterEach, describe, expect, it, vi } from 'vitest'
import * as milestones from '../milestones.api'

const jsonResponse = (body: unknown) => ({ ok: true, status: 200, statusText: 'OK', json: async () => body }) as unknown as Response
const noContent = () => ({ ok: true, status: 204, statusText: 'No Content', json: async () => { throw new Error('204 must not parse JSON') } }) as unknown as Response

describe('milestones api', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = originalFetch })
  it('uses the verified project read routes', async () => { globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse([])); await milestones.getProjectMilestones(9); await milestones.getProjectMilestoneProgress(9); expect(globalThis.fetch).toHaveBeenNthCalledWith(1, '/api/v1/milestones/project/9', expect.objectContaining({ method: 'GET' })); expect(globalThis.fetch).toHaveBeenNthCalledWith(2, '/api/v1/milestones/project/9/progress', expect.objectContaining({ method: 'GET' })) })
  it('uses JSON responses for create and update with exact bodies', async () => { globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ id: 1 })); await milestones.createMilestone({ projectId: 9, title: 'M1', sortOrder: 0 }); await milestones.updateMilestone(1, { title: 'M1', sortOrder: 0, status: 'PLANNED' }); const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; expect(calls[0][1].body).toBe(JSON.stringify({ projectId: 9, title: 'M1', sortOrder: 0 })); expect(calls[1][1].body).toBe(JSON.stringify({ title: 'M1', sortOrder: 0, status: 'PLANNED' })) })
  it('does not parse 204 delete and reorder responses', async () => { globalThis.fetch = vi.fn().mockResolvedValue(noContent()); await milestones.deleteMilestone(1); await milestones.reorderMilestones(9, [{ milestoneId: 1, sortOrder: 0 }]); expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.map(([url, init]) => [url, init.method])).toEqual([['/api/v1/milestones/1', 'DELETE'], ['/api/v1/milestones/project/9/reorder', 'POST']]) })
})
