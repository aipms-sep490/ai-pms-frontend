import { HttpError } from '../../services/http/http-client'
import { utcTimestamp } from '../projects/utils/collaboration-workspace'
import type { BackendTaskStatus } from '../../types/backend'
import type { ApiProblem } from '../../types/api.types'

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

export const executionErrorCodeMap: Record<string, string> = {
  EXECUTION_WINDOW_REQUIRED: 'Cần có một kỳ thực hiện đồ án (Execution Window) đang hoạt động trong học kỳ hiện tại để thực hiện thao tác này. Vui lòng liên hệ cán bộ bộ môn để được hướng dẫn.',
  EXECUTION_PERIOD_REQUIRED: 'Kỳ thực hiện đồ án chưa mở hoặc đã kết thúc. Vui lòng liên hệ cán bộ bộ môn để được hướng dẫn.',
  TASK_BLOCKED_REASON_REQUIRED: 'Vui lòng nhập lý do hoặc vướng mắc khi chuyển công việc sang trạng thái Bị chặn.',
  DELIVERABLE_LOCKED: 'Sản phẩm bàn giao đã được nghiệm thu hoặc khóa, không thể thay đổi.',
  DELIVERABLE_DEADLINE_PASSED: 'Hạn nộp sản phẩm bàn giao đã kết thúc.',
  CONCURRENCY_CONFLICT: 'Dữ liệu đã được người dùng khác cập nhật. Hãy tải lại trang để xem thông tin mới nhất.',
  TASK_CYCLE_DETECTED: 'Phát hiện vòng lặp phụ thuộc công việc. Không thể tạo liên kết này.',
}

export function extractFieldErrors(problem?: ApiProblem): Record<string, string> {
  const result: Record<string, string> = {}
  if (!problem?.errors) return result

  for (const [key, messages] of Object.entries(problem.errors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      const fieldKey = key.toLowerCase()
      if (fieldKey === 'reason' && messages.some(m => m.includes('BLOCKED'))) {
        result[key] = 'Vui lòng nhập lý do hoặc vướng mắc khi chuyển công việc sang trạng thái Bị chặn.'
      } else {
        result[key] = messages[0]
      }
    }
  }
  return result
}

export interface ExecutionErrorInfo {
  message: string
  fieldErrors: Record<string, string>
  isRetryable: boolean
  isBusinessRule: boolean
}

export function classifyExecutionError(reason: unknown, action = 'tải dữ liệu'): ExecutionErrorInfo {
  if (reason instanceof HttpError) {
    const problem = reason.problem
    const fieldErrors = extractFieldErrors(problem)

    // 1. Specific mapped code from backend
    if (problem?.code && executionErrorCodeMap[problem.code]) {
      return {
        message: executionErrorCodeMap[problem.code],
        fieldErrors,
        isRetryable: false,
        isBusinessRule: true,
      }
    }

    // 2. Specific field error (e.g. Reason required for BLOCKED)
    if (fieldErrors.Reason || fieldErrors.reason) {
      return {
        message: fieldErrors.Reason || fieldErrors.reason,
        fieldErrors,
        isRetryable: false,
        isBusinessRule: true,
      }
    }

    // 3. Known business rule messages in detail (without exposing raw detail/traceId)
    const detail = problem?.detail ?? ''
    if (detail.includes('BLOCKED') || detail.includes('A reason is required')) {
      return {
        message: 'Vui lòng nhập lý do hoặc vướng mắc khi chuyển công việc sang trạng thái Bị chặn.',
        fieldErrors,
        isRetryable: false,
        isBusinessRule: true,
      }
    }
    if (detail.includes('execution window') || detail.includes('HasExecutionWindow')) {
      return {
        message: 'Cần có một kỳ thực hiện đồ án (Execution Window) đang hoạt động trong học kỳ hiện tại để thực hiện thao tác này. Vui lòng liên hệ cán bộ bộ môn để được hướng dẫn.',
        fieldErrors,
        isRetryable: false,
        isBusinessRule: true,
      }
    }
    if (detail.includes('deliverable deadline has passed')) {
      return {
        message: 'Hạn nộp sản phẩm bàn giao đã kết thúc.',
        fieldErrors,
        isRetryable: false,
        isBusinessRule: true,
      }
    }
    if (detail.includes('deliverable is locked')) {
      return {
        message: 'Sản phẩm bàn giao đã được nghiệm thu hoặc khóa, không thể thay đổi.',
        fieldErrors,
        isRetryable: false,
        isBusinessRule: true,
      }
    }

    // 4. HTTP Status classifications
    if (reason.status === 400) {
      const firstField = Object.values(fieldErrors)[0]
      return {
        message: firstField ?? 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.',
        fieldErrors,
        isRetryable: false,
        isBusinessRule: true,
      }
    }
    if (reason.status === 401) {
      return {
        message: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
        fieldErrors,
        isRetryable: true,
        isBusinessRule: false,
      }
    }
    if (reason.status === 403) {
      return {
        message: 'Bạn chưa có quyền thực hiện thao tác này.',
        fieldErrors,
        isRetryable: false,
        isBusinessRule: true,
      }
    }
    if (reason.status === 404) {
      return {
        message: 'Không tìm thấy thông tin này. Có thể dữ liệu đã được xóa.',
        fieldErrors,
        isRetryable: false,
        isBusinessRule: true,
      }
    }
    if (reason.status === 409) {
      return {
        message: 'Thông tin đã thay đổi hoặc thao tác không còn phù hợp. Cập nhật dữ liệu rồi thử lại.',
        fieldErrors,
        isRetryable: false,
        isBusinessRule: true,
      }
    }
    if (reason.status >= 500) {
      return {
        message: 'Máy chủ đang bận hoặc gặp sự cố tạm thời. Hãy thử lại.',
        fieldErrors,
        isRetryable: true,
        isBusinessRule: false,
      }
    }
  }

  // Network / unknown errors: retryable
  return {
    message: `Chưa thể ${action}. Hãy kiểm tra kết nối mạng và thử lại.`,
    fieldErrors: {},
    isRetryable: true,
    isBusinessRule: false,
  }
}

export function executionError(reason: unknown, action = 'tải dữ liệu'): string {
  return classifyExecutionError(reason, action).message
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
