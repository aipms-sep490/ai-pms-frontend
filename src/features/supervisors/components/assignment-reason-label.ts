// Labels for reason codes returned by SupervisorAssignmentWorkflow.WithCapabilitiesAsync.
const labels: Record<string, string> = {
  ACADEMIC_SCOPE_UNKNOWN: 'Chưa xác định được phạm vi học thuật của đồ án.',
  ASSIGNMENT_ENDED: 'Phân công này đã kết thúc.',
  PROJECT_READ_ONLY: 'Đồ án đã hoàn thành hoặc lưu trữ; phân công chỉ được xem.',
  OUTSIDE_ASSIGNMENT_SCOPE: 'Phân công này nằm ngoài phạm vi khoa được phép xử lý.',
  REPLACEMENT_REQUIRES_ACTIVE_PROJECT: 'Chỉ được thay giảng viên khi đồ án đang thực hiện.',
  END_REQUIRES_ACTIVE_PROJECT: 'Chỉ được kết thúc phân công khi đồ án đang thực hiện.',
}
export const assignmentReasonLabel = (reason: string) => labels[reason] ?? reason
