import { HttpError } from '../../services/http/http-client'

export function coldError(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Bạn không có quyền với báo cáo này. Kiểm tra ngành/sinh viên được giao.'
    if (reason.status === 404) return 'Không tìm thấy báo cáo, phiên bản hoặc tệp này.'
    if (reason.status === 409) return 'Dữ liệu đã thay đổi, hạn nộp đã đóng hoặc báo cáo đã bị khóa. Tải lại trước khi tiếp tục.'
    if (reason.status === 413) return 'Tệp vượt quá dung lượng cho phép (tối đa 10 MiB).'
    if (reason.status === 400 || reason.status === 422) return 'Dữ liệu chưa hợp lệ. Kiểm tra định dạng tệp (PDF/DOCX/ZIP) và nội dung đã nhập.'
  }
  return 'Không thể kết nối để hoàn tất thao tác. Kiểm tra kết nối và tải lại để xác nhận dữ liệu trước khi thử lại.'
}

export function coldNeedsAuthoritativeRefresh(reason: unknown): boolean {
  return reason instanceof HttpError && reason.status === 409
}
