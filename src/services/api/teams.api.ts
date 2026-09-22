import { env } from '../../app/config/env'
import {
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
} from '../http/http-client'
import type {
  TeamDto,
  TeamInvitationDto,
  PagedResult,
  TeamAcademicScopeRequest,
  TeamInvitationCandidateDto,
  TeamLeaderChangeRequestDto,
} from '../../types/backend'
import { getMockQualification, isMockStudentQualificationEligible } from '../mock/qualification.mock'
import { hasMockProjectForTeam } from './projects.api'

export interface CreateTeamPayload {
  academicSemesterId: number
  code: string
  name: string
  description?: string | null
  academicScope?: TeamAcademicScopeRequest | null
}

export interface UpdateTeamPayload {
  name: string
  description?: string | null
}

export interface InviteMemberPayload {
  invitedUserId: number
  message?: string | null
}

// In-memory fallback team for offline/dev testing
let mockTeamStore: TeamDto | null = {
  id: 28,
  code: 'SE28',
  name: 'Đội ngũ Phát triển AI-PMS',
  description: 'Nhóm nghiên cứu và xây dựng hệ thống quản lý đồ án tốt nghiệp thông minh',
  academicSemesterId: 1,
  status: 'FORMING',
  members: [
    {
      userId: 1,
      fullName: 'Phạm Ngọc Hoàng Anh',
      majorId: 101,
      organizationId: 1,
      isLeader: true,
      isEligibleStudent: true,
      isProjectQualificationEligible: true,
      qualificationStatus: 'VERIFIED',
    },
    {
      userId: 2,
      fullName: 'Nguyễn Văn Bình',
      majorId: 101,
      organizationId: 1,
      isLeader: false,
      isEligibleStudent: true,
      isProjectQualificationEligible: true,
      qualificationStatus: 'VERIFIED',
    },
    {
      userId: 3,
      fullName: 'Trần Thị Chi',
      majorId: 101,
      organizationId: 1,
      isLeader: false,
      isEligibleStudent: true,
      isProjectQualificationEligible: true,
      qualificationStatus: 'VERIFIED',
    },
    {
      userId: 4,
      fullName: 'Lê Hoàng Dũng',
      majorId: 101,
      organizationId: 1,
      isLeader: false,
      isEligibleStudent: true,
      isProjectQualificationEligible: true,
      qualificationStatus: 'VERIFIED',
    },
  ],
  eligibility: {
    canRegister: true,
    rosterLocked: false,
    reasons: [],
  },
}

let mockLeaderChangeRequests: TeamLeaderChangeRequestDto[] = []

let mockInvitationsStore: TeamInvitationDto[] = [
  {
    id: 1,
    teamId: 28,
    invitedUserId: 5,
    invitedBy: 1,
    status: 'PENDING',
    message: 'Mời gia nhập nhóm SE28',
    createdAt: '2026-09-04T10:00:00Z',
    expiresAt: null,
    respondedAt: null,
  },
]

export async function getCurrentTeam(academicSemesterId: number): Promise<TeamDto | null> {
  if (env.isMockMode) {
    return mockTeamStore
  }
  return await httpGet<TeamDto | null>(`/teams/current?academicSemesterId=${academicSemesterId}`)
}

export async function getTeam(teamId: number): Promise<TeamDto> {
  if (env.isMockMode) {
    if (mockTeamStore && mockTeamStore.id === teamId) return mockTeamStore
    throw new Error(`Team #${teamId} not found.`)
  }
  return await httpGet<TeamDto>(`/teams/${teamId}`)
}

export async function createTeam(payload: CreateTeamPayload): Promise<TeamDto> {
  if (env.isMockMode) {
    mockTeamStore = {
      id: Math.floor(Math.random() * 1000) + 100,
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
      academicSemesterId: payload.academicSemesterId,
      status: 'FORMING',
      members: [
        {
          userId: 1,
          fullName: 'Phạm Ngọc Hoàng Anh',
          majorId: 101,
          organizationId: 1,
          isLeader: true,
          isEligibleStudent: true,
        },
      ],
      eligibility: {
        canRegister: false,
        rosterLocked: false,
        reasons: ['TOO_FEW_MEMBERS'],
      },
    }
    return mockTeamStore
  }
  const created = await httpPost<TeamDto, CreateTeamPayload>('/teams', payload)
  mockTeamStore = created
  return created
}

