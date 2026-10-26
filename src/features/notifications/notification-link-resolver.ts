import { env } from '../../app/config/env'
import { getWorkspaceRole, type WorkspaceRole } from '../auth/utils/role-access'
import type { NotificationItem } from './notifications-api'

export interface NotificationLink { url: string; label: string }
type Target = NotificationLink | ((id: number) => NotificationLink)
interface Rule {
  entities: readonly string[]
  targets: Partial<Record<WorkspaceRole, Target>>
  feature?: 'resultCorrectionEnabled' | 'defenseScheduleEnabled'
}

const ownProjects: NotificationLink = { url: '/supervisor/workspace', label: 'Xem đồ án được phân công' }
const studentTeam: NotificationLink = { url: '/team', label: 'Mở nhóm và lời mời' }
const studentDeliverables: NotificationLink = { url: '/project/deliverables', label: 'Xem hạng mục của đồ án hiện tại' }
const team: Rule = { entities: ['TEAM_INVITATION', 'TEAM'], targets: { student: studentTeam } }
const leaderChange: Rule = { entities: ['TEAM_LEADER_CHANGE_REQUEST', 'TEAM'], targets: { student: studentTeam, lecturer: ownProjects } }
const supervision: Rule = { entities: ['SUPERVISOR_REQUEST', 'SUPERVISOR_ASSIGNMENT'], targets: {
  student: { url: '/project/supervisor', label: 'Xem đề nghị hướng dẫn hiện tại' }, lecturer: ownProjects,
} }
const proposal: Rule = { entities: ['PROJECT'], targets: {
  student: { url: '/projects/lifecycle', label: 'Xem hồ sơ đồ án hiện tại' }, lecturer: ownProjects,
  department: id => ({ url: `/department/projects/review/${id}`, label: 'Xem hồ sơ thẩm định' }),
} }
const task: Rule = { entities: ['TASK'], targets: {
  student: id => ({ url: `/project/tasks/${id}`, label: 'Xem công việc' }), lecturer: ownProjects,
} }
const deliverable: Rule = { entities: ['DELIVERABLE', 'DELIVERABLE_VERSION'], targets: { student: studentDeliverables, lecturer: ownProjects } }
const meeting: Rule = { entities: ['MEETING'], targets: {
  student: id => ({ url: `/project/meetings/${id}`, label: 'Xem cuộc họp' }),
  lecturer: { url: '/calendar', label: 'Xem lịch họp được mời' },
} }
const meetingAction: Rule = { entities: ['MEETING_ACTION_ITEM'], targets: {
  student: { url: '/project/meetings', label: 'Xem cuộc họp của đồ án hiện tại' }, lecturer: meeting.targets.lecturer,
} }
const report: Rule = { entities: ['PROGRESS_REPORT'], targets: {
  student: id => ({ url: `/project/reports/${id}`, label: 'Xem báo cáo' }), lecturer: ownProjects,
} }
const finalSubmission: Rule = { entities: ['PROJECT'], targets: {
  student: { url: '/project/final-submission', label: 'Xem bàn giao đồ án hiện tại' }, lecturer: ownProjects,
  department: id => ({ url: `/department/projects/${id}/final-submission`, label: 'Xem hồ sơ bàn giao' }),
} }
const result: Rule = { entities: ['PROJECT', 'STUDENT_RESULT'], targets: {
  student: { url: '/project/result', label: 'Xem kết quả đồ án hiện tại' },
} }
const risk: Rule = { entities: ['PROJECT'], targets: {
  student: { url: '/project/overview', label: 'Xem tiến độ đồ án hiện tại' }, lecturer: ownProjects,
  department: { url: '/department/portfolio', label: 'Xem danh mục đồ án của bộ môn' },
} }
const defense: Rule = { entities: ['DEFENSE_SESSION'], feature: 'defenseScheduleEnabled', targets: {
  student: { url: '/project/defense', label: 'Xem lịch bảo vệ đồ án hiện tại' }, lecturer: meeting.targets.lecturer,
} }
const appeal: Rule = { entities: ['PROJECT'], feature: 'resultCorrectionEnabled', targets: {
  student: { url: '/project/result', label: 'Xem yêu cầu phúc khảo' },
  lecturer: id => ({ url: `/review/projects/${id}/corrections`, label: 'Xem yêu cầu phúc khảo' }),
  department: id => ({ url: `/review/projects/${id}/corrections`, label: 'Xem yêu cầu phúc khảo' }),
} }
// Core Review Gates is always routed; VITE_ENABLE_GATES only controls legacy checkpoints.
const gates: Rule = { entities: ['PROJECT_GATE', 'PROJECT', 'REVIEW_GATE', 'GATE_REVIEW', 'EVIDENCE'], targets: {
  student: { url: '/project/timeline', label: 'Mở tiến trình thẩm định hiện tại' }, lecturer: ownProjects,
  department: { url: '/department/projects/progress-matrix', label: 'Mở ma trận tiến trình' },
} }
const gateQueue: Rule = { ...gates, targets: { ...gates.targets,
  lecturer: { url: '/review/gate-assignments', label: 'Mở hàng đợi thẩm định' },
} }
const gatePolicy: Rule = { ...gates, entities: ['PROJECT_PERIOD', 'REVIEW_POLICY', 'PROJECT', 'PROJECT_GATE'], targets: { ...gates.targets,
  admin: { url: '/academic/review-gates', label: 'Xem chính sách thẩm định' },
} }

