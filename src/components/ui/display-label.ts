const labels: Record<string, string> = {
  BEGINNER: 'Cơ bản', INTERMEDIATE: 'Khá', ADVANCED: 'Nâng cao', EXPERT: 'Chuyên sâu',
  HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp',
  DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', RETIRED: 'Ngừng sử dụng', ACTIVE: 'Đang hoạt động',
  UPCOMING: 'Sắp diễn ra', CLOSED: 'Đã đóng', ARCHIVED: 'Đã lưu trữ', LOCKED: 'Đã khóa',
  ACCEPTED: 'Đã nhận hướng dẫn', ELIGIBLE: 'Đủ điều kiện', INELIGIBLE: 'Chưa đủ điều kiện', PENDING: 'Chờ xử lý', APPROVED: 'Đã chấp thuận', REJECTED: 'Không chấp thuận',
  SUBMITTED: 'Đã nộp', FINALIZED: 'Đã chốt', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy',
  COMMON: 'Cả đồ án', MAJOR_SPECIFIC: 'Theo chuyên ngành', INDIVIDUAL: 'Theo sinh viên',
  SINGLE_MAJOR: 'Một ngành', INTERDISCIPLINARY: 'Liên ngành',
  LECTURER: 'Giảng viên đánh giá', SUPERVISOR: 'Giảng viên hướng dẫn', STUDENT: 'Sinh viên',
  DEPARTMENT_STAFF: 'Cán bộ bộ môn', ADMIN: 'Quản trị viên',
  DISCIPLINE_MENTOR: 'Hướng dẫn chuyên ngành', PRIMARY_SUPERVISOR: 'Giảng viên hướng dẫn chính',
  CO_SUPERVISOR: 'Giảng viên đồng hướng dẫn',
  REGISTRATION: 'Đăng ký', PROJECT_REVIEW: 'Thẩm định', SUPERVISOR_SELECTION: 'Phân công hướng dẫn',
  EXECUTION: 'Thực hiện', FINAL_SUBMISSION: 'Bàn giao cuối kỳ', EVALUATION: 'Đánh giá',
  PROGRESS_PACKAGE: 'Hồ sơ tiến độ', TECHNICAL_DOCUMENT: 'Tài liệu kỹ thuật', PROPOSAL: 'Đề cương',
  FULL: 'Đủ dữ liệu', SUFFICIENT_DATA: 'Đủ dữ liệu', INSUFFICIENT_DATA: 'Chưa đủ dữ liệu',
}

/** Display labels only; API codes and user-authored content remain unchanged. */
export function displayLabel(value: string | null | undefined): string {
  if (!value) return 'Chưa xác định'
  return labels[value] ?? value
}
