import { HttpError } from '../../services/http/http-client'

export function weeklyError(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Bạn không có quyền chấm sinh viên này trong tuần này.'
    if (reason.status === 404) return 'Không tìm thấy bản chấm hoặc rubric này.'
    if (reason.status === 409) return 'Dữ liệu đã thay đổi, tuần chưa bắt đầu, học kỳ đã đóng hoặc bản chấm đã khóa. Tải lại trước khi tiếp tục.'
    if (reason.status === 400 || reason.status === 422) return 'Dữ liệu chưa hợp lệ. Kiểm tra điểm từng tiêu chí (trong khoảng cho phép) và lý do chỉnh sửa nếu có.'
  }
  return 'Không thể kết nối để hoàn tất thao tác. Kiểm tra kết nối và tải lại để xác nhận dữ liệu trước khi thử lại.'
}

export function weeklyNeedsAuthoritativeRefresh(reason: unknown): boolean {
  return reason instanceof HttpError && reason.status === 409
}
