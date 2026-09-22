import { HttpError } from '../../services/http/http-client'
export function evaluationError(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Backend không cấp quyền evaluator hoặc phạm vi học thuật cho tài nguyên này.'
    if (reason.status === 404) return 'Không tìm thấy assignment/evaluation trong phạm vi hiện tại.'
    if (reason.status === 409) return 'Evaluation, rubric hoặc final-submission package đã thay đổi. Dữ liệu Backend đã được tải lại; hãy kiểm tra trước thao tác mới.'
    if (reason.status === 400 || reason.status === 422) return 'Dữ liệu điểm chưa hợp lệ hoặc chưa thỏa điều kiện chấm/finalize.'
  }
  return 'Không thể xác nhận kết quả từ máy chủ. Tải lại dữ liệu trước khi tiếp tục.'
}
export const isConflict = (reason: unknown) => reason instanceof HttpError && reason.status === 409
