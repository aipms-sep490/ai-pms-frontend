import { env } from '../../../app/config/env'

export function ReviewGatesMockNotice() {
  if (!import.meta.env.DEV || !env.reviewGatesMockEnabled) return null

  return <p role="status" className="mb-4 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">
    <strong>DỮ LIỆU MẪU · Review Gates.</strong> Nội dung và thao tác tại đây chỉ phục vụ thử nghiệm, không phải hồ sơ học vụ thật.
  </p>
}
