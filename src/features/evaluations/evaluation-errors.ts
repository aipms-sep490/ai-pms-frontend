import { HttpError } from '../../services/http/http-client'

export function isAssignmentRevoked(reason: unknown): boolean {
  return reason instanceof HttpError && (reason.problem?.code === 'ASSIGNMENT_REVOKED' || reason.problem?.errorCode === 'ASSIGNMENT_REVOKED')
}

export function isEvaluatorRoleConflict(reason: unknown): boolean {
  return reason instanceof HttpError && (reason.problem?.code === 'EVALUATOR_ROLE_CONFLICT' || reason.problem?.errorCode === 'EVALUATOR_ROLE_CONFLICT')
}

export function evaluationError(reason: unknown): string {
  if (reason instanceof HttpError) {
    const code = reason.problem?.code ?? reason.problem?.errorCode
    if (code === 'ASSIGNMENT_REVOKED') {
      return 'Phân công chấm điểm này đã bị thu hồi hoặc hết hiệu lực (ASSIGNMENT_REVOKED). Form đã chuyển sang chỉ đọc; dữ liệu nháp trên màn hình vẫn được giữ để bạn đối chiếu.'
    }
    if (code === 'EVALUATOR_ROLE_CONFLICT') {
      return 'Xung đột vai trò D17 (EVALUATOR_ROLE_CONFLICT): Giảng viên hướng dẫn chính (hiện tại hoặc từng phụ trách đồ án) không thể đồng thời làm người phản biện hoặc chấm hội đồng của cùng đồ án.'
    }
    if (code === 'SCOPE_ACCESS_DENIED') {
      return 'Tài nguyên này nằm ngoài phạm vi phân công hoặc chuyên ngành được cấp quyền (SCOPE_ACCESS_DENIED).'
    }
    if (code === 'INCOMPLETE_SCORES') {
      return 'Còn tiêu chí chưa nhập điểm (INCOMPLETE_SCORES). Hệ thống không quy điểm thiếu thành 0; hãy hoàn tất mọi tiêu chí trước khi chốt.'
    }
    if (code === 'STALE_CONCURRENCY_TOKEN') {
      return 'Dữ liệu đã thay đổi ở phiên khác (STALE_CONCURRENCY_TOKEN). Nháp trên màn hình được giữ nguyên để bạn đối chiếu trước khi lưu lại.'
    }
    if (code === 'PROJECT_NOT_ACTIVE') {
      return 'Đồ án chưa ở trạng thái ACTIVE nên không thể thực hiện thao tác này (PROJECT_NOT_ACTIVE).'
    }
    if (code === 'REGISTRATION_WINDOW_CLOSED') {
      return 'Đợt đăng ký đã đóng theo mốc thời gian hệ thống (REGISTRATION_WINDOW_CLOSED).'
    }
    if (code === 'GATE_3_NOT_PASSED') {
      return 'Đồ án chưa vượt qua Gate 3 (GATE_3_NOT_PASSED); chưa thể gửi hoặc khóa gói bàn giao cuối kỳ.'
    }
    if (reason.problem?.detail) return reason.problem.detail
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Hệ thống không cấp quyền người chấm hoặc phạm vi học thuật cho tài nguyên này.'
    if (reason.status === 404) return 'Không tìm thấy assignment/evaluation trong phạm vi hiện tại.'
    if (reason.status === 409) return 'Evaluation, rubric hoặc final-submission package đã thay đổi. Dữ liệu hệ thống đã được tải lại; hãy kiểm tra trước thao tác mới.'
    if (reason.status === 400 || reason.status === 422) return 'Dữ liệu điểm chưa hợp lệ hoặc chưa thỏa điều kiện chấm/chốt điểm.'
  }
  return 'Không thể xác nhận kết quả từ máy chủ. Tải lại dữ liệu trước khi tiếp tục.'
}
export const isConflict = (reason: unknown) => reason instanceof HttpError && reason.status === 409
