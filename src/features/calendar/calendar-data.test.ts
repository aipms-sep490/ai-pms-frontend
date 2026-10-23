import { describe, expect, it, vi } from 'vitest'
import { loadCalendarAttention } from './calendar-data'

function apis() {
  return {
    getStudentDashboard: vi.fn().mockResolvedValue({ project: { id: 7, title: 'Đồ án' }, taskDeadlines: [], milestoneDeadlines: [] }),
    getMeetings: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    getDeliverables: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    getFinalChecklist: vi.fn().mockResolvedValue({ deadline: null }),
    getUsers: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    getScopedCalendar: vi.fn().mockResolvedValue({ items: [{ sourceType: 'MEETING', sourceId: 3, projectId: 7, title: 'Lịch từ projection', dueAt: '2026-10-22T08:00:00Z', status: 'SCHEDULED', deepLink: '/supervisor/projects/7/meetings/3' }], hasMore: false, complete: true }),
    getStudentNextActions: vi.fn().mockResolvedValue({ asOfUtc: '2026-10-22T08:00:00Z', projectId: 7, totalCount: 0, hasMore: false, items: [] }),
    getSupervisorTriageQueue: vi.fn().mockResolvedValue({ asOfUtc: '2026-10-22T08:00:00Z', totalCount: 0, hasMore: false, items: [] }),
    getDepartmentUrgentActions: vi.fn().mockResolvedValue({ asOfUtc: '2026-10-22T08:00:00Z', departmentId: 4, totalCount: 0, hasMore: false, items: [] }),
  }
}
describe('calendar and aggregator reads', () => {
  it.each(['student', 'lecturer'] as const)('loads %s calendar with one aggregator read', async role => {
    const api = apis()
    const data = await loadCalendarAttention({ role, semesterId: null }, api)
    expect(api.getScopedCalendar).toHaveBeenCalledTimes(1)
    expect(api.getScopedCalendar).toHaveBeenCalledWith(expect.objectContaining({ from: expect.any(String), to: expect.any(String), pageSize: 100 }), undefined)
    expect(data.calendar[0].deepLink).toBe(role === 'lecturer' ? '/supervisor/projects/7/meetings/3' : '/project/meetings/3')
    expect(api.getStudentNextActions).toHaveBeenCalledTimes(role === 'student' ? 1 : 0)
    expect(api.getSupervisorTriageQueue).toHaveBeenCalledTimes(role === 'lecturer' ? 1 : 0)
    expect(api.getStudentDashboard).toHaveBeenCalledTimes(role === 'student' ? 1 : 0)
    expect(api.getMeetings).not.toHaveBeenCalled()
    expect(api.getDeliverables).not.toHaveBeenCalled()
    expect(api.getFinalChecklist).not.toHaveBeenCalled()
    expect(data.attention).toEqual([])
    expect(data.attentionAsOfUtc).toBe('2026-10-22T08:00:00Z')
    expect(data.sources).toContainEqual(expect.objectContaining({ state: 'empty' }))
  })
  it.each([{ hasMore: true, complete: true }, { hasMore: false, complete: false }])('preserves partial bounded calendars: %j', async flags => {
    const api = apis(); api.getScopedCalendar.mockResolvedValue({ items: [], ...flags })
    const data = await loadCalendarAttention({ role: 'lecturer', semesterId: null }, api)
    expect(data.sources.find(x => x.id === 'lecturer-calendar')?.state).toBe('partial')
  })
  it.each([401, 403, 404, 409, 422, 429, 500])('keeps calendar when aggregator returns %s', async status => {
    const api = apis(); api.getSupervisorTriageQueue.mockRejectedValue(new Error(String(status)))
    const data = await loadCalendarAttention({ role: 'lecturer', semesterId: null }, api)
    expect(data.calendar).toHaveLength(1)
    expect(data.sources.find(x => x.id === 'triage-queue')).toMatchObject({ state: 'error', message: String(status) })
    expect(data.attentionAsOfUtc).toBeUndefined()
  })
  it('keeps attention when calendar fails and never invents a date', async () => {
    const api = apis(); api.getScopedCalendar.mockRejectedValue(new Error('503'))
    api.getStudentNextActions.mockResolvedValue({ asOfUtc: '2026-10-22T08:00:00Z', projectId: 7, totalCount: 1, hasMore: false, items: [{ kind: 'REVIEW_GATE', id: 2, projectId: 7, title: 'Bị chặn', status: 'BLOCKED', severity: 'HIGH', dueAt: null, deepLink: null }] })
    const data = await loadCalendarAttention({ role: 'student', semesterId: null }, api)
    expect(data.attention).toMatchObject([{ code: 'REVIEW_GATE', dueAt: undefined, deepLink: null }])
    expect(data.calendar).toEqual([])
  })
  it('reads the authorized department and fails closed without it', async () => {
    const api = apis()
    await loadCalendarAttention({ role: 'department', semesterId: null, departmentIds: [4] }, api)
    expect(api.getDepartmentUrgentActions).toHaveBeenCalledExactlyOnceWith(4, undefined)
    api.getDepartmentUrgentActions.mockClear()
    const data = await loadCalendarAttention({ role: 'department', semesterId: null }, api)
    expect(api.getDepartmentUrgentActions).not.toHaveBeenCalled()
    expect(data.sources[0].state).toBe('unavailable')
  })
  it('uses one backend milestone attention item even when the dashboard contains the same overdue milestone', async () => {
    const api = apis()
    api.getStudentDashboard.mockResolvedValue({ project: { id: 7, title: 'Đồ án' }, taskDeadlines: [{ id: 1, title: 'Task quá hạn', status: 'TODO', dueAtUtc: '2026-10-01', isOverdue: true }], milestoneDeadlines: [{ id: 2, title: 'Mốc quá hạn', status: 'OPEN', dueDate: '2026-10-01', isOverdue: true }, { id: 3, title: 'Mốc đúng hạn', status: 'OPEN', dueDate: '2026-12-01', isOverdue: false }] })
    api.getStudentNextActions.mockResolvedValue({ asOfUtc: '2026-10-22T08:00:00Z', totalCount: 2, hasMore: false, items: [{ kind: 'TASK', id: 1, projectId: 7, title: 'Task quá hạn', status: 'TODO', severity: 'HIGH', dueAt: '2026-10-01', deepLink: '/project/tasks/1' }, { kind: 'MILESTONE', id: 2, projectId: 7, title: 'Mốc quá hạn', status: 'OPEN', severity: 'HIGH', dueAt: '2026-10-01', deepLink: '/project/milestones/2' }] })
    const data = await loadCalendarAttention({ role: 'student', semesterId: 2 }, api)
    expect(data.attention.map(x => x.code)).toEqual(['TASK', 'MILESTONE'])
    expect(data.attention.filter(x => x.code === 'TASK')).toHaveLength(1)
    expect(data.attention.filter(x => x.title === 'Mốc quá hạn')).toHaveLength(1)
    expect(data.attention[1]).toMatchObject({ sourceId: 2, description: 'Mốc đồ án', icon: 'flag', deepLink: '/project/milestones/2' })
    expect(api.getStudentDashboard).toHaveBeenCalledTimes(1)
  })
  it('starts dashboard, calendar and aggregator independently and preserves healthy sources if dashboard fails', async () => {
    const api = apis()
    let rejectDashboard!: (reason: Error) => void
    api.getStudentDashboard.mockImplementation(() => new Promise((_, reject) => { rejectDashboard = reject }))
    const pending = loadCalendarAttention({ role: 'student', semesterId: null }, api)
    expect(api.getStudentNextActions).toHaveBeenCalledTimes(1)
    expect(api.getScopedCalendar).toHaveBeenCalledTimes(1)
    rejectDashboard(new Error('Dashboard unavailable'))
    const data = await pending
    expect(data.calendar).toHaveLength(1)
    expect(data.sources.find(x => x.id === 'student-dashboard')?.state).toBe('error')
    expect(data.sources.find(x => x.id === 'next-actions')?.state).toBe('empty')
  })
  it('restores student calendar resources only after scoped calendar fails', async () => {
    const api = apis()
    api.getScopedCalendar.mockRejectedValue(new Error('Calendar 500'))
    api.getStudentDashboard.mockResolvedValue({ project: { id: 7, title: 'Đồ án' }, taskDeadlines: [{ id: 1, title: 'Task có hạn', status: 'TODO', dueAtUtc: '2026-10-25', isOverdue: false }], milestoneDeadlines: [{ id: 2, title: 'Mốc có hạn', status: 'OPEN', dueDate: '2026-10-26', isOverdue: false }] })
    api.getMeetings.mockResolvedValue({ items: [{ id: 3, projectId: 7, title: 'Họp dự phòng', startAt: '2026-10-27T08:00:00Z', endAt: null, status: 'SCHEDULED' }], totalCount: 101 })
    api.getDeliverables.mockResolvedValue({ items: [{ id: 4, projectId: 7, title: 'Hạng mục', dueAt: '2026-10-28', status: 'OPEN' }, { id: 5, projectId: 7, title: 'Không có hạn', dueAt: null, status: 'OPEN' }], totalCount: 2 })
    api.getFinalChecklist.mockResolvedValue({ deadline: '2026-10-29' })
    const data = await loadCalendarAttention({ role: 'student', semesterId: null }, api)
    expect(data.calendar.map(x => x.sourceType)).toEqual(['TASK', 'MILESTONE', 'MEETING', 'DELIVERABLE', 'FINAL_SUBMISSION'])
    expect(data.sources.find(x => x.id === 'student-calendar')).toMatchObject({ state: 'error', message: 'Calendar 500' })
    expect(data.sources.find(x => x.id === 'meetings')?.state).toBe('partial')
    expect(data.sources.find(x => x.id === 'deliverables')?.state).toBe('ready')
    expect(data.sources.find(x => x.id === 'final-submission')?.state).toBe('ready')
    expect(api.getMeetings).toHaveBeenCalledTimes(1)
    expect(api.getStudentNextActions).toHaveBeenCalledTimes(1)
  })
  it('isolates fallback resource failures and keeps missing final deadlines empty', async () => {
    const api = apis()
    api.getScopedCalendar.mockRejectedValue(new Error('500'))
    api.getMeetings.mockRejectedValue(new Error('Meetings 403'))
    const data = await loadCalendarAttention({ role: 'student', semesterId: null }, api)
    expect(data.sources.find(x => x.id === 'meetings')).toMatchObject({ state: 'error', message: 'Meetings 403' })
    expect(data.sources.find(x => x.id === 'deliverables')?.state).toBe('empty')
    expect(data.sources.find(x => x.id === 'final-submission')?.state).toBe('empty')
    expect(data.calendar).toEqual([])
  })
  it('does not query project resources without a dashboard project', async () => {
    const api = apis()
    api.getScopedCalendar.mockRejectedValue(new Error('500'))
    api.getStudentDashboard.mockResolvedValue({ project: null, taskDeadlines: [], milestoneDeadlines: [] })
    const data = await loadCalendarAttention({ role: 'student', semesterId: null }, api)
    expect(data.sources.find(x => x.id === 'project-resources')?.state).toBe('unavailable')
    expect(api.getMeetings).not.toHaveBeenCalled()
  })
  it.each(['student', 'lecturer', 'department'] as const)('keeps only HIGH items in %s attention and discloses other open work', async role => {
    const api = apis()
    const response = { asOfUtc: '2026-10-22T08:00:00Z', totalCount: 3, hasMore: false, items: [{ kind: 'TASK', id: 1, projectId: 7, title: 'Đúng hạn', status: 'TODO', severity: 'NORMAL', dueAt: null, deepLink: null }, { kind: 'TASK', id: 2, projectId: 7, title: 'Quá hạn', status: 'TODO', severity: 'HIGH', dueAt: '2026-10-01', deepLink: null }, { kind: 'REVIEW_GATE', id: 3, projectId: 7, title: 'Gate bị chặn', status: 'BLOCKED', severity: 'HIGH', dueAt: null, deepLink: null }] }
    api.getStudentNextActions.mockResolvedValue(response)
    api.getSupervisorTriageQueue.mockResolvedValue(response)
    api.getDepartmentUrgentActions.mockResolvedValue({ ...response, departmentId: 1 })
    const data = await loadCalendarAttention({ role, semesterId: null, departmentIds: [1] }, api)
    expect(data.attention.map(x => x.title).sort()).toEqual(['Quá hạn', 'Gate bị chặn'].sort())
    expect(data.otherOpenActionsCount).toBe(1)
    expect(data.sources.find(x => x.id === (role === 'student' ? 'next-actions' : role === 'lecturer' ? 'triage-queue' : 'urgent-actions-1'))?.state).toBe('ready')
  })
  it.each(['student', 'lecturer', 'department'] as const)('discloses backend truncation for %s without treating loaded NORMAL items as the total', async role => {
    const api = apis()
    const response = { asOfUtc: '2026-10-22T08:00:00Z', totalCount: 73, hasMore: true, items: [
      { kind: 'TASK', id: 1, projectId: 7, title: 'Việc đang mở', status: 'TODO', severity: 'NORMAL', dueAt: null, deepLink: null },
      { kind: 'MILESTONE', id: 2, projectId: 7, title: 'Mốc quá hạn', status: 'OPEN', severity: 'HIGH', dueAt: '2026-10-01', deepLink: null },
    ] }
    api.getStudentNextActions.mockResolvedValue(response)
    api.getSupervisorTriageQueue.mockResolvedValue(response)
    api.getDepartmentUrgentActions.mockResolvedValue({ ...response, departmentId: 4 })
    const result = await loadCalendarAttention({ role, semesterId: null, departmentIds: [4] }, api)
    expect(result.otherOpenActionsCount).toBe(1)
    expect(result.attention).toHaveLength(1)
    expect(result.sources.find(source => source.id === (role === 'student' ? 'next-actions' : role === 'lecturer' ? 'triage-queue' : 'urgent-actions-4'))).toMatchObject({ state: 'partial', message: 'Hiển thị 2 trong tổng số 73 việc.' })
  })
  it('does not disclose truncation when the backend returned the complete list', async () => {
    const api = apis()
    api.getStudentNextActions.mockResolvedValue({ asOfUtc: '2026-10-22T08:00:00Z', totalCount: 1, hasMore: false, items: [{ kind: 'TASK', id: 1, projectId: 7, title: 'Việc đang mở', status: 'TODO', severity: 'NORMAL', dueAt: null, deepLink: null }] })
    const result = await loadCalendarAttention({ role: 'student', semesterId: null }, api)
    const source = result.sources.find(item => item.id === 'next-actions')
    expect(source?.state).toBe('ready')
    expect(source?.message ?? '').not.toMatch(/chưa cung cấp tổng số|Hiển thị .*trong tổng số|chưa đầy đủ/)
    expect(result.otherOpenActionsCount).toBe(1)
  })
  it('preserves both unsupported deadline disclosures without pretending to read removed sources', async () => {
    const api = apis()
    const student = await loadCalendarAttention({ role: 'student', semesterId: null }, api)
    const lecturer = await loadCalendarAttention({ role: 'lecturer', semesterId: null }, api)
    expect(student.sources).toContainEqual(expect.objectContaining({ id: 'progress-report-deadline', state: 'unsupported', message: 'API hiện trả kỳ báo cáo, không trả hạn nộp báo cáo.' }))
    expect(lecturer.sources).toContainEqual(expect.objectContaining({ id: 'evaluation-assignments', state: 'unsupported', message: 'DTO hiện không có hạn đánh giá; không tạo sự kiện lịch.' }))
    expect(lecturer.sources.some(x => x.id === 'supervisor-dashboard')).toBe(false)
    expect(student.sources.some(x => x.id === 'meetings')).toBe(false)
  })
  it('merges authorized department results and reports each failed department independently', async () => {
    const api = apis()
    api.getDepartmentUrgentActions.mockImplementation(async id => {
      if (id === 3) throw new Error('Bộ môn 3: 403')
      return { asOfUtc: id === 1 ? '2026-10-22T08:00:00.100Z' : '2026-10-22T08:00:00Z', departmentId: id, totalCount: 1, hasMore: false, items: [{ kind: 'PROJECT', id, projectId: id, title: `Bộ môn ${id}`, status: 'PENDING', severity: 'HIGH', dueAt: null, deepLink: null }] }
    })
    const data = await loadCalendarAttention({ role: 'department', semesterId: null, departmentIds: [1, 2, 3, 1] }, api)
    expect(api.getDepartmentUrgentActions.mock.calls.map(x => x[0])).toEqual([1, 2, 3])
    expect(data.attention.map(x => x.title)).toEqual(['Bộ môn 1', 'Bộ môn 2'])
    expect(data.sources.find(x => x.id === 'urgent-actions-3')).toMatchObject({ state: 'error', message: 'Bộ môn 3: 403' })
    expect(data.attentionAsOfUtc).toBe('2026-10-22T08:00:00Z')
  })
  it.each([{ departmentIds: [] }, { departmentIds: [0, -1, 1.5, Number.NaN] }])('fails closed with no valid departments: %j', async ({ departmentIds }) => {
    const api = apis()
    const data = await loadCalendarAttention({ role: 'department', semesterId: null, departmentIds }, api)
    expect(api.getDepartmentUrgentActions).not.toHaveBeenCalled()
    expect(data.sources).toContainEqual(expect.objectContaining({ id: 'urgent-actions', state: 'unavailable', message: expect.stringContaining('phiên đăng nhập') }))
  })
  it.each([{ departmentIds: [1] }, { departmentIds: [1, 2] }])('labels authorized department sources with academic names: %j', async ({ departmentIds }) => {
    const api = apis()
    const departments = [{ id: 1, name: 'Công nghệ thông tin' }, { id: 2, name: 'Quản trị kinh doanh' }, { id: 99, name: 'Ngoài phạm vi được cấp' }]
    const result = await loadCalendarAttention({ role: 'department', semesterId: null, departmentIds, departments }, api)
    expect(api.getDepartmentUrgentActions.mock.calls.map(call => call[0])).toEqual(departmentIds)
    expect(result.sources.filter(source => source.id.startsWith('urgent-actions-'))).toEqual(departmentIds.map(id => expect.objectContaining({ id: `urgent-actions-${id}`, label: `Việc cần xử lý · ${departments.find(department => department.id === id)?.name}` })))
    expect(result.sources.some(source => source.label.includes('Bộ môn 1') || source.label.includes('Bộ môn 2'))).toBe(false)
  })
  it('retains named department identity on failure and falls back safely if a name is absent', async () => {
    const api = apis()
    api.getDepartmentUrgentActions.mockRejectedValue(new Error('403'))
    const data = await loadCalendarAttention({ role: 'department', semesterId: null, departmentIds: [1, 2], departments: [{ id: 1, name: 'Công nghệ thông tin' }] }, api)
    expect(data.sources).toContainEqual(expect.objectContaining({ id: 'urgent-actions-1', label: 'Việc cần xử lý · Công nghệ thông tin', state: 'error', message: '403' }))
    expect(data.sources).toContainEqual(expect.objectContaining({ id: 'urgent-actions-2', label: 'Việc cần xử lý · Bộ môn 2', state: 'error' }))
  })
  it('retains unsupported admin calendar and existing account source', async () => {
    const api = apis()
    const data = await loadCalendarAttention({ role: 'admin', semesterId: null, accessToken: 't' }, api)
    expect(data.sources.find(x => x.id === 'admin-calendar')).toMatchObject({ state: 'unavailable', message: 'Lịch tổng hợp chưa hỗ trợ tài khoản quản trị.' })
    expect(api.getScopedCalendar).not.toHaveBeenCalled()
    expect(api.getUsers).toHaveBeenCalledTimes(1)
  })
})
