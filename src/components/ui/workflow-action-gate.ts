import type { WorkflowActionDto } from '../../types/backend'

export type WorkflowActionGateState = 'allowed' | 'denied' | 'loading' | 'unavailable'

const WORKFLOW_REASON_LABELS: Record<string, string> = {
  INVALID_PROJECT_STATE: 'Trạng thái hiện tại của đồ án không còn ở bước cho phép thực hiện thao tác này.',
  PROJECT_NOT_EDITABLE: 'Đồ án hiện không ở trạng thái cho phép chỉnh sửa.',
  PROJECT_NOT_ACTIVE: 'Đồ án chưa ở trạng thái đang thực hiện.',
  PROJECT_NOT_FINAL_SUBMISSION: 'Đồ án chưa ở giai đoạn bàn giao cuối kỳ.',
  LEAD_DEPARTMENT_REVIEWER_REQUIRED: 'Chỉ cán bộ bộ môn chủ trì mới có quyền phê duyệt cuối cùng cho đề cương này.',
  LEAD_DEPARTMENT_REQUIRED: 'Thao tác này thuộc thẩm quyền của bộ môn chủ trì.',
  LEAD_DEPARTMENT_REQUIRED_FOR_PUBLICATION: 'Chỉ bộ môn chủ trì mới có quyền công bố kết quả.',
  PARTICIPATING_DEPARTMENTS_NOT_ALL_APPROVED: 'Cần tất cả bộ môn tham gia đồng ý trước khi phê duyệt cuối.',
  DEPARTMENT_DECISION_REQUIRED: 'Còn bộ môn tham gia chưa ghi nhận quyết định thẩm định.',
  SUPERVISOR_NOT_CONFIRMED: 'Chưa có GVHD chính xác nhận hướng dẫn.',
  MENTOR_NOT_CONFIRMED: 'Còn chuyên ngành chưa có Mentor chuyên ngành xác nhận.',
  SUPERVISOR_SELECTION_STATE_INVALID: 'Trạng thái hiện tại của đồ án không mở vị trí mời giảng viên.',
  SUPERVISOR_SELECTION_POLICY_UNAVAILABLE: 'Chính sách chọn giảng viên hướng dẫn của học kỳ chưa được cấu hình đầy đủ.',
  WORKING_AGREEMENT_MISSING: 'Nhóm chưa có cam kết làm việc đang áp dụng.',
  WORKING_AGREEMENT_ROSTER_CHANGED: 'Thành viên nhóm đã thay đổi, cần cập nhật lại cam kết làm việc.',
  WORKING_AGREEMENT_INCOMPLETE: 'Chưa đủ thành viên nhóm xác nhận cam kết làm việc.',
  WORKING_AGREEMENT_POLICY_NOT_LOCKED: 'Chính sách cam kết làm việc của kỳ học chưa được khóa.',
  PROPOSAL_FIELDS_REQUIRED: 'Cần bổ sung đầy đủ tên đề tài, bài toán, mục tiêu và kết quả dự kiến.',
  PROPOSAL_TAGS_REQUIRED: 'Cần bổ sung lĩnh vực, công nghệ và từ khóa cho đề cương.',
  PROJECT_MAJORS_REQUIRED: 'Cần chọn đầy đủ chuyên ngành của đồ án.',
  PROJECT_MAJOR_SCOPE_MISMATCH: 'Chuyên ngành của đồ án chưa khớp phạm vi học vụ đã đăng ký của nhóm.',
  PROJECT_MANAGER_REQUIRED: 'Thao tác này cần trưởng nhóm hoặc GVHD chính thực hiện.',
  TEAM_LEADER_REQUIRED: 'Chỉ trưởng nhóm hiện tại mới được thực hiện thao tác này.',
  LEADER_REQUIRED: 'Chỉ trưởng nhóm hiện tại mới được thực hiện thao tác này.',
  ACTIVE_TEAM_MEMBER_REQUIRED: 'Cần là thành viên đang hoạt động của nhóm.',
  NOT_PROJECT_MEMBER: 'Bạn không phải thành viên của đồ án này.',
  ACADEMIC_SCOPE_UNKNOWN_OR_INACTIVE: 'Phạm vi học vụ chưa hợp lệ hoặc đã ngừng hoạt động.',
  ACADEMIC_SCOPE_INACTIVE: 'Phạm vi học vụ đã ngừng hoạt động.',
  SEMESTER_CLOSED: 'Học kỳ áp dụng đã đóng.',
  PERIOD_INACTIVE: 'Đợt học vụ áp dụng không còn hoạt động.',
  WINDOW_NOT_STARTED: 'Đợt thực hiện chưa đến thời gian mở.',
  WINDOW_CLOSED: 'Đợt thực hiện đã hết hạn.',
  FINAL_PACKAGE_REQUIRED: 'Cần gói bàn giao cuối kỳ đã khóa trước khi tiếp tục.',
  PUBLISHED_SCHEME_REQUIRED: 'Cần phương án chấm đã công bố phù hợp cho học kỳ.',
  EVALUATION_WINDOW_CLOSED: 'Hiện chưa có đợt chấm đang mở phù hợp.',
  MISSING_EVALUATOR: 'Còn cấu phần chấm chưa được phân công giảng viên chấm.',
  RESULT_NOT_READY: 'Kết quả đánh giá chưa đủ điều kiện để công bố.',
  RESULT_PUBLICATION_FORBIDDEN: 'Tài khoản hiện tại không có quyền công bố kết quả.',
  ARCHIVE_NOT_ALLOWED: 'Đồ án chưa đáp ứng đủ điều kiện để lưu trữ.',
  PROJECT_NOT_COMPLETED: 'Chỉ có thể lưu trữ khi đồ án đã ở trạng thái hoàn thành.',
  FINAL_RESULT_NOT_PUBLISHED: 'Cần công bố kết quả chính thức trước khi lưu trữ đồ án.',
  UNRESOLVED_APPEALS: 'Đồ án còn đơn phúc khảo chưa xử lý xong nên chưa thể lưu trữ.',
  OPEN_APPEALS_EXIST: 'Đồ án còn đơn phúc khảo đang mở nên chưa thể lưu trữ.',
  APPEAL_WINDOWS_OPEN: 'Vẫn còn cửa sổ phúc khảo đang mở nên chưa thể lưu trữ.',
  APPEALS_PENDING: 'Vẫn còn đơn phúc khảo đang chờ xử lý nên chưa thể lưu trữ.',
  STUDENT_RESULTS_MISSING: 'Chưa công bố đầy đủ kết quả cá nhân của tất cả sinh viên trong nhóm.',
  ARCHIVE_REASON_REQUIRED: 'Cần cung cấp lý do trước khi lưu trữ đồ án.',
}

const RAW_CODE_PATTERN = /^[A-Z][A-Z0-9_]+(?::.+)?$/

export function humanizeWorkflowReason(reason: string): string {
  const trimmed = reason.trim()
  if (!trimmed) return trimmed
  const baseCode = trimmed.split(':')[0]
  if (Object.hasOwn(WORKFLOW_REASON_LABELS, baseCode)) {
    return WORKFLOW_REASON_LABELS[baseCode]
  }
  if (RAW_CODE_PATTERN.test(trimmed)) {
    return 'Điều kiện nghiệp vụ hiện chưa đáp ứng để thực hiện thao tác này.'
  }
  return trimmed
}

export function resolveWorkflowActionGate(actions: readonly WorkflowActionDto[] | null, code: string, status: 'ready' | 'loading' | 'unknown' | 'unavailable'): { state: WorkflowActionGateState; reasons: readonly string[] } {
  if (status === 'loading' || status === 'unknown') return { state: 'loading', reasons: [] }
  if (status === 'unavailable' || !actions) return { state: 'unavailable', reasons: [] }
  const action = actions.find((item) => item.code === code)
  if (!action || !action.allowed) return { state: 'denied', reasons: action?.reasons ?? [] }
  return { state: 'allowed', reasons: [] }
}
