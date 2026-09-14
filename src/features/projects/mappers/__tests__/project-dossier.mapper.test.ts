import { describe, it, expect } from 'vitest'
import {
  mapProjectDossier,
  mapProjectStatusToDossier,
  normalizeMajorType,
} from '../project-dossier.mapper'
import type {
  ProjectDto,
  TeamDto,
  SupervisorAssignmentDto,
  ProjectStatusHistoryDto,
} from '../../../../types/backend'

describe('project-dossier.mapper', () => {
  describe('normalizeMajorType', () => {
    it('normalizes common major codes correctly', () => {
      expect(normalizeMajorType('SE')).toBe('SE')
      expect(normalizeMajorType('UIUX')).toBe('UI/UX')
      expect(normalizeMajorType('UI/UX')).toBe('UI/UX')
      expect(normalizeMajorType('GD')).toBe('UI/UX')
      expect(normalizeMajorType('AI')).toBe('AI')
      expect(normalizeMajorType('QA')).toBe('QA')
      expect(normalizeMajorType('IS')).toBe('IS')
      expect(normalizeMajorType('IA')).toBe('IS')
      expect(normalizeMajorType('CS')).toBe('SE')
      expect(normalizeMajorType('UNKNOWN')).toBe('SE')
      expect(normalizeMajorType(null)).toBe('SE')
    })
  })

  describe('mapProjectStatusToDossier', () => {
    it('maps Approved to approved status', () => {
      const res = mapProjectStatusToDossier('Approved')
      expect(res.status).toBe('approved')
      expect(res.statusLabel).toContain('Đã phê duyệt')
    })

    it('maps Active to active status', () => {
      const res = mapProjectStatusToDossier('Active')
      expect(res.status).toBe('active')
      expect(res.statusLabel).toContain('Đang thực hiện')
    })

    it('maps Draft and UnderReview to pending status', () => {
      expect(mapProjectStatusToDossier('Draft').status).toBe('pending')
      expect(mapProjectStatusToDossier('UnderReview').status).toBe('pending')
      expect(mapProjectStatusToDossier('Submitted').status).toBe('pending')
    })
  })

  describe('mapProjectDossier', () => {
    const mockProject: ProjectDto = {
      id: 10,
      teamId: 5,
      teamName: 'SE28',
      code: 'CP_SEP490',
      title: 'Hệ thống Quản lý Tiến trình Thực hiện Đồ án Đa ngành',
      description: 'Mô tả đề tài',
      objectives: 'Mục tiêu',
      status: 'Approved',
      registeredAt: '2026-08-15T08:00:00Z',
      submittedAt: '2026-08-20T10:00:00Z',
      approvedAt: '2026-08-25T14:30:00Z',
      createdBy: 1,
      createdByName: 'Nguyễn Văn A',
      createdAt: '2026-08-15T08:00:00Z',
      updatedAt: '2026-08-25T14:30:00Z',
      concurrencyToken: 'token123',
      majors: [
        { id: 1, majorId: 101, majorCode: 'SE', majorName: 'Kỹ thuật Phần mềm' },
        { id: 2, majorId: 102, majorCode: 'AI', majorName: 'Trí tuệ Nhân tạo' },
      ],
      tags: [],
    }

    const mockTeam: TeamDto = {
      id: 5,
      academicSemesterId: 2,
      code: 'SE28',
      name: 'Nhóm SE28',
      status: 'ACTIVE',
      members: [
        {
          userId: 1,
          fullName: 'Nguyễn Văn A',
          majorId: 101,
          isEligibleStudent: true,
          isLeader: true,
        },
        {
          userId: 2,
          fullName: 'Trần Thị B',
          majorId: 102,
          isEligibleStudent: true,
          isLeader: false,
        },
      ],
      eligibility: {
        canRegister: true,
        rosterLocked: true,
        reasons: [],
      },
    }

    const mockAssignments: SupervisorAssignmentDto[] = [
      {
        id: 1,
        projectId: 10,
        supervisorProfileId: 100,
        supervisorUserId: 201,
        supervisorName: 'TS. Nguyễn Văn Hướng Dẫn',
        supervisorRequestId: 50,
        isPrimary: true,
        assignedAt: '2026-08-20T09:00:00Z',
      },
      {
        id: 2,
        projectId: 10,
        supervisorProfileId: 101,
        supervisorUserId: 202,
        supervisorName: 'ThS. Trần Phản Biện',
        supervisorRequestId: 51,
        isPrimary: false,
        assignedAt: '2026-08-22T09:00:00Z',
      },
    ]

    it('maps complete project DTO with team and supervisors to ProjectDossier', () => {
      const dossier = mapProjectDossier(mockProject, mockTeam, mockAssignments)

      expect(dossier.projectCode).toBe('CP_SEP490')
      expect(dossier.titleVi).toBe('Hệ thống Quản lý Tiến trình Thực hiện Đồ án Đa ngành')
      expect(dossier.groupCode).toBe('SE28')
      expect(dossier.status).toBe('approved')
      expect(dossier.supervisor.name).toBe('TS. Nguyễn Văn Hướng Dẫn')
      expect(dossier.reviewer.name).toBe('ThS. Trần Phản Biện')
      expect(dossier.members).toHaveLength(2)
      expect(dossier.members[0].name).toBe('Nguyễn Văn A')
      expect(dossier.members[0].role).toContain('Trưởng nhóm')
      expect(dossier.members[1].name).toBe('Trần Thị B')
      expect(dossier.members[0].studentId).toBe('ID #1')
      expect(dossier.members[0].storyPoints).toBe(0)
      expect(dossier.members[0].contributionPercent).toBe(0)
      expect(dossier.members[0].email).toBe('')
      expect(dossier.isSimulation).toBe(true)
      expect(dossier.majorBreakdown.length).toBeGreaterThan(0)
    })

    it('ignores ended assignments when finding active primary supervisor', () => {
      const endedAssignments: SupervisorAssignmentDto[] = [
        {
          id: 1,
          projectId: 10,
          supervisorProfileId: 100,
          supervisorUserId: 201,
          supervisorName: 'TS. Nguyễn Văn Cũ (Đã kết thúc)',
          supervisorRequestId: 50,
          isPrimary: true,
          assignedAt: '2026-08-20T09:00:00Z',
          endedAt: '2026-08-22T09:00:00Z',
        },
      ]
      const dossier = mapProjectDossier(mockProject, mockTeam, endedAssignments)
      expect(dossier.supervisor.name).toBe('Chưa phân công GVHD')
      expect(dossier.supervisor.hasDigitalSignature).toBe(false)
    })

    it('maps status history when history array is provided', () => {
      const mockHistory: ProjectStatusHistoryDto[] = [
        {
          id: 1,
          projectId: 10,
          oldStatus: 'Draft',
          newStatus: 'Submitted',
          changedBy: 1,
          changedByName: 'Nguyễn Văn A',
          reason: 'Nộp đề cương',
          changedAt: '2026-08-16T10:00:00Z',
        },
        {
          id: 2,
          projectId: 10,
          oldStatus: 'Submitted',
          newStatus: 'Approved',
          changedBy: 201,
          changedByName: 'TS. Nguyễn Văn Hướng Dẫn',
          reason: 'Đạt yêu cầu',
          changedAt: '2026-08-25T14:00:00Z',
        },
      ]

      const dossier = mapProjectDossier(mockProject, mockTeam, mockAssignments, mockHistory)
      expect(dossier.timeline).toHaveLength(2)
      expect(dossier.timeline[0].decision).toBe('Submitted')
      expect(dossier.timeline[0].reviewer).toBe('Nguyễn Văn A')
      expect(dossier.timeline[1].decision).toBe('Approved')
      expect(dossier.timeline[1].reviewer).toBe('TS. Nguyễn Văn Hướng Dẫn')
    })

    it('handles gracefully when team or supervisors are null', () => {
      const dossier = mapProjectDossier(mockProject, null, null, null)
      expect(dossier.members).toHaveLength(0)
      expect(dossier.supervisor.name).toBe('Chưa phân công GVHD')
      expect(dossier.reviewer.name).toBe('Chưa phân công phản biện')
      expect(dossier.timeline).toHaveLength(4) // default fallback stages
    })
  })
})
