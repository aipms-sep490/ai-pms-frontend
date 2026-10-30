import { HttpError } from '../../services/http/http-client'
import { workflowErrorFromCode, type WorkflowErrorFeedback } from '../execution/execution-error-codes'

const fieldMessages: Record<string, string> = {
  file: 'Kiểm tra tệp đã chọn.',
  note: 'Kiểm tra ghi chú phiên bản.',
  title: 'Kiểm tra tên hạng mục.',
  description: 'Kiểm tra mô tả hạng mục.',
  deliverableType: 'Kiểm tra loại hạng mục.',
  dueAt: 'Kiểm tra hạn nộp.',
  milestoneId: 'Kiểm tra mốc tiến độ đã chọn.',
  feedback: 'Kiểm tra nhận xét bắt buộc.',
}

function safeFieldErrors(reason: HttpError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawKey of Object.keys(reason.problem?.errors ?? {})) {
    const normalized = rawKey.replace(/^request\./i, '')
    const field = Object.keys(fieldMessages).find(key => key.toLowerCase() === normalized.toLowerCase())
    if (field) result[field] = fieldMessages[field]
  }
  return result
}

export function deliverableError(reason: unknown): WorkflowErrorFeedback {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return { message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', retryable: false }
    if (reason.status === 403) return { message: 'Bạn không có quyền thực hiện thao tác này trong đồ án hiện tại.', retryable: false }
    if (reason.status === 404) return { message: 'Hạng mục hoặc phiên bản không còn tồn tại trong phạm vi được cấp.', retryable: false }
    const known = workflowErrorFromCode(reason.problem?.code)
    if (known && reason.status < 500) return known
    if (reason.status === 409) return { message: 'Chưa thể xác nhận thao tác. Tải lại dữ liệu để đối chiếu trạng thái trước khi thử lại.', retryable: false }
    if (reason.status === 400 || reason.status === 422) {
      const fieldErrors = safeFieldErrors(reason)
      return {
        message: 'Dữ liệu không hợp lệ hoặc đồ án chưa ở trạng thái cho phép. Kiểm tra các trường được đánh dấu.',
        retryable: false,
        ...(Object.keys(fieldErrors).length ? { fieldErrors } : {}),
      }
    }
  }
  return { message: 'Không thể xác nhận kết quả từ máy chủ. Tải lại dữ liệu trước khi thực hiện thêm thao tác.', retryable: true, nextAction: 'retry' }
}

export function needsAuthoritativeRefresh(reason: unknown): boolean {
  if (!(reason instanceof HttpError) || reason.status !== 409) return false
  // A 409 can make the current list stale even when the user must not retry the write.
  // These two codes do not change the deliverable state shown on this page.
  return reason.problem?.code !== 'EXECUTION_WINDOW_REQUIRED'
    && reason.problem?.code !== 'MILESTONE_NOT_IN_PROJECT'
}
