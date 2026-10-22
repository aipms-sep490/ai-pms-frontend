import { getUsers } from '../users/api/admin-api'
import { getStudentDashboard } from '../dashboard/api/dashboard-api'
import type { StudentDashboard } from '../dashboard/api/dashboard-api'
import { getMeetings } from '../../services/api/meetings.api'
import { getDeliverables } from '../../services/api/deliverables.api'
import { getFinalChecklist } from '../final-submission/final-submission-api'
import { getScopedCalendar } from '../../services/api/calendar.api'
import { getStudentNextActions, getSupervisorTriageQueue, getDepartmentUrgentActions } from './action-aggregators-api'
import type { ActionAggregatorResponse } from './action-aggregators-api'
import { aggregatorAttention } from './action-aggregators'
import type { WorkspaceRole } from '../auth/utils/role-access'
import type { CalendarAttentionData, CalendarProjectionItem, CalendarSourceStatus, AttentionItem } from './calendar-types'
import { deliverableProjection, finalSubmissionProjection, meetingProjection, scopedCalendarProjection } from './calendar-projections'
import type { AcademicReferenceDto } from '../../types/backend'

export interface CalendarLoaderInput { role: WorkspaceRole; semesterId: number | null; departmentIds?: readonly number[]; departments?: readonly Pick<AcademicReferenceDto, 'id' | 'name'>[]; accessToken?: string; signal?: AbortSignal }
export const calendarApis = { getUsers, getScopedCalendar, getStudentNextActions, getSupervisorTriageQueue, getDepartmentUrgentActions, getStudentDashboard, getMeetings, getDeliverables, getFinalChecklist }
type CalendarApis = typeof calendarApis
function errorStatus(id: string, label: string, reason: unknown): CalendarSourceStatus {
  return { id, label, state: 'error', message: reason instanceof Error ? reason.message : 'Không thể tải nguồn dữ liệu.' }
}
function sort(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => a.presentationPriority - b.presentationPriority || (a.dueAt ?? '').localeCompare(b.dueAt ?? ''))
}
function stateForItems(items: readonly unknown[]): 'ready' | 'empty' { return items.length ? 'ready' : 'empty' }

async function loadStudentCalendarFallback(dashboard: StudentDashboard, result: CalendarAttentionData, apis: CalendarApis, signal?: AbortSignal) {
  const project = dashboard.project
  const dashboardSource = result.sources.find(source => source.id === 'student-dashboard')
  if (dashboardSource) {
    dashboardSource.label = 'Công việc và mốc đồ án từ dashboard'
    dashboardSource.state = stateForItems([...dashboard.taskDeadlines, ...dashboard.milestoneDeadlines])
    dashboardSource.message = 'Nguồn lịch dự phòng khi lịch theo phạm vi không tải được.'
  }
  result.calendar.push(
    ...dashboard.taskDeadlines.filter(task => task.dueAtUtc).map(task => ({ sourceType: 'TASK' as const, sourceId: task.id, projectId: project?.id, projectName: project?.title, title: task.title, dueAt: task.dueAtUtc, status: task.status, deepLink: `/project/tasks/${task.id}` })),
    ...dashboard.milestoneDeadlines.filter(milestone => milestone.dueDate).map(milestone => ({ sourceType: 'MILESTONE' as const, sourceId: milestone.id, projectId: project?.id, projectName: project?.title, title: milestone.title, dueAt: milestone.dueDate, status: milestone.status, deepLink: `/project/milestones/${milestone.id}` })),
  )
  if (!project) {
    result.sources.push({ id: 'project-resources', label: 'Lịch họp, hạng mục và bàn giao', state: 'unavailable', message: 'Chưa có đồ án hiện hành do hệ thống trả về.' })
    return
  }
  const [meetings, deliverables, finalChecklist] = await Promise.allSettled([
    apis.getMeetings(project.id, { page: 1, pageSize: 100 }, signal),
    apis.getDeliverables(project.id, { page: 1, pageSize: 100 }, signal),
    apis.getFinalChecklist(project.id),
  ])
  if (meetings.status === 'fulfilled') {
    result.calendar.push(...meetings.value.items.map(item => meetingProjection(item, project.title)))
    const partial = meetings.value.totalCount > meetings.value.items.length
    result.sources.push({ id: 'meetings', label: 'Lịch họp', state: partial ? 'partial' : stateForItems(meetings.value.items), message: partial ? 'Chỉ hiển thị trang đầu tối đa 100 cuộc họp.' : undefined })
  } else result.sources.push(errorStatus('meetings', 'Lịch họp', meetings.reason))
  if (deliverables.status === 'fulfilled') {
    const items = deliverables.value.items.map(item => deliverableProjection(item, project.title)).filter((item): item is CalendarProjectionItem => item !== null)
    result.calendar.push(...items)
    const partial = deliverables.value.totalCount > deliverables.value.items.length
    result.sources.push({ id: 'deliverables', label: 'Hạng mục cần nộp', state: partial ? 'partial' : stateForItems(items), message: partial ? 'Chỉ hiển thị trang đầu tối đa 100 hạng mục.' : 'Chỉ đưa hạng mục có hạn nộp vào lịch.' })
  } else result.sources.push(errorStatus('deliverables', 'Hạng mục cần nộp', deliverables.reason))
  if (finalChecklist.status === 'fulfilled') {
    const item = finalSubmissionProjection(project.id, project.title, finalChecklist.value.deadline)
    if (item) result.calendar.push(item)
    result.sources.push({ id: 'final-submission', label: 'Bàn giao cuối kỳ', state: item ? 'ready' : 'empty', message: item ? undefined : 'Chưa có hạn bàn giao cuối kỳ trong dữ liệu nguồn.' })
  } else result.sources.push(errorStatus('final-submission', 'Bàn giao cuối kỳ', finalChecklist.reason))
}

