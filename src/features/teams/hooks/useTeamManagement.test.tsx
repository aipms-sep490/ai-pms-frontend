import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'

const mocked = vi.hoisted(() => ({
  journey: { useStudentJourney: vi.fn() },
  team: {
    getInvitations: vi.fn(), getInvitationCandidates: vi.fn(), createTeam: vi.fn(), updateTeam: vi.fn(),
    inviteMember: vi.fn(), acceptInvitation: vi.fn(), rejectInvitation: vi.fn(), cancelInvitation: vi.fn(),
    removeMember: vi.fn(), leaveTeam: vi.fn(), transferLeader: vi.fn(), refreshEligibility: vi.fn(),
    getLeaderChangeRequests: vi.fn(), requestLeaderChange: vi.fn(),
  },
}))

vi.mock('../../../app/context', () => ({ useStudentJourney: mocked.journey.useStudentJourney }))
vi.mock('../../../services/service-gateway', () => ({ services: { team: mocked.team } }))

import { TeamManagementOperationError, useTeamManagement } from './useTeamManagement'

const invitation = { id: 12, teamId: 28, invitedUserId: 99, invitedBy: 2, status: 'PENDING', createdAt: '2026-09-15T00:00:00Z' }
const team = {
  id: 28, academicSemesterId: 7, code: 'SE28', name: 'Team SE28', status: 'FORMING', members: [
    { userId: 1, fullName: 'Leader', isEligibleStudent: true, isLeader: true },
  ], eligibility: { canRegister: false, rosterLocked: false, reasons: [] },
}

const page = (items = [invitation]) => ({ items, page: 1, pageSize: 20, totalCount: items.length, totalPages: 1 })

function journeyState() {
  return {
    team, profile: { id: 1, fullName: 'Leader' }, semester: { id: 7, name: 'FA26' }, period: null,
    workflowContext: { actions: [] }, teamActions: { actions: [
      { code: 'invite_member', allowed: true, reasons: [] },
      { code: 'view_team_invitations', allowed: true, reasons: [] },
      { code: 'remove_member', allowed: true, reasons: [] },
      { code: 'edit_team', allowed: true, reasons: [] },
    ] },
    refreshAll: vi.fn().mockResolvedValue(undefined), isLoading: false,
  }
}

