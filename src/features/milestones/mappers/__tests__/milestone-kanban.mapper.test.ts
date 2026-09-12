import { describe, it, expect } from 'vitest'
import {
  mapMilestoneKanban,
  mapTaskStatusToKanban,
  inferTaskProgress,
  inferStoryPoints,
  mapMilestoneStatus,
  formatDateToVi,
} from '../milestone-kanban.mapper'
import type {
  MilestoneDto,
  MilestoneProgressDto,
  TaskDto,
} from '../../../../types/backend'

describe('milestone-kanban.mapper', () => {
  describe('status and utility mappings', () => {
    it('maps backend task status to kanban column id', () => {
      expect(mapTaskStatusToKanban('TODO')).toBe('todo')
      expect(mapTaskStatusToKanban('IN_PROGRESS')).toBe('in_progress')
      expect(mapTaskStatusToKanban('BLOCKED')).toBe('in_progress')
      expect(mapTaskStatusToKanban('IN_REVIEW')).toBe('review')
      expect(mapTaskStatusToKanban('DONE')).toBe('done')
      expect(mapTaskStatusToKanban('CANCELLED')).toBe('todo')
    })

    it('infers task progress correctly', () => {
      expect(inferTaskProgress('DONE')).toBe(100)
      expect(inferTaskProgress('IN_REVIEW')).toBe(90)
      expect(inferTaskProgress('IN_PROGRESS')).toBe(50)
      expect(inferTaskProgress('BLOCKED')).toBe(30)
      expect(inferTaskProgress('TODO')).toBe(0)
    })

    it('infers story points from priority', () => {
      expect(inferStoryPoints('CRITICAL')).toBe(8)
      expect(inferStoryPoints('HIGH')).toBe(5)
      expect(inferStoryPoints('MEDIUM')).toBe(3)
      expect(inferStoryPoints('LOW')).toBe(2)
      expect(inferStoryPoints(null)).toBe(3)
    })

    it('maps backend milestone status', () => {
      expect(mapMilestoneStatus('COMPLETED')).toBe('completed')
      expect(mapMilestoneStatus('IN_PROGRESS')).toBe('active')
      expect(mapMilestoneStatus('PLANNED')).toBe('upcoming')
      expect(mapMilestoneStatus('CANCELLED')).toBe('upcoming')
    })

    it('formats dates cleanly to vi locale (DD/MM/YYYY)', () => {
      expect(formatDateToVi('2026-08-15')).toBe('15/08/2026')
      expect(formatDateToVi(null)).toBe('Chưa xác định')
    })
  })

  describe('mapMilestoneKanban', () => {
    const mockMilestones: MilestoneDto[] = [
      {
        id: 1,
        projectId: 10,
        title: 'Đề cương & Hồ sơ nhóm',
        description: 'Xác lập đề tài và lập nhóm',
        startDate: '2026-08-15',
        dueDate: '2026-08-25',
        status: 'COMPLETED',
        sortOrder: 1,
        createdBy: 1,
        createdByFullName: 'Admin',
        createdAt: '2026-08-15T00:00:00Z',
        updatedAt: '2026-08-25T00:00:00Z',
      },
      {
        id: 2,
        projectId: 10,
        title: 'Kiến trúc hệ thống & UI Prototype',
        description: 'Thiết kế kiến trúc Clean Architecture',
        startDate: '2026-08-28',
        dueDate: '2026-09-18',
        status: 'IN_PROGRESS',
        sortOrder: 2,
        createdBy: 1,
        createdByFullName: 'Admin',
        createdAt: '2026-08-28T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ]

    const mockProgress: MilestoneProgressDto[] = [
      {
        milestoneId: 1,
        milestoneTitle: 'Đề cương & Hồ sơ nhóm',
        totalTasks: 2,
        doneTasks: 2,
        progressPercentage: 100,
      },
      {
        milestoneId: 2,
        milestoneTitle: 'Kiến trúc hệ thống & UI Prototype',
        totalTasks: 3,
        doneTasks: 1,
        progressPercentage: 67,
      },
    ]

    const mockTasks: TaskDto[] = [
      {
        id: 101,
        milestoneId: 1,
        title: 'Thiết lập Repository Monorepo',
        status: 'DONE',
        priority: 'MEDIUM',
        dueAt: '2026-08-20T00:00:00Z',
        createdBy: 1,
        createdByFullName: 'Nguyễn Văn A',
        createdAt: '2026-08-15T00:00:00Z',
        updatedAt: '2026-08-20T00:00:00Z',
        assignees: [
          {
            id: 1,
            taskId: 101,
            userId: 1,
            userFullName: 'Nguyễn Văn A',
            assignedBy: 1,
            assignedAt: '2026-08-15T00:00:00Z',
          },
        ],
        dependencies: [],
      },
      {
        id: 108,
        milestoneId: 2,
        title: 'Xử lý JWT Token & ProblemDetails API',
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        dueAt: '2026-09-10T00:00:00Z',
        createdBy: 1,
        createdByFullName: 'Nguyễn Văn A',
        createdAt: '2026-08-28T00:00:00Z',
        updatedAt: '2026-09-02T00:00:00Z',
        assignees: [
          {
            id: 2,
            taskId: 108,
            userId: 2,
            userFullName: 'Trần Thị B',
            assignedBy: 1,
            assignedAt: '2026-08-28T00:00:00Z',
          },
        ],
        dependencies: [],
      },
    ]

    it('maps milestones and tasks into allMilestones record format', () => {
      const record = mapMilestoneKanban(mockMilestones, mockProgress, mockTasks)

      expect(record.M1).toBeDefined()
      expect(record.M2).toBeDefined()

      expect(record.M1.name).toBe('Đề cương & Hồ sơ nhóm')
      expect(record.M1.status).toBe('completed')
      expect(record.M1.progress).toBe(100)
      expect(record.M1.tasks).toHaveLength(1)
      expect(record.M1.tasks[0].id).toBe('SEP-101')
      expect(record.M1.tasks[0].status).toBe('done')
      expect(record.M1.tasks[0].assignee).toBe('Nguyễn Văn A')

      expect(record.M2.status).toBe('active')
      expect(record.M2.tasks).toHaveLength(1)
      expect(record.M2.tasks[0].id).toBe('SEP-108')
      expect(record.M2.tasks[0].isCritical).toBe(true)
      expect(record.M2.tasks[0].storyPoints).toBe(8)
      expect(record.M2.tasks[0].status).toBe('in_progress')
    })
  })
})