export async function updateTeam(teamId: number, payload: UpdateTeamPayload): Promise<TeamDto> {
  if (env.isMockMode) {
    if (mockTeamStore && mockTeamStore.id === teamId) {
      mockTeamStore = {
        ...mockTeamStore,
        name: payload.name,
        description: payload.description ?? mockTeamStore.description,
      }
      return mockTeamStore
    }
    throw new Error(`Team #${teamId} not found.`)
  }
  return await httpPut<TeamDto, UpdateTeamPayload>(`/teams/${teamId}`, payload)
}

export async function setAcademicScope(teamId: number, payload: TeamAcademicScopeRequest): Promise<TeamDto> {
  if (env.isMockMode) {
    if (!mockTeamStore || mockTeamStore.id !== teamId) throw new Error(`Team #${teamId} not found.`)
    mockTeamStore = { ...mockTeamStore, academicScope: { ...payload, concurrencyToken: payload.concurrencyToken ?? 'mock-scope-token' } }
    return mockTeamStore
  }
  return httpPut<TeamDto, TeamAcademicScopeRequest>(`/teams/${teamId}/academic-scope`, payload)
}

export async function getInvitationCandidates(
  teamId: number,
  query: { search?: string; page?: number; pageSize?: number } = {},
): Promise<PagedResult<TeamInvitationCandidateDto>> {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 20
  if (env.isMockMode) {
    const search = query.search?.trim().toLowerCase() ?? ''
    const seed = [
      { userId: 5, fullName: 'Nguyễn Minh Châu', email: 'student5@example.test', studentCode: 'SE0005' },
      { userId: 6, fullName: 'Đặng Quốc Huy', email: 'student6@example.test', studentCode: 'SE0006' },
    ]
    const filtered = seed
      .filter((candidate) => isMockStudentQualificationEligible(candidate.userId))
      .filter((candidate) => !search
        || candidate.fullName.toLowerCase().includes(search)
        || candidate.email.toLowerCase().includes(search)
        || candidate.studentCode.toLowerCase().includes(search))
    const items: TeamInvitationCandidateDto[] = filtered.map((candidate) => {
      const pending = mockInvitationsStore.find((invitation) =>
        invitation.teamId === teamId && invitation.invitedUserId === candidate.userId && invitation.status === 'PENDING')
      return {
        ...candidate,
        majorId: 101,
        majorCode: 'SE',
        majorName: 'Kỹ thuật Phần mềm',
        invitationStatus: pending ? 'PENDING' : 'NONE',
        pendingInvitationId: pending?.id ?? null,
        pendingInvitationExpiresAt: pending?.expiresAt ?? null,
        canInvite: !pending,
      }
    })
    const paged = items.slice((page - 1) * pageSize, page * pageSize)
    return { items: paged, page, pageSize, totalCount: items.length, totalPages: Math.ceil(items.length / pageSize) }
  }
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (query.search) params.set('search', query.search)
  return httpGet<PagedResult<TeamInvitationCandidateDto>>(`/teams/${teamId}/invitation-candidates?${params.toString()}`)
}

export async function refreshEligibility(teamId: number): Promise<TeamDto> {
  if (env.isMockMode) {
    if (mockTeamStore && mockTeamStore.id === teamId) {
      const memberCount = mockTeamStore.members.length
      const leaders = mockTeamStore.members.filter((m) => m.isLeader)
      const reasons: string[] = []

      if (memberCount < 4) reasons.push('TOO_FEW_MEMBERS')
      if (memberCount > 5) reasons.push('TOO_MANY_MEMBERS')
      if (leaders.length !== 1) reasons.push('EXACTLY_ONE_LEADER_REQUIRED')
      if (mockTeamStore.members.some((member) => !isMockStudentQualificationEligible(member.userId))) {
        reasons.push('QUALIFICATION_REQUIRED')
      }

      const canRegister = reasons.length === 0
      mockTeamStore = {
        ...mockTeamStore,
        status: canRegister ? 'ELIGIBLE' : 'FORMING',
        members: mockTeamStore.members.map((member) => {
          const qualification = getMockQualification(member.userId)
          return {
            ...member,
            isProjectQualificationEligible: isMockStudentQualificationEligible(member.userId),
            qualificationStatus: qualification?.verificationStatus ?? 'MISSING',
          }
        }),
        eligibility: {
          canRegister,
          rosterLocked: false,
          reasons,
        },
      }
      return mockTeamStore
    }
    throw new Error(`Team #${teamId} not found.`)
  }
  return await httpPost<TeamDto>(`/teams/${teamId}/eligibility/refresh`)
}

