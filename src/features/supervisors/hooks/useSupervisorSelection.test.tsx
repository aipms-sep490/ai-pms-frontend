import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const supervisor = vi.hoisted(() => ({ getRequests: vi.fn(), getAssignments: vi.fn(), getCandidates: vi.fn(), sendRequest: vi.fn(), cancelRequest: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { supervisor } }))
import { useSupervisorSelection } from './useSupervisorSelection'

const candidate = { id: 4, fullName: 'Supervisor', departmentName: 'SE', expertise: [], activeProjects: 1, remainingSlots: 2, semesterLimit: 5 }
const project = { id: 9, status: 'Approved' }
const leaderTeam = { members: [{ userId: 2, isLeader: true }] }
const actions = { actions: [{ code: 'send_supervisor_request', allowed: true, reasons: [] }] }

describe('useSupervisorSelection', () => {
  beforeEach(() => {
    supervisor.getRequests.mockReset().mockResolvedValue({ items: [] })
    supervisor.getAssignments.mockReset().mockResolvedValue({ items: [] })
    supervisor.getCandidates.mockReset().mockResolvedValue({ items: [candidate] })
    supervisor.sendRequest.mockReset().mockResolvedValue({ id: 1, status: 'PENDING' })
    supervisor.cancelRequest.mockReset().mockResolvedValue({ id: 1, status: 'CANCELLED' })
  })

  it('loads candidates only through the project-specific adapter and sends only for a backend-authorized leader', async () => {
    const refreshAll = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useSupervisorSelection({ project: project as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: actions as never, refreshAll }))
    await waitFor(() => expect(result.current.candidates).toHaveLength(1))
    expect(supervisor.getCandidates).toHaveBeenCalledWith(9, { search: undefined, expertise: undefined })
    await act(async () => { expect(await result.current.send(candidate as never, 'Message')).toBe(true) })
    expect(supervisor.sendRequest).toHaveBeenCalledWith(9, 4, 'Message')
  })

  it('does not expose a send operation to a student member even when an action payload is stale', async () => {
    const { result } = renderHook(() => useSupervisorSelection({ project: project as never, team: { members: [{ userId: 2, isLeader: false }] } as never, profile: { id: 2 } as never, actions: actions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canSend).toBe(false)
    await act(async () => { expect(await result.current.send(candidate as never)).toBe(false) })
    expect(supervisor.sendRequest).not.toHaveBeenCalled()
  })
})
