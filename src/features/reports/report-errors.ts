import { HttpError } from '../../services/http/http-client'
import { canonicalSubmissionFields } from './report-types'

export function reportError(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 409) {
      if (reason.problem?.code === 'STALE_CONCURRENCY_TOKEN') return 'Báo cáo đã thay đổi. Tải lại trạng thái và đối chiếu trước khi lưu tiếp.'
      return 'Chưa hoàn tất thao tác. Kiểm tra kỳ báo cáo, báo cáo đã có và hạn nộp; tải lại trạng thái trước khi thử lại.'
    }
    if (reason.status === 400 || reason.status === 422) {
      const errors = reason.problem?.errors ?? {}
      const fields = canonicalSubmissionFields.filter(({ key }) => Object.keys(errors).some(field => field.replace(/^request\./i, '').toLowerCase() === key.toLowerCase()))
      if (fields.length) return `Kiểm tra các mục nội dung: ${fields.map(({ label }) => label).join(', ')}.`
      return 'Dữ liệu chưa hợp lệ. Kiểm tra các mục nội dung bắt buộc; đồ án phải đang trong giai đoạn thực hiện.'
    }
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Bạn không có quyền thực hiện thao tác này. Kiểm tra vai trò và phân công trong đồ án.'
    if (reason.status === 404) return 'Không tìm thấy báo cáo, kỳ báo cáo hoặc đồ án này.'
  }
  return 'Không thể kết nối để hoàn tất thao tác. Kiểm tra kết nối và tải lại để xác nhận dữ liệu trước khi thử lại.'
}

export function reportNeedsAuthoritativeRefresh(reason: unknown): boolean {
  return reason instanceof HttpError && reason.status === 409
}
