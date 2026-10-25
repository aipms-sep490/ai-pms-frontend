import { describe, expect, it } from 'vitest'
import {
  resolveNotificationLink,
  resolveReviewGateNotificationLink,
} from './notification-link-resolver'

describe('notification-link-resolver (FUNC-10)', () => {
  it('resolves team invitation link for student', () => {
    const link = resolveNotificationLink('TEAM_INVITATION_SENT', ['STUDENT'])
    expect(link).toEqual({ url: '/team', label: 'Xem lời mời nhóm' })
  })

  it('resolves supervisor request link for lecturer and student', () => {
    const lecturerLink = resolveNotificationLink('SUPERVISOR_REQUEST_SENT', ['LECTURER'])
    expect(lecturerLink).toEqual({ url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' })

    const studentLink = resolveNotificationLink('SUPERVISOR_REQUEST_ACCEPTED', ['STUDENT'])
    expect(studentLink).toEqual({ url: '/projects/lifecycle', label: 'Xem hồ sơ đồ án' })
  })

  it('resolves project proposal link for department staff and student', () => {
    const staffLink = resolveNotificationLink('PROJECT_REVISION_REQUESTED', ['DEPARTMENT_STAFF'])
    expect(staffLink).toEqual({ url: '/department/projects/review', label: 'Mở thẩm định đề cương' })

    const studentLink = resolveNotificationLink('PROJECT_APPROVED', ['STUDENT'])
    expect(studentLink).toEqual({ url: '/projects/lifecycle', label: 'Xem hồ sơ đồ án' })
  })

  it('resolves progress report link for student and lecturer', () => {
    const studentLink = resolveNotificationLink('PROGRESS_REPORT_SUBMITTED', ['STUDENT'])
    expect(studentLink).toEqual({ url: '/project/reports', label: 'Xem báo cáo tiến độ' })

    const lecturerLink = resolveNotificationLink('PROGRESS_REPORT_SUBMITTED', ['LECTURER'])
    expect(lecturerLink).toEqual({ url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' })
  })

  it('resolves task and deliverable links for student', () => {
    const taskLink = resolveNotificationLink('TASK_DEADLINE_REMINDER', ['STUDENT'])
    expect(taskLink).toEqual({ url: '/project/tasks', label: 'Xem công việc đồ án' })

    const deliverableLink = resolveNotificationLink('DELIVERABLE_OVERDUE', ['STUDENT'])
    expect(deliverableLink).toEqual({ url: '/project/deliverables', label: 'Xem hạng mục cần nộp' })
  })

  it('resolves final submission link for student and department staff', () => {
    const studentLink = resolveNotificationLink('FINAL_SUBMISSION_LOCKED', ['STUDENT'])
    expect(studentLink).toEqual({ url: '/project/final-submission', label: 'Xem bàn giao cuối kỳ' })

    const staffLink = resolveNotificationLink('FINAL_SUBMISSION_DEADLINE_REMINDER', ['DEPARTMENT_STAFF'])
    expect(staffLink).toEqual({ url: '/department/portfolio', label: 'Mở danh mục đồ án' })
  })

  it('resolves published result link for student and lecturer', () => {
    const studentLink = resolveNotificationLink('PROJECT_RESULT_PUBLISHED', ['STUDENT'])
    expect(studentLink).toEqual({ url: '/project/result', label: 'Xem kết quả đồ án' })

    const lecturerLink = resolveNotificationLink('PROJECT_RESULT_PUBLISHED', ['LECTURER'])
    expect(lecturerLink).toEqual({ url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' })
  })

  it('resolves review gate links preserving existing behavior', () => {
    const gateStudent = resolveReviewGateNotificationLink('GATE_1_OPENED', ['STUDENT'])
    expect(gateStudent).toEqual({ url: '/project/timeline', label: 'Mở tiến trình Review Gate' })

    const gateLecturer = resolveReviewGateNotificationLink('REVIEW_ASSIGNED', ['LECTURER'])
    expect(gateLecturer).toEqual({ url: '/review/gate-assignments', label: 'Mở hàng đợi thẩm định' })
  })

  it('resolves appeal link when resultCorrectionEnabled is active', () => {
    const studentLink = resolveNotificationLink(
      'APPEAL_SUBMITTED',
      ['STUDENT'],
      'PROJECT',
      12,
      { resultCorrectionEnabled: true },
    )
    expect(studentLink).toEqual({ url: '/project/result', label: 'Xem yêu cầu phúc khảo' })

    const staffLink = resolveNotificationLink(
      'APPEAL_SUBMITTED',
      ['DEPARTMENT_STAFF'],
      'PROJECT',
      12,
      { resultCorrectionEnabled: true },
    )
    expect(staffLink).toEqual({ url: '/review/projects/12/corrections', label: 'Xem yêu cầu phúc khảo' })
  })
})
