import { describe, expect, it, vi } from 'vitest'
import { notificationCopy } from './notification-copy'
import type { NotificationItem } from './notifications-api'

function makeItem(notificationType: string, title: string, content = title + '.'): NotificationItem {
  return {
    id: 1,
    notificationType,
    title,
    content,
    relatedEntityType: 'TEAM',
    relatedEntityId: 42,
    createdAt: '2026-10-24T10:00:00Z',
    isRead: false,
    readAt: null,
  }
}

describe('notificationCopy (FE2-G6 UX-03)', () => {
  it('translates team invitation types into Vietnamese copy and appropriate icons', () => {
    const sent = notificationCopy(makeItem('TEAM_INVITATION_SENT', 'You received a team invitation'))
    expect(sent.title).toBe('Bạn nhận được lời mời tham gia nhóm')
    expect(sent.label).toBe('Lời mời nhóm')
    expect(sent.icon).toBe('group_add')

    const accepted = notificationCopy(makeItem('TEAM_INVITATION_ACCEPTED', "A student accepted your team's invitation"))
    expect(accepted.title).toBe('Lời mời tham gia nhóm đã được chấp nhận')
    expect(accepted.label).toBe('Lời mời nhóm')

    const rejected = notificationCopy(makeItem('TEAM_INVITATION_REJECTED', "A student declined your team's invitation"))
    expect(rejected.title).toBe('Lời mời tham gia nhóm bị từ chối')

    const cancelled = notificationCopy(makeItem('TEAM_INVITATION_CANCELLED', 'A team invitation was cancelled'))
    expect(cancelled.title).toBe('Lời mời tham gia nhóm đã bị hủy')
  })

  it('translates supervisor request and assignment types into Vietnamese', () => {
    const req = notificationCopy(makeItem('SUPERVISOR_REQUEST_SENT', 'You received a supervision request'))
    expect(req.title).toBe('Bạn nhận được yêu cầu hướng dẫn đồ án')
    expect(req.label).toBe('Yêu cầu hướng dẫn')

    const accepted = notificationCopy(makeItem('SUPERVISOR_REQUEST_ACCEPTED', "Your project's supervision request was accepted"))
    expect(accepted.title).toBe('Yêu cầu hướng dẫn đồ án đã được chấp nhận')

    const replaced = notificationCopy(makeItem('SUPERVISOR_REPLACED', 'A project supervisor assignment was replaced'))
    expect(replaced.title).toBe('Thay đổi giảng viên hướng dẫn đồ án')
    expect(replaced.label).toBe('Phân công GVHD')
  })

  it('translates final submission, leader change, evaluation and report types', () => {
    const finalSub = notificationCopy(makeItem('FINAL_SUBMISSION_LOCKED', 'A project submitted its final package'))
    expect(finalSub.title).toBe('Đồ án đã nộp bản hoàn thiện cuối kỳ')

    const leaderChange = notificationCopy(makeItem('TEAM_LEADER_CHANGE_REQUESTED', 'You received a team leader change request'))
    expect(leaderChange.title).toBe('Có yêu cầu thay đổi trưởng nhóm')

    const evalAssigned = notificationCopy(makeItem('EVALUATOR_ASSIGNED', 'You have been assigned a project evaluation'))
    expect(evalAssigned.title).toBe('Bạn được phân công đánh giá đồ án')

    const report = notificationCopy(makeItem('PROGRESS_REPORT_SUBMITTED', 'A progress report has been submitted'))
    expect(report.title).toBe('Báo cáo tiến độ đồ án đã được nộp')
  })

  it('translates scheduled deadline notifications', () => {
    const taskReminder = notificationCopy(makeItem('TASK_DEADLINE_REMINDER', 'A task is due soon'))
    expect(taskReminder.title).toBe('Công việc sắp đến hạn hoàn thành')

    const taskOverdue = notificationCopy(makeItem('TASK_OVERDUE', 'A task is overdue'))
    expect(taskOverdue.title).toBe('Công việc đã quá thời hạn')
  })

  it('anti-regression: fallback never exposes raw English title to the user on unmapped types', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const unknown = notificationCopy(makeItem('NEW_FUTURE_BACKEND_EVENT', 'Raw English Unmapped Title from Server', 'Raw English Content.'))

    expect(unknown.title).toBe('Thông báo từ hệ thống')
    expect(unknown.title).not.toContain('Raw English')
    expect(unknown.content).toBe('Bạn có thông báo mới từ hệ thống quản lý đồ án.')
    expect(unknown.label).toBe('Thông báo hệ thống')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unmapped notification type: NEW_FUTURE_BACKEND_EVENT'))

    warnSpy.mockRestore()
  })
})
