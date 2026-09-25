import { HttpError } from '../../services/http/http-client'

export function deliverableError(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Backend không cấp quyền hoặc phạm vi Project hiện tại cho thao tác này.'
    if (reason.status === 404) return 'Deliverable hoặc phiên bản không còn tồn tại trong phạm vi được cấp.'
    if (reason.status === 409) return 'Dữ liệu đã thay đổi hoặc phiên bản không còn mới nhất. Dữ liệu máy chủ đã được tải lại; hãy kiểm tra rồi thực hiện một thao tác mới.'
    if (reason.status === 400 || reason.status === 422) return 'Dữ liệu không hợp lệ hoặc Project không ở trạng thái/khung thời gian cho phép.'
  }
  return 'Không thể xác nhận kết quả từ máy chủ. Tải lại dữ liệu trước khi thực hiện thêm thao tác.'
}

export function needsAuthoritativeRefresh(reason: unknown): boolean {
  return reason instanceof HttpError && reason.status === 409
}
