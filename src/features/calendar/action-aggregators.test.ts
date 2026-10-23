import { describe, expect, it, vi } from 'vitest'
import { aggregatorAttention, safeInternalDeepLink } from './action-aggregators'
import { getDepartmentUrgentActions, getStudentNextActions, getSupervisorTriageQueue } from './action-aggregators-api'
const http = vi.hoisted(() => ({ httpGet: vi.fn().mockResolvedValue({ items: [] }) }))
vi.mock('../../services/http/http-client', () => http)

describe('aggregator contract and links', () => {
  it('uses three deployed GET routes without paging', async () => {
    await getStudentNextActions(); await getSupervisorTriageQueue(); await getDepartmentUrgentActions(4)
    expect(http.httpGet.mock.calls.map(call => call[0])).toEqual(['/students/me/next-actions', '/supervisors/me/triage-queue', '/departments/4/urgent-actions'])
  })
  it.each([null, '', 'https://evil.test/x', 'https://ai-pms.invalid/x', '//evil.test', '/\\evil.test', '/%2f%2fevil.test', '/%5cevil.test', '/%0a/evil.test', 'javascript:alert(1)', '/%zz'])('refuses unsafe links: %s', link => {
    expect(safeInternalDeepLink(link)).toBeNull()
  })
  it.each(['/project/timeline', '/project/tasks/2?view=board#notes', '/'])('allows guarded internal routes: %s', link => expect(safeInternalDeepLink(link)).toBe(link))
  it.each(['TASK', 'REVIEW_GATE', 'PROGRESS_REPORT', 'PROGRESS_REVIEW', 'MEETING_SIGN_OFF', 'REVIEWER_ASSIGNMENT', 'SUPERVISOR_REQUEST', 'APPEAL'])('labels known kind %s', kind => {
    const item = aggregatorAttention({ kind, id: 1, projectId: null, title: 'Việc cần làm', status: 'PENDING', severity: 'HIGH', dueAt: null, deepLink: '/' })
    expect(item.description).not.toContain('Mục cần chú ý')
    expect(item.icon).not.toBe('info'); expect(item.tone).toBe('warning')
  })
  it('presents the backend milestone kind with its domain label and flag icon', () => {
    expect(aggregatorAttention({ kind: 'MILESTONE', id: 2, projectId: 7, title: 'Mốc quá hạn', status: 'OPEN', severity: 'HIGH', dueAt: '2026-10-01', deepLink: '/project/milestones/2' })).toMatchObject({
      code: 'MILESTONE', description: 'Mốc đồ án', icon: 'flag', tone: 'warning', deepLink: '/project/milestones/2',
    })
  })
  it('retains unknown kinds with neutral text and no unsafe navigation', () => {
    const item = aggregatorAttention({ kind: 'FUTURE_KIND', id: 1, projectId: null, title: 'Việc mới', status: 'PENDING', severity: 'NORMAL', dueAt: null, deepLink: '//evil.test' })
    expect(item).toMatchObject({ title: 'Việc mới', description: 'Mục cần chú ý chưa xác định loại', tone: 'neutral', deepLink: null })
    expect(item.description).not.toContain('FUTURE_KIND')
  })
})
