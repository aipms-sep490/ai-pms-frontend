import { HttpError } from '../../services/http/http-client'
import { workflowErrorFromCode } from '../execution/execution-error-codes'
import { canonicalSubmissionFields } from './report-types'

const otherFieldLabels: Record<string, string> = {
  reportType: 'Loại báo cáo',
  periodStart: 'Từ ngày',
  periodEnd: 'Đến ngày',
  progressReportPeriodId: 'Kỳ báo cáo',
}
const fieldLabels: Record<string, string> = {
  ...Object.fromEntries(canonicalSubmissionFields.map(({ key, label }) => [key, label])),
  ...otherFieldLabels,
}

/** Field names are allowlisted; backend validation text is never rendered. */
export function reportFieldErrors(reason: unknown): Record<string, string> {
  if (!(reason instanceof HttpError)) return {}
  const fields: Record<string, string> = {}
  for (const rawKey of Object.keys(reason.problem?.errors ?? {})) {
    const normalized = rawKey.replace(/^request\./i, '')
    const key = Object.keys(fieldLabels).find(candidate => candidate.toLowerCase() === normalized.toLowerCase())
    if (key) fields[key] = `Kiểm tra mục ${fieldLabels[key]}.`
  }
  return fields
}

export function reportError(reason: unknown): string {
  if (reason instanceof HttpError) {
    const code = reason.problem?.code
    if (code === 'REPORT_ALREADY_EXISTS_FOR_CYCLE') return 'Báo cáo tiến độ cho chu kỳ này đã tồn tại.'
    if (code === 'STALE_CONCURRENCY_TOKEN') return 'Báo cáo đã thay đổi. Tải lại trạng thái và đối chiếu trước khi lưu tiếp.'
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Bạn không có quyền thực hiện thao tác này. Kiểm tra vai trò và phân công trong đồ án.'
    if (reason.status === 404) return 'Không tìm thấy báo cáo, kỳ báo cáo hoặc đồ án này.'
    const known = workflowErrorFromCode(reason.problem?.code)
    if (known && reason.status < 500) return known.message
    if (reason.status === 409) {
      return 'Chưa hoàn tất thao tác. Kiểm tra kỳ báo cáo, báo cáo đã có và hạn nộp; tải lại trạng thái trước khi thử lại.'
    }
    if (reason.status === 400 || reason.status === 422) {
      const errors = reason.problem?.errors ?? {}
      const fields = canonicalSubmissionFields.filter(({ key }) => Object.keys(errors).some(field => field.replace(/^request\./i, '').toLowerCase() === key.toLowerCase()))
      if (fields.length) return `Kiểm tra các mục nội dung: ${fields.map(({ label }) => label).join(', ')}.`
      return 'Dữ liệu chưa hợp lệ. Kiểm tra các mục nội dung bắt buộc; đồ án phải đang trong giai đoạn thực hiện.'
    }
    if (reason.status === 500) return 'Máy chủ gặp sự cố khi xử lý báo cáo. Vui lòng thử lại sau.'
  }
  return 'Không thể kết nối để hoàn tất thao tác. Kiểm tra kết nối và tải lại để xác nhận dữ liệu trước khi thử lại.'
}

export function reportNeedsAuthoritativeRefresh(reason: unknown): boolean {
  return reason instanceof HttpError && reason.status === 409
}
