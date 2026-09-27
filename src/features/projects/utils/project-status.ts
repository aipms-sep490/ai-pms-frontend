const terminalStates = new Set(['Rejected', 'Archived'])

export function isTerminalProjectState(status: string): boolean {
  return terminalStates.has(status)
}

export function projectStatusLabel(status: string): string {
  const labels: Record<string, string> = { DRAFT: 'Bản nháp', SUBMITTED: 'Đã nộp đề cương', UNDERREVIEW: 'Đang thẩm định', REVISIONREQUIRED: 'Cần chỉnh sửa', REJECTED: 'Không được chấp thuận', APPROVED: 'Đã phê duyệt', SUPERVISORPENDING: 'Chờ phân công giảng viên', ACTIVE: 'Đang thực hiện', FINALSUBMISSION: 'Đang bàn giao', COMPLETED: 'Đã hoàn thành', ARCHIVED: 'Đã lưu trữ' }
  return labels[status.replaceAll('_', '').toUpperCase()] ?? 'Chưa xác định'
}
