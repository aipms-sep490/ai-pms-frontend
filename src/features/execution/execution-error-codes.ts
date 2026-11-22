export interface WorkflowErrorFeedback {
  message: string
  retryable: boolean
  nextAction?: 'reload' | 'retry'
  fieldErrors?: Record<string, string>
}

const verifiedErrors: Record<string, WorkflowErrorFeedback> = {
  TASK_ASSIGNEES_LOCKED: {
    message: 'Phân công đã khóa khi công việc chờ nghiệm thu, hoàn thành hoặc đã hủy. Trưởng nhóm hoặc GVHD cần mở lại công việc trước khi điều chỉnh.',
    retryable: false,
  },
  TASK_REOPEN_REASON_REQUIRED: {
    message: 'Cần ghi lý do khi thay đổi công việc đã hoàn thành để lưu lịch sử và kiểm tra ảnh hưởng.',
    retryable: false,
  },
  TASK_DEPENDENCY_IMPACT_PENDING: {
    message: 'Còn ảnh hưởng từ công việc tiền nhiệm chưa được kết luận. Trưởng nhóm hoặc GVHD cần đối chiếu trước khi xác nhận hoàn thành.',
    retryable: false,
  },
  EXECUTION_WINDOW_REQUIRED: {
    message: 'Đồ án chưa có kỳ thực hiện đang mở nên chưa nộp được hạng mục. Liên hệ bộ môn để mở kỳ.',
    retryable: false,
  },
  PROJECT_NOT_ACTIVE: {
    message: 'Đồ án chưa ở trạng thái đang thực hiện. Liên hệ bộ môn để kiểm tra trạng thái trước khi thao tác.',
    retryable: false,
  },
  DELIVERABLE_LOCKED: {
    message: 'Hạng mục đã được chấp nhận hoặc khóa. Xem lịch sử phiên bản hoặc liên hệ giảng viên hướng dẫn.',
    retryable: false,
  },
  DELIVERABLE_DEADLINE_PASSED: {
    message: 'Đã qua hạn nộp của hạng mục. Liên hệ giảng viên hướng dẫn để được hướng dẫn.',
    retryable: false,
  },
  STALE_LATEST_VERSION: {
    message: 'Hạng mục đã có phiên bản mới hơn. Tải lại dữ liệu và đối chiếu trước khi nộp tiếp.',
    retryable: true,
    nextAction: 'reload',
  },
  NOT_LATEST_PENDING_VERSION: {
    message: 'Chỉ phiên bản đang chờ mới nhất mới được đánh giá. Tải lại danh sách phiên bản để đối chiếu.',
    retryable: true,
    nextAction: 'reload',
  },
  MILESTONE_NOT_IN_PROJECT: {
    message: 'Mốc tiến độ đã chọn không thuộc đồ án này. Chọn mốc hợp lệ trước khi lưu.',
    retryable: false,
  },
  DELIVERABLE_HAS_SUBMITTED_HISTORY: {
    message: 'Hạng mục đã có lịch sử nộp, không thể xóa.',
    retryable: false,
  },
  REPORT_NOT_EDITABLE: {
    message: 'Báo cáo đã nộp hoặc được nhận xét, không thể sửa. Xem nội dung đã lưu.',
    retryable: false,
  },
  REPORT_ALREADY_SUBMITTED: {
    message: 'Báo cáo đã được nộp. Xem bản đã khóa trước khi thực hiện thao tác khác.',
    retryable: false,
  },
  REPORT_CYCLE_REQUIRED: {
    message: 'Báo cáo phải gắn với chu kỳ báo cáo. Chọn chu kỳ trước khi nộp.',
    retryable: false,
  },
  REPORT_DEADLINE_PASSED: {
    message: 'Đã qua hạn nộp của chu kỳ này và kỳ học không cho phép nộp muộn. Liên hệ bộ môn để được hướng dẫn.',
    retryable: false,
  },
  REPORT_ALREADY_EXISTS_FOR_CYCLE: {
    message: 'Nhóm đã có báo cáo cho chu kỳ này. Mở báo cáo đã có thay vì tạo bản trùng.',
    retryable: false,
  },
  REPORT_ALREADY_EXISTS_FOR_PERIOD: {
    message: 'Đồ án đã có báo cáo trong khoảng thời gian này. Mở báo cáo đã có hoặc chọn khoảng khác.',
    retryable: false,
  },
  REPORT_FEEDBACK_ON_DRAFT_NOT_ALLOWED: {
    message: 'Báo cáo vẫn là bản nháp. Nhóm cần nộp báo cáo trước khi giảng viên gửi nhận xét.',
    retryable: false,
  },
  STALE_CONCURRENCY_TOKEN: {
    message: 'Báo cáo đã thay đổi. Tải lại trạng thái và đối chiếu trước khi lưu tiếp.',
    retryable: true,
    nextAction: 'reload',
  },
  TASK_DEPENDENCY_BLOCKED: {
    message: 'Công việc chưa thể chuyển trạng thái vì công việc tiền đề vẫn chưa hoàn thành. Mở danh sách công việc liên quan và cập nhật sau khi tiền đề hoàn tất.',
    retryable: false,
    nextAction: 'reload',
  },
  TASK_OUTSIDE_MILESTONE: {
    message: 'Hạn nộp hoặc thời gian công việc phải nằm trong khoảng thời gian của mốc tiến độ.',
    retryable: false,
  },
  TASK_OUTSIDE_EXECUTION_WINDOW: {
    message: 'Thời gian công việc phải nằm trong kỳ thực hiện (Execution Window) của đồ án.',
    retryable: false,
  },
  MILESTONE_OUTSIDE_EXECUTION_WINDOW: {
    message: 'Thời gian mốc tiến độ phải nằm trong kỳ thực hiện (Execution Window) của đồ án.',
    retryable: false,
  },
  PARENT_DATE_CONFLICT: {
    message: 'Không thể thay đổi thời gian do ảnh hưởng đến các công việc hoặc mốc tiến độ trực thuộc. Hãy điều chỉnh các đối tượng con trước.',
    retryable: false,
  },
  MILESTONE_DEPENDENCY_CYCLE: {
    message: 'Phát hiện vòng lặp phụ thuộc mốc tiến độ (Dependency Cycle). Không thể thiết lập quan hệ này.',
    retryable: false,
  },
  MILESTONE_DEPENDENCY_ORDER_VIOLATION: {
    message: 'Mốc tiến độ phụ thuộc (Finish-to-Start) không được bắt đầu trước khi mốc tiền nhiệm kết thúc.',
    retryable: false,
  },
  MILESTONE_DEPENDENCY_NOT_SELF: {
    message: 'Mốc tiến độ không thể phụ thuộc vào chính nó.',
    retryable: false,
  },
  MILESTONE_DEPENDENCY_SAME_PROJECT: {
    message: 'Hai mốc tiến độ phụ thuộc phải thuộc cùng một đồ án.',
    retryable: false,
  },
  REPORT_DEADLINE_INVALID: {
    message: 'Hạn nộp báo cáo phải sau hoặc bằng ngày kết thúc kỳ báo cáo.',
    retryable: false,
  },
}

export function workflowErrorFromCode(code?: string): WorkflowErrorFeedback | undefined {
  return code && Object.hasOwn(verifiedErrors, code) ? verifiedErrors[code] : undefined
}