export async function inviteMember(teamId: number, payload: InviteMemberPayload): Promise<TeamInvitationDto> {
  if (env.isMockMode) {
    if (!isMockStudentQualificationEligible(payload.invitedUserId)) {
      throw new Error('QUALIFICATION_REQUIRED')
    }
    const inv: TeamInvitationDto = {
      id: mockInvitationsStore.length + 1,
      teamId,
      invitedUserId: payload.invitedUserId,
      invitedBy: 1,
      status: 'PENDING',
      message: payload.message,
      expiresAt: null,
      createdAt: new Date().toISOString(),
      respondedAt: null,
    }
    mockInvitationsStore.push(inv)
    return inv
  }
  return await httpPost<TeamInvitationDto, InviteMemberPayload>(`/teams/${teamId}/invitations`, payload)
}

export async function getInvitations(
  teamId?: number,
  page = 1,
  pageSize = 20,
): Promise<PagedResult<TeamInvitationDto>> {
  if (env.isMockMode) {
    const items = teamId
      ? mockInvitationsStore.filter((i) => i.teamId === teamId)
      : mockInvitationsStore
    return {
      items,
      totalCount: items.length,
      page,
      pageSize,
      totalPages: 1,
    }
  }
  const url = teamId
    ? `/teams/invitations?teamId=${teamId}&page=${page}&pageSize=${pageSize}`
    : `/teams/invitations?page=${page}&pageSize=${pageSize}`
  return await httpGet<PagedResult<TeamInvitationDto>>(url)
}

export async function acceptInvitation(invitationId: number): Promise<TeamDto> {
  if (env.isMockMode) {
    const inv = mockInvitationsStore.find((i) => i.id === invitationId)
    if (!inv) throw new Error('Invitation #' + invitationId + ' not found.')
    if (!isMockStudentQualificationEligible(inv.invitedUserId)) throw new Error('QUALIFICATION_REQUIRED')
    inv.status = 'ACCEPTED'
    if (mockTeamStore) return mockTeamStore
    throw new Error(`Invitation #${invitationId} not found.`)
  }
  return await httpPost<TeamDto>(`/teams/invitations/${invitationId}/accept`)
}

export async function rejectInvitation(invitationId: number): Promise<void> {
  if (env.isMockMode) {
    const inv = mockInvitationsStore.find((i) => i.id === invitationId)
    if (inv) inv.status = 'REJECTED'
    return
  }
  await httpPost(`/teams/invitations/${invitationId}/reject`)
}

export async function cancelInvitation(invitationId: number): Promise<void> {
  if (env.isMockMode) {
    mockInvitationsStore = mockInvitationsStore.filter((i) => i.id !== invitationId)
    return
  }
  await httpPost(`/teams/invitations/${invitationId}/cancel`)
}

export async function removeMember(teamId: number, userId: number): Promise<void> {
  if (env.isMockMode) {
    if (mockTeamStore && mockTeamStore.id === teamId) {
      mockTeamStore = {
        ...mockTeamStore,
        members: mockTeamStore.members.filter((m) => m.userId !== userId),
      }
    }
    return
  }
  await httpDelete(`/teams/${teamId}/members/${userId}`)
}

export async function leaveTeam(teamId: number): Promise<void> {
  if (env.isMockMode) {
    if (mockTeamStore && mockTeamStore.id === teamId) {
      mockTeamStore = null
    }
    return
  }
  await httpPost(`/teams/${teamId}/leave`)
}

export async function transferLeader(teamId: number, newLeaderUserId: number): Promise<TeamDto> {
  if (env.isMockMode) {
    if (hasMockProjectForTeam(teamId)) throw new Error('MENTOR_APPROVAL_REQUIRED')
    if (!isMockStudentQualificationEligible(newLeaderUserId)) throw new Error('QUALIFICATION_REQUIRED')
    if (mockTeamStore && mockTeamStore.id === teamId) {
      mockTeamStore = {
        ...mockTeamStore,
        members: mockTeamStore.members.map((m) => ({
          ...m,
          isLeader: m.userId === newLeaderUserId,
        })),
      }
      return mockTeamStore
    }
    throw new Error(`Team #${teamId} not found.`)
  }
  return await httpPost<TeamDto, { newLeaderUserId: number }>(`/teams/${teamId}/leader`, {
    newLeaderUserId,
  })
}


