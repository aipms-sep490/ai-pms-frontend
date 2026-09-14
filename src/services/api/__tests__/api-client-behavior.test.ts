import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { env } from '../../../app/config/env'
import { HttpError } from '../../http/http-client'
import { services } from '../../service-gateway'
import {
  findCurrentTeamProject,
  getActivePrimaryAssignment,
} from '../../../features/projects/utils/project-resolution.utils'
import type {
  ProjectSummaryDto,
  SupervisorAssignmentDto,
  TeamInvitationDto,
  PagedResult,
} from '../../../types/backend'

describe('API Client Behavior & Contract Verification', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('1. Environment Configuration Defaults', () => {
    it('defaults apiBaseUrl to /api/v1 without trailing slash', () => {
      expect(env.apiBaseUrl).toBe('/api/v1')
    })

    it('defaults dataMode to api and isMockMode to false', () => {
      expect(env.dataMode).toBe('api')
      expect(env.isMockMode).toBe(false)
    })
  })

  describe('2. HTTP 204 No Content Handling', () => {
    it('returns null on 204 No Content for getCurrentTeam', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => null,
      } as unknown as Response)

      const team = await services.team.getCurrentTeam(1)
      expect(team).toBeNull()
    })
  })

  describe('3. API Error Propagation (No Mock Fallbacks in API Mode)', () => {
    it('propagates 401 Unauthorized for getMe without falling back to mock user', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ status: 401, title: 'Unauthorized', detail: 'Token expired.' }),
      } as unknown as Response)

      await expect(services.auth.getMe()).rejects.toThrow(HttpError)
      await expect(services.auth.getMe()).rejects.toThrow('Token expired.')
    })

    it('propagates 403 Forbidden for getMyProfile without returning mock profile', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ status: 403, title: 'Forbidden', detail: 'Student access only.' }),
      } as unknown as Response)

      await expect(services.auth.getMyProfile()).rejects.toThrow(HttpError)
      await expect(services.auth.getMyProfile()).rejects.toThrow('Student access only.')
    })

    it('propagates 500 Internal Server Error for getCurrentTeam without returning fallback team', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ status: 500, title: 'Server Error', detail: 'Database connection failed.' }),
      } as unknown as Response)

      await expect(services.team.getCurrentTeam(1)).rejects.toThrow(HttpError)
      await expect(services.team.getCurrentTeam(1)).rejects.toThrow('Database connection failed.')
    })

    it('propagates 500 Server Error for getProjects without returning fallback project store', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ status: 500, title: 'Server Error' }),
      } as unknown as Response)

      await expect(services.project.getProjects({ teamId: 28 })).rejects.toThrow(HttpError)
    })

    it('propagates 403 Forbidden for getCandidates without returning mock candidates', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ status: 403, title: 'Forbidden' }),
      } as unknown as Response)

      await expect(services.supervisor.getCandidates(50)).rejects.toThrow(HttpError)
    })

    it('propagates 500 Server Error for getActiveSemester without returning mock semester', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ status: 500, title: 'Server Error' }),
      } as unknown as Response)

      await expect(services.academic.getActiveSemester()).rejects.toThrow(HttpError)
    })

    it('propagates 409 Conflict for inviteMember when user is already invited or in team', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({
          status: 409,
          title: 'Conflict',
          detail: 'Sinh viên đã là thành viên của một nhóm khác trong cùng học kỳ.',
        }),
      } as unknown as Response)

      await expect(services.team.inviteMember(28, { invitedUserId: 99 })).rejects.toThrow(HttpError)
      await expect(services.team.inviteMember(28, { invitedUserId: 99 })).rejects.toThrow(
        'Sinh viên đã là thành viên của một nhóm khác trong cùng học kỳ.',
      )
    })
  })

  describe('4. Real DTO Structure Verification', () => {
    it('calls the backend workflow action contracts', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ actions: [] }),
      } as unknown as Response)
      globalThis.fetch = fetchMock

      await services.workflow.getCurrentContext(7)
      await services.workflow.getTeamActions(28)
      await services.workflow.getProjectActions(50)

      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        '/api/v1/auth/me/context?academicSemesterId=7',
        '/api/v1/teams/28/actions',
        '/api/v1/projects/50/actions',
      ])
    })

    it('loads and maps the published topic catalogue from the backend', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          items: [{
            id: 9, code: 'TOP-009', status: 'PUBLISHED', projectPeriodId: 2,
            academicSemesterId: 1, organizationId: 1, leadDepartmentId: 3,
            leadDepartmentName: 'Software Engineering', title: 'AI-PMS', description: 'Capstone',
            technologies: ['React'], keywords: ['PMS'], projectMode: 'SINGLE_MAJOR',
            requirements: [{ majorId: 101, majorCode: 'SE', majorName: 'SE', departmentId: 3,
              departmentName: 'Software Engineering', minMembers: 4, maxMembers: 5, responsibility: 'Lead' }],
            concurrencyToken: 'token',
          }],
          page: 1, pageSize: 100, totalCount: 1, totalPages: 1,
        }),
      } as unknown as Response)

      const topics = await services.topic.getTopicCatalogue({ academicSemesterId: 1, compatibleOnly: true })
      expect(topics[0]).toMatchObject({ id: '9', code: 'TOP-009', titleVi: 'AI-PMS', leadMajor: 'SE' })
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/topics?status=PUBLISHED&page=1&pageSize=100&academicSemesterId=1&compatibleOnly=true',
        expect.objectContaining({ method: 'GET' }),
      )
    })

    it('conforms to TeamInvitationDto backend fields', () => {
      const invitation: TeamInvitationDto = {
        id: 10,
        teamId: 28,
        invitedUserId: 5,
        invitedBy: 1,
        status: 'PENDING',
        message: 'Mời bạn gia nhập nhóm',
        expiresAt: '2026-09-20T23:59:59Z',
        respondedAt: null,
        createdAt: '2026-09-10T10:00:00Z',
      }

      expect(invitation.invitedUserId).toBe(5)
      expect(invitation.invitedBy).toBe(1)
      expect(invitation.expiresAt).toBe('2026-09-20T23:59:59Z')
      expect(invitation.status).toBe('PENDING')
    })

    it('conforms to PagedResult backend contract with totalCount and totalPages', () => {
      const pagedResult: PagedResult<string> = {
        items: ['a', 'b'],
        page: 1,
        pageSize: 10,
        totalCount: 2,
        totalPages: 1,
      }

      expect(pagedResult.totalCount).toBe(2)
      expect(pagedResult.totalPages).toBe(1)
      expect(pagedResult.items).toHaveLength(2)
    })
  })

  describe('5. Deterministic Project Resolution (findCurrentTeamProject)', () => {
    it('selects Active over Approved over RevisionRequired over UnderReview over Draft', () => {
      const projects: ProjectSummaryDto[] = [
        {
          id: 1,
          code: 'P1',
          title: 'Draft Project',
          teamId: 28,
          teamName: 'SE28',
          status: 'Draft',
          createdAt: '2026-09-01T00:00:00Z',
          submittedAt: null,
          majors: [],
          tags: [],
        },
        {
          id: 2,
          code: 'P2',
          title: 'Under Review Project',
          teamId: 28,
          teamName: 'SE28',
          status: 'UnderReview',
          createdAt: '2026-09-02T00:00:00Z',
          submittedAt: '2026-09-02T10:00:00Z',
          majors: [],
          tags: [],
        },
        {
          id: 3,
          code: 'P3',
          title: 'Approved Project',
          teamId: 28,
          teamName: 'SE28',
          status: 'Approved',
          createdAt: '2026-09-03T00:00:00Z',
          submittedAt: '2026-09-03T10:00:00Z',
          majors: [],
          tags: [],
        },
      ]

      const chosen = findCurrentTeamProject(projects)
      expect(chosen?.id).toBe(3)
      expect(chosen?.status).toBe('Approved')
    })

    it('tie-breaks by createdAt descending when statuses are equal', () => {
      const drafts: ProjectSummaryDto[] = [
        {
          id: 10,
          code: 'D1',
          title: 'Older Draft',
          teamId: 28,
          teamName: 'SE28',
          status: 'Draft',
          createdAt: '2026-09-01T00:00:00Z',
          submittedAt: null,
          majors: [],
          tags: [],
        },
        {
          id: 11,
          code: 'D2',
          title: 'Newer Draft',
          teamId: 28,
          teamName: 'SE28',
          status: 'Draft',
          createdAt: '2026-09-05T00:00:00Z',
          submittedAt: null,
          majors: [],
          tags: [],
        },
      ]

      const chosen = findCurrentTeamProject(drafts)
      expect(chosen?.id).toBe(11)
      expect(chosen?.title).toBe('Newer Draft')
    })

    it('returns null when projects list is empty', () => {
      expect(findCurrentTeamProject([])).toBeNull()
    })
  })

  describe('6. Active Primary Supervisor Assignment (getActivePrimaryAssignment)', () => {
    it('returns primary assignment without endedAt', () => {
      const assignments: SupervisorAssignmentDto[] = [
        {
          id: 1,
          projectId: 50,
          supervisorProfileId: 101,
          supervisorUserId: 21,
          supervisorName: 'TS. Nguyễn Văn A',
          supervisorRequestId: 1,
          isPrimary: true,
          assignedAt: '2026-09-05T00:00:00Z',
        },
      ]

      const active = getActivePrimaryAssignment(assignments)
      expect(active?.id).toBe(1)
      expect(active?.supervisorName).toBe('TS. Nguyễn Văn A')
    })

    it('ignores assignments where endedAt is set', () => {
      const assignments: SupervisorAssignmentDto[] = [
        {
          id: 1,
          projectId: 50,
          supervisorProfileId: 101,
          supervisorUserId: 21,
          supervisorName: 'TS. Nguyễn Văn A (Đã kết thúc)',
          supervisorRequestId: 1,
          isPrimary: true,
          assignedAt: '2026-09-01T00:00:00Z',
          endedAt: '2026-09-05T00:00:00Z',
        },
      ]

      expect(getActivePrimaryAssignment(assignments)).toBeNull()
    })

    it('ignores secondary reviewer assignments (isPrimary: false)', () => {
      const assignments: SupervisorAssignmentDto[] = [
        {
          id: 2,
          projectId: 50,
          supervisorProfileId: 102,
          supervisorUserId: 22,
          supervisorName: 'ThS. Trần Thị B (Phản biện)',
          supervisorRequestId: 2,
          isPrimary: false,
          assignedAt: '2026-09-05T00:00:00Z',
        },
      ]

      expect(getActivePrimaryAssignment(assignments)).toBeNull()
    })
  })
})
