import { describe, expect, it, vi } from 'vitest'
import { calendarApis, loadCalendarAttention } from './calendar-data'

describe('loadCalendarAttention', () => {
  it('keeps independent student sources when meetings fail and marks pagination partial', async () => {
    const apis = {
      ...calendarApis,
      getStudentDashboard: vi.fn().mockResolvedValue({ asOfUtc: '', actions: [], project: { id: 7, title: 'Capstone' }, unreadNotifications: 0, assignedOpenTasks: 1, assignedOverdueTasks: 1, taskDeadlines: [{ id: 1, title: 'Overdue', status: 'TODO', dueAtUtc: '2026-10-01T01:00:00Z', isOverdue: true }], milestoneDeadlines: [], contributionDataStatus: 'READY' }),
      getScopedCalendar: vi.fn().mockRejectedValue(new Error('calendar unavailable')),
      getMeetings: vi.fn().mockRejectedValue(new Error('forbidden')),
      getDeliverables: vi.fn().mockResolvedValue({ items: [{ id: 2, projectId: 7, milestoneId: null, title: 'Deliverable', description: null, deliverableType: null, dueAt: '2026-10-05T01:00:00Z', status: 'OPEN', createdBy: 1, latestVersion: 0 }], page: 1, pageSize: 100, totalCount: 101, totalPages: 2 }),
      getFinalChecklist: vi.fn().mockResolvedValue({ deadline: '2026-10-06T01:00:00Z' }),
    }
    const result = await loadCalendarAttention({ role: 'student', semesterId: 1 }, apis)
    expect(result.calendar.map((item) => item.sourceType)).toEqual(expect.arrayContaining(['TASK', 'DELIVERABLE', 'FINAL_SUBMISSION']))
    expect(result.attention[0]?.code).toBe('TASK_OVERDUE')
    expect(result.sources.find((item) => item.id === 'meetings')?.state).toBe('error')
    expect(result.sources.find((item) => item.id === 'deliverables')?.state).toBe('partial')
  })

  it('uses the bounded backend calendar only for a Student and preserves Attention independently', async () => {
    const getScopedCalendar = vi.fn().mockResolvedValue({ items: [{ sourceType: 'TASK', sourceId: 11, projectId: 7, title: 'Canonical task', dueAt: '2026-10-08T01:00:00Z', status: 'TODO' }], hasMore: false, complete: true })
    const apis = {
      ...calendarApis,
      getScopedCalendar,
      getStudentDashboard: vi.fn().mockResolvedValue({ asOfUtc: '', actions: [], project: { id: 7, title: 'Capstone' }, unreadNotifications: 0, assignedOpenTasks: 1, assignedOverdueTasks: 1, taskDeadlines: [{ id: 11, title: 'Canonical task', status: 'TODO', dueAtUtc: '2026-10-08T01:00:00Z', isOverdue: true }], milestoneDeadlines: [], contributionDataStatus: 'READY' }),
      getMeetings: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0, totalPages: 0 }),
      getDeliverables: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0, totalPages: 0 }),
      getFinalChecklist: vi.fn().mockResolvedValue({ deadline: null }),
    }
    const result = await loadCalendarAttention({ role: 'student', semesterId: 1 }, apis)
    expect(getScopedCalendar).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 100, from: expect.any(String), to: expect.any(String) }))
    expect(result.calendar).toMatchObject([{ sourceType: 'TASK', sourceId: 11, deepLink: '/project/tasks/11' }])
    expect(result.attention).toMatchObject([{ code: 'TASK_OVERDUE', sourceId: 11 }])
  })

  it('keeps evaluator assignments as attention but never fabricates an evaluation date', async () => {
    const apis = {
      ...calendarApis,
      getSupervisorDashboard: vi.fn().mockResolvedValue({ projects: { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } }),
      getMyEvaluationAssignments: vi.fn().mockResolvedValue({ items: [{ id: 8, projectId: 7, evaluatorId: 1, rubricId: 2, projectPeriodId: 3, departmentId: 1, evaluationType: 'LECTURER', status: 'ACTIVE', assignedBy: 1, assignedAt: '', revokedAt: null, concurrencyToken: 't', scope: 'COMMON', majorId: null, studentId: null, componentId: null, policyVersionId: null }], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 }),
    }
    const result = await loadCalendarAttention({ role: 'lecturer', semesterId: null }, apis)
    expect(result.calendar).toEqual([])
    expect(result.attention.map((item) => item.code)).toContain('EVALUATION_ASSIGNMENT_ACTIVE')
    expect(result.sources.find((item) => item.id === 'lecturer-calendar')?.state).toBe('unavailable')
  })

  it('keeps department and admin attention limited to their returned deterministic facts', async () => {
    const apis = {
      ...calendarApis,
      getPortfolioDashboard: vi.fn().mockResolvedValue({ projects: { items: [{ id: 9, title: 'Department project', status: 'ACTIVE', pendingProgressReviews: 2 }], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 } }),
      getUsers: vi.fn().mockResolvedValue({ items: [{ id: 10, fullName: 'Suspended account', status: 'SUSPENDED' }], page: 1, pageSize: 20, totalCount: 1 }),
    }
    const department = await loadCalendarAttention({ role: 'department', semesterId: null }, apis)
    const admin = await loadCalendarAttention({ role: 'admin', semesterId: null, accessToken: 'token' }, apis)
    expect(department.attention).toMatchObject([{ code: 'PROJECT_PROGRESS_FEEDBACK_PENDING', deepLink: '/department/portfolio' }])
    expect(department.calendar).toEqual([])
    expect(admin.attention).toMatchObject([{ code: 'ACCOUNT_SUSPENDED', deepLink: '/admin/access/users/10' }])
    expect(admin.calendar).toEqual([])
  })

  it('fails closed for an unrecognised actor rather than borrowing lecturer scope', async () => {
    const result = await loadCalendarAttention({ role: 'mentor' as never, semesterId: null }, calendarApis)
    expect(result.attention).toEqual([])
    expect(result.sources).toMatchObject([{ state: 'unavailable' }])
  })
})