export async function loadCalendarAttention(input: CalendarLoaderInput, apis: CalendarApis = calendarApis): Promise<CalendarAttentionData> {
  const result: CalendarAttentionData = { calendar: [], attention: [], sources: [] }
  const actionKeys = new Set<string>()
  async function loadActions(id: string, label: string, read: () => Promise<ActionAggregatorResponse>) {
    try {
      const data = await read()
      result.otherOpenActionsCount ??= 0
      for (const item of data.items) {
        const key = `${item.kind}-${item.projectId}-${item.id}`
        if (actionKeys.has(key)) continue
        actionKeys.add(key)
        if (item.severity === 'HIGH') result.attention.push(aggregatorAttention(item))
        else result.otherOpenActionsCount++
      }
      // A combined view must not claim a newer snapshot than its oldest successful source.
      if (!result.attentionAsOfUtc || Date.parse(data.asOfUtc) < Date.parse(result.attentionAsOfUtc)) result.attentionAsOfUtc = data.asOfUtc
      result.sources.push({ id, label, state: stateForItems(data.items), message: 'Chỉ phản ánh các mục API trả về; API chưa cung cấp tổng số hoặc tín hiệu cắt dữ liệu.' })
    } catch (reason) { result.sources.push(errorStatus(id, label, reason)) }
  }
  if (input.role === 'student' || input.role === 'lecturer') {
    const role = input.role
    const now = new Date()
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30)).toISOString()
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, now.getUTCDate())).toISOString()
    const [dashboard, scopedCalendarReady] = await Promise.all([
      (async () => {
        if (role !== 'student') return null
        try {
          const data = await apis.getStudentDashboard(input.semesterId ?? undefined)
          result.attention.push(...data.milestoneDeadlines.filter(m => m.isOverdue).map(m => ({ code: 'MILESTONE_OVERDUE', source: 'MILESTONE' as const, sourceId: m.id, title: m.title, description: 'Mốc đồ án đã quá hạn theo dữ liệu dashboard.', dueAt: m.dueDate, status: m.status, presentationPriority: 15, deepLink: `/project/milestones/${m.id}` })))
          result.sources.push({ id: 'student-dashboard', label: 'Mốc đồ án từ dashboard', state: stateForItems(data.milestoneDeadlines) })
          return data
        } catch (reason) { result.sources.push(errorStatus('student-dashboard', 'Mốc đồ án từ dashboard', reason)); return null }
      })(),
      (async () => {
        try {
          const data = await apis.getScopedCalendar({ from, to, pageSize: 100 }, input.signal)
          result.calendar.push(...data.items.map(item => scopedCalendarProjection(item, role)).filter((item): item is CalendarProjectionItem => item !== null))
          const partial = data.hasMore || !data.complete
          result.sources.push({ id: `${role}-calendar`, label: role === 'student' ? 'Lịch theo phạm vi đồ án' : 'Lịch đa đồ án', state: partial ? 'partial' : stateForItems(data.items), message: partial ? 'Hiển thị tối đa 100 mục trong khoảng thời gian đã chọn; nguồn chưa đầy đủ.' : undefined })
          return true
        } catch (reason) { result.sources.push(errorStatus(`${role}-calendar`, 'Lịch theo phạm vi được phân công', reason)); return false }
      })(),
      loadActions(role === 'student' ? 'next-actions' : 'triage-queue', role === 'student' ? 'Việc cần làm của sinh viên' : 'Việc cần xử lý của giảng viên', () => role === 'student' ? apis.getStudentNextActions(input.signal) : apis.getSupervisorTriageQueue(input.signal)),
    ])
    result.sources.push({ id: 'progress-report-deadline', label: 'Hạn báo cáo tiến độ', state: 'unsupported', message: 'API hiện trả kỳ báo cáo, không trả hạn nộp báo cáo.' })
    if (role === 'lecturer') result.sources.push({ id: 'evaluation-assignments', label: 'Hạn đánh giá', state: 'unsupported', message: 'DTO hiện không có hạn đánh giá; không tạo sự kiện lịch.' })
    if (!scopedCalendarReady && dashboard && !input.signal?.aborted) await loadStudentCalendarFallback(dashboard, result, apis, input.signal)
    return { ...result, attention: sort(result.attention) }
  }
  if (input.role === 'department') {
    const departmentIds = [...new Set(input.departmentIds ?? [])].filter(id => Number.isSafeInteger(id) && id > 0)
    if (departmentIds.length) {
      await Promise.allSettled(departmentIds.map(id => {
        const name = input.departments?.find(department => department.id === id)?.name ?? `Bộ môn ${id}`
        return loadActions(`urgent-actions-${id}`, `Việc cần xử lý · ${name}`, () => apis.getDepartmentUrgentActions(id, input.signal))
      }))
    } else result.sources.push({ id: 'urgent-actions', label: 'Việc cần xử lý của bộ môn', state: 'unavailable', message: 'Chưa xác định được bộ môn từ phiên đăng nhập. Không truy vấn phạm vi khác.' })
    result.sources.push({ id: 'department-calendar', label: 'Lịch portfolio', state: 'unavailable', message: 'Hệ thống chưa cấp mốc thời gian của resource theo phạm vi bộ môn.' })
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
    result.sources.push({ id: 'admin-calendar', label: 'Lịch nền tảng', state: 'unavailable', message: 'Lịch tổng hợp chưa hỗ trợ tài khoản quản trị.' })
    return { ...result, attention: sort(result.attention) }
  }
  result.sources.push({ id: 'calendar', label: 'Lịch tổng hợp', state: 'unavailable', message: 'Vai trò hiện tại chưa có nguồn projection được xác nhận.' })
  return result
}