export async function requestLeaderChange(
  teamId: number,
  newLeaderUserId: number,
  message?: string,
): Promise<TeamLeaderChangeRequestDto> {
  if (env.isMockMode) {
    if (!mockTeamStore || mockTeamStore.id !== teamId) throw new Error('Team #' + teamId + ' not found.')
    if (!hasMockProjectForTeam(teamId)) throw new Error('PROJECT_MENTOR_NOT_REQUIRED')
    if (!isMockStudentQualificationEligible(newLeaderUserId)) throw new Error('QUALIFICATION_REQUIRED')
    const currentLeader = mockTeamStore.members.find((member) => member.isLeader)
    const target = mockTeamStore.members.find((member) => member.userId === newLeaderUserId)
    if (!currentLeader || !target) throw new Error('INVALID_LEADER_CHANGE_TARGET')
    if (mockLeaderChangeRequests.some((request) => request.teamId === teamId && request.status === 'PENDING')) {
      throw new Error('LEADER_CHANGE_ALREADY_PENDING')
    }
    const request: TeamLeaderChangeRequestDto = {
      id: Math.max(0, ...mockLeaderChangeRequests.map((item) => item.id)) + 1,
      teamId,
      projectId: 50,
      requestedBy: currentLeader.userId,
      currentLeaderUserId: currentLeader.userId,
      newLeaderUserId,
      mentorProfileId: 10,
      mentorUserId: 20,
      mentorName: 'ThS. Nguyễn Văn Mentor',
      status: 'PENDING',
      requestMessage: message?.trim() || null,
      responseMessage: null,
      requestedAt: new Date().toISOString(),
      respondedAt: null,
    }
    mockLeaderChangeRequests.push(request)
    return { ...request }
  }
  return httpPost<TeamLeaderChangeRequestDto, { newLeaderUserId: number; message?: string }>(
    '/teams/' + teamId + '/leader-change-requests',
    { newLeaderUserId, message },
  )
}

export async function getLeaderChangeRequests(
  teamId?: number,
  status?: string,
  page = 1,
  pageSize = 20,
): Promise<PagedResult<TeamLeaderChangeRequestDto>> {
  if (env.isMockMode) {
    const items = mockLeaderChangeRequests.filter((request) =>
      (!teamId || request.teamId === teamId) && (!status || request.status === status))
    return { items, page, pageSize, totalCount: items.length, totalPages: items.length ? 1 : 0 }
  }
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (teamId) params.set('teamId', String(teamId))
  if (status) params.set('status', status)
  return httpGet<PagedResult<TeamLeaderChangeRequestDto>>('/team-leader-change-requests?' + params.toString())
}

export async function respondToLeaderChange(
  requestId: number,
  decision: 'approve' | 'reject',
  message?: string,
): Promise<TeamLeaderChangeRequestDto> {
  if (env.isMockMode) {
    const request = mockLeaderChangeRequests.find((item) => item.id === requestId)
    if (!request) throw new Error('Leader change request #' + requestId + ' not found.')
    if (request.status !== 'PENDING') throw new Error('LEADER_CHANGE_ALREADY_PROCESSED')
    if (decision === 'approve') {
      if (!mockTeamStore || mockTeamStore.id !== request.teamId) throw new Error('TEAM_NOT_FOUND')
      const currentLeader = mockTeamStore.members.find((member) => member.isLeader)
      if (currentLeader?.userId !== request.currentLeaderUserId) throw new Error('LEADER_CHANGED')
      const targetMember = mockTeamStore.members.find((member) => member.userId === request.newLeaderUserId)
      if (!targetMember) throw new Error('TARGET_NOT_ACTIVE_TEAM_MEMBER')
      if (targetMember.userId === currentLeader.userId) throw new Error('INVALID_LEADER_CHANGE_TARGET')
      if (!isMockStudentQualificationEligible(targetMember.userId)) throw new Error('QUALIFICATION_REQUIRED')
      mockTeamStore = {
        ...mockTeamStore,
        members: mockTeamStore.members.map((member) => ({
          ...member,
          isLeader: member.userId === targetMember.userId,
        })),
      }
      request.status = 'APPROVED'
    } else {
      request.status = 'REJECTED'
    }
    request.responseMessage = message?.trim() || null
    request.respondedAt = new Date().toISOString()
    return { ...request }
  }
  return httpPost<TeamLeaderChangeRequestDto, { message?: string }>(
    '/team-leader-change-requests/' + requestId + '/' + decision,
    { message },
  )
}
