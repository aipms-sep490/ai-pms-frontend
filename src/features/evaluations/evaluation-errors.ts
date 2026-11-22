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
