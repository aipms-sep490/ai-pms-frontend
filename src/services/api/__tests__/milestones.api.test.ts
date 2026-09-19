import { afterEach, describe, expect, it, vi } from 'vitest'
import * as milestones from '../milestones.api'

const response = (body: unknown, status = 200) => ({ ok: true, status, statusText: 'OK', json: async () => body }) as unknown as Response
describe('milestones api', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = originalFetch })
  it('uses the verified project read routes', async () => { globalThis.fetch = vi.fn().mockResolvedValue(response([])); await milestones.getProjectMilestones(9); await milestones.getProjectMilestoneProgress(9); expect(globalThis.fetch).toHaveBeenNthCalledWith(1, '/api/v1/milestones/project/9', expect.objectContaining({ method: 'GET' })); expect(globalThis.fetch).toHaveBeenNthCalledWith(2, '/api/v1/milestones/project/9/progress', expect.objectContaining({ method: 'GET' })) })
  it('uses create, update, delete, and 204 reorder contracts', async () => { globalThis.fetch = vi.fn().mockResolvedValue(response(null, 204)); await milestones.createMilestone({ projectId: 9, title: 'M1', sortOrder: 0 }); await milestones.updateMilestone(1, { title: 'M1', sortOrder: 0, status: 'PLANNED' }); await milestones.deleteMilestone(1); await milestones.reorderMilestones(9, [{ milestoneId: 1, sortOrder: 0 }]); const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls; expect(calls.map(([url, init]) => [url, init.method])).toEqual([['/api/v1/milestones','POST'],['/api/v1/milestones/1','PUT'],['/api/v1/milestones/1','DELETE'],['/api/v1/milestones/project/9/reorder','POST']]) })
})