describe('useTeamManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocked.journey.useStudentJourney.mockReturnValue(journeyState())
    mocked.team.getInvitations.mockResolvedValue(page())
    mocked.team.getInvitationCandidates.mockResolvedValue(page([]))
    mocked.team.getLeaderChangeRequests.mockResolvedValue(page([]))
    Object.values(mocked.team).forEach((method) => {
      if (method.mock.calls.length === 0 && !method.getMockImplementation()) method.mockResolvedValue(undefined)
    })
  })

  it('uses the backend-scoped received invitation response directly', async () => {
    const { result } = renderHook(() => useTeamManagement())

    await waitFor(() => expect(result.current.receivedInvitations).toEqual([invitation]))
    expect(result.current.receivedInvitations[0]?.invitedUserId).toBe(99)
  })

  it('does not request leader invitations for a member and keeps the received list', async () => {
    const member = journeyState()
    member.profile.id = 2
    member.team.members.push({ userId: 2, fullName: 'Member', isEligibleStudent: true, isLeader: false })
    member.teamActions.actions = [{ code: 'view_team_invitations', allowed: false, reasons: [] }]
    mocked.journey.useStudentJourney.mockReturnValue(member)
    mocked.team.getInvitations.mockImplementation((teamId?: number) => teamId
      ? Promise.reject(new HttpError('Leader only', 403)) : Promise.resolve(page([invitation])))
    const { result } = renderHook(() => useTeamManagement())
    await waitFor(() => expect(result.current.receivedInvitations).toEqual([invitation]))
    expect(mocked.team.getInvitations).toHaveBeenCalledWith()
    expect(mocked.team.getInvitations).not.toHaveBeenCalledWith(28)
    expect(result.current.error).toBeNull()
  })

  it('loads both lists for a leader even when invitations can no longer be sent', async () => {
    const leader = journeyState()
    leader.teamActions.actions = [{ code: 'view_team_invitations', allowed: true, reasons: [] }]
    mocked.journey.useStudentJourney.mockReturnValue(leader)
    const { result } = renderHook(() => useTeamManagement())
    await waitFor(() => expect(result.current.sentInvitations).toEqual([invitation]))
    expect(mocked.team.getInvitations).toHaveBeenCalledWith(28)
    expect(mocked.team.getInvitations).toHaveBeenCalledWith()
  })

  it('keeps received invitations when the sent request fails and records that failure separately', async () => {
    mocked.team.getInvitations.mockImplementation((teamId?: number) => teamId
      ? Promise.reject(new HttpError('Leader list denied', 403)) : Promise.resolve(page([invitation])))
    const { result } = renderHook(() => useTeamManagement())
    await waitFor(() => expect(result.current.sentInvitationError).toMatchObject({ kind: 'forbidden' }))
    expect(result.current.receivedInvitations).toEqual([invitation])
    expect(result.current.error).toBeNull()
  })

  it('reports a received-list failure with a retry even when the sent request succeeds', async () => {
    mocked.team.getInvitations.mockImplementation((teamId?: number) => teamId
      ? Promise.resolve(page([invitation])) : Promise.reject(new HttpError('Received list unavailable', 500)))
    const { result } = renderHook(() => useTeamManagement())
    await waitFor(() => expect(result.current.error).toMatchObject({ kind: 'system' }))
    expect(result.current.receivedInvitations).toEqual([])
    expect(result.current.sentInvitations).toEqual([invitation])
    expect(typeof result.current.retry).toBe('function')
  })

  it('reports the received-list failure when both invitation requests fail', async () => {
    mocked.team.getInvitations.mockRejectedValue(new HttpError('Unavailable invitations', 500))
    const { result } = renderHook(() => useTeamManagement())
    await waitFor(() => expect(result.current.error).toMatchObject({ kind: 'system' }))
    expect(result.current.sentInvitationError).toMatchObject({ kind: 'system' })
    expect(result.current.receivedInvitations).toEqual([])
    expect(result.current.sentInvitations).toEqual([])
  })

  it('accepts an invitation without requesting sent invitations as a member', async () => {
    const member = journeyState()
    member.profile.id = 2
    member.team.members.push({ userId: 2, fullName: 'Member', isEligibleStudent: true, isLeader: false })
    member.teamActions.actions = [{ code: 'view_team_invitations', allowed: false, reasons: [] }]
    mocked.journey.useStudentJourney.mockReturnValue(member)
    mocked.team.acceptInvitation.mockResolvedValue(team)
    const { result } = renderHook(() => useTeamManagement())
    await result.current.acceptInvitation(12)
    await waitFor(() => expect(result.current.receivedInvitations).toEqual([invitation]))
    expect(result.current.error).toBeNull()
    expect(mocked.team.getInvitations).not.toHaveBeenCalledWith(28)
  })

  it('refreshes authoritative context and invitations after a successful 204 mutation', async () => {
    const current = journeyState()
    mocked.journey.useStudentJourney.mockReturnValue(current)
    mocked.team.rejectInvitation.mockResolvedValue(undefined)
    const { result } = renderHook(() => useTeamManagement())

    await waitFor(() => expect(mocked.team.getInvitations).toHaveBeenCalled())
    await result.current.rejectInvitation(12)

    expect(current.refreshAll).toHaveBeenCalledOnce()
    await waitFor(() => expect(mocked.team.getInvitations.mock.calls.length).toBeGreaterThan(2))
  })

  it('runs the explicit backend eligibility command once and then refreshes authoritative Team state', async () => {
    const current = journeyState()
    mocked.journey.useStudentJourney.mockReturnValue(current)
    mocked.team.refreshEligibility.mockResolvedValue(team)
    const { result } = renderHook(() => useTeamManagement())

    await result.current.refreshEligibility()

    expect(mocked.team.refreshEligibility).toHaveBeenCalledWith(28)
    expect(current.refreshAll).toHaveBeenCalledOnce()
  })

  it.each([
    [401, 'authentication'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [409, 'conflict'],
    [422, 'validation'],
  ] as const)('classifies eligibility refresh HTTP %s as %s without auto-resubmitting', async (status, kind) => {
    mocked.team.refreshEligibility.mockRejectedValue(new HttpError('Sensitive eligibility backend detail', status))
    const current = journeyState()
    mocked.journey.useStudentJourney.mockReturnValue(current)
    const { result } = renderHook(() => useTeamManagement())

    await expect(result.current.refreshEligibility()).rejects.toBeInstanceOf(TeamManagementOperationError)

    expect(mocked.team.refreshEligibility).toHaveBeenCalledOnce()
    await waitFor(() => expect(result.current.error).toMatchObject({ kind }))
    expect(result.current.error?.message).not.toContain('Sensitive eligibility backend detail')
    expect(current.refreshAll).toHaveBeenCalledTimes(status === 409 ? 1 : 0)
  })

  it('does not retry a 409 mutation and refreshes the latest Team state once', async () => {
    const current = journeyState()
    mocked.journey.useStudentJourney.mockReturnValue(current)
    mocked.team.inviteMember.mockRejectedValue(new HttpError('Already invited', 409))
    const { result } = renderHook(() => useTeamManagement())

    await waitFor(() => expect(mocked.team.getInvitationCandidates).toHaveBeenCalled())
    await expect(result.current.inviteMember(99)).rejects.toBeInstanceOf(TeamManagementOperationError)

    expect(mocked.team.inviteMember).toHaveBeenCalledOnce()
    expect(current.refreshAll).toHaveBeenCalledOnce()
    await waitFor(() => expect(result.current.error).toMatchObject({ kind: 'conflict' }))
  })

  it.each([
    [401, 'authentication'],
    [403, 'forbidden'],
    [404, 'not-found'],
  ] as const)('classifies a %s response without exposing backend text', async (status, kind) => {
    mocked.team.acceptInvitation.mockRejectedValue(new HttpError('Sensitive backend detail', status))
    const { result } = renderHook(() => useTeamManagement())

    await expect(result.current.acceptInvitation(12)).rejects.toBeInstanceOf(TeamManagementOperationError)

    await waitFor(() => expect(result.current.error).toMatchObject({ kind }))
    expect(result.current.error?.message).not.toContain('Sensitive backend detail')
  })
})
