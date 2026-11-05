type ApprovalFields = { isDemo?: boolean | null; approvalStatus?: string | null }

export function evaluatorApprovalLabel(detail: ApprovalFields): { tone: 'neutral' | 'warning' | 'success'; text: string } {
  if (detail.isDemo === true) return {
    tone: 'warning', text: 'Phương án đánh giá đang ở chế độ DEMO. Điểm chấm ở đây chưa phải điểm chính thức.',
  }
  if (detail.isDemo === false && detail.approvalStatus === 'APPROVED') return {
    tone: 'success', text: 'Phương án đánh giá đã được phê duyệt. Đây là phiếu chấm chính thức.',
  }
  return { tone: 'neutral', text: 'Chưa xác định trạng thái phê duyệt của phương án đánh giá. Không thể xác nhận đây là phiếu chấm chính thức.' }
}
