import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const gateway = vi.hoisted(() => ({
  supervisor: { getSupervisorInbox: vi.fn(), getOwnAssignments: vi.fn(), respondToSupervisorRequest: vi.fn() },
  project: { getProject: vi.fn() },
  team: { getTeam: vi.fn(), getLeaderChangeRequests: vi.fn(), respondToLeaderChange: vi.fn() },
}))
const { supervisor } = gateway
vi.mock('../../../services/service-gateway', () => ({ services: gateway }))
import { useSupervisorInbox } from './useSupervisorInbox'

const request = { id: 8, projectId: 9, supervisorProfileId: 4, requestedBy: 2, status: 'PENDING', requestedAt: '2026-09-15' }

describe('useSupervisorInbox', () => {
  beforeEach(() => {
    supervisor.getSupervisorInbox.mockReset().mockResolvedValue({ items: [request] })
    supervisor.getOwnAssignments.mockReset().mockResolvedValue({ items: [] })
    supervisor.respondToSupervisorRequest.mockReset().mockResolvedValue({ ...request, status: 'ACCEPTED', assignmentId: 3 })
    gateway.project.getProject.mockReset().mockResolvedValue({ id: 9, teamId: 2, title: 'Project', status: 'ACTIVE' })
    gateway.team.getTeam.mockReset().mockResolvedValue({ id: 2, name: 'Team', members: [] })
    gateway.team.getLeaderChangeRequests.mockReset().mockResolvedValue({ items: [] })
    gateway.team.respondToLeaderChange.mockReset()
  })

  it('uses Backend-scoped inbox data directly and refreshes assignment data after accept', async () => {
    const assignment = { id: 3, projectId: 9, supervisorProfileId: 4, supervisorUserId: 4, supervisorName: 'Dr. Mai', supervisorRequestId: 8, isPrimary: true, assignedAt: '2026-09-15' }
    supervisor.getOwnAssignments.mockReset()
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [assignment] })
    const { result } = renderHook(() => useSupervisorInbox())
    await waitFor(() => expect(result.current.requests).toHaveLength(1))
    await act(async () => { expect(await result.current.respond(request, 'accept', 'Accepted')).toBe(true) })
    expect(supervisor.respondToSupervisorRequest).toHaveBeenCalledWith(8, 'accept', 'Accepted')
    expect(supervisor.getSupervisorInbox).toHaveBeenCalledTimes(2)
    expect(supervisor.getOwnAssignments).toHaveBeenCalledTimes(2)
    expect(result.current.assignments).toEqual([assignment])
    expect(result.current.projects[9]?.status).toBe('ACTIVE')
  })

  it('does not replay a stale supervisor decision after a 409', async () => {
    supervisor.respondToSupervisorRequest.mockRejectedValueOnce({ status: 409, message: 'Supervisor capacity changed.' })
    const { result } = renderHook(() => useSupervisorInbox())
    await waitFor(() => expect(result.current.requests).toHaveLength(1))
    await act(async () => { expect(await result.current.respond(request, 'reject')).toBe(false) })
    expect(supervisor.respondToSupervisorRequest).toHaveBeenCalledTimes(1)
    expect(supervisor.getSupervisorInbox).toHaveBeenCalledTimes(2)
    expect(result.current.error?.kind).toBe('conflict')
    expect(result.current.error?.message).toContain('Supervisor capacity changed.')
  })

  it('does not let a rendered but no-longer-pending request be decided again', async () => {
    const { result } = renderHook(() => useSupervisorInbox())
    await waitFor(() => expect(result.current.requests).toHaveLength(1))
    await act(async () => { expect(await result.current.respond({ ...request, status: 'CANCELLED' }, 'reject')).toBe(false) })
    expect(supervisor.respondToSupervisorRequest).not.toHaveBeenCalled()
  })
})
