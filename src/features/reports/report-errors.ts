import { HttpError } from '../../services/http/http-client'

export function reportError(reason: unknown): string {
  if (reason instanceof HttpError) {
    const detail = reason.problem?.detail || ''
    const title = reason.problem?.title || ''
    const code = reason.problem?.code || ''
    const combined = `${code} ${title} ${detail}`.toLowerCase()

    if (reason.status === 409) {
      if (combined.includes('already been created') || combined.includes('already exists')) {
        return 'Kỳ báo cáo này đã có báo cáo. Hãy chọn kỳ khác hoặc mở báo cáo đã có.'
      }
      if (combined.includes('must be linked to a reporting cycle')) {
        return 'Báo cáo tiến độ cần được gắn với một kỳ báo cáo trước khi nộp.'
      }
      if (combined.includes('deadline has passed')) {
        return 'Đã quá hạn nộp cho kỳ báo cáo này. Kỳ báo cáo áp dụng chính sách chặn nộp muộn.'
      }
      return 'Dữ liệu đã thay đổi hoặc đã có báo cáo cùng loại và kỳ. Tải lại để kiểm tra trước khi tiếp tục.'
    }
    if (reason.status === 400 || reason.status === 422) {
      if (combined.includes('does not match the cycle')) {
        return 'Thông tin loại hoặc thời gian báo cáo không khớp với kỳ báo cáo đã chọn.'
      }
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
