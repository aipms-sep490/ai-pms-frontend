import { afterEach, describe, expect, it, vi } from 'vitest'
import { cancelRequest, getAssignments, getCandidates, getOwnAssignments, getRequests, getSupervisorInbox, respondToSupervisorRequest, sendRequest } from './supervisors.api'

const ok = (value: unknown) => ({ ok: true, json: async () => value })
afterEach(() => vi.unstubAllGlobals())

describe('supervision API contracts', () => {
  it('uses the project-specific candidate route, never the generic supervisor directory', async () => {
    const fetch = vi.fn().mockResolvedValue(ok({ items: [] }))
    vi.stubGlobal('fetch', fetch)
    await getCandidates(9, { search: 'AI', expertise: 'ML', page: 2, pageSize: 10 })
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/9/supervisor-candidates?page=2&pageSize=10&search=AI&expertise=ML', expect.anything())
  })

  it('serializes student request, cancel, project requests, assignments, and backend-scoped inbox routes', async () => {
    const fetch = vi.fn().mockResolvedValue(ok({ items: [] }))
    vi.stubGlobal('fetch', fetch)
    await sendRequest(9, 4, 'Please supervise')
    await getRequests(9, { status: 'PENDING', page: 2, pageSize: 10 })
    await cancelRequest(12)
    await getAssignments(9, { page: 3, pageSize: 5 })
    await getSupervisorInbox({ status: 'PENDING', page: 2, pageSize: 10 })
    await getOwnAssignments({ page: 2, pageSize: 10 })
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/9/supervisor-requests', expect.objectContaining({ method: 'POST', body: JSON.stringify({ supervisorProfileId: 4, message: 'Please supervise' }) }))
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/9/supervisor-requests?page=2&pageSize=10&status=PENDING', expect.anything())
    expect(fetch).toHaveBeenCalledWith('/api/v1/supervisor-requests/12/cancel', expect.objectContaining({ method: 'POST' }))
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/9/supervisor-assignments?page=3&pageSize=5', expect.anything())
    expect(fetch).toHaveBeenCalledWith('/api/v1/supervisors/requests?page=2&pageSize=10&status=PENDING', expect.anything())
    expect(fetch).toHaveBeenCalledWith('/api/v1/supervisors/assignments?page=2&pageSize=10', expect.anything())
  })

  it('sends the optional response message only to the requested supervisor decision route', async () => {
    const fetch = vi.fn().mockResolvedValue(ok({}))
    vi.stubGlobal('fetch', fetch)
    await respondToSupervisorRequest(12, 'accept', 'I can take this project')
    await respondToSupervisorRequest(13, 'reject', 'Capacity conflict')
    expect(fetch).toHaveBeenCalledWith('/api/v1/supervisor-requests/12/accept', expect.objectContaining({ method: 'POST', body: JSON.stringify({ message: 'I can take this project' }) }))
    expect(fetch).toHaveBeenCalledWith('/api/v1/supervisor-requests/13/reject', expect.objectContaining({ method: 'POST', body: JSON.stringify({ message: 'Capacity conflict' }) }))
  })
})
