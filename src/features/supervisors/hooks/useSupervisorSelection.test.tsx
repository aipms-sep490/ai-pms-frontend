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

  it('keeps draft filters local until the explicit filter action applies them to the project-scoped API', async () => {
    const { result } = renderHook(() => useSupervisorSelection({ project: project as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: actions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.candidates).toHaveLength(1))
    await act(async () => { result.current.setQuery({ search: ' Mai ', expertise: ' AI ' }) })
    expect(supervisor.getCandidates).toHaveBeenCalledTimes(1)
    await act(async () => { await result.current.applyFilters() })
    expect(supervisor.getCandidates).toHaveBeenLastCalledWith(9, { search: 'Mai', expertise: 'AI' })
  })

  it('does not expose a send operation to a student member even when an action payload is stale', async () => {
    const { result } = renderHook(() => useSupervisorSelection({ project: project as never, team: { members: [{ userId: 2, isLeader: false }] } as never, profile: { id: 2 } as never, actions: actions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canSend).toBe(false)
    await act(async () => { expect(await result.current.send(candidate as never)).toBe(false) })
    expect(supervisor.sendRequest).not.toHaveBeenCalled()
  })

  it('does not retry a capacity/race conflict and refreshes project-specific candidates for a human reselection', async () => {
    supervisor.sendRequest.mockRejectedValueOnce({ status: 409 })
    const { result } = renderHook(() => useSupervisorSelection({ project: project as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: actions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.candidates).toHaveLength(1))
    await act(async () => { expect(await result.current.send(candidate as never)).toBe(false) })
    expect(supervisor.sendRequest).toHaveBeenCalledTimes(1)
    expect(supervisor.getCandidates).toHaveBeenCalledTimes(2)
    expect(result.current.error?.kind).toBe('conflict')
  })

  it('refreshes request and candidate data after a 422 without choosing a fallback candidate', async () => {
    supervisor.sendRequest.mockRejectedValueOnce({ status: 422, message: 'Candidate capacity changed.' })
    const { result } = renderHook(() => useSupervisorSelection({ project: project as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: actions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.candidates).toHaveLength(1))
    await act(async () => { expect(await result.current.send(candidate as never)).toBe(false) })
    expect(supervisor.sendRequest).toHaveBeenCalledTimes(1)
    expect(supervisor.getRequests).toHaveBeenCalledTimes(2)
    expect(supervisor.getCandidates).toHaveBeenCalledTimes(2)
    expect(result.current.error?.kind).toBe('validation')
  })

  it('does not send when a refreshed primary assignment already exists', async () => {
    supervisor.getAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, isPrimary: true, assignedAt: '2026-09-15' }] })
    const { result } = renderHook(() => useSupervisorSelection({ project: project as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: actions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { expect(await result.current.send(candidate as never)).toBe(false) })
    expect(supervisor.sendRequest).not.toHaveBeenCalled()
  })

  it('cancels only a currently pending request', async () => {
    const pending = { id: 1, projectId: 9, status: 'PENDING' }
    supervisor.getRequests.mockResolvedValue({ items: [pending] })
    const { result } = renderHook(() => useSupervisorSelection({ project: project as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: actions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.requests).toHaveLength(1))
    await act(async () => { expect(await result.current.cancel({ ...pending, status: 'CANCELLED' } as never)).toBe(false) })
    expect(supervisor.cancelRequest).not.toHaveBeenCalled()
  })

  it('refreshes but does not replay a stale cancel operation', async () => {
    const pending = { id: 1, projectId: 9, status: 'PENDING' }
    supervisor.getRequests.mockResolvedValue({ items: [pending] })
    supervisor.cancelRequest.mockRejectedValueOnce({ status: 409, message: 'Request already processed.' })
    const { result } = renderHook(() => useSupervisorSelection({ project: project as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: actions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.requests).toHaveLength(1))
    await act(async () => { expect(await result.current.cancel(pending as never)).toBe(false) })
    expect(supervisor.cancelRequest).toHaveBeenCalledTimes(1)
    expect(supervisor.getRequests).toHaveBeenCalledTimes(2)
    expect(result.current.error?.message).toContain('Request already processed.')
  })
})