const rules: Record<string, Rule | null> = {
  TEAM_INVITATION_SENT: team, TEAM_INVITATION_ACCEPTED: team, TEAM_INVITATION_REJECTED: team, TEAM_INVITATION_CANCELLED: team,
  TEAM_LEADER_CHANGE_REQUESTED: leaderChange, TEAM_LEADER_CHANGE_APPROVED: leaderChange, TEAM_LEADER_CHANGE_REJECTED: leaderChange,
  SUPERVISOR_REQUEST_SENT: supervision, SUPERVISOR_REQUEST_ACCEPTED: supervision, SUPERVISOR_REQUEST_REJECTED: supervision,
  SUPERVISOR_REQUEST_CANCELLED: supervision, SUPERVISOR_REPLACED: supervision,
  PROJECT_APPROVED: proposal, PROJECT_REJECTED: proposal, PROJECT_REVISION_REQUESTED: proposal, PROJECT_UPDATED: proposal,
  PROGRESS_REPORT_SUBMITTED: report,
  TASK_DEADLINE_REMINDER: task, TASK_OVERDUE: task,
  DELIVERABLE_DEADLINE_REMINDER: deliverable, DELIVERABLE_OVERDUE: deliverable,
  DELIVERABLE_SUBMITTED: deliverable, DELIVERABLE_FEEDBACK_ADDED: deliverable,
  MEETING_SCHEDULED: meeting, MEETING_START_REMINDER: meeting, MEETING_ACTION_ASSIGNED: meetingAction,
  FINAL_SUBMISSION_LOCKED: finalSubmission, FINAL_SUBMISSION_DEADLINE_REMINDER: finalSubmission, FINAL_SUBMISSION_OVERDUE: finalSubmission,
  PROJECT_RESULT_PUBLISHED: result, STUDENT_RESULT_PUBLISHED: result,
  PROJECT_RISK_MEDIUM: risk, PROJECT_RISK_HIGH: risk, PROJECT_RISK_CRITICAL: risk,
  DEFENSE_SCHEDULED: defense, DEFENSE_CANCELLED: defense,
  EVALUATOR_ASSIGNED: { entities: ['EVALUATION_ASSIGNMENT'], targets: {
    lecturer: id => ({ url: `/evaluator/assignments/${id}`, label: 'Xem phân công đánh giá' }),
  } },
  EVALUATION_FINALIZED: { entities: ['EVALUATION'], targets: { department: risk.targets.department } },
  APPEAL_REQUESTED: appeal, APPEAL_REVIEWER_ASSIGNED: appeal, APPEAL_REVIEWED: appeal, APPEAL_DECIDED: appeal,
  REVIEW_GATE_UPDATED: gates, REVIEW_POLICY_PUBLISHED: gatePolicy, REVIEW_DEADLINE_APPROACHING: gates,
  GATE_REVIEW_ASSIGNED: gateQueue, GATE_REVIEW_SUBMITTED: gateQueue, GATE_REVISION_SUBMITTED: gateQueue,
  GATE_REVISION_REQUIRED: gates, EVIDENCE_VERIFIED: gates, GATE_DECISION_RECORDED: gates,
  DISCIPLINE_REVIEW_PENDING: gates, DISCIPLINE_DECISION_RECORDED: gates, DEFENSE_READINESS_CHANGED: gates,
  // Expert enrollment needs a token absent from this DTO, not an academic-role destination.
  INDUSTRY_INVITATION: null,
}

export function resolveNotificationLink(
  item: Pick<NotificationItem, 'notificationType' | 'relatedEntityId' | 'relatedEntityType'>,
  roles: readonly string[],
): NotificationLink | null {
  const id = item.relatedEntityId
  if (!Number.isSafeInteger(id) || (id ?? 0) <= 0 || typeof item.relatedEntityType !== 'string') return null
  const entity = item.relatedEntityType.toUpperCase()
  // Feedback IDs are remapped to their actual parent by the recipient inbox endpoint.
  const rule = item.notificationType === 'SUPERVISOR_FEEDBACK_ADDED'
    ? ({ PROGRESS_REPORT: report, DELIVERABLE_VERSION: deliverable, DELIVERABLE: deliverable, MEETING: meeting, TASK: task, PROJECT: risk } as Record<string, Rule>)[entity]
    : Object.hasOwn(rules, item.notificationType) ? rules[item.notificationType] : null
  if (!rule || !rule.entities.includes(entity) || (rule.feature && !env[rule.feature])) return null
  const target = rule.targets[getWorkspaceRole({ roles: [...roles] })]
  return typeof target === 'function' ? target(id!) : target ?? null
}
