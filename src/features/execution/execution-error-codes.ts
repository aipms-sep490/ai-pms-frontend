/** The five report codes without response evidence remain on the generic path. */
export interface WorkflowErrorFeedback {
  message: string
  retryable: boolean
  nextAction?: 'reload' | 'retry'
  fieldErrors?: Record<string, string>
}

const verifiedErrors: Record<string, WorkflowErrorFeedback> = {
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
  STALE_CONCURRENCY_TOKEN: {
    message: 'Báo cáo đã thay đổi. Tải lại trạng thái và đối chiếu trước khi lưu tiếp.',
    retryable: true,
    nextAction: 'reload',
  },
}

export function workflowErrorFromCode(code?: string): WorkflowErrorFeedback | undefined {
  return code && Object.hasOwn(verifiedErrors, code) ? verifiedErrors[code] : undefined
}
