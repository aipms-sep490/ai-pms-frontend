import { getMyEvaluationAssignments } from '../../services/api/evaluations.api'
import { getDeliverables } from '../../services/api/deliverables.api'
import { getMeetings } from '../../services/api/meetings.api'
import { getStudentDashboard, getSupervisorDashboard, getPortfolioDashboard } from '../dashboard/api/dashboard-api'
import { getFinalChecklist } from '../final-submission/final-submission-api'
import { getUsers } from '../users/api/admin-api'
import type { WorkspaceRole } from '../auth/utils/role-access'
import type { CalendarAttentionData, CalendarProjectionItem, CalendarSourceStatus, AttentionItem } from './calendar-types'
import { deliverableProjection, finalSubmissionProjection, meetingProjection } from './calendar-projections'

export interface CalendarLoaderInput { role: WorkspaceRole; semesterId: number | null; accessToken?: string }

export const calendarApis = { getStudentDashboard, getSupervisorDashboard, getPortfolioDashboard, getMeetings, getDeliverables, getFinalChecklist, getMyEvaluationAssignments, getUsers }
type CalendarApis = typeof calendarApis

function errorStatus(id: string, label: string, reason: unknown): CalendarSourceStatus {
  const message = reason instanceof Error ? reason.message : 'Không thể tải nguồn dữ liệu.'
  return { id, label, state: 'error', message }
}

function sort(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((left, right) => left.presentationPriority - right.presentationPriority || (left.dueAt ?? '').localeCompare(right.dueAt ?? ''))
}

function stateForItems(items: readonly unknown[]): 'ready' | 'empty' {
  return items.length === 0 ? 'empty' : 'ready'
}

function studentAttention(input: { taskDeadlines: Array<{ id: number; title: string; status: string; dueAtUtc: string; isOverdue: boolean }>; milestoneDeadlines: Array<{ id: number; title: string; status: string; dueDate: string; isOverdue: boolean }> }): AttentionItem[] {
  return [
    ...input.taskDeadlines.filter((item) => item.isOverdue || item.status === 'BLOCKED').map((item) => ({ code: item.isOverdue ? 'TASK_OVERDUE' : 'TASK_BLOCKED', source: 'TASK' as const, sourceId: item.id, title: item.title, description: item.isOverdue ? 'Công việc đã quá hạn theo dữ liệu dashboard.' : 'Công việc đang ở trạng thái BLOCKED theo dữ liệu dashboard.', dueAt: item.dueAtUtc, status: item.status, presentationPriority: item.isOverdue ? 10 : 20, deepLink: `/project/tasks/${item.id}` })),
    ...input.milestoneDeadlines.filter((item) => item.isOverdue).map((item) => ({ code: 'MILESTONE_OVERDUE', source: 'MILESTONE' as const, sourceId: item.id, title: item.title, description: 'Mốc đồ án đã quá hạn theo dữ liệu dashboard.', dueAt: item.dueDate, status: item.status, presentationPriority: 15, deepLink: `/project/milestones/${item.id}` })),
  ]
}

