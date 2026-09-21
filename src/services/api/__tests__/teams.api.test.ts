import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as teamsApi from '../teams.api'

const runtime = vi.hoisted(() => ({ env: { apiBaseUrl: '/api/v1', isMockMode: false } }))
vi.mock('../../../app/config/env', () => runtime)

const success = (body: unknown, status = 200) => ({
  ok: true,
  status,
  statusText: 'OK',
  json: async () => body,
}) as unknown as Response

const noContent = () => ({
  ok: true,
  status: 204,
  statusText: 'No Content',
  json: async () => { throw new Error('204 must not parse JSON') },
}) as unknown as Response

describe('teams.api contract', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    runtime.env.isMockMode = false
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
    runtime.env.isMockMode = false
  })

  it('uses the current and detail Team routes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success({ id: 28 }))
    globalThis.fetch = fetchMock

    await teamsApi.getCurrentTeam(7)
    await teamsApi.getTeam(28)

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/teams/current?academicSemesterId=7',
      '/api/v1/teams/28',
    ])
  })

  it('keeps a mock eligibility PASS eligible and leaves roster locking to a separate backend transition', async () => {
    runtime.env.isMockMode = true

    const refreshed = await teamsApi.refreshEligibility(28)

    expect(refreshed.status).toBe('ELIGIBLE')
    expect(refreshed.eligibility).toMatchObject({ canRegister: true, rosterLocked: false, reasons: [] })
  })

  it('serializes candidate search and paging at the backend endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(success({ items: [], page: 2, pageSize: 10, totalCount: 0, totalPages: 0 }))

    await teamsApi.getInvitationCandidates(28, { search: 'Nguyen Van A', page: 2, pageSize: 10 })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/teams/28/invitation-candidates?page=2&pageSize=10&search=Nguyen+Van+A',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('uses the backend invitation list routes without browser-side recipient filtering', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 }))
    globalThis.fetch = fetchMock

    await teamsApi.getInvitations(28, 3, 5)
    await teamsApi.getInvitations(undefined, 2, 10)

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/teams/invitations?teamId=28&page=3&pageSize=5',
      '/api/v1/teams/invitations?page=2&pageSize=10',
    ])
  })

  it('uses the persisted Team create and update routes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(success({ id: 28 }))
      .mockResolvedValueOnce(success({ id: 28 }))
    globalThis.fetch = fetchMock

    await teamsApi.createTeam({ academicSemesterId: 7, code: 'SE28', name: 'Team SE28', description: 'Capstone' })
    await teamsApi.updateTeam(28, { name: 'Team SE28 Updated', description: null })

    expect(fetchMock.mock.calls[0]).toEqual([
      '/api/v1/teams',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ academicSemesterId: 7, code: 'SE28', name: 'Team SE28', description: 'Capstone' }) }),
    ])
    expect(fetchMock.mock.calls[1]).toEqual([
      '/api/v1/teams/28',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'Team SE28 Updated', description: null }) }),
    ])
  })

  it('handles every backend 204 roster mutation without parsing JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(noContent())
    globalThis.fetch = fetchMock

    await expect(teamsApi.rejectInvitation(1)).resolves.toBeUndefined()
    await expect(teamsApi.cancelInvitation(2)).resolves.toBeUndefined()
    await expect(teamsApi.removeMember(28, 3)).resolves.toBeUndefined()
    await expect(teamsApi.leaveTeam(28)).resolves.toBeUndefined()

    expect(fetchMock.mock.calls.map(([url, init]) => [url, (init as RequestInit).method])).toEqual([
      ['/api/v1/teams/invitations/1/reject', 'POST'],
      ['/api/v1/teams/invitations/2/cancel', 'POST'],
      ['/api/v1/teams/28/members/3', 'DELETE'],
      ['/api/v1/teams/28/leave', 'POST'],
    ])
  })

  it('uses persisted invite, accept, and transfer-leader routes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success({ id: 28 }))
    globalThis.fetch = fetchMock

    await teamsApi.inviteMember(28, { invitedUserId: 9, message: 'Join us' })
    await teamsApi.acceptInvitation(3)
    await teamsApi.transferLeader(28, 9)

    expect(fetchMock.mock.calls.map(([url, init]) => [url, (init as RequestInit).method])).toEqual([
      ['/api/v1/teams/28/invitations', 'POST'],
      ['/api/v1/teams/invitations/3/accept', 'POST'],
      ['/api/v1/teams/28/leader', 'POST'],
    ])
  })

  it('uses the real eligibility refresh command and returns the backend TeamDto', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(success({ id: 28, eligibility: { canRegister: true } }))

    const refreshed = await teamsApi.refreshEligibility(28)

    expect(refreshed).toMatchObject({ id: 28, eligibility: { canRegister: true } })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/teams/28/eligibility/refresh', expect.objectContaining({ method: 'POST' }))
  })

  it('does not expose a pending-qualification student as a mock invitation candidate', async () => {
    runtime.env.isMockMode = true

    const candidates = await teamsApi.getInvitationCandidates(28)

    expect(candidates.items.map((candidate) => candidate.userId)).not.toContain(5)
    expect(candidates.items.every((candidate) => candidate.canInvite)).toBe(true)
  })

})
