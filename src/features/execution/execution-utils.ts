import { HttpError } from '../../services/http/http-client'
import { utcTimestamp } from '../projects/utils/collaboration-workspace'
import type { BackendTaskStatus } from '../../types/backend'

export const milestoneLabels: Record<string, string> = { PLANNED: 'Chưa bắt đầu', IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' }
export const priorityLabels: Record<string, string> = { LOW: 'Thấp', MEDIUM: 'Bình thường', HIGH: 'Cao', CRITICAL: 'Khẩn cấp' }
export const dependencyLabels: Record<string, string> = {
  FINISH_TO_START: 'Việc liên quan hoàn thành → việc này bắt đầu', START_TO_START: 'Việc liên quan bắt đầu → việc này bắt đầu',
  FINISH_TO_FINISH: 'Việc liên quan hoàn thành → việc này hoàn thành', START_TO_FINISH: 'Việc liên quan bắt đầu → việc này hoàn thành',
}
// Mirrors AIPMS.Domain/Tasks/TaskStateMachine.cs; BE validates every submitted transition.
export const taskTransitions: Record<string, BackendTaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'BLOCKED', 'CANCELLED'], IN_PROGRESS: ['TODO', 'BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'TODO', 'CANCELLED'], IN_REVIEW: ['IN_PROGRESS', 'DONE', 'CANCELLED'],
  DONE: ['IN_PROGRESS', 'CANCELLED'], CANCELLED: ['TODO'],
}
export function executionError(reason: unknown, action = 'tải dữ liệu'): string {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Bạn chưa có quyền thực hiện thao tác này.'
    if (reason.status === 404) return 'Không tìm thấy thông tin này. Có thể dữ liệu đã được xóa.'
    if (reason.status === 409) return 'Thông tin đã thay đổi hoặc thao tác không còn phù hợp. Cập nhật dữ liệu rồi thử lại.'
    if (reason.status === 400) return 'Thông tin chưa hợp lệ. Kiểm tra các trường đã nhập rồi thử lại.'
  }
  return `Chưa thể ${action}. Hãy thử lại.`
}
export function dateTimeLabel(value?: string | null) {
  if (!value) return 'Chưa xác định'
  const date = new Date(utcTimestamp(value))
  return Number.isNaN(date.getTime()) ? 'Chưa xác định' : date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
}
export function localDateTime(value?: string | null): string {
  if (!value) return ''
  const timestamp = utcTimestamp(value)
  return Number.isFinite(timestamp) ? new Date(timestamp + 7 * 3600000).toISOString().slice(0, 16) : ''
}
export function toUtcDateTime(value: string): string | null { return value ? new Date(`${value}+07:00`).toISOString() : null }