export async function loadCalendarAttention(input: CalendarLoaderInput, apis: CalendarApis = calendarApis): Promise<CalendarAttentionData> {
  const result: CalendarAttentionData = { calendar: [], attention: [], sources: [] }
  if (input.role === 'student') {
    try {
      const dashboard = await apis.getStudentDashboard(input.semesterId ?? undefined)
      const project = dashboard.project
      result.sources.push({ id: 'student-dashboard', label: 'Công việc và mốc đồ án', state: stateForItems([...dashboard.taskDeadlines, ...dashboard.milestoneDeadlines]) })
      result.calendar.push(
        ...dashboard.taskDeadlines.map((task) => ({ sourceType: 'TASK' as const, sourceId: task.id, projectId: project?.id, projectName: project?.title, title: task.title, dueAt: task.dueAtUtc, status: task.status, deepLink: `/project/tasks/${task.id}` })),
        ...dashboard.milestoneDeadlines.map((milestone) => ({ sourceType: 'MILESTONE' as const, sourceId: milestone.id, projectId: project?.id, projectName: project?.title, title: milestone.title, dueAt: milestone.dueDate, status: milestone.status, deepLink: `/project/milestones/${milestone.id}` })),
      )
      result.attention.push(...studentAttention(dashboard))
      result.sources.push({ id: 'progress-report-deadline', label: 'Hạn báo cáo tiến độ', state: 'unsupported', message: 'API hiện trả kỳ báo cáo, không trả hạn nộp báo cáo.' })
      if (!project) {
        result.sources.push({ id: 'project-resources', label: 'Lịch họp, hạng mục và bàn giao', state: 'unavailable', message: 'Chưa có đồ án hiện hành do backend trả về.' })
        return { ...result, attention: sort(result.attention) }
      }
      const resources = await Promise.allSettled([
        apis.getMeetings(project.id, { page: 1, pageSize: 100 }),
        apis.getDeliverables(project.id, { page: 1, pageSize: 100 }),
        apis.getFinalChecklist(project.id),
      ])
      const [meetings, deliverables, finalChecklist] = resources
      if (meetings.status === 'fulfilled') {
        result.calendar.push(...meetings.value.items.map((item) => meetingProjection(item, project.title)))
        result.sources.push({ id: 'meetings', label: 'Lịch họp', state: meetings.value.totalCount > meetings.value.items.length ? 'partial' : stateForItems(meetings.value.items), message: meetings.value.totalCount > meetings.value.items.length ? 'Chỉ hiển thị trang đầu tối đa 100 cuộc họp.' : undefined })
      } else result.sources.push(errorStatus('meetings', 'Lịch họp', meetings.reason))
      if (deliverables.status === 'fulfilled') {
        result.calendar.push(...deliverables.value.items.map((item) => deliverableProjection(item, project.title)).filter((item): item is CalendarProjectionItem => item !== null))
        result.sources.push({ id: 'deliverables', label: 'Hạng mục cần nộp', state: deliverables.value.totalCount > deliverables.value.items.length ? 'partial' : stateForItems(deliverables.value.items), message: deliverables.value.totalCount > deliverables.value.items.length ? 'Chỉ hiển thị trang đầu tối đa 100 hạng mục.' : undefined })
      } else result.sources.push(errorStatus('deliverables', 'Hạng mục cần nộp', deliverables.reason))
      if (finalChecklist.status === 'fulfilled') {
        const item = finalSubmissionProjection(project.id, project.title, finalChecklist.value.deadline)
        if (item) result.calendar.push(item)
        result.sources.push({ id: 'final-submission', label: 'Bàn giao cuối', state: item ? 'ready' : 'empty' })
      } else result.sources.push(errorStatus('final-submission', 'Bàn giao cuối', finalChecklist.reason))
    } catch (reason) { result.sources.push(errorStatus('student-dashboard', 'Công việc và mốc đồ án', reason)) }
    return { ...result, attention: sort(result.attention) }
  }
  if (input.role === 'lecturer') {
    const requests = await Promise.allSettled([apis.getSupervisorDashboard({ semesterId: input.semesterId ?? undefined, page: 1, pageSize: 20 }), apis.getMyEvaluationAssignments(1, 20)])
    const [supervisor, evaluations] = requests
    if (supervisor.status === 'fulfilled') {
      result.sources.push({ id: 'supervisor-dashboard', label: 'Danh mục hướng dẫn', state: supervisor.value.projects.totalCount > supervisor.value.projects.items.length ? 'partial' : stateForItems(supervisor.value.projects.items), message: supervisor.value.projects.totalCount > supervisor.value.projects.items.length ? 'Chỉ hiển thị trang đầu tối đa 20 đồ án.' : undefined })
      result.attention.push(...supervisor.value.projects.items.flatMap((project) => [
        ...(project.pendingProgressReviews > 0 ? [{ code: 'PROGRESS_FEEDBACK_PENDING', source: 'PROJECT' as const, sourceId: project.id, title: project.title, description: `${project.pendingProgressReviews} báo cáo đang chờ phản hồi theo dashboard.`, status: project.status, presentationPriority: 30, deepLink: `/supervisor/projects/${project.id}/progress` }] : []),
        ...(project.analysis && project.analysis.progressSummary.overdueTasks > 0 ? [{ code: 'PROJECT_OVERDUE_TASKS', source: 'PROJECT' as const, sourceId: project.id, title: project.title, description: `${project.analysis.progressSummary.overdueTasks} công việc quá hạn theo dashboard.`, status: project.status, presentationPriority: 10, deepLink: `/supervisor/projects/${project.id}/workspace` }] : []),
        ...(project.analysis && project.analysis.progressSummary.blockedTasks > 0 ? [{ code: 'PROJECT_BLOCKED_TASKS', source: 'PROJECT' as const, sourceId: project.id, title: project.title, description: `${project.analysis.progressSummary.blockedTasks} công việc BLOCKED theo dashboard.`, status: project.status, presentationPriority: 20, deepLink: `/supervisor/projects/${project.id}/workspace` }] : []),
      ]))
    } else result.sources.push(errorStatus('supervisor-dashboard', 'Danh mục hướng dẫn', supervisor.reason))
    if (evaluations.status === 'fulfilled') {
      result.sources.push({ id: 'evaluation-assignments', label: 'Phân công đánh giá', state: evaluations.value.totalCount > evaluations.value.items.length ? 'partial' : 'unsupported', message: 'DTO hiện không có hạn đánh giá; không tạo sự kiện lịch.' })
      result.attention.push(...evaluations.value.items.map((item) => ({ code: 'EVALUATION_ASSIGNMENT_ACTIVE', source: 'EVALUATION_ASSIGNMENT' as const, sourceId: item.id, title: `Phân công đánh giá #${item.id}`, description: 'Phân công đang hoạt động theo backend.', status: item.status, presentationPriority: 40, deepLink: `/evaluator/assignments/${item.id}` })))
    } else result.sources.push(errorStatus('evaluation-assignments', 'Phân công đánh giá', evaluations.reason))
    result.sources.push({ id: 'lecturer-calendar', label: 'Lịch đa đồ án', state: 'unavailable', message: 'Backend chưa cung cấp projection theo actor và khoảng thời gian.' })
    return { ...result, attention: sort(result.attention) }
  }
  if (input.role === 'department') {
    try {
      const dashboard = await apis.getPortfolioDashboard('department', { semesterId: input.semesterId ?? undefined, page: 1, pageSize: 20 })
      result.sources.push({ id: 'department-dashboard', label: 'Portfolio bộ môn', state: dashboard.projects.totalCount > dashboard.projects.items.length ? 'partial' : stateForItems(dashboard.projects.items), message: dashboard.projects.totalCount > dashboard.projects.items.length ? 'Chỉ hiển thị trang đầu tối đa 20 đồ án.' : undefined })
      result.attention.push(...dashboard.projects.items.flatMap((project) => project.pendingProgressReviews > 0 ? [{ code: 'PROJECT_PROGRESS_FEEDBACK_PENDING', source: 'PROJECT' as const, sourceId: project.id, title: project.title, description: `${project.pendingProgressReviews} báo cáo chờ phản hồi theo dashboard.`, status: project.status, presentationPriority: 30, deepLink: '/department/portfolio' }] : []))
    } catch (reason) { result.sources.push(errorStatus('department-dashboard', 'Portfolio bộ môn', reason)) }
    result.sources.push({ id: 'department-calendar', label: 'Lịch portfolio', state: 'unavailable', message: 'Backend chưa cấp mốc thời gian của resource theo phạm vi bộ môn.' })
    return { ...result, attention: sort(result.attention) }
  }
  if (input.role === 'admin') {
    if (!input.accessToken) {
      result.sources.push({ id: 'accounts', label: 'Tài khoản nền tảng', state: 'unavailable', message: 'Phiên đăng nhập chưa sẵn sàng.' })
      return result
    }
    try {
      const accounts = await apis.getUsers(input.accessToken, { page: 1, pageSize: 20 })
      result.sources.push({ id: 'accounts', label: 'Tài khoản nền tảng', state: accounts.totalCount > accounts.items.length ? 'partial' : stateForItems(accounts.items), message: accounts.totalCount > accounts.items.length ? 'Chỉ hiển thị trang đầu tối đa 20 tài khoản.' : undefined })
      result.attention.push(...accounts.items.filter((account) => account.status !== 'ACTIVE').map((account) => ({ code: `ACCOUNT_${account.status}`, source: 'ACCOUNT' as const, sourceId: account.id, title: account.fullName, description: `Tài khoản đang ở trạng thái ${account.status}.`, status: account.status, presentationPriority: account.status === 'SUSPENDED' ? 10 : 30, deepLink: `/admin/access/users/${account.id}` })))
    } catch (reason) { result.sources.push(errorStatus('accounts', 'Tài khoản nền tảng', reason)) }
    result.sources.push({ id: 'admin-calendar', label: 'Lịch nền tảng', state: 'unavailable', message: 'Backend chưa có calendar projection quản trị theo khoảng thời gian.' })
    return { ...result, attention: sort(result.attention) }
  }
  result.sources.push({ id: 'calendar', label: 'Lịch tổng hợp', state: 'unavailable', message: 'Vai trò hiện tại chưa có nguồn projection được xác nhận.' })
  return result
}
