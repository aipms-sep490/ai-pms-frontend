import type { EvaluationAssignmentDetail } from '../../services/api/evaluations.api'

type ApprovalFields = Pick<EvaluationAssignmentDetail, 'schemeIsDemo' | 'schemeApprovalStatus' | 'schemeApprovalReference'>

export function evaluatorApprovalLabel(detail: ApprovalFields): { tone: 'neutral' | 'warning' | 'success'; text: string } {
  if (detail.schemeIsDemo === true) return {
    tone: 'warning', text: 'Bộ tiêu chí chưa được phê duyệt bằng văn bản. Điểm chấm ở đây chưa phải điểm chính thức.',
  }
  if (detail.schemeIsDemo === false && detail.schemeApprovalStatus === 'APPROVED' && detail.schemeApprovalReference?.trim()) return {
    tone: 'success', text: 'Bộ tiêu chí đã được phê duyệt bằng văn bản. Đây là phiếu chấm chính thức.',
  }
  if (detail.schemeApprovalStatus === 'APPROVED' && !detail.schemeApprovalReference?.trim()) return {
    tone: 'warning', text: 'Hệ thống báo đã phê duyệt nhưng chưa có tham chiếu văn bản. Chưa thể xác nhận phiếu chấm chính thức.',
  }
  return { tone: 'neutral', text: 'Chưa xác định trạng thái phê duyệt của bộ tiêu chí. Không thể xác nhận đây là phiếu chấm chính thức.' }
}
