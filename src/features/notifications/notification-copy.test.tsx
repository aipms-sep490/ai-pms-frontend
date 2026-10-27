import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationRow } from './NotificationRow'
import { notificationCopy } from './notification-copy'
import type { NotificationItem } from './notifications-api'

// Independent inventory of merged BE producers at a4cb6b5; see the G6 handoff.
const producerTypes = [
  'TEAM_INVITATION_SENT', 'TEAM_INVITATION_ACCEPTED', 'TEAM_INVITATION_REJECTED', 'TEAM_INVITATION_CANCELLED',
  'SUPERVISOR_REQUEST_SENT', 'SUPERVISOR_REQUEST_ACCEPTED', 'SUPERVISOR_REQUEST_REJECTED', 'SUPERVISOR_REQUEST_CANCELLED',
  'TEAM_LEADER_CHANGE_REQUESTED', 'TEAM_LEADER_CHANGE_APPROVED', 'TEAM_LEADER_CHANGE_REJECTED',
  'FINAL_SUBMISSION_LOCKED', 'EVALUATION_FINALIZED', 'PROJECT_RESULT_PUBLISHED', 'STUDENT_RESULT_PUBLISHED',
  'PROJECT_APPROVED', 'PROJECT_REJECTED', 'PROJECT_REVISION_REQUESTED', 'SUPERVISOR_FEEDBACK_ADDED',
  'EVALUATOR_ASSIGNED', 'SUPERVISOR_REPLACED', 'MEETING_SCHEDULED', 'PROGRESS_REPORT_SUBMITTED',
  'TASK_DEADLINE_REMINDER', 'TASK_OVERDUE', 'DELIVERABLE_DEADLINE_REMINDER', 'DELIVERABLE_OVERDUE',
  'FINAL_SUBMISSION_DEADLINE_REMINDER', 'FINAL_SUBMISSION_OVERDUE',
  'PROJECT_RISK_MEDIUM', 'PROJECT_RISK_HIGH', 'PROJECT_RISK_CRITICAL',
  'DELIVERABLE_SUBMITTED', 'MEETING_START_REMINDER', 'DEFENSE_SCHEDULED', 'DEFENSE_CANCELLED',
  'MEETING_ACTION_ASSIGNED', 'INDUSTRY_INVITATION', 'APPEAL_REQUESTED', 'APPEAL_REVIEWER_ASSIGNED',
  'APPEAL_REVIEWED', 'APPEAL_DECIDED', 'REVIEW_GATE_UPDATED',
]
const legacyTypes = [
  'PROJECT_UPDATED', 'DELIVERABLE_FEEDBACK_ADDED', 'REVIEW_POLICY_PUBLISHED', 'REVIEW_DEADLINE_APPROACHING',
  'GATE_REVIEW_ASSIGNED', 'GATE_REVIEW_SUBMITTED', 'GATE_REVISION_SUBMITTED', 'GATE_REVISION_REQUIRED',
  'EVIDENCE_VERIFIED', 'GATE_DECISION_RECORDED', 'DISCIPLINE_REVIEW_PENDING', 'DISCIPLINE_DECISION_RECORDED',
  'DEFENSE_READINESS_CHANGED',
]
const rawTitle = 'UNTRANSLATED_BACKEND_TITLE private@example.test'
const rawContent = 'UNTRANSLATED_BACKEND_CONTENT private-person /internal/trace-123'
const item = (notificationType: string): NotificationItem => ({
  id: 5, notificationType, title: rawTitle, content: rawContent,
  relatedEntityType: null, relatedEntityId: null, createdAt: '2026-10-26T00:00:00Z', isRead: false, readAt: null,
})

beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}))
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Vietnamese notification copy', () => {
  it.each([...producerTypes, ...legacyTypes])('renders known %s without falling back to backend prose', type => {
    const copy = notificationCopy(item(type))
    for (const text of [copy.title, copy.content, copy.label]) {
      expect(text).toMatch(/[À-ỹ]/u)
      expect(text).not.toMatch(/UNTRANSLATED|private|internal|undefined|Review Gate|Defense Readiness|timeline/)
    }
    expect(copy.title).not.toBe('Có cập nhật mới trên hệ thống')
    expect(copy.icon).not.toBe('notifications')
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('renders a neutral Vietnamese fallback and logs only the unknown type', () => {
    const copy = notificationCopy(item('FUTURE_NOTIFICATION'))
    expect(copy).toEqual({
      title: 'Có cập nhật mới trên hệ thống',
      content: 'Hãy kiểm tra thông tin mới trong phạm vi bạn được cấp quyền.',
      label: 'Thông báo hệ thống',
      icon: 'notifications',
    })
    expect(console.warn).toHaveBeenCalledExactlyOnceWith('[notifications] Unsupported notification type:', 'FUTURE_NOTIFICATION')
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/private|internal|UNTRANSLATED/)
  })

  it.each(['__proto__', 'constructor', 'toString', 'person@example.test\nprivate-data'])('does not resolve inherited or malformed type %s as a known message', type => {
    expect(notificationCopy(item(type)).title).toBe('Có cập nhật mới trên hệ thống')
    expect(console.warn).toHaveBeenCalledExactlyOnceWith('[notifications] Unsupported notification type:', 'INVALID_NOTIFICATION_TYPE')
  })

  it.each([
    ['TEAM_INVITATION_SENT', 'Bạn nhận được lời mời tham gia nhóm'],
    ['TEAM_INVITATION_CANCELLED', 'Lời mời tham gia nhóm đã được hủy'],
    ['REVIEW_GATE_UPDATED', 'Hồ sơ thẩm định tiến trình có cập nhật'],
    ['FUTURE_NOTIFICATION', 'Có cập nhật mới trên hệ thống'],
  ])('keeps raw title and content out of the %s inbox row', (type, title) => {
    render(<MemoryRouter><ul><NotificationRow item={item(type)} busy={false} onRead={() => {}} /></ul></MemoryRouter>)
    expect(screen.getByRole('heading', { name: title })).toBeTruthy()
    expect(screen.queryByText(rawTitle)).toBeNull()
    expect(screen.queryByText(rawContent)).toBeNull()
    expect(document.body.textContent).not.toMatch(/private|internal|UNTRANSLATED|undefined/)
  })
})
