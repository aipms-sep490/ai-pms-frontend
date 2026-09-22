import { HttpError } from '../../services/http/http-client'

export function reportError(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Bạn không có quyền thực hiện thao tác này. Kiểm tra vai trò và phân công trong đồ án.'
    if (reason.status === 404) return 'Không tìm thấy báo cáo hoặc đồ án này.'
    if (reason.status === 409) return 'Dữ liệu đã thay đổi hoặc đã có báo cáo cùng loại và kỳ. Tải lại để kiểm tra trước khi tiếp tục.'
    if (reason.status === 400 || reason.status === 422) return 'Dữ liệu chưa hợp lệ. Kiểm tra kỳ báo cáo và điền đủ nội dung; đồ án phải đang thực hiện.'
  }
  return 'Không thể kết nối để hoàn tất thao tác. Kiểm tra kết nối và tải lại để xác nhận dữ liệu trước khi thử lại.'
}
