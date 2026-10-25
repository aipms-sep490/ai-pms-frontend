import { env } from '../../../app/config/env'

export function ReviewGatesMockNotice() {
  if (import.meta.env.PROD || !env.reviewGatesMockEnabled) {
    return null
  }

  return (
    <div
      role="status"
      data-testid="review-gates-mock-notice"
      className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
    >
      <span className="material-symbols-outlined text-[16px]">info</span>
      <span>DỮ LIỆU MẪU (Mock Adapter đang bật theo cờ VITE_USE_MOCK_REVIEW_GATES)</span>
    </div>
  )
}
