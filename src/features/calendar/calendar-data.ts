import { getUsers } from '../users/api/admin-api'
import { getScopedCalendar } from '../../services/api/calendar.api'
import { getStudentNextActions, getSupervisorTriageQueue, getDepartmentUrgentActions } from './action-aggregators-api'
import type { ActionAggregatorResponse } from './action-aggregators-api'
import { aggregatorAttention } from './action-aggregators'
import type { WorkspaceRole } from '../auth/utils/role-access'
import type { CalendarAttentionData, CalendarProjectionItem, CalendarSourceStatus, AttentionItem } from './calendar-types'
import { scopedCalendarProjection } from './calendar-projections'

export interface CalendarLoaderInput { role: WorkspaceRole; semesterId: number | null; departmentId?: number | null; accessToken?: string; signal?: AbortSignal }
export const calendarApis = { getUsers, getScopedCalendar, getStudentNextActions, getSupervisorTriageQueue, getDepartmentUrgentActions }
type CalendarApis = typeof calendarApis
function errorStatus(id: string, label: string, reason: unknown): CalendarSourceStatus {
  return { id, label, state: 'error', message: reason instanceof Error ? reason.message : 'Không thể tải nguồn dữ liệu.' }
}
function sort(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => a.presentationPriority - b.presentationPriority || (a.dueAt ?? '').localeCompare(b.dueAt ?? ''))
}
function stateForItems(items: readonly unknown[]): 'ready' | 'empty' { return items.length ? 'ready' : 'empty' }

export async function loadCalendarAttention(input: CalendarLoaderInput, apis: CalendarApis = calendarApis): Promise<CalendarAttentionData> {
  const result: CalendarAttentionData = { calendar: [], attention: [], sources: [] }
  async function loadActions(id: string, label: string, read: () => Promise<ActionAggregatorResponse>) {
    try {
      const data = await read()
      result.attention.push(...data.items.map(aggregatorAttention))
      result.attentionAsOfUtc = data.asOfUtc
      result.sources.push({ id, label, state: stateForItems(data.items) })
    } catch (reason) { result.sources.push(errorStatus(id, label, reason)) }
  }
  if (input.role === 'student' || input.role === 'lecturer') {
    const role = input.role
    const now = new Date()
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30)).toISOString()
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, now.getUTCDate())).toISOString()
    await Promise.all([
      (async () => {
        try {
          const data = await apis.getScopedCalendar({ from, to, pageSize: 100 }, input.signal)
          result.calendar.push(...data.items.map(item => scopedCalendarProjection(item, role)).filter((item): item is CalendarProjectionItem => item !== null))
          const partial = data.hasMore || !data.complete
          result.sources.push({ id: `${role}-calendar`, label: role === 'student' ? 'Lịch theo phạm vi đồ án' : 'Lịch đa đồ án', state: partial ? 'partial' : stateForItems(data.items), message: partial ? 'Hiển thị tối đa 100 mục trong khoảng thời gian đã chọn; nguồn chưa đầy đủ.' : undefined })
        } catch (reason) { result.sources.push(errorStatus(`${role}-calendar`, 'Lịch theo phạm vi được phân công', reason)) }
      })(),
      loadActions(role === 'student' ? 'next-actions' : 'triage-queue', role === 'student' ? 'Việc cần làm của sinh viên' : 'Việc cần xử lý của giảng viên', () => role === 'student' ? apis.getStudentNextActions(input.signal) : apis.getSupervisorTriageQueue(input.signal)),
    ])
    return { ...result, attention: sort(result.attention) }
  }
  if (input.role === 'department') {
    if (input.departmentId != null && Number.isSafeInteger(input.departmentId) && input.departmentId > 0) {
      await loadActions('urgent-actions', 'Việc cần xử lý của bộ môn', () => apis.getDepartmentUrgentActions(input.departmentId!, input.signal))
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
