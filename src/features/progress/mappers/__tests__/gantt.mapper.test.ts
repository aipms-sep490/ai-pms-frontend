import { describe, it, expect } from 'vitest'
import {
  mapGanttTimeline,
  calculateSemesterWeek,
  calculateDurationWeeks,
} from '../gantt.mapper'
import type {
  ProjectTimelineDataDto,
  ProjectProgressSummaryDto,
  OverdueBlockedTasksDto,
} from '../../../../types/backend'

describe('gantt.mapper', () => {
  describe('week and duration calculations', () => {
    const semesterStart = '2026-08-15'

    it('calculates semester week accurately', () => {
      // 2026-08-15 is day 0 -> week 1
      expect(calculateSemesterWeek('2026-08-15', semesterStart)).toBe(1)
      // 2026-08-22 is day 7 -> week 2
      expect(calculateSemesterWeek('2026-08-22', semesterStart)).toBe(2)
      // 2026-08-29 is day 14 -> week 3
      expect(calculateSemesterWeek('2026-08-29', semesterStart)).toBe(3)
      // Dates before start clamp to week 1
      expect(calculateSemesterWeek('2026-08-01', semesterStart)).toBe(1)
      // Missing date defaults to week 1
      expect(calculateSemesterWeek(null, semesterStart)).toBe(1)
    })

    it('calculates duration in weeks properly', () => {
      // 14 days difference -> 2 weeks
      expect(calculateDurationWeeks('2026-08-15', '2026-08-29')).toBe(2)
      // 7 days difference -> 1 week
      expect(calculateDurationWeeks('2026-08-15', '2026-08-22')).toBe(1)
      // Same day -> minimum 1 week
      expect(calculateDurationWeeks('2026-08-15', '2026-08-15')).toBe(1)
      // Missing dates -> minimum 1 week
      expect(calculateDurationWeeks(null, null)).toBe(1)
    })
  })

  describe('mapGanttTimeline', () => {
    const mockTimeline: ProjectTimelineDataDto = {
      projectId: 10,
      milestones: [
        {
          id: 1,
          title: 'Khởi tạo đề cương & Lập nhóm',
          startDate: '2026-08-15',
          dueDate: '2026-08-25',
          status: 'COMPLETED',
          sortOrder: 1,
          progressPercentage: 100,
          tasks: [
            {
              id: 101,
              title: 'Thiết lập Repository Monorepo',
              status: 'DONE',
              priority: 'MEDIUM',
              startAt: '2026-08-15T00:00:00Z',
              dueAt: '2026-08-20T00:00:00Z',
              assignees: [{ userId: 1, fullName: 'Nguyễn Văn A' }],
              dependencies: [],
            },
          ],
        },
        {
          id: 3,
          title: 'Kiến trúc hệ thống & Prototype',
          startDate: '2026-08-28',
          dueDate: '2026-09-18',
          status: 'IN_PROGRESS',
          sortOrder: 3,
          progressPercentage: 67,
          tasks: [
            {
              id: 108,
              title: 'Xử lý JWT Token & ProblemDetails API',
              status: 'IN_PROGRESS',
              priority: 'CRITICAL',
              startAt: '2026-08-28T00:00:00Z',
              dueAt: '2026-09-10T00:00:00Z',
              assignees: [{ userId: 2, fullName: 'Trần Thị B' }],
              dependencies: [{ dependsOnTaskId: 101, dependencyType: 'FinishToStart' }],
            },
          ],
        },
      ],
    }

    const mockSummary: ProjectProgressSummaryDto = {
      projectId: 10,
      totalTasks: 2,
      doneTasks: 1,
      blockedTasks: 0,
      overdueTasks: 0,
      totalMilestones: 2,
      completedMilestones: 1,
      progressPercentage: 67,
    }

    const mockOverdueBlocked: OverdueBlockedTasksDto = {
      overdueTasks: [],
      blockedTasks: [],
    }

    it('maps timeline DTO to WbsGroup array and GanttTelemetry', () => {
      const { wbsGroups, telemetry } = mapGanttTimeline(
        mockTimeline,
        mockSummary,
        mockOverdueBlocked,
        {
          semesterStartDate: '2026-08-15',
          currentDate: new Date('2026-09-10'),
        },
      )

      expect(wbsGroups).toHaveLength(2)
      expect(wbsGroups[0].id).toBe('wbs-1')
      expect(wbsGroups[0].wbsCode).toBe('1.0')
      expect(wbsGroups[0].progress).toBe(100)
      expect(wbsGroups[0].tasks).toHaveLength(1)
      expect(wbsGroups[0].tasks[0].id).toBe('SEP-101')
      expect(wbsGroups[0].tasks[0].progress).toBe(100)
      expect(wbsGroups[0].tasks[0].wbsCode).toBe('1.1')

      expect(wbsGroups[1].id).toBe('wbs-3')
      expect(wbsGroups[1].wbsCode).toBe('3.0')
      expect(wbsGroups[1].tasks[0].id).toBe('SEP-108')
      expect(wbsGroups[1].tasks[0].isCritical).toBe(true)
      expect(wbsGroups[1].tasks[0].dependencies).toEqual(['SEP-101'])

      expect(telemetry.totalTasks).toBe(2)
      expect(telemetry.completedTasksCount).toBe(1)
      expect(telemetry.overallProgress).toBe(67)
      expect(telemetry.criticalTasksCount).toBe(1)
      expect(telemetry.bottleneckWarning).toContain('bám sát kế hoạch')
    })

    it('generates dynamic bottleneck warning when overdue or blocked tasks exist', () => {
      const blockedPayload: OverdueBlockedTasksDto = {
        overdueTasks: [
          {
            id: 108,
            milestoneId: 3,
            title: 'JWT Task',
            status: 'IN_PROGRESS',
            priority: 'CRITICAL',
            createdBy: 1,
            createdByFullName: 'Admin',
            createdAt: '2026-08-28T00:00:00Z',
            updatedAt: '2026-09-02T00:00:00Z',
            assignees: [],
            dependencies: [],
          },
        ],
        blockedTasks: [],
      }

      const { telemetry } = mapGanttTimeline(mockTimeline, mockSummary, blockedPayload)
      expect(telemetry.bottleneckChain).toContain('SEP-108')
      expect(telemetry.bottleneckWarning).toContain('Phát hiện 1 nhiệm vụ có nguy cơ tắc nghẽn')
    })
  })
})
