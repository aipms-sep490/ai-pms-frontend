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
    expect(supervisor.getCandidates).toHaveBeenCalledWith(9, { search: undefined, expertise: undefined, assignmentType: 'PRIMARY', majorId: undefined })
    await act(async () => { expect(await result.current.send(candidate as never, 'Message')).toBe(true) })
    expect(supervisor.sendRequest).toHaveBeenCalledWith(9, 4, 'Message', 'PRIMARY', undefined)
  })

  it('keeps draft filters local until the explicit filter action applies them to the project-scoped API', async () => {
    const { result } = renderHook(() => useSupervisorSelection({ project: project as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: actions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.candidates).toHaveLength(1))
    await act(async () => { result.current.setQuery({ search: ' Mai ', expertise: ' AI ' }) })
    expect(supervisor.getCandidates).toHaveBeenCalledTimes(1)
    await act(async () => { await result.current.applyFilters() })
    expect(supervisor.getCandidates).toHaveBeenLastCalledWith(9, { search: 'Mai', expertise: 'AI', assignmentType: 'PRIMARY', majorId: undefined })
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

  it('derives missingMentorMajorIds from the submit action reasons, not from assignments', async () => {
    const draftProject = { id: 9, status: 'Draft' }
    const draftActions = { actions: [{ code: 'send_supervisor_request', allowed: true, reasons: [] }, { code: 'submit_project', allowed: false, reasons: ['SUPERVISOR_NOT_CONFIRMED', 'MENTOR_NOT_CONFIRMED:7', 'MENTOR_NOT_CONFIRMED:9'] }] }
    const { result } = renderHook(() => useSupervisorSelection({ project: draftProject as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: draftActions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missingMentorMajorIds).toEqual([7, 9])
    expect(result.current.canSendMentor).toBe(true)
  })

  it('reads reasons off resubmit_project while the project is in REVISIONREQUIRED', async () => {
    const revisionProject = { id: 9, status: 'RevisionRequired' }
    const revisionActions = { actions: [{ code: 'send_supervisor_request', allowed: true, reasons: [] }, { code: 'resubmit_project', allowed: false, reasons: ['MENTOR_NOT_CONFIRMED:3'] }] }
    const { result } = renderHook(() => useSupervisorSelection({ project: revisionProject as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: revisionActions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missingMentorMajorIds).toEqual([3])
  })

  it('sends a DISCIPLINE_MENTOR request for a major that still needs one', async () => {
    const draftProject = { id: 9, status: 'Draft' }
    const draftActions = { actions: [{ code: 'send_supervisor_request', allowed: true, reasons: [] }, { code: 'submit_project', allowed: false, reasons: ['MENTOR_NOT_CONFIRMED:7'] }] }
    const refreshAll = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useSupervisorSelection({ project: draftProject as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: draftActions as never, refreshAll }))
    await waitFor(() => expect(result.current.candidates).toHaveLength(1))
    await act(async () => { expect(await result.current.send(candidate as never, undefined, 'DISCIPLINE_MENTOR', 7)).toBe(true) })
    expect(supervisor.sendRequest).toHaveBeenCalledWith(9, 4, undefined, 'DISCIPLINE_MENTOR', 7)
  })

  it('refuses a mentor request for a major the backend did not flag as missing', async () => {
    const draftProject = { id: 9, status: 'Draft' }
    const draftActions = { actions: [{ code: 'send_supervisor_request', allowed: true, reasons: [] }, { code: 'submit_project', allowed: false, reasons: ['MENTOR_NOT_CONFIRMED:7'] }] }
    const { result } = renderHook(() => useSupervisorSelection({ project: draftProject as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: draftActions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.candidates).toHaveLength(1))
    await act(async () => { expect(await result.current.send(candidate as never, undefined, 'DISCIPLINE_MENTOR', 99)).toBe(false) })
    expect(supervisor.sendRequest).not.toHaveBeenCalled()
  })

  it('still loads mentor candidates once a primary assignment already exists', async () => {
    supervisor.getAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, isPrimary: true, assignedAt: '2026-09-15' }] })
    const draftActions = { actions: [{ code: 'send_supervisor_request', allowed: true, reasons: [] }, { code: 'submit_project', allowed: false, reasons: ['MENTOR_NOT_CONFIRMED:7'] }] }
    const { result } = renderHook(() => useSupervisorSelection({ project: project as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: draftActions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.candidates).toHaveLength(1))
    expect(result.current.activeAssignment).toBeTruthy()
    expect(supervisor.getCandidates).toHaveBeenLastCalledWith(9, expect.objectContaining({ assignmentType: 'DISCIPLINE_MENTOR', majorId: 7 }))
  })

  it('reloads candidates for the selected mentor major and ignores a late response from another slot', async () => {
    const draftActions = { actions: [...actions.actions, { code: 'submit_project', allowed: false, reasons: ['MENTOR_NOT_CONFIRMED:7', 'MENTOR_NOT_CONFIRMED:9'] }] }
    const { result } = renderHook(() => useSupervisorSelection({ project: project as never, team: leaderTeam as never, profile: { id: 2 } as never, actions: draftActions as never, refreshAll: vi.fn() }))
    await waitFor(() => expect(result.current.candidates).toHaveLength(1))
    let finishOldRead!: (value: unknown) => void
    supervisor.getCandidates.mockImplementationOnce(() => new Promise(resolve => { finishOldRead = resolve }))
    act(() => result.current.setSlotKey('MENTOR-7'))
    await waitFor(() => expect(supervisor.getCandidates).toHaveBeenLastCalledWith(9, expect.objectContaining({ assignmentType: 'DISCIPLINE_MENTOR', majorId: 7 })))
    const nextCandidate = { ...candidate, id: 8, fullName: 'Marketing Mentor' }
    supervisor.getCandidates.mockResolvedValueOnce({ items: [nextCandidate] })
    act(() => result.current.setSlotKey('MENTOR-9'))
    await waitFor(() => expect(result.current.candidates[0]?.id).toBe(8))
    await act(async () => { finishOldRead({ items: [candidate] }) })
    expect(result.current.candidates[0]?.id).toBe(8)
    expect(result.current.slotKey).toBe('MENTOR-9')
  })
})
