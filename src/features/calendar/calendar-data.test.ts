import { describe, expect, it, vi } from 'vitest'
import { loadCalendarAttention } from './calendar-data'

function apis() {
  return {
    getUsers: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    getScopedCalendar: vi.fn().mockResolvedValue({ items: [{ sourceType: 'MEETING', sourceId: 3, projectId: 7, title: 'Lịch từ projection', dueAt: '2026-10-22T08:00:00Z', status: 'SCHEDULED', deepLink: '/supervisor/projects/7/meetings/3' }], hasMore: false, complete: true }),
    getStudentNextActions: vi.fn().mockResolvedValue({ asOfUtc: '2026-10-22T08:00:00Z', projectId: 7, items: [] }),
    getSupervisorTriageQueue: vi.fn().mockResolvedValue({ asOfUtc: '2026-10-22T08:00:00Z', items: [] }),
    getDepartmentUrgentActions: vi.fn().mockResolvedValue({ asOfUtc: '2026-10-22T08:00:00Z', departmentId: 4, items: [] }),
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
    api.getStudentNextActions.mockResolvedValue({ asOfUtc: '2026-10-22T08:00:00Z', projectId: 7, items: [{ kind: 'REVIEW_GATE', id: 2, projectId: 7, title: 'Chờ thẩm định', status: 'IN_REVIEW', severity: 'NORMAL', dueAt: null, deepLink: null }] })
    const data = await loadCalendarAttention({ role: 'student', semesterId: null }, api)
    expect(data.attention).toMatchObject([{ code: 'REVIEW_GATE', dueAt: undefined, deepLink: null }])
    expect(data.calendar).toEqual([])
  })
  it('reads the authorized department and fails closed without it', async () => {
    const api = apis()
    await loadCalendarAttention({ role: 'department', semesterId: null, departmentId: 4 }, api)
    expect(api.getDepartmentUrgentActions).toHaveBeenCalledExactlyOnceWith(4, undefined)
    api.getDepartmentUrgentActions.mockClear()
    const data = await loadCalendarAttention({ role: 'department', semesterId: null }, api)
    expect(api.getDepartmentUrgentActions).not.toHaveBeenCalled()
    expect(data.sources[0].state).toBe('unavailable')
  })
  it('retains unsupported admin calendar and existing account source', async () => {
    const api = apis()
    const data = await loadCalendarAttention({ role: 'admin', semesterId: null, accessToken: 't' }, api)
    expect(data.sources.find(x => x.id === 'admin-calendar')).toMatchObject({ state: 'unavailable', message: 'Lịch tổng hợp chưa hỗ trợ tài khoản quản trị.' })
    expect(api.getScopedCalendar).not.toHaveBeenCalled()
    expect(api.getUsers).toHaveBeenCalledTimes(1)
  })
})
