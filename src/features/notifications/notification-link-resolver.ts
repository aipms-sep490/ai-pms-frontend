import { env } from '../../app/config/env'

export interface NotificationActionLink {
  url: string
  label: string
}

export function resolveReviewGateNotificationLink(
  notificationType: string,
  roles: readonly string[],
): NotificationActionLink | null {
  if (
    notificationType.startsWith('GATE_') ||
    notificationType.startsWith('REVIEW_') ||
    notificationType.startsWith('DISCIPLINE_') ||
    notificationType === 'EVIDENCE_VERIFIED' ||
    notificationType === 'DEFENSE_READINESS_CHANGED'
  ) {
    if (roles.includes('STUDENT')) {
      return { url: '/project/timeline', label: 'Mở tiến trình Review Gate' }
    }
    if (
      roles.includes('LECTURER') &&
      (notificationType.includes('ASSIGNED') || notificationType.includes('SUBMITTED'))
    ) {
      return { url: '/review/gate-assignments', label: 'Mở hàng đợi thẩm định' }
    }
    if (roles.includes('LECTURER')) {
      return { url: '/supervision/my-projects', label: 'Mở đồ án theo dõi' }
    }
    if (roles.includes('DEPARTMENT_STAFF') || roles.includes('ADMIN')) {
      return { url: '/department/projects/progress-matrix', label: 'Mở ma trận tiến trình' }
    }
  }
  return null
}

