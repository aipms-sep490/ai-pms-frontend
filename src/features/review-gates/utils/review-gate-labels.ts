import type { GateStatus, RequirementType } from '../types/review-gates.types'

export const gateStatusLabels: Record<GateStatus, string> = {
  PLANNED: 'Chưa bắt đầu', IN_REVIEW: 'Đang thẩm định', PASSED: 'Đã đạt',
  REVISION_REQUIRED: 'Cần chỉnh sửa', LOCKED: 'Chưa mở',
}

export function requirementTypeLabel(type: RequirementType): string {
  return ({ FILE: 'Tệp', DOCUMENT: 'Tài liệu', EVIDENCE: 'Minh chứng', EXTERNAL_LINK: 'Liên kết ngoài',
    LINK: 'Liên kết', DEMO: 'Sản phẩm trình diễn', METRIC: 'Chỉ số', PREVIOUS_GATE: 'Cổng trước',
    MANUAL_DECISION: 'Xác nhận thủ công' } as Record<RequirementType, string>)[type] ?? 'Loại minh chứng chưa xác định'
}