export function resolveNotificationLink(
  notificationType: string,
  roles: readonly string[],
  relatedEntityType?: string | null,
  relatedEntityId?: number | null,
  options?: { resultCorrectionEnabled?: boolean },
): NotificationActionLink | null {
  const resultCorrectionEnabled = options?.resultCorrectionEnabled ?? env.resultCorrectionEnabled

  // 1. Appeal notifications (FUNC-10, RV-01)
  if (
    resultCorrectionEnabled &&
    notificationType.startsWith('APPEAL_') &&
    relatedEntityType === 'PROJECT' &&
    Number.isSafeInteger(relatedEntityId) &&
    (relatedEntityId ?? 0) > 0
  ) {
    if (roles.includes('STUDENT')) {
      return { url: '/project/result', label: 'Xem yêu cầu phúc khảo' }
    }
    if (roles.some((role) => role === 'DEPARTMENT_STAFF' || role === 'LECTURER')) {
      return { url: `/review/projects/${relatedEntityId}/corrections`, label: 'Xem yêu cầu phúc khảo' }
    }
  }

  // 2. Review Gate notifications
  const reviewGateLink = resolveReviewGateNotificationLink(notificationType, roles)
  if (reviewGateLink) {
    return reviewGateLink
  }

  // 3. Team Invitation notifications
  if (notificationType.startsWith('TEAM_INVITATION_')) {
    if (roles.includes('STUDENT')) {
      return { url: '/team', label: 'Xem lời mời nhóm' }
    }
  }

  // 4. Supervisor Request & Assignment notifications
  if (
    notificationType.startsWith('SUPERVISOR_REQUEST_') ||
    notificationType === 'SUPERVISOR_REPLACED'
  ) {
    if (roles.includes('LECTURER')) {
      return { url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' }
    }
    if (roles.includes('STUDENT')) {
      return { url: '/projects/lifecycle', label: 'Xem hồ sơ đồ án' }
    }
  }

  // 5. Team Leader Change notifications
  if (notificationType.startsWith('TEAM_LEADER_CHANGE_')) {
    if (roles.includes('STUDENT')) {
      return { url: '/team', label: 'Xem thông tin nhóm' }
    }
    if (roles.includes('LECTURER')) {
      return { url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' }
    }
  }

  // 6. Project Proposal Lifecycle notifications
  if (
    notificationType === 'PROJECT_APPROVED' ||
    notificationType === 'PROJECT_REJECTED' ||
    notificationType === 'PROJECT_REVISION_REQUESTED' ||
    notificationType === 'PROJECT_UPDATED'
  ) {
    if (roles.includes('STUDENT')) {
      return { url: '/projects/lifecycle', label: 'Xem hồ sơ đồ án' }
    }
    if (roles.includes('DEPARTMENT_STAFF')) {
      return { url: '/department/projects/review', label: 'Mở thẩm định đề cương' }
    }
    if (roles.includes('LECTURER')) {
      return { url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' }
    }
  }

  // 7. Progress Report & Feedback notifications
  if (
    notificationType === 'PROGRESS_REPORT_SUBMITTED' ||
    notificationType === 'FEEDBACK_ADDED'
  ) {
    if (roles.includes('STUDENT')) {
      return { url: '/project/reports', label: 'Xem báo cáo tiến độ' }
    }
    if (roles.includes('LECTURER')) {
      return { url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' }
    }
  }

  // 8. Task notifications
  if (
    notificationType === 'TASK_DEADLINE_REMINDER' ||
    notificationType === 'TASK_OVERDUE'
  ) {
    if (roles.includes('STUDENT')) {
      return { url: '/project/tasks', label: 'Xem công việc đồ án' }
    }
    if (roles.includes('LECTURER')) {
      return { url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' }
    }
  }

  // 9. Deliverable notifications
  if (
    notificationType === 'DELIVERABLE_DEADLINE_REMINDER' ||
    notificationType === 'DELIVERABLE_OVERDUE'
  ) {
    if (roles.includes('STUDENT')) {
      return { url: '/project/deliverables', label: 'Xem hạng mục cần nộp' }
    }
    if (roles.includes('LECTURER')) {
      return { url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' }
    }
  }

  // 10. Final Submission notifications
  if (
    notificationType === 'FINAL_SUBMISSION_LOCKED' ||
    notificationType === 'FINAL_SUBMISSION_DEADLINE_REMINDER' ||
    notificationType === 'FINAL_SUBMISSION_OVERDUE'
  ) {
    if (roles.includes('STUDENT')) {
      return { url: '/project/final-submission', label: 'Xem bàn giao cuối kỳ' }
    }
    if (roles.includes('DEPARTMENT_STAFF')) {
      return { url: '/department/portfolio', label: 'Mở danh mục đồ án' }
    }
    if (roles.includes('LECTURER')) {
      return { url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' }
    }
  }

  // 11. Evaluation Assignment notifications
  if (notificationType === 'EVALUATION_FINALIZED' || notificationType === 'EVALUATOR_ASSIGNED') {
    if (roles.includes('LECTURER')) {
      return { url: '/evaluator/workspace', label: 'Mở chấm điểm đồ án' }
    }
    if (roles.includes('DEPARTMENT_STAFF')) {
      return { url: '/department/portfolio', label: 'Mở danh mục đồ án' }
    }
    if (roles.includes('STUDENT')) {
      return { url: '/project/result', label: 'Xem kết quả đồ án' }
    }
  }

  // 12. Result Publication notifications
  if (
    notificationType === 'PROJECT_RESULT_PUBLISHED' ||
    notificationType === 'STUDENT_RESULT_PUBLISHED'
  ) {
    if (roles.includes('STUDENT')) {
      return { url: '/project/result', label: 'Xem kết quả đồ án' }
    }
    if (roles.includes('LECTURER')) {
      return { url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' }
    }
    if (roles.includes('DEPARTMENT_STAFF')) {
      return { url: '/department/portfolio', label: 'Mở danh mục đồ án' }
    }
  }

  // 13. Project Risk notifications
  if (notificationType === 'PROJECT_RISK_MEDIUM' || notificationType === 'PROJECT_RISK_HIGH') {
    if (roles.includes('STUDENT')) {
      return { url: '/project/overview', label: 'Xem tổng quan lộ trình' }
    }
    if (roles.includes('LECTURER')) {
      return { url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' }
    }
  }

  // 14. Meeting notifications
  if (notificationType === 'MEETING_SCHEDULED') {
    if (roles.includes('STUDENT')) {
      return { url: '/project/meetings', label: 'Xem lịch họp và biên bản' }
    }
    if (roles.includes('LECTURER')) {
      return { url: '/supervisor/workspace', label: 'Mở không gian hướng dẫn' }
    }
  }

  return null
}
